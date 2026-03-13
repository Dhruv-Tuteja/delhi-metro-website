import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import styles from './Navbar.module.css';

function useTheme() {
  const [theme, setTheme] = useState(() => {
    // Respect saved preference, then system preference
    const saved = localStorage.getItem('metro-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('metro-theme', theme);
  }, [theme]);

  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { theme, toggle } = useTheme();

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

          {/* Theme toggle */}
          <button
            className={styles.themeToggle}
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? (
              /* Sun icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Moon icon */
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
