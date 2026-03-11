import { Link, useLocation } from 'react-router-dom';
import styles from './Navbar.module.css';

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          <span className={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="var(--color-accent)"/>
              <circle cx="12" cy="9" r="2.5" fill="var(--color-bg)"/>
            </svg>
          </span>
          <span className={styles.logoText}>MetroTrack</span>
          <span className={styles.logoBadge}>Delhi</span>
        </Link>

        <div className={styles.links}>
          <Link to="/" className={`${styles.link} ${pathname === '/' ? styles.active : ''}`}>
            Track
          </Link>
          <Link to="/help" className={`${styles.link} ${pathname === '/help' ? styles.active : ''}`}>
            Help Center
          </Link>
        </div>
      </div>
    </nav>
  );
}
