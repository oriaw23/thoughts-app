import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { writeToSheets, createGoogleDoc, sendEmail as googleSendEmail, isGoogleConnected } from '../lib/googleApi';
import { fetchIntegrationStatus, executeAction } from '../lib/integrations';
import './HomePage.css';

// ── PDF text extraction (lazy-loads pdfjs-dist) ───────────────────────────────
async function extractPdfText(file) {
  try {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url
    ).toString();
    const ab  = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: ab }).promise;
    const parts = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page    = await pdf.getPage(p);
      const content = await page.getTextContent();
      parts.push(content.items.map(i => i.str).join(' '));
    }
    return parts.join('\n');
  } catch { return null; }
}

// ── Storage ───────────────────────────────────────────────────────────────────
const readUser     = () => { try { return JSON.parse(localStorage.getItem('mynotion_user_v1')||'{"name":"Creator"}'); } catch { return {name:'Creator'}; }};
const readTasks    = () => { try { const d=JSON.parse(localStorage.getItem('mynotion_v3')||'{}'); return d.tasks||[]; } catch { return []; }};
const readPipeline = () => { try { return JSON.parse(localStorage.getItem('foldbase_pipeline_v1')||'[]'); } catch { return []; }};
const greeting     = () => { const h=new Date().getHours(); if(h<12) return 'Good morning'; if(h<17) return 'Good afternoon'; return 'Good evening'; };
const fmtTime      = () => new Date().toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
const getKey         = () => localStorage.getItem('groq_api_key')||'';
const getCerebrasKey = () => localStorage.getItem('cerebras_api_key')||'';
const getOpenRouterKey = () => localStorage.getItem('openrouter_api_key')||'';
const getSambaKey    = () => localStorage.getItem('samba_api_key')||'';
const getProvider    = () => localStorage.getItem('ai_provider')||'groq';
const GROQ_URL       = 'https://api.groq.com/openai/v1/chat/completions';
const CEREBRAS_URL   = 'https://api.cerebras.ai/v1/chat/completions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const SAMBA_URL      = 'https://api.sambanova.ai/v1/chat/completions';
const TODAY_ISO    = new Date().toISOString().slice(0,10);
const TODAY        = new Date().toLocaleDateString('en',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
const CHATS_KEY    = 'foldbase_chats_v1';

// ── Chat history ──────────────────────────────────────────────────────────────
const loadChats = () => { try { return JSON.parse(localStorage.getItem(CHATS_KEY)||'[]'); } catch { return []; }};
const saveChats = c  => localStorage.setItem(CHATS_KEY, JSON.stringify(c));

// ── Location coords for map cards ─────────────────────────────────────────────
const CITY_COORDS = {
  'rome':{'name':'Rome, Italy','lat':41.90,'lon':12.48},
  'paris':{'name':'Paris, France','lat':48.86,'lon':2.35},
  'london':{'name':'London, UK','lat':51.51,'lon':-0.13},
  'tokyo':{'name':'Tokyo, Japan','lat':35.68,'lon':139.69},
  'new york':{'name':'New York, USA','lat':40.71,'lon':-74.01},
  'barcelona':{'name':'Barcelona, Spain','lat':41.39,'lon':2.15},
  'amsterdam':{'name':'Amsterdam, Netherlands','lat':52.37,'lon':4.89},
  'berlin':{'name':'Berlin, Germany','lat':52.52,'lon':13.40},
  'dubai':{'name':'Dubai, UAE','lat':25.20,'lon':55.27},
  'tel aviv':{'name':'Tel Aviv, Israel','lat':32.08,'lon':34.78},
  'jerusalem':{'name':'Jerusalem, Israel','lat':31.77,'lon':35.21},
  'athens':{'name':'Athens, Greece','lat':37.98,'lon':23.73},
  'lisbon':{'name':'Lisbon, Portugal','lat':38.72,'lon':-9.14},
  'vienna':{'name':'Vienna, Austria','lat':48.21,'lon':16.37},
  'prague':{'name':'Prague, Czech Republic','lat':50.08,'lon':14.44},
  'madrid':{'name':'Madrid, Spain','lat':40.42,'lon':-3.70},
  'istanbul':{'name':'Istanbul, Turkey','lat':41.01,'lon':28.96},
  'bangkok':{'name':'Bangkok, Thailand','lat':13.76,'lon':100.50},
  'bali':{'name':'Bali, Indonesia','lat':-8.34,'lon':115.09},
  'miami':{'name':'Miami, USA','lat':25.77,'lon':-80.19},
  'los angeles':{'name':'Los Angeles, USA','lat':34.05,'lon':-118.24},
  'sydney':{'name':'Sydney, Australia','lat':-33.87,'lon':151.21},
};

function detectCity(query) {
  const q = query.toLowerCase();
  for(const [key, val] of Object.entries(CITY_COORDS)) {
    if(q.includes(key)) return val;
  }
  return null;
}

// ── Web search (returns structured result) ────────────────────────────────────
async function searchWeb(query) {
  try {
    const slug = query.replace(/\s+(travel|guide|attractions|tips|things to do)\s*/gi,'').trim().replace(/\s+/g,'_');
    const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(slug)}`,{signal:AbortSignal.timeout(4000)});
    if (r.ok) {
      const d = await r.json();
      if(d.extract) return { text: d.extract.slice(0,600), title: d.title, url: d.content_urls?.desktop?.page||'' };
    }
  } catch {}
  return null;
}

// ── App actions factory ───────────────────────────────────────────────────────
function makeActions(onCreatePage, onCreateTask, onCreateEvent, onLiveEvent, integrationStatus) {
  return {
    create_page({title='Untitled',content=''}) {
      if(onCreatePage) onCreatePage(null, {title, content, icon:'\u{1F4C4}'});
      else {
        const s=JSON.parse(localStorage.getItem('mynotion_v3')||'{}');
        const id=uuidv4();
        (s.pages=s.pages||[]).push({id,title,icon:'\u{1F4C4}',content,folderId:null,pinned:false,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
        localStorage.setItem('mynotion_v3',JSON.stringify(s));
      }
      return {icon:'\u{1F4C4}',label:`Saved: "${title}"`,type:'page'};
    },
    add_task({title,priority='medium'}) {
      if(onCreateTask) onCreateTask({title,priority});
      else {
        const s=JSON.parse(localStorage.getItem('mynotion_v3')||'{}');
        (s.tasks=s.tasks||[]).push({id:uuidv4(),title,text:title,status:'todo',priority,createdAt:new Date().toISOString()});
        localStorage.setItem('mynotion_v3',JSON.stringify(s));
      }
      return {icon:'✅',label:title,type:'task'};
    },
    add_event({title,date,startTime='09:00',endTime='10:00',notes='',color='#3b82f6'}) {
      if(onCreateEvent) onCreateEvent({title,startDate:date,startTime,endTime,allDay:false,color,description:notes});
      else {
        const s=JSON.parse(localStorage.getItem('mynotion_v3')||'{}');
        (s.events=s.events||[]).push({id:uuidv4(),title,startDate:date,startTime,endTime,allDay:false,color,notes});
        localStorage.setItem('mynotion_v3',JSON.stringify(s));
      }
      onLiveEvent?.({title,date,startTime,endTime,color});
      return {icon:'\u{1F4C5}',label:`${date} — ${title}`,type:'event',date,color};
    },
    add_idea({title,body=''}) {
      const ideas=JSON.parse(localStorage.getItem('foldbase_ideas_v1')||'[]');
      ideas.unshift({id:uuidv4(),title,body,platform:'General',type:'Long video',status:'raw',starred:false,tags:[],createdAt:new Date().toISOString()});
      localStorage.setItem('foldbase_ideas_v1',JSON.stringify(ideas));
      return {icon:'\u{1F4A1}',label:title,type:'idea'};
    },
    create_project({name,description=''}) {
      const p=JSON.parse(localStorage.getItem('mynotion_projects_v1')||'[]');
      p.push({id:uuidv4(),name,icon:'\u{1F5C2}',color:'#3b82f6',status:'planning',description,dueDate:'',progress:0,banner:'',tasks:[],goals:[],pageIds:[],goalIds:[],taskIds:[],eventIds:[],createdAt:new Date().toISOString()});
      localStorage.setItem('mynotion_projects_v1',JSON.stringify(p));
      return {icon:'\u{1F5C2}',label:name,type:'project'};
    },
    async write_sheets({title='Export',data=[]}) {
      if(!isGoogleConnected()) return {icon:'📊',label:'Google not connected — go to Settings → Integrations',type:'default'};
      const {url} = await writeToSheets({title,data});
      return {icon:'📊',label:`Sheets: ${title}`,type:'sheets',url};
    },
    async create_doc({title='Document',content=''}) {
      if(!isGoogleConnected()) return {icon:'📄',label:'Google not connected — go to Settings → Integrations',type:'default'};
      const {url} = await createGoogleDoc({title,content});
      return {icon:'📄',label:`Doc: ${title}`,type:'doc',url};
    },
    async send_email({to,subject,body}) {
      if(!isGoogleConnected()) return {icon:'✉️',label:'Google not connected — go to Settings → Integrations',type:'default'};
      await googleSendEmail({to,subject,body});
      return {icon:'✉️',label:`Email sent to ${to}`,type:'email'};
    },
    async integration_action({service,action,params={}}) {
      const svcStatus = integrationStatus?.[service];
      if (!svcStatus?.connected) {
        return {icon:'🔌',label:`${service} not connected — go to Integrations to connect`,type:'default'};
      }
      try {
        const result = await executeAction(service, action, params);
        const label = result?.url
          ? `${service}: ${action} — ${result.url}`
          : `${service}: ${action} done`;
        return {icon:'🔌',label,type:'integration',url:result?.url,result};
      } catch(e) {
        return {icon:'🔌',label:`${service}.${action} failed: ${e.message}`,type:'default'};
      }
    },
  };
}

// ── Streaming AI ──────────────────────────────────────────────────────────────
// Keep direct-call config as fallback when no server is running (Electron app)
const PROVIDER_DEFAULTS = {
  groq:       { url: GROQ_URL,       model: 'llama-3.3-70b-versatile', keyFn: getKey },
  cerebras:   { url: CEREBRAS_URL,   model: 'llama-3.3-70b',           keyFn: getCerebrasKey },
  openrouter: { url: OPENROUTER_URL, model: 'google/gemma-3-27b-it:free', keyFn: getOpenRouterKey },
  sambanova:  { url: SAMBA_URL,      model: 'Meta-Llama-3.3-70B-Instruct', keyFn: getSambaKey },
};

async function* streamAI(messages, maxTokens=3000, modelOverride=null) {
  const provider = getProvider();
  const cfg = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.groq;
  const key = cfg.keyFn();

  // ── Direct API call (preferred whenever a key exists) ───────────────────
  if (key) {
    const extraHeaders = provider === 'openrouter'
      ? { 'HTTP-Referer': 'https://foldbase.app', 'X-Title': 'Foldbase' } : {};
    const model = modelOverride || localStorage.getItem(`${provider}_model`) || cfg.model;
    const res = await fetch(cfg.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json', ...extraHeaders },
      body: JSON.stringify({
        model, messages, max_tokens: maxTokens, temperature: 0.7, stream: true,
      }),
    });
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      const msg = e.error?.message || `HTTP ${res.status}`;
      if (res.status === 429 || /rate.?limit|tpd/i.test(msg)) {
        yield `__ERROR__Rate limit reached. ${msg}`; return;
      }
      if (res.status === 404) {
        yield `__ERROR__Model not found (404). Go to Settings and switch to a different model.`; return;
      }
      yield `__ERROR__${msg}`; return;
    }
    const reader = res.body.getReader(); const dec = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      for (const line of dec.decode(value).split('\n')) {
        if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
        try { const t = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content; if (t) yield t; } catch {}
      }
    }
    return;
  }

  // ── No key — try backend server proxy (Vercel / hosted mode) ────────────
  const isWebMode = window.location.protocol !== 'file:';
  if (isWebMode) {
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages, max_tokens: maxTokens }),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        const msg = e.error || `HTTP ${res.status}`;
        if (/rate.?limit|tpd/i.test(msg)) yield `__ERROR__Rate limit reached. ${msg}`;
        else yield `__ERROR__${msg}`;
        return;
      }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
          try { const t = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content; if (t) yield t; } catch {}
        }
      }
      return;
    } catch {
      // Server not running — fall through to key error below
    }
  }

  yield `__ERROR__No API key found. Add a Groq key in Settings → General.`;
}

// ── Agent ─────────────────────────────────────────────────────────────────────
const SYSTEM = `You are an AI assistant inside Foldbase productivity app. Today is ${TODAY} (${TODAY_ISO}).

== FILE ACCESS ==
When the user uploads files, their content is injected at the start of their message as [File: name]\ncontent.
Read and use this content — summarize it, analyze it, extract key points, etc.

== GATHERING PHASE (complex requests only) ==
When the user makes a complex planning request (trip, project plan, weekly schedule, etc.) and you don't yet have enough details:
- Ask 2-3 SHORT, specific questions to understand exactly what they need.
- Do NOT plan yet. Do NOT add any actions block.
- Keep this conversational and friendly.

== PLANNING PHASE (when you have enough info) ==
Once you have the details, write the FULL detailed plan using MARKDOWN FORMATTING:

# Main Title
## Day 1: Section Title
### Sub-section
- Bullet point with **bold key info**

Write rich real content. Then at the END add the actions block:
\`\`\`actions
{"actions":[
  {"type":"create_page","title":"...","content":"(full plan text)"},
  {"type":"create_project","name":"...","description":"..."},
  {"type":"add_task","title":"...","priority":"high|medium|low"},
  {"type":"add_event","title":"...","date":"YYYY-MM-DD","startTime":"HH:MM","endTime":"HH:MM"},
  {"type":"write_sheets","title":"Sheet title","data":[["Col1","Col2"],["Val1","Val2"]]},
  {"type":"create_doc","title":"Doc title","content":"full text content"},
  {"type":"send_email","to":"email@example.com","subject":"...","body":"..."}
]}
\`\`\`

== WORKFLOW & AUTOMATION REQUESTS ==
When the user asks you to set up a workflow, automation, or multi-step process involving apps, music, data, or services:
1. Write the workflow steps as a clear numbered plan
2. Execute what you CAN: search is automatic, create_page saves the plan, add_task for each step
3. For services not yet connected (Spotify, GitHub, etc.), describe exactly what WOULD happen
4. ALWAYS emit an actions block with at minimum: create_page (the full workflow doc) + add_task for each step
This ensures the workflow visualization shows on screen and the user can track every step.

== GOOGLE WORKSPACE TOOLS ==
When the user asks you to write to Google Sheets, create a Google Doc, or send an email — add those action types to the actions block above.

write_sheets: data must be a 2D array of strings (rows × columns). First row = headers.
create_doc: content is plain text (can use newlines). Will be saved as a Google Doc.
send_email: to is the recipient email, subject and body are strings.

These execute automatically if Google is connected (Settings → Integrations). If not connected, tell the user to connect Google first.

== SIMPLE REQUESTS ==
For simple tasks — just do it directly. Use markdown formatting in your response.

== CASUAL CHAT ==
Just respond normally. NEVER add an actions block for casual chat.

== INTEGRATION ACTIONS ==
When connected services are available, you can call them via the actions block:
{"type":"integration_action","service":"slack","action":"send_message","params":{"channel":"#general","text":"Hello!"}}
{"type":"integration_action","service":"github","action":"create_issue","params":{"repo":"owner/repo","title":"Bug fix","body":"Details..."}}
Only use integration actions when the user explicitly asks to interact with those services.

== DOCUMENT EDITING ==
When the user uploads a file and asks you to edit, fix, translate, reformat, summarize, or improve it:
1. Write a brief description of what you changed (2-4 sentences max)
2. Then output the COMPLETE edited document at the end inside this block:
\`\`\`edited_doc
{"filename":"original_name_edited.txt","content":"...full edited content here..."}
\`\`\`
ALWAYS include the COMPLETE document — not just the changes. The user needs to download the full file.
The filename should reflect the original file name if you know it.

Rules:
- Use ## for each day/section, ### for sub-sections, - for bullets, **bold** for key info
- Write genuinely useful details (real places, real prices, real addresses)
- Convert "6pm" -> "18:00", "tomorrow" -> ${TODAY_ISO} + 1 day
- Respond in the SAME language as the user
- For trips: each day gets ## Day N: Title, with morning/afternoon/evening sub-sections
- Add multiple events (one per activity day), tasks (packing, booking), and one page + project`;

// Vision model override per provider (used when images are attached)
const VISION_MODELS = {
  groq:       'meta-llama/llama-4-maverick-17b-128e-instruct',
  openrouter: null,  // use the user's configured model
  cerebras:   null,
  sambanova:  null,
};

// Maps action types → activity display metadata
const ACTION_ACTIVITY = {
  create_page:        a => ({ type:'page',    icon:'📝', label:`Creating page "${a.title||'Untitled'}"` }),
  add_task:           a => ({ type:'task',    icon:'✅', label:`Adding task "${a.title}"` }),
  add_event:          a => ({ type:'event',   icon:'📅', label:`Adding event "${a.title}" on ${a.date}` }),
  add_idea:           a => ({ type:'idea',    icon:'💡', label:`Saving idea "${a.title}"` }),
  create_project:     a => ({ type:'project', icon:'🗂️', label:`Creating project "${a.name}"` }),
  write_sheets:       a => ({ type:'sheets',  icon:'📊', label:`Google Sheets: "${a.title||'Export'}"`, previewData:(a.data||[]).slice(0,6), fullData:a.data||[], title:a.title||'Export' }),
  create_doc:         a => ({ type:'doc',     icon:'📄', label:`Google Docs: "${a.title||'Document'}"`,  detail:(a.content||'').slice(0,300) }),
  send_email:         a => ({ type:'email',   icon:'✉️', label:`Email to ${a.to}`, to:a.to, subject:a.subject, body:a.body }),
  integration_action: a => {
    const icons = { spotify:'🎵', github:'🐙', notion:'⬛', slack:'💬', discord:'🔵', zoom:'📹', trello:'📋', airtable:'🔵', linear:'🟣', figma:'🟣', stripe:'💳', shopify:'🟢', jira:'🔵', asana:'🔴', hubspot:'🟠', mailchimp:'⭐', twitter:'⬛', dropbox:'🔵', salesforce:'🔵' };
    const icon = icons[a.service] || '🔌';
    const actionLabels = { create_playlist:'Creating playlist', search_track:'Searching tracks', get_album_tracks:'Getting album tracks', create_issue:'Creating issue', create_pr:'Opening PR', send_message:'Sending message', write_sheets:'Writing to Sheets', create_doc:'Creating Doc', send_gmail:'Sending email', create_event:'Creating event', list_repos:'Listing repos', list_channels:'Listing channels', get_top_tracks:'Getting top tracks', get_profile:'Getting profile' };
    const actionLabel = actionLabels[a.action] || a.action;
    return { type:'integration', icon, label:`${actionLabel} — ${a.service}` };
  },
};

async function runAgent(userMessage, history, onToken, onStatus, onAction, handlers, onSource, visionImages=null, onEditedDoc=null, onActivity=null, connectedServices=null) {
  const provider = getProvider();
  const cfg = PROVIDER_DEFAULTS[provider] || PROVIDER_DEFAULTS.groq;
  const key = cfg.keyFn();
  if(!key) {
    const names = { groq:'Groq', cerebras:'Cerebras', openrouter:'OpenRouter', sambanova:'SambaNova' };
    onToken(`Add a ${names[provider]||provider} API key in Settings → General to enable AI.`);
    return [];
  }

  // When images are present, use a vision-capable model
  const modelOverride = visionImages?.length ? (VISION_MODELS[provider] ?? null) : null;

  // Detect complex planning request that needs research
  const needsSearch = /trip|travel|visit|plan|schedule|טיול|לתכנן|לבקר|לטוס|תכנון|itinerary/i.test(userMessage);
  let searchContext='';

  if(needsSearch) {
    // Extract place/topic names
    const topics = userMessage.match(/\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?|tel aviv|new york|los angeles)\b/g)||[];
    const uniqueTopics = [...new Set(topics.map(t=>t.toLowerCase()))].slice(0,3);

    for(const topic of uniqueTopics) {
      onStatus(`Searching "${topic}"...`);
      const actId = uuidv4();
      onActivity?.({ id:actId, type:'search', icon:'🔍', label:`Searching "${topic}"`, status:'active', url:`en.wikipedia.org/wiki/${encodeURIComponent(topic)}` });
      const result = await searchWeb(`${topic} travel guide attractions`);
      if(result) {
        onSource?.({ query: topic, excerpt: result.text, title: result.title, city: detectCity(topic) });
        searchContext += `\n[Source: ${result.title}]\n${result.text}\n`;
        onActivity?.({ id:actId, type:'search', icon:'🔍', label:`Searched "${topic}"`, status:'done', url:result.url, title:result.title, detail:result.text.slice(0,160) });
      } else {
        onActivity?.({ id:actId, type:'search', icon:'🔍', label:`Searched "${topic}"`, status:'done' });
      }
    }
    // Also search in the conversation history for previously mentioned destinations
    const historyText = history.slice(-4).map(m=>m.text).join(' ');
    const histTopics = historyText.match(/\b([A-Z][a-z]{2,}(?:\s[A-Z][a-z]+)?)\b/g)||[];
    for(const topic of [...new Set(histTopics.map(t=>t.toLowerCase()))].slice(0,2)) {
      if(!uniqueTopics.includes(topic)) {
        const actId2 = uuidv4();
        onActivity?.({ id:actId2, type:'search', icon:'🔍', label:`Searching "${topic}"`, status:'active', url:`en.wikipedia.org/wiki/${encodeURIComponent(topic)}` });
        const result = await searchWeb(`${topic} travel guide attractions`);
        if(result) {
          onSource?.({ query: topic, excerpt: result.text, title: result.title, city: detectCity(topic) });
          searchContext += `\n[Source: ${result.title}]\n${result.text}\n`;
          onActivity?.({ id:actId2, type:'search', icon:'🔍', label:`Searched "${topic}"`, status:'done', url:result.url, title:result.title, detail:result.text.slice(0,160) });
        } else {
          onActivity?.({ id:actId2, type:'search', icon:'🔍', label:`Searched "${topic}"`, status:'done' });
        }
      }
    }
  }

  onStatus('Thinking...');

  // Build last user message — plain text or vision array (images + text)
  const userContent = visionImages?.length
    ? [
        ...visionImages.map(b64 => ({ type: 'image_url', image_url: { url: b64 } })),
        { type: 'text', text: userMessage },
      ]
    : userMessage;

  // Build connected-services section for AI
  let integrationSection = '';
  if (connectedServices && connectedServices.length > 0) {
    const SVC_ACTIONS = {
      spotify:  'search_track, create_playlist, get_album_tracks, get_top_tracks',
      github:   'create_issue, create_pr, list_repos',
      notion:   'create_page, create_db_entry',
      slack:    'send_message, list_channels',
      google:   'write_sheets, create_doc, send_gmail, create_event',
      airtable: 'add_record, query_table',
      linear:   'create_issue, update_status',
      discord:  'send_message',
      zoom:     'schedule_meeting',
      trello:   'create_card, move_card',
      hubspot:  'create_contact, log_email',
      dropbox:  'upload_file, share_link',
      twitter:  'post_tweet',
      stripe:   'get_revenue, list_customers',
      shopify:  'list_orders, update_inventory',
      jira:     'create_issue, update_sprint',
      figma:    'list_files, export_asset',
      asana:    'create_task, update_status',
      salesforce: 'create_lead, update_deal',
      mailchimp: 'send_campaign, add_subscriber',
    };
    const lines = connectedServices.map(svc => `- ${svc}: ${SVC_ACTIONS[svc] || 'integration_action'}`);
    integrationSection = `\n\n== CONNECTED INTEGRATIONS ==\nThe user has connected these services. You CAN use integration_action for them:\n${lines.join('\n')}\nUse: {"type":"integration_action","service":"<service>","action":"<action>","params":{...}}`;
  }

  const msgs = [
    {role:'system', content: SYSTEM + integrationSection + (searchContext ? `\n\n== REAL SEARCH RESULTS (use this info in your plan) ==\n${searchContext}` : '')},
    ...history.slice(-12).map(m=>({role:m.role==='assistant'?'assistant':'user',content:m.text||'...'})),
    {role:'user', content: userContent},
  ];

  let fullText = '';
  onStatus('Writing...');
  for await (const token of streamAI(msgs, 3000, modelOverride)) {
    if(token.startsWith('__ERROR__')) {
      const raw = token.slice(9);
      // Show friendly rate-limit message instead of raw API error
      if(/rate.?limit|tpd|tokens per day|try again in/i.test(raw)) {
        const waitMatch = raw.match(/try again in\s+([\dhms.]+)/i);
        const wait = waitMatch ? ` Try again in ${waitMatch[1].replace(/\.\d+s/,'s')}.` : '';
        onToken(`⏳ Daily token limit reached (Groq free tier: 100K tokens/day).${wait}\n\nUpgrade at console.groq.com/settings/billing for more tokens.`);
      } else {
        onToken(`❌ ${raw}`);
      }
      return [];
    }
    fullText += token;
    const visibleText = fullText
      .replace(/```actions[\s\S]*?```/g,'')
      .replace(/```edited_doc[\s\S]*?```/g,'')
      .trimEnd();
    onToken(visibleText);
  }

  // Parse and surface edited document
  const editedDocMatch = fullText.match(/```edited_doc\s*([\s\S]*?)```/);
  if (editedDocMatch && onEditedDoc) {
    try { onEditedDoc(JSON.parse(editedDocMatch[1])); } catch {}
  }

  const actionsMatch = fullText.match(/```actions\s*([\s\S]*?)```/);
  const steps = [];
  if(actionsMatch) {
    try {
      const {actions=[]} = JSON.parse(actionsMatch[1]);
      for(const a of actions) {
        const fn=handlers[a.type]; if(!fn) continue;
        const meta = ACTION_ACTIVITY[a.type]?.(a) || { type:'action', icon:'⚡', label:a.type };
        const actId = uuidv4();
        onActivity?.({ id:actId, status:'active', ...meta });
        onStatus(`${meta.icon} ${a.title||a.name||a.type}...`);
        await new Promise(r=>setTimeout(r,340));
        try {
          const r=await Promise.resolve(fn(a));
          steps.push(r); onAction(r);
          onActivity?.({ id:actId, status:'done', ...meta, url:r?.url });
        } catch(e) {
          onActivity?.({ id:actId, status:'error', ...meta });
          console.error(e);
        }
      }
    } catch {}
  }
  onStatus('');
  return steps;
}

// ── SVG ───────────────────────────────────────────────────────────────────────
const SVG = {
  task:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  pipeline:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="18" rx="1"/><rect x="10" y="3" width="5" height="12" rx="1"/><rect x="17" y="3" width="5" height="8" rx="1"/></svg>,
  idea:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
  revenue:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  calendar:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  goals:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  doc:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  grid:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  chat:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  plus:<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  search:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  pin:<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
};

const L = {
  nda:      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>,
  review:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  research: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>,
  matter:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>,
  shield:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  sign:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  memo:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
  clause:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

const CHIPS = [
  { icon: L.nda,      label: 'Draft NDA',             view: 'workflow'  },
  { icon: L.research, label: 'Research case law',      view: 'workflow'  },
  { icon: L.review,   label: 'Review contract',        view: 'workflow'  },
  { icon: L.matter,   label: 'Open a matter',          view: 'matters'   },
  { icon: L.shield,   label: 'Compliance check',       view: 'workflow'  },
  { icon: L.sign,     label: 'Send for signature',     view: 'workflow'  },
  { icon: L.memo,     label: 'Draft legal memo',       view: 'workflow'  },
  { icon: L.clause,   label: 'Analyze clause',         view: 'workflow'  },
];

const SendSVG     = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const XSvg        = <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PlusSVG     = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const WebSVG      = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
const ConnectSVG  = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const AttachSVG   = <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>;

// ── Inline markdown parser ─────────────────────────────────────────────────────
function parseInline(text) {
  const tokens = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
  return tokens.map((t, i) => {
    if(t.startsWith('**') && t.endsWith('**')) return <strong key={i}>{t.slice(2,-2)}</strong>;
    if(t.startsWith('*')  && t.endsWith('*'))  return <em key={i}>{t.slice(1,-1)}</em>;
    if(t.startsWith('`')  && t.endsWith('`'))  return <code key={i} className="hp__doc-code">{t.slice(1,-1)}</code>;
    return t;
  });
}

function renderDoc(text) {
  if(!text) return null;
  return text.split('\n').map((line, i) => {
    const t = line.trimEnd();
    if(!t) return <div key={i} className="hp__doc-gap"/>;
    if(t.startsWith('# '))   return <h1 key={i} className="hp__doc-h1">{parseInline(t.slice(2))}</h1>;
    if(t.startsWith('## '))  return <h2 key={i} className="hp__doc-h2">{parseInline(t.slice(3))}</h2>;
    if(t.startsWith('### ')) return <h3 key={i} className="hp__doc-h3">{parseInline(t.slice(4))}</h3>;
    if(t.startsWith('#### ')) return <h4 key={i} className="hp__doc-h4">{parseInline(t.slice(5))}</h4>;
    if(t.startsWith('- ') || t.startsWith('• ')) return (
      <div key={i} className="hp__doc-li"><span className="hp__doc-li-dot"/><span>{parseInline(t.slice(2))}</span></div>
    );
    if(/^\d+\.\s/.test(t)) return (
      <div key={i} className="hp__doc-li hp__doc-li--num"><span className="hp__doc-li-num">{t.match(/^(\d+)\./)[1]}</span><span>{parseInline(t.replace(/^\d+\.\s/,''))}</span></div>
    );
    if(t.startsWith('---') || t.startsWith('===')) return <hr key={i} className="hp__doc-hr"/>;
    return <p key={i} className="hp__doc-p" dir="auto">{parseInline(t)}</p>;
  });
}

// ── Mini Calendar component ───────────────────────────────────────────────────
function MiniCalendar({ events }) {
  const now = new Date();
  // Use the month of the first event, or current month
  const targetDate = events.length > 0 && events[0].date
    ? new Date(events[0].date + 'T12:00:00')
    : now;
  const year  = targetDate.getFullYear();
  const month = targetDate.getMonth();
  const daysInMonth  = new Date(year, month+1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();

  // Group event colors by day
  const dayColors = {};
  events.forEach(ev => {
    if(!ev.date) return;
    const [y,m,d] = ev.date.split('-').map(Number);
    if(y===year && m-1===month) {
      dayColors[d] = dayColors[d] || [];
      dayColors[d].push(ev.color||'#3b82f6');
    }
  });

  const todayDay = now.getFullYear()===year && now.getMonth()===month ? now.getDate() : -1;
  const monthName = targetDate.toLocaleDateString('en',{month:'long',year:'numeric'});

  return (
    <div className="hp__mini-cal">
      <div className="hp__mini-cal-head">{monthName}</div>
      <div className="hp__mini-cal-grid">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=><div key={d} className="hp__mini-cal-wday">{d}</div>)}
        {Array.from({length:firstWeekday},(_,i)=><div key={`e${i}`}/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const day=i+1;
          const colors=dayColors[day]||[];
          return (
            <div key={day} className={`hp__mini-cal-day${day===todayDay?' today':''}${colors.length?' has-ev':''}`}>
              <span>{day}</span>
              {colors.length>0&&<div className="hp__mini-cal-dots">
                {colors.slice(0,3).map((c,j)=><span key={j} style={{background:c}}/>)}
              </div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Format date string nicely
function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString('en',{month:'short',day:'numeric'}); } catch { return iso; }
}

// ── Edited Document Card ──────────────────────────────────────────────────────
function EditedDocCard({ doc, copiedDoc, setCopiedDoc, onSavePage }) {
  const preview = doc.content.slice(0, 300).split('\n').slice(0, 6).join('\n');
  const lines   = doc.content.split('\n').length;
  const chars   = doc.content.length;

  const handleCopy = () => {
    copyToClipboard(doc.content);
    setCopiedDoc(true);
    setTimeout(() => setCopiedDoc(false), 2000);
  };

  return (
    <div className="hp__edoc">
      <div className="hp__edoc-header">
        <span className="hp__edoc-icon">📄</span>
        <div className="hp__edoc-meta">
          <span className="hp__edoc-name">{doc.filename}</span>
          <span className="hp__edoc-stats">{lines} lines · {chars.toLocaleString()} chars</span>
        </div>
        <div className="hp__edoc-actions">
          <button className="hp__edoc-btn" onClick={handleCopy}>
            {copiedDoc ? '✓ Copied' : 'Copy'}
          </button>
          <button className="hp__edoc-btn" onClick={()=>downloadFile(doc.filename, doc.content, 'txt')}>
            ↓ .txt
          </button>
          <button className="hp__edoc-btn" onClick={()=>downloadFile(doc.filename, doc.content, 'md')}>
            ↓ .md
          </button>
          <button className="hp__edoc-btn hp__edoc-btn--primary" onClick={onSavePage}>
            Save to Pages
          </button>
        </div>
      </div>
      <pre className="hp__edoc-preview">{preview}{doc.content.length > 300 ? '\n…' : ''}</pre>
    </div>
  );
}

// ── Workflow helpers ──────────────────────────────────────────────────────────
const TYPE_ACCENT = {
  sheets:      '#10b981',
  doc:         '#3b82f6',
  email:       '#f59e0b',
  search:      '#8b5cf6',
  page:        '#6366f1',
  task:        '#06b6d4',
  event:       '#ec4899',
  project:     '#f97316',
  integration: '#1db954',
  idea:        '#a855f7',
  init:        '#6366f1',
};

function downloadCSV(title, data) {
  if (!data?.length) return;
  const csv = data.map(row =>
    (Array.isArray(row) ? row : [String(row)]).map(c => `"${String(c||'').replace(/"/g,'""')}"`).join(',')
  ).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${title||'export'}.csv` });
  a.click(); URL.revokeObjectURL(url);
}

// ── App icon component (no emojis) ───────────────────────────────────────────
function AppIcon({ type, size = 34 }) {
  const r = Math.round(size / 3.5);
  const icons = {
    search:      { bg:'#7c3aed', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="15.5" y2="15.5"/></svg> },
    sheets:      { bg:'#16a34a', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></svg> },
    doc:         { bg:'#2563eb', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg> },
    email:       { bg:'#dc2626', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg> },
    task:        { bg:'#0891b2', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg> },
    event:       { bg:'#db2777', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> },
    project:     { bg:'#ea580c', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg> },
    page:        { bg:'#4f46e5', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> },
    idea:        { bg:'#9333ea', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="11" r="6"/><path d="M9 21h6M12 17v4"/></svg> },
    integration: { bg:'#059669', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg> },
    init:        { bg:'#4f46e5', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg> },
    write:       { bg:'#4f46e5', svg:<svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
  };
  const cfg = icons[type] || icons.init;
  return (
    <div style={{
      width: size, height: size, borderRadius: r, background: cfg.bg,
      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
    }}>
      <div style={{width: size * 0.55, height: size * 0.55}}>{cfg.svg}</div>
    </div>
  );
}

// ── Workflow visualization ────────────────────────────────────────────────────
function NodePreview({ act }) {
  const isActive = act.status === 'active';
  const [displayUrl, setDisplayUrl] = useState('');

  useEffect(() => {
    if (act.type !== 'search' || !act.url) { setDisplayUrl(''); return; }
    if (!isActive) { setDisplayUrl(act.url); return; }
    const url = act.url;
    let i = 0;
    setDisplayUrl('');
    const id = setInterval(() => {
      i += 3;
      setDisplayUrl(url.slice(0, i));
      if (i >= url.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [act.url, isActive, act.type]);

  if (act.type === 'search' && (act.detail || act.title || act.url)) return (
    <div className="hp__wf-preview hp__wf-preview--browser">
      <div className="hp__wf-browser-bar">
        <div className="hp__wf-browser-dots"><span/><span/><span/></div>
        <div className="hp__wf-browser-url">
          {isActive ? (displayUrl || act.url || '') : act.url}
          {isActive && <span className="hp__wf-scan-cursor">|</span>}
        </div>
        {isActive && <div className="hp__wf-browser-loading"/>}
      </div>
      {act.title && <div className="hp__wf-browser-title">{act.title}</div>}
      {act.detail && <div className="hp__wf-browser-text">{act.detail}</div>}
    </div>
  );
  if (act.type === 'sheets' && act.previewData?.length > 0) return (
    <div className="hp__wf-preview hp__wf-preview--sheet">
      {act.previewData.slice(0,5).map((row,ri)=>(
        <div key={ri} className="hp__wf-sheet-row">
          {(Array.isArray(row)?row:[String(row)]).slice(0,4).map((cell,ci)=>(
            <div key={ci} className={`hp__wf-sheet-cell${ri===0?' hp__wf-sheet-cell--head':''}`}>{cell}</div>
          ))}
        </div>
      ))}
      {act.status==='done' && (
        <div className="hp__wf-sheet-actions">
          <button className="hp__wf-sheet-btn hp__wf-sheet-btn--primary" onClick={()=>downloadCSV(act.title||'sheet', act.fullData||act.previewData)}>
            ↓ Download CSV
          </button>
          {act.url && (
            <a className="hp__wf-sheet-btn" href={act.url} target="_blank" rel="noreferrer">
              Open in Google Sheets ↗
            </a>
          )}
        </div>
      )}
    </div>
  );
  if (act.type === 'doc' && act.detail) return (
    <div className="hp__wf-preview hp__wf-preview--doc hp__wf-preview--doc-large">
      <div className="hp__wf-doc-header">
        <div className="hp__wf-doc-header-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="14" y2="17"/></svg>
        </div>
        <div className="hp__wf-doc-header-meta">
          <div className="hp__wf-doc-header-title">{act.title || 'Document'}</div>
          {act.url
            ? <a className="hp__wf-doc-header-link" href={act.url} target="_blank" rel="noreferrer">Open in Google Docs ↗</a>
            : isActive && <span className="hp__wf-doc-header-status">Writing…</span>}
        </div>
        {isActive && <span className="hp__act-spin"/>}
      </div>
      <div className="hp__wf-doc-body">
        {act.detail.split('\n').slice(0,12).map((line,i)=>(
          <div key={i} className={`hp__wf-doc-line${/^#{1,3}\s/.test(line)?' hp__wf-doc-line--h':''}`}>{line||' '}</div>
        ))}
        {isActive && <span className="hp__wf-cursor">▌</span>}
      </div>
    </div>
  );
  if (act.type === 'email') return (
    <div className="hp__wf-preview hp__wf-preview--email">
      <div className="hp__wf-email-field"><span>To</span>{act.to}</div>
      <div className="hp__wf-email-field"><span>Subject</span>{act.subject}</div>
      {act.body && <div className="hp__wf-email-body">{act.body.slice(0,120)}{act.body?.length>120?'…':''}</div>}
    </div>
  );
  return null;
}

function WorkflowStep({ act, index }) {
  const isDone   = act.status === 'done';
  const isError  = act.status === 'error';
  const isActive = act.status === 'active';
  const accent   = TYPE_ACCENT[act.type] || '#6366f1';

  const typeLabels = {
    sheets:'Google Sheets', doc:'Google Docs', email:'Gmail',
    search:'Web Search', page:'Page saved', task:'Task added',
    event:'Calendar', project:'Project', idea:'Idea saved',
    integration:'Integration', init:'Processing',
  };

  return (
    <div className={`hp__wf-step hp__wf-step--${act.status}`} style={{'--node-delay':`${(index||0)*55}ms`,'--wf-accent':accent}}>
      <div className="hp__wf-step-rail">
        <div className={`hp__wf-step-line${isDone?' hp__wf-step-line--done':isActive?' hp__wf-step-line--live':''}`}/>
      </div>
      <div className="hp__wf-step-card">
        {isActive && <div className="hp__wf-node-shimmer"/>}
        <AppIcon type={act.type} size={34}/>
        <div className="hp__wf-step-body">
          <div className="hp__wf-step-title">{act.label}</div>
          <div className="hp__wf-step-sub">{typeLabels[act.type]||act.type}</div>
          <NodePreview act={act}/>
        </div>
        <div className="hp__wf-step-status">
          {isActive && <span className="hp__act-spin"/>}
          {isDone  && <div className="hp__wf-badge--done hp__wf-badge--pop">✓</div>}
          {isError && <div className="hp__wf-badge--err">✗</div>}
          {isDone && act.url && <a className="hp__wf-node-link" href={act.url} target="_blank" rel="noreferrer">↗</a>}
        </div>
      </div>
    </div>
  );
}

function AIResult({ text, onSave, onCopy, onSend }) {
  const [copied, setCopied] = useState(false);
  const [sent,   setSent]   = useState(false);

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const handleSend = () => {
    onSend?.();
    setSent(true);
    setTimeout(() => setSent(false), 2000);
  };

  return (
    <div className="hp__ai-result">
      <div className="hp__ai-result-glow"/>
      <div className="hp__ai-result-header">
        <div className="hp__ai-result-brand">
          <span className="hp__ai-result-orb"/>
          <span className="hp__ai-result-brand-name">AI Response</span>
        </div>
        <div className="hp__ai-result-actions">
          <button className="hp__ai-btn hp__ai-btn--copy" onClick={handleCopy}>
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button className="hp__ai-btn hp__ai-btn--send" onClick={handleSend}>
            {sent ? '✓ Sent' : '↗ Send'}
          </button>
          <button className="hp__ai-btn hp__ai-btn--save" onClick={onSave}>
            ＋ Save as Doc
          </button>
        </div>
      </div>
      <div className="hp__ai-result-body">
        {renderDoc(text)}
      </div>
    </div>
  );
}

const SVC_META = {
  spotify:    { icon:'🎵', label:'Spotify',    hint:'Create playlist, search tracks' },
  github:     { icon:'🐙', label:'GitHub',     hint:'Create issue, open PR' },
  notion:     { icon:'⬛', label:'Notion',     hint:'Create page, add entry' },
  slack:      { icon:'💬', label:'Slack',      hint:'Send message to channel' },
  google:     { icon:'🟢', label:'Google',     hint:'Sheets, Docs, Gmail, Calendar' },
  airtable:   { icon:'🔵', label:'Airtable',   hint:'Add records to table' },
  linear:     { icon:'🟣', label:'Linear',     hint:'Create or update issues' },
  discord:    { icon:'🔵', label:'Discord',    hint:'Send message' },
  zoom:       { icon:'📹', label:'Zoom',       hint:'Schedule meeting' },
  trello:     { icon:'📋', label:'Trello',     hint:'Create card, move to list' },
  hubspot:    { icon:'🟠', label:'HubSpot',    hint:'Create contact, log email' },
  dropbox:    { icon:'🔵', label:'Dropbox',    hint:'Upload file, share link' },
  twitter:    { icon:'⬛', label:'Twitter',    hint:'Post tweet' },
  stripe:     { icon:'💳', label:'Stripe',     hint:'Get revenue, list customers' },
  shopify:    { icon:'🟢', label:'Shopify',    hint:'List orders, update inventory' },
  jira:       { icon:'🔵', label:'Jira',       hint:'Create issue, update sprint' },
  figma:      { icon:'🟣', label:'Figma',      hint:'List files, export assets' },
  asana:      { icon:'🔴', label:'Asana',      hint:'Create task, update status' },
  salesforce: { icon:'🔵', label:'Salesforce', hint:'Create lead, update deal' },
  mailchimp:  { icon:'⭐', label:'Mailchimp',  hint:'Send campaign, add subscriber' },
};

// ── Tools catalog (used by drawer + connected bar) ────────────────────────────
const TOOLS_CATALOG = [
  { id:'google',     icon:'🟢', label:'Google',     color:'#34a853', actions:['Create Sheet','Create Doc','Send Email','Calendar'] },
  { id:'github',     icon:'🐙', label:'GitHub',     color:'#333',    actions:['Create Issue','Open PR','Search Repos'] },
  { id:'notion',     icon:'📝', label:'Notion',     color:'#555',    actions:['Create Page','Add to DB','Search'] },
  { id:'slack',      icon:'💬', label:'Slack',      color:'#4a154b', actions:['Send Message','Create Channel'] },
  { id:'spotify',    icon:'🎵', label:'Spotify',    color:'#1db954', actions:['Create Playlist','Search Track','Top Tracks'] },
  { id:'airtable',   icon:'📐', label:'Airtable',   color:'#2d7ff9', actions:['Add Record','Search Table'] },
  { id:'linear',     icon:'🔷', label:'Linear',     color:'#5e6ad2', actions:['Create Issue','Update Status'] },
  { id:'discord',    icon:'💙', label:'Discord',    color:'#5865f2', actions:['Send Message','Create Thread'] },
  { id:'zoom',       icon:'📹', label:'Zoom',       color:'#2d8cff', actions:['Schedule Meeting','List Meetings'] },
  { id:'trello',     icon:'📋', label:'Trello',     color:'#0052cc', actions:['Create Card','Move Card'] },
  { id:'hubspot',    icon:'🟠', label:'HubSpot',    color:'#ff7a59', actions:['Create Contact','Log Email'] },
  { id:'dropbox',    icon:'📦', label:'Dropbox',    color:'#0061ff', actions:['Upload File','Share Link'] },
  { id:'twitter',    icon:'🐦', label:'Twitter/X',  color:'#1da1f2', actions:['Post Tweet','Search'] },
  { id:'stripe',     icon:'💳', label:'Stripe',     color:'#635bff', actions:['Get Revenue','List Customers'] },
  { id:'jira',       icon:'🔵', label:'Jira',       color:'#0052cc', actions:['Create Issue','Get Board'] },
  { id:'figma',      icon:'🎨', label:'Figma',      color:'#f24e1e', actions:['List Files','Export Assets'] },
  { id:'asana',      icon:'🔴', label:'Asana',      color:'#e8384f', actions:['Create Task','Update Status'] },
  { id:'mailchimp',  icon:'📧', label:'Mailchimp',  color:'#ffe01b', actions:['Send Campaign','Add Subscriber'] },
  { id:'salesforce', icon:'☁️', label:'Salesforce', color:'#00a1e0', actions:['Create Lead','Update Deal'] },
  { id:'shopify',    icon:'🛍', label:'Shopify',    color:'#96bf48', actions:['List Orders','Get Sales'] },
];

// ── Tools Drawer (slides up inside the screen) ────────────────────────────────
function ToolsDrawer({ integrationStatus, onClose, onNavigate }) {
  const [search, setSearch] = useState('');
  const connected = TOOLS_CATALOG.filter(t => integrationStatus?.[t.id]?.connected);
  const available = TOOLS_CATALOG.filter(t => !integrationStatus?.[t.id]?.connected);
  const q = search.toLowerCase();
  const filter = list => q
    ? list.filter(t => t.label.toLowerCase().includes(q) || t.actions.some(a => a.toLowerCase().includes(q)))
    : list;
  const connF = filter(connected);
  const availF = filter(available);
  return (
    <>
      <div className="hp__tools-backdrop" onClick={onClose}/>
      <div className="hp__tools-drawer">
        <div className="hp__tools-handle-bar"/>
        <div className="hp__tools-head">
          <div>
            <div className="hp__tools-head-title">Apps & Tools</div>
            <div className="hp__tools-head-sub">{connected.length} connected · {TOOLS_CATALOG.length} available</div>
          </div>
          <button className="hp__tools-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="hp__tools-search-row">
          <input className="hp__tools-search" placeholder="Search apps and actions…"
            value={search} onChange={e=>setSearch(e.target.value)} autoFocus/>
        </div>
        <div className="hp__tools-body">
          {connF.length > 0 && (
            <div className="hp__tools-section">
              <div className="hp__tools-sec-label">
                <span className="hp__tools-sec-dot hp__tools-sec-dot--live"/>Connected & Ready
              </div>
              <div className="hp__tools-grid">
                {connF.map(t => (
                  <div key={t.id} className="hp__tools-card hp__tools-card--on">
                    <div className="hp__tools-card-top">
                      <div className="hp__tools-card-icon-bg" style={{'--tc':t.color}}>{t.icon}</div>
                      <div>
                        <div className="hp__tools-card-name">{t.label}</div>
                        <div className="hp__tools-card-live"><span className="hp__tools-card-dot"/>Live</div>
                      </div>
                    </div>
                    <div className="hp__tools-card-tags">
                      {t.actions.map(a => <span key={a} className="hp__tools-action-tag">{a}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {availF.length > 0 && (
            <div className="hp__tools-section">
              <div className="hp__tools-sec-label">Available to Connect</div>
              <div className="hp__tools-grid">
                {availF.map(t => (
                  <div key={t.id} className="hp__tools-card hp__tools-card--off">
                    <div className="hp__tools-card-top">
                      <span className="hp__tools-card-icon-dim">{t.icon}</span>
                      <div>
                        <div className="hp__tools-card-name">{t.label}</div>
                        <div className="hp__tools-card-hint">{t.actions[0]}</div>
                      </div>
                    </div>
                    <button className="hp__tools-connect-btn"
                      onClick={()=>{onClose(); onNavigate?.('integrations');}}>
                      Connect →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {!connF.length && !availF.length && (
            <div className="hp__tools-empty">No apps match "{search}"</div>
          )}
        </div>
        <div className="hp__tools-footer">
          <button className="hp__tools-manage-btn" onClick={()=>{onClose(); onNavigate?.('integrations');}}>
            Manage all integrations →
          </button>
        </div>
      </div>
    </>
  );
}

// ── Connected apps visual bar (home screen) ───────────────────────────────────
function ConnectedAppsBar({ integrationStatus, onClick }) {
  const connected = TOOLS_CATALOG.filter(t => integrationStatus?.[t.id]?.connected);
  if (!connected.length) return null;
  return (
    <button className="hp__conn-bar" onClick={onClick}>
      <div className="hp__conn-signal">
        <span className="hp__conn-ring"/>
        <span className="hp__conn-ring hp__conn-ring--2"/>
        <span className="hp__conn-core"/>
      </div>
      <div className="hp__conn-apps">
        {connected.slice(0,7).map(t=>(
          <span key={t.id} className="hp__conn-app-icon" title={t.label}>{t.icon}</span>
        ))}
        {connected.length > 7 && <span className="hp__conn-more">+{connected.length-7}</span>}
      </div>
      <span className="hp__conn-cta">{connected.length} app{connected.length!==1?'s':''} connected →</span>
    </button>
  );
}

function WorkflowFeed({ activities, status, working, streaming, lastResult, editedDoc, copiedDoc, setCopiedDoc, integrationStatus, onSavePage, onSaveResult, onClose }) {
  const realActs  = activities.filter(a => a.type !== 'init');
  const hasInit   = activities.some(a => a.type === 'init');
  const stepCount = realActs.length;
  const handleCopySummary = () => copyToClipboard(lastResult);

  const streamPreview = streaming
    ? streaming.replace(/```[\s\S]*?```/g,'').trim().split('\n').filter(l=>l.trim()).slice(-5).join('\n')
    : '';

  const activeAct = realActs.find(a => a.status === 'active');
  const headerTitle = working
    ? (activeAct?.label || status || 'Analyzing…')
    : stepCount > 0
      ? `${stepCount} action${stepCount!==1?'s':''} completed`
      : lastResult ? 'Done' : 'Ready';

  return (
    <div className="hp__workflow">
      {/* ── Header (replaces trigger button) ── */}
      <div className="hp__wf-header">
        <div className="hp__wf-header-left">
          <div className={`hp__wf-header-dot${working?' hp__wf-header-dot--live':' hp__wf-header-dot--done'}`}/>
          <div>
            <div className="hp__wf-header-title">{headerTitle}</div>
            {working && status && activeAct && (
              <div className="hp__wf-header-sub">{status}</div>
            )}
          </div>
        </div>
        <button className="hp__wf-back" onClick={onClose}>← Back</button>
      </div>

      <div className="hp__wf-content">
        {/* Analyzing placeholder */}
        {hasInit && realActs.length === 0 && working && (
          <div className="hp__wf-step hp__wf-step--active" style={{'--node-delay':'0ms'}}>
            <div className="hp__wf-step-rail"><div className="hp__wf-step-line hp__wf-step-line--live"/></div>
            <div className="hp__wf-step-card">
              <AppIcon type="init" size={34}/>
              <div className="hp__wf-step-body">
                <div className="hp__wf-step-title">{status||'Analyzing request'}</div>
                <div className="hp__wf-step-sub">AI Planning</div>
              </div>
              <span className="hp__act-spin"/>
            </div>
          </div>
        )}

        {/* Action steps */}
        {realActs.map((act, i) => (
          <WorkflowStep key={act.id} act={act} index={i}/>
        ))}

        {/* Live writing step */}
        {working && streamPreview && (
          <div className="hp__wf-step hp__wf-step--active" style={{'--node-delay':'0ms'}}>
            <div className="hp__wf-step-rail"><div className="hp__wf-step-line hp__wf-step-line--live"/></div>
            <div className="hp__wf-step-card">
              <AppIcon type="write" size={34}/>
              <div className="hp__wf-step-body">
                <div className="hp__wf-step-title">Writing response</div>
                <div className="hp__wf-stream-preview">
                  <div className="hp__wf-stream-text">{streamPreview}</div>
                  <span className="hp__wf-cursor">▌</span>
                </div>
              </div>
              <span className="hp__act-spin"/>
            </div>
          </div>
        )}

        {/* AI result */}
        {!working && lastResult && (
          <AIResult
            text={lastResult}
            onCopy={handleCopySummary}
            onSave={onSaveResult||onSavePage}
            onSend={() => {}}
          />
        )}

        {editedDoc && (
          <EditedDocCard doc={editedDoc} copiedDoc={copiedDoc} setCopiedDoc={setCopiedDoc} onSavePage={onSavePage}/>
        )}
        <div style={{height:40}}/>
      </div>
    </div>
  );
}

// ── Download helper ───────────────────────────────────────────────────────────
function downloadFile(filename, content, ext) {
  const base = filename.replace(/\.[^.]+$/, '');
  const mime = ext === 'md' ? 'text/markdown' : 'text/plain';
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: `${base}.${ext}` });
  a.click();
  URL.revokeObjectURL(url);
}

function copyToClipboard(text) {
  navigator.clipboard?.writeText(text).catch(() => {
    const ta = Object.assign(document.createElement('textarea'), { value: text });
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
  });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function HomePage({ onNavigate, onCreatePage, onCreateTask, onCreateEvent }) {
  const user     = readUser();
  const tasks    = readTasks();
  const pipeline = readPipeline();
  const pending  = tasks.filter(t=>t.status!=='done').length;
  const inProd   = pipeline.filter(p=>['script','record','edit'].includes(p.stage)).length;

  const [integrationStatus, setIntegrationStatus] = useState({});
  useEffect(() => {
    fetchIntegrationStatus().then(s => setIntegrationStatus(s)).catch(() => {});
  }, []);

  const [chats, setChats]               = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(null);
  const [input, setInput]               = useState('');
  const [focused, setFocused]           = useState(false);
  const [chatPanelOpen, setChatPanelOpen]       = useState(false);
  const [chatPanelClosing, setChatPanelClosing] = useState(false);
  const hoverTimerRef = useRef(null);

  const [working, setWorking]       = useState(false);
  const [status, setStatus]         = useState('');
  const [streaming, setStreaming]   = useState('');
  const [lastResult, setLastResult] = useState('');
  const [lastSteps, setLastSteps]   = useState([]);
  const [savedSteps, setSavedSteps] = useState([]);

  const [sources, setSources]       = useState([]);
  const [liveEvents, setLiveEvents] = useState([]);
  const [editedDoc, setEditedDoc]   = useState(null);
  const [copiedDoc, setCopiedDoc]   = useState(false);
  const [liveActivities, setLiveActivities] = useState([]);

  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [webSearch, setWebSearch]         = useState(false);
  const [connectOpen, setConnectOpen]     = useState(false);
  const [toolsOpen,   setToolsOpen]       = useState(false);
  const [dragging,    setDragging]        = useState(false);
  const fileInputRef   = useRef(null);
  const connectRef     = useRef(null);
  const inputRef       = useRef(null);
  const chatRef        = useRef(null);
  const streamRef      = useRef(null);
  const chatPanelRef   = useRef(null);
  const closeTimerRef  = useRef(null);

  const activeChat     = chats.find(c=>c.id===activeChatId)||null;
  const messages       = activeChat?.messages||[];
  const connectedCount = Object.values(integrationStatus).filter(s=>s.connected).length;

  const actions = useMemo(()=>makeActions(
    onCreatePage, onCreateTask, onCreateEvent,
    (ev)=>setLiveEvents(prev=>[...prev,ev]),
    integrationStatus,
  ),[onCreatePage,onCreateTask,onCreateEvent,integrationStatus]);

  const closeChatPanel = useCallback(() => {
    setChatPanelOpen(false);
  }, []);

  useEffect(()=>{ inputRef.current?.focus(); },[]);
  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[messages,working]);
  useEffect(()=>{ if(streamRef.current) streamRef.current.scrollTop=streamRef.current.scrollHeight; },[streaming]);

  useEffect(()=>{
    const onMove = e => {
      const nearRight = e.clientX > window.innerWidth - 48;
      if (nearRight) {
        clearTimeout(hoverTimerRef.current);
        clearTimeout(closeTimerRef.current);
        if (!chatPanelOpen) hoverTimerRef.current = setTimeout(()=> setChatPanelOpen(true), 150);
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); clearTimeout(hoverTimerRef.current); };
  }, [chatPanelOpen]);

  useEffect(()=>{
    const h=e=>onNavigate?.(e.detail);
    window.addEventListener('hp-navigate',h);
    return()=>window.removeEventListener('hp-navigate',h);
  },[onNavigate]);

  useEffect(()=>{
    if(!connectOpen) return;
    const h = e => { if(connectRef.current && !connectRef.current.contains(e.target)) setConnectOpen(false); };
    document.addEventListener('mousedown', h);
    return ()=>document.removeEventListener('mousedown', h);
  },[connectOpen]);

  useEffect(()=>{ saveChats(chats); },[chats]);

  const newChat = useCallback(() => {
    const id=uuidv4();
    setChats(prev=>[{id,title:'New chat',messages:[],createdAt:new Date().toISOString()},...prev]);
    setActiveChatId(id); closeChatPanel();
    setTimeout(()=>inputRef.current?.focus(),50);
  },[closeChatPanel]);

  const deleteChat = useCallback((id,e) => {
    e.stopPropagation();
    setChats(prev=>prev.filter(c=>c.id!==id));
    if(activeChatId===id) { setActiveChatId(null); setChatPanelOpen(false); setChatPanelClosing(false); }
  },[activeChatId]);

  const openChat = useCallback((chat) => {
    setActiveChatId(chat.id); closeChatPanel();
  },[closeChatPanel]);

  const processFiles = useCallback(async (files) => {
    const parsed = await Promise.all(Array.from(files).map(async file => {
      const id = uuidv4();
      const isImage = file.type.startsWith('image/');
      const isText  = /\.(txt|md|csv|json|js|ts|jsx|tsx|html|css|py|sh)$/i.test(file.name);
      const isPdf   = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      let url = null, base64 = null, textContent = null;
      if (isImage) {
        url = URL.createObjectURL(file);
        base64 = await new Promise(res => { const r=new FileReader(); r.onload=ev=>res(ev.target.result); r.readAsDataURL(file); });
      } else if (isPdf) {
        url = URL.createObjectURL(file);
        textContent = await extractPdfText(file);
      } else if (isText) {
        textContent = await file.text().catch(() => null);
      }
      return { id, name: file.name, type: file.type, size: file.size, url, base64, textContent, isPdf };
    }));
    setUploadedFiles(prev => [...prev, ...parsed]);
  }, []);

  const handleFileSelect = useCallback(async (e) => {
    const files = e.target.files;
    e.target.value = '';
    await processFiles(files);
  }, [processFiles]);

  const handleDragOver  = useCallback(e => { e.preventDefault(); setDragging(true);  }, []);
  const handleDragLeave = useCallback(e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }, []);
  const handleDrop      = useCallback(async e => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files?.length) await processFiles(files);
  }, [processFiles]);

  const removeFile = useCallback((id) => {
    setUploadedFiles(prev => {
      const f = prev.find(x => x.id === id);
      if (f?.url) URL.revokeObjectURL(f.url);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  const addMessage = useCallback((chatId,msg) => {
    setChats(prev=>prev.map(c=>{
      if(c.id!==chatId) return c;
      const msgs=[...c.messages,msg];
      return{...c,messages:msgs,title:msgs[0]?.text?.slice(0,40)||'New chat'};
    }));
  },[]);

  const updateLastAssistant = useCallback((chatId,text,steps) => {
    setChats(prev=>prev.map(c=>{
      if(c.id!==chatId) return c;
      const msgs=[...c.messages];
      const last=msgs[msgs.length-1];
      if(last?.role==='assistant') msgs[msgs.length-1]={...last,text,steps};
      return{...c,messages:msgs};
    }));
  },[]);

  const send = useCallback(async()=>{
    const text=input.trim();
    if(!text||working) return;
    setInput('');

    const files = uploadedFiles;
    setUploadedFiles([]);

    const fileNames = files.map(f=>f.name).join(', ');
    const displayText = files.length ? `${text}\n\n📎 ${fileNames}` : text;
    const fileContexts = files.filter(f=>f.textContent).map(f=>`[File: ${f.name}]\n${f.textContent.slice(0,2000)}`).join('\n\n');
    const webPrefix = webSearch ? '[Web search enabled — search the web for up-to-date information]\n\n' : '';
    const aiText = webPrefix + (fileContexts ? `${fileContexts}\n\nUser: ${text}` : text);
    const visionImages = files.filter(f=>f.base64).map(f=>f.base64);

    let chatId=activeChatId;
    if(!chatId) {
      chatId=uuidv4();
      setChats(prev=>[{id:chatId,title:displayText.slice(0,40),messages:[],createdAt:new Date().toISOString()},...prev]);
      setActiveChatId(chatId);
    }

    const userMsg={id:uuidv4(),role:'user',text:displayText,time:fmtTime()};
    addMessage(chatId,userMsg);

    setWorking(true);
    setStreaming('');
    setSavedSteps([]);
    setSources([]);
    setLiveEvents([]);
    setEditedDoc(null);
    // Always show workflow canvas on every send
    setLiveActivities([{ id:'__init__', type:'init', icon:'⚡', label:'Analyzing…', status:'active' }]);
    setStatus('Thinking...');

    addMessage(chatId,{id:uuidv4(),role:'assistant',text:'',steps:[],time:fmtTime()});

    let finalText='';
    const steps = await runAgent(
      aiText,
      [...messages,userMsg],
      (t)=>{
        setStreaming(t); finalText=t;
        setChats(prev=>prev.map(c=>{
          if(c.id!==chatId) return c;
          const msgs=[...c.messages];
          const last=msgs[msgs.length-1];
          if(last?.role==='assistant') msgs[msgs.length-1]={...last,text:t};
          return{...c,messages:msgs};
        }));
      },
      (s)=>setStatus(s),
      (step)=>setSavedSteps(prev=>[...prev,step]),
      actions,
      (source)=>setSources(prev=>[...prev,source]),
      visionImages.length ? visionImages : null,
      (doc)=>setEditedDoc(doc),
      (act)=>setLiveActivities(prev=>{
        const exists=prev.find(a=>a.id===act.id);
        if(exists) return prev.map(a=>a.id===act.id?{...a,...act}:a);
        return [...prev,act];
      }),
      Object.entries(integrationStatus).filter(([,s])=>s.connected).map(([id])=>id),
    );

    setWorking(false);
    setStatus('');
    setStreaming('');
    setSavedSteps([]);
    setLastResult(finalText);
    setLastSteps(steps);
    updateLastAssistant(chatId,finalText,steps);
  },[input,working,activeChatId,messages,addMessage,updateLastAssistant,actions,webSearch,uploadedFiles]);

  const handleKey = e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} };

  const hasRealActivity = liveActivities.some(a => a.type !== 'init');
  const hasActivity    = hasRealActivity || (liveActivities.length > 0 && working);
  const hasRichStream  = working && (sources.length > 0 || liveEvents.length > 0) && !hasActivity;
  const splitMode      = hasActivity || hasRichStream;
  const centerChatMode = !!activeChatId && messages.length > 0 && !splitMode;

  const clearActivity = () => {
    setLiveActivities([]); setLastResult(''); setLastSteps([]);
    setSources([]); setLiveEvents([]); setEditedDoc(null);
  };

  const planningCity = sources.find(s=>s.city)?.city || null;

  return (
    <div className={`hp${splitMode?' hp--split':''}`}>

      {/* ── Main area ── */}
      <div className={`hp__main${centerChatMode?' hp__main--chat':''}`}>

        {hasActivity ? (
          <WorkflowFeed
            activities={liveActivities} status={status} working={working}
            streaming={streaming}
            lastResult={lastResult} editedDoc={editedDoc}
            copiedDoc={copiedDoc} setCopiedDoc={setCopiedDoc}
            integrationStatus={integrationStatus}
            onSavePage={()=>{if(onCreatePage)onCreatePage(null,{title:editedDoc?.filename?.replace(/\.[^.]+$/,'')||'Document',content:editedDoc?.content||'',icon:'📝'});}}
            onSaveResult={()=>{if(onCreatePage)onCreatePage(null,{title:activeChat?.title||'AI Result',content:lastResult,icon:'📄'});}}
            onClose={clearActivity}
          />

        ) : hasRichStream ? (
          <div className="hp__planning">
            <div className="hp__planning-bar">
              <div className="hp__planning-spinner"/>
              <span className="hp__planning-status-text">{status||'Working...'}</span>
            </div>
            <div className="hp__planning-doc" ref={streamRef}>
              <div className="hp__planning-doc-inner">
                {renderDoc(streaming)}<span className="hp__cursor"/>
              </div>
            </div>
          </div>

        ) : centerChatMode ? (
          <div className="hp__center-chat">
            <div className="hp__center-msgs" ref={chatRef}>
              {messages.map((m, mi)=>(
                <div key={m.id} className={`hp__cmsg hp__cmsg--${m.role}`}>
                  {m.role==='user' && (
                    <div className="hp__cmsg-user-text" dir="auto">
                      {m.text||<span className="hp__cmsg-typing"><span/><span/><span/></span>}
                    </div>
                  )}
                  {m.role==='assistant' && (
                    <div className="hp__cmsg-ai" dir="auto">
                      {m.text ? renderDoc(m.text) : <span className="hp__cmsg-typing"><span/><span/><span/></span>}
                    </div>
                  )}
                  {m.role==='assistant' && m.text && mi===messages.length-1 && !working && sources.length>0 && (
                    <div className="hp__cmsg-sources">
                      <div className="hp__cmsg-sources-label">{SVG.search} Sources</div>
                      {sources.map((s,i)=>(
                        <a key={i} className="hp__cmsg-source-card" href={s.url||'#'} target="_blank" rel="noreferrer">
                          <div className="hp__cmsg-source-title">{s.title||s.query}</div>
                          <div className="hp__cmsg-source-text">{s.excerpt?.slice(0,120)}…</div>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {working&&status&&(
              <div className="hp__center-status">
                <div className="hp__center-status-dot"/>
                <span>{status}</span>
              </div>
            )}

            <div className="hp__center-footer">
              <div className={`hp__center-box${focused?' focused':''}`}>
                <input ref={inputRef} className="hp__input" dir="auto" placeholder="Reply..."
                  value={input} onChange={e=>setInput(e.target.value)}
                  onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
                  onKeyDown={handleKey} disabled={working}/>
                <button className={`hp__send${input.trim()?' hp__send--active':''}`} onClick={send} disabled={working||!input.trim()}>
                  {SendSVG}
                </button>
              </div>
            </div>
          </div>

        ) : (
          // ── Home screen ──
          <div className="hp__inner">
            <div className="hp__greeting-wrap">
              <div className="hp__greeting">create for lawyers</div>
              <div className="hp__sub">
                {pending>0&&<span>{pending} pending review{pending!==1?'s':''}</span>}
                <span>legal automation</span>
              </div>
            </div>

            <div
              className={`hp__harvey${dragging?' hp__harvey--drag':''}`}
              onDragOver={handleDragOver}
              onDragEnter={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {dragging && (
                <div className="hp__harvey-dropzone">
                  <span className="hp__harvey-drop-icon">📎</span>
                  <span>Drop files here</span>
                </div>
              )}
              {uploadedFiles.length > 0 && (
                <div className="hp__harvey-files">
                  {uploadedFiles.map(f=>(
                    <div key={f.id} className="hp__harvey-file">
                      {f.url && f.type?.startsWith('image/')
                        ? <img src={f.url} alt={f.name} className="hp__harvey-fthumb"/>
                        : <span className="hp__harvey-ficon">{f.isPdf?'📄':'📎'}</span>}
                      <span className="hp__harvey-fname">{f.name}</span>
                      <button className="hp__harvey-frm" onClick={()=>removeFile(f.id)}>{XSvg}</button>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                ref={inputRef}
                className="hp__harvey-input"
                placeholder="Draft a contract, research case law, run a compliance check…"
                dir="auto"
                value={input}
                onChange={e=>setInput(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();} }}
                rows={3}
                disabled={working}
              />

              <div className="hp__harvey-bar">
                <div className="hp__harvey-tools">
                  <button className="hp__harvey-tool" title="Attach file" onClick={()=>fileInputRef.current?.click()}>
                    {AttachSVG}
                    <span>Attach</span>
                  </button>
                  <input ref={fileInputRef} type="file" multiple accept="image/*,.pdf,.txt,.md,.csv,.json,.js,.ts,.jsx,.tsx,.html,.css,.py" style={{display:'none'}} onChange={handleFileSelect}/>

                  <button className={`hp__harvey-tool${toolsOpen?' hp__harvey-tool--active':''}`} title="Apps & Tools" onClick={()=>setToolsOpen(o=>!o)}>
                    {ConnectSVG}
                    <span>Apps</span>
                    {connectedCount > 0 && <span className="hp__harvey-tool-badge">{connectedCount}</span>}
                  </button>

                  <button className={`hp__harvey-tool${webSearch?' hp__harvey-tool--active':''}`} title="Web search" onClick={()=>setWebSearch(w=>!w)}>
                    {WebSVG}
                    <span>Web</span>
                  </button>
                </div>

                <button className={`hp__send${input.trim()||uploadedFiles.length?' hp__send--active':''}`}
                  onClick={send} disabled={working||(!input.trim()&&!uploadedFiles.length)}>
                  {working ? <span className="hp__act-spin" style={{width:13,height:13}}/> : SendSVG}
                </button>
              </div>
            </div>

            <div className="hp__chips">
              {CHIPS.map(c=>(
                <button key={c.view} className="hp__chip" onClick={()=>onNavigate?.(c.view)}>
                  {c.icon}{c.label}
                </button>
              ))}
            </div>

            <ConnectedAppsBar integrationStatus={integrationStatus} onClick={()=>setToolsOpen(true)}/>

            <p className="hp__input-hint">Enter to send · Shift+Enter for new line</p>
          </div>
        )}
      </div>

      {/* ── Split mode: side chat (full height) ── */}
      {splitMode&&(
        <div className="hp__side-chat">
          <div className="hp__side-chat-head">
            <span className="hp__side-chat-title">{activeChat?.title||'Chat'}</span>
          </div>

          <div className="hp__side-chat-msgs" ref={chatRef}>
            {/* Only show user prompts — AI response lives on the canvas */}
            {messages.filter(m=>m.role==='user').map((m)=>(
              <div key={m.id} className="hp__msg hp__msg--user">
                <div className="hp__msg-bubble">{m.text}</div>
              </div>
            ))}

            {/* Live status while working */}
            {working && (
              <div className="hp__side-status">
                <span className="hp__act-spin" style={{width:11,height:11}}/>
                <span>{status||'Working…'}</span>
              </div>
            )}

            {/* Done indicator once AI finishes */}
            {!working && messages.some(m=>m.role==='assistant'&&m.text) && (
              <div className="hp__side-done">
                <div className="hp__side-done-check">✓</div>
                <span>Done — see canvas</span>
              </div>
            )}

            {/* Sources in side chat */}
            {sources.length > 0 && (
              <div className="hp__side-sources">
                <div className="hp__side-sources-label">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="11" cy="11" r="7"/><line x1="20" y1="20" x2="15.5" y2="15.5"/></svg>
                  Sources
                </div>
                {sources.map((s,i)=>(
                  <a key={i} className="hp__side-source-card" href={s.url||'#'} target="_blank" rel="noreferrer">
                    <div className="hp__side-source-favicon">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                    </div>
                    <div className="hp__side-source-text">
                      <div className="hp__side-source-title">{s.title||s.query||'Source'}</div>
                      {s.url && <div className="hp__side-source-url">{new URL(s.url).hostname.replace('www.','')}</div>}
                    </div>
                    <span className="hp__side-source-arrow">↗</span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Always-visible input */}
          <div className="hp__side-chat-foot">
            {uploadedFiles.length > 0 && (
              <div className="hp__harvey-files" style={{padding:'8px 12px 0'}}>
                {uploadedFiles.map(f=>(
                  <div key={f.id} className="hp__harvey-file">
                    {f.url&&f.type?.startsWith('image/')
                      ? <img src={f.url} alt={f.name} className="hp__harvey-fthumb"/>
                      : <span className="hp__harvey-ficon">{f.isPdf?'📄':'📎'}</span>}
                    <span className="hp__harvey-fname">{f.name}</span>
                    <button className="hp__harvey-frm" onClick={()=>removeFile(f.id)}>{XSvg}</button>
                  </div>
                ))}
              </div>
            )}
            <div className="hp__side-chat-input-row">
              <button className="hp__side-attach" title="Attach" onClick={()=>fileInputRef.current?.click()}>
                {AttachSVG}
              </button>
              <input className="hp__side-input" dir="auto" placeholder="Reply…"
                value={input} onChange={e=>setInput(e.target.value)}
                onKeyDown={handleKey} disabled={working}/>
              <button className={`hp__side-send${input.trim()||uploadedFiles.length?' hp__side-send--active':''}`}
                onClick={send} disabled={working||(!input.trim()&&!uploadedFiles.length)}>
                {working?<span className="hp__act-spin" style={{width:13,height:13}}/>:SendSVG}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conversations panel (squeezes home page when open) ── */}
      {!splitMode&&(
        <div
          ref={chatPanelRef}
          className={`hp__convos-panel${chatPanelOpen?' hp__convos-panel--open':''}`}
          onMouseEnter={()=>clearTimeout(closeTimerRef.current)}
          onMouseLeave={()=>{ closeTimerRef.current = setTimeout(()=>setChatPanelOpen(false), 300); }}
        >
          <div className="hp__convos-panel-inner">
            <div className="hp__chat-head-convos">
              <span className="hp__chat-head-title">Chats</span>
              <button className="hp__chat-head-new" onClick={newChat}>{SVG.plus} New</button>
            </div>
            <div className="hp__convos">
              {chats.length===0&&<div className="hp__convos-empty">No chats yet</div>}
              {chats.map(c=>(
                <div key={c.id} className={`hp__convo${c.id===activeChatId?' active':''}`} onClick={()=>openChat(c)}>
                  <span className="hp__convo-icon">{SVG.chat}</span>
                  <span className="hp__convo-title">{c.title||'New chat'}</span>
                  <button className="hp__convo-del" onClick={e=>deleteChat(c.id,e)}>{XSvg}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Apps FAB ── */}
      <button
        className={`hp__apps-fab${toolsOpen?' hp__apps-fab--open':''}`}
        onClick={()=>setToolsOpen(o=>!o)}
        title="Apps & Tools"
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style={{opacity:.75}}>
          <rect x="1" y="1" width="6" height="6" rx="1.5"/>
          <rect x="9" y="1" width="6" height="6" rx="1.5"/>
          <rect x="1" y="9" width="6" height="6" rx="1.5"/>
          <rect x="9" y="9" width="6" height="6" rx="1.5"/>
        </svg>
        <span>Apps</span>
        {connectedCount > 0 && <span className="hp__apps-fab-badge">{connectedCount}</span>}
      </button>

      {/* ── Tools Drawer overlay ── */}
      {toolsOpen && (
        <ToolsDrawer
          integrationStatus={integrationStatus}
          onClose={()=>setToolsOpen(false)}
          onNavigate={v=>{setToolsOpen(false); onNavigate?.(v);}}
        />
      )}
    </div>
  );
}
