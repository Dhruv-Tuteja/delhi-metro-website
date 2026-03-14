import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LiveMap.module.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const SEGMENT_COLORS = {
  metro:   '#3d8ef8',
  transit: '#94a3b8',
};

function createStationIcon(station, isVisited, isDestination) {
  const lineColor   = station.lineColor || '#3d8ef8';
  const size        = isDestination ? 14 : 10;
  const borderColor = isVisited ? lineColor : '#2a3a55';
  const fill        = isVisited ? lineColor : '#1c2638';
  const outerRing   = isDestination
    ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${lineColor}" stroke-width="1.5" opacity="0.4"/>`
    : '';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      ${outerRing}
      <circle cx="16" cy="16" r="${size}" fill="${fill}" stroke="${borderColor}" stroke-width="2.5"/>
      ${isVisited ? `<circle cx="16" cy="16" r="${size - 4}" fill="${lineColor}" opacity="0.5"/>` : ''}
    </svg>
  `;
  return L.divIcon({ html: svg, className: '', iconSize: [32, 32], iconAnchor: [16, 16], popupAnchor: [0, -18] });
}

function createLivePositionIcon() {
  const html = `
    <div style="
      width:16px; height:16px;
      background:#3d8ef8;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 0 0 0 rgba(61,142,248,0.5);
      animation:pulse-glow 2s infinite;
    "></div>
  `;
  return L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
}

// Replay marker — solid dot, no pulse, slightly larger
function createReplayPositionIcon() {
  const html = `
    <div style="
      width:14px; height:14px;
      background:#3d8ef8;
      border:3px solid #fff;
      border-radius:50%;
      box-shadow:0 2px 8px rgba(61,142,248,0.6);
    "></div>
  `;
  return L.divIcon({ html, className: '', iconSize: [14, 14], iconAnchor: [7, 7] });
}

/**
 * LiveMap
 *
 * Props:
 *   stationRoute         — full ordered station array
 *   visitedStationIds    — IDs of stations already crossed
 *   locationHistory      — array of { lat, lng, segment } GPS points (draws the trail)
 *   currentPosition      — { lat, lng } interpolated position (replay smooth marker)
 *   destinationStationId — highlights the destination marker
 *   isActive             — live journey in progress (shows pulsing dot + auto-pan)
 */
export default function LiveMap({
  stationRoute = [],
  visitedStationIds = [],
  locationHistory = [],
  currentPosition = null,
  destinationStationId,
  isActive,
}) {
  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef   = useRef(null);
  const layersRef      = useRef({
    path:           null,
    liveMarker:     null,  // pulsing dot for live tracking
    replayMarker:   null,  // smooth dot for replay
    stationMarkers: new Map(),
  });

  // ── Tile layer helpers ──
  const getTileUrl = () => {
    const theme = document.documentElement.getAttribute('data-theme') || 'dark';
    return theme === 'light'
      ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  };

  const applyTileLayer = (map) => {
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current);
    tileLayerRef.current = L.tileLayer(getTileUrl(), { maxZoom: 19 }).addTo(map);
  };

  // ── Init map ──
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [28.6139, 77.2090],
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: '© OpenStreetMap © CARTO' }).addTo(map);

    applyTileLayer(map);
    mapInstanceRef.current = map;

    const observer = new MutationObserver(() => {
      if (mapInstanceRef.current) applyTileLayer(mapInstanceRef.current);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      observer.disconnect();
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // ── Station markers ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || stationRoute.length === 0) return;

    const { stationMarkers } = layersRef.current;

    stationRoute.forEach((station) => {
      const isVisited     = visitedStationIds.includes(station.stationId);
      const isDestination = station.stationId === destinationStationId;
      const icon          = createStationIcon(station, isVisited, isDestination);

      if (stationMarkers.has(station.stationId)) {
        stationMarkers.get(station.stationId).setIcon(icon);
      } else {
        const marker = L.marker([station.lat, station.lng], { icon })
          .bindPopup(
            `<div style="font-family:var(--font-body);color:#f0f4ff;background:#161e2e;padding:4px 2px">
              <strong style="font-size:0.875rem">${station.stationName}</strong>
              ${station.metroLine ? `<br><span style="font-size:0.75rem;color:#8899bb">${station.metroLine}</span>` : ''}
              ${isVisited ? '<br><span style="font-size:0.7rem;color:#22c55e">✓ Crossed</span>' : ''}
            </div>`,
            { className: 'metro-popup' }
          )
          .addTo(map);
        stationMarkers.set(station.stationId, marker);
      }
    });
  }, [stationRoute, visitedStationIds, destinationStationId]);

  // ── GPS trail ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || locationHistory.length === 0) return;

    const layers = layersRef.current;

    if (layers.path) layers.path.forEach((l) => map.removeLayer(l));

    // Group consecutive same-segment points
    const segments = [];
    let cur = { type: locationHistory[0].segment, points: [[locationHistory[0].lat, locationHistory[0].lng]] };

    for (let i = 1; i < locationHistory.length; i++) {
      const pt     = locationHistory[i];
      const latlng = [pt.lat, pt.lng];
      if (pt.segment === cur.type) {
        cur.points.push(latlng);
      } else {
        cur.points.push(latlng); // bridge gap
        segments.push({ ...cur });
        cur = { type: pt.segment, points: [latlng] };
      }
    }
    segments.push(cur);

    layers.path = segments.map(({ type, points }) => {
      const isMetro = type === 'metro';
      return L.polyline(points, {
        color:     SEGMENT_COLORS[type] || SEGMENT_COLORS.transit,
        weight:    isMetro ? 4 : 2,
        opacity:   isMetro ? 0.9 : 0.55,
        dashArray: isMetro ? null : '6 5',
        lineCap:  'round',
        lineJoin: 'round',
      }).addTo(map);
    });

    // Live tracking marker + auto-pan (only when isActive)
    if (isActive) {
      const last   = locationHistory[locationHistory.length - 1];
      const latlng = [last.lat, last.lng];
      if (layers.liveMarker) {
        layers.liveMarker.setLatLng(latlng);
      } else {
        layers.liveMarker = L.marker(latlng, { icon: createLivePositionIcon(), zIndexOffset: 1000 }).addTo(map);
      }
      map.panTo(latlng, { animate: true, duration: 0.8 });
    }
  }, [locationHistory, isActive]);

  // ── Smooth replay marker — updates every RAF frame via currentPosition ──
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentPosition) return;

    const layers = layersRef.current;
    const latlng = [currentPosition.lat, currentPosition.lng];

    if (layers.replayMarker) {
      layers.replayMarker.setLatLng(latlng);
    } else {
      layers.replayMarker = L.marker(latlng, {
        icon: createReplayPositionIcon(),
        zIndexOffset: 1000,
      }).addTo(map);
    }

    // Pan to follow replay marker (smooth, no jarring)
    map.panTo(latlng, { animate: true, duration: 0.3 });
  }, [currentPosition]);

  // ── Clean up replay marker when currentPosition becomes null (e.g. on reset) ──
  useEffect(() => {
    if (currentPosition === null && layersRef.current.replayMarker) {
      mapInstanceRef.current?.removeLayer(layersRef.current.replayMarker);
      layersRef.current.replayMarker = null;
    }
  }, [currentPosition]);

  return (
    <div className={styles.wrapper}>
      <div ref={mapRef} className={styles.map} />
      <div className={styles.legend}>
        <LegendItem color={SEGMENT_COLORS.metro}   label="Metro" />
        <LegendItem color={SEGMENT_COLORS.transit} dashed label="Transit" />
      </div>
    </div>
  );
}

function LegendItem({ color, label, dashed }) {
  return (
    <div className={styles.legendItem}>
      <svg width="28" height="8" viewBox="0 0 28 8">
        {dashed
          ? <line x1="2" y1="4" x2="26" y2="4" stroke={color} strokeWidth="2" strokeDasharray="6 5" strokeLinecap="round" opacity="0.7" />
          : <line x1="2" y1="4" x2="26" y2="4" stroke={color} strokeWidth="3" strokeLinecap="round" />
        }
      </svg>
      <span>{label}</span>
    </div>
  );
}
