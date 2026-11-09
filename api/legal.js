// POST /api/legal → the document-AI demo for law firms (/legal).
//   { action: 'review', docs: [{id, name, text}] }            → { summary, fields[], issues[] }
//   { action: 'ask', docs: [...], question }                 → { answer, refs[] }
// Every source quote the model returns is checked against the document text on the server:
// each ref gets verified: true/false, so the page can show which items are backed by the file.
// Needs ANTHROPIC_API_KEY in the Vercel project.

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
- Do arithmetic yourself when relevant (e.g. whether payments add up to the price) and show the numbers.
- Check dates against each other (e.g. validity periods vs. the signing date).`;

const REF = {
  type: 'object',
  properties: { doc: { type: 'string', description: 'Document id' }, quote: { type: 'string', description: 'Exact quote, 3-20 words' } },
  required: ['doc', 'quote'],
};

const REVIEW_TOOL = {
  name: 'file_review',
  description: 'The structured review of the file.',
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '2-3 sentences: what this file is and the main things the lawyer must look at.' },
      fields: {
        type: 'array',
        description: 'The key data of the file (8-14 items): parties and IDs, property identifiers, price, payments, dates, liens, attachments, etc.',
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
      issues: {
        type: 'array',
        description: 'Discrepancies, risks and missing items for the lawyer, most important first.',
        items: {
          type: 'object',
          properties: {
            severity: { type: 'string', enum: ['high', 'medium', 'low'] },
            title: { type: 'string', description: 'Short, specific.' },
            detail: { type: 'string', description: 'What each document says and why it matters, 1-3 sentences.' },
            action: { type: 'string', description: 'What the lawyer should check or do next.' },
            refs: { type: 'array', items: REF },
          },
          required: ['severity', 'title', 'detail', 'refs'],
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

function verifyRefs(refs, docs) {
  return (Array.isArray(refs) ? refs : []).slice(0, 4).map((r) => {
    const doc = docs.find((d) => d.id === r.doc) || docs.find((d) => norm(d.text).includes(norm(r.quote)));
    const quote = String(r.quote || '').slice(0, 300);
    return { doc: doc?.id || String(r.doc || ''), quote, verified: !!doc && norm(quote).length >= 4 && norm(doc.text).includes(norm(quote)) };
  });
}

async function claude(system, user, tool, maxTokens) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      tools: [tool],
      // this model doesn't accept a forced tool_choice: ask for the tool in the prompt instead
      messages: [{ role: 'user', content: `${user}\n\nReturn your result by calling the ${tool.name} tool (only that, no other text).` }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || `Claude ${r.status}`);
  const use = (j.content || []).find((b) => b.type === 'tool_use');
  if (use) return use.input;
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
    const out = await claude(SYSTEM, `${file}\n\nבצע סקירה מלאה של התיק: חלץ את הנתונים המרכזיים, הצלב בין המסמכים, וסמן כל אי-התאמה, סיכון או פרט חסר שעורך הדין צריך לבדוק.`, REVIEW_TOOL, 4000);
    const order = { high: 0, medium: 1, low: 2 };
    res.status(200).json({
      summary: String(out.summary || ''),
      fields: (out.fields || []).slice(0, 20).map((f) => ({ label: String(f.label || ''), value: String(f.value || ''), refs: verifyRefs(f.refs, docs) })),
      issues: (out.issues || []).slice(0, 15)
        .map((x) => ({ severity: ['high', 'medium', 'low'].includes(x.severity) ? x.severity : 'medium', title: String(x.title || ''), detail: String(x.detail || ''), action: String(x.action || ''), refs: verifyRefs(x.refs, docs) }))
        .sort((a, b) => order[a.severity] - order[b.severity]),
    });
  } catch (e) {
    console.error('legal api error:', e.message);
    res.status(502).json({ error: 'הבדיקה לא הצליחה כרגע. נסו שוב בעוד רגע.', detail: String(e.message || '').slice(0, 200) });
  }
}
