import { useState, useRef } from 'react';
import { format, parseISO, isToday, isPast } from 'date-fns';
import { he } from 'date-fns/locale';
import ProjectPicker from './ProjectPicker';
import './Tasks.css';

export const COLUMNS = [
  { id: 'backlog',    label: 'Backlog',      color: '#94a3b8' },
  { id: 'todo',       label: 'To Do',        color: '#3b82f6' },
  { id: 'inprogress', label: 'In Progress',  color: '#f59e0b' },
  { id: 'review',     label: 'In Review',    color: '#8b5cf6' },
  { id: 'done',       label: 'Done',         color: '#10b981' },
];

const PRIORITIES = {
  high:   { label: 'High',   color: '#ef4444', bg: '#fee2e2', icon: '↑' },
  medium: { label: 'Medium', color: '#f59e0b', bg: '#fef3c7', icon: '→' },
  low:    { label: 'Low',    color: '#10b981', bg: '#d1fae5', icon: '↓' },
};

export const CATEGORIES = [
  { id: 'work',     label: 'עבודה',   color: '#6366f1' },
  { id: 'personal', label: 'אישי',    color: '#ec4899' },
  { id: 'urgent',   label: 'דחוף',    color: '#ef4444' },
  { id: 'study',    label: 'לימודים', color: '#f59e0b' },
  { id: 'health',   label: 'בריאות',  color: '#10b981' },
  { id: 'finance',  label: 'כספים',   color: '#0ea5e9' },
];

export default function Tasks({ tasks, onCreateTask, onUpdateTask, onDeleteTask }) {
  const [addingIn, setAddingIn]       = useState(null);
  const [addTitle, setAddTitle]       = useState('');
  const [editingTask, setEditingTask] = useState(null);
  const [draggedId, setDraggedId]     = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [filterCat, setFilterCat]     = useState(null); // null = all
  const addInputRef = useRef(null);

  const visibleTasks = filterCat
    ? tasks.filter(t => t.category === filterCat)
    : tasks;

  const getColTasks = (colId) =>
    visibleTasks
      .filter(t => t.status === colId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleAddTask = (colId) => {
    if (!addTitle.trim()) { setAddingIn(null); return; }
    onCreateTask({ title: addTitle.trim(), status: colId });
    setAddTitle('');
    setAddingIn(null);
  };

  const openAdd = (colId) => {
    setAddingIn(colId);
    setAddTitle('');
    setTimeout(() => addInputRef.current?.focus(), 50);
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e, colId) => {
    e.preventDefault();
    if (draggedId) onUpdateTask(draggedId, { status: colId });
    setDraggedId(null);
    setDragOverCol(null);
  };

  const totalDone = tasks.filter(t => t.status === 'done').length;
  const progress  = tasks.length ? Math.round((totalDone / tasks.length) * 100) : 0;

  return (
    <div className="kanban">
      {/* ── Header ── */}
      <div className="kanban__header">
        <div className="kanban__header-left">
          <h1 className="kanban__title">Tasks</h1>
          <div className="kanban__progress-wrap">
            <div className="kanban__progress-bar">
              <div className="kanban__progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="kanban__progress-label">{progress}%</span>
          </div>
        </div>
        <div className="kanban__header-right">
          <span className="kanban__stat">{tasks.length} משימות</span>
          <button className="kanban__add-btn" onClick={() => openAdd('todo')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            משימה חדשה
          </button>
        </div>
      </div>

      {/* ── Category filter bar ── */}
      <div className="kanban__cats">
        <button
          className={`kanban__cat-pill${filterCat === null ? ' active' : ''}`}
          style={filterCat === null ? { background: '#0f172a', color: '#fff', borderColor: '#0f172a' } : {}}
          onClick={() => setFilterCat(null)}
        >
          הכל
        </button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`kanban__cat-pill${filterCat === c.id ? ' active' : ''}`}
            style={filterCat === c.id ? { background: c.color, color: '#fff', borderColor: c.color } : { '--cat': c.color }}
            onClick={() => setFilterCat(filterCat === c.id ? null : c.id)}
          >
            <span className="kanban__cat-dot" style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Board ── */}
      <div className="kanban__board">
        {COLUMNS.map(col => {
          const colTasks = getColTasks(col.id);
          return (
            <div
              key={col.id}
              className={`kanban__col${dragOverCol === col.id ? ' drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOverCol(col.id); }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="kanban__col-header">
                <div className="kanban__col-title">
                  <span className="kanban__col-dot" style={{ background: col.color }} />
                  <span className="kanban__col-name">{col.label}</span>
                  <span className="kanban__col-count">{colTasks.length}</span>
                </div>
                <button className="kanban__col-add" onClick={() => openAdd(col.id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>
              </div>

              <div className="kanban__cards">
                {addingIn === col.id && (
                  <div className="kanban__add-card">
                    <textarea
                      ref={addInputRef}
                      className="kanban__add-input"
                      placeholder="כותרת המשימה..."
                      value={addTitle}
                      onChange={e => setAddTitle(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddTask(col.id); }
                        if (e.key === 'Escape') setAddingIn(null);
                      }}
                      rows={2}
                    />
                    <div className="kanban__add-actions">
                      <button className="kanban__add-confirm" onClick={() => handleAddTask(col.id)}>הוסף</button>
                      <button className="kanban__add-cancel" onClick={() => setAddingIn(null)}>✕</button>
                    </div>
                  </div>
                )}

                {colTasks.map((task, i) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    isLast={i === colTasks.length - 1}
                    onUpdate={ch => onUpdateTask(task.id, ch)}
                    onDelete={() => onDeleteTask(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={() => setDraggedId(null)}
                    isDragging={draggedId === task.id}
                  />
                ))}

                {colTasks.length === 0 && addingIn !== col.id && (
                  <div className="kanban__col-empty">Drop here</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingTask && (
        <TaskModal
          task={editingTask}
          onUpdate={ch => { onUpdateTask(editingTask.id, ch); setEditingTask(t => ({ ...t, ...ch })); }}
          onDelete={() => { onDeleteTask(editingTask.id); setEditingTask(null); }}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, isLast, onUpdate, onDelete, onEdit, onDragStart, onDragEnd, isDragging }) {
  const p       = PRIORITIES[task.priority] || PRIORITIES.medium;
  const cat     = CATEGORIES.find(c => c.id === task.category);
  const dateStr = task.date ? format(parseISO(task.date), 'dd MMM', { locale: he }) : null;
  const isOverdue = task.date && task.status !== 'done' && isPast(parseISO(task.date)) && !isToday(parseISO(task.date));

  return (
    <div
      className={`kanban__card${isDragging ? ' dragging' : ''}${isLast ? ' kanban__card--last' : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {cat && (
        <div className="kanban__card-cat" style={{ background: cat.color + '18', color: cat.color }}>
          {cat.label}
        </div>
      )}

      <div className="kanban__card-top">
        <p className="kanban__card-title">{task.title}</p>
        <button className="kanban__card-menu" onClick={onEdit}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
          </svg>
        </button>
      </div>

      {task.description && <p className="kanban__card-desc">{task.description}</p>}

      <div className="kanban__card-footer">
        <span className="kanban__card-priority" style={{ color: p.color, background: p.bg }}>
          {p.icon} {p.label}
        </span>
        {dateStr && (
          <span className={`kanban__card-date${isOverdue ? ' overdue' : ''}`}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            {dateStr}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({ task, onUpdate, onDelete, onClose }) {
  const [form, setForm] = useState({
    title:       task.title,
    description: task.description || '',
    priority:    task.priority,
    status:      task.status,
    category:    task.category || '',
    date:        task.date ? task.date.slice(0, 10) : '',
  });

  const save = () => {
    onUpdate({ ...form, date: form.date ? form.date + 'T00:00:00' : null });
    onClose();
  };

  return (
    <div className="task-modal-overlay" onClick={onClose}>
      <div className="task-modal" onClick={e => e.stopPropagation()}>
        <div className="task-modal__header">
          <h3>עריכת משימה</h3>
          <button onClick={onClose} className="task-modal__close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="task-modal__body">
          <div className="task-modal__field">
            <label>כותרת</label>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} autoFocus />
          </div>

          <div className="task-modal__field">
            <label>תיאור</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="הוסף תיאור..." />
          </div>

          {/* Category picker */}
          <div className="task-modal__field">
            <label>קטגוריה</label>
            <div className="task-modal__cat-grid">
              <button
                className={`task-modal__cat-btn${!form.category ? ' active' : ''}`}
                onClick={() => setForm(f => ({ ...f, category: '' }))}
              >
                ללא
              </button>
              {CATEGORIES.map(c => (
                <button
                  key={c.id}
                  className={`task-modal__cat-btn${form.category === c.id ? ' active' : ''}`}
                  style={form.category === c.id ? { background: c.color, color: '#fff', borderColor: c.color } : { '--cc': c.color }}
                  onClick={() => setForm(f => ({ ...f, category: c.id }))}
                >
                  <span className="task-modal__cat-dot" style={{ background: c.color }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="task-modal__row">
            <div className="task-modal__field">
              <label>עמודה</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div className="task-modal__field">
              <label>עדיפות</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="high">↑ High</option>
                <option value="medium">→ Medium</option>
                <option value="low">↓ Low</option>
              </select>
            </div>
          </div>

          <div className="task-modal__field">
            <label>תאריך יעד</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          </div>

          <div className="task-modal__field">
            <label>פרויקט</label>
            <ProjectPicker itemId={task.id} field="taskIds" />
          </div>
        </div>

        <div className="task-modal__footer">
          <button className="task-modal__delete" onClick={onDelete}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
            מחק
          </button>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="task-modal__cancel" onClick={onClose}>ביטול</button>
            <button className="task-modal__save" onClick={save}>שמור</button>
          </div>
        </div>
      </div>
    </div>
  );
}
