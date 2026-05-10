import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Groups.css';

const STORAGE_KEY = 'mynotion_groups_v1';
const GROUP_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#0891b2'];
const AVATARS = ['🧑','👩','👨','🧑‍💻','👩‍💻','👨‍🎨','🧑‍🎤','👩‍🔬','🧑‍🚀','👩‍💼','👨‍🍳','🧑‍🎓'];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function save(g) { localStorage.setItem(STORAGE_KEY, JSON.stringify(g)); }

function generateCode(group) {
  return btoa(JSON.stringify({ id: group.id, name: group.name, color: group.color, members: group.members })).slice(0, 16).toUpperCase();
}

export default function Groups() {
  const [groups, setGroups]       = useState(load);
  const [active, setActive]       = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [joinCode, setJoinCode]   = useState('');
  const [joinErr, setJoinErr]     = useState('');

  const createGroup = (name, color) => {
    const g = { id: uuidv4(), name, color, avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)], members: [], notes: '', tasks: [], createdAt: new Date().toISOString() };
    const updated = [...groups, g];
    setGroups(updated); save(updated);
    setActive(g); setShowCreate(false);
  };

  const updateGroup = (id, ch) => {
    const updated = groups.map(g => g.id === id ? { ...g, ...ch } : g);
    setGroups(updated); save(updated);
    if (active?.id === id) setActive(prev => ({ ...prev, ...ch }));
  };

  const deleteGroup = (id) => {
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated); save(updated);
    if (active?.id === id) setActive(null);
  };

  const addMember = (groupId, name, avatar) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const member = { id: uuidv4(), name, avatar: avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)] };
    updateGroup(groupId, { members: [...group.members, member] });
  };

  const removeMember = (groupId, memberId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, { members: group.members.filter(m => m.id !== memberId) });
  };

  const currentGroup = active ? groups.find(g => g.id === active.id) || active : null;

  return (
    <div className="grp">
      {/* ── Left: groups list ── */}
      <div className="grp__list">
        <div className="grp__list-header">
          <h2 className="grp__list-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            קבוצות
          </h2>
          <button className="grp__new-btn" onClick={() => setShowCreate(true)}>+</button>
        </div>

        <div className="grp__items">
          {groups.length === 0 && (
            <div className="grp__list-empty">
              <p>אין קבוצות עדיין</p>
              <button onClick={() => setShowCreate(true)}>+ צור קבוצה</button>
            </div>
          )}
          {groups.map(g => (
            <button
              key={g.id}
              className={`grp__item ${active?.id === g.id ? 'active' : ''}`}
              style={{ '--gc': g.color }}
              onClick={() => setActive(g)}
            >
              <div className="grp__item-avatar" style={{ background: g.color + '33', borderColor: g.color + '60' }}>
                {g.avatar}
              </div>
              <div className="grp__item-info">
                <span className="grp__item-name">{g.name}</span>
                <span className="grp__item-members">{g.members.length} חברים</span>
              </div>
              {active?.id === g.id && <div className="grp__item-indicator" style={{ background: g.color }} />}
            </button>
          ))}
        </div>

        {/* Join with code */}
        <div className="grp__join">
          <p className="grp__join-label">הצטרף עם קוד</p>
          <div className="grp__join-row">
            <input
              className="grp__join-input"
              placeholder="הכנס קוד הצטרפות"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinErr(''); }}
              onKeyDown={e => e.key === 'Enter' && setJoinErr('קוד לא תקין (פונקציה דמו)')}
            />
            <button onClick={() => setJoinErr('קוד לא תקין (פונקציה דמו)')}>הצטרף</button>
          </div>
          {joinErr && <p className="grp__join-err">{joinErr}</p>}
        </div>
      </div>

      {/* ── Right: group detail ── */}
      {currentGroup ? (
        <GroupDetail
          group={currentGroup}
          onUpdate={ch => updateGroup(currentGroup.id, ch)}
          onDelete={() => deleteGroup(currentGroup.id)}
          onAddMember={(name, av) => addMember(currentGroup.id, name, av)}
          onRemoveMember={mid => removeMember(currentGroup.id, mid)}
          avatars={AVATARS}
        />
      ) : (
        <div className="grp__empty">
          <div className="grp__empty-icon">👥</div>
          <h3>בחר קבוצה</h3>
          <p>או צור קבוצה חדשה לשיתוף עם חברים ושותפים</p>
          <button className="grp__empty-btn" onClick={() => setShowCreate(true)}>+ קבוצה חדשה</button>
        </div>
      )}

      {/* Create modal */}
      {showCreate && <CreateGroupModal onCreate={createGroup} onClose={() => setShowCreate(false)} colors={GROUP_COLORS} />}
    </div>
  );
}

// ── Group detail ──────────────────────────────────────────────────────────────
function GroupDetail({ group, onUpdate, onDelete, onAddMember, onRemoveMember, avatars }) {
  const [newMember, setNewMember] = useState('');
  const [newAvatar, setNewAvatar] = useState(avatars[0]);
  const [showCode, setShowCode]   = useState(false);
  const code = generateCode(group);

  return (
    <div className="grp__detail">
      {/* Header */}
      <div className="grp__detail-header">
        <div className="grp__detail-avatar" style={{ background: group.color + '22', borderColor: group.color + '60' }}>
          {group.avatar}
        </div>
        <div className="grp__detail-info">
          <input
            className="grp__detail-name"
            value={group.name}
            onChange={e => onUpdate({ name: e.target.value })}
            style={{ color: group.color }}
          />
          <p className="grp__detail-sub">{group.members.length} חברים · נוצרה {new Date(group.createdAt).toLocaleDateString('he-IL')}</p>
        </div>
        <div className="grp__detail-actions">
          <button className="grp__share-btn" onClick={() => setShowCode(p => !p)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
            </svg>
            שתף קוד
          </button>
          <button className="grp__del-btn" onClick={onDelete}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Invite code */}
      {showCode && (
        <div className="grp__code-banner" style={{ background: group.color + '11', borderColor: group.color + '40' }}>
          <div>
            <p className="grp__code-label">קוד הזמנה לקבוצה</p>
            <p className="grp__code-val" style={{ color: group.color }}>{code}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(code); setShowCode(false); }}>העתק</button>
        </div>
      )}

      <div className="grp__detail-body">
        {/* Members */}
        <div className="grp__section">
          <h4 className="grp__section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            חברי הקבוצה
          </h4>

          <div className="grp__members">
            {group.members.length === 0 && <p className="grp__no-members">לא הוספת חברים עדיין</p>}
            {group.members.map(m => (
              <div key={m.id} className="grp__member">
                <span className="grp__member-av">{m.avatar}</span>
                <span className="grp__member-name">{m.name}</span>
                <button className="grp__member-del" onClick={() => onRemoveMember(m.id)}>✕</button>
              </div>
            ))}

            {/* Add member */}
            <div className="grp__add-member">
              <div className="grp__add-av-picker">
                {avatars.slice(0,6).map(av => (
                  <button key={av} className={`grp__av-btn ${newAvatar === av ? 'active' : ''}`} onClick={() => setNewAvatar(av)}>{av}</button>
                ))}
              </div>
              <input
                className="grp__add-input"
                placeholder="שם החבר..."
                value={newMember}
                onChange={e => setNewMember(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newMember.trim()) { onAddMember(newMember.trim(), newAvatar); setNewMember(''); } }}
              />
              <button
                className="grp__add-submit"
                style={{ background: group.color }}
                onClick={() => { if (newMember.trim()) { onAddMember(newMember.trim(), newAvatar); setNewMember(''); } }}
                disabled={!newMember.trim()}
              >+</button>
            </div>
          </div>
        </div>

        {/* Shared notes */}
        <div className="grp__section">
          <h4 className="grp__section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
            </svg>
            הערות משותפות
          </h4>
          <textarea
            className="grp__notes"
            style={{ '--bc': group.color }}
            value={group.notes || ''}
            onChange={e => onUpdate({ notes: e.target.value })}
            placeholder="כתוב הערות, מטרות, או כל דבר שהקבוצה צריכה לדעת..."
            rows={6}
          />
        </div>
      </div>
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateGroupModal({ onCreate, onClose, colors }) {
  const [name, setName]   = useState('');
  const [color, setColor] = useState(colors[0]);
  return (
    <div className="grp__modal-overlay" onClick={onClose}>
      <div className="grp__modal" onClick={e => e.stopPropagation()}>
        <h3>קבוצה חדשה</h3>
        <input autoFocus className="grp__modal-input" placeholder="שם הקבוצה..." value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && onCreate(name.trim(), color)} />
        <div className="grp__modal-colors">
          {colors.map(c => (
            <button key={c} className={`grp__modal-color ${color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setColor(c)} />
          ))}
        </div>
        <div className="grp__modal-actions">
          <button className="grp__modal-cancel" onClick={onClose}>ביטול</button>
          <button className="grp__modal-create" style={{ background: color }} onClick={() => name.trim() && onCreate(name.trim(), color)} disabled={!name.trim()}>צור קבוצה</button>
        </div>
      </div>
    </div>
  );
}
