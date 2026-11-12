// POST /api/legal → the document-AI demo for law firms (/legal).
//   { action: 'review', docs: [{id, name, text}] }            → { summary, fields[], issues[] }
//   { action: 'ask', docs: [...], question }                 → { answer, refs[] }
// Every source quote the model returns is checked against the document text on the server:
// each ref gets verified: true/false, so the page can show which items are backed by the file.
// Needs ANTHROPIC_API_KEY in the Vercel project.

import { failure } from './_errors.js';

export const config = { maxDuration: 60 }; // a full review takes ~20-40s

const MODEL = process.env.LEGAL_MODEL || 'claude-sonnet-5-5';
const MAX_DOCS = 4, MAX_DOC = 25000, MAX_TOTAL = 60000;
const hits = new Map();

const SYSTEM = `You are a meticulous legal assistant in an Israeli law office. You read the documents of a file and help the lawyer review it quickly. You never decide legal questions; you surface facts, discrepancies and risks for the lawyer to check.

Rules:
- Work only from the documents given. Never use outside knowledge about these people or properties, never guess.
- Every fact you report must come with its source: the document id and a SHORT EXACT quote copied character for character from that document (3 to 20 words, no "..." inside, keep the original spelling, punctuation and numbers).
- Write in Hebrew, clear and concise, the way a senior associate would brief a partner.
- When documents disagree, say exactly what each one says and quote both.
- Do the arithmetic yourself wherever numbers should agree (payments vs. the price, percentages, areas) and show the numbers. A sum that does not add up is a finding of its own, kind "mismatch", severity high when it concerns the price or the payments. Never fold it into a finding about something else.
- Dates: before you write about a validity period, work out the last valid day (issue date + period), then compare it with each relevant date separately (signing, each payment, handover). Say "expired before X" only when the last valid day is earlier than X. If it is still valid on the signing date but ends before a later payment, say exactly that.
- One finding per subject. The title states the finding itself and must agree with the detail: never a title that says things match when the detail shows they do not, and never a title about one subject over a detail about another.
- Things you checked and found consistent are not findings. Mention them in the summary, not in the list.

Two kinds of findings, keep them apart:
- "mismatch": a hard contradiction you can show with two quotes. Two documents state different things about the same fact (identifier, ID number, name, bank, area, attachment), a document contradicts the registry (e.g. the contract declares there are no notes and the extract shows one), numbers inside a document do not add up, or a document is already out of date on the date it is relied on.
- "check": a point for the lawyer's judgment where nothing contradicts anything: a missing mechanism or document, a clause worth tightening, a timing gap, a question to ask the client. Severity of a "check" is medium or low, never high.
If the documents are consistent with each other, return no "mismatch" findings at all. Do not promote a general observation to a mismatch, and do not invent a contradiction to have something to report.`;

const REF = {
  type: 'object',
  properties: { doc: { type: 'string', description: 'Document id' }, quote: { type: 'string', description: 'Exact quote, 3-12 words' } },
  required: ['doc', 'quote'],
};

const REVIEW_TOOL = {
  name: 'file_review',
  description: 'The structured review of the file.',
  input_schema: {
    type: 'object',
    properties: {
      issues: {
        type: 'array',
        description: 'Findings for the lawyer: first every mismatch, then the points to check, most important first. Write these FIRST. At most 2 sources per item. At most 6 items of kind "check".',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['mismatch', 'check'], description: 'mismatch = a hard contradiction shown by quotes; check = a point for the lawyer to consider.' },
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            title: { type: 'string', description: 'Short, specific, states the finding. Must agree with the detail.' },
            detail: { type: 'string', description: 'What each document says and why it matters, 1-3 sentences.' },
            action: { type: 'string', description: 'What the lawyer should check or do next.' },
            refs: { type: 'array', items: REF },
          },
          required: ['kind', 'severity', 'title', 'detail', 'refs'],
        },
      },
      summary: { type: 'string', description: '2-3 sentences: what this file is and the main things the lawyer must look at.' },
      fields: {
        type: 'array',
        description: 'The key data of the file (6-10 items, one source each): parties and IDs, property identifiers, price, payments, dates, liens.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string' },
            value: { type: 'string' },
            refs: { type: 'array', items: REF },
          },
          required: ['label', 'value', 'refs'],
        },
      },
    },
    required: ['summary', 'fields', 'issues'],
  },
};

const ASK_TOOL = {
  name: 'answer',
  description: 'Answer the lawyer’s question from the documents.',
  input_schema: {
    type: 'object',
    properties: {
      answer: { type: 'string', description: 'Direct answer in Hebrew, 1-4 sentences. If the documents do not say, answer that clearly.' },
      refs: { type: 'array', items: REF },
    },
    required: ['answer', 'refs'],
  },
};

// Hebrew documents mix quote marks (" ״ ”) and spacing; compare on a normalised form.
export function norm(s) {
  return String(s || '')
    .replace(/[״”“"׳’‘`']/g, '')
    .replace(/[–—־-]/g, '-')
    .replace(/\s+/g, '')
    .toLowerCase();
}

/** The model sometimes sends a list as a JSON string (or a single object) instead of an array. */
export function list(x) {
  if (Array.isArray(x)) return x;
  if (typeof x === 'string') {
    const m = x.match(/\[[\s\S]*\]/);
    if (m) { try { const v = JSON.parse(m[0]); if (Array.isArray(v)) return v; } catch { /* not a JSON list */ } }
    return [];
  }
  return x && typeof x === 'object' ? [x] : [];
}

function verifyRefs(refs, docs) {
  return list(refs).filter((r) => r && typeof r === 'object').slice(0, 4).map((r) => {
    const doc = docs.find((d) => d.id === r.doc) || docs.find((d) => norm(d.text).includes(norm(r.quote)));
    const quote = String(r.quote || '').slice(0, 300);
    return { doc: doc?.id || String(r.doc || ''), quote, verified: !!doc && norm(quote).length >= 4 && norm(doc.text).includes(norm(quote)) };
  });
}

/** One finding as the page gets it. A "check" is a point to consider, so it never carries the top severity. */
export function finding(x, docs) {
  const kind = x.kind === 'check' ? 'check' : 'mismatch';
  let severity = ['high', 'medium', 'low'].includes(x.severity) ? x.severity : 'medium';
  if (kind === 'check' && severity === 'high') severity = 'medium';
  return { kind, severity, title: String(x.title || ''), detail: String(x.detail || ''), action: String(x.action || ''), refs: verifyRefs(x.refs, docs) };
}

/** Strict tool use: every object closed, every property required, so a tool call always has the full shape. */
export function strictSchema(s) {
  if (!s || typeof s !== 'object') return s;
  if (s.type === 'object' && s.properties) {
    const properties = Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, strictSchema(v)]));
    return { ...s, properties, required: Object.keys(properties), additionalProperties: false };
  }
  if (s.type === 'array' && s.items) return { ...s, items: strictSchema(s.items) };
  return s;
}

async function claude(system, user, tool, maxTokens) {
  const send = (strict) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      // Sonnet 5.5 thinks before answering by default, and that thinking counts against max_tokens:
      // the review ran out of room before it reached the findings. This is its lowest thinking setting.
      ...(/^claude-sonnet-5-5/.test(MODEL) ? { thinking: { type: 'between_tools' } } : {}),
      system,
      // This model doesn't accept a forced tool_choice. Strict tool use is what guarantees the shape:
      // without it the model sometimes sent only the summary, or a list as a string.
      tools: [strict ? { ...tool, strict: true, input_schema: strictSchema(tool.input_schema) } : tool],
      messages: [{ role: 'user', content: `${user}\n\nReturn your result by calling the ${tool.name} tool (only that, no other text).` }],
    }),
  });
  let r = await send(true);
  if (r.status === 400) r = await send(false); // schema not accepted as strict: fall back to the plain tool
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Claude ${r.status}`);
  const use = (j.content || []).find((b) => b.type === 'tool_use');
  // cut off by max_tokens: the tool input is incomplete (later keys are simply missing)
  if (use) return j.stop_reason === 'max_tokens' ? { ...use.input, truncated: true } : use.input;
  // fallback: the model answered in text; take the JSON object out of it
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch { /* not JSON */ } }
  if (tool.name === 'answer' && text.trim()) return { answer: text.trim(), refs: [] };
  throw new Error('no structured answer');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: 'הדמו עוד לא מוגדר (חסר מפתח API).' });
  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (recent.length >= 20) return res.status(429).json({ error: 'הרבה בדיקות בזמן קצר. נסו שוב בעוד כמה דקות.' });
  hits.set(ip, [...recent, now]);

  const docs = (Array.isArray(body.docs) ? body.docs : []).slice(0, MAX_DOCS)
    .map((d, i) => ({ id: String(d.id || `doc${i + 1}`).replace(/[^\w-]/g, '').slice(0, 30) || `doc${i + 1}`, name: String(d.name || `מסמך ${i + 1}`).slice(0, 60), text: String(d.text || '').slice(0, MAX_DOC) }))
    .filter((d) => d.text.trim().length > 30);
  if (!docs.length) return res.status(400).json({ error: 'אין מסמכים לבדיקה.' });
  if (docs.reduce((n, d) => n + d.text.length, 0) > MAX_TOTAL) return res.status(400).json({ error: 'המסמכים ארוכים מדי לדמו.' });

  const file = docs.map((d) => `<document id="${d.id}" name="${d.name}">\n${d.text}\n</document>`).join('\n\n');

  try {
    if (body.action === 'ask') {
      const q = String(body.question || '').trim().slice(0, 400);
      if (!q) return res.status(400).json({ error: 'אין שאלה.' });
      const out = await claude(SYSTEM, `${file}\n\nשאלת עורך הדין: ${q}`, ASK_TOOL, 900);
      return res.status(200).json({ answer: String(out.answer || ''), refs: verifyRefs(out.refs, docs) });
    }
    // A real file always has key data. A reply with neither findings nor data is a failed reply:
    // ask once more if there is time left, and never show it as "no discrepancies".
    const started = Date.now();
    let out, issues, fields;
    for (let attempt = 0; attempt < 2; attempt++) {
      out = await claude(SYSTEM, `${file}\n\nבצע סקירה מלאה של התיק: חלץ את הנתונים המרכזיים, הצלב בין המסמכים, וסמן כל אי-התאמה בין המסמכים, ובנפרד נקודות שעורך הדין צריך לבדוק.`, REVIEW_TOOL, 6500);
      issues = list(out.issues).filter((x) => x && typeof x === 'object');
      fields = list(out.fields).filter((f) => f && typeof f === 'object');
      if (issues.length || fields.length || Date.now() - started > 20000) break;
    }
    if (!issues.length && !fields.length) throw new Error(out.truncated ? 'review cut off before the findings' : 'review came back empty');
    if (out.truncated && !issues.length) throw new Error('review cut off before the findings');
    // findings were sent in a form that can't be read: an error, never "no discrepancies"
    if (!issues.length && out.issues != null && !Array.isArray(out.issues)) throw new Error('findings came back unreadable');
    const order = { high: 0, medium: 1, low: 2 };
    res.status(200).json({
      summary: String(out.summary || ''),
      partial: !!out.truncated,
      fields: fields.slice(0, 20).map((f) => ({ label: String(f.label || ''), value: String(f.value || ''), refs: verifyRefs(f.refs, docs) })),
      issues: issues.slice(0, 15).map((x) => finding(x, docs))
        .sort((a, b) => (a.kind === b.kind ? order[a.severity] - order[b.severity] : a.kind === 'mismatch' ? -1 : 1)),
    });
  } catch (e) {
    console.error('legal api error:', e.message);
    res.status(502).json(failure(e, { unavailable: 'הדמו אינו זמין כרגע. נסו שוב מאוחר יותר.', retry: 'הבדיקה לא הצליחה כרגע. נסו שוב בעוד רגע.' }));
  }
}
