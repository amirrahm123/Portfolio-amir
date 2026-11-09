// POST /api/chat { mode, messages: [{role:'user'|'assistant', content}] } → { reply, card? }
// The site's live AI assistant. Two kinds of conversation:
//   mode "buildlab"  – answers about Amir's work; with the visitor's OK it emails their enquiry to Amir.
//   mode "law" | "clinic" | "venue" – a demo assistant for a FICTIONAL business, showing what a bot built
//                                      for that kind of business does. Booking requests become a card only.
// Needs ANTHROPIC_API_KEY (and GMAIL_USER / GMAIL_APP_PASSWORD for real enquiries) in the Vercel project.
import nodemailer from 'nodemailer';

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';
const MAX_TURNS = 30;      // messages per conversation
const MAX_CHARS = 600;     // per visitor message
const hits = new Map();    // best-effort rate limit per warm instance

const STYLE = `Style: warm, calm and to the point, like a helpful person at the front desk. Reply in the language the visitor writes in (Hebrew, English or German). Keep answers short: 1 to 4 sentences, plain text, no markdown headings or tables. At most one question back to the visitor per reply. Never invent facts that are not given here; if you don't know, say so and offer to pass the question on.`;

const BUILDLAB = `You are the assistant on the portfolio website of Amir Rahm (BuildLab), a full-stack developer who designs and builds websites and AI tools for small businesses, mainly law firms, private clinics and event venues, in Israel and Germany. Amir works between Munich and Nahariya.

What you know (only this):
- How Amir works: first a free homepage concept with the client's name, services and style, at no cost and no obligation. Then the full website in about four weeks: every page written and built together with the client, in Hebrew, English or German, tested on phones, connected to WhatsApp, email and booking. After launch the client's team edits texts and photos themselves; a small monthly plan covers updates, hosting and backups.
- Beyond websites: booking systems, admin panels, and AI tools that save staff time, like this assistant itself (an AI assistant can answer client questions 24/7 and collect appointment requests on a business's site or WhatsApp).
- Work you can point to on this page: Eran Beker Law Firm (ebeker.co.il, personal injury law, Nahariya, about 30 pages, intake form, WhatsApp and click-to-call, accessibility); Achuzat Sandrine (sandrine-events.com, wedding and event estate in Regba, gallery, lead filtering, admin panel, WhatsApp booking); a homepage concept for a private clinic in Munich; online booking with an owner dashboard for a barbershop; HoopAssist, an AI tool that analyses basketball game film for coaches.
- Amir builds with Next.js, React and TypeScript and uses AI tools, which keeps projects fast and budgets fair. He speaks Hebrew and English.
- Contact: email amirrahm135@gmail.com, WhatsApp +972 52 704 4989, or the contact form at the bottom of the page. He replies within one working day.
- Prices: you don't quote numbers. The concept is free; the price for the full site depends on its size and is sent after the concept, so the client sees the result before deciding.

You can pass an enquiry to Amir with the send_enquiry_to_amir tool. Only use it after the visitor has given their name and an email or phone number AND said they want Amir to contact them. Never pressure anyone. Never criticise anyone's current website.
${STYLE}`;

const DEMO_RULES = `This is a DEMO on a web developer's portfolio: the business is fictional, but you behave exactly like the assistant would on its real website. Answer questions about the business from the facts below, help visitors find the right service, and take appointment requests with the request_appointment tool once you have the visitor's name, phone number and preferred time (ask for what is missing, one thing at a time). After the tool succeeds, confirm warmly and say the team will call back to confirm. If someone asks whether this is real, say it's a demo assistant built by Amir Rahm to show how an AI assistant works for a business like this, and that he can build one trained on their own business.
${STYLE}`;

const DEMOS = {
  law: `${DEMO_RULES}

Business: Cohen & Levi Law Office, Haifa (fictional).
- Practice areas: family law and divorce, real estate transactions, employment law, wills and inheritance.
- Office: Ha'Atzmaut Road 40, Haifa. Hours: Sunday to Thursday 9:00 to 18:00.
- First step: a free 20-minute introductory call with a lawyer, by phone or in the office. Fees are discussed in that call.
- Lawyers: Adv. Dana Cohen (family law, inheritance), Adv. Yoav Levi (real estate, employment).
- You never give legal advice or predict outcomes; you explain the next step and offer the introductory call.`,
  clinic: `${DEMO_RULES}

Business: Lindenhof Private Practice, Munich (fictional).
- Departments: orthopedics, dermatology, gynecology. Private patients and self-payers; statutory patients can book as self-payers.
- Address: Lindenstraße 12, 80331 Munich. Hours: Monday to Friday 8:00 to 18:00.
- Appointments usually within one week; the team speaks German and English.
- If a visitor describes symptoms, help them pick the right department in plain words, without diagnosing. Never give medical advice. For an emergency, tell them to call 112 right away.`,
  venue: `${DEMO_RULES}

Business: Olive Grove Estate, Western Galilee (fictional).
- Weddings for 150 to 450 guests and corporate events; a garden ceremony area and an indoor hall.
- Season: April to November outdoors, the hall all year. Catering by a kosher partner kitchen.
- Visits: guided tours of the estate by appointment, Sunday to Thursday.
- Prices depend on the date and guest count; the events coordinator sends a personal quote after the tour. Don't quote numbers.`,
};

const ENQUIRY_TOOL = {
  name: 'send_enquiry_to_amir',
  description: "Email the visitor's enquiry to Amir so he can reply. Only call this after the visitor gave a name and an email or phone, and agreed to be contacted.",
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      email: { type: 'string', description: 'Email address, if given' },
      phone: { type: 'string', description: 'Phone number, if given' },
      business: { type: 'string', description: 'Their business, if mentioned' },
      need: { type: 'string', description: 'One or two sentences: what they want, in their words' },
    },
    required: ['name', 'need'],
  },
};
const BOOKING_TOOL = {
  name: 'request_appointment',
  description: 'Record an appointment / tour / intro-call request for the team to confirm by phone.',
  input_schema: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      phone: { type: 'string' },
      service: { type: 'string', description: 'What it is about (practice area, department, event type)' },
      preferred_time: { type: 'string', description: 'Preferred day/time in the visitor’s words' },
      notes: { type: 'string' },
    },
    required: ['name', 'phone', 'service', 'preferred_time'],
  },
};

const clean = (v, max) => String(v ?? '').replace(/[\r\0]/g, '').trim().slice(0, max);

async function claude(system, messages, tools) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: MODEL, max_tokens: 500, system, tools, messages }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Claude ${r.status}`);
  return j;
}

async function emailEnquiry(input, transcript) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) throw new Error('mail not configured');
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, '') },
  });
  const email = clean(input.email, 200);
  await transport.sendMail({
    from: { name: 'Portfolio assistant', address: process.env.GMAIL_USER },
    to: process.env.GMAIL_USER,
    ...(email.includes('@') ? { replyTo: { name: clean(input.name, 100), address: email } } : {}),
    subject: `New enquiry via the site assistant – ${clean(input.business, 100) || clean(input.name, 100)}`,
    text: [
      `Name: ${clean(input.name, 100)}`,
      `Business: ${clean(input.business, 150) || '-'}`,
      `Email: ${email || '-'}`,
      `Phone: ${clean(input.phone, 40) || '-'}`,
      `Wants: ${clean(input.need, 1000)}`,
      '',
      '--- Conversation ---',
      transcript,
    ].join('\n'),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'The assistant is not configured yet.' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 40) return res.status(429).json({ error: 'Lots of questions! Please try again in a few minutes.' });
  hits.set(ip, [...recent, now]);

  const mode = ['buildlab', 'law', 'clinic', 'venue'].includes(body.mode) ? body.mode : 'buildlab';
  const raw = Array.isArray(body.messages) ? body.messages.slice(-MAX_TURNS) : [];
  const messages = raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: clean(m.content, m.role === 'user' ? MAX_CHARS : 2000) }));
  while (messages.length && messages[0].role !== 'user') messages.shift();
  if (!messages.length || messages.at(-1).role !== 'user') return res.status(400).json({ error: 'No question.' });
  if (raw.length >= MAX_TURNS) return res.status(200).json({ reply: 'This chat is getting long. For anything else, write to Amir directly: amirrahm135@gmail.com or WhatsApp +972 52 704 4989.' });

  const system = mode === 'buildlab' ? BUILDLAB : DEMOS[mode];
  const tools = [mode === 'buildlab' ? ENQUIRY_TOOL : BOOKING_TOOL];
  const convo = [...messages];
  let card = null;

  try {
    for (let step = 0; step < 3; step++) {
      const out = await claude(system, convo, tools);
      const uses = (out.content || []).filter((b) => b.type === 'tool_use');
      if (out.stop_reason !== 'tool_use' || !uses.length) {
        const reply = (out.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
        return res.status(200).json({ reply: reply || '…', card });
      }
      convo.push({ role: 'assistant', content: out.content });
      const results = [];
      for (const u of uses) {
        let result;
        if (u.name === 'send_enquiry_to_amir') {
          const transcript = messages.map((m) => `${m.role === 'user' ? 'Visitor' : 'Assistant'}: ${m.content}`).join('\n');
          try {
            await emailEnquiry(u.input || {}, transcript);
            card = { type: 'enquiry', name: clean(u.input?.name, 100), need: clean(u.input?.need, 300) };
            result = 'Sent. Amir will reply within one working day.';
          } catch {
            result = 'Could not send right now. Ask the visitor to use the contact form or WhatsApp +972 52 704 4989.';
          }
        } else if (u.name === 'request_appointment') {
          const i = u.input || {};
          card = { type: 'booking', mode, name: clean(i.name, 100), phone: clean(i.phone, 40), service: clean(i.service, 120), time: clean(i.preferred_time, 120), notes: clean(i.notes, 300) };
          result = 'Request recorded. The team will call back to confirm.';
        } else {
          result = 'Unknown tool.';
        }
        results.push({ type: 'tool_result', tool_use_id: u.id, content: result });
      }
      convo.push({ role: 'user', content: results });
    }
    res.status(200).json({ reply: 'Done.', card });
  } catch (e) {
    res.status(502).json({ error: 'The assistant is resting for a moment. Please try again.' });
  }
}
