'use strict';

// ─── Resend-only driver ────────────────────────────────────────────────────
// EZProject sends email exclusively through the Resend HTTPS API
// (https://api.resend.com/emails). Outbound HTTPS/443 is never blocked by
// Render, while raw SMTP (ports 25/465/587) is unreliable from hosted
// containers — that is why the previous SMTP/transport path was
// removed entirely.
//
// Required env:
//   - RESEND_API_KEY     (re_xxx)
//   - RESEND_FROM        ("EzProject <noreply@ezproject.me>")
// Optional:
//   - RESEND_REPLY_TO    (defaults to RESEND_FROM)

// Log Resend env summary on module load so it is obvious from Render logs
// whether the deploy picked up the new secrets.
if (process.env.RESEND_API_KEY) {
  console.log(
    `[Email] Driver=resend from="${process.env.RESEND_FROM || '(unset)'}" ` +
      `apiKeyLen=${process.env.RESEND_API_KEY.length}`,
  );
} else {
  console.warn(
    '[Email] RESEND_API_KEY is not set. Invite / reset-password emails ' +
      'will be reported as RESEND_NOT_CONFIGURED.',
  );
}

const REQUIRED_RESEND_KEYS = ['RESEND_API_KEY', 'RESEND_FROM'];

function getEmailStatus() {
  const missing = REQUIRED_RESEND_KEYS.filter((k) => !process.env[k]);
  return {
    configured: missing.length === 0,
    missing,
    driver: 'resend',
  };
}

function hasResendConfig() {
  return getEmailStatus().configured;
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildInviteUrl(token) {
  return `${getFrontendUrl()}/invite/${token}`;
}

/**
 * Normalize a `From` / `Reply-To` value.
 *
 * Common production pitfall: copy-pasting "ezproject baokhanh652210@gmail.com"
 * (missing the angle brackets) makes the server treat the whole string as the
 * display-name with no address. Resend's API requires a parseable address and
 * will reject the request otherwise.
 *
 * Accepted inputs:
 *   "addr@example.com"                       → "addr@example.com"
 *   "<addr@example.com>"                     → "addr@example.com"
 *   "Display Name <addr@example.com>"        → kept as-is
 *   "Display Name addr@example.com"          → wrapped as "Display Name <addr@example.com>"
 */
function normalizeFromAddress(raw) {
  const fallback = process.env.RESEND_FROM || 'noreply@localhost';
  const value = (raw || '').trim();
  if (!value) return fallback;

  // Already standard: has a < > pair (with or without display-name).
  if (value.includes('<') && value.includes('>')) return value;

  // Already standard: bare email.
  if (/^[^\s<>()]+@[^\s<>()]+$/.test(value)) return value;

  // Most common mistake: "Display Name addr@…" — wrap with angle brackets.
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
 * Verify Resend credentials without actually sending an email.
 * Resend does not expose a noop endpoint, so we only validate config shape:
 *   - RESEND_API_KEY present + starts with `re_`
 *   - RESEND_FROM parseable by `normalizeFromAddress`
 * Returns { ok, reason?, fromRaw?, fromNormalized? }.
 */
async function verifyResendConnection() {
  if (!hasResendConfig()) {
    return { ok: false, reason: 'RESEND_NOT_CONFIGURED', missing: getEmailStatus().missing };
  }
  const fromRaw = process.env.RESEND_FROM;
  const fromNormalized = normalizeFromAddress(fromRaw);
  if (!fromNormalized || fromNormalized === 'noreply@localhost') {
    return { ok: false, reason: 'FROM_INVALID', fromRaw };
  }
  if (!String(process.env.RESEND_API_KEY).startsWith('re_')) {
    return {
      ok: false,
      reason: 'API_KEY_SHAPE_INVALID',
      message: 'API key does not start with re_',
    };
  }
  return { ok: true, fromRaw, fromNormalized };
}

/**
 * Send one email via Resend's HTTPS API.
 *
 * Env required (already enforced by `_preflightOrSkip`):
 *   - RESEND_API_KEY   (re_xxx)
 *   - RESEND_FROM      ("EzProject <noreply@ezproject.me>")
 *
 * Returns { id, messageId, accepted, rejected, pending, response } so the
 * caller can shape the result consistently with the previous nodemailer path.
 */
async function _sendViaResend({ tag, to, fromAddress, subject, text, html, replyTo }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is missing');

  const body = {
    from: fromAddress,
    to: Array.isArray(to) ? to : [to],
    subject,
    text,
    html,
    reply_to: replyTo ? [replyTo] : undefined,
    headers: { 'X-Mailer': 'EZProject' },
  };

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);

  let res;
  try {
    res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  const text_body = await res.text();
  let parsed = null;
  try { parsed = text_body ? JSON.parse(text_body) : null; } catch { parsed = null; }

  if (!res.ok) {
    const msg = parsed && parsed.message ? parsed.message : text_body || `HTTP ${res.status}`;
    const err = new Error(`Resend API ${res.status}: ${msg}`);
    err.code = `RESEND_${res.status}`;
    err.responseBody = parsed || text_body;
    throw err;
  }

  // Resend returns { id: "<uuid>" } on success.
  const id = parsed && parsed.id ? parsed.id : null;
  return {
    id,
    messageId: id,
    accepted: Array.isArray(to) ? to : [to],
    rejected: [],
    pending: [],
    response: parsed || text_body,
  };
}

/**
 * Common send helper for invite + reset (and future transactional mail).
 *
 *   - Resolves from / reply-to from env, normalised.
 *   - Logs driver, recipient, subject at send time.
 *   - Logs Resend id + accepted/rejected on success.
 *   - Returns { sent, driver, ... } so controllers can distinguish soft-fail
 *     (RESEND_NOT_CONFIGURED) from hard-fail (SEND_FAILED).
 */
async function _sendMail({ tag, to, subject, text, html }) {
  const fromAddress = normalizeFromAddress(
    process.env.RESEND_FROM || process.env.RESEND_REPLY_TO,
  );
  const replyTo = normalizeFromAddress(
    process.env.RESEND_REPLY_TO || process.env.RESEND_FROM,
  );

  console.log(
    `[${tag}] Sending email via=resend to=${to} from="${fromAddress}" subject="${subject}"`,
  );

  try {
    const info = await _sendViaResend({
      tag,
      to,
      fromAddress,
      subject,
      text,
      html,
      replyTo,
    });
    console.log(
      `[${tag}] Email sent successfully via=resend to=${to} from="${fromAddress}" ` +
        `id=${info && info.messageId} accepted=${JSON.stringify(info && info.accepted)}`,
    );
    return {
      sent: true,
      driver: 'resend',
      messageId: info?.messageId || null,
      from: fromAddress,
      accepted: info?.accepted || [],
      rejected: info?.rejected || [],
      pending: info?.pending || [],
      response: info?.response || null,
    };
  } catch (err) {
    console.error(
      `[${tag}] Failed to send via=resend to=${to} from="${fromAddress}":`,
      err && err.message,
      err && err.code,
    );
    if (err && err.stack) console.error(`[${tag}] Stack:`, err.stack);
    return {
      sent: false,
      driver: 'resend',
      reason: 'SEND_FAILED',
      error: err && err.message,
      code: err && err.code,
      from: fromAddress,
    };
  }
}

/**
 * Pre-flight guard before invoking the send helper.
 *
 *   - When RESEND_API_KEY is present and RESEND_FROM is parseable, return null
 *     (caller proceeds).
 *   - Otherwise emit a single warning log and return a soft-fail shape that the
 *     caller can hand back to the client (still 200 OK to avoid leaking which
 *     emails are registered).
 */
function _preflightOrSkip(tag, to, fallbackUrl) {
  const status = getEmailStatus();
  if (status.configured && normalizeFromAddress(process.env.RESEND_FROM) !== 'noreply@localhost') {
    return null;
  }

  const reason = status.configured ? 'FROM_INVALID' : 'RESEND_NOT_CONFIGURED';
  console.warn(
    `[${tag}] Email skipped reason=${reason}. Missing keys: ${status.missing.join(', ') || '(none)'}. ` +
      `Fallback link for ${to}: ${fallbackUrl}`,
  );
  return {
    sent: false,
    inviteUrl: fallbackUrl,
    resetUrl: fallbackUrl,
    reason,
    missing: status.missing,
  };
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
  hasResendConfig,
  getEmailStatus,
  normalizeFromAddress,
  verifyResendConnection,
};
