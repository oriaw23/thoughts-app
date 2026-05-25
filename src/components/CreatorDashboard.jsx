import { useState, useEffect } from 'react';
import './CreatorDashboard.css';

// ── Read other stores ─────────────────────────────────────────────────────────
function readPipeline() { try { return JSON.parse(localStorage.getItem('foldbase_pipeline_v1')||'[]'); } catch { return []; } }
function readIdeas()    { try { return JSON.parse(localStorage.getItem('foldbase_ideas_v1')||'[]');    } catch { return []; } }
function readRevenue()  { try { return JSON.parse(localStorage.getItem('foldbase_revenue_v1')||'{"deals":[],"income":[]}'); } catch { return {deals:[],income:[]}; } }
function readTasks()    { try { const d=JSON.parse(localStorage.getItem('mynotion_v3')||'{}'); return d.tasks||[]; } catch { return []; } }
function readGoals()    { try { const d=JSON.parse(localStorage.getItem('mynotion_v3')||'{}'); return d.goals||[]; } catch { return []; } }
function readUser()     { try { return JSON.parse(localStorage.getItem('mynotion_user_v1')||'{"name":"Creator"}'); } catch { return {name:'Creator'}; } }

const STAGE_ORDER = ['idea','script','record','edit','scheduled','published'];
const STAGE_META  = {
  idea:      { label:'Ideas',     icon:'💡', color:'#eab308' },
  script:    { label:'Scripting', icon:'✍️', color:'#6366f1' },
  record:    { label:'Recording', icon:'🎬', color:'#ef4444' },
  edit:      { label:'Editing',   icon:'🎞️', color:'#f97316' },
  scheduled: { label:'Scheduled', icon:'📅', color:'#3b82f6' },
  published: { label:'Published', icon:'✅', color:'#22c55e' },
};
const fmt = n => '$'+Number(n||0).toLocaleString();
const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function CreatorDashboard({ onNavigate }) {
  const [data, setData] = useState({});

  useEffect(() => {
    const pipeline = readPipeline();
    const ideas    = readIdeas();
    const revenue  = readRevenue();
    const tasks    = readTasks();
    const goals    = readGoals();
    const user     = readUser();

    const now     = new Date().toISOString().slice(0,7);
    const monthRev = revenue.income.filter(i=>i.date?.startsWith(now)).reduce((s,i)=>s+Number(i.amount||0),0);
    const dealPipe = revenue.deals.filter(d=>!['paid','cancelled'].includes(d.status)).reduce((s,d)=>s+Number(d.amount||0),0);

    const stageCounts = {};
    STAGE_ORDER.forEach(s => { stageCounts[s] = pipeline.filter(p=>p.stage===s).length; });

    const inProgress = pipeline.filter(p=>['script','record','edit'].includes(p.stage)).slice(0,4);
    const dueThisWeek = pipeline.filter(p => {
      if (!p.dueDate) return false;
      const d = new Date(p.dueDate), now = new Date();
      return d >= now && d <= new Date(now.getTime()+7*86400000);
    });
    const topIdeas  = ideas.filter(i=>i.starred && i.status!=='archived').slice(0,4);
    const pendingTasks = tasks.filter(t=>t.status!=='done').slice(0,5);

    setData({ pipeline, ideas, revenue, user, monthRev, dealPipe, stageCounts, inProgress, dueThisWeek, topIdeas, pendingTasks, goals });
  }, []);

  if (!data.user) return null;
  const { user, monthRev, dealPipe, stageCounts, inProgress, dueThisWeek, topIdeas, pendingTasks, pipeline=[], ideas=[], goals=[] } = data;

  return (
    <div className="cd">

      {/* ── Header ── */}
      <div className="cd__header">
        <div className="cd__header-left">
          <p className="cd__greeting">{greeting()}, {user.name?.split(' ')[0] || 'Creator'} 👋</p>
          <p className="cd__date">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</p>
        </div>
        <div className="cd__header-right">
          <div className="cd__header-badge">
            <span className="cd__hb-dot"/>
            Creator OS
          </div>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="cd__body">

        {/* ── TOP STATS ROW ── */}
        <div className="cd__stats-row">
          <div className="cd__stat" onClick={()=>onNavigate?.('pipeline')}>
            <div className="cd__stat-icon" style={{background:'rgba(239,68,68,.12)',color:'#ef4444'}}>🎬</div>
            <div>
              <p className="cd__stat-label">In Production</p>
              <p className="cd__stat-val">{(stageCounts.script||0)+(stageCounts.record||0)+(stageCounts.edit||0)}</p>
            </div>
            <svg className="cd__stat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div className="cd__stat" onClick={()=>onNavigate?.('ideas')}>
            <div className="cd__stat-icon" style={{background:'rgba(234,179,8,.12)',color:'#eab308'}}>💡</div>
            <div>
              <p className="cd__stat-label">Ideas Ready</p>
              <p className="cd__stat-val">{ideas.filter(i=>i.status==='ready').length}</p>
            </div>
            <svg className="cd__stat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div className="cd__stat" onClick={()=>onNavigate?.('revenue')}>
            <div className="cd__stat-icon" style={{background:'rgba(34,197,94,.12)',color:'#22c55e'}}>💰</div>
            <div>
              <p className="cd__stat-label">This Month</p>
              <p className="cd__stat-val">{fmt(monthRev)}</p>
            </div>
            <svg className="cd__stat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
          <div className="cd__stat" onClick={()=>onNavigate?.('revenue')}>
            <div className="cd__stat-icon" style={{background:'rgba(59,130,246,.12)',color:'#3b82f6'}}>🤝</div>
            <div>
              <p className="cd__stat-label">Deal Pipeline</p>
              <p className="cd__stat-val">{fmt(dealPipe)}</p>
            </div>
            <svg className="cd__stat-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        </div>

        {/* ── Pipeline visual mini-bar ── */}
        <div className="cd__pipeline-bar" onClick={()=>onNavigate?.('pipeline')}>
          <div className="cd__pb-title">
            <span>Content Pipeline</span>
            <span className="cd__pb-total">{pipeline.length} total</span>
            <span className="cd__pb-link">View all →</span>
          </div>
          <div className="cd__pb-stages">
            {STAGE_ORDER.map(s => {
              const m = STAGE_META[s];
              const cnt = stageCounts[s]||0;
              return (
                <div key={s} className="cd__pb-stage">
                  <div className="cd__pb-stage-top">
                    <span className="cd__pb-stage-icon">{m.icon}</span>
                    <span className="cd__pb-stage-count" style={{color:m.color}}>{cnt}</span>
                  </div>
                  <div className="cd__pb-stage-bar-wrap">
                    <div className="cd__pb-stage-bar" style={{
                      height: `${Math.max(4, Math.min(48, cnt*12))}px`,
                      background: m.color,
                      opacity: cnt===0 ? .2 : 1
                    }}/>
                  </div>
                  <span className="cd__pb-stage-label">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="cd__grid">

          {/* In production */}
          <div className="cd__card">
            <div className="cd__card-head">
              <span className="cd__card-icon">🎬</span>
              <span className="cd__card-title">In Production</span>
              <button className="cd__card-link" onClick={()=>onNavigate?.('pipeline')}>View all →</button>
            </div>
            {inProgress.length === 0 ? (
              <div className="cd__card-empty">
                <p>Nothing in production.</p>
                <button onClick={()=>onNavigate?.('pipeline')}>Start a piece →</button>
              </div>
            ) : inProgress.map(item => {
              const s = STAGE_META[item.stage];
              return (
                <div key={item.id} className="cd__item">
                  <span className="cd__item-stage" style={{color:s.color,background:s.color+'18'}}>{s.icon} {s.label}</span>
                  <span className="cd__item-title">{item.title||'Untitled'}</span>
                  {item.dueDate && <span className="cd__item-due">📅 {item.dueDate}</span>}
                </div>
              );
            })}
          </div>

          {/* Due this week */}
          <div className="cd__card">
            <div className="cd__card-head">
              <span className="cd__card-icon">⏰</span>
              <span className="cd__card-title">Due This Week</span>
            </div>
            {dueThisWeek.length === 0 ? (
              <div className="cd__card-empty"><p>Nothing due this week. Nice!</p></div>
            ) : dueThisWeek.map(item => {
              const s = STAGE_META[item.stage];
              return (
                <div key={item.id} className="cd__item cd__item--urgent">
                  <span className="cd__item-stage" style={{color:s.color,background:s.color+'18'}}>{s.icon}</span>
                  <span className="cd__item-title">{item.title||'Untitled'}</span>
                  <span className="cd__item-due cd__item-due--red">📅 {item.dueDate}</span>
                </div>
              );
            })}
          </div>

          {/* Starred ideas */}
          <div className="cd__card">
            <div className="cd__card-head">
              <span className="cd__card-icon">⭐</span>
              <span className="cd__card-title">Top Ideas</span>
              <button className="cd__card-link" onClick={()=>onNavigate?.('ideas')}>Vault →</button>
            </div>
            {topIdeas.length === 0 ? (
              <div className="cd__card-empty">
                <p>No starred ideas yet.</p>
                <button onClick={()=>onNavigate?.('ideas')}>Open Idea Vault →</button>
              </div>
            ) : topIdeas.map(i => (
              <div key={i.id} className="cd__item">
                <span className="cd__item-plat">{i.platform}</span>
                <span className="cd__item-title">{i.title}</span>
                <span className="cd__item-type">{i.type}</span>
              </div>
            ))}
          </div>

          {/* Tasks */}
          <div className="cd__card">
            <div className="cd__card-head">
              <span className="cd__card-icon">✅</span>
              <span className="cd__card-title">Open Tasks</span>
              <button className="cd__card-link" onClick={()=>onNavigate?.('tasks')}>All tasks →</button>
            </div>
            {pendingTasks.length === 0 ? (
              <div className="cd__card-empty"><p>All clear! 🎉</p></div>
            ) : pendingTasks.map(t => (
              <div key={t.id} className="cd__item">
                <span className="cd__item-check"/>
                <span className="cd__item-title">{t.title||t.text}</span>
                {t.priority && (
                  <span className={`cd__item-pri cd__item-pri--${t.priority}`}>{t.priority}</span>
                )}
              </div>
            ))}
          </div>

        </div>

        {/* ── Goals strip ── */}
        {goals.length > 0 && (
          <div className="cd__goals" onClick={()=>onNavigate?.('goals')}>
            <div className="cd__goals-head">
              <span>🎯 Active Goals</span>
              <span className="cd__card-link">View all →</span>
            </div>
            <div className="cd__goals-row">
              {goals.filter(g=>g.status!=='completed').slice(0,4).map(g => (
                <div key={g.id} className="cd__goal-item">
                  <div className="cd__goal-top">
                    <span className="cd__goal-title">{g.title}</span>
                    <span className="cd__goal-pct" style={{color:g.color||'#6366f1'}}>{g.progress||0}%</span>
                  </div>
                  <div className="cd__goal-track">
                    <div className="cd__goal-fill" style={{width:`${g.progress||0}%`,background:g.color||'#6366f1'}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick actions ── */}
        <div className="cd__quick-actions">
          {[
            { icon:'💡', label:'Capture idea',   view:'ideas'    },
            { icon:'🎬', label:'Add to pipeline', view:'pipeline' },
            { icon:'💰', label:'Log income',      view:'revenue'  },
            { icon:'✅', label:'Add task',         view:'tasks'    },
            { icon:'📅', label:'Add to calendar', view:'calendar' },
            { icon:'📝', label:'New document',    view:'doc'      },
          ].map(a => (
            <button key={a.view} className="cd__qa-btn" onClick={()=>onNavigate?.(a.view)}>
              <span className="cd__qa-icon">{a.icon}</span>
              <span>{a.label}</span>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
