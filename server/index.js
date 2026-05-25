import express from 'express';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { OAUTH, ACTIONS, isConfigured } from './integrations.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env from project root
try {
  const env = readFileSync(resolve(__dirname, '../.env'), 'utf8');
  env.split('\n').forEach(line => {
    const [key, ...vals] = line.split('=');
    if (key && key.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = vals.join('=').trim();
    }
  });
} catch {}

const app = express();
app.use(express.json({ limit: '2mb' }));

// Allow requests from Vite dev server
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ── Session token store — Map<sessionId, Map<service, tokenData>> ─────────────
const sessionTokens = new Map();

function getSessionId(req) {
  const auth = req.headers['authorization'];
  if (auth?.startsWith('Bearer ')) return auth.slice(7).trim();
  return req.query.session || null;
}

function getToken(sessionId, service) {
  return sessionTokens.get(sessionId)?.get(service) || null;
}

function setToken(sessionId, service, data) {
  if (!sessionTokens.has(sessionId)) sessionTokens.set(sessionId, new Map());
  sessionTokens.get(sessionId).set(service, data);
}

function removeToken(sessionId, service) {
  sessionTokens.get(sessionId)?.delete(service);
}

const APP_URL = process.env.APP_URL || `http://localhost:${process.env.PORT || 3001}`;

// ── OAuth routes ──────────────────────────────────────────────────────────────

// GET /auth/:service — redirect to OAuth provider
app.get('/auth/:service', (req, res) => {
  const { service } = req.params;
  const sessionId = req.query.session;
  const cfg = OAUTH[service];

  if (!cfg) return res.status(404).send('Unknown service');
  if (!cfg.clientId()) return res.status(400).send(`${service} credentials not configured. Add ${service.toUpperCase()}_CLIENT_ID and ${service.toUpperCase()}_CLIENT_SECRET to .env`);

  const redirectUri = `${APP_URL}/auth/${service}/callback`;
  const params = new URLSearchParams({
    client_id:     cfg.clientId(),
    redirect_uri:  redirectUri,
    response_type: 'code',
    state:         sessionId || '',
  });
  if (cfg.scope) params.set('scope', cfg.scope);

  // Notion requires owner param
  if (service === 'notion') params.set('owner', 'user');

  res.redirect(`${cfg.authUrl}?${params.toString()}`);
});

// GET /auth/:service/callback — exchange code for token
app.get('/auth/:service/callback', async (req, res) => {
  const { service } = req.params;
  const { code, state: sessionId, error } = req.query;
  const cfg = OAUTH[service];

  if (!cfg) return res.status(404).send('Unknown service');
  if (error) return res.status(400).send(`OAuth error: ${error}`);
  if (!code) return res.status(400).send('No code received');
  if (!sessionId) return res.status(400).send('No session ID');

  try {
    const redirectUri = `${APP_URL}/auth/${service}/callback`;
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      code,
      redirect_uri:  redirectUri,
      client_id:     cfg.clientId(),
      client_secret: cfg.clientSecret(),
    });

    const tokenRes = await fetch(cfg.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: body.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || tokenData.error) {
      console.error(`[OAuth] ${service} token exchange failed:`, tokenData);
      return res.status(400).send(`Token exchange failed: ${tokenData.error || tokenRes.status}`);
    }

    // Normalize token (Slack wraps it differently)
    const accessToken = tokenData.access_token || tokenData.authed_user?.access_token || tokenData.bot?.bot_access_token;
    if (!accessToken) return res.status(400).send('No access token in response');

    setToken(sessionId, service, {
      access_token:  accessToken,
      refresh_token: tokenData.refresh_token || null,
      expires_at:    tokenData.expires_in ? Date.now() + tokenData.expires_in * 1000 : null,
      raw:           tokenData,
    });

    console.log(`[OAuth] ${service} connected for session ${sessionId.slice(0, 8)}...`);

    // Redirect to success page that closes the popup
    res.redirect('/auth-success.html');
  } catch (err) {
    console.error(`[OAuth] ${service} callback error:`, err.message);
    res.status(500).send(`Internal error: ${err.message}`);
  }
});

// ── Integration status ────────────────────────────────────────────────────────
app.get('/api/integrations/status', (req, res) => {
  const sessionId = getSessionId(req);
  if (!sessionId) return res.json({});

  const status = {};
  for (const service of Object.keys(OAUTH)) {
    status[service] = {
      connected:   !!getToken(sessionId, service),
      configured:  isConfigured(service),
    };
  }
  res.json(status);
});

// ── Execute action ────────────────────────────────────────────────────────────
app.post('/api/integrations/:service/action', async (req, res) => {
  const { service } = req.params;
  const { action, params = {} } = req.body;
  const sessionId = getSessionId(req);

  if (!sessionId) return res.status(401).json({ error: 'No session ID' });

  const tokenData = getToken(sessionId, service);
  if (!tokenData) return res.status(401).json({ error: `Not connected to ${service}` });

  const handlers = ACTIONS[service];
  if (!handlers) return res.status(404).json({ error: `No action handlers for ${service}` });

  const handler = handlers[action];
  if (!handler) return res.status(404).json({ error: `Unknown action: ${service}.${action}` });

  try {
    const result = await handler({ token: tokenData.access_token, ...params });
    res.json({ ok: true, result });
  } catch (err) {
    console.error(`[Action] ${service}.${action} error:`, err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Disconnect service ────────────────────────────────────────────────────────
app.delete('/api/integrations/:service', (req, res) => {
  const { service } = req.params;
  const sessionId = getSessionId(req);

  if (!sessionId) return res.status(401).json({ error: 'No session ID' });
  removeToken(sessionId, service);
  console.log(`[OAuth] ${service} disconnected for session ${sessionId.slice(0, 8)}...`);
  res.json({ ok: true });
});

// ── Provider config ──────────────────────────────────────────────────────────
const PROVIDERS = {
  groq: {
    url:   'https://api.groq.com/openai/v1/chat/completions',
    model: process.env.GROQ_MODEL       || 'llama-3.3-70b-versatile',
    key:   process.env.GROQ_API_KEY,
  },
  openrouter: {
    url:   'https://openrouter.ai/api/v1/chat/completions',
    model: process.env.OPENROUTER_MODEL || 'google/gemma-3-27b-it:free',
    key:   process.env.OPENROUTER_API_KEY,
    extra: { 'HTTP-Referer': 'https://foldbase.app', 'X-Title': 'Foldbase' },
  },
  cerebras: {
    url:   'https://api.cerebras.ai/v1/chat/completions',
    model: process.env.CEREBRAS_MODEL   || 'llama-3.3-70b',
    key:   process.env.CEREBRAS_API_KEY,
  },
  sambanova: {
    url:   'https://api.sambanova.ai/v1/chat/completions',
    model: process.env.SAMBANOVA_MODEL  || 'Meta-Llama-3.3-70B-Instruct',
    key:   process.env.SAMBANOVA_API_KEY,
  },
};

// Auto-pick the first provider that has a key configured
function getActiveProvider() {
  for (const [name, cfg] of Object.entries(PROVIDERS)) {
    if (cfg.key) return { name, ...cfg };
  }
  return null;
}

// ── /api/chat ────────────────────────────────────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { messages, max_tokens = 3000 } = req.body;

  if (!messages?.length) {
    return res.status(400).json({ error: 'messages is required' });
  }

  const provider = getActiveProvider();
  if (!provider) {
    return res.status(500).json({
      error: 'No AI API key configured. Add one to your .env file.\n\nExample:\nGROQ_API_KEY=gsk_...'
    });
  }

  console.log(`[${new Date().toLocaleTimeString()}] /api/chat → ${provider.name} (${provider.model})`);

  try {
    const response = await fetch(provider.url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.key}`,
        'Content-Type':  'application/json',
        ...(provider.extra || {}),
      },
      body: JSON.stringify({
        model:       provider.model,
        messages,
        max_tokens,
        temperature: 0.7,
        stream:      true,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err.error?.message || `HTTP ${response.status}`;
      console.error(`[ERROR] ${provider.name}: ${msg}`);
      return res.status(response.status).json({ error: msg });
    }

    // Stream SSE back to client
    res.setHeader('Content-Type',  'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection',    'keep-alive');

    for await (const chunk of response.body) {
      if (res.writableEnded) break;
      res.write(chunk);
    }
    res.end();

  } catch (err) {
    console.error('[ERROR]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const provider = getActiveProvider();
  res.json({
    ok:       !!provider,
    provider: provider?.name || null,
    model:    provider?.model || null,
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// ── WhatsApp Business Cloud API ───────────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════

let waConfig = {
  phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  accessToken:   process.env.WHATSAPP_ACCESS_TOKEN    || '',
  verifyToken:   process.env.WHATSAPP_VERIFY_TOKEN    || 'foldbase-wa-verify',
};

// GET /api/whatsapp/status
app.get('/api/whatsapp/status', (req, res) => {
  res.json({
    connected:     !!(waConfig.phoneNumberId && waConfig.accessToken),
    phoneNumberId: waConfig.phoneNumberId || null,
    webhookUrl:    `${APP_URL}/webhooks/whatsapp`,
    verifyToken:   waConfig.verifyToken,
  });
});

// POST /api/whatsapp/setup — save credentials (no OAuth needed, uses permanent token)
app.post('/api/whatsapp/setup', (req, res) => {
  const { phoneNumberId, accessToken, verifyToken } = req.body;
  if (!phoneNumberId?.trim() || !accessToken?.trim())
    return res.status(400).json({ error: 'phoneNumberId and accessToken are required' });
  waConfig.phoneNumberId = phoneNumberId.trim();
  waConfig.accessToken   = accessToken.trim();
  if (verifyToken?.trim()) waConfig.verifyToken = verifyToken.trim();
  console.log(`[WhatsApp] Configured phone=${waConfig.phoneNumberId.slice(0,8)}…`);
  res.json({ ok: true });
});

// GET /webhooks/whatsapp — Meta webhook verification handshake
app.get('/webhooks/whatsapp', (req, res) => {
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === waConfig.verifyToken) {
    console.log('[WhatsApp] Webhook verified ✓');
    return res.status(200).send(challenge);
  }
  console.warn('[WhatsApp] Webhook verification failed — token mismatch');
  res.status(403).send('Forbidden');
});

// POST /webhooks/whatsapp — receive incoming messages
app.post('/webhooks/whatsapp', async (req, res) => {
  res.status(200).json({ status: 'ok' }); // always ack immediately
  try {
    if (req.body.object !== 'whatsapp_business_account') return;
    for (const entry of req.body.entry || []) {
      for (const change of entry.changes || []) {
        for (const msg of change.value?.messages || []) {
          if (msg.type === 'text') {
            await handleWAMessage(msg.from, (msg.text?.body || '').trim());
          }
        }
      }
    }
  } catch (err) {
    console.error('[WhatsApp] Webhook error:', err.message);
  }
});

// ── Internal helpers ──────────────────────────────────────────────────────────

const waLogs = []; // circular log of recent WhatsApp activity

function logWA(entry) {
  waLogs.unshift({ ts: new Date().toISOString(), ...entry });
  if (waLogs.length > 300) waLogs.length = 300;
}

async function sendWA(to, text) {
  if (!waConfig.phoneNumberId || !waConfig.accessToken)
    throw new Error('WhatsApp not configured — add phone number ID and access token');

  const r = await fetch(
    `https://graph.facebook.com/v18.0/${waConfig.phoneNumberId}/messages`,
    {
      method:  'POST',
      headers: { Authorization: `Bearer ${waConfig.accessToken}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    }
  );

  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
  logWA({ direction: 'outgoing', to, text, msgId: data.messages?.[0]?.id });
  return data;
}

// ── Automation engine ─────────────────────────────────────────────────────────

let liveAutomations = []; // pushed from client when user activates
const convState = new Map(); // `${automId}:${phone}` → { step, answers }

async function handleWAMessage(from, text) {
  logWA({ direction: 'incoming', from, text });
  console.log(`[WhatsApp] Message from ${from}: "${text.slice(0, 60)}"`);

  const auto = liveAutomations.find(a => a.active && a.trigger?.type === 'whatsapp_incoming');
  if (!auto) return console.log('[WhatsApp] No active automation found');

  const key   = `${auto.id}:${from}`;
  let   state = convState.get(key);

  const questions = auto.questionnaire || [];

  // ── No questions defined — just send greeting ──
  if (!questions.length || !questions[0]?.choices?.length) {
    await sendWA(from, auto.greeting || 'Hello! How can I help you?');
    return;
  }

  // ── Brand-new conversation ──
  if (!state) {
    state = { step: 0, answers: [] };
    convState.set(key, state);
    const q    = questions[0];
    const opts = q.choices.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
    await sendWA(from, `${auto.greeting || 'Hello!'}\n\n${q.text}\n\n${opts}\n\nReply with a number.`);
    return;
  }

  // ── Existing conversation — process answer ──
  const q      = questions[state.step];
  const num    = parseInt(text);
  const choice = q?.choices?.[num - 1];

  if (!choice) {
    const opts = q.choices.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
    await sendWA(from, `Please reply with a number between 1 and ${q.choices.length}.\n\n${q.text}\n\n${opts}`);
    return;
  }

  state.answers.push({ question: q.text, answer: choice.text, docUrl: choice.docUrl || null });
  state.step++;

  // Resolved: this choice has a doc, OR we're out of questions
  if (choice.docUrl || state.step >= questions.length) {
    const url     = choice.docUrl || state.answers.find(a => a.docUrl)?.docUrl;
    const closing = auto.closingMessage || 'Based on your answers, here is the relevant document:';
    const reply   = url ? `${closing}\n\n${url}` : (auto.closingMessage || 'Thank you! We will be in touch shortly.');
    await sendWA(from, reply);
    convState.delete(key);
    return;
  }

  // Next question
  const next = questions[state.step];
  const opts  = next.choices.map((c, i) => `${i + 1}. ${c.text}`).join('\n');
  await sendWA(from, `${next.text}\n\n${opts}\n\nReply with a number.`);
}

// ── Automation sync (client pushes active automations to server) ──────────────
app.post('/api/automations/sync', (req, res) => {
  const { automations } = req.body;
  if (!Array.isArray(automations)) return res.status(400).json({ error: 'automations array required' });
  liveAutomations = automations.filter(a => a.active);
  console.log(`[Automations] Synced — ${liveAutomations.length} active`);
  res.json({ ok: true, active: liveAutomations.length });
});

// GET /api/automations/logs — recent WhatsApp activity
app.get('/api/automations/logs', (req, res) => {
  res.json({ logs: waLogs.slice(0, 100) });
});

// POST /api/automations/test-send — send a manual WhatsApp message (for testing)
app.post('/api/automations/test-send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) return res.status(400).json({ error: 'to and message required' });
  try {
    await sendWA(to, message);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  const provider = getActiveProvider();
  console.log(`\n🚀 Foldbase API server → http://localhost:${PORT}`);
  if (provider) {
    console.log(`✅ Active provider: ${provider.name} (${provider.model})`);
  } else {
    console.log(`⚠️  No API key found — add one to .env`);
  }
  console.log('');
});
