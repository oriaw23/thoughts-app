import { useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './CanvasShapesPanel.css';

const MEDIA_KEY = 'thoughts_media_v1';
function loadMedia() {
  try { const d = JSON.parse(localStorage.getItem(MEDIA_KEY)||'{}'); return { links: d.links||[], images: d.images||[] }; }
  catch { return { links:[], images:[] }; }
}

const SHAPES = [
  { id: 'rect',      label: 'Rectangle',
    preview: <svg viewBox="0 0 52 34" fill="none"><rect x="2" y="2" width="48" height="30" rx="6" fill="#dbeafe" stroke="#93c5fd" strokeWidth="1.5"/></svg> },
  { id: 'note',      label: 'Note',
    preview: <svg viewBox="0 0 44 44" fill="none"><rect x="2" y="8" width="40" height="34" rx="3" fill="#fef08a" stroke="#fbbf24" strokeWidth="1.5"/><rect x="2" y="2" width="14" height="10" rx="3" fill="#fde68a" stroke="#fbbf24" strokeWidth="1.5"/></svg> },
  { id: 'card',      label: 'Card',
    preview: <svg viewBox="0 0 52 40" fill="none"><rect x="2" y="2" width="48" height="36" rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/><rect x="10" y="12" width="22" height="3" rx="1.5" fill="#94a3b8"/><rect x="10" y="20" width="32" height="2" rx="1" fill="#e2e8f0"/><rect x="10" y="27" width="24" height="2" rx="1" fill="#e2e8f0"/></svg> },
  { id: 'oval',      label: 'Oval',
    preview: <svg viewBox="0 0 52 38" fill="none"><ellipse cx="26" cy="19" rx="24" ry="16" fill="#d1fae5" stroke="#6ee7b7" strokeWidth="1.5"/></svg> },
  { id: 'diamond',   label: 'Diamond',
    preview: <svg viewBox="0 0 52 44" fill="none"><polygon points="26,2 50,22 26,42 2,22" fill="#fce7f3" stroke="#f9a8d4" strokeWidth="1.5"/></svg> },
  { id: 'text',      label: 'Text',
    preview: <svg viewBox="0 0 52 38" fill="none"><text x="6" y="28" fontSize="26" fontWeight="800" fill="#1e293b" fontFamily="Inter,sans-serif">Aa</text></svg> },
  { id: 'heading',   label: 'Heading',
    preview: <svg viewBox="0 0 52 34" fill="none"><text x="4" y="26" fontSize="22" fontWeight="900" fill="#0f172a" fontFamily="Inter,sans-serif">H1</text></svg> },
  { id: 'checklist', label: 'Checklist',
    preview: <svg viewBox="0 0 52 40" fill="none"><rect x="2" y="2" width="48" height="36" rx="6" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1.5"/><rect x="8" y="11" width="8" height="8" rx="2" fill="#86efac"/><rect x="22" y="13" width="22" height="4" rx="2" fill="#d1fae5"/><rect x="8" y="25" width="8" height="8" rx="2" fill="#e2e8f0"/><rect x="22" y="27" width="16" height="4" rx="2" fill="#e2e8f0"/></svg> },
  { id: 'image',     label: 'Image',
    preview: <svg viewBox="0 0 52 40" fill="none"><rect x="2" y="2" width="48" height="36" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.5"/><circle cx="17" cy="16" r="5" fill="#cbd5e1"/><polygon points="8,34 22,18 32,26 40,16 50,34" fill="#e2e8f0"/></svg> },
  { id: 'link',      label: 'Link',
    preview: <svg viewBox="0 0 52 34" fill="none"><rect x="2" y="2" width="48" height="30" rx="6" fill="#f0f9ff" stroke="#bae6fd" strokeWidth="1.5"/><text x="8" y="22" fontSize="16">🔗</text><rect x="26" y="12" width="18" height="4" rx="2" fill="#93c5fd"/><rect x="26" y="21" width="14" height="3" rx="1.5" fill="#bae6fd"/></svg> },
  { id: 'code',      label: 'Code',
    preview: <svg viewBox="0 0 52 40" fill="none"><rect x="2" y="2" width="48" height="36" rx="6" fill="#1e293b"/><circle cx="10" cy="11" r="3" fill="#ef4444"/><circle cx="19" cy="11" r="3" fill="#f59e0b"/><circle cx="28" cy="11" r="3" fill="#10b981"/><rect x="8" y="20" width="24" height="3" rx="1.5" fill="#334155"/><rect x="8" y="28" width="16" height="3" rx="1.5" fill="#1e40af" opacity=".7"/></svg> },
  { id: 'section',   label: 'Section',
    preview: <svg viewBox="0 0 52 40" fill="none"><rect x="2" y="2" width="48" height="36" rx="6" fill="rgba(99,102,241,0.05)" stroke="#a5b4fc" strokeWidth="1.5" strokeDasharray="4 3"/><rect x="8" y="8" width="20" height="6" rx="3" fill="#a5b4fc"/></svg> },
];

const TEMPLATES = [
  {
    id: 'brainstorm', name: 'Brainstorm', icon: '🧠', color: '#8b5cf6', desc: 'Ideas around a central topic',
    nodes: [
      { type: 'oval',  x: 265, y: 170, w: 190, h: 90,  color: '#ddd6fe', text: 'Main Topic' },
      { type: 'note',  x:  30, y:  20, w: 170, h: 110, color: '#fef08a', text: 'Idea A' },
      { type: 'note',  x: 520, y:  20, w: 170, h: 110, color: '#fef08a', text: 'Idea B' },
      { type: 'note',  x:  30, y: 300, w: 170, h: 110, color: '#bfdbfe', text: 'Idea C' },
      { type: 'note',  x: 520, y: 300, w: 170, h: 110, color: '#bfdbfe', text: 'Idea D' },
    ],
    edges: [[0,'w',1,'e'],[0,'e',2,'w'],[0,'w',3,'e'],[0,'e',4,'w']],
  },
  {
    id: 'kanban', name: 'Kanban', icon: '📋', color: '#3b82f6', desc: '3 columns for task management',
    nodes: [
      { type: 'rect', x:   0, y:  0, w: 190, h: 50, color: '#dbeafe', text: '📥 To Do' },
      { type: 'rect', x: 210, y:  0, w: 190, h: 50, color: '#fef9c3', text: '⚡ In Progress' },
      { type: 'rect', x: 420, y:  0, w: 190, h: 50, color: '#d1fae5', text: '✅ Done' },
      { type: 'card', x:   0, y: 70, w: 185, h: 90, color: '#fff', text: 'Task 1', body: '' },
      { type: 'card', x: 210, y: 70, w: 185, h: 90, color: '#fff', text: 'Task 2', body: '' },
      { type: 'card', x: 420, y: 70, w: 185, h: 90, color: '#fff', text: 'Task 3', body: '' },
    ],
    edges: [],
  },
  {
    id: 'swot', name: 'SWOT', icon: '⚡', color: '#f59e0b', desc: 'Strengths / Weaknesses / Opportunities / Threats',
    nodes: [
      { type: 'rect', x:   0, y:   0, w: 230, h: 170, color: '#d1fae5', text: '💪 Strengths' },
      { type: 'rect', x: 250, y:   0, w: 230, h: 170, color: '#fee2e2', text: '⚠️ Weaknesses' },
      { type: 'rect', x:   0, y: 190, w: 230, h: 170, color: '#dbeafe', text: '🎯 Opportunities' },
      { type: 'rect', x: 250, y: 190, w: 230, h: 170, color: '#fef3c7', text: '🔥 Threats' },
    ],
    edges: [],
  },
  {
    id: 'roadmap', name: 'Roadmap', icon: '🗺️', color: '#10b981', desc: '3 stages with timeline',
    nodes: [
      { type: 'diamond', x:  40, y:  50, w: 150, h: 110, color: '#d1fae5', text: 'Phase 1' },
      { type: 'diamond', x: 270, y:  50, w: 150, h: 110, color: '#bfdbfe', text: 'Phase 2' },
      { type: 'diamond', x: 500, y:  50, w: 150, h: 110, color: '#ddd6fe', text: 'Phase 3' },
      { type: 'note', x:  40, y: 190, w: 148, h: 80, color: '#fef08a', text: 'Phase 1 tasks' },
      { type: 'note', x: 270, y: 190, w: 148, h: 80, color: '#fef08a', text: 'Phase 2 tasks' },
      { type: 'note', x: 500, y: 190, w: 148, h: 80, color: '#fef08a', text: 'Phase 3 tasks' },
    ],
    edges: [[0,'e',1,'w'],[1,'e',2,'w'],[0,'s',3,'n'],[1,'s',4,'n'],[2,'s',5,'n']],
  },
  {
    id: 'mindmap', name: 'Mind Map', icon: '🔮', color: '#6366f1', desc: 'Hierarchical idea tree',
    nodes: [
      { type: 'oval', x: 295, y: 190, w: 170, h: 85, color: '#ddd6fe', text: '💡 Central Idea' },
      { type: 'rect', x:  30, y:  70, w: 170, h: 65, color: '#bfdbfe', text: 'Branch A' },
      { type: 'rect', x: 560, y:  70, w: 170, h: 65, color: '#fce7f3', text: 'Branch B' },
      { type: 'rect', x:  30, y: 320, w: 170, h: 65, color: '#d1fae5', text: 'Branch C' },
      { type: 'rect', x: 560, y: 320, w: 170, h: 65, color: '#fef3c7', text: 'Branch D' },
    ],
    edges: [[0,'w',1,'e'],[0,'e',2,'w'],[0,'w',3,'e'],[0,'e',4,'w']],
  },
  {
    id: 'whiteboard', name: 'Whiteboard', icon: '⬜', color: '#64748b', desc: 'Clean empty canvas — start from scratch',
    nodes: [], edges: [], whiteboard: true,
  },
  {
    id: 'retro', name: 'Retrospective', icon: '🔄', color: '#ec4899', desc: 'What worked / didn\'t / to improve',
    nodes: [
      { type: 'rect', x:   0, y:  0, w: 210, h: 50, color: '#d1fae5', text: '✅ What Worked?' },
      { type: 'rect', x: 230, y:  0, w: 210, h: 50, color: '#fee2e2', text: '❌ What Didn\'t?' },
      { type: 'rect', x: 460, y:  0, w: 210, h: 50, color: '#dbeafe', text: '💡 What to Improve?' },
      { type: 'note', x:   0, y: 70, w: 205, h: 100, color: '#fff', text: '' },
      { type: 'note', x: 230, y: 70, w: 205, h: 100, color: '#fff', text: '' },
      { type: 'note', x: 460, y: 70, w: 205, h: 100, color: '#fff', text: '' },
    ],
    edges: [],
  },
];

const SHAPES_WITH_BIGCARD = [
  ...SHAPES.slice(0, 2), // note, card first
  { id: 'big-card', label: 'Big Card',
    preview: <svg viewBox="0 0 52 52" fill="none"><rect x="2" y="2" width="48" height="48" rx="10" fill="white" stroke="#e2e8f0" strokeWidth="1.5"/><text x="26" y="32" fontSize="20" fontWeight="900" fill="#0f172a" fontFamily="Inter,sans-serif" textAnchor="middle">Aa</text></svg> },
  ...SHAPES.slice(2),
];

export default function CanvasShapesPanel({ onAddNode, onAddTemplate, onWhiteboard }) {
  const [open, setOpen] = useState(false);
  const [tab,  setTab]  = useState('shapes');
  const [media, setMedia] = useState({ links:[], images:[] });
  const closeTimer = useRef(null);

  const openPanel  = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const closePanel = () => { closeTimer.current = setTimeout(() => setOpen(false), 320); };

  const handleTabChange = (t) => {
    setTab(t);
    if (t === 'media') setMedia(loadMedia());
  };

  const handleTemplate = (tmpl) => {
    if (tmpl.whiteboard) {
      onWhiteboard?.();
      setOpen(false);
      return;
    }
    const ids   = tmpl.nodes.map(() => uuidv4());
    const nodes = tmpl.nodes.map((n, i) => ({
      ...n, id: ids[i],
      body: n.body !== undefined ? n.body : (['card','note'].includes(n.type) ? '' : undefined),
    }));
    const edges = tmpl.edges.map(([fi, fp, ti, tp]) => ({
      id: uuidv4(), from: ids[fi], fromPort: fp, to: ids[ti], toPort: tp, color: '#94a3b8',
    }));
    onAddTemplate({ nodes, edges });
    setOpen(false);
  };

  return (
    <div className={`csp ${open ? 'csp--open' : ''}`}
      onMouseEnter={openPanel}
      onMouseLeave={closePanel}>
      <div className="csp__body">
        {/* Tabs */}
        <div className="csp__tabs">
          <button className={`csp__tab${tab==='shapes'?' active':''}`} onClick={() => handleTabChange('shapes')}>Shapes</button>
          <button className={`csp__tab${tab==='templates'?' active':''}`} onClick={() => handleTabChange('templates')}>Templates</button>
          <button className={`csp__tab${tab==='media'?' active':''}`} onClick={() => handleTabChange('media')}>Media</button>
        </div>

        {/* Shapes */}
        {tab === 'shapes' && (
          <div className="csp__shapes">
            {/* Sticky notes shortcut — top of list */}
            <button className="csp__notes-btn"
              onClick={() => { window.dispatchEvent(new CustomEvent('toggle-global-notes')); setOpen(false); }}>
              📌 Open Sticky Notes
            </button>
            {SHAPES_WITH_BIGCARD.map(s => (
              <button key={s.id} className="csp__shape-btn" onClick={() => { onAddNode(s.id); setOpen(false); }}>
                <div className="csp__shape-preview">{s.preview}</div>
                <span className="csp__shape-label">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Templates */}
        {tab === 'templates' && (
          <div className="csp__templates">
            {TEMPLATES.map(t => (
              <button key={t.id} className="csp__tmpl-btn" onClick={() => handleTemplate(t)}>
                <div className="csp__tmpl-icon" style={{ background:t.color+'18', color:t.color }}>{t.icon}</div>
                <div className="csp__tmpl-info">
                  <span className="csp__tmpl-name">{t.name}</span>
                  <span className="csp__tmpl-desc">{t.desc}</span>
                </div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color:'#cbd5e1',flexShrink:0}}><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            ))}
          </div>
        )}

        {/* Media */}
        {tab === 'media' && (
          <div className="csp__media">
            {media.links.length === 0 && media.images.length === 0 && (
              <div className="csp__media-empty">
                <span>📎</span>
                <p>No media yet</p>
                <small>Add links and images in the Pages → Media panel</small>
              </div>
            )}

            {media.links.length > 0 && (
              <>
                <div className="csp__media-sec">🔗 Links</div>
                {media.links.map(link => (
                  <button key={link.id} className="csp__media-item"
                    onClick={() => { onAddNode('link', { text: link.title||link.url, url: link.url, body: link.desc||'' }); setOpen(false); }}>
                    <span className="csp__media-icon">🔗</span>
                    <div className="csp__media-info">
                      <span className="csp__media-name">{link.title || link.url}</span>
                      {link.cat && <span className="csp__media-cat">{link.cat}</span>}
                    </div>
                  </button>
                ))}
              </>
            )}

            {media.images.length > 0 && (
              <>
                <div className="csp__media-sec">🖼️ Images</div>
                {media.images.map(img => (
                  <button key={img.id} className="csp__media-item"
                    onClick={() => { onAddNode('image', { text: img.title||'', url: img.url, body: img.desc||'' }); setOpen(false); }}>
                    {img.url && img.url.startsWith('data:') || img.url?.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)
                      ? <img src={img.url} alt={img.title||''} className="csp__media-thumb"
                          onError={e => { e.target.style.display='none'; }}/>
                      : <span className="csp__media-icon">🖼️</span>
                    }
                    <span className="csp__media-name">{img.title || 'Image'}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Handle */}
      <button className="csp__handle" onClick={() => setOpen(p => !p)} title={open ? 'Close' : 'Shapes & Templates'}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          {open
            ? <polyline points="15 18 9 12 15 6"/>
            : <><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></>
          }
        </svg>
      </button>
    </div>
  );
}
