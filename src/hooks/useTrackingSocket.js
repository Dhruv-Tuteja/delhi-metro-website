import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

/**
 * useTrackingSocket — manages the full lifecycle of a WebSocket connection
 * to a live tracking session.
 *
 * Handles:
 *   - Connection / reconnection
 *   - Receiving the initial session snapshot (GPS history + stations)
 *   - Streaming location updates
 *   - Station visited events
 *   - Signal lost / restored events
 *   - SOS alerts
 *   - Clean disconnection on unmount
 *
 * @param {string|null} trackingId
 * @returns {{ session, locationHistory, visitedStationIds, signalLost, sosAlert, connectionStatus }}
 */
export function useTrackingSocket(trackingId) {
  const socketRef = useRef(null);

  const [connectionStatus, setConnectionStatus] = useState('idle'); // idle | connecting | connected | disconnected | error
  const [session, setSession] = useState(null);
  const [locationHistory, setLocationHistory] = useState([]);
  const [visitedStationIds, setVisitedStationIds] = useState([]);
  const [signalLost, setSignalLost] = useState(false);
  const [sosAlert, setSosAlert] = useState(null);

  const connect = useCallback(() => {
    if (!trackingId) return;
    if (socketRef.current?.connected) return;

    setConnectionStatus('connecting');

    const socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      // Join the tracking room as a viewer
      socket.emit('viewer:join', { trackingId });
    });

    // Full state snapshot sent immediately on join
    socket.on('session:snapshot', (data) => {
      setSession(data);
      setLocationHistory(data.gpsBuffer || []);
      setVisitedStationIds(data.visitedStationIds || []);
      setSignalLost(data.signalLost || false);
      if (data.hadSosAlert) setSosAlert({ fromSnapshot: true });
    });

    // Live location updates
    socket.on('location:update', (point) => {
      setLocationHistory((prev) => [...prev, point]);
      // If signal was lost, restore it on new data
      setSignalLost(false);
    });

    // Station crossing
    socket.on('station:visited', ({ stationId }) => {
      setVisitedStationIds((prev) =>
        prev.includes(stationId) ? prev : [...prev, stationId]
      );
    });

    // Signal monitoring
    socket.on('signal_lost', () => setSignalLost(true));
    socket.on('signal_restored', () => setSignalLost(false));

    // SOS
    socket.on('sos:triggered', (data) => setSosAlert(data));

    // Session ended by the phone
    socket.on('session:ended', () => {
      setSession((prev) => prev ? { ...prev, isActive: false } : prev);
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
      setConnectionStatus('error');
    });

    socket.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
      if (reason === 'io server disconnect') {
        // Server intentionally disconnected us — don't reconnect
        socket.close();
      }
    });

    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      socket.emit('viewer:join', { trackingId });
    });
  }, [trackingId]);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [connect]);

  return {
    session,
    locationHistory,
    visitedStationIds,
    signalLost,
    sosAlert,
    connectionStatus,
  };
}
