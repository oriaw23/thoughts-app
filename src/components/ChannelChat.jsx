import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ChannelChat.css';

const CHANNELS_KEY = 'mynotion_channels_v1';
const msgKey = id => `foldbase_channel_msgs_${id}`;
const userKey = 'mynotion_user_v1';

function loadChannels() { try { return JSON.parse(localStorage.getItem(CHANNELS_KEY)||'[]'); } catch { return []; } }
function loadMsgs(id)   { try { return JSON.parse(localStorage.getItem(msgKey(id))||'[]'); } catch { return []; } }
function saveMsgs(id,m) { localStorage.setItem(msgKey(id), JSON.stringify(m)); }
function loadUser()     { try { return JSON.parse(localStorage.getItem(userKey)||'{"name":"You"}'); } catch { return {name:'You'}; } }

function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en', { hour:'2-digit', minute:'2-digit' });
}
function fmtDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate()-1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en', { month:'short', day:'numeric' });
}

export default function ChannelChat({ channelId }) {
  const channels = loadChannels();
  const channel  = channels.find(c => c.id === channelId);
  const user     = loadUser();

  const [msgs, setMsgs] = useState(() => loadMsgs(channelId));
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [channelId]);

  const send = () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    const msg = {
      id: uuidv4(),
      text,
      author: user.name || 'You',
      createdAt: new Date().toISOString(),
      isSelf: true,
    };
    const next = [...msgs, msg];
    setMsgs(next);
    saveMsgs(channelId, next);
    setInput('');
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior:'smooth' }), 60);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const deleteMsg = (id) => {
    const next = msgs.filter(m => m.id !== id);
    setMsgs(next); saveMsgs(channelId, next);
  };

  // Group messages by date
  const grouped = [];
  msgs.forEach(m => {
    const date = new Date(m.createdAt).toDateString();
    const last = grouped[grouped.length - 1];
    if (!last || last.date !== date) grouped.push({ date, msgs: [m] });
    else last.msgs.push(m);
  });

  if (!channel) {
    return (
      <div className="ch">
        <div className="ch__empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          <p>Channel not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ch">
      {/* Header */}
      <div className="ch__header">
        <div className="ch__header-left">
          <span className="ch__hash" style={{ color: channel.color }}>#</span>
          <span className="ch__name">{channel.name}</span>
          <span className="ch__count">{msgs.length} messages</span>
        </div>
        <div className="ch__header-right">
          <button className="ch__clear-btn" onClick={() => { setMsgs([]); saveMsgs(channelId,[]); }} title="Clear history">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="ch__msgs">
        {msgs.length === 0 && (
          <div className="ch__welcome">
            <div className="ch__welcome-icon" style={{ background: channel.color+'22', color: channel.color }}>
              #
            </div>
            <h3>Welcome to #{channel.name}</h3>
            <p>This is the beginning of your #{channel.name} channel. Send a message to get started.</p>
          </div>
        )}

        {grouped.map(group => (
          <div key={group.date}>
            <div className="ch__date-sep">
              <span className="ch__date-label">{fmtDate(group.msgs[0].createdAt)}</span>
            </div>
            {group.msgs.map((m, i) => {
              const prev = group.msgs[i-1];
              const collapsed = prev && prev.author === m.author &&
                new Date(m.createdAt) - new Date(prev.createdAt) < 5*60*1000;
              return (
                <div key={m.id} className={`ch__msg${collapsed?' ch__msg--cont':''}`}>
                  {!collapsed && (
                    <div className="ch__msg-av" style={{ background: channel.color }}>
                      {(m.author||'?')[0].toUpperCase()}
                    </div>
                  )}
                  {collapsed && <div className="ch__msg-av-spacer"/>}
                  <div className="ch__msg-body">
                    {!collapsed && (
                      <div className="ch__msg-meta">
                        <span className="ch__msg-author">{m.author}</span>
                        <span className="ch__msg-time">{fmtTime(m.createdAt)}</span>
                      </div>
                    )}
                    <p className="ch__msg-text">{m.text}</p>
                  </div>
                  <button className="ch__msg-del" onClick={() => deleteMsg(m.id)} title="Delete">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="ch__input-area">
        <div className="ch__input-box">
          <textarea
            ref={inputRef}
            className="ch__input"
            placeholder={`Message #${channel.name}`}
            value={input}
            onChange={e => { setInput(e.target.value); e.target.style.height='auto'; e.target.style.height=Math.min(e.target.scrollHeight,140)+'px'; }}
            onKeyDown={handleKey}
            rows={1}
            dir="auto"
          />
          <button className="ch__send" onClick={send} disabled={!input.trim()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p className="ch__input-hint">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
