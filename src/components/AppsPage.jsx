import { useState, useEffect, useCallback } from 'react';
import './AppsPage.css';

const INSTALLED_KEY = 'foldbase_installed_apps_v1';
const loadInstalled = () => { try { return JSON.parse(localStorage.getItem(INSTALLED_KEY)||'[]'); } catch { return []; }};
const saveInstalled = a => localStorage.setItem(INSTALLED_KEY, JSON.stringify(a));

// ── App catalog ───────────────────────────────────────────────────────────────
const APPS = [
  // Google
  { id:'gdrive',    name:'Google Drive',    cat:'Storage',       desc:'Cloud storage and file sharing',        color:'#4285F4', bg:'#E8F0FE', url:'https://drive.google.com',              embed:true,  domain:'drive.google.com'    },
  { id:'gdocs',     name:'Google Docs',     cat:'Productivity',  desc:'Create and edit documents online',      color:'#4285F4', bg:'#E8F0FE', url:'https://docs.google.com',               embed:true,  domain:'docs.google.com'     },
  { id:'gsheets',   name:'Google Sheets',   cat:'Productivity',  desc:'Spreadsheets and data analysis',        color:'#0F9D58', bg:'#E6F4EA', url:'https://sheets.google.com',             embed:true,  domain:'sheets.google.com'   },
  { id:'gcal',      name:'Google Calendar', cat:'Productivity',  desc:'Schedule and manage your time',         color:'#4285F4', bg:'#E8F0FE', url:'https://calendar.google.com/calendar/r',embed:true,  domain:'calendar.google.com' },
  { id:'gmail',     name:'Gmail',           cat:'Communication', desc:'Email by Google',                       color:'#EA4335', bg:'#FCE8E6', url:'https://mail.google.com',               embed:true,  domain:'gmail.com'           },
  { id:'gmeet',     name:'Google Meet',     cat:'Communication', desc:'Video calls and meetings',              color:'#00AC47', bg:'#E6F4EA', url:'https://meet.google.com',               embed:false, domain:'meet.google.com'     },
  { id:'gslides',   name:'Google Slides',   cat:'Productivity',  desc:'Presentations and slide decks',         color:'#F4B400', bg:'#FEF7E0', url:'https://slides.google.com',             embed:true,  domain:'slides.google.com'   },
  // Microsoft
  { id:'word',      name:'Word Online',     cat:'Productivity',  desc:'Microsoft Word in your browser',        color:'#185ABD', bg:'#E9F2FF', url:'https://www.office.com/launch/word',    embed:false, domain:'microsoft.com'       },
  { id:'excel',     name:'Excel Online',    cat:'Productivity',  desc:'Spreadsheets by Microsoft',             color:'#217346', bg:'#E6F4EA', url:'https://www.office.com/launch/excel',   embed:false, domain:'office.com'          },
  { id:'outlook',   name:'Outlook',         cat:'Communication', desc:'Email and calendar by Microsoft',       color:'#0078D4', bg:'#E5F2FC', url:'https://outlook.live.com',              embed:false, domain:'outlook.com'         },
  { id:'teams',     name:'Microsoft Teams', cat:'Communication', desc:'Chat, meetings, and collaboration',     color:'#464EB8', bg:'#ECEEFE', url:'https://teams.microsoft.com',            embed:false, domain:'teams.microsoft.com' },
  // Dev tools
  { id:'vscode',    name:'VS Code Web',     cat:'Development',   desc:'Full code editor in the browser',      color:'#007ACC', bg:'#E5F3FC', url:'https://vscode.dev',                    embed:true,  domain:'code.visualstudio.com'},
  { id:'github',    name:'GitHub',          cat:'Development',   desc:'Code hosting and collaboration',        color:'#24292F', bg:'#F0F0F0', url:'https://github.com',                    embed:true,  domain:'github.com'          },
  { id:'figma',     name:'Figma',           cat:'Design',        desc:'Design and prototyping tool',           color:'#F24E1E', bg:'#FEEDE9', url:'https://figma.com',                     embed:false, domain:'figma.com'           },
  { id:'linear',    name:'Linear',          cat:'Development',   desc:'Project management for software teams', color:'#5E6AD2', bg:'#EEEFFE', url:'https://linear.app',                    embed:false, domain:'linear.app'          },
  { id:'vercel',    name:'Vercel',          cat:'Development',   desc:'Deploy and host web projects',          color:'#000000', bg:'#F0F0F0', url:'https://vercel.com',                    embed:false, domain:'vercel.com'          },
  { id:'supabase',  name:'Supabase',        cat:'Development',   desc:'Open source Firebase alternative',      color:'#3ECF8E', bg:'#E7FAF3', url:'https://supabase.com/dashboard',       embed:false, domain:'supabase.com'        },
  // Communication
  { id:'slack',     name:'Slack',           cat:'Communication', desc:'Team messaging and collaboration',      color:'#4A154B', bg:'#F4EAF5', url:'https://app.slack.com',                 embed:false, domain:'slack.com'           },
  { id:'discord',   name:'Discord',         cat:'Communication', desc:'Voice, video, and text chat',           color:'#5865F2', bg:'#ECEFFE', url:'https://discord.com/app',               embed:false, domain:'discord.com'         },
  { id:'whatsapp',  name:'WhatsApp Web',    cat:'Communication', desc:'Messaging on WhatsApp',                 color:'#25D366', bg:'#E8FAEE', url:'https://web.whatsapp.com',              embed:false, domain:'whatsapp.com'        },
  { id:'telegram',  name:'Telegram Web',    cat:'Communication', desc:'Fast and secure messaging',             color:'#2AABEE', bg:'#E8F6FE', url:'https://web.telegram.org',              embed:false, domain:'telegram.org'        },
  // AI
  { id:'chatgpt',   name:'ChatGPT',         cat:'AI',            desc:'AI assistant by OpenAI',                color:'#10A37F', bg:'#E6F7F4', url:'https://chat.openai.com',               embed:false, domain:'openai.com'          },
  { id:'claude',    name:'Claude',          cat:'AI',            desc:'AI assistant by Anthropic',             color:'#CC785C', bg:'#FAF0ED', url:'https://claude.ai',                     embed:false, domain:'anthropic.com'       },
  { id:'perplexity',name:'Perplexity',      cat:'AI',            desc:'AI-powered search engine',              color:'#20808D', bg:'#E6F5F6', url:'https://perplexity.ai',                 embed:false, domain:'perplexity.ai'       },
  { id:'midjourney',name:'Midjourney',      cat:'AI',            desc:'AI image generation',                   color:'#000000', bg:'#F0F0F0', url:'https://midjourney.com',                embed:false, domain:'midjourney.com'      },
  // Storage
  { id:'dropbox',   name:'Dropbox',         cat:'Storage',       desc:'Cloud storage and collaboration',       color:'#0061FF', bg:'#E5F0FF', url:'https://dropbox.com',                   embed:false, domain:'dropbox.com'         },
  { id:'notion',    name:'Notion',          cat:'Productivity',  desc:'Notes, docs, and wikis',                color:'#000000', bg:'#F0F0F0', url:'https://notion.so',                     embed:false, domain:'notion.so'           },
  { id:'airtable',  name:'Airtable',        cat:'Productivity',  desc:'Spreadsheet meets database',            color:'#FCB400', bg:'#FEF7E0', url:'https://airtable.com',                  embed:false, domain:'airtable.com'        },
  // Media
  { id:'youtube',   name:'YouTube',         cat:'Media',         desc:'Watch and share videos',                color:'#FF0000', bg:'#FFE8E8', url:'https://youtube.com',                   embed:true,  domain:'youtube.com'         },
  { id:'spotify',   name:'Spotify',         cat:'Media',         desc:'Music streaming service',               color:'#1DB954', bg:'#E7F9EE', url:'https://open.spotify.com',              embed:false, domain:'spotify.com'         },
  { id:'loom',      name:'Loom',            cat:'Media',         desc:'Record and share screen videos',        color:'#625DF5', bg:'#EEEFFE', url:'https://loom.com',                      embed:false, domain:'loom.com'            },
  // Utilities
  { id:'maps',      name:'Google Maps',     cat:'Utilities',     desc:'Maps, navigation, and places',          color:'#4285F4', bg:'#E8F0FE', url:'https://maps.google.com',               embed:true,  domain:'maps.google.com'     },
  { id:'translate', name:'Google Translate',cat:'Utilities',     desc:'Translate text and documents',          color:'#4285F4', bg:'#E8F0FE', url:'https://translate.google.com',          embed:true,  domain:'translate.google.com'},
  { id:'canva',     name:'Canva',           cat:'Design',        desc:'Graphic design made easy',              color:'#7D2AE8', bg:'#F2E8FE', url:'https://canva.com',                     embed:false, domain:'canva.com'           },
  { id:'miro',      name:'Miro',            cat:'Design',        desc:'Online whiteboard for teams',           color:'#FFD02F', bg:'#FFFAE8', url:'https://miro.com/app',                  embed:false, domain:'miro.com'            },
];

const CATEGORIES = ['All', ...new Set(APPS.map(a => a.cat))];

// ── App icon — tries Clearbit logo, falls back to Google favicon, then initials ──
function AppIcon({ app, size = 48 }) {
  const [imgSrc, setImgSrc] = useState(`https://logo.clearbit.com/${app.domain}`);
  const [failed, setFailed] = useState(false);

  const handleError = useCallback(() => {
    if (imgSrc.includes('clearbit')) {
      // Fallback 1: Google favicon (higher quality)
      setImgSrc(`https://www.google.com/s2/favicons?domain=${app.domain}&sz=128`);
    } else {
      // Fallback 2: show initials
      setFailed(true);
    }
  }, [imgSrc, app.domain]);

  const imgSize = size * 0.62;

  return (
    <div className="ap-app-icon" style={{ width: size, height: size, background: app.bg }}>
      {!failed ? (
        <img
          src={imgSrc}
          alt={app.name}
          width={imgSize}
          height={imgSize}
          onError={handleError}
          style={{ objectFit:'contain', borderRadius: imgSrc.includes('favicon') ? 4 : 0 }}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span style={{ color: app.color, fontSize: size < 40 ? 10 : 12, fontWeight: 800, letterSpacing:'-.5px' }}>
          {app.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}
        </span>
      )}
    </div>
  );
}

// ── Embedded app viewer ───────────────────────────────────────────────────────
function AppEmbed({ app, onClose }) {
  return (
    <div className="ap-embed-overlay">
      <div className="ap-embed-bar">
        <AppIcon app={app} size={28}/>
        <span className="ap-embed-name">{app.name}</span>
        <a href={app.url} target="_blank" rel="noreferrer" className="ap-embed-external">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Open in new tab
        </a>
        <button className="ap-embed-close" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <iframe
        src={app.url}
        title={app.name}
        className="ap-embed-frame"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation"
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AppsPage() {
  const [installed, setInstalled] = useState(loadInstalled);
  const [category, setCategory]   = useState('All');
  const [search, setSearch]       = useState('');
  const [openApp, setOpenApp]     = useState(null);

  useEffect(() => { saveInstalled(installed); }, [installed]);

  const isInstalled = id => installed.includes(id);

  const toggle = (id) => {
    setInstalled(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const open = (app) => {
    if (app.embed) {
      setOpenApp(app);
    } else {
      window.open(app.url, '_blank');
    }
  };

  const filtered = APPS.filter(a => {
    const matchCat = category === 'All' || a.cat === category;
    const matchSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.desc.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const installedApps = APPS.filter(a => isInstalled(a.id));

  return (
    <div className="ap">
      {/* Header */}
      <div className="ap__header">
        <div className="ap__header-top">
          <div>
            <h1 className="ap__title">Apps</h1>
            <p className="ap__subtitle">Connect your favorite tools to Foldbase</p>
          </div>
          <div className="ap__search-wrap">
            <svg className="ap__search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              className="ap__search"
              placeholder="Search apps…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category tabs */}
        <div className="ap__cats">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`ap__cat${category === cat ? ' active' : ''}`}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="ap__body">
        {/* Installed section */}
        {installedApps.length > 0 && category === 'All' && !search && (
          <section className="ap__section">
            <h2 className="ap__section-title">Installed</h2>
            <div className="ap__installed-row">
              {installedApps.map(app => (
                <button key={app.id} className="ap__installed-chip" onClick={() => open(app)}>
                  <AppIcon app={app} size={32}/>
                  <span>{app.name}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* All apps grid */}
        <section className="ap__section">
          {!search && category === 'All' && <h2 className="ap__section-title">All Apps</h2>}
          {filtered.length === 0 && (
            <div className="ap__empty">
              <p>No apps found for "{search}"</p>
            </div>
          )}
          <div className="ap__grid">
            {filtered.map(app => (
              <div key={app.id} className={`ap__card${isInstalled(app.id) ? ' ap__card--installed' : ''}`}>
                <div className="ap__card-top">
                  <AppIcon app={app} size={52}/>
                  <button
                    className={`ap__card-btn${isInstalled(app.id) ? ' ap__card-btn--installed' : ''}`}
                    onClick={() => toggle(app.id)}
                  >
                    {isInstalled(app.id) ? 'Remove' : 'Add'}
                  </button>
                </div>
                <div className="ap__card-name">{app.name}</div>
                <div className="ap__card-cat">{app.cat}</div>
                <div className="ap__card-desc">{app.desc}</div>
                {isInstalled(app.id) && (
                  <button className="ap__card-open" onClick={() => open(app)}>
                    Open {app.embed ? 'in Foldbase' : '↗'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Embedded app */}
      {openApp && (
        <AppEmbed app={openApp} onClose={() => setOpenApp(null)}/>
      )}
    </div>
  );
}
