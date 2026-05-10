import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Planning.css';

const STORAGE_KEY = 'mynotion_planning_v3';
const DOT_COLORS  = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16'];
const CIRCLE_R    = 38; // radius px at scale=1

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function save(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }

function makeCircle() {
  return {
    id: uuidv4(),
    title: 'דף חדש',
    content: '',
    color: DOT_COLORS[Math.floor(Math.random() * DOT_COLORS.length)],
    x: (Math.random() - 0.5) * 600,
    y: (Math.random() - 0.5) * 400,
    r: CIRCLE_R,
  };
}

export default function Planning() {
  const [circles, setCircles] = useState(load);
  const [vp, setVp]           = useState({ x: 0, y: 0, s: 1 });
  const [opening, setOpening] = useState(null); // circle being edited
  const drag      = useRef(null);
  const vpRef     = useRef(vp); vpRef.current = vp;
  const circlesRef = useRef(circles); circlesRef.current = circles;
  const boardRef  = useRef(null);

  useEffect(() => { save(circles); }, [circles]);

  const toCanvas = useCallback((sx, sy) => {
    const r = boardRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const { x, y, s } = vpRef.current;
    return { x: (sx - r.left - x) / s, y: (sy - r.top - y) / s };
  }, []);

  const addCircle = () => {
    const c = makeCircle();
    // Place at center of current view
    const r = boardRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
    const { x, y, s } = vpRef.current;
    c.x = (r.width / 2 - x) / s;
    c.y = (r.height / 2 - y) / s;
    setCircles(p => [...p, c]);
  };

  const update = (id, ch) => setCircles(p => p.map(c => c.id === id ? { ...c, ...ch } : c));
  const remove = (id)  => { setCircles(p => p.filter(c => c.id !== id)); if (opening?.id === id) setOpening(null); };

  // ── Mouse events ──
  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    // Check if on a circle
    const cp = toCanvas(e.clientX, e.clientY);
    const hit = circlesRef.current.find(c => Math.hypot(cp.x - c.x, cp.y - c.y) < c.r);
    if (hit) {
      e.stopPropagation();
      drag.current = { type: 'circle', id: hit.id, startX: e.clientX, startY: e.clientY, origX: hit.x, origY: hit.y, moved: false };
    } else {
      drag.current = { type: 'pan', startX: e.clientX, startY: e.clientY, tx: vpRef.current.x, ty: vpRef.current.y };
    }
  }, [toCanvas]);

  const onMouseMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'pan') {
      setVp(v => ({ ...v, x: d.tx + (e.clientX - d.startX), y: d.ty + (e.clientY - d.startY) }));
    } else if (d.type === 'circle') {
      const { s } = vpRef.current;
      const dx = (e.clientX - d.startX) / s;
      const dy = (e.clientY - d.startY) / s;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) d.moved = true;
      if (d.moved) {
        setCircles(p => p.map(c => c.id === d.id ? { ...c, x: d.origX + dx, y: d.origY + dy } : c));
      }
    }
  }, []);

  const onMouseUp = useCallback((e) => {
    const d = drag.current;
    drag.current = null;
    // Single click on circle → select / focus (no action for now)
    // Double click is handled separately
    if (d?.type === 'circle' && !d.moved) {
      // single click = nothing extra needed
    }
  }, []);

  const onDblClick = useCallback((e) => {
    const cp = toCanvas(e.clientX, e.clientY);
    const hit = circlesRef.current.find(c => Math.hypot(cp.x - c.x, cp.y - c.y) < c.r);
    if (hit) setOpening(hit);
  }, [toCanvas]);

  // Wheel: zoom with ctrl, pan otherwise
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const fn = (e) => {
      e.preventDefault();
      const r   = el.getBoundingClientRect();
      const mx  = e.clientX - r.left;
      const my  = e.clientY - r.top;
      const raw = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      const delta = Math.sign(raw) * Math.min(Math.abs(raw), 80);
      const f   = 1 - delta * 0.003;
      setVp(v => {
        const ns = Math.min(Math.max(v.s * f, 0.08), 6);
        return { s: ns, x: mx - (mx - v.x) * (ns / v.s), y: my - (my - v.y) * (ns / v.s) };
      });
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  const editingCircle = opening ? circles.find(c => c.id === opening.id) || opening : null;

  return (
    <div
      className="pln-board"
      ref={boardRef}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onDoubleClick={onDblClick}
    >
      {/* Subtle dot grid */}
      <div
        className="pln-grid"
        style={{
          backgroundSize:     `${24 * vp.s}px ${24 * vp.s}px`,
          backgroundPosition: `${vp.x % (24 * vp.s)}px ${vp.y % (24 * vp.s)}px`,
        }}
      />

      {/* World */}
      <div
        className="pln-world"
        style={{ transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.s})`, transformOrigin: '0 0' }}
      >
        {circles.map(c => (
          <Circle key={c.id} circle={c} scale={vp.s} />
        ))}
      </div>

      {/* Empty hint */}
      {circles.length === 0 && (
        <div className="pln-empty">
          <p>לחץ <strong>+</strong> ליצירת דף חדש</p>
          <p className="pln-empty-sub">גרור להזזה · גלגלת לזום · לחץ פעמיים לפתיחה</p>
        </div>
      )}

      {/* Controls */}
      <div className="pln-controls">
        <button className="pln-ctrl-add" onClick={addCircle} title="דף חדש">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <div className="pln-zoom-btns">
          <button onClick={() => setVp(v => ({ ...v, s: Math.min(v.s * 1.3, 6) }))}>+</button>
          <span>{Math.round(vp.s * 100)}%</span>
          <button onClick={() => setVp(v => ({ ...v, s: Math.max(v.s / 1.3, 0.08) }))}>−</button>
          <button onClick={() => setVp({ x: 0, y: 0, s: 1 })} title="מרכז">⌂</button>
        </div>
      </div>

      {/* Page editor overlay */}
      {editingCircle && (
        <PageOverlay
          circle={editingCircle}
          onUpdate={ch => update(editingCircle.id, ch)}
          onDelete={() => remove(editingCircle.id)}
          onClose={() => setOpening(null)}
        />
      )}
    </div>
  );
}

// ── Circle ────────────────────────────────────────────────────────────────────
function Circle({ circle, scale }) {
  const sz = circle.r * 2;
  const fontSize = Math.max(8, Math.min(13, circle.r * 0.32));
  return (
    <div
      className="pln-circle"
      style={{
        left: circle.x - circle.r,
        top:  circle.y - circle.r,
        width:  sz,
        height: sz,
        background: circle.color,
        boxShadow: `0 0 ${circle.r * 0.6}px ${circle.color}55, 0 4px 12px rgba(0,0,0,0.4)`,
      }}
      title="לחץ פעמיים לפתיחה"
    >
      <span className="pln-circle__label" style={{ fontSize }}>
        {circle.title}
      </span>
      {circle.content && <span className="pln-circle__dot" />}
    </div>
  );
}

// ── Page overlay ──────────────────────────────────────────────────────────────
function PageOverlay({ circle, onUpdate, onDelete, onClose }) {
  const taRef = useRef(null);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.max(el.scrollHeight, 300) + 'px';
  }, [circle.content]);

  return (
    <div className="pln-overlay" onClick={onClose}>
      <div
        className="pln-page"
        style={{ '--pc': circle.color }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="pln-page__head">
          <div className="pln-page__icon" style={{ background: circle.color }} />
          <input
            className="pln-page__title"
            value={circle.title}
            onChange={e => onUpdate({ title: e.target.value })}
            autoFocus
            placeholder="שם הדף..."
          />
          <div className="pln-page__actions">
            {/* Color picker */}
            <div className="pln-page__colors">
              {DOT_COLORS.map(c => (
                <button
                  key={c}
                  className={`pln-page__color ${circle.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => onUpdate({ color: c })}
                />
              ))}
            </div>
            <button className="pln-page__del" onClick={onDelete}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
            <button className="pln-page__close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Size */}
        <div className="pln-page__size-row">
          <label>גודל עיגול</label>
          <input type="range" min={20} max={80} value={circle.r}
            onChange={e => onUpdate({ r: +e.target.value })}
            style={{ accentColor: circle.color }} />
          <span>{circle.r * 2}px</span>
        </div>

        {/* Content */}
        <textarea
          ref={taRef}
          className="pln-page__content"
          value={circle.content}
          onChange={e => onUpdate({ content: e.target.value })}
          placeholder={`כתוב כאן...

# כותרת
- נקודה
**מודגש**`}
        />
      </div>
    </div>
  );
}
