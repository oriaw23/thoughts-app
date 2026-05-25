// ── Google OAuth 2.0 + Workspace APIs ─────────────────────────────────────────
// Uses Google Identity Services (GIS) token grant — no backend required.
// User provides their own OAuth Client ID from Google Cloud Console.

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/documents',
  'https://www.googleapis.com/auth/gmail.send',
].join(' ');

// ── Helpers ───────────────────────────────────────────────────────────────────
export const getClientId  = ()  => localStorage.getItem('google_client_id') || '';
export const setClientId  = id  => localStorage.setItem('google_client_id', id);

export function getGoogleToken() {
  try {
    const stored = JSON.parse(localStorage.getItem('google_token') || 'null');
    if (!stored || Date.now() > stored.expires_at) {
      localStorage.removeItem('google_token');
      return null;
    }
    return stored.access_token;
  } catch { return null; }
}

export function isGoogleConnected() { return !!getGoogleToken(); }

function storeToken(resp) {
  localStorage.setItem('google_token', JSON.stringify({
    access_token: resp.access_token,
    expires_at:   Date.now() + (resp.expires_in - 60) * 1000,
  }));
}

export function disconnectGoogle() {
  const token = getGoogleToken();
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
  localStorage.removeItem('google_token');
}

// ── Load GIS library lazily ───────────────────────────────────────────────────
let gisLoaded = false;
async function loadGIS() {
  if (gisLoaded || window.google?.accounts?.oauth2) { gisLoaded = true; return; }
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src     = 'https://accounts.google.com/gsi/client';
    s.async   = true;
    s.onload  = resolve;
    s.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(s);
  });
  gisLoaded = true;
}

// ── Connect (request access token) ────────────────────────────────────────────
export async function connectGoogle() {
  const clientId = getClientId();
  if (!clientId) throw new Error('Google Client ID not set. Add it in Settings → Integrations.');
  await loadGIS();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope:     SCOPES,
      callback:  resp => {
        if (resp.error) { reject(new Error(resp.error_description || resp.error)); return; }
        storeToken(resp);
        resolve(resp.access_token);
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}

async function ensureToken() {
  let token = getGoogleToken();
  if (!token) token = await connectGoogle();
  return token;
}

// ── Generic REST helper ───────────────────────────────────────────────────────
async function gFetch(url, method = 'GET', body = null, token) {
  const res = await fetch(url, {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(e.error?.message || `Google API error: HTTP ${res.status}`);
  }
  return res.json();
}

// ── Google Sheets ─────────────────────────────────────────────────────────────
export async function writeToSheets({ title = 'Foldbase Export', data = [] }) {
  const token = await ensureToken();

  // Create a new spreadsheet
  const sheet = await gFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    'POST',
    { properties: { title } },
    token,
  );
  const spreadsheetId = sheet.spreadsheetId;
  const sheetName     = sheet.sheets[0].properties.title;

  // Write data rows
  if (data.length) {
    await gFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A1?valueInputOption=RAW`,
      'PUT',
      { range: `${sheetName}!A1`, majorDimension: 'ROWS', values: data },
      token,
    );
  }

  return { url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`, spreadsheetId };
}

// ── Google Docs ───────────────────────────────────────────────────────────────
export async function createGoogleDoc({ title = 'Foldbase Document', content = '' }) {
  const token = await ensureToken();

  const doc = await gFetch(
    'https://docs.googleapis.com/v1/documents',
    'POST',
    { title },
    token,
  );
  const documentId = doc.documentId;

  if (content) {
    await gFetch(
      `https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`,
      'POST',
      { requests: [{ insertText: { location: { index: 1 }, text: content } }] },
      token,
    );
  }

  return { url: `https://docs.google.com/document/d/${documentId}`, documentId };
}

// ── Gmail ─────────────────────────────────────────────────────────────────────
export async function sendEmail({ to, subject, body }) {
  const token = await ensureToken();

  const raw = [
    `To: ${to}`,
    `Subject: =?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    btoa(unescape(encodeURIComponent(body))),
  ].join('\r\n');

  const encoded = btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  await gFetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
    'POST',
    { raw: encoded },
    token,
  );

  return { to, subject };
}
