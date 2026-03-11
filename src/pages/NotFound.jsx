import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

export default function NotFound() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.code}>404</div>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.sub}>
          This page doesn't exist. If you're looking for a live journey, check the link in your SMS.
        </p>
        <Link to="/" className={styles.btn}>Go to Tracker</Link>
      </div>
    </div>
  );
}
