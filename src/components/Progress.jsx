import { useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { computeStreak, getWeeklyActivity } from '../store';
import { CATEGORIES } from '../ai';
import './Progress.css';

const DAY_LABELS = ['ראשון','שני','שלישי','רביעי','חמישי','שישי','שבת'];

export default function Progress({ tasks, goals }) {
  const streak = useMemo(() => computeStreak(tasks), [tasks]);
  const weekActivity = useMemo(() => getWeeklyActivity(tasks), [tasks]);
  const maxActivity = Math.max(...weekActivity.map(d => d.count), 1);

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const totalTasks = tasks.length;
  const completionRate = totalTasks ? Math.round((totalDone / totalTasks) * 100) : 0;

  // Category breakdown
  const categoryStats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done');
    const result = {};
    for (const [key, def] of Object.entries(CATEGORIES)) {
      const count = done.filter(t => {
        const lower = t.title.toLowerCase();
        return def.keywords.some(k => lower.includes(k.toLowerCase()));
      }).length;
      result[key] = { ...def, count };
    }
    return result;
  }, [tasks]);

  const catTotal = Object.values(categoryStats).reduce((s, c) => s + c.count, 0) || 1;

  // Last 30 days heatmap
  const last30 = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const count = tasks.filter(t => t.completedAt?.startsWith(dateStr)).length;
      days.push({ d, dateStr, count });
    }
    return days;
  }, [tasks]);
  const maxHeat = Math.max(...last30.map(d => d.count), 1);

  function heatColor(count) {
    if (!count) return '#f1f5f9';
    const intensity = count / maxHeat;
    if (intensity < 0.25) return '#c7d2fe';
    if (intensity < 0.5)  return '#a5b4fc';
    if (intensity < 0.75) return '#818cf8';
    return '#4f46e5';
  }

  return (
    <div className="progress-view">
      <div className="progress-view__header">
        <h1 className="progress-view__title">📊 Progress Tracker</h1>
        <p className="progress-view__subtitle">אתה רואה אם אתה מתקדם או מזייף</p>
      </div>

      {/* Hero stats */}
      <div className="progress-view__hero">
        <div className="pstat pstat--streak">
          <div className="pstat__icon">🔥</div>
          <div className="pstat__val">{streak}</div>
          <div className="pstat__label">ימי רצף</div>
          {streak >= 3 && <div className="pstat__badge">On fire!</div>}
        </div>
        <div className="pstat pstat--done">
          <div className="pstat__icon">✅</div>
          <div className="pstat__val">{totalDone}</div>
          <div className="pstat__label">הושלמו סה"כ</div>
        </div>
        <div className="pstat pstat--rate">
          <div className="pstat__icon">📈</div>
          <div className="pstat__val">{completionRate}%</div>
          <div className="pstat__label">שיעור השלמה</div>
          <div className="pstat__mini-bar">
            <div className="pstat__mini-fill" style={{ width: `${completionRate}%` }} />
          </div>
        </div>
        <div className="pstat pstat--goals">
          <div className="pstat__icon">🎯</div>
          <div className="pstat__val">{goals.length}</div>
          <div className="pstat__label">מטרות פעילות</div>
        </div>
      </div>

      <div className="progress-view__grid">
        {/* Weekly activity chart */}
        <div className="pcard">
          <div className="pcard__title">פעילות שבועית</div>
          <div className="pcard__week-chart">
            {weekActivity.map((day, i) => {
              const height = maxActivity ? (day.count / maxActivity) * 100 : 0;
              const isToday = i === weekActivity.length - 1;
              return (
                <div key={i} className="pcard__bar-col">
                  <div className="pcard__bar-wrap">
                    <div
                      className={`pcard__bar ${isToday ? 'today' : ''}`}
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.count} משימות`}
                    />
                  </div>
                  <span className="pcard__bar-count">{day.count || ''}</span>
                  <span className="pcard__bar-label">
                    {format(day.date, 'EEE', { locale: he })}
                  </span>
                </div>
              );
            })}
          </div>
          {weekActivity.every(d => !d.count) && (
            <p className="pcard__empty">השלם משימות כדי לראות פעילות</p>
          )}
        </div>

        {/* Category breakdown */}
        <div className="pcard">
          <div className="pcard__title">לפי קטגוריה</div>
          <div className="pcard__categories">
            {Object.entries(categoryStats).map(([key, cat]) => {
              const pct = Math.round((cat.count / catTotal) * 100);
              return (
                <div key={key} className="pcard__cat-row">
                  <span className="pcard__cat-icon">{cat.icon}</span>
                  <span className="pcard__cat-label">{cat.label}</span>
                  <div className="pcard__cat-bar-wrap">
                    <div
                      className="pcard__cat-bar"
                      style={{ width: `${pct}%`, background: cat.color }}
                    />
                  </div>
                  <span className="pcard__cat-pct" style={{ color: cat.color }}>{cat.count}</span>
                </div>
              );
            })}
            {catTotal <= 1 && <p className="pcard__empty">השלם משימות עם תוויות כדי לראות נתונים</p>}
          </div>
        </div>

        {/* Goals progress */}
        {goals.length > 0 && (
          <div className="pcard pcard--wide">
            <div className="pcard__title">התקדמות מטרות</div>
            <div className="pcard__goals">
              {goals.map(goal => {
                const catDef = CATEGORIES[goal.category] || CATEGORIES.personal;
                return (
                  <div key={goal.id} className="pcard__goal-row">
                    <div className="pcard__goal-info">
                      <span className="pcard__goal-cat">{catDef.icon}</span>
                      <div>
                        <div className="pcard__goal-title">{goal.title}</div>
                        <div className="pcard__goal-meta">{goal.timeframe} · {goal.milestones.filter(m=>m.done).length}/{goal.milestones.length} מיילסטונים</div>
                      </div>
                    </div>
                    <div className="pcard__goal-bar-wrap">
                      <div
                        className="pcard__goal-bar"
                        style={{ width: `${goal.progress}%`, background: goal.color }}
                      />
                    </div>
                    <span className="pcard__goal-pct" style={{ color: goal.color }}>{goal.progress}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Heatmap */}
        <div className="pcard pcard--wide">
          <div className="pcard__title">30 ימי פעילות</div>
          <div className="pcard__heatmap">
            {last30.map((day, i) => (
              <div
                key={i}
                className="pcard__heat-cell"
                style={{ background: heatColor(day.count) }}
                title={`${format(day.d, 'd MMM', { locale: he })}: ${day.count} משימות`}
              />
            ))}
          </div>
          <div className="pcard__heatmap-legend">
            <span className="pcard__legend-label">פחות</span>
            {['#f1f5f9','#c7d2fe','#a5b4fc','#818cf8','#4f46e5'].map(c => (
              <div key={c} className="pcard__legend-cell" style={{ background: c }} />
            ))}
            <span className="pcard__legend-label">יותר</span>
          </div>
        </div>

        {/* Streak calendar */}
        <div className="pcard">
          <div className="pcard__title">🏆 Hall of Fame</div>
          <div className="pcard__records">
            <div className="pcard__record">
              <span className="pcard__record-icon">🔥</span>
              <div>
                <div className="pcard__record-val">{streak} ימים</div>
                <div className="pcard__record-label">רצף נוכחי</div>
              </div>
            </div>
            <div className="pcard__record">
              <span className="pcard__record-icon">⭐</span>
              <div>
                <div className="pcard__record-val">{totalDone}</div>
                <div className="pcard__record-label">משימות שהושלמו</div>
              </div>
            </div>
            <div className="pcard__record">
              <span className="pcard__record-icon">🎯</span>
              <div>
                <div className="pcard__record-val">{goals.filter(g=>g.progress===100).length}</div>
                <div className="pcard__record-label">מטרות שהושגו</div>
              </div>
            </div>
            <div className="pcard__record">
              <span className="pcard__record-icon">📅</span>
              <div>
                <div className="pcard__record-val">{last30.filter(d=>d.count>0).length}</div>
                <div className="pcard__record-label">ימים פעילים (30 יום)</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
