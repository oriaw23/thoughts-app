import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Sidebar.css';

const CANVAS_STORAGE  = 'mynotion_canvases_v2';
const DIRECTS_KEY     = 'mynotion_directs_v1';
const GROUPS_KEY      = 'mynotion_groups_v1';
const CHANNELS_KEY    = 'mynotion_channels_v1';

// ── Canvas helpers ─────────────────────────────────────────────────────────────
function loadCanvasTopics() {
  try {
    const raw = localStorage.getItem(CANVAS_STORAGE);
    if (!raw) return { list: [], activeId: null };
    const d = JSON.parse(raw);
    return { list: d.list || [], activeId: d.activeId || null };
  } catch { return { list: [], activeId: null }; }
}
function switchCanvasTopic(id) {
  try {
    const d = JSON.parse(localStorage.getItem(CANVAS_STORAGE)||'{}');
    d.activeId = id;
    localStorage.setItem(CANVAS_STORAGE, JSON.stringify(d));
    window.dispatchEvent(new CustomEvent('canvas:switch', { detail: { id } }));
  } catch {}
}
function deleteCanvasTopic(id) {
  try {
    const raw = localStorage.getItem(CANVAS_STORAGE);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (!d.list || d.list.length <= 1) return; // don't delete last canvas
    d.list = d.list.filter(c => c.id !== id);
    if (d.activeId === id) d.activeId = d.list[0]?.id || null;
    if (d.data) delete d.data[id];
    localStorage.setItem(CANVAS_STORAGE, JSON.stringify(d));
    window.dispatchEvent(new CustomEvent('canvas:reload'));
  } catch {}
}
function createCanvasTopic(name = 'לוח חדש', color = '#6366f1') {
  try {
    const raw = localStorage.getItem(CANVAS_STORAGE);
    const d = raw ? JSON.parse(raw) : { list: [], data: {}, activeId: null };
    const id = uuidv4();
    d.list = [...(d.list||[]), { id, name, icon:'🎨', color, createdAt: new Date().toISOString() }];
    d.data[id] = { nodes:[], edges:[] }; d.activeId = id;
    localStorage.setItem(CANVAS_STORAGE, JSON.stringify(d));
    window.dispatchEvent(new CustomEvent('canvas:switch', { detail:{ id } }));
    return id;
  } catch { return null; }
}

// ── Groups + Directs helpers ───────────────────────────────────────────────────
function loadDirects()  { try { return JSON.parse(localStorage.getItem(DIRECTS_KEY)||'[]'); } catch { return []; } }
function saveDirects(d) { localStorage.setItem(DIRECTS_KEY, JSON.stringify(d)); }
function loadGroups()    { try { return JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');    } catch { return []; } }
function saveGroups(g)   { localStorage.setItem(GROUPS_KEY,   JSON.stringify(g)); }
function loadChannels()  { try { return JSON.parse(localStorage.getItem(CHANNELS_KEY)||'[]'); } catch { return []; } }
function saveChannels(c) { localStorage.setItem(CHANNELS_KEY, JSON.stringify(c)); }

const AVATAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444','#8b5cf6'];
const EMOJIS = ['😊','🚀','💡','🎯','🔥','⚡','🌟','🎨','💪','🦊','🐻','🦁'];

// ── SVG icons ──────────────────────────────────────────────────────────────────
const I = {
  home:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>,
  matters:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  workflow:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><line x1="5.5" y1="8" x2="5.5" y2="12"/><line x1="18.5" y1="8" x2="18.5" y2="12"/><path d="M5.5 12 Q5.5 16 12 16"/><path d="M18.5 12 Q18.5 16 12 16"/></svg>,
  documents:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>,
  research:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  integrations:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  settings:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  users:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  plus:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevron:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

const NAV_ITEMS = [
  { id: 'home',         icon: 'home',         label: 'Command'      },
  { id: 'matters',      icon: 'matters',      label: 'Matters'      },
  { id: 'workflow',     icon: 'workflow',     label: 'Automations'  },
  { id: 'documents',    icon: 'documents',    label: 'Documents'    },
  { id: 'research',     icon: 'research',     label: 'Research'     },
  { id: 'integrations', icon: 'integrations', label: 'Integrations' },
];

const USER_KEY = 'mynotion_user_v1';
const MODES = [
  { id: 'counsel',   label: 'In-House Counsel', icon: '⚖️' },
  { id: 'associate', label: 'Associate',         icon: '📋' },
  { id: 'paralegal', label: 'Paralegal',          icon: '🗂️' },
];

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({
  folders, pages, tasks,
  activePageId, activeView,
  isOpen,
  onPageSelect, onPageCreate, onPageDelete, onPageUpdate,
  onFolderCreate, onFolderUpdate, onFolderDelete,
  onViewChange, onOpenSettings,
}) {
  const [canvasTopics, setCanvasTopics]         = useState(loadCanvasTopics);
  const [canvasTopicsOpen, setCanvasTopicsOpen] = useState(true);
  const [creatingCanvas, setCreatingCanvas]     = useState(false);
  const [newCanvasName, setNewCanvasName]        = useState('');

  // ── User profile ──
  const [user, setUser]           = useState(() => { try { return JSON.parse(localStorage.getItem(USER_KEY)||'{}'); } catch { return {}; } });
  const [editingName, setEditingName] = useState(false);
  const [modeOpen, setModeOpen]   = useState(false);
  const [modePos, setModePos]     = useState(null);
  const modeMenuRef = useRef(null);
  const modeBtnRef  = useRef(null);

  const saveUser = (patch) => {
    const next = { ...user, ...patch };
    setUser(next);
    localStorage.setItem(USER_KEY, JSON.stringify(next));
  };

  useEffect(() => {
    if (!modeOpen) return;
    const close = e => { if (!modeMenuRef.current?.contains(e.target)) setModeOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [modeOpen]);

  const currentMode = MODES.find(m => m.id === (user.mode || 'default')) || MODES[0];
  const userName    = user.name || 'User';
  const initials    = userName.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const newCanvasInputRef = useRef(null);

  const pendingTasks = tasks.filter(t => t.status !== 'done').length;

  useEffect(() => {
    if (activeView !== 'canvas') return;
    const refresh = () => setCanvasTopics(loadCanvasTopics());
    refresh();
    const id = setInterval(refresh, 500);
    window.addEventListener('canvas:switch', refresh);
    return () => { clearInterval(id); window.removeEventListener('canvas:switch', refresh); };
  }, [activeView]);

  useEffect(() => {
    if (creatingCanvas) setTimeout(() => newCanvasInputRef.current?.focus(), 50);
  }, [creatingCanvas]);

  const handleCreateCanvas = () => {
    if (!newCanvasName.trim()) { setCreatingCanvas(false); return; }
    createCanvasTopic(newCanvasName.trim());
    setNewCanvasName(''); setCreatingCanvas(false);
    onViewChange('canvas');
  };

  const isActive = (id) => activeView === id ||
    (id === 'documents' && (activeView === 'pages' || activeView === 'page')) ||
    (id === 'matters'   && activeView === 'projects') ||
    (id === 'research'  && activeView === 'research');

  return (
    <aside className={`sb ${isOpen ? 'sb--open' : 'sb--closed'}`}>

      {/* User avatar at top */}
      <div className="sb__top-user">
        <div className="sb__top-av">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        {editingName ? (
          <input
            className="sb__top-name-input" autoFocus
            value={user.name || ''}
            onChange={e => saveUser({ name: e.target.value })}
            onBlur={() => setEditingName(false)}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingName(false); }}
            placeholder="Your name…"
          />
        ) : (
          <span className="sb__top-name" onClick={() => setEditingName(true)} title="Click to edit">
            {userName}
          </span>
        )}
      </div>

      {/* Main nav */}
      <nav className="sb__nav">
        {NAV_ITEMS.map((item, idx) => {
          if (item.type === 'section') {
            return (
              <div key={`section-${idx}`} className="sb__nav-section">
                <span className="sb__nav-section-label">{item.label}</span>
              </div>
            );
          }
          return (
          <div key={item.id}>
            <button
              className={`sb__item${isActive(item.id) ? ' sb__item--active' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={item.label}
              style={isActive(item.id) && item.accent ? { color: item.accent } : {}}
            >
              <span className="sb__item-icon" style={item.accent && !isActive(item.id) ? { color: item.accent, opacity: .7 } : {}}>{I[item.icon]}</span>
              <span className="sb__item-label">{item.label}</span>
            </button>

          </div>
          );
        })}

      </nav>

      {/* ── Teams (below Integrations) ── */}
      <SidebarGroups activeView={activeView} onViewChange={onViewChange} isOpen={isOpen} />

      {/* ── Channels ── */}
      <SidebarChannels activeView={activeView} onViewChange={onViewChange} isOpen={isOpen} />

      {/* ── Footer — settings only ── */}
      <div className="sb__footer">
        <button className="sb__item sb__item--sm" onClick={onOpenSettings} title="Settings">
          <span className="sb__item-icon">{I.settings}</span>
          <span className="sb__item-label">Settings</span>
        </button>
      </div>
    </aside>
  );
}

// ── Groups section ─────────────────────────────────────────────────────────────
function SidebarGroups({ activeView, onViewChange, isOpen }) {
  const [groups, setGroups]   = useState(loadGroups);
  const [open, setOpen]       = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName]       = useState('');
  const inputRef = useRef(null);

  const saveAndSet = (g) => { setGroups(g); saveGroups(g); };

  const create = () => {
    if (!name.trim()) { setCreating(false); return; }
    const g = { id: uuidv4(), name: name.trim(), color: AVATAR_COLORS[groups.length % AVATAR_COLORS.length], members: [], isNew: true };
    saveAndSet([...groups, g]);
    setName(''); setCreating(false);
    onViewChange(`group:${g.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="sb__section sb__section--teams">
      <div className="sb__section-mini-header">
        <span className="sb__section-mini-label">Legal Teams</span>
        <button className="sb__section-mini-add" title="New team" onClick={e => { e.stopPropagation(); setCreating(true); setTimeout(()=>inputRef.current?.focus(),40); }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      <div className="sb__section-body">
        {groups.map(g => (
          <button key={g.id} className={`sb__contact${activeView===`group:${g.id}`?' active':''}`}
            onClick={() => onViewChange(`group:${g.id}`)}>
            <div className="sb__contact-av sb__contact-av--letter" style={{ background: g.color }}>
              {(g.name||'?')[0].toUpperCase()}
            </div>
            <span className="sb__contact-name">{g.name}</span>
            {g.members?.length > 0 && <span className="sb__contact-count">{g.members.length}</span>}
          </button>
        ))}
        {creating && (
          <div className="sb__inline-create">
            <input ref={inputRef} className="sb__inline-input" value={name} placeholder="Team name…"
              onChange={e=>setName(e.target.value)} onBlur={create}
              onKeyDown={e=>{if(e.key==='Enter')create();if(e.key==='Escape')setCreating(false);}} />
          </div>
        )}
        {groups.length===0 && !creating && (
          <button className="sb__section-ghost" onClick={()=>{ setCreating(true); setTimeout(()=>inputRef.current?.focus(),40); }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New team
          </button>
        )}
      </div>
    </div>
  );
}

// ── Channels section ───────────────────────────────────────────────────────────
function SidebarChannels({ activeView, onViewChange, isOpen }) {
  const [channels, setChannels] = useState(loadChannels);
  const [open, setOpen]         = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName]         = useState('');
  const inputRef = useRef(null);

  const saveAndSet = (c) => { setChannels(c); saveChannels(c); };

  const create = () => {
    if (!name.trim()) { setCreating(false); return; }
    const c = { id: uuidv4(), name: name.trim().replace(/^#+/, ''), color: AVATAR_COLORS[channels.length % AVATAR_COLORS.length] };
    saveAndSet([...channels, c]);
    setName(''); setCreating(false);
    onViewChange(`channel:${c.id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="sb__section">
      <div className="sb__section-header" onClick={() => setOpen(p => !p)}>
        <span className="sb__section-icon" style={{ width: 14, height: 14 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span className="sb__section-title">Channels</span>
        <button className="sb__section-add" onClick={e => { e.stopPropagation(); setCreating(true); setTimeout(() => inputRef.current?.focus(), 40); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      {open && (
        <div className="sb__groups-fade">
          <div className="sb__section-body">
            {channels.map(c => (
              <button key={c.id}
                className={`sb__contact${activeView === `channel:${c.id}` ? ' active' : ''}`}
                onClick={() => onViewChange(`channel:${c.id}`)}>
                <span className="sb__channel-hash" style={{ color: c.color }}>#</span>
                <span className="sb__contact-name">{c.name}</span>
              </button>
            ))}
            {creating && (
              <div className="sb__inline-create">
                <span className="sb__channel-hash-prefix">#</span>
                <input ref={inputRef} className="sb__inline-input" value={name} placeholder="channel-name"
                  onChange={e => setName(e.target.value)} onBlur={create}
                  onKeyDown={e => { if (e.key === 'Enter') create(); if (e.key === 'Escape') setCreating(false); }} />
              </div>
            )}
            {channels.length === 0 && !creating && <p className="sb__section-empty">No channels yet</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Directs section ────────────────────────────────────────────────────────────
function SidebarDirects({ activeView, onViewChange, isOpen }) {
  const [directs, setDirects] = useState(loadDirects);
  const [open, setOpen]       = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName]       = useState('');
  const inputRef = useRef(null);

  const saveAndSet = (d) => { setDirects(d); saveDirects(d); };

  const create = () => {
    if (!name.trim()) { setCreating(false); return; }
    const color = AVATAR_COLORS[directs.length % AVATAR_COLORS.length];
    const emoji = EMOJIS[directs.length % EMOJIS.length];
    const d = { id: uuidv4(), name: name.trim(), avatar: emoji, color };
    saveAndSet([...directs, d]);
    setName(''); setCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="sb__section">
      <div className="sb__section-header" onClick={() => setOpen(p=>!p)}>
        <span className="sb__section-icon" style={{width:14,height:14}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span className="sb__section-title">פרטיים</span>
        <button className="sb__section-add" onClick={e => { e.stopPropagation(); setCreating(true); setTimeout(()=>inputRef.current?.focus(),40); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      {open && (
        <div className="sb__section-body">
          {directs.map(c => (
            <button key={c.id}
              className={`sb__contact${activeView===`dm:${c.id}`?' active':''}`}
              onClick={() => onViewChange(`dm:${c.id}`)}>
              <div className="sb__contact-av" style={{ background: c.color+'22', borderColor: c.color+'55', fontSize:14 }}>
                {c.avatar}
              </div>
              <span className="sb__contact-name">{c.name}</span>
              <span className="sb__online-dot" />
            </button>
          ))}
          {creating && (
            <div className="sb__inline-create">
              <input ref={inputRef} className="sb__inline-input" value={name} placeholder="שם איש קשר..."
                onChange={e=>setName(e.target.value)} onBlur={create}
                onKeyDown={e=>{if(e.key==='Enter')create();if(e.key==='Escape')setCreating(false);}} />
            </div>
          )}
          {directs.length===0 && !creating && <p className="sb__section-empty">אין שיחות</p>}
        </div>
      )}
    </div>
  );
}
