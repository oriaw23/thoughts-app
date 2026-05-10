const KEY = 'mynotion_projects_v1';

export function getProjects() {
  try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; }
}

function save(ps) { localStorage.setItem(KEY, JSON.stringify(ps)); }

// Find which project an item belongs to
export function getProjectForItem(itemId, field) {
  return getProjects().find(p => (p[field]||[]).includes(itemId)) || null;
}

// Link item to a project (and unlink from any previous project)
export function setItemProject(itemId, field, projectId) {
  const ps = getProjects().map(p => {
    const list = (p[field]||[]).filter(id => id !== itemId);
    if (p.id === projectId) return { ...p, [field]: [...list, itemId] };
    return { ...p, [field]: list };
  });
  save(ps);
}

// Unlink item from all projects
export function removeItemFromProjects(itemId, field) {
  const ps = getProjects().map(p => ({ ...p, [field]: (p[field]||[]).filter(id => id !== itemId) }));
  save(ps);
}
