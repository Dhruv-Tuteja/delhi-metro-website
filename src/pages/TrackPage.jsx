import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
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

function LiveTrackingView({ trackingId }) {
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
          <button className={styles.backBtn} onClick={() => {
            navigate('/', { replace: true });
          }}>
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
            <div className={styles.endedLeft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Journey completed · {session.destinationStation}
            </div>
            <button
              className={styles.replayBtn}
              onClick={() => navigate(`/replay/${trackingId}`)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                <path d="M1 4v6h6M23 20v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Replay Trip
            </button>
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


// ─── Trip Replay View ────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

function ReplayView({ trackingId }) {
  const navigate = useNavigate();
  const [replay, setReplay] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Playback state
  const [playIndex, setPlayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(10);
  const rafRef = useRef(null);
  const lastRafTime = useRef(null);   // wall-clock time of last RAF tick
  const playIndexRef = useRef(0);     // shadow ref so RAF closure always has latest index

  // Keep ref in sync with state
  useEffect(() => { playIndexRef.current = playIndex; }, [playIndex]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/sessions/${trackingId}/replay`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setReplay(data.replay);
          setPlayIndex(0);
          playIndexRef.current = 0;
        } else {
          setError(data.message || 'Replay data not found');
        }
      })
      .catch(() => setError('Failed to load replay data'))
      .finally(() => setLoading(false));
  }, [trackingId]);

  // Timestamp-aware playback using requestAnimationFrame
  // Each RAF tick advances the index by however many real ms have passed * speed,
  // mapped against the actual GPS timestamp gaps — so 1x = real time, 10x = 10× faster.
  useEffect(() => {
    if (!isPlaying || !replay || replay.gpsPath.length < 2) return;

    const path = replay.gpsPath;
    const tripStart = path[0].timestamp;
    const tripEnd = path[path.length - 1].timestamp;
    const tripDuration = tripEnd - tripStart; // real ms of the trip

    lastRafTime.current = null;

    const tick = (now) => {
      if (!lastRafTime.current) {
        lastRafTime.current = now;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const wallDelta = now - lastRafTime.current; // ms since last frame
      lastRafTime.current = now;

      const currentIdx = playIndexRef.current;
      if (currentIdx >= path.length - 1) {
        setIsPlaying(false);
        return;
      }

      // How far into the trip are we in real-trip-time?
      const currentTripTime = path[currentIdx].timestamp - tripStart;
      // Advance by wallDelta * speed ms of trip time
      const targetTripTime = currentTripTime + wallDelta * speed;

      // Find the GPS point whose timestamp matches targetTripTime
      let nextIdx = currentIdx;
      while (
        nextIdx < path.length - 1 &&
        (path[nextIdx].timestamp - tripStart) < targetTripTime
      ) {
        nextIdx++;
      }

      if (nextIdx !== currentIdx) {
        setPlayIndex(nextIdx);
        playIndexRef.current = nextIdx;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, speed, replay]);

  if (loading) return (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{padding:'2rem',color:'var(--color-text-muted)',textAlign:'center'}}>Loading replay…</div>
      </aside>
      <main className={styles.mapArea}><div className={styles.mapContainer} /></main>
    </div>
  );

  if (error) return (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div className={styles.errorCard}><p>{error}</p><p style={{fontSize:'0.8rem',marginTop:'0.5rem',color:'var(--color-text-muted)'}}>The trip may not have GPS data saved yet, or the tracking ID is invalid.</p></div>
      </aside>
      <main className={styles.mapArea}><div className={styles.mapContainer} /></main>
    </div>
  );

  const visiblePath = replay.gpsPath.slice(0, playIndex + 1);
  const progress = replay.gpsPath.length > 0 ? (playIndex / (replay.gpsPath.length - 1)) * 100 : 0;

  // Mark stations by comparing current GPS timestamp to trip timeline.
  // We divide the trip duration equally across visited stations as the best
  // approximation (station checkpoint timestamps aren't stored in gpsPath).
  const currentTs = replay.gpsPath[playIndex]?.timestamp || 0;
  const tripStartTs = replay.gpsPath[0]?.timestamp || 0;
  const tripEndTs = replay.gpsPath[replay.gpsPath.length - 1]?.timestamp || 1;
  const tripElapsed = currentTs - tripStartTs;
  const tripTotal = tripEndTs - tripStartTs || 1;
  const stationCount = replay.visitedStationIds.length;
  // Each station is "visited" when we pass its proportional time slot
  const visitedCount = replay.visitedStationIds.reduce((acc, _, i) => {
    const stationTime = ((i + 1) / stationCount) * tripTotal;
    return tripElapsed >= stationTime ? acc + 1 : acc;
  }, 0);
  const replayVisitedIds = replay.visitedStationIds.slice(0, visitedCount);

  const formatDate = (ts) => ts ? new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const formatDuration = (start, end) => {
    if (!start || !end) return '—';
    const mins = Math.floor((end - start) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h ${mins%60}m`;
  };

  return (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className={styles.statusLabel} style={{color:'var(--color-accent)'}}>⏪ Replay</span>
        </div>

        <div className={styles.journeyHeader}>
          <div className={styles.routeRow}>
            <span className={styles.stationLabel}>{replay.sourceStation}</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className={styles.arrowIcon}>
              <path d="M5 12h14M12 5l7 7-7 7" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className={styles.stationLabel}>{replay.destinationStation}</span>
          </div>
          <div className={styles.metaRow}>
            <MetaChip icon="📅" label={formatDate(replay.startedAt)} />
            <MetaChip icon="⏱" label={formatDuration(replay.startedAt, replay.endedAt)} />
            <MetaChip icon="📍" label={`${replay.gpsPath.length} pts`} />
          </div>
        </div>

        {/* Playback controls */}
        <div style={{padding:'1rem 1.25rem',borderBottom:'1px solid var(--color-border)'}}>
          {/* Progress bar */}
          <div style={{position:'relative',height:'4px',background:'var(--color-surface-2)',borderRadius:'2px',marginBottom:'1rem',cursor:'pointer'}}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              setPlayIndex(Math.floor(ratio * (replay.gpsPath.length - 1)));
            }}>
            <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${progress}%`,background:'var(--color-accent)',borderRadius:'2px',transition:'width 0.1s'}} />
          </div>

          <div style={{display:'flex',alignItems:'center',gap:'0.75rem'}}>
            {/* Rewind */}
            <button onClick={() => { setIsPlaying(false); setPlayIndex(0); }} style={ctrlBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>

            {/* Play/Pause */}
            <button onClick={() => {
              if (playIndex >= replay.gpsPath.length - 1) setPlayIndex(0);
              setIsPlaying(p => !p);
            }} style={{...ctrlBtn, background:'var(--color-accent)', color:'#fff', width:'36px', height:'36px', borderRadius:'50%'}}>
              {isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            {/* Speed selector */}
            <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}
              style={{marginLeft:'auto',background:'var(--color-surface-2)',color:'var(--color-text)',border:'1px solid var(--color-border)',borderRadius:'6px',padding:'4px 8px',fontSize:'0.8rem',cursor:'pointer'}}>
              <option value={1}>1×</option>
              <option value={5}>5×</option>
              <option value={10}>10×</option>
              <option value={30}>30×</option>
              <option value={60}>60×</option>
            </select>
          </div>

          <p style={{marginTop:'0.75rem',fontSize:'0.75rem',color:'var(--color-text-muted)'}}>
            Point {playIndex + 1} of {replay.gpsPath.length}
            {replay.gpsPath[playIndex]?.timestamp && (
              <> · {new Date(replay.gpsPath[playIndex].timestamp).toLocaleTimeString('en-IN')}</>
            )}
          </p>
        </div>

        <div className={styles.stationListWrap}>
          <StationList
            stationRoute={replay.stationRoute}
            visitedStationIds={replayVisitedIds}
          />
        </div>
      </aside>

      <main className={styles.mapArea}>
        <div className={styles.mapContainer}>
          <LiveMap
            stationRoute={replay.stationRoute}
            visitedStationIds={replayVisitedIds}
            locationHistory={visiblePath}
            destinationStationId={replay.stationRoute?.[replay.stationRoute.length - 1]?.stationId}
            isActive={false}
          />
        </div>
        {progress >= 99 && (
          <div className={styles.endedBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Replay complete · {replay.destinationStation}
          </div>
        )}
      </main>
    </div>
  );
}

const ctrlBtn = {
  display:'flex',alignItems:'center',justifyContent:'center',
  background:'var(--color-surface-2)',color:'var(--color-text)',
  border:'1px solid var(--color-border)',borderRadius:'8px',
  width:'32px',height:'32px',cursor:'pointer',flexShrink:0,
};

// ─── Page root ───────────────────────────────────────────────────────────────

export default function TrackPage({ isReplay = false }) {
  const { trackingId: paramId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // Derive activeId from URL — so navigating to '/' always clears it
  const activeId = paramId || null;

  const handleSubmit = useCallback((id) => {
    navigate(`/track/${id}`, { replace: true });
  }, [navigate]);

  // /replay/:trackingId
  if (isReplay && paramId) {
    return <ReplayView trackingId={paramId} />;
  }

  if (activeId) {
    return <LiveTrackingView trackingId={activeId} />;
  }

  return (
    <div className={styles.page}>
      <TrackingIdEntry onSubmit={handleSubmit} />
    </div>
  );
}
