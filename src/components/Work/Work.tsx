import { projects } from '../../data/projects';
import { ProjectCard } from '../ProjectCard/ProjectCard';
import { Reveal } from '../Reveal/Reveal';
import styles from './Work.module.scss';

export function Work() {
  return (
    <section id="work" className={styles.work} aria-labelledby="work-heading">
      <div className={styles.inner}>
        <Reveal className={styles.head}>
          <p className={styles.eyebrow}>Selected work</p>
          <h2 id="work-heading" className={styles.heading}>
            Four products, shipped solo &amp; end to end.
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
