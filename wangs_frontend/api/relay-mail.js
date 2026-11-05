const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Relay-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { to, subject, html, secret } = req.body || {};
  const expectedSecret = process.env.MAIL_RELAY_SECRET || 'wangs-internal-mail-secret-key-2026';
  const providedSecret = secret || req.headers['x-relay-secret'];

  if (providedSecret !== expectedSecret) {
    return res.status(401).json({ error: 'Unauthorized relay request' });
  }

  if (!to || !subject || !html) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // Port 587 uses STARTTLS
      auth: {
        user: process.env.EMAIL_HOST_USER || 'wangssupport@gmail.com',
        pass: (process.env.EMAIL_HOST_PASSWORD || 'xphhqfosryvzyscc').replace(/\s+/g, ''),
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from: `"Wangs Marketplace" <${process.env.EMAIL_HOST_USER || 'wangssupport@gmail.com'}>`,
      to,
      subject,
      html,
    });

    console.log(`[VERCEL MAIL RELAY] Successfully sent to ${to}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error(`[VERCEL MAIL RELAY ERROR] Failed to send to ${to}:`, err);
    return res.status(500).json({ success: false, error: err.message || String(err) });
  }
};
