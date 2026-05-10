import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Projects.css';

const KEY = 'mynotion_projects_v1';
const STATUSES = [
  { id:'planning', label:'Planning', color:'#6366f1' },
  { id:'active',   label:'Active',   color:'#f59e0b' },
  { id:'review',   label:'In Review',color:'#8b5cf6' },
  { id:'done',     label:'Done',     color:'#10b981' },
  { id:'paused',   label:'Paused',   color:'#94a3b8' },
];
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#0ea5e9','#ef4444','#8b5cf6','#14b8a6'];
const ICONS  = ['🗂️','🚀','💼','🎯','🛠️','🎨','📊','📱','🌐','🔬','📦','🏗️','🎵','🌿','⚡','🔮'];

const PRI_COLOR = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };

function loadProjects() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(p => ({
      tasks:[], goals:[], schedule:[], pageIds:[], goalIds:[],
      taskIds:[], eventIds:[],
      name:'', icon:'🗂️', color:'#6366f1', status:'planning',
      description:'', dueDate:'', progress:0, ...p,
    }));
  } catch { return []; }
}
function saveProjects(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
function newProject() {
  return {
    id: uuidv4(), name:'New Project', icon:'🗂️', color:'#6366f1',
    status:'planning', description:'', dueDate:'', progress:0,
    createdAt: new Date().toISOString(),
    tasks:[], goals:[], schedule:[], pageIds:[], goalIds:[], taskIds:[], eventIds:[],
  };
}
const st = (status) => STATUSES.find(s => s.id === status) || STATUSES[0];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Projects({ pages=[], tasks=[], events=[], goals=[], onNavigate }) {
  const [list,    setList]    = useState(loadProjects);
  const [open,    setOpen]    = useState(null);
  const [editing, setEditing] = useState(null);

  const save   = (next) => { setList(next); saveProjects(next); };
  const upsert = (proj) => {
    const next = list.find(p=>p.id===proj.id)
      ? list.map(p=>p.id===proj.id?proj:p)
      : [...list, proj];
    save(next);
    if (open?.id === proj.id) setOpen(proj);
  };
  const update = (id, ch) => {
    const next = list.map(p=>p.id===id?{...p,...ch}:p);
    save(next);
    if (open?.id===id) setOpen(prev=>({...prev,...ch}));
  };
  const remove = (id) => { save(list.filter(p=>p.id!==id)); setOpen(null); };

  // ── Project hub (full-page) ──
  if (open) {
    return (
      <>
        <ProjectHub
          project={open}
          pages={pages} tasks={tasks} events={events} goals={goals}
          onBack={() => setOpen(null)}
          onEdit={() => setEditing({ ...open })}
          onDelete={() => remove(open.id)}
          onNavigate={onNavigate}
        />
        {editing && (
          <EditModal project={editing}
            onSave={proj => { upsert(proj); setEditing(null); }}
            onClose={() => setEditing(null)} />
        )}
      </>
    );
  }

  // ── Project list ──
  const active  = list.filter(p=>p.status==='active').length;
  const done    = list.filter(p=>p.status==='done').length;

  return (
    <div className="pp">
      <div className="pp-head">
        <div>
          <h1 className="pp-title">🗂️ Projects</h1>
          <p className="pp-sub">{list.length} projects · {active} active · {done} done</p>
        </div>
        <button className="pp-new" onClick={() => setEditing(newProject())}>+ New Project</button>
      </div>

      {list.length === 0 ? (
        <div className="pp-empty">
          <span>🗂️</span>
          <h3>No projects yet</h3>
          <p>Create your first project and link tasks, goals, and pages to it</p>
          <button className="pp-new" onClick={() => setEditing(newProject())}>+ New Project</button>
        </div>
      ) : (
        <div className="pp-grid">
          {list.map(p => {
            const status     = st(p.status);
            const intTasks   = p.tasks || [];
            const doneTasks  = intTasks.filter(t=>t.done).length;
            const linkedCount = (p.pageIds?.length||0) + (p.goalIds?.length||0) +
                               (p.taskIds?.length||0) + (p.eventIds?.length||0);
            return (
              <button key={p.id} className="pp-card" onClick={() => setOpen(p)}>
                <div className="pp-card-bar" style={{background:p.color}}/>
                <div className="pp-card-inner">
                  <div className="pp-card-top">
                    <span className="pp-card-icon" style={{background:p.color+'18'}}>{p.icon}</span>
                    <span className="pp-card-badge" style={{color:status.color,background:status.color+'18'}}>{status.label}</span>
                  </div>
                  <h3 className="pp-card-name">{p.name}</h3>
                  {p.description && <p className="pp-card-desc">{p.description}</p>}
                  <div className="pp-card-prog">
                    <div className="pp-card-bar2"><div style={{width:(p.progress||0)+'%',background:p.color}}/></div>
                    <span style={{color:p.color}}>{p.progress||0}%</span>
                  </div>
                  <div className="pp-card-chips">
                    {intTasks.length>0 && <span className="pp-chip">✅ {doneTasks}/{intTasks.length}</span>}
                    {linkedCount>0 && <span className="pp-chip">🔗 {linkedCount} linked</span>}
                    {p.dueDate && <span className="pp-chip pp-chip-date">📅 {p.dueDate}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal project={editing}
          onSave={proj => { upsert(proj); setEditing(null); }}
          onClose={() => setEditing(null)} />
      )}
    </div>
  );
}

// ── Project Hub (full-page) ───────────────────────────────────────────────────
function ProjectHub({ project:p, pages, tasks, events, goals, onBack, onEdit, onDelete, onNavigate }) {
  const status = st(p.status);

  const linkedPages  = pages.filter(pg => (p.pageIds ||[]).includes(pg.id));
  const linkedGoals  = goals.filter(g  => (p.goalIds ||[]).includes(g.id));
  const linkedTasks  = tasks.filter(t  => (p.taskIds ||[]).includes(t.id));
  const linkedEvents = events.filter(ev => (p.eventIds||[]).includes(ev.id));
  const internalTasks = (p.tasks||[]);

  const allTasks = [
    ...linkedTasks,
    ...internalTasks.filter(t => !linkedTasks.find(lt=>lt.id===t.id)),
  ];

  const hasAnything = linkedPages.length + linkedGoals.length + allTasks.length + linkedEvents.length > 0;

  return (
    <div className="phub">

      {/* Header */}
      <div className="phub__head" style={{'--pc': p.color}}>
        <button className="phub__back" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          All Projects
        </button>
        <div className="phub__hero">
          <div className="phub__hero-left">
            <span className="phub__icon" style={{background:p.color+'18',borderColor:p.color+'40'}}>{p.icon}</span>
            <div>
              <div className="phub__name-row">
                <h1 className="phub__name">{p.name}</h1>
                <span className="phub__status" style={{color:status.color,background:status.color+'18'}}>{status.label}</span>
              </div>
              {p.description && <p className="phub__desc">{p.description}</p>}
              {p.dueDate && <span className="phub__due">📅 Due: {p.dueDate}</span>}
            </div>
          </div>
          <div className="phub__hero-right">
            <div className="phub__prog-ring">
              <svg width="56" height="56" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="22" fill="none" stroke="#e2e8f0" strokeWidth="5"/>
                <circle cx="28" cy="28" r="22" fill="none" stroke={p.color} strokeWidth="5"
                  strokeDasharray={`${(p.progress||0)/100*138} 138`}
                  strokeLinecap="round" transform="rotate(-90 28 28)"/>
              </svg>
              <span className="phub__prog-pct" style={{color:p.color}}>{p.progress||0}%</span>
            </div>
            <div className="phub__actions">
              <button className="phub__act-btn" onClick={onEdit}>✏️ Edit</button>
              <button className="phub__act-btn phub__act-btn--del" onClick={onDelete}>🗑 Delete</button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="phub__body">
        {!hasAnything && (
          <div className="phub__empty">
            <span>🔗</span>
            <h3>Nothing linked yet</h3>
            <p>Link pages, goals, tasks and events to this project from their views using the Project picker.</p>
          </div>
        )}

        {/* ── Pages ── */}
        {linkedPages.length > 0 && (
          <section className="phub__section">
            <div className="phub__sec-head">
              <span className="phub__sec-title">📄 Pages</span>
              <span className="phub__sec-count">{linkedPages.length}</span>
              <button className="phub__sec-nav" onClick={() => onNavigate?.('pages')}>Open Pages →</button>
            </div>
            <div className="phub__pages-grid">
              {linkedPages.map(pg => (
                <button key={pg.id} className="phub__page-card"
                  onClick={() => onNavigate?.('pages', {pageId: pg.id})}>
                  <span className="phub__page-icon">{pg.icon}</span>
                  <span className="phub__page-name">{pg.title || 'Untitled'}</span>
                  <span className="phub__open-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Goals ── */}
        {linkedGoals.length > 0 && (
          <section className="phub__section">
            <div className="phub__sec-head">
              <span className="phub__sec-title">🎯 Goals</span>
              <span className="phub__sec-count">{linkedGoals.length}</span>
              <button className="phub__sec-nav" onClick={() => onNavigate?.('goals')}>Open Goals →</button>
            </div>
            <div className="phub__list">
              {linkedGoals.map(g => (
                <button key={g.id} className="phub__goal-row"
                  onClick={() => onNavigate?.('goals')}
                  style={{'--gc': g.color}}>
                  <div className="phub__goal-bar" style={{background:g.color}}/>
                  <div className="phub__goal-info">
                    <span className="phub__goal-title">{g.title}</span>
                    <span className="phub__goal-meta">
                      {g.milestones?.filter(m=>m.done).length||0}/{g.milestones?.length||0} milestones · {g.timeframe}
                    </span>
                  </div>
                  <div className="phub__goal-prog-wrap">
                    <div className="phub__goal-prog-track">
                      <div className="phub__goal-prog-fill" style={{width:`${g.progress||0}%`,background:g.color}}/>
                    </div>
                    <span style={{color:g.color,fontSize:12,fontWeight:700}}>{g.progress||0}%</span>
                  </div>
                  <span className="phub__open-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Tasks ── */}
        {allTasks.length > 0 && (
          <section className="phub__section">
            <div className="phub__sec-head">
              <span className="phub__sec-title">✅ Tasks</span>
              <span className="phub__sec-count">{allTasks.length}</span>
              <button className="phub__sec-nav" onClick={() => onNavigate?.('tasks')}>Open Tasks →</button>
            </div>
            <div className="phub__list">
              {allTasks.map(t => {
                const isDone = t.done || t.status === 'done';
                const priority = t.priority;
                return (
                  <button key={t.id} className={`phub__task-row${isDone?' done':''}`}
                    onClick={() => onNavigate?.('tasks')}>
                    <div className="phub__task-check" style={isDone?{background:'#10b981',borderColor:'#10b981'}:{}}>
                      {isDone && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                    </div>
                    <span className="phub__task-title">{t.title}</span>
                    {priority && <span className="phub__task-pri" style={{color:PRI_COLOR[priority]||'#94a3b8'}}>
                      {priority==='high'?'↑ High':priority==='medium'?'→ Med':'↓ Low'}
                    </span>}
                    {t.status && !t.done && <span className="phub__task-status">{t.status}</span>}
                    <span className="phub__open-arrow">→</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* ── Events ── */}
        {linkedEvents.length > 0 && (
          <section className="phub__section">
            <div className="phub__sec-head">
              <span className="phub__sec-title">📅 Events</span>
              <span className="phub__sec-count">{linkedEvents.length}</span>
              <button className="phub__sec-nav" onClick={() => onNavigate?.('calendar')}>Open Calendar →</button>
            </div>
            <div className="phub__list">
              {linkedEvents.map(ev => (
                <button key={ev.id} className="phub__event-row"
                  onClick={() => onNavigate?.('calendar')}
                  style={{'--ec': ev.color||p.color}}>
                  <div className="phub__event-dot" style={{background:ev.color||p.color}}/>
                  <div className="phub__event-info">
                    <span className="phub__event-title">{ev.title}</span>
                    <span className="phub__event-date">
                      {ev.startDate}{ev.startTime ? ` · ${ev.startTime}–${ev.endTime}` : ''}
                    </span>
                  </div>
                  <span className="phub__open-arrow">→</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ project, onSave, onClose }) {
  const [f, setF] = useState({ ...project });
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));
  return (
    <div className="em-overlay" onClick={onClose}>
      <div className="em" onClick={e=>e.stopPropagation()}>
        <div className="em-head">
          <h3>{project.createdAt && !project._edit ? 'New Project' : 'Edit Project'}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        <div className="em-body">
          <label>Icon</label>
          <div className="em-icons">{ICONS.map(ic=><button key={ic} className={`em-ic${f.icon===ic?' sel':''}`} onClick={()=>set('icon',ic)}>{ic}</button>)}</div>
          <label>Color</label>
          <div className="em-colors">{COLORS.map(c=><button key={c} className={`em-dot${f.color===c?' sel':''}`} style={{background:c}} onClick={()=>set('color',c)}/>)}</div>
          <label>Name</label>
          <input className="em-in" value={f.name} autoFocus onChange={e=>set('name',e.target.value)} placeholder="Project name..." />
          <label>Description</label>
          <textarea className="em-ta" rows={2} value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Short description..." />
          <div className="em-row">
            <div>
              <label>Status</label>
              <select className="em-sel" value={f.status} onChange={e=>set('status',e.target.value)}>
                {STATUSES.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label>Due Date</label>
              <input type="date" className="em-in" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)} />
            </div>
          </div>
          <label>Progress — {f.progress||0}%</label>
          <input type="range" min={0} max={100} value={f.progress||0} className="em-range"
            onChange={e=>set('progress',+e.target.value)} />
        </div>
        <div className="em-foot">
          <button className="em-ghost" onClick={onClose}>Cancel</button>
          <button className="em-save" style={{background:f.color}} onClick={()=>onSave(f)}>Save</button>
        </div>
      </div>
    </div>
  );
}
