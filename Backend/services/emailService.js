'use strict';

let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch {
  nodemailer = null;
}

function hasSmtpConfig() {
  return Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS,
  );
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function buildInviteUrl(token) {
  return `${getFrontendUrl()}/invite/${token}`;
}

async function sendProjectInviteEmail({ to, projectName, inviterName, token }) {
  const inviteUrl = buildInviteUrl(token);

  if (!hasSmtpConfig() || !nodemailer) {
    console.log(`[InviteEmail] SMTP not configured. Invite link for ${to}: ${inviteUrl}`);
    return { sent: false, inviteUrl, reason: 'SMTP_NOT_CONFIGURED' };
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

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Invitation to join ${projectName}`,
    text: `${inviterName} invited you to join ${projectName} on EZProject.\n\nOpen this link to accept:\n${inviteUrl}`,
    html: `
      <p>${inviterName} invited you to join <strong>${projectName}</strong> on EZProject.</p>
      <p><a href="${inviteUrl}">Accept invitation</a></p>
      <p>If the button does not work, copy this link:</p>
      <p>${inviteUrl}</p>
    `,
  });

  return { sent: true, inviteUrl };
}

module.exports = { buildInviteUrl, sendProjectInviteEmail };
