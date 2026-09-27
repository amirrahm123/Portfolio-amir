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
    id: 'sandrine',
    title: 'Sandrine Estate — Event Venue',
    kicker: 'Client work · Luxury venue site',
    status: 'Live',
    description:
      "A luxury marketing site for Achuzat Sandrine, a 50-dunam wedding and events estate in northern Israel. Hebrew/RTL and mobile-first, with pre-rendered pages for SEO and a ten-collection photo gallery. Behind the contact form is a server-side lead pipeline that saves every enquiry before emailing it, so no lead is ever silently lost. Built solo for a client; live since August 2026.",
    stack: ['React', 'TypeScript', 'Vite SSG', 'Tailwind', 'Vercel Functions', 'Vercel Blob', 'RTL/Hebrew'],
    liveUrl: 'https://www.sandrine-events.com/',
    codeUrl: null, // private client repo
    image: 'sandrine',
    tint: 'sage',
  },
  {
    id: 'ebeker',
    title: 'Eran Beker — Law Firm',
    kicker: 'Client work · Marketing & lead capture',
    status: 'Live',
    description:
      "A fully Hebrew/RTL marketing and client-intake site for one of Israel's leading personal-injury law firms (DUNS 100 / BDi-rated). Around 30 pages covering 15 practice areas, a hero carousel of the firm's TV and press coverage, and an intake form that emails the firm directly, with WhatsApp and click-to-call on every screen. Includes a full accessibility toolkit and statement, as Israeli law requires. Built solo for a real client.",
    stack: ['React', 'Vite', 'EmailJS', 'Custom CSS', 'Canvas', 'RTL/Hebrew'],
    liveUrl: 'https://ebeker.vercel.app/',
    codeUrl: null, // PRIVATE client repo — card shows a muted "Private — client work" label
    image: 'ebeker',
    tint: 'greige',
  },
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
    tint: 'blush',
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
    tint: 'greige',
  },
];
