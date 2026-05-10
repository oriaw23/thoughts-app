import { useState, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { computeStreak, getWeeklyActivity } from '../store';
import { CATEGORIES, breakdownGoal, getApiKey } from '../ai';
import ProjectPicker from './ProjectPicker';
import './GoalsEngine.css';

const TIMEFRAMES  = ['1 Week', '1 Month', '3 Months', '1 Year'];
const GOAL_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899'];

// ── Main export ───────────────────────────────────────────────────────────────
export default function GoalsEngine({
  goals, tasks, weeklyGoals=[],
  onCreateGoal, onUpdateGoal, onToggleMilestone, onDeleteGoal, onCreateTask,
  onCreateWeeklyGoal, onToggleWeeklyGoal, onDeleteWeeklyGoal,
  onAddJournalEntry, onDeleteJournalEntry,
}) {
  const BLANK_FORM = { title:'', category:'startup', timeframe:'1 Month', color: GOAL_COLORS[0], milestones:[''], dailyTask:'' };
  const [selectedId, setSelectedId] = useState(null);
  const [showForm, setShowForm]     = useState(false);
  const [generating, setGenerating] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Milestone helpers
  const addMs = (afterIdx = form.milestones.length - 1) => {
    setForm(f => {
      const next = [...f.milestones];
      next.splice(afterIdx + 1, 0, '');
      return { ...f, milestones: next };
    });
  };
  const updateMs = (i, v) => setForm(f => {
    const m = [...f.milestones]; m[i] = v; return { ...f, milestones: m };
  });
  const removeMs = (i) => setForm(f => {
    const m = f.milestones.filter((_, idx) => idx !== i);
    return { ...f, milestones: m.length ? m : [''] };
  });

  // Create goal directly with user-defined milestones
  const handleCreate = () => {
    if (!form.title.trim()) return;
    const milestones = form.milestones.filter(m => m.trim());
    onCreateGoal({ ...form, milestones, weeklyTasks: [] });
    setForm(BLANK_FORM);
    setShowForm(false);
  };

  // AI suggestion: fills in milestones from AI but lets user edit before saving
  const handleSuggestAI = async () => {
    if (!form.title.trim()) return;
    setGenerating(true);
    try {
      const breakdown = await breakdownGoal(form.title, form.category, form.timeframe, getApiKey());
      setForm(f => ({
        ...f,
        milestones: breakdown.milestones?.length ? breakdown.milestones : f.milestones,
        dailyTask:  breakdown.dailyTask || f.dailyTask,
      }));
    } finally { setGenerating(false); }
  };

  // Progress stats
  const streak         = useMemo(() => computeStreak(tasks), [tasks]);
  const weekActivity   = useMemo(() => getWeeklyActivity(tasks), [tasks]);
  const maxActivity    = Math.max(...weekActivity.map(d => d.count), 1);
  const totalDone      = tasks.filter(t => t.status === 'done').length;
  const completionRate = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;

  const categoryStats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done');
    return Object.entries(CATEGORIES).map(([key, def]) => ({
      key, ...def,
      count: done.filter(t => (def.keywords||[]).some(k => t.title.toLowerCase().includes(k.toLowerCase()))).length,
    }));
  }, [tasks]);
  const catTotal = categoryStats.reduce((s,c) => s+c.count, 0) || 1;

  const last30 = useMemo(() => Array.from({ length:30 }, (_,i) => {
    const d = subDays(new Date(), 29-i);
    const dateStr = format(d,'yyyy-MM-dd');
    return { d, dateStr, count: tasks.filter(t=>t.completedAt?.startsWith(dateStr)).length };
  }), [tasks]);
  const maxHeat = Math.max(...last30.map(d=>d.count), 1);
  const heatColor = n => {
    if (!n) return '#f1f5f9';
    const r = n/maxHeat;
    if (r<0.25) return '#c7d2fe'; if (r<0.5) return '#a5b4fc';
    if (r<0.75) return '#818cf8'; return '#4f46e5';
  };

  // ── Goal Detail view ──────────────────────────────────────────────────────
  if (selectedId) {
    const goal = goals.find(g => g.id === selectedId);
    if (goal) return (
      <GoalDetail
        goal={goal}
        onBack={() => setSelectedId(null)}
        onToggleMilestone={onToggleMilestone}
        onDeleteGoal={(id) => { onDeleteGoal(id); setSelectedId(null); }}
        onCreateTask={onCreateTask}
        onAddJournalEntry={onAddJournalEntry}
        onDeleteJournalEntry={onDeleteJournalEntry}
      />
    );
  }

  // ── Goals list + Progress ─────────────────────────────────────────────────
  return (
    <div className="gp">

      {/* Header */}
      <div className="gp__header">
        <div>
          <h1 className="gp__title">Goals & Progress</h1>
          <p className="gp__subtitle">Set goals · Track milestones · Stay consistent</p>
        </div>
        <button className="gp__new-btn" onClick={() => setShowForm(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Goal
        </button>
      </div>

      {/* New goal form */}
      {showForm && (
        <div className="gp__form">
          <h3 className="gp__form-h">New Goal</h3>

          {/* Title */}
          <input className="gp__form-title-input" autoFocus
            placeholder="What do you want to achieve? (e.g. Run 5km without stopping)"
            value={form.title} onChange={e => set('title',e.target.value)} />

          <div className="gp__form-cols">
            <div className="gp__form-group">
              <label>Category</label>
              <div className="gp__cat-grid">
                {Object.entries(CATEGORIES).map(([key,def]) => (
                  <button key={key} className={`gp__cat-btn${form.category===key?' active':''}`}
                    style={form.category===key?{background:def.bg,borderColor:def.color,color:def.color}:{}}
                    onClick={() => set('category',key)}>{def.icon} {def.label}</button>
                ))}
              </div>
            </div>
            <div className="gp__form-group">
              <label>Timeframe</label>
              <div className="gp__tf-row">
                {TIMEFRAMES.map(t=>(
                  <button key={t} className={`gp__tf-btn${form.timeframe===t?' active':''}`}
                    onClick={()=>set('timeframe',t)}>{t}</button>
                ))}
              </div>
              <label style={{marginTop:12}}>Color</label>
              <div className="gp__color-row">
                {GOAL_COLORS.map(c=>(
                  <button key={c} className={`gp__color-dot${form.color===c?' sel':''}`}
                    style={{background:c}} onClick={()=>set('color',c)} />
                ))}
              </div>
            </div>
          </div>

          {/* ── Milestones ── */}
          <div className="gp__form-group">
            <div className="gp__ms-header">
              <label>Key Milestones</label>
              <button
                className={`gp__ai-btn${generating?' loading':''}`}
                onClick={handleSuggestAI}
                disabled={!form.title.trim() || generating}
                title="Let AI suggest milestones based on your goal"
              >
                {generating
                  ? <><span className="gp__spinner"/>Thinking…</>
                  : <>✦ Suggest with AI</>
                }
              </button>
            </div>
            <div className="gp__ms-list">
              {form.milestones.map((ms, i) => (
                <div key={i} className="gp__ms-row">
                  <span className="gp__ms-num" style={{color: form.color}}>{i + 1}</span>
                  <input
                    className="gp__ms-input"
                    value={ms}
                    placeholder={`Milestone ${i + 1}…`}
                    onChange={e => updateMs(i, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') { e.preventDefault(); addMs(i); }
                      if (e.key === 'Backspace' && ms === '' && form.milestones.length > 1) {
                        e.preventDefault(); removeMs(i);
                      }
                    }}
                  />
                  {form.milestones.length > 1 && (
                    <button className="gp__ms-del" onClick={() => removeMs(i)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  )}
                </div>
              ))}
              <button className="gp__ms-add-btn" onClick={() => addMs()}>
                + Add Milestone
              </button>
            </div>
          </div>

          {/* Daily task (optional) */}
          <div className="gp__form-group">
            <label>Daily Task <span className="gp__optional">(optional)</span></label>
            <input className="gp__form-title-input" style={{fontSize:14}}
              placeholder="One small action you'll do every day toward this goal…"
              value={form.dailyTask} onChange={e => set('dailyTask', e.target.value)} />
          </div>

          <div className="gp__form-foot">
            <button className="gp__form-cancel" onClick={() => { setShowForm(false); setForm(BLANK_FORM); }}>Cancel</button>
            <button
              className={`gp__form-submit${!form.title.trim()?' disabled':''}`}
              onClick={handleCreate}
              disabled={!form.title.trim()}
            >
              Create Goal
            </button>
          </div>
        </div>
      )}

      {/* ── Weekly Goals ── */}
      <WeeklyGoals weeklyGoals={weeklyGoals}
        onCreate={onCreateWeeklyGoal} onToggle={onToggleWeeklyGoal} onDelete={onDeleteWeeklyGoal} />

      {/* ── Goals section ── */}
      <div className="gp__section-head">
        <span className="gp__section-icon">🎯</span>
        <span className="gp__section-title">Goals</span>
        <span className="gp__section-count">{goals.length}</span>
      </div>

      {goals.length === 0 && !showForm ? (
        <div className="gp__empty">
          <div className="gp__empty-icon">🎯</div>
          <h3>No goals yet</h3>
          <p>Define your first goal and set the milestones on the way</p>
          <button className="gp__empty-btn" onClick={()=>setShowForm(true)}>+ Set First Goal</button>
        </div>
      ) : (
        <div className="gp__grid">
          {goals.map(goal => {
            const catDef = CATEGORIES[goal.category] || CATEGORIES.personal;
            const done   = goal.milestones.filter(m=>m.done).length;
            return (
              <button key={goal.id} className="gp__card gp__card--clickable" style={{'--gc':goal.color}}
                onClick={() => setSelectedId(goal.id)}>
                <div className="gp__card-stripe" style={{background:goal.color}}/>
                <div className="gp__card-head">
                  <span className="gp__card-badge" style={{background:catDef.bg,color:catDef.color}}>{catDef.icon} {catDef.label}</span>
                  <button className="gp__act-btn gp__act-btn--del" onClick={e=>{e.stopPropagation();onDeleteGoal(goal.id);}}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
                <h3 className="gp__card-title">{goal.title}</h3>
                <div className="gp__card-meta">
                  <span>⏱ {goal.timeframe}</span>
                  <span>{done}/{goal.milestones.length} milestones</span>
                </div>
                <div className="gp__card-prog">
                  <div className="gp__prog-track">
                    <div className="gp__prog-fill" style={{width:`${goal.progress}%`,background:goal.color}}/>
                  </div>
                  <span className="gp__prog-pct" style={{color:goal.color}}>{goal.progress}%</span>
                </div>
                <div className="gp__card-open-hint">Click to open →</div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Progress section ── */}
      <div className="gp__section-head gp__section-head--progress">
        <span className="gp__section-icon">📊</span>
        <span className="gp__section-title">Progress</span>
      </div>

      <div className="gp__stats">
        <div className="gp__stat gp__stat--streak">
          <div className="gp__stat-icon">🔥</div>
          <div className="gp__stat-val">{streak}</div>
          <div className="gp__stat-lbl">Day Streak</div>
          {streak>=3 && <div className="gp__stat-badge">On fire!</div>}
        </div>
        <div className="gp__stat gp__stat--done">
          <div className="gp__stat-icon">✅</div>
          <div className="gp__stat-val">{totalDone}</div>
          <div className="gp__stat-lbl">Tasks Completed</div>
        </div>
        <div className="gp__stat gp__stat--rate">
          <div className="gp__stat-icon">📈</div>
          <div className="gp__stat-val">{completionRate}%</div>
          <div className="gp__stat-lbl">Completion Rate</div>
          <div className="gp__stat-track"><div className="gp__stat-fill" style={{width:`${completionRate}%`}}/></div>
        </div>
        <div className="gp__stat gp__stat--goals">
          <div className="gp__stat-icon">🎯</div>
          <div className="gp__stat-val">{goals.length}</div>
          <div className="gp__stat-lbl">Active Goals</div>
        </div>
      </div>

      <div className="gp__charts">
        <div className="gp__pcard">
          <div className="gp__pcard-h">Weekly Activity</div>
          <div className="gp__week-chart">
            {weekActivity.map((day,i)=>{
              const h=maxActivity?(day.count/maxActivity)*100:0;
              const isToday=i===weekActivity.length-1;
              return(
                <div key={i} className="gp__bcol">
                  <div className="gp__bwrap"><div className={`gp__bar${isToday?' today':''}`} style={{height:`${Math.max(h,4)}%`}} title={`${day.count} tasks`}/></div>
                  <span className="gp__bar-n">{day.count||''}</span>
                  <span className="gp__bar-lbl">{format(day.date,'EEE')}</span>
                </div>
              );
            })}
          </div>
          {weekActivity.every(d=>!d.count)&&<p className="gp__pcard-empty">Complete tasks to see activity</p>}
        </div>

        <div className="gp__pcard">
          <div className="gp__pcard-h">By Category</div>
          <div className="gp__cat-list">
            {categoryStats.map(cat=>{
              const pct=Math.round((cat.count/catTotal)*100);
              return(
                <div key={cat.key} className="gp__cat-row">
                  <span className="gp__cat-ic">{cat.icon}</span>
                  <span className="gp__cat-lbl">{cat.label}</span>
                  <div className="gp__cat-track"><div className="gp__cat-fill" style={{width:`${pct}%`,background:cat.color}}/></div>
                  <span className="gp__cat-n" style={{color:cat.color}}>{cat.count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {goals.length>0&&(
          <div className="gp__pcard gp__pcard--wide">
            <div className="gp__pcard-h">Goals Progress</div>
            <div className="gp__goal-rows">
              {goals.map(goal=>{
                const catDef=CATEGORIES[goal.category]||CATEGORIES.personal;
                return(
                  <div key={goal.id} className="gp__goal-row">
                    <div className="gp__goal-info">
                      <span className="gp__goal-icon">{catDef.icon}</span>
                      <div>
                        <div className="gp__goal-name">{goal.title}</div>
                        <div className="gp__goal-meta">{goal.timeframe} · {goal.milestones.filter(m=>m.done).length}/{goal.milestones.length} milestones</div>
                      </div>
                    </div>
                    <div className="gp__goal-track"><div className="gp__goal-fill" style={{width:`${goal.progress}%`,background:goal.color}}/></div>
                    <span className="gp__goal-pct" style={{color:goal.color}}>{goal.progress}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="gp__pcard gp__pcard--wide">
          <div className="gp__pcard-h">30-Day Activity</div>
          <div className="gp__heatmap">
            {last30.map((day,i)=>(
              <div key={i} className="gp__heat-cell" style={{background:heatColor(day.count)}} title={`${format(day.d,'MMM d')}: ${day.count} tasks`}/>
            ))}
          </div>
          <div className="gp__heat-legend">
            <span className="gp__legend-lbl">Less</span>
            {['#f1f5f9','#c7d2fe','#a5b4fc','#818cf8','#4f46e5'].map(c=>(
              <div key={c} className="gp__legend-cell" style={{background:c}}/>
            ))}
            <span className="gp__legend-lbl">More</span>
          </div>
        </div>

        <div className="gp__pcard">
          <div className="gp__pcard-h">🏆 Hall of Fame</div>
          <div className="gp__records">
            <div className="gp__record"><span className="gp__record-icon">🔥</span><div><div className="gp__record-val">{streak}</div><div className="gp__record-lbl">Current Streak</div></div></div>
            <div className="gp__record"><span className="gp__record-icon">⭐</span><div><div className="gp__record-val">{totalDone}</div><div className="gp__record-lbl">Tasks Done</div></div></div>
            <div className="gp__record"><span className="gp__record-icon">🎯</span><div><div className="gp__record-val">{goals.filter(g=>g.progress===100).length}</div><div className="gp__record-lbl">Goals Achieved</div></div></div>
            <div className="gp__record"><span className="gp__record-icon">📅</span><div><div className="gp__record-val">{last30.filter(d=>d.count>0).length}</div><div className="gp__record-lbl">Active Days (30d)</div></div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Weekly Goals ──────────────────────────────────────────────────────────────
function WeeklyGoals({ weeklyGoals, onCreate, onToggle, onDelete }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle]   = useState('');

  const submit = () => {
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle('');
    setAdding(false);
  };

  const done = weeklyGoals.filter(g => g.done).length;

  return (
    <div className="gp__wg">
      <div className="gp__section-head">
        <span className="gp__section-icon">📅</span>
        <span className="gp__section-title">Weekly Goals</span>
        {weeklyGoals.length > 0 && (
          <span className="gp__section-count">{done}/{weeklyGoals.length}</span>
        )}
        <button className="gp__wg-add" onClick={() => setAdding(true)}>+ Add</button>
      </div>

      {weeklyGoals.length === 0 && !adding && (
        <p className="gp__wg-empty">No weekly goals — add what you want to achieve this week</p>
      )}

      <div className="gp__wg-list">
        {weeklyGoals.map(g => (
          <div key={g.id} className={`gp__wg-item${g.done?' done':''}`}>
            <button className="gp__wg-check" onClick={() => onToggle(g.id)}>
              {g.done && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>}
            </button>
            <span className="gp__wg-title">{g.title}</span>
            <button className="gp__wg-del" onClick={() => onDelete(g.id)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        ))}
      </div>

      {adding && (
        <div className="gp__wg-form">
          <input className="gp__wg-input" autoFocus value={title}
            placeholder="Weekly goal..."
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if(e.key==='Enter') submit(); if(e.key==='Escape') setAdding(false); }} />
          <button className="gp__wg-save" onClick={submit}>Add</button>
          <button className="gp__wg-cancel" onClick={() => setAdding(false)}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Journal component ─────────────────────────────────────────────────────────
const MOODS = ['😊','😄','🔥','💪','😐','😔','😤','🤔','😴','✨'];

function Journal({ entries=[], goalColor, onAdd, onDelete }) {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAdd({ text: text.trim(), mood });
    setText(''); setMood('');
  };

  const sorted = [...entries].sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en', { month:'long', day:'numeric', year:'numeric' });

  return (
    <div className="gpj">
      {/* New entry form */}
      <div className="gpj__form">
        <div className="gpj__mood-row">
          {MOODS.map(m => (
            <button key={m} className={`gpj__mood-btn${mood===m?' active':''}`}
              onClick={() => setMood(mood===m?'':m)}>{m}</button>
          ))}
        </div>
        <textarea
          className="gpj__textarea"
          value={text}
          rows={4}
          placeholder="Write about your progress, feelings, thoughts on this goal..."
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter' && e.metaKey) submit(); }}
        />
        <div className="gpj__form-foot">
          <span className="gpj__today">{fmtDate(new Date().toISOString())}</span>
          <button className={`gpj__save${!text.trim()?' disabled':''}`} onClick={submit} disabled={!text.trim()}>
            Save Entry
          </button>
        </div>
      </div>

      {/* Entries */}
      {sorted.length === 0 && (
        <div className="gpj__empty">
          <span>📔</span>
          <p>No entries yet</p>
          <small>Start writing to track your journey, feelings and progress</small>
        </div>
      )}
      <div className="gpj__entries">
        {sorted.map(entry => (
          <div key={entry.id} className="gpj__entry">
            <div className="gpj__entry-head">
              <div className="gpj__entry-meta">
                {entry.mood && <span className="gpj__entry-mood">{entry.mood}</span>}
                <span className="gpj__entry-date">{fmtDate(entry.createdAt)}</span>
              </div>
              <button className="gpj__entry-del" onClick={() => onDelete(entry.id)}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <p className="gpj__entry-text">{entry.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Goal Detail Page ──────────────────────────────────────────────────────────
function GoalDetail({ goal, onBack, onToggleMilestone, onDeleteGoal, onCreateTask, onAddJournalEntry, onDeleteJournalEntry }) {
  const [detailTab, setDetailTab] = useState('journey');
  const catDef = CATEGORIES[goal.category] || CATEGORIES.personal;
  const doneCnt = goal.milestones.filter(m => m.done).length;
  const currentIdx = goal.milestones.findIndex(m => !m.done);
  const journal = goal.journal || [];

  return (
    <div className="gpd" style={{ '--gc': goal.color }}>

      {/* ── Header ── */}
      <div className="gpd__head">
        <button className="gpd__back" onClick={onBack}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
          All Goals
        </button>
        <div className="gpd__hero">
          <span className="gpd__cat" style={{background:catDef.bg, color:catDef.color}}>
            {catDef.icon} {catDef.label}
          </span>
          <h1 className="gpd__title">{goal.title}</h1>
          <div className="gpd__meta-row">
            <span className="gpd__meta-chip">⏱ {goal.timeframe}</span>
            <span className="gpd__meta-chip">{doneCnt}/{goal.milestones.length} milestones</span>
            {goal.progress === 100 && <span className="gpd__achieved-badge">🏆 Achieved!</span>}
          </div>
          <div className="gpd__prog-row">
            <div className="gpd__prog-track">
              <div className="gpd__prog-fill" style={{width:`${goal.progress}%`, background:goal.color}}/>
            </div>
            <span className="gpd__prog-pct">{goal.progress}%</span>
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="gpd__tab-bar">
        <button className={`gpd__tab-btn${detailTab==='journey'?' active':''}`} onClick={() => setDetailTab('journey')}>
          🗺️ Journey
        </button>
        <button className={`gpd__tab-btn${detailTab==='journal'?' active':''}`} onClick={() => setDetailTab('journal')}>
          📔 Journal
          {journal.length > 0 && <span className="gpd__tab-count">{journal.length}</span>}
        </button>
      </div>

      {/* ── Body ── */}
      <div className="gpd__body">

      {detailTab === 'journal' && (
        <Journal
          entries={journal}
          goalColor={goal.color}
          onAdd={entry => onAddJournalEntry?.(goal.id, entry)}
          onDelete={entryId => onDeleteJournalEntry?.(goal.id, entryId)}
        />
      )}

      {detailTab === 'journey' && <>
        {/* Journey path */}
        <div className="gpd__journey">
          <div className="gpd__journey-label">🗺️ Road to Success</div>

          {/* Start */}
          <div className="gpd__step gpd__step--start">
            <div className="gpd__step-node" style={{background:goal.color}}>🚀</div>
            <div className="gpd__step-connector"/>
            <div className="gpd__step-info">
              <span className="gpd__step-text" style={{color:goal.color, fontWeight:700}}>Goal Started</span>
            </div>
          </div>

          {/* Milestones */}
          {goal.milestones.map((m, i) => {
            const isCurrent = i === currentIdx;
            const isLast    = i === goal.milestones.length - 1;
            return (
              <div key={m.id} className={`gpd__step${m.done?' gpd__step--done':''}${isCurrent?' gpd__step--current':''}`}>
                <button className="gpd__step-node" onClick={() => onToggleMilestone(goal.id, m.id)}
                  style={m.done ? {background:goal.color,borderColor:goal.color} : isCurrent ? {borderColor:goal.color} : {}}>
                  {m.done
                    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    : <span className="gpd__step-num">{i+1}</span>
                  }
                </button>
                {!isLast && <div className="gpd__step-connector"/>}
                <div className="gpd__step-info">
                  <span className="gpd__step-text">{m.title}</span>
                  {isCurrent && <span className="gpd__step-badge" style={{background:goal.color+'22',color:goal.color}}>← Next step</span>}
                </div>
              </div>
            );
          })}

          {/* Finish */}
          <div className={`gpd__step gpd__step--end${goal.progress===100?' gpd__step--achieved':''}`}>
            <div className="gpd__step-node" style={goal.progress===100?{background:goal.color}:{}}>
              {goal.progress===100 ? '🏆' : '🎯'}
            </div>
            <div className="gpd__step-info">
              <span className="gpd__step-text" style={goal.progress===100?{color:goal.color,fontWeight:700}:{}}>
                {goal.progress===100 ? 'Goal Achieved!' : 'Finish Line'}
              </span>
            </div>
          </div>
        </div>

        {/* Side panel */}
        <div className="gpd__side">

          {goal.dailyTask && (
            <div className="gpd__panel">
              <div className="gpd__panel-title">⚡ Daily Task</div>
              <div className="gpd__daily-text">{goal.dailyTask}</div>
              <button className="gpd__daily-add"
                onClick={() => onCreateTask({title:goal.dailyTask, priority:'high', status:'todo'})}>
                + Add to Tasks
              </button>
            </div>
          )}

          {goal.weeklyTasks?.length > 0 && (
            <div className="gpd__panel">
              <div className="gpd__panel-title">📅 Weekly Tasks</div>
              <div className="gpd__wt-list">
                {goal.weeklyTasks.map((wt,i) => (
                  <div key={i} className="gpd__wt-item">
                    <span className="gpd__wt-dot" style={{background:goal.color}}/>
                    <span>{wt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="gpd__panel">
            <div className="gpd__panel-title">🗂️ Project</div>
            <ProjectPicker itemId={goal.id} field="goalIds" />
          </div>

          <div className="gpd__panel gpd__panel--danger">
            <button className="gpd__del-btn" onClick={() => onDeleteGoal(goal.id)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              Delete Goal
            </button>
          </div>
        </div>
      </>}
      </div>
    </div>
  );
}
