import { useEffect, useState } from 'react';
import styles from './SignalLostToast.module.css';

/**
 * Shows a non-intrusive toast when GPS signal is lost for >2 minutes.
 * Auto-dismisses when signal is restored.
 */
export default function SignalLostToast({ signalLost, lastSeenAt }) {
  const [visible, setVisible] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (signalLost) {
      setVisible(true);
    } else {
      // Brief delay before hiding so user sees "restored"
      const t = setTimeout(() => setVisible(false), 2000);
      return () => clearTimeout(t);
    }
  }, [signalLost]);

  // Count up elapsed time
  useEffect(() => {
    if (!signalLost || !lastSeenAt) return;
    const start = lastSeenAt;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [signalLost, lastSeenAt]);

  if (!visible) return null;

  const formatElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className={`${styles.toast} ${!signalLost ? styles.restored : ''} animate-slide-down`}>
      <div className={styles.icon}>
        {signalLost ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.56 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className={styles.content}>
        {signalLost ? (
          <>
            <p className={styles.title}>Signal lost{lastSeenAt ? ` · ${formatElapsed(elapsed)} ago` : ''}</p>
            <p className={styles.sub}>Try contacting the person if needed</p>
          </>
        ) : (
          <p className={styles.title}>Signal restored</p>
        )}
      </div>
    </div>
  );
}
