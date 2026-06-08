import { Reveal, Stagger, StaggerItem } from '../Reveal/Reveal';
import styles from './HowIWork.module.scss';

const STEPS = [
  {
    n: '01',
    title: 'Start from the problem',
    body: 'A real user need, not a spec. High agency, low ego — I figure out what actually has to exist before writing a line.',
  },
  {
    n: '02',
    title: 'Ship with Claude Code',
    body: 'Architect, prompt, review, integrate — front-end to database. Fast loops, not long sprints.',
  },
  {
    n: '03',
    title: 'Get it in front of users',
    body: 'Working today beats perfect next quarter. Deploy early and iterate from real feedback.',
  },
] as const;

export function HowIWork() {
  return (
    <section id="how-i-work" className={styles.section} aria-labelledby="how-heading">
      <div className={styles.inner}>
        <Reveal className={styles.head}>
          <p className={styles.eyebrow}>How I work</p>
          <h2 id="how-heading" className={styles.heading}>
            Idea to deployed product in days, not sprints.
          </h2>
        </Reveal>

        <Stagger as="ul" className={styles.steps}>
          {STEPS.map((step) => (
            <StaggerItem as="li" key={step.n} className={styles.step}>
              <span className={styles.num} aria-hidden="true">
                {step.n}
              </span>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
