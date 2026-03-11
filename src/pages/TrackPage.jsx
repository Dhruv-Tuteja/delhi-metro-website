import { useParams, useNavigate } from 'react-router-dom';
import { useState, useCallback } from 'react';
import { useTrackingSocket } from '../hooks/useTrackingSocket';
import LiveMap from '../components/LiveMap';
import StationList from '../components/StationList';
import SignalLostToast from '../components/SignalLostToast';
import SosAlertBanner from '../components/SosAlertBanner';
import styles from './TrackPage.module.css';

// ─── Landing — enter tracking ID ────────────────────────────────────────────

function TrackingIdEntry({ onSubmit }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const clean = value.trim().toUpperCase();
    if (!/^TRK-[A-Z0-9]{6}$/.test(clean)) {
      setError('Please enter a valid tracking ID (e.g. TRK-AB2345)');
      return;
    }
    setError('');
    onSubmit(clean);
  };

  return (
    <div className={styles.entryWrap}>
      <div className={styles.entryCard}>
        <div className={styles.entryIcon}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="var(--color-accent)" opacity="0.9"/>
            <circle cx="12" cy="9" r="2.5" fill="var(--color-bg)"/>
          </svg>
        </div>

        <h1 className={styles.entryTitle}>Track a Journey</h1>
        <p className={styles.entrySub}>
          Enter the tracking ID from the SMS you received to follow someone's live metro journey.
        </p>

        <form onSubmit={handleSubmit} className={styles.entryForm}>
          <div className={styles.inputWrap}>
            <input
              type="text"
              className={`${styles.input} ${error ? styles.inputError : ''}`}
              placeholder="TRK-AB2345"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError(''); }}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              maxLength={10}
            />
          </div>
          {error && <p className={styles.errorMsg}>{error}</p>}
          <button type="submit" className={styles.btnPrimary} disabled={!value.trim()}>
            Start Tracking
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{marginLeft: '8px'}}>
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>

        <p className={styles.entryHelp}>
          No account needed · Link shared via SMS when trip starts
        </p>
      </div>

      <div className={styles.features}>
        {[
          { icon: '📍', title: 'Live location', desc: 'Updated every 10 seconds' },
          { icon: '🚇', title: 'Station markers', desc: 'Crossed stations highlighted' },
          { icon: '📶', title: 'Signal alerts', desc: 'Notified if signal is lost' },
        ].map((f) => (
          <div key={f.title} className={styles.featureItem}>
            <span className={styles.featureIcon}>{f.icon}</span>
            <div>
              <p className={styles.featureTitle}>{f.title}</p>
              <p className={styles.featureSub}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live tracking view ──────────────────────────────────────────────────────

function LiveTrackingView({ trackingId, onBack }) {
  const {
    session,
    locationHistory,
    visitedStationIds,
    signalLost,
    sosAlert,
    connectionStatus,
  } = useTrackingSocket(trackingId);

  const navigate = useNavigate();

  const formatDuration = (startedAt) => {
    if (!startedAt) return '—';
    const mins = Math.floor((Date.now() - startedAt) / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const connectionDot = {
    connecting: { color: '#f59e0b', label: 'Connecting…' },
    connected:  { color: '#22c55e', label: 'Live' },
    disconnected: { color: '#ef4444', label: 'Disconnected' },
    error: { color: '#ef4444', label: 'Error' },
    idle: { color: '#546e7a', label: 'Idle' },
  }[connectionStatus];

  return (
    <div className={styles.trackingLayout}>
      {/* Left sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={onBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

          <div className={styles.connectionStatus}>
            <span className={styles.statusDot} style={{ background: connectionDot.color }} />
            <span className={styles.statusLabel}>{connectionDot.label}</span>
          </div>
        </div>

        {session && (
          <>
            <div className={styles.journeyHeader}>
              <div className={styles.routeRow}>
                <span className={styles.stationLabel}>{session.sourceStation}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.arrowIcon}>
                  <path d="M5 12h14M12 5l7 7-7 7" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className={styles.stationLabel}>{session.destinationStation}</span>
              </div>

              <div className={styles.metaRow}>
                <MetaChip icon="⏱" label={formatDuration(session.startedAt)} />
                <MetaChip icon="🚇" label={`${visitedStationIds.length} / ${session.stationRoute?.length || '?'} stations`} />
                {!session.isActive && <MetaChip icon="✓" label="Completed" success />}
              </div>
            </div>

            {sosAlert && <SosAlertBanner sosAlert={sosAlert} />}

            <div className={styles.stationListWrap}>
              <StationList
                stationRoute={session.stationRoute}
                visitedStationIds={visitedStationIds}
              />
            </div>
          </>
        )}

        {connectionStatus === 'error' && (
          <div className={styles.errorCard}>
            <p>Could not connect to this journey.</p>
            <p>The tracking ID may be invalid or the journey has ended.</p>
          </div>
        )}
      </aside>

      {/* Map area */}
      <main className={styles.mapArea}>
        <div className={styles.mapContainer}>
          <SignalLostToast
            signalLost={signalLost}
            lastSeenAt={session?.lastPingAt}
          />
          <LiveMap
            stationRoute={session?.stationRoute || []}
            visitedStationIds={visitedStationIds}
            locationHistory={locationHistory}
            destinationStationId={session?.stationRoute?.[session.stationRoute.length - 1]?.stationId}
            isActive={session?.isActive}
          />
        </div>

        {!session?.isActive && session && (
          <div className={styles.endedBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Journey completed · {session.destinationStation}
          </div>
        )}
      </main>
    </div>
  );
}

function MetaChip({ icon, label, success }) {
  return (
    <span className={`${styles.metaChip} ${success ? styles.metaChipSuccess : ''}`}>
      {icon} {label}
    </span>
  );
}

// ─── Page root ───────────────────────────────────────────────────────────────

export default function TrackPage() {
  const { trackingId: paramId } = useParams();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState(paramId || null);

  const handleSubmit = useCallback((id) => {
    setActiveId(id);
    navigate(`/track/${id}`, { replace: true });
  }, [navigate]);

  const handleBack = useCallback(() => {
    setActiveId(null);
    navigate('/', { replace: true });
  }, [navigate]);

  if (activeId) {
    return <LiveTrackingView trackingId={activeId} onBack={handleBack} />;
  }

  return (
    <div className={styles.page}>
      <TrackingIdEntry onSubmit={handleSubmit} />
    </div>
  );
}