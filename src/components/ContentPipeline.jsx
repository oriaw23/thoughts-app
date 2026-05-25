import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './ContentPipeline.css';

const KEY = 'foldbase_pipeline_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = d => localStorage.setItem(KEY, JSON.stringify(d));

const STAGES = [
  { id: 'idea',      label: 'Ideas',      icon: '💡', color: '#eab308', desc: 'Content ideas to explore' },
  { id: 'script',    label: 'Scripting',  icon: '✍️', color: '#6366f1', desc: 'Writing & planning' },
  { id: 'record',    label: 'Recording',  icon: '🎬', color: '#ef4444', desc: 'Ready to film / record' },
  { id: 'edit',      label: 'Editing',    icon: '🎞️', color: '#f97316', desc: 'Post-production' },
  { id: 'scheduled', label: 'Scheduled',  icon: '📅', color: '#3b82f6', desc: 'Scheduled to go live' },
  { id: 'published', label: 'Published',  icon: '✅', color: '#22c55e', desc: 'Live & published' },
];

const PLATFORMS = [
  { id: 'youtube',   label: 'YouTube',   color: '#ef4444' },
  { id: 'instagram', label: 'Instagram', color: '#ec4899' },
  { id: 'tiktok',    label: 'TikTok',    color: '#e879f9' },
  { id: 'podcast',   label: 'Podcast',   color: '#f97316' },
  { id: 'newsletter',label: 'Newsletter',color: '#3b82f6' },
  { id: 'twitter',   label: 'Twitter/X', color: '#1d9bf0' },
  { id: 'linkedin',  label: 'LinkedIn',  color: '#0a66c2' },
  { id: 'blog',      label: 'Blog',      color: '#22c55e' },
];

const TYPES = ['Long video', 'Short / Reel', 'Post', 'Story', 'Podcast ep.', 'Article', 'Newsletter', 'Thread'];

function platColor(pid) {
  return PLATFORMS.find(p => p.id === pid)?.color || '#6b7280';
}

export default function ContentPipeline() {
  const [items,       setItems]      = useState(load);
  const [filter,      setFilter]     = useState('all');
  const [addingTo,    setAddingTo]   = useState(null);
  const [editingId,   setEditingId]  = useState(null);
  const [dragging,    setDragging]   = useState(null);
  const [dragOver,    setDragOver]   = useState(null);
  const [search,      setSearch]     = useState('');

  const blank = (stage) => ({
    id: uuidv4(), stage, title: '', platform: 'youtube',
    type: 'Long video', dueDate: '', notes: '', createdAt: new Date().toISOString(),
  });

  const upd = next => { setItems(next); save(next); };

  const addItem = (stage, draft) => {
    if (!draft.title.trim()) { setAddingTo(null); return; }
    upd([...items, { ...draft, id: uuidv4(), createdAt: new Date().toISOString() }]);
    setAddingTo(null);
  };

  const updateItem = (id, patch) => upd(items.map(i => i.id === id ? { ...i, ...patch } : i));
  const deleteItem = id => { upd(items.filter(i => i.id !== id)); setEditingId(null); };
  const moveItem   = (id, stage) => updateItem(id, { stage });

  const visible = items.filter(i => {
    if (filter !== 'all' && i.platform !== filter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const colCount = (stage) => visible.filter(i => i.stage === stage).length;

  // Drag
  const onDragStart = (e, item) => { setDragging(item); e.dataTransfer.effectAllowed = 'move'; };
  const onDragEnd   = () => { setDragging(null); setDragOver(null); };
  const onDrop      = (e, stage) => {
    e.preventDefault();
    if (dragging && dragging.stage !== stage) moveItem(dragging.id, stage);
    setDragOver(null);
  };

  const editItem = editingId ? items.find(i => i.id === editingId) : null;

  return (
    <div className="cp">

      {/* ── Topbar ── */}
      <div className="cp__top">
        <div className="cp__top-left">
          <h1 className="cp__title">
            <span className="cp__title-icon">🎬</span>
            Content Pipeline
          </h1>
          <span className="cp__subtitle">{items.length} pieces of content</span>
        </div>
        <div className="cp__top-right">
          {/* Search */}
          <div className="cp__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search content…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {/* Platform filter */}
          <div className="cp__filter-wrap">
            <button className={`cp__filter-btn${filter==='all'?' active':''}`} onClick={() => setFilter('all')}>All</button>
            {PLATFORMS.map(p => (
              <button key={p.id}
                className={`cp__filter-btn${filter===p.id?' active':''}`}
                style={filter===p.id ? { background:p.color+'22', color:p.color, borderColor:p.color+'55' } : { borderColor: p.color+'44' }}
                onClick={() => setFilter(f => f===p.id ? 'all' : p.id)}>
                <span className="cp__filter-dot" style={{background:p.color}}/>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="cp__stats">
        {STAGES.map(s => (
          <div key={s.id} className="cp__stat">
            <span className="cp__stat-icon">{s.icon}</span>
            <div>
              <p className="cp__stat-val" style={{color:s.color}}>{colCount(s.id)}</p>
              <p className="cp__stat-label">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Board ── */}
      <div className="cp__board">
        {STAGES.map(stage => {
          const colItems = visible.filter(i => i.stage === stage.id);
          const isOver   = dragOver === stage.id;
          return (
            <div key={stage.id} className={`cp__col${isOver?' cp__col--over':''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(stage.id); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => onDrop(e, stage.id)}>

              {/* Column header */}
              <div className="cp__col-head">
                <div className="cp__col-head-left">
                  <span className="cp__col-accent" style={{background:stage.color}}/>
                  <span className="cp__col-icon">{stage.icon}</span>
                  <span className="cp__col-label">{stage.label}</span>
                  <span className="cp__col-count" style={{background:stage.color+'18',color:stage.color}}>
                    {colItems.length}
                  </span>
                </div>
                <button className="cp__col-add-btn" onClick={() => setAddingTo(stage.id)}
                  title={`Add to ${stage.label}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
              </div>

              {/* Cards */}
              <div className="cp__col-body">
                {/* Quick add form */}
                {addingTo === stage.id && (
                  <QuickAdd
                    stage={stage}
                    onAdd={(draft) => addItem(stage.id, draft)}
                    onClose={() => setAddingTo(null)}
                  />
                )}

                {colItems.map(item => (
                  <div key={item.id}
                    className="cp__card"
                    draggable
                    onDragStart={e => onDragStart(e, item)}
                    onDragEnd={onDragEnd}
                    onClick={() => setEditingId(item.id)}
                    style={{ borderLeft: `3px solid ${platColor(item.platform)}` }}>

                    <div className="cp__card-top">
                      <span className="cp__card-platform"
                        style={{background:platColor(item.platform)+'18', color:platColor(item.platform)}}>
                        {PLATFORMS.find(p=>p.id===item.platform)?.label || item.platform}
                      </span>
                      <span className="cp__card-type">{item.type}</span>
                    </div>

                    <p className="cp__card-title">{item.title || 'Untitled'}</p>

                    {item.notes && <p className="cp__card-notes">{item.notes}</p>}

                    <div className="cp__card-foot">
                      {item.dueDate && (
                        <span className="cp__card-due">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                          {item.dueDate}
                        </span>
                      )}
                      {/* Stage jump buttons */}
                      <div className="cp__card-actions">
                        {STAGES.filter(s => s.id !== item.stage).slice(0,2).map(s => (
                          <button key={s.id} className="cp__card-move"
                            onClick={e => { e.stopPropagation(); moveItem(item.id, s.id); }}
                            title={`Move to ${s.label}`}
                            style={{color:s.color}}>
                            → {s.icon}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}

                {colItems.length === 0 && addingTo !== stage.id && (
                  <div className="cp__col-empty" onClick={() => setAddingTo(stage.id)}>
                    <span>{stage.icon}</span>
                    <p>{stage.desc}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Edit modal ── */}
      {editItem && (
        <EditModal item={editItem} onClose={() => setEditingId(null)}
          onUpdate={(patch) => updateItem(editItem.id, patch)}
          onDelete={() => deleteItem(editItem.id)}
          onMove={(stage) => { moveItem(editItem.id, stage); setEditingId(null); }}
        />
      )}
    </div>
  );
}

// ── Quick add form inside column ─────────────────────────────────────────────
function QuickAdd({ stage, onAdd, onClose }) {
  const [draft, setDraft] = useState({ title:'', platform:'youtube', type:'Long video', dueDate:'', notes:'' });
  const set = (k,v) => setDraft(p => ({...p,[k]:v}));
  return (
    <div className="cp__quick-add">
      <input className="cp__qa-title" autoFocus dir="auto"
        placeholder="Content title…"
        value={draft.title} onChange={e => set('title', e.target.value)}
        onKeyDown={e => { if(e.key==='Enter') onAdd(draft); if(e.key==='Escape') onClose(); }} />
      <div className="cp__qa-row">
        <select className="cp__qa-sel" value={draft.platform} onChange={e => set('platform',e.target.value)}>
          {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
        <select className="cp__qa-sel" value={draft.type} onChange={e => set('type',e.target.value)}>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <input className="cp__qa-date" type="date" value={draft.dueDate} onChange={e => set('dueDate',e.target.value)} />
      <div className="cp__qa-btns">
        <button className="cp__qa-cancel" onClick={onClose}>Cancel</button>
        <button className="cp__qa-save"
          style={{background:stage.color}}
          onClick={() => onAdd(draft)}>Add to {stage.label}</button>
      </div>
    </div>
  );
}

// ── Edit / detail modal ───────────────────────────────────────────────────────
function EditModal({ item, onClose, onUpdate, onDelete, onMove }) {
  const [f, setF] = useState({ ...item });
  const set = (k,v) => { setF(p=>({...p,[k]:v})); onUpdate({[k]:v}); };
  const stage = STAGES.find(s => s.id === item.stage);
  const plat  = PLATFORMS.find(p => p.id === item.platform);

  return (
    <div className="cp__modal-overlay" onClick={onClose}>
      <div className="cp__modal" onClick={e=>e.stopPropagation()}>
        {/* Header */}
        <div className="cp__modal-head" style={{borderBottom:`2px solid ${stage.color}33`}}>
          <div className="cp__modal-stage" style={{color:stage.color,background:stage.color+'18'}}>
            {stage.icon} {stage.label}
          </div>
          <button className="cp__modal-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="cp__modal-body">
          {/* Title */}
          <input className="cp__modal-title" dir="auto"
            value={f.title} onChange={e => set('title',e.target.value)}
            placeholder="Content title…" />

          {/* Platform + Type row */}
          <div className="cp__modal-row">
            <div className="cp__modal-field">
              <label>Platform</label>
              <select value={f.platform} onChange={e => set('platform',e.target.value)}>
                {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </div>
            <div className="cp__modal-field">
              <label>Type</label>
              <select value={f.type} onChange={e => set('type',e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="cp__modal-field">
              <label>Due Date</label>
              <input type="date" value={f.dueDate} onChange={e => set('dueDate',e.target.value)} />
            </div>
          </div>

          {/* Notes */}
          <div className="cp__modal-field cp__modal-field--full">
            <label>Notes / Script Outline</label>
            <textarea dir="auto" rows={4} value={f.notes}
              onChange={e => set('notes',e.target.value)}
              placeholder="Add notes, outline, talking points…" />
          </div>

          {/* Move to stage */}
          <div className="cp__modal-move">
            <label>Move to stage</label>
            <div className="cp__modal-stages">
              {STAGES.map(s => (
                <button key={s.id}
                  className={`cp__modal-stage-btn${s.id===item.stage?' active':''}`}
                  style={s.id===item.stage
                    ? {background:s.color,color:'#fff',borderColor:s.color}
                    : {borderColor:s.color+'44',color:s.color}}
                  onClick={() => s.id !== item.stage && onMove(s.id)}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="cp__modal-foot">
          <button className="cp__modal-del" onClick={onDelete}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Delete
          </button>
          <button className="cp__modal-done" style={{background:plat?.color||'#6366f1'}} onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
