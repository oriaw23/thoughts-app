import './Help.css';

const SHORTCUTS = [
  { key:'Ctrl + N', desc:'דף חדש' }, { key:'Ctrl + K', desc:'חיפוש מהיר' },
  { key:'Del', desc:'מחק בקאנבס' }, { key:'Ctrl + A', desc:'בחר הכל בקאנבס' },
  { key:'Ctrl + Z', desc:'ביטול' }, { key:'Tab', desc:'הזחה בדפים' },
  { key:'Enter', desc:'בלוק חדש בדפים' }, { key:'Esc', desc:'סגור / ביטול' },
];

const FEATURES = [
  { icon:'📝', title:'דפים', desc:'כתיבת מסמכים עם עורך בלוקים מלא — כותרות, רשימות, טבלאות, קוד וגלריה.' },
  { icon:'✅', title:'Tasks', desc:'לוח Kanban לניהול משימות עם גרירה בין עמודות, עדיפויות וקטגוריות.' },
  { icon:'🗂️', title:'פרויקטים', desc:'ניהול פרויקטים עם משימות, מטרות, לוז קבוע ודפים מקושרים.' },
  { icon:'🎨', title:'Canvas', desc:'לוח ציור דיגיטלי עם צורות, חיבורים וגרירת כרטיסים מהפאנל.' },
  { icon:'📅', title:'Calendar', desc:'יומן שבועי/חודשי עם גרירת אירועים ותזמון משימות.' },
  { icon:'🎯', title:'Goals', desc:'הגדרת מטרות עם אבני דרך ומעקב התקדמות.' },
  { icon:'📊', title:'Progress', desc:'גרפים, streaks וסטטיסטיקות ביצועים.' },
  { icon:'🛒', title:'Marketplace', desc:'קנה ומכור קורסים, תבניות, טיפים וכלים.' },
  { icon:'📚', title:'ספריה', desc:'תבניות מוכנות לשימוש ו-bookmarks לדפים.' },
  { icon:'💬', title:'AI Chat', desc:'שיחה עם Groq AI (Llama 3.3 70B) לשאלות וניתוח.' },
];

const TIPS = [
  '💡 גרור כרטיסים מפאנל "📌 כרטיסים" ישירות לקאנבס',
  '🔗 קשר כל משימה, אירוע ודף לפרויקט דרך כפתור "קשר לפרויקט"',
  '📌 לחץ Ctrl+Z בקאנבס לביטול פעולה',
  '⚡ גרור משימות מפאנל המשימות בלוח השנה לתזמן אותן',
  '🎨 לחץ על נקודה כתומה בצלע של בלוק קאנבס ליצירת חיבור',
  '📋 כל כרטיס ביומן תומך בגרירה לשינוי שעה',
  '🔮 בדפים, הקלד # + רווח לכותרת אוטומטית, - + רווח לרשימה',
];

export default function Help() {
  return (
    <div className="help">
      <div className="help__head">
        <h1 className="help__title">❓ עזרה ותיעוד</h1>
        <p className="help__sub">כל מה שצריך לדעת על MyNotion</p>
      </div>

      {/* Tips */}
      <section className="help__section">
        <h2 className="help__section-title">⚡ טיפים מהירים</h2>
        <div className="help__tips">
          {TIPS.map((tip, i) => (
            <div key={i} className="help__tip">{tip}</div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="help__section">
        <h2 className="help__section-title">🧭 תכונות</h2>
        <div className="help__features">
          {FEATURES.map(f => (
            <div key={f.title} className="help__feature">
              <div className="help__feature-icon">{f.icon}</div>
              <div>
                <h3 className="help__feature-title">{f.title}</h3>
                <p className="help__feature-desc">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Shortcuts */}
      <section className="help__section">
        <h2 className="help__section-title">⌨️ קיצורי מקלדת</h2>
        <div className="help__shortcuts">
          {SHORTCUTS.map(s => (
            <div key={s.key} className="help__shortcut">
              <kbd className="help__kbd">{s.key}</kbd>
              <span className="help__shortcut-desc">{s.desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="help__section">
        <h2 className="help__section-title">📬 יצירת קשר</h2>
        <div className="help__contact">
          <p>נתקלת בבעיה? יש לך הצעה? <strong>אנחנו כאן לעזור.</strong></p>
          <div style={{ display:'flex', gap:10, marginTop:12 }}>
            <button className="help__contact-btn">📧 שלח פידבק</button>
            <button className="help__contact-btn help__contact-btn--sec">🐛 דווח על באג</button>
          </div>
        </div>
      </section>
    </div>
  );
}
