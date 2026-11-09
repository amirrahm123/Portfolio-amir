# Amir Rahm – portfolio

Static one-page portfolio (`site/`) plus two Vercel functions:

- `api/contact.js` – the contact form (emails the enquiry to Amir).
- `api/chat.js` – the live AI assistant in the "When a website isn't enough" section and behind the floating "Ask my AI assistant" button.
  - **Amir's assistant** answers about his work and, with the visitor's OK, emails their enquiry to Amir.
  - **Law firm / private clinic / event venue** are demos for fictional businesses: they answer questions and take appointment requests, shown as a card ("what the office receives"); nothing is sent.
  - Models: `claude-sonnet-5-5` for Amir's assistant (`CHAT_MODEL_BUILDLAB`), `claude-haiku-5-5` for the demos (`CHAT_MODEL`). Limits: 600 characters per message, 30 messages per chat, 40 messages per IP per 10 minutes, 500 output tokens.

Vercel environment variables:

| Variable | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | the assistant |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | contact form and assistant enquiries |

`npm run build` copies `site/` to `dist/`, which Vercel serves. The previous React version lives on the `legacy-v1` branch.
