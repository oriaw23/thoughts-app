import { useState } from 'react';
import './Trash.css';

const KEY = 'mynotion_trash';

function load() { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } }
function persist(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

// Call this from other components to send items to trash
export function sendToTrash(type, item) {
  const trash = load();
  const entry = { id: item.id, type, data: item, deletedAt: new Date().toISOString() };
  const next = [entry, ...trash].slice(0, 100); // keep last 100
  persist(next);
}

const TYPE_LABELS = { page:'דף', task:'משימה', event:'אירוע', note:'פתק', goal:'מטרה' };
const TYPE_ICONS  = { page:'📄', task:'✅', event:'📅', note:'📝', goal:'🎯' };

export default function Trash() {
  const [items, setItems] = useState(load);
  const [selected, setSelected] = useState(new Set());

  const toggle = (id) => setSelected(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const remove = (ids) => {
    const next = items.filter(it => !ids.has(it.id));
    setItems(next); persist(next);
    setSelected(new Set());
  };

  const clearAll = () => { setItems([]); persist([]); setSelected(new Set()); };

  const daysAgo = (iso) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    return d === 0 ? 'היום' : `לפני ${d} ימים`;
  };

  return (
    <div className="trash">
      <div className="trash__head">
        <div>
          <h1 className="trash__title">🗑️ אשפה</h1>
          <p className="trash__sub">פריטים נמחקים לצמיתות אחרי 30 יום</p>
        </div>
        {items.length > 0 && (
          <div style={{ display:'flex', gap:8 }}>
            {selected.size > 0 && (
              <button className="trash__del-btn" onClick={() => remove(selected)}>
                מחק לצמיתות ({selected.size})
              </button>
            )}
            <button className="trash__clear-btn" onClick={clearAll}>רוקן אשפה</button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="trash__empty">
          <span>🗑️</span>
          <h3>האשפה ריקה</h3>
          <p>פריטים שנמחקו יופיעו כאן</p>
        </div>
      ) : (
        <div className="trash__list">
          {items.map(it => (
            <div key={it.id} className={`trash__item${selected.has(it.id)?' selected':''}`}
              onClick={() => toggle(it.id)}>
              <div className="trash__item-check">
                {selected.has(it.id) && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span className="trash__item-icon">{TYPE_ICONS[it.type] || '📦'}</span>
              <div className="trash__item-body">
                <span className="trash__item-name">{it.data?.title || it.data?.name || 'ללא שם'}</span>
                <span className="trash__item-meta">
                  {TYPE_LABELS[it.type] || it.type} · {daysAgo(it.deletedAt)}
                </span>
              </div>
              <button className="trash__item-del" onClick={e => { e.stopPropagation(); remove(new Set([it.id])); }}>
                מחק לצמיתות
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
