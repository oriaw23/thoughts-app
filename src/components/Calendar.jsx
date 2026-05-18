import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, isSameMonth, isToday, isSameDay,
  addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  parseISO, getHours, getMinutes,
} from 'date-fns';
import { enUS } from 'date-fns/locale';
import ProjectPicker from './ProjectPicker';
import './Calendar.css';

const HOURS        = Array.from({ length: 24 }, (_, i) => i);
const HOUR_HEIGHT  = 60;
const EVENT_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'];
const DAY_NAMES_FULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_NAMES_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CATS_KEY = 'mynotion_categories';

const DEFAULT_CATS = [
  { id: 'work',     name: 'Work',     color: '#3b82f6' },
  { id: 'personal', name: 'Personal', color: '#10b981' },
  { id: 'health',   name: 'Health',   color: '#ef4444' },
  { id: 'study',    name: 'Study',    color: '#8b5cf6' },
];

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
}
function minutesToTime(mins) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
  return `${String(Math.floor(clamped / 60)).padStart(2,'0')}:${String(clamped % 60).padStart(2,'0')}`;
}
function loadCategories() {
  try { return JSON.parse(localStorage.getItem(CATS_KEY) || 'null') || DEFAULT_CATS; }
  catch { return DEFAULT_CATS; }
}
function generateICS(events) {
  const lines = ['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//MyNotion//Calendar//HE'];
  events.forEach(ev => {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.id}`);
    lines.push(`SUMMARY:${ev.title}`);
    const d = (ev.startDate || '').slice(0,10).replace(/-/g,'');
    const st = (ev.startTime || '00:00').replace(':','') + '00';
    const et = (ev.endTime   || '01:00').replace(':','') + '00';
    lines.push(`DTSTART:${d}T${st}`);
    lines.push(`DTEND:${d}T${et}`);
    if (ev.description) lines.push(`DESCRIPTION:${ev.description}`);
    lines.push('END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

// ── Live clock — updates every second ────────────────────────────────────────
function useLiveClock() {
  const [d, setD] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setD(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);
  return d;
}

function useNow() {
  const d = useLiveClock();
  const h = getHours(d), m = getMinutes(d), s = d.getSeconds();
  return {
    top:   (h * 60 + m + s / 60) / 60 * HOUR_HEIGHT,
    label: `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`,
    date:  d,
  };
}

// ── Main Calendar ─────────────────────────────────────────────────────────────
export default function Calendar({ events, tasks, onCreateEvent, onUpdateEvent, onDeleteEvent, onCreateTask, onUpdateTask }) {
  const [view, setView]               = useState('week');
  const [anchor, setAnchor]           = useState(() => new Date());
  const clock                         = useLiveClock();
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [categories, setCategories]   = useState(loadCategories);
  const [filterCat, setFilterCat]     = useState(null);
  const [showShare, setShowShare]     = useState(false);
  const [showAddCat, setShowAddCat]   = useState(false);
  const [newCatName, setNewCatName]   = useState('');
  const [taskDraft, setTaskDraft]     = useState(null);
  const [showTasksPanel, setShowTasksPanel] = useState(false);
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const timeGridRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(CATS_KEY, JSON.stringify(categories));
  }, [categories]);

  // Scroll to current time (minus 2 h of context) on view change
  useEffect(() => {
    if (timeGridRef.current) {
      const n = new Date();
      const mins = getHours(n) * 60 + getMinutes(n);
      timeGridRef.current.scrollTop = Math.max(0, (mins / 60) * HOUR_HEIGHT - HOUR_HEIGHT * 2);
    }
  }, [view]);

  const addCategory = () => {
    if (!newCatName.trim()) return;
    setCategories(p => [...p, { id: uuidv4(), name: newCatName.trim(), color: newCatColor }]);
    setNewCatName(''); setShowAddCat(false);
  };
  const removeCategory = (id) => setCategories(p => p.filter(c => c.id !== id));

  // Auto-advance anchor when midnight passes
  const prevDateRef = useRef(format(new Date(), 'yyyy-MM-dd'));
  useEffect(() => {
    const today = format(clock, 'yyyy-MM-dd');
    if (today !== prevDateRef.current) {
      prevDateRef.current = today;
      setAnchor(new Date());
    }
  }, [clock]);

  const goBack = () => {
    if (view === 'month') setAnchor(d => subMonths(d, 1));
    else if (view === 'week') setAnchor(d => subWeeks(d, 1));
    else setAnchor(d => subDays(d, 1));
  };
  const goForward = () => {
    if (view === 'month') setAnchor(d => addMonths(d, 1));
    else if (view === 'week') setAnchor(d => addWeeks(d, 1));
    else setAnchor(d => addDays(d, 1));
  };

  const titleLabel = () => {
    if (view === 'month') return format(anchor, 'MMMM yyyy', { locale: enUS });
    if (view === 'week') {
      const ws = startOfWeek(anchor, { weekStartsOn: 0 });
      const we = endOfWeek(anchor, { weekStartsOn: 0 });
      return isSameMonth(ws, we)
        ? format(ws, 'MMMM yyyy', { locale: enUS })
        : `${format(ws, 'MMM', { locale: enUS })} – ${format(we, 'MMM yyyy', { locale: enUS })}`;
    }
    return format(anchor, 'EEEE, MMMM d, yyyy', { locale: enUS });
  };

  const openNewEvent = (date, startTime = '09:00') => {
    setEditingEvent(null);
    setFormData({
      title: '', startDate: format(date, 'yyyy-MM-dd'), endDate: format(date, 'yyyy-MM-dd'),
      startTime, endTime: minutesToTime(timeToMinutes(startTime) + 60),
      color: filterCat ? (categories.find(c => c.id === filterCat)?.color || EVENT_COLORS[0]) : EVENT_COLORS[0],
      description: '', allDay: false, categoryId: filterCat || null,
    });
    setShowForm(true);
  };

  const openEditEvent = useCallback((ev, e) => {
    e?.stopPropagation();
    setEditingEvent(ev);
    setFormData({
      title: ev.title, startDate: ev.startDate?.slice(0,10) || '',
      endDate: ev.endDate?.slice(0,10) || ev.startDate?.slice(0,10) || '',
      startTime: ev.startTime || '09:00', endTime: ev.endTime || '10:00',
      color: ev.color || EVENT_COLORS[0], description: ev.description || '',
      allDay: ev.allDay || false, categoryId: ev.categoryId || null,
      sharedWith: ev.sharedWith || [],
    });
    setShowForm(true);
  }, []);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    // Store date as plain 'YYYY-MM-DD' so parseISO always treats it as local date
    const sd = formData.startDate.slice(0, 10);
    const ed = (formData.endDate || formData.startDate).slice(0, 10);
    const payload = { ...formData, startDate: sd, endDate: ed };
    if (editingEvent) onUpdateEvent(editingEvent.id, payload);
    else onCreateEvent(payload);
    setShowForm(false);
  };

  const submitTaskDraft = (e) => {
    e.preventDefault();
    if (!taskDraft?.title.trim()) { setTaskDraft(null); return; }
    onCreateTask?.({ title: taskDraft.title.trim(), status:'todo', priority:'medium', date: taskDraft.date });
    setTaskDraft(null);
  };

  const openTaskDraft = (day) => setTaskDraft({ date: format(day,'yyyy-MM-dd'), title: '' });

  // Parse any date string (with or without time/timezone) as local date
  const localDate = (str) => {
    if (!str) return null;
    const s = str.slice(0, 10); // take only 'YYYY-MM-DD'
    const [y, mo, d] = s.split('-').map(Number);
    return new Date(y, mo - 1, d); // local midnight — no timezone shift
  };

  const visibleEvents = filterCat ? events.filter(ev => ev.categoryId === filterCat) : events;
  const dayEvents = (day) => visibleEvents.filter(ev => {
    const ld = localDate(ev.startDate);
    return ld && isSameDay(ld, day);
  });
  const dayTasks = (day) => tasks.filter(t => {
    const ld = localDate(t.date);
    return ld && isSameDay(ld, day);
  });

  // Share: export ICS
  const handleShare = () => {
    const ics = generateICS(events);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'my-calendar.ics';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="gcal">
      {/* ── Top bar ── */}
      <div className="gcal__topbar">
        <div className="gcal__topbar-left">
          <button className="gcal__today-btn" onClick={() => setAnchor(new Date())}>Today</button>
          <div className="gcal__nav-btns">
            <button className="gcal__nav" onClick={goBack}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg></button>
            <button className="gcal__nav" onClick={goForward}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg></button>
          </div>
          <h2 className="gcal__title">{titleLabel()}</h2>
          <span className="gcal__live-clock">
            {String(getHours(clock)).padStart(2,'0')}:{String(getMinutes(clock)).padStart(2,'0')}:{String(clock.getSeconds()).padStart(2,'0')}
          </span>
        </div>

        {/* ── Categories bar (fades toward title) ── */}
        <div className="gcal__cats-outer">
          <div className="gcal__cats-fade-left" />
          <div className="gcal__cats">
            <button
              className={`gcal__cat-chip ${!filterCat ? 'gcal__cat-chip--active' : ''}`}
              style={!filterCat ? { background: '#6366f122', borderColor: '#6366f1', color: '#6366f1' } : {}}
              onClick={() => setFilterCat(null)}
            >All</button>
            {categories.map(c => (
              <button
                key={c.id}
                className={`gcal__cat-chip ${filterCat === c.id ? 'gcal__cat-chip--active' : ''}`}
                style={filterCat === c.id ? { background: c.color + '22', borderColor: c.color, color: c.color } : { borderColor: c.color + '60' }}
                onClick={() => setFilterCat(p => p === c.id ? null : c.id)}
              >
                <span className="gcal__cat-dot" style={{ background: c.color }} />
                {c.name}
                <span className="gcal__cat-del" onClick={e => { e.stopPropagation(); removeCategory(c.id); }}>✕</span>
              </button>
            ))}
            {showAddCat ? (
              <div className="gcal__cat-new-form">
                <input autoFocus placeholder="Category name" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setShowAddCat(false); }} />
                <div className="gcal__cat-colors">
                  {EVENT_COLORS.map(c => <button key={c} style={{ background: c, outline: newCatColor === c ? '2px solid #0f172a' : 'none' }} onClick={() => setNewCatColor(c)} />)}
                </div>
                <button onClick={addCategory}>✓</button>
                <button onClick={() => setShowAddCat(false)}>✕</button>
              </div>
            ) : (
              <button className="gcal__cat-add" onClick={() => setShowAddCat(true)}>+ Category</button>
            )}
          </div>
        </div>

        <div className="gcal__topbar-right">
          {/* Share button */}
          <div className="gcal__share-wrap">
            <button className="gcal__share-btn" onClick={() => setShowShare(p => !p)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
            {showShare && (
              <div className="gcal__share-menu">
                <p className="gcal__share-title">Share Calendar</p>
                <button className="gcal__share-option" onClick={handleShare}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  Download as ICS (Google / Apple)
                </button>
                <button className="gcal__share-option" onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(events, null, 2));
                  setShowShare(false);
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  Copy event data (JSON)
                </button>
              </div>
            )}
          </div>

          <div className="gcal__view-toggle">
            {[['month','Month'],['week','Week'],['day','Day']].map(([v,l]) => (
              <button key={v} className={view === v ? 'active' : ''} onClick={() => setView(v)}>{l}</button>
            ))}
          </div>
          <button className={`gcal__tasks-toggle${showTasksPanel ? ' active' : ''}`}
            onClick={() => setShowTasksPanel(p => !p)} title="Tasks">
            ✅ Tasks
          </button>
          <button className="gcal__add-btn" onClick={() => openNewEvent(anchor)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Event
          </button>
        </div>
      </div>

      {/* Click outside share menu */}
      {showShare && <div style={{ position: 'fixed', inset: 0, zIndex: 99 }} onClick={() => setShowShare(false)} />}

      {/* ── Main layout: calendar + optional tasks panel ── */}
      <div className="gcal__body">
        <div className="gcal__view-area">
          {view === 'month' && <MonthView anchor={anchor} dayEvents={dayEvents} dayTasks={dayTasks} onDayClick={openNewEvent} onEventClick={openEditEvent} setAnchor={setAnchor} setView={setView} categories={categories} onUpdateEvent={onUpdateEvent} onUpdateTask={onUpdateTask} onAddTask={openTaskDraft} />}
          {view === 'week'  && <WeekView  anchor={anchor} dayEvents={dayEvents} dayTasks={dayTasks} onSlotClick={openNewEvent} onEventClick={openEditEvent} timeGridRef={timeGridRef} categories={categories} onUpdateEvent={onUpdateEvent} onUpdateTask={onUpdateTask} onAddTask={openTaskDraft} />}
          {view === 'day'   && <DayView   anchor={anchor} dayEvents={dayEvents} dayTasks={dayTasks} onSlotClick={(t) => openNewEvent(anchor, t)} onEventClick={openEditEvent} timeGridRef={timeGridRef} categories={categories} onUpdateEvent={onUpdateEvent} onUpdateTask={onUpdateTask} onAddTask={() => openTaskDraft(anchor)} />}
        </div>

        {showTasksPanel && (
          <TasksPanel
            tasks={tasks}
            onUpdateTask={onUpdateTask}
            onClose={() => setShowTasksPanel(false)}
          />
        )}
      </div>

      {showForm && formData && (
        <EventModal
          formData={formData} setFormData={setFormData}
          editingEvent={editingEvent} colors={EVENT_COLORS} categories={categories}
          onSubmit={handleFormSubmit}
          onDelete={() => { onDeleteEvent(editingEvent.id); setShowForm(false); }}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Task draft popup */}
      {taskDraft && (
        <div className="gcal__task-overlay" onClick={() => setTaskDraft(null)}>
          <form className="gcal__task-form" onClick={e=>e.stopPropagation()} onSubmit={submitTaskDraft}>
            <div className="gcal__task-form-head">
              <span>✅ New task for {taskDraft.date}</span>
              <button type="button" onClick={() => setTaskDraft(null)}>✕</button>
            </div>
            <input
              className="gcal__task-form-input" autoFocus
              placeholder="Task name..."
              value={taskDraft.title}
              onChange={e => setTaskDraft(d => ({ ...d, title: e.target.value }))}
            />
            <div className="gcal__task-form-foot">
              <button type="button" className="gcal__task-form-cancel" onClick={() => setTaskDraft(null)}>Cancel</button>
              <button type="submit" className="gcal__task-form-submit">Add Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Drag hook (shared by Week + Day) ─────────────────────────────────────────
function useDragEvent(onUpdateEvent) {
  const [dragging, setDragging] = useState(null);
  // dragging: { event, offsetMins, previewDate, previewTime, previewEndTime }
  const dragRef = useRef(null);

  const startDrag = useCallback((e, event) => {
    e.stopPropagation(); e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetPx = e.clientY - rect.top;
    const offsetMins = Math.round((offsetPx / HOUR_HEIGHT) * 60);
    const info = { event, offsetMins, previewDate: event.startDate?.slice(0,10), previewTime: event.startTime, previewEndTime: event.endTime };
    setDragging(info);
    dragRef.current = info;
  }, []);

  const updateDrag = useCallback((e, gridEl, weekDays) => {
    if (!dragRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scroll = gridEl?.scrollTop || 0;

    // Time from Y
    const relY = e.clientY - rect.top + scroll - (dragRef.current.offsetMins / 60 * HOUR_HEIGHT);
    const totalMins = Math.max(0, Math.round((relY / HOUR_HEIGHT) * 60 / 15) * 15);
    const newStart  = minutesToTime(totalMins);
    const dur = timeToMinutes(dragRef.current.event.endTime || '10:00') - timeToMinutes(dragRef.current.event.startTime || '09:00');
    const newEnd = minutesToTime(totalMins + Math.max(30, dur));

    // Day from X (week view only)
    let newDate = dragRef.current.previewDate;
    if (weekDays) {
      const gutterW = 60;
      const colW = (rect.width - gutterW) / weekDays.length;
      const relX = e.clientX - rect.left - gutterW;
      const dayIdx = Math.max(0, Math.min(weekDays.length - 1, Math.floor(relX / colW)));
      newDate = format(weekDays[dayIdx], 'yyyy-MM-dd');
    }

    const updated = { ...dragRef.current, previewDate: newDate, previewTime: newStart, previewEndTime: newEnd };
    dragRef.current = updated;
    setDragging(updated);
  }, []);

  const endDrag = useCallback(() => {
    const d = dragRef.current;
    if (d) {
      onUpdateEvent(d.event.id, {
        startDate: d.previewDate + 'T00:00:00',
        endDate:   d.previewDate + 'T00:00:00',
        startTime: d.previewTime,
        endTime:   d.previewEndTime,
      });
    }
    dragRef.current = null;
    setDragging(null);
  }, [onUpdateEvent]);

  return { dragging, startDrag, updateDrag, endDrag };
}

// ── Month View ────────────────────────────────────────────────────────────────
function MonthView({ anchor, dayEvents, dayTasks, onDayClick, onEventClick, setAnchor, setView, categories, onUpdateEvent, onUpdateTask, onAddTask }) {
  const { dragging, startDrag, endDrag } = useDragEvent(onUpdateEvent);
  const [dragOverDay, setDragOverDay] = useState(null);
  const monthStart = startOfMonth(anchor);
  const days = eachDayOfInterval({ start: startOfWeek(monthStart, { weekStartsOn: 0 }), end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 0 }) });

  return (
    <div className="gcal__month">
      <div className="gcal__month-header">{['S','M','T','W','T','F','S'].map((d,i) => <div key={i} className="gcal__month-dow">{d}</div>)}</div>
      <div className="gcal__month-grid">
        {days.map(day => {
          const evs = dayEvents(day);
          const ts  = dayTasks(day);
          const isOver = dragOverDay && isSameDay(dragOverDay, day);
          return (
            <div
              key={day.toISOString()}
              className={`gcal__month-cell ${!isSameMonth(day, anchor) ? 'other' : ''} ${isToday(day) ? 'today' : ''} ${isOver ? 'drag-over' : ''}`}
              onClick={() => onDayClick(day)}
              onDragOver={e => { e.preventDefault(); setDragOverDay(day); }}
              onDrop={e => {
                e.preventDefault();
                if (dragging) onUpdateEvent(dragging.event.id, { startDate: format(day,'yyyy-MM-dd')+'T00:00:00', endDate: format(day,'yyyy-MM-dd')+'T00:00:00', startTime: dragging.event.startTime, endTime: dragging.event.endTime });
                endDrag(); setDragOverDay(null);
              }}
              onDragLeave={() => setDragOverDay(null)}
            >
              <div className="gcal__month-date" onClick={e => { e.stopPropagation(); setAnchor(day); setView('day'); }}>{format(day,'d')}</div>
              <div className="gcal__month-cell-events">
                {evs.slice(0,3).map(ev => {
                  const cat = categories.find(c => c.id === ev.categoryId);
                  const col = cat?.color || ev.color;
                  return (
                    <div key={ev.id} className="gcal__month-event" draggable
                      style={{ background: col + '22', color: col, borderColor: col }}
                      onDragStart={e => startDrag(e, ev)}
                      onDragEnd={endDrag}
                      onClick={e => { e.stopPropagation(); onEventClick(ev, e); }}>
                      <span className="gcal__event-dot" style={{ background: col }} />
                      {ev.startTime && <span className="gcal__event-time">{ev.startTime}</span>}
                      <span className="gcal__event-title">{ev.title}</span>
                    </div>
                  );
                })}
                {ts.slice(0,2).map(t => (
                  <div key={t.id} className={`gcal__month-task${t.status==='done'?' done':''}`}
                    onClick={e => { e.stopPropagation(); onUpdateTask?.(t.id, { status: t.status==='done'?'todo':'done' }); }}>
                    <span className="gcal__task-mini-check">{t.status==='done'?'✓':''}</span>
                    <span className="gcal__event-title">{t.title}</span>
                  </div>
                ))}
                {(evs.length + ts.length) > 4 && <div className="gcal__month-more">+{evs.length + ts.length - 4} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Week View ─────────────────────────────────────────────────────────────────
function WeekView({ anchor, dayEvents, dayTasks, onSlotClick, onEventClick, timeGridRef, categories, onUpdateEvent, onUpdateTask, onAddTask }) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 });
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const { top: nowTop, label: nowLabel } = useNow();
  const { dragging, startDrag, updateDrag, endDrag } = useDragEvent(onUpdateEvent);
  const gridWrapRef = useRef(null);

  // Expose scrollRef
  useEffect(() => { if (timeGridRef) timeGridRef.current = gridWrapRef.current; }, []);

  return (
    <div className="gcal__week">
      <div className="gcal__week-header">
        <div className="gcal__time-gutter" />
        {days.map((day, i) => (
          <div key={i} className={`gcal__week-day-header ${isToday(day) ? 'today' : ''}`}>
            <span className="gcal__week-dow">{DAY_NAMES_SHORT[day.getDay()]}</span>
            <span className={`gcal__week-date-num ${isToday(day) ? 'today-circle' : ''}`}>{format(day,'d')}</span>
          </div>
        ))}
      </div>

      <div className="gcal__allday-row">
        <div className="gcal__time-gutter gcal__allday-label">All day</div>
        {days.map((day, i) => {
          const evs = dayEvents(day).filter(e => e.allDay);
          const ts  = dayTasks(day);
          return (
            <div key={i} className="gcal__allday-cell">
              {evs.map(ev => <div key={ev.id} className="gcal__allday-event" style={{ background: ev.color + '33', color: ev.color }} onClick={e => onEventClick(ev, e)}>{ev.title}</div>)}
              {ts.map(t => (
                <div key={t.id} className={`gcal__task-chip${t.status==='done'?' done':''}`}>
                  <button className="gcal__task-chip-check" onClick={() => onUpdateTask?.(t.id, { status: t.status==='done'?'todo':'done' })}>
                    {t.status==='done' ? '✓' : ''}
                  </button>
                  <span>{t.title}</span>
                </div>
              ))}
              <button className="gcal__add-task-btn" onClick={() => onAddTask?.(day)} title="+ Task">+ Task</button>
            </div>
          );
        })}
      </div>

      <div
        className="gcal__time-grid-wrap"
        ref={gridWrapRef}
        onMouseMove={e => dragging && updateDrag(e, gridWrapRef.current, days)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        <div className="gcal__time-grid" style={{ height: HOUR_HEIGHT * 24 }}>
          {HOURS.map(h => (
            <div key={h} className="gcal__hour-row" style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              <div className="gcal__time-gutter">{h > 0 && <span className="gcal__hour-label">{String(h).padStart(2,'0')}:00</span>}</div>
              <div className="gcal__hour-line" />
            </div>
          ))}

          {/* Now-line — label in gutter, dot+bar only in today's column */}
          {(() => {
            const di = days.findIndex(d => isToday(d));
            if (di === -1) return null;
            const colFrac = `(100% - 60px) / 7`;
            const leftPx  = `calc(60px + ${di} * (${colFrac}))`;
            const rightPx = `calc(${6 - di} * (${colFrac}))`;
            return (
              <>
                <span className="gcal__now-gutter-label" style={{ top: nowTop }}>{nowLabel}</span>
                <div className="gcal__now-line" style={{ top: nowTop, left: leftPx, right: rightPx }}>
                  <div className="gcal__now-dot" />
                  <div className="gcal__now-bar" />
                </div>
              </>
            );
          })()}

          {days.map((day, di) => (
            <div
              key={di}
              className="gcal__day-col"
              style={{ left: `calc(60px + ${di} * calc((100% - 60px) / 7))`, width: 'calc((100% - 60px) / 7)' }}
              onClick={e => {
                if (dragging) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + (gridWrapRef.current?.scrollTop || 0);
                onSlotClick(day, minutesToTime(Math.round((y / HOUR_HEIGHT * 60) / 15) * 15));
              }}
              onDragOver={e => { if (e.dataTransfer.types.includes('cal-task-id')) e.preventDefault(); }}
              onDrop={e => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData('cal-task-id');
                if (!taskId) return;
                const rect = e.currentTarget.getBoundingClientRect();
                const y = e.clientY - rect.top + (gridWrapRef.current?.scrollTop || 0);
                const mins = Math.round((y / HOUR_HEIGHT * 60) / 30) * 30;
                onUpdateTask?.(taskId, { date: format(day,'yyyy-MM-dd') + 'T' + minutesToTime(mins) + ':00' });
              }}
            >

              {/* Drag preview */}
              {dragging && dragging.previewDate === format(day,'yyyy-MM-dd') && (() => {
                const startMins = timeToMinutes(dragging.previewTime);
                const endMins   = timeToMinutes(dragging.previewEndTime);
                const dur = Math.max(endMins - startMins, 30);
                return (
                  <div className="gcal__timed-event gcal__drag-preview"
                    style={{ top: (startMins/60)*HOUR_HEIGHT, height: (dur/60)*HOUR_HEIGHT, borderColor: dragging.event.color, background: dragging.event.color + '44' }}>
                    <span className="gcal__timed-event-title">{dragging.event.title}</span>
                    <span className="gcal__timed-event-time">{dragging.previewTime} – {dragging.previewEndTime}</span>
                  </div>
                );
              })()}

              {/* Events */}
              {dayEvents(day).filter(e => !e.allDay).map(ev => {
                const startMins = timeToMinutes(ev.startTime || '00:00');
                const endMins   = timeToMinutes(ev.endTime   || '01:00');
                const dur = Math.max(endMins - startMins, 30);
                const top    = (startMins / 60) * HOUR_HEIGHT;
                const height = (dur / 60) * HOUR_HEIGHT;
                const cat = categories.find(c => c.id === ev.categoryId);
                const col = cat?.color || ev.color;
                const isDragging = dragging?.event.id === ev.id;
                return (
                  <div
                    key={ev.id}
                    className={`gcal__timed-event ${isDragging ? 'gcal__event-dragging' : ''}`}
                    style={{ top, height: Math.max(height, 24), background: col + '22', borderColor: col, color: col, cursor: 'grab' }}
                    onMouseDown={e => { e.stopPropagation(); startDrag(e, ev); }}
                    onClick={e => { if (!dragging) { e.stopPropagation(); onEventClick(ev, e); } }}
                  >
                    <div className="gcal__timed-event-color-bar" style={{ background: col }} />
                    <div className="gcal__timed-event-body">
                      <span className="gcal__timed-event-title">{ev.title}</span>
                      {height > 30 && <span className="gcal__timed-event-time">{ev.startTime} – {ev.endTime}</span>}
                      {cat && <span className="gcal__event-cat-badge" style={{ background: col + '33', color: col }}>{cat.name}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Day View ──────────────────────────────────────────────────────────────────
function DayView({ anchor, dayEvents, dayTasks, onSlotClick, onEventClick, timeGridRef, categories, onUpdateEvent, onUpdateTask, onAddTask }) {
  const { top: nowTop, label: nowLabel } = useNow();
  const evs    = dayEvents(anchor).filter(e => !e.allDay);
  const allDay = dayEvents(anchor).filter(e => e.allDay);
  const ts     = dayTasks(anchor);
  const { dragging, startDrag, updateDrag, endDrag } = useDragEvent(onUpdateEvent);
  const gridWrapRef = useRef(null);
  useEffect(() => { if (timeGridRef) timeGridRef.current = gridWrapRef.current; }, []);

  return (
    <div className="gcal__week gcal__day">
      <div className="gcal__week-header">
        <div className="gcal__time-gutter" />
        <div className={`gcal__week-day-header gcal__week-day-header--full ${isToday(anchor) ? 'today' : ''}`}>
          <span className="gcal__week-dow">{DAY_NAMES_FULL[anchor.getDay()]}</span>
          <span className={`gcal__week-date-num ${isToday(anchor) ? 'today-circle' : ''}`}>{format(anchor,'d')}</span>
        </div>
      </div>
      <div className="gcal__allday-row">
        <div className="gcal__time-gutter gcal__allday-label">All day</div>
        <div className="gcal__allday-cell" style={{ flex:1 }}>
          {allDay.map(ev => <div key={ev.id} className="gcal__allday-event" style={{ background: ev.color+'33', color: ev.color }} onClick={e => onEventClick(ev,e)}>{ev.title}</div>)}
          {ts.map(t => (
            <div key={t.id} className={`gcal__task-chip${t.status==='done'?' done':''}`}>
              <button className="gcal__task-chip-check" onClick={() => onUpdateTask?.(t.id, { status: t.status==='done'?'todo':'done' })}>
                {t.status==='done' ? '✓' : ''}
              </button>
              <span>{t.title}</span>
            </div>
          ))}
          <button className="gcal__add-task-btn" onClick={onAddTask} title="+ Task">+ Task</button>
        </div>
      </div>
      <div
        className="gcal__time-grid-wrap"
        ref={gridWrapRef}
        onMouseMove={e => dragging && updateDrag(e, gridWrapRef.current, null)}
        onMouseUp={endDrag} onMouseLeave={endDrag}
        style={{ cursor: dragging ? 'grabbing' : 'default' }}
      >
        <div className="gcal__time-grid" style={{ height: HOUR_HEIGHT * 24 }}>
          {HOURS.map(h => (
            <div key={h} className="gcal__hour-row" style={{ top: h*HOUR_HEIGHT, height: HOUR_HEIGHT }}>
              <div className="gcal__time-gutter">{h > 0 && <span className="gcal__hour-label">{String(h).padStart(2,'0')}:00</span>}</div>
              <div className="gcal__hour-line" />
            </div>
          ))}
          {/* Now-line — label in gutter, bar in the single column */}
          {isToday(anchor) && (
            <>
              <span className="gcal__now-gutter-label" style={{ top: nowTop }}>{nowLabel}</span>
              <div className="gcal__now-line" style={{ top: nowTop, left: '60px', right: '0' }}>
                <div className="gcal__now-dot"/>
                <div className="gcal__now-bar"/>
              </div>
            </>
          )}
          <div className="gcal__day-col" style={{ left:'60px', width:'calc(100% - 60px)' }}
            onClick={e => { if (dragging) return; const rect = e.currentTarget.getBoundingClientRect(); const y = e.clientY - rect.top + (gridWrapRef.current?.scrollTop||0); onSlotClick(minutesToTime(Math.round((y/HOUR_HEIGHT*60)/15)*15)); }}
            onDragOver={e => { if (e.dataTransfer.types.includes('cal-task-id')) e.preventDefault(); }}
            onDrop={e => {
              e.preventDefault();
              const taskId = e.dataTransfer.getData('cal-task-id');
              if (!taskId) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const y = e.clientY - rect.top + (gridWrapRef.current?.scrollTop||0);
              const mins = Math.round((y / HOUR_HEIGHT * 60) / 30) * 30;
              onUpdateTask?.(taskId, { date: format(anchor,'yyyy-MM-dd') + 'T' + minutesToTime(mins) + ':00' });
            }}>
            {dragging && (() => {
              const sm = timeToMinutes(dragging.previewTime), em = timeToMinutes(dragging.previewEndTime);
              return <div className="gcal__timed-event gcal__drag-preview" style={{ top:(sm/60)*HOUR_HEIGHT, height:((Math.max(em-sm,30))/60)*HOUR_HEIGHT, borderColor:dragging.event.color, background:dragging.event.color+'44' }}>
                <span>{dragging.event.title}</span><span>{dragging.previewTime} – {dragging.previewEndTime}</span></div>;
            })()}
            {evs.map(ev => {
              const sm = timeToMinutes(ev.startTime||'00:00'), em = timeToMinutes(ev.endTime||'01:00');
              const dur = Math.max(em-sm,30); const top=(sm/60)*HOUR_HEIGHT; const height=(dur/60)*HOUR_HEIGHT;
              const cat=categories.find(c=>c.id===ev.categoryId); const col=cat?.color||ev.color;
              return <div key={ev.id} className={`gcal__timed-event ${dragging?.event.id===ev.id?'gcal__event-dragging':''}`}
                style={{ top, height:Math.max(height,24), background:col+'22', borderColor:col, color:col, cursor:'grab' }}
                onMouseDown={e=>{e.stopPropagation();startDrag(e,ev);}}
                onClick={e=>{if(!dragging){e.stopPropagation();onEventClick(ev,e);}}}>
                <div className="gcal__timed-event-color-bar" style={{background:col}}/>
                <div className="gcal__timed-event-body">
                  <span className="gcal__timed-event-title">{ev.title}</span>
                  {height>30&&<span className="gcal__timed-event-time">{ev.startTime} – {ev.endTime}</span>}
                  {cat&&<span className="gcal__event-cat-badge" style={{background:col+'33',color:col}}>{cat.name}</span>}
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tasks panel ───────────────────────────────────────────────────────────────
const PRIORITY_COLOR = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
const STATUS_LABEL   = { backlog:'Backlog', todo:'To Do', inprogress:'In Progress', review:'Review', done:'Done' };

function TasksPanel({ tasks, onUpdateTask, onClose }) {
  const unscheduled = tasks.filter(t => !t.date && t.status !== 'done');
  const scheduled   = tasks.filter(t =>  t.date && t.status !== 'done');
  const done        = tasks.filter(t => t.status === 'done').slice(0, 8);

  const onDragStart = (e, task) => {
    e.dataTransfer.setData('cal-task-id', task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const Section = ({ title, items }) => items.length === 0 ? null : (
    <div className="gcal__tp-section">
      <div className="gcal__tp-section-title">{title} <span>{items.length}</span></div>
      {items.map(t => (
        <div key={t.id} className={`gcal__tp-task${t.status==='done'?' gcal__tp-task--done':''}`}
          draggable onDragStart={e => onDragStart(e, t)}>
          <div className="gcal__tp-task-drag">⠿</div>
          <div className="gcal__tp-task-body">
            <span className="gcal__tp-task-title">{t.title}</span>
            <div className="gcal__tp-task-meta">
              <span className="gcal__tp-pri" style={{ color: PRIORITY_COLOR[t.priority] }}>
                {t.priority === 'high' ? '↑' : t.priority === 'medium' ? '→' : '↓'} {t.priority}
              </span>
              <span className="gcal__tp-status">{STATUS_LABEL[t.status] || t.status}</span>
              {t.date && <span className="gcal__tp-date">{t.date.slice(0,10)}</span>}
            </div>
          </div>
          {t.date && (
            <button className="gcal__tp-unschedule" title="Remove date"
              onClick={() => onUpdateTask(t.id, { date: null })}>✕</button>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="gcal__tasks-panel">
      <div className="gcal__tp-head">
        <span>✅ Tasks</span>
        <button onClick={onClose}>✕</button>
      </div>
      <p className="gcal__tp-hint">Drag a task onto a time slot to schedule it</p>
      <div className="gcal__tp-list">
        <Section title="Unscheduled" items={unscheduled} />
        <Section title="Scheduled" items={scheduled} />
        <Section title="Completed" items={done} />
        {tasks.filter(t => t.status !== 'done').length === 0 && (
          <div className="gcal__tp-empty">All tasks completed 🎉</div>
        )}
      </div>
    </div>
  );
}

// ── Event Modal ───────────────────────────────────────────────────────────────
function EventModal({ formData, setFormData, editingEvent, colors, categories, onSubmit, onDelete, onClose }) {
  const set = (k, v) => setFormData(f => ({ ...f, [k]: v }));

  // Load groups for sharing
  const groups = (() => { try { return JSON.parse(localStorage.getItem('mynotion_groups_v1') || '[]'); } catch { return []; } })();
  const sharedWith = formData.sharedWith || [];
  const toggleGroup = (gid) => {
    set('sharedWith', sharedWith.includes(gid) ? sharedWith.filter(id => id !== gid) : [...sharedWith, gid]);
  };
  return (
    <div className="gcal__modal-overlay" onClick={onClose}>
      <div className="gcal__modal" onClick={e => e.stopPropagation()}>
        <div className="gcal__modal-header">
          <h3>{editingEvent ? 'Edit Event' : 'New Event'}</h3>
          <button className="gcal__modal-close" onClick={onClose}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>
        <form onSubmit={onSubmit} className="gcal__modal-body">
          <input className="gcal__modal-title-input" type="text" placeholder="Add title" value={formData.title} onChange={e => set('title', e.target.value)} autoFocus required />

          <div className="gcal__modal-field">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <div className="gcal__modal-date-row">
              <input type="date" value={formData.startDate} onChange={e => set('startDate', e.target.value)} />
              {!formData.allDay && <><input type="time" value={formData.startTime} onChange={e => set('startTime', e.target.value)} /><span>–</span><input type="time" value={formData.endTime} onChange={e => set('endTime', e.target.value)} /></>}
            </div>
          </div>

          <div className="gcal__modal-field gcal__modal-allday">
            <label className="gcal__toggle-wrap">
              <input type="checkbox" checked={formData.allDay} onChange={e => set('allDay', e.target.checked)} />
              <span className="gcal__toggle" /><span>All day</span>
            </label>
          </div>

          {/* Category */}
          {categories.length > 0 && (
            <div className="gcal__modal-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
              <div className="gcal__modal-cats">
                <button type="button" className={`gcal__modal-cat ${!formData.categoryId ? 'active' : ''}`} onClick={() => set('categoryId', null)}>No category</button>
                {categories.map(c => (
                  <button key={c.id} type="button"
                    className={`gcal__modal-cat ${formData.categoryId === c.id ? 'active' : ''}`}
                    style={formData.categoryId === c.id ? { background: c.color + '22', borderColor: c.color, color: c.color } : { borderColor: c.color + '60' }}
                    onClick={() => { set('categoryId', c.id); set('color', c.color); }}>
                    <span className="gcal__cat-dot" style={{ background: c.color }} />{c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="gcal__modal-field">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            <textarea placeholder="Add description..." value={formData.description} onChange={e => set('description', e.target.value)} rows={2} />
          </div>

          <div className="gcal__modal-field">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/></svg>
            <div className="gcal__color-row">
              {colors.map(c => <button key={c} type="button" className={`gcal__color-dot ${formData.color === c ? 'selected' : ''}`} style={{ background: c }} onClick={() => set('color', c)} />)}
            </div>
          </div>

          {editingEvent && (
            <div className="gcal__modal-field">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
              <ProjectPicker itemId={editingEvent.id} field="eventIds" />
            </div>
          )}

          {groups.length > 0 && (
            <div className="gcal__modal-field gcal__share-row">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <div className="gcal__share-groups">
                <span className="gcal__share-label">Share with</span>
                <div className="gcal__share-chips">
                  {groups.map(g => (
                    <button key={g.id} type="button"
                      className={`gcal__share-chip${sharedWith.includes(g.id) ? ' active' : ''}`}
                      style={sharedWith.includes(g.id) ? { background: g.color + '22', borderColor: g.color, color: g.color } : {}}
                      onClick={() => toggleGroup(g.id)}>
                      {sharedWith.includes(g.id) && '✓ '}{g.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="gcal__modal-footer">
            {editingEvent && <button type="button" className="gcal__modal-delete" onClick={onDelete}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>Delete</button>}
            <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
              <button type="button" className="gcal__modal-cancel" onClick={onClose}>Cancel</button>
              <button type="submit" className="gcal__modal-save">Save</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
