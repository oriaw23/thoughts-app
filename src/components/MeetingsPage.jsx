import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './MeetingsPage.css';

const KEY      = 'mynotion_meetings_v6';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const getKey   = () => localStorage.getItem('groq_api_key') || '';

const PLATFORMS = [
  { id: 'zoom',   name: 'Zoom',        color: '#2D8CFF', url: 'https://zoom.us/start/videomeeting' },
  { id: 'meet',   name: 'Google Meet', color: '#34A853', url: 'https://meet.new'                   },
  { id: 'teams',  name: 'Teams',       color: '#5059C9', url: 'https://teams.microsoft.com/go'      },
  { id: 'phone',  name: 'Phone call',  color: '#6b7280', url: null                                  },
  { id: 'person', name: 'In Person',   color: '#f59e0b', url: null                                  },
];
const COLORS = ['#3b82f6','#10b981','#8b5cf6','#f59e0b','#ef4444','#06b6d4','#ec4899'];
const DAY_NAMES = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const pad = n => String(n).padStart(2,'0');
const todayStr = () => new Date().toISOString().slice(0,10);
const addMins  = (t, m) => { const [h,mn]=t.split(':').map(Number),tot=h*60+mn+m; return `${pad(Math.floor(tot/60)%24)}:${pad(tot%60)}`; };
const durTotal = a => a.reduce((s,x)=>s+(x.duration||0),0);

function load() { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } }
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

const blankMeeting = (date, color) => ({
  id: uuidv4(),
  title: '',
  date: date || todayStr(),
  time: '09:00',
  platform: 'zoom',
  link: '',
  color: color || COLORS[0],
  participants: [],
  agenda: [
    { id: uuidv4(), topic: 'Opening',    duration: 5,  notes: '', attachments: [] },
    { id: uuidv4(), topic: 'Discussion', duration: 30, notes: '', attachments: [] },
    { id: uuidv4(), topic: 'Wrap-up',    duration: 10, notes: '', attachments: [] },
  ],
  decisions: [],
  todos: [],
  notes: '',
  summary: '',
  createdAt: new Date().toISOString(),
});

// ══════════════════════════════════════════
export default function MeetingsPage() {
  const [meetings,  setMeetings]  = useState(load);
  const [selId,     setSelId]     = useState(null);
  const [selDate,   setSelDate]   = useState(todayStr());
  const [tab,       setTab]       = useState('schedule'); // 'schedule' | 'detail'
  const [joinLink,  setJoinLink]  = useState('');
  const [now,       setNow]       = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const mut = (id, ch) => {
    const n = meetings.map(m => m.id === id ? { ...m, ...ch } : m);
    setMeetings(n); save(n);
  };
  const create = (date) => {
    const m = blankMeeting(date || selDate, COLORS[meetings.length % COLORS.length]);
    const n = [m, ...meetings]; setMeetings(n); save(n);
    setSelId(m.id); setTab('detail');
  };
  const del = id => {
    const n = meetings.filter(m => m.id !== id);
    setMeetings(n); save(n); setSelId(null); setTab('schedule');
  };

  const selected = meetings.find(m => m.id === selId) || null;
  const today    = todayStr();

  // Meetings for selected date
  const dayMeetings = meetings
    .filter(m => m.date === selDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Upcoming (next 7 days, not today)
  const upcoming = meetings
    .filter(m => m.date > today)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  // Time string
  const timeStr = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
  const dateDisplay = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const handleJoin = () => {
    if (joinLink.trim()) {
      window.open(joinLink.trim().startsWith('http') ? joinLink.trim() : 'https://'+joinLink.trim(), '_blank');
      setJoinLink('');
    }
  };

  return (
    <div className="mtg3">

      {/* ── Header ── */}
      <div className="mtg3__header">
        <div className="mtg3__header-left">
          <h1 className="mtg3__title">Meetings</h1>
          <p className="mtg3__date">{dateDisplay}</p>
        </div>
        <div className="mtg3__header-right">
          <div className="mtg3__clock">{timeStr}</div>
          <button className="mtg3__new-btn" onClick={() => create(selDate)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Meeting
          </button>
        </div>
      </div>

      <div className="mtg3__body">

        {/* ── LEFT: Quick actions + schedule ── */}
        <div className="mtg3__left">

          {/* Start a call */}
          <div className="mtg3__call-card">
            <p className="mtg3__call-label">Start a call</p>
            <div className="mtg3__call-btns">
              {PLATFORMS.filter(p => p.url).map(p => (
                <button key={p.id} className="mtg3__call-btn" style={{ '--pc': p.color }}
                  onClick={() => window.open(p.url, '_blank')}>
                  <div className="mtg3__call-icon" style={{ background: p.color }}>
                    {p.id === 'zoom'  && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
                    {p.id === 'meet'  && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>}
                    {p.id === 'teams' && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
                  </div>
                  {p.name}
                </button>
              ))}
            </div>
            <div className="mtg3__join-row">
              <input className="mtg3__join-input" placeholder="Or paste a meeting link to join…"
                value={joinLink} onChange={e => setJoinLink(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleJoin()}
                style={{ direction: 'ltr' }}
              />
              <button className="mtg3__join-btn" onClick={handleJoin} disabled={!joinLink.trim()}>Join</button>
            </div>
          </div>

          {/* Today's schedule */}
          <div className="mtg3__schedule">
            <div className="mtg3__schedule-head">
              <div className="mtg3__schedule-nav">
                <button onClick={() => {
                  const d = new Date(selDate+'T00:00:00'); d.setDate(d.getDate()-1);
                  setSelDate(d.toISOString().slice(0,10));
                }}>‹</button>
                <span className={selDate === today ? 'today' : ''}>
                  {selDate === today ? 'Today' : new Date(selDate+'T00:00:00').toLocaleDateString('en',{weekday:'short',month:'short',day:'numeric'})}
                </span>
                <button onClick={() => {
                  const d = new Date(selDate+'T00:00:00'); d.setDate(d.getDate()+1);
                  setSelDate(d.toISOString().slice(0,10));
                }}>›</button>
              </div>
              <button className="mtg3__today-btn" onClick={() => setSelDate(today)}>Today</button>
            </div>

            {dayMeetings.length === 0 ? (
              <div className="mtg3__no-meetings">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <p>No meetings</p>
                <button onClick={() => create(selDate)}>+ Schedule one</button>
              </div>
            ) : (
              <div className="mtg3__day-list">
                {dayMeetings.map(m => {
                  const dur = durTotal(m.agenda);
                  const end = dur > 0 ? addMins(m.time, dur) : null;
                  const pl  = PLATFORMS.find(p => p.id === m.platform) || PLATFORMS[0];
                  const isActive = selId === m.id;
                  return (
                    <div key={m.id} className={`mtg3__meeting-row${isActive?' active':''}`}
                      style={{ '--mc': m.color }}
                      onClick={() => { setSelId(m.id); setTab('detail'); }}>
                      <div className="mtg3__mr-time">
                        <span className="mtg3__mr-start">{m.time}</span>
                        {end && <span className="mtg3__mr-end">{end}</span>}
                      </div>
                      <div className="mtg3__mr-bar" style={{ background: m.color }}/>
                      <div className="mtg3__mr-body">
                        <p className="mtg3__mr-title">{m.title || 'Untitled meeting'}</p>
                        <div className="mtg3__mr-meta">
                          <span style={{ color: pl.color }}>{pl.name}</span>
                          {dur > 0 && <span>{dur}m</span>}
                          {m.participants.length > 0 && <span>{m.participants.length} people</span>}
                        </div>
                      </div>
                      {m.link && (
                        <button className="mtg3__mr-join" style={{ background: pl.color }}
                          onClick={e => { e.stopPropagation(); window.open(m.link,'_blank'); }}>
                          Join
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <div className="mtg3__upcoming">
              <p className="mtg3__upcoming-label">Upcoming</p>
              {upcoming.map(m => {
                const d = new Date(m.date+'T00:00:00');
                return (
                  <div key={m.id} className="mtg3__up-row" onClick={() => { setSelId(m.id); setSelDate(m.date); setTab('detail'); }}>
                    <div className="mtg3__up-dot" style={{ background: m.color }}/>
                    <div className="mtg3__up-body">
                      <p className="mtg3__up-title">{m.title || 'Untitled'}</p>
                      <p className="mtg3__up-date">{DAY_NAMES[d.getDay()]}, {MONTH_NAMES[d.getMonth()]} {d.getDate()} · {m.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RIGHT: Detail / empty state ── */}
        <div className="mtg3__right">
          {tab === 'detail' && selected ? (
            <MeetingDetail
              meeting={selected}
              onChange={ch => mut(selected.id, ch)}
              onDelete={() => del(selected.id)}
              onClose={() => { setSelId(null); setTab('schedule'); }}
            />
          ) : (
            <div className="mtg3__detail-empty">
              <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" opacity="0.18" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
              <h3>Select a meeting</h3>
              <p>Click a meeting to see its details, or schedule a new one.</p>
              <button onClick={() => create(selDate)}>+ New Meeting</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Attachment chip ───────────────────────────────────────────────────────────
function AttachmentChip({ att, color, onRemove }) {
  if (att.type === 'image') {
    return (
      <div className="mtg3__att-img">
        <img src={att.dataUrl} alt={att.name}/>
        <button className="mtg3__att-rm" onClick={onRemove}>×</button>
      </div>
    );
  }
  const isLink = att.type === 'link';
  return (
    <div className={`mtg3__att-chip${isLink?' mtg3__att-link':' mtg3__att-file'}`} style={{'--ac': color}}>
      {isLink
        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
      }
      {isLink
        ? <a href={att.url} target="_blank" rel="noreferrer">{att.name}</a>
        : <span>{att.name}</span>
      }
      <button className="mtg3__att-rm" onClick={onRemove}>×</button>
    </div>
  );
}

// ── Meeting detail ────────────────────────────────────────────────────────────
function MeetingDetail({ meeting, onChange, onDelete, onClose }) {
  const [dtab,    setDtab]   = useState('agenda');
  const [newP,    setNewP]   = useState('');
  const [newT,    setNewT]   = useState('');
  const [newD,    setNewD]   = useState('');
  const [open,    setOpen]   = useState(null);
  const [loading, setLoad]   = useState(false);
  const [copied,  setCopied] = useState(false);
  const [dragSlot, setDragSlot] = useState(null);

  const pl      = PLATFORMS.find(p => p.id === meeting.platform) || PLATFORMS[0];
  const dur     = durTotal(meeting.agenda);
  const endTime = dur > 0 ? addMins(meeting.time, dur) : null;
  const done    = meeting.todos.filter(t => t.done).length;

  const addP = () => { if(!newP.trim()) return; onChange({participants:[...meeting.participants,{id:uuidv4(),name:newP.trim()}]}); setNewP(''); };
  const addT = () => { if(!newT.trim()) return; onChange({todos:[...meeting.todos,{id:uuidv4(),text:newT.trim(),done:false}]}); setNewT(''); };
  const addD = () => { if(!newD.trim()) return; onChange({decisions:[...meeting.decisions,{id:uuidv4(),text:newD.trim()}]}); setNewD(''); };
  const updA = (id,ch) => onChange({agenda:meeting.agenda.map(a=>a.id===id?{...a,...ch}:a)});
  const delA = id => onChange({agenda:meeting.agenda.filter(a=>a.id!==id)});
  const addA = () => onChange({agenda:[...meeting.agenda,{id:uuidv4(),topic:'',duration:15,notes:'',attachments:[]}]});

  const addAtts = (itemId, newAtts) => {
    const it = meeting.agenda.find(a => a.id === itemId);
    if (!it) return;
    updA(itemId, { attachments: [...(it.attachments||[]), ...newAtts] });
  };
  const handleSlotDrop = (e, itemId) => {
    e.preventDefault(); e.stopPropagation();
    setDragSlot(null);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      files.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = ev => addAtts(itemId, [{ id: uuidv4(), type:'image', name:file.name, dataUrl:ev.target.result }]);
          reader.readAsDataURL(file);
        } else {
          addAtts(itemId, [{ id: uuidv4(), type:'file', name:file.name, size:file.size }]);
        }
      });
      return;
    }
    const uri  = e.dataTransfer.getData('text/uri-list');
    const text = e.dataTransfer.getData('text/plain');
    const raw  = (uri || (text?.match(/^https?:\/\//) ? text : '')).split('\n')[0].trim();
    if (!raw.startsWith('http')) return;
    let name = raw; try { name = new URL(raw).hostname; } catch {}
    addAtts(itemId, [{ id: uuidv4(), type:'link', url:raw, name }]);
  };
  const toggleT = id => onChange({todos:meeting.todos.map(t=>t.id===id?{...t,done:!t.done}:t)});
  const copyLink = () => { navigator.clipboard.writeText(meeting.link); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const genSummary = async () => {
    const key = getKey();
    if (!key) { alert('Add a Groq API key in Settings'); return; }
    setLoad(true);
    const prompt = `Write a professional meeting summary:

Title: ${meeting.title || 'Meeting'}
Date: ${meeting.date} at ${meeting.time}${dur?` (${dur} min)`:''}
Platform: ${pl.name}
Participants: ${meeting.participants.map(p=>p.name).join(', ')||'Not specified'}
Agenda: ${meeting.agenda.map(a=>`${a.topic} (${a.duration}m)${a.notes?': '+a.notes:''}`).join(', ')||'None'}
Notes: ${meeting.notes||'None'}
Decisions: ${meeting.decisions.map(d=>d.text).join('; ')||'None'}
Action items: ${meeting.todos.map(t=>`[${t.done?'done':'pending'}] ${t.text}`).join('; ')||'None'}

Format: ## Summary, ## Key Points, ## Decisions, ## Next Steps. Be concise and professional.`;

    try {
      const res = await fetch(GROQ_URL,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`},body:JSON.stringify({model:'llama-3.3-70b-versatile',messages:[{role:'user',content:prompt}],max_tokens:800})});
      const data = await res.json();
      if(!res.ok) throw new Error(data.error?.message||'Error');
      onChange({summary:data.choices?.[0]?.message?.content||''});
      setDtab('summary');
    } catch(e) { alert('Error: '+e.message); } finally { setLoad(false); }
  };

  return (
    <div className="mtg3__det">
      {/* Header */}
      <div className="mtg3__det-head" style={{ background: `linear-gradient(135deg, color-mix(in srgb,${meeting.color} 8%,var(--bg)) 0%, var(--bg) 60%)`, borderBottomColor: meeting.color+'30' }}>
        <div className="mtg3__det-head-row">
          <button className="mtg3__close-btn" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div className="mtg3__det-colors">
            {COLORS.map(c => <button key={c} className={`mtg3__det-clr${meeting.color===c?' on':''}`} style={{background:c}} onClick={()=>onChange({color:c})}/>)}
          </div>
        </div>

        <input className="mtg3__det-title" value={meeting.title} onChange={e=>onChange({title:e.target.value})} placeholder="Meeting title…"/>

        <div className="mtg3__det-meta">
          <label className="mtg3__det-field">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <input type="date" value={meeting.date} onChange={e=>onChange({date:e.target.value})}/>
          </label>
          <label className="mtg3__det-field">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <input type="time" value={meeting.time} onChange={e=>onChange({time:e.target.value})}/>
          </label>
          {endTime && <span className="mtg3__det-field mtg3__det-field--s">{dur}m · ends {endTime}</span>}
          <div className="mtg3__plat-pick">
            {PLATFORMS.map(p=>(
              <button key={p.id} className={`mtg3__plat-btn${meeting.platform===p.id?' on':''}`}
                style={meeting.platform===p.id?{background:p.color,color:'#fff',borderColor:p.color}:{}}
                onClick={()=>onChange({platform:p.id})} title={p.name}>{p.name.split(' ')[0]}</button>
            ))}
          </div>
        </div>

        {/* Join row */}
        <div className="mtg3__det-link">
          <input value={meeting.link} onChange={e=>onChange({link:e.target.value})} placeholder="Meeting link…" style={{direction:'ltr'}}/>
          {meeting.link && (
            <>
              <button className="mtg3__det-join" style={{background:pl.color}} onClick={()=>window.open(meeting.link,'_blank')}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                Join
              </button>
              <button className="mtg3__det-copy" onClick={copyLink}>{copied?'✓':'Copy'}</button>
            </>
          )}
        </div>

        {/* Participants */}
        <div className="mtg3__det-ppl">
          {meeting.participants.map(p=>(
            <span key={p.id} className="mtg3__pchip" style={{borderColor:meeting.color+'40'}}>
              <span className="mtg3__pav" style={{background:meeting.color}}>{p.name[0].toUpperCase()}</span>
              {p.name}
              <button onClick={()=>onChange({participants:meeting.participants.filter(x=>x.id!==p.id)})}>×</button>
            </span>
          ))}
          <input className="mtg3__padd" placeholder="+ Add participant" value={newP} onChange={e=>setNewP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addP()} onBlur={addP}/>
        </div>
      </div>

      {/* Tabs */}
      <div className="mtg3__det-tabs">
        {[['agenda','Agenda'],['notes','Notes'],['actions',`Actions${meeting.todos.length?` (${done}/${meeting.todos.length})`:''}`],['summary','Summary']].map(([id,l])=>(
          <button key={id} className={`mtg3__dtab${dtab===id?' on':''}`}
            style={dtab===id?{color:meeting.color,borderBottomColor:meeting.color}:{}}
            onClick={()=>setDtab(id)}>{l}
          </button>
        ))}
        <div className="mtg3__dtabs-gap"/>
        <button className="mtg3__ai-btn" onClick={genSummary} disabled={loading}>
          {loading ? '…' : '✨ Summary'}
        </button>
        <button className="mtg3__del-btn" onClick={onDelete} title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>

      {/* Tab content */}
      <div className="mtg3__det-body">
        {/* AGENDA */}
        {dtab==='agenda'&&(
          <div className="mtg3__agenda">
            {meeting.agenda.map((item,idx)=>{
              let cur = meeting.time;
              for (let i=0;i<idx;i++) cur=addMins(cur,meeting.agenda[i].duration||0);
              return (
                <div key={item.id} className="mtg3__slot">
                  <div className="mtg3__slot-tc">
                    <span>{cur}</span>
                    {idx<meeting.agenda.length-1&&<div className="mtg3__slot-line" style={{background:meeting.color+'25'}}/>}
                  </div>
                  <div
                    className={`mtg3__slot-card${open===item.id?' open':''}${dragSlot===item.id?' drag-over':''}`}
                    onDragOver={e=>{e.preventDefault();setDragSlot(item.id);}}
                    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragSlot(null);}}
                    onDrop={e=>handleSlotDrop(e,item.id)}
                  >
                    <div className="mtg3__slot-row" onClick={()=>setOpen(x=>x===item.id?null:item.id)}>
                      <div className="mtg3__slot-dot" style={{background:meeting.color}}/>
                      <input className="mtg3__slot-topic" value={item.topic} onClick={e=>e.stopPropagation()} onChange={e=>updA(item.id,{topic:e.target.value})} placeholder="Topic…"/>
                      <input type="number" className="mtg3__slot-dur" value={item.duration} min={1} max={180} onClick={e=>e.stopPropagation()} onChange={e=>updA(item.id,{duration:parseInt(e.target.value)||5})}/>
                      <span className="mtg3__slot-m">m</span>
                      <button className="mtg3__slot-x" onClick={e=>{e.stopPropagation();delA(item.id);}}>×</button>
                    </div>
                    {open===item.id&&<textarea className="mtg3__slot-notes" placeholder="Notes…" value={item.notes} onChange={e=>updA(item.id,{notes:e.target.value})} rows={3}/>}
                    {item.attachments?.length>0&&(
                      <div className="mtg3__attach-row">
                        {item.attachments.map(att=>(
                          <AttachmentChip key={att.id} att={att} color={meeting.color}
                            onRemove={()=>updA(item.id,{attachments:item.attachments.filter(a=>a.id!==att.id)})}/>
                        ))}
                      </div>
                    )}
                    {dragSlot===item.id&&<div className="mtg3__drop-hint">Drop to attach</div>}
                  </div>
                </div>
              );
            })}
            {endTime&&<div className="mtg3__slot-end-row"><span>{endTime}</span><span className="mtg3__slot-end-tag" style={{color:meeting.color,borderColor:meeting.color+'40',background:meeting.color+'0d'}}>End</span></div>}
            <button className="mtg3__add-slot" onClick={addA} style={{color:meeting.color}}>+ Add topic</button>
          </div>
        )}

        {/* NOTES */}
        {dtab==='notes'&&(
          <div className="mtg3__notes-tab">
            <textarea className="mtg3__notes" placeholder="Notes…" value={meeting.notes} onChange={e=>onChange({notes:e.target.value})} autoFocus/>
            <div className="mtg3__dec-section">
              <p className="mtg3__sec-label">Decisions</p>
              {meeting.decisions.map(d=>(
                <div key={d.id} className="mtg3__dec">
                  <div style={{width:7,height:7,borderRadius:'50%',background:meeting.color,flexShrink:0}}/>
                  <span>{d.text}</span>
                  <button onClick={()=>onChange({decisions:meeting.decisions.filter(x=>x.id!==d.id)})}>×</button>
                </div>
              ))}
              <input className="mtg3__ghost" placeholder="+ Decision" value={newD} onChange={e=>setNewD(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addD()}/>
            </div>
          </div>
        )}

        {/* ACTIONS */}
        {dtab==='actions'&&(
          <div className="mtg3__actions">
            {meeting.todos.length>0&&<div className="mtg3__progress"><div style={{width:`${Math.round(done/meeting.todos.length*100)}%`,background:meeting.color}}/></div>}
            {meeting.todos.map(t=>(
              <div key={t.id} className={`mtg3__todo${t.done?' done':''}`} onClick={()=>toggleT(t.id)}>
                <div className="mtg3__todo-box" style={t.done?{background:meeting.color,borderColor:meeting.color}:{borderColor:'#d1d5db'}}>
                  {t.done&&<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span>{t.text}</span>
                <button onClick={e=>{e.stopPropagation();onChange({todos:meeting.todos.filter(x=>x.id!==t.id)});}}>×</button>
              </div>
            ))}
            <input className="mtg3__ghost" placeholder="+ Action item" value={newT} onChange={e=>setNewT(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addT()}/>
          </div>
        )}

        {/* SUMMARY */}
        {dtab==='summary'&&(
          <div className="mtg3__summary">
            {meeting.summary ? (
              <>
                <div className="mtg3__sum-bar">
                  <span className="mtg3__sum-badge" style={{background:meeting.color+'18',color:meeting.color}}>✨ AI</span>
                  <button className="mtg3__regen" onClick={genSummary} disabled={loading}>{loading?'…':'↻ Regenerate'}</button>
                </div>
                <div className="mtg3__sum-box">
                  {meeting.summary.split('\n').map((l,i)=>{
                    if(l.startsWith('## ')) return <h4 key={i}>{l.slice(3)}</h4>;
                    if(l.startsWith('- ')) return <p key={i} className="mtg3__sum-li">• {l.slice(2)}</p>;
                    if(!l.trim()) return <br key={i}/>;
                    return <p key={i}>{l}</p>;
                  })}
                </div>
              </>
            ) : (
              <div className="mtg3__sum-empty">
                <p>Generate an AI summary from your notes and action items.</p>
                <button style={{background:meeting.color}} onClick={genSummary} disabled={loading}>{loading?'Generating…':'✨ Generate Summary'}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
