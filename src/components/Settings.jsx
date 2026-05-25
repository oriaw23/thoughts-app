import { useState } from 'react';
import { getApiKey, setApiKey } from '../ai';
import { THEMES, THEME_VIEWS, getViewThemes, setViewTheme, getColorMode, setColorMode } from '../themes';
import { getClientId, setClientId, isGoogleConnected, connectGoogle, disconnectGoogle } from '../lib/googleApi';
import { CATALOG } from '../lib/integrations';
import './Settings.css';

export default function Settings({ onClose, onThemeChange, onNavigate }) {
  const [tab,       setTab]       = useState('appearance');
  const [key,       setKey]       = useState(getApiKey());
  const [saved,     setSaved]     = useState(false);
  const [colorMode, setMode]      = useState(getColorMode);
  const [viewThemes, setLocalThemes] = useState(getViewThemes);
  const [googleClientId, setGoogleClientId] = useState(getClientId);
  const [googleConnected, setGoogleConnected] = useState(isGoogleConnected);
  const [googleWorking, setGoogleWorking]     = useState(false);
  const [googleError, setGoogleError]         = useState('');

  const handleSave = () => {
    setApiKey(key.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleThemePick = (viewId, themeId) => {
    setViewTheme(viewId, themeId);
    setLocalThemes(getViewThemes());
    onThemeChange?.();
  };

  const handleColorMode = (mode) => {
    setColorMode(mode);
    setMode(mode);
    onThemeChange?.();
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>

        <div className="settings-modal__header">
          <h2>Settings</h2>
          <button className="settings-modal__close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Tab bar */}
        <div className="settings-tabs">
          <button className={`settings-tab${tab==='appearance'?' active':''}`}    onClick={() => setTab('appearance')}>🌗 Appearance</button>
          <button className={`settings-tab${tab==='general'?' active':''}`}       onClick={() => setTab('general')}>⚙️ General</button>
          <button className={`settings-tab${tab==='themes'?' active':''}`}        onClick={() => setTab('themes')}>🎨 Themes</button>
          <button className={`settings-tab${tab==='integrations'?' active':''}`}  onClick={() => setTab('integrations')}>🔗 Integrations</button>
        </div>

        {/* ── Appearance tab ── */}
        {tab === 'appearance' && (
          <div className="settings-modal__body">
            <div className="settings-section">
              <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>מצב צבעים</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 16 }}>בחר אם האפליקציה תוצג בתצוגה בהירה או כהה.</p>
              <div className="settings-mode-grid">
                <button
                  className={`settings-mode-card${colorMode === 'light' ? ' active' : ''}`}
                  onClick={() => handleColorMode('light')}
                >
                  <div className="settings-mode-preview settings-mode-preview--light">
                    <div className="smp__bar" />
                    <div className="smp__lines">
                      <div className="smp__line" style={{ width: '70%' }} />
                      <div className="smp__line" style={{ width: '50%' }} />
                      <div className="smp__line" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div className="settings-mode-label">
                    <span className="settings-mode-check">{colorMode === 'light' ? '✓' : ''}</span>
                    בהיר
                  </div>
                </button>

                <button
                  className={`settings-mode-card${colorMode === 'dark' ? ' active' : ''}`}
                  onClick={() => handleColorMode('dark')}
                >
                  <div className="settings-mode-preview settings-mode-preview--dark">
                    <div className="smp__bar" />
                    <div className="smp__lines">
                      <div className="smp__line" style={{ width: '70%' }} />
                      <div className="smp__line" style={{ width: '50%' }} />
                      <div className="smp__line" style={{ width: '85%' }} />
                    </div>
                  </div>
                  <div className="settings-mode-label">
                    <span className="settings-mode-check">{colorMode === 'dark' ? '✓' : ''}</span>
                    כהה
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── General tab ── */}
        {tab === 'general' && (
          <div className="settings-modal__body">
            <div className="settings-section">
              <div className="settings-section__header">
                <div className="settings-section__icon">🤖</div>
                <div>
                  <h3>AI Provider</h3>
                  <p>Choose your AI provider. Both are free — switch when one hits the daily limit.</p>
                </div>
              </div>
              <div className="settings-field">
                <label>AI Provider</label>
                <div className="settings-field__input-wrap">
                  <select
                    defaultValue={localStorage.getItem('ai_provider')||'groq'}
                    onChange={e => localStorage.setItem('ai_provider', e.target.value)}
                    style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:13,fontFamily:'inherit',color:'var(--text)',padding:'10px 14px',cursor:'pointer'}}>
                    <option value="groq">Groq — console.groq.com (100K/day)</option>
                    <option value="openrouter">OpenRouter — openrouter.ai (חינם לגמרי)</option>
                    <option value="sambanova">SambaNova — cloud.sambanova.ai (חינם, מהיר)</option>
                    <option value="cerebras">Cerebras — cloud.cerebras.ai (חינם, מהיר)</option>
                  </select>
                </div>
                <p className="settings-field__hint">כשאחד נגמר — פשוט החלף ל-provider אחר.</p>
              </div>
              <div className="settings-field">
                <label>Groq API Key</label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="gsk_..."
                    defaultValue={localStorage.getItem('groq_api_key')||''}
                    onChange={e => localStorage.setItem('groq_api_key', e.target.value.trim())} />
                </div>
                <p className="settings-field__hint">
                  Free at&nbsp;<a href="https://console.groq.com" target="_blank" rel="noreferrer">console.groq.com</a> → API Keys → Create key. Saved only on your device.
                </p>
              </div>
              <div className="settings-field" style={{marginTop:8}}>
                <label>OpenRouter API Key <span style={{fontWeight:400,color:'var(--text-3)'}}>(הכי מומלץ)</span></label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="sk-or-..."
                    defaultValue={localStorage.getItem('openrouter_api_key')||''}
                    onChange={e => localStorage.setItem('openrouter_api_key', e.target.value.trim())} />
                </div>
                <p className="settings-field__hint">
                  חינם לגמרי ב-<a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">openrouter.ai/keys</a> — עשרות מודלים חינמיים ללא הגבלה.
                </p>
              </div>
              <div className="settings-field" style={{marginTop:8}}>
                <label>SambaNova API Key</label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="..."
                    defaultValue={localStorage.getItem('samba_api_key')||''}
                    onChange={e => localStorage.setItem('samba_api_key', e.target.value.trim())} />
                </div>
                <p className="settings-field__hint">
                  חינם ב-<a href="https://cloud.sambanova.ai" target="_blank" rel="noreferrer">cloud.sambanova.ai</a> — מהיר כמו Groq.
                </p>
              </div>
              <div className="settings-field" style={{marginTop:8}}>
                <label>Cerebras API Key</label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="csk-..."
                    defaultValue={localStorage.getItem('cerebras_api_key')||''}
                    onChange={e => localStorage.setItem('cerebras_api_key', e.target.value.trim())} />
                </div>
                <p className="settings-field__hint">
                  חינם ב-<a href="https://cloud.cerebras.ai" target="_blank" rel="noreferrer">cloud.cerebras.ai</a>.
                </p>
              </div>
              <div className="settings-field" style={{marginTop:8}}>
                <label>Groq Model</label>
                <div className="settings-field__input-wrap">
                  <select
                    defaultValue={localStorage.getItem('groq_model')||'llama-3.3-70b-versatile'}
                    onChange={e => localStorage.setItem('groq_model', e.target.value)}
                    style={{flex:1,border:'none',outline:'none',background:'transparent',fontSize:13,fontFamily:'inherit',color:'var(--text)',padding:'10px 14px',cursor:'pointer'}}>
                    <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (מומלץ)</option>
                    <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (מהיר, מגבלה נפרדת)</option>
                    <option value="gemma2-9b-it">gemma2-9b-it (Google, מגבלה נפרדת)</option>
                    <option value="llama-3.2-11b-text-preview">llama-3.2-11b-text-preview (מגבלה נפרדת)</option>
                  </select>
                </div>
                <p className="settings-field__hint">כל מודל עם מגבלה נפרדת של 100K טוקנים/יום. אם אחד נגמר — עבור לאחר.</p>
              </div>
              <div className="settings-field" style={{marginTop:8}}>
                <label>Claude API Key</label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="sk-ant-api03-..."
                    value={key} onChange={e => setKey(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleSave()} />
                  {key && <span className="settings-field__status">{key.startsWith('sk-ant')?'✓':'⚠️'}</span>}
                </div>
                <p className="settings-field__hint">
                  For other AI features. Get at&nbsp;
                  <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">console.anthropic.com</a>
                </p>
              </div>
            </div>
            <div className="settings-section settings-section--info">
              <h3>🔒 Privacy</h3>
              <p>All data is saved <strong>only on your device</strong> (localStorage). No server, no cloud, no data sharing.</p>
            </div>
          </div>
        )}

        {/* ── Integrations tab ── */}
        {tab === 'integrations' && (
          <div className="settings-modal__body">
            <div className="settings-section">
              <div className="settings-section__header">
                <div className="settings-section__icon">🔗</div>
                <div>
                  <h3>App Integrations</h3>
                  <p>Connect apps so the AI can read and act on them in real time.</p>
                </div>
              </div>

              {/* Quick preview of catalog */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, margin:'12px 0 16px' }}>
                {CATALOG.slice(0, 12).map(svc => (
                  <span key={svc.id} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'4px 10px', borderRadius:7, fontSize:12.5, fontWeight:500,
                    background:'var(--bg-3)', color:'var(--text-2)', border:'1px solid var(--border)',
                  }}>
                    {svc.icon} {svc.name}
                  </span>
                ))}
                <span style={{ padding:'4px 10px', fontSize:12.5, color:'var(--text-3)' }}>
                  +{CATALOG.length - 12} more
                </span>
              </div>

              <button
                className="settings-save"
                style={{ width:'100%' }}
                onClick={() => { onClose(); onNavigate?.('integrations'); }}
              >
                Open Integrations Hub →
              </button>
            </div>

            {/* Google (browser-side, no server needed) */}
            <div className="settings-section" style={{ marginTop: 16 }}>
              <div className="settings-section__header">
                <div className="settings-section__icon">🟢</div>
                <div>
                  <h3>Google Workspace (browser)</h3>
                  <p>Direct browser OAuth — no server needed. Sheets, Docs, Gmail, Calendar.</p>
                </div>
              </div>

              <div className="settings-field">
                <label>Google OAuth Client ID</label>
                <div className="settings-field__input-wrap">
                  <input
                    type="text"
                    placeholder="123456789-abc.apps.googleusercontent.com"
                    value={googleClientId}
                    onChange={e => { setGoogleClientId(e.target.value); setClientId(e.target.value.trim()); }}
                  />
                </div>
                <p className="settings-field__hint">
                  <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer">console.cloud.google.com</a>
                  {' '}→ Credentials → OAuth 2.0 Client ID (Web app) → add <code>http://localhost:5173</code> as origin
                </p>
              </div>

              <div className="settings-field" style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '4px 10px', borderRadius: 20,
                    background: googleConnected ? 'rgba(16,185,129,.12)' : 'var(--bg-3)',
                    color: googleConnected ? '#10b981' : 'var(--text-3)',
                    fontSize: 12.5, fontWeight: 600,
                  }}>
                    {googleConnected ? '● Connected' : '○ Not connected'}
                  </span>
                  {!googleConnected ? (
                    <button
                      className="settings-save"
                      disabled={!googleClientId || googleWorking}
                      onClick={async () => {
                        setGoogleWorking(true); setGoogleError('');
                        try { await connectGoogle(); setGoogleConnected(true); }
                        catch(e) { setGoogleError(e.message); }
                        setGoogleWorking(false);
                      }}
                    >
                      {googleWorking ? 'Connecting…' : 'Connect Google'}
                    </button>
                  ) : (
                    <button className="settings-cancel" onClick={() => { disconnectGoogle(); setGoogleConnected(false); }}>
                      Disconnect
                    </button>
                  )}
                </div>
                {googleError && <p style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{googleError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* ── Themes tab ── */}
        {tab === 'themes' && (
          <div className="settings-modal__body">
            <p className="settings-theme-intro">Choose a visual theme for each view. Themes change the background while keeping all content readable.</p>
            <div className="settings-theme-list">
              {THEME_VIEWS.map(view => {
                const current = viewThemes[view.id] || 'default';
                return (
                  <div key={view.id} className="settings-theme-row">
                    <span className="settings-theme-view">{view.name}</span>
                    <div className="settings-theme-picks">
                      {THEMES.map(th => (
                        <button
                          key={th.id}
                          className={`settings-theme-chip${current===th.id?' active':''}`}
                          onClick={() => handleThemePick(view.id, th.id)}
                          title={th.name}
                        >
                          <span className="settings-theme-preview theme-swatch--{th.id}">{th.preview}</span>
                          <span className="settings-theme-name">{th.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="settings-modal__footer">
          <button className="settings-cancel" onClick={onClose}>Close</button>
          {tab === 'general' && (
            <button className={`settings-save${saved?' saved':''}`} onClick={handleSave}>
              {saved ? '✓ Saved!' : 'Save'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
