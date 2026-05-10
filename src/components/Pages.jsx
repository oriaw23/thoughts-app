import { useState, useRef, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ProjectPicker from './ProjectPicker';
import './Pages.css';

// ── Block helpers ─────────────────────────────────────────────────────────────
function freshBlock(type = 'paragraph', text = '') {
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
  return b;
}
function parseContent(raw) {
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
const PAGE_ICONS = ['📄','📝','💡','🎯','📊','🗂️','📚','🔖','✨','🛠️','🎨','🌟','📋','🗓️','💭','🔮','⚡','🧠','🚀','❤️','🏗️','🎵','🌿','🔥'];
const CARD_COLORS = ['#fff9c4','#fce7f3','#dbeafe','#d1fae5','#ede9fe','#ffedd5','#fef3c7','#f0fdf4','#fdf4ff','#ecfeff'];
const TOOLBAR_GROUPS = [
  {items:[{type:'heading1',icon:'H1',label:'Heading 1'},{type:'heading2',icon:'H2',label:'Heading 2'},{type:'heading3',icon:'H3',label:'Heading 3'},{type:'paragraph',icon:'¶',label:'Text'}]},
  {items:[{type:'bullet',icon:'•',label:'Bullet'},{type:'numbered',icon:'1.',label:'Numbered'},{type:'todo',icon:'☑',label:'To-do'}]},
  {items:[{type:'quote',icon:'"',label:'Quote'},{type:'code',icon:'</>',label:'Code'},{type:'callout',icon:'💡',label:'Callout'},{type:'divider',icon:'—',label:'Divider'}]},
  {items:[{type:'table',icon:'⊞',label:'Table'},{type:'board',icon:'⊟',label:'Board'},{type:'gallery',icon:'🖼',label:'Gallery'},{type:'timeline',icon:'⏱',label:'Timeline'},{type:'cards',icon:'▦',label:'Cards'}]},
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

// ── Media storage ─────────────────────────────────────────────────────────────
const MEDIA_KEY  = 'thoughts_media_v1';
const MEDIA_CATS = ['All','Work','Learning','Entertainment','Research','Inspiration'];
function loadMedia()  { try { const d=JSON.parse(localStorage.getItem(MEDIA_KEY)||'{}'); return {links:d.links||[],tables:d.tables||[],images:d.images||[]}; } catch { return {links:[],tables:[],images:[]}; } }
function saveMedia(d) { localStorage.setItem(MEDIA_KEY,JSON.stringify(d)); }
function getYTThumb(url) { const m=url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/); return m?`https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`:null; }

// ── Main component ────────────────────────────────────────────────────────────
const MEDIA_ID = '__media__';

export default function Pages({
  folders=[], pages=[], activePageId,
  onSelectPage, onCreatePage, onUpdatePage, onDeletePage,
  onCreateFolder, onUpdateFolder, onDeleteFolder, onReorderFolders,
}) {
  const [iconPicker, setIconPicker] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [panelOpen, setPanelOpen]   = useState(true);
  const [sideOpen, setSideOpen]     = useState(false);
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

  // Split panes: array of pageIds shown alongside the main editor
  const [splitPages,    setSplitPages]    = useState([]);
  const [dragOverEditor, setDragOverEditor] = useState(false);

  const addSplitPane   = (pageId) => { if (!splitPages.includes(pageId)) setSplitPages(p => [...p, pageId]); };
  const removeSplitPane = (pageId) => setSplitPages(p => p.filter(id => id !== pageId));

  const currentPage  = pages.find(p => p.id === activePageId) || null;
  const ungrouped    = pages.filter(p => !p.folderId);
  const isMediaActive = activeTabId === MEDIA_ID;

  // Keep tab titles in sync with page edits
  useEffect(() => {
    setTabs(prev => prev.map(t => {
      const pg = pages.find(p => p.id === t.refId);
      return pg ? { ...t, title: pg.title || 'Untitled', icon: pg.icon } : t;
    }));
  }, [pages]);

  // Auto-open a tab when activePageId changes to a page that has no tab yet
  useEffect(() => {
    if (!activePageId) return;
    const pg = pages.find(p => p.id === activePageId);
    if (!pg) return;
    setTabs(prev => {
      if (prev.some(t => t.refId === activePageId)) return prev; // already has a tab
      const tab = { id: uuidv4(), refId: pg.id, title: pg.title || 'Untitled', icon: pg.icon };
      // Activate the new tab after state update
      setTimeout(() => setActiveTabId(tab.id), 0);
      return [...prev, tab];
    });
  }, [activePageId, pages]);

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

  // Tab drop: if dropped ON a different tab → assign shared color only
  const handleTabDrop = (e, toIdx) => {
    if (dragTabIdx !== null && toIdx !== null && dragTabIdx !== toIdx) {
      const droppedTab = tabs[dragTabIdx];
      const targetTab  = tabs[toIdx];
      if (droppedTab?.refId && targetTab?.refId) {
        linkTabColors(droppedTab.refId, targetTab.refId);
      }
    }
    setDragTabIdx(null); setDragOverTabIdx(null);
  };

  const handleNewPage   = (folderId=null) => { onCreatePage(folderId); };
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
    <div className="pg" onMouseMove={handleMouseMove} onClick={() => setIconPicker(false)}>

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
                <p>No pages yet</p>
                <button onClick={() => handleNewPage(null)}>+ New Page</button>
              </div>
            )}
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

        {/* Tab bar — permanent Media tab + page tabs */}
        <div className="pg__tabbar">
          {/* Permanent Media tab */}
          <div
            className={`pg__tab pg__tab--pinned${isMediaActive ? ' pg__tab--active' : ''}`}
            onClick={() => setActiveTabId(MEDIA_ID)}
          >
            <span className="pg__tab-icon">📎</span>
            <span className="pg__tab-title">Media</span>
          </div>

          {tabs.length > 0 && <div className="pg__tab-sep" />}

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
                return (
                  <div key={tab.id}
                    className={`pg__tab${activeTabId===tab.id?' pg__tab--active':''}${dragOverTabIdx===origIdx?' pg__tab--dragover':''}`}
                    style={color ? { '--tab-link': color } : {}}
                    onClick={() => activateTab(tab)}
                    draggable
                    onDragStart={e => {
                      setDragTabIdx(origIdx);
                      e.dataTransfer.setData('pg-split-tab', tab.refId || '');
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onDragOver={e => { e.preventDefault(); setDragOverTabIdx(origIdx); }}
                    onDrop={e => { e.preventDefault(); handleTabDrop(e, origIdx); }}
                    onDragEnd={() => { setDragTabIdx(null); setDragOverTabIdx(null); setDragOverEditor(false); }}
                  >
                    {/* Color dot — click to collapse this color group */}
                    {color && (
                      <span className="pg__tab-link-dot" style={{ background: color }}
                        onClick={e => { e.stopPropagation(); toggleColorGroup(color); }}
                        title="Click to collapse linked tabs" />
                    )}
                    <span className="pg__tab-icon">{tab.icon}</span>
                    <span className="pg__tab-title">{tab.title || 'Untitled'}</span>
                    {dragOverTabIdx === origIdx && dragTabIdx !== null && dragTabIdx !== origIdx && (
                      <span className="pg__tab-peek-hint">🔗 link</span>
                    )}
                    <button className="pg__tab-x"
                      onClick={e => { closeTab(tab.id, e); if (tab.refId) clearTabColor(tab.refId); }}
                    ><IcoX /></button>
                  </div>
                );
              });
            })()}
          </div>
          <button className="pg__tab-add" onClick={() => handleNewPage(null)} title="New page"><IcoPlus /></button>
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

        {/* Content row: editor + optional media side panel */}
        <div className={`pg__content-row${isMediaActive && panelOpen ? ' pg__content-row--panel' : ''}`}>

          {/* Split-pane container */}
          <div className="pg__editor-col"
            onDragOver={e => {
              if (e.dataTransfer.types.includes('pg-split-tab')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                setDragOverEditor(true);
              }
            }}
            onDragLeave={() => setDragOverEditor(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOverEditor(false);
              const pageId = e.dataTransfer.getData('pg-split-tab');
              if (pageId && pageId !== activePageId) addSplitPane(pageId);
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
              <div className="pg__editor">
                <div className="pg__topbar">
                  <div className="pg__topbar-crumb">
                    {pageFolderParent && <><span>{pageFolderParent.name}</span><span className="pg__crumb-sep">›</span></>}
                    {pageFolder && <><span>{pageFolder.name}</span><span className="pg__crumb-sep">›</span></>}
                    <span>{currentPage.title || 'Untitled'}</span>
                  </div>
                  <div className="pg__topbar-actions">
                    <ProjectPicker itemId={currentPage.id} field="pageIds" />
                    <button className={`pg__topbar-btn${sideOpen?' active':''}`} onClick={() => setSideOpen(o=>!o)}>
                      <IcoSide /> Notes
                    </button>
                    <div className="pg__topbar-sep" />
                    <button className="pg__del-btn" onClick={() => onDeletePage(currentPage.id)}><IcoTrash /></button>
                  </div>
                </div>
                <div className={`pg__split${sideOpen?' pg__split--open':''}`}>
                  <div className="pg__writing">
                    <div className="pg__writing-inner">
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
                      <input className="pg__title" value={currentPage.title}
                        onChange={e => onUpdatePage(currentPage.id,{title:e.target.value})}
                        placeholder="Untitled" />
                      <BlockEditor pageId={currentPage.id} content={currentPage.content||''}
                        onChange={val => onUpdatePage(currentPage.id,{content:val})} />
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
            return (
              <SplitPane
                key={pageId}
                page={pg}
                onClose={() => removeSplitPane(pageId)}
                onUpdate={changes => onUpdatePage(pg.id, changes)}
              />
            );
          })}

          {/* Media side panel — slides in when Media tab is active */}
          {isMediaActive && (
            <MediaPanel pages={pages} onClose={() => setActiveTabId(tabs[0]?.id || null)} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Split pane ────────────────────────────────────────────────────────────────
function SplitPane({ page, onClose, onUpdate }) {
  return (
    <div className="pg__split-pane">
      {/* Pane header */}
      <div className="pg__pane-head">
        <span className="pg__pane-icon">{page.icon}</span>
        <span className="pg__pane-title">{page.title || 'Untitled'}</span>
        <button className="pg__pane-close" onClick={onClose} title="Close pane">✕</button>
      </div>
      {/* Pane content — full block editor */}
      <div className="pg__pane-body">
        <div className="pg__pane-inner">
          <input
            className="pg__pane-page-title"
            value={page.title}
            onChange={e => onUpdate({ title: e.target.value })}
            placeholder="Untitled"
          />
          <BlockEditor
            pageId={page.id}
            content={page.content || ''}
            onChange={val => onUpdate({ content: val })}
          />
        </div>
      </div>
    </div>
  );
}

// ── Media side panel ──────────────────────────────────────────────────────────
function MediaPanel({ onClose, pages = [] }) {
  const [d, setD]             = useState(loadMedia);
  const [section, setSection] = useState('links');
  const [filterCat, setFilterCat]     = useState('All');
  const [filterPageId, setFilterPageId] = useState(null); // null = All pages
  const [addLink,  setAddLink]  = useState({ show:false, title:'', url:'', cat:'Work', desc:'' });
  const [addTable, setAddTable] = useState({ show:false, name:'' });
  const [addImg,   setAddImg]   = useState({ show:false, url:'', title:'', desc:'' });
  const fileInputRef = useRef(null);

  const commit = (patch) => { const next={...d,...patch}; setD(next); saveMedia(next); };

  // Filter helpers: show items that match the selected page (or all if null)
  const matchesPage = (item) => filterPageId ? item.pageId === filterPageId : true;
  const selectedPageObj = pages.find(p => p.id === filterPageId) || null;

  const submitLink = () => {
    if (!addLink.url.trim()) return;
    const link = {id:uuidv4(),title:addLink.title||addLink.url,url:addLink.url.trim(),cat:addLink.cat,desc:addLink.desc,pageId:filterPageId||null,createdAt:new Date().toISOString()};
    commit({links:[...d.links,link]});
    setAddLink({show:false,title:'',url:'',cat:'Work',desc:''});
  };
  const removeLink = (id) => commit({links:d.links.filter(l=>l.id!==id)});

  // Images
  const submitImg = () => {
    if (!addImg.url.trim()) return;
    const img = { id:uuidv4(), url:addImg.url.trim(), title:addImg.title, desc:addImg.desc, pageId:filterPageId||null, createdAt:new Date().toISOString() };
    commit({ images:[...(d.images||[]), img] });
    setAddImg({ show:false, url:'', title:'', desc:'' });
  };
  const removeImg = (id) => commit({ images:(d.images||[]).filter(i=>i.id!==id) });
  const updateImgDesc = (id, desc) => commit({ images:(d.images||[]).map(i=>i.id===id?{...i,desc}:i) });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = { id:uuidv4(), url:ev.target.result, title:file.name.replace(/\.[^.]+$/,''), desc:'', pageId:filterPageId||null, createdAt:new Date().toISOString() };
      commit({ images:[...(d.images||[]), img] });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const submitTable = () => {
    if (!addTable.name.trim()) return;
    const tbl = {id:uuidv4(),name:addTable.name,rows:[['Column 1','Column 2'],['','']],pageId:filterPageId||null};
    commit({tables:[...d.tables,tbl]});
    setAddTable({show:false,name:''});
  };
  const removeTable = (id) => commit({tables:d.tables.filter(t=>t.id!==id)});
  const updateCell = (tId,r,c,v) => commit({tables:d.tables.map(t=>t.id!==tId?t:{...t,rows:t.rows.map((row,ri)=>ri===r?row.map((cell,ci)=>ci===c?v:cell):row)})});
  const addRow = (tId) => commit({tables:d.tables.map(t=>t.id!==tId?t:{...t,rows:[...t.rows,Array(t.rows[0]?.length||2).fill('')]})});
  const addCol = (tId) => commit({tables:d.tables.map(t=>t.id!==tId?t:{...t,rows:t.rows.map(r=>[...r,''])})});

  const filtered = (filterCat==='All' ? d.links : d.links.filter(l=>l.cat===filterCat)).filter(matchesPage);

  return (
    <div className="mp">
      {/* Header */}
      <div className="mp__head">
        <span className="mp__title">📎 Media</span>
        <div className="mp__head-right">
          <div className="mp__sections">
            <button className={`mp__sec-btn${section==='links'?' active':''}`}  onClick={() => setSection('links')}>Links</button>
            <button className={`mp__sec-btn${section==='images'?' active':''}`} onClick={() => setSection('images')}>Images</button>
            <button className={`mp__sec-btn${section==='tables'?' active':''}`} onClick={() => setSection('tables')}>Tables</button>
          </div>
          <button className="mp__close" onClick={onClose}>✕</button>
        </div>
      </div>
      {/* Page filter row */}
      <div className="mp__page-row">
        <span className="mp__page-icon">📄</span>
        <select className="mp__page-select" value={filterPageId||''} onChange={e=>setFilterPageId(e.target.value||null)}>
          <option value="">All Pages</option>
          {pages.map(p=><option key={p.id} value={p.id}>{p.icon} {p.title||'Untitled'}</option>)}
        </select>
        {filterPageId && <button className="mp__page-clear" onClick={()=>setFilterPageId(null)}>✕</button>}
      </div>

      {/* Links section */}
      {section === 'links' && (
        <div className="mp__body">
          <div className="mp__cats">
            {MEDIA_CATS.map(c => (
              <button key={c} className={`mp__cat${filterCat===c?' active':''}`} onClick={() => setFilterCat(c)}>{c}</button>
            ))}
            <button className="mp__add-btn" onClick={() => setAddLink(f=>({...f,show:true}))}>+ Add</button>
          </div>

          {filtered.length === 0 ? (
            <div className="mp__empty"><span>🔗</span><p>No links yet</p></div>
          ) : (
            <div className="mp__links">
              {filtered.map(link => {
                const thumb = getYTThumb(link.url);
                const linkPage = !filterPageId && link.pageId ? pages.find(p=>p.id===link.pageId) : null;
                return (
                  <div key={link.id} className="mp__link">
                    {thumb ? (
                      <div className="mp__thumb-wrap">
                        <img src={thumb} alt="" className="mp__thumb" loading="lazy" />
                        <div className="mp__play">▶</div>
                      </div>
                    ) : (
                      <div className="mp__link-icon">🔗</div>
                    )}
                    <div className="mp__link-body">
                      <span className="mp__link-cat">{link.cat}</span>
                      <a href={link.url} target="_blank" rel="noreferrer" className="mp__link-title">{link.title}</a>
                      {link.desc && <p className="mp__link-desc">{link.desc}</p>}
                      {linkPage && <span className="mp__item-page">{linkPage.icon} {linkPage.title||'Untitled'}</span>}
                    </div>
                    <button className="mp__del" onClick={() => removeLink(link.id)}>✕</button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add link form */}
          {addLink.show && (
            <div className="mp__form">
              <input className="mp__input" autoFocus value={addLink.url} placeholder="URL..." onChange={e => setAddLink(f=>({...f,url:e.target.value}))} />
              <input className="mp__input" value={addLink.title} placeholder="Title (optional)" onChange={e => setAddLink(f=>({...f,title:e.target.value}))} />
              <select className="mp__select" value={addLink.cat} onChange={e => setAddLink(f=>({...f,cat:e.target.value}))}>
                {MEDIA_CATS.slice(1).map(c => <option key={c}>{c}</option>)}
              </select>
              <textarea className="mp__textarea" rows={2} value={addLink.desc} placeholder="Notes..." onChange={e => setAddLink(f=>({...f,desc:e.target.value}))} />
              <div className="mp__form-foot">
                <button className="mp__cancel" onClick={() => setAddLink(f=>({...f,show:false}))}>Cancel</button>
                <button className="mp__save" onClick={submitLink}>Add Link</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Images section */}
      {section === 'images' && (
        <div className="mp__body">
          {/* Hidden file input */}
          <input ref={fileInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileUpload} />

          {/* Toolbar */}
          <div className="mp__img-toolbar">
            <button className="mp__add-btn" onClick={() => setAddImg(f=>({...f,show:true}))}>+ Add Image URL</button>
            <button className="mp__upload-btn" onClick={() => fileInputRef.current?.click()}>↑ Upload Image</button>
          </div>

          {/* Add by URL form */}
          {addImg.show && (
            <div className="mp__form">
              <input className="mp__input" autoFocus value={addImg.url} placeholder="Image URL (https://...)..."
                onChange={e => setAddImg(f=>({...f,url:e.target.value}))} />
              <input className="mp__input" value={addImg.title} placeholder="Title (optional)"
                onChange={e => setAddImg(f=>({...f,title:e.target.value}))} />
              <textarea className="mp__textarea" rows={2} value={addImg.desc} placeholder="Description..."
                onChange={e => setAddImg(f=>({...f,desc:e.target.value}))} />
              <div className="mp__form-foot">
                <button className="mp__cancel" onClick={() => setAddImg(f=>({...f,show:false}))}>Cancel</button>
                <button className="mp__save" onClick={submitImg}>Add</button>
              </div>
            </div>
          )}

          {/* Image grid */}
          {(d.images||[]).filter(matchesPage).length === 0 && !addImg.show ? (
            <div className="mp__empty">
              <span>🖼️</span>
              <p>No images yet</p>
              <button onClick={() => setAddImg(f=>({...f,show:true}))}>+ Add First Image</button>
            </div>
          ) : (
            <div className="mp__img-grid">
              {(d.images||[]).filter(matchesPage).map(img => {
                const imgPage = !filterPageId && img.pageId ? pages.find(p=>p.id===img.pageId) : null;
                return (
                  <div key={img.id} className="mp__img-card">
                    <div className="mp__img-wrap">
                      <img
                        src={img.url}
                        alt={img.title || 'image'}
                        className="mp__img"
                        onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                      />
                      <div className="mp__img-error" style={{display:'none'}}>🖼️ Can't load</div>
                      <button className="mp__img-del" onClick={() => removeImg(img.id)}>✕</button>
                    </div>
                    {img.title && <div className="mp__img-title">{img.title}</div>}
                    {imgPage && <span className="mp__item-page">{imgPage.icon} {imgPage.title||'Untitled'}</span>}
                    <textarea
                      className="mp__img-desc"
                      value={img.desc}
                      placeholder="Add a description..."
                      rows={2}
                      onChange={e => updateImgDesc(img.id, e.target.value)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tables section */}
      {section === 'tables' && (
        <div className="mp__body">
          <div className="mp__table-toolbar">
            {addTable.show ? (
              <div className="mp__form-row">
                <input className="mp__input mp__input--flex" autoFocus value={addTable.name} placeholder="Table name..."
                  onChange={e => setAddTable(f=>({...f,name:e.target.value}))}
                  onKeyDown={e => { if(e.key==='Enter') submitTable(); if(e.key==='Escape') setAddTable(f=>({...f,show:false})); }} />
                <button className="mp__save" onClick={submitTable}>Create</button>
                <button className="mp__cancel" onClick={() => setAddTable(f=>({...f,show:false}))}>✕</button>
              </div>
            ) : (
              <button className="mp__add-btn" onClick={() => setAddTable(f=>({...f,show:true}))}>+ New Table</button>
            )}
          </div>

          {d.tables.filter(matchesPage).length === 0 && !addTable.show && (
            <div className="mp__empty"><span>⊞</span><p>No tables yet</p></div>
          )}

          {d.tables.filter(matchesPage).map(tbl => {
            const tblPage = !filterPageId && tbl.pageId ? pages.find(p=>p.id===tbl.pageId) : null;
            return (
              <div key={tbl.id} className="mp__table-block">
                <div className="mp__table-head">
                  <span className="mp__table-name">⊞ {tbl.name}</span>
                  <div style={{display:'flex',gap:4,alignItems:'center'}}>
                    {tblPage && <span className="mp__item-page">{tblPage.icon} {tblPage.title||'Untitled'}</span>}
                    <button className="mp__tbl-act" onClick={() => addRow(tbl.id)}>+Row</button>
                    <button className="mp__tbl-act" onClick={() => addCol(tbl.id)}>+Col</button>
                    <button className="mp__tbl-act mp__tbl-del" onClick={() => removeTable(tbl.id)}>🗑</button>
                  </div>
                </div>
                <div className="mp__table-scroll">
                  <table className="mp__table">
                    <tbody>
                      {tbl.rows.map((row,ri) => (
                        <tr key={ri}>
                          {row.map((cell,ci) => (
                            <td key={ci}>
                              <input className={`mp__cell${ri===0?' mp__cell--head':''}`}
                                value={cell} onChange={e => updateCell(tbl.id,ri,ci,e.target.value)}
                                placeholder={ri===0?`Col ${ci+1}`:''} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
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

// ── Block editor ──────────────────────────────────────────────────────────────
function BlockEditor({pageId, content, onChange}) {
  const [blocks, setBlocks] = useState(() => parseContent(content));
  const prevId = useRef(pageId);
  const blockRefs = useRef({});
  const focusedId = useRef(null);
  const [selBar, setSelBar]       = useState(null);
  const [toolbarOpen, setToolbarOpen] = useState(false);
  const [selected, setSelected]   = useState(new Set());

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

  const commit = useCallback((next) => { setBlocks(next); onChange(JSON.stringify(next)); }, [onChange]);
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
        {blocks.map((block,idx) => (
          <div key={block.id} className={`block-wrap${selected.has(block.id) ? ' block-wrap--sel' : ''}`}>
            <button
              className="block-sel-check"
              onClick={() => toggleSelect(block.id)}
              title="Select block"
            >
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
                onFocus={() => { focusedId.current=block.id; }} />
            </div>
            <button className="block-del-btn" title="Delete block"
              onMouseDown={e => { e.preventDefault(); removeBlock(block.id); }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
          </div>
        ))}
      </div>
      <div className={`pg__toolbar-wrap${toolbarOpen ? ' open' : ''}`}>
        {/* Always-visible toggle pill */}
        <button
          className="pg__toolbar-toggle"
          onMouseDown={e => { e.preventDefault(); setToolbarOpen(o => !o); }}
          title="Add block"
        >
          <span className={`pg__toggle-plus${toolbarOpen ? ' rotated' : ''}`}>+</span>
          <span className="pg__toggle-label">{toolbarOpen ? 'Close' : 'Add block'}</span>
        </button>
        {/* Expandable toolbar — animates in/out via CSS */}
        <div className="pg__float-toolbar">
          {TOOLBAR_GROUPS.map((grp,gi) => (
            <span key={gi} className="pg__toolbar-group">
              {gi>0 && <span className="pg__toolbar-div"/>}
              {grp.items.map(item => (
                <button key={item.type} className="pg__float-btn" title={item.label}
                  onMouseDown={e => { e.preventDefault(); insertBlock(item.type); setToolbarOpen(false); }}>
                  <span className="pg__float-icon">{item.icon}</span>
                  <span className="pg__float-label">{item.label}</span>
                </button>
              ))}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function Block({block,numIdx,setRef,onUpdate,onAddAfter,onDelete,onFocus}) {
  const kd = (e) => {
    if(e.key===' '&&block.type==='paragraph'){ const t=block.text; for(const{prefix,type}of TRIGGERS){ if(t===prefix){e.preventDefault();onUpdate({type,text:'',done:type==='todo'?false:undefined});return;} } if(/^\d+\.$/.test(t)){e.preventDefault();onUpdate({type:'numbered',text:''});return;} }
    if(e.key==='Enter'&&block.text==='---'&&block.type==='paragraph'){e.preventDefault();onUpdate({type:'divider',text:''});return;}
    if(e.key==='Enter'&&!e.shiftKey&&block.type!=='code'){e.preventDefault();onAddAfter(NEXT[block.type]||'paragraph');return;}
    if(e.key==='Backspace'&&!block.text){e.preventDefault();if(block.type!=='paragraph')onUpdate({type:'paragraph',done:undefined});else onDelete();}
  };
  const ta = (cls,ph='') => ({ref:setRef,className:`block-ta ${cls}`,'data-bid':block.id,value:block.text||'',rows:1,onChange:e=>{autoGrow(e.target);onUpdate({text:e.target.value});},onKeyDown:kd,onFocus,placeholder:ph});
  if(block.type==='divider') return <hr className="block-hr"/>;
  if(block.type==='heading1') return <div className="block-row"><div className="block-type-tag">H1</div><textarea {...ta('ta-h1','Heading 1...')}/></div>;
  if(block.type==='heading2') return <div className="block-row"><div className="block-type-tag">H2</div><textarea {...ta('ta-h2','Heading 2...')}/></div>;
  if(block.type==='heading3') return <div className="block-row"><div className="block-type-tag">H3</div><textarea {...ta('ta-h3','Heading 3...')}/></div>;
  if(block.type==='bullet')   return <div className="block-row block-list-row"><span className="block-prefix block-bullet-dot">•</span><textarea {...ta('ta-p','List item...')}/></div>;
  if(block.type==='numbered') return <div className="block-row block-list-row"><span className="block-prefix block-num">{numIdx}.</span><textarea {...ta('ta-p','List item...')}/></div>;
  if(block.type==='todo')     return <div className="block-row block-list-row"><input type="checkbox" className="block-check" checked={!!block.done} onChange={e=>onUpdate({done:e.target.checked})}/><textarea {...ta(`ta-p${block.done?' ta-done':''}`, 'To-do...')}/></div>;
  if(block.type==='quote')    return <div className="block-quote"><div className="block-quote-bar"/><textarea {...ta('ta-quote','Quote...')}/></div>;
  if(block.type==='code')     return <div className="block-code-wrap"><div className="block-code-label">Code</div><textarea ref={setRef} className="block-ta ta-code" data-bid={block.id} value={block.text||''} rows={4} spellCheck={false} onChange={e=>onUpdate({text:e.target.value})} onKeyDown={kd} onFocus={onFocus} placeholder="// Code..."/></div>;
  if(block.type==='callout')  return <div className="block-callout"><span className="block-callout-icon">{block.icon||'💡'}</span><textarea {...ta('ta-p','Callout...')}/></div>;
  if(block.type==='table')    return <TableBlock block={block} onUpdate={onUpdate} blockRef={setRef} onFocus={onFocus}/>;
  if(block.type==='board')    return <BoardBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='gallery')  return <GalleryBlock block={block} onUpdate={onUpdate}/>;
  if(block.type==='timeline') return <TimelineBlock block={block} onUpdate={onUpdate} blockRef={setRef} onFocus={onFocus}/>;
  if(block.type==='cards')    return <CardsBlock block={block} onUpdate={onUpdate}/>;
  return <div className="block-row"><textarea {...ta('ta-p','Write something… (# heading, - bullet, 1. numbered)')}/></div>;
}
function autoGrow(el){el.style.height='auto';el.style.height=el.scrollHeight+'px';}
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
  useEffect(()=>{if(pageId!==prevPage.current){prevPage.current=pageId;setCards(parseCards(raw));}},[pageId]);
  const save=useCallback((next)=>{setCards(next);onChange(JSON.stringify(next));},[onChange]);
  const addCard=()=>save([...cards,{id:uuidv4(),text:'',color:CARD_COLORS[cards.length%CARD_COLORS.length]}]);
  const updateCard=(id,ch)=>save(cards.map(c=>c.id===id?{...c,...ch}:c));
  const deleteCard=id=>save(cards.filter(c=>c.id!==id));
  const onDragStart=(e,card)=>{e.dataTransfer.setData('notion-card',JSON.stringify({text:card.text,color:card.color}));e.dataTransfer.effectAllowed='copy';};
  return(
    <div className="pg__side-panel">
      <div className="pg__side-head"><span>📌 Notes</span><button className="pg__side-add"onClick={addCard}>+</button><button className="pg__side-close"onClick={onClose}>✕</button></div>
      <div className="pg__cards-area">
        {cards.length===0&&<div className="pg__cards-empty"><span>📌</span><p>No cards yet</p><button onClick={addCard}>+ First Card</button></div>}
        {cards.map(card=>(
          <div key={card.id}className="pg__sticky"style={{background:card.color}}draggable onDragStart={e=>onDragStart(e,card)}>
            <div className="pg__sticky-drag"><svg width="10"height="12"viewBox="0 0 10 12"fill="currentColor"opacity=".35"><circle cx="2.5"cy="2"r="1.4"/><circle cx="7.5"cy="2"r="1.4"/><circle cx="2.5"cy="6"r="1.4"/><circle cx="7.5"cy="6"r="1.4"/><circle cx="2.5"cy="10"r="1.4"/><circle cx="7.5"cy="10"r="1.4"/></svg> Drag to Canvas</div>
            <textarea className="pg__sticky-text"value={card.text}placeholder="Write here..."onChange={e=>updateCard(card.id,{text:e.target.value})}onMouseDown={e=>e.stopPropagation()}/>
            <div className="pg__sticky-footer"><div className="pg__sticky-palette">{CARD_COLORS.map(c=><button key={c}className={`pg__sticky-dot${card.color===c?' active':''}`}style={{background:c}}onClick={()=>updateCard(card.id,{color:c})}/>)}</div><button className="pg__sticky-del"onClick={()=>deleteCard(card.id)}>🗑</button></div>
          </div>
        ))}
        {cards.length>0&&<button className="pg__sticky-new"onClick={addCard}>+ New Card</button>}
      </div>
    </div>
  );
}

// ── Folder & Page items ───────────────────────────────────────────────────────
function FolderItem({
  folder, pages, subFolders=[], allPages=[], activePageId,
  isEditing, editingName, onEditingNameChange, onStartRename, onCommitRename,
  onToggleCollapse, onAddPage, onAddSubFolder, onUpdateSubFolder, onDeleteSubFolder,
  onDelete, onPageClick, onPageDelete,
  isDragOver, onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const [hovered, setHovered]           = useState(false);
  const [menu, setMenu]                 = useState(false);
  const [editingSubFolder, setEditingSub] = useState(null);
  const inputRef = useRef(null);
  const menuRef  = useRef(null);

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
  const hasChildren = pages.length > 0 || subFolders.length > 0;

  return (
    <div className="pg__folder" draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div className={`pg__folder-row${hovered?' hover':''}${isDragOver?' drag-over':''}`}
        onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>

        {/* Expand chevron */}
        <button className="pg__chevron" onClick={onToggleCollapse}>
          <IcoChevron open={!folder.collapsed}/>
        </button>

        {/* Folder icon badge */}
        <div className="pg__folder-badge">
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
            <button className="pg__icon-action" onClick={onAddPage} title="New page"><IcoPlus/></button>
            <button className="pg__icon-action" onClick={() => setMenu(m=>!m)} title="More"><IcoDots/></button>
          </div>
        )}

        {/* Context menu */}
        {menu && (
          <div className="pg__menu" ref={menuRef}>
            <button onClick={() => { setMenu(false); onStartRename(); }}><IcoEdit/> Rename</button>
            <button onClick={() => { setMenu(false); onAddPage(); }}><IcoPlus/> New Page</button>
            <button onClick={() => { setMenu(false); onAddSubFolder(id => setEditingSub({ id, name:'New Sub-folder' })); }}>
              <IcoFolder/> New Sub-folder
            </button>
            <div className="pg__menu-sep"/>
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
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
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
