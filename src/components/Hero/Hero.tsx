import { SKILLS, SITE } from '../../data/site';
import { Stagger, StaggerItem } from '../Reveal/Reveal';
import styles from './Hero.module.scss';

export function Hero() {
  return (
    <section className={styles.hero} aria-labelledby="hero-heading">
      <Stagger className={styles.inner}>
        <StaggerItem as="p" className={styles.eyebrow}>
          Product Engineer · {SITE.location}
        </StaggerItem>

        <StaggerItem as="div">
          <h1 id="hero-heading" className={styles.heading}>
            <span className={styles.line1}>
              Hi, I&rsquo;m <span className={styles.name}>Amir</span>
            </span>
            <span className={styles.line2}>
              I ship <span className={styles.outline}>full products,</span> solo &amp; fast.
            </span>
          </h1>
        </StaggerItem>

        <StaggerItem as="p" className={styles.subtext}>
          I build AI tools, full-stack apps, and real client products end to end
          &mdash; directing Claude Code rather than writing every line by hand.
          Idea to deployed product in days, not sprints.
        </StaggerItem>

        <StaggerItem as="div" className={styles.actions}>
          <a href="#work" className={styles.btnPrimary}>
            See my work
          </a>
          <a href={`mailto:${SITE.email}`} className={styles.btnSecondary}>
            Get in touch
          </a>
        </StaggerItem>

        <StaggerItem as="ul" className={styles.skills} aria-label="Core skills">
          {SKILLS.map((skill) => (
            <li key={skill} className={styles.pill}>
              {skill}
            </li>
          ))}
        </StaggerItem>
      </Stagger>
    </section>
  );
}
