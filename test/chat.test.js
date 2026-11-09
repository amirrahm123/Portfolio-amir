// Unit + integration tests for the site assistant (api/chat.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { call, fakeClaude, text, toolUse } from './helpers.js';
import nodemailer from 'nodemailer';

process.env.ANTHROPIC_API_KEY = 'test';
process.env.GMAIL_USER = 'amir@example.com';
process.env.GMAIL_APP_PASSWORD = 'x';
const sent = [];
nodemailer.createTransport = () => ({ sendMail: async (m) => { sent.push(m); } });
const { default: handler } = await import('../api/chat.js');
let ip = 0; const fresh = () => ({ ip: `10.2.0.${++ip}` });
const user = (content) => ({ role: 'user', content });

test('model per mode: Sonnet for real visitors, Haiku for demos', async () => {
  const calls = fakeClaude(() => text('hi'));
  await call(handler, { mode: 'buildlab', messages: [user('hi')] }, fresh());
  await call(handler, { mode: 'clinic', messages: [user('hi')] }, fresh());
  assert.equal(calls[0].model, 'claude-sonnet-5-5');
  assert.equal(calls[1].model, 'claude-haiku-5-5');
  assert.match(calls[0].system, /אמיר רם/, 'Hebrew spelling of Amir’s name is in the prompt');
  assert.match(calls[1].system, /Lindenhof/);
});

test('unknown mode falls back to Amir’s assistant; greeting-only history is rejected', async () => {
  const calls = fakeClaude(() => text('hi'));
  await call(handler, { mode: 'hack', messages: [user('hi')] }, fresh());
  assert.match(calls[0].system, /portfolio website of Amir Rahm/);
  const r = await call(handler, { mode: 'law', messages: [{ role: 'assistant', content: 'Hello' }] }, fresh());
  assert.equal(r.code, 400);
});

test('demo booking makes a card and never sends an email', async () => {
  sent.length = 0;
  fakeClaude((b) => (Array.isArray(b.messages.at(-1).content) ? text('Booked!') : toolUse('request_appointment', { name: 'Noa', phone: '050-1234567', service: 'Divorce', preferred_time: 'Sunday' })));
  const r = await call(handler, { mode: 'law', messages: [user('book me please')] }, fresh());
  assert.equal(r.card.type, 'booking'); assert.equal(r.card.name, 'Noa'); assert.equal(r.reply, 'Booked!');
  assert.equal(sent.length, 0);
});

test('enquiry in Amir’s mode emails Amir with reply-to and the transcript', async () => {
  sent.length = 0;
  fakeClaude((b) => (Array.isArray(b.messages.at(-1).content) ? text('Sent!') : toolUse('send_enquiry_to_amir', { name: 'Dana', email: 'dana@firm.co.il', business: 'Dana Law', need: 'Document AI' })));
  const r = await call(handler, { mode: 'buildlab', messages: [user('yes, pass it to Amir')] }, fresh());
  assert.equal(r.card.type, 'enquiry');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, 'amir@example.com');
  assert.equal(sent[0].replyTo.address, 'dana@firm.co.il');
  assert.match(sent[0].text, /Visitor: yes, pass it to Amir/);
});

test('limits: long messages are cut, long chats are closed, rate limit per IP', async () => {
  const calls = fakeClaude(() => text('ok'));
  await call(handler, { mode: 'buildlab', messages: [user('x'.repeat(5000))] }, fresh());
  assert.equal(calls[0].messages[0].content.length, 600);
  assert.equal(calls[0].max_tokens, 500);
  const long = Array.from({ length: 30 }, (_, i) => (i % 2 ? { role: 'assistant', content: 'a' } : user('q')));
  long.push(user('again'));
  const r = await call(handler, { mode: 'buildlab', messages: long }, fresh());
  assert.match(r.reply, /amirrahm135@gmail\.com/);
  const who = { ip: '10.9.9.8' };
  for (let i = 0; i < 40; i++) await call(handler, { mode: 'law', messages: [user('q')] }, who);
  assert.equal((await call(handler, { mode: 'law', messages: [user('q')] }, who)).code, 429);
});

test('an API failure returns a friendly message plus the real reason', async () => {
  fakeClaude(() => ({ __error: 400, message: 'model not found' }));
  const r = await call(handler, { mode: 'buildlab', messages: [user('hi')] }, fresh());
  assert.equal(r.code, 502); assert.match(r.detail, /model not found/);
});
