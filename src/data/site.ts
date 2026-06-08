// Site-wide constants: identity, contact links, skills, nav.
// Single place to edit anything that appears in more than one component.

export const SITE = {
  name: 'Amir Rahm',
  role: 'Product Engineer',
  location: 'Berlin / Remote',
  email: 'amirrahm135@gmail.com',
  github: 'https://github.com/amirrahm123',
} as const;

/**
 * LinkedIn URL.
 * TODO: paste your LinkedIn profile URL between the quotes to enable the link.
 * While this is an empty string, the footer renders a clearly-marked,
 * non-clickable "LinkedIn — coming soon" placeholder. Filling this in is the
 * single edit needed to turn it into a real link.
 */
export const LINKEDIN_URL = '';

export const NAV_LINKS = [
  { label: 'Work', href: '#work' },
  { label: 'How I work', href: '#how-i-work' },
  { label: 'Contact', href: '#contact' },
] as const;

export const SKILLS = [
  'React',
  'TypeScript',
  'Node',
  'Next.js',
  'Supabase',
  'MongoDB',
  'Claude Code',
  'AI integration',
  'Full-stack',
  'RTL/Hebrew',
] as const;
