import { useState, useRef, useEffect } from 'react';
import { getProjects, getProjectForItem, setItemProject, removeItemFromProjects } from '../utils/projectLinks';
import './ProjectPicker.css';

/**
 * itemId  – the task/event/page id
 * field   – 'taskIds' | 'eventIds' | 'pageIds'
 * onChange – optional callback after link changes
 */
export default function ProjectPicker({ itemId, field, onChange }) {
  const [projects]  = useState(getProjects);
  const [linked,  setLinked]  = useState(() => getProjectForItem(itemId, field));
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const link = (proj) => {
    setItemProject(itemId, field, proj.id);
    setLinked(proj);
    setOpen(false);
    onChange?.();
  };

  const unlink = (e) => {
    e.stopPropagation();
    removeItemFromProjects(itemId, field);
    setLinked(null);
    onChange?.();
  };

  return (
    <div className="pp-wrap" ref={ref}>
      <button className={`pp-btn${linked ? ' pp-btn--linked' : ''}`} onClick={() => setOpen(o => !o)}>
        {linked ? (
          <>
            <span className="pp-dot" style={{ background: linked.color }} />
            <span className="pp-name">{linked.icon} {linked.name}</span>
            <span className="pp-unlink" onMouseDown={unlink}>✕</span>
          </>
        ) : (
          <>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
            קשר לפרויקט
          </>
        )}
      </button>

      {open && (
        <div className="pp-dropdown">
          {projects.length === 0 && <p className="pp-empty">אין פרויקטים</p>}
          {projects.map(p => (
            <button key={p.id} className={`pp-option${linked?.id===p.id?' active':''}`} onClick={() => link(p)}>
              <span className="pp-dot" style={{ background: p.color }} />
              {p.icon} {p.name}
              {linked?.id===p.id && <span className="pp-check">✓</span>}
            </button>
          ))}
          {linked && (
            <>
              <div className="pp-sep" />
              <button className="pp-option pp-option--remove" onClick={e => { unlink(e); setOpen(false); }}>
                הסר קישור
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
