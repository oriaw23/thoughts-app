import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ProjectPicker from './ProjectPicker';
import Chat from './Chat';
import MeetingsPage from './MeetingsPage';
import AIAgentsPage from './AIAgentsPage';
import DocPage from './DocPage';
import EmailPage from './EmailPage';
import './Pages.css';

// ── Block helpers ─────────────────────────────────────────────────────────────
export function freshBlock(type = 'paragraph', text = '') {
  const b = { id: uuidv4(), type, text };
  if (type === 'todo')     b.done = false;
  if (type === 'callout')  b.icon = '💡';
  if (type === 'table')    b.rows = [['Column 1','Column 2','Column 3'],['','','']];
  if (type === 'board')    b.cols = [
    {id:uuidv4(),title:'To Do',cards:[]},
    {id:uuidv4(),title:'In Progress',cards:[]},
    {id:uuidv4(),title:'Done',cards:[]},
  ];
  if (type === 'timeline') b.items = [{id:uuidv4(),date:'',text:''}];
  if (type === 'gallery')  b.items = [1,2,3,4].map(()=>({id:uuidv4(),caption:''}));
  if (type === 'cards')    b.cards = [
    {id:uuidv4(),text:''}, {id:uuidv4(),text:''}, {id:uuidv4(),text:''},
  ];
  if (type === 'pageref')  { b.refId = ''; b.refTitle = ''; b.refIcon = '📄'; }
  if (type === 'map')      { b.places = []; b.activeId = null; }
  if (type === 'journal')  { b.date = new Date().toISOString().slice(0,10); b.mood = null; }
  if (type === 'subpage')  { b.title = ''; b.icon = '📄'; b.content = ''; }
  return b;
}
export function parseContent(raw) {
  if (!raw?.trim()) return [freshBlock()];
  try { const p=JSON.parse(raw); if(Array.isArray(p)&&p.length) return p; } catch {}
  return [{id:uuidv4(),type:'paragraph',text:raw}];
}
const NEXT = {bullet:'bullet',numbered:'numbered',todo:'todo'};
const TRIGGERS = [
  {prefix:'###',type:'heading3'},{prefix:'##',type:'heading2'},{prefix:'#',type:'heading1'},
  {prefix:'-',type:'bullet'},{prefix:'*',type:'bullet'},{prefix:'>',type:'quote'},
  {prefix:'[]',type:'todo'},{prefix:'1.',type:'numbered'},{prefix:'```',type:'code'},
];
const PAGE_ICONS = [
  '📄','📝','📃','🗒️','📑','📜','🗞️',
  '💡','🎯','📊','🗂️','📚','🔖','📋','🗓️','📅','🗃️','🗄️',
  '✨','🛠️','🔧','🔨','⚙️','🔩','🧰',
  '🎨','🌟','💭','🔮','⚡','🧠','🚀','🛸',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍',
  '🏗️','🎵','🎶','🎸','🎹','🥁',
  '🌿','🌱','🌲','🌊','🌈','☀️','🌙','⭐',
  '🔥','❄️','💨','🌪️',
  '🏆','🥇','🎖️','🎗️','🏅',
  '📌','📍','🗺️','🧭','🔍','🔎','🔑','🗝️',
  '💰','💎','👑','🎁','🎉','🎊','🎈',
  '🤖','👾','🦄','🐉','🦁','🐺','🦊',
  '🍎','🍕','☕','🧃','🍀','🌻',
  '🏠','🏢','🏖️','🌍','🗽',
  '✅','❌','⚠️','💬','📢','📣','🔔','🔕',
];
const CARD_COLORS = ['#fff9c4','#fce7f3','#dbeafe','#d1fae5','#ede9fe','#ffedd5','#fef3c7','#f0fdf4','#fdf4ff','#ecfeff'];
const TOOLBAR_GROUPS = [
  {items:[{type:'heading1',icon:'H1',label:'Heading 1'},{type:'heading2',icon:'H2',label:'Heading 2'},{type:'heading3',icon:'H3',label:'Heading 3'},{type:'paragraph',icon:'¶',label:'Text'}]},
  {items:[{type:'bullet',icon:'•',label:'Bullet'},{type:'numbered',icon:'1.',label:'Numbered'},{type:'todo',icon:'☑',label:'To-do'}]},
  {items:[{type:'quote',icon:'"',label:'Quote'},{type:'code',icon:'</>',label:'Code'},{type:'callout',icon:'💡',label:'Callout'},{type:'divider',icon:'—',label:'Divider'}]},
  {items:[{type:'table',icon:'⊞',label:'Table'},{type:'board',icon:'⊟',label:'Board'},{type:'gallery',icon:'🖼',label:'Gallery'},{type:'timeline',icon:'⏱',label:'Timeline'},{type:'cards',icon:'▦',label:'Cards'}]},
  {items:[{type:'pageref',icon:'🔗',label:'Link Page'},{type:'subpage',icon:'📑',label:'Sub-page'}]},
  {items:[{type:'map',icon:'🗺',label:'Map'},{type:'journal',icon:'📓',label:'Journal'}]},
];

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoPlus   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IcoFolder = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const IcoChevron= ({open}) => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{transform:open?'rotate(0)':'rotate(-90deg)',transition:'transform .16s'}}><polyline points="6 9 12 15 18 9"/></svg>;
const IcoDots   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>;
const IcoTrash  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>;
const IcoEdit   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const IcoSide   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IcoX      = () => <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IcoSubFolder = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="12" x2="12" y2="17"/><line x1="9.5" y1="14.5" x2="14.5" y2="14.5"/></svg>;
const IcoStar   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
const IcoSearch = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;

// ── Page metadata constants ───────────────────────────────────────────────────
const PRIORITY_META = {
  high:   { label: 'High',   color: '#ef4444', dot: '🔴' },
  medium: { label: 'Medium', color: '#f59e0b', dot: '🟡' },
  low:    { label: 'Low',    color: '#22c55e', dot: '🟢' },
};
const FOLDER_COLORS = ['#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#64748b'];
const COVER_COLORS = [
  '#ef4444','#f97316','#f59e0b','#84cc16','#10b981','#06b6d4','#3b82f6','#8b5cf6','#ec4899','#f43f5e',
  '#fca5a5','#fdba74','#fde68a','#bbf7d0','#6ee7b7','#a5f3fc','#bfdbfe','#ddd6fe','#fbcfe8','#fecdd3',
  '#1e293b','#334155','#475569','#64748b','#94a3b8','#e2e8f0',
  'linear-gradient(135deg,#667eea,#764ba2)','linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)','linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)','linear-gradient(135deg,#a18cd1,#fbc2eb)',
];

// ── Sources storage ───────────────────────────────────────────────────────────
const MEDIA_KEY = 'thoughts_media_v1';
function loadMedia() {
  try {
    const d = JSON.parse(localStorage.getItem(MEDIA_KEY) || '{}');
    return {
      links:    d.links    || [],
      images:   d.images   || [],
      files:    d.files    || [],
      linkCats: d.linkCats || ['Work','Learning','Research','Inspiration'],
    };
  } catch { return { links:[], images:[], files:[], linkCats:['Work','Learning','Research','Inspiration'] }; }
}
function saveMedia(d) { localStorage.setItem(MEDIA_KEY, JSON.stringify(d)); }
function getYTThumb(url) { const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m?`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`:null; }
function fmtBytes(b) { if(b<1024) return b+'B'; if(b<1048576) return (b/1024).toFixed(1)+'KB'; return (b/1048576).toFixed(1)+'MB'; }

// ── Main component ────────────────────────────────────────────────────────────
const MEDIA_ID = '__media__';
const AI_ID    = '__ai__';

// ── Horizontal scroll track for split panes ───────────────────────────────────
function PaneScrollTrack({ info, contentRowRef, splitCount }) {
  const { left, scrollW, clientW } = info;
  const hasOverflow = scrollW > clientW + 1;

  // Show whenever 4+ pages are open OR there's real overflow
  if (splitCount < 3 && !hasOverflow) return null;

  const thumbPct  = hasOverflow ? Math.max(8, Math.min(96, (clientW / scrollW) * 100)) : 100;
  const thumbLeft = (hasOverflow && scrollW > clientW)
    ? (100 - thumbPct) * (left / (scrollW - clientW))
    : 0;

  function onTrackClick(e) {
    if (e.target !== e.currentTarget) return;
    const el = contentRowRef.current;
    if (!el || !hasOverflow) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = (e.clientX - rect.left) / rect.width;
    el.scrollLeft = frac * (el.scrollWidth - el.clientWidth);
  }

  function onThumbDown(e) {
    if (!hasOverflow) return;
    e.stopPropagation();
    e.preventDefault();
    const el = contentRowRef.current;
    if (!el) return;
    const startX    = e.clientX;
    const startLeft = el.scrollLeft;
    const maxScroll = el.scrollWidth - el.clientWidth;
    const trackW    = e.currentTarget.parentElement?.clientWidth || 1;
    const thumbWPx  = (thumbPct / 100) * trackW;
    const scale     = maxScroll / Math.max(1, trackW - thumbWPx);

    function onMove(me) {
      el.scrollLeft = Math.max(0, Math.min(maxScroll, startLeft + (me.clientX - startX) * scale));
    }
    function onUp() {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  return (
    <div className="pg__scroll-track" onClick={onTrackClick}>
      <div
        className="pg__scroll-thumb"
        style={{
          left: `${thumbLeft.toFixed(3)}%`,
          width: `${thumbPct.toFixed(3)}%`,
          cursor: hasOverflow ? 'grab' : 'default',
        }}
        onMouseDown={onThumbDown}
      />
    </div>
  );
}

export default function Pages({
  folders=[], pages=[], activePageId,
  onSelectPage, onCreatePage, onUpdatePage, onDeletePage,
  onCreateFolder, onUpdateFolder, onDeleteFolder, onReorderFolders,
  onViewChange,
}) {
  const [iconPicker, setIconPicker] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [panelOpen, setPanelOpen]   = useState(true);
  const [sideOpen, setSideOpen]     = useState(false);
  const [metaOpen, setMetaOpen]     = useState(true);
  const undoRedoRef = useRef({ undo: () => {}, redo: () => {} });
  const panelRef   = useRef(true);
  const closeTimer = useRef(null);
  const [dragFolderIdx,     setDragFolderIdx]     = useState(null);
  const [dragOverFolderIdx, setDragOverFolderIdx] = useState(null);

  // Tabs — only pages, plus the permanent Media tab
  const [tabs, setTabs]               = useState([]);
  const [activeTabId, setActiveTabId] = useState(null);
  const [dragTabIdx,     setDragTabIdx]     = useState(null);
  const [dragOverTabIdx, setDragOverTabIdx] = useState(null);

  // Floating page window
  const [floatPage, setFloatPage] = useState(null);
  const [floatPos,  setFloatPos]  = useState({ x:120, y:80 });

  // Tab link colors — shared color between connected tabs
  const TAB_COLORS = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#a855f7'];
  const TC_KEY = 'thoughts_tab_colors';
  const [tabColors, setTabColors] = useState(() => {
    try { return JSON.parse(localStorage.getItem(TC_KEY) || '{}'); } catch { return {}; }
  });
  const saveTabColors = (next) => { setTabColors(next); localStorage.setItem(TC_KEY, JSON.stringify(next)); };
  const linkTabColors = (idA, idB) => {
    // Find if either already has a color
    const existing = tabColors[idA] || tabColors[idB];
    // Otherwise pick the next unused color
    const usedColors = new Set(Object.values(tabColors));
    const pick = existing || TAB_COLORS.find(c => !usedColors.has(c)) || TAB_COLORS[0];
    saveTabColors({ ...tabColors, [idA]: pick, [idB]: pick });
  };
  const clearTabColor = (id) => {
    const next = { ...tabColors };
    delete next[id];
    saveTabColors(next);
  };

  // Search bar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen,  setSearchOpen]  = useState(false);
  const searchRef = useRef(null);
  useEffect(() => {
    if (!searchOpen) return;
    const close = e => { if (!searchRef.current?.contains(e.target)) setSearchOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [searchOpen]);

  // Page metadata: priority + group dropdowns (fixed-positioned to escape overflow)
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [groupOpen,    setGroupOpen]    = useState(false);
  const [priorityPos,  setPriorityPos]  = useState(null);
  const [groupPos,     setGroupPos]     = useState(null);
  const priorityBtnRef = useRef(null);
  const groupBtnRef    = useRef(null);
  const priorityRef    = useRef(null);
  const groupRef       = useRef(null);

  const openPriority = () => {
    if (priorityBtnRef.current) {
      const r = priorityBtnRef.current.getBoundingClientRect();
      setPriorityPos({ top: r.bottom + 4, left: r.left });
    }
    setPriorityOpen(o => !o); setGroupOpen(false);
  };
  const openGroup = () => {
    if (groupBtnRef.current) {
      const r = groupBtnRef.current.getBoundingClientRect();
      setGroupPos({ top: r.bottom + 4, left: r.left });
    }
    setGroupOpen(o => !o); setPriorityOpen(false);
  };
  useEffect(() => {
    if (!priorityOpen && !groupOpen) return;
    const close = e => {
      if (!priorityRef.current?.contains(e.target)) setPriorityOpen(false);
      if (!groupRef.current?.contains(e.target))    setGroupOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [priorityOpen, groupOpen]);

  // Groups from localStorage
  const [groups, setGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mynotion_groups_v1') || '[]'); } catch { return []; }
  });
  useEffect(() => {
    try { const raw = localStorage.getItem('mynotion_groups_v1'); if (raw) setGroups(JSON.parse(raw)); } catch {}
  }, []);

  // Cover (banner / color) state
  const bannerInputRef  = useRef(null);
  const coverPickerRef  = useRef(null);
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);
  const triggerBannerPick = () => { bannerInputRef.current?.click(); setCoverPickerOpen(false); };
  const onBannerFile = (e) => {
    const file = e.target.files?.[0];
    if (!file || !currentPage) return;
    const reader = new FileReader();
    reader.onload = ev => onUpdatePage(currentPage.id, { banner: ev.target.result, coverColor: null });
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  useEffect(() => {
    if (!coverPickerOpen) return;
    const close = e => { if (!coverPickerRef.current?.contains(e.target)) setCoverPickerOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [coverPickerOpen]);

  const [quickView,  setQuickView]  = useState(null);
  const [quickView2, setQuickView2] = useState(null); // secondary panel inside overlay
  const [quickSplit, setQuickSplit] = useState(null); // side-pane mode
  const [showQB,     setShowQB]     = useState(false);

  const QV_ITEMS = [
    { label:'Meetings',  color:'#10b981', view:'meetings'  },
    { label:'AI Agents', color:'#3b82f6', view:'ai-agents' },
    { label:'Doc',       color:'#f59e0b', view:'doc'       },
    { label:'Email',     color:'#ef4444', view:'email'     },
  ];

  const openQuick = (view) => {
    setQuickView(q => q === view ? null : view);
    setQuickView2(null);
    setQuickSplit(null);
    setShowQB(true);
  };
  const openSplit = (view) => {
    setQuickSplit(view);
    setQuickView(null);
    setQuickView2(null);
  };

  // Split panes: array of pageIds shown alongside the main editor
  const [splitPages,      setSplitPages]    = useState([]);
  const [dragOverEditor,  setDragOverEditor] = useState(false);
  const [focusedPane,     setFocusedPane]   = useState('main');
  const [paneWidths,      setPaneWidths]    = useState({}); // pageId -> px width
  const [draggingPane, setDraggingPane] = useState(null);
  const [dropTarget,   setDropTarget]   = useState(null); // { id, side:'before'|'after' }
  const resizingRef    = useRef(null);
  const contentRowRef  = useRef(null);
  const paneElsRef     = useRef({});
  // Track which pane the mouse is over → Add block goes to that pane
  const hoveredPaneRef  = useRef(null); // null = not hovering any split pane → use main
  const paneInsertRefs  = useRef({}); // pageId → stable insertBlock fn

  // Scroll-track state ─────────────────────────────────────────────────────────
  const [scrollInfo, setScrollInfo] = useState({ left: 0, scrollW: 1, clientW: 1 });
  const updateScrollInfo = useCallback(() => {
    const el = contentRowRef.current;
    if (!el) return;
    setScrollInfo({ left: el.scrollLeft, scrollW: el.scrollWidth, clientW: el.clientWidth });
  }, []);
  // Re-measure after splitPages changes (RAF lets DOM settle first)
  useEffect(() => {
    const id = requestAnimationFrame(updateScrollInfo);
    return () => cancelAnimationFrame(id);
  }, [splitPages, updateScrollInfo]);
  // Re-measure on container resize
  useEffect(() => {
    const el = contentRowRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollInfo);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateScrollInfo]);

  // Convert vertical wheel scroll to horizontal when panes overflow
  const onContentRowWheel = useCallback((e) => {
    const el = contentRowRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    e.preventDefault();
    el.scrollBy({ left: e.deltaY + e.deltaX, behavior: 'smooth' });
  }, []);

  // Pointer drag: click+drag anywhere in the content row to scroll horizontally
  const onContentRowPointerDown = useCallback((e) => {
    if (e.button !== 0) return;
    const el = contentRowRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    // Skip interactive targets
    const t = e.target;
    if (t.isContentEditable || t.closest('[contenteditable]')) return;
    if (t.closest('button, input, textarea, select, a')) return;

    const startX    = e.clientX;
    const startLeft = el.scrollLeft;
    let dragging = false;

    function onMove(me) {
      const dx = me.clientX - startX;
      if (!dragging && Math.abs(dx) < 5) return;
      dragging = true;
      el.scrollLeft = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, startLeft - dx));
    }
    function onUp() {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup',   onUp);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup',   onUp);
  }, []);

  // FLIP: record positions → reorder → animate from old to new
  const flipReorder = useCallback((doReorder) => {
    const row = contentRowRef.current;
    if (!row) { doReorder(); return; }
    const panes = row.querySelectorAll('[data-paneid]');
    const before = {};
    panes.forEach(el => { before[el.dataset.paneid] = el.getBoundingClientRect().left; });
    doReorder();
    requestAnimationFrame(() => {
      const panesAfter = row.querySelectorAll('[data-paneid]');
      panesAfter.forEach(el => {
        const id  = el.dataset.paneid;
        const dx  = (before[id] ?? el.getBoundingClientRect().left) - el.getBoundingClientRect().left;
        if (Math.abs(dx) < 1) return;
        el.style.transition = 'none';
        el.style.transform  = `translateX(${dx}px)`;
        requestAnimationFrame(() => {
          el.style.transition = 'transform 0.26s cubic-bezier(0.4,0,0.2,1)';
          el.style.transform  = '';
          el.addEventListener('transitionend', () => { el.style.transition = ''; }, { once: true });
        });
      });
    });
  }, []);

  const addSplitPane   = (pageId) => { if (!splitPages.includes(pageId)) setSplitPages(p => [...p, pageId]); };
  const removeSplitPane = (pageId) => {
    setSplitPages(p => p.filter(id => id !== pageId));
    setFocusedPane('main');
    if (hoveredPaneRef.current === pageId) hoveredPaneRef.current = 'main';
  };

  // Resize drag handlers
  const startResize = useCallback((pageId, e) => {
    e.preventDefault();
    const startWidth = paneWidths[pageId] || 340;
    resizingRef.current = { pageId, startX: e.clientX, startWidth };
    const onMove = (ev) => {
      if (!resizingRef.current) return;
      const { pageId: id, startX, startWidth: sw } = resizingRef.current;
      const delta = startX - ev.clientX; // dragging left handle: drag right = wider
      const newW  = Math.max(200, Math.min(700, sw + delta));
      setPaneWidths(p => ({ ...p, [id]: newW }));
    };
    const onUp = () => { resizingRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [paneWidths]);

  const currentPage  = pages.find(p => p.id === activePageId) || null;
  const ungrouped    = pages.filter(p => !p.folderId);
  const isMediaActive = activeTabId === MEDIA_ID;
  const isAIActive    = activeTabId === AI_ID;

  // Keep tab titles in sync with page edits
  useEffect(() => {
    setTabs(prev => prev.map(t => {
      const pg = pages.find(p => p.id === t.refId);
      return pg ? { ...t, title: pg.title || 'Untitled', icon: pg.icon } : t;
    }));
  }, [pages]);

  // Auto-open a tab when activePageId changes externally (e.g. sidebar click)
  useEffect(() => {
    if (!activePageId) return;
    const pg = pages.find(p => p.id === activePageId);
    if (!pg) return;
    setTabs(prev => {
      const existing = prev.find(t => t.refId === activePageId);
      if (existing) {
        // Tab exists — activate it if not already active
        setActiveTabId(id => id === existing.id ? id : existing.id);
        return prev;
      }
      // New tab needed
      const tab = { id: uuidv4(), refId: pg.id, title: pg.title || 'Untitled', icon: pg.icon };
      setTimeout(() => setActiveTabId(tab.id), 0);
      return [...prev, tab];
    });
  }, [activePageId]);

  // Panel hover
  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const fromRight = rect.right - e.clientX;
    if (!panelRef.current && fromRight < 18) {
      clearTimeout(closeTimer.current); closeTimer.current = null;
      panelRef.current = true; setPanelOpen(true);
    } else if (panelRef.current && fromRight > 260) {
      if (!closeTimer.current)
        closeTimer.current = setTimeout(() => { panelRef.current=false; setPanelOpen(false); closeTimer.current=null; }, 420);
    } else if (panelRef.current && fromRight <= 260) {
      clearTimeout(closeTimer.current); closeTimer.current = null;
    }
  }, []);

  // Open a page as a tab
  const openPage = (page) => {
    onSelectPage(page.id);
    const existing = tabs.find(t => t.refId === page.id);
    if (existing) { setActiveTabId(existing.id); return; }
    const tab = { id:uuidv4(), refId:page.id, title:page.title||'Untitled', icon:page.icon };
    setTabs(p => [...p, tab]);
    setActiveTabId(tab.id);
  };

  // Clicking a folder just expands/collapses — no tab
  const toggleFolder = (folder) => {
    onUpdateFolder(folder.id, { collapsed: !folder.collapsed });
  };

  // Activate a tab
  const activateTab = (tab) => {
    setActiveTabId(tab.id);
    setQuickView(null);
    setQuickView2(null);
    setQuickSplit(null);
    setShowQB(false);
    const pg = pages.find(p => p.id === tab.refId);
    if (pg) onSelectPage(pg.id);
  };

  // Close a tab — also removes it from the split pane if open
  const closeTab = (tabId, e) => {
    e?.stopPropagation();
    const closing = tabs.find(t => t.id === tabId);
    const idx  = tabs.findIndex(t => t.id === tabId);
    const next = tabs.filter(t => t.id !== tabId);
    setTabs(next);
    if (closing?.refId) removeSplitPane(closing.refId);
    if (activeTabId === tabId) {
      const fallback = next[Math.max(0, idx - 1)];
      setActiveTabId(fallback?.id || null);
      if (fallback) { const pg=pages.find(p=>p.id===fallback.refId); if(pg) onSelectPage(pg.id); }
    }
  };

  // Color-group collapse/expand
  const [collapsedColors, setCollapsedColors] = useState(new Set());
  const toggleColorGroup = (color) => {
    setCollapsedColors(prev => {
      const next = new Set(prev);
      if (next.has(color)) next.delete(color); else next.add(color);
      return next;
    });
  };

  // Color dot right-click context menu
  const [dotMenu, setDotMenu] = useState(null); // { refId, x, y }

  // Tab reorder: track where the dragged tab should be inserted
  const [dragInsert, setDragInsert] = useState(null); // { idx, side:'before'|'after' }

  const reorderTab = () => {
    if (dragTabIdx === null || !dragInsert) return;
    const { idx: toIdx, side } = dragInsert;
    if (dragTabIdx === toIdx) return;
    const next = [...tabs];
    const [moved] = next.splice(dragTabIdx, 1);
    let at = toIdx;
    if (dragTabIdx < toIdx) at--;          // account for removal shifting indices
    if (side === 'after') at++;
    at = Math.max(0, Math.min(next.length, at));
    next.splice(at, 0, moved);
    setTabs(next);
  };
  const clearTabDrag = () => { setDragTabIdx(null); setDragInsert(null); setDragOverTabIdx(null); };

  const handleNewPage = (folderId=null) => {
    const id = onCreatePage(folderId);
    if (!id) return;
    setQuickView(null);
    // Create the tab immediately and activate it — don't rely on the useEffect+setTimeout
    const tab = { id: uuidv4(), refId: id, title: 'Untitled', icon: '📄' };
    setTabs(prev => prev.some(t => t.refId === id) ? prev : [...prev, tab]);
    setActiveTabId(tab.id);
  };
  const handleNewFolder = () => {
    const id = onCreateFolder('New Folder');
    if (id) setTimeout(() => setEditingFolder({id,name:'New Folder'}), 60);
  };
  const handleNewSubFolder = (parentId, onCreated) => {
    const id = onCreateFolder('New Sub-folder', parentId);
    if (id) setTimeout(() => onCreated?.(id), 60);
  };
  const commitRename = () => {
    if (editingFolder?.name.trim()) onUpdateFolder(editingFolder.id,{name:editingFolder.name.trim()});
    setEditingFolder(null);
  };
  const handleFolderDrop = () => {
    if (dragFolderIdx!==null && dragOverFolderIdx!==null && dragFolderIdx!==dragOverFolderIdx) {
      const top = folders.filter(f => !f.parentId);
      const next = [...top]; const [m]=next.splice(dragFolderIdx,1); next.splice(dragOverFolderIdx,0,m);
      onReorderFolders([...next, ...folders.filter(f => f.parentId)]);
    }
    setDragFolderIdx(null); setDragOverFolderIdx(null);
  };

  const topFolders = folders.filter(f => !f.parentId);
  const pageFolder = currentPage?.folderId ? folders.find(f=>f.id===currentPage.folderId) : null;
  const pageFolderParent = pageFolder?.parentId ? folders.find(f=>f.id===pageFolder.parentId) : null;

  return (
    <div className={`pg${quickView?' pg--qv':''}`} onMouseMove={handleMouseMove} onClick={() => setIconPicker(false)}>

      {/* ── Right panel ── */}
      <div className={`pg__panel-wrap${panelOpen?'':' pg__panel-wrap--closed'}`}>
        <aside className="pg__panel">
          <div className="pg__panel-head">
            <span className="pg__panel-title">PAGES</span>
            <div className="pg__panel-actions">
              <button className="pg__head-btn" onClick={handleNewFolder} title="New Folder"><IcoFolder /></button>
              <button className="pg__head-btn" onClick={() => handleNewPage(null)} title="New Page"><IcoPlus /></button>
            </div>
          </div>

          <div className="pg__tree-wrap">
            <div className="pg__tree">
            {topFolders.map((folder, idx) => (
              <FolderItem key={folder.id} folder={folder}
                pages={pages.filter(p => p.folderId === folder.id)}
                subFolders={folders.filter(f => f.parentId === folder.id)}
                allPages={pages}
                activePageId={activePageId}
                isEditing={editingFolder?.id === folder.id}
                editingName={editingFolder?.name ?? ''}
                onEditingNameChange={name => setEditingFolder(f => ({...f,name}))}
                onStartRename={() => setEditingFolder({id:folder.id,name:folder.name})}
                onCommitRename={commitRename}
                onToggleCollapse={() => toggleFolder(folder)}
                onAddPage={(subfolderId) => handleNewPage(subfolderId || folder.id)}
                onAddSubFolder={(cb) => handleNewSubFolder(folder.id, cb)}
                onUpdateFolder={onUpdateFolder}
                onUpdateSubFolder={onUpdateFolder}
                onDeleteSubFolder={onDeleteFolder}
                onDelete={() => onDeleteFolder(folder.id)}
                onPageClick={page => openPage(page)}
                onPageDelete={onDeletePage}
                isDragOver={dragOverFolderIdx === idx}
                onDragStart={() => setDragFolderIdx(idx)}
                onDragOver={e => { e.preventDefault(); setDragOverFolderIdx(idx); }}
                onDrop={handleFolderDrop}
                onDragEnd={() => { setDragFolderIdx(null); setDragOverFolderIdx(null); }}
              />
            ))}
            {ungrouped.map(p => (
              <PageItem key={p.id} page={p}
                active={p.id === activePageId}
                onSelect={() => openPage(p)} onDelete={() => onDeletePage(p.id)} />
            ))}
            {pages.length === 0 && folders.length === 0 && (
              <div className="pg__tree-empty">
                <p>Start by creating a page or folder</p>
                <button onClick={() => handleNewPage(null)}>+ New Page</button>
                <button onClick={handleNewFolder} style={{marginTop:6}}>+ New Folder</button>
              </div>
            )}
            </div>
          </div>

          <div className="pg__panel-foot">
            <button className="pg__foot-btn" onClick={handleNewFolder}><IcoFolder /> New Folder</button>
            <button className="pg__foot-btn" onClick={() => handleNewPage(null)}><IcoPlus /> New Page</button>
          </div>
        </aside>
      </div>
      {!panelOpen && <div className="pg__panel-trigger" />}

      {/* ── Editor area ── */}
      <div className="pg__editor-area">

        {/* Hidden banner file picker */}
        <input ref={bannerInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onBannerFile} />


        {/* Tab bar — permanent Sources tab + page tabs */}
        <div className={`pg__tabbar${panelOpen ? ' pg__tabbar--panel' : ''}`}>

          {/* Permanent Sources tab */}
          <div
            className={`pg__tab pg__tab--pinned${isMediaActive ? ' pg__tab--active' : ''}`}
            onClick={() => setActiveTabId(t => t === MEDIA_ID ? (tabs[0]?.id || null) : MEDIA_ID)}
          >
            <span className="pg__tab-icon">📎</span>
            <span className="pg__tab-title">Sources</span>
          </div>

          {/* Arrow toggle */}
          <button
            className={`pg__qb-arrow${(showQB||!!quickView||!!quickSplit)?' open':''}`}
            onClick={() => setShowQB(p=>!p)}
            title="Quick tools"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
              style={{transform: showQB ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s'}}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Carousel panel with fade-out edges */}
          {showQB && (
            <div className="pg__qb-panel">
              <div className="pg__qb-scroll">
                {QV_ITEMS.map(item => (
                  <button
                    key={item.label}
                    className={`pg__qb-card${quickView===item.view||quickSplit===item.view?' active':''}`}
                    style={{'--qc': item.color}}
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('qv-panel', item.view);
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => openQuick(item.view)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tabs.length > 0 && <div className="pg__tab-sep" />}

          {/* + New page — at the LEFT of the tabs row, new tabs open to its right */}
          <button className="pg__tab-add" onClick={() => handleNewPage(null)} title="New page"><IcoPlus /></button>

          {/* Page tabs — with collapsible color groups */}
          <div className="pg__tabs-scroll">
            {(() => {
              // Build renderable list: individual tabs OR group pills for collapsed colors
              const seenCollapsed = new Set();
              const items = [];
              tabs.forEach((tab, origIdx) => {
                const color = tab.refId ? tabColors[tab.refId] : null;
                if (color && collapsedColors.has(color)) {
                  if (!seenCollapsed.has(color)) {
                    seenCollapsed.add(color);
                    items.push({ isGroup: true, color, groupTabs: tabs.filter(t => t.refId && tabColors[t.refId] === color) });
                  }
                } else {
                  items.push({ isGroup: false, tab, origIdx, color });
                }
              });

              return items.map((item, ri) => {
                if (item.isGroup) {
                  return (
                    <div key={`grp-${item.color}`} className="pg__tab-group"
                      style={{ '--tg': item.color }}
                      onClick={() => toggleColorGroup(item.color)}
                      title={`${item.groupTabs.length} linked tabs — click to expand`}
                    >
                      <span className="pg__tab-group-dot" style={{ background: item.color }} />
                      <span className="pg__tab-group-pages">
                        {item.groupTabs.map(t => <span key={t.id} className="pg__tab-group-icon">{t.icon}</span>)}
                      </span>
                      <span className="pg__tab-group-count">{item.groupTabs.length}</span>
                    </div>
                  );
                }

                const { tab, origIdx, color } = item;
                const isInsertTarget = dragInsert?.idx === origIdx && dragTabIdx !== origIdx;
                const isLinkTarget   = isInsertTarget && dragInsert?.side === 'link';
                return (
                  <div key={tab.id}
                    className={`pg__tab${activeTabId===tab.id?' pg__tab--active':''}${(dragOverTabIdx===origIdx||isLinkTarget)?' pg__tab--dragover':''}${dragTabIdx===origIdx?' pg__tab--dragging':''}`}
                    style={color ? { '--tab-link': color } : {}}
                    onClick={() => activateTab(tab)}
                    draggable
                    onDragStart={e => {
                      setDragTabIdx(origIdx);
                      e.dataTransfer.setData('pg-split-tab', tab.refId || '');
                      e.dataTransfer.effectAllowed = 'all';
                    }}
                    onDragOver={e => {
                      e.preventDefault();
                      if (dragTabIdx !== null) {
                        // Left 30% → insert before, right 30% → insert after, center → link colors
                        const rect = e.currentTarget.getBoundingClientRect();
                        const rel  = (e.clientX - rect.left) / rect.width;
                        const side = rel < 0.3 ? 'before' : rel > 0.7 ? 'after' : 'link';
                        setDragInsert({ idx: origIdx, side });
                      } else {
                        setDragOverTabIdx(origIdx);
                      }
                    }}
                    onDragLeave={() => { if (dragTabIdx !== null) setDragInsert(null); }}
                    onDrop={e => {
                      e.preventDefault();
                      const qvPanel = e.dataTransfer.getData('qv-panel');
                      if (qvPanel) {
                        activateTab(tab); openSplit(qvPanel);
                        clearTabDrag(); return;
                      }
                      if (dragInsert?.side === 'link' && dragTabIdx !== origIdx) {
                        // Center drop → color-link the two tabs
                        const from = tabs[dragTabIdx];
                        const to   = tabs[origIdx];
                        if (from?.refId && to?.refId) linkTabColors(from.refId, to.refId);
                      } else {
                        reorderTab();
                      }
                      clearTabDrag();
                    }}
                    onDragEnd={() => { clearTabDrag(); setDragOverEditor(false); }}
                  >
                    {/* Insert line — left edge */}
                    {isInsertTarget && dragInsert.side === 'before' && (
                      <span className="pg__tab-insert-line pg__tab-insert-line--before" />
                    )}
                    {/* Color dot — left-click: collapse group, right-click: context menu */}
                    {color && (
                      <span className="pg__tab-link-dot" style={{ background: color }}
                        onClick={e => { e.stopPropagation(); toggleColorGroup(color); }}
                        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setDotMenu({ refId: tab.refId, x: e.clientX, y: e.clientY }); }}
                        title="Click to collapse · Right-click to unlink" />
                    )}
                    <span className="pg__tab-icon">{tab.icon}</span>
                    <span className="pg__tab-title">{tab.title || 'Untitled'}</span>
                    {isLinkTarget && <span className="pg__tab-peek-hint">🔗</span>}
                    <button className="pg__tab-x"
                      onClick={e => { closeTab(tab.id, e); if (tab.refId) clearTabColor(tab.refId); }}
                    ><IcoX /></button>
                    {/* Insert line — right edge */}
                    {isInsertTarget && dragInsert.side === 'after' && (
                      <span className="pg__tab-insert-line pg__tab-insert-line--after" />
                    )}
                  </div>
                );
              });
            })()}
          </div>

          {/* Search pill — right side of tabbar */}
          <div className="pg__tab-search" ref={searchRef}>
            <div className="pg__tab-search-inner">
              <IcoSearch />
              <input
                className="pg__tab-search-input"
                placeholder="Search…"
                value={searchQuery}
                onFocus={() => setSearchOpen(true)}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onKeyDown={e => { if (e.key === 'Escape') { setSearchOpen(false); setSearchQuery(''); } }}
              />
            </div>
            {searchOpen && searchQuery.trim() && (
              <div className="pg__search-results">
                {(() => {
                  const q = searchQuery.toLowerCase();
                  const hits = pages.filter(p => (p.title || 'Untitled').toLowerCase().includes(q));
                  if (!hits.length) return <div className="pg__search-empty">No results</div>;
                  return hits.slice(0, 10).map(p => (
                    <button key={p.id} className="pg__search-result"
                      onClick={() => { openPage(p); setSearchOpen(false); setSearchQuery(''); }}>
                      <span className="pg__search-result-icon">{p.icon}</span>
                      <span>{p.title || 'Untitled'}</span>
                    </button>
                  ));
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Floating page window */}
        {floatPage && (
          <FloatingPage
            page={floatPage}
            pos={floatPos}
            onMove={setFloatPos}
            onClose={() => setFloatPage(null)}
            onUpdate={(changes) => onUpdatePage(floatPage.id, changes)}
            onSwitchToTab={() => {
              openPage(floatPage);
              setFloatPage(null);
            }}
          />
        )}

        {/* Horizontal scroll track — visible at 4+ pages or whenever there's overflow */}
        <PaneScrollTrack info={scrollInfo} contentRowRef={contentRowRef} splitCount={splitPages.length} />

        {/* Content row: editor + optional media side panel */}
        <div ref={contentRowRef} className={`pg__content-row${isMediaActive && panelOpen ? ' pg__content-row--panel' : ''}${isAIActive ? ' pg__content-row--ai' : ''}`}
          onWheel={onContentRowWheel} onScroll={updateScrollInfo} onPointerDown={onContentRowPointerDown}>

          {/* Split-pane container */}
          <div className="pg__editor-col" data-paneid="main"
            onFocus={() => setFocusedPane('main')}
            onDragOver={e => {
              const hasSplit = e.dataTransfer.types.includes('pg-split-tab');
              const hasRef   = e.dataTransfer.types.includes('pg-pageref');
              if (hasSplit || hasRef) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragOverEditor(true);
              }
            }}
            onDragLeave={() => setDragOverEditor(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOverEditor(false);
              // Pane reorder drop onto main editor → swap main ↔ split
              if (draggingPane && draggingPane !== 'main') {
                const from = draggingPane;
                setDraggingPane(null); setDropTarget(null);
                flipReorder(() => {
                  const oldMain = activePageId;
                  onSelectPage(from);
                  setSplitPages(p => p.map(id => id === from ? oldMain : id));
                });
                return;
              }
              // Quick-view panel dropped → open as side split
              const qvPanel = e.dataTransfer.getData('qv-panel');
              if (qvPanel) { openSplit(qvPanel); return; }
              // Page tab dropped → open as split pane
              const pageId = e.dataTransfer.getData('pg-split-tab');
              if (pageId && pageId !== activePageId) { addSplitPane(pageId); return; }
              // Sidebar page item dropped → open as split pane
              try {
                const refData = e.dataTransfer.getData('pg-pageref');
                if (refData) {
                  const { id } = JSON.parse(refData);
                  if (id && id !== activePageId) addSplitPane(id);
                }
              } catch {}
            }}
          >
          {/* Drop-to-split hint overlay */}
          {dragOverEditor && (
            <div className="pg__split-drop-hint">
              <span>⊞</span>
              <p>Drop to open side by side</p>
            </div>
          )}
            {currentPage ? (
              <div className="pg__editor" key={currentPage.id}>
                <div className="pg__topbar">
                  {/* LEFT: undo / redo */}
                  {/* LEFT: meta-row + collapse */}
                  <div className="pg__topbar-left">
                    <div className={`pg__meta-row${metaOpen ? '' : ' pg__meta-row--hidden'}`}>
                      <ProjectPicker itemId={currentPage.id} field="pageIds" />
                      <button
                        className={`pg__topbar-btn pg__fav-btn${currentPage.favorite ? ' pg__fav-btn--on' : ''}`}
                        onClick={() => onUpdatePage(currentPage.id, { favorite: !currentPage.favorite })}
                        title={currentPage.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      ><IcoStar /></button>
                      <button ref={priorityBtnRef} className="pg__topbar-btn pg__meta-btn"
                        onClick={openPriority}
                        style={currentPage.priority ? { color: PRIORITY_META[currentPage.priority]?.color } : {}}>
                        {currentPage.priority
                          ? <>{PRIORITY_META[currentPage.priority].dot} {PRIORITY_META[currentPage.priority].label}</>
                          : 'Priority'}
                      </button>
                      <button ref={groupBtnRef} className="pg__topbar-btn pg__meta-btn" onClick={openGroup}>
                        🔗 {currentPage.groupId ? (groups.find(g=>g.id===currentPage.groupId)?.name || 'Group') : 'Group'}
                      </button>
                      <button className={`pg__topbar-btn${sideOpen?' active':''}`} onClick={() => setSideOpen(o=>!o)}>
                        <IcoSide /> Notes
                      </button>
                    </div>
                    <button className="pg__del-btn pg__meta-toggle" onClick={() => setMetaOpen(o=>!o)}
                      title={metaOpen ? 'Hide' : 'Show'}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                        style={{ transform: metaOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition:'transform .2s' }}>
                        <polyline points="6 9 12 15 18 9"/>
                      </svg>
                    </button>
                  </div>
                  {/* RIGHT: undo/redo + trash */}
                  <div className="pg__topbar-right">
                    <div className="pg__undo-wrap">
                      <button className="pg__undo-btn" onClick={() => undoRedoRef.current.undo()} title="Undo">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 10h11a5 5 0 0 1 0 10H8"/><polyline points="3 10 7 6 3 2"/></svg>
                      </button>
                      <div className="pg__undo-sep"/>
                      <button className="pg__undo-btn" onClick={() => undoRedoRef.current.redo()} title="Redo">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10H10a5 5 0 0 0 0 10h6"/><polyline points="21 10 17 6 21 2"/></svg>
                      </button>
                    </div>
                    <div className="pg__topbar-sep"/>
                    <button className="pg__del-btn" onClick={() => onDeletePage(currentPage.id)}><IcoTrash /></button>
                  </div>
                </div>

                <div className={`pg__split${sideOpen?' pg__split--open':''}`}>
                  <div className="pg__writing">
                    {/* ── Cover (image or color) ── */}
                    {(currentPage.banner || currentPage.coverColor) && (
                      <div className="pg__banner"
                        style={currentPage.coverColor && !currentPage.banner
                          ? { background: currentPage.coverColor } : {}}>
                        {currentPage.banner && <img src={currentPage.banner} className="pg__banner-img" alt="" />}
                        <div className="pg__banner-actions">
                          <button onClick={() => setCoverPickerOpen(true)}>Change cover</button>
                          <button onClick={() => onUpdatePage(currentPage.id, { banner: null, coverColor: null })}>Remove</button>
                        </div>
                      </div>
                    )}
                    <div className="pg__writing-inner">
                      {/* Icon row — "Add cover" appears on hover */}
                      <div className="pg__icon-cover-row">
                        <div className="pg__icon-area" onClick={e => e.stopPropagation()}>
                          <button className="pg__icon-btn" onClick={() => setIconPicker(p=>!p)}>
                            <span className="pg__icon-display">{currentPage.icon}</span>
                          </button>
                          {iconPicker && (
                            <div className="pg__icon-picker">
                              {PAGE_ICONS.map(ic => (
                                <button key={ic} onClick={() => { onUpdatePage(currentPage.id,{icon:ic}); setIconPicker(false); }}>{ic}</button>
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Add cover — visible only on icon-row hover, hidden when cover already set */}
                        {!currentPage.banner && !currentPage.coverColor && (
                          <div className="pg__cover-trigger-wrap" ref={coverPickerOpen ? coverPickerRef : null}>
                            <button className="pg__add-cover-btn"
                              onClick={() => setCoverPickerOpen(o => !o)}>
                              + Add cover
                            </button>
                            {coverPickerOpen && (
                              <div className="pg__cover-picker" ref={coverPickerRef}>
                                <div className="pg__cover-picker-colors">
                                  {COVER_COLORS.map(c => (
                                    <button key={c} className="pg__cover-color-swatch"
                                      style={{ background: c }}
                                      onClick={() => { onUpdatePage(currentPage.id, { coverColor: c, banner: null }); setCoverPickerOpen(false); }}
                                    />
                                  ))}
                                </div>
                                <div className="pg__cover-picker-sep" />
                                <button className="pg__cover-upload-btn" onClick={triggerBannerPick}>
                                  🖼 Upload photo
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <input className="pg__title" value={currentPage.title} dir="auto"
                        onChange={e => onUpdatePage(currentPage.id,{title:e.target.value})}
                        placeholder="Untitled" />
                      <BlockEditor pageId={currentPage.id} content={currentPage.content||''}
                        onChange={val => onUpdatePage(currentPage.id,{content:val})}
                        pages={pages} onSelectPage={onSelectPage}
                        undoRedoRef={undoRedoRef}
                        onRegisterInsert={fn => { paneInsertRefs.current['main'] = fn; }}
                        getTargetInsert={() => {
                          const id = hoveredPaneRef.current;
                          return (id && paneInsertRefs.current[id]) || paneInsertRefs.current['main'];
                        }}
                      />

                      {/* ── Connections panel ── */}
                      {(() => {
                        const getPageRefs = (p) => { try { const bs=JSON.parse(p.content||'[]'); return bs.filter(b=>b.type==='pageref'&&b.refId).map(b=>b.refId); } catch{return[];} };
                        const linksTo   = getPageRefs(currentPage).map(id=>pages.find(p=>p.id===id)).filter(Boolean);
                        const linksFrom = pages.filter(p=>p.id!==currentPage.id&&getPageRefs(p).includes(currentPage.id));
                        if (!linksTo.length && !linksFrom.length) return null;
                        return (
                          <div className="pg__connections">
                            <div className="pg__connections-title">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                              Connections
                            </div>
                            {linksTo.length > 0 && (
                              <div className="pg__connections-group">
                                <p className="pg__connections-label">Links to</p>
                                <div className="pg__connections-list">
                                  {linksTo.map(p=>(
                                    <button key={p.id} className="pg__conn-chip" onClick={()=>onSelectPage(p.id)}>
                                      <span>{p.icon}</span><span>{p.title||'Untitled'}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {linksFrom.length > 0 && (
                              <div className="pg__connections-group">
                                <p className="pg__connections-label">Linked from</p>
                                <div className="pg__connections-list">
                                  {linksFrom.map(p=>(
                                    <button key={p.id} className="pg__conn-chip" onClick={()=>onSelectPage(p.id)}>
                                      <span>{p.icon}</span><span>{p.title||'Untitled'}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  {sideOpen && (
                    <StickyCards pageId={currentPage.id} raw={currentPage.sideContent||''}
                      onChange={val => onUpdatePage(currentPage.id,{sideContent:val})}
                      onClose={() => setSideOpen(false)} />
                  )}
                </div>
              </div>
            ) : (
              <div className="pg__empty-state">
                <div className="pg__empty-icon">📄</div>
                <h3>Select a page to start writing</h3>
                <p>Or create a new page or folder</p>
                <div className="pg__empty-btns">
                  <button className="pg__empty-new" onClick={() => handleNewPage(null)}>+ New Page</button>
                  <button className="pg__empty-folder" onClick={handleNewFolder}><IcoFolder /> New Folder</button>
                </div>
              </div>
            )}
          </div>

          {/* ── Split panes (one per dropped tab) ── */}
          {splitPages.map(pageId => {
            const pg = pages.find(p => p.id === pageId);
            if (!pg) return null;
            const dt = dropTarget?.id === pageId ? dropTarget.side : null;
            return (
              <SplitPane
                key={pageId}
                page={pg}
                focused={focusedPane === pageId}
                width={paneWidths[pageId] || 340}
                setEl={el => { if (el) paneElsRef.current[pageId] = el; else delete paneElsRef.current[pageId]; }}
                isDragging={draggingPane === pageId}
                dropIndicator={dt}
                onFocus={() => setFocusedPane(pageId)}
                onClose={() => removeSplitPane(pageId)}
                onUpdate={changes => onUpdatePage(pg.id, changes)}
                pages={pages}
                onSelectPage={onSelectPage}
                groups={groups}
                onPaneMouseEnter={() => { hoveredPaneRef.current = pageId; }}
                paneInsertRefs={paneInsertRefs}
                onStartResize={e => startResize(pageId, e)}
                onDragStart={e => {
                  const ghost = new Image();
                  ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  e.dataTransfer.effectAllowed = 'move';
                  setDraggingPane(pageId);
                  setDropTarget(null);
                }}
                onDragEnd={() => { setDraggingPane(null); setDropTarget(null); }}
                onDragOver={e => {
                  e.preventDefault();
                  if (!draggingPane || draggingPane === pageId) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const side = e.clientX < rect.left + rect.width / 2 ? 'before' : 'after';
                  setDropTarget({ id: pageId, side });
                }}
                onDragLeave={() => setDropTarget(null)}
                onDrop={e => {
                  e.preventDefault();
                  if (!draggingPane || !dropTarget) return;
                  const from = draggingPane;
                  const { id: toId, side } = dropTarget;
                  setDraggingPane(null);
                  setDropTarget(null);
                  if (from === 'main') {
                    flipReorder(() => {
                      const oldMain = activePageId;
                      onSelectPage(toId);
                      setSplitPages(p => p.map(id => id === toId ? oldMain : id));
                    });
                    return;
                  }
                  flipReorder(() => setSplitPages(prev => {
                    const next = prev.filter(id => id !== from);
                    const ti = next.indexOf(toId);
                    next.splice(side === 'after' ? ti + 1 : ti, 0, from);
                    return next;
                  }));
                }}
              />
            );
          })}

          {/* Quick-view side panel — when dragged to side */}
          {quickSplit && (
            <div className="pg__qsplit">
              <div className="pg__qsplit-head">
                <span className="pg__qsplit-title">
                  {QV_ITEMS.find(i=>i.view===quickSplit)?.label}
                </span>
                <button className="pg__qsplit-close" onClick={() => setQuickSplit(null)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="pg__qsplit-body">
                {quickSplit==='meetings'  && <MeetingsPage />}
                {quickSplit==='ai-agents' && <AIAgentsPage />}
                {quickSplit==='doc'       && <DocPage />}
                {quickSplit==='email'     && <EmailPage />}
              </div>
            </div>
          )}

          {/* Media side panel — when no quick view is covering the area */}
          {isMediaActive && !quickView && (
            <MediaPanel pages={pages} onClose={() => setActiveTabId(tabs[0]?.id || null)} />
          )}

          {/* AI Chat — full panel when AI tab is active */}
          {isAIActive && (
            <div className="pg__ai-panel">
              <Chat />
            </div>
          )}
        </div>
      </div>

      {/* Quick-view overlay — covers the full editor area when active */}
      {quickView && (
        <div
          className={`pg__qv-overlay${isMediaActive ? ' pg__qv-overlay--media' : ''}`}
          onDragOver={e => { if (e.dataTransfer.types.includes('qv-panel')) e.preventDefault(); }}
          onDrop={e => {
            const panel = e.dataTransfer.getData('qv-panel');
            if (panel && panel !== quickView) {
              e.preventDefault();
              setQuickView2(q => q === panel ? null : panel);
            }
          }}
        >
          {/* Primary panel */}
          <div className="pg__qv-pane">
            {quickView === 'meetings'  && <MeetingsPage />}
            {quickView === 'ai-agents' && <AIAgentsPage />}
            {quickView === 'doc'       && <DocPage />}
            {quickView === 'email'     && <EmailPage />}
          </div>

          {/* Secondary panel — opened by dropping a card onto the overlay */}
          {quickView2 && (
            <div className="pg__qv-pane pg__qv-pane--secondary">
              <button className="pg__qv-pane-close" onClick={() => setQuickView2(null)} title="Close">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
              {quickView2 === 'meetings'  && <MeetingsPage />}
              {quickView2 === 'ai-agents' && <AIAgentsPage />}
              {quickView2 === 'doc'       && <DocPage />}
              {quickView2 === 'email'     && <EmailPage />}
            </div>
          )}
        </div>
      )}

      {/* Media side pane — floats on top of quick-view overlay when both are open */}
      {isMediaActive && quickView && (
        <div className="pg__qv-media-pane">
          <MediaPanel pages={pages} onClose={() => setActiveTabId(tabs[0]?.id || null)} />
        </div>
      )}

      {/* Priority dropdown — fixed position to escape overflow */}
      {priorityOpen && priorityPos && currentPage && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:998}} onClick={() => setPriorityOpen(false)} />
          <div className="pg__meta-menu" ref={priorityRef}
            style={{ position:'fixed', top: priorityPos.top, left: priorityPos.left, zIndex:999 }}>
            {['high','medium','low'].map(p => (
              <button key={p} onClick={() => { onUpdatePage(currentPage.id, { priority: p }); setPriorityOpen(false); }}
                style={{ color: PRIORITY_META[p].color }}>
                {PRIORITY_META[p].dot} {PRIORITY_META[p].label}
              </button>
            ))}
            {currentPage.priority && (
              <button onClick={() => { onUpdatePage(currentPage.id, { priority: null }); setPriorityOpen(false); }}
                style={{ color: '#aaa' }}>✕ Clear</button>
            )}
          </div>
        </>
      )}

      {/* Group dropdown — fixed position */}
      {groupOpen && groupPos && currentPage && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:998}} onClick={() => setGroupOpen(false)} />
          <div className="pg__meta-menu" ref={groupRef}
            style={{ position:'fixed', top: groupPos.top, left: groupPos.left, zIndex:999 }}>
            {currentPage.groupId && (
              <button onClick={() => { onUpdatePage(currentPage.id, { groupId: null }); setGroupOpen(false); }}
                style={{ color: '#aaa' }}>✕ Unlink</button>
            )}
            {groups.length === 0 && <div className="pg__meta-empty">No groups yet</div>}
            {groups.map(g => (
              <button key={g.id} className={currentPage.groupId === g.id ? 'active' : ''}
                onClick={() => { onUpdatePage(currentPage.id, { groupId: g.id }); setGroupOpen(false); }}>
                {g.icon || '👥'} {g.name}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Color-dot right-click context menu */}
      {dotMenu && (
        <>
          <div style={{position:'fixed',inset:0,zIndex:998}} onClick={() => setDotMenu(null)} />
          <div className="pg__dot-menu" style={{ left: dotMenu.x, top: dotMenu.y }}>
            <button onClick={() => { clearTabColor(dotMenu.refId); setDotMenu(null); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              Unlink tabs
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── Split pane ────────────────────────────────────────────────────────────────
function SplitPane({ page, onClose, onUpdate, focused, width, onFocus, onStartResize,
                      isDragging, dropIndicator, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, setEl,
                      pages, onSelectPage, groups=[], onPaneMouseEnter, paneInsertRefs }) {
  const [paneMetaOpen, setPaneMetaOpen] = useState(false);
  const priorityInfo = PRIORITY_META[page.priority];
  const linkedGroup  = groups.find(g => g.id === page.groupId);
  return (
    <div
      ref={setEl}
      className={`pg__split-pane${focused ? ' pg__split-pane--focused' : ''}${isDragging ? ' pg__split-pane--dragging' : ''}`}
      data-paneid={page.id}
      style={{ width: (focused ? width + 40 : width) + 'px', minWidth: 0, flex: 'none' }}
      onMouseEnter={onPaneMouseEnter}
      onFocus={onFocus}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dropIndicator === 'before' && <div className="pg__pane-drop-line pg__pane-drop-line--before" />}
      {dropIndicator === 'after'  && <div className="pg__pane-drop-line pg__pane-drop-line--after"  />}
      {/* Left resize handle */}
      <div className="pg__pane-resize-handle" onMouseDown={onStartResize} title="Drag to resize" />
      {/* Pane header — drag to reorder; ▼ chevron + ✕ at the right */}
      <div className="pg__pane-head" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <span className="pg__pane-icon">{page.icon}</span>
        <span className="pg__pane-title">{page.title || 'Untitled'}</span>
        {/* Meta toggle chevron */}
        <button className="pg__pane-meta-toggle"
          onClick={e => { e.stopPropagation(); setPaneMetaOpen(o => !o); }}
          title="Page options">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
            style={{ transform: paneMetaOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .18s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
        <button className="pg__pane-close" onClick={e => { e.stopPropagation(); onClose(); }} title="Close pane">✕</button>
      </div>

      {/* Meta dropdown — slides open below the header */}
      {paneMetaOpen && (
        <div className="pg__pane-meta-row">
          <ProjectPicker itemId={page.id} field="pageIds" />
          <button
            className={`pg__pane-meta-btn${page.favorite ? ' pg__pane-meta-btn--fav' : ''}`}
            onClick={() => onUpdate({ favorite: !page.favorite })} title="Favorite">
            <IcoStar />
          </button>
          <button className="pg__pane-meta-btn"
            onClick={() => {
              const lvls = [null,'low','medium','high'];
              onUpdate({ priority: lvls[(lvls.indexOf(page.priority||null)+1)%lvls.length] });
            }}
            style={priorityInfo ? { color: priorityInfo.color } : {}} title="Priority">
            {priorityInfo ? <>{priorityInfo.dot} {priorityInfo.label}</> : '— Priority'}
          </button>
          {linkedGroup && <span className="pg__pane-meta-group">{linkedGroup.icon||'👥'} {linkedGroup.name}</span>}
        </div>
      )}

      {/* Pane content — full block editor */}
      <div className="pg__pane-body">
        <div className="pg__pane-inner">
          <input
            className="pg__pane-page-title"
            value={page.title} dir="auto"
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Untitled"
          />
          <BlockEditor
            pageId={page.id}
            content={page.content || ''}
            onChange={val => onUpdate({ content: val })}
            pages={pages}
            onSelectPage={onSelectPage}
            noToolbar={true}
            onRegisterInsert={fn => { if (paneInsertRefs) paneInsertRefs.current[page.id] = fn; }}
          />
        </div>
      </div>
    </div>
  );
}

// ── Sources side panel ────────────────────────────────────────────────────────
function MediaPanel({ onClose, pages = [] }) {
  const [d, setD]         = useState(loadMedia);
  const [section, setSection] = useState('links');
  const [filterCat, setFilterCat]       = useState('All');
  const [filterPageId, setFilterPageId] = useState(null);
  const [addLink, setAddLink]     = useState({ show:false, title:'', url:'', cat:'', desc:'' });
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [imgDragOver, setImgDragOver]   = useState(false);
  const [fileDragOver, setFileDragOver] = useState(false);
  const imgInputRef  = useRef(null);
  const fileInputRef = useRef(null);

  const commit = (patch) => { const next={...d,...patch}; setD(next); saveMedia(next); };

  /* ── Categories ── */
  const addCat = () => {
    const name = newCatName.trim();
    if (!name || d.linkCats.includes(name)) return;
    commit({ linkCats: [...d.linkCats, name] });
    setNewCatName(''); setAddingCat(false);
  };
  const deleteCat = (cat) => {
    commit({
      linkCats: d.linkCats.filter(c => c !== cat),
      links: d.links.map(l => l.cat === cat ? { ...l, cat: d.linkCats[0] || '' } : l),
    });
    if (filterCat === cat) setFilterCat('All');
  };

  /* ── Links ── */
  const submitLink = () => {
    if (!addLink.url.trim()) return;
    const cat = addLink.cat || d.linkCats[0] || '';
    commit({ links: [...d.links, { id:uuidv4(), title:addLink.title||addLink.url, url:addLink.url.trim(), cat, desc:addLink.desc, createdAt:new Date().toISOString() }] });
    setAddLink({ show:false, title:'', url:'', cat:'', desc:'' });
  };
  const removeLink = (id) => commit({ links: d.links.filter(l => l.id !== id) });

  /* ── Images (drag + file picker + URL) ── */
  const addImageFile = (file) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = ev => commit({ images: [...d.images, { id:uuidv4(), url:ev.target.result, title:file.name.replace(/\.[^.]+$/,''), pageId:filterPageId||null, createdAt:new Date().toISOString() }] });
    reader.readAsDataURL(file);
  };
  const removeImg = (id) => commit({ images: d.images.filter(i => i.id !== id) });
  const onImgDrop = (e) => {
    e.preventDefault(); setImgDragOver(false);
    Array.from(e.dataTransfer.files).forEach(addImageFile);
  };

  /* ── Files (drag + file picker) ── */
  const addFileItem = (file) => {
    const reader = new FileReader();
    reader.onload = ev => commit({ files: [...(d.files||[]), { id:uuidv4(), name:file.name, size:file.size, type:file.type, url:ev.target.result, pageId:filterPageId||null, createdAt:new Date().toISOString() }] });
    reader.readAsDataURL(file);
  };
  const removeFile = (id) => commit({ files: (d.files||[]).filter(f => f.id !== id) });
  const onFileDrop = (e) => {
    e.preventDefault(); setFileDragOver(false);
    Array.from(e.dataTransfer.files).forEach(addFileItem);
  };

  const matchPage = (item) => filterPageId ? item.pageId === filterPageId : true;
  const filtered = (filterCat === 'All' ? d.links : d.links.filter(l => l.cat === filterCat)).filter(matchPage);

  return (
    <div className="mp">
      {/* Header */}
      <div className="mp__head">
        <span className="mp__title">Sources</span>
        <div className="mp__sections">
          {['links','images','files'].map(s => (
            <button key={s} className={`mp__sec-btn${section===s?' active':''}`} onClick={() => setSection(s)}>
              {s.charAt(0).toUpperCase()+s.slice(1)}
            </button>
          ))}
        </div>
        <button className="mp__close" onClick={onClose}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      {/* Page filter */}
      <div className="mp__page-row">
        <span className="mp__page-icon">📄</span>
        <select className="mp__page-select" value={filterPageId||''} onChange={e => setFilterPageId(e.target.value||null)}>
          <option value="">All pages</option>
          {pages.map(p => <option key={p.id} value={p.id}>{p.icon} {p.title||'Untitled'}</option>)}
        </select>
        {filterPageId && <button className="mp__page-clear" onClick={() => setFilterPageId(null)}>✕</button>}
      </div>

      {/* ── Links ── */}
      {section === 'links' && (
        <div className="mp__body">
          {/* Category pills row */}
          <div className="mp__cats">
            <button className={`mp__cat${filterCat==='All'?' active':''}`} onClick={() => setFilterCat('All')}>All</button>
            {d.linkCats.map(c => (
              <span key={c} className={`mp__cat-wrap${filterCat===c?' active':''}`}>
                <button className={`mp__cat${filterCat===c?' active':''}`} onClick={() => setFilterCat(c)}>{c}</button>
                <button className="mp__cat-del" onClick={() => deleteCat(c)} title="Remove category">×</button>
              </span>
            ))}
            {addingCat ? (
              <span className="mp__cat-new-wrap">
                <input className="mp__cat-new-input" autoFocus value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  onKeyDown={e => { if(e.key==='Enter') addCat(); if(e.key==='Escape'){ setAddingCat(false); setNewCatName(''); } }}
                  placeholder="Category name…" />
                <button className="mp__cat-new-ok" onClick={addCat}>✓</button>
              </span>
            ) : (
              <button className="mp__cat-add" onClick={() => setAddingCat(true)} title="Add category">+</button>
            )}
          </div>

          {/* Add link button */}
          {!addLink.show && (
            <button className="mp__add-link-btn" onClick={() => setAddLink(f=>({...f, show:true, cat: filterCat !== 'All' ? filterCat : (d.linkCats[0]||'') }))}>
              + Add link
            </button>
          )}

          {/* Add link form */}
          {addLink.show && (
            <div className="mp__form">
              <input className="mp__input" autoFocus value={addLink.url} placeholder="URL…"
                onChange={e => setAddLink(f=>({...f,url:e.target.value}))}
                onKeyDown={e => { if(e.key==='Enter') submitLink(); }} />
              <input className="mp__input" value={addLink.title} placeholder="Title (optional)"
                onChange={e => setAddLink(f=>({...f,title:e.target.value}))} />
              {d.linkCats.length > 0 && (
                <select className="mp__select" value={addLink.cat||d.linkCats[0]} onChange={e => setAddLink(f=>({...f,cat:e.target.value}))}>
                  {d.linkCats.map(c => <option key={c}>{c}</option>)}
                </select>
              )}
              <textarea className="mp__textarea" rows={2} value={addLink.desc} placeholder="Notes…"
                onChange={e => setAddLink(f=>({...f,desc:e.target.value}))} />
              <div className="mp__form-foot">
                <button className="mp__cancel" onClick={() => setAddLink(f=>({...f,show:false}))}>Cancel</button>
                <button className="mp__save" onClick={submitLink}>Add</button>
              </div>
            </div>
          )}

          {/* Link list */}
          {filtered.length === 0 && !addLink.show ? (
            <div className="mp__empty"><span>🔗</span><p>No links yet</p></div>
          ) : (
            <div className="mp__links">
              {filtered.map(link => {
                const thumb = getYTThumb(link.url);
                return (
                  <div key={link.id} className="mp__link">
                    {thumb ? (
                      <div className="mp__thumb-wrap"><img src={thumb} alt="" className="mp__thumb" loading="lazy"/><div className="mp__play">▶</div></div>
                    ) : (
                      <div className="mp__link-icon">🔗</div>
                    )}
                    <div className="mp__link-body">
                      {link.cat && <span className="mp__link-cat">{link.cat}</span>}
                      <a href={link.url} target="_blank" rel="noreferrer" className="mp__link-title">{link.title}</a>
                      {link.desc && <p className="mp__link-desc">{link.desc}</p>}
                    </div>
                    <button className="mp__del" onClick={() => removeLink(link.id)}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Images ── */}
      {section === 'images' && (
        <div className="mp__body">
          <input ref={imgInputRef} type="file" accept="image/*" multiple style={{display:'none'}}
            onChange={e => { Array.from(e.target.files).forEach(addImageFile); e.target.value=''; }} />

          {/* Drop zone */}
          <div
            className={`mp__drop-zone${imgDragOver?' mp__drop-zone--over':''}`}
            onDragOver={e => { e.preventDefault(); setImgDragOver(true); }}
            onDragLeave={() => setImgDragOver(false)}
            onDrop={onImgDrop}
            onClick={() => imgInputRef.current?.click()}
          >
            <span className="mp__drop-icon">🖼️</span>
            <p>Drag images here or <strong>click to browse</strong></p>
          </div>

          {d.images.filter(matchPage).length === 0 ? (
            <div className="mp__empty" style={{paddingTop:16}}><p>No images yet</p></div>
          ) : (
            <div className="mp__img-grid">
              {d.images.filter(matchPage).map(img => (
                <div key={img.id} className="mp__img-card">
                  <div className="mp__img-wrap">
                    <img src={img.url} alt={img.title||'image'} className="mp__img"
                      onError={e=>{e.target.style.display='none';}} />
                    <button className="mp__img-del" onClick={() => removeImg(img.id)}>✕</button>
                  </div>
                  {img.title && <div className="mp__img-title">{img.title}</div>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Files ── */}
      {section === 'files' && (
        <div className="mp__body">
          <input ref={fileInputRef} type="file" multiple style={{display:'none'}}
            onChange={e => { Array.from(e.target.files).forEach(addFileItem); e.target.value=''; }} />

          {/* Drop zone */}
          <div
            className={`mp__drop-zone${fileDragOver?' mp__drop-zone--over':''}`}
            onDragOver={e => { e.preventDefault(); setFileDragOver(true); }}
            onDragLeave={() => setFileDragOver(false)}
            onDrop={onFileDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <span className="mp__drop-icon">📁</span>
            <p>Drag files here or <strong>click to browse</strong></p>
          </div>

          {(d.files||[]).filter(matchPage).length === 0 ? (
            <div className="mp__empty" style={{paddingTop:16}}><p>No files yet</p></div>
          ) : (
            <div className="mp__file-list">
              {(d.files||[]).filter(matchPage).map(file => (
                <div key={file.id} className="mp__file-row">
                  <span className="mp__file-icon">{file.type?.startsWith('image/')? '🖼️' : file.type?.includes('pdf')? '📄' : file.type?.includes('video')? '🎬' : '📎'}</span>
                  <div className="mp__file-info">
                    <a href={file.url} download={file.name} className="mp__file-name">{file.name}</a>
                    <span className="mp__file-size">{fmtBytes(file.size)}</span>
                  </div>
                  <button className="mp__del" onClick={() => removeFile(file.id)}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Floating page window ──────────────────────────────────────────────────────
function FloatingPage({ page, pos, onMove, onClose, onUpdate, onSwitchToTab }) {
  const dragRef    = useRef(null);
  const [size, setSize] = useState({ w: 520, h: 460 });
  const [minimized, setMinimized] = useState(false);

  // Drag the window by its header
  const handleHeaderMouseDown = useCallback((e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startY: e.clientY, px: pos.x, py: pos.y };
    const onMove_ = (ev) => {
      if (!dragRef.current) return;
      onMove({
        x: Math.max(0, dragRef.current.px + ev.clientX - dragRef.current.startX),
        y: Math.max(0, dragRef.current.py + ev.clientY - dragRef.current.startY),
      });
    };
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove_); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove_);
    window.addEventListener('mouseup', onUp);
  }, [pos, onMove]);

  return (
    <div
      className={`fp${minimized ? ' fp--mini' : ''}`}
      style={{ left: pos.x, top: pos.y, width: size.w }}
    >
      {/* Header — drag handle */}
      <div className="fp__header" onMouseDown={handleHeaderMouseDown}>
        <span className="fp__header-icon">{page.icon}</span>
        <span className="fp__header-title">{page.title || 'Untitled'}</span>
        <div className="fp__header-actions">
          <button className="fp__hbtn" onClick={onSwitchToTab} title="Open as Tab">⊡</button>
          <button className="fp__hbtn" onClick={() => setMinimized(m => !m)} title={minimized ? 'Expand' : 'Minimize'}>
            {minimized ? '⊕' : '⊖'}
          </button>
          <button className="fp__hbtn fp__hbtn--close" onClick={onClose} title="Close">✕</button>
        </div>
      </div>

      {/* Content */}
      {!minimized && (
        <div className="fp__body" style={{ height: size.h - 44 }}>
          <div className="fp__scroll">
            <div className="fp__writing">
              {/* Icon + Title inline */}
              <div className="fp__page-head">
                <span className="fp__page-icon">{page.icon}</span>
                <input
                  className="fp__page-title"
                  value={page.title}
                  onChange={e => onUpdate({ title: e.target.value })}
                  placeholder="Untitled"
                />
              </div>
              <BlockEditor
                pageId={page.id}
                content={page.content || ''}
                onChange={val => onUpdate({ content: val })}
              />
            </div>
          </div>
          {/* Resize handle */}
          <div className="fp__resize"
            onMouseDown={e => {
              e.preventDefault();
              const startX = e.clientX, startW = size.w;
              const startY = e.clientY, startH = size.h;
              const mv = (ev) => setSize({ w: Math.max(360, startW + ev.clientX - startX), h: Math.max(260, startH + ev.clientY - startY) });
              const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
              window.addEventListener('mousemove', mv);
              window.addEventListener('mouseup', up);
            }}
          />
        </div>
      )}
    </div>
  );
}

// Cross-editor block drag communication (module-level)
let _blockMove = null; // { sourcePageId, blockId } — set by target on successful cross-page drop

// ── Block editor ──────────────────────────────────────────────────────────────
export function BlockEditor({pageId, content, onChange, pages=[], onSelectPage=null, undoRedoRef=null, noToolbar=false, onRegisterInsert=null, getTargetInsert=null, formatRef=null}) {
  const [blocks, setBlocks] = useState(() => parseContent(content));
  const prevId = useRef(pageId);
  const blockRefs = useRef({});
  const focusedId = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const [selBar, setSelBar]       = useState(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [selected, setSelected]   = useState(new Set());
  const [blockSearch, setBlockSearch] = useState('');
  const [blockDragId,  setBlockDragId]  = useState(null);
  const [blockDropTgt, setBlockDropTgt] = useState(null);
  const [slashMenu, setSlashMenu] = useState(null);
  const slashMenuRef = useRef(null);

  // Track sidebar width → update CSS variable so toolbar stays visible
  useEffect(() => {
    const update = () => {
      const sb = document.querySelector('.sb');
      if (sb) {
        const r = sb.getBoundingClientRect();
        document.documentElement.style.setProperty('--toolbar-left', `${r.right + 14}px`);
      }
    };
    update();
    const sb = document.querySelector('.sb');
    if (!sb) return;
    const ro = new ResizeObserver(update);
    ro.observe(sb);
    return () => ro.disconnect();
  }, []);

  const toggleSelect = (id) => setSelected(prev => {
    const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n;
  });

  useEffect(() => {
    if (pageId !== prevId.current) {
      prevId.current=pageId;
      setBlocks(parseContent(content));
      setSelBar(null);
      setSelected(new Set());
    }
  }, [pageId]);

  const commit = useCallback((next) => {
    historyRef.current.past = [...historyRef.current.past, blocks];
    historyRef.current.future = [];
    setBlocks(next);
    onChange(JSON.stringify(next));
  }, [blocks, onChange]);

  const undo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!past.length) return;
    const prev = past[past.length - 1];
    historyRef.current.past = past.slice(0, -1);
    historyRef.current.future = [blocks, ...future];
    setBlocks(prev);
    onChange(JSON.stringify(prev));
  }, [blocks, onChange]);

  const redo = useCallback(() => {
    const { past, future } = historyRef.current;
    if (!future.length) return;
    const next = future[0];
    historyRef.current.past = [...past, blocks];
    historyRef.current.future = future.slice(1);
    setBlocks(next);
    onChange(JSON.stringify(next));
  }, [blocks, onChange]);

  // Register undo/redo with the parent (topbar)
  useEffect(() => {
    if (undoRedoRef) undoRedoRef.current = { undo, redo };
  }, [undo, redo, undoRedoRef]);

  // Register format commands with DocPage panel
  useEffect(() => {
    if (!formatRef) return;
    formatRef.current = {
      changeType: (type) => {
        const id = focusedId.current;
        if (!id) return;
        commit(blocks.map(b => b.id === id ? { ...b, type } : b));
      },
      insertBlock: (type) => {
        const nb = freshBlock(type);
        const id = focusedId.current;
        if (!id) { commit([...blocks, nb]); return; }
        const idx = blocks.findIndex(b => b.id === id);
        commit([...blocks.slice(0, idx + 1), nb, ...blocks.slice(idx + 1)]);
      },
      setAlign: (align) => {
        const id = focusedId.current;
        if (!id) return;
        commit(blocks.map(b => b.id === id ? { ...b, align } : b));
      },
      setSize: (size) => {
        const id = focusedId.current;
        if (!id) return;
        commit(blocks.map(b => b.id === id ? { ...b, fontSize: size } : b));
      },
      getProps: () => {
        const id = focusedId.current;
        return id ? (blocks.find(b => b.id === id) || null) : null;
      },
    };
  }, [blocks, commit, formatRef]);

  // ── Slash command menu (placed after commit so no TDZ) ────────────────────
  const allBlockItems = TOOLBAR_GROUPS.flatMap(g => g.items);
  const slashItems = slashMenu
    ? (slashMenu.query
        ? allBlockItems.filter(it => it.label.toLowerCase().includes(slashMenu.query.toLowerCase()))
        : allBlockItems)
    : [];
  const closeSlash = useCallback(() => setSlashMenu(null), []);
  const selectSlashItem = useCallback((item) => {
    if (!slashMenu) return;
    const blk = blocks.find(b => b.id === slashMenu.blockId);
    if (!blk) { closeSlash(); return; }
    const text = blk.text || '';
    const slashIdx = text.lastIndexOf('/');
    const newText = slashIdx >= 0 ? text.slice(0, slashIdx) : text;
    const changes = { type: item.type, text: newText };
    if (item.type === 'todo') changes.done = false;
    commit(blocks.map(b => b.id === slashMenu.blockId ? { ...b, ...changes } : b));
    closeSlash();
    setTimeout(() => blockRefs.current[slashMenu.blockId]?.focus(), 20);
  }, [slashMenu, blocks, commit, closeSlash]);
  useEffect(() => {
    if (!slashMenu) return;
    const handle = (e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); setSlashMenu(m => ({...m, selIdx: Math.min((m.selIdx||0)+1, slashItems.length-1)})); }
      else if (e.key === 'ArrowUp')  { e.preventDefault(); e.stopPropagation(); setSlashMenu(m => ({...m, selIdx: Math.max((m.selIdx||0)-1, 0)})); }
      else if (e.key === 'Enter')    { e.preventDefault(); e.stopPropagation(); const it=slashItems[slashMenu.selIdx||0]; if(it) selectSlashItem(it); }
      else if (e.key === 'Escape')   { e.stopPropagation(); closeSlash(); }
    };
    document.addEventListener('keydown', handle, true);
    return () => document.removeEventListener('keydown', handle, true);
  }, [slashMenu, slashItems, selectSlashItem, closeSlash]);
  useEffect(() => {
    if (!slashMenu) return;
    const close = (e) => { if (!slashMenuRef.current?.contains(e.target)) closeSlash(); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [slashMenu, closeSlash]);
  const updateBlock = useCallback((id,ch) => commit(blocks.map(b=>b.id===id?{...b,...ch}:b)), [blocks,commit]);
  const addAfter = useCallback((afterId,type='paragraph') => {
    const idx=blocks.findIndex(b=>b.id===afterId); const nb=freshBlock(type);
    commit([...blocks.slice(0,idx+1),nb,...blocks.slice(idx+1)]);
    setTimeout(()=>blockRefs.current[nb.id]?.focus(),20);
  },[blocks,commit]);
  const removeBlock = useCallback((id) => {
    if (blocks.length<=1) { commit([freshBlock()]); return; }
    const idx=blocks.findIndex(b=>b.id===id); const next=blocks.filter(b=>b.id!==id); commit(next);
    const prev=next[Math.max(0,idx-1)];
    setTimeout(()=>{ const el=blockRefs.current[prev?.id]; el?.focus(); if(el?.setSelectionRange) el.setSelectionRange(el.value.length,el.value.length); },20);
  },[blocks,commit]);
  const deleteSelected = useCallback(() => {
    const next = blocks.filter(b => !selected.has(b.id));
    commit(next.length ? next : [freshBlock()]);
    setSelected(new Set());
  }, [blocks, selected, commit]);
  const insertBlock = (type) => {
    const id=focusedId.current||blocks[blocks.length-1]?.id;
    if(id) addAfter(id,type);
    else { const nb=freshBlock(type); commit([...blocks,nb]); setTimeout(()=>blockRefs.current[nb.id]?.focus(),20); }
    setSelBar(null);
  };
  // Register a stable insertBlock wrapper so the main toolbar can call it
  const insertBlockRef = useRef(insertBlock);
  useEffect(() => { insertBlockRef.current = insertBlock; });
  useEffect(() => {
    if (!onRegisterInsert) return;
    const stable = (type) => insertBlockRef.current(type);
    onRegisterInsert(stable);
  }, [onRegisterInsert]);
  const numIdx = (idx) => { let n=1; for(let i=idx-1;i>=0;i--) { if(blocks[i].type==='numbered')n++; else break; } return n; };
  const handleMouseUp = useCallback((e) => {
    const ta=e.target.closest('textarea');
    if(!ta||!ta.dataset.bid) { setSelBar(null); return; }
    const ss=ta.selectionStart,se=ta.selectionEnd;
    if(ss===se) { setSelBar(null); return; }
    const rect=ta.getBoundingClientRect();
    setSelBar({top:rect.top-50,left:Math.min(Math.max(rect.left+rect.width/2,180),window.innerWidth-180),bid:ta.dataset.bid,ta});
  },[]);
  const applyInline = (fmt) => {
    if(!selBar) return;
    const ta=selBar.ta; if(!ta) return;
    const ss=ta.selectionStart,se=ta.selectionEnd,val=ta.value,sel=val.slice(ss,se);
    const w={bold:'**',italic:'*',strike:'~~',code:'`'}[fmt]; if(!w) return;
    updateBlock(selBar.bid,{text:val.slice(0,ss)+w+sel+w+val.slice(se)}); setSelBar(null);
  };
  const applyType = (type) => { if(!selBar?.bid) return; updateBlock(selBar.bid,{type,done:type==='todo'?false:undefined}); setSelBar(null); };

  return (
    <div className="pg__block-editor" onMouseUp={handleMouseUp}>
      {selBar && (
        <div className="sel-toolbar" style={{top:selBar.top,left:selBar.left}} onMouseDown={e=>e.preventDefault()}>
          <button className="sel-btn sel-h" onClick={() => applyType('heading1')}>H1</button>
          <button className="sel-btn sel-h" onClick={() => applyType('heading2')}>H2</button>
          <button className="sel-btn sel-h" onClick={() => applyType('heading3')}>H3</button>
          <div className="sel-sep"/>
          <button className="sel-btn sel-b" onClick={() => applyInline('bold')}>B</button>
          <button className="sel-btn sel-i" onClick={() => applyInline('italic')}>I</button>
          <button className="sel-btn sel-s" onClick={() => applyInline('strike')}>S</button>
          <button className="sel-btn" onClick={() => applyInline('code')}>&lt;/&gt;</button>
          <div className="sel-sep"/>
          <button className="sel-btn" onClick={() => applyType('bullet')}>•</button>
          <button className="sel-btn" onClick={() => applyType('quote')}>"</button>
        </div>
      )}
      {/* Multi-select delete bar */}
      {selected.size > 0 && (
        <div className="block-sel-bar">
          <span className="block-sel-info">{selected.size} block{selected.size !== 1 ? 's' : ''} selected</span>
          <button className="block-sel-del" onClick={deleteSelected}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Delete
          </button>
          <button className="block-sel-cancel" onClick={() => setSelected(new Set())}>✕</button>
        </div>
      )}
      <div className="pg__blocks">
        {/* Drop zone at very top */}
        {blockDragId === null && blockDropTgt === null ? null : null}
        {blocks.map((block,idx) => {
          const isDropTarget = blockDropTgt?.id === block.id;
          return (
            <div key={block.id}
              className={`block-wrap${selected.has(block.id) ? ' block-wrap--sel' : ''}${blockDragId===block.id ? ' block-wrap--dragging' : ''}`}
              draggable
              onDragStart={e => {
                _blockMove = null;
                setBlockDragId(block.id);
                e.dataTransfer.setData('block-drag', JSON.stringify({ block, sourcePageId: pageId }));
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragEnd={() => {
                // Cross-editor move: remove from this editor if target consumed it
                if (_blockMove?.sourcePageId === pageId && _blockMove?.blockId === block.id) {
                  const next = blocks.filter(b => b.id !== block.id);
                  commit(next.length ? next : [freshBlock()]);
                  _blockMove = null;
                }
                setBlockDragId(null); setBlockDropTgt(null);
              }}
              onDragOver={e => {
                if (!e.dataTransfer.types.includes('block-drag')) return;
                e.preventDefault(); e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setBlockDropTgt({ id: block.id, side: e.clientY < rect.top + rect.height / 2 ? 'before' : 'after' });
              }}
              onDragLeave={() => setBlockDropTgt(null)}
              onDrop={e => {
                e.preventDefault();
                const raw = e.dataTransfer.getData('block-drag');
                if (raw) {
                  try {
                    const { block: drag, sourcePageId } = JSON.parse(raw);
                    const isSameEditor = sourcePageId === pageId;
                    const side = blockDropTgt?.side ?? 'after';
                    let next = isSameEditor
                      ? blocks.filter(b => b.id !== drag.id)   // remove from current pos
                      : [...blocks];                            // keep source intact
                    const ti = next.findIndex(b => b.id === block.id);
                    const insertAt = side === 'before' ? ti : ti + 1;
                    const newBlock = isSameEditor ? drag : { ...drag, id: uuidv4() };
                    next.splice(Math.max(0, insertAt), 0, newBlock);
                    commit(next);
                    if (!isSameEditor) _blockMove = { sourcePageId, blockId: drag.id };
                  } catch {}
                } else {
                  // Handle pg-pageref drop
                  const refRaw = e.dataTransfer.getData('pg-pageref');
                  if (refRaw) { try { const { id, title, icon } = JSON.parse(refRaw); commit([...blocks, { ...freshBlock('pageref'), refId:id, refTitle:title, refIcon:icon }]); } catch {} }
                }
                setBlockDropTgt(null);
              }}>
              {/* Drop indicator — top */}
              {isDropTarget && blockDropTgt.side === 'before' && <div className="block-drop-line"/>}
              <button className="block-drag-handle" title="Drag to move"
                onMouseDown={e => e.preventDefault()}>
                <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                  <circle cx="2.5" cy="2.5" r="1.3"/><circle cx="7.5" cy="2.5" r="1.3"/>
                  <circle cx="2.5" cy="7" r="1.3"/><circle cx="7.5" cy="7" r="1.3"/>
                  <circle cx="2.5" cy="11.5" r="1.3"/><circle cx="7.5" cy="11.5" r="1.3"/>
                </svg>
              </button>
              <button className="block-sel-check" onClick={() => toggleSelect(block.id)} title="Select block">
                {selected.has(block.id)
                  ? <svg width="10" height="10" viewBox="0 0 12 12"><rect width="12" height="12" rx="3" fill="#0f172a"/><path d="M2.5 6l2.5 2.5L9 3.5" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round"/></svg>
                  : <svg width="10" height="10" viewBox="0 0 12 12"><rect width="11" height="11" x=".5" y=".5" rx="2.5" fill="none" stroke="#d1d5db" strokeWidth="1.2"/></svg>
                }
              </button>
              <div className="block-body">
                <Block block={block} numIdx={block.type==='numbered'?numIdx(idx):0}
                  setRef={el => blockRefs.current[block.id]=el}
                  onUpdate={ch => updateBlock(block.id,ch)}
                  onAddAfter={type => addAfter(block.id,type)}
                  onDelete={() => removeBlock(block.id)}
                  onFocus={() => { focusedId.current=block.id; }}
                  pages={pages} onSelectPage={onSelectPage}
                  onSlashCommand={(bId, query, rect) => {
                    if (bId) setSlashMenu(m => ({ blockId: bId, query, rect, selIdx: m?.blockId===bId ? m.selIdx||0 : 0 }));
                    else closeSlash();
                  }} />
              </div>
              <button className="block-del-btn" title="Delete block"
                onMouseDown={e => { e.preventDefault(); removeBlock(block.id); }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
              </button>
              {/* Drop indicator — bottom */}
              {isDropTarget && blockDropTgt.side === 'after' && <div className="block-drop-line"/>}
            </div>
          );
        })}
        {/* Drop zone at bottom (after all blocks) */}
        <div className="block-wrap-end"
          onDragOver={e => { if (e.dataTransfer.types.includes('block-drag')) { e.preventDefault(); setBlockDropTgt({ id: '__end__', side: 'after' }); } }}
          onDragLeave={() => setBlockDropTgt(null)}
          onDrop={e => {
            const raw = e.dataTransfer.getData('block-drag');
            if (!raw) return; e.preventDefault();
            try {
              const { block: drag, sourcePageId } = JSON.parse(raw);
              const isSameEditor = sourcePageId === pageId;
              const next = isSameEditor ? blocks.filter(b => b.id !== drag.id) : [...blocks];
              const newBlock = isSameEditor ? drag : { ...drag, id: uuidv4() };
              commit([...next, newBlock]);
              if (!isSameEditor) _blockMove = { sourcePageId, blockId: drag.id };
            } catch {}
            setBlockDropTgt(null);
          }}>
          {blockDropTgt?.id === '__end__' && <div className="block-drop-line"/>}
        </div>
      </div>
      {/* Slash command popup */}
      {slashMenu && slashItems.length > 0 && (
        <div ref={slashMenuRef} className="pg__slash-menu"
          style={{ position:'fixed', top: slashMenu.rect ? slashMenu.rect.bottom + 4 : 200,
                   left: slashMenu.rect ? slashMenu.rect.left : 200 }}>
          {slashItems.map((item, idx) => (
            <button key={item.type}
              className={`pg__slash-item${(slashMenu.selIdx||0)===idx ? ' pg__slash-item--sel' : ''}`}
              onMouseDown={e => { e.preventDefault(); selectSlashItem(item); }}
              onMouseEnter={() => setSlashMenu(m => ({...m, selIdx: idx}))}>
              <span className="pg__slash-icon">{item.icon}</span>
              <span className="pg__slash-label">{item.label}</span>
            </button>
          ))}
        </div>
      )}

      {!noToolbar && <div className={`pg__toolbar-wrap${toolbarOpen ? ' open' : ''}`}>
        {/* Circle toggle */}
        <button
          className="pg__toolbar-toggle"
          onMouseDown={e => { e.preventDefault(); setToolbarOpen(o => { if (o) setBlockSearch(''); return !o; }); }}
          title="Add block"
        >
          <span className={`pg__toggle-plus${toolbarOpen ? ' rotated' : ''}`}>+</span>
          <span className="pg__toggle-label">Add block</span>
        </button>
        {/* Panel slides out to the right */}
        <div className="pg__float-toolbar">
          {/* Search input */}
          <span className="pg__tb-search-wrap">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="pg__tb-search-ico"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="pg__tb-search"
              placeholder="Search blocks…"
              value={blockSearch}
              onChange={e => setBlockSearch(e.target.value)}
              onMouseDown={e => e.stopPropagation()}
              onKeyDown={e => { if (e.key === 'Escape') setBlockSearch(''); }}
            />
          </span>
          <span className="pg__toolbar-div"/>
          {/* Filtered or grouped block list */}
          {blockSearch.trim() ? (
            <span className="pg__toolbar-group">
              {TOOLBAR_GROUPS.flatMap(g => g.items)
                .filter(item => item.label.toLowerCase().includes(blockSearch.toLowerCase()))
                .map(item => (
                  <button key={item.type} className="pg__float-btn" title={item.label}
                    onMouseDown={e => { e.preventDefault(); (getTargetInsert?.()??insertBlock)(item.type); setToolbarOpen(false); setBlockSearch(''); }}>
                    <span className="pg__float-icon">{item.icon}</span>
                    <span className="pg__float-label">{item.label}</span>
                  </button>
                ))
              }
            </span>
          ) : (
            TOOLBAR_GROUPS.map((grp,gi) => (
              <span key={gi} className="pg__toolbar-group">
                {gi>0 && <span className="pg__toolbar-div"/>}
                {grp.items.map(item => (
                  <button key={item.type} className="pg__float-btn" title={item.label}
                    onMouseDown={e => { e.preventDefault(); (getTargetInsert?.()??insertBlock)(item.type); setToolbarOpen(false); }}>
                    <span className="pg__float-icon">{item.icon}</span>
                    <span className="pg__float-label">{item.label}</span>
                  </button>
                ))}
              </span>
            ))
          )}
        </div>
      </div>}
    </div>
  );
}

// ── Map block ─────────────────────────────────────────────────────────────────
function MapBlock({ block, onUpdate }) {
  const [input, setInput] = useState('');
  const places = block.places || [];
  const active = places.find(p => p.id === block.activeId) || null;

  const save = () => {
    const name = input.trim();
    if (!name) return;
    const np = { id: uuidv4(), name };
    onUpdate({ places: [...places, np], activeId: np.id });
    setInput('');
  };
  const remove = (id) => {
    const next = places.filter(p => p.id !== id);
    onUpdate({ places: next, activeId: next[0]?.id || null });
  };

  return (
    <div className="block-map">
      {/* Search bar */}
      <div className="block-map-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="block-map-search-ico"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          className="block-map-search-input" dir="auto"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if(e.key==='Enter'){e.preventDefault();save();} }}
          placeholder="Search a place and save…" />
        {input.trim() && (
          <button className="block-map-save-btn" onMouseDown={e=>{e.preventDefault();save();}}>
            Save
          </button>
        )}
      </div>

      {/* Saved location cards */}
      {places.length > 0 && (
        <div className="block-map-cards">
          {places.map(p => (
            <div key={p.id}
              className={`block-map-card${block.activeId===p.id?' active':''}`}
              onClick={() => onUpdate({ activeId: p.id })}>
              <div className="block-map-card-pin">📍</div>
              <div className="block-map-card-name">{p.name}</div>
              <button className="block-map-card-del"
                onMouseDown={e=>{e.preventDefault();e.stopPropagation();remove(p.id);}}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Map embed for active location */}
      {active && (
        <div className="block-map-frame">
          <iframe key={active.id}
            title={active.name}
            src={`https://maps.google.com/maps?q=${encodeURIComponent(active.name)}&output=embed&z=14`}
            loading="lazy" />
        </div>
      )}

      {/* Empty state */}
      {places.length === 0 && (
        <div className="block-map-empty">
          <span>🗺</span>
          <p>Search for a place above and save it</p>
        </div>
      )}
    </div>
  );
}

// ── Journal block ─────────────────────────────────────────────────────────────
const JOURNAL_MOODS = ['😊','🙂','😐','😔','😤','🤩'];
function JournalBlock({ block, onUpdate, blockRef, onFocus }) {
  return (
    <div className="block-journal">
      <div className="block-journal-head">
        <input type="date" className="block-journal-date" value={block.date || new Date().toISOString().slice(0,10)}
          onChange={e => onUpdate({ date: e.target.value })} />
        <div className="block-journal-moods">
          {JOURNAL_MOODS.map(m => (
            <button key={m} className={`block-journal-mood${block.mood===m?' on':''}`}
              onMouseDown={e=>{e.preventDefault();onUpdate({mood:block.mood===m?null:m});}}>{m}</button>
          ))}
        </div>
      </div>
      <textarea ref={blockRef} className="block-ta ta-p block-journal-text" dir="auto"
        value={block.text||''} rows={4} onFocus={onFocus}
        onChange={e => onUpdate({ text: e.target.value })}
        placeholder="Write about your day…" />
    </div>
  );
}

// ── Sub-page block ────────────────────────────────────────────────────────────
function SubpageBlock({ block, onUpdate, pages, onSelectPage }) {
  const [open, setOpen] = useState(false);
  const [iconOpen, setIconOpen] = useState(false);
  return (
    <div className="block-subpage">
      <div className="block-subpage-head" onClick={() => setOpen(o=>!o)}>
        <svg className="block-subpage-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
          style={{transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition:'transform .18s'}}>
          <polyline points="9 18 15 12 9 6"/>
        </svg>
        <span className="block-subpage-icon" onClick={e=>{e.stopPropagation();setIconOpen(o=>!o);}}>
          {block.icon||'📄'}
        </span>
        {iconOpen && (
          <div className="pg__icon-picker block-subpage-icon-picker" onClick={e=>e.stopPropagation()}>
            {PAGE_ICONS.map(ic=>(
              <button key={ic} onClick={()=>{onUpdate({icon:ic});setIconOpen(false);}}>{ic}</button>
            ))}
          </div>
        )}
        <input className="block-subpage-title" dir="auto"
          value={block.title||''} placeholder="Untitled page"
          onClick={e=>e.stopPropagation()}
          onChange={e=>onUpdate({title:e.target.value})} />
      </div>
      {open && (
        <div className="block-subpage-body">
          <BlockEditor
            pageId={block.id}
            content={block.content||''}
            onChange={val=>onUpdate({content:val})}
            pages={pages}
            onSelectPage={onSelectPage}
            noToolbar={true}
          />
        </div>
      )}
    </div>
  );
}

const AUTO_PAIRS = { '(': ')', '[': ']', '{': '}' };
const CLOSE_CHARS = new Set([')', ']', '}']);

function Block({block,numIdx,setRef,onUpdate,onAddAfter,onDelete,onFocus,pages=[],onSelectPage,onSlashCommand=null}) {
  const kd = (e) => {
    const ta = e.target;

    // ── Auto-close bracket pairs: ( [ { ──────────────────────────────────
    if (AUTO_PAIRS[e.key] && ta?.selectionStart !== undefined) {
      e.preventDefault();
      const s = ta.selectionStart, end = ta.selectionEnd;
      const v = ta.value;
      const close = AUTO_PAIRS[e.key];
      const sel = v.slice(s, end);
      const newVal = v.slice(0, s) + e.key + sel + close + v.slice(end);
      onUpdate({ text: newVal });
      // Cursor: between the brackets (after opening) — or after the closing bracket if text was selected
      const newPos = sel.length > 0 ? s + sel.length + 2 : s + 1;
      setTimeout(() => { if (ta.isConnected) { ta.selectionStart = ta.selectionEnd = newPos; } }, 0);
      return;
    }

    // ── Skip over closing bracket if already there ────────────────────────
    if (CLOSE_CHARS.has(e.key) && ta?.selectionStart !== undefined) {
      const s = ta.selectionStart;
      if (ta.value[s] === e.key) {
        e.preventDefault();
        setTimeout(() => { if (ta.isConnected) { ta.selectionStart = ta.selectionEnd = s + 1; } }, 0);
        return;
      }
    }

    // ── Delete pair on Backspace: |(  ) → cursor was between them ─────────
    if (e.key === 'Backspace' && ta?.selectionStart !== undefined && ta.selectionStart === ta.selectionEnd) {
      const s = ta.selectionStart;
      const v = ta.value;
      if (s > 0 && AUTO_PAIRS[v[s - 1]] === v[s]) {
        e.preventDefault();
        const newVal = v.slice(0, s - 1) + v.slice(s + 1);
        onUpdate({ text: newVal });
        setTimeout(() => { if (ta.isConnected) { ta.selectionStart = ta.selectionEnd = s - 1; } }, 0);
        return;
      }
    }

    if(e.key===' '&&block.type==='paragraph'){ const t=block.text; for(const{prefix,type}of TRIGGERS){ if(t===prefix){e.preventDefault();onUpdate({type,text:'',done:type==='todo'?false:undefined});return;} } if(/^\d+\.$/.test(t)){e.preventDefault();onUpdate({type:'numbered',text:''});return;} }
    if(e.key==='Enter'&&block.text==='---'&&block.type==='paragraph'){e.preventDefault();onUpdate({type:'divider',text:''});return;}
    if(e.key==='Enter'&&!e.shiftKey&&block.type!=='code'){e.preventDefault();onAddAfter(NEXT[block.type]||'paragraph');return;}
    if(e.key==='Backspace'&&!block.text){e.preventDefault();if(block.type!=='paragraph')onUpdate({type:'paragraph',done:undefined});else onDelete();}
  };
  const taOnChange = (e) => {
    autoGrow(e.target);
    const val = e.target.value;
    onUpdate({text: val});
    if (onSlashCommand) {
      const slashIdx = val.lastIndexOf('/');
      if (slashIdx !== -1) {
        const query = val.slice(slashIdx + 1);
        if (!query.includes(' ')) {
          onSlashCommand(block.id, query, e.target.getBoundingClientRect());
          return;
        }
      }
      onSlashCommand(null, '', null);
    }
  };
  const ta = (cls, ph='') => {
    const st = {};
    if (block.align) st.textAlign = block.align;
    if (block.fontSize) st.fontSize = `${block.fontSize}px`;
    const base = {ref:setRef,className:`block-ta ${cls}`,'data-bid':block.id,value:block.text||'',rows:1,dir:'auto',onChange:taOnChange,onKeyDown:kd,onFocus,placeholder:ph};
    if (Object.keys(st).length) base.style = st;
    return base;
  };
  if(block.type==='divider') return <hr className="block-hr"/>;
  if(block.type==='heading1') return <div className="block-row"><div className="block-type-tag">H1</div><textarea {...ta('ta-h1','Heading 1...')}/></div>;
  if(block.type==='heading2') return <div className="block-row"><div className="block-type-tag">H2</div><textarea {...ta('ta-h2','Heading 2...')}/></div>;
  if(block.type==='heading3') return <div className="block-row"><div className="block-type-tag">H3</div><textarea {...ta('ta-h3','Heading 3...')}/></div>;
  if(block.type==='bullet')   return <div className="block-row block-list-row"><span className="block-prefix block-bullet-dot">•</span><textarea {...ta('ta-p','List item...')}/></div>;
  if(block.type==='numbered') return <div className="block-row block-list-row"><span className="block-prefix block-num">{numIdx}.</span><textarea {...ta('ta-p','List item...')}/></div>;
  if(block.type==='todo')     return <div className="block-row block-list-row"><input type="checkbox" className="block-check" checked={!!block.done} onChange={e=>onUpdate({done:e.target.checked})}/><textarea {...ta(`ta-p${block.done?' ta-done':''}`, 'To-do...')}/></div>;
  if(block.type==='quote')    return <div className="block-quote"><div className="block-quote-bar"/><textarea {...ta('ta-quote','Quote...')}/></div>;
  if(block.type==='code')     return <div className="block-code-wrap"><div className="block-code-label">Code</div><textarea ref={setRef} className="block-ta ta-code" data-bid={block.id} value={block.text||''} rows={4} dir="auto" spellCheck={false} onChange={e=>onUpdate({text:e.target.value})} onKeyDown={kd} onFocus={onFocus} placeholder="// Code..."/></div>;
  if(block.type==='callout')  return <div className="block-callout"><span className="block-callout-icon">{block.icon||'💡'}</span><textarea {...ta('ta-p','Callout...')}/></div>;
  if(block.type==='table')    return <TableBlock block={block} onUpdate={onUpdate} blockRef={setRef} onFocus={onFocus}/>;
  if(block.type==='board')    return <BoardBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='gallery')  return <GalleryBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='timeline') return <TimelineBlock block={block} onUpdate={onUpdate} blockRef={setRef} onFocus={onFocus}/>;
  if(block.type==='cards')    return <CardsBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='pageref')  return <PageRefBlock block={block} pages={pages} onUpdate={onUpdate} onSelectPage={onSelectPage} onFocus={onFocus} />;
  if(block.type==='map')      return <MapBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='journal')  return <JournalBlock block={block} onUpdate={onUpdate} blockRef={setRef} onFocus={onFocus}/>;
  if(block.type==='subpage')  return <SubpageBlock block={block} onUpdate={onUpdate} pages={pages} onSelectPage={onSelectPage}/>;
  return <div className="block-row"><textarea {...ta('ta-p','Write something… (# heading, - bullet, 1. numbered)')}/></div>;
}
function autoGrow(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}

// ── Page reference block ───────────────────────────────────────────────────────
function PageRefBlock({ block, pages, onUpdate, onSelectPage, onFocus }) {
  const [query, setQuery] = useState('');
  const [dropPos, setDropPos] = useState(null); // { top, left, width }
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);

  // Position the fixed dropdown whenever query changes or input mounts
  useEffect(() => {
    if (!block.refId && inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropPos({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 280) });
    }
  }, [query, block.refId]);

  // Close on outside click
  useEffect(() => {
    if (block.refId) return;
    const close = e => { if (!wrapRef.current?.contains(e.target)) setQuery('__CLOSED__'); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [block.refId]);

  if (block.refId) {
    const pg = pages.find(p => p.id === block.refId);
    const title = pg?.title || block.refTitle || 'Untitled';
    const icon  = pg?.icon  || block.refIcon  || '📄';
    return (
      <div className="block-pageref" onClick={() => onSelectPage?.(block.refId)} onFocus={onFocus}>
        <span className="block-pageref-icon">{icon}</span>
        <span className="block-pageref-title">{title}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="block-pageref-arr"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        <button className="block-pageref-unlink" onClick={e => { e.stopPropagation(); onUpdate({ refId:'', refTitle:'', refIcon:'' }); }} title="Unlink">✕</button>
      </div>
    );
  }

  const q = query === '__CLOSED__' ? '' : query;
  const filtered = pages
    .filter(p => !q || p.title?.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 10);

  return (
    <div className="block-pageref-picker" ref={wrapRef} onFocus={onFocus}>
      <input
        ref={inputRef}
        autoFocus
        className="block-pageref-input"
        placeholder="Search pages…"
        value={q}
        onChange={e => setQuery(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onUpdate({ refId:'', refTitle:'', refIcon:'' }); }}
      />
      {/* Fixed dropdown — escapes all overflow containers */}
      {dropPos && filtered.length > 0 && (
        <div className="block-pageref-list"
          style={{ position:'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}>
          {filtered.map(p => (
            <button key={p.id} className="block-pageref-option"
              onMouseDown={e => { e.preventDefault(); onUpdate({ refId: p.id, refTitle: p.title, refIcon: p.icon }); }}>
              <span>{p.icon}</span><span>{p.title || 'Untitled'}</span>
            </button>
          ))}
        </div>
      )}
      {filtered.length === 0 && q && dropPos && (
        <div className="block-pageref-list"
          style={{ position:'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 9999 }}>
          <p className="block-pageref-empty">No pages found</p>
        </div>
      )}
    </div>
  );
}
function TableBlock({block,onUpdate,blockRef,onFocus}){const rows=block.rows||[['',''],['','']];const set=(r,c,v)=>onUpdate({rows:rows.map((row,ri)=>ri===r?row.map((cell,ci)=>ci===c?v:cell):row)});return<div className="block-table-wrap"><table className="block-table"><tbody>{rows.map((row,ri)=><tr key={ri}>{row.map((cell,ci)=><td key={ci}><input className={`block-cell${ri===0?' block-cell-head':''}`}value={cell}data-bid={block.id}onChange={e=>set(ri,ci,e.target.value)}ref={ri===0&&ci===0?blockRef:null}onFocus={onFocus}placeholder={ri===0?`Column ${ci+1}`:''}/></td>)}</tr>)}</tbody></table><div className="block-table-acts"><button className="block-table-btn"onClick={()=>onUpdate({rows:[...rows,Array(rows[0].length).fill('')]})}>+ Row</button><button className="block-table-btn"onClick={()=>onUpdate({rows:rows.map(r=>[...r,''])})}>+ Column</button></div></div>;}
function BoardBlock({block,onUpdate}){const cols=block.cols||[];const upd=next=>onUpdate({cols:next});const addCard=cid=>upd(cols.map(c=>c.id===cid?{...c,cards:[...c.cards,{id:uuidv4(),text:''}]}:c));const editCard=(cid,kid,text)=>upd(cols.map(c=>c.id===cid?{...c,cards:c.cards.map(k=>k.id===kid?{...k,text}:k)}:c));const delCard=(cid,kid)=>upd(cols.map(c=>c.id===cid?{...c,cards:c.cards.filter(k=>k.id!==kid)}:c));return<div className="block-board">{cols.map(col=><div key={col.id}className="block-board-col"><div className="block-board-head">{col.title}</div><div className="block-board-cards">{col.cards.map(card=><div key={card.id}className="block-board-card"><input className="block-board-input"value={card.text}placeholder="Card..."onChange={e=>editCard(col.id,card.id,e.target.value)}/><button className="block-board-del"onClick={()=>delCard(col.id,card.id)}>✕</button></div>)}</div><button className="block-board-add"onClick={()=>addCard(col.id)}>+ Add</button></div>)}</div>;}
function GalleryBlock({block,onUpdate}){const items=block.items||[];return<div className="block-gallery">{items.map((it,i)=><div key={it.id}className="block-gallery-tile"><div className="block-gallery-img">🖼</div><input className="block-gallery-cap"value={it.caption}placeholder={`Caption ${i+1}...`}onChange={e=>onUpdate({items:items.map(x=>x.id===it.id?{...x,caption:e.target.value}:x)})}/></div>)}</div>;}
function TimelineBlock({block,onUpdate,blockRef,onFocus}){const items=block.items||[];const upd=(id,k,v)=>onUpdate({items:items.map(it=>it.id===id?{...it,[k]:v}:it)});return<div className="block-timeline">{items.map((it,i)=><div key={it.id}className="block-tl-row"><div className="block-tl-left"><input className="block-tl-date"value={it.date}placeholder="Date..."onChange={e=>upd(it.id,'date',e.target.value)}ref={i===0?blockRef:null}onFocus={onFocus}/>{i<items.length-1&&<div className="block-tl-line"/>}</div><div className="block-tl-dot"/><input className="block-tl-text"value={it.text}placeholder="Event..."onChange={e=>upd(it.id,'text',e.target.value)}/><button className="block-tl-del"onClick={()=>onUpdate({items:items.filter(x=>x.id!==it.id)})}>✕</button></div>)}<button className="block-tl-add"onClick={()=>onUpdate({items:[...items,{id:uuidv4(),date:'',text:''}]})}>+ Add point</button></div>;}

// ── Cards block — simple long white write-rectangles ─────────────────────────
function CardsBlock({ block, onUpdate }) {
  const rawCards = block.cards || [];
  // Normalize: support old format (icon/title/desc) and new (text only)
  const cards = rawCards.map(c => ({
    id: c.id,
    text: c.text !== undefined ? c.text : [c.title, c.desc].filter(Boolean).join('\n'),
  }));

  const upd = (id, text) => onUpdate({ cards: rawCards.map(c => c.id===id ? { id:c.id, text } : c) });
  const del = (id) => onUpdate({ cards: rawCards.filter(c => c.id !== id) });
  const add = () => onUpdate({ cards: [...rawCards, { id: uuidv4(), text: '' }] });

  return (
    <div className="bc">
      <div className="bc__grid">
        {cards.map(card => (
          <div key={card.id} className="bc__card">
            <button className="bc__del" onClick={() => del(card.id)} title="Remove card">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            <textarea
              className="bc__text"
              value={card.text}
              placeholder="Write something…"
              onChange={e => {
                upd(card.id, e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
          </div>
        ))}
        <button className="bc__add" onClick={add}>
          <span className="bc__add-plus">+</span>
          <span>Add</span>
        </button>
      </div>
    </div>
  );
}

// ── Sticky notes panel ────────────────────────────────────────────────────────
function parseCards(raw){if(!raw?.trim())return[];try{const p=JSON.parse(raw);if(Array.isArray(p))return p;}catch{}return[];}
function StickyCards({pageId,raw,onChange,onClose}){
  const[cards,setCards]=useState(()=>parseCards(raw));
  const prevPage=useRef(pageId);
  const cardsAreaRef=useRef(null);
  useEffect(()=>{if(pageId!==prevPage.current){prevPage.current=pageId;setCards(parseCards(raw));}},[pageId]);
  const save=useCallback((next)=>{setCards(next);onChange(JSON.stringify(next));},[onChange]);
  const addCard=()=>{
    save([...cards,{id:uuidv4(),text:'',color:CARD_COLORS[cards.length%CARD_COLORS.length]}]);
    setTimeout(()=>{ if(cardsAreaRef.current) cardsAreaRef.current.scrollTop=cardsAreaRef.current.scrollHeight; },60);
  };
  const updateCard=(id,ch)=>save(cards.map(c=>c.id===id?{...c,...ch}:c));
  const deleteCard=id=>save(cards.filter(c=>c.id!==id));
  const onDragStart=(e,card)=>{e.dataTransfer.setData('notion-card',JSON.stringify({text:card.text,color:card.color}));e.dataTransfer.effectAllowed='copy';};
  return(
    <div className="pg__side-panel">
      <div className="pg__side-head">
        <span className="pg__side-title">Notes</span>
        <button className="pg__side-add" onClick={addCard} title="New note">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
        <button className="pg__side-close" onClick={onClose} title="Close">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div className="pg__cards-area" ref={cardsAreaRef}>
        {cards.length===0 && (
          <div className="pg__cards-empty">
            <p>No notes yet</p>
            <button onClick={addCard}>+ Add note</button>
          </div>
        )}
        {cards.map(card=>(
          <div key={card.id} className="pg__sticky" style={{background: card.color}} draggable onDragStart={e=>onDragStart(e,card)}>
            <div className="pg__sticky-topbar">
              <div className="pg__sticky-drag">
                <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor" opacity=".3">
                  <circle cx="2.5" cy="2.5" r="1.3"/><circle cx="7.5" cy="2.5" r="1.3"/>
                  <circle cx="2.5" cy="7.5" r="1.3"/><circle cx="7.5" cy="7.5" r="1.3"/>
                </svg>
              </div>
              <button className="pg__sticky-del" onClick={()=>deleteCard(card.id)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
              </button>
            </div>
            <textarea className="pg__sticky-text" value={card.text} placeholder="Write a note…"
              onChange={e=>updateCard(card.id,{text:e.target.value})}
              onMouseDown={e=>e.stopPropagation()}/>
            <div className="pg__sticky-palette">
              {CARD_COLORS.map(c=>(
                <button key={c} className={`pg__sticky-dot${card.color===c?' active':''}`}
                  style={{background:c}} onClick={()=>updateCard(card.id,{color:c})}/>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="pg__side-footer">
        <button className="pg__sticky-new" onClick={addCard}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New note
        </button>
      </div>
    </div>
  );
}

// ── Folder & Page items ───────────────────────────────────────────────────────
function FolderItem({
  folder, pages, subFolders=[], allPages=[], activePageId,
  isEditing, editingName, onEditingNameChange, onStartRename, onCommitRename,
  onToggleCollapse, onAddPage, onAddSubFolder, onUpdateSubFolder, onDeleteSubFolder,
  onUpdateFolder, onDelete, onPageClick, onPageDelete,
  isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [hovered, setHovered]           = useState(false);
  const [menu, setMenu]                 = useState(false);
  const [editingSubFolder, setEditingSub] = useState(null);
  const inputRef  = useRef(null);
  const menuRef   = useRef(null);
  const [folderGroups] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mynotion_groups_v1') || '[]'); } catch { return []; }
  });

  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);
  useEffect(() => {
    if (!menu) return;
    const close = e => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const commitSubRename = () => {
    if (editingSubFolder?.name.trim()) onUpdateSubFolder(editingSubFolder.id, { name: editingSubFolder.name.trim() });
    setEditingSub(null);
  };

  const handleAddSubFolder = () => {
    if (folder.collapsed) onToggleCollapse(); // expand parent first
    onAddSubFolder(id => setEditingSub({ id, name: 'New Sub-folder' }));
  };

  const hasChildren = pages.length > 0 || subFolders.length > 0;

  return (
    <div className="pg__folder" draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div className={`pg__folder-row${hovered?' hover':''}${isDragOver?' drag-over':''}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

        {/* Expand chevron */}
        <button className="pg__chevron" onClick={onToggleCollapse}>
          <IcoChevron open={!folder.collapsed}/>
        </button>

        {/* Folder icon badge (tinted if folder has a color) */}
        <div className="pg__folder-badge" style={folder.color ? { color: folder.color } : {}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>

        {/* Name or rename input */}
        {isEditing
          ? <input ref={inputRef} className="pg__folder-input" value={editingName}
              onChange={e => onEditingNameChange(e.target.value)} onBlur={onCommitRename}
              onKeyDown={e => { if(e.key==='Enter') onCommitRename(); if(e.key==='Escape'){ onEditingNameChange(folder.name); onCommitRename(); } }} />
          : <span className="pg__folder-name" onClick={onToggleCollapse}>{folder.name}</span>
        }

        {/* Hover action buttons */}
        {hovered && !isEditing && (
          <div className="pg__folder-btns">
            <button className="pg__icon-action" onClick={() => onAddPage()} title="דף חדש"><IcoPlus/></button>
            <button className="pg__icon-action" onClick={handleAddSubFolder} title="תיקייה משנית"><IcoSubFolder/></button>
            <button className="pg__icon-action" onClick={() => setMenu(m=>!m)} title="More"><IcoDots/></button>
          </div>
        )}

        {/* Context menu */}
        {menu && (
          <div className="pg__menu" ref={menuRef}>
            <button onClick={() => { setMenu(false); onStartRename(); }}><IcoEdit/> Rename</button>
            <button onClick={() => { setMenu(false); onAddPage(); }}><IcoPlus/> New Page</button>
            <button onClick={() => { setMenu(false); handleAddSubFolder(); }}>
              <IcoSubFolder/> New Sub-folder
            </button>
            <div className="pg__menu-sep"/>
            {/* Folder color picker */}
            <div className="pg__menu-color-row">
              {FOLDER_COLORS.map(c => (
                <button
                  key={c}
                  className={`pg__folder-color-swatch${folder.color === c ? ' active' : ''}`}
                  style={{ background: c }}
                  onClick={() => { onUpdateFolder?.(folder.id, { color: folder.color === c ? null : c }); setMenu(false); }}
                  title={c}
                />
              ))}
            </div>
            <div className="pg__menu-sep"/>
            {/* Share to group */}
            {folderGroups.length > 0 && (
              <>
                <div className="pg__menu-label">Share with group</div>
                {folderGroups.map(g => (
                  <button key={g.id} className={folder.groupId === g.id ? 'active' : ''}
                    onClick={() => { onUpdateFolder?.(folder.id, { groupId: folder.groupId === g.id ? null : g.id }); setMenu(false); }}>
                    {g.icon || '👥'} {g.name}{folder.groupId === g.id ? ' ✓' : ''}
                  </button>
                ))}
                <div className="pg__menu-sep"/>
              </>
            )}
            <button className="pg__menu-danger" onClick={() => { setMenu(false); onDelete(); }}><IcoTrash/> Delete</button>
          </div>
        )}
      </div>

      {/* Children — always rendered, CSS controls visibility for smooth animation */}
      <div className={`pg__folder-children${folder.collapsed ? ' pg__folder-children--closed' : ''}`}>
        {subFolders.map(sf => (
          <SubFolderItem key={sf.id} subFolder={sf}
            pages={allPages.filter(p => p.folderId === sf.id)}
            activePageId={activePageId}
            isEditing={editingSubFolder?.id === sf.id}
            editingName={editingSubFolder?.name ?? ''}
            onEditingNameChange={name => setEditingSub(s => ({...s, name}))}
            onStartRename={() => setEditingSub({ id:sf.id, name:sf.name })}
            onCommitRename={commitSubRename}
            onUpdate={ch => onUpdateSubFolder(sf.id, ch)}
            onAddPage={() => onAddPage(sf.id)}
            onDelete={() => onDeleteSubFolder(sf.id)}
            onPageClick={onPageClick}
            onPageDelete={onPageDelete}
          />
        ))}
        {pages.map(p => (
          <PageItem key={p.id} page={p} indent active={p.id===activePageId}
            onSelect={() => onPageClick(p)} onDelete={() => onPageDelete(p.id)} />
        ))}
        {!hasChildren && (
          <button className="pg__folder-empty" onClick={onAddPage}>+ Add page</button>
        )}
      </div>
    </div>
  );
}

// ── Sub-folder item ───────────────────────────────────────────────────────────
function SubFolderItem({ subFolder, pages, activePageId, isEditing, editingName, onEditingNameChange, onStartRename, onCommitRename, onUpdate, onAddPage, onDelete, onPageClick, onPageDelete }) {
  const [hovered, setHovered] = useState(false);
  const [menu, setMenu]       = useState(false);
  const inputRef = useRef(null);
  const menuRef  = useRef(null);

  useEffect(() => { if (isEditing) inputRef.current?.focus(); }, [isEditing]);
  useEffect(() => {
    if (!menu) return;
    const close = e => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  const toggle = () => onUpdate({ collapsed: !subFolder.collapsed });

  return (
    <div className="pg__subfolder">
      <div className={`pg__subfolder-row${hovered?' hover':''}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

        <button className="pg__chevron pg__chevron--sm" onClick={toggle}>
          <IcoChevron open={!subFolder.collapsed}/>
        </button>

        {/* Sub-folder badge (slightly different color) */}
        <div className="pg__subfolder-badge">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
          </svg>
        </div>

        {isEditing
          ? <input ref={inputRef} className="pg__folder-input" value={editingName}
              onChange={e => onEditingNameChange(e.target.value)} onBlur={onCommitRename}
              onKeyDown={e => { if(e.key==='Enter') onCommitRename(); if(e.key==='Escape'){ onEditingNameChange(subFolder.name); onCommitRename(); } }} />
          : <span className="pg__subfolder-name" onClick={toggle}>{subFolder.name}</span>
        }

        {hovered && !isEditing && (
          <div className="pg__folder-btns">
            <button className="pg__icon-action" onClick={onAddPage}><IcoPlus/></button>
            <button className="pg__icon-action" onClick={() => setMenu(m=>!m)}><IcoDots/></button>
          </div>
        )}
        {menu && (
          <div className="pg__menu" ref={menuRef}>
            <button onClick={() => { setMenu(false); onStartRename(); }}><IcoEdit/> Rename</button>
            <button onClick={() => { setMenu(false); onAddPage(); }}><IcoPlus/> New Page</button>
            <div className="pg__menu-sep"/>
            <button className="pg__menu-danger" onClick={() => { setMenu(false); onDelete(); }}><IcoTrash/> Delete</button>
          </div>
        )}
      </div>

      {/* Smooth animation via CSS */}
      <div className={`pg__subfolder-children${subFolder.collapsed ? ' pg__subfolder-children--closed' : ''}`}>
        {pages.map(p => (
          <PageItem key={p.id} page={p} indent active={p.id===activePageId}
            onSelect={() => onPageClick(p)} onDelete={() => onPageDelete(p.id)} />
        ))}
        {pages.length === 0 && (
          <button className="pg__folder-empty pg__folder-empty--sub" onClick={onAddPage}>+ Add page</button>
        )}
      </div>
    </div>
  );
}

function PageItem({ page, active, indent, onSelect, onDelete }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div className={`pg__page${active?' pg__page--active':''}${indent?' pg__page--indent':''}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      draggable
      onDragStart={e => {
        e.dataTransfer.setData('pg-pageref', JSON.stringify({ id: page.id, title: page.title || 'Untitled', icon: page.icon || '📄' }));
        e.dataTransfer.effectAllowed = 'link';
      }}>
      <button className="pg__page-main" onClick={onSelect}>
        <span className="pg__page-icon-wrap">
          <span className="pg__page-icon">{page.icon}</span>
        </span>
        <span className="pg__page-name">{page.title || 'Untitled'}</span>
      </button>
      {hovered && (
        <button className="pg__page-del" onClick={onDelete}><IcoTrash/></button>
      )}
    </div>
  );
}
