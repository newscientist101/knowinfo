/*
** kiosk-app.js — Info Kiosk Application
**
** Connects to the events API via MVMF InfoKiosk plugin,
** observes the EventCalendar model, and renders event cards.
*/

class KioskApp extends MV.MVMF.NOTIFICATION
{
    constructor()
    {
        super();

        this.pLnG       = null;
        this.pRequire   = null;
        this.pCalendar  = null;
        this.sCategory  = '';
        this.sApiServer = '';

        this.elContent   = document.getElementById('content');
        this.elStatusDot = document.getElementById('statusDot');
        this.elStatusTxt = document.getElementById('statusText');
        this.elFilters   = document.getElementById('filters');

        this.#bindFilters();
        this.#detectServer();
        this.#connect();
    }

    #detectServer()
    {
        const host = window.location.hostname || 'localhost';
        this.sApiServer = host + ':8001';
    }

    #connect()
    {
        this.#setStatus('connecting', 'Connecting...');

        this.pRequire = MV.MVMF.Core.Require('InfoKiosk', 'InfoKiosk', 'kiosk');

        if (!this.pRequire) {
            this.#setStatus('disconnected', 'Plugin load failed');
            this.#showError('Failed to load InfoKiosk plugin.');
            return;
        }

        this.pLnG = MV.MVMF.Core.LnG_Open(
            'kiosk', 'InfoKiosk',
            'server=' + this.sApiServer, ''
        );

        if (!this.pLnG) {
            this.#setStatus('disconnected', 'Connection failed');
            this.#showError('Failed to open LnG connection to ' + this.sApiServer);
            return;
        }

        this.pLnG.Attach(this, false, false);
    }

    // ── MVMF Observer Callbacks ───────────────────────────────

    onReadyState(pNotify)
    {
        const state = this.pLnG.ReadyState();
        if (state >= 2) {
            this.#setStatus('connected', 'Connected');
            this.#openCalendar();
        } else if (state === 1) {
            this.#setStatus('connecting', 'Connecting...');
        } else {
            this.#setStatus('disconnected', 'Disconnected');
        }
    }

    onChanged(pNotice)
    {
        if (pNotice.pEmitter === this.pCalendar)
        {
            if (this.pCalendar.bLoading) {
                this.#showLoading();
            } else if (this.pCalendar.sError) {
                this.#showError(this.pCalendar.sError);
            } else {
                this.#renderEvents(this.pCalendar.aEvents);
            }
        }
    }

    #openCalendar()
    {
        if (this.pCalendar) {
            this.pCalendar.Detach(this);
            this.pLnG.Model_Close(this.pCalendar);
            this.pCalendar = null;
        }

        const sArgs = this.sCategory ? 'category=' + this.sCategory : '';
        this.pCalendar = this.pLnG.Model_Open('EventCalendar', sArgs);

        if (this.pCalendar) {
            this.pCalendar.Attach(this, false, false);
        } else {
            this.#showError('Failed to open EventCalendar model.');
        }
    }

    // ── Rendering ─────────────────────────────────────────────

    #renderEvents(aEvents)
    {
        if (!aEvents || aEvents.length === 0) {
            this.elContent.innerHTML =
                '<div class="kiosk-empty">No events found for this category.</div>';
            return;
        }

        let html = '<div class="kiosk-events">';

        for (const evt of aEvents) {
            const dateStr  = this.#formatDate(evt.date);
            const timeStr  = this.#formatTimeRange(evt.date, evt.endDate);
            const badge    = 'badge-' + (evt.category || 'workshop');
            const linkHtml = evt.url
                ? `<a class="event-link" href="${this.#esc(evt.url)}" target="_blank" rel="noopener">Learn more →</a>`
                : '';

            html += `
                <div class="event-card">
                    <span class="category-badge ${badge}">${this.#esc(evt.category)}</span>
                    <h3>${this.#esc(evt.title)}</h3>
                    <div class="event-meta">
                        <span class="date">${dateStr} &bull; ${timeStr}</span>
                        <span class="location">${this.#esc(evt.location)}</span>
                    </div>
                    <div class="description">${this.#esc(evt.description)}</div>
                    ${linkHtml}
                </div>
            `;
        }

        html += '</div>';
        this.elContent.innerHTML = html;
    }

    #showLoading()
    {
        this.elContent.innerHTML = `
            <div class="kiosk-loading">
                <div class="spinner"></div>
                <div>Loading events...</div>
            </div>`;
    }

    #showError(msg)
    {
        this.elContent.innerHTML =
            `<div class="kiosk-error">⚠️ ${this.#esc(msg)}</div>`;
    }

    #setStatus(state, text)
    {
        this.elStatusDot.className = 'dot ' + state;
        this.elStatusTxt.textContent = text;
    }

    #bindFilters()
    {
        this.elFilters.addEventListener('click', (e) => {
            const btn = e.target.closest('button');
            if (!btn) return;

            this.elFilters.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            this.sCategory = btn.dataset.category || '';

            if (this.pLnG && this.pLnG.IsReady()) {
                this.#openCalendar();
            }
        });
    }

    #formatDate(sDate)
    {
        const d = new Date(sDate);
        return d.toLocaleDateString('en-US', {
            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
        });
    }

    #formatTimeRange(sStart, sEnd)
    {
        const opts = { hour: 'numeric', minute: '2-digit' };
        const s = new Date(sStart).toLocaleTimeString('en-US', opts);
        const e = sEnd ? new Date(sEnd).toLocaleTimeString('en-US', opts) : '';
        return e ? `${s} – ${e}` : s;
    }

    #esc(s)
    {
        if (!s) return '';
        const el = document.createElement('span');
        el.textContent = s;
        return el.innerHTML;
    }

    async destroy()
    {
        if (this.pCalendar) {
            this.pCalendar.Detach(this);
            this.pLnG.Model_Close(this.pCalendar);
            this.pCalendar = null;
        }
        if (this.pLnG) {
            this.pLnG.Detach(this);
            await this.pLnG.destructor();
            this.pLnG = null;
        }
        if (this.pRequire) {
            this.pRequire = MV.MVMF.Core.Release(this.pRequire);
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.kioskApp = new KioskApp();
});
