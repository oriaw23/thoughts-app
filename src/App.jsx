import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from './store';
import { getViewThemes, getThemeClass } from './themes';
import './mobile.css';
import Chat from './components/Chat';
import Pages from './components/Pages';
import Planning from './components/Planning';
import DirectMessage from './components/DirectMessage';
import Sidebar from './components/Sidebar';
import Editor from './components/Editor';
import Calendar from './components/Calendar';
import Tasks from './components/Tasks';
import GoalsEngine from './components/GoalsEngine';
import Projects from './components/Projects';
import CanvasView from './components/Canvas';
import Settings from './components/Settings';
import GlobalNotes from './components/GlobalNotes';
import Marketplace from './components/Marketplace';
import Library from './components/Library';
import Trash from './components/Trash';
import Help from './components/Help';
import './App.css';

// ── SVG icons for mobile nav ──────────────────────────────────────────────────
const MobIcons = {
  pages:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  tasks:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  goals:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  more:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="19" cy="12" r="1.5" fill="currentColor"/></svg>,
  projects: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  canvas:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><circle cx="12" cy="12" r="2"/></svg>,
  chat:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  settings: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
};

const MAIN_NAV  = ['pages','tasks','goals','calendar'];
const MORE_VIEWS = [
  { id:'projects', label:'Projects' }, { id:'canvas',  label:'Canvas'  },
  { id:'chat',     label:'Chat'     }, { id:'marketplace', label:'Market' },
  { id:'library',  label:'Library'  },
];

function MobileNav({ activeView, onViewChange, onOpenSettings, pendingTasks }) {
  const [showMore, setShowMore] = useState(false);
  const moreActive = MORE_VIEWS.some(v => v.id === activeView);
  return (
    <>
      {showMore && (
        <div className="mob-more-overlay" onClick={() => setShowMore(false)}>
          <div className="mob-more-sheet" onClick={e => e.stopPropagation()}>
            <span className="mob-more-handle"/>
            <div className="mob-more-grid">
              {MORE_VIEWS.map(v => (
                <button key={v.id} className="mob-more-item"
                  onClick={() => { onViewChange(v.id); setShowMore(false); }}>
                  <span style={{color: activeView===v.id ? '#0f172a' : '#64748b'}}>{MobIcons[v.id]||MobIcons.more}</span>
                  <span style={{color: activeView===v.id ? '#0f172a' : '#64748b', fontWeight: activeView===v.id?'700':'600'}}>{v.label}</span>
                </button>
              ))}
            </div>
            <button className="mob-more-settings" onClick={() => { onOpenSettings(); setShowMore(false); }}>
              {MobIcons.settings} Settings
            </button>
          </div>
        </div>
      )}
      <nav className="mob-nav">
        {MAIN_NAV.map(id => {
          const isActive = activeView === id || (id==='goals' && activeView==='progress');
          return (
            <button key={id} className={`mob-nav__item${isActive?' active':''}`}
              onClick={() => onViewChange(id)} style={{position:'relative'}}>
              <span className="mob-nav__icon">{MobIcons[id]}</span>
              <span className="mob-nav__label">{id==='pages'?'Pages':id==='tasks'?'Tasks':id==='goals'?'Goals':'Calendar'}</span>
              {id==='tasks' && pendingTasks>0 && (
                <span className="mob-nav__badge">{pendingTasks>9?'9+':pendingTasks}</span>
              )}
            </button>
          );
        })}
        <button className={`mob-nav__item${moreActive?' active':''}`} onClick={() => setShowMore(s=>!s)}>
          <span className="mob-nav__icon">{MobIcons.more}</span>
          <span className="mob-nav__label">More</span>
        </button>
      </nav>
    </>
  );
}

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen]   = useState(true);
  const [notesOpen, setNotesOpen]       = useState(false);
  const [themeRev, setThemeRev]         = useState(0); // incremented to re-read themes

  // Listen for open-notes event dispatched from Canvas toolbar
  useEffect(() => {
    const handler = () => setNotesOpen(o => !o);
    window.addEventListener('toggle-global-notes', handler);
    return () => window.removeEventListener('toggle-global-notes', handler);
  }, []);
  const closeTimer = useRef(null);
  const store = useStore();

  const {
    folders, pages, tasks, events, goals, weeklyGoals,
    activePageId, activeView, activePage,
    createFolder, updateFolder, deleteFolder, reorderFolders,
    createPage, updatePage, deletePage, setActivePage, setActivePageId, setActiveView,
    createTask, updateTask, deleteTask,
    createEvent, updateEvent, deleteEvent,
    createGoal, updateGoal, toggleMilestone, deleteGoal,
    addJournalEntry, deleteJournalEntry,
    createWeeklyGoal, toggleWeeklyGoal, deleteWeeklyGoal,
  } = store;

  const openSidebar = useCallback(() => {
    clearTimeout(closeTimer.current);
    setSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    closeTimer.current = setTimeout(() => setSidebarOpen(false), 380);
  }, []);

  const renderMain = () => {
    if (activeView.startsWith('dm:')) {
      return <DirectMessage contactId={activeView.slice(3)} events={events} tasks={tasks} goals={goals} />;
    }
    switch (activeView) {
      case 'marketplace': return <Marketplace />;
      case 'library':     return <Library pages={pages} />;
      case 'trash':       return <Trash />;
      case 'help':        return <Help />;
      case 'planning': return <Planning />;
      case 'projects': return <Projects pages={pages} tasks={tasks} events={events} goals={goals}
          onNavigate={(view, opts={}) => {
            if (opts.pageId) setActivePageId(opts.pageId);
            setActiveView(view);
          }} />;
      case 'goals':
      case 'progress': return <GoalsEngine goals={goals} tasks={tasks} weeklyGoals={weeklyGoals} onCreateGoal={createGoal} onUpdateGoal={updateGoal} onToggleMilestone={toggleMilestone} onDeleteGoal={deleteGoal} onCreateTask={createTask} onCreateWeeklyGoal={createWeeklyGoal} onToggleWeeklyGoal={toggleWeeklyGoal} onDeleteWeeklyGoal={deleteWeeklyGoal} onAddJournalEntry={addJournalEntry} onDeleteJournalEntry={deleteJournalEntry} />;
      case 'calendar': return <Calendar events={events} tasks={tasks} onCreateEvent={createEvent} onUpdateEvent={updateEvent} onDeleteEvent={deleteEvent} onCreateTask={createTask} onUpdateTask={updateTask} />;
      case 'tasks':    return <Tasks tasks={tasks} onCreateTask={createTask} onUpdateTask={updateTask} onDeleteTask={deleteTask} />;
      case 'chat':     return <Chat />;
      case 'pages':    return <Pages folders={folders} pages={pages} activePageId={activePageId} onSelectPage={setActivePageId}
          onCreatePage={createPage}
          onUpdatePage={updatePage} onDeletePage={deletePage} onCreateFolder={createFolder} onUpdateFolder={updateFolder} onDeleteFolder={deleteFolder} onReorderFolders={reorderFolders} />;
      case 'canvas':   return <CanvasView />;
      default:         return <Editor page={activePage} onUpdate={(ch) => activePage && updatePage(activePage.id, ch)} />;
    }
  };

  return (
    <div className="app">
      {/* Backdrop — transparent, closes sidebar when clicking content area */}
      {sidebarOpen && (
        <div className="app__sidebar-backdrop" onClick={closeSidebar} />
      )}

      <Sidebar
        folders={folders}
        pages={pages}
        tasks={tasks}
        activePageId={activePageId}
        activeView={activeView}
        isOpen={sidebarOpen}
        onMouseEnter={openSidebar}
        onMouseLeave={closeSidebar}
        onPageSelect={(id) => { setActivePage(id); closeSidebar(); }}
        onPageCreate={createPage}
        onPageDelete={deletePage}
        onPageUpdate={updatePage}
        onFolderCreate={createFolder}
        onFolderUpdate={updateFolder}
        onFolderDelete={deleteFolder}
        onViewChange={(v) => { setActiveView(v); closeSidebar(); }}
        onOpenSettings={() => { setShowSettings(true); closeSidebar(); }}
      />

      <main className="app__main">
        <div className={`view-wrap${getThemeClass(activeView.startsWith('dm:') ? 'chat' : activeView) ? ' '+getThemeClass(activeView.startsWith('dm:') ? 'chat' : activeView) : ''}`}
          key={themeRev}>
          {renderMain()}
        </div>
      </main>

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onThemeChange={() => setThemeRev(r => r+1)}
        />
      )}

      {/* Global sticky notes — opened from Canvas toolbar or other views */}
      <GlobalNotes open={notesOpen} onClose={() => setNotesOpen(false)} />

      {/* Mobile bottom navigation */}
      <MobileNav
        activeView={activeView}
        onViewChange={v => { setActiveView(v); }}
        onOpenSettings={() => setShowSettings(true)}
        pendingTasks={tasks.filter(t => t.status !== 'done').length}
      />
    </div>
  );
}
