import { motion, useReducedMotion } from 'framer-motion';
import type { Project } from '../../data/projects';
import { fadeOnly, fadeUp, inViewport } from '../../lib/motion';
import { resolveProjectImage } from '../../lib/projectImages';
import styles from './ProjectCard.module.scss';

interface ProjectCardProps {
  project: Project;
  /** index in the list — drives left/right image alternation */
  index: number;
}

const ArrowIcon = () => (
  <svg
    className={styles.arrow}
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M7 17 17 7M17 7H9M17 7v8"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function ProjectMedia({ project }: { project: Project }) {
  const src = resolveProjectImage(project.image);

  // Real screenshot if a file exists in src/assets/projects, else a neat
  // tinted placeholder so the layout is complete before images are dropped in.
  if (!src) {
    return (
      <div className={styles.placeholder} role="img" aria-label={`${project.title} — screenshot placeholder`}>
        <span className={styles.placeholderName}>{project.title}</span>
        <span className={styles.placeholderHint}>screenshot</span>
      </div>
    );
  }

  return (
    <img
      className={styles.image}
      src={src}
      alt={`${project.title} — product screenshot`}
      width={1280}
      height={860}
      loading="lazy"
      decoding="async"
    />
  );
}

/** The card's primary live URL: the first labeled live link (e.g. ArikApp's
 *  Booking page) or the single `liveUrl`, or null if the card has no live site. */
function primaryLiveUrl(project: Project): string | null {
  return project.liveLinks?.[0]?.url ?? project.liveUrl ?? null;
}

/** Where the clickable screenshot points: an explicit `imageUrl` override when
 *  set (e.g. ArikApp → admin demo), otherwise the card's primary live URL. */
function imageLinkUrl(project: Project): string | null {
  return project.imageUrl ?? primaryLiveUrl(project);
}

/** The screenshot, wrapped in a link to the live site when one exists.
 *  Cards with no live URL (e.g. Amirballbot) stay a plain, non-clickable frame. */
function ProjectMediaFrame({ project }: { project: Project }) {
  const liveUrl = imageLinkUrl(project);

  if (!liveUrl) {
    return (
      <div className={styles.frame}>
        <ProjectMedia project={project} />
      </div>
    );
  }

  return (
    <a
      className={`${styles.frame} ${styles.frameLink}`}
      href={liveUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open the live ${project.title} site in a new tab`}
    >
      <ProjectMedia project={project} />
    </a>
  );
}

function ProjectLinks({ project }: { project: Project }) {
  // Normalize to a list: a card may expose several labeled live links
  // (e.g. ArikApp's Booking + Admin) or the common single `liveUrl`.
  const liveLinks =
    project.liveLinks ??
    (project.liveUrl ? [{ label: 'Live', url: project.liveUrl }] : []);

  return (
    <div className={styles.links}>
      {liveLinks.map((link) => (
        <a
          key={link.url}
          className={styles.linkPrimary}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${project.title} — ${link.label} in a new tab`}
        >
          {link.label} <ArrowIcon />
        </a>
      ))}

      {project.codeUrl ? (
        <a
          className={styles.linkSecondary}
          href={project.codeUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View the ${project.title} source code on GitHub in a new tab`}
        >
          Code <ArrowIcon />
        </a>
      ) : (
        <span className={styles.privateLabel}>Private — client work</span>
      )}
    </div>
  );
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  const reduce = useReducedMotion();

  return (
    <motion.article
      className={styles.banner}
      data-tint={project.tint}
      data-reverse={index % 2 === 1 ? 'true' : undefined}
      variants={reduce ? fadeOnly : fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={inViewport}
    >
      <div className={styles.media}>
        <ProjectMediaFrame project={project} />
      </div>

      <div className={styles.body}>
        <p className={styles.kicker}>
          {project.flagship && <span className={styles.flagshipMark} aria-hidden="true">★</span>}
          {project.kicker}
        </p>

        {/* Status label — only when it adds info beyond the links. A "Live"
            status is redundant with the Live ↗ link, so it's omitted. */}
        {project.status.toLowerCase() !== 'live' && (
          <span className={styles.statusTag}>{project.status}</span>
        )}

        <h3 className={styles.title}>{project.title}</h3>

        <p className={styles.desc}>{project.description}</p>

        <ul className={styles.stack} aria-label="Tech stack">
          {project.stack.map((tech) => (
            <li key={tech} className={styles.tech}>
              {tech}
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <ProjectLinks project={project} />
          {project.credentials && (
            <p className={styles.credentials}>{project.credentials}</p>
          )}
        </div>
      </div>
    </motion.article>
  );
}
