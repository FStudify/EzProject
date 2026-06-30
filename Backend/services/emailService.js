'use strict';

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

const dns = require('dns');

// ── IPv4-first hardening ──────────────────────────────────────────────────
// Render free tier (and several other hosted environments) block egress
// IPv6 to external services. Gmail SMTP still publishes AAAA records,
// so a vanilla `lookup()` may resolve to IPv6 and fail with ENETUNREACH.
//
// We force Node's resolver to IPv4-first, and additionally allow callers
// to override the DNS servers (helpful when the host's resolver rewrites
// names like `smtp.gmail.com` → `smtp.gmail.com.<local-suffix>`).
try {
  if (typeof dns.setDefaultResultOrder === 'function') {
    dns.setDefaultResultOrder('ipv4first');
  }
  if (process.env.SMTP_DNS_SERVERS && typeof dns.setServers === 'function') {
    const servers = process.env.SMTP_DNS_SERVERS
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (servers.length > 0) dns.setServers(servers);
  }
} catch {
  // best-effort; transporter `family: 4` is the second line of defense.
}

// Cache resolved IPv4 hosts so we don't pay a DNS roundtrip per email.
const _ipv4Cache = new Map();
const _IPV4_TTL_MS = 5 * 60 * 1000;

/**
 * Resolve `hostname` to a single IPv4 address, with caching.
 * Uses `dns.lookup` with `family: 4`, which on Node ≥ 16.6 already respects
 * `setDefaultResultOrder('ipv4first')`. Falls back to scanning all returned
 * addresses if the first one isn't IPv4.
 *
 * Returns null when no IPv4 can be found.
 */
async function resolveIpv4(hostname) {
  const cached = _ipv4Cache.get(hostname);
  if (cached && cached.expires > Date.now()) return cached.address;

  const lookup = (family) =>
    new Promise((resolve, reject) => {
      dns.lookup(hostname, { family, all: true, hints: dns.ADDRCONFIG }, (err, addrs) => {
        if (err) return reject(err);
        resolve(addrs || []);
      });
    });

  let ipv4 = null;
  try {
    const addrs = await lookup(4);
    ipv4 = addrs.length > 0 ? addrs[0].address : null;
  } catch {
    ipv4 = null;
  }

  // Fallback: ask for "all" families and pick the first IPv4 in the list.
  if (!ipv4) {
    try {
      const all = await new Promise((resolve, reject) => {
        dns.lookup(hostname, { all: true, hints: dns.ADDRCONFIG }, (err, addrs) => {
          if (err) return reject(err);
          resolve(addrs || []);
        });
      });
      const found = all.find((a) => a.family === 4);
      ipv4 = found ? found.address : null;
    } catch {
      ipv4 = null;
    }
  }

  if (ipv4) {
    _ipv4Cache.set(hostname, { address: ipv4, expires: Date.now() + _IPV4_TTL_MS });
  }
  return ipv4;
}

const REQUIRED_SMTP_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

function getSmtpStatus() {
  const missing = REQUIRED_SMTP_KEYS.filter((k) => !process.env[k]);
  return {
    configured: missing.length === 0,
    missing,
    hasNodemailer: Boolean(nodemailer),
  };
}

function hasSmtpConfig() {
  return getSmtpStatus().configured && Boolean(nodemailer);
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildInviteUrl(token) {
  return `${getFrontendUrl()}/invite/${token}`;
}

/**
 * Chuẩn hoá giá trị SMTP_FROM.
 *
 * Vấn đề hay gặp trên production (đặc biệt Gmail): người dùng paste
 *   "ezproject baokhanh652210@gmail.com"  (thiếu < > quanh email)
 * → server nhận là display-name thuần, không có address → Gmail SMTP
 *   từ chối với lỗi 501 hoặc gửi đi với From trống.
 *
 * Quy tắc chấp nhận:
 *   - "addr@example.com"                                   → "addr@example.com"
 *   - "<addr@example.com>"                                  → "addr@example.com"
 *   - "Display Name <addr@example.com>"                    → giữ nguyên
 *   - "Display Name addr@example.com" (thiếu <>)           → chèn thành "Display Name <addr@example.com>"
 */
function normalizeFromAddress(raw) {
  const fallback = process.env.SMTP_USER || 'noreply@localhost';
  const value = (raw || '').trim();
  if (!value) return fallback;

  // Đã chuẩn: có cặp < > và display-name (hoặc không)
  if (value.includes('<') && value.includes('>')) {
    return value;
  }

  // Đã chuẩn: chỉ có email thuần
  if (/^[^\s<>()]+@[^\s<>()]+$/.test(value)) {
    return value;
  }

  // Trường hợp phổ biến nhất: "<display> <email>" thiếu cặp < >
  const match = value.match(/^(.*?)\s*([^\s<>()]+@[^\s<>()]+)\s*$/);
  if (match) {
    const [, name, email] = match;
    const namePart = name.trim().replace(/[<>]/g, '');
    if (!namePart) return email;
    return `${namePart} <${email}>`;
  }

  return value;
}

/**
 * Build cấu hình transporter với các biện pháp hardening cho Gmail SMTP
 * khi chạy trên Render / Vercel:
 *   - port 465 → secure=true (implicit TLS), ổn định nhất khi đi qua IP Render
 *   - port 587 → STARTTLS (requireTLS=true) với TLS minVersion bắt buộc
 *   - EHLO domain riêng (helps reverse-DNS reputation)
 *   - connectionTimeout ngắn để không treo request
 */
async function buildTransporterConfig() {
  const rawHost = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const isSecure = port === 465;

  // Resolve to an IPv4 literal so we never depend on Nodemailer's internal
  // DNS resolver picking IPv4 first.
  let host = rawHost;
  if (rawHost && !/^\d{1,3}(\.\d{1,3}){3}$/.test(rawHost)) {
    try {
      const ipv4 = await resolveIpv4(rawHost);
      if (ipv4) host = ipv4;
    } catch {
      // Fall through; transporter `family: 4` will still force IPv4 on connect.
    }
  }

  return {
    host,
    port,
    // Implicit TLS khi port 465
    secure: isSecure,
    // Bắt buộc STARTTLS upgrade khi port 587
    requireTLS: !isSecure,
    tls: {
      // Không reject self-signed (Gmail dùng CA hợp lệ nhưng đề phòng MITM)
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      // SNI dùng hostname gốc (không phải IP) để TLS cert hợp lệ.
      servername: rawHost,
    },
    // EHLO domain giúp Gmail reputation — để trống là nodemailer tự lấy hostname
    name: process.env.SMTP_EHLO_DOMAIN || undefined,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    debug: process.env.SMTP_DEBUG === 'true',
    logger: process.env.SMTP_DEBUG === 'true',
    // Ép dùng IPv4 ngay cả khi Nodemailer tự resolve lại sau này.
    family: 4,
  };
}

/**
 * Tự xác minh transporter trước khi gửi (bắt lỗi EHLO / TLS / auth ngay).
 * Nếu `onlyConfig` thì chỉ build config, không gửi.
 */
async function verifySmtpConnection() {
  if (!nodemailer) return { ok: false, reason: 'NODEMAILER_MISSING' };
  if (!hasSmtpConfig()) return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };

  const transporter = nodemailer.createTransport(await buildTransporterConfig());
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'VERIFY_FAILED', error: err.message, code: err.code };
  } finally {
    try { transporter.close(); } catch { /* noop */ }
  }
}

async function sendProjectInviteEmail({ to, projectName, inviterName, token }) {
  const inviteUrl = buildInviteUrl(token);

  if (!nodemailer) {
    console.warn(`[InviteEmail] nodemailer is not installed; cannot send email. Link: ${inviteUrl}`);
    return { sent: false, inviteUrl, reason: 'NODEMAILER_MISSING' };
  }

  const status = getSmtpStatus();
  if (!status.configured) {
    console.warn(
      `[InviteEmail] SMTP not configured. Missing env vars: ${status.missing.join(', ')}. ` +
        `Add them to Backend/.env. Invite link for ${to}: ${inviteUrl}`,
    );
    return { sent: false, inviteUrl, reason: 'SMTP_NOT_CONFIGURED', missing: status.missing };
  }

  const fromAddress = normalizeFromAddress(process.env.SMTP_FROM || process.env.SMTP_USER);
  const transporter = nodemailer.createTransport(await buildTransporterConfig());

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Lời mời tham gia dự án</title>
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#FFFDFB;border-radius:16px;border:1px solid #E8D8CF;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#D97853,#C4643E);padding:28px 32px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">EZProject</span>
              </div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1F1F1F;">
                Bạn được mời tham gia dự án!
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#635648;line-height:1.6;">
                <strong style="color:#1F1F1F;">${inviterName}</strong>
                đã mời bạn tham gia dự án
                <strong style="color:#D97853;">${projectName}</strong>
                trên EZProject.
              </p>

              <!-- Project card -->
              <div style="background:#FFF5EC;border:1px solid #F0D6BD;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;font-size:13px;color:#9a9086;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;">Dự án</p>
                <p style="margin:4px 0 0;font-size:17px;font-weight:700;color:#1F1F1F;">${projectName}</p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${inviteUrl}"
                   style="display:inline-block;background:#D97853;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:999px;letter-spacing:0.02em;">
                  Chấp nhận lời mời
                </a>
              </div>

              <!-- Expiry notice -->
              <div style="background:#FEF9F5;border:1px solid #F0D6BD;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#7D6F66;">
                  ⏰ Lời mời có hiệu lực trong <strong>72 giờ</strong> kể từ khi nhận được email này.
                </p>
              </div>

              <p style="margin:0 0 4px;font-size:13px;color:#9a9086;">Hoặc sao chép đường dẫn bên dưới vào trình duyệt:</p>
              <p style="margin:0;font-size:12px;color:#D97853;word-break:break-all;">${inviteUrl}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #F0E8E0;">
              <p style="margin:0;font-size:12px;color:#B5A89E;text-align:center;">
                Email này được gửi từ EZProject. Nếu bạn không mong đợi lời mời này, hãy bỏ qua email này.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${inviterName} đã mời bạn tham gia dự án "${projectName}" trên EZProject.\n\nChấp nhận lời mời tại:\n${inviteUrl}\n\nLời mời có hiệu lực trong 72 giờ.`;

  // Reply-To để recipient reply về inviter thay vì bounce vào account gửi
  const replyTo = process.env.SMTP_REPLY_TO || fromAddress;

  try {
    // Verify trước khi gửi để phát hiện lỗi EHLO / TLS / auth ngay (fail-fast)
    await transporter.verify();

    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo,
      to,
      subject: `${inviterName} mời bạn tham gia dự án "${projectName}"`,
      text,
      html,
      // Hỗ trợ user xem message gốc ở Gmail kể cả khi HTML bị đánh dấu spam
      alternatives: [{ contentType: 'text/plain', content: text }],
      // Tiêu đề giúp triết lý "đánh dấu là quan trọng" tránh rơi vào Promotions/Spam
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'EZProject',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_REPLY_TO || process.env.SMTP_USER}>`,
      },
      // Dùng envelope chính xác để khớp SPF (đặc biệt khi from là alias)
      envelope: {
        from: process.env.SMTP_USER,
        to,
      },
    });

    // messageId là bằng chứng Gmail SMTP đã chấp nhận message.
    // (Không đảm bảo message tới inbox — Gmail có thể drop sau đó.)
    console.log(
      `[InviteEmail] sent to=${to} from="${fromAddress}" messageId=${info && info.messageId}`,
    );
    return { sent: true, inviteUrl, messageId: info?.messageId || null, from: fromAddress };
  } catch (err) {
    console.error(
      `[InviteEmail] Failed to send to ${to} from "${fromAddress}":`,
      err && err.message,
      err && err.code,
    );
    return {
      sent: false,
      inviteUrl,
      reason: 'SEND_FAILED',
      error: err && err.message,
      code: err && err.code,
      from: fromAddress,
    };
  } finally {
    try { transporter.close(); } catch { /* noop */ }
  }
}

/**
 * Build URL trang đặt lại mật khẩu với token (raw) đính kèm.
 */
function buildPasswordResetUrl(rawToken) {
  const url = new URL(`${getFrontendUrl()}/reset-password`);
  url.searchParams.set('token', rawToken);
  return url.toString();
}

/**
 * Gửi email đặt lại mật khẩu.
 *
 * - Token thô chỉ tồn tại trong URL → không bao giờ log/DB.
 * - DB chỉ lưu SHA-256 của token, ngay cả khi DB bị lộ attacker cũng
 *   không dùng được token đã hash (1 chiều, có salt đồng thời nhờ token ngẫu nhiên).
 * - Thời hạn: `expiresInMinutes` (mặc định 30 phút — đủ để user mở mail,
 *   không quá dài nếu email lọt vào inbox người khác).
 */
async function sendPasswordResetEmail({ to, fullName, rawToken, expiresInMinutes = 30 }) {
  const resetUrl = buildPasswordResetUrl(rawToken);

  if (!nodemailer) {
    console.warn(`[ResetEmail] nodemailer is not installed; cannot send email. Link: ${resetUrl}`);
    return { sent: false, resetUrl, reason: 'NODEMAILER_MISSING' };
  }

  const status = getSmtpStatus();
  if (!status.configured) {
    console.warn(
      `[ResetEmail] SMTP not configured. Missing env vars: ${status.missing.join(', ')}. ` +
        `Add them to Backend/.env. Reset link for ${to}: ${resetUrl}`,
    );
    return { sent: false, resetUrl, reason: 'SMTP_NOT_CONFIGURED', missing: status.missing };
  }

  const fromAddress = normalizeFromAddress(process.env.SMTP_FROM || process.env.SMTP_USER);
  const transporter = nodemailer.createTransport(await buildTransporterConfig());
  const greetingName = (fullName || '').trim() || 'bạn';

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Đặt lại mật khẩu</title>
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#FFFDFB;border-radius:16px;border:1px solid #E8D8CF;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#D97853,#C4643E);padding:28px 32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;color:#fff;letter-spacing:-0.5px;">EZProject</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 32px 24px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1F1F1F;">
                Đặt lại mật khẩu
              </h2>
              <p style="margin:0 0 20px;font-size:15px;color:#635648;line-height:1.6;">
                Xin chào <strong style="color:#1F1F1F;">${greetingName}</strong>,
                chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn trên
                <strong style="color:#D97853;">EZProject</strong>.
              </p>

              <div style="background:#FEF9F5;border:1px solid #F0D6BD;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
                <p style="margin:0;font-size:13px;color:#7D6F66;">
                  ⏰ Liên kết có hiệu lực trong <strong>${expiresInMinutes} phút</strong> và chỉ dùng được <strong>một lần</strong>.
                </p>
              </div>

              <!-- CTA -->
              <div style="text-align:center;margin-bottom:24px;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:#D97853;color:#fff;text-decoration:none;font-size:15px;font-weight:700;padding:14px 36px;border-radius:999px;letter-spacing:0.02em;">
                  Đặt lại mật khẩu
                </a>
              </div>

              <p style="margin:0 0 4px;font-size:13px;color:#9a9086;">Hoặc sao chép đường dẫn bên dưới vào trình duyệt:</p>
              <p style="margin:0;font-size:12px;color:#D97853;word-break:break-all;">${resetUrl}</p>

              <div style="background:#FBEEEA;border:1px solid #F2C8B8;border-radius:8px;padding:12px 16px;margin-top:24px;">
                <p style="margin:0;font-size:13px;color:#8C4A3A;line-height:1.55;">
                  🔒 Nếu bạn <strong>không</strong> yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.
                  Tài khoản của bạn vẫn an toàn.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 24px;border-top:1px solid #F0E8E0;">
              <p style="margin:0;font-size:12px;color:#B5A89E;text-align:center;">
                Email này được gửi từ EZProject. Vì lý do bảo mật, vui lòng không chia sẻ liên kết này với người khác.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `Xin chào ${greetingName},\n\nChúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản EZProject của bạn.\n\nMở liên kết sau để đặt lại mật khẩu (có hiệu lực trong ${expiresInMinutes} phút, chỉ dùng được một lần):\n${resetUrl}\n\nNếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Tài khoản của bạn vẫn an toàn.`;

  const replyTo = process.env.SMTP_REPLY_TO || fromAddress;

  try {
    await transporter.verify();

    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo,
      to,
      subject: 'Đặt lại mật khẩu EZProject của bạn',
      text,
      html,
      alternatives: [{ contentType: 'text/plain', content: text }],
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'EZProject',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_REPLY_TO || process.env.SMTP_USER}>`,
      },
      envelope: {
        from: process.env.SMTP_USER,
        to,
      },
    });

    console.log(
      `[ResetEmail] sent to=${to} from="${fromAddress}" messageId=${info && info.messageId}`,
    );
    return { sent: true, resetUrl, messageId: info?.messageId || null, from: fromAddress };
  } catch (err) {
    console.error(
      `[ResetEmail] Failed to send to ${to} from "${fromAddress}":`,
      err && err.message,
      err && err.code,
    );
    return {
      sent: false,
      resetUrl,
      reason: 'SEND_FAILED',
      error: err && err.message,
      code: err && err.code,
      from: fromAddress,
    };
  } finally {
    try { transporter.close(); } catch { /* noop */ }
  }
}

module.exports = {
  buildInviteUrl,
  buildPasswordResetUrl,
  sendProjectInviteEmail,
  sendPasswordResetEmail,
  hasSmtpConfig,
  getSmtpStatus,
  normalizeFromAddress,
  verifySmtpConnection,
};
