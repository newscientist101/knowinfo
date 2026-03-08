# Info Kiosk — Events Calendar

An MVMF plugin that displays a dynamic events calendar in the Open Metaverse.

## Architecture

```
┌─────────────────────────────────────────────────┐
│  kiosk-app.js  (UI — renders event cards)       │
│    ↕ Attach/onChanged                           │
│  EventCalendar MODEL  (observable event list)   │
│    ↕                                            │
│  EventCalendar SOURCE (fetches via HTTP)        │
│    ↕                                            │
│  InfoKiosk CLIENT     (anonymous session)       │
│    ↕                                            │
│  InfoKiosk SERVICE    (connection to API)       │
└───────────────────┬─────────────────────────────┘
                    │ HTTP GET
                    ▼
┌─────────────────────────────────────────────────┐
│  server/server.js  (Events JSON API on :8001)   │
│  server/events.json (event data)                │
└─────────────────────────────────────────────────┘
```

## MVMF Plugin: MVInfoKiosk.js

The plugin registers:

| Factory Type | ID             | Description                        |
|-------------|----------------|------------------------------------|
| Service     | InfoKiosk      | HTTP connection to the events API  |
| Model       | Session_Null   | Anonymous session (no auth)        |
| Model       | EventCalendar  | Observable list of events          |
| Model       | EventDetail    | Single event by ID                 |
| Source      | Session_Null   | Auto-ready session source          |
| Source      | EventCalendar  | Fetches event list via REST        |
| Source      | EventDetail    | Fetches single event via REST      |
| Package     | Standard       | Bundles all of the above           |

### Model Actions

**EventCalendar:**
- `Refresh` — Fetch latest events
- `AutoRefresh` — Set up periodic refresh (`{ nInterval: 60000 }`)

**EventDetail:**
- `Refresh` — Fetch single event

## Running

```bash
# 1. Start the API server
node server/server.js

# 2. Serve the frontend (from the site/ directory)
cd site && busybox httpd -f -p 8000 -h .
```

Then open http://localhost:8000

## Files

```
info-kiosk/
├── README.md
├── server/
│   ├── server.js          # Events API server (port 8001)
│   └── events.json        # Event data
└── site/
    ├── index.html          # Kiosk UI
    ├── css/
    │   └── kiosk.css       # Dark-theme kiosk styles
    └── js/
        ├── kiosk-app.js    # Application (connects MVMF → UI)
        ├── MVInfoKiosk.js  # MVMF Plugin
        └── vendor/mv/
            └── MVMF.js     # MVMF Core library
```

## License

Apache-2.0
