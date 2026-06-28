'use strict';

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
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

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

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

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: `${inviterName} mời bạn tham gia dự án "${projectName}"`,
      text,
      html,
    });
    return { sent: true, inviteUrl };
  } catch (err) {
    console.error(`[InviteEmail] Failed to send to ${to}:`, err.message);
    return { sent: false, inviteUrl, reason: 'SEND_FAILED', error: err.message };
  }
}

module.exports = { buildInviteUrl, sendProjectInviteEmail, hasSmtpConfig, getSmtpStatus };
