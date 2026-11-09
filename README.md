# Amir Rahm – portfolio

Static one-page portfolio (`site/`) plus two Vercel functions:

- `api/contact.js` – the contact form (emails the enquiry to Amir).
- `api/chat.js` – the live AI assistant in the "When a website isn't enough" section and behind the floating "Ask my AI assistant" button.
  - **Amir's assistant** answers about his work and, with the visitor's OK, emails their enquiry to Amir.
  - **Law firm / private clinic / event venue** are demos for fictional businesses: they answer questions and take appointment requests, shown as a card ("what the office receives"); nothing is sent.
  - Models: `claude-sonnet-5-5` for Amir's assistant (`CHAT_MODEL_BUILDLAB`), `claude-haiku-5-5` for the demos (`CHAT_MODEL`). Limits: 600 characters per message, 30 messages per chat, 40 messages per IP per 10 minutes, 500 output tokens.

Pages:

- `site/index.html` – English portfolio.
- `site/he/index.html` – Hebrew (RTL) portfolio, **generated** from the English page: edit the English page, then run `python3 scripts/make-he.py` (texts in `scripts/he-texts.py`; the script reports anything left untranslated).
- `site/legal/` – "בודק תיק עסקה": live document-AI demo for real-estate lawyers, served by `api/legal.js`. It reviews a fictional deal file (`site/legal/samples.js`: sale agreement, land registry extract, bank letter), extracts key data and red flags, and checks every quote against the document text before showing it (✓ verified / ⚠ not found). Visitors can also paste their own text and ask the file questions. Model `claude-sonnet-5-5` (`LEGAL_MODEL`), 20 requests per IP per 10 minutes.
  Planted issues in the sample file (to judge the AI): sub-parcel 7 vs 8, seller ID 034567891 vs 034567819, storage unit 3 vs 5, mortgage Leumi vs Mizrahi-Tefahot, an undisclosed third-party warning note, payments 1,825,000 vs price 1,850,000, area 104 vs 98.40 m², and a bank letter that expired before signing.

Vercel environment variables:

| Variable | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | the assistant |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | contact form and assistant enquiries |

`npm run build` copies `site/` to `dist/`, which Vercel serves. The previous React version lives on the `legacy-v1` branch.
