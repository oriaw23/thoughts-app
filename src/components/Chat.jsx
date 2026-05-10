import { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

const GROQ_URL    = '/api/groq/openai/v1/chat/completions';
const MODEL       = 'llama-3.3-70b-versatile';
const HISTORY_KEY = 'mynotion_chat_v1';
const KEY_STORE   = 'groq_api_key';

const SYSTEM = `אתה עוזר אישי חכם בתוך אפליקציית MyNotion.
עזור עם: תכנון יום, מטרות, משימות, כתיבה, פרודוקטיביות וכל שאלה.
ענה תמיד בעברית. היה ידידותי, קצר וברור. השתמש ב-Markdown.`;

const SUGGESTIONS = [
  { icon: '🌅', text: 'עזור לי לתכנן את היום' },
  { icon: '🎯', text: 'כיצד להגדיר מטרות חכמות?' },
  { icon: '⚡', text: '5 טיפים לפרודוקטיביות' },
  { icon: '📋', text: 'כתוב לי רשימת משימות לשבוע' },
  { icon: '🧠', text: 'איך להתגבר על דחיינות?' },
  { icon: '💡', text: 'רעיונות לפרויקט חדש' },
];

const getSavedKey = () => localStorage.getItem(KEY_STORE) || '';
const saveKey     = (k) => localStorage.setItem(KEY_STORE, k.trim());

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

async function callGroq(messages, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 1024 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error('KEY_INVALID');
    throw new Error(err?.error?.message || `שגיאה ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
function Onboarding({ onDone }) {
  const [step, setStep]       = useState(1); // 1=intro, 2=paste-key
  const [keyVal, setKeyVal]   = useState('');
  const [testing, setTesting] = useState(false);
  const [err, setErr]         = useState('');

  const handleConnect = async () => {
    const k = keyVal.trim();
    if (!k) return;
    setTesting(true);
    setErr('');
    try {
      await callGroq([{ role: 'user', content: 'hi' }], k);
      saveKey(k);
      onDone(k);
    } catch (e) {
      setErr(e.message === 'KEY_INVALID'
        ? 'המפתח לא תקין — בדוק שהעתקת אותו נכון'
        : 'לא הצלחתי להתחבר, נסה שוב');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="chat__onboard">
      <div className="chat__ob-card">

        {step === 1 ? (
          <>
            <div className="chat__ob-hero">
              <div className="chat__ob-icon-big">🤖</div>
              <h2 className="chat__ob-title">AI Chat מוכן!</h2>
              <p className="chat__ob-desc">
                צריך מפתח API חינמי כדי לדבר עם ה-AI.
                <br/>
                <strong>Groq — חינם לחלוטין, ללא כרטיס אשראי.</strong>
              </p>
            </div>

            <div className="chat__ob-steps">
              <div className="chat__ob-step">
                <span className="chat__ob-step-num">1</span>
                <div>
                  <p className="chat__ob-step-title">פתח את Groq</p>
                  <p className="chat__ob-step-sub">לחץ על הכפתור למטה, הירשם בחינם</p>
                </div>
              </div>
              <div className="chat__ob-step">
                <span className="chat__ob-step-num">2</span>
                <div>
                  <p className="chat__ob-step-title">צור API Key</p>
                  <p className="chat__ob-step-sub">לחץ על "API Keys" ← "Create API Key"</p>
                </div>
              </div>
              <div className="chat__ob-step">
                <span className="chat__ob-step-num">3</span>
                <div>
                  <p className="chat__ob-step-title">הדבק כאן</p>
                  <p className="chat__ob-step-sub">חד-פעמי — לא תצטרך לעשות זאת שוב</p>
                </div>
              </div>
            </div>

            <a
              className="chat__ob-open-btn"
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noreferrer"
              onClick={() => setTimeout(() => setStep(2), 1500)}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
              </svg>
              פתח את console.groq.com
            </a>

            <button className="chat__ob-skip" onClick={() => setStep(2)}>
              כבר יש לי מפתח ←
            </button>
          </>
        ) : (
          <>
            <button className="chat__ob-back" onClick={() => setStep(1)}>← חזור</button>
            <div className="chat__ob-icon-big" style={{ fontSize: 36, marginBottom: 4 }}>🔑</div>
            <h3 className="chat__ob-title" style={{ fontSize: 20 }}>הדבק את המפתח</h3>
            <p className="chat__ob-desc" style={{ fontSize: 13 }}>
              מ-console.groq.com ← API Keys ← העתק את המפתח
            </p>

            <input
              className="chat__ob-input"
              type="password"
              placeholder="gsk_..."
              value={keyVal}
              onChange={e => { setKeyVal(e.target.value); setErr(''); }}
              onKeyDown={e => e.key === 'Enter' && handleConnect()}
              autoFocus
            />

            {err && <div className="chat__ob-err">{err}</div>}

            <button
              className="chat__ob-connect"
              onClick={handleConnect}
              disabled={!keyVal.trim() || testing}
            >
              {testing
                ? <><span className="chat__ob-spinner" /> בודק...</>
                : '✓ התחבר ושמור'}
            </button>

            <p className="chat__ob-note">
              🔒 המפתח נשמר רק על המחשב שלך. לא יישלח לשום שרת.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Chat ────────────────────────────────────────────────────────────────
export default function Chat() {
  const [apiKey, setApiKey]   = useState(getSavedKey);
  const [msgs, setMsgs]       = useState(() => getSavedKey() ? loadHistory() : []);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  useEffect(() => {
    if (apiKey) localStorage.setItem(HISTORY_KEY, JSON.stringify(msgs.slice(-60)));
  }, [msgs, apiKey]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [input]);

  const handleKeyReady = (k) => {
    setApiKey(k);
    setMsgs(loadHistory());
  };

  const send = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading || !apiKey) return;
    setInput('');
    setError('');

    const userMsg = { role: 'user', content };
    const history = [...msgs, userMsg];
    setMsgs(history);
    setLoading(true);

    try {
      const apiMsgs = [{ role: 'system', content: SYSTEM }, ...history.slice(-20)];
      const reply   = await callGroq(apiMsgs, apiKey);
      if (!reply.trim()) throw new Error('תשובה ריקה');
      setMsgs(p => [...p, { role: 'assistant', content: reply.trim() }]);
    } catch (e) {
      if (e.message === 'KEY_INVALID') {
        saveKey('');
        setApiKey('');
        setError('המפתח פג תוקף — יש להתחבר מחדש');
      } else {
        setError(e.message);
      }
      setMsgs(p => p.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }, [input, msgs, loading, apiKey]);

  // Not connected yet → show onboarding
  if (!apiKey) {
    return (
      <div className="chat">
        <div className="chat__glow" aria-hidden />
        <div className="chat__header">
          <div className="chat__header-brand">
            <div className="chat__header-orb">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="chat__header-title">AI Chat</h1>
              <p className="chat__header-sub">Groq · Llama 3.3 70B · חינם</p>
            </div>
          </div>
        </div>
        <Onboarding onDone={handleKeyReady} />
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat__glow" aria-hidden />

      {/* Header */}
      <div className="chat__header">
        <div className="chat__header-brand">
          <div className="chat__header-orb">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <h1 className="chat__header-title">AI Chat</h1>
            <p className="chat__header-sub">
              <span className="chat__live-dot" />
              Groq · Llama 3.3 70B · מחובר
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {msgs.length > 0 && (
            <button className="chat__clear" onClick={() => { setMsgs([]); localStorage.removeItem(HISTORY_KEY); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              </svg>
              נקה
            </button>
          )}
          <button className="chat__clear" onClick={() => { saveKey(''); setApiKey(''); setMsgs([]); }} title="התנתק">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat__body">
        {msgs.length === 0 ? (
          <div className="chat__welcome">
            <div className="chat__welcome-orb">✨</div>
            <h2 className="chat__welcome-title">שלום! במה אוכל לעזור?</h2>
            <p className="chat__welcome-sub">שאל אותי כל דבר — תכנון, מטרות, כתיבה ועוד</p>
            <div className="chat__suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s.text} className="chat__suggestion" onClick={() => send(s.text)}>
                  <span className="chat__suggestion-icon">{s.icon}</span>
                  <span>{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat__messages">
            {msgs.map((m, i) => <ChatMessage key={i} msg={m} />)}
            {loading && <TypingIndicator />}
            {error && (
              <div className="chat__error">
                <span>⚠️ {error}</span>
                <button onClick={() => setError('')}>✕</button>
              </div>
            )}
            <div ref={bottomRef} style={{ height: 1 }} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="chat__footer">
        <div className="chat__input-box">
          <textarea
            ref={textareaRef}
            className="chat__textarea"
            placeholder="כתוב הודעה..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            rows={1}
            disabled={loading}
          />
          <button
            className={`chat__send ${!input.trim() || loading ? 'chat__send--off' : ''}`}
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <span className="chat__send-spinner" />
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
            }
          </button>
        </div>
        <p className="chat__footer-hint">Enter לשליחה · Shift+Enter לשורה חדשה</p>
      </div>
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div className={`chat-msg chat-msg--${isUser ? 'user' : 'ai'}`}>
      {!isUser && (
        <div className="chat-msg__avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
      )}
      <div className="chat-msg__bubble" dangerouslySetInnerHTML={{ __html: renderMd(msg.content) }} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg--ai">
      <div className="chat-msg__avatar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div className="chat-typing"><span/><span/><span/></div>
    </div>
  );
}

function renderMd(raw) {
  if (!raw) return '';
  return raw
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, c) => `<pre><code>${c.trim()}</code></pre>`)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^#{3} (.+)$/gm, '<h3>$1</h3>')
    .replace(/^#{2} (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>\n?)+/g, s => `<ul>${s}</ul>`)
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}
