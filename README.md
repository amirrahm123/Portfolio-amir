# Amir Rahm – portfolio

Static one-page developer portfolio (`site/`) plus two Vercel functions:

- `api/legal.js` – the live "Deal File Checker" document-AI demo (see below).
- `api/contact.js` – contact endpoint (emails an enquiry to Amir). The page currently links to email, WhatsApp, LinkedIn and GitHub directly and does not use it.

The page is aimed at employers: AI and automation projects first, then client and full-stack work, about and contact. `site/Amir_Rahm_CV.pdf` is the CV linked from the hero and the contact section.

Pages:

- `site/index.html` – English portfolio.
- `site/he/index.html` – Hebrew (RTL) portfolio, **generated** from the English page: edit the English page, then run `python3 scripts/make-he.py` (texts in `scripts/he-texts.py`; the script reports anything left untranslated).
- `site/legal/` – "בודק תיק עסקה": live document-AI demo for real-estate lawyers, served by `api/legal.js`. It reviews a fictional deal file (`site/legal/samples.js`: sale agreement, land registry extract, bank letter), extracts key data and red flags, and checks every quote against the document text before showing it (✓ verified / ⚠ not found). Visitors can also paste their own text and ask the file questions. Model `claude-sonnet-5-5` (`LEGAL_MODEL`), 20 requests per IP per 10 minutes.
  Planted issues in the sample file (to judge the AI): sub-parcel 7 vs 8, seller ID 034567891 vs 034567819, storage unit 3 vs 5, mortgage Leumi vs Mizrahi-Tefahot, an undisclosed third-party warning note, payments 1,825,000 vs price 1,850,000, area 104 vs 98.40 m², and a bank letter that expired before signing.

Vercel environment variables:

| Variable | Used by |
| --- | --- |
| `ANTHROPIC_API_KEY` | the document-AI demo |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | contact endpoint |

`npm run build` copies `site/` to `dist/`, which Vercel serves. The previous React version lives on the `legacy-v1` branch.

Tests (run on every push by GitHub Actions, `.github/workflows/ci.yml`):

- `npm test` – unit and API tests with a fake Claude (`test/`): quote verification, review/ask flows, limits, rate limits.
- `npm run test:e2e` – a real browser clicks through `/`, `/he/` and `/legal/` on desktop and phone (`e2e/`), with the AI faked: no sideways scrolling, no broken assets or JS errors, legal review → highlight → ask. Locally: `CHROME_PATH=/path/to/chrome npm run test:e2e`.
- `python3 scripts/make-he.py --check` – fails if the Hebrew page is out of date with the English one.
