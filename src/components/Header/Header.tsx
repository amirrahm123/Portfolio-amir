import { useEffect, useState } from 'react';
import { NAV_LINKS, SITE } from '../../data/site';
import styles from './Header.module.scss';

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        <a href="#top" className={styles.wordmark}>
          {SITE.name}
        </a>

        <div className={styles.right}>
          <nav className={styles.nav} aria-label="Primary">
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className={styles.navLink}>
                {link.label}
              </a>
            ))}
          </nav>

          <span className={styles.status}>
            <span className={styles.dot} aria-hidden="true" />
            Open to product-engineer roles
          </span>
        </div>
      </div>
    </header>
  );
}
