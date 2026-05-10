import { useState, useRef, useEffect } from 'react';
import './ChatBot.css';

const GROQ_ENDPOINT = '/api/groq/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM = `אתה עוזר אישי חכם בתוך אפליקציית MyNotion.
עזור למשתמש עם תכנון, מטרות, משימות, כתיבה וכל שאלה.
ענה תמיד בעברית, קצר וברור. השתמש ב-Markdown לפורמט יפה.`;

const STARTERS = [
  'עזור לי לתכנן את היום',
  'תן לי טיפים לפרודוקטיביות',
  'כיצד להגדיר מטרות נכון?',
  'כתוב לי רשימת משימות לשבוע',
];

function getKey() { return localStorage.getItem('groq_key') || ''; }
function saveKey(k) { localStorage.setItem('groq_key', k); }

export default function ChatBot() {
  const [open, setOpen]       = useState(false);
  const [apiKey, setApiKey]   = useState(getKey);
  const [keyDraft, setKeyDraft] = useState('');
  const [msgs, setMsgs]       = useState([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (open && msgs.length === 0 && apiKey) {
      setMsgs([{ role: 'assistant', content: 'שלום! 👋 אני כאן לעזור לך.\nשאל אותי כל דבר — תכנון, מטרות, כתיבה, או כל שאלה אחרת.' }]);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs, loading]);

  const handleSaveKey = () => {
    const k = keyDraft.trim();
    if (!k.startsWith('gsk_')) { setError('מפתח לא תקין — חייב להתחיל ב-gsk_'); return; }
    saveKey(k);
    setApiKey(k);
    setKeyDraft('');
    setError('');
    setMsgs([{ role: 'assistant', content: 'מצוין! אני מוכן. שאל אותי כל דבר 🚀' }]);
  };

  const send = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading || !apiKey) return;
    setInput('');
    setError('');

    const newMsgs = [...msgs, { role: 'user', content: msg }];
    setMsgs(newMsgs);
    setLoading(true);

    try {
      const res = await fetch(GROQ_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            { role: 'system', content: SYSTEM },
            ...newMsgs.slice(-12),
          ],
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message || `שגיאה ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';
      setMsgs(p => [...p, { role: 'assistant', content: reply }]);
    } catch (e) {
      setError(e.message.includes('401') ? 'מפתח API לא תקין' : e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Bubble button */}
      <button
        className={`cb-fab ${open ? 'cb-fab--open' : ''}`}
        onClick={() => setOpen(p => !p)}
        title="עוזר AI"
      >
        {open
          ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        }
        {!open && !apiKey && <span className="cb-fab__badge">!</span>}
      </button>

      {/* Chat window */}
      {open && (
        <div className="cb-win">
          {/* Header */}
          <div className="cb-header">
            <div className="cb-header__left">
              <div className="cb-header__avatar">AI</div>
              <div>
                <p className="cb-header__name">עוזר MyNotion</p>
                <p className="cb-header__sub">
                  {apiKey ? <><span className="cb-header__dot" />מחובר · Llama 3.3</> : 'לא מחובר'}
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {apiKey && (
                <button className="cb-icon-btn" title="שיחה חדשה" onClick={() => setMsgs([
                  { role: 'assistant', content: 'שיחה חדשה! במה אוכל לעזור? 😊' }
                ])}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.88"/></svg>
                </button>
              )}
              {apiKey && (
                <button className="cb-icon-btn" title="שנה מפתח" onClick={() => { setApiKey(''); saveKey(''); setMsgs([]); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </button>
              )}
            </div>
          </div>

          {!apiKey ? (
            /* ── Setup screen ── */
            <div className="cb-setup">
              <div className="cb-setup__icon">🔑</div>
              <h3 className="cb-setup__title">חבר את ה-AI</h3>
              <p className="cb-setup__desc">
                צור מפתח חינמי ב-<br/>
                <strong>console.groq.com</strong><br/>
                ← API Keys ← Create API Key
              </p>
              <input
                className="cb-setup__input"
                type="password"
                placeholder="gsk_..."
                value={keyDraft}
                onChange={e => { setKeyDraft(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleSaveKey()}
                autoFocus
              />
              {error && <p className="cb-setup__error">{error}</p>}
              <button
                className="cb-setup__btn"
                onClick={handleSaveKey}
                disabled={!keyDraft.trim()}
              >
                התחבר
              </button>
            </div>
          ) : (
            <>
              {/* ── Messages ── */}
              <div className="cb-msgs">
                {msgs.length === 0 && (
                  <div className="cb-starters">
                    <p className="cb-starters__label">התחל עם:</p>
                    {STARTERS.map(s => (
                      <button key={s} className="cb-starter" onClick={() => send(s)}>{s}</button>
                    ))}
                  </div>
                )}

                {msgs.map((m, i) => (
                  <div key={i} className={`cb-msg cb-msg--${m.role}`}>
                    {m.role === 'assistant' && <div className="cb-msg__av">AI</div>}
                    <div
                      className="cb-msg__bubble"
                      dangerouslySetInnerHTML={{ __html: md(m.content) }}
                    />
                  </div>
                ))}

                {loading && (
                  <div className="cb-msg cb-msg--assistant">
                    <div className="cb-msg__av">AI</div>
                    <div className="cb-typing"><span/><span/><span/></div>
                  </div>
                )}

                {error && <div className="cb-error">⚠️ {error}</div>}
                <div ref={bottomRef} />
              </div>

              {/* ── Input ── */}
              <div className="cb-input-wrap">
                <textarea
                  ref={inputRef}
                  className="cb-input"
                  placeholder="כתוב הודעה... (Enter לשליחה)"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  rows={1}
                  disabled={loading}
                />
                <button
                  className={`cb-send-btn ${!input.trim() || loading ? 'cb-send-btn--off' : ''}`}
                  onClick={() => send()}
                  disabled={!input.trim() || loading}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

function md(text) {
  if (!text) return '';
  return text
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/```[\w]*\n?([\s\S]*?)```/g,'<pre><code>$1</code></pre>')
    .replace(/`([^`\n]+)`/g,'<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/^# (.+)$/gm,'<h1>$1</h1>')
    .replace(/^[-•] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>[\s\S]*?<\/li>)/g,'<ul>$1</ul>')
    .replace(/\n\n/g,'<br><br>')
    .replace(/\n/g,'<br>');
}
