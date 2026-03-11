import styles from './SosAlertBanner.module.css';

export default function SosAlertBanner({ sosAlert }) {
  if (!sosAlert) return null;

  const time = sosAlert.timestamp
    ? new Date(sosAlert.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <div className={`${styles.banner} animate-fade-up`}>
      <div className={styles.iconWrap}>
        <span className={styles.sosLabel}>SOS</span>
      </div>
      <div className={styles.text}>
        <p className={styles.title}>Emergency alert was triggered{time ? ` at ${time}` : ''}</p>
        {sosAlert.stationName && (
          <p className={styles.sub}>Last known location: {sosAlert.stationName}</p>
        )}
      </div>
    </div>
  );
}
