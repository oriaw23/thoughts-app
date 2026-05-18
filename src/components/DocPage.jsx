import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BlockEditor } from './Pages';
import './DocPage.css';
import './Pages.css';

// ── Storage ─────────────────────────────────────────────────────────────────
const STORE_KEY  = 'thoughts_docs_v2';
const CATS_KEY   = 'thoughts_docs_cats_v1';
const SHARES_KEY = 'thoughts_doc_shares_v1';
const GROUPS_KEY = 'mynotion_groups_v1';

const loadDocs   = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)  || '[]'); } catch { return []; } };
const saveDocs   = d => localStorage.setItem(STORE_KEY,  JSON.stringify(d));
const loadCats   = () => { try { return JSON.parse(localStorage.getItem(CATS_KEY)   || '[]'); } catch { return []; } };
const saveCats   = c => localStorage.setItem(CATS_KEY,   JSON.stringify(c));
const loadShares = () => { try { return JSON.parse(localStorage.getItem(SHARES_KEY) || '{}'); } catch { return {}; } };
const saveShares = s => localStorage.setItem(SHARES_KEY, JSON.stringify(s));
const loadGroups = () => { try { return JSON.parse(localStorage.getItem(GROUPS_KEY) || '[]'); } catch { return []; } };

const blankDoc = (parentId = null) => ({
  id: uuidv4(), title: '', content: '', categoryId: null, parentId,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

// ── Category colours ────────────────────────────────────────────────────────
const CAT_COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#ef4444','#ec4899','#14b8a6','#f97316'];

// ── Panel data ───────────────────────────────────────────────────────────────
const STYLE_ITEMS = [
  { type: 'paragraph', label: 'Paragraph', tag: 'P'   },
  { type: 'heading1',  label: 'Heading 1', tag: 'H1'  },
  { type: 'heading2',  label: 'Heading 2', tag: 'H2'  },
  { type: 'heading3',  label: 'Heading 3', tag: 'H3'  },
  { type: 'quote',     label: 'Quote',     tag: '"'   },
  { type: 'code',      label: 'Code',      tag: '</>' },
];
const INSERT_ITEMS = [
  { type: 'bullet',   label: 'Bullet list',   icon: '•'  },
  { type: 'numbered', label: 'Numbered list', icon: '1.' },
  { type: 'divider',  label: 'Divider',       icon: '—'  },
  { type: 'journal',  label: 'Journal entry', icon: '📓' },
];
const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64];
const ALIGN_ITEMS = [
  { id:'left',   label:'Left',
    icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
  { id:'center', label:'Center',
    icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
  { id:'right',  label:'Right',
    icon:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg> },
];
const MODES = [
  { id:'default', label:'Default', desc:'Clean prose writing',
    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> },
  { id:'script', label:'Script', desc:'Screenplay formatting',
    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="2" y="2" width="20" height="20" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="7" y1="16" x2="17" y2="16"/></svg> },
  { id:'book', label:'Book', desc:'Novel & long-form',
    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg> },
  { id:'work', label:'Academic', desc:'Formal document',
    icon:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg> },
];

// ── Main component ───────────────────────────────────────────────────────────
export default function DocPage() {
  const [docs,         setDocs]         = useState(loadDocs);
  const [cats,         setCats]         = useState(loadCats);
  const [shares,       setShares]       = useState(loadShares);
  const [groups]                        = useState(loadGroups);
  const [selId,        setSelId]        = useState(null);
  const [search,       setSearch]       = useState('');
  const [activeCat,    setActiveCat]    = useState(null);   // null = All
  const [catExpandId,  setCatExpandId]  = useState(null);   // docId whose picker is expanded
  const [expandedDocs, setExpandedDocs] = useState(() => new Set()); // parentIds expanded in list
  const [newCatName,   setNewCatName]   = useState('');
  const [addingCat,    setAddingCat]    = useState(false);
  const [shareOpen,    setShareOpen]    = useState(false);
  const [focus,        setFocus]        = useState(false);
  const [focusLeaving, setFocusLeaving] = useState(false);
  const [mouseActive,  setMouseActive]  = useState(false);
  const [panelOpen,    setPanelOpen]    = useState(false);
  const [mode,         setMode]         = useState('default');
  const [blockProps,   setBlockProps]   = useState(null);
  const [bookPreview,  setBookPreview]  = useState(false);
  const [pagesOpen,    setPagesOpen]    = useState(false);
  // Navigation history
  const [navIdx,       setNavIdx]       = useState(-1);
  const navHistory  = useRef([]);
  const mouseTimer  = useRef(null);
  const exitTimer   = useRef(null);
  const panelTimer  = useRef(null);
  const propsTimer  = useRef(null);
  const formatRef   = useRef(null);
  const focusFmtRef = useRef(null);
  const catInputRef    = useRef(null);
  const shareRef       = useRef(null);
  const contentAreaRef = useRef(null);

  const doc      = docs.find(d => d.id === selId) ?? null;
  const filtered = docs.filter(d => {
    if (activeCat && d.categoryId !== activeCat) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q);
  });

  // ── Doc CRUD ──────────────────────────────────────────────────────────────
  const update = (id, patch) => {
    const next = docs.map(d => d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d);
    setDocs(next); saveDocs(next);
  };

  const createDoc = (parentId = null) => {
    const d = blankDoc(parentId);
    if (activeCat) d.categoryId = activeCat;
    const next = [d, ...docs];
    setDocs(next); saveDocs(next); navigate(d.id);
    if (parentId) setExpandedDocs(prev => new Set([...prev, parentId]));
  };

  const toggleExpand = (id) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const deleteDoc = id => {
    const next = docs.filter(d => d.id !== id);
    setDocs(next); saveDocs(next);
    if (selId === id) setSelId(next[0]?.id ?? null);
  };

  // ── Categories ────────────────────────────────────────────────────────────
  const createCat = () => {
    const name = newCatName.trim();
    if (!name) { setAddingCat(false); return; }
    const color = CAT_COLORS[cats.length % CAT_COLORS.length];
    const next = [...cats, { id: uuidv4(), name, color }];
    setCats(next); saveCats(next);
    setNewCatName(''); setAddingCat(false);
  };

  const deleteCat = (id) => {
    const next = cats.filter(c => c.id !== id);
    setCats(next); saveCats(next);
    const updatedDocs = docs.map(d => d.categoryId === id ? { ...d, categoryId: null } : d);
    setDocs(updatedDocs); saveDocs(updatedDocs);
    if (activeCat === id) setActiveCat(null);
  };

  const assignCat = (docId, catId) => {
    update(docId, { categoryId: catId });
    setCatPickerId(null);
  };

  // ── Navigation history ────────────────────────────────────────────────────
  const navigate = useCallback((id) => {
    if (!id) { setSelId(null); return; }
    setNavIdx(prev => {
      const sliced = navHistory.current.slice(0, prev + 1);
      sliced.push(id);
      navHistory.current = sliced;
      return sliced.length - 1;
    });
    setSelId(id);
  }, []);

  const goBack = useCallback(() => {
    setNavIdx(prev => {
      if (prev <= 0) return prev;
      const next = prev - 1;
      setSelId(navHistory.current[next]);
      return next;
    });
  }, []);

  const goForward = useCallback(() => {
    setNavIdx(prev => {
      if (prev >= navHistory.current.length - 1) return prev;
      const next = prev + 1;
      setSelId(navHistory.current[next]);
      return next;
    });
  }, []);

  const canBack    = navIdx > 0;
  const canForward = navIdx < navHistory.current.length - 1;

  // ── Share ─────────────────────────────────────────────────────────────────
  const toggleShare = (docId, groupId) => {
    const prev = shares[docId] || [];
    const next = prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId];
    const updated = { ...shares, [docId]: next };
    setShares(updated); saveShares(updated);
  };
  const docSharedGroups = doc ? (shares[doc.id] || []) : [];

  // ── Focus mode ────────────────────────────────────────────────────────────
  const enterFocus = useCallback(() => {
    setFocus(true); setMouseActive(true);
    clearTimeout(mouseTimer.current);
    mouseTimer.current = setTimeout(() => setMouseActive(false), 2500);
  }, []);

  const exitFocus = useCallback(() => {
    if (focusLeaving) return;
    setFocusLeaving(true);
    exitTimer.current = setTimeout(() => { setFocus(false); setFocusLeaving(false); }, 320);
  }, [focusLeaving]);

  const onFocusMouseMove = useCallback(() => {
    setMouseActive(true);
    clearTimeout(mouseTimer.current);
    mouseTimer.current = setTimeout(() => setMouseActive(false), 2500);
  }, []);

  useEffect(() => {
    if (!focus) return;
    const fn = e => { if (e.key === 'Escape') exitFocus(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [focus, exitFocus]);

  // ── Panel ─────────────────────────────────────────────────────────────────
  const openPanel  = useCallback(() => { clearTimeout(panelTimer.current); setPanelOpen(true); }, []);
  const closePanel = useCallback(() => { panelTimer.current = setTimeout(() => setPanelOpen(false), 220); }, []);

  const activeFormatRef = focus ? focusFmtRef : formatRef;

  useEffect(() => {
    if (!panelOpen) return;
    const tick = () => setBlockProps(activeFormatRef.current?.getProps?.() || null);
    tick();
    propsTimer.current = setInterval(tick, 200);
    return () => clearInterval(propsTimer.current);
  }, [panelOpen, activeFormatRef]);

  const handleStyleClick = t  => { activeFormatRef.current?.changeType(t); setTimeout(() => setBlockProps(activeFormatRef.current?.getProps?.() || null), 30); };
  const handleInsertClick = t => activeFormatRef.current?.insertBlock(t);
  const handleAlignClick  = a => { activeFormatRef.current?.setAlign(a);    setTimeout(() => setBlockProps(activeFormatRef.current?.getProps?.() || null), 30); };
  const handleSizeClick   = s => { activeFormatRef.current?.setSize(s);     setTimeout(() => setBlockProps(activeFormatRef.current?.getProps?.() || null), 30); };

  // ── Misc ──────────────────────────────────────────────────────────────────
  useEffect(() => () => {
    clearTimeout(mouseTimer.current); clearTimeout(exitTimer.current);
    clearTimeout(panelTimer.current); clearInterval(propsTimer.current);
  }, []);

  // Close cat expand + share on outside click
  useEffect(() => {
    const fn = e => {
      if (catExpandId && !e.target.closest('.docp__item-wrap')) setCatExpandId(null);
      if (shareOpen && shareRef.current && !shareRef.current.contains(e.target)) setShareOpen(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [catExpandId, shareOpen]);

  useEffect(() => { if (addingCat) catInputRef.current?.focus(); }, [addingCat]);

  const modeClass = mode !== 'default' ? ` docp--mode-${mode}` : '';

  return (
    <div className={`docp${modeClass}`}>

      {/* ── Document list ── */}
      <div className="docp__list">

        {/* Category filter row */}
        <div className="docp__cats-bar">
          <button
            className={`docp__cat-chip${!activeCat ? ' docp__cat-chip--all' : ''}`}
            onClick={() => setActiveCat(null)}
          >All</button>
          {cats.map(c => (
            <button
              key={c.id}
              className={`docp__cat-chip${activeCat === c.id ? ' docp__cat-chip--active' : ''}`}
              style={activeCat === c.id ? { background: c.color, borderColor: c.color, color: '#fff' } : { borderColor: c.color, color: c.color }}
              onClick={() => setActiveCat(a => a === c.id ? null : c.id)}
            >
              {c.name}
              <span className="docp__cat-x" onMouseDown={e => { e.stopPropagation(); deleteCat(c.id); }}>×</span>
            </button>
          ))}
          {cats.length > 0 && <div className="docp__cats-sep"/>}
          {addingCat ? (
            <input
              ref={catInputRef}
              className="docp__cat-input"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createCat(); if (e.key === 'Escape') { setAddingCat(false); setNewCatName(''); } }}
              onBlur={createCat}
              placeholder="New category…"
            />
          ) : (
            <button className="docp__cat-add" onClick={() => setAddingCat(true)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New
            </button>
          )}
        </div>

        <div className="docp__list-head">
          <h2>Documents</h2>
          <button className="docp__new-btn" onClick={createDoc}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New
          </button>
        </div>

        <div className="docp__search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input dir="auto" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>

        <div className="docp__items">
          {filtered.filter(d => !d.parentId || !docs.find(p => p.id === d.parentId)).length === 0 && (
            <p className="docp__list-empty">{search ? 'No results' : 'No documents yet'}</p>
          )}
          {filtered.filter(d => !d.parentId || !docs.find(p => p.id === d.parentId)).map(d => {
            const cat = cats.find(c => c.id === d.categoryId);
            const expanded = catExpandId === d.id;
            const children = docs.filter(c => c.parentId === d.id);
            const isExpanded = expandedDocs.has(d.id);
            return (
              <div key={d.id} className={`docp__item-wrap${expanded ? ' docp__item-wrap--exp' : ''}`}>

                {/* Main row */}
                <button className={`docp__item${selId === d.id ? ' active' : ''}`} onClick={() => navigate(d.id)}>
                  <div className="docp__item-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                  </div>
                  <div className="docp__item-info">
                    <p className="docp__item-title">{d.title || 'Untitled'}</p>
                    <p className="docp__item-date">{new Date(d.updatedAt).toLocaleDateString()}</p>
                  </div>
                  <button className="docp__item-del" onClick={e => { e.stopPropagation(); deleteDoc(d.id); }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </button>

                {/* Category tag row */}
                <div className="docp__item-cat-row">
                  <button
                    className={`docp__item-cat-tag${!cat ? ' docp__item-cat-tag--empty' : ''}${expanded ? ' docp__item-cat-tag--open' : ''}`}
                    style={cat ? { background: cat.color + '22', color: cat.color, borderColor: cat.color + '55' } : {}}
                    onClick={() => setCatExpandId(p => p === d.id ? null : d.id)}
                  >
                    {cat ? (
                      <><span className="docp__item-cat-swatch" style={{ background: cat.color }}/>{cat.name}</>
                    ) : (
                      <><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>Add tag</>
                    )}
                    <svg className="docp__item-cat-chevron" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                  </button>
                </div>

                {/* Smooth-expanding category picker */}
                <div className={`docp__cat-expand${expanded ? ' docp__cat-expand--open' : ''}`}>
                  <div className="docp__cat-expand-inner">
                    <div className="docp__cat-grid">
                      {cats.map(c => {
                        const active = d.categoryId === c.id;
                        return (
                          <button
                            key={c.id}
                            className={`docp__cat-card${active ? ' docp__cat-card--active' : ''}`}
                            style={active
                              ? { background: c.color, borderColor: c.color, color: '#fff' }
                              : { background: c.color + '18', borderColor: c.color + '44', color: c.color }
                            }
                            onClick={() => assignCat(d.id, active ? null : c.id)}
                          >
                            <span className="docp__cat-card-name">{c.name}</span>
                            {active && (
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            )}
                          </button>
                        );
                      })}
                      {/* New category card */}
                      <button
                        className="docp__cat-card docp__cat-card--new"
                        onClick={() => { setAddingCat(true); setCatExpandId(null); }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        <span>New</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Children docs (sub-pages) */}
                {children.length > 0 && (
                  <button className="docp__tree-toggle" onClick={() => toggleExpand(d.id)}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{transform: isExpanded ? 'rotate(90deg)' : 'none', transition:'transform .18s'}}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {children.length} page{children.length > 1 ? 's' : ''}
                  </button>
                )}
                {isExpanded && children.map(child => (
                  <button
                    key={child.id}
                    className={`docp__item docp__item--child${selId === child.id ? ' active' : ''}`}
                    onClick={() => navigate(child.id)}
                  >
                    <div className="docp__item-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div className="docp__item-info">
                      <p className="docp__item-title">{child.title || 'Untitled'}</p>
                    </div>
                    <button className="docp__item-del" onClick={e => { e.stopPropagation(); deleteDoc(child.id); }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </button>
                ))}

                {/* Add sub-page button (shows on hover) */}
                <button className="docp__add-child" onClick={e => { e.stopPropagation(); createDoc(d.id); }} title="Add page">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add page
                </button>

              </div>
            );
          })}
        </div>
      </div>

      {/* ── Editor ── */}
      <div className="docp__editor-wrap">
        {doc ? (
          <div className="docp__editor">
            <div className="docp__body-row">

              {/* Scrollable area — topbar is sticky inside here */}
              <div className="docp__content-area" ref={contentAreaRef}>

                {/* Sticky topbar */}
                <div className="docp__editor-topbar">
                  <div className="docp__nav-btns">
                    <button className="docp__nav-btn" onClick={goBack} disabled={!canBack} title="Back">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
                    </button>
                    <button className="docp__nav-btn" onClick={goForward} disabled={!canForward} title="Forward">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                    </button>
                  </div>

                  {/* Breadcrumb if sub-page */}
                  <div className="docp__topbar-mid">
                    {doc.parentId && (() => {
                      const parent = docs.find(d => d.id === doc.parentId);
                      return parent ? (
                        <button className="docp__breadcrumb" onClick={() => navigate(parent.id)}>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>
                          {parent.title || 'Untitled'}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                      ) : null;
                    })()}
                    {mode !== 'default' && <span className={`docp__mode-badge docp__mode-badge--${mode}`}>{MODES.find(m => m.id === mode)?.label}</span>}
                    {(() => { const c = cats.find(c => c.id === doc.categoryId); return c ? <span className="docp__doc-cat-badge" style={{background: c.color+'22', color: c.color, borderColor: c.color+'44'}}>{c.name}</span> : null; })()}
                  </div>

                  <div className="docp__topbar-right">
                    <div className="docp__share-wrap" ref={shareRef}>
                      <button className={`docp__focus-btn${shareOpen ? ' docp__focus-btn--active' : ''}${docSharedGroups.length > 0 ? ' docp__focus-btn--shared' : ''}`} onClick={() => setShareOpen(o => !o)} title="Share">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                        {docSharedGroups.length > 0 ? `Shared (${docSharedGroups.length})` : 'Share'}
                      </button>
                      {shareOpen && (
                        <div className="docp__share-panel">
                          <p className="docp__share-title">Share with group</p>
                          {groups.length === 0 ? <p className="docp__share-empty">No groups yet</p> : groups.map(g => {
                            const gid = g.id || g._id; const gname = g.name || g.title || 'Unnamed'; const active = docSharedGroups.includes(gid);
                            return (
                              <button key={gid} className={`docp__share-group${active ? ' active' : ''}`} onClick={() => toggleShare(doc.id, gid)}>
                                <span className="docp__share-avatar">{gname[0]?.toUpperCase()}</span>
                                <span className="docp__share-gname">{gname}</span>
                                {active && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    {/* Pages side panel toggle */}
                    <button
                      className={`docp__focus-btn${pagesOpen ? ' docp__focus-btn--active' : ''}`}
                      onClick={() => setPagesOpen(o => !o)}
                      title="Sub-pages"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        <line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="12" y2="17"/>
                      </svg>
                      Pages
                    </button>
                    {mode === 'book' && (
                      <button className="docp__focus-btn docp__book-btn" onClick={() => setBookPreview(true)}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                        Preview Book
                      </button>
                    )}
                    <button className="docp__focus-btn" onClick={enterFocus}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>
                      Focus
                    </button>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="docp__content-scroll">
                  <div className="docp__page">
                    <input className="docp__title" value={doc.title} dir="auto" placeholder="Document title…" onChange={e => update(doc.id, { title: e.target.value })}/>
                    {!focus && (
                      <BlockEditor key={doc.id} pageId={doc.id} content={doc.content} onChange={val => update(doc.id, { content: val })} formatRef={formatRef}/>
                    )}
                  </div>
                </div>
              </div>

              {/* Pages side panel */}
              {(() => {
                const children = docs.filter(d => d.parentId === doc.id);
                return (
                  <div className={`docp__pages-panel${pagesOpen ? ' docp__pages-panel--open' : ''}`}>
                    <div className="docp__pages-panel-inner">

                      <div className="docp__pp-header">
                        <div className="docp__pp-heading">
                          <span className="docp__pp-title">Pages</span>
                          <button className="docp__pp-new" onClick={() => createDoc(doc.id)} title="New page">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                          </button>
                        </div>
                        <div className="docp__pp-search">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                          <input placeholder="Search pages…" />
                        </div>
                      </div>

                      {children.length === 0 ? (
                        <div className="docp__pp-empty">
                          <div className="docp__pp-empty-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          </div>
                          <p>No pages yet.<br/>Create the first one.</p>
                          <button className="docp__pp-empty-btn" onClick={() => createDoc(doc.id)}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            New page
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="docp__pp-list">
                            {children.map(child => (
                              <button
                                key={child.id}
                                className={`docp__pp-item${selId === child.id ? ' active' : ''}`}
                                onClick={() => navigate(child.id)}
                              >
                                <div className="docp__pp-item-body">
                                  <p className="docp__pp-item-title">{child.title || 'Untitled'}</p>
                                  <p className="docp__pp-item-date">{new Date(child.updatedAt).toLocaleDateString()}</p>
                                </div>
                                <button className="docp__pp-item-del" onClick={e => { e.stopPropagation(); deleteDoc(child.id); }}>
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                </button>
                              </button>
                            ))}
                          </div>
                          <div className="docp__pp-footer">{children.length} page{children.length !== 1 ? 's' : ''}</div>
                        </>
                      )}

                    </div>
                  </div>
                );
              })()}

              {/* Hover-triggered format panel */}
              <div className={`docp__panel${panelOpen ? ' docp__panel--open' : ''}`} onMouseEnter={openPanel} onMouseLeave={closePanel}>
                <PanelContent blockProps={blockProps} mode={mode} onStyle={handleStyleClick} onInsert={handleInsertClick} onAlign={handleAlignClick} onSize={handleSizeClick} onMode={setMode}/>
              </div>
            </div>
          </div>
        ) : (
          <div className="docp__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.18"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            <h3>No document selected</h3>
            <p>Select a document or create a new one</p>
            <button onClick={createDoc}>+ New Document</button>
          </div>
        )}
      </div>

      {/* ── Focus overlay ── */}
      {focus && doc && (
        <div className={`docp__focus-overlay${focusLeaving ? ' docp__focus-overlay--out' : ''}`} onMouseMove={onFocusMouseMove}>
          <div className={`docp__focus-controls${mouseActive ? ' docp__focus-controls--vis' : ''}`}>
            <button className="docp__focus-exit-btn" onClick={exitFocus}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
              Exit Focus
            </button>
            <kbd className="docp__focus-esc">Esc</kbd>
          </div>

          <div className="docp__focus-body">
            <div className="docp__focus-doc">
              <input className="docp__title docp__focus-title" value={doc.title} dir="auto" placeholder="Untitled…" onChange={e => update(doc.id, { title: e.target.value })} autoFocus/>
              <BlockEditor key={`focus-${doc.id}`} pageId={doc.id} content={doc.content} onChange={val => update(doc.id, { content: val })} formatRef={focusFmtRef}/>
            </div>
          </div>

          <div className={`docp__panel docp__panel--focus${panelOpen ? ' docp__panel--open' : ''}`} onMouseEnter={openPanel} onMouseLeave={closePanel}>
            <PanelContent blockProps={blockProps} mode={mode} onStyle={handleStyleClick} onInsert={handleInsertClick} onAlign={handleAlignClick} onSize={handleSizeClick} onMode={setMode}/>
          </div>
        </div>
      )}

      {/* ── Book Preview ── */}
      {bookPreview && doc && (
        <BookPreview doc={doc} cats={cats} onClose={() => setBookPreview(false)} />
      )}
    </div>
  );
}

// ── Book Preview component ────────────────────────────────────────────────────
function parsePages(content) {
  let blocks = [];
  try { blocks = JSON.parse(content || '[]'); } catch {}
  const pages = [];
  let cur = [], w = 0;
  const PAGE_W = 480;
  const bw = b => b.type === 'heading1' ? 220 : b.type === 'heading2' ? 160 : b.type === 'heading3' ? 120 : b.type === 'divider' ? 40 : Math.max(40, (b.text || '').length);
  for (const b of blocks) {
    const wt = bw(b);
    if (w + wt > PAGE_W && cur.length) { pages.push(cur); cur = [b]; w = wt; }
    else { cur.push(b); w += wt; }
  }
  if (cur.length) pages.push(cur);
  if (!pages.length) pages.push([]);
  return pages;
}

function BookPage({ blocks }) {
  if (!blocks) return null;
  return (
    <div className="bp__content">
      {blocks.map((b, i) => {
        if (!b.text && b.type !== 'divider') return null;
        switch (b.type) {
          case 'heading1':  return <h2 key={i} className="bp__h1">{b.text}</h2>;
          case 'heading2':  return <h3 key={i} className="bp__h2">{b.text}</h3>;
          case 'heading3':  return <h4 key={i} className="bp__h3">{b.text}</h4>;
          case 'quote':     return <blockquote key={i} className="bp__quote">{b.text}</blockquote>;
          case 'bullet':    return <p key={i} className="bp__bullet">• {b.text}</p>;
          case 'numbered':  return <p key={i} className="bp__num">{i + 1}. {b.text}</p>;
          case 'divider':   return <div key={i} className="bp__rule"/>;
          default:          return <p key={i} className="bp__para">{b.text}</p>;
        }
      })}
    </div>
  );
}

function BookPreview({ doc, cats, onClose }) {
  const [spread, setSpread]       = useState(0);
  const [anim,   setAnim]         = useState(null); // {dir:'fwd'|'bwd', to: number}

  const pages        = useMemo(() => parsePages(doc.content), [doc.content]);
  const totalSpreads = 1 + Math.ceil(pages.length / 2); // 0 = cover

  const getSpread = s => ({
    isCover: s === 0,
    left:    s === 0 ? null : (pages[(s - 1) * 2]     || null),
    right:   s === 0 ? null : (pages[(s - 1) * 2 + 1] || null),
    lNum:    s > 0 ? (s - 1) * 2 + 1 : null,
    rNum:    s > 0 ? (s - 1) * 2 + 2 : null,
  });

  const cur  = getSpread(spread);
  const next = anim ? getSpread(anim.to) : null;
  const isFlipping = !!anim;

  const flip = useCallback((dir) => {
    if (isFlipping) return;
    const to = dir === 'fwd' ? spread + 1 : spread - 1;
    if (to < 0 || to >= totalSpreads) return;
    setAnim({ dir, to });
    setTimeout(() => { setSpread(to); setAnim(null); }, 680);
  }, [isFlipping, spread, totalSpreads]);

  useEffect(() => {
    const fn = e => {
      if (e.key === 'ArrowRight') flip('fwd');
      if (e.key === 'ArrowLeft')  flip('bwd');
      if (e.key === 'Escape')     onClose();
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [flip, onClose]);

  const cat = cats.find(c => c.id === doc.categoryId);

  return (
    <div className="bp" onClick={e => e.target === e.currentTarget && onClose()}>

      {/* Close */}
      <button className="bp__close" onClick={onClose}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      {/* Title bar */}
      <p className="bp__title-bar">{doc.title || 'Untitled'}</p>

      {/* Book */}
      <div className="bp__scene">
        <div className="bp__book">

          {/* LEFT PAGE */}
          <div className="bp__page bp__page--left">
            <div key={`L${spread}`} className="bp__page-body bp__page-body--enter-left">
              {cur.isCover ? (
                <div className="bp__inside-cover">
                  <div className="bp__inside-ornament">❧</div>
                  <p className="bp__inside-title">{doc.title || 'Untitled'}</p>
                </div>
              ) : cur.left ? (
                <>
                  <BookPage blocks={cur.left} />
                  <span className="bp__page-num">{cur.lNum}</span>
                </>
              ) : (
                <div className="bp__page-end">∎</div>
              )}
            </div>

            {/* Backward flip — left page peels right */}
            {isFlipping && anim.dir === 'bwd' && (
              <div className="bp__flip bp__flip--bwd-left">
                <div className="bp__flip-face bp__flip-front">
                  <div className="bp__page-body">
                    {cur.isCover ? (
                      <div className="bp__inside-cover">
                        <div className="bp__inside-ornament">❧</div>
                        <p className="bp__inside-title">{doc.title || 'Untitled'}</p>
                      </div>
                    ) : cur.left ? (
                      <><BookPage blocks={cur.left}/><span className="bp__page-num">{cur.lNum}</span></>
                    ) : null}
                  </div>
                </div>
                <div className="bp__flip-face bp__flip-back">
                  <div className="bp__page-body">
                    {next && !next.isCover && next.right ? (
                      <><BookPage blocks={next.right}/><span className="bp__page-num bp__page-num--r">{next.rNum}</span></>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SPINE */}
          <div className="bp__spine">
            <div className="bp__spine-hl"/>
          </div>

          {/* RIGHT PAGE */}
          <div className="bp__page bp__page--right">
            {/* Static layer: next spread's right page (visible during forward flip) */}
            {isFlipping && anim.dir === 'fwd' && next && (
              <div className="bp__page-body bp__page-static" style={{position:'absolute',inset:0}}>
                {next.isCover ? null : next.right ? (
                  <><BookPage blocks={next.right}/><span className="bp__page-num bp__page-num--r">{next.rNum}</span></>
                ) : <div className="bp__page-end">∎</div>}
              </div>
            )}

            {/* Static: cur.right when no flip or bwd flip just started */}
            {(!isFlipping || anim.dir === 'bwd') && (
              <div key={`R${spread}`} className="bp__page-body bp__page-body--enter-right">
                {cur.isCover ? (
                  <div className="bp__cover">
                    <div className="bp__cover-texture"/>
                    <div className="bp__cover-inner">
                      <div className="bp__cover-deco">
                        <span/><span/><span/>
                      </div>
                      <h1 className="bp__cover-title">{doc.title || 'Untitled'}</h1>
                      {cat && <span className="bp__cover-genre">{cat.name}</span>}
                      <div className="bp__cover-line"/>
                    </div>
                  </div>
                ) : cur.right ? (
                  <><BookPage blocks={cur.right}/><span className="bp__page-num bp__page-num--r">{cur.rNum}</span></>
                ) : <div className="bp__page-end">∎</div>}
              </div>
            )}

            {/* Forward flip — right page peels left */}
            {isFlipping && anim.dir === 'fwd' && (
              <div className="bp__flip bp__flip--fwd-right">
                <div className="bp__flip-face bp__flip-front">
                  <div className="bp__page-body">
                    {cur.isCover ? (
                      <div className="bp__cover">
                        <div className="bp__cover-texture"/>
                        <div className="bp__cover-inner">
                          <div className="bp__cover-deco"><span/><span/><span/></div>
                          <h1 className="bp__cover-title">{doc.title || 'Untitled'}</h1>
                          {cat && <span className="bp__cover-genre">{cat.name}</span>}
                          <div className="bp__cover-line"/>
                        </div>
                      </div>
                    ) : cur.right ? (
                      <><BookPage blocks={cur.right}/><span className="bp__page-num bp__page-num--r">{cur.rNum}</span></>
                    ) : null}
                  </div>
                </div>
                <div className="bp__flip-face bp__flip-back">
                  <div className="bp__page-body">
                    {next && !next.isCover && next.left ? (
                      <><BookPage blocks={next.left}/><span className="bp__page-num">{next.lNum}</span></>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* Navigation */}
      <div className="bp__nav">
        <button className="bp__nav-btn" onClick={() => flip('bwd')} disabled={!spread || isFlipping}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <span className="bp__nav-label">
          {spread === 0
            ? 'Cover'
            : `Pages ${cur.lNum ?? ''}–${Math.min(cur.rNum ?? cur.lNum, pages.length)} of ${pages.length}`}
        </span>
        <button className="bp__nav-btn" onClick={() => flip('fwd')} disabled={spread >= totalSpreads - 1 || isFlipping}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      <p className="bp__hint">← → Arrow keys to turn pages · Esc to close</p>
    </div>
  );
}

// ── Sub-pages section shown at the bottom of each document ──────────────────
function SubPagesSection({ docId, docs, onOpen, onCreate }) {
  const children = docs.filter(d => d.parentId === docId);
  return (
    <div className="docp__subpages">
      <div className="docp__subpages-header">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>Pages</span>
        <span className="docp__subpages-count">{children.length}</span>
        <button className="docp__subpages-add" onClick={onCreate}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New page
        </button>
      </div>
      {children.length > 0 && (
        <div className="docp__subpages-list">
          {children.map(c => (
            <button key={c.id} className="docp__subpage-card" onClick={() => onOpen(c.id)}>
              <div className="docp__subpage-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
              <div className="docp__subpage-info">
                <p className="docp__subpage-title">{c.title || 'Untitled'}</p>
                <p className="docp__subpage-date">{new Date(c.updatedAt).toLocaleDateString()}</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="docp__subpage-arr"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          ))}
        </div>
      )}
      {children.length === 0 && (
        <button className="docp__subpages-empty" onClick={onCreate}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          Add your first page here
        </button>
      )}
    </div>
  );
}

// ── Panel content (shared between normal + focus) ────────────────────────────
function PanelContent({ blockProps, mode, onStyle, onInsert, onAlign, onSize, onMode }) {
  const curType  = blockProps?.type;
  const curAlign = blockProps?.align || 'left';
  const curSize  = blockProps?.fontSize;
  return (
    <div className="docp__panel-inner">
      <div className="docp__panel-section">
        <p className="docp__panel-label">Text Style</p>
        <div className="docp__style-grid">
          {STYLE_ITEMS.map(item => (
            <button key={item.type} className={`docp__style-btn${curType === item.type ? ' docp__style-btn--active' : ''}`} onMouseDown={e => { e.preventDefault(); onStyle(item.type); }} title={item.label}>
              <span className="docp__style-icon">{item.tag}</span>
              <span className="docp__style-label">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="docp__panel-section">
        <p className="docp__panel-label">Alignment</p>
        <div className="docp__align-row">
          {ALIGN_ITEMS.map(a => (
            <button key={a.id} className={`docp__align-btn${curAlign === a.id ? ' docp__align-btn--active' : ''}`} onMouseDown={e => { e.preventDefault(); onAlign(a.id); }} title={a.label}>
              {a.icon}<span>{a.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="docp__panel-section">
        <p className="docp__panel-label">Font Size</p>
        <div className="docp__size-grid">
          {FONT_SIZES.map(sz => (
            <button key={sz} className={`docp__size-btn${curSize === sz ? ' docp__size-btn--active' : ''}`} onMouseDown={e => { e.preventDefault(); onSize(sz); }}>{sz}</button>
          ))}
        </div>
      </div>
      <div className="docp__panel-section">
        <p className="docp__panel-label">Insert Block</p>
        <div className="docp__insert-list">
          {INSERT_ITEMS.map(item => (
            <button key={item.type} className="docp__insert-btn" onMouseDown={e => { e.preventDefault(); onInsert(item.type); }}>
              <span className="docp__insert-icon">{item.icon}</span>{item.label}
            </button>
          ))}
        </div>
      </div>
      <div className="docp__panel-section">
        <p className="docp__panel-label">Writing Mode</p>
        <div className="docp__modes-list">
          {MODES.map(m => (
            <button key={m.id} className={`docp__mode-btn${mode === m.id ? ' docp__mode-btn--active' : ''}`} onClick={() => onMode(m.id)}>
              <span className="docp__mode-icon">{m.icon}</span>
              <div className="docp__mode-info"><span className="docp__mode-name">{m.label}</span><span className="docp__mode-desc">{m.desc}</span></div>
              {mode === m.id && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="docp__mode-check"><polyline points="20 6 9 17 4 12"/></svg>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
