import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './IdeaVault.css';

const KEY = 'foldbase_ideas_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };
const save = d => localStorage.setItem(KEY, JSON.stringify(d));

const STATUSES = [
  { id: 'raw',        label: 'Raw Idea',    color: '#6b7280' },
  { id: 'developing', label: 'Developing',  color: '#eab308' },
  { id: 'ready',      label: 'Ready',       color: '#22c55e' },
  { id: 'archived',   label: 'Archived',    color: '#94a3b8' },
];

const PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Podcast', 'Newsletter', 'Twitter/X', 'LinkedIn', 'Blog', 'General'];
const TYPES     = ['Long video', 'Short / Reel', 'Post', 'Thread', 'Episode', 'Article', 'Carousel', 'Story'];

const TAGS_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#6366f1','#8b5cf6','#ec4899'];

const stColor = id => STATUSES.find(s=>s.id===id)?.color || '#6b7280';
const stLabel = id => STATUSES.find(s=>s.id===id)?.label || id;

export default function IdeaVault() {
  const [ideas,      setIdeas]    = useState(load);
  const [search,     setSearch]   = useState('');
  const [filter,     setFilter]   = useState('all');   // status filter
  const [platFilter, setPlatFilter] = useState('all');
  const [sort,       setSort]     = useState('newest');
  const [editing,    setEditing]  = useState(null);
  const [quickText,  setQuickText]= useState('');
  const inputRef = useRef(null);

  const upd = next => { setIdeas(next); save(next); };

  const quickAdd = () => {
    const text = quickText.trim();
    if (!text) return;
    const idea = { id:uuidv4(), title:text, body:'', platform:'General', type:'Long video',
      status:'raw', starred:false, tags:[], createdAt:new Date().toISOString() };
    upd([idea, ...ideas]);
    setQuickText('');
    inputRef.current?.focus();
  };

  const updateIdea = (id, patch) => upd(ideas.map(i=>i.id===id?{...i,...patch}:i));
  const deleteIdea = id => { upd(ideas.filter(i=>i.id!==id)); setEditing(null); };
  const toggleStar = (id,e) => { e.stopPropagation(); updateIdea(id,{starred:!ideas.find(i=>i.id===id)?.starred}); };

  const sendToPipeline = (idea) => {
    try {
      const pKey = 'foldbase_pipeline_v1';
      const pipe = JSON.parse(localStorage.getItem(pKey)||'[]');
      pipe.unshift({ id:uuidv4(), stage:'idea', title:idea.title, platform:idea.platform.toLowerCase(),
        type:idea.type, dueDate:'', notes:idea.body, createdAt:new Date().toISOString() });
      localStorage.setItem(pKey, JSON.stringify(pipe));
      updateIdea(idea.id, { status:'developing' });
      setEditing(null);
    } catch {}
  };

  let visible = ideas.filter(i => {
    if (filter   !== 'all' && i.status   !== filter)   return false;
    if (platFilter !== 'all' && i.platform !== platFilter) return false;
    if (search && !i.title.toLowerCase().includes(search.toLowerCase()) &&
                  !i.body?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (sort === 'newest')  visible = [...visible].sort((a,b) => b.createdAt.localeCompare(a.createdAt));
  if (sort === 'starred') visible = [...visible].sort((a,b) => (b.starred?1:0)-(a.starred?1:0));
  if (sort === 'alpha')   visible = [...visible].sort((a,b) => a.title.localeCompare(b.title));

  const editIdea = editing ? ideas.find(i=>i.id===editing) : null;

  const starCount = ideas.filter(i=>i.starred).length;
  const readyCount = ideas.filter(i=>i.status==='ready').length;

  return (
    <div className="iv">

      {/* ── Quick capture ── */}
      <div className="iv__capture">
        <span className="iv__capture-icon">💡</span>
        <input
          ref={inputRef}
          className="iv__capture-input"
          placeholder="What's your next content idea? Hit Enter to save…"
          value={quickText}
          onChange={e=>setQuickText(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter') quickAdd(); }}
          autoFocus
          dir="auto"
        />
        <button className="iv__capture-btn" onClick={quickAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Save idea
        </button>
      </div>

      {/* ── Topbar ── */}
      <div className="iv__top">
        <div className="iv__top-left">
          <h1 className="iv__title">
            <span>💡</span> Idea Vault
          </h1>
          <div className="iv__mini-stats">
            <span>{ideas.length} ideas</span>
            <span>·</span>
            <span>⭐ {starCount}</span>
            <span>·</span>
            <span className="iv__mini-ready">✅ {readyCount} ready</span>
          </div>
        </div>
        <div className="iv__top-right">
          {/* Search */}
          <div className="iv__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search ideas…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          {/* Sort */}
          <select className="iv__sort" value={sort} onChange={e=>setSort(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="starred">Starred first</option>
            <option value="alpha">A → Z</option>
          </select>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="iv__filters">
        <div className="iv__filter-group">
          <button className={`iv__filter-btn${filter==='all'?' active':''}`} onClick={()=>setFilter('all')}>All</button>
          {STATUSES.map(s => (
            <button key={s.id}
              className={`iv__filter-btn${filter===s.id?' active':''}`}
              style={filter===s.id?{background:s.color+'22',color:s.color,borderColor:s.color+'55'}:{}}
              onClick={()=>setFilter(f=>f===s.id?'all':s.id)}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="iv__filter-group">
          <button className={`iv__filter-btn${platFilter==='all'?' active':''}`} onClick={()=>setPlatFilter('all')}>All platforms</button>
          {PLATFORMS.slice(0,6).map(p => (
            <button key={p}
              className={`iv__filter-btn${platFilter===p?' active':''}`}
              onClick={()=>setPlatFilter(pl=>pl===p?'all':p)}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="iv__grid-wrap">
        {visible.length === 0 && (
          <div className="iv__empty">
            <span>💡</span>
            <h3>{search ? 'No ideas match your search' : 'Your vault is empty'}</h3>
            <p>Type a content idea above and hit Enter — ideas stack up fast!</p>
          </div>
        )}
        <div className="iv__grid">
          {visible.map(idea => (
            <div key={idea.id} className={`iv__card${idea.starred?' iv__card--starred':''}`}
              onClick={()=>setEditing(idea.id)}>
              <div className="iv__card-top">
                <span className="iv__card-status" style={{color:stColor(idea.status),background:stColor(idea.status)+'18'}}>
                  {stLabel(idea.status)}
                </span>
                <button className="iv__card-star" onClick={e=>toggleStar(idea.id,e)}>
                  {idea.starred ? '⭐' : '☆'}
                </button>
              </div>
              <p className="iv__card-title">{idea.title}</p>
              {idea.body && <p className="iv__card-body">{idea.body}</p>}
              <div className="iv__card-foot">
                <span className="iv__card-plat">{idea.platform}</span>
                <span className="iv__card-type">{idea.type}</span>
                <span className="iv__card-date">{new Date(idea.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Edit drawer ── */}
      {editIdea && (
        <EditDrawer
          idea={editIdea}
          onClose={()=>setEditing(null)}
          onChange={(patch)=>updateIdea(editIdea.id,patch)}
          onDelete={()=>deleteIdea(editIdea.id)}
          onSendToPipeline={()=>sendToPipeline(editIdea)}
        />
      )}
    </div>
  );
}

// ── Edit drawer ───────────────────────────────────────────────────────────────
function EditDrawer({ idea, onClose, onChange, onDelete, onSendToPipeline }) {
  const set = (k,v) => onChange({[k]:v});

  return (
    <>
      <div className="iv__drawer-backdrop" onClick={onClose}/>
      <div className="iv__drawer">
        <div className="iv__drawer-head">
          <div className="iv__drawer-head-left">
            <button
              className={`iv__drawer-star${idea.starred?' starred':''}`}
              onClick={()=>set('starred',!idea.starred)}>
              {idea.starred ? '⭐' : '☆'}
            </button>
            <select className="iv__drawer-status"
              style={{color:stColor(idea.status),borderColor:stColor(idea.status)+'44'}}
              value={idea.status} onChange={e=>set('status',e.target.value)}>
              {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>
          <button className="iv__drawer-close" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <div className="iv__drawer-body">
          <input className="iv__drawer-title" dir="auto"
            value={idea.title} onChange={e=>set('title',e.target.value)}
            placeholder="Idea title…" />

          <textarea className="iv__drawer-notes" dir="auto" rows={5}
            value={idea.body||''} onChange={e=>set('body',e.target.value)}
            placeholder="Notes, angle, hook, talking points, research links…" />

          <div className="iv__drawer-meta">
            <div className="iv__dm-field">
              <label>Platform</label>
              <select value={idea.platform} onChange={e=>set('platform',e.target.value)}>
                {PLATFORMS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="iv__dm-field">
              <label>Content Type</label>
              <select value={idea.type} onChange={e=>set('type',e.target.value)}>
                {TYPES.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Send to pipeline */}
          <button className="iv__drawer-pipeline-btn" onClick={onSendToPipeline}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></svg>
            Move to Content Pipeline →
          </button>
        </div>

        <div className="iv__drawer-foot">
          <button className="iv__drawer-del" onClick={onDelete}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            Delete
          </button>
          <span className="iv__drawer-created">Added {new Date(idea.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </>
  );
}
