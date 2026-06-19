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

  try {
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
  } catch (err) {
    console.error(`[InviteEmail] Failed to send to ${to}:`, err.message);
    return { sent: false, inviteUrl, reason: 'SEND_FAILED', error: err.message };
  }
}

module.exports = { buildInviteUrl, sendProjectInviteEmail, hasSmtpConfig, getSmtpStatus };
