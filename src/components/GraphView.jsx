import { useEffect, useRef, useCallback, useState } from 'react';
import './GraphView.css';

// ── Node type config ──────────────────────────────────────────────────────────
const TYPE = {
  project: { r: 22, color: '#ffffff', bg: '#18181b', border: '#3f3f46',  label: true  },
  page:    { r: 13, color: '#60a5fa', bg: '#1d4ed8',  border: '#3b82f6', label: false },
  task:    { r: 11, color: '#4ade80', bg: '#15803d',  border: '#22c55e', label: false },
  goal:    { r: 12, color: '#fb923c', bg: '#c2410c',  border: '#f97316', label: false },
};

function isDark() { return document.documentElement.getAttribute('data-mode') === 'dark'; }

// ── Graph data ────────────────────────────────────────────────────────────────
function buildGraph(projects, pages, tasks, goals) {
  const nodes = [], edges = [], seen = new Set();
  const add = n => { if (!seen.has(n.id)) { seen.add(n.id); nodes.push(n); } };

  projects.forEach((p, i) => {
    const angle = (i / Math.max(projects.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const r = 200 + (i % 3) * 40;
    add({ id:`proj:${p.id}`, type:'project',
      label: p.name || 'Project', icon: p.icon || '🗂️',
      x: Math.cos(angle)*r, y: Math.sin(angle)*r,
      vx:0, vy:0, r: TYPE.project.r, data:p,
    });
  });

  pages.slice(0, 40).forEach(pg => {
    const proj = projects.find(p => p.pageIds?.includes(pg.id));
    if (!proj) return;
    add({ id:`page:${pg.id}`, type:'page', label: pg.title||'Untitled',
      icon: pg.icon || null,
      x:(Math.random()-.5)*600, y:(Math.random()-.5)*600,
      vx:0, vy:0, r: TYPE.page.r, data:pg });
    edges.push({ from:`proj:${proj.id}`, to:`page:${pg.id}`, type:'page' });
  });

  tasks.slice(0, 40).forEach(t => {
    const proj = projects.find(p => p.taskIds?.includes(t.id));
    if (!proj) return;
    add({ id:`task:${t.id}`, type:'task', label: t.title||t.text||'Task',
      x:(Math.random()-.5)*600, y:(Math.random()-.5)*600,
      vx:0, vy:0, r: TYPE.task.r, data:t });
    edges.push({ from:`proj:${proj.id}`, to:`task:${t.id}`, type:'task' });
  });

  goals.slice(0, 25).forEach(g => {
    const proj = projects.find(p => p.goalIds?.includes(g.id));
    if (!proj) return;
    add({ id:`goal:${g.id}`, type:'goal', label: g.title||'Goal',
      x:(Math.random()-.5)*600, y:(Math.random()-.5)*600,
      vx:0, vy:0, r: TYPE.goal.r, data:g });
    edges.push({ from:`proj:${proj.id}`, to:`goal:${g.id}`, type:'goal' });
  });

  for (let i=0; i<projects.length; i++) {
    for (let j=i+1; j<projects.length; j++) {
      const a=projects[i], b=projects[j];
      const shared = a.taskIds?.some(id=>b.taskIds?.includes(id))
                  || a.pageIds?.some(id=>b.pageIds?.includes(id));
      if (shared) edges.push({ from:`proj:${a.id}`, to:`proj:${b.id}`, type:'shared', dashed:true });
    }
  }

  return { nodes, edges };
}

// ── Draw helpers ──────────────────────────────────────────────────────────────
function drawArrow(ctx, ax, ay, bx, by, rB, color, alpha) {
  const dx = bx-ax, dy = by-ay;
  const d  = Math.sqrt(dx*dx+dy*dy);
  if (d < 1) return;
  const ux = dx/d, uy = dy/d;
  // Stop at node edge
  const ex = bx - ux*(rB+2), ey = by - uy*(rB+2);

  // Edge line
  ctx.beginPath();
  ctx.moveTo(ax + ux*TYPE.project.r, ay + uy*TYPE.project.r);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Arrowhead
  const ah = 7, aw = 4;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - ux*ah + uy*aw, ey - uy*ah - ux*aw);
  ctx.lineTo(ex - ux*ah - uy*aw, ey - uy*ah + ux*aw);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawNode(ctx, n, hovId, dark) {
  const hov = hovId === n.id;
  const t   = TYPE[n.type];
  const r   = n.r;

  ctx.save();
  ctx.globalAlpha = hov ? 1 : 0.88;

  if (n.type === 'project') {
    // Outer glow on hover
    if (hov) {
      ctx.beginPath(); ctx.arc(n.x, n.y, r+8, 0, Math.PI*2);
      ctx.fillStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.06)';
      ctx.fill();
    }

    // Circle fill
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.fillStyle = dark ? '#27272a' : '#f4f4f5';
    ctx.fill();
    ctx.strokeStyle = hov ? (dark?'#a1a1aa':'#71717a') : (dark?'#3f3f46':'#d4d4d8');
    ctx.lineWidth = hov ? 2 : 1.5;
    ctx.stroke();

    // Emoji
    ctx.font = `${Math.round(r*1.1)}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1;
    ctx.fillText(n.icon || '🗂️', n.x, n.y + 1);

    // Label below
    ctx.globalAlpha = 1;
    const lbl = n.label.length > 18 ? n.label.slice(0,16)+'…' : n.label;
    ctx.font = `600 11px -apple-system,system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const tw = ctx.measureText(lbl).width;
    // Label pill
    const px=6, py=3;
    ctx.beginPath();
    ctx.roundRect(n.x-tw/2-px, n.y+r+6, tw+px*2, 16+py*2, 4);
    ctx.fillStyle = dark ? 'rgba(24,24,27,.85)' : 'rgba(255,255,255,.92)';
    ctx.fill();
    ctx.fillStyle = dark ? '#d4d4d8' : '#27272a';
    ctx.fillText(lbl, n.x, n.y+r+9);

  } else {
    const edgeColor = t.border;

    // Glow on hover
    if (hov) {
      ctx.beginPath(); ctx.arc(n.x, n.y, r+6, 0, Math.PI*2);
      ctx.fillStyle = `${edgeColor}22`;
      ctx.fill();
    }

    // Circle
    ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    // Gradient fill
    const grad = ctx.createRadialGradient(n.x-r*.3, n.y-r*.3, 0, n.x, n.y, r*1.2);
    grad.addColorStop(0, dark ? lighten(t.bg, 40) : lighten(t.bg, 25));
    grad.addColorStop(1, t.bg);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = hov ? t.border : `${t.border}aa`;
    ctx.lineWidth = hov ? 2 : 1.2;
    ctx.stroke();

    // Type icon inside
    ctx.globalAlpha = 0.92;
    if (n.type === 'page') {
      // Doc icon
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.lineCap = 'round';
      const s = r*0.48;
      ctx.beginPath();
      ctx.moveTo(n.x-s*.65, n.y-s); ctx.lineTo(n.x+s*.3, n.y-s);
      ctx.lineTo(n.x+s*.65, n.y-s*.6); ctx.lineTo(n.x+s*.65, n.y+s);
      ctx.lineTo(n.x-s*.65, n.y+s); ctx.closePath();
      ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fill(); ctx.stroke();
      // Lines on doc
      ctx.lineWidth=0.9;
      ctx.beginPath(); ctx.moveTo(n.x-s*.35,n.y-s*.1); ctx.lineTo(n.x+s*.35,n.y-s*.1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(n.x-s*.35,n.y+s*.25); ctx.lineTo(n.x+s*.25,n.y+s*.25); ctx.stroke();
    } else if (n.type === 'task') {
      // Checkmark in circle
      const s = r * 0.5;
      ctx.beginPath(); ctx.arc(n.x, n.y, s, 0, Math.PI*2);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(n.x-s*.5, n.y);
      ctx.lineTo(n.x-s*.12, n.y+s*.45);
      ctx.lineTo(n.x+s*.55, n.y-s*.4);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.4; ctx.stroke();
    } else if (n.type === 'goal') {
      // Target rings
      const s = r * 0.5;
      [s, s*0.57].forEach((rr, i) => {
        ctx.beginPath(); ctx.arc(n.x, n.y, rr, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(255,255,255,${i===0?.75:.95})`; ctx.lineWidth = i===0?1:1.3; ctx.stroke();
      });
      ctx.beginPath(); ctx.arc(n.x, n.y, 1.6, 0, Math.PI*2);
      ctx.fillStyle='#fff'; ctx.fill();
    }

    // Label on hover
    if (hov) {
      ctx.globalAlpha = 1;
      const lbl = n.label.length > 22 ? n.label.slice(0,20)+'…' : n.label;
      ctx.font = `500 10.5px -apple-system,system-ui,sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      const tw = ctx.measureText(lbl).width;
      ctx.beginPath();
      ctx.roundRect(n.x-tw/2-5, n.y+r+5, tw+10, 15, 3);
      ctx.fillStyle = dark ? 'rgba(24,24,27,.9)' : 'rgba(255,255,255,.95)';
      ctx.fill();
      ctx.strokeStyle = dark ? '#3f3f46' : '#e4e4e7';
      ctx.lineWidth = 0.8; ctx.stroke();
      ctx.fillStyle = dark ? '#e4e4e7' : '#18181b';
      ctx.fillText(lbl, n.x, n.y+r+7.5);
    }
  }

  ctx.restore();
}

function lighten(hex, amt) {
  const h = hex.replace('#','');
  const r = Math.min(255, parseInt(h.slice(0,2),16)+amt);
  const g = Math.min(255, parseInt(h.slice(2,4),16)+amt);
  const b = Math.min(255, parseInt(h.slice(4,6),16)+amt);
  return `rgb(${r},${g},${b})`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GraphView({ projects=[], pages=[], tasks=[], goals=[], onClose, onOpenProject }) {
  const wrapRef   = useRef(null);
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const [hovered, setHovered] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    const { nodes, edges } = buildGraph(projects, pages, tasks, goals);
    setNodeCount(nodes.length);
    const nm = {};
    nodes.forEach(n => (nm[n.id] = n));

    stateRef.current = {
      nodes, edges, nm,
      tx:0, ty:0, scale:1,
      drag:null, hovId:null,
      animId:null, running:true, tick:0,
    };

    const ro = new ResizeObserver(() => {
      canvas.width  = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    });
    ro.observe(wrap);
    canvas.width  = wrap.offsetWidth;
    canvas.height = wrap.offsetHeight;

    // ── Physics ───────────────────────────────────────────────────
    const REPULSION = 6000, SPRING_K = 0.028, SPRING_L = 150, DAMPING = 0.76, GRAVITY = 0.016;

    function physics() {
      const { nodes, edges, nm } = stateRef.current;
      nodes.forEach(n => { n.fx=0; n.fy=0; });
      nodes.forEach(n => { n.fx += -n.x*GRAVITY; n.fy += -n.y*GRAVITY; });
      for (let i=0; i<nodes.length; i++) {
        for (let j=i+1; j<nodes.length; j++) {
          const a=nodes[i], b=nodes[j];
          let dx=a.x-b.x, dy=a.y-b.y;
          let d=Math.sqrt(dx*dx+dy*dy)+0.1;
          const minD=a.r+b.r+32;
          const F=REPULSION/(d*d);
          const fx=(dx/d)*F, fy=(dy/d)*F;
          a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
          if (d<minD) {
            const push=(minD-d)*0.5;
            a.x+=(dx/d)*push; a.y+=(dy/d)*push;
            b.x-=(dx/d)*push; b.y-=(dy/d)*push;
          }
        }
      }
      edges.forEach(e => {
        const a=nm[e.from], b=nm[e.to]; if (!a||!b) return;
        const dx=b.x-a.x, dy=b.y-a.y;
        const d=Math.sqrt(dx*dx+dy*dy)+0.1;
        const stretch=d-SPRING_L;
        const F=SPRING_K*stretch;
        const fx=(dx/d)*F, fy=(dy/d)*F;
        a.fx+=fx; a.fy+=fy; b.fx-=fx; b.fy-=fy;
      });
      nodes.forEach(n => {
        if (n.pinned) return;
        n.vx=(n.vx+n.fx)*DAMPING; n.vy=(n.vy+n.fy)*DAMPING;
        n.x+=n.vx; n.y+=n.vy;
      });
      stateRef.current.tick++;
    }

    // ── Draw ──────────────────────────────────────────────────────
    function draw() {
      const s=stateRef.current;
      const ctx=canvas.getContext('2d');
      const W=canvas.width, H=canvas.height;
      const { tx,ty,scale,hovId,nodes,edges,nm } = s;
      const dark = isDark();

      // BG
      ctx.fillStyle = dark ? '#111113' : '#fafafa';
      ctx.fillRect(0,0,W,H);

      // Dot grid
      const STEP=28;
      ctx.fillStyle = dark ? 'rgba(255,255,255,.022)' : 'rgba(0,0,0,.035)';
      const ox=((tx%(STEP*scale))+(W/2)%(STEP*scale)+(STEP*scale*4))%(STEP*scale);
      const oy=((ty%(STEP*scale))+(H/2)%(STEP*scale)+(STEP*scale*4))%(STEP*scale);
      for (let gx=ox; gx<W; gx+=STEP*scale)
        for (let gy=oy; gy<H; gy+=STEP*scale) {
          ctx.beginPath(); ctx.arc(gx,gy,1,0,Math.PI*2); ctx.fill();
        }

      ctx.save();
      ctx.translate(W/2+tx, H/2+ty);
      ctx.scale(scale, scale);

      // ── Edges ──
      edges.forEach(e => {
        const a=nm[e.from], b=nm[e.to]; if (!a||!b) return;
        const hov = hovId===e.from || hovId===e.to;
        if (e.dashed) {
          ctx.setLineDash([5,5]);
          ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y);
          ctx.strokeStyle = dark?'rgba(255,255,255,.12)':'rgba(0,0,0,.1)';
          ctx.lineWidth=1; ctx.globalAlpha=0.6; ctx.stroke();
          ctx.setLineDash([]); ctx.globalAlpha=1;
        } else {
          const edgeCol = TYPE[e.type]?.border || '#64748b';
          drawArrow(ctx, a.x, a.y, b.x, b.y, TYPE[b.type]?.r || 10,
            dark ? edgeCol+'99' : edgeCol+'77',
            hov ? 0.85 : 0.35);
        }
      });

      // ── Nodes (back to front: page/task/goal, then projects) ──
      ['page','task','goal'].forEach(type => {
        nodes.filter(n=>n.type===type).forEach(n => drawNode(ctx, n, hovId, dark));
      });
      nodes.filter(n=>n.type==='project').forEach(n => drawNode(ctx, n, hovId, dark));

      ctx.restore();
    }

    function loop() {
      if (!stateRef.current?.running) return;
      physics(); draw();
      stateRef.current.animId = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      if (stateRef.current) stateRef.current.running=false;
      cancelAnimationFrame(stateRef.current?.animId);
      ro.disconnect();
    };
  }, [projects, pages, tasks, goals]);

  // ── Interaction ───────────────────────────────────────────────────────────
  const worldXY = useCallback((e) => {
    const s=stateRef.current, cvs=canvasRef.current;
    if (!s||!cvs) return {x:0,y:0};
    const rect=cvs.getBoundingClientRect();
    return {
      x:(e.clientX-rect.left-cvs.width/2-s.tx)/s.scale,
      y:(e.clientY-rect.top-cvs.height/2-s.ty)/s.scale,
    };
  }, []);

  const nodeAt = useCallback((wx,wy) => {
    let best=null, bestD=Infinity;
    stateRef.current?.nodes.forEach(n => {
      const d=Math.hypot(n.x-wx, n.y-wy);
      if (d<n.r+12 && d<bestD) { best=n; bestD=d; }
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
        const cvs=canvasRef.current; const r=cvs.getBoundingClientRect();
        s.tx+=(e.clientX-r.left)-s.drag.lx; s.ty+=(e.clientY-r.top)-s.drag.ly;
        s.drag.lx=e.clientX-r.left; s.drag.ly=e.clientY-r.top;
      }
      return;
    }
    const hov=nodeAt(x,y);
    s.hovId=hov?.id||null;
    if (hov) setHovered({node:hov,sx:e.clientX,sy:e.clientY});
    else setHovered(null);
    canvasRef.current.style.cursor = hov ? 'pointer' : 'grab';
  }, [worldXY, nodeAt]);

  const onMouseDown = useCallback((e) => {
    const s=stateRef.current; if (!s) return;
    const {x,y}=worldXY(e); const hov=nodeAt(x,y);
    const cvs=canvasRef.current; const r=cvs.getBoundingClientRect();
    if (hov) s.drag={type:'node',id:hov.id,ox:hov.x-x,oy:hov.y-y};
    else s.drag={type:'pan',lx:e.clientX-r.left,ly:e.clientY-r.top};
  }, [worldXY, nodeAt]);

  const onMouseUp = useCallback(() => {
    const s=stateRef.current; if (!s) return;
    if (s.drag?.type==='node') { const n=s.nm[s.drag.id]; if(n) n.pinned=false; }
    s.drag=null;
  }, []);

  const onClick = useCallback((e) => {
    const {x,y}=worldXY(e); const hov=nodeAt(x,y);
    if (hov?.type==='project' && onOpenProject) onOpenProject(hov.data);
  }, [worldXY, nodeAt, onOpenProject]);

  const onWheel = useCallback((e) => {
    e.preventDefault();
    const s=stateRef.current; if (!s) return;
    const cvs=canvasRef.current; const r=cvs.getBoundingClientRect();
    const mx=(e.clientX-r.left-cvs.width/2)/s.scale;
    const my=(e.clientY-r.top-cvs.height/2)/s.scale;
    const factor = e.deltaY<0 ? 1.1 : 0.9;
    const ns = Math.min(4, Math.max(0.12, s.scale*factor));
    s.tx -= mx*(ns-s.scale); s.ty -= my*(ns-s.scale);
    s.scale=ns;
  }, []);

  const resetView = () => { const s=stateRef.current; if(s){s.tx=0;s.ty=0;s.scale=1;} };

  const LEGEND = [
    { color:'#3f3f46', label:'Project', shape:'circle' },
    { color:TYPE.page.border,  label:'Page',    shape:'circle' },
    { color:TYPE.task.border,  label:'Task',    shape:'circle' },
    { color:TYPE.goal.border,  label:'Goal',    shape:'circle' },
  ];

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
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="5" cy="5" r="2"/><circle cx="19" cy="5" r="2"/>
            <circle cx="12" cy="19" r="2"/>
            <line x1="5" y1="7" x2="12" y2="17"/><line x1="19" y1="7" x2="12" y2="17"/>
          </svg>
          <span className="gv__bar-title">Graph</span>
          <span className="gv__bar-pill">{nodeCount} nodes</span>
        </div>
        <div className="gv__bar-right">
          <button className="gv__btn" onClick={resetView}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            Reset
          </button>
          <div className="gv__sep"/>
          <button className="gv__close-btn" onClick={onClose}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="gv__legend">
        {LEGEND.map(l => (
          <span key={l.label} className="gv__leg">
            <span className="gv__leg-dot" style={{background:l.color}}/>
            {l.label}
          </span>
        ))}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div className="gv__tip" style={{
          left: Math.min(hovered.sx+16, window.innerWidth-200),
          top:  Math.min(hovered.sy+14, window.innerHeight-100),
        }}>
          <span className="gv__tip-type">{hovered.node.type}</span>
          <span className="gv__tip-name">{hovered.node.label}</span>
          {hovered.node.type==='project' && <span className="gv__tip-cta">Click to open →</span>}
        </div>
      )}

      <div className="gv__hint">Scroll to zoom · Drag to pan · Click project to open</div>
    </div>
  );
}
