'use strict';
require('dotenv').config();

(async () => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;

  if (!apiKey || !from) {
    console.error('Thiếu RESEND_API_KEY hoặc RESEND_FROM. Cập nhật Backend/.env trước.');
    process.exit(1);
  }

  const target = process.argv[2] || 'khanhhvbde180098@fpt.edu.vn';

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 20_000);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [target],
        subject: 'Plain test from EZProject',
        text: 'Hello. If you see this, basic Resend delivery works.',
      }),
      signal: ctrl.signal,
    });

    const body = await res.text();
    console.log(`status=${res.status}`);
    console.log(`body=${body}`);

    if (!res.ok) process.exit(1);
  } catch (e) {
    console.error('ERR:', (e && (e.response || e.message)) || e, e && e.code);
    process.exit(1);
  } finally {
    clearTimeout(timeout);
  }
})();
