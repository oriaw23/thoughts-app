import { useEffect, useRef, useCallback, useState } from 'react';
import './GraphView.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function hexRgb(hex) {
  const h = hex.replace('#','');
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}
function rgba(hex, a) {
  const [r,g,b] = hexRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.lineTo(x+w-r, y); ctx.quadraticCurveTo(x+w, y, x+w, y+r);
  ctx.lineTo(x+w, y+h-r); ctx.quadraticCurveTo(x+w, y+h, x+w-r, y+h);
  ctx.lineTo(x+r, y+h); ctx.quadraticCurveTo(x, y+h, x, y+h-r);
  ctx.lineTo(x, y+r); ctx.quadraticCurveTo(x, y, x+r, y);
  ctx.closePath();
}
function isDarkMode() {
  return document.documentElement.getAttribute('data-mode') === 'dark';
}

// ── Graph data ────────────────────────────────────────────────────────────────
function buildGraph(projects, pages, tasks, goals) {
  const nodes = [], edges = [], seen = new Set();
  const add = n => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  // Project nodes — arranged in a loose circle
  projects.forEach((p, i) => {
    const angle = (i / Math.max(projects.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const r = 180 + Math.random() * 40;
    add({
      id: `proj:${p.id}`, type: 'project',
      label: p.name || 'Project', icon: p.icon || '🗂️',
      color: p.color || '#6366f1',
      x: Math.cos(angle)*r + (Math.random()-.5)*50,
      y: Math.sin(angle)*r + (Math.random()-.5)*50,
      vx:0, vy:0, r:14, data:p,
    });
  });

  // Pages
  pages.slice(0, 30).forEach(pg => {
    const proj = projects.find(p => p.pageIds?.includes(pg.id));
    if (!proj) return;
    add({ id:`page:${pg.id}`, type:'page', label: pg.title||'Untitled',
      color:'#3b82f6', x:(Math.random()-.5)*500, y:(Math.random()-.5)*500,
      vx:0, vy:0, r:8, data:pg });
    edges.push({ from:`proj:${proj.id}`, to:`page:${pg.id}` });
  });

  // Tasks
  tasks.slice(0, 30).forEach(t => {
    const proj = projects.find(p => p.taskIds?.includes(t.id));
    if (!proj) return;
    add({ id:`task:${t.id}`, type:'task', label: t.title||t.text||'Task',
      color:'#f59e0b', x:(Math.random()-.5)*500, y:(Math.random()-.5)*500,
      vx:0, vy:0, r:7, data:t });
    edges.push({ from:`proj:${proj.id}`, to:`task:${t.id}` });
  });

  // Goals
  goals.slice(0, 20).forEach(g => {
    const proj = projects.find(p => p.goalIds?.includes(g.id));
    if (!proj) return;
    add({ id:`goal:${g.id}`, type:'goal', label: g.title||'Goal',
      color:'#10b981', x:(Math.random()-.5)*500, y:(Math.random()-.5)*500,
      vx:0, vy:0, r:8, data:g });
    edges.push({ from:`proj:${proj.id}`, to:`goal:${g.id}` });
  });

  // Project–project shared links
  for (let i=0; i<projects.length; i++) {
    for (let j=i+1; j<projects.length; j++) {
      const a=projects[i], b=projects[j];
      const shared = a.taskIds?.some(id=>b.taskIds?.includes(id))
                  || a.pageIds?.some(id=>b.pageIds?.includes(id))
                  || a.goalIds?.some(id=>b.goalIds?.includes(id));
      if (shared) edges.push({ from:`proj:${a.id}`, to:`proj:${b.id}`, dashed:true });
    }
  }

  return { nodes, edges };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GraphView({ projects=[], pages=[], tasks=[], goals=[], onClose, onOpenProject }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const [hovered, setHovered] = useState(null); // { node, screenX, screenY }

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const { nodes, edges } = buildGraph(projects, pages, tasks, goals);
    const nm = {};
    nodes.forEach(n => (nm[n.id] = n));

    stateRef.current = {
      nodes, edges, nm,
      tx:0, ty:0, scale:1,
      drag: null, hovId: null,
      animId: null, running: true, tick:0,
    };

    // Resize
    const ro = new ResizeObserver(() => {
      canvas.width  = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    });
    ro.observe(wrap);
    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;

    // ── Physics ──────────────────────────────────────────────────
    const REPULSION = 5500;
    const SPRING_K  = 0.032;
    const SPRING_L  = 160;
    const DAMPING   = 0.78;
    const GRAVITY   = 0.014;

    function physics() {
      const { nodes, edges, nm } = stateRef.current;
      nodes.forEach(n => { n.fx=0; n.fy=0; });

      // Gravity to world origin
      nodes.forEach(n => { n.fx += -n.x*GRAVITY; n.fy += -n.y*GRAVITY; });

      // Repulsion
      for (let i=0; i<nodes.length; i++) {
        for (let j=i+1; j<nodes.length; j++) {
          const a=nodes[i], b=nodes[j];
          let dx=a.x-b.x, dy=a.y-b.y;
          let d=Math.sqrt(dx*dx+dy*dy)+0.1;
          const minD = a.r+b.r+28;
          const F = REPULSION/(d*d);
          const fx=(dx/d)*F, fy=(dy/d)*F;
          a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
          if (d<minD) {
            const push=(minD-d)*0.5;
            a.x+=(dx/d)*push; a.y+=(dy/d)*push;
            b.x-=(dx/d)*push; b.y-=(dy/d)*push;
          }
        }
      }

      // Springs
      edges.forEach(e => {
        const a=nm[e.from], b=nm[e.to];
        if (!a||!b) return;
        const dx=b.x-a.x, dy=b.y-a.y;
        const d=Math.sqrt(dx*dx+dy*dy)+0.1;
        const stretch=d-SPRING_L;
        const F=SPRING_K*stretch;
        const fx=(dx/d)*F, fy=(dy/d)*F;
        a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
      });

      // Integrate
      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx=(n.vx+n.fx)*DAMPING;
        n.vy=(n.vy+n.fy)*DAMPING;
        n.x+=n.vx; n.y+=n.vy;
      });

      stateRef.current.tick++;
    }

    // ── Draw ─────────────────────────────────────────────────────
    function draw() {
      const s   = stateRef.current;
      const ctx = canvas.getContext('2d');
      const W=canvas.width, H=canvas.height;
      const { tx, ty, scale, hovId, nodes, edges, nm } = s;
      const dark = isDarkMode();

      // Background
      ctx.fillStyle = dark ? '#0e0f14' : '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // Subtle dot grid
      const STEP = 32;
      ctx.fillStyle = dark ? 'rgba(255,255,255,.028)' : 'rgba(0,0,0,.045)';
      const offX = ((tx % STEP) + W/2 % STEP + STEP*2) % STEP;
      const offY = ((ty % STEP) + H/2 % STEP + STEP*2) % STEP;
      for (let gx=offX; gx<W; gx+=STEP)
        for (let gy=offY; gy<H; gy+=STEP) {
          ctx.beginPath(); ctx.arc(gx, gy, 1, 0, Math.PI*2); ctx.fill();
        }

      ctx.save();
      ctx.translate(W/2+tx, H/2+ty);
      ctx.scale(scale, scale);

      // ── Edges ──
      edges.forEach(e => {
        const a=nm[e.from], b=nm[e.to];
        if (!a||!b) return;
        const hov = hovId===e.from || hovId===e.to;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.setLineDash(e.dashed ? [4,4] : []);
        ctx.strokeStyle = dark
          ? `rgba(255,255,255,${hov ? .32 : .1})`
          : `rgba(0,0,0,${hov ? .25 : .09})`;
        ctx.lineWidth = hov ? 1.2 : 0.8;
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // ── Nodes ──
      nodes.forEach(n => {
        const hov = hovId===n.id;
        const col = n.color;
        const r   = n.r;
        ctx.save();

        if (n.type === 'project') {
          // Rounded square
          const sz = r*2, x=n.x-r, y=n.y-r, cr=5;
          roundRect(ctx, x, y, sz, sz, cr);
          ctx.fillStyle   = dark ? rgba(col,.18) : rgba(col,.10);
          ctx.fill();
          ctx.strokeStyle = rgba(col, hov ? 1 : .55);
          ctx.lineWidth   = hov ? 2 : 1.5;
          ctx.stroke();

          // Emoji
          ctx.font = `${Math.round(r*1.05)}px serif`;
          ctx.textAlign='center'; ctx.textBaseline='middle';
          ctx.fillText(n.icon, n.x, n.y+1);

          // Always-visible label
          ctx.font = `600 11px system-ui,-apple-system,sans-serif`;
          ctx.textAlign='center'; ctx.textBaseline='top';
          ctx.fillStyle = dark ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.62)';
          const lbl = n.label.length>16 ? n.label.slice(0,14)+'…' : n.label;
          // Label bg
          const tw = ctx.measureText(lbl).width;
          ctx.fillStyle = dark ? 'rgba(14,15,20,.75)' : 'rgba(255,255,255,.85)';
          ctx.fillRect(n.x - tw/2 - 3, n.y+r+6, tw+6, 15);
          ctx.fillStyle = dark ? 'rgba(255,255,255,.72)' : 'rgba(0,0,0,.62)';
          ctx.fillText(lbl, n.x, n.y+r+7);

        } else {
          // Small circle
          ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
          ctx.fillStyle   = dark ? rgba(col,.15) : rgba(col,.08);
          ctx.fill();
          ctx.strokeStyle = rgba(col, hov ? 1 : .5);
          ctx.lineWidth   = hov ? 1.5 : 1;
          ctx.stroke();

          // Inner dot
          ctx.beginPath(); ctx.arc(n.x, n.y, r*.42, 0, Math.PI*2);
          ctx.fillStyle = rgba(col, hov ? 1 : .65);
          ctx.fill();

          // Label on hover only
          if (hov) {
            ctx.font='11px system-ui,-apple-system,sans-serif';
            ctx.textAlign='center'; ctx.textBaseline='top';
            const lbl = n.label.length>20 ? n.label.slice(0,18)+'…' : n.label;
            const tw  = ctx.measureText(lbl).width;
            ctx.fillStyle = dark ? 'rgba(14,15,20,.8)' : 'rgba(255,255,255,.9)';
            ctx.fillRect(n.x-tw/2-4, n.y+r+5, tw+8, 15);
            ctx.fillStyle = dark ? 'rgba(255,255,255,.8)' : 'rgba(0,0,0,.65)';
            ctx.fillText(lbl, n.x, n.y+r+6);
          }
        }
        ctx.restore();
      });

      ctx.restore();
    }

    function loop() {
      if (!stateRef.current?.running) return;
      physics(); draw();
      stateRef.current.animId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      if (stateRef.current) stateRef.current.running = false;
      cancelAnimationFrame(stateRef.current?.animId);
      ro.disconnect();
    };
  }, [projects, pages, tasks, goals]);

  // ── Interaction helpers ────────────────────────────────────────────────────
  const worldXY = useCallback((e) => {
    const s=stateRef.current, cvs=canvasRef.current;
    if (!s||!cvs) return {x:0,y:0};
    const rect=cvs.getBoundingClientRect();
    return {
      x: (e.clientX-rect.left-cvs.width/2-s.tx)/s.scale,
      y: (e.clientY-rect.top-cvs.height/2-s.ty)/s.scale,
    };
  }, []);

  const nodeAt = useCallback((wx,wy) => {
    let best=null, bestD=Infinity;
    stateRef.current?.nodes.forEach(n => {
      const d=Math.hypot(n.x-wx, n.y-wy);
      if (d<n.r+10 && d<bestD) { best=n; bestD=d; }
    });
    return best;
  }, []);

  const onMouseMove = useCallback((e) => {
    const s=stateRef.current; if (!s) return;
    const {x,y}=worldXY(e);
    if (s.drag) {
      if (s.drag.type==='node') {
        const n=s.nm[s.drag.id];
        if (n) { n.x=x+s.drag.ox; n.y=y+s.drag.oy; n.pinned=true; n.vx=0; n.vy=0; }
      } else {
        const cvs=canvasRef.current;
        const r=cvs.getBoundingClientRect();
        s.tx+=(e.clientX-r.left)-s.drag.lx;
        s.ty+=(e.clientY-r.top)-s.drag.ly;
        s.drag.lx=e.clientX-r.left;
        s.drag.ly=e.clientY-r.top;
      }
      return;
    }
    const hov=nodeAt(x,y);
    s.hovId=hov?.id||null;
    if (hov) setHovered({ node:hov, sx:e.clientX, sy:e.clientY });
    else      setHovered(null);
  }, [worldXY, nodeAt]);

  const onMouseDown = useCallback((e) => {
    const s=stateRef.current; if (!s) return;
    const {x,y}=worldXY(e);
    const hov=nodeAt(x,y);
    const cvs=canvasRef.current; const r=cvs.getBoundingClientRect();
    if (hov) s.drag={ type:'node', id:hov.id, ox:hov.x-x, oy:hov.y-y };
    else s.drag={ type:'pan', lx:e.clientX-r.left, ly:e.clientY-r.top };
  }, [worldXY, nodeAt]);

  const onMouseUp   = useCallback(() => {
    const s=stateRef.current; if (!s) return;
    if (s.drag?.type==='node') { const n=s.nm[s.drag.id]; if(n) n.pinned=false; }
    s.drag=null;
  }, []);

  const onClick = useCallback((e) => {
    const {x,y}=worldXY(e);
    const hov=nodeAt(x,y);
    if (hov?.type==='project' && onOpenProject) onOpenProject(hov.data);
  }, [worldXY, nodeAt, onOpenProject]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const s=stateRef.current; if (!s) return;
    s.scale=Math.min(4, Math.max(0.12, s.scale*(e.deltaY<0?1.1:0.9)));
  }, []);

  const resetView  = () => { const s=stateRef.current; if(s){s.tx=0;s.ty=0;s.scale=1;} };
  const unpinAll   = () => { stateRef.current?.nodes.forEach(n=>{n.pinned=false;}); };

  return (
    <div className="gv" ref={wrapRef}>
      <canvas ref={canvasRef} className="gv__canvas"
        onMouseMove={onMouseMove} onMouseDown={onMouseDown}
        onMouseUp={onMouseUp} onMouseLeave={onMouseUp}
        onClick={onClick} onWheel={onWheel}
      />

      {/* Top bar */}
      <div className="gv__bar">
        <div className="gv__bar-left">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="gv__bar-icon">
            <circle cx="12" cy="5" r="3"/><circle cx="19" cy="17" r="3"/><circle cx="5" cy="17" r="3"/>
            <line x1="12" y1="8" x2="19" y2="14"/><line x1="12" y1="8" x2="5" y2="14"/>
          </svg>
          <span className="gv__bar-title">Knowledge Graph</span>
          <span className="gv__bar-pill">{projects.length} projects</span>
        </div>
        <div className="gv__bar-right">
          <button className="gv__btn" onClick={resetView}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
          <button className="gv__btn" onClick={unpinAll}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v6M6 8l6-6 6 6"/><path d="M5 20h14M12 8v12"/></svg>
            Unpin
          </button>
          <div className="gv__sep"/>
          <button className="gv__close-btn" onClick={onClose} title="Close">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="gv__legend">
        {[['#6366f1','Project'],['#3b82f6','Page'],['#f59e0b','Task'],['#10b981','Goal']].map(([c,l]) => (
          <span key={l} className="gv__leg">
            <span className="gv__leg-dot" style={{background:c}}/>
            {l}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="gv__tip" style={{
          left: Math.min(hovered.sx+14, window.innerWidth-190),
          top:  Math.min(hovered.sy+12, window.innerHeight-110),
        }}>
          <span className="gv__tip-type">{hovered.node.type}</span>
          <span className="gv__tip-name">
            {hovered.node.icon ? hovered.node.icon+' ' : ''}{hovered.node.label}
          </span>
          {hovered.node.type === 'project' && (
            <span className="gv__tip-cta">Click to open</span>
          )}
        </div>
      )}

      {/* Keyboard hint */}
      <div className="gv__hint">
        Scroll to zoom · Drag to pan · Click project to open
      </div>
    </div>
  );
}
