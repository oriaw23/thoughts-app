import { useState, useEffect, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getSessionId, executeAction } from '../lib/integrations';
import './AutomationBuilder.css';

// ── API helpers ───────────────────────────────────────────────────────────────
const API  = typeof window !== 'undefined' && window.location.protocol !== 'file:' ? '' : 'http://localhost:3001';
const hdrs = () => ({ Authorization: `Bearer ${getSessionId()}`, 'Content-Type': 'application/json' });

async function apiFetch(path, opts = {}) {
  const r = await fetch(`${API}${path}`, { headers: hdrs(), ...opts });
  return r.json();
}

// ── localStorage ──────────────────────────────────────────────────────────────
const LS_KEY = 'foldbase_automations_v1';
const loadLocal  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const saveLocal  = a  => localStorage.setItem(LS_KEY, JSON.stringify(a));

// ── Empty automation template ─────────────────────────────────────────────────
function newAutomation(name = 'WhatsApp Intake') {
  return {
    id: uuidv4(),
    name,
    active: false,
    trigger: { type: 'whatsapp_incoming' },
    greeting: 'Hello! I\'m the legal intake assistant. Please answer a few quick questions so I can send you the right document.',
    questionnaire: [
      {
        id: uuidv4(),
        text: 'What type of legal matter do you need help with?',
        choices: [
          { id: uuidv4(), text: 'Employment issue',        docUrl: '' },
          { id: uuidv4(), text: 'Contract review',         docUrl: '' },
          { id: uuidv4(), text: 'Business incorporation',  docUrl: '' },
        ],
      },
    ],
    closingMessage: 'Based on your answers, here is the document relevant to your matter:',
    createdAt: new Date().toISOString(),
  };
}

// ── WhatsApp setup panel ──────────────────────────────────────────────────────
function WASetupPanel({ onDone }) {
  const [phoneId, setPhoneId]   = useState('');
  const [token,   setToken]     = useState('');
  const [verify,  setVerify]    = useState('foldbase-wa-verify');
  const [saving,  setSaving]    = useState(false);
  const [status,  setStatus]    = useState(null); // { webhookUrl, verifyToken }

  useEffect(() => {
    apiFetch('/api/whatsapp/status').then(d => {
      if (d.webhookUrl) setStatus(d);
      if (d.phoneNumberId) setPhoneId(d.phoneNumberId);
      if (d.verifyToken)   setVerify(d.verifyToken);
    }).catch(() => {});
  }, []);

  const save = async () => {
    if (!phoneId.trim() || !token.trim()) return;
    setSaving(true);
    try {
      const r = await apiFetch('/api/whatsapp/setup', {
        method: 'POST',
        body: JSON.stringify({ phoneNumberId: phoneId.trim(), accessToken: token.trim(), verifyToken: verify.trim() }),
      });
      if (r.ok) onDone();
    } catch {}
    setSaving(false);
  };

  const webhookUrl = status?.webhookUrl || `${API}/webhooks/whatsapp`;

  return (
    <div className="ab-setup">
      <div className="ab-setup__icon">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="#25d366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </div>
      <h2 className="ab-setup__title">Connect WhatsApp Business</h2>
      <p className="ab-setup__sub">
        Use the <strong>Meta WhatsApp Business Cloud API</strong> (free). You need a Meta developer account
        and a WhatsApp Business number.
      </p>

      <div className="ab-setup__steps">
        <div className="ab-setup__step">
          <span className="ab-setup__step-num">1</span>
          <div>
            <div className="ab-setup__step-title">Create a Meta app</div>
            <div className="ab-setup__step-body">
              Go to <a href="https://developers.facebook.com/apps" target="_blank" rel="noreferrer">developers.facebook.com/apps</a> → Create App → Business → add WhatsApp product.
            </div>
          </div>
        </div>
        <div className="ab-setup__step">
          <span className="ab-setup__step-num">2</span>
          <div>
            <div className="ab-setup__step-title">Get your credentials</div>
            <div className="ab-setup__step-body">
              In your app's WhatsApp panel: copy the <strong>Phone Number ID</strong> and generate a <strong>Permanent Access Token</strong>.
            </div>
          </div>
        </div>
        <div className="ab-setup__step">
          <span className="ab-setup__step-num">3</span>
          <div>
            <div className="ab-setup__step-title">Configure webhook</div>
            <div className="ab-setup__step-body">
              In Meta → WhatsApp → Configuration → Webhooks, enter this URL and the verify token below.
              <div className="ab-setup__url-row">
                <code className="ab-setup__url">{webhookUrl}</code>
                <button className="ab-setup__copy" onClick={() => navigator.clipboard?.writeText(webhookUrl)}>Copy</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="ab-setup__form">
        <label className="ab-setup__label">Phone Number ID</label>
        <input className="ab-setup__input" placeholder="123456789012345" value={phoneId} onChange={e => setPhoneId(e.target.value)} />

        <label className="ab-setup__label">Permanent Access Token</label>
        <input className="ab-setup__input" type="password" placeholder="EAAxxxxxxxx…" value={token} onChange={e => setToken(e.target.value)} />

        <label className="ab-setup__label">Webhook Verify Token</label>
        <input className="ab-setup__input" placeholder="foldbase-wa-verify" value={verify} onChange={e => setVerify(e.target.value)} />
      </div>

      <button
        className={`ab-setup__btn${(!phoneId.trim() || !token.trim()) ? ' ab-setup__btn--disabled' : ''}`}
        onClick={save} disabled={saving || !phoneId.trim() || !token.trim()}>
        {saving ? 'Saving…' : 'Save & Connect →'}
      </button>
    </div>
  );
}

// ── Question builder ──────────────────────────────────────────────────────────
function QuestionCard({ q, qi, onChange, onDelete, googleConnected }) {
  const setQ  = patch => onChange({ ...q, ...patch });
  const setCh = (ci, patch) => {
    const choices = q.choices.map((c, i) => i === ci ? { ...c, ...patch } : c);
    setQ({ choices });
  };
  const addChoice    = () => setQ({ choices: [...q.choices, { id: uuidv4(), text: '', docUrl: '' }] });
  const removeChoice = ci => setQ({ choices: q.choices.filter((_, i) => i !== ci) });

  const createDoc = async (ci) => {
    if (!googleConnected) return alert('Connect Google first via Integrations');
    try {
      const title = `Legal Document — ${q.choices[ci]?.text || 'Option'}`;
      const result = await executeAction('google', 'create_doc', { title, content: `# ${title}\n\nAdd your legal content here.` });
      if (result?.url) setCh(ci, { docUrl: result.url });
    } catch (err) {
      alert(`Could not create doc: ${err.message}`);
    }
  };

  return (
    <div className="ab-q">
      <div className="ab-q__head">
        <div className="ab-q__num">Q{qi + 1}</div>
        <input className="ab-q__text" placeholder="Question text…" value={q.text}
          onChange={e => setQ({ text: e.target.value })} />
        <button className="ab-q__del" onClick={onDelete} title="Delete question">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="ab-q__choices">
        {q.choices.map((c, ci) => (
          <div key={c.id} className="ab-q__choice">
            <div className="ab-q__choice-num">{ci + 1}</div>
            <input className="ab-q__choice-text" placeholder="Answer option…" value={c.text}
              onChange={e => setCh(ci, { text: e.target.value })} />
            <div className="ab-q__doc-row">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              <input className="ab-q__doc-input" placeholder="Google Doc URL (paste or auto-create)…"
                value={c.docUrl} onChange={e => setCh(ci, { docUrl: e.target.value })} />
              <button className="ab-q__doc-create" onClick={() => createDoc(ci)} title="Auto-create Google Doc">
                + Create Doc
              </button>
            </div>
            <button className="ab-q__choice-del" onClick={() => removeChoice(ci)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
        <button className="ab-q__add-choice" onClick={addChoice}>+ Add answer option</button>
      </div>
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────
function AutomationEditor({ automation, onChange, onSave, onToggleActive, waConnected, googleConnected, saving }) {
  const set = patch => onChange({ ...automation, ...patch });

  const setQuestion = (qi, q) => {
    const questionnaire = automation.questionnaire.map((old, i) => i === qi ? q : old);
    set({ questionnaire });
  };
  const addQuestion = () => set({
    questionnaire: [...automation.questionnaire, { id: uuidv4(), text: '', choices: [{ id: uuidv4(), text: '', docUrl: '' }] }],
  });
  const deleteQuestion = qi => set({ questionnaire: automation.questionnaire.filter((_, i) => i !== qi) });

  return (
    <div className="ab-editor">
      {/* Header */}
      <div className="ab-editor__head">
        <input className="ab-editor__name" value={automation.name}
          onChange={e => set({ name: e.target.value })} placeholder="Automation name…" />
        <div className="ab-editor__head-right">
          <div className={`ab-status-pill${automation.active ? ' ab-status-pill--active' : ''}`}>
            <span className="ab-status-dot"/>
            {automation.active ? 'Active' : 'Inactive'}
          </div>
          <button className="ab-editor__save" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <div className="ab-editor__body">

        {/* STEP 1 — TRIGGER */}
        <div className="ab-step">
          <div className="ab-step__badge ab-step__badge--wa">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            WhatsApp
          </div>
          <div className="ab-step__label">TRIGGER</div>
          <div className="ab-step__card">
            <div className="ab-step__card-title">When a client sends a WhatsApp message</div>
            {!waConnected && (
              <div className="ab-step__warn">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                WhatsApp not configured — set it up in the connection panel
              </div>
            )}
          </div>
        </div>

        <div className="ab-connector"><div className="ab-connector__line"/><div className="ab-connector__dot"/></div>

        {/* STEP 2 — GREETING */}
        <div className="ab-step">
          <div className="ab-step__badge ab-step__badge--msg">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Auto-reply
          </div>
          <div className="ab-step__label">GREETING</div>
          <div className="ab-step__card">
            <textarea className="ab-step__textarea" rows={3}
              placeholder="Greeting message sent to the client when they first message…"
              value={automation.greeting} onChange={e => set({ greeting: e.target.value })} />
          </div>
        </div>

        <div className="ab-connector"><div className="ab-connector__line"/><div className="ab-connector__dot"/></div>

        {/* STEP 3 — QUESTIONNAIRE */}
        <div className="ab-step">
          <div className="ab-step__badge ab-step__badge--q">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Questions
          </div>
          <div className="ab-step__label">QUESTIONNAIRE</div>
          <div className="ab-step__card ab-step__card--q">
            {automation.questionnaire.map((q, qi) => (
              <QuestionCard key={q.id} q={q} qi={qi}
                onChange={nq => setQuestion(qi, nq)}
                onDelete={() => deleteQuestion(qi)}
                googleConnected={googleConnected} />
            ))}
            <button className="ab-q__add-question" onClick={addQuestion}>+ Add question</button>
          </div>
        </div>

        <div className="ab-connector"><div className="ab-connector__line"/><div className="ab-connector__dot"/></div>

        {/* STEP 4 — SEND DOCUMENT */}
        <div className="ab-step">
          <div className="ab-step__badge ab-step__badge--doc">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
            Send doc
          </div>
          <div className="ab-step__label">CLOSING</div>
          <div className="ab-step__card">
            <textarea className="ab-step__textarea" rows={2}
              placeholder="Message sent before the document link…"
              value={automation.closingMessage} onChange={e => set({ closingMessage: e.target.value })} />
            <p className="ab-step__hint">The correct Google Doc link is sent automatically based on the client's answers.</p>
          </div>
        </div>

      </div>

      {/* Footer actions */}
      <div className="ab-editor__foot">
        <button className={`ab-toggle-btn${automation.active ? ' ab-toggle-btn--on' : ''}`}
          onClick={onToggleActive}>
          {automation.active ? '⏸ Deactivate' : '▶ Activate Automation'}
        </button>
        <button className="ab-editor__save ab-editor__save--lg" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ── Live logs panel ───────────────────────────────────────────────────────────
function LogsPanel() {
  const [logs, setLogs] = useState([]);
  const timerRef = useRef(null);

  const refresh = useCallback(() => {
    apiFetch('/api/automations/logs').then(d => {
      if (Array.isArray(d.logs)) setLogs(d.logs);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, 4000);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  return (
    <div className="ab-logs">
      <div className="ab-logs__head">
        <span>Live Activity</span>
        <button className="ab-logs__refresh" onClick={refresh}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
        </button>
      </div>
      {logs.length === 0 ? (
        <div className="ab-logs__empty">No messages yet. Waiting for WhatsApp activity…</div>
      ) : (
        <div className="ab-logs__list">
          {logs.map((l, i) => (
            <div key={i} className={`ab-log-row ab-log-row--${l.direction}`}>
              <div className="ab-log-row__dir">{l.direction === 'incoming' ? '↓ in' : '↑ out'}</div>
              <div className="ab-log-row__body">
                <div className="ab-log-row__phone">{l.from || l.to}</div>
                <div className="ab-log-row__text">{l.text}</div>
              </div>
              <div className="ab-log-row__time">{new Date(l.ts).toLocaleTimeString()}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Test sender ───────────────────────────────────────────────────────────────
function TestPanel({ automation }) {
  const [phone, setPhone]     = useState('');
  const [msg,   setMsg]       = useState('');
  const [status, setStatus]   = useState(null);

  const send = async () => {
    if (!phone.trim() || !msg.trim()) return;
    setStatus('sending');
    try {
      const r = await apiFetch('/api/automations/test-send', {
        method: 'POST',
        body:   JSON.stringify({ to: phone.trim().replace(/\D/g,''), message: msg.trim() }),
      });
      setStatus(r.ok ? 'sent' : `error: ${r.error}`);
    } catch (err) {
      setStatus(`error: ${err.message}`);
    }
    setTimeout(() => setStatus(null), 4000);
  };

  return (
    <div className="ab-test">
      <div className="ab-test__title">Send a Test Message</div>
      <p className="ab-test__sub">Manually send a WhatsApp message to verify your connection is working.</p>
      <input className="ab-test__input" placeholder="Phone number (international format, e.g. 972501234567)"
        value={phone} onChange={e => setPhone(e.target.value)} />
      <textarea className="ab-test__msg" rows={3} placeholder="Message text…"
        value={msg} onChange={e => setMsg(e.target.value)} />
      <button className="ab-test__btn" onClick={send} disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : status === 'sent' ? '✓ Sent!' : '↗ Send Test Message'}
      </button>
      {status && status.startsWith('error:') && (
        <div className="ab-test__err">{status}</div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AutomationBuilder() {
  const [automations, setAutomations] = useState(loadLocal);
  const [selectedId,  setSelectedId]  = useState(() => loadLocal()[0]?.id || null);
  const [waConnected, setWaConnected] = useState(false);
  const [showSetup,   setShowSetup]   = useState(false);
  const [googleConn,  setGoogleConn]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [tab,         setTab]         = useState('editor'); // 'editor' | 'logs' | 'test'

  // ── Load WA + Google status ──
  useEffect(() => {
    apiFetch('/api/whatsapp/status').then(d => {
      if (d.connected) setWaConnected(true);
    }).catch(() => {});
    apiFetch(`/api/integrations/status?session=${getSessionId()}`).then(d => {
      if (d.google?.connected) setGoogleConn(true);
    }).catch(() => {});
  }, []);

  const selected = automations.find(a => a.id === selectedId) || null;

  // ── Persist to localStorage + sync active automations to server ──
  const persist = useCallback((list) => {
    saveLocal(list);
    setAutomations(list);
    const active = list.filter(a => a.active);
    apiFetch('/api/automations/sync', {
      method: 'POST',
      body: JSON.stringify({ automations: active }),
    }).catch(() => {});
  }, []);

  const updateSelected = useCallback((patch) => {
    setAutomations(prev => prev.map(a => a.id === patch.id ? patch : a));
  }, []);

  const saveSelected = useCallback(async () => {
    setSaving(true);
    const list = automations.map(a => a.id === selectedId ? { ...a } : a);
    persist(list);
    setSaving(false);
  }, [automations, selectedId, persist]);

  const toggleActive = useCallback(() => {
    const list = automations.map(a => a.id === selectedId ? { ...a, active: !a.active } : a);
    persist(list);
  }, [automations, selectedId, persist]);

  const newAuto = () => {
    const a = newAutomation();
    const list = [a, ...automations];
    persist(list);
    setSelectedId(a.id);
  };

  const deleteAuto = (id) => {
    const list = automations.filter(a => a.id !== id);
    persist(list);
    if (selectedId === id) setSelectedId(list[0]?.id || null);
  };

  const onSetupDone = () => {
    setWaConnected(true);
    setShowSetup(false);
  };

  return (
    <div className="ab">
      {/* Left sidebar */}
      <div className="ab__sidebar">
        <div className="ab__sidebar-head">
          <span className="ab__sidebar-title">Automations</span>
          <button className="ab__sidebar-new" onClick={newAuto} title="New automation">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {/* WA connection status */}
        <button
          className={`ab__wa-btn${waConnected ? ' ab__wa-btn--on' : ''}`}
          onClick={() => setShowSetup(s => !s)}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {waConnected ? 'WhatsApp connected' : 'Connect WhatsApp'}
          <span className={`ab__wa-dot${waConnected ? ' ab__wa-dot--on' : ''}`}/>
        </button>

        <div className="ab__list">
          {automations.length === 0 && (
            <div className="ab__list-empty">No automations yet</div>
          )}
          {automations.map(a => (
            <div key={a.id}
              className={`ab__item${a.id === selectedId ? ' ab__item--active' : ''}`}
              onClick={() => { setSelectedId(a.id); setShowSetup(false); }}>
              <div className="ab__item-left">
                <span className={`ab__item-dot${a.active ? ' ab__item-dot--on' : ''}`}/>
                <div>
                  <div className="ab__item-name">{a.name}</div>
                  <div className="ab__item-meta">WhatsApp intake · {a.questionnaire?.length || 0} Q</div>
                </div>
              </div>
              <button className="ab__item-del" onClick={e => { e.stopPropagation(); deleteAuto(a.id); }} title="Delete">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Main area */}
      <div className="ab__main">
        {showSetup ? (
          <div className="ab__main-scroll">
            <WASetupPanel onDone={onSetupDone} />
          </div>
        ) : selected ? (
          <>
            {/* Tab bar */}
            <div className="ab__tabs">
              {['editor', 'logs', 'test'].map(t => (
                <button key={t} className={`ab__tab${tab === t ? ' ab__tab--active' : ''}`}
                  onClick={() => setTab(t)}>
                  {t === 'editor' ? 'Builder' : t === 'logs' ? 'Live Activity' : 'Test'}
                </button>
              ))}
            </div>
            <div className="ab__main-scroll">
              {tab === 'editor' && (
                <AutomationEditor
                  automation={selected}
                  onChange={updateSelected}
                  onSave={saveSelected}
                  onToggleActive={toggleActive}
                  waConnected={waConnected}
                  googleConnected={googleConn}
                  saving={saving}
                />
              )}
              {tab === 'logs' && <LogsPanel />}
              {tab === 'test' && <TestPanel automation={selected} />}
            </div>
          </>
        ) : (
          <div className="ab__empty">
            <div className="ab__empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2>No automation selected</h2>
            <p>Create a WhatsApp intake automation that routes clients to the right legal document automatically.</p>
            <button className="ab__empty-btn" onClick={newAuto}>+ New Automation</button>
          </div>
        )}
      </div>
    </div>
  );
}
