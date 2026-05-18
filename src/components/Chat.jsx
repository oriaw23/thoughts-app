import { useState, useRef, useEffect, useCallback } from 'react';
import './Chat.css';

const HISTORY_KEY = 'thoughts_chat_v2';
const KEY_STORE   = 'groq_api_key';
const GROQ_URL    = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL       = 'llama-3.3-70b-versatile';

const SYSTEM = `אתה עוזר אישי חכם בתוך אפליקציית Thoughts.
עזור עם: תכנון יום, מטרות, משימות, כתיבה, פרודוקטיביות וכל שאלה.
ענה תמיד בעברית. היה ידידותי וברור.

חשוב מאוד: חלק את תשובתך תמיד לשלושה חלקים מופרדים בסמן ---
כל חלק צריך להיות נקי ועצמאי (כותרת קצרה + תוכן). לדוגמה:
**כותרת ראשונה**
תוכן הסעיף הראשון...
---
**כותרת שנייה**
תוכן הסעיף השני...
---
**כותרת שלישית**
תוכן הסעיף השלישי...`;

const SUGGESTIONS = [
  { icon: '🌅', text: 'עזור לי לתכנן את היום' },
  { icon: '🎯', text: 'כיצד להגדיר מטרות חכמות?' },
  { icon: '⚡', text: '5 טיפים לפרודוקטיביות' },
  { icon: '📋', text: 'כתוב לי רשימת משימות לשבוע' },
  { icon: '🧠', text: 'איך להתגבר על דחיינות?' },
  { icon: '💡', text: 'רעיונות לפרויקט חדש' },
];

const getSavedKey = () => localStorage.getItem(KEY_STORE) || '';
const saveKey     = (k) => localStorage.setItem(KEY_STORE, k);

function loadHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch { return []; }
}

async function askGroq(messages, apiKey) {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `שגיאה ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// ─── Setup screen ──────────────────────────────────────────────────────────────
function Setup({ onDone }) {
  const [key, setKey]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const connect = async () => {
    const k = key.trim();
    if (!k) return;
    if (!k.startsWith('gsk_')) { setError('מפתח לא תקין — חייב להתחיל ב-gsk_'); return; }
    saveKey(k);
    onDone(k);
  };

  return (
    <div className="chat__onboard">
      <div className="chat__ob-card">
        <div className="chat__ob-icon-big">✨</div>
        <h2 className="chat__ob-title">חבר Groq AI</h2>
        <p className="chat__ob-desc">
          קבל מפתח חינמי מ-Google:
        </p>

        <div className="chat__ob-steps">
          <div className="chat__ob-step">
            <span className="chat__ob-step-num">1</span>
            <div>
              <p className="chat__ob-step-title">פתח את Groq</p>
              <p className="chat__ob-step-sub">לחץ על הכפתור למטה</p>
            </div>
          </div>
          <div className="chat__ob-step">
            <span className="chat__ob-step-num">2</span>
            <div>
              <p className="chat__ob-step-title">לחץ "Get API key"</p>
              <p className="chat__ob-step-sub">ואז "Create API key"</p>
            </div>
          </div>
          <div className="chat__ob-step">
            <span className="chat__ob-step-num">3</span>
            <div>
              <p className="chat__ob-step-title">הדבק כאן</p>
              <p className="chat__ob-step-sub">חד-פעמי — לא תצטרך שוב</p>
            </div>
          </div>
        </div>

        <a
          className="chat__ob-open-btn"
          href="https://console.groq.com/keys"
          target="_blank"
          rel="noreferrer"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          פתח את aistudio.google.com
        </a>

        <input
          className="chat__ob-input"
          type="password"
          placeholder="gsk_..."
          value={key}
          onChange={e => { setKey(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && connect()}
          autoFocus
        />

        {error && <div className="chat__ob-err">{error}</div>}

        <button
          className="chat__ob-connect"
          onClick={connect}
          disabled={!key.trim() || loading}
        >
          {loading ? <><span className="chat__ob-spinner" /> בודק...</> : '✓ התחבר ושמור'}
        </button>

        <p className="chat__ob-note">
          🔒 המפתח נשמר רק על המחשב שלך. חינמי לחלוטין.
        </p>
      </div>
    </div>
  );
}

// ─── Main Chat ──────────────────────────────────────────────────────────────────
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

  const send = useCallback(async (text) => {
    const content = (text || input).trim();
    if (!content || loading || !apiKey) return;
    setInput('');
    setError('');

    const newMsgs = [...msgs, { role: 'user', content }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const reply = await askGroq(newMsgs.slice(-20), apiKey);
      if (!reply.trim()) throw new Error('תשובה ריקה');
      setMsgs(p => [...p, { role: 'assistant', content: reply.trim() }]);
    } catch (e) {
      setError(e.message || 'שגיאה — נסה שוב');
    } finally {
      setLoading(false);
    }
  }, [input, msgs, loading, apiKey]);

  if (!apiKey) {
    return (
      <div className="chat">
        <div className="chat__glow" />
        <div className="chat__header">
          <div className="chat__header-brand">
            <div className="chat__header-orb">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <div>
              <h1 className="chat__header-title">AI Chat</h1>
              <p className="chat__header-sub">Groq · Llama 3.3 · חינם</p>
            </div>
          </div>
        </div>
        <Setup onDone={k => { setApiKey(k); setMsgs(loadHistory()); }} />
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat__glow" />

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
              Groq · Llama 3.3 · מחובר
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
          <button className="chat__clear" title="התנתק" onClick={() => { saveKey(''); setApiKey(''); setMsgs([]); }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="chat__body">
        {msgs.length === 0 ? (
          <div className="chat__welcome">
            <div className="chat__welcome-top">
              <h2 className="chat__welcome-title">במה אוכל לעזור?</h2>
              <p className="chat__welcome-sub">שאל אותי כל דבר — תכנון, מטרות, כתיבה ועוד</p>
            </div>

            <div className="chat__welcome-input-wrap">
              <div className="chat__input-box">
                <textarea
                  ref={textareaRef}
                  className="chat__textarea"
                  placeholder="שאל אותי כל דבר..."
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
              <div className="chat__suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s.text} className="chat__suggestion" onClick={() => send(s.text)}>
                    <span className="chat__suggestion-icon">{s.icon}</span>
                    <span>{s.text}</span>
                  </button>
                ))}
              </div>
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

      {msgs.length > 0 && (
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
      )}
    </div>
  );
}

function ChatMessage({ msg }) {
  const isUser = msg.role === 'user';

  if (!isUser) {
    const parts = msg.content.split(/\n---\n|^---$/m).map(p => p.trim()).filter(Boolean);
    const cards = parts.length >= 2 ? parts : [msg.content];
    return (
      <div className="chat-ai-cards">
        {cards.map((part, i) => (
          <div
            key={i}
            className="chat-ai-card"
            style={{ animationDelay: `${i * 0.12}s` }}
            dangerouslySetInnerHTML={{ __html: renderMd(part) }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="chat-msg chat-msg--user">
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
