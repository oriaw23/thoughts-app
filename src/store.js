import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { format, subDays, isToday, parseISO } from 'date-fns';

const STORAGE_KEY = 'mynotion_v3';

const today = new Date().toISOString().slice(0, 10);

const WELCOME_BLOCKS = JSON.stringify([
  { id: 'b1', type: 'heading1', text: 'Welcome to Foldbase ✨' },
  { id: 'b2', type: 'paragraph', text: 'Your modern workspace for writing, planning, and organizing everything that matters.' },
  { id: 'b3', type: 'divider', text: '' },
  { id: 'b4', type: 'heading3', text: 'Getting started' },
  { id: 'b5', type: 'bullet', text: 'Create pages and organize them in folders from the right panel' },
  { id: 'b6', type: 'bullet', text: 'Use the toolbar at the bottom to add headings, lists, tables, and more' },
  { id: 'b7', type: 'bullet', text: 'Open the 📎 Media tab to manage links and videos' },
  { id: 'b8', type: 'bullet', text: 'Drag sticky notes from the Notes panel directly to Canvas' },
  { id: 'b9', type: 'bullet', text: 'Select any text to see formatting options' },
  { id: 'b10', type: 'divider', text: '' },
  { id: 'b11', type: 'callout', icon: '💡', text: 'Tip: Type # then space for a heading, - then space for a bullet list, or 1. for numbered lists.' },
]);

const defaultData = {
  folders: [],
  pages: [
    {
      id: 'welcome',
      title: 'Welcome to Foldbase',
      icon: '✨',
      content: WELCOME_BLOCKS,
      folderId: null,
      pinned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  tasks: [],
  events: [],
  thoughts: [],
  goals: [],
  weeklyGoals: [],
  dailyPlans: {},
  activePageId: 'welcome',
  activeView: 'home',
};

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultData;
    const saved = JSON.parse(raw);
    return { ...defaultData, ...saved, folders: saved.folders || defaultData.folders };
  } catch {
    return defaultData;
  }
}

// ── Streak helper ─────────────────────────────────────────────────────────────
export function computeStreak(tasks) {
  const doneDates = new Set(
    tasks
      .filter(t => t.completedAt)
      .map(t => t.completedAt.slice(0, 10))
  );

  let streak = 0;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  if (doneDates.has(todayStr)) {
    streak = 1;
    let d = new Date();
    d.setDate(d.getDate() - 1);
    while (doneDates.has(format(d, 'yyyy-MM-dd'))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }
  } else {
    // Check if yesterday had tasks (streak still valid)
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    if (doneDates.has(yesterday)) {
      streak = 1;
      let d = subDays(new Date(), 1);
      d.setDate(d.getDate() - 1);
      while (doneDates.has(format(d, 'yyyy-MM-dd'))) {
        streak++;
        d.setDate(d.getDate() - 1);
      }
    }
  }
  return streak;
}

export function getWeeklyActivity(tasks) {
  const result = [];
  for (let i = 6; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const dateStr = format(d, 'yyyy-MM-dd');
    const count = tasks.filter(t => t.completedAt && t.completedAt.slice(0, 10) === dateStr).length;
    result.push({ date: d, dateStr, count, label: format(d, 'EEE') });
  }
  return result;
}

// ── Store hook ────────────────────────────────────────────────────────────────
export function useStore() {
  const [data, setData] = useState(loadData);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const update = useCallback((fn) => setData(prev => ({ ...fn(prev) })), []);

  // ─── Folders ──
  const createFolder = useCallback((name = 'New Folder', parentId = null) => {
    const id = uuidv4();
    update(d => ({ ...d, folders: [...d.folders, { id, name, icon: '📁', collapsed: false, parentId: parentId || null }] }));
    return id;
  }, [update]);

  const updateFolder = useCallback((id, changes) => {
    update(d => ({ ...d, folders: d.folders.map(f => f.id === id ? { ...f, ...changes } : f) }));
  }, [update]);

  const reorderFolders = useCallback((newFolders) => {
    update(d => ({ ...d, folders: newFolders }));
  }, [update]);

  const deleteFolder = useCallback((id) => {
    update(d => {
      const subIds = d.folders.filter(f => f.parentId === id).map(f => f.id);
      const allIds = [id, ...subIds];
      return {
        ...d,
        folders: d.folders.filter(f => !allIds.includes(f.id)),
        pages: d.pages.map(p => allIds.includes(p.folderId) ? { ...p, folderId: null } : p),
      };
    });
  }, [update]);

  // ─── Pages ──
  const createPage = useCallback((folderId = null, initial = {}) => {
    const id = uuidv4();
    update(d => ({
      ...d,
      pages: [...d.pages, {
        id,
        title: initial.title || 'Untitled',
        icon: initial.icon || '📄',
        content: initial.content || '',
        folderId,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
      activePageId: id,
      activeView: 'pages',
    }));
    return id;
  }, [update]);

  // Like createPage but doesn't navigate away — used by AI actions on the home screen
  const createPageBackground = useCallback((folderId = null, initial = {}) => {
    const id = uuidv4();
    update(d => ({
      ...d,
      pages: [...d.pages, {
        id,
        title: initial.title || 'Untitled',
        icon: initial.icon || '📄',
        content: initial.content || '',
        folderId,
        pinned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }],
    }));
    return id;
  }, [update]);

  const updatePage = useCallback((id, changes) => {
    update(d => ({
      ...d,
      pages: d.pages.map(p => p.id === id ? { ...p, ...changes, updatedAt: new Date().toISOString() } : p),
    }));
  }, [update]);

  const deletePage = useCallback((id) => {
    update(d => {
      const pages = d.pages.filter(p => p.id !== id);
      return { ...d, pages, activePageId: d.activePageId === id ? (pages[0]?.id || null) : d.activePageId };
    });
  }, [update]);

  const setActivePage = useCallback((id) => {
    update(d => ({ ...d, activePageId: id, activeView: 'page' }));
  }, [update]);

  const setActivePageId = useCallback((id) => {
    update(d => ({ ...d, activePageId: id }));
  }, [update]);

  const setActiveView = useCallback((view) => {
    update(d => ({ ...d, activeView: view }));
  }, [update]);

  // ─── Tasks ──
  const createTask = useCallback((task = {}) => {
    const id = uuidv4();
    update(d => ({
      ...d,
      tasks: [...d.tasks, {
        id,
        title: task.title || 'משימה חדשה',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        date: task.date || null,
        description: task.description || '',
        goalId: task.goalId || null,
        createdAt: new Date().toISOString(),
        completedAt: null,
      }],
    }));
    return id;
  }, [update]);

  const updateTask = useCallback((id, changes) => {
    update(d => ({
      ...d,
      tasks: d.tasks.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...changes };
        // Record completedAt when moving to done
        if (changes.status === 'done' && t.status !== 'done') {
          updated.completedAt = new Date().toISOString();
        }
        if (changes.status && changes.status !== 'done') {
          updated.completedAt = null;
        }
        return updated;
      }),
    }));
  }, [update]);

  const deleteTask = useCallback((id) => {
    update(d => ({ ...d, tasks: d.tasks.filter(t => t.id !== id) }));
  }, [update]);

  // ─── Events ──
  const createEvent = useCallback((event) => {
    const id = uuidv4();
    update(d => ({
      ...d,
      events: [...d.events, { id, title: event.title || 'אירוע חדש', startDate: event.startDate, endDate: event.endDate || event.startDate, startTime: event.startTime || '09:00', endTime: event.endTime || '10:00', color: event.color || '#6366f1', description: event.description || '', allDay: event.allDay || false, createdAt: new Date().toISOString() }],
    }));
    return id;
  }, [update]);

  const updateEvent = useCallback((id, changes) => {
    update(d => ({ ...d, events: d.events.map(e => e.id === id ? { ...e, ...changes } : e) }));
  }, [update]);

  const deleteEvent = useCallback((id) => {
    update(d => ({ ...d, events: d.events.filter(e => e.id !== id) }));
  }, [update]);

  // ─── Thoughts (Brain Dump) ──
  const addThoughts = useCallback((items) => {
    const newThoughts = items.map(item => ({
      id: uuidv4(),
      text: item.text,
      category: item.category,
      createdAt: new Date().toISOString(),
      convertedTo: null,
    }));
    update(d => ({ ...d, thoughts: [...newThoughts, ...d.thoughts] }));
  }, [update]);

  const convertThought = useCallback((id, type) => {
    update(d => ({
      ...d,
      thoughts: d.thoughts.map(t => t.id === id ? { ...t, convertedTo: type } : t),
    }));
  }, [update]);

  const deleteThought = useCallback((id) => {
    update(d => ({ ...d, thoughts: d.thoughts.filter(t => t.id !== id) }));
  }, [update]);

  const clearThoughts = useCallback(() => {
    update(d => ({ ...d, thoughts: [] }));
  }, [update]);

  // ─── Goals ──
  const createGoal = useCallback((goal) => {
    const id = uuidv4();
    const newGoal = {
      id,
      title: goal.title,
      category: goal.category || 'personal',
      timeframe: goal.timeframe || '1 חודש',
      milestones: (goal.milestones || []).map((m, i) => ({ id: uuidv4(), title: m, done: false, order: i })),
      dailyTask: goal.dailyTask || '',
      weeklyTasks: goal.weeklyTasks || [],
      color: goal.color || '#6366f1',
      startDate: new Date().toISOString().slice(0, 10),
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    update(d => ({ ...d, goals: [...d.goals, newGoal] }));
    return id;
  }, [update]);

  const updateGoal = useCallback((id, changes) => {
    update(d => ({ ...d, goals: d.goals.map(g => g.id === id ? { ...g, ...changes } : g) }));
  }, [update]);

  const toggleMilestone = useCallback((goalId, milestoneId) => {
    update(d => ({
      ...d,
      goals: d.goals.map(g => {
        if (g.id !== goalId) return g;
        const milestones = g.milestones.map(m => m.id === milestoneId ? { ...m, done: !m.done } : m);
        const progress = milestones.length ? Math.round((milestones.filter(m => m.done).length / milestones.length) * 100) : 0;
        return { ...g, milestones, progress };
      }),
    }));
  }, [update]);

  const deleteGoal = useCallback((id) => {
    update(d => ({ ...d, goals: d.goals.filter(g => g.id !== id) }));
  }, [update]);

  const addJournalEntry = useCallback((goalId, entry) => {
    update(d => ({
      ...d,
      goals: d.goals.map(g => g.id !== goalId ? g : {
        ...g,
        journal: [...(g.journal||[]), { id: uuidv4(), text: entry.text, mood: entry.mood||'', createdAt: new Date().toISOString() }],
      }),
    }));
  }, [update]);

  const deleteJournalEntry = useCallback((goalId, entryId) => {
    update(d => ({
      ...d,
      goals: d.goals.map(g => g.id !== goalId ? g : {
        ...g,
        journal: (g.journal||[]).filter(e => e.id !== entryId),
      }),
    }));
  }, [update]);

  // ─── Weekly Goals ──
  const createWeeklyGoal = useCallback((title) => {
    const id = uuidv4();
    update(d => ({ ...d, weeklyGoals: [...(d.weeklyGoals||[]), { id, title, done: false, createdAt: new Date().toISOString() }] }));
  }, [update]);
  const toggleWeeklyGoal = useCallback((id) => {
    update(d => ({ ...d, weeklyGoals: (d.weeklyGoals||[]).map(g => g.id===id ? {...g, done:!g.done} : g) }));
  }, [update]);
  const deleteWeeklyGoal = useCallback((id) => {
    update(d => ({ ...d, weeklyGoals: (d.weeklyGoals||[]).filter(g => g.id!==id) }));
  }, [update]);

  // ─── Daily Plans ──
  const updateDailyPlan = useCallback((dateStr, changes) => {
    update(d => ({
      ...d,
      dailyPlans: {
        ...d.dailyPlans,
        [dateStr]: { focus: [], blocks: { morning: [], afternoon: [], evening: [] }, mood: null, note: '', ...(d.dailyPlans[dateStr] || {}), ...changes },
      },
    }));
  }, [update]);

  const activePage = data.pages.find(p => p.id === data.activePageId) || null;
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const todayPlan = data.dailyPlans[todayStr] || null;

  return {
    folders: data.folders, pages: data.pages, tasks: data.tasks, events: data.events,
    thoughts: data.thoughts, goals: data.goals, weeklyGoals: data.weeklyGoals||[], dailyPlans: data.dailyPlans,
    activePageId: data.activePageId, activeView: data.activeView, activePage, todayPlan, todayStr,
    createFolder, updateFolder, deleteFolder, reorderFolders,
    createPage, createPageBackground, updatePage, deletePage, setActivePage, setActivePageId, setActiveView,
    createTask, updateTask, deleteTask,
    createEvent, updateEvent, deleteEvent,
    addThoughts, convertThought, deleteThought, clearThoughts,
    createGoal, updateGoal, toggleMilestone, deleteGoal,
    addJournalEntry, deleteJournalEntry,
    createWeeklyGoal, toggleWeeklyGoal, deleteWeeklyGoal,
    updateDailyPlan,
  };
}
