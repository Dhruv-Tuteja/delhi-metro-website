import styles from './StationList.module.css';

/**
 * Renders the ordered station route as a vertical timeline.
 * Visited stations are checked; current station pulses.
 */
export default function StationList({ stationRoute, visitedStationIds }) {
  if (!stationRoute || stationRoute.length === 0) return null;

  const lastVisitedIndex = stationRoute.reduce((acc, s, i) =>
    visitedStationIds.includes(s.stationId) ? i : acc, -1
  );

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Route</h3>
      <div className={styles.list}>
        {stationRoute.map((station, idx) => {
          const isVisited = visitedStationIds.includes(station.stationId);
          const isCurrent = idx === lastVisitedIndex && isVisited;
          const isPending = !isVisited;
          const isFirst = idx === 0;
          const isLast = idx === stationRoute.length - 1;

          return (
            <div key={station.stationId} className={`${styles.item} ${isCurrent ? styles.current : ''}`}>
              {/* Connector line */}
              <div className={styles.connectorWrap}>
                <div className={`${styles.lineTop} ${(isFirst) ? styles.invisible : ''} ${isVisited || idx <= lastVisitedIndex ? styles.filled : ''}`} />
                <div className={`${styles.dot} ${isVisited ? styles.dotVisited : ''} ${isCurrent ? styles.dotCurrent : ''}`}
                  style={{ '--line-color': station.lineColor || '#3d8ef8' }}>
                  {isVisited && !isCurrent && (
                    <svg width="10" height="10" viewBox="0 0 10 10">
                      <path d="M1.5 5L4 7.5 8.5 2.5" stroke="#fff" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <div className={`${styles.lineBottom} ${isLast ? styles.invisible : ''} ${idx < lastVisitedIndex ? styles.filled : ''}`} />
              </div>

              {/* Station info */}
              <div className={styles.info}>
                <span className={`${styles.name} ${isVisited ? styles.nameVisited : ''} ${isPending ? styles.namePending : ''}`}>
                  {station.stationName}
                </span>
                {station.metroLine && (
                  <span className={styles.line} style={{ color: station.lineColor || '#3d8ef8' }}>
                    {station.metroLine}
                  </span>
                )}
                {isCurrent && <span className={styles.currentBadge}>Current</span>}
                {isFirst && !isCurrent && <span className={styles.badge}>Start</span>}
                {isLast && <span className={styles.badge}>Destination</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
