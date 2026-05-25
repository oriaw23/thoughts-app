// ── Session ID (UUID stored in localStorage) ──────────────────────────────────
const SESSION_KEY = 'foldbase_session_id';

export function getSessionId() {
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const API_BASE = (typeof window !== 'undefined' && window.location.protocol !== 'file:')
  ? ''
  : 'http://localhost:3001';

function authHeaders() {
  return { Authorization: `Bearer ${getSessionId()}`, 'Content-Type': 'application/json' };
}

// ── Fetch integration status ──────────────────────────────────────────────────
export async function fetchIntegrationStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/integrations/status?session=${getSessionId()}`);
    if (!res.ok) return {};
    return await res.json();
  } catch {
    return {};
  }
}

// ── Open OAuth popup ──────────────────────────────────────────────────────────
export function openOAuthPopup(service) {
  const sessionId = getSessionId();
  const url = `${API_BASE}/auth/${service}?session=${sessionId}`;
  const popup = window.open(url, 'oauth_popup', 'width=520,height=640,left=200,top=100');

  return new Promise((resolve, reject) => {
    // Listen for postMessage from success page
    const onMessage = (e) => {
      if (e.data === 'oauth_success') {
        window.removeEventListener('message', onMessage);
        clearInterval(pollId);
        resolve(true);
      }
    };
    window.addEventListener('message', onMessage);

    // Fallback: poll for popup close
    const pollId = setInterval(() => {
      if (popup?.closed) {
        window.removeEventListener('message', onMessage);
        clearInterval(pollId);
        resolve(true); // resolve even on close (user may have completed it)
      }
    }, 500);

    // Timeout after 5 minutes
    setTimeout(() => {
      window.removeEventListener('message', onMessage);
      clearInterval(pollId);
      reject(new Error('OAuth timeout'));
    }, 5 * 60 * 1000);
  });
}

// ── Execute an integration action ─────────────────────────────────────────────
export async function executeAction(service, action, params = {}) {
  const res = await fetch(`${API_BASE}/api/integrations/${service}/action`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ action, params }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data.error || `Action failed: ${res.status}`);
  return data.result;
}

// ── Disconnect a service ──────────────────────────────────────────────────────
export async function disconnectService(service) {
  try {
    const res = await fetch(`${API_BASE}/api/integrations/${service}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Integration catalog (all services) ───────────────────────────────────────
export const CATALOG = [
  // Productivity
  { id: 'google',      name: 'Google Workspace', cat: 'productivity', icon: '🟢', desc: 'Sheets, Docs, Gmail, Calendar', tools: ['Write to Sheets', 'Create Docs', 'Send Gmail', 'Schedule events'] },
  { id: 'notion',      name: 'Notion',           cat: 'productivity', icon: '⬛', desc: 'Pages and databases',           tools: ['Create pages', 'Add database entries', 'Search content'] },
  { id: 'airtable',    name: 'Airtable',         cat: 'productivity', icon: '🔵', desc: 'Database tables and records',  tools: ['Add records', 'Query tables', 'Update fields'] },
  { id: 'asana',       name: 'Asana',            cat: 'productivity', icon: '🔴', desc: 'Task and project management',  tools: ['Create tasks', 'Update status', 'Assign members'] },
  { id: 'figma',       name: 'Figma',            cat: 'productivity', icon: '🟣', desc: 'Design files and components',  tools: ['Export assets', 'Comment on designs', 'List files'] },
  // Communication
  { id: 'slack',       name: 'Slack',            cat: 'communication', icon: '🟡', desc: 'Team messaging',             tools: ['Send messages', 'Post to channels', 'Create threads'] },
  { id: 'discord',     name: 'Discord',          cat: 'communication', icon: '🔵', desc: 'Community and team chat',    tools: ['Send messages', 'Post to channels'] },
  { id: 'zoom',        name: 'Zoom',             cat: 'communication', icon: '🔵', desc: 'Video meetings',             tools: ['Schedule meetings', 'Get recording links'] },
  { id: 'whatsapp',    name: 'WhatsApp Business',cat: 'communication', icon: '🟢', desc: 'Business messaging',         tools: ['Send messages', 'Send templates'] },
  // Developer
  { id: 'github',      name: 'GitHub',           cat: 'developer',    icon: '⬛', desc: 'Code repositories',           tools: ['Create issues', 'Open PRs', 'List repos', 'Push code'] },
  { id: 'linear',      name: 'Linear',           cat: 'developer',    icon: '🟣', desc: 'Engineering project management', tools: ['Create issues', 'Update status', 'Assign tickets'] },
  { id: 'vercel',      name: 'Vercel',           cat: 'developer',    icon: '⬛', desc: 'Deployments and projects',    tools: ['Trigger deploys', 'Check status', 'List projects'] },
  { id: 'jira',        name: 'Jira',             cat: 'developer',    icon: '🔵', desc: 'Issue tracking',              tools: ['Create issues', 'Update sprints', 'Add comments'] },
  // Finance
  { id: 'stripe',      name: 'Stripe',           cat: 'finance',      icon: '🔵', desc: 'Payments and billing',        tools: ['Get revenue data', 'List customers', 'Create invoices'] },
  { id: 'shopify',     name: 'Shopify',          cat: 'finance',      icon: '🟢', desc: 'E-commerce store',           tools: ['List orders', 'Update inventory', 'Add products'] },
  { id: 'salesforce',  name: 'Salesforce',       cat: 'finance',      icon: '🔵', desc: 'CRM and sales pipeline',     tools: ['Create leads', 'Update deals', 'Log activities'] },
  // Marketing
  { id: 'hubspot',     name: 'HubSpot',          cat: 'marketing',    icon: '🟠', desc: 'CRM and marketing',          tools: ['Create contacts', 'Log emails', 'Track deals'] },
  { id: 'mailchimp',   name: 'Mailchimp',        cat: 'marketing',    icon: '⭐', desc: 'Email marketing',            tools: ['Send campaigns', 'Add subscribers', 'View stats'] },
  { id: 'twitter',     name: 'Twitter / X',      cat: 'marketing',    icon: '⬛', desc: 'Social media',               tools: ['Post tweets', 'Schedule posts', 'Get analytics'] },
  // Files
  { id: 'dropbox',     name: 'Dropbox',          cat: 'files',        icon: '🔵', desc: 'Cloud file storage',         tools: ['Upload files', 'Share links', 'List folder'] },
  { id: 'trello',      name: 'Trello',           cat: 'files',        icon: '🔵', desc: 'Boards and cards',           tools: ['Create cards', 'Move to lists', 'Add checklists'] },
  // Music
  { id: 'spotify',     name: 'Spotify',          cat: 'music',        icon: '🟢', desc: 'Music streaming and playlists',    tools: ['Create playlists', 'Search tracks', 'Get album tracks', 'Get top tracks'] },
  // Automation
  { id: 'zapier',      name: 'Zapier',           cat: 'automation',   icon: '🟠', desc: 'Connect 5,000+ apps via webhooks', tools: ['Trigger Zaps', 'Send data to any app'] },
];

export const CATEGORIES = [
  { id: 'all',          label: 'All' },
  { id: 'productivity', label: 'Productivity' },
  { id: 'communication',label: 'Communication' },
  { id: 'developer',    label: 'Developer' },
  { id: 'finance',      label: 'Finance' },
  { id: 'marketing',    label: 'Marketing' },
  { id: 'files',        label: 'Files' },
  { id: 'music',        label: 'Music' },
  { id: 'automation',   label: 'Automation' },
];
