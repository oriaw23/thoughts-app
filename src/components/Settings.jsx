import { useState } from 'react';
import { getApiKey, setApiKey } from '../ai';
import { THEMES, THEME_VIEWS, getViewThemes, setViewTheme, getColorMode, setColorMode } from '../themes';
import './Settings.css';

export default function Settings({ onClose, onThemeChange }) {
  const [tab,       setTab]       = useState('appearance');
  const [key,       setKey]       = useState(getApiKey());
  const [saved,     setSaved]     = useState(false);
  const [colorMode, setMode]      = useState(getColorMode);
  const [viewThemes, setLocalThemes] = useState(getViewThemes);

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
          <button className={`settings-tab${tab==='appearance'?' active':''}`} onClick={() => setTab('appearance')}>🌗 Appearance</button>
          <button className={`settings-tab${tab==='general'?' active':''}`}   onClick={() => setTab('general')}>⚙️ General</button>
          <button className={`settings-tab${tab==='themes'?' active':''}`}    onClick={() => setTab('themes')}>🎨 Themes</button>
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
                  <h3>Claude AI Integration</h3>
                  <p>Add a Claude API Key for full AI features:</p>
                  <ul>
                    <li>🧠 Brain Dump — automatic sorting & splitting</li>
                    <li>🎯 Goals Engine — personalized plan</li>
                    <li>📅 Daily System — smart day planning</li>
                  </ul>
                </div>
              </div>
              <div className="settings-field">
                <label>Claude API Key</label>
                <div className="settings-field__input-wrap">
                  <input type="password" placeholder="sk-ant-api03-..."
                    value={key} onChange={e => setKey(e.target.value)}
                    onKeyDown={e => e.key==='Enter' && handleSave()} />
                  {key && <span className="settings-field__status">{key.startsWith('sk-ant')?'✓':'⚠️'}</span>}
                </div>
                <p className="settings-field__hint">
                  Key is saved only on your device (localStorage). Get one at&nbsp;
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
