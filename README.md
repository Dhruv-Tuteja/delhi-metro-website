# Delhi Metro Tracker — Website

React web app for viewing a live Delhi Metro journey in real time. Family members open a share link and see the traveller's position, visited stations, signal status, and SOS alerts — no login required.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + Vite |
| Routing | React Router v6 |
| Real-time | Socket.IO client |
| Maps | Leaflet + CartoDB dark tiles |
| Auth (optional) | Firebase Web SDK |
| Styling | CSS Modules |
| Hosting | Vercel |

---

## Pages

### `/track/:trackingId`
The main viewer page. Opens a live tracking session identified by `trackingId` (e.g. `TRK-AB3X7K`). No login required — anyone with the link can view.

Shows:
- Live map with GPS path (colour-coded: blue = metro, green = walking, amber = vehicle)
- Station list with visited/upcoming/current indicators
- Live / Signal Lost / Completed status badge
- SOS alert banner if emergency was triggered
- Journey completion banner

### `/`  (Track page — entry)
Lets you manually enter a tracking ID to watch any journey.

### `/help`
Help center with a bug report form. Submissions are saved to Firestore `bug_reports`.

### `*` — 404
Custom not found page.

---

## Project Structure

```
src/
├── main.jsx                        # React root, router setup
├── App.jsx                         # Route definitions
├── firebase/
│   └── firebaseClient.js           # Firebase Web SDK init
├── hooks/
│   └── useTrackingSocket.js        # WebSocket lifecycle + all real-time state
├── styles/
│   └── globals.css                 # Design tokens, fonts, global resets
├── components/
│   ├── Navbar.jsx                  # Top navigation bar
│   ├── LiveMap.jsx                 # Leaflet map: GPS path + station markers
│   ├── StationList.jsx             # Sidebar station list with progress
│   ├── SignalLostToast.jsx         # Banner shown when GPS drops
│   └── SosAlertBanner.jsx          # Full-width emergency alert banner
└── pages/
    ├── TrackPage.jsx               # Main viewer page — composes all components
    ├── HelpCenter.jsx              # Bug report form
    └── NotFound.jsx                # 404 page
```

---

## Real-time Data Flow

```
Backend (Socket.IO)
        │
        ▼
useTrackingSocket.js          ← manages connection, exposes state
        │
        ├── session            → route info, source/destination
        ├── locationHistory    → array of GPS points { lat, lng, segment }
        ├── visitedStationIds  → string[] of crossed station IDs
        ├── signalLost         → boolean
        ├── sosAlert           → null | { stationName, timestamp, locationUrl }
        └── connectionStatus   → idle | connecting | connected | disconnected
        │
        ▼
TrackPage.jsx                 ← passes props to:
        ├── LiveMap            → renders GPS polylines + station dots
        ├── StationList        → renders visited / upcoming / current
        ├── SignalLostToast    → shown when signalLost = true
        └── SosAlertBanner     → shown when sosAlert != null
```

When a viewer first opens the link, the backend sends a **full session snapshot** so the map renders the entire journey so far instantly — not just future points.

---

## Map Rendering

GPS points are grouped into consecutive segments by type and drawn as separate polylines:

| Segment | Colour | Style |
|---|---|---|
| `metro` | `#3d8ef8` blue | Solid, 4px |
| `walking` | `#22c55e` green | Dashed, 2.5px |
| `vehicle` | `#f59e0b` amber | Dashed, 2.5px |

Station markers update live as stations are visited. The destination station has a pulsing outer ring. A live position dot (pulsing blue) follows the last GPS point and the map pans to keep it in view.

---

## Environment Variables

Create a `.env` file in the website root:

```env
VITE_BACKEND_URL=https://api.metrotracker.app

VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
```

> All `VITE_` prefixed variables are bundled into the client build. Never put secrets here.

---

## Local Development

```bash
npm install
cp .env.example .env   # fill in your values
npm run dev            # starts at http://localhost:5173
```

To test with a real journey, start the backend locally and update `VITE_BACKEND_URL=http://localhost:3001`.

---

## Production Deployment (Vercel)

The repo auto-deploys to Vercel on every push to `main`.

```bash
git add .
git commit -m "your change"
git push origin main   # Vercel picks this up automatically
```

**Vercel environment variables** — set these in the Vercel dashboard under Project → Settings → Environment Variables (same keys as your `.env` file).

`vercel.json` rewrites all routes to `index.html` so React Router handles `/track/:id` correctly on direct load and refresh.

---

## Key Design Decisions

**No login for viewers** — the `trackingId` itself is the access token. Anyone with `TRK-XXXXXX` can view. This makes the SMS share flow seamless for family members.

**Snapshot on join** — viewers who open the link mid-journey immediately see the full path so far, not a blank map waiting for the next GPS ping.

**`allVisitedStationIds` on station events** — when the Android user manually jumps to a station (skipping intermediates), the backend sends the full visited array so all skipped stations are ticked at once.

**Session ended without refresh** — when the journey ends, the backend emits `session:ended` directly to the viewer room via Socket.IO. The website updates to "Completed" immediately.
