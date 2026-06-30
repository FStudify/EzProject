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

// Log SMTP env tóm tắt ngay khi module load — giúp debug trên Render xem
// env đã pick up đúng sau deploy chưa.
if (process.env.SMTP_HOST) {
  console.log(
    `[SMTP] Loaded config host=${process.env.SMTP_HOST} port=${process.env.SMTP_PORT || '(default 587)'} ` +
      `secure=${process.env.SMTP_SECURE || '(auto)'} user=${process.env.SMTP_USER || '(missing)'} ` +
      `passLen=${(process.env.SMTP_PASS || '').length} debug=${process.env.SMTP_DEBUG === 'true'}`,
  );
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
  // Cho phép ép secure qua env (mặc định: true nếu port 465, false nếu khác).
  const isSecure =
    String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  let host = rawHost;
  if (rawHost && !/^\d{1,3}(\.\d{1,3}){3}$/.test(rawHost)) {
    try {
      const ipv4 = await resolveIpv4(rawHost);
      if (ipv4) host = ipv4;
    } catch {
      // Fall through; transporter `family: 4` vẫn ép IPv4 khi connect.
    }
  }

  return {
    host,
    port,
    secure: isSecure,
    requireTLS: !isSecure,
    tls: {
      rejectUnauthorized: true,
      minVersion: 'TLSv1.2',
      // SNI dùng hostname gốc để TLS cert (Gmail) match tên miền.
      servername: rawHost,
    },
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
    // Ép IPv4 — Render free tier block egress IPv6 ra Gmail SMTP.
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

/**
 * Helper gửi mail dùng chung cho mọi email service (invite, reset, ...).
 *
 *   - Tạo transporter từ buildTransporterConfig (IPv4, secure đúng env).
 *   - Log rõ: bắt đầu gửi → thành công / thất bại với to/from + error đầy đủ.
 *   - Return { sent, ... } để controller vẫn phân biệt được soft-fail
 *     (SMTP_NOT_CONFIGURED, NODEMAILER_MISSING) với hard-fail (SEND_FAILED).
 *
 * Lưu ý: `await` được propagate ra caller → controller có thể đợi gửi xong
 * trước khi trả response.
 */
async function _sendMail({ tag, to, subject, text, html, envelopeFrom }) {
  const fromAddress = normalizeFromAddress(process.env.SMTP_FROM || process.env.SMTP_USER);

  const config = await buildTransporterConfig();
  console.log(
    `[${tag}] Sending email to=${to} from="${fromAddress}" subject="${subject}" ` +
      `host=${config.host}:${config.port} secure=${config.secure} requireTLS=${config.requireTLS}`,
  );

  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    const info = await transporter.sendMail({
      from: fromAddress,
      replyTo: process.env.SMTP_REPLY_TO || fromAddress,
      to,
      subject,
      text,
      html,
      headers: {
        'X-Mailer': 'EZProject',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_REPLY_TO || process.env.SMTP_USER}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      // Envelope from phải khớp SPF (đặc biệt khi from là alias).
      envelope: {
        from: envelopeFrom || process.env.SMTP_USER,
        to,
      },
    });

    // Log đầy đủ accepted / rejected / pending để dễ phát hiện silent-drop
    // (Gmail trả 250 OK nhưng recipient server có thể chặn sau đó).
    console.log(
      `[${tag}] Email sent successfully to=${to} from="${fromAddress}" ` +
        `messageId=${info && info.messageId} accepted=${JSON.stringify(info && info.accepted)} ` +
        `rejected=${JSON.stringify(info && info.rejected)} pending=${JSON.stringify(info && info.pending)} ` +
        `response=${info && info.response}`,
    );
    return {
      sent: true,
      messageId: info?.messageId || null,
      from: fromAddress,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      pending: info?.pending || [],
      response: info?.response || null,
    };
  } catch (err) {
    // Log đầy đủ stack + code để dễ debug ENETUNREACH / EAUTH / ETIMEDOUT.
    console.error(
      `[${tag}] Failed to send to=${to} from="${fromAddress}":`,
      err && err.message,
      err && err.code,
      err && err.command,
    );
    if (err && err.stack) console.error(`[${tag}] Stack:`, err.stack);
    return {
      sent: false,
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
 * Pre-flight kiểm tra SMTP/Nodemailer trước khi gửi.
 * Trả về null nếu OK, hoặc object kết quả để caller return sớm.
 */
function _preflightOrSkip(tag, to, fallbackUrl) {
  if (!nodemailer) {
    console.warn(`[${tag}] nodemailer is not installed; cannot send email to=${to}. Link: ${fallbackUrl}`);
    return { sent: false, inviteUrl: fallbackUrl, resetUrl: fallbackUrl, reason: 'NODEMAILER_MISSING' };
  }
  const status = getSmtpStatus();
  if (!status.configured) {
    console.warn(
      `[${tag}] SMTP not configured. Missing env vars: ${status.missing.join(', ')}. ` +
        `Add them to Backend/.env. Fallback link for ${to}: ${fallbackUrl}`,
    );
    return {
      sent: false,
      inviteUrl: fallbackUrl,
      resetUrl: fallbackUrl,
      reason: 'SMTP_NOT_CONFIGURED',
      missing: status.missing,
    };
  }
  return null;
}

async function sendProjectInviteEmail({ to, projectName, inviterName, token }) {
  const inviteUrl = buildInviteUrl(token);

  const skipped = _preflightOrSkip('InviteEmail', to, inviteUrl);
  if (skipped) return skipped;

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

  const result = await _sendMail({
    tag: 'InviteEmail',
    to,
    subject: `${inviterName} mời bạn tham gia dự án "${projectName}"`,
    text,
    html,
  });
  return { ...result, inviteUrl };
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

  const skipped = _preflightOrSkip('ResetEmail', to, resetUrl);
  if (skipped) return skipped;

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

  const result = await _sendMail({
    tag: 'ResetEmail',
    to,
    subject: 'Đặt lại mật khẩu EZProject của bạn',
    text,
    html,
  });
  return { ...result, resetUrl };
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
