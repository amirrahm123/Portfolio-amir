import { Header } from './components/Header/Header';
import { Hero } from './components/Hero/Hero';
import { Work } from './components/Work/Work';
import { HowIWork } from './components/HowIWork/HowIWork';
import { Contact } from './components/Contact/Contact';
import styles from './App.module.scss';

export function App() {
  return (
    <>
      <a href="#main" className={styles.skipLink}>
        Skip to content
      </a>

      <span id="top" />
      <Header />

      <main id="main" className={styles.main}>
        <Hero />
        <Work />
        <HowIWork />
      </main>

      <Contact />
    </>
  );
}
