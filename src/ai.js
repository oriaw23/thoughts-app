// ── Category definitions ──────────────────────────────────────────────────────
export const CATEGORIES = {
  workout:  { keywords: ['ריצה','כושר','אימון','gym','run','exercise','הליכה','שחייה','sport','ספורט','להתאמן','פוש אפ','מתח','כפיפות','יוגה','pilates'], icon: '🏃', label: 'כושר',    color: '#10b981', bg: '#d1fae5' },
  study:    { keywords: ['ללמוד','קורס','ספר','book','study','למידה','אוניברסיטה','מבחן','שיעור','לקרוא','read','הרצאה','course','sql','python','math'], icon: '📚', label: 'לימודים', color: '#3b82f6', bg: '#dbeafe' },
  startup:  { keywords: ['סטארטאפ','פרויקט','code','feature','bug','deploy','לקוח','שיווק','product','dev','לפתח','לבנות','לוגין','api','backend','frontend','pr','repo','git','mvp','פיצ\'ר','לשחרר'], icon: '🚀', label: 'סטארטאפ', color: '#6366f1', bg: '#eef2ff' },
  personal: { keywords: ['להתקשר','משפחה','חברים','family','friend','לבקר','אמא','אבא','אח','personal','אישי','תאריך','date','זוגיות','לטייל'], icon: '❤️', label: 'אישי',    color: '#ec4899', bg: '#fce7f3' },
  health:   { keywords: ['לישון','שינה','לאכול','מזון','בריאות','רופא','תרופה','health','sleep','diet','מים','vitamins','מדיטציה','meditation'], icon: '🧘', label: 'בריאות',  color: '#f59e0b', bg: '#fef3c7' },
};

// ── Keyword categorize (no API needed) ───────────────────────────────────────
export function categorizeText(text) {
  const lower = text.toLowerCase();
  let bestCat = 'personal';
  let bestScore = 0;
  for (const [cat, def] of Object.entries(CATEGORIES)) {
    const score = def.keywords.filter(k => lower.includes(k.toLowerCase())).length;
    if (score > bestScore) { bestScore = score; bestCat = cat; }
  }
  return bestCat;
}

function splitIntoThoughts(text) {
  return text
    .split(/[,،\n;]+/)
    .map(t => t.trim())
    .filter(t => t.length > 2);
}

// ── Claude API call ───────────────────────────────────────────────────────────
async function callClaude(apiKey, systemPrompt, userMessage) {
  const res = await fetch('/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  const data = await res.json();
  return data.content[0].text;
}

// ── Brain Dump: split & categorize ───────────────────────────────────────────
export async function organizeBrainDump(rawText, apiKey) {
  if (apiKey) {
    try {
      const reply = await callClaude(
        apiKey,
        `אתה עוזר אישי חכם. המשתמש ישפוך מחשבות בעברית/אנגלית. תפצל אותן לפריטים נפרדים וסווג כל פריט לאחת הקטגוריות: workout, study, startup, personal, health. החזר JSON בלבד (ללא markdown) בפורמט: [{"text":"...","category":"..."}]`,
        rawText
      );
      const cleaned = reply.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.map(item => ({
        text: item.text,
        category: item.category in CATEGORIES ? item.category : categorizeText(item.text),
      }));
    } catch (e) {
      console.warn('AI fallback:', e.message);
    }
  }
  // Fallback: split by punctuation and keyword-match
  return splitIntoThoughts(rawText).map(text => ({
    text,
    category: categorizeText(text),
  }));
}

// ── Goals: break into milestones + daily task ─────────────────────────────────
const GOAL_TEMPLATES = {
  workout: (title) => ({
    milestones: ['להגיע ל-10 דקות', 'להגיע ל-20 דקות', 'להגיע ליעד המלא'],
    dailyTask: `אימון יומי – ${title}`,
    weeklyTasks: ['3 אימונים בשבוע הראשון', '4 אימונים בשבוע השני', '5 אימונים בשבוע השלישי'],
  }),
  study: (title) => ({
    milestones: ['להתחיל את החומר', 'לגמור 50% מהחומר', 'לסיים ולחזור'],
    dailyTask: `ללמוד שעה – ${title}`,
    weeklyTasks: ['להקדיש 5 שעות ללימוד', 'לסכם מה שלמדת', 'לעשות תרגול'],
  }),
  startup: (title) => ({
    milestones: ['להגדיר MVP', 'לבנות prototype', 'לדבר עם 5 לקוחות', 'לשחרר גרסה ראשונה'],
    dailyTask: `לעבוד על ${title}`,
    weeklyTasks: ['שעתיים קוד ביום', 'שיחה עם משתמש פוטנציאלי', 'שחרור גרסה קטנה'],
  }),
  personal: (title) => ({
    milestones: ['להגדיר מה רוצים', 'לקחת צעד ראשון', 'להגיע ליעד'],
    dailyTask: `לעבוד על ${title}`,
    weeklyTasks: ['להקדיש זמן', 'לבדוק התקדמות', 'לחגוג הצלחות קטנות'],
  }),
  health: (title) => ({
    milestones: ['שבוע ראשון: להתחיל', 'חודש ראשון: להרגיש הבדל', 'להפוך להרגל'],
    dailyTask: title,
    weeklyTasks: ['לעקוב כל יום', 'לבדוק תוצאות', 'לשמור על עקביות'],
  }),
};

export async function breakdownGoal(title, category, timeframe, apiKey) {
  if (apiKey) {
    try {
      const reply = await callClaude(
        apiKey,
        `אתה מאמן אישי חכם. המשתמש יגדיר מטרה. תפרק אותה למיילסטונים, משימה יומית, ומשימות שבועיות. החזר JSON בלבד: {"milestones":["..."],"dailyTask":"...","weeklyTasks":["..."]}`,
        `מטרה: "${title}"\nקטגוריה: ${category}\nמסגרת זמן: ${timeframe}`
      );
      const cleaned = reply.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('AI fallback:', e.message);
    }
  }
  const tmpl = GOAL_TEMPLATES[category] || GOAL_TEMPLATES.personal;
  return tmpl(title);
}

// ── Daily plan suggestions ────────────────────────────────────────────────────
export async function suggestDayPlan(pendingTasks, goals, apiKey) {
  if (apiKey && pendingTasks.length > 0) {
    try {
      const taskList = pendingTasks.slice(0, 10).map(t => `- ${t.title} (${t.priority})`).join('\n');
      const reply = await callClaude(
        apiKey,
        `אתה מאמן פרודוקטיביות. תבחר 3 משימות עדיפות להיום (בוקר, צהריים, ערב) מהרשימה. החזר JSON: {"morning":"...","afternoon":"...","evening":"...","tip":"..."}`,
        `משימות ממתינות:\n${taskList}`
      );
      const cleaned = reply.replace(/```json|```/g, '').trim();
      return JSON.parse(cleaned);
    } catch (e) {
      console.warn('AI fallback:', e.message);
    }
  }
  // Fallback: pick by priority
  const byPriority = [...pendingTasks].sort((a,b) => {
    const p = {high:0,medium:1,low:2};
    return (p[a.priority]||1) - (p[b.priority]||1);
  });
  return {
    morning: byPriority[0]?.title || 'תכנן את הבוקר',
    afternoon: byPriority[1]?.title || 'עבודה עמוקה',
    evening: byPriority[2]?.title || 'סיכום יום',
    tip: 'התמקד ב-3 משימות הכי חשובות ותעשה אותן לפני הצהריים.',
  };
}

export function getApiKey() {
  return localStorage.getItem('claude_api_key') || '';
}

export function setApiKey(key) {
  localStorage.setItem('claude_api_key', key);
}
