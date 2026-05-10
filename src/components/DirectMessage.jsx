import { useState, useRef } from 'react';
import { format, parseISO, isFuture } from 'date-fns';
import { he } from 'date-fns/locale';
import { v4 as uuidv4 } from 'uuid';
import './DirectMessage.css';

const DIRECTS_KEY = 'mynotion_directs_v1';

function getContact(id) {
  try { return JSON.parse(localStorage.getItem(DIRECTS_KEY) || '[]').find(c => c.id === id) || null; }
  catch { return null; }
}
function spaceKey(id)  { return `mynotion_space_${id}`; }
function loadSpace(id) {
  try { return JSON.parse(localStorage.getItem(spaceKey(id)) || 'null') || { shares: [], sharedEvents: [], sharedTasks: [], sharedGoals: [] }; }
  catch { return { shares: [], sharedEvents: [], sharedTasks: [], sharedGoals: [] }; }
}
function saveSpace(id, s) { localStorage.setItem(spaceKey(id), JSON.stringify(s)); }

const SHARE_TYPES = [
  { id: 'message',  icon: '💬', label: 'הודעה'  },
  { id: 'document', icon: '📄', label: 'מסמך'   },
  { id: 'video',    icon: '🎥', label: 'סרטון'  },
  { id: 'link',     icon: '🔗', label: 'קישור'  },
  { id: 'note',     icon: '📝', label: 'פתק'    },
  { id: 'image',    icon: '🖼️', label: 'תמונה'  },
];

export default function DirectMessage({ contactId, events, tasks, goals }) {
  const contact = getContact(contactId);
  const [space, setSpace]       = useState(() => loadSpace(contactId));
  const [section, setSection]   = useState('schedule'); // schedule | tasks | goals | shares
  const [showAdd, setShowAdd]   = useState(false);
  const [addType, setAddType]   = useState('message');
  const [addContent, setAddContent] = useState('');
  const [addTitle, setAddTitle] = useState('');
  const [addUrl, setAddUrl]     = useState('');

  const updateSpace = (changes) => {
    const next = { ...space, ...changes };
    setSpace(next); saveSpace(contactId, next);
  };

  const addShare = () => {
    if (!addContent.trim() && !addUrl.trim()) return;
    const item = { id: uuidv4(), type: addType, content: addContent.trim(), title: addTitle.trim(), url: addUrl.trim(), sharedBy: 'me', ts: new Date().toISOString() };
    updateSpace({ shares: [...space.shares, item] });
    setAddContent(''); setAddTitle(''); setAddUrl(''); setShowAdd(false);
  };

  const removeShare = (id) => updateSpace({ shares: space.shares.filter(s => s.id !== id) });

  const toggleEvent = (evId) => {
    const list = space.sharedEvents.includes(evId)
      ? space.sharedEvents.filter(x => x !== evId)
      : [...space.sharedEvents, evId];
    updateSpace({ sharedEvents: list });
  };

  const toggleTask = (tId) => {
    const list = space.sharedTasks.includes(tId)
      ? space.sharedTasks.filter(x => x !== tId)
      : [...space.sharedTasks, tId];
    updateSpace({ sharedTasks: list });
  };

  const toggleGoal = (gId) => {
    const list = space.sharedGoals.includes(gId)
      ? space.sharedGoals.filter(x => x !== gId)
      : [...space.sharedGoals, gId];
    updateSpace({ sharedGoals: list });
  };

  if (!contact) return <div className="dm dm--empty"><p>איש הקשר לא נמצא</p></div>;

  const sharedEvs   = events?.filter(e  => space.sharedEvents.includes(e.id))  || [];
  const sharedTasks = tasks?.filter(t   => space.sharedTasks.includes(t.id))   || [];
  const sharedGoals = goals?.filter(g   => space.sharedGoals.includes(g.id))   || [];
  const allEvents   = events?.slice(0, 12) || [];
  const allTasks    = tasks?.filter(t => t.status !== 'done').slice(0, 12) || [];
  const allGoals    = goals?.slice(0, 8) || [];

  return (
    <div className="dm">
      {/* ── Profile header ── */}
      <div className="dm__profile-header">
        <div className="dm__profile-left">
          <div className="dm__profile-avatar" style={{ background: contact.color + '20', borderColor: contact.color + '55' }}>
            <span>{contact.avatar}</span>
          </div>
          <div>
            <h2 className="dm__profile-name">{contact.name}</h2>
            <p className="dm__profile-sub">
              <span className="dm__online" />
              הלוח המשותף שלנו
            </p>
          </div>
        </div>

        {/* Section tabs */}
        <div className="dm__section-tabs">
          {[
            { id: 'schedule', icon: '📅', label: 'לוח שנה', count: sharedEvs.length },
            { id: 'tasks',    icon: '✅', label: 'משימות',  count: sharedTasks.length },
            { id: 'goals',    icon: '🎯', label: 'מטרות',   count: sharedGoals.length },
            { id: 'shares',   icon: '📤', label: 'שיתופים', count: space.shares.length },
          ].map(s => (
            <button
              key={s.id}
              className={`dm__section-tab ${section === s.id ? 'active' : ''}`}
              style={section === s.id ? { borderBottomColor: contact.color, color: contact.color } : {}}
              onClick={() => setSection(s.id)}
            >
              {s.icon} {s.label}
              {s.count > 0 && <span className="dm__tab-count" style={{ background: contact.color }}>{s.count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="dm__content">

        {/* ── Schedule ── */}
        {section === 'schedule' && (
          <div className="dm__section-body">
            <div className="dm__section-top">
              <h3>📅 אירועים שיתופיים</h3>
              <p>בחר אירועים מהיומן שלך לשיתוף עם {contact.name}</p>
            </div>

            {sharedEvs.length > 0 && (
              <div className="dm__shared-items">
                <p className="dm__shared-label">משותף כעת</p>
                {sharedEvs.map(ev => (
                  <div key={ev.id} className="dm__shared-event" style={{ borderColor: ev.color + '50', '--ec': ev.color }}>
                    <div className="dm__shared-event-bar" style={{ background: ev.color }} />
                    <div className="dm__shared-event-body">
                      <span className="dm__shared-event-title">{ev.title}</span>
                      <span className="dm__shared-event-date">
                        {ev.startDate?.slice(0,10)}{ev.startTime ? ' · ' + ev.startTime : ''}
                      </span>
                    </div>
                    <button className="dm__unshare" onClick={() => toggleEvent(ev.id)} title="הסר שיתוף">✕</button>
                  </div>
                ))}
              </div>
            )}

            {allEvents.length > 0 && (
              <div className="dm__pick-section">
                <p className="dm__pick-label">הוסף לשיתוף</p>
                <div className="dm__pick-list">
                  {allEvents.filter(e => !space.sharedEvents.includes(e.id)).map(ev => (
                    <button key={ev.id} className="dm__pick-item" onClick={() => toggleEvent(ev.id)}>
                      <span className="dm__pick-dot" style={{ background: ev.color }} />
                      <span className="dm__pick-title">{ev.title}</span>
                      <span className="dm__pick-date">{ev.startDate?.slice(0,10)}</span>
                      <span className="dm__pick-add">+ שתף</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allEvents.length === 0 && <EmptySection icon="📅" text="אין אירועים ביומן" />}
          </div>
        )}

        {/* ── Tasks ── */}
        {section === 'tasks' && (
          <div className="dm__section-body">
            <div className="dm__section-top">
              <h3>✅ משימות שיתופיות</h3>
              <p>שתף משימות עם {contact.name}</p>
            </div>

            {sharedTasks.length > 0 && (
              <div className="dm__shared-items">
                <p className="dm__shared-label">משותף כעת</p>
                {sharedTasks.map(t => {
                  const pColor = t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981';
                  return (
                    <div key={t.id} className="dm__shared-task">
                      <span className="dm__task-pri" style={{ background: pColor + '20', color: pColor }}>
                        {t.priority === 'high' ? '↑' : t.priority === 'medium' ? '→' : '↓'}
                      </span>
                      <span className="dm__task-title">{t.title}</span>
                      <span className={`dm__task-status ${t.status}`}>{t.status === 'done' ? '✓' : t.status === 'inprogress' ? '⚡' : '○'}</span>
                      <button className="dm__unshare" onClick={() => toggleTask(t.id)}>✕</button>
                    </div>
                  );
                })}
              </div>
            )}

            {allTasks.length > 0 && (
              <div className="dm__pick-section">
                <p className="dm__pick-label">הוסף לשיתוף</p>
                <div className="dm__pick-list">
                  {allTasks.filter(t => !space.sharedTasks.includes(t.id)).map(t => (
                    <button key={t.id} className="dm__pick-item" onClick={() => toggleTask(t.id)}>
                      <span className="dm__pick-dot" style={{ background: t.priority === 'high' ? '#ef4444' : t.priority === 'medium' ? '#f59e0b' : '#10b981' }} />
                      <span className="dm__pick-title">{t.title}</span>
                      <span className="dm__pick-add">+ שתף</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allTasks.length === 0 && <EmptySection icon="✅" text="אין משימות ממתינות" />}
          </div>
        )}

        {/* ── Goals ── */}
        {section === 'goals' && (
          <div className="dm__section-body">
            <div className="dm__section-top">
              <h3>🎯 מטרות שיתופיות</h3>
              <p>שתף מטרות עם {contact.name}</p>
            </div>

            {sharedGoals.length > 0 && (
              <div className="dm__shared-items">
                <p className="dm__shared-label">משותף כעת</p>
                {sharedGoals.map(g => (
                  <div key={g.id} className="dm__shared-goal" style={{ borderColor: g.color + '50' }}>
                    <div className="dm__goal-info">
                      <span className="dm__goal-title">{g.title}</span>
                      <div className="dm__goal-bar-wrap">
                        <div className="dm__goal-bar" style={{ width: g.progress + '%', background: g.color }} />
                      </div>
                      <span className="dm__goal-pct" style={{ color: g.color }}>{g.progress}%</span>
                    </div>
                    <button className="dm__unshare" onClick={() => toggleGoal(g.id)}>✕</button>
                  </div>
                ))}
              </div>
            )}

            {allGoals.length > 0 && (
              <div className="dm__pick-section">
                <p className="dm__pick-label">הוסף לשיתוף</p>
                <div className="dm__pick-list">
                  {allGoals.filter(g => !space.sharedGoals.includes(g.id)).map(g => (
                    <button key={g.id} className="dm__pick-item" onClick={() => toggleGoal(g.id)}>
                      <span className="dm__pick-dot" style={{ background: g.color }} />
                      <span className="dm__pick-title">{g.title}</span>
                      <span className="dm__pick-date">{g.timeframe}</span>
                      <span className="dm__pick-add">+ שתף</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {allGoals.length === 0 && <EmptySection icon="🎯" text="אין מטרות" />}
          </div>
        )}

        {/* ── Shares feed ── */}
        {section === 'shares' && (
          <div className="dm__section-body">
            <div className="dm__section-top">
              <h3>📤 דברים שיתופיים</h3>
              <p>הודעות, מסמכים, סרטונים וכל דבר ששיתפת</p>
            </div>

            {/* Add share */}
            {showAdd ? (
              <div className="dm__add-share">
                <div className="dm__add-share-types">
                  {SHARE_TYPES.map(t => (
                    <button
                      key={t.id}
                      className={`dm__add-type-btn ${addType === t.id ? 'active' : ''}`}
                      style={addType === t.id ? { background: contact.color + '18', borderColor: contact.color, color: contact.color } : {}}
                      onClick={() => setAddType(t.id)}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
                {(addType === 'document' || addType === 'video' || addType === 'link' || addType === 'image') && (
                  <input className="dm__add-input" placeholder="כותרת..." value={addTitle} onChange={e => setAddTitle(e.target.value)} />
                )}
                {(addType === 'document' || addType === 'video' || addType === 'link') && (
                  <input className="dm__add-input" placeholder="קישור (URL)..." value={addUrl} onChange={e => setAddUrl(e.target.value)} dir="ltr" />
                )}
                <textarea
                  className="dm__add-textarea"
                  placeholder={addType === 'message' ? 'כתוב הודעה...' : addType === 'note' ? 'כתוב פתק...' : 'תיאור...'}
                  value={addContent}
                  onChange={e => setAddContent(e.target.value)}
                  rows={3}
                  onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) addShare(); }}
                />
                <div className="dm__add-share-actions">
                  <button className="dm__add-cancel" onClick={() => { setShowAdd(false); setAddContent(''); setAddTitle(''); setAddUrl(''); }}>ביטול</button>
                  <button className="dm__add-submit" style={{ background: contact.color }} onClick={addShare}>שתף</button>
                </div>
              </div>
            ) : (
              <button className="dm__add-share-btn" style={{ borderColor: contact.color + '60', color: contact.color }} onClick={() => setShowAdd(true)}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                הוסף שיתוף
              </button>
            )}

            {/* Feed */}
            <div className="dm__feed">
              {space.shares.length === 0 && !showAdd && (
                <EmptySection icon="📤" text="אין שיתופים עדיין" sub="הוסף הודעות, מסמכים, סרטונים ועוד" />
              )}
              {[...space.shares].reverse().map(item => {
                const typeDef = SHARE_TYPES.find(t => t.id === item.type);
                return (
                  <div key={item.id} className="dm__feed-item">
                    <div className="dm__feed-type-icon">{typeDef?.icon}</div>
                    <div className="dm__feed-body">
                      {item.title && <span className="dm__feed-title">{item.title}</span>}
                      {item.content && <p className="dm__feed-content">{item.content}</p>}
                      {item.url && (
                        <a href={item.url} target="_blank" rel="noreferrer" className="dm__feed-url"
                          style={{ color: contact.color }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          {item.url.replace(/^https?:\/\//, '').slice(0, 40)}
                        </a>
                      )}
                      <span className="dm__feed-ts">{format(parseISO(item.ts), 'd MMM, HH:mm', { locale: he })}</span>
                    </div>
                    <button className="dm__feed-del" onClick={() => removeShare(item.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptySection({ icon, text, sub }) {
  return (
    <div className="dm__empty-section">
      <span>{icon}</span>
      <p>{text}</p>
      {sub && <p className="dm__empty-sub">{sub}</p>}
    </div>
  );
}
