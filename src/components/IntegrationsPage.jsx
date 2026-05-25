import { useState, useEffect, useCallback } from 'react';
import {
  CATALOG, CATEGORIES,
  fetchIntegrationStatus, openOAuthPopup, disconnectService,
} from '../lib/integrations';
import './IntegrationsPage.css';

const SearchSVG = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const CheckSVG = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const PlugSVG = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>
);

const SERVER_BASE = (typeof window !== 'undefined' && window.location.protocol !== 'file:')
  ? '' : 'http://localhost:3001';

async function pingServer() {
  try {
    const r = await fetch(`${SERVER_BASE}/api/integrations/status`, {
      signal: AbortSignal.timeout(2500),
    });
    return r.status < 500;
  } catch { return false; }
}

export default function IntegrationsPage() {
  const [status, setStatus]       = useState({});
  const [serverUp, setServerUp]   = useState(null); // null=checking
  const [activeCat, setActiveCat] = useState('all');
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState({});
  const [error, setError]         = useState({});
  const [flash, setFlash]         = useState('');

  const refreshStatus = useCallback(async () => {
    const up = await pingServer();
    setServerUp(up);
    if (up) {
      const s = await fetchIntegrationStatus();
      setStatus(s);
    }
  }, []);

  useEffect(() => { refreshStatus(); }, [refreshStatus]);

  const handleConnect = useCallback(async (service, name) => {
    if (!serverUp) {
      setError(p => ({ ...p, [service]: 'Server not running — start it with: npm run server' }));
      return;
    }
    setError(p => ({ ...p, [service]: null }));
    setLoading(p => ({ ...p, [service]: true }));
    try {
      await openOAuthPopup(service);
      await refreshStatus();
      setFlash(`Connected: ${name}`);
      setTimeout(() => setFlash(''), 3000);
    } catch (err) {
      if (err.message !== 'OAuth timeout') {
        setError(p => ({ ...p, [service]: err.message }));
      }
    } finally {
      setLoading(p => ({ ...p, [service]: false }));
    }
  }, [refreshStatus, serverUp]);

  const handleDisconnect = useCallback(async (service) => {
    setLoading(p => ({ ...p, [service]: true }));
    try {
      await disconnectService(service);
      setStatus(prev => ({ ...prev, [service]: { ...prev[service], connected: false } }));
    } finally {
      setLoading(p => ({ ...p, [service]: false }));
    }
  }, []);

  const filtered = CATALOG.filter(item => {
    if (activeCat !== 'all' && item.cat !== activeCat) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
    }
    return true;
  });

  // Show connected cards first
  const sorted = [...filtered].sort((a, b) => {
    const ac = status[a.id]?.connected ? 0 : 1;
    const bc = status[b.id]?.connected ? 0 : 1;
    return ac - bc;
  });

  const connectedCount = CATALOG.filter(item => status[item.id]?.connected).length;

  return (
    <div className="ip">
      {/* Header */}
      <div className="ip__header">
        <div className="ip__header-left">
          <div className="ip__header-icon">{PlugSVG}</div>
          <div>
            <h1 className="ip__title">Integrations</h1>
            <p className="ip__subtitle">
              Connect your apps — the AI can enter, read, and act on them.
              {connectedCount > 0 && <span className="ip__connected-count"> {connectedCount} connected</span>}
            </p>
          </div>
        </div>

        <div className="ip__header-right">
          {serverUp === null && <span className="ip__server-checking">Checking server…</span>}
          {serverUp === false && (
            <div className="ip__server-banner ip__server-banner--warn">
              <span>⚠ Server offline</span>
              <code>npm run server</code>
            </div>
          )}
          {serverUp === true && (
            <div className="ip__server-banner ip__server-banner--ok">
              <span className="ip__badge-dot"/> Server running
            </div>
          )}
          <div className="ip__search-wrap">
            <span className="ip__search-icon">{SearchSVG}</span>
            <input
              className="ip__search"
              placeholder="Search integrations..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Flash / how-it-works */}
      {flash && <div className="ip__flash">{flash}</div>}

      {/* How it works */}
      <div className="ip__howto">
        <div className="ip__howto-step"><span className="ip__howto-num">1</span> Connect an app</div>
        <div className="ip__howto-arr">→</div>
        <div className="ip__howto-step"><span className="ip__howto-num">2</span> Ask the AI to use it</div>
        <div className="ip__howto-arr">→</div>
        <div className="ip__howto-step"><span className="ip__howto-num">3</span> Watch the workflow run live</div>
      </div>

      {/* Category tabs */}
      <div className="ip__tabs">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`ip__tab${activeCat === cat.id ? ' ip__tab--active' : ''}`}
            onClick={() => setActiveCat(cat.id)}
          >
            {cat.label}
            {cat.id !== 'all' && (
              <span className="ip__tab-count">
                {CATALOG.filter(i => i.cat === cat.id).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="ip__grid">
        {sorted.map(item => {
          const s           = status[item.id] || {};
          const connected   = !!s.connected;
          // configured=false means server explicitly said credentials missing; undefined means server is offline
          const configured  = s.configured !== false;
          const busy        = !!loading[item.id];
          const errMsg      = error[item.id];

          return (
            <div
              key={item.id}
              className={`ip__card${connected ? ' ip__card--connected' : ''}`}
            >
              <div className="ip__card-head">
                <div className="ip__card-icon">{item.icon}</div>
                <div className="ip__card-info">
                  <div className="ip__card-name">{item.name}</div>
                  <div className="ip__card-desc">{item.desc}</div>
                </div>
                {connected && (
                  <div className="ip__badge">
                    <span className="ip__badge-dot"/>{CheckSVG} Connected
                  </div>
                )}
              </div>

              <ul className="ip__tools">
                {item.tools.map(t => (
                  <li key={t} className="ip__tool">
                    <span className="ip__tool-dot"/>
                    {t}
                  </li>
                ))}
              </ul>

              {errMsg && <p className="ip__error">{errMsg}</p>}

              <div className="ip__card-foot">
                {connected ? (
                  <button
                    className="ip__btn ip__btn--disconnect"
                    onClick={() => handleDisconnect(item.id)}
                    disabled={busy}
                  >
                    {busy ? 'Disconnecting...' : 'Disconnect'}
                  </button>
                ) : !configured ? (
                  <span
                    className="ip__btn ip__btn--unconfigured"
                    title={`Add ${item.id.toUpperCase()}_CLIENT_ID and ${item.id.toUpperCase()}_CLIENT_SECRET to .env`}
                  >
                    ⚙ Add credentials to .env
                  </span>
                ) : (
                  <button
                    className="ip__btn ip__btn--connect"
                    onClick={() => handleConnect(item.id, item.name)}
                    disabled={busy}
                  >
                    {busy ? (
                      <><span className="ip__spin"/>Connecting…</>
                    ) : 'Connect'}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {sorted.length === 0 && (
          <div className="ip__empty">No integrations match "{search}"</div>
        )}
      </div>

      {/* Credentials guide */}
      <div className="ip__guide">
        <h3 className="ip__guide-title">Setup guide — add credentials to <code>.env</code></h3>
        <p className="ip__guide-desc">Create a <code>.env</code> file in the project root (copy from <code>.env.example</code>), then run <code>npm run server</code>.</p>
        <div className="ip__guide-rows">
          {[
            { svc:'GitHub',    vars:'GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET' },
            { svc:'Notion',    vars:'NOTION_CLIENT_ID + NOTION_CLIENT_SECRET' },
            { svc:'Slack',     vars:'SLACK_CLIENT_ID + SLACK_CLIENT_SECRET' },
            { svc:'Spotify',   vars:'SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET' },
            { svc:'Google',    vars:'GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET' },
            { svc:'Linear',    vars:'LINEAR_CLIENT_ID + LINEAR_CLIENT_SECRET' },
          ].map(r => (
            <div key={r.svc} className="ip__guide-row">
              <span className="ip__guide-svc">{r.svc}</span>
              <code className="ip__guide-var">{r.vars}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
