# Amir Rahm — Portfolio

A single-page portfolio / CV. Warm, minimal, typography-led. Built to be a
portfolio piece in its own right, so structure and code quality are first-class.

**Stack:** Vite + React + TypeScript · SCSS modules · framer-motion.

## Commands

```bash
npm install      # install dependencies
npm run dev      # local dev server (http://localhost:5173)
npm run build    # type-check (tsc) + production build to /dist
npm run preview  # serve the production build locally to preview /dist
```

## Deploy to Vercel

The project needs no config — Vercel detects Vite automatically.

```bash
npm i -g vercel   # once
vercel            # preview deploy (follow the prompts)
vercel --prod     # production deploy
```

Or: push to GitHub and "Import Project" on vercel.com. Build settings are
auto-detected (build command `npm run build`, output dir `dist`).

## Editing content

- **Projects:** `src/data/projects.ts` (typed). The Work section renders entirely
  from this array via `ProjectCard`.
- **Identity / contact / skills / nav:** `src/data/site.ts`.
- **LinkedIn:** set `LINKEDIN_URL` in `src/data/site.ts` — a single edit turns the
  footer placeholder into a real link.
- **Screenshots:** drop files into `src/assets/projects/` named after each
  project's `image` basename (e.g. `amirballbot.png`). Any extension works; until
  then a tidy placeholder is shown. See that folder's README.

## Design tokens

All colors, type scale, spacing, and radii live in `src/styles/_variables.scss`.
The single accent is **muted clay/terracotta**; a **forest-green** alternative is
included commented-out — swapping four values changes the whole site.

## Notes

- Desktop-only CSS scroll-snap nudges each work banner into view. It's pure CSS
  (`proximity`, no wheel hijacking), degrades to normal scroll on touch and with
  `prefers-reduced-motion`, and is isolated to one block in `global.scss`.
- Motion is restrained and fully respects `prefers-reduced-motion`.
- Accessible: semantic landmarks, skip link, visible focus, aria-labels, alt text.
