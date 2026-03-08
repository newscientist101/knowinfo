/*
** Info Kiosk — Events API Server
**
** Serves event calendar data as JSON.
** Endpoints:
**   GET  /api/events           — All events
**   GET  /api/events/:id       — Single event by ID
**   GET  /api/events?category= — Filter by category
**
** CORS enabled for cross-origin MVMF plugin access.
*/

const http = require('http');
const fs   = require('fs');
const path = require('path');
const url  = require('url');

const PORT         = parseInt(process.env.PORT || '8001', 10);
const EVENTS_FILE  = path.join(__dirname, 'events.json');

function loadEvents() {
    try {
        return JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
    } catch (e) {
        console.error('Failed to load events:', e.message);
        return [];
    }
}

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
    cors(res);
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
    const parsed   = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // CORS preflight
    if (req.method === 'OPTIONS') {
        cors(res);
        res.writeHead(204);
        res.end();
        return;
    }

    // GET /api/events
    if (req.method === 'GET' && pathname === '/api/events') {
        let events = loadEvents();
        const cat = parsed.query.category;
        if (cat) {
            events = events.filter(e => e.category === cat);
        }
        return json(res, 200, { events, count: events.length, timestamp: Date.now() });
    }

    // GET /api/events/:id
    const match = pathname.match(/^\/api\/events\/(\d+)$/);
    if (req.method === 'GET' && match) {
        const id    = parseInt(match[1], 10);
        const event = loadEvents().find(e => e.id === id);
        if (event) {
            return json(res, 200, { event, timestamp: Date.now() });
        }
        return json(res, 404, { error: 'Event not found' });
    }

    // 404
    json(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
    console.log(`Info Kiosk API listening on http://localhost:${PORT}`);
});
