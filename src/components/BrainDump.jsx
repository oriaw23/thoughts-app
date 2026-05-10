import { useState, useRef } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { CATEGORIES, organizeBrainDump, getApiKey } from '../ai';
import './BrainDump.css';

export default function BrainDump({ thoughts, onAddThoughts, onConvertThought, onDeleteThought, onClearThoughts, onCreateTask, onCreateGoal }) {
  const [raw, setRaw] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterCat, setFilterCat] = useState('all');
  const textareaRef = useRef(null);

  const grouped = {};
  for (const cat of Object.keys(CATEGORIES)) grouped[cat] = [];
  for (const t of thoughts) {
    if (!t.convertedTo) {
      const cat = t.category in CATEGORIES ? t.category : 'personal';
      grouped[cat].push(t);
    }
  }

  const activeThoughts = thoughts.filter(t => !t.convertedTo);
  const displayThoughts = filterCat === 'all' ? thoughts.filter(t => !t.convertedTo) : (grouped[filterCat] || []);

  const handleDump = async () => {
    const text = raw.trim();
    if (!text) return;
    setLoading(true);
    try {
      const apiKey = getApiKey();
      const items = await organizeBrainDump(text, apiKey);
      onAddThoughts(items);
      setRaw('');
      textareaRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') handleDump();
  };

  const handleConvertToTask = (thought) => {
    onCreateTask({ title: thought.text, priority: 'medium', status: 'todo' });
    onConvertThought(thought.id, 'task');
  };

  const handleConvertToGoal = (thought) => {
    onConvertThought(thought.id, 'goal');
  };

  return (
    <div className="brain">
      {/* Header */}
      <div className="brain__header">
        <div>
          <h1 className="brain__title">🧠 Brain Dump</h1>
          <p className="brain__subtitle">זרוק כל מה שבראש — ה-AI יארגן</p>
        </div>
        {thoughts.length > 0 && (
          <button className="brain__clear-btn" onClick={onClearThoughts}>ניקוי הכל</button>
        )}
      </div>

      {/* Input area */}
      <div className="brain__input-section">
        <div className="brain__textarea-wrap">
          <textarea
            ref={textareaRef}
            className="brain__textarea"
            placeholder="שפוך את כל מה שבראש... (⌘+Enter לארגון)"
            value={raw}
            onChange={e => setRaw(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={5}
            autoFocus
          />
          <div className="brain__char-count">{raw.length > 0 ? `${raw.length} תווים` : ''}</div>
        </div>

        <div className="brain__actions">
          <div className="brain__hint">
            <span>✨ כתוב בחופשיות — משפטים, מילים, כל דבר</span>
            <span className="brain__hint-key">⌘+Enter לארגון</span>
          </div>
          <button
            className={`brain__dump-btn ${loading ? 'loading' : ''} ${!raw.trim() ? 'disabled' : ''}`}
            onClick={handleDump}
            disabled={!raw.trim() || loading}
          >
            {loading ? (
              <>
                <span className="brain__spinner" />
                מארגן...
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                ארגן עם AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {activeThoughts.length > 0 && (
        <div className="brain__stats">
          {Object.entries(CATEGORIES).map(([key, cat]) => {
            const count = grouped[key]?.length || 0;
            if (!count) return null;
            return (
              <button
                key={key}
                className={`brain__stat-chip ${filterCat === key ? 'active' : ''}`}
                style={filterCat === key ? { background: cat.bg, color: cat.color, borderColor: cat.color } : {}}
                onClick={() => setFilterCat(filterCat === key ? 'all' : key)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="brain__stat-count">{count}</span>
              </button>
            );
          })}
          {filterCat !== 'all' && (
            <button className="brain__clear-filter" onClick={() => setFilterCat('all')}>× הכל</button>
          )}
        </div>
      )}

      {/* Thoughts grid */}
      {activeThoughts.length > 0 ? (
        <div className="brain__grid">
          {Object.entries(CATEGORIES).map(([catKey, catDef]) => {
            const catThoughts = filterCat === 'all' ? grouped[catKey] : (filterCat === catKey ? grouped[catKey] : []);
            if (!catThoughts || catThoughts.length === 0) return null;

            return (
              <div key={catKey} className="brain__category-col">
                <div className="brain__category-header" style={{ borderColor: catDef.color }}>
                  <span className="brain__cat-icon">{catDef.icon}</span>
                  <span className="brain__cat-label">{catDef.label}</span>
                  <span className="brain__cat-count" style={{ background: catDef.bg, color: catDef.color }}>{catThoughts.length}</span>
                </div>
                <div className="brain__thought-list">
                  {catThoughts.map(thought => (
                    <ThoughtCard
                      key={thought.id}
                      thought={thought}
                      catDef={catDef}
                      onConvertTask={() => handleConvertToTask(thought)}
                      onConvertGoal={() => handleConvertToGoal(thought)}
                      onDelete={() => onDeleteThought(thought.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        thoughts.length === 0 && (
          <div className="brain__empty">
            <div className="brain__empty-visual">
              <div className="brain__bubble brain__bubble--1">💡 לרוץ 5ק"מ</div>
              <div className="brain__bubble brain__bubble--2">📚 לסיים קורס SQL</div>
              <div className="brain__bubble brain__bubble--3">🚀 לבנות feature חדש</div>
              <div className="brain__bubble brain__bubble--4">📞 להתקשר לאמא</div>
            </div>
            <h3>התחל לשפוך מחשבות</h3>
            <p>כתוב כל מה שבראש בקופסה למעלה, ולחץ <strong>ארגן עם AI</strong></p>
          </div>
        )
      )}

      {/* Converted thoughts (archived) */}
      {thoughts.filter(t => t.convertedTo).length > 0 && (
        <div className="brain__converted">
          <p className="brain__converted-label">
            ✅ {thoughts.filter(t => t.convertedTo).length} מחשבות הומרו למשימות/מטרות
          </p>
        </div>
      )}
    </div>
  );
}

function ThoughtCard({ thought, catDef, onConvertTask, onConvertGoal, onDelete }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="thought-card"
      style={{ borderColor: catDef.color + '44' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <p className="thought-card__text">{thought.text}</p>
      <div className="thought-card__footer">
        <span className="thought-card__time">
          {format(new Date(thought.createdAt), 'HH:mm')}
        </span>
        {hovered && (
          <div className="thought-card__actions">
            <button
              className="thought-card__action thought-card__action--task"
              onClick={onConvertTask}
              title="המר למשימה"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
              משימה
            </button>
            <button
              className="thought-card__action thought-card__action--goal"
              onClick={onConvertGoal}
              title="המר למטרה"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              מטרה
            </button>
            <button className="thought-card__action thought-card__action--delete" onClick={onDelete} title="מחק">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
