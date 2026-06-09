// Typed project data — the Work section is rendered entirely from this array.
// To add/edit a project, edit this file only; <ProjectCard> renders the rest.

export type TintKey = 'sand' | 'sage' | 'greige' | 'blush';

export interface Project {
  /** stable key for React lists + anchor ids */
  id: string;
  title: string;
  /** one-line category line above the title */
  kicker: string;
  /** short human status, rendered as a tag */
  status: string;
  description: string;
  stack: string[];
  /** null = no public live link; the card omits the "Live" link entirely */
  liveUrl: string | null;
  /** null = private repo; the card shows a muted "Private" label instead of a link */
  codeUrl: string | null;
  /**
   * Image basename in src/assets/projects (no extension).
   * The resolver matches any extension, so dropping in
   * `amirballbot.png` OR `amirballbot.gif` just works — no code change.
   */
  image: string;
  /** banner background tint; styled from SCSS tokens via data-attribute */
  tint: TintKey;
  /** true for the flagship project (gets a subtle "Flagship" emphasis) */
  flagship?: boolean;
}

export const projects: Project[] = [
  {
    id: 'amirballbot',
    title: 'Amirballbot',
    kicker: 'Flagship · AI product',
    status: 'In active development',
    description:
      'An AI basketball game-film analysis platform for coaches. Upload a game and it detects plays, reads jersey numbers, and returns structured Hebrew coaching notes — feeding a video editor with timestamped AI notes, an AI coach chat, and opponent scouting reports. Orchestrates three AI models (Gemini vision + Claude for language) across a multi-pass pipeline with a worker pool, dedup, and a coach-correction feedback loop. Built solo.',
    stack: ['Node/Express', 'TypeScript', 'MongoDB', 'Gemini', 'Claude', 'ffmpeg'],
    liveUrl: null, // no public live link — code only
    codeUrl: 'https://github.com/amirrahm123/amirballbot',
    image: 'amirballbot',
    tint: 'sand',
    flagship: true,
  },
  {
    id: 'arikapp',
    title: 'ArikApp',
    kicker: 'Full-stack · Booking PWA',
    status: 'Live',
    description:
      'A two-sided appointment-booking PWA for a barbershop: a public self-booking page and a full admin panel for the barber. Real database, auth, and realtime updates — live availability, double-booking guards, a dashboard with revenue KPIs and charts, a realtime calendar, PDF receipts, WhatsApp notifications, and a daily reminder cron. Installable as a PWA. Built solo.',
    stack: ['Next.js', 'TypeScript', 'Supabase/Postgres', 'Tailwind', 'Framer Motion', 'Twilio', 'PWA'],
    liveUrl: 'https://arikapp-nu.vercel.app/',
    codeUrl: 'https://github.com/amirrahm123/arikapp',
    image: 'arikapp',
    tint: 'sage',
  },
  {
    id: 'ebeker',
    title: 'Eran Beker — Law Firm',
    kicker: 'Client work · Marketing & lead capture',
    status: 'Live',
    description:
      "A polished, fully RTL marketing & client-intake site for one of Israel's leading personal-injury litigators (DUNS 100 / BDi-rated). A working lead-capture tool, not a brochure: the intake form emails the firm and opens a pre-filled WhatsApp, with conversion built into every screen. Features a hand-built canvas hero animation and a full accessibility toolkit. Built solo for a real client.",
    stack: ['React', 'Vite', 'EmailJS', 'Custom CSS', 'Canvas', 'RTL/Hebrew'],
    liveUrl: 'https://ebeker.vercel.app/',
    codeUrl: null, // PRIVATE client repo — card shows a muted "Private — client work" label
    image: 'ebeker',
    tint: 'greige',
  },
  {
    id: 'lotef',
    title: 'Lotef — Pharmacy Storefront',
    kicker: 'Full-stack · E-commerce demo',
    status: 'Demo',
    description:
      'A fully RTL pharmacy storefront with a working catalog, cart, live search, and a real JWT-protected admin panel doing live CRUD against MongoDB. A catalog-and-inquiry model (orders go out by email / WhatsApp), with a resilient API that falls back to a static catalog if the database is unreachable. Full-stack, built solo.',
    stack: ['React', 'Node/Express', 'MongoDB', 'JWT', 'Framer Motion', 'RTL/Hebrew'],
    liveUrl: 'https://lotef.vercel.app/',
    codeUrl: 'https://github.com/amirrahm123/lotef',
    image: 'lotef',
    tint: 'blush',
  },
];
