import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Groups.css';

const STORAGE_KEY  = 'mynotion_groups_v1';
const GROUP_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0891b2'];

const TABS = [
  { id: 'overview',    icon: '🏠', label: 'Overview'   },
  { id: 'meetings',    icon: '🗓️', label: 'Meetings'   },
  { id: 'whiteboard',  icon: '🎨', label: 'Whiteboard' },
  { id: 'pages',       icon: '📄', label: 'Pages'      },
  { id: 'members',     icon: '👥', label: 'Members'    },
];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function save(g) { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }

export default function Groups({ initialGroupId = null }) {
  const [groups, setGroups] = useState(load);
  const [active, setActive] = useState(() => {
    if (!initialGroupId) return null;
    return load().find(g => g.id === initialGroupId) || null;
  });
  const [tab, setTab]           = useState('overview');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName]   = useState('');
  const [newChanName, setNewChanName] = useState('');
  const [addingChan, setAddingChan]   = useState(false);
  const chanInputRef = useRef(null);
  const inputRef = useRef(null);

  const currentGroup = active ? groups.find(g => g.id === active.id) || active : null;

  const updateGroup = (id, ch) => {
    const updated = groups.map(g => g.id === id ? { ...g, ...ch } : g);
    setGroups(updated); save(updated);
    if (active?.id === id) setActive(prev => ({ ...prev, ...ch }));
  };

  const deleteGroup = (id) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated); save(updated);
    if (active?.id === id) setActive(null);
  };

  const createGroup = () => {
    if (!newName.trim()) { setCreating(false); return; }
    const g = {
      id: uuidv4(), name: newName.trim(),
      color: GROUP_COLORS[groups.length % GROUP_COLORS.length],
      members: [], tasks: [], goals: [], links: [], notes: '',
      events: [], meetings: [], projects: [],
      sharedPages: [], whiteboard: { strokes: [] },
      inviteCode: Math.random().toString(36).slice(2,8).toUpperCase(),
      isNew: true, createdAt: new Date().toISOString(),
    };
    const updated = [...groups, g];
    setGroups(updated); save(updated);
    setActive(g); setNewName(''); setCreating(false);
  };

  const addMember    = (gid, name) => { const g = groups.find(x => x.id === gid); if (!g) return; updateGroup(gid, { members: [...g.members, { id: uuidv4(), name }] }); };
  const removeMember = (gid, mid)  => { const g = groups.find(x => x.id === gid); if (!g) return; updateGroup(gid, { members: g.members.filter(m => m.id !== mid) }); };

  return (
    <div className="grp">

      {/* ── Workspace strip ── */}
      <div className="grp__ws-wrap">
        <div className="grp__ws">
          {groups.map(g => (
            <button key={g.id} className={`grp__ws-btn${active?.id === g.id ? ' active' : ''}`}
              onClick={() => { setActive(g); setTab('members'); }}>
              {active?.id === g.id && <span className="grp__ws-pip" />}
              <div className="grp__ws-av" style={{ background: g.color }}>
                {g.name[0].toUpperCase()}
              </div>
            </button>
          ))}
          {creating ? (
            <input ref={inputRef} autoFocus className="grp__ws-nameinput"
              placeholder="שם..." value={newName}
              onChange={e => setNewName(e.target.value)}
              onBlur={createGroup}
              onKeyDown={e => { if (e.key === 'Enter') createGroup(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }} />
          ) : (
            <button className="grp__ws-add" onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 30); }}>+</button>
          )}
        </div>
      </div>

      {/* ── Navigation panel ── */}
      <div className="grp__panel">
        {currentGroup ? (
          <>
            {/* Group brand */}
            <div className="grp__panel-header">
              <div className="grp__panel-av" style={{ background: currentGroup.color }}>
                {currentGroup.name[0].toUpperCase()}
              </div>
              <div className="grp__panel-brand-info">
                <span className="grp__panel-name">{currentGroup.name}</span>
                <span className="grp__panel-members">{currentGroup.members?.length||0} members</span>
              </div>
            </div>

            <div className="grp__panel-body">

              {/* Overview */}
              <button className={`grp__nav-item${tab==='overview'?' active':''}`} onClick={() => setTab('overview')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                Overview
              </button>

              {/* Meetings section */}
              <div className="grp__nav-section-label">
                <span>Meetings</span>
                <button className="grp__nav-section-add" title="Add meeting"
                  onClick={() => updateGroup(currentGroup.id, { meetings: [...(currentGroup.meetings||[]), { id: uuidv4(), title: 'New meeting', date: new Date().toISOString().slice(0,10), time: '', done: false }] })}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              {/* Real meetings linked to this group */}
              {(() => {
                const today = new Date().toISOString().slice(0,10);
                const real = (() => { try { return (JSON.parse(localStorage.getItem('mynotion_meetings_v6')||'[]')).filter(m=>m.groupId===currentGroup.id).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)); } catch { return []; } })();
                const local = currentGroup.meetings||[];
                const all = [...real, ...local].slice(0, 10);
                if (all.length === 0) return <p className="grp__nav-empty">No meetings yet</p>;
                return all.map(m => (
                  <button key={m.id} className={`grp__nav-item grp__nav-item--meeting${tab===`mtg:${m.id}`?' active':''}`}
                    onClick={() => setTab(`mtg:${m.id}`)}>
                    <span className="grp__nav-meeting-dot" style={{background: m.color||currentGroup.color}}/>
                    <span className="grp__nav-meeting-name">{m.title||'Untitled'}</span>
                    {m.date && <span className="grp__nav-meeting-date">{m.date.slice(5)}</span>}
                  </button>
                ));
              })()}

              {/* Channels section */}
              <div className="grp__nav-section-label">
                <span>Channels</span>
                <button className="grp__nav-section-add" title="Add channel"
                  onClick={() => { setAddingChan(true); setTimeout(() => chanInputRef.current?.focus(), 40); }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>
              {(currentGroup.channels||[]).map(ch => (
                <button key={ch.id} className={`grp__nav-item grp__nav-item--channel${tab===`ch:${ch.id}`?' active':''}`}
                  onClick={() => setTab(`ch:${ch.id}`)}>
                  <span className="grp__nav-hash" style={{color: ch.color||currentGroup.color}}>#</span>
                  <span className="grp__nav-ch-name">{ch.name}</span>
                </button>
              ))}
              {addingChan ? (
                <div className="grp__nav-add-chan">
                  <span className="grp__nav-hash" style={{color:currentGroup.color}}>#</span>
                  <input ref={chanInputRef} className="grp__nav-chan-input" placeholder="channel-name"
                    value={newChanName} onChange={e=>setNewChanName(e.target.value)}
                    onBlur={() => { if (!newChanName.trim()) { setAddingChan(false); return; } updateGroup(currentGroup.id, { channels: [...(currentGroup.channels||[]), { id: uuidv4(), name: newChanName.trim().replace(/\s+/g,'-').toLowerCase(), color: currentGroup.color, messages: [] }] }); setNewChanName(''); setAddingChan(false); }}
                    onKeyDown={e => { if (e.key === 'Escape') { setAddingChan(false); setNewChanName(''); } }}
                  />
                </div>
              ) : (currentGroup.channels||[]).length === 0 && (
                <p className="grp__nav-empty">No channels yet</p>
              )}

            </div>

            <div className="grp__panel-footer">
              <button className="grp__panel-del" onClick={() => deleteGroup(currentGroup.id)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                Delete group
              </button>
            </div>
          </>
        ) : (
          <div className="grp__panel-empty">Select a group</div>
        )}
      </div>

      {/* ── Content area ── */}
      <div className="grp__content">
        {!currentGroup ? (
          <div className="grp__splash">
            <div className="grp__splash-icon">👥</div>
            <h3 className="grp__splash-title">אין קבוצה נבחרת</h3>
            <p className="grp__splash-sub">בחר קבוצה מהרשימה או צור קבוצה חדשה</p>
            <button className="grp__splash-btn" onClick={() => { setCreating(true); setTimeout(() => inputRef.current?.focus(), 30); }}>+ קבוצה חדשה</button>
          </div>
        ) : currentGroup.isNew ? (
          <GroupOnboarding
            group={currentGroup}
            onFinish={() => updateGroup(currentGroup.id, { isNew: false })}
            onAddMember={(name) => addMember(currentGroup.id, name)}
            onUpdate={ch => updateGroup(currentGroup.id, ch)}
          />
        ) : tab.startsWith('ch:') ? (
          <GroupChannelChat
            group={currentGroup}
            channelId={tab.slice(3)}
            onUpdate={ch => updateGroup(currentGroup.id, ch)}
          />
        ) : tab.startsWith('mtg:') ? (
          <GroupMeetingDetail
            group={currentGroup}
            meetingId={tab.slice(4)}
          />
        ) : (
          <GroupContent
            group={currentGroup}
            tab={tab}
            onUpdate={ch => updateGroup(currentGroup.id, ch)}
            onAddMember={(name) => addMember(currentGroup.id, name)}
            onRemoveMember={mid => removeMember(currentGroup.id, mid)}
          />
        )}
      </div>
    </div>
  );
}

// ── Group channel chat ────────────────────────────────────────────────────────
function GroupChannelChat({ group, channelId, onUpdate }) {
  const channel = (group.channels||[]).find(c => c.id === channelId);
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);
  const user = (() => { try { return JSON.parse(localStorage.getItem('mynotion_user_v1')||'{"name":"You"}'); } catch { return {name:'You'}; } })();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [group.channels, channelId]);

  if (!channel) return <div className="grp__page"><div className="grp__page-body"><p className="grp__empty-msg">Channel not found.</p></div></div>;

  const msgs = channel.messages || [];

  const send = () => {
    const text = input.trim(); if (!text) return;
    const msg = { id: uuidv4(), text, author: user.name||'You', createdAt: new Date().toISOString() };
    const nextChannels = (group.channels||[]).map(c => c.id===channelId ? {...c, messages:[...msgs, msg]} : c);
    onUpdate({ channels: nextChannels });
    setInput('');
  };

  const grouped = [];
  msgs.forEach(m => {
    const date = new Date(m.createdAt).toDateString();
    const last = grouped[grouped.length-1];
    if (!last || last.date!==date) grouped.push({date, msgs:[m]});
    else last.msgs.push(m);
  });

  const fmtTime = iso => new Date(iso).toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
  const fmtDate = iso => { const d=new Date(iso),t=new Date(); if(d.toDateString()===t.toDateString()) return 'Today'; const y=new Date(t);y.setDate(t.getDate()-1); if(d.toDateString()===y.toDateString()) return 'Yesterday'; return d.toLocaleDateString('en',{month:'short',day:'numeric'}); };

  return (
    <div className="grp__chat">
      <div className="grp__chat-head">
        <span className="grp__chat-hash" style={{color:channel.color||group.color}}>#</span>
        <span className="grp__chat-name">{channel.name}</span>
        <span className="grp__chat-count">{msgs.length} messages</span>
      </div>
      <div className="grp__chat-msgs">
        {msgs.length===0 && (
          <div className="grp__chat-welcome">
            <div className="grp__chat-welcome-icon" style={{background:(channel.color||group.color)+'22',color:channel.color||group.color}}>#</div>
            <h3>Welcome to #{channel.name}</h3>
            <p>This is the beginning of the #{channel.name} channel.</p>
          </div>
        )}
        {grouped.map(g => (
          <div key={g.date}>
            <div className="grp__chat-date"><span>{fmtDate(g.msgs[0].createdAt)}</span></div>
            {g.msgs.map((m,i) => {
              const prev = g.msgs[i-1];
              const cont = prev && prev.author===m.author && new Date(m.createdAt)-new Date(prev.createdAt)<5*60*1000;
              return (
                <div key={m.id} className={`grp__chat-msg${cont?' cont':''}`}>
                  {!cont
                    ? <div className="grp__chat-av" style={{background:group.color}}>{(m.author||'?')[0].toUpperCase()}</div>
                    : <div className="grp__chat-av-spacer"/>
                  }
                  <div className="grp__chat-body">
                    {!cont && <div className="grp__chat-meta"><span className="grp__chat-author">{m.author}</span><span className="grp__chat-time">{fmtTime(m.createdAt)}</span></div>}
                    <p className="grp__chat-text">{m.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div className="grp__chat-input-area">
        <div className="grp__chat-input-box">
          <textarea className="grp__chat-input" rows={1} placeholder={`Message #${channel.name}`}
            value={input} dir="auto"
            onChange={e=>{setInput(e.target.value);e.target.style.height='auto';e.target.style.height=Math.min(e.target.scrollHeight,120)+'px';}}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}}/>
          <button className="grp__chat-send" onClick={send} disabled={!input.trim()}
            style={{background:group.color}}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Group meeting detail ───────────────────────────────────────────────────────
function GroupMeetingDetail({ group, meetingId }) {
  const local  = (group.meetings||[]).find(m=>m.id===meetingId);
  const global = (() => { try { return (JSON.parse(localStorage.getItem('mynotion_meetings_v6')||'[]')).find(m=>m.id===meetingId); } catch { return null; } })();
  const m = local || global;

  if (!m) return <div className="grp__page"><div className="grp__page-body"><p className="grp__empty-msg">Meeting not found.</p></div></div>;

  const PLATFORMS = [{id:'zoom',name:'Zoom'},{id:'meet',name:'Google Meet'},{id:'teams',name:'Teams'},{id:'phone',name:'Phone call'},{id:'person',name:'In Person'}];
  const pl = PLATFORMS.find(p=>p.id===m.platform)||PLATFORMS[0];

  return (
    <div className="grp__page">
      <div className="grp__header" style={{borderColor:group.color+'55'}}>
        <div className="grp__header-top">
          <div className="grp__header-av" style={{background:m.color||group.color}}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div className="grp__header-info">
            <h2 className="grp__header-name">{m.title||'Untitled meeting'}</h2>
            <div className="grp__header-meta">
              {m.date && <span>{m.date}{m.time&&` · ${m.time}`}</span>}
              <span className="grp__header-dot"/>
              <span>{pl.name}</span>
            </div>
          </div>
          {m.link && (
            <a href={m.link} target="_blank" rel="noreferrer" className="grp__header-btn" style={{background:m.color||group.color,color:'#fff',border:'none',textDecoration:'none'}}>
              Join meeting
            </a>
          )}
        </div>
      </div>
      <div className="grp__page-body">
        {m.notes && (
          <div className="grp__section">
            <div className="grp__section-head">
              <span className="grp__section-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>
              <span className="grp__section-title">Notes</span>
            </div>
            <div className="grp__section-body"><p style={{fontSize:14,lineHeight:1.7,color:'var(--text)',margin:0,whiteSpace:'pre-wrap'}}>{m.notes}</p></div>
          </div>
        )}
        {(m.agenda||[]).length > 0 && (
          <div className="grp__section">
            <div className="grp__section-head"><span className="grp__section-title">Agenda</span></div>
            <div className="grp__section-body">
              {m.agenda.map((a,i) => (
                <div key={a.id||i} className="grp__event-row">
                  <div className="grp__event-bar" style={{background:m.color||group.color}}/>
                  <div className="grp__event-body">
                    <span className="grp__event-title">{a.topic}</span>
                    {a.duration && <span className="grp__event-date">{a.duration} min</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {(m.participants||[]).length > 0 && (
          <div className="grp__section">
            <div className="grp__section-head"><span className="grp__section-title">Participants</span></div>
            <div className="grp__section-body">
              <div className="grp__members-grid">
                {m.participants.map(p => (
                  <div key={p.id} className="grp__member-chip">
                    <div className="grp__member-chip-av" style={{background:m.color||group.color}}>{(p.name||'?')[0].toUpperCase()}</div>
                    <span className="grp__member-chip-name">{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ icon, title, count, action, children }) {
  return (
    <div className="grp__section">
      <div className="grp__section-head">
        <span className="grp__section-icon">{icon}</span>
        <span className="grp__section-title">{title}</span>
        {count != null && count > 0 && <span className="grp__section-count">{count}</span>}
        {action && <div className="grp__section-action">{action}</div>}
      </div>
      <div className="grp__section-body">{children}</div>
    </div>
  );
}

// ── Redesigned GroupContent ───────────────────────────────────────────────────
function GroupContent({ group, tab, onUpdate, onAddMember, onRemoveMember }) {
  const [nameInput, setNameInput] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [projInput, setProjInput] = useState('');
  const [addingProjCol, setAddingProjCol] = useState(null);
  const [showWB, setShowWB] = useState(false);
  const [copied, setCopied] = useState(false);

  const members  = group.members  || [];
  const tasks    = group.tasks    || [];
  const projects = group.projects || [];
  const meetings = group.meetings || [];

  // Real projects from Projects store linked to this group
  const realProjects = (() => {
    try { return (JSON.parse(localStorage.getItem('mynotion_projects_v1')||'[]')).filter(p=>p.groupId===group.id); }
    catch { return []; }
  })();

  // Real meetings from MeetingsPage linked to this group
  const realMeetings = (() => {
    try {
      const today = new Date().toISOString().slice(0,10);
      return (JSON.parse(localStorage.getItem('mynotion_meetings_v6')||'[]'))
        .filter(m=>m.groupId===group.id && m.date>=today)
        .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
        .slice(0,6);
    } catch { return []; }
  })();

  // calendar events from store
  const storeEvents = (() => {
    try { return JSON.parse(localStorage.getItem('mynotion_v3')||'{}').events||[]; }
    catch { return []; }
  })();
  const sharedEvents = storeEvents
    .filter(e => (e.sharedWith||[]).includes(group.id))
    .sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''))
    .slice(0, 6);

  const upcomingMtgs = meetings
    .filter(m => !m.done)
    .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time))
    .slice(0, 5);

  const openTasks   = tasks.filter(t => !t.done);
  const doneTasks   = tasks.filter(t => t.done).length;
  const pct         = tasks.length ? Math.round(doneTasks / tasks.length * 100) : 0;

  const addMember = () => { if (!nameInput.trim()) return; onAddMember(nameInput.trim()); setNameInput(''); };
  const addTask   = () => {
    if (!taskInput.trim()) return;
    onUpdate({ tasks: [...tasks, { id: uuidv4(), text: taskInput.trim(), done: false }] });
    setTaskInput('');
  };
  const toggleTask = id => onUpdate({ tasks: tasks.map(t => t.id===id?{...t,done:!t.done}:t) });
  const removeTask = id => onUpdate({ tasks: tasks.filter(t => t.id!==id) });

  const addProject = (col) => {
    if (!projInput.trim()) return;
    onUpdate({ projects: [...projects, { id: uuidv4(), name: projInput.trim(), col }] });
    setProjInput(''); setAddingProjCol(null);
  };
  const moveProject = (id, col) => onUpdate({ projects: projects.map(p=>p.id===id?{...p,col}:p) });
  const removeProject = id => onUpdate({ projects: projects.filter(p=>p.id!==id) });

  const copyCode = () => {
    navigator.clipboard.writeText(group.inviteCode||'');
    setCopied(true); setTimeout(()=>setCopied(false),2000);
  };

  return (
    <div className="grp__page">

      {/* ── Group header banner ── */}
      <div className="grp__header" style={{ borderColor: group.color+'55' }}>
        <div className="grp__header-top">
          <div className="grp__header-av" style={{ background: group.color }}>
            {group.name[0]?.toUpperCase()}
          </div>
          <div className="grp__header-info">
            <h2 className="grp__header-name">{group.name}</h2>
            <div className="grp__header-meta">
              <span>{members.length} member{members.length!==1?'s':''}</span>
              <span className="grp__header-dot"/>
              <span>{realProjects.length} project{realProjects.length!==1?'s':''}</span>
              <span className="grp__header-dot"/>
              <span>{openTasks.length} open task{openTasks.length!==1?'s':''}</span>
            </div>
          </div>
          <div className="grp__header-actions">
            <button className="grp__header-btn" onClick={() => setShowWB(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 12l2 2 4-4"/></svg>
              Whiteboard
            </button>
            <button className="grp__header-btn grp__header-btn--code" onClick={copyCode}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
              {copied ? 'Copied!' : `Invite: ${group.inviteCode||'—'}`}
            </button>
          </div>
        </div>
        {/* Member avatars row */}
        {members.length > 0 && (
          <div className="grp__header-members">
            <div className="grp__header-avs">
              {members.slice(0,12).map(m => (
                <div key={m.id} className="grp__header-mav" style={{background:group.color}} title={m.name}>
                  {m.name[0]?.toUpperCase()}
                </div>
              ))}
              {members.length > 12 && (
                <div className="grp__header-mav grp__header-mav--more">+{members.length-12}</div>
              )}
            </div>
            <div className="grp__header-add-member">
              <input className="grp__header-name-input" placeholder="Add member…"
                value={nameInput} onChange={e=>setNameInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addMember()} />
              <button className="grp__header-add-btn" style={{background:group.color}} onClick={addMember}>+</button>
            </div>
          </div>
        )}
        {members.length === 0 && (
          <div className="grp__header-members">
            <div className="grp__header-add-member">
              <input className="grp__header-name-input" placeholder="Add first member…"
                value={nameInput} onChange={e=>setNameInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addMember()} />
              <button className="grp__header-add-btn" style={{background:group.color}} onClick={addMember}>+</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Scrollable body ── */}
      <div className="grp__page-body">

        {/* ── 1. Projects (from real Projects store) ── */}
        <Section icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
        } title="Projects" count={realProjects.length}>
          {realProjects.length === 0
            ? <p className="grp__empty-msg">No projects linked to this group yet. Open a project and set its Group to <strong>{group.name}</strong>.</p>
            : <div className="grp__proj-list">
                {realProjects.map(p => {
                  const STATUSES = [{id:'planning',label:'Planning'},{id:'active',label:'Active'},{id:'on-hold',label:'On Hold'},{id:'completed',label:'Completed'}];
                  const st = STATUSES.find(s=>s.id===p.status)||STATUSES[0];
                  return (
                    <div key={p.id} className="grp__proj-item">
                      <div className="grp__proj-item-icon" style={{background:p.color+'22',color:p.color}}>
                        {p.icon||'🗂️'}
                      </div>
                      <div className="grp__proj-item-body">
                        <span className="grp__proj-item-name">{p.name}</span>
                        {p.description && <span className="grp__proj-item-desc">{p.description}</span>}
                      </div>
                      <span className="grp__proj-item-status" style={{color:p.color,background:p.color+'18'}}>
                        {st.label}
                      </span>
                      {p.progress > 0 && (
                        <div className="grp__proj-item-prog">
                          <div style={{width:p.progress+'%',background:p.color,height:'100%',borderRadius:2}}/>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </Section>

        {/* ── 3. Upcoming Meetings (from real Meetings store) ── */}
        <Section icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
        } title="Upcoming Meetings" count={realMeetings.length}>
          {realMeetings.length === 0
            ? <p className="grp__empty-msg">No upcoming meetings. Open a meeting and set its Group to <strong>{group.name}</strong>.</p>
            : <div className="grp__events-list">
                {realMeetings.map(m => {
                  const PLATFORMS = [{id:'zoom',name:'Zoom'},{id:'meet',name:'Google Meet'},{id:'teams',name:'Teams'},{id:'phone',name:'Phone'},{id:'person',name:'In Person'}];
                  const pl = PLATFORMS.find(p=>p.id===m.platform)||PLATFORMS[0];
                  return (
                    <div key={m.id} className="grp__event-row">
                      <div className="grp__event-bar" style={{background:m.color||group.color}}/>
                      <div className="grp__event-body">
                        <span className="grp__event-title">{m.title||'Untitled meeting'}</span>
                        <span className="grp__event-date">
                          {m.date}{m.time&&` · ${m.time}`} · {pl.name}
                        </span>
                      </div>
                      {m.link && (
                        <a href={m.link} target="_blank" rel="noreferrer" className="grp__event-join" style={{background:m.color||group.color}}>
                          Join
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </Section>

        {/* ── 4. Tasks ── */}
        <Section icon={
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
        } title="Tasks" count={openTasks.length}
          action={
            <div className="grp__add-row">
              <input className="grp__inline-input" placeholder="Add task…"
                value={taskInput} onChange={e=>setTaskInput(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&addTask()} />
              <button className="grp__inline-btn" style={{background:group.color}} onClick={addTask}>Add</button>
            </div>
          }>
          {tasks.length > 0 && (
            <div className="grp__tasks-progress">
              <div className="grp__tasks-bar-track">
                <div className="grp__tasks-bar-fill" style={{width:pct+'%',background:group.color}}/>
              </div>
              <span className="grp__tasks-pct">{doneTasks}/{tasks.length} done</span>
            </div>
          )}
          {tasks.length===0
            ? <p className="grp__empty-msg">No tasks yet. Add one above.</p>
            : <div className="grp__tasks-list">
                {tasks.map(t => (
                  <div key={t.id} className={`grp__task-row${t.done?' done':''}`} onClick={()=>toggleTask(t.id)}>
                    <div className="grp__task-check" style={t.done?{background:group.color,borderColor:group.color}:{}}>
                      {t.done&&<svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <span className="grp__task-text">{t.text}</span>
                    <button className="grp__task-del" onClick={e=>{e.stopPropagation();removeTask(t.id);}}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                ))}
              </div>
          }
        </Section>

      </div>

      {/* ── Whiteboard overlay ── */}
      {showWB && (
        <div className="grp__wb-overlay">
          <div className="grp__wb-overlay-head">
            <span>Whiteboard — {group.name}</span>
            <button className="grp__wb-overlay-close" onClick={()=>setShowWB(false)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <GroupWhiteboard group={group} onUpdate={onUpdate}/>
        </div>
      )}
    </div>
  );
}

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '';
  return new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' });
}

// ── Overview tab (replaces Calendar) ─────────────────────────────────────────
function GroupCalendar({ group }) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const storeEvents = (() => {
    try { return JSON.parse(localStorage.getItem('mynotion_v3') || '{}').events || []; }
    catch { return []; }
  })();

  const allMeetings = (() => {
    try { return JSON.parse(localStorage.getItem('mynotion_meetings_v6') || '[]'); }
    catch { return []; }
  })();

  const sharedEvents   = storeEvents.filter(e => (e.sharedWith || []).includes(group.id)).sort((a,b)=>(a.startDate||'').localeCompare(b.startDate||''));
  const upcomingMtgs   = allMeetings.filter(m => m.date >= todayStr).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,5);
  const pendingTasks   = (group.tasks   || []).filter(t => !t.done);
  const goals          = (group.goals   || []).slice(0,4);
  const projects       = (group.projects|| []);
  const planningCount  = projects.filter(p=>p.col==='Planning').length;
  const wipCount       = projects.filter(p=>p.col==='In Progress').length;
  const doneCount      = projects.filter(p=>p.col==='Done').length;

  return (
    <div className="grp__overview">

      {/* ── Row 1: Upcoming Meetings (full width) ── */}
      <OverviewSection icon="🗓️" title="Upcoming Meetings" count={upcomingMtgs.length} hint="from your Meetings page">
        {upcomingMtgs.length === 0
          ? <p className="grp__ov-empty">No upcoming meetings scheduled.</p>
          : <div className="grp__ov-mtg-list">
              {upcomingMtgs.map(m => (
                <div key={m.id} className="grp__ov-mtg-row">
                  <div className="grp__ov-mtg-dot" style={{ background: m.color || group.color }} />
                  <div className="grp__ov-mtg-body">
                    <span className="grp__ov-mtg-title">{m.title || 'Untitled meeting'}</span>
                    <span className="grp__ov-mtg-date">{fmtDate(m.date)}{m.time && ` · ${m.time}`}</span>
                  </div>
                  {m.link && (
                    <a href={m.link} target="_blank" rel="noreferrer" className="grp__ov-mtg-join" style={{ background: group.color }}>Join</a>
                  )}
                </div>
              ))}
            </div>
        }
      </OverviewSection>

      {/* ── Row 2: Calendar + Tasks side by side ── */}
      <div className="grp__ov-row2">
        <OverviewSection icon="📅" title="Shared Calendar" count={sharedEvents.length} hint="share from Calendar → Share with">
          {sharedEvents.length === 0
            ? <p className="grp__ov-empty">Open Calendar, click an event and share it with <strong>{group.name}</strong>.</p>
            : sharedEvents.slice(0,5).map(e => (
                <div key={e.id} className="grp__ov-event-row">
                  <div className="grp__ov-event-bar" style={{ background: e.color || group.color }} />
                  <div>
                    <p className="grp__ov-event-title">{e.title}</p>
                    <p className="grp__ov-event-date">{fmtDate(e.startDate?.slice(0,10))}{!e.allDay && e.startTime && ` · ${e.startTime}`}</p>
                  </div>
                </div>
              ))
          }
        </OverviewSection>

        <OverviewSection icon="✅" title="Open Tasks" count={pendingTasks.length}>
          {pendingTasks.length === 0
            ? <p className="grp__ov-empty">No open tasks. Add some in the Tasks tab.</p>
            : pendingTasks.slice(0,5).map(t => (
                <div key={t.id} className="grp__ov-task-row">
                  <div className="grp__ov-task-dot" style={{ borderColor: group.color }} />
                  <span className="grp__ov-task-text">{t.text}</span>
                </div>
              ))
          }
        </OverviewSection>
      </div>

      {/* ── Row 3: Goals + Projects side by side ── */}
      <div className="grp__ov-row2">
        <OverviewSection icon="🎯" title="Goals" count={goals.length}>
          {goals.length === 0
            ? <p className="grp__ov-empty">No goals yet.</p>
            : goals.map((g,i) => (
                <div key={g.id} className="grp__ov-goal-row">
                  <span className="grp__ov-goal-num" style={{ color: group.color }}>{i+1}</span>
                  <span className="grp__ov-goal-text">{g.text}</span>
                </div>
              ))
          }
        </OverviewSection>

        <OverviewSection icon="🚀" title="Projects" count={projects.length}>
          {projects.length === 0
            ? <p className="grp__ov-empty">No projects yet.</p>
            : <>
                <div className="grp__ov-proj-stats">
                  <div className="grp__ov-proj-stat">
                    <span className="grp__ov-proj-stat-n">{planningCount}</span>
                    <span className="grp__ov-proj-stat-l">Planning</span>
                  </div>
                  <div className="grp__ov-proj-stat">
                    <span className="grp__ov-proj-stat-n" style={{ color: group.color }}>{wipCount}</span>
                    <span className="grp__ov-proj-stat-l">In Progress</span>
                  </div>
                  <div className="grp__ov-proj-stat">
                    <span className="grp__ov-proj-stat-n">{doneCount}</span>
                    <span className="grp__ov-proj-stat-l">Done</span>
                  </div>
                </div>
                {projects.slice(0,4).map(p => (
                  <div key={p.id} className="grp__ov-proj-row">
                    <span className={`grp__ov-proj-badge grp__ov-proj-badge--${p.col.toLowerCase().replace(' ','-')}`}>{p.col}</span>
                    <span className="grp__ov-proj-name">{p.name}</span>
                  </div>
                ))}
              </>
          }
        </OverviewSection>
      </div>

    </div>
  );
}

function OverviewSection({ icon, title, count, hint, children }) {
  return (
    <div className="grp__ov-section">
      <div className="grp__ov-section-head">
        <span className="grp__ov-section-icon">{icon}</span>
        <span className="grp__ov-section-title">{title}</span>
        {count > 0 && <span className="grp__ov-section-count">{count}</span>}
        {hint && <span className="grp__ov-section-hint">{hint}</span>}
      </div>
      <div className="grp__ov-section-body">{children}</div>
    </div>
  );
}

// ── Meetings tab ──────────────────────────────────────────────────────────────
function GroupMeetings({ group, onUpdate }) {
  const meetings = group.meetings || [];
  const [form, setForm] = useState({ show: false, title: '', date: '', time: '', notes: '' });

  const save = () => {
    if (!form.title.trim()) return;
    onUpdate({ meetings: [...meetings, { id: uuidv4(), title: form.title, date: form.date, time: form.time, notes: form.notes, done: false }] });
    setForm({ show: false, title: '', date: '', time: '', notes: '' });
  };

  const toggle = id => onUpdate({ meetings: meetings.map(m => m.id === id ? { ...m, done: !m.done } : m) });
  const remove = id => onUpdate({ meetings: meetings.filter(m => m.id !== id) });

  const upcoming = meetings.filter(m => !m.done).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));
  const past     = meetings.filter(m => m.done);

  return (
    <div className="grp__meetings">
      <div className="grp__meetings-head">
        <button className="grp__meetings-add-btn" style={{ background: group.color }}
          onClick={() => setForm(f => ({ ...f, show: true }))}>
          + Schedule Meeting
        </button>
      </div>

      {form.show && (
        <div className="grp__meeting-form">
          <input className="grp__mf-input" placeholder="Meeting title…" autoFocus
            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          <div className="grp__mf-row">
            <input className="grp__mf-input" type="date" value={form.date}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            <input className="grp__mf-input" type="time" value={form.time}
              onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
          </div>
          <textarea className="grp__mf-notes" placeholder="Notes…" rows={2}
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <div className="grp__mf-actions">
            <button className="grp__mf-cancel" onClick={() => setForm(f => ({ ...f, show: false }))}>Cancel</button>
            <button className="grp__mf-save" style={{ background: group.color }} onClick={save}>Save</button>
          </div>
        </div>
      )}

      {upcoming.length === 0 && !form.show && (
        <div className="grp__empty-state">
          <span>🗓️</span><p>No meetings scheduled yet.</p>
        </div>
      )}

      {upcoming.map(m => (
        <div key={m.id} className="grp__meeting-row">
          <div className="grp__meeting-dot" style={{ background: group.color }} />
          <div className="grp__meeting-body">
            <p className="grp__meeting-title">{m.title}</p>
            {(m.date || m.time) && (
              <p className="grp__meeting-meta">{m.date} {m.time && `· ${m.time}`}</p>
            )}
            {m.notes && <p className="grp__meeting-notes">{m.notes}</p>}
          </div>
          <button className="grp__meeting-done" onClick={() => toggle(m.id)} title="Mark done">✓</button>
          <button className="grp__meeting-del" onClick={() => remove(m.id)}>✕</button>
        </div>
      ))}

      {past.length > 0 && (
        <>
          <p className="grp__meetings-past-label">Past</p>
          {past.map(m => (
            <div key={m.id} className="grp__meeting-row grp__meeting-row--past">
              <div className="grp__meeting-dot" />
              <div className="grp__meeting-body">
                <p className="grp__meeting-title">{m.title}</p>
                {m.date && <p className="grp__meeting-meta">{m.date}</p>}
              </div>
              <button className="grp__meeting-del" onClick={() => remove(m.id)}>✕</button>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ── Projects tab ──────────────────────────────────────────────────────────────
const PROJECT_COLS = ['Planning', 'In Progress', 'Done'];

function GroupProjects({ group, onUpdate }) {
  const projects = group.projects || [];
  const [adding, setAdding] = useState(null);
  const [input,  setInput]  = useState('');

  const addProject = (col) => {
    if (!input.trim()) return;
    onUpdate({ projects: [...projects, { id: uuidv4(), name: input.trim(), col, tasks: [] }] });
    setInput(''); setAdding(null);
  };

  const moveProject = (id, col) => onUpdate({ projects: projects.map(p => p.id === id ? { ...p, col } : p) });
  const removeProject = id => onUpdate({ projects: projects.filter(p => p.id !== id) });

  return (
    <div className="grp__projects">
      {PROJECT_COLS.map(col => {
        const colProjects = projects.filter(p => p.col === col);
        return (
          <div key={col} className="grp__proj-col">
            <div className="grp__proj-col-head">
              <span className="grp__proj-col-name">{col}</span>
              <span className="grp__proj-col-count">{colProjects.length}</span>
            </div>
            {colProjects.map(p => (
              <div key={p.id} className="grp__proj-card">
                <p className="grp__proj-card-name">{p.name}</p>
                <div className="grp__proj-card-actions">
                  {PROJECT_COLS.filter(c => c !== col).map(c => (
                    <button key={c} className="grp__proj-move" onClick={() => moveProject(p.id, c)}
                      title={`Move to ${c}`}>→ {c}</button>
                  ))}
                  <button className="grp__proj-del" onClick={() => removeProject(p.id)}>✕</button>
                </div>
              </div>
            ))}
            {adding === col ? (
              <div className="grp__proj-add-form">
                <input autoFocus className="grp__proj-input" placeholder="Project name…"
                  value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addProject(col); if (e.key === 'Escape') setAdding(null); }} />
                <button className="grp__proj-add-save" style={{ background: group.color }} onClick={() => addProject(col)}>Add</button>
              </div>
            ) : (
              <button className="grp__proj-add-btn" onClick={() => { setAdding(col); setInput(''); }}>+ Add project</button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────
function GroupTasks({ group, onUpdate }) {
  const tasks = group.tasks || [];
  const [input, setInput] = useState('');

  const add = () => {
    if (!input.trim()) return;
    onUpdate({ tasks: [...tasks, { id: uuidv4(), text: input.trim(), done: false }] });
    setInput('');
  };
  const toggle = id => onUpdate({ tasks: tasks.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  const remove = id => onUpdate({ tasks: tasks.filter(t => t.id !== id) });

  const done   = tasks.filter(t => t.done).length;
  const pct    = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  return (
    <div className="grp__tasks">
      <div className="grp__tasks-add">
        <input className="grp__cnt-input" placeholder="Add task…" value={input}
          onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} autoFocus />
        <button className="grp__cnt-add-btn" style={{ background: group.color }} onClick={add}>Add</button>
      </div>
      {tasks.length > 0 && (
        <div className="grp__tasks-progress">
          <div className="grp__tasks-bar">
            <div style={{ width: pct + '%', background: group.color }} />
          </div>
          <span>{done}/{tasks.length}</span>
        </div>
      )}
      {tasks.length === 0 && <div className="grp__empty-state"><span>✅</span><p>No tasks yet.</p></div>}
      {tasks.map(t => (
        <div key={t.id} className={`grp__cnt-item grp__cnt-task${t.done?' done':''}`} onClick={() => toggle(t.id)}>
          <div className="grp__cnt-check" style={t.done ? { background: group.color, borderColor: group.color } : {}}>
            {t.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
          </div>
          <span className="grp__cnt-item-text" style={t.done ? { textDecoration: 'line-through', opacity: 0.45 } : {}}>{t.text}</span>
          <button className="grp__cnt-item-del" onClick={e => { e.stopPropagation(); remove(t.id); }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── Members tab ───────────────────────────────────────────────────────────────
function GroupMembers({ group, onUpdate, onAddMember, onRemoveMember }) {
  const [nameInput, setNameInput] = useState('');
  const [copied, setCopied] = useState(false);
  const code = group.inviteCode || '——';

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const add = () => {
    if (!nameInput.trim()) return;
    onAddMember(nameInput.trim());
    setNameInput('');
  };

  return (
    <div className="grp__members-tab">
      {/* Invite code card */}
      <div className="grp__invite-card">
        <div className="grp__invite-card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          <h3>Invite to group</h3>
        </div>
        <p className="grp__invite-hint">Share this code with people you want to invite</p>
        <div className="grp__invite-code-row">
          <span className="grp__invite-code" style={{ borderColor: group.color + '44', color: group.color }}>{code}</span>
          <button className="grp__invite-copy" style={{ background: copied ? '#10b981' : group.color }} onClick={copyCode}>
            {copied ? (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!</>
            ) : (
              <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy code</>
            )}
          </button>
        </div>
        {/* Manual add */}
        <div className="grp__invite-add-row">
          <input className="grp__invite-name-input" placeholder="Or type a name to add…"
            value={nameInput} onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()} />
          <button className="grp__invite-add-btn" style={{ background: group.color }} onClick={add}>Add</button>
        </div>
      </div>

      {/* Member list */}
      <div className="grp__members-list">
        <p className="grp__members-list-title">Members ({(group.members||[]).length})</p>
        {(group.members||[]).length === 0 ? (
          <div className="grp__empty-state"><span>👥</span><p>No members yet. Invite someone!</p></div>
        ) : (group.members||[]).map(m => (
          <div key={m.id} className="grp__member-row">
            <div className="grp__member-av" style={{ background: group.color }}>{m.name[0]?.toUpperCase()}</div>
            <span className="grp__member-name">{m.name}</span>
            <button className="grp__member-del" onClick={() => onRemoveMember(m.id)}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Whiteboard tab ─────────────────────────────────────────────────────────────
const WB_COLORS = ['#0f172a','#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#ffffff'];

function GroupWhiteboard({ group, onUpdate }) {
  const canvasRef  = useRef(null);
  const drawing    = useRef(false);
  const current    = useRef(null); // current stroke being drawn
  const [tool,     setTool]     = useState('pen');
  const [color,    setColor]    = useState('#0f172a');
  const [size,     setSize]     = useState(3);
  const strokes = group.whiteboard?.strokes || [];

  // Redraw canvas whenever strokes change
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Dot grid
    ctx.fillStyle = 'rgba(0,0,0,.06)';
    for (let x = 20; x < canvas.width; x += 24)
      for (let y = 20; y < canvas.height; y += 24) {
        ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI*2); ctx.fill();
      }
    // Strokes
    strokes.forEach(s => {
      if (!s.pts || s.pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(s.pts[0].x, s.pts[0].y);
      s.pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = s.tool === 'eraser' ? '#fafafa' : s.color;
      ctx.lineWidth   = s.tool === 'eraser' ? s.size * 4 : s.size;
      ctx.lineCap     = 'round'; ctx.lineJoin = 'round';
      ctx.stroke();
    });
  }, [strokes]);

  useEffect(() => { redraw(); }, [redraw]);

  // Resize canvas to container
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      redraw();
    });
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [redraw]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    const src = e.touches ? e.touches[0] : e;
    return { x: src.clientX - r.left, y: src.clientY - r.top };
  };

  const onDown = (e) => {
    e.preventDefault();
    drawing.current = true;
    const p = pos(e);
    current.current = { tool, color, size, pts: [p] };
    // Draw first dot
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(p.x, p.y, (tool === 'eraser' ? size * 2 : size / 2), 0, Math.PI*2);
    ctx.fillStyle = tool === 'eraser' ? '#fafafa' : color;
    ctx.fill();
  };

  const onMove = (e) => {
    if (!drawing.current || !current.current) return;
    e.preventDefault();
    const p = pos(e);
    const s = current.current;
    s.pts.push(p);
    // Live draw
    const ctx = canvasRef.current.getContext('2d');
    const pts = s.pts;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[pts.length-2].x, pts[pts.length-2].y);
    ctx.lineTo(p.x, p.y);
    ctx.strokeStyle = tool === 'eraser' ? '#fafafa' : color;
    ctx.lineWidth   = tool === 'eraser' ? size * 4 : size;
    ctx.lineCap     = 'round'; ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const onUp = () => {
    if (!drawing.current || !current.current) return;
    drawing.current = false;
    if (current.current.pts.length > 1) {
      const next = [...strokes, current.current];
      onUpdate({ whiteboard: { strokes: next } });
    }
    current.current = null;
  };

  const clearBoard = () => onUpdate({ whiteboard: { strokes: [] } });
  const undo = () => {
    if (!strokes.length) return;
    onUpdate({ whiteboard: { strokes: strokes.slice(0, -1) } });
  };

  return (
    <div className="grp__wb">
      {/* Toolbar */}
      <div className="grp__wb-toolbar">
        <div className="grp__wb-tools">
          <button className={`grp__wb-tool${tool==='pen'?' active':''}`} onClick={() => setTool('pen')} title="Pen">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="12" cy="12" r="2"/></svg>
          </button>
          <button className={`grp__wb-tool${tool==='eraser'?' active':''}`} onClick={() => setTool('eraser')} title="Eraser">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M20 20H7L3 16l11-11 6 6-2.5 2.5"/><path d="M6.0001 17.9999l5-5"/></svg>
          </button>
        </div>
        <div className="grp__wb-sep"/>
        <div className="grp__wb-colors">
          {WB_COLORS.map(c => (
            <button key={c} className={`grp__wb-color${color===c?' active':''}`}
              style={{ background: c, outline: color===c ? `2px solid ${group.color}` : 'none' }}
              onClick={() => { setColor(c); setTool('pen'); }} />
          ))}
        </div>
        <div className="grp__wb-sep"/>
        <div className="grp__wb-sizes">
          {[2,4,8,14].map(s => (
            <button key={s} className={`grp__wb-size${size===s?' active':''}`} onClick={() => setSize(s)} title={`Size ${s}`}>
              <div style={{ width: s*2, height: s*2, background: 'currentColor', borderRadius: '50%' }}/>
            </button>
          ))}
        </div>
        <div className="grp__wb-sep"/>
        <button className="grp__wb-action" onClick={undo} title="Undo">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 2.74-6.74L3 13"/></svg>
        </button>
        <button className="grp__wb-action grp__wb-action--danger" onClick={clearBoard} title="Clear all">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="grp__wb-canvas"
        style={{ cursor: tool === 'eraser' ? 'cell' : 'crosshair' }}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      />
    </div>
  );
}

// ── Pages tab ─────────────────────────────────────────────────────────────────
function GroupPages({ group, onUpdate }) {
  const pages = group.sharedPages || [];
  const [sel, setSel] = useState(null); // selected page id
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  const createPage = () => {
    if (!newTitle.trim()) return;
    const p = { id: uuidv4(), title: newTitle.trim(), content: '', updatedAt: new Date().toISOString() };
    onUpdate({ sharedPages: [...pages, p] });
    setNewTitle(''); setAdding(false); setSel(p.id);
  };

  const updatePage = (id, patch) => {
    onUpdate({ sharedPages: pages.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p) });
  };

  const deletePage = (id) => {
    onUpdate({ sharedPages: pages.filter(p => p.id !== id) });
    if (sel === id) setSel(null);
  };

  const selPage = pages.find(p => p.id === sel);

  return (
    <div className="grp__pages">
      {/* List */}
      <div className="grp__pages-list">
        <div className="grp__pages-list-head">
          <span>Shared Pages</span>
          <button className="grp__pages-new-btn" style={{ background: group.color }} onClick={() => setAdding(true)}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        {adding && (
          <div className="grp__pages-new-row">
            <input autoFocus className="grp__pages-new-input" placeholder="Page title…"
              value={newTitle} onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter') createPage(); if (e.key==='Escape') setAdding(false); }}
              onBlur={() => { if (!newTitle.trim()) setAdding(false); }}
            />
          </div>
        )}
        {pages.length === 0 && !adding && (
          <div className="grp__pages-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity=".3"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <p>No shared pages yet</p>
            <button onClick={() => setAdding(true)} style={{ color: group.color }}>Create the first page</button>
          </div>
        )}
        {pages.map(p => (
          <button key={p.id} className={`grp__pages-item${sel===p.id?' active':''}`}
            style={sel===p.id ? { borderColor: group.color + '66', background: group.color + '08' } : {}}
            onClick={() => setSel(p.id)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ flexShrink: 0, color: sel===p.id ? group.color : 'var(--text-3)' }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <span className="grp__pages-item-title">{p.title}</span>
            <button className="grp__pages-item-del" onClick={e => { e.stopPropagation(); deletePage(p.id); }}>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </button>
        ))}
      </div>

      {/* Editor */}
      <div className="grp__pages-editor">
        {!selPage ? (
          <div className="grp__pages-editor-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity=".12"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <p>Select a page or create a new one</p>
          </div>
        ) : (
          <>
            <input
              className="grp__pages-editor-title"
              value={selPage.title}
              dir="auto"
              placeholder="Page title…"
              onChange={e => updatePage(selPage.id, { title: e.target.value })}
            />
            <div className="grp__pages-editor-meta">
              All members can view and edit · Last updated {new Date(selPage.updatedAt).toLocaleString()}
            </div>
            <textarea
              className="grp__pages-editor-body"
              dir="auto"
              placeholder="Start writing… everyone in the group will see this."
              value={selPage.content}
              onChange={e => updatePage(selPage.id, { content: e.target.value })}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── Onboarding ────────────────────────────────────────────────────────────────
function GroupOnboarding({ group, onFinish, onAddMember, onUpdate }) {
  const [step, setStep]         = useState(0);
  const [memberInput, setMemberInput] = useState('');
  const [taskInput, setTaskInput]     = useState('');
  const [goalInput, setGoalInput]     = useState('');

  const STEPS = [
    { id: 'welcome', label: 'ברוך הבא' },
    { id: 'members', label: 'חברים' },
    { id: 'tasks',   label: 'משימות' },
    { id: 'goals',   label: 'מטרות' },
  ];

  const addMember = () => { if (!memberInput.trim()) return; onAddMember(memberInput.trim()); setMemberInput(''); };
  const addTask   = () => { if (!taskInput.trim()) return; onUpdate({ tasks: [...(group.tasks||[]), { id: uuidv4(), text: taskInput.trim(), done: false }] }); setTaskInput(''); };
  const addGoal   = () => { if (!goalInput.trim()) return; onUpdate({ goals: [...(group.goals||[]), { id: uuidv4(), text: goalInput.trim() }] }); setGoalInput(''); };

  return (
    <div className="grp__ob">
      <div className="grp__ob-steps">
        {STEPS.map((s, i) => (
          <div key={s.id} className={`grp__ob-step${i<=step?' done':''}${i===step?' active':''}`}>
            <div className="grp__ob-dot" style={i<=step ? { background: group.color } : {}}>
              {i < step ? <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg> : i+1}
            </div>
            <span className="grp__ob-step-label">{s.label}</span>
            {i < STEPS.length-1 && <div className="grp__ob-line" style={i<step?{background:group.color}:{}} />}
          </div>
        ))}
      </div>

      <div className="grp__ob-body">
        {step === 0 && (
          <div className="grp__ob-card grp__ob-welcome">
            <div className="grp__ob-av" style={{ background: group.color }}>{group.name[0].toUpperCase()}</div>
            <h1 className="grp__ob-title">ברוך הבא ל-{group.name} 🎉</h1>
            <p className="grp__ob-sub">צרת קבוצה חדשה! עכשיו נגדיר אותה ביחד.</p>
            <button className="grp__ob-btn" style={{ background: group.color }} onClick={() => setStep(1)}>בוא נתחיל →</button>
          </div>
        )}

        {step === 1 && (
          <div className="grp__ob-card">
            <div className="grp__ob-icon">👥</div>
            <h2 className="grp__ob-title">הוסף חברים לקבוצה</h2>
            <p className="grp__ob-sub">מי נמצא בקבוצה?</p>
            <div className="grp__ob-row">
              <input className="grp__ob-input" placeholder="שם החבר..." value={memberInput}
                onChange={e => setMemberInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&addMember()} autoFocus />
              <button className="grp__ob-add" style={{ background: group.color }} onClick={addMember}>הוסף</button>
            </div>
            {(group.members||[]).length > 0 && (
              <div className="grp__ob-list">
                {group.members.map(m => (
                  <div key={m.id} className="grp__ob-list-item">
                    <div className="grp__ob-mini-av" style={{ background: group.color }}>{m.name[0].toUpperCase()}</div>
                    <span>{m.name}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grp__ob-nav">
              <button className="grp__ob-skip" onClick={() => setStep(2)}>דלג</button>
              <button className="grp__ob-btn" style={{ background: group.color }} onClick={() => setStep(2)}>המשך →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grp__ob-card">
            <div className="grp__ob-icon">✅</div>
            <h2 className="grp__ob-title">משימות ראשונות</h2>
            <p className="grp__ob-sub">מה הצוות צריך לעשות?</p>
            <div className="grp__ob-row">
              <input className="grp__ob-input" placeholder="משימה..." value={taskInput}
                onChange={e => setTaskInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&addTask()} autoFocus />
              <button className="grp__ob-add" style={{ background: group.color }} onClick={addTask}>הוסף</button>
            </div>
            {(group.tasks||[]).length > 0 && (
              <div className="grp__ob-list">
                {group.tasks.map(t => (
                  <div key={t.id} className="grp__ob-list-item">
                    <div className="grp__ob-check" style={{ borderColor: group.color }}>☐</div>
                    <span>{t.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grp__ob-nav">
              <button className="grp__ob-skip" onClick={() => setStep(3)}>דלג</button>
              <button className="grp__ob-btn" style={{ background: group.color }} onClick={() => setStep(3)}>המשך →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grp__ob-card">
            <div className="grp__ob-icon">🎯</div>
            <h2 className="grp__ob-title">מטרות הקבוצה</h2>
            <p className="grp__ob-sub">מה הקבוצה רוצה להשיג?</p>
            <div className="grp__ob-row">
              <input className="grp__ob-input" placeholder="מטרה..." value={goalInput}
                onChange={e => setGoalInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&addGoal()} autoFocus />
              <button className="grp__ob-add" style={{ background: group.color }} onClick={addGoal}>הוסף</button>
            </div>
            {(group.goals||[]).length > 0 && (
              <div className="grp__ob-list">
                {group.goals.map(g => (
                  <div key={g.id} className="grp__ob-list-item">
                    <span style={{ color: group.color }}>🎯</span>
                    <span>{g.text}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="grp__ob-nav">
              <button className="grp__ob-skip" onClick={onFinish}>דלג</button>
              <button className="grp__ob-btn" style={{ background: group.color }} onClick={onFinish}>✓ סיים</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
