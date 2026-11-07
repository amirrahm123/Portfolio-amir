// POST /api/contact → emails the enquiry to Amir's Gmail (reply goes straight to the sender).
// Needs GMAIL_USER and GMAIL_APP_PASSWORD in the Vercel project settings.
import nodemailer from 'nodemailer';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const hits = new Map(); // best-effort rate limit per warm instance

const clean = (v, max) => String(v ?? '').replace(/[\r\0]/g, '').trim().slice(0, max);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  if (body.company_site) return res.status(200).json({ ok: true }); // honeypot: bots fill it

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 5) return res.status(429).json({ error: 'Too many messages, please try again later.' });
  hits.set(ip, [...recent, now]);

  const name = clean(body.name, 100);
  const email = clean(body.email, 200);
  const business = clean(body.business, 150);
  const phone = clean(body.phone, 40);
  const topic = clean(body.topic, 80);
  const message = clean(body.message, 5000);
  if (!name || !EMAIL.test(email) || !message) return res.status(400).json({ error: 'Missing name, email or message.' });

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) return res.status(500).json({ error: 'Mail is not configured.' });

  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
    });
    await transport.sendMail({
      from: { name: 'Portfolio enquiry', address: process.env.GMAIL_USER },
      to: process.env.GMAIL_USER,
      replyTo: { name, address: email },
      subject: `New enquiry: ${topic || 'Website'} – ${business || name}`,
      text: [
        `Name: ${name}`,
        `Business: ${business || '-'}`,
        `Email: ${email}`,
        `Phone: ${phone || '-'}`,
        `Wants: ${topic || '-'}`,
        '',
        message,
      ].join('\n'),
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ error: 'Could not send right now.' });
  }
}
