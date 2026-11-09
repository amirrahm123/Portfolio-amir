// Shared test helpers: a fake Vercel request/response and a scriptable fake Claude API.
export function call(handler, body, { method = 'POST', ip = '10.0.0.1' } = {}) {
  return new Promise((resolve) => {
    const res = {
      code: 200,
      status(c) { this.code = c; return this; },
      json(d) { resolve({ code: this.code, ...d }); },
    };
    handler({ method, headers: { 'x-forwarded-for': ip }, body }, res);
  });
}

/** Replace global fetch with a fake Anthropic API. `reply(requestBody)` returns the API's JSON body. */
export function fakeClaude(reply) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    if (!String(url).includes('api.anthropic.com')) return { ok: false, status: 404, headers: new Map(), json: async () => ({}), text: async () => '' };
    const body = JSON.parse(init.body);
    calls.push(body);
    const out = await reply(body);
    if (out && out.__error) return { ok: false, status: out.__error, json: async () => ({ error: { message: out.message } }) };
    return { ok: true, json: async () => out };
  };
  return calls;
}
export const text = (t) => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: t }] });
export const toolUse = (name, input, pre = '') => ({ stop_reason: 'tool_use', content: [...(pre ? [{ type: 'text', text: pre }] : []), { type: 'tool_use', id: 'tu_' + name, name, input }] });
