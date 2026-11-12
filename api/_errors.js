// What a visitor is told when a Claude call fails.
// Ordinary failures keep the real reason (useful when testing the demos).
// Account problems (credit used up, billing, a bad key) are the site owner's business:
// the visitor only hears that the demo is unavailable, and the reason stays in the server log.
const ACCOUNT = /credit balance|billing|plans & billing|api[- ]?key|authentication|permission|spend limit|quota/i;

export function failure(e, { unavailable, retry }) {
  const reason = String(e?.message || '');
  if (ACCOUNT.test(reason)) return { error: unavailable };
  return { error: retry, detail: reason.slice(0, 200) };
}
