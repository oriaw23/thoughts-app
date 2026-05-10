export const THEMES = [
  { id: 'default', name: 'Default',   preview: '⬜', css: '' },
  { id: 'nature',  name: 'Nature',    preview: '🌄', css: 'theme-nature'  },
  { id: 'ocean',   name: 'Ocean',     preview: '🌊', css: 'theme-ocean'   },
  { id: 'sunset',  name: 'Sunset',    preview: '🌅', css: 'theme-sunset'  },
  { id: 'night',   name: 'Night Sky', preview: '🌙', css: 'theme-night'   },
  { id: 'gaming',  name: 'Gaming',    preview: '🎮', css: 'theme-gaming'  },
  { id: 'paper',   name: 'Paper',     preview: '📜', css: 'theme-paper'   },
];

export const THEME_VIEWS = [
  { id: 'tasks',       name: 'Tasks'           },
  { id: 'goals',       name: 'Goals & Progress'},
  { id: 'calendar',    name: 'Calendar'        },
  { id: 'pages',       name: 'Pages'           },
  { id: 'projects',    name: 'Projects'        },
  { id: 'chat',        name: 'AI Chat'         },
  { id: 'canvas',      name: 'Canvas'          },
  { id: 'marketplace', name: 'Marketplace'     },
];

const KEY = 'thoughts_view_themes';

export function getViewThemes() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

export function setViewTheme(viewId, themeId) {
  const t = getViewThemes();
  if (!themeId || themeId === 'default') delete t[viewId];
  else t[viewId] = themeId;
  localStorage.setItem(KEY, JSON.stringify(t));
}

export function getThemeClass(viewId) {
  const t = getViewThemes();
  const id = t[viewId] || 'default';
  return THEMES.find(th => th.id === id)?.css || '';
}
