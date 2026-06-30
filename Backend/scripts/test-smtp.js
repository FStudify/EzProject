'use strict';
require('dotenv').config();
const nm = require('nodemailer');
const cfg = {
  host: process.env.SMTP_HOST,
  port: 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
};
const t = nm.createTransport(cfg);
(async () => {
  console.log('verify:', await t.verify());
  const r = await t.sendMail({
    from: process.env.SMTP_USER,
    to: 'khanhhvbde180098@fpt.edu.vn',
    subject: 'Plain test from EZProject',
    text: 'Hello. If you see this, basic SMTP delivery works.',
  });
  console.log('sent:', r.messageId, r.response);
})().catch((e) =>
  console.error('ERR:', (e && (e.response || e.message)) || e, e && e.code),
);
