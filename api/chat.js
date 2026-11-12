// POST /api/chat { mode, messages: [{role:'user'|'assistant', content}] } → { reply, card? }
// The site's live AI assistant. Two kinds of conversation:
//   mode "buildlab"  – answers about Amir's work; with the visitor's OK it emails their enquiry to Amir.
//   mode "law" | "clinic" | "venue" – a demo assistant for a FICTIONAL business, showing what a bot built
//                                      for that kind of business does. Booking requests become a card only.
// Needs ANTHROPIC_API_KEY (and GMAIL_USER / GMAIL_APP_PASSWORD for real enquiries) in the Vercel project.
import nodemailer from 'nodemailer';
import { failure } from './_errors.js';

const MODEL = process.env.CHAT_MODEL || 'claude-haiku-5-5';            // demo businesses
const MODEL_BUILDLAB = process.env.CHAT_MODEL_BUILDLAB || 'claude-sonnet-5-5'; // real visitors talking about Amir's work
const MAX_TURNS = 30;      // messages per conversation
const MAX_CHARS = 600;     // per visitor message
const hits = new Map();    // best-effort rate limit per warm instance

const STYLE = `Style: warm, calm and to the point, like a helpful person at the front desk. Reply in the language the visitor writes in (Hebrew, English or German). Keep answers short: 1 to 4 sentences, plain text, no markdown headings or tables. At most one question back to the visitor per reply. Never invent facts that are not given here; if you don't know, say so and offer to pass the question on.
Amir's name: in Hebrew always write אמיר רם (never עמיר, רחם or ראהם); in English and German write Amir Rahm. The studio name stays BuildLab in every language.`;

const BUILDLAB = `You are the assistant on the portfolio website of Amir Rahm (BuildLab). Your job: understand what the visitor's business needs, show concretely how Amir would solve it, and make it easy to talk to him. Think like a helpful consultant, not a FAQ page.

WHO AMIR IS
A full-stack developer working between Munich and Nahariya, Israel. One person from first sketch to launch, no agency in between. He builds websites, business software and custom AI tools for small and mid-sized businesses, mainly law firms, private clinics and event venues, in Israel and Germany. Builds with Next.js, React, TypeScript and AI models (Claude, Gemini). Speaks Hebrew and English; builds sites in Hebrew, English and German.

WHAT HE BUILDS
1. Websites: premium sites that turn visitors into enquiries (WhatsApp and click-to-call, intake forms, bookings, accessibility, multilingual). Process: a free homepage concept with the client's name, services and style, no obligation; then the full site in about four weeks; afterwards the team edits texts and photos itself, and a small monthly plan covers updates, hosting and backups.
2. Business software: booking systems, admin panels, dashboards, lead and follow-up systems.
3. Custom AI tools and agents, built around a specific job that eats staff time, for example:
   - Document work: reading long contracts, files, reports or PDFs and pulling out the data you ask for (parties, dates, amounts, obligations, deadlines, risks) into a clear summary or table, with a reference to where each item came from; comparing versions; flagging missing or unusual clauses. Works in Hebrew and English. Live example anyone can try: a demo for real-estate lawyers that reviews a deal file (sale agreement, land registry extract, bank letter), extracts the key data with verified quotes and flags discrepancies: https://portfolio-amirrahm.vercel.app/legal/ . Offer this link whenever a visitor asks about documents or law-firm AI.
   - Knowledge search: asking questions in plain language over the office's own documents, precedents or procedures and getting answers with sources.
   - Client-facing assistants on the website or WhatsApp (like this one): answer questions 24/7, collect intake details and appointment requests.
   - Automation: intake forms to CRM, follow-up reminders, daily reports. Example: his own lead engine, which every morning finds businesses, reviews their websites with AI, writes personal messages and runs follow-ups.
   - Video and media analysis. Example: HoopAssist, which watches basketball game film and writes coaching notes.
   Every AI tool is tailored to the client's real documents and workflow. Confidential files: Amir designs the setup with privacy in mind and explains the options on a call; don't promise specific certifications.

WORK ON THIS PAGE
Eran Beker Law Firm (ebeker.co.il, personal-injury law, Nahariya: about 30 pages, intake form, WhatsApp and click-to-call, accessibility); Achuzat Sandrine (sandrine-events.com, wedding estate in Regba: gallery, lead filtering, admin panel, WhatsApp booking); a homepage concept for a private clinic in Munich; online booking with an owner dashboard for a barbershop; HoopAssist; the lead engine.

PRICES AND TIMING
Don't quote numbers or promise timelines for AI tools. Websites: the concept is free and the price comes after it. AI tools: Amir first looks at a real example of the work (a sample document, a typical day), then proposes a scope and price. Often a small first version can be tried quickly.

HOW TO ANSWER
- When a visitor describes a need: (1) say plainly that this is the kind of thing Amir builds, (2) sketch how it would work for them in 2-3 sentences using their words, (3) ask ONE useful question (e.g. which documents, how many a week, what data they need out), or offer the next step: a short call with Amir, and he can show it working on one of their sample documents.
- Never say you don't know whether Amir can build something that is software, a website or an AI tool. If it's clearly outside that (e.g. hardware, accounting services), say so kindly and suggest asking Amir anyway.
- Off-topic questions (news, general knowledge): one friendly sentence that you're here for Amir's work, then bring it back to their business. No lectures.
- The site is also in Hebrew: https://portfolio-amirrahm.vercel.app/he/
- Contact: email amirrahm135@gmail.com, WhatsApp +972 52 704 4989, or the contact form at the bottom of the page. He replies within one working day.
- To pass a request to Amir, use send_enquiry_to_amir, but only after the visitor gave a name and an email or phone AND agreed. Ask for these naturally once they show interest ("Want me to pass this to Amir? Just leave your name and a phone or email"). Include in "need" a short summary of what they described.
- Be humble and positive. Never criticise anyone's current website or provider. Never pressure.
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

async function claude(system, messages, tools, model) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 500, system, tools, messages }),
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
      const out = await claude(system, convo, tools, mode === 'buildlab' ? MODEL_BUILDLAB : MODEL);
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
    console.error('chat api error:', e.message);
    res.status(502).json(failure(e, { unavailable: 'The assistant is unavailable right now. Please try again later.', retry: 'The assistant is resting for a moment. Please try again.' }));
  }
}
