/*
** MVInfoKiosk — MVMF Plugin for Info Kiosk Event Calendar
*/

MV.InfoKiosk = MV.Library(
    'InfoKiosk',
    'Copyright 2025. Apache-2.0 License.',
    'Info Kiosk Events Plugin',
    '1.0.0'
);

// ── ACTION helpers ───────────────────────────────────────────────


// Unique object index counter (must be > 0 for OBJECTBANK.Insert)
MV.InfoKiosk._twNextObjectIx = 1;
MV.InfoKiosk.ACTION = class extends MV.MVMF.CLIENT.ACTION
{
    constructor(sAction, pDefaults)
    {
        super();
        this.sAction   = sAction;
        this.pDefaults = pDefaults || {};
    }
};

MV.InfoKiosk.IACTION = class
{
    constructor(pSource, pAction)
    {
        this.pSource   = pSource;
        this.sAction   = pAction.sAction;
        this.pRequest  = Object.assign({}, pAction.pDefaults);
        this.pResponse = null;
    }

    Send(pThis, fnResponse, pParam)
    {
        this.pThis      = pThis;
        this.fnResponse = fnResponse;
        this.pParam     = pParam;

        const fnName = 'Action_' + this.sAction;
        if (typeof this.pSource[fnName] === 'function') {
            this.pSource[fnName](this);
            return true;
        }
        return false;
    }
};


// ═══════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Service.InfoKiosk = {};

MV.InfoKiosk.Service.InfoKiosk.SERVICE = class extends MV.MVMF.SERVICE
{
    #pNetSettings;

    constructor(pReference, pNamespace)
    {
        super(pReference, pNamespace);
        this.#pNetSettings = {
            bSecure : pReference.bSecure,
            sHost   : pReference.sHost,
            wPort   : pReference.wPort,
            sSession: 'Null'
        };
    }

    get pNetSettings() { return this.#pNetSettings; }

    get sBaseUrl()
    {
        const proto = this.#pNetSettings.bSecure ? 'https' : 'http';
        return `${proto}://${this.#pNetSettings.sHost}:${this.#pNetSettings.wPort}`;
    }

    Client_Open(twClientIx)
    {
        return super.Client_Open(
            MV.InfoKiosk.Service.InfoKiosk.CLIENT.Reference(twClientIx)
        );
    }

    Client_Close(pClient) { return super.Client_Close(pClient); }
};

MV.InfoKiosk.Service.InfoKiosk.SERVICE.factory = function()
{
    return new class extends MV.MVMF.SERVICE.FACTORY
    {
        constructor() { super('InfoKiosk'); }
        Reference(sConnect)
        {
            return new MV.InfoKiosk.Service.InfoKiosk.IREFERENCE(this.sID, sConnect);
        }
    }();
};

MV.InfoKiosk.Service.InfoKiosk.IREFERENCE = class extends MV.MVMF.SERVICE.IREFERENCE
{
    constructor(sID, sConnect) { super(sID, sConnect); }
    Key()       { return this.sHost + ':' + this.wPort; }
    Create(pNS) { return new MV.InfoKiosk.Service.InfoKiosk.SERVICE(this, pNS); }
};


// ═══════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Service.InfoKiosk.CLIENT = class extends MV.MVMF.CLIENT
{
    static sID = 'InfoKiosk';
    static eSTATE = { LOGGEDOUT: 0, LOGGEDIN: 1 };

    sID    = MV.InfoKiosk.Service.InfoKiosk.CLIENT.sID;
    eSTATE = MV.InfoKiosk.Service.InfoKiosk.CLIENT.eSTATE;

    _pCurrentSource = null;

    constructor(pReference, pService)
    {
        super(pReference, pService);
        setTimeout(() => this.ReadyState(this.eSTATE.LOGGEDIN), 0);
    }

    static Reference(twClientIx)
    {
        return new MV.InfoKiosk.Service.InfoKiosk.CLIENT.IREFERENCE(twClientIx);
    }

    IsConnected()    { return true;  }
    IsDisconnected() { return false; }
    IsLoggedOut()    { return this.ReadyState() === this.eSTATE.LOGGEDOUT; }
    IsLoggedIn()     { return this.ReadyState() === this.eSTATE.LOGGEDIN;  }
    SafeKill()       { return true;  }
    Login(p)         { this.ReadyState(this.eSTATE.LOGGEDIN);  return true; }
    Logout(p)        { this.ReadyState(this.eSTATE.LOGGEDOUT); return true; }

    Request(pAction)
    {
        return new MV.InfoKiosk.IACTION(this._pCurrentSource, pAction);
    }

    async apiFetch(sPath)
    {
        const sUrl = this.pService.sBaseUrl + sPath;
        try {
            const resp = await fetch(sUrl);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            return await resp.json();
        } catch(e) {
            console.error('InfoKiosk fetch error:', sUrl, e);
            return null;
        }
    }
};

MV.InfoKiosk.Service.InfoKiosk.CLIENT.IREFERENCE = class extends MV.MVMF.SHAREDOBJECT.IREFERENCE
{
    constructor(twClientIx)
    {
        super(MV.InfoKiosk.Service.InfoKiosk.CLIENT.sID);
        this.twClientIx = twClientIx || 1;
    }
    Key()      { return '' + this.twClientIx; }
    Create(pS) { return new MV.InfoKiosk.Service.InfoKiosk.CLIENT(this, pS); }
};


// ═══════════════════════════════════════════════════════════════
// SESSION MODEL + SOURCE (null/anonymous)
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Model.Session_Null = {};

MV.InfoKiosk.Model.Session_Null.MODEL = class extends MV.MVMF.MEM.MODEL
{
    constructor(pR, pS) { super(pR, pS); }
    IsLoggedOut() { return false; }
    IsLoggedIn()  { return true;  }
    Login(s)      { return true;  }
    Logout()      { return true;  }
};

MV.InfoKiosk.Model.Session_Null.MODEL.factory = function()
{
    return new class extends MV.MVMF.MEM.MODEL.FACTORY
    {
        constructor() { super('Session_Null'); }
        Reference(asArgs)
        {
            return new MV.InfoKiosk.Model.Session_Null.IREFERENCE(this.sID, asArgs);
        }
    }();
};

MV.InfoKiosk.Model.Session_Null.IREFERENCE = class extends MV.MVMF.MEM.MODEL.IREFERENCE
{
    constructor(sID, asArgs) { super(sID, 1, 0); }
    Key()      { return '0'; }
    Create(pS) { return new MV.InfoKiosk.Model.Session_Null.MODEL(this, pS); }
};

MV.InfoKiosk.Source.Session_Null = {};

MV.InfoKiosk.Source.Session_Null.SOURCE = class extends MV.MVMF.MEM.SOURCE
{
    constructor(pR, pC) { super(pR, pC, new MV.MVMF.MEM.SOURCE.OBJECTHEAD(0, 0, 0, 0, 0)); }

    Attach()
    {
        super.Attach();
        setTimeout(() => { if (this.pModel) this.pModel.ReadyState(1); }, 0);
        return true;
    }

    Detach()          { return super.Detach(); }
    IsConnected()     { return true;  }
    IsDisconnected()  { return false; }
    IsLoggedOut()     { return false; }
    IsLoggedIn()      { return true;  }
    Login(p)          { return true;  }
    Logout(p)         { return true;  }
};

MV.InfoKiosk.Source.Session_Null.SOURCE.factory = function()
{
    return new class extends MV.MVMF.SOURCE_SESSION.FACTORY
    {
        constructor() { super('InfoKiosk', 'Session_Null', 0, {}); }
        Create(pC)    { return new MV.InfoKiosk.Source.Session_Null.SOURCE(this.pReference, pC); }
    }();
};


// ═══════════════════════════════════════════════════════════════
// MODEL — EventCalendar
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Model.EventCalendar = {};

MV.InfoKiosk.Model.EventCalendar.MODEL = class extends MV.MVMF.MEM.MODEL
{
    constructor(pReference, pSource)
    {
        super(pReference, pSource);
        this.aEvents   = [];
        this.nCount    = 0;
        this.nTimestamp = 0;
        this.sCategory = pReference.sCategory || '';
        this.bLoading  = false;
        this.sError    = '';
    }
};

MV.InfoKiosk.Model.EventCalendar.MODEL.factory = function()
{
    return new class extends MV.MVMF.MEM.MODEL.FACTORY
    {
        constructor() { super('EventCalendar'); }
        Reference(asArgs)
        {
            return new MV.InfoKiosk.Model.EventCalendar.IREFERENCE(this.sID, asArgs);
        }
    }();
};

MV.InfoKiosk.Model.EventCalendar.IREFERENCE = class extends MV.MVMF.MEM.MODEL.IREFERENCE
{
    constructor(sID, asArgs)
    {
        super(sID, MV.InfoKiosk._twNextObjectIx++, 0);
        this.sCategory = '';
        if (asArgs) {
            for (let i = 0; i < asArgs.length; i++) {
                const p = asArgs[i].split('=');
                if (p[0] === 'category') this.sCategory = p[1] || '';
            }
        }
    }
    Key()      { return 'calendar:' + (this.sCategory || 'all'); }
    Create(pS) { return new MV.InfoKiosk.Model.EventCalendar.MODEL(this, pS); }
};


// ═══════════════════════════════════════════════════════════════
// SOURCE — EventCalendar
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Source.EventCalendar = {};

MV.InfoKiosk.Source.EventCalendar.SOURCE = class extends MV.MVMF.MEM.SOURCE
{
    #nRefreshTimer = null;

    constructor(pR, pC)
    {
        super(pR, pC, new MV.MVMF.MEM.SOURCE.OBJECTHEAD(0, 0, 0, 0, 0));
    }

    // Override Request to inject source ref into client
    Request(sAction)
    {
        this.pClient._pCurrentSource = this;
        return super.Request(sAction);
    }

    Attach()
    {
        super.Attach();
        this.#doRefresh();
        return true;
    }

    Detach()
    {
        if (this.#nRefreshTimer) { clearInterval(this.#nRefreshTimer); this.#nRefreshTimer = null; }
        return super.Detach();
    }

    async #doRefresh()
    {
        if (!this.pModel || !this.pClient) return;

        this.pModel.bLoading = true;
        this.pModel.sError   = '';

        let sPath = '/api/events';
        if (this.pModel.sCategory)
            sPath += '?category=' + encodeURIComponent(this.pModel.sCategory);

        const data = await this.pClient.apiFetch(sPath);

        this.pModel.bLoading = false;
        if (data && data.events) {
            this.pModel.aEvents   = data.events;
            this.pModel.nCount    = data.count;
            this.pModel.nTimestamp = data.timestamp;
        } else {
            this.pModel.sError = 'Failed to fetch events';
        }
        this.pModel.Emit('onChanged', { pEmitter: this.pModel, pData: this.pModel });
    }

    Action_Refresh(pIAction)
    {
        this.#doRefresh().then(() => {
            if (pIAction && pIAction.fnResponse)
                pIAction.fnResponse.call(pIAction.pThis,
                    { pResponse: { nResult: 0 } }, pIAction.pParam);
        });
        return true;
    }

    Action_AutoRefresh(pIAction)
    {
        const ms = (pIAction.pRequest && pIAction.pRequest.nInterval) || 60000;
        if (this.#nRefreshTimer) clearInterval(this.#nRefreshTimer);
        this.#nRefreshTimer = setInterval(() => this.#doRefresh(), ms);
        if (pIAction && pIAction.fnResponse)
            pIAction.fnResponse.call(pIAction.pThis,
                { pResponse: { nResult: 0 } }, pIAction.pParam);
        return true;
    }
};

MV.InfoKiosk.Source.EventCalendar.SOURCE.factory = function()
{
    return new class extends MV.MVMF.MEM.SOURCE.FACTORY
    {
        constructor()
        {
            super('InfoKiosk', 'EventCalendar', 1, {
                'Refresh'     : new MV.InfoKiosk.ACTION('Refresh'),
                'AutoRefresh' : new MV.InfoKiosk.ACTION('AutoRefresh', { nInterval: 60000 })
            }, true);  // bIndependent=true
        }
        Create(pC) { return new MV.InfoKiosk.Source.EventCalendar.SOURCE(this.pReference, pC); }
    }();
};


// ═══════════════════════════════════════════════════════════════
// MODEL — EventDetail
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Model.EventDetail = {};

MV.InfoKiosk.Model.EventDetail.MODEL = class extends MV.MVMF.MEM.MODEL
{
    constructor(pR, pS)
    {
        super(pR, pS);
        this.pEvent   = null;
        this.nEventId = pR.nEventId || 0;
        this.bLoading = false;
        this.sError   = '';
    }
};

MV.InfoKiosk.Model.EventDetail.MODEL.factory = function()
{
    return new class extends MV.MVMF.MEM.MODEL.FACTORY
    {
        constructor() { super('EventDetail'); }
        Reference(asArgs)
        {
            return new MV.InfoKiosk.Model.EventDetail.IREFERENCE(this.sID, asArgs);
        }
    }();
};

MV.InfoKiosk.Model.EventDetail.IREFERENCE = class extends MV.MVMF.MEM.MODEL.IREFERENCE
{
    constructor(sID, asArgs)
    {
        super(sID, MV.InfoKiosk._twNextObjectIx++, 0);
        this.nEventId = 0;
        if (asArgs) {
            for (let i = 0; i < asArgs.length; i++) {
                const p = asArgs[i].split('=');
                if (p[0] === 'id') this.nEventId = parseInt(p[1], 10) || 0;
            }
        }
    }
    Key()      { return 'event:' + this.nEventId; }
    Create(pS) { return new MV.InfoKiosk.Model.EventDetail.MODEL(this, pS); }
};


// ═══════════════════════════════════════════════════════════════
// SOURCE — EventDetail
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Source.EventDetail = {};

MV.InfoKiosk.Source.EventDetail.SOURCE = class extends MV.MVMF.MEM.SOURCE
{
    constructor(pR, pC) { super(pR, pC, new MV.MVMF.MEM.SOURCE.OBJECTHEAD(0, 0, 0, 0, 0)); }

    Request(sAction)
    {
        this.pClient._pCurrentSource = this;
        return super.Request(sAction);
    }

    Attach()
    {
        super.Attach();
        if (this.pModel && this.pModel.nEventId) this.#doFetch();
        return true;
    }

    Detach() { return super.Detach(); }

    async #doFetch()
    {
        if (!this.pModel || !this.pClient) return;
        this.pModel.bLoading = true;
        this.pModel.sError   = '';

        const data = await this.pClient.apiFetch('/api/events/' + this.pModel.nEventId);

        this.pModel.bLoading = false;
        if (data && data.event) {
            this.pModel.pEvent = data.event;
        } else {
            this.pModel.sError = 'Event not found';
        }
        this.pModel.Emit('onChanged', { pEmitter: this.pModel, pData: this.pModel });
    }

    Action_Refresh(pIAction)
    {
        this.#doFetch().then(() => {
            if (pIAction && pIAction.fnResponse)
                pIAction.fnResponse.call(pIAction.pThis,
                    { pResponse: { nResult: 0 } }, pIAction.pParam);
        });
        return true;
    }
};

MV.InfoKiosk.Source.EventDetail.SOURCE.factory = function()
{
    return new class extends MV.MVMF.MEM.SOURCE.FACTORY
    {
        constructor()
        {
            super('InfoKiosk', 'EventDetail', 2, {
                'Refresh': new MV.InfoKiosk.ACTION('Refresh')
            }, true);
        }
        Create(pC) { return new MV.InfoKiosk.Source.EventDetail.SOURCE(this.pReference, pC); }
    }();
};


// ═══════════════════════════════════════════════════════════════
// PACKAGE
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Package.Standard = class extends MV.MVMF.PLUGIN.PACKAGE
{
    static factory()
    {
        return new this.FACTORY('InfoKiosk', 'Standard', {
            aService : ['InfoKiosk/InfoKiosk'],
            aModel   : ['InfoKiosk/Session_Null', 'InfoKiosk/EventCalendar', 'InfoKiosk/EventDetail'],
            aSource  : ['InfoKiosk/InfoKiosk:Session_Null', 'InfoKiosk/InfoKiosk:EventCalendar', 'InfoKiosk/InfoKiosk:EventDetail']
        });
    }
};

MV.InfoKiosk.Package.Standard.FACTORY = class extends MV.MVMF.PLUGIN.PACKAGE.FACTORY
{
    Reference(sNamespace) { return new MV.InfoKiosk.Package.Standard.IREFERENCE(this.sID, sNamespace, this.pConfig); }
};

MV.InfoKiosk.Package.Standard.IREFERENCE = class extends MV.MVMF.PLUGIN.PACKAGE.IREFERENCE
{
    Create(pParam) { return new MV.InfoKiosk.Package.Standard(this, pParam); }
};


// ═══════════════════════════════════════════════════════════════
// INSTALL / UNSTALL
// ═══════════════════════════════════════════════════════════════

MV.InfoKiosk.Install = function(pCore, pPlugin)
{
    this.apFactory_Service = [ MV.InfoKiosk.Service.InfoKiosk.SERVICE.factory() ];

    this.apFactory_Model = [
        MV.InfoKiosk.Model.Session_Null.MODEL.factory(),
        MV.InfoKiosk.Model.EventCalendar.MODEL.factory(),
        MV.InfoKiosk.Model.EventDetail.MODEL.factory()
    ];

    this.apFactory_Source = [
        MV.InfoKiosk.Source.Session_Null.SOURCE.factory(),
        MV.InfoKiosk.Source.EventCalendar.SOURCE.factory(),
        MV.InfoKiosk.Source.EventDetail.SOURCE.factory()
    ];

    this.apFactory_Package = [ MV.InfoKiosk.Package.Standard.factory() ];

    pPlugin.Factory_Services (this.apFactory_Service);
    pPlugin.Factory_Models   (this.apFactory_Model);
    pPlugin.Factory_Sources  (this.apFactory_Source);
    pPlugin.Factory_Packages (this.apFactory_Package);

    return true;
};

MV.InfoKiosk.Unstall = function(pCore, pPlugin)
{
    let n;
    for (n = 0; n < this.apFactory_Source.length; n++)
        this.apFactory_Source[n] = this.apFactory_Source[n].destructor();
    for (n = 0; n < this.apFactory_Model.length; n++)
        this.apFactory_Model[n] = this.apFactory_Model[n].destructor();
    for (n = 0; n < this.apFactory_Service.length; n++)
        this.apFactory_Service[n] = this.apFactory_Service[n].destructor();
    for (n = 0; n < this.apFactory_Package.length; n++)
        this.apFactory_Package[n] = this.apFactory_Package[n].destructor();
};
