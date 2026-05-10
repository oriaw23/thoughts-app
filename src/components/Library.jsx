import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Library.css';

const LIB_KEY = 'mynotion_library';
const TMPL_KEY = 'mynotion_templates';

const BUILT_IN_TEMPLATES = [
  { id:'t1', name:'Weekly Review', icon:'📅', desc:'תבנית לסקירה שבועית עם מטרות, הישגים ולקחים', cat:'productivity' },
  { id:'t2', name:'Meeting Notes', icon:'📝', desc:'מסמך מובנה לסיכום פגישות עם נושאים ומשימות', cat:'work' },
  { id:'t3', name:'Project Brief', icon:'🚀', desc:'מסמך פתיחת פרויקט עם מטרות, ציר זמן ומשאבים', cat:'work' },
  { id:'t4', name:'Reading List', icon:'📚', desc:'רשימת קריאה עם ציונים, סיכומים ולקחים', cat:'personal' },
  { id:'t5', name:'Goal Tracker', icon:'🎯', desc:'מעקב מטרות שנתיות עם אבני דרך ומדדי הצלחה', cat:'productivity' },
  { id:'t6', name:'Daily Journal', icon:'✍️', desc:'יומן יומי עם גרפול חשיבה, תודות ותכניות', cat:'personal' },
  { id:'t7', name:'Budget Planner', icon:'💰', desc:'מעקב תקציב חודשי עם הכנסות והוצאות', cat:'finance' },
  { id:'t8', name:'Habit Tracker', icon:'✅', desc:'מעקב הרגלים יומי עם streak וסטטיסטיקות', cat:'health' },
];

const CATS = [
  { id:'all', label:'הכל' }, { id:'productivity', label:'פרודוקטיביות' },
  { id:'work', label:'עבודה' }, { id:'personal', label:'אישי' },
  { id:'finance', label:'כספים' }, { id:'health', label:'בריאות' },
];

function loadSaved() { try { return JSON.parse(localStorage.getItem(LIB_KEY)||'[]'); } catch { return []; } }
function saveSaved(d) { localStorage.setItem(LIB_KEY, JSON.stringify(d)); }

export default function Library({ pages = [] }) {
  const [tab, setTab]     = useState('templates');
  const [cat, setCat]     = useState('all');
  const [saved, setSaved] = useState(loadSaved);
  const [search, setSearch] = useState('');

  const removeBookmark = (id) => {
    const next = saved.filter(s => s.id !== id);
    setSaved(next); saveSaved(next);
  };

  const bookmarkPage = (page) => {
    if (saved.find(s => s.pageId === page.id)) return;
    const item = { id: uuidv4(), pageId: page.id, title: page.title, icon: page.icon, savedAt: new Date().toISOString() };
    const next = [item, ...saved];
    setSaved(next); saveSaved(next);
  };

  const templates = BUILT_IN_TEMPLATES.filter(t =>
    (cat === 'all' || t.cat === cat) &&
    (!search || t.name.includes(search) || t.desc.includes(search))
  );

  return (
    <div className="lib">
      <div className="lib__head">
        <div>
          <h1 className="lib__title">📚 ספריה</h1>
          <p className="lib__sub">תבניות מוכנות, דפים שמורים ומשאבים</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="lib__tabs">
        {[['templates','תבניות'],['bookmarks','דפים שמורים'],['pages','כל הדפים']].map(([id,label]) => (
          <button key={id} className={`lib__tab${tab===id?' active':''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* Templates */}
      {tab === 'templates' && (
        <>
          <div className="lib__filters">
            <div className="lib__search">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input placeholder="חפש תבנית..." value={search} onChange={e=>setSearch(e.target.value)} />
            </div>
            <div className="lib__cats">
              {CATS.map(c => (
                <button key={c.id} className={`lib__cat${cat===c.id?' active':''}`} onClick={() => setCat(c.id)}>{c.label}</button>
              ))}
            </div>
          </div>
          <div className="lib__grid">
            {templates.map(t => (
              <div key={t.id} className="lib__card">
                <div className="lib__card-icon">{t.icon}</div>
                <h3 className="lib__card-name">{t.name}</h3>
                <p className="lib__card-desc">{t.desc}</p>
                <button className="lib__use-btn">השתמש בתבנית</button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Saved pages */}
      {tab === 'bookmarks' && (
        <div className="lib__list">
          {saved.length === 0 && <div className="lib__empty"><span>🔖</span><p>אין דפים שמורים</p></div>}
          {saved.map(s => (
            <div key={s.id} className="lib__saved-item">
              <span className="lib__saved-icon">{s.icon}</span>
              <span className="lib__saved-title">{s.title || 'דף ללא שם'}</span>
              <span className="lib__saved-date">{s.savedAt?.slice(0,10)}</span>
              <button className="lib__saved-del" onClick={() => removeBookmark(s.id)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* All pages */}
      {tab === 'pages' && (
        <div className="lib__list">
          {pages.length === 0 && <div className="lib__empty"><span>📄</span><p>אין דפים</p></div>}
          {pages.map(page => (
            <div key={page.id} className="lib__saved-item">
              <span className="lib__saved-icon">{page.icon}</span>
              <span className="lib__saved-title">{page.title || 'דף ללא שם'}</span>
              <span className="lib__saved-date">{page.updatedAt?.slice(0,10)}</span>
              <button className="lib__bookmark-btn" onClick={() => bookmarkPage(page)}
                title={saved.find(s=>s.pageId===page.id) ? 'שמור' : 'הוסף לשמורים'}>
                {saved.find(s=>s.pageId===page.id) ? '🔖' : '☆'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
