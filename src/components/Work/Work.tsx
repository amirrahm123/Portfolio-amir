import { projects } from '../../data/projects';
import { ProjectCard } from '../ProjectCard/ProjectCard';
import { Reveal } from '../Reveal/Reveal';
import styles from './Work.module.scss';

// Spelled-out count so the heading stays correct when projects are added or removed.
const NUMBER_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const countWord = NUMBER_WORDS[projects.length] ?? String(projects.length);
const clientCount = projects.filter((p) => p.kicker.startsWith('Client work')).length;

export function Work() {
  return (
    <section id="work" className={styles.work} aria-labelledby="work-heading">
      <div className={styles.inner}>
        <Reveal className={styles.head}>
          <p className={styles.eyebrow}>Selected work</p>
          <h2 id="work-heading" className={styles.heading}>
            {countWord} products, shipped solo &amp; end to end{clientCount > 0 ? ` \u2014 ${(NUMBER_WORDS[clientCount] ?? String(clientCount)).toLowerCase()} for real clients` : ''}.
          </h2>
        </Reveal>

        <div className={styles.list}>
          {projects.map((project, index) => (
            <ProjectCard key={project.id} project={project} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
