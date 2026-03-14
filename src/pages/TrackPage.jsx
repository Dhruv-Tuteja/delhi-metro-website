import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useTrackingSocket } from '../hooks/useTrackingSocket';
import LiveMap from '../components/LiveMap';
import StationList from '../components/StationList';
import SignalLostToast from '../components/SignalLostToast';
import SosAlertBanner from '../components/SosAlertBanner';
import styles from './TrackPage.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lerp = (a, b, t) => a + (b - a) * t;

function MetaChip({ icon, label, success }) {
  return (
    <span className={`${styles.metaChip} ${success ? styles.metaChipSuccess : ''}`}>
      {icon} {label}
    </span>
  );
}

const BackArrow = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── Landing — enter tracking ID ──────────────────────────────────────────────

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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginLeft: '8px' }}>
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
        <p className={styles.entryHelp}>No account needed · Link shared via SMS when trip starts</p>
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

// ─── Live tracking view ───────────────────────────────────────────────────────

function LiveTrackingView({ trackingId }) {
  const { session, locationHistory, visitedStationIds, signalLost, sosAlert, connectionStatus } =
    useTrackingSocket(trackingId);
  const navigate = useNavigate();

  const formatDuration = (startedAt) => {
    if (!startedAt) return '—';
    const mins = Math.floor((Date.now() - startedAt) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const connectionDot = {
    connecting:   { color: '#f59e0b', label: 'Connecting…' },
    connected:    { color: '#22c55e', label: 'Live' },
    disconnected: { color: '#ef4444', label: 'Disconnected' },
    error:        { color: '#ef4444', label: 'Error' },
    idle:         { color: '#546e7a', label: 'Idle' },
  }[connectionStatus];

  return (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => navigate('/', { replace: true })}>
            <BackArrow />
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
              <StationList stationRoute={session.stationRoute} visitedStationIds={visitedStationIds} />
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

      <main className={styles.mapArea}>
        <div className={styles.mapContainer}>
          <SignalLostToast signalLost={signalLost} lastSeenAt={session?.lastPingAt} />
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
            <button className={styles.replayBtn} onClick={() => navigate(`/replay/${trackingId}`)}>
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

// ─── Trip Replay View ─────────────────────────────────────────────────────────

function ReplayView({ trackingId }) {
  const navigate = useNavigate();
  const [replay, setReplay]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // UI state — these drive re-renders
  const [isPlaying, setIsPlaying]         = useState(false);
  const [speed, setSpeed]                 = useState(10);
  const [simulatedTime, setSimulatedTime] = useState(0);   // ms from trip start
  const [playIndex, setPlayIndex]         = useState(0);
  const [interpolatedPos, setInterpolatedPos] = useState(null);

  // Refs — read inside RAF without causing re-renders
  const rafRef           = useRef(null);
  const isPlayingRef     = useRef(false);
  const speedRef         = useRef(10);
  const simulatedTimeRef = useRef(0);
  const playIndexRef     = useRef(0);
  const lastWallTimeRef  = useRef(null);

  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  // Fetch
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/sessions/${trackingId}/replay`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setReplay(data.replay);
          simulatedTimeRef.current = 0;
          playIndexRef.current = 0;
          setSimulatedTime(0);
          setPlayIndex(0);
          setInterpolatedPos(null);
        } else {
          setError(data.message || 'Replay data not found');
        }
      })
      .catch(() => setError('Failed to load replay data'))
      .finally(() => setLoading(false));
  }, [trackingId]);

  // Master RAF loop — starts once, never restarts (speed/isPlaying flow through refs)
  useEffect(() => {
    if (!replay || replay.gpsPath.length < 2) return;

    const path          = replay.gpsPath;
    const tripStart     = path[0].timestamp;
    const totalDuration = path[path.length - 1].timestamp - tripStart;

    const tick = (now) => {
      rafRef.current = requestAnimationFrame(tick);

      if (!isPlayingRef.current) {
        lastWallTimeRef.current = null;
        return;
      }

      if (!lastWallTimeRef.current) {
        lastWallTimeRef.current = now;
        return;
      }

      // 1. Real time elapsed since last frame (capped to avoid tab-switch jumps)
      const wallDelta = Math.min(now - lastWallTimeRef.current, 200);
      lastWallTimeRef.current = now;

      // 2. Advance simulated clock: real_ms × speed = trip_ms
      const newSimTime = Math.min(
        simulatedTimeRef.current + wallDelta * speedRef.current,
        totalDuration
      );
      simulatedTimeRef.current = newSimTime;

      // 3. Find which GPS segment [i, i+1] contains newSimTime
      let i = playIndexRef.current;
      while (i < path.length - 2 && (path[i + 1].timestamp - tripStart) <= newSimTime) {
        i++;
      }
      playIndexRef.current = i;

      // 4. Lerp position between p1 and p2 for smooth marker movement
      const p1      = path[i];
      const p2      = path[Math.min(i + 1, path.length - 1)];
      const segStart = p1.timestamp - tripStart;
      const segDur   = p2.timestamp - p1.timestamp;
      const alpha    = segDur > 0 ? Math.min((newSimTime - segStart) / segDur, 1) : 1;

      // 5. Flush to React state (batched by React 18 — one re-render per frame)
      setInterpolatedPos({ lat: lerp(p1.lat, p2.lat, alpha), lng: lerp(p1.lng, p2.lng, alpha) });
      setSimulatedTime(newSimTime);
      setPlayIndex(i);

      // 6. Stop at end
      if (newSimTime >= totalDuration) {
        isPlayingRef.current = false;
        setIsPlaying(false);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [replay]);

  // Seek by clicking progress bar
  const handleSeek = (totalDuration, tripStart) => (e) => {
    const rect   = e.currentTarget.getBoundingClientRect();
    const ratio  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const target = ratio * totalDuration;
    const path   = replay.gpsPath;

    simulatedTimeRef.current = target;
    setSimulatedTime(target);

    let newIdx = 0;
    while (newIdx < path.length - 2 && (path[newIdx + 1].timestamp - tripStart) <= target) newIdx++;
    playIndexRef.current = newIdx;
    setPlayIndex(newIdx);
    setInterpolatedPos({ lat: path[newIdx].lat, lng: path[newIdx].lng });
  };

  const resetPlayback = (replay) => {
    const path = replay.gpsPath;
    simulatedTimeRef.current = 0;
    playIndexRef.current = 0;
    setSimulatedTime(0);
    setPlayIndex(0);
    setInterpolatedPos({ lat: path[0].lat, lng: path[0].lng });
  };

  // ── Shared sidebar shell for loading/error states ──
  const SidebarShell = ({ children }) => (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <BackArrow />
          </button>
          <span className={styles.statusLabel} style={{ color: 'var(--color-accent)' }}>⏪ Replay</span>
        </div>
        {children}
      </aside>
      <main className={styles.mapArea}><div className={styles.mapContainer} /></main>
    </div>
  );

  if (loading) return (
    <SidebarShell>
      <div style={{ padding: '2rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>Loading replay…</div>
    </SidebarShell>
  );
  if (error) return (
    <SidebarShell>
      <div className={styles.errorCard}>
        <p>{error}</p>
        <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
          The trip may not have GPS data saved, or the tracking ID is invalid.
        </p>
      </div>
    </SidebarShell>
  );

  // ── Derived values for render ──
  const path          = replay.gpsPath;
  const tripStart     = path[0].timestamp;
  const totalDuration = path[path.length - 1].timestamp - tripStart || 1;
  const progress      = Math.min((simulatedTime / totalDuration) * 100, 100);
  const visiblePath   = path.slice(0, playIndex + 1);

  const replayVisitedIds = replay.visitedStationIds.filter((_, i) => {
    const threshold = ((i + 1) / replay.visitedStationIds.length) * totalDuration;
    return simulatedTime >= threshold;
  });

  const formatDate = (ts) => ts
    ? new Date(ts).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  const formatDuration = (start, end) => {
    if (!start || !end) return '—';
    const mins = Math.floor((end - start) / 60000);
    return mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };
  const formatElapsed = (ms) => {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const isEnded = progress >= 99.9;

  return (
    <div className={styles.trackingLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.backBtn} onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}>
            <BackArrow />
          </button>
          <span className={styles.statusLabel} style={{ color: 'var(--color-accent)' }}>⏪ Replay</span>
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
            <MetaChip icon="📍" label={`${path.length} pts`} />
          </div>
        </div>

        {/* Playback controls */}
        <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--color-border)' }}>

          {/* Progress bar with scrub handle */}
          <div
            onClick={handleSeek(totalDuration, tripStart)}
            style={{ position: 'relative', height: '6px', background: 'var(--color-surface-2)', borderRadius: '3px', marginBottom: '1.25rem', cursor: 'pointer' }}
          >
            <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${progress}%`, background: 'var(--color-accent)', borderRadius: '3px' }} />
            <div style={{
              position: 'absolute', top: '50%', left: `${progress}%`,
              transform: 'translate(-50%, -50%)',
              width: '13px', height: '13px', borderRadius: '50%',
              background: 'var(--color-accent)', border: '2px solid var(--color-bg)',
              pointerEvents: 'none', boxShadow: '0 0 4px rgba(61,142,248,0.5)',
            }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Restart */}
            <button onClick={() => { resetPlayback(replay); setIsPlaying(false); }} style={ctrlBtn} title="Restart">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>

            {/* Play / Pause */}
            <button
              onClick={() => {
                if (isEnded) resetPlayback(replay);
                setIsPlaying((p) => !p);
              }}
              style={{ ...ctrlBtn, background: 'var(--color-accent)', color: '#fff', width: '36px', height: '36px', borderRadius: '50%' }}
            >
              {isPlaying
                ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            {/* Speed */}
            <select
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              style={{ marginLeft: 'auto', background: 'var(--color-surface-2)', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '4px 8px', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              {[1, 5, 10, 30, 60].map((v) => <option key={v} value={v}>{v}×</option>)}
            </select>
          </div>

          {/* Elapsed / total */}
          <p style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
            <span>{formatElapsed(simulatedTime)}</span>
            <span>{formatElapsed(totalDuration)}</span>
          </p>
        </div>

        <div className={styles.stationListWrap}>
          <StationList stationRoute={replay.stationRoute} visitedStationIds={replayVisitedIds} />
        </div>
      </aside>

      <main className={styles.mapArea}>
        <div className={styles.mapContainer}>
          <LiveMap
            stationRoute={replay.stationRoute}
            visitedStationIds={replayVisitedIds}
            locationHistory={visiblePath}
            currentPosition={interpolatedPos}
            destinationStationId={replay.stationRoute?.[replay.stationRoute.length - 1]?.stationId}
            isActive={false}
          />
        </div>
        {isEnded && (
          <div className={styles.endedBanner}>
            <div className={styles.endedLeft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Replay complete · {replay.destinationStation}
            </div>
            <button className={styles.replayBtn} onClick={() => { resetPlayback(replay); setIsPlaying(true); }}>
              ↺ Watch again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

const ctrlBtn = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'var(--color-surface-2)', color: 'var(--color-text)',
  border: '1px solid var(--color-border)', borderRadius: '8px',
  width: '32px', height: '32px', cursor: 'pointer', flexShrink: 0,
};

// ─── Page root ────────────────────────────────────────────────────────────────

export default function TrackPage({ isReplay = false }) {
  const { trackingId: paramId } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const activeId = paramId || null;

  const handleSubmit = useCallback((id) => {
    navigate(`/track/${id}`, { replace: true });
  }, [navigate]);

  if (isReplay && paramId) return <ReplayView trackingId={paramId} />;
  if (activeId) return <LiveTrackingView trackingId={activeId} />;

  return (
    <div className={styles.page}>
      <TrackingIdEntry onSubmit={handleSubmit} />
    </div>
  );
}
