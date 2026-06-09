// Typed project data — the Work section is rendered entirely from this array.
// To add/edit a project, edit this file only; <ProjectCard> renders the rest.

export type TintKey = 'sand' | 'sage' | 'greige' | 'blush';

/** A labeled live link — used when a project exposes more than one live URL
 *  (e.g. ArikApp's public Booking page + its Admin demo). */
export interface LiveLink {
  label: string;
  url: string;
}

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
  /**
   * Optional multiple labeled live links (e.g. Booking + Admin). When present,
   * these are rendered instead of the single `liveUrl`. Leave undefined for the
   * common one-live-link case and just use `liveUrl`.
   */
  liveLinks?: LiveLink[];
  /** null = private repo; the card shows a muted "Private" label instead of a link */
  codeUrl: string | null;
  /** optional small muted help line shown under the links (e.g. demo credentials) */
  credentials?: string;
  /**
   * Optional explicit URL for the clickable screenshot. When set, the image
   * opens this instead of the card's primary live URL — e.g. ArikApp's image
   * deep-links to the admin demo while its first text link stays the booking page.
   */
  imageUrl?: string;
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
    liveUrl: null, // uses two labeled liveLinks (Booking + Admin) instead
    liveLinks: [
      { label: 'Live — Booking', url: 'https://arikapp-nu.vercel.app/' },
      { label: 'Live — Admin', url: 'https://arikapp-nu.vercel.app/admin/login' },
    ],
    codeUrl: 'https://github.com/amirrahm123/arikapp',
    credentials:
      'Admin demo login — email: demo@arikapp.app · password: demo1234 (view-only)',
    imageUrl: 'https://arikapp-nu.vercel.app/admin/login', // image deep-links to the admin demo
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
