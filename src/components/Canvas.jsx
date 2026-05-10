import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import CanvasShapesPanel from './CanvasShapesPanel';
import './Canvas.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'mynotion_canvases_v2';
const DOT_SIZE    = 22;

const NODE_TYPES = [
  { id: 'note',      label: 'פתק',    icon: '📝', defaultColor: '#fef08a',               w: 200, h: 150 },
  { id: 'card',      label: 'כרטיס',  icon: '📋', defaultColor: '#ffffff',               w: 220, h: 160 },
  { id: 'big-card',  label: 'Big Card',icon: '📌', defaultColor: '#ffffff',               w: 240, h: 180 },
  { id: 'rect',      label: 'מלבן',   icon: '▭',  defaultColor: '#dbeafe',               w: 200, h: 110 },
  { id: 'oval',      label: 'עיגול',  icon: '◯',  defaultColor: '#d1fae5',               w: 140, h: 140 },
  { id: 'diamond',   label: 'מעוין',  icon: '◇',  defaultColor: '#fce7f3',               w: 160, h: 120 },
  { id: 'text',      label: 'טקסט',   icon: 'Aa', defaultColor: 'transparent',           w: 180, h: 52  },
  { id: 'heading',   label: 'כותרת',  icon: 'H',  defaultColor: 'transparent',           w: 320, h: 58  },
  { id: 'checklist', label: 'רשימה',  icon: '☑',  defaultColor: '#f0fdf4',               w: 230, h: 130 },
  { id: 'image',     label: 'תמונה',  icon: '🖼',  defaultColor: '#f8fafc',               w: 260, h: 190 },
  { id: 'link',      label: 'קישור',  icon: '🔗', defaultColor: '#f0f9ff',               w: 260, h: 80  },
  { id: 'code',      label: 'קוד',    icon: '</>', defaultColor: '#1e293b',               w: 280, h: 160 },
  { id: 'section',   label: 'אזור',   icon: '⬜',  defaultColor: 'rgba(99,102,241,0.05)',w: 380, h: 280 },
];

const PALETTE       = ['#fef08a','#fecdd3','#bfdbfe','#bbf7d0','#ddd6fe','#fed7aa','#e0e7ff','#ffffff'];
const CANVAS_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#3b82f6','#ec4899','#0891b2'];
const CANVAS_ICONS  = ['🎨','💡','🚀','📋','🗂️','⚡','🎯','🌟','🏗️','🔮','🧩','📐'];

const PORTS = {
  n: { rx: 0.5, ry: 0,   dx:  0, dy: -1 },
  e: { rx: 1,   ry: 0.5, dx:  1, dy:  0 },
  s: { rx: 0.5, ry: 1,   dx:  0, dy:  1 },
  w: { rx: 0,   ry: 0.5, dx: -1, dy:  0 },
};

const portPos = (node, p) => ({
  x: node.x + node.w * PORTS[p].rx,
  y: node.y + node.h * PORTS[p].ry,
});

const makeBezier = (fp, fport, tp, tport) => {
  const dist = Math.min(Math.max(Math.hypot(tp.x - fp.x, tp.y - fp.y) * 0.45, 60), 220);
  const fd = PORTS[fport], td = PORTS[tport];
  return `M ${fp.x} ${fp.y} C ${fp.x + fd.dx * dist} ${fp.y + fd.dy * dist}, ${tp.x + td.dx * dist} ${tp.y + td.dy * dist}, ${tp.x} ${tp.y}`;
};

// ── Data ──────────────────────────────────────────────────────────────────────
function makeCanvas(name = 'הלוח הראשי', icon = '🎨', color = '#6366f1') {
  return { id: uuidv4(), name, icon, color, createdAt: new Date().toISOString() };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) { const s = JSON.parse(raw); if (s.list?.length) return s; }
  } catch {}
  const f = makeCanvas();
  return { activeId: f.id, list: [f], data: { [f.id]: { nodes: [], edges: [] } } };
}

// ── CanvasView ────────────────────────────────────────────────────────────────
export default function CanvasView() {
  const [state, setState] = useState(loadState);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);

  // Listen for topic switches / deletes from the Sidebar
  useEffect(() => {
    const handler = () => setState(loadState());
    window.addEventListener('canvas:switch', handler);
    window.addEventListener('canvas:reload', handler);
    return () => {
      window.removeEventListener('canvas:switch', handler);
      window.removeEventListener('canvas:reload', handler);
    };
  }, []);

  const active     = state.list.find(c => c.id === state.activeId);
  const activeData = state.data[state.activeId] || { nodes: [], edges: [] };

  const handleChange = useCallback((nodes, edges) => {
    setState(s => ({ ...s, data: { ...s.data, [s.activeId]: { nodes, edges } } }));
  }, []);

  const deleteCanvas = (id) => {
    if (state.list.length <= 1) return;
    const newList = state.list.filter(c => c.id !== id);
    const newActiveId = id === state.activeId ? newList[0].id : state.activeId;
    const newData = { ...state.data };
    delete newData[id];
    setState(s => ({ ...s, list: newList, activeId: newActiveId, data: newData }));
  };

  const addNewCanvas = () => {
    const c = makeCanvas('New Canvas ' + (state.list.length + 1));
    setState(s => ({
      ...s, list: [...s.list, c], activeId: c.id,
      data: { ...s.data, [c.id]: { nodes: [], edges: [] } },
    }));
  };

  if (!active) return null;

  return (
    <div className="cv-view">
      <CanvasEditor
        key={state.activeId}
        canvas={active}
        initialNodes={activeData.nodes}
        initialEdges={activeData.edges}
        onChange={handleChange}
      />
    </div>
  );
}

// ── CanvasEditor ──────────────────────────────────────────────────────────────
function CanvasEditor({ canvas, initialNodes, initialEdges, onChange }) {
  const [nodes, setNodes]           = useState(initialNodes);
  const [edges, setEdges]           = useState(initialEdges);
  const [vp, setVp]                 = useState({ x: 0, y: 0, s: 1 });
  const [showPicker, setShowPicker] = useState(false);
  const [darkBg, setDarkBg]         = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set()); // multi-select node IDs
  const [selectedEdgeId, setSelectedEdgeId] = useState(null);
  const [hovered, setHovered]       = useState(null);
  const [editing, setEditing]       = useState(null);
  const [tempLine, setTempLine]     = useState(null);
  const [marquee, setMarquee]       = useState(null); // { x1,y1,x2,y2 } canvas coords

  const drag         = useRef(null);
  const vpRef        = useRef(vp);  vpRef.current = vp;
  const nodesRef     = useRef(nodes); nodesRef.current = nodes;
  const containerRef = useRef(null);
  const mounted      = useRef(false);

  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    onChange(nodes, edges);
  }, [nodes, edges]);

  const toCanvas = useCallback((sx, sy) => {
    const r = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const { x, y, s } = vpRef.current;
    return { x: (sx - r.left - x) / s, y: (sy - r.top - y) / s };
  }, []);

  const snapPort = useCallback((cx, cy, excludeId) => {
    let best = null, bestD = 22 / vpRef.current.s;
    for (const n of nodesRef.current) {
      if (n.id === excludeId) continue;
      for (const p of Object.keys(PORTS)) {
        const pos = portPos(n, p);
        const d = Math.hypot(pos.x - cx, pos.y - cy);
        if (d < bestD) { best = { nodeId: n.id, port: p, pos }; bestD = d; }
      }
    }
    return best;
  }, []);

  const addNode = useCallback((typeId, extra = {}) => {
    const nt = NODE_TYPES.find(t => t.id === typeId) || { w: 200, h: 150, defaultColor: '#fff' };
    const r  = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
    const { x, y, s } = vpRef.current;
    const id = uuidv4();
    const hasBody = ['note','card','checklist','link','code'].includes(typeId);
    setNodes(p => [...p, {
      id, type: typeId,
      x: ((r.width  / 2 - x) / s) - nt.w / 2,
      y: ((r.height / 2 - y) / s) - nt.h / 2,
      w: nt.w, h: nt.h,
      color: extra.color || nt.defaultColor,
      text: extra.text || (['text','heading'].includes(typeId) ? 'Text' : 'Title'),
      body: extra.body !== undefined ? extra.body : (hasBody ? '' : undefined),
      ...(extra.url ? { url: extra.url } : {}),
    }]);
    setSelectedIds(new Set([id]));
    setShowPicker(false);
  }, []);

  // Add a whole template (nodes + edges), centered in viewport
  const addTemplate = useCallback(({ nodes: tnodes, edges: tedges }) => {
    const r = containerRef.current?.getBoundingClientRect() || { width: 800, height: 600 };
    const { x, y, s } = vpRef.current;
    const vpCx = (r.width  / 2 - x) / s;
    const vpCy = (r.height / 2 - y) / s;

    // Find template bounding box center
    const xs = tnodes.map(n => n.x + n.w / 2);
    const ys = tnodes.map(n => n.y + n.h / 2);
    const tmplCx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const tmplCy = (Math.min(...ys) + Math.max(...ys)) / 2;
    const dx = vpCx - tmplCx, dy = vpCy - tmplCy;

    const positionedNodes = tnodes.map(n => ({ ...n, x: n.x + dx, y: n.y + dy }));
    setNodes(p => [...p, ...positionedNodes]);
    setEdges(p => [...p, ...tedges]);
  }, []);

  const updateNode = useCallback((id, ch) => setNodes(p => p.map(n => n.id === id ? { ...n, ...ch } : n)), []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedEdgeId(null);
  }, []);

  const deleteSelected = useCallback(() => {
    if (selectedIds.size > 0) {
      setNodes(p => p.filter(n => !selectedIds.has(n.id)));
      setEdges(p => p.filter(e => !selectedIds.has(e.from) && !selectedIds.has(e.to)));
      setSelectedIds(new Set());
    } else if (selectedEdgeId) {
      setEdges(p => p.filter(e => e.id !== selectedEdgeId));
      setSelectedEdgeId(null);
    }
  }, [selectedIds, selectedEdgeId]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;

    // Port → start connection
    const portEl = e.target.closest('[data-port]');
    if (portEl && !editing) {
      e.stopPropagation(); e.preventDefault();
      const nodeId = portEl.dataset.nodeId;
      const port   = portEl.dataset.port;
      const node   = nodesRef.current.find(n => n.id === nodeId);
      const fp     = portPos(node, port);
      drag.current = { type: 'connect', fromId: nodeId, fromPort: port, fromPos: fp };
      setTempLine({ from: fp, fromPort: port, x2: fp.x, y2: fp.y });
      return;
    }

    // Node → select / drag / multi-drag
    const nodeEl = e.target.closest('[data-node-id]');
    if (nodeEl && !editing) {
      e.stopPropagation();
      const nodeId = nodeEl.dataset.nodeId;
      const node   = nodesRef.current.find(n => n.id === nodeId);
      const cp     = toCanvas(e.clientX, e.clientY);
      setSelectedEdgeId(null);

      if (selectedIds.has(nodeId) && selectedIds.size > 1) {
        // Multi-drag: move all selected nodes together
        const startPositions = {};
        [...selectedIds].forEach(id => {
          const n = nodesRef.current.find(n => n.id === id);
          if (n) startPositions[id] = { x: n.x, y: n.y };
        });
        drag.current = { type: 'multi', ids: [...selectedIds], startPositions, startCX: cp.x, startCY: cp.y };
      } else {
        // Single node drag (also clears multi-selection unless Shift held)
        if (!e.shiftKey) {
          setSelectedIds(new Set([nodeId]));
        } else {
          setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
            return next;
          });
        }
        drag.current = { type: 'node', id: nodeId, ox: cp.x - node.x, oy: cp.y - node.y };
      }
      return;
    }

    // Empty canvas → marquee selection
    if (!editing) {
      setSelectedEdgeId(null);
      setShowPicker(false);
      if (!e.shiftKey) setSelectedIds(new Set());
      const cp = toCanvas(e.clientX, e.clientY);
      drag.current = { type: 'marquee', startX: cp.x, startY: cp.y };
      setMarquee({ x1: cp.x, y1: cp.y, x2: cp.x, y2: cp.y });
    }
  }, [editing, toCanvas, selectedIds]);

  const onMouseMove = useCallback((e) => {
    const d = drag.current;
    if (!d) return;
    if (d.type === 'node') {
      const cp = toCanvas(e.clientX, e.clientY);
      setNodes(p => p.map(n => n.id === d.id ? { ...n, x: cp.x - d.ox, y: cp.y - d.oy } : n));
    } else if (d.type === 'multi') {
      const cp = toCanvas(e.clientX, e.clientY);
      const dx = cp.x - d.startCX, dy = cp.y - d.startCY;
      setNodes(p => p.map(n => {
        if (!d.ids.includes(n.id)) return n;
        const sp = d.startPositions[n.id];
        return { ...n, x: sp.x + dx, y: sp.y + dy };
      }));
    } else if (d.type === 'marquee') {
      const cp = toCanvas(e.clientX, e.clientY);
      setMarquee(prev => ({ ...prev, x2: cp.x, y2: cp.y }));
    } else if (d.type === 'connect') {
      const cp = toCanvas(e.clientX, e.clientY);
      setTempLine(prev => ({ ...prev, x2: cp.x, y2: cp.y }));
    }
  }, [toCanvas]);

  const onMouseUp = useCallback((e) => {
    const d = drag.current;
    drag.current = null;

    if (d?.type === 'marquee') {
      setMarquee(null);
      const m = marqueeRef.current;
      if (!m) return;
      const minX = Math.min(m.x1, m.x2), maxX = Math.max(m.x1, m.x2);
      const minY = Math.min(m.y1, m.y2), maxY = Math.max(m.y1, m.y2);
      // Only select if marquee has meaningful size
      if (maxX - minX > 4 || maxY - minY > 4) {
        const hits = nodesRef.current
          .filter(n => n.x + n.w > minX && n.x < maxX && n.y + n.h > minY && n.y < maxY)
          .map(n => n.id);
        setSelectedIds(prev => {
          const next = new Set(e.shiftKey ? prev : []);
          hits.forEach(id => next.add(id));
          return next;
        });
      }
    } else if (d?.type === 'connect') {
      const cp = toCanvas(e.clientX, e.clientY);
      const np = snapPort(cp.x, cp.y, d.fromId);
      if (np) {
        setEdges(prev => [...prev, {
          id: uuidv4(), from: d.fromId, fromPort: d.fromPort,
          to: np.nodeId, toPort: np.port, color: '#94a3b8',
        }]);
      }
      setTempLine(null);
    }
  }, [toCanvas, snapPort]);

  // Keep a ref to marquee for use in onMouseUp (avoids stale closure)
  const marqueeRef = useRef(marquee);
  marqueeRef.current = marquee;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const fn = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();

      if (e.ctrlKey || e.metaKey) {
        // Ctrl+wheel → zoom
        const mx = e.clientX - r.left, my = e.clientY - r.top;
        const raw   = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
        const delta = Math.sign(raw) * Math.min(Math.abs(raw), 80);
        const f     = 1 - delta * 0.0035;
        setVp(v => {
          const ns = Math.min(Math.max(v.s * f, 0.08), 8);
          return { s: ns, x: mx - (mx - v.x) * (ns / v.s), y: my - (my - v.y) * (ns / v.s) };
        });
      } else {
        // Plain wheel → pan
        setVp(v => ({ ...v, x: v.x - e.deltaX * 1.2, y: v.y - e.deltaY * 1.2 }));
      }
    };
    el.addEventListener('wheel', fn, { passive: false });
    return () => el.removeEventListener('wheel', fn);
  }, []);

  useEffect(() => {
    const fn = (e) => {
      if (editing) return;
      if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      if (e.key === 'Escape') { clearSelection(); setShowPicker(false); setEditing(null); setMarquee(null); }
      // Ctrl+A → select all nodes
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(new Set(nodesRef.current.map(n => n.id)));
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [deleteSelected, clearSelection, editing]);

  // Drop cards from Pages side panel
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('notion-card');
    if (!raw) return;
    try {
      const card = JSON.parse(raw);
      const { x: cx, y: cy } = toCanvas(e.clientX, e.clientY);
      const nt = NODE_TYPES.find(t => t.id === 'note');
      const id = uuidv4();
      setNodes(p => [...p, {
        id, type: 'note',
        x: cx - nt.w / 2,
        y: cy - nt.h / 2,
        w: nt.w, h: nt.h,
        color: card.color || nt.defaultColor,
        text: card.text ? card.text.split('\n')[0].slice(0, 40) || 'כרטיס' : 'כרטיס',
        body: card.text || '',
      }]);
      setSelectedIds(new Set([id]));
    } catch {}
  }, [toCanvas]);

  const handleDragOver = useCallback((e) => {
    if (e.dataTransfer.types.includes('notion-card')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }
  }, []);

  const dotPx = DOT_SIZE * vp.s;

  return (
    <div
      className={`cv-editor${darkBg ? ' cv-editor--dark' : ''}`}
      ref={containerRef}
      style={{
        backgroundSize: `${dotPx}px ${dotPx}px`,
        backgroundPosition: `${vp.x % dotPx}px ${vp.y % dotPx}px`,
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      {/* World */}
      <div className="cv-world"
        style={{ transform: `translate(${vp.x}px,${vp.y}px) scale(${vp.s})`, transformOrigin: '0 0' }}>
        <svg xmlns="http://www.w3.org/2000/svg" className="cv-svg">
          <defs>
            <marker id="cv-arr" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="7" orient="auto">
              <path d="M0,0 L10,3.5 L0,7 Z" fill="#94a3b8" />
            </marker>
            <marker id="cv-arr-sel" viewBox="0 0 10 7" refX="9" refY="3.5" markerWidth="8" markerHeight="7" orient="auto">
              <path d="M0,0 L10,3.5 L0,7 Z" fill="#6366f1" />
            </marker>
          </defs>
          {edges.map(edge => {
            const fn = nodes.find(n => n.id === edge.from);
            const tn = nodes.find(n => n.id === edge.to);
            if (!fn || !tn) return null;
            const fp  = portPos(fn, edge.fromPort);
            const tp  = portPos(tn, edge.toPort);
            const d   = makeBezier(fp, edge.fromPort, tp, edge.toPort);
            const sel = selectedEdgeId === edge.id;
            return (
              <g key={edge.id}>
                <path d={d} stroke="transparent" strokeWidth={14} fill="none"
                  style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                  onClick={ev => { ev.stopPropagation(); setSelectedEdgeId(edge.id); setSelectedIds(new Set()); }} />
                <path d={d} stroke={sel ? '#6366f1' : '#94a3b8'} strokeWidth={sel ? 2.5 : 2}
                  fill="none" markerEnd={sel ? 'url(#cv-arr-sel)' : 'url(#cv-arr)'}
                  style={{ pointerEvents: 'none' }} />
              </g>
            );
          })}

          {/* Marquee selection rectangle */}
          {marquee && (() => {
            const x = Math.min(marquee.x1, marquee.x2);
            const y = Math.min(marquee.y1, marquee.y2);
            const w = Math.abs(marquee.x2 - marquee.x1);
            const h = Math.abs(marquee.y2 - marquee.y1);
            const sw = 1.5 / vp.s;
            return (
              <rect x={x} y={y} width={w} height={h}
                fill="rgba(99,102,241,0.07)"
                stroke="#6366f1" strokeWidth={sw}
                strokeDasharray={`${5/vp.s} ${3/vp.s}`}
                rx={2/vp.s}
                style={{ pointerEvents: 'none' }} />
            );
          })()}

          {tempLine && (() => {
            const { from, fromPort, x2, y2 } = tempLine;
            const d = PORTS[fromPort];
            return <path
              d={`M ${from.x} ${from.y} C ${from.x + d.dx * 80} ${from.y + d.dy * 80}, ${x2} ${y2}, ${x2} ${y2}`}
              stroke="#6366f1" strokeWidth={2} fill="none" strokeDasharray="7 4"
              style={{ pointerEvents: 'none' }} />;
          })()}
        </svg>

        {nodes.map(node => (
          <CanvasNode
            key={node.id}
            node={node}
            selected={selectedIds.has(node.id)}
            multiSelected={selectedIds.size > 1 && selectedIds.has(node.id)}
            hovered={hovered === node.id}
            editing={editing === node.id}
            onHover={setHovered}
            onDoubleClick={() => { if (selectedIds.size <= 1) setEditing(node.id); }}
            onEditDone={() => setEditing(null)}
            onUpdate={ch => updateNode(node.id, ch)}
          />
        ))}
      </div>

      {/* Toolbar — shown for single or multi selection */}
      {selectedIds.size > 0 && (
        <div className="cv-toolbar" onMouseDown={e => e.stopPropagation()}>
          {selectedIds.size > 1 && (
            <>
              <span className="cv-toolbar__label">{selectedIds.size} נבחרו</span>
              <div className="cv-toolbar__sep" />
            </>
          )}
          {PALETTE.map(c => (
            <button key={c} className="cv-toolbar__color"
              style={{ background: c, outline: '2px solid #e2e8f0' }}
              onClick={() => setNodes(p => p.map(n => selectedIds.has(n.id) ? { ...n, color: c } : n))} />
          ))}
          <div className="cv-toolbar__sep" />
          {selectedIds.size === 1 && (
            <button className="cv-toolbar__icon-btn" title="שכפל" onClick={() => {
              const node = nodes.find(n => n.id === [...selectedIds][0]);
              if (!node) return;
              const id = uuidv4();
              setNodes(p => [...p, { ...node, id, x: node.x + 28, y: node.y + 28 }]);
              setSelectedIds(new Set([id]));
            }}>⧉</button>
          )}
          <button className="cv-toolbar__icon-btn cv-toolbar__icon-btn--danger" title="מחק (Del)"
            onClick={deleteSelected}>🗑</button>
        </div>
      )}

      {/* Edge toolbar */}
      {selectedEdgeId && (
        <div className="cv-toolbar" onMouseDown={e => e.stopPropagation()}>
          <span className="cv-toolbar__label">חיבור נבחר</span>
          <div className="cv-toolbar__sep" />
          <button className="cv-toolbar__icon-btn cv-toolbar__icon-btn--danger" onClick={deleteSelected}>🗑</button>
        </div>
      )}

      {/* Shapes & Templates panel */}
      <CanvasShapesPanel
        onAddNode={addNode}
        onAddTemplate={addTemplate}
      />

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div className="cv-hero-add" style={{ pointerEvents: 'none' }}>
          <div className="cv-hero-add__hint">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
            <span>פתח את הפאנל השמאלי להוספת צורות</span>
          </div>
        </div>
      )}

      {/* Background toggle */}
      <button className="cv-bg-toggle" onMouseDown={e => e.stopPropagation()}
        onClick={() => setDarkBg(d => !d)} title="Toggle background">
        {darkBg ? '☀️' : '🌙'}
      </button>

      {/* Zoom */}
      <div className="cv-zoom" onMouseDown={e => e.stopPropagation()}>
        <button onClick={() => setVp(v => ({ ...v, s: Math.min(v.s * 1.15, 8) }))}>+</button>
        <span>{Math.round(vp.s * 100)}%</span>
        <button onClick={() => setVp(v => ({ ...v, s: Math.max(v.s / 1.15, 0.08) }))}>−</button>
        <div className="cv-zoom__sep" />
        <button onClick={() => setVp({ x: 0, y: 0, s: 1 })}>⌂</button>
      </div>

      {nodes.length > 0 && nodes.length <= 2 && !edges.length && (
        <div className="cv-tip">💡 גרור מנקודה כתומה לחיבור בין כרטיסים</div>
      )}
    </div>
  );
}

// ── CanvasNode ────────────────────────────────────────────────────────────────
function CanvasNode({ node, selected, hovered, editing, onHover, onDoubleClick, onEditDone, onUpdate }) {
  const renderDisplay = () => {
    if (node.type === 'heading') return (
      <div className="cv-node__heading">{node.text}</div>
    );
    if (node.type === 'image') return (
      <div className="cv-node__image-wrap">
        {node.url
          ? <img src={node.url} alt={node.text||''} className="cv-node__image"
              onError={e => { e.target.style.display='none'; }}/>
          : <div className="cv-node__image-ph">🖼️</div>
        }
        {node.text && <div className="cv-node__image-cap">{node.text}</div>}
      </div>
    );
    if (node.type === 'link') return (
      <div className="cv-node__link">
        <span className="cv-node__link-icon">🔗</span>
        <div className="cv-node__link-info">
          <span className="cv-node__link-title">{node.text || 'Link'}</span>
          {node.url && <span className="cv-node__link-url">{node.url}</span>}
        </div>
      </div>
    );
    if (node.type === 'code') return (
      <div className="cv-node__code">
        <div className="cv-node__code-bar"><span>●</span><span>●</span><span>●</span></div>
        <pre className="cv-node__code-pre">{node.text || '// code...'}</pre>
      </div>
    );
    if (node.type === 'section') return (
      <div className="cv-node__section">
        <div className="cv-node__section-title">{node.text}</div>
      </div>
    );
    if (node.type === 'checklist') return (
      <div className="cv-node__checklist">
        <div className="cv-node__checklist-title">{node.text}</div>
        {node.body && node.body.split('\n').filter(Boolean).map((line, i) => (
          <div key={i} className="cv-node__checklist-item">
            <span className="cv-node__checklist-dot">☐</span>
            <span>{line}</span>
          </div>
        ))}
      </div>
    );
    if (node.type === 'big-card') return (
      <div className="cv-node__bigcard">
        <p className="cv-node__bigcard-text">{node.text}</p>
        {node.body && <p className="cv-node__bigcard-body">{node.body}</p>}
      </div>
    );
    return (
      <div className="cv-node__display">
        <p className="cv-node__text">{node.text}</p>
        {node.body && <p className="cv-node__body">{node.body}</p>}
      </div>
    );
  };

  return (
    <div
      className={`cv-node cv-node--${node.type} ${selected ? 'cv-node--selected' : ''}`}
      style={{ position: 'absolute', left: node.x, top: node.y, width: node.w, height: node.h }}
      data-node-id={node.id}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      onDoubleClick={e => { e.stopPropagation(); onDoubleClick(); }}
    >
      <div className="cv-node__inner" style={{ background: node.color }}>
        {editing ? (
          <div className="cv-node__editing" onMouseDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()}>
            <input className="cv-node__input-title" value={node.text}
              onChange={e => onUpdate({ text: e.target.value })}
              onBlur={onEditDone}
              onKeyDown={e => e.key==='Enter' && !e.shiftKey && onEditDone()}
              autoFocus />
            {node.body !== undefined && (
              <textarea className="cv-node__input-body" value={node.body}
                onChange={e => onUpdate({ body: e.target.value })}
                placeholder="Content..." rows={3} />
            )}
            {(node.type === 'image' || node.type === 'link') && (
              <input className="cv-node__input-url"
                value={node.url || ''}
                onChange={e => onUpdate({ url: e.target.value })}
                placeholder="URL (https://...)..." />
            )}
          </div>
        ) : renderDisplay()}
      </div>
      {(hovered || selected) && !editing && Object.entries(PORTS).map(([port, d]) => (
        <div key={port} className="cv-port" data-port={port} data-node-id={node.id}
          style={{ left: `${d.rx * 100}%`, top: `${d.ry * 100}%` }} />
      ))}
    </div>
  );
}
