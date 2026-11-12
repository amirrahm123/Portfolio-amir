// Unit + integration tests for the document-AI demo API (api/legal.js) and the sample deal file.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { call, fakeClaude } from './helpers.js';

process.env.ANTHROPIC_API_KEY = 'test';
globalThis.window = {};
await import('../site/legal/samples.js');
const { default: handler, norm, list } = await import('../api/legal.js');
const docs = window.SAMPLES.map(({ id, name, text }) => ({ id, name, text }));
const tool = (input) => ({ content: [{ type: 'tool_use', name: 'x', input }] });
let ip = 0; const fresh = () => ({ ip: `10.1.0.${++ip}` }); // separate rate-limit bucket per test

// ---- unit: normalisation used to verify quotes
test('norm ignores spacing and Hebrew/English quote-mark variants', () => {
  assert.equal(norm('1,850,000 ש"ח'), norm('1,850,000  ש״ח'));
  assert.equal(norm('תת-חלקה'), norm('תת–חלקה'));
  assert.notEqual(norm('תת חלקה: 8'), norm('תת חלקה: 7'));
});

// ---- the sample file really contains the planted discrepancies (so the demo can find them)
test('sample deal file contains the planted discrepancies', () => {
  const [contract, tabu, bank] = docs.map((d) => d.text);
  assert.match(contract, /תת-חלקה 7/); assert.match(tabu, /תת חלקה: 8/);
  assert.match(contract, /034567891/); assert.match(tabu, /034567819/);
  assert.match(contract, /בנק לאומי/); assert.match(tabu, /מזרחי טפחות/);
  assert.match(tabu, /הערת אזהרה/); assert.match(contract, /לא קיימות הערות אזהרה/);
  const pays = [...contract.matchAll(/סך של ([\d,]+) ש"ח/g)].map((m) => Number(m[1].replace(/,/g, '')));
  assert.equal(pays.reduce((a, b) => a + b, 0), 1825000); // vs price 1,850,000
  assert.match(bank, /תקף ל-30 ימים/);
});

// ---- integration: review flow with a fake Claude
test('review: verifies real quotes, flags invented ones, sorts issues by severity', async () => {
  const calls = fakeClaude(() => tool({
    summary: 'סיכום',
    fields: [
      { label: 'גוש', value: '18123', refs: [{ doc: 'contract', quote: 'גוש 18123 חלקה 45 תת-חלקה 7' }] },
      { label: 'תמורה', value: '1,850,000', refs: [{ doc: 'contract', quote: 'היא 1,850,000 ש״ח' }] },
      { label: 'מומצא', value: 'x', refs: [{ doc: 'contract', quote: 'הקונה ישלם 2,000,000 ש"ח במזומן' }] },
    ],
    issues: [{ severity: 'low', title: 'a', detail: 'a', refs: [] }, { severity: 'high', title: 'b', detail: 'b', refs: [{ doc: 'tabu', quote: 'תת חלקה: 8' }] }],
  }));
  const r = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(r.code, 200);
  assert.deepEqual(r.fields.map((f) => f.refs[0].verified), [true, true, false]);
  assert.deepEqual(r.issues.map((i) => i.severity), ['high', 'low']);
  assert.equal(calls[0].tool_choice, undefined, 'this model rejects a forced tool_choice');
  assert.equal(JSON.stringify(calls[0].tools).includes('$ref'), false, 'tool schemas must be inline');
});

test('review: a quote with the wrong doc id is still matched to the document that contains it', async () => {
  fakeClaude(() => tool({ summary: 's', fields: [{ label: 'x', value: 'y', refs: [{ doc: 'bank', quote: 'תת חלקה: 8' }] }], issues: [] }));
  const r = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(r.fields[0].refs[0].verified, false, 'wrong doc id: not silently accepted');
});

test('ask: returns an answer with verified sources; falls back to plain text', async () => {
  fakeClaude(() => tool({ answer: 'במאי 2027', refs: [{ doc: 'contract', quote: 'החזקה בדירה תימסר לקונה ביום 1 במאי 2027' }] }));
  let r = await call(handler, { action: 'ask', docs, question: 'מתי המסירה?' }, fresh());
  assert.equal(r.refs[0].verified, true);
  fakeClaude(() => ({ content: [{ type: 'text', text: 'במאי 2027.' }] }));
  r = await call(handler, { action: 'ask', docs, question: 'מתי המסירה?' }, fresh());
  assert.equal(r.code, 200); assert.equal(r.answer, 'במאי 2027.');
});

test('input limits and errors', async () => {
  fakeClaude(() => tool({}));
  assert.equal((await call(handler, { action: 'review', docs: [] }, fresh())).code, 400);
  assert.equal((await call(handler, { action: 'review', docs: [{ id: 'a', text: 'x'.repeat(26000) }, { id: 'b', text: 'y'.repeat(25000) }, { id: 'c', text: 'z'.repeat(25000) }] }, fresh())).code, 400);
  assert.equal((await call(handler, { action: 'ask', docs, question: '  ' }, fresh())).code, 400);
  assert.equal((await call(handler, {}, { method: 'GET' })).code, 405);
  fakeClaude(() => ({ __error: 400, message: 'bad request from Claude' }));
  const e = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(e.code, 502); assert.match(e.detail, /bad request from Claude/, 'the real reason is shown');
  // cut off by max_tokens before any finding: an error, never "no discrepancies"
  fakeClaude(() => ({ stop_reason: 'max_tokens', content: [{ type: 'tool_use', id: 't', name: 'file_review', input: { summary: 'נמצאו אי-התאמות' } }] }));
  const cut = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(cut.code, 502);
  fakeClaude(() => ({ stop_reason: 'max_tokens', content: [{ type: 'tool_use', id: 't', name: 'file_review', input: { issues: [{ severity: 'high', title: 'a', detail: 'b', refs: [] }] } }] }));
  const part = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(part.code, 200); assert.equal(part.partial, true); assert.equal(part.issues.length, 1);
  fakeClaude(() => ({ __error: 400, message: 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.' }));
  const c = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(c.code, 502); assert.equal(c.detail, undefined, 'account problems are not shown to visitors'); assert.match(c.error, /אינו זמין/);
});

test('rate limit: 20 requests per IP per 10 minutes', async () => {
  fakeClaude(() => tool({ answer: 'x', refs: [] }));
  const who = { ip: '10.9.9.9' };
  for (let i = 0; i < 20; i++) assert.equal((await call(handler, { action: 'ask', docs, question: 'q' }, who)).code, 200);
  assert.equal((await call(handler, { action: 'ask', docs, question: 'q' }, who)).code, 429);
});

test('the request turns off up-front thinking and never forces a tool', async () => {
  const calls = fakeClaude(() => tool({ answer: 'x', refs: [] }));
  await call(handler, { action: 'ask', docs, question: 'מה המחיר?' }, fresh());
  assert.deepEqual(calls[0].thinking, { type: 'between_tools' });
  assert.equal(calls[0].tool_choice, undefined);
});

test('lists sent as JSON strings are read, unreadable findings are an error', async () => {
  assert.deepEqual(list('[{"a":1}]'), [{ a: 1 }]);
  assert.deepEqual(list('here: [{"a":1}] done'), [{ a: 1 }]);
  assert.deepEqual(list({ a: 1 }), [{ a: 1 }]);
  assert.deepEqual(list('nothing'), []); assert.deepEqual(list(undefined), []);
  const issue = { severity: 'high', title: 'תת-חלקה שונה', detail: 'd', refs: JSON.stringify([{ doc: 'tabu', quote: 'תת חלקה: 8' }]) };
  fakeClaude(() => tool({ summary: 's', issues: JSON.stringify([issue]), fields: JSON.stringify([{ label: 'מחיר', value: '1,850,000', refs: [] }]) }));
  const r = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(r.code, 200); assert.equal(r.issues.length, 1); assert.equal(r.fields.length, 1);
  assert.equal(r.issues[0].refs[0].verified, true);
  fakeClaude(() => tool({ summary: 's', issues: 'נמצאו כמה בעיות', fields: [] }));
  assert.equal((await call(handler, { action: 'review', docs }, fresh())).code, 502);
});

test('a summary-only reply is asked again, and the tool is sent as strict', async () => {
  const { strictSchema } = await import('../api/legal.js');
  const full = { summary: 's', issues: [{ severity: 'high', title: 'a', detail: 'b', action: 'c', refs: [] }], fields: [{ label: 'מחיר', value: '1', refs: [] }] };
  let n = 0;
  const calls = fakeClaude(() => tool(n++ === 0 ? { summary: 'נמצאו אי-התאמות מהותיות' } : full));
  const r = await call(handler, { action: 'review', docs }, fresh());
  assert.equal(r.code, 200); assert.equal(r.issues.length, 1); assert.equal(calls.length, 2);
  const t = calls[0].tools[0];
  assert.equal(t.strict, true); assert.equal(t.input_schema.additionalProperties, false);
  assert.deepEqual(t.input_schema.required.sort(), ['fields', 'issues', 'summary']);
  assert.equal(t.input_schema.properties.issues.items.additionalProperties, false);
  assert.equal(strictSchema({ type: 'string' }).type, 'string');

  // two empty replies in a row: an error, never "no discrepancies found"
  fakeClaude(() => tool({ summary: 'נמצאו אי-התאמות מהותיות' }));
  assert.equal((await call(handler, { action: 'review', docs }, fresh())).code, 502);
});

test('if the API rejects the strict tool, the plain tool is used', async () => {
  const calls = fakeClaude((body) => (body.tools[0].strict ? { __error: 400, message: 'strict schema not supported' } : tool({ answer: 'x', refs: [] })));
  const r = await call(handler, { action: 'ask', docs, question: 'מה המחיר?' }, fresh());
  assert.equal(r.code, 200); assert.equal(r.answer, 'x'); assert.equal(calls.length, 2); assert.equal(calls[1].tools[0].strict, undefined);
});

test('findings: mismatches come first, and a point to check never carries the top severity', async () => {
  const { finding } = await import('../api/legal.js');
  assert.deepEqual(finding({ kind: 'check', severity: 'high', title: 't' }, []), { kind: 'check', severity: 'medium', title: 't', detail: '', action: '', refs: [] });
  assert.equal(finding({ severity: 'high' }, []).kind, 'mismatch'); // older replies without a kind
  const sorted = [{ kind: 'check', severity: 'medium' }, { kind: 'mismatch', severity: 'low' }, { kind: 'mismatch', severity: 'high' }]
    .map((x) => finding(x, []))
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'mismatch' ? -1 : 1));
  assert.deepEqual(sorted.map((x) => x.kind), ['mismatch', 'mismatch', 'check']);
});
