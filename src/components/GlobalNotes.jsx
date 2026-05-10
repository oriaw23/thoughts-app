import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './GlobalNotes.css';

const KEY = 'mynotion_global_notes';
const COLORS = [
  '#fff9c4','#fce7f3','#dbeafe','#d1fae5',
  '#ede9fe','#ffedd5','#fef3c7','#f0fdf4',
  '#fdf4ff','#ecfeff','#fff1f2','#f0f9ff',
];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch { return []; }
}
function persist(cards) { localStorage.setItem(KEY, JSON.stringify(cards)); }

export default function GlobalNotes({ open, onClose }) {
  const [cards, setCards] = useState(load);
  const panelRef = useRef(null);

  const save = useCallback((next) => { setCards(next); persist(next); }, []);

  const addCard = () =>
    save([...cards, { id: uuidv4(), text: '', color: COLORS[cards.length % COLORS.length] }]);

  const update = (id, ch) =>
    save(cards.map(c => c.id === id ? { ...c, ...ch } : c));

  const remove = (id) => save(cards.filter(c => c.id !== id));

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        const tab = document.querySelector('.app__notes-tab');
        if (tab && tab.contains(e.target)) return;
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  const onDragStart = (e, card) => {
    e.dataTransfer.setData('notion-card', JSON.stringify({ text: card.text, color: card.color }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div
      ref={panelRef}
      className={`gn${open ? ' gn--open' : ''}`}
    >
      {/* Header */}
      <div className="gn__head">
        <span className="gn__title">📌 הכרטיסים שלי</span>
        <button className="gn__add" onClick={addCard} title="כרטיס חדש">+</button>
        <button className="gn__close" onClick={onClose}>✕</button>
      </div>

      {/* Cards */}
      <div className="gn__cards">
        {cards.length === 0 ? (
          <div className="gn__empty">
            <span>📌</span>
            <p>אין כרטיסים עדיין</p>
            <p className="gn__empty-sub">כרטיסים זמינים בכל עמוד</p>
            <button onClick={addCard}>+ כרטיס ראשון</button>
          </div>
        ) : (
          <>
            {cards.map(card => (
              <div
                key={card.id}
                className="gn__card"
                style={{ background: card.color }}
                draggable
                onDragStart={e => onDragStart(e, card)}
              >
                {/* Drag handle */}
                <div className="gn__card-handle" title="גרור לקאנבס">
                  <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" opacity=".35">
                    <circle cx="2.5" cy="2"  r="1.4"/><circle cx="7.5" cy="2"  r="1.4"/>
                    <circle cx="2.5" cy="6"  r="1.4"/><circle cx="7.5" cy="6"  r="1.4"/>
                    <circle cx="2.5" cy="10" r="1.4"/><circle cx="7.5" cy="10" r="1.4"/>
                  </svg>
                  גרור לקאנבס
                </div>

                {/* Text */}
                <textarea
                  className="gn__card-text"
                  value={card.text}
                  placeholder="כתוב כאן..."
                  onChange={e => update(card.id, { text: e.target.value })}
                  onMouseDown={e => e.stopPropagation()}
                />

                {/* Footer */}
                <div className="gn__card-foot">
                  <div className="gn__palette">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        className={`gn__dot${card.color === c ? ' active' : ''}`}
                        style={{ background: c }}
                        onClick={() => update(card.id, { color: c })}
                      />
                    ))}
                  </div>
                  <button className="gn__del" onClick={() => remove(card.id)}>🗑</button>
                </div>
              </div>
            ))}

            <button className="gn__add-more" onClick={addCard}>+ כרטיס חדש</button>
          </>
        )}
      </div>
    </div>
  );
}
