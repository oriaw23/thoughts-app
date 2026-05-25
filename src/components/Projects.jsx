import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import GraphView from './GraphView';
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
      description:'', dueDate:'', progress:0, banner:'', ...p,
    }));
  } catch { return []; }
}
function saveProjects(arr) { localStorage.setItem(KEY, JSON.stringify(arr)); }
function newProject() {
  return {
    id: uuidv4(), name:'New Project', icon:'🗂️', color:'#6366f1',
    status:'planning', description:'', dueDate:'', progress:0, banner:'',
    groupId: null,
    createdAt: new Date().toISOString(),
    tasks:[], goals:[], schedule:[], pageIds:[], goalIds:[], taskIds:[], eventIds:[],
  };
}
const st = (status) => STATUSES.find(s => s.id === status) || STATUSES[0];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Projects({ pages=[], tasks=[], events=[], goals=[], onNavigate }) {
  const [list,      setList]      = useState(loadProjects);
  const [open,      setOpen]      = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [graphOpen, setGraphOpen] = useState(false);
  const [view,      setView]      = useState('grid'); // 'grid' | 'list'

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
      {graphOpen && (
        <GraphView
          projects={list}
          pages={pages}
          tasks={tasks}
          goals={goals}
          onClose={() => setGraphOpen(false)}
          onOpenProject={(proj) => { setGraphOpen(false); setOpen(proj); }}
        />
      )}

      <div className="pp-head">
        <div>
          <h1 className="pp-title">🗂️ Projects</h1>
          <p className="pp-sub">{list.length} projects · {active} active · {done} done</p>
        </div>
        <div className="pp-head-actions">
          {/* View toggle */}
          <div className="pp-view-toggle">
            <button className={`pp-view-btn${view==='grid'?' active':''}`} onClick={() => setView('grid')} title="Grid view">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </button>
            <button className={`pp-view-btn${view==='list'?' active':''}`} onClick={() => setView('list')} title="List view">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </button>
          </div>
          <button className="pp-graph-btn" onClick={() => setGraphOpen(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="5" r="3"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/>
              <line x1="12" y1="8" x2="19" y2="14"/><line x1="12" y1="8" x2="5" y2="14"/>
            </svg>
            Graph
          </button>
          <button className="pp-new" onClick={() => setEditing(newProject())}>+ New Project</button>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="pp-empty">
          <span>🗂️</span>
          <h3>No projects yet</h3>
          <p>Create your first project and link tasks, goals, and pages to it</p>
          <button className="pp-new" onClick={() => setEditing(newProject())}>+ New Project</button>
        </div>
      ) : view === 'grid' ? (
        <div className="pp-grid">
          {list.map(p => {
            const status      = st(p.status);
            const intTasks    = p.tasks || [];
            const doneTasks   = intTasks.filter(t=>t.done).length;
            const linkedCount = (p.pageIds?.length||0)+(p.goalIds?.length||0)+(p.taskIds?.length||0)+(p.eventIds?.length||0);
            return (
              <button key={p.id} className="pp-card" onClick={() => setOpen(p)}
                style={{'--pp-color': p.color}}>
                <div className="pp-card-inner">
                  <div className="pp-card-top">
                    <span className="pp-card-icon">{p.icon}</span>
                    <h3 className="pp-card-name">{p.name}</h3>
                    <span className="pp-chip" style={{color:status.color,background:status.color+'15',borderColor:status.color+'33',flexShrink:0}}>
                      {status.label}
                    </span>
                  </div>
                  {p.description && <p className="pp-card-desc">{p.description}</p>}
                  <div className="pp-card-prog">
                    <div className="pp-card-bar2"><div style={{width:(p.progress||0)+'%',background:p.color}}/></div>
                    <span style={{color:p.color}}>{p.progress||0}%</span>
                  </div>
                  <div className="pp-card-chips">
                    {intTasks.length>0 && <span className="pp-chip">{doneTasks}/{intTasks.length} tasks</span>}
                    {p.dueDate         && <span className="pp-chip pp-chip-date">{p.dueDate}</span>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* ── List view ── */
        <div className="pp-list">
          {list.map(p => {
            const status    = st(p.status);
            const intTasks  = p.tasks || [];
            const doneTasks = intTasks.filter(t=>t.done).length;
            return (
              <button key={p.id} className="pp-row" onClick={() => setOpen(p)} style={{'--pp-color':p.color}}>
                <div className="pp-row-thumb" style={{background:p.color+'18',borderColor:p.color+'33'}}>
                  <span className="pp-row-icon">{p.icon}</span>
                </div>
                {/* Name + desc */}
                <div className="pp-row-info">
                  <p className="pp-row-name">{p.name}</p>
                  {p.description && <p className="pp-row-desc">{p.description}</p>}
                </div>
                {/* Status */}
                <span className="pp-row-badge"
                  style={{color:status.color, background:status.color+'18', borderColor:status.color+'33'}}>
                  {status.label}
                </span>
                {/* Progress */}
                <div className="pp-row-prog">
                  <div className="pp-row-track"><div style={{width:(p.progress||0)+'%',background:p.color}}/></div>
                  <span style={{color:p.color, minWidth:32}}>{p.progress||0}%</span>
                </div>
                {/* Due */}
                {p.dueDate && <span className="pp-row-due">📅 {p.dueDate}</span>}
                {/* Tasks */}
                {intTasks.length>0 && <span className="pp-row-tasks">✅ {doneTasks}/{intTasks.length}</span>}
                {/* Edit */}
                <button className="pp-row-edit" onClick={e=>{e.stopPropagation();setEditing({...p,_edit:true});}}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
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
  const status        = st(p.status);
  const linkedPages   = pages.filter(pg => (p.pageIds ||[]).includes(pg.id));
  const linkedGoals   = goals.filter(g  => (p.goalIds ||[]).includes(g.id));
  const linkedTasks   = tasks.filter(t  => (p.taskIds ||[]).includes(t.id));
  const linkedEvents  = events.filter(ev => (p.eventIds||[]).includes(ev.id));
  const internalTasks = (p.tasks||[]);
  const allTasks      = [...linkedTasks, ...internalTasks.filter(t=>!linkedTasks.find(lt=>lt.id===t.id))];
  const doneCount     = allTasks.filter(t=>t.done||t.status==='done').length;

  return (
    <div className="phub">

      {/* ── Hero banner ── */}
      <div className="phub__banner"
        style={p.banner
          ? { backgroundImage:`url(${p.banner})`, backgroundSize:'cover', backgroundPosition:'center' }
          : { background:`linear-gradient(135deg,${p.color}cc,${p.color}66)` }
        }
      >
        <div className="phub__banner-overlay"/>
        <div className="phub__banner-top">
          <button className="phub__back" onClick={onBack}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
            All Projects
          </button>
          <div className="phub__banner-actions">
            <button className="phub__hbtn" onClick={onEdit}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button className="phub__hbtn phub__hbtn--del" onClick={onDelete}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              Delete
            </button>
          </div>
        </div>
        <div className="phub__banner-info">
          <span className="phub__big-icon">{p.icon}</span>
          <div className="phub__banner-text">
            <div className="phub__name-row">
              <h1 className="phub__name">{p.name}</h1>
              <span className="phub__status-pill" style={{color:status.color,background:status.color+'33',borderColor:status.color+'55'}}>{status.label}</span>
            </div>
            {p.description && <p className="phub__desc">{p.description}</p>}
            <div className="phub__meta-row">
              {p.dueDate && <span className="phub__meta-chip">📅 {p.dueDate}</span>}
              <span className="phub__meta-chip">{doneCount}/{allTasks.length} tasks done</span>
              <span className="phub__meta-chip">{linkedGoals.length} goals</span>
            </div>
          </div>
          {/* Progress ring */}
          <div className="phub__prog-ring">
            <svg width="60" height="60" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5"/>
              <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,.9)" strokeWidth="5"
                strokeDasharray={`${(p.progress||0)/100*150.8} 150.8`}
                strokeLinecap="round" transform="rotate(-90 30 30)"/>
            </svg>
            <span className="phub__prog-pct">{p.progress||0}%</span>
          </div>
        </div>
      </div>

      {/* ── Stats strip ── */}
      <div className="phub__stats">
        <div className="phub__stat" style={{'--sc': p.color}}>
          <div className="phub__stat-ring">
            <svg width="44" height="44" viewBox="0 0 44 44">
              <circle cx="22" cy="22" r="17" fill="none" stroke="var(--bg-3)" strokeWidth="4"/>
              <circle cx="22" cy="22" r="17" fill="none" stroke={p.color} strokeWidth="4"
                strokeDasharray={`${(p.progress||0)/100*106.8} 106.8`}
                strokeLinecap="round" transform="rotate(-90 22 22)"/>
            </svg>
            <span style={{color:p.color}}>{p.progress||0}%</span>
          </div>
          <div className="phub__stat-info">
            <p className="phub__stat-label">Progress</p>
            <p className="phub__stat-val">{p.progress||0}%</p>
          </div>
        </div>
        <div className="phub__stat-divider"/>
        <div className="phub__stat">
          <span className="phub__stat-emoji">✅</span>
          <div className="phub__stat-info">
            <p className="phub__stat-label">Tasks done</p>
            <p className="phub__stat-val">{doneCount}<span className="phub__stat-of">/{allTasks.length}</span></p>
          </div>
          {allTasks.length > 0 && (
            <div className="phub__stat-mini-track">
              <div style={{width:`${allTasks.length ? doneCount/allTasks.length*100 : 0}%`, background:p.color}}/>
            </div>
          )}
        </div>
        <div className="phub__stat-divider"/>
        <div className="phub__stat">
          <span className="phub__stat-emoji">🎯</span>
          <div className="phub__stat-info">
            <p className="phub__stat-label">Goals</p>
            <p className="phub__stat-val">{linkedGoals.length}<span className="phub__stat-of"> linked</span></p>
          </div>
        </div>
        <div className="phub__stat-divider"/>
        <div className="phub__stat">
          <span className="phub__stat-emoji">📅</span>
          <div className="phub__stat-info">
            <p className="phub__stat-label">{p.dueDate ? 'Due date' : 'Status'}</p>
            <p className="phub__stat-val" style={{fontSize:14}}>{p.dueDate || status.label}</p>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="phub__body">
        <div className="phub__grid">

          {/* ── LEFT COLUMN ── */}
          <div className="phub__col">

            {/* 1. Goals */}
            <section className="phub__section">
              <div className="phub__sec-head" style={{'--pc': p.color}}>
                <span className="phub__sec-accent" style={{background:p.color}}/>
                <span className="phub__sec-title">Goals</span>
                {linkedGoals.length > 0 && <span className="phub__sec-count">{linkedGoals.length}</span>}
                <button className="phub__sec-nav" onClick={() => onNavigate?.('goals')}>
                  View all
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {linkedGoals.length > 0 ? (
                <div className="phub__goals-grid">
                  {linkedGoals.map(g => (
                    <button key={g.id} className="phub__goal-card" onClick={() => onNavigate?.('goals')}>
                      <div className="phub__goal-card-left">
                        <div className="phub__goal-ring">
                          <svg width="42" height="42" viewBox="0 0 42 42">
                            <circle cx="21" cy="21" r="16" fill="none" stroke="var(--bg-3)" strokeWidth="3.5"/>
                            <circle cx="21" cy="21" r="16" fill="none" stroke={g.color||p.color} strokeWidth="3.5"
                              strokeDasharray={`${(g.progress||0)/100*100.5} 100.5`}
                              strokeLinecap="round" transform="rotate(-90 21 21)"/>
                          </svg>
                          <span style={{color:g.color||p.color}}>{g.progress||0}%</span>
                        </div>
                      </div>
                      <div className="phub__goal-card-body">
                        <p className="phub__goal-name">{g.title}</p>
                        <p className="phub__goal-meta">
                          {g.milestones?.filter(m=>m.done).length||0}/{g.milestones?.length||0} milestones
                          {g.timeframe && <> · {g.timeframe}</>}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="phub__empty-hint">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                  Link goals from the Goals view
                </div>
              )}
            </section>

            {/* 2. Tasks */}
            <section className="phub__section">
              <div className="phub__sec-head" style={{'--pc': p.color}}>
                <span className="phub__sec-accent" style={{background:p.color}}/>
                <span className="phub__sec-title">Tasks</span>
                {allTasks.length > 0 && (
                  <span className="phub__sec-count">{doneCount}/{allTasks.length}</span>
                )}
                <button className="phub__sec-nav" onClick={() => onNavigate?.('tasks')}>
                  View all
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {allTasks.length > 0 && (
                <div className="phub__task-prog-bar">
                  <div style={{width:`${doneCount/allTasks.length*100}%`, background:p.color}}/>
                </div>
              )}
              {allTasks.length > 0 ? (
                <div className="phub__task-list">
                  {allTasks.map(t => {
                    const isDone = t.done || t.status==='done';
                    return (
                      <div key={t.id} className={`phub__task-row${isDone?' done':''}`}>
                        <div className="phub__task-check"
                          style={isDone ? {background:p.color, borderColor:p.color} : {}}>
                          {isDone && <svg width="9" height="9" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
                        </div>
                        <span className="phub__task-title">{t.title}</span>
                        {t.priority && (
                          <span className="phub__task-pri" style={{color:PRI_COLOR[t.priority]||'#94a3b8'}}>
                            {t.priority==='high'?'↑ High':t.priority==='medium'?'→ Med':'↓ Low'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="phub__empty-hint">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                  Link tasks from the Tasks view
                </div>
              )}
            </section>

          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="phub__col">

            {/* 3. Calendar */}
            <section className="phub__section">
              <div className="phub__sec-head" style={{'--pc': p.color}}>
                <span className="phub__sec-accent" style={{background:p.color}}/>
                <span className="phub__sec-title">Calendar</span>
                {linkedEvents.length > 0 && <span className="phub__sec-count">{linkedEvents.length}</span>}
                <button className="phub__sec-nav" onClick={() => onNavigate?.('calendar')}>
                  View all
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {linkedEvents.length > 0 ? (
                <div className="phub__events-list">
                  {linkedEvents.map(ev => {
                    const parts = ev.startDate ? ev.startDate.split('-') : [];
                    const day   = parts[2] || '';
                    const mon   = parts[1] ? new Date(ev.startDate).toLocaleString('default',{month:'short'}) : '';
                    return (
                      <button key={ev.id} className="phub__event-row" onClick={() => onNavigate?.('calendar')}>
                        <div className="phub__event-cal" style={{borderColor:ev.color||p.color}}>
                          <span className="phub__event-cal-mon" style={{background:ev.color||p.color}}>{mon}</span>
                          <span className="phub__event-cal-day">{day}</span>
                        </div>
                        <div className="phub__event-body">
                          <span className="phub__event-title">{ev.title}</span>
                          {ev.startTime && <span className="phub__event-date">{ev.startTime}–{ev.endTime}</span>}
                        </div>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="phub__row-arr"><polyline points="9 18 15 12 9 6"/></svg>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="phub__empty-hint">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Link events from the Calendar view
                </div>
              )}
            </section>

            {/* 4. Pages & Folders */}
            <section className="phub__section">
              <div className="phub__sec-head" style={{'--pc': p.color}}>
                <span className="phub__sec-accent" style={{background:p.color}}/>
                <span className="phub__sec-title">Pages & Folders</span>
                {linkedPages.length > 0 && <span className="phub__sec-count">{linkedPages.length}</span>}
                <button className="phub__sec-nav" onClick={() => onNavigate?.('pages')}>
                  View all
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
              {linkedPages.length > 0 ? (
                <div className="phub__pages-list">
                  {linkedPages.map(pg => (
                    <button key={pg.id} className="phub__page-card"
                      onClick={() => onNavigate?.('pages', {pageId:pg.id})}>
                      <span className="phub__page-icon">{pg.icon||'📄'}</span>
                      <div className="phub__page-info">
                        <span className="phub__page-name">{pg.title||'Untitled'}</span>
                        {pg.updatedAt && <span className="phub__page-date">{new Date(pg.updatedAt).toLocaleDateString()}</span>}
                      </div>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="phub__row-arr"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="phub__empty-hint">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  Link pages from the Pages view
                </div>
              )}
            </section>

          </div>
        </div>

        {/* 5. Canvas — full width */}
        <button className="phub__canvas-cta" onClick={() => onNavigate?.('canvas')}>
          <div className="phub__canvas-bg" style={{background:`linear-gradient(135deg,${p.color}22,${p.color}0a)`}}/>
          <div className="phub__canvas-content">
            <div className="phub__canvas-icon" style={{background:p.color+'18', borderColor:p.color+'33'}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="1.6" strokeLinecap="round">
                <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
                <circle cx="12" cy="12" r="2"/>
              </svg>
            </div>
            <div>
              <p className="phub__canvas-label">Open in Canvas</p>
              <p className="phub__canvas-sub">Visualize your project on an infinite whiteboard</p>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{color:'var(--text-3)', flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
        </button>

      </div>
    </div>
  );
}

// ── Project creator / editor modal ───────────────────────────────────────────
function EditModal({ project, onSave, onClose }) {
  const [f,         setF]         = useState({ ...project });
  const [iconOpen,  setIconOpen]  = useState(false);
  const [bannerTab, setBannerTab] = useState('color'); // 'color' | 'image'
  const fileRef = useRef(null);
  const set = (k, v) => setF(prev => ({ ...prev, [k]: v }));

  const handleFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => set('banner', ev.target.result);
    reader.readAsDataURL(file);
  };

  const isNew  = !project._edit;
  const valid  = f.name.trim().length > 0;
  const status = STATUSES.find(s => s.id === f.status) || STATUSES[0];

  // close on Escape
  const onKey = e => { if (e.key === 'Escape') { iconOpen ? setIconOpen(false) : onClose(); } };

  return (
    <div className="pm-overlay" onClick={onClose} onKeyDown={onKey}>
      <div className="pm" onClick={e => e.stopPropagation()}>

        {/* ── Banner (colour or image) ── */}
        <div className="pm-banner"
          style={f.banner
            ? { backgroundImage:`url(${f.banner})`, backgroundSize:'cover', backgroundPosition:'center' }
            : { background:`linear-gradient(145deg,${f.color}dd,${f.color}88)` }
          }
        >

          {/* Close */}
          <button className="pm-x" onClick={onClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Icon button */}
          <button className={`pm-icon-btn${iconOpen ? ' open' : ''}`} onClick={() => setIconOpen(o => !o)}>
            <span className="pm-icon">{f.icon}</span>
            <span className="pm-icon-label">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Change icon
            </span>
          </button>

          {/* Icon picker overlay */}
          {iconOpen && (
            <div className="pm-icon-picker" onClick={e => e.stopPropagation()}>
              <p className="pm-icon-picker-label">Choose an icon</p>
              <div className="pm-icon-grid">
                {ICONS.map(ic => (
                  <button key={ic}
                    className={`pm-ic${f.icon === ic ? ' sel' : ''}`}
                    onClick={() => { set('icon', ic); setIconOpen(false); }}>
                    {ic}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs: Color | Image */}
          <div className="pm-cover-bar">
            <div className="pm-cover-tabs">
              <button className={`pm-cover-tab${bannerTab==='color'?' active':''}`} onClick={() => setBannerTab('color')}>Color</button>
              <button className={`pm-cover-tab${bannerTab==='image'?' active':''}`} onClick={() => setBannerTab('image')}>Image</button>
            </div>
            {bannerTab === 'color' ? (
              <div className="pm-swatches">
                {COLORS.map(c => (
                  <button key={c} className={`pm-swatch${f.color===c?' sel':''}`}
                    style={{background:c}} onClick={() => { set('color',c); if(f.banner) set('banner',''); }} />
                ))}
              </div>
            ) : (
              <div className="pm-img-row">
                <input
                  className="pm-url-in"
                  value={f.banner && !f.banner.startsWith('data:') ? f.banner : ''}
                  placeholder="Paste image URL…"
                  onChange={e => set('banner', e.target.value)}
                />
                <button className="pm-upload-btn" onClick={() => fileRef.current?.click()}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  Upload
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
                {f.banner && (
                  <button className="pm-clear-img" onClick={() => set('banner','')}>✕</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Body ── */}
        <div className="pm-body">

          {/* Name */}
          <input
            className="pm-name"
            dir="auto"
            value={f.name === 'New Project' && isNew ? '' : f.name}
            autoFocus
            placeholder="Project name…"
            onChange={e => set('name', e.target.value || 'New Project')}
            onFocus={e => { if (f.name === 'New Project' && isNew) e.target.select(); }}
          />

          {/* Description */}
          <textarea
            className="pm-desc"
            dir="auto"
            rows={2}
            value={f.description}
            placeholder="What's this project about? (optional)"
            onChange={e => set('description', e.target.value)}
          />

          {/* Status */}
          <div className="pm-field-group">
            <p className="pm-field-label">Status</p>
            <div className="pm-status-row">
              {STATUSES.map(s => (
                <button key={s.id}
                  className={`pm-status-pill${f.status === s.id ? ' sel' : ''}`}
                  style={f.status === s.id
                    ? { background: s.color + '22', color: s.color, borderColor: s.color + '66' }
                    : {}}
                  onClick={() => set('status', s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group */}
          {(() => {
            const groups = (() => { try { return JSON.parse(localStorage.getItem('mynotion_groups_v1')||'[]'); } catch { return []; } })();
            if (!groups.length) return null;
            return (
              <div className="pm-field-group">
                <p className="pm-field-label">Group</p>
                <select className="pm-status-select" value={f.groupId||''} onChange={e=>set('groupId',e.target.value||null)}>
                  <option value="">No group</option>
                  {groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            );
          })()}

          {/* Due date + Progress */}
          <div className="pm-two-col">
            <div className="pm-field-group">
              <p className="pm-field-label">Due date</p>
              <input type="date" className="pm-date-in" value={f.dueDate}
                onChange={e => set('dueDate', e.target.value)} />
            </div>
            <div className="pm-field-group" style={{ flex: 2 }}>
              <p className="pm-field-label">
                Progress
                <span className="pm-prog-val" style={{ color: f.color }}>{f.progress || 0}%</span>
              </p>
              <div className="pm-slider-wrap">
                <input type="range" min={0} max={100} value={f.progress || 0}
                  className="pm-slider"
                  style={{ '--c': f.color, '--pct': `${f.progress || 0}%` }}
                  onChange={e => set('progress', +e.target.value)} />
                <div className="pm-prog-track">
                  <div className="pm-prog-fill" style={{ width: `${f.progress || 0}%`, background: f.color }} />
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="pm-foot">
          <button className="pm-cancel" onClick={onClose}>Cancel</button>
          <button className="pm-save" style={{ background: f.color, boxShadow: `0 4px 16px ${f.color}55` }}
            disabled={!valid}
            onClick={() => onSave(f)}>
            {isNew ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Create Project
              </>
            ) : 'Save Changes'}
          </button>
        </div>

      </div>
    </div>
  );
}
