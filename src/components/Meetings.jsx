import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, parseISO, isAfter, isBefore, startOfDay } from 'date-fns';
import './Meetings.css';

const STORAGE_KEY = 'mynotion_meetings_v1';
const COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function save(m) { localStorage.setItem(STORAGE_KEY, JSON.stringify(m)); }

// Add minutes to HH:MM string
function addMinutes(time, mins) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2,'0')}:${String(total % 60).padStart(2,'0')}`;
}

// Recalculate all agenda start times
function calcSchedule(agenda, startTime) {
  let cur = startTime || '09:00';
  return agenda.map(item => {
    const st = cur;
    cur = addMinutes(cur, item.duration || 30);
    return { ...item, startTime: st, endTime: cur };
  });
}

function totalDuration(agenda) {
  return agenda.reduce((s, a) => s + (a.duration || 0), 0);
}

const EMPTY_MEETING = (color) => ({
  id: uuidv4(),
  title: 'פגישה חדשה',
  date: new Date().toISOString().slice(0, 10),
  time: '09:00',
  location: '',
  color: color || COLORS[0],
  participants: [],
  agenda: [
    { id: uuidv4(), topic: 'פתיחה', duration: 5,  notes: '' },
    { id: uuidv4(), topic: 'נושא עיקרי', duration: 30, notes: '' },
    { id: uuidv4(), topic: 'שאלות ותשובות', duration: 15, notes: '' },
    { id: uuidv4(), topic: 'סיכום ומשימות', duration: 10, notes: '' },
  ],
  decisions: [],
  todos: [],
  notes: '',
  createdAt: new Date().toISOString(),
});

export default function Meetings() {
  const [meetings, setMeetings] = useState(load);
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState('');

  const selected = meetings.find(m => m.id === selectedId) || null;
  const today = startOfDay(new Date());

  const updateMeeting = (id, changes) => {
    const updated = meetings.map(m => m.id === id ? { ...m, ...changes } : m);
    setMeetings(updated);
    save(updated);
  };

  const createMeeting = () => {
    const m = EMPTY_MEETING(COLORS[meetings.length % COLORS.length]);
    const updated = [m, ...meetings];
    setMeetings(updated);
    save(updated);
    setSelectedId(m.id);
  };

  const deleteMeeting = (id) => {
    const updated = meetings.filter(m => m.id !== id);
    setMeetings(updated);
    save(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  };

  const filtered = meetings.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.location.toLowerCase().includes(search.toLowerCase())
  );

  const upcoming = filtered.filter(m => !isBefore(parseISO(m.date), today));
  const past     = filtered.filter(m =>  isBefore(parseISO(m.date), today));

  return (
    <div className="mtg">

      {/* ── Left: meeting list ── */}
      <div className="mtg__list">
        <div className="mtg__list-head">
          <h2 className="mtg__list-title">פגישות</h2>
          <button className="mtg__list-add" onClick={createMeeting} title="פגישה חדשה">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        <div className="mtg__list-search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="חפש פגישה..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="mtg__list-scroll">
          {upcoming.length > 0 && (
            <div className="mtg__list-group">
              <p className="mtg__list-group-label">קרובות</p>
              {upcoming.map(m => (
                <MeetingListItem key={m.id} meeting={m} active={m.id === selectedId}
                  onClick={() => setSelectedId(m.id)} onDelete={() => deleteMeeting(m.id)} />
              ))}
            </div>
          )}
          {past.length > 0 && (
            <div className="mtg__list-group">
              <p className="mtg__list-group-label">עברו</p>
              {past.map(m => (
                <MeetingListItem key={m.id} meeting={m} active={m.id === selectedId}
                  onClick={() => setSelectedId(m.id)} onDelete={() => deleteMeeting(m.id)} past />
              ))}
            </div>
          )}
          {filtered.length === 0 && (
            <div className="mtg__list-empty">
              <p>{search ? `אין תוצאות לחיפוש "${search}"` : 'אין פגישות'}</p>
              {!search && <button onClick={createMeeting}>+ פגישה ראשונה</button>}
            </div>
          )}
        </div>
      </div>

      {/* ── Right: meeting detail ── */}
      <div className="mtg__detail">
        {selected ? (
          <MeetingDetail
            meeting={selected}
            onChange={ch => updateMeeting(selected.id, ch)}
            onDelete={() => deleteMeeting(selected.id)}
          />
        ) : (
          <div className="mtg__empty">
            <div className="mtg__empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.25"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="8" y1="14" x2="16" y2="14"/><line x1="8" y1="18" x2="12" y2="18"/></svg>
            </div>
            <h3>בחר פגישה</h3>
            <p>או צור פגישה חדשה כדי להתחיל</p>
            <button onClick={createMeeting}>+ פגישה חדשה</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Meeting list item ──────────────────────────────────────────────────────────
function MeetingListItem({ meeting, active, onClick, onDelete, past }) {
  const [showDel, setShowDel] = useState(false);
  const dur = totalDuration(meeting.agenda);

  return (
    <div
      className={`mtg__item${active ? ' active' : ''}${past ? ' past' : ''}`}
      onClick={onClick}
      onMouseEnter={() => setShowDel(true)}
      onMouseLeave={() => setShowDel(false)}
    >
      <div className="mtg__item-dot" style={{ background: meeting.color }} />
      <div className="mtg__item-body">
        <p className="mtg__item-title">{meeting.title}</p>
        <p className="mtg__item-meta">
          {format(parseISO(meeting.date), 'dd/MM')} · {meeting.time}
          {dur > 0 && ` · ${dur} דק`}
          {meeting.participants.length > 0 && ` · ${meeting.participants.length} משתתפים`}
        </p>
      </div>
      {showDel && (
        <button className="mtg__item-del" onClick={e => { e.stopPropagation(); onDelete(); }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      )}
    </div>
  );
}

// ── Meeting detail ────────────────────────────────────────────────────────────
function MeetingDetail({ meeting, onChange, onDelete }) {
  const [newParticipant, setNewParticipant] = useState('');
  const [newDecision, setNewDecision]       = useState('');
  const [newTodo, setNewTodo]               = useState('');
  const [expandedAgenda, setExpandedAgenda] = useState(null);

  const schedule = calcSchedule(meeting.agenda, meeting.time);
  const total    = totalDuration(meeting.agenda);
  const endTime  = addMinutes(meeting.time, total);

  const addParticipant = () => {
    if (!newParticipant.trim()) return;
    onChange({ participants: [...meeting.participants, { id: uuidv4(), name: newParticipant.trim() }] });
    setNewParticipant('');
  };

  const removeParticipant = (id) => {
    onChange({ participants: meeting.participants.filter(p => p.id !== id) });
  };

  const updateAgendaItem = (id, changes) => {
    onChange({ agenda: meeting.agenda.map(a => a.id === id ? { ...a, ...changes } : a) });
  };

  const addAgendaItem = () => {
    onChange({ agenda: [...meeting.agenda, { id: uuidv4(), topic: 'נושא חדש', duration: 15, notes: '' }] });
  };

  const removeAgendaItem = (id) => {
    onChange({ agenda: meeting.agenda.filter(a => a.id !== id) });
  };

  const addDecision = () => {
    if (!newDecision.trim()) return;
    onChange({ decisions: [...meeting.decisions, { id: uuidv4(), text: newDecision.trim() }] });
    setNewDecision('');
  };

  const removeDecision = (id) => {
    onChange({ decisions: meeting.decisions.filter(d => d.id !== id) });
  };

  const addTodo = () => {
    if (!newTodo.trim()) return;
    onChange({ todos: [...meeting.todos, { id: uuidv4(), text: newTodo.trim(), done: false }] });
    setNewTodo('');
  };

  const toggleTodo = (id) => {
    onChange({ todos: meeting.todos.map(t => t.id === id ? { ...t, done: !t.done } : t) });
  };

  const removeTodo = (id) => {
    onChange({ todos: meeting.todos.filter(t => t.id !== id) });
  };

  return (
    <div className="mtg__d">
      {/* Header */}
      <div className="mtg__d-header" style={{ borderColor: meeting.color + '40' }}>
        <div className="mtg__d-color-strip" style={{ background: meeting.color }} />
        <div className="mtg__d-header-main">
          <input
            className="mtg__d-title"
            value={meeting.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="שם הפגישה..."
          />
          <div className="mtg__d-meta-row">
            <label className="mtg__d-meta-field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <input type="date" value={meeting.date} onChange={e => onChange({ date: e.target.value })} />
            </label>
            <label className="mtg__d-meta-field">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              <input type="time" value={meeting.time} onChange={e => onChange({ time: e.target.value })} />
            </label>
            <span className="mtg__d-meta-dur">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              {total} דקות
            </span>
            <label className="mtg__d-meta-field mtg__d-meta-field--loc">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              <input placeholder="מיקום / קישור..." value={meeting.location} onChange={e => onChange({ location: e.target.value })} />
            </label>

            {/* Color picker */}
            <div className="mtg__d-colors">
              {COLORS.map(c => (
                <button key={c} className={`mtg__d-color-btn${meeting.color === c ? ' active' : ''}`}
                  style={{ background: c }} onClick={() => onChange({ color: c })} />
              ))}
            </div>
          </div>

          {/* Participants */}
          <div className="mtg__d-participants">
            {meeting.participants.map(p => (
              <div key={p.id} className="mtg__participant" style={{ borderColor: meeting.color + '50', color: meeting.color }}>
                <div className="mtg__participant-av" style={{ background: meeting.color }}>{p.name[0].toUpperCase()}</div>
                <span>{p.name}</span>
                <button onClick={() => removeParticipant(p.id)}>✕</button>
              </div>
            ))}
            <div className="mtg__participant-add">
              <input
                placeholder="+ הוסף משתתף"
                value={newParticipant}
                onChange={e => setNewParticipant(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addParticipant()}
                onBlur={addParticipant}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mtg__d-body">

        {/* ── Schedule ── */}
        <section className="mtg__section">
          <div className="mtg__section-head">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <h3>לוז הפגישה</h3>
            <span className="mtg__section-meta">{meeting.time} – {endTime} · {total} דקות</span>
          </div>

          <div className="mtg__schedule">
            {schedule.map((item, idx) => (
              <div key={item.id} className="mtg__slot">
                {/* Time column */}
                <div className="mtg__slot-time-col">
                  <span className="mtg__slot-time">{item.startTime}</span>
                  {idx < schedule.length - 1 && <div className="mtg__slot-line" style={{ background: meeting.color + '30' }} />}
                </div>

                {/* Card */}
                <div className={`mtg__slot-card${expandedAgenda === item.id ? ' expanded' : ''}`}
                  style={{ borderColor: meeting.color + '30' }}>
                  <div className="mtg__slot-card-head" onClick={() => setExpandedAgenda(expandedAgenda === item.id ? null : item.id)}>
                    <div className="mtg__slot-dot" style={{ background: meeting.color }} />
                    <input
                      className="mtg__slot-topic"
                      value={item.topic}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateAgendaItem(item.id, { topic: e.target.value })}
                      placeholder="נושא..."
                    />
                    <div className="mtg__slot-dur-wrap">
                      <input
                        type="number"
                        className="mtg__slot-dur-input"
                        value={item.duration}
                        min={1} max={180}
                        onClick={e => e.stopPropagation()}
                        onChange={e => updateAgendaItem(item.id, { duration: parseInt(e.target.value)||5 })}
                      />
                      <span className="mtg__slot-dur-label">דק</span>
                    </div>
                    <button className="mtg__slot-del" onClick={e => { e.stopPropagation(); removeAgendaItem(item.id); }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <span className="mtg__slot-expand-icon">{expandedAgenda === item.id ? '▲' : '▼'}</span>
                  </div>
                  {expandedAgenda === item.id && (
                    <textarea
                      className="mtg__slot-notes"
                      placeholder="הערות לנושא זה..."
                      value={item.notes}
                      onChange={e => updateAgendaItem(item.id, { notes: e.target.value })}
                      rows={3}
                    />
                  )}
                </div>
              </div>
            ))}

            {/* End marker */}
            <div className="mtg__slot mtg__slot--end">
              <div className="mtg__slot-time-col">
                <span className="mtg__slot-time mtg__slot-time--end">{endTime}</span>
              </div>
              <div className="mtg__slot-end-badge" style={{ color: meeting.color, borderColor: meeting.color + '40', background: meeting.color + '10' }}>
                ◆ סיום פגישה
              </div>
            </div>

            <button className="mtg__schedule-add" onClick={addAgendaItem} style={{ color: meeting.color }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              הוסף נושא ללוז
            </button>
          </div>
        </section>

        {/* ── Decisions ── */}
        <section className="mtg__section">
          <div className="mtg__section-head">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <h3>החלטות שהתקבלו</h3>
          </div>
          <div className="mtg__decisions">
            {meeting.decisions.map(d => (
              <div key={d.id} className="mtg__decision">
                <div className="mtg__decision-dot" style={{ background: meeting.color }} />
                <span>{d.text}</span>
                <button onClick={() => removeDecision(d.id)}>✕</button>
              </div>
            ))}
            <div className="mtg__decision-add">
              <input
                placeholder="הוסף החלטה..."
                value={newDecision}
                onChange={e => setNewDecision(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addDecision()}
              />
            </div>
          </div>
        </section>

        {/* ── Action items ── */}
        <section className="mtg__section">
          <div className="mtg__section-head">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            <h3>משימות המשך</h3>
          </div>
          <div className="mtg__todos">
            {meeting.todos.map(t => (
              <div key={t.id} className={`mtg__todo${t.done ? ' done' : ''}`} onClick={() => toggleTodo(t.id)}>
                <div className="mtg__todo-check" style={t.done ? { background: meeting.color, borderColor: meeting.color } : { borderColor: '#d1d5db' }}>
                  {t.done && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
                <span className="mtg__todo-text">{t.text}</span>
                <button className="mtg__todo-del" onClick={e => { e.stopPropagation(); removeTodo(t.id); }}>✕</button>
              </div>
            ))}
            <div className="mtg__todo-add">
              <input
                placeholder="הוסף משימה..."
                value={newTodo}
                onChange={e => setNewTodo(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTodo()}
              />
            </div>
          </div>
        </section>

        {/* ── Notes ── */}
        <section className="mtg__section">
          <div className="mtg__section-head">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>הערות כלליות</h3>
          </div>
          <textarea
            className="mtg__notes"
            placeholder="הערות, מידע רקע, קישורים שימושיים..."
            value={meeting.notes}
            onChange={e => onChange({ notes: e.target.value })}
            rows={5}
          />
        </section>

        {/* Delete */}
        <div className="mtg__d-footer">
          <button className="mtg__d-delete" onClick={onDelete}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            מחק פגישה
          </button>
        </div>
      </div>
    </div>
  );
}
