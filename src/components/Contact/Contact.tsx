import { LINKEDIN_URL, SITE } from '../../data/site';
import { Reveal } from '../Reveal/Reveal';
import styles from './Contact.module.scss';

const year = new Date().getFullYear();

const ArrowIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M7 17 17 7M17 7H9M17 7v8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export function Contact() {
  return (
    <footer id="contact" className={styles.contact} aria-labelledby="contact-heading">
      <div className={styles.inner}>
        <Reveal className={styles.head}>
          <p className={styles.eyebrow}>Contact</p>
          <h2 id="contact-heading" className={styles.heading}>
            Let&rsquo;s build something fast.
          </h2>
          <p className={styles.lead}>
            Open to product-engineer / vibe-coder roles at AI-first startups
            &mdash; Berlin or remote (CET).
          </p>
        </Reveal>

        <Reveal as="ul" className={styles.links} delay={0.05}>
          <li>
            <a
              className={styles.link}
              href={`mailto:${SITE.email}`}
              aria-label={`Email Amir at ${SITE.email}`}
            >
              Email <ArrowIcon />
            </a>
          </li>
          <li>
            <a
              className={styles.link}
              href={SITE.github}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Amir's GitHub profile (opens in a new tab)"
            >
              GitHub <ArrowIcon />
            </a>
          </li>
          <li>
            {LINKEDIN_URL ? (
              <a
                className={styles.link}
                href={LINKEDIN_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Amir's LinkedIn profile (opens in a new tab)"
              >
                LinkedIn <ArrowIcon />
              </a>
            ) : (
              <span
                className={styles.linkPlaceholder}
                title="LinkedIn link coming soon"
                aria-label="LinkedIn — link coming soon"
              >
                LinkedIn <em>&mdash; coming soon</em>
              </span>
            )}
          </li>
        </Reveal>

        <p className={styles.copyright}>
          &copy; {year} {SITE.name} &mdash; built solo, with Claude Code.
        </p>
      </div>
    </footer>
  );
}
