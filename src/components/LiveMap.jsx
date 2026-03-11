import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LiveMap.module.css';

// Fix Leaflet default marker icon in bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Segment path colors
const SEGMENT_COLORS = {
  metro:   '#3d8ef8',
  walking: '#22c55e',
  vehicle: '#f59e0b',
};

/**
 * Creates an SVG-based Leaflet DivIcon for a metro station marker.
 * Visited stations are highlighted; the destination gets a special icon.
 */
function createStationIcon(station, isVisited, isDestination) {
  const lineColor = station.lineColor || '#3d8ef8';
  const size = isDestination ? 14 : 10;
  const borderColor = isVisited ? lineColor : '#2a3a55';
  const fill = isVisited ? lineColor : '#1c2638';
  const outerRing = isDestination ? `<circle cx="16" cy="16" r="14" fill="none" stroke="${lineColor}" stroke-width="1.5" opacity="0.4"/>` : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
      ${outerRing}
      <circle cx="16" cy="16" r="${size}" fill="${fill}" stroke="${borderColor}" stroke-width="2.5"/>
      ${isVisited ? `<circle cx="16" cy="16" r="${size - 4}" fill="${lineColor}" opacity="0.5"/>` : ''}
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
}

/**
 * Creates the live position marker (pulsing blue dot).
 */
function createLivePositionIcon() {
  const html = `
    <div style="
      width:16px; height:16px;
      background: #3d8ef8;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(61,142,248,0.5);
      animation: pulse-glow 2s infinite;
    "></div>
  `;
  return L.divIcon({ html, className: '', iconSize: [16, 16], iconAnchor: [8, 8] });
}

/**
 * LiveMap — renders the Leaflet map, GPS path, and station markers.
 *
 * Props:
 *   stationRoute      — full ordered station array for the route
 *   visitedStationIds — IDs of stations already crossed
 *   locationHistory   — array of { lat, lng, segment } GPS points
 *   destinationStationId — highlights the destination marker
 *   isActive          — whether journey is still in progress
 */
export default function LiveMap({
  stationRoute = [],
  visitedStationIds = [],
  locationHistory = [],
  destinationStationId,
  isActive,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({
    path: null,
    liveMarker: null,
    stationMarkers: new Map(),
  });

  // Initialize map on mount
  useEffect(() => {
    if (mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: [28.6139, 77.2090], // Delhi centre
      zoom: 12,
      zoomControl: false,
      attributionControl: false,
    });

    // Dark map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
    L.control.attribution({ position: 'bottomleft', prefix: '© OpenStreetMap © CARTO' }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Render/update station markers when route changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || stationRoute.length === 0) return;

    const { stationMarkers } = layersRef.current;

    stationRoute.forEach((station) => {
      const isVisited = visitedStationIds.includes(station.stationId);
      const isDestination = station.stationId === destinationStationId;
      const icon = createStationIcon(station, isVisited, isDestination);

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

  // Draw GPS path segments and update live marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || locationHistory.length === 0) return;

    const layers = layersRef.current;

    // Remove old path
    if (layers.path) {
      layers.path.forEach((l) => map.removeLayer(l));
    }

    // Build segments of consecutive same-type points
    const segments = [];
    let currentSegment = { type: locationHistory[0].segment, points: [[locationHistory[0].lat, locationHistory[0].lng]] };

    for (let i = 1; i < locationHistory.length; i++) {
      const point = locationHistory[i];
      const latlng = [point.lat, point.lng];

      if (point.segment === currentSegment.type) {
        currentSegment.points.push(latlng);
      } else {
        // Bridge gap between segments
        currentSegment.points.push(latlng);
        segments.push({ ...currentSegment });
        currentSegment = { type: point.segment, points: [latlng] };
      }
    }
    segments.push(currentSegment);

    // Draw each segment as a differently-styled polyline
    const pathLayers = segments.map(({ type, points }) => {
      const color = SEGMENT_COLORS[type] || '#3d8ef8';
      const isDashed = type !== 'metro';
      return L.polyline(points, {
        color,
        weight: type === 'metro' ? 4 : 2.5,
        opacity: 0.9,
        dashArray: isDashed ? '8 6' : null,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);
    });

    layers.path = pathLayers;

    // Update live position marker
    const last = locationHistory[locationHistory.length - 1];
    if (last && isActive) {
      const latlng = [last.lat, last.lng];
      if (layers.liveMarker) {
        layers.liveMarker.setLatLng(latlng);
      } else {
        layers.liveMarker = L.marker(latlng, { icon: createLivePositionIcon(), zIndexOffset: 1000 }).addTo(map);
      }
      // Pan map to follow
      map.panTo(latlng, { animate: true, duration: 0.8 });
    }
  }, [locationHistory, isActive]);

  return (
    <div className={styles.wrapper}>
      <div ref={mapRef} className={styles.map} />
      <div className={styles.legend}>
        <LegendItem color={SEGMENT_COLORS.metro} label="Metro" />
        <LegendItem color={SEGMENT_COLORS.walking} dashed label="Walking" />
        <LegendItem color={SEGMENT_COLORS.vehicle} dashed label="Vehicle" />
      </div>
    </div>
  );
}

function LegendItem({ color, label, dashed }) {
  return (
    <div className={styles.legendItem}>
      <svg width="28" height="8" viewBox="0 0 28 8">
        {dashed ? (
          <line x1="2" y1="4" x2="26" y2="4" stroke={color} strokeWidth="2.5" strokeDasharray="6 4" strokeLinecap="round" />
        ) : (
          <line x1="2" y1="4" x2="26" y2="4" stroke={color} strokeWidth="3" strokeLinecap="round" />
        )}
      </svg>
      <span>{label}</span>
    </div>
  );
}
