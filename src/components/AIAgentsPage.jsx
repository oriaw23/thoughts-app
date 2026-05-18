import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './AIAgentsPage.css';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const getKey   = () => localStorage.getItem('groq_api_key') || '';

function SpyAvatar({ accent = '#2563eb', size = 40 }) {
  const dark = '#1e3a8a';
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <circle cx="32" cy="32" r="32" fill={accent} opacity=".1"/>
      <path d="M5 64C5 50 14 44 32 42C50 44 59 50 59 64Z" fill={dark}/>
      <path d="M28 42L32 49L36 42" fill="#f8fafc"/>
      <path d="M31 42L32 54L33 42" fill={accent}/>
      <path d="M28 42L20 56L32 49Z" fill={dark}/>
      <path d="M36 42L44 56L32 49Z" fill={dark}/>
      <ellipse cx="32" cy="29" rx="12" ry="13" fill="#bfdbfe"/>
      <ellipse cx="32" cy="18" rx="17" ry="4" fill={dark}/>
      <rect x="19" y="7" width="26" height="13" rx="3" fill={dark}/>
      <rect x="19" y="16" width="26" height="2.5" fill={accent}/>
      <rect x="20" y="26" width="10" height="7" rx="3.5" fill="#0f172a"/>
      <rect x="34" y="26" width="10" height="7" rx="3.5" fill="#0f172a"/>
      <path d="M30 29.5H34" stroke="#0f172a" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 29.5H17" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M44 29.5H47" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M27 38Q32 41.5 37 38" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

const AGENTS = [
  { id:'aria',  name:'Aria',  role:'Strategic Analyst', accent:'#1d4ed8', desc:'Data-driven insights & clear frameworks',  tags:['SWOT Analysis','Market Research','Strategy Plan'],  system:'You are Aria, a strategic analyst. Think in frameworks, data, and clear structures. Be concise and analytical.' },
  { id:'sam',   name:'Sam',   role:'Creative Writer',   accent:'#2563eb', desc:'Compelling copy, stories & content',       tags:['Write Email','Blog Post','Brand Story'],             system:'You are Sam, a creative writing assistant. Help with storytelling, copywriting, and creative expression. Be imaginative and inspiring.' },
  { id:'nova',  name:'Nova',  role:'Code Expert',       accent:'#3b82f6', desc:'Debug, review & write any code',           tags:['Review Code','Fix Bug','Explain Function'],          system:'You are Nova, a coding expert. Help debug, review, and write code. Be technical, precise, and always explain your reasoning.' },
  { id:'kai',   name:'Kai',   role:'Life Coach',        accent:'#0284c7', desc:'Goals, habits & personal growth',          tags:['Set a Goal','Build a Habit','Daily Plan'],           system:'You are Kai, a life coach. Help with goals, habits, and personal growth. Be motivating, empathetic, and action-oriented.' },
  { id:'zara',  name:'Zara',  role:'Research Pro',      accent:'#0369a1', desc:'Deep research & knowledge synthesis',      tags:['Research Topic','Summarize','Compare Options'],      system:'You are Zara, a research specialist. Help find information, analyze sources, and synthesize knowledge.' },
];

const HISTORY_KEY = 'thoughts_agents_history_v1';
const loadHistory = () => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY)||'{}'); } catch { return {}; } };
const saveHistory = h => localStorage.setItem(HISTORY_KEY, JSON.stringify(h));

export default function AIAgentsPage() {
  const [activeId,    setActiveId]    = useState('aria');
  const [history,     setHistory]     = useState(loadHistory);
  const [input,       setInput]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const sbTimer     = useRef(null);

  const agent       = AGENTS.find(a => a.id === activeId);
  const msgs        = history[activeId] || [];
  const hasMessages = msgs.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [input]);

  const openSidebar  = () => { clearTimeout(sbTimer.current); setSidebarOpen(true); };
  const closeSidebar = () => { sbTimer.current = setTimeout(() => setSidebarOpen(false), 300); };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const key = getKey();
    if (!key) { setError('Add a Groq API key in Settings → General'); return; }
    setError('');

    const userMsg = { id: uuidv4(), role: 'user', text, ts: Date.now() };
    const newMsgs = [...msgs, userMsg];
    setHistory(h => { const n = { ...h, [activeId]: newMsgs }; saveHistory(n); return n; });
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setLoading(true);

    try {
      const res = await fetch(GROQ_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1024,
          messages: [
            { role: 'system', content: agent.system },
            ...newMsgs.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'API error');
      const aiMsg = { id: uuidv4(), role: 'assistant', text: data.choices?.[0]?.message?.content || '', ts: Date.now() };
      setHistory(h => { const n = { ...h, [activeId]: [...newMsgs, aiMsg] }; saveHistory(n); return n; });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  };

  const clearChat = () => setHistory(h => { const n = { ...h, [activeId]: [] }; saveHistory(n); return n; });
  const handleKey = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  return (
    <div className="aai">
      <div className="aai__bg" />

      {/* ── Header ── */}
      <div className="aai__header">
        <div className="aai__hd-brand">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
            <path d="M18 8a3 3 0 0 1 0 6"/>
            <path d="M22 20c0-2.7-1.8-5-4-6"/>
          </svg>
          AI Agents
        </div>
        {hasMessages && (
          <div className="aai__hd-right">
            <div className="aai__hd-who">
              <SpyAvatar accent={agent.accent} size={22} />
              <span style={{ color: agent.accent }}>{agent.name}</span>
              <span className="aai__hd-role">· {agent.role}</span>
            </div>
            <button className="aai__hd-clear" onClick={clearChat}>New chat</button>
          </div>
        )}
      </div>

      {/* ── Scrollable area (empty welcome OR messages) ── */}
      <div className={`aai__scroll${hasMessages ? ' aai__scroll--chat' : ''}`}>

        {/* Empty state: centered above the input */}
        {!hasMessages && (
          <div className="aai__welcome">
            <p className="aai__welcome-tag" style={{ color: agent.accent }}>
              <SpyAvatar accent={agent.accent} size={16} />
              {agent.name} · {agent.role}
            </p>
            <h2 className="aai__welcome-title">What can I help you with?</h2>
            <p className="aai__welcome-sub">{agent.desc}</p>
            <div className="aai__tags">
              {agent.tags.map(tag => (
                <button key={tag} className="aai__tag" style={{ '--ac': agent.accent }}
                  onClick={() => { setInput(tag + ' — '); textareaRef.current?.focus(); }}>
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {hasMessages && (
          <div className="aai__msgs">
            {msgs.map(m => (
              <div key={m.id} className={`aai__msg aai__msg--${m.role}`}>
                {m.role === 'assistant' && (
                  <div className="aai__msg-av">
                    <SpyAvatar accent={agent.accent} size={30} />
                  </div>
                )}
                <div className="aai__bubble" style={m.role === 'user' ? { background: agent.accent } : {}}>
                  {m.text.split('\n').map((line, i, arr) => (
                    <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
                  ))}
                </div>
              </div>
            ))}

            {loading && (
              <div className="aai__msg aai__msg--assistant">
                <div className="aai__msg-av"><SpyAvatar accent={agent.accent} size={30} /></div>
                <div className="aai__typing">
                  <span style={{ animationDelay: '0ms' }} />
                  <span style={{ animationDelay: '150ms' }} />
                  <span style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {error && <div className="aai__error">{error}</div>}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── Input — always at bottom, ONE instance, ref never lost ── */}
      <div className="aai__bottom">
        <div className="aai__input-shell" style={{ '--ac': agent.accent }}>
          <textarea
            ref={textareaRef}
            className="aai__input"
            placeholder={`Ask ${agent.name} anything…`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            autoFocus
          />
          <button
            className="aai__send"
            onClick={send}
            disabled={!input.trim() || loading}
            style={{ background: agent.accent }}
          >
            {loading
              ? <span className="aai__loader" />
              : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="22" y1="2" x2="11" y2="13" stroke="white" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="white" />
                </svg>
              )
            }
          </button>
        </div>

        {/* Agent chips */}
        <div className="aai__chips">
          {AGENTS.map(a => (
            <button key={a.id}
              className={`aai__chip${activeId === a.id ? ' active' : ''}`}
              style={{ '--ac': a.accent }}
              onClick={() => setActiveId(a.id)}>
              <SpyAvatar accent={a.accent} size={20} />
              <span>{a.name}</span>
            </button>
          ))}
        </div>

        <p className="aai__hint">Enter to send · Shift+Enter for new line</p>
      </div>

      {/* Sidebar trigger */}
      <div className="aai__sb-trigger" onMouseEnter={openSidebar} />

      {/* Sidebar */}
      <div className={`aai__sidebar${sidebarOpen ? ' open' : ''}`}
        onMouseEnter={openSidebar} onMouseLeave={closeSidebar}>
        <p className="aai__sb-title">Conversations</p>
        {AGENTS.map(a => {
          const aMsgs = history[a.id] || [];
          const last  = aMsgs[aMsgs.length - 1];
          const count = Math.floor(aMsgs.length / 2);
          return (
            <button key={a.id}
              className={`aai__sb-row${activeId === a.id ? ' active' : ''}`}
              style={{ '--ac': a.accent }}
              onClick={() => { setActiveId(a.id); setSidebarOpen(false); }}>
              <SpyAvatar accent={a.accent} size={38} />
              <div className="aai__sb-text">
                <div className="aai__sb-nm-row">
                  <span className="aai__sb-nm">{a.name}</span>
                  {count > 0 && <span className="aai__sb-cnt">{count}</span>}
                </div>
                <span className="aai__sb-prev">
                  {last ? last.text.slice(0, 40) + (last.text.length > 40 ? '…' : '') : a.desc}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
