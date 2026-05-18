import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './EmailPage.css';

const KEY = 'thoughts_email_v2';

// Gradient pool for avatars
const GRADIENTS = [
  ['#667eea','#764ba2'],['#f093fb','#f5576c'],['#4facfe','#00f2fe'],
  ['#43e97b','#38f9d7'],['#fa709a','#fee140'],['#a18cd1','#fbc2eb'],
  ['#fda085','#f6d365'],['#30cfd0','#330867'],['#a1c4fd','#c2e9fb'],
  ['#fd7043','#ff8a65'],
];
function avatarGrad(name) {
  const i = (name.charCodeAt(0) + (name.charCodeAt(1)||0)) % GRADIENTS.length;
  return `linear-gradient(135deg, ${GRADIENTS[i][0]}, ${GRADIENTS[i][1]})`;
}
function initials(name) {
  return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}

const NAV = [
  { id:'inbox',   label:'Inbox',   path:'M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 4l-8 5-8-5' },
  { id:'starred', label:'Starred', path:'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  { id:'sent',    label:'Sent',    path:'M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z' },
  { id:'drafts',  label:'Drafts',  path:'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z' },
  { id:'trash',   label:'Trash',   path:'M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2' },
];

const DEMO = [
  { id:uuidv4(), from:'Foldbase Team', fromEmail:'team@foldbase.app', subject:'Welcome to Foldbase ✨', preview:'We\'re so excited to have you here. Let\'s get you started with your workspace.', body:'Welcome to Foldbase!\n\nWe\'re thrilled to have you on board.\n\nHere\'s how to get started:\n→ Create your first page\n→ Set up your goals\n→ Explore AI agents\n→ Connect with your team\n\nHappy writing!\n— The Foldbase Team', date:'10:30 AM', folder:'inbox', read:false, starred:true,  tag:'updates' },
  { id:uuidv4(), from:'Sarah Cohen',    fromEmail:'sarah@example.com',  subject:'Q2 Project Update',             preview:'Everything is on track! Design phase complete, development at 60%.', body:'Hi,\n\nJust wanted to share the Q2 update — everything is looking great.\n\n→ Design phase: complete\n→ Development: 60%\n→ QA: starts next week\n\nLet me know if you have any questions!\n\nBest,\nSarah', date:'9:15 AM', folder:'inbox', read:false, starred:false, tag:'work' },
  { id:uuidv4(), from:'David Levy',     fromEmail:'david@company.co',   subject:'Meeting tomorrow at 2pm',       preview:'Just confirming our meeting. Please bring your notes from last week.', body:'Hi,\n\nConfirming our meeting tomorrow at 2:00 PM.\n\nAgenda:\n1. Product roadmap review\n2. Q3 planning\n3. Open discussion\n\nPlease bring your notes from last week.\n\nSee you then!\nDavid', date:'Yesterday', folder:'inbox', read:true,  starred:false, tag:'work' },
  { id:uuidv4(), from:'Weekly Digest',  fromEmail:'news@digest.com',    subject:'🔥 10 productivity tips',        preview:'This week\'s roundup of the best productivity techniques from top creators.', body:'Your weekly digest is here!\n\nTop productivity tips:\n\n1. Time-blocking your calendar\n2. The 2-minute rule\n3. Deep work sessions (90 min)\n4. Weekly reviews every Friday\n5. Single-tasking over multitasking\n\nRead more at our blog.', date:'Mon', folder:'inbox', read:true,  starred:false, tag:'newsletter' },
  { id:uuidv4(), from:'GitHub',         fromEmail:'noreply@github.com', subject:'Your PR was merged 🎉',          preview:'Pull request #142 "feat: add dark mode support" was successfully merged.', body:'Pull Request Merged!\n\nfeat: add dark mode support\n\n#142 merged into main\nBy: github-actions\n\nSummary: Added comprehensive dark mode support with CSS variables.\n\nView on GitHub →', date:'Sun', folder:'inbox', read:true,  starred:true,  tag:'dev' },
];

const TAG_COLORS = { work:'#6366f1', newsletter:'#f59e0b', updates:'#10b981', dev:'#3b82f6', personal:'#ec4899' };

function load() { try { const d=JSON.parse(localStorage.getItem(KEY)||'null'); return d||DEMO; } catch { return DEMO; } }
function save(e) { localStorage.setItem(KEY, JSON.stringify(e)); }

function groupByDate(emails) {
  const today=[], yesterday=[], week=[], older=[];
  const now = new Date();
  emails.forEach(e => {
    if (e.date.includes(':')) today.push(e);
    else if (e.date==='Yesterday') yesterday.push(e);
    else if (['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].includes(e.date)) week.push(e);
    else older.push(e);
  });
  const groups = [];
  if (today.length)     groups.push({ label:'Today',          items:today });
  if (yesterday.length) groups.push({ label:'Yesterday',      items:yesterday });
  if (week.length)      groups.push({ label:'This week',      items:week });
  if (older.length)     groups.push({ label:'Earlier',        items:older });
  return groups;
}

export default function EmailPage({ onBack }) {
  const [emails,  setEmails]  = useState(load);
  const [folder,  setFolder]  = useState('inbox');
  const [selId,   setSelId]   = useState(null);
  const [compose, setCompose] = useState(false);
  const [composeMin, setComposeMin] = useState(false);
  const [draft,   setDraft]   = useState({ to:'', subject:'', body:'' });
  const [search,  setSearch]  = useState('');
  const [nav,     setNav]     = useState(true); // nav labels visible

  const sel = emails.find(e => e.id===selId) || null;

  const mut = (id, ch) => { const n=emails.map(e=>e.id===id?{...e,...ch}:e); setEmails(n); save(n); };

  const open = (email) => { setSelId(email.id); setCompose(false); if(!email.read) mut(email.id,{read:true}); };

  const trash = (id) => {
    const em = emails.find(e=>e.id===id);
    if (em?.folder==='trash') { const n=emails.filter(e=>e.id!==id); setEmails(n); save(n); }
    else mut(id,{folder:'trash'});
    if(selId===id) setSelId(null);
  };

  const sendMail = () => {
    if (!draft.to.trim()||!draft.subject.trim()) return;
    const e = { id:uuidv4(), from:'Me', fromEmail:'me@foldbase.app', subject:draft.subject, preview:draft.body.slice(0,90), body:draft.body, date:'Just now', folder:'sent', read:true, starred:false, tag:'personal' };
    const n=[...emails,e]; setEmails(n); save(n);
    setDraft({to:'',subject:'',body:''}); setCompose(false);
  };

  const reply = () => {
    setDraft({ to:sel.fromEmail, subject:`Re: ${sel.subject}`, body:`\n\n\n——— Original ———\nFrom: ${sel.from}\n\n${sel.body}` });
    setCompose(true); setComposeMin(false);
  };

  const visible = emails.filter(e => {
    if (e.folder!==folder) return false;
    if (!search) return true;
    const q=search.toLowerCase();
    return e.subject.toLowerCase().includes(q)||e.from.toLowerCase().includes(q)||e.preview.toLowerCase().includes(q);
  });
  const groups = groupByDate(visible);
  const unread = (fid) => emails.filter(e=>e.folder===fid&&!e.read).length;

  return (
    <div className="em">
      {/* ── Navigation ── */}
      <nav className={`em__nav${nav?'':' em__nav--sm'}`}>
        {onBack && (
          <button className="em__nav-back" onClick={onBack} title="Back to workspace">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            {nav && <span>Back</span>}
          </button>
        )}
        <button className="em__nav-brand" onClick={()=>setNav(o=>!o)} title="Toggle nav">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
            <polyline points="22,6 12,13 2,6"/>
          </svg>
          {nav && <span>Mail</span>}
        </button>

        <div className="em__nav-items">
          {NAV.map(n => (
            <button key={n.id}
              className={`em__nav-item${folder===n.id?' active':''}`}
              onClick={()=>{setFolder(n.id);setSelId(null);setCompose(false);}}
              title={n.label}>
              <span className="em__nav-icon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={n.path}/>
                </svg>
              </span>
              {nav && <span className="em__nav-label">{n.label}</span>}
              {unread(n.id) > 0 && <span className="em__nav-badge">{unread(n.id)}</span>}
            </button>
          ))}
        </div>

        <button className="em__compose-fab" onClick={()=>{setCompose(true);setComposeMin(false);setSelId(null);}}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
          {nav && <span>Compose</span>}
        </button>
      </nav>

      {/* ── Email list ── */}
      <div className="em__list">
        <div className="em__list-top">
          <h2 className="em__list-title">{NAV.find(n=>n.id===folder)?.label}</h2>
          <div className="em__search">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)} dir="auto"/>
          </div>
        </div>

        <div className="em__items">
          {visible.length === 0 && (
            <div className="em__list-empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".25"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <p>{search ? 'No results' : 'All clear here'}</p>
            </div>
          )}
          {groups.map(g => (
            <div key={g.label} className="em__group">
              <div className="em__group-label">{g.label}</div>
              {g.items.map(e => (
                <div key={e.id}
                  className={`em__card${selId===e.id?' em__card--sel':''}${!e.read?' em__card--unread':''}`}
                  onClick={()=>open(e)}>
                  {!e.read && <div className="em__card-dot"/>}
                  <div className="em__card-av" style={{background:avatarGrad(e.from)}}>
                    {initials(e.from)}
                  </div>
                  <div className="em__card-body">
                    <div className="em__card-row1">
                      <span className="em__card-from">{e.from}</span>
                      <span className="em__card-time">{e.date}</span>
                    </div>
                    <p className="em__card-subject">{e.subject}</p>
                    <p className="em__card-preview">{e.preview}</p>
                    <div className="em__card-footer">
                      {e.tag && <span className="em__tag" style={{color: TAG_COLORS[e.tag]||'#888', background: (TAG_COLORS[e.tag]||'#888')+'18'}}>{e.tag}</span>}
                      {e.starred && <span className="em__card-star">★</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Detail pane ── */}
      <div className="em__detail">
        {sel && !compose ? (
          <div className="em__view">
            <div className="em__view-header">
              <h1 className="em__view-subject">{sel.subject}</h1>
              <div className="em__view-actions">
                <button className={`em__act${sel.starred?' em__act--star':''}`} onClick={()=>mut(sel.id,{starred:!sel.starred})} title="Star">
                  {sel.starred ? '★' : '☆'}
                </button>
                <button className="em__act em__act--reply" onClick={reply}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
                  Reply
                </button>
                <button className="em__act em__act--del" onClick={()=>trash(sel.id)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  {sel.folder==='trash'?'Delete forever':'Delete'}
                </button>
              </div>
            </div>

            <div className="em__view-sender">
              <div className="em__view-av" style={{background:avatarGrad(sel.from)}}>{initials(sel.from)}</div>
              <div className="em__view-sender-info">
                <span className="em__view-name">{sel.from}</span>
                <span className="em__view-email">{sel.fromEmail}</span>
              </div>
              <span className="em__view-date">{sel.date}</span>
            </div>

            <div className="em__view-body">
              {sel.body.split('\n').map((line,i) => (
                <p key={i} className={line.startsWith('→') || line.startsWith('—') ? 'em__body-highlight' : ''}>{line||' '}</p>
              ))}
            </div>

            <button className="em__quick-reply" onClick={reply}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/></svg>
              Reply to {sel.from}
            </button>
          </div>
        ) : !compose ? (
          <div className="em__empty">
            <div className="em__empty-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
            </div>
            <h3>Your inbox, cleared</h3>
            <p>Select an email to read, or compose a new one</p>
            <button className="em__empty-cta" onClick={()=>setCompose(true)}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Compose
            </button>
          </div>
        ) : null}
      </div>

      {/* ── Floating compose window ── */}
      {compose && (
        <div className={`em__compose${composeMin?' em__compose--min':''}`}>
          <div className="em__compose-bar">
            <span className="em__compose-title">
              {draft.subject || 'New message'}
            </span>
            <div className="em__compose-bar-actions">
              <button onClick={()=>setComposeMin(o=>!o)} title={composeMin?'Expand':'Minimize'}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  {composeMin ? <polyline points="18 15 12 9 6 15"/> : <polyline points="6 9 12 15 18 9"/>}
                </svg>
              </button>
              <button onClick={()=>{setCompose(false);setDraft({to:'',subject:'',body:''}); }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          </div>
          {!composeMin && (
            <>
              <div className="em__compose-fields">
                <div className="em__compose-field">
                  <label>To</label>
                  <input autoFocus dir="auto" placeholder="recipient@example.com" value={draft.to}
                    onChange={e=>setDraft(d=>({...d,to:e.target.value}))}/>
                </div>
                <div className="em__compose-field">
                  <label>Subject</label>
                  <input dir="auto" placeholder="Subject…" value={draft.subject}
                    onChange={e=>setDraft(d=>({...d,subject:e.target.value}))}/>
                </div>
              </div>
              <textarea className="em__compose-body" dir="auto"
                placeholder="Write your message…"
                value={draft.body}
                onChange={e=>setDraft(d=>({...d,body:e.target.value}))}/>
              <div className="em__compose-foot">
                <button className="em__send" onClick={sendMail} disabled={!draft.to||!draft.subject}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                  Send
                </button>
                <button className="em__discard" onClick={()=>{setCompose(false);setDraft({to:'',subject:'',body:''});}}>Discard</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
