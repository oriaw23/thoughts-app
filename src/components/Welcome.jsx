import { useState, useEffect } from 'react';
import './Welcome.css';

const FEATURES = [
  { icon: '📝', title: 'דפים וכתיבה', desc: 'עורך בלוקים עשיר עם כותרות, רשימות, טבלאות ועוד' },
  { icon: '✅', title: 'ניהול משימות', desc: 'עקוב אחרי משימות עם עדיפויות ותאריכים' },
  { icon: '🎯', title: 'מנוע מטרות', desc: 'הגדר מטרות, פרק למיילסטונים ועקוב אחרי התקדמות' },
  { icon: '📅', title: 'לוח שנה', desc: 'תכנן לוח זמנים וויזואלייז אירועים' },
  { icon: '🎨', title: 'קנבס', desc: 'לוח ציור אינסופי לרעיונות ומפות מחשבה' },
  { icon: '✨', title: 'AI Chat', desc: 'עוזר אישי חכם לתכנון, כתיבה וכל שאלה' },
];

export default function Welcome({ onDone }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  const handleDone = () => {
    setVisible(false);
    setTimeout(onDone, 600);
  };

  return (
    <div className={`welcome ${visible ? 'welcome--in' : ''}`}>
      {/* Background */}
      <div className="welcome__bg" />
      <div className="welcome__glow welcome__glow--1" />
      <div className="welcome__glow welcome__glow--2" />
      <div className="welcome__glow welcome__glow--3" />

      {/* Stars */}
      {[...Array(20)].map((_, i) => (
        <div key={i} className="welcome__star" style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 70}%`,
          animationDelay: `${Math.random() * 3}s`,
          width: `${1 + Math.random() * 2}px`,
          height: `${1 + Math.random() * 2}px`,
        }} />
      ))}

      <div className="welcome__content">
        {step === 0 && (
          <div className="welcome__hero" key="hero">
            <div className="welcome__logo">T</div>
            <h1 className="welcome__title">ברוך הבא ל-Thoughts</h1>
            <p className="welcome__subtitle">
              סביבת העבודה האישית שלך — לכתיבה, תכנון וארגון של כל מה שחשוב.
            </p>
            <div className="welcome__features">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className="welcome__feature"
                  style={{ animationDelay: `${0.3 + i * 0.1}s` }}
                >
                  <span className="welcome__feature-icon">{f.icon}</span>
                  <div>
                    <p className="welcome__feature-title">{f.title}</p>
                    <p className="welcome__feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="welcome__btn" onClick={() => setStep(1)}>
              המשך
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/>
                <polyline points="12 5 19 12 12 19"/>
              </svg>
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="welcome__hero" key="step2">
            <div className="welcome__big-icon">🚀</div>
            <h2 className="welcome__title" style={{ fontSize: 'clamp(28px, 4vw, 48px)' }}>הכל מוכן!</h2>
            <p className="welcome__subtitle">
              כל הנתונים שלך נשמרים על המחשב שלך בלבד.<br/>
              אין צורך בחשבון. אין סנכרון ענן. הכל פרטי.
            </p>
            <div className="welcome__tips">
              <div className="welcome__tip">
                <span>💡</span>
                <span>לחץ על <strong>Home</strong> בסרגל הצד כדי להתחיל לכתוב</span>
              </div>
              <div className="welcome__tip">
                <span>🤖</span>
                <span>הטאב <strong>AI Chat</strong> בדפים מאפשר לדבר עם עוזר AI</span>
              </div>
              <div className="welcome__tip">
                <span>⚡</span>
                <span>לחץ <strong>Enter</strong> ואז <strong>Space</strong> בתוך דף כדי להוסיף בלוקים</span>
              </div>
            </div>
            <button className="welcome__btn welcome__btn--ready" onClick={handleDone}>
              ✨ בוא נתחיל
            </button>
          </div>
        )}
      </div>

      {/* Step dots */}
      <div className="welcome__dots">
        <div className={`welcome__dot ${step === 0 ? 'welcome__dot--active' : ''}`} />
        <div className={`welcome__dot ${step === 1 ? 'welcome__dot--active' : ''}`} />
      </div>
    </div>
  );
}
