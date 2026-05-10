import { useState } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { suggestDayPlan, getApiKey, CATEGORIES } from '../ai';
import './DailySystem.css';

const BLOCKS = [
  { id: 'morning',   label: 'בוקר',  time: '06:00 – 12:00', emoji: '🌅' },
  { id: 'afternoon', label: 'צהריים', time: '12:00 – 18:00', emoji: '☀️' },
  { id: 'evening',   label: 'ערב',    time: '18:00 – 23:00', emoji: '🌙' },
];

const MOODS = ['😫','😕','😐','🙂','🔥'];

export default function DailySystem({ tasks, goals, todayPlan, todayStr, onUpdateDailyPlan, onUpdateTask }) {
  const [loadingSuggest, setLoadingSuggest] = useState(false);
  const [dragTask, setDragTask] = useState(null);
  const [newNote, setNewNote] = useState(todayPlan?.note || '');

  const plan = todayPlan || { focus: [], blocks: { morning: [], afternoon: [], evening: [] }, mood: null, note: '' };

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const todayDateStr = format(new Date(), 'EEEE, d בMMMM yyyy', { locale: he });

  const handleSuggest = async () => {
    setLoadingSuggest(true);
    try {
      const apiKey = getApiKey();
      const suggestion = await suggestDayPlan(pendingTasks, goals, apiKey);
      // Map suggestions to task titles
      const findTask = (title) => {
        const t = pendingTasks.find(t => t.title === title);
        return t?.id || null;
      };
      const morningId = findTask(suggestion.morning);
      const afternoonId = findTask(suggestion.afternoon);
      const eveningId = findTask(suggestion.evening);
      onUpdateDailyPlan(todayStr, {
        blocks: {
          morning: morningId ? [morningId] : [],
          afternoon: afternoonId ? [afternoonId] : [],
          evening: eveningId ? [eveningId] : [],
        },
        aiTip: suggestion.tip,
      });
    } finally {
      setLoadingSuggest(false);
    }
  };

  const getBlockTasks = (blockId) => {
    const ids = plan.blocks[blockId] || [];
    return ids.map(id => tasks.find(t => t.id === id)).filter(Boolean);
  };

  const addToBlock = (blockId, taskId) => {
    const current = plan.blocks[blockId] || [];
    if (current.includes(taskId)) return;
    onUpdateDailyPlan(todayStr, {
      blocks: { ...plan.blocks, [blockId]: [...current, taskId] },
    });
  };

  const removeFromBlock = (blockId, taskId) => {
    onUpdateDailyPlan(todayStr, {
      blocks: { ...plan.blocks, [blockId]: (plan.blocks[blockId] || []).filter(id => id !== taskId) },
    });
  };

  const setFocus = (taskId) => {
    const focus = plan.focus || [];
    if (focus.includes(taskId)) {
      onUpdateDailyPlan(todayStr, { focus: focus.filter(id => id !== taskId) });
    } else if (focus.length < 3) {
      onUpdateDailyPlan(todayStr, { focus: [...focus, taskId] });
    }
  };

  const setMood = (i) => {
    onUpdateDailyPlan(todayStr, { mood: i });
  };

  const saveNote = () => {
    onUpdateDailyPlan(todayStr, { note: newNote });
  };

  const focusTasks = (plan.focus || []).map(id => tasks.find(t => t.id === id)).filter(Boolean);
  const completedToday = tasks.filter(t => t.status === 'done' && t.completedAt?.startsWith(todayStr)).length;

  return (
    <div className="daily">
      {/* Date header */}
      <div className="daily__header">
        <div>
          <p className="daily__date-label">{todayDateStr}</p>
          <h1 className="daily__title">📅 Daily System</h1>
        </div>
        <div className="daily__header-right">
          <div className="daily__stat-pill">
            <span>✅</span>
            <span>{completedToday} הושלמו היום</span>
          </div>
          <button
            className={`daily__suggest-btn ${loadingSuggest ? 'loading' : ''}`}
            onClick={handleSuggest}
            disabled={loadingSuggest}
          >
            {loadingSuggest ? (
              <><span className="daily__spinner" /> מתכנן...</>
            ) : (
              <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> AI תכנן את היום</>
            )}
          </button>
        </div>
      </div>

      {/* AI tip */}
      {plan.aiTip && (
        <div className="daily__tip">
          <span className="daily__tip-icon">💡</span>
          <span>{plan.aiTip}</span>
        </div>
      )}

      {/* Mood tracker */}
      <div className="daily__mood">
        <span className="daily__mood-label">איך אתה מרגיש היום?</span>
        <div className="daily__mood-btns">
          {MOODS.map((emoji, i) => (
            <button
              key={i}
              className={`daily__mood-btn ${plan.mood === i ? 'active' : ''}`}
              onClick={() => setMood(i)}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Top 3 focus */}
      <div className="daily__section">
        <div className="daily__section-header">
          <span className="daily__section-title">🎯 3 דברים חשובים להיום</span>
          <span className="daily__section-hint">בחר משימות מהרשימה</span>
        </div>
        <div className="daily__focus-row">
          {[0,1,2].map(i => {
            const t = focusTasks[i];
            return (
              <div key={i} className={`daily__focus-slot ${t ? 'filled' : 'empty'}`}>
                {t ? (
                  <>
                    <span className="daily__focus-num">{i+1}</span>
                    <span className="daily__focus-text">{t.title}</span>
                    <button className="daily__focus-remove" onClick={() => setFocus(t.id)}>×</button>
                  </>
                ) : (
                  <span className="daily__focus-placeholder">+ בחר משימה</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="daily__main">
        {/* Time blocks */}
        <div className="daily__blocks">
          <div className="daily__section-title" style={{ padding: '0 0 12px' }}>📋 תכנון השעות</div>
          {BLOCKS.map(block => {
            const blockTasks = getBlockTasks(block.id);
            return (
              <div
                key={block.id}
                className="daily__block"
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (dragTask) { addToBlock(block.id, dragTask); setDragTask(null); }
                }}
              >
                <div className="daily__block-header">
                  <span className="daily__block-emoji">{block.emoji}</span>
                  <span className="daily__block-label">{block.label}</span>
                  <span className="daily__block-time">{block.time}</span>
                </div>
                <div className="daily__block-tasks">
                  {blockTasks.map(t => (
                    <div
                      key={t.id}
                      className={`daily__block-task ${t.status === 'done' ? 'done' : ''}`}
                    >
                      <button
                        className="daily__block-check"
                        onClick={() => onUpdateTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
                      >
                        {t.status === 'done' ? '✓' : ''}
                      </button>
                      <span>{t.title}</span>
                      <button className="daily__block-remove" onClick={() => removeFromBlock(block.id, t.id)}>×</button>
                    </div>
                  ))}
                  {blockTasks.length === 0 && (
                    <div className="daily__block-empty">גרור משימה לכאן</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Daily note */}
          <div className="daily__note-section">
            <div className="daily__section-title" style={{ padding: '0 0 8px' }}>📝 הערות ליום</div>
            <textarea
              className="daily__note"
              placeholder="כתוב הערות, תובנות, מה למדת היום..."
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              onBlur={saveNote}
              rows={3}
            />
          </div>
        </div>

        {/* Task pool */}
        <div className="daily__pool">
          <div className="daily__section-title" style={{ padding: '0 0 10px' }}>משימות ממתינות</div>
          <div className="daily__pool-tasks">
            {pendingTasks.length === 0 && (
              <div className="daily__pool-empty">🎉 אין משימות ממתינות!</div>
            )}
            {pendingTasks.map(t => {
              const inFocus = plan.focus?.includes(t.id);
              return (
                <div
                  key={t.id}
                  className="daily__pool-task"
                  draggable
                  onDragStart={() => setDragTask(t.id)}
                  onDragEnd={() => setDragTask(null)}
                >
                  <div className="daily__pool-task-drag">⠿</div>
                  <div className="daily__pool-task-body">
                    <span className="daily__pool-task-title">{t.title}</span>
                    <PriorityBadge priority={t.priority} />
                  </div>
                  <button
                    className={`daily__pool-focus-btn ${inFocus ? 'active' : ''}`}
                    onClick={() => setFocus(t.id)}
                    title={inFocus ? 'הסר מהפוקוס' : 'הוסף לפוקוס'}
                  >
                    {inFocus ? '★' : '☆'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const map = { high: { color: '#ef4444', bg: '#fee2e2', label: 'High', icon: '↑' }, medium: { color: '#f59e0b', bg: '#fef3c7', label: 'Med', icon: '→' }, low: { color: '#10b981', bg: '#d1fae5', label: 'Low', icon: '↓' } };
  const p = map[priority] || map.medium;
  return (
    <span style={{ fontSize: 10, background: p.bg, color: p.color, padding: '1px 6px', borderRadius: 10, fontWeight: 600 }}>
      {p.icon} {p.label}
    </span>
  );
}
