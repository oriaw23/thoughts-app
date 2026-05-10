import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Sidebar.css';

const CANVAS_STORAGE  = 'mynotion_canvases_v2';
const DIRECTS_KEY     = 'mynotion_directs_v1';
const GROUPS_KEY      = 'mynotion_groups_v1';

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
function loadGroups()   { try { return JSON.parse(localStorage.getItem(GROUPS_KEY)||'[]');  } catch { return []; } }
function saveGroups(g)  { localStorage.setItem(GROUPS_KEY,  JSON.stringify(g)); }

const AVATAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444','#8b5cf6'];
const EMOJIS = ['😊','🚀','💡','🎯','🔥','⚡','🌟','🎨','💪','🦊','🐻','🦁'];

// ── SVG icons ──────────────────────────────────────────────────────────────────
const I = {
  chat:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  pages:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  projects:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  goals:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  progress:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  tasks:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  calendar:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  canvas:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="12" cy="12" r="2"/></svg>,
  marketplace: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  library:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  trash:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>,
  help:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  settings:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  users:       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  dm:          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 0 1-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>,
  plus:        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  chevron:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>,
};

const NAV_ITEMS = [
  { id: 'chat',        icon: 'chat',        label: 'AI Chat'     },
  { id: 'pages',       icon: 'pages',       label: 'Pages'       },
  { id: 'projects',    icon: 'projects',    label: 'Projects'    },
  { id: 'goals',       icon: 'goals',       label: 'Goals'       },
  { id: 'tasks',       icon: 'tasks',       label: 'Tasks'       },
  { id: 'calendar',    icon: 'calendar',    label: 'Calendar'    },
  { id: 'canvas',      icon: 'canvas',      label: 'Canvas'      },
  { id: 'marketplace', icon: 'marketplace', label: 'Marketplace' },
  { id: 'library',     icon: 'library',     label: 'Library'     },
];

// ── Main Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({
  folders, pages, tasks,
  activePageId, activeView,
  isOpen,
  onMouseEnter, onMouseLeave,
  onPageSelect, onPageCreate, onPageDelete, onPageUpdate,
  onFolderCreate, onFolderUpdate, onFolderDelete,
  onViewChange, onOpenSettings,
}) {
  const [canvasTopics, setCanvasTopics]         = useState(loadCanvasTopics);
  const [canvasTopicsOpen, setCanvasTopicsOpen] = useState(true);
  const [creatingCanvas, setCreatingCanvas]     = useState(false);
  const [newCanvasName, setNewCanvasName]        = useState('');
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

  const isActive = (id) => activeView === id || (id === 'pages' && activeView === 'page');

  return (
    <aside className={`sb ${isOpen ? 'sb--open' : 'sb--closed'}`}
      onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>

      {/* Logo */}
      <div className="sb__logo">
        <div className="sb__logo-mark">T</div>
        <span className="sb__logo-name">Thoughts</span>
      </div>

      {/* Main nav */}
      <nav className="sb__nav">
        {NAV_ITEMS.map(item => (
          <div key={item.id}>
            <button
              className={`sb__item${isActive(item.id) ? ' sb__item--active' : ''}`}
              onClick={() => onViewChange(item.id)}
              title={item.label}
            >
              <span className="sb__item-icon">{I[item.icon]}</span>
              <span className="sb__item-label">{item.label}</span>
              {item.id === 'tasks' && pendingTasks > 0 && (
                <span className="sb__badge">{pendingTasks}</span>
              )}
              {item.id === 'canvas' && activeView === 'canvas' && (
                <button className={`sb__chevron${canvasTopicsOpen ? ' open' : ''}`}
                  onClick={e => { e.stopPropagation(); setCanvasTopicsOpen(p=>!p); }}>
                  <span>{I.chevron}</span>
                </button>
              )}
            </button>

            {item.id === 'canvas' && activeView === 'canvas' && canvasTopicsOpen && (
              <div className="sb__sub">
                {canvasTopics.list.map(topic => (
                  <div key={topic.id} className={`sb__sub-row${topic.id === canvasTopics.activeId ? ' active' : ''}`}>
                    <button className="sb__sub-item-btn"
                      onClick={() => switchCanvasTopic(topic.id)}>
                      <span className="sb__sub-dot" style={{ background: topic.color }} />
                      <span className="sb__sub-label">{topic.name}</span>
                    </button>
                    {canvasTopics.list.length > 1 && (
                      <button className="sb__sub-del"
                        onClick={e => { e.stopPropagation(); deleteCanvasTopic(topic.id); setCanvasTopics(loadCanvasTopics()); }}
                        title="Delete canvas">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                {creatingCanvas ? (
                  <div className="sb__sub-create">
                    <input ref={newCanvasInputRef} className="sb__sub-input"
                      value={newCanvasName} onChange={e => setNewCanvasName(e.target.value)}
                      placeholder="שם הלוח..." onBlur={handleCreateCanvas}
                      onKeyDown={e => { if(e.key==='Enter') handleCreateCanvas(); if(e.key==='Escape') setCreatingCanvas(false); }} />
                  </div>
                ) : (
                  <button className="sb__sub-add" onClick={() => setCreatingCanvas(true)}>
                    <span style={{width:11,height:11}}>{I.plus}</span> לוח חדש
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* ── Groups & Directs ── */}
      <SidebarGroups activeView={activeView} onViewChange={onViewChange} isOpen={isOpen} />
      <SidebarDirects activeView={activeView} onViewChange={onViewChange} isOpen={isOpen} />

      {/* ── Footer ── */}
      <div className="sb__footer">
        <button className={`sb__item sb__item--sm${activeView==='trash'?' sb__item--active':''}`}
          onClick={() => onViewChange('trash')} title="אשפה">
          <span className="sb__item-icon">{I.trash}</span>
          <span className="sb__item-label">אשפה</span>
        </button>
        <button className={`sb__item sb__item--sm${activeView==='help'?' sb__item--active':''}`}
          onClick={() => onViewChange('help')} title="עזרה">
          <span className="sb__item-icon">{I.help}</span>
          <span className="sb__item-label">עזרה</span>
        </button>
        <button className="sb__item sb__item--sm" onClick={onOpenSettings} title="הגדרות">
          <span className="sb__item-icon">{I.settings}</span>
          <span className="sb__item-label">הגדרות</span>
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
    const g = { id: uuidv4(), name: name.trim(), color: AVATAR_COLORS[groups.length % AVATAR_COLORS.length], members: [] };
    saveAndSet([...groups, g]);
    setName(''); setCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="sb__section">
      <div className="sb__section-header" onClick={() => setOpen(p=>!p)}>
        <span className="sb__section-icon" style={{width:14,height:14}}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </span>
        <span className="sb__section-title">קבוצות</span>
        <button className="sb__section-add" onClick={e => { e.stopPropagation(); setCreating(true); setTimeout(()=>inputRef.current?.focus(),40); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>
      {open && (
        <div className="sb__section-body">
          {groups.map(g => (
            <button key={g.id} className="sb__contact"
              onClick={() => onViewChange(`group:${g.id}`)}>
              <div className="sb__contact-av" style={{ background: g.color+'22', borderColor: g.color+'55' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke={g.color} strokeWidth="2" strokeLinecap="round" style={{width:14,height:14}}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <span className="sb__contact-name">{g.name}</span>
              {g.members?.length > 0 && <span className="sb__contact-count">{g.members.length}</span>}
            </button>
          ))}
          {creating && (
            <div className="sb__inline-create">
              <input ref={inputRef} className="sb__inline-input" value={name} placeholder="שם קבוצה..."
                onChange={e=>setName(e.target.value)} onBlur={create}
                onKeyDown={e=>{if(e.key==='Enter')create();if(e.key==='Escape')setCreating(false);}} />
            </div>
          )}
          {groups.length===0 && !creating && <p className="sb__section-empty">אין קבוצות</p>}
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
