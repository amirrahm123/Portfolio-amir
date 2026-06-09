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

function ProjectLinks({ project }: { project: Project }) {
  return (
    <div className={styles.links}>
      {project.liveUrl && (
        <a
          className={styles.linkPrimary}
          href={project.liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open the live ${project.title} site in a new tab`}
        >
          Live <ArrowIcon />
        </a>
      )}

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
        <div className={styles.frame}>
          <ProjectMedia project={project} />
        </div>
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
        </div>
      </div>
    </motion.article>
  );
}
