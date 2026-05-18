import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Library.css';

const STORAGE_KEY = 'mynotion_books_v1';
const COVER_COLORS = [
  '#6366f1','#0ea5e9','#10b981','#f59e0b','#ef4444',
  '#8b5cf6','#ec4899','#0891b2','#84cc16','#f97316',
];
const GENRES = ['רומן','מדע בדיוני','עיון','ביוגרפיה','פסיכולוגיה','עסקים','היסטוריה','מתח','פנטזיה','אחר'];

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function save(b) { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); }

const STATUS_LABEL = { reading: 'קורא כעת', want: 'רוצה לקרוא', done: 'סיימתי' };
const STATUS_COLOR = { reading: '#0ea5e9', want: '#f59e0b', done: '#10b981' };

function Stars({ value, onChange }) {
  return (
    <div className="bk__stars">
      {[1,2,3,4,5].map(n => (
        <button key={n} className={`bk__star${value >= n ? ' filled' : ''}`} onClick={() => onChange(n)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={value >= n ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function BookCover({ title, color, size = 48 }) {
  return (
    <div className="bk__cover" style={{ background: color, width: size, height: size * 1.4, fontSize: size * 0.38 }}>
      {(title || '?')[0].toUpperCase()}
    </div>
  );
}

export default function Library() {
  const [books, setBooks]       = useState(load);
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter]     = useState('all');
  const [search, setSearch]     = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');

  const selected = books.find(b => b.id === selectedId) || null;

  const update = (id, changes) => {
    const next = books.map(b => b.id === id ? { ...b, ...changes } : b);
    setBooks(next); save(next);
  };

  const addBook = () => {
    if (!newTitle.trim()) return;
    const b = {
      id: uuidv4(),
      title: newTitle.trim(),
      author: newAuthor.trim(),
      genre: '',
      status: 'want',
      pages: 0,
      currentPage: 0,
      rating: 0,
      color: COVER_COLORS[books.length % COVER_COLORS.length],
      notes: '',
      quotes: [],
      addedAt: new Date().toISOString(),
      finishedAt: null,
    };
    const next = [b, ...books];
    setBooks(next); save(next);
    setSelectedId(b.id);
    setNewTitle(''); setNewAuthor(''); setShowAdd(false);
  };

  const deleteBook = (id) => {
    const next = books.filter(b => b.id !== id);
    setBooks(next); save(next);
    if (selectedId === id) setSelectedId(next[0]?.id || null);
  };

  const addQuote = (id, text) => {
    const book = books.find(b => b.id === id);
    if (!book || !text.trim()) return;
    update(id, { quotes: [...(book.quotes || []), { id: uuidv4(), text: text.trim() }] });
  };

  const removeQuote = (bookId, qid) => {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    update(bookId, { quotes: book.quotes.filter(q => q.id !== qid) });
  };

  const filtered = books.filter(b => {
    const matchFilter = filter === 'all' || b.status === filter;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const counts = {
    all:     books.length,
    reading: books.filter(b => b.status === 'reading').length,
    want:    books.filter(b => b.status === 'want').length,
    done:    books.filter(b => b.status === 'done').length,
  };

  return (
    <div className="bk">
      {/* ── Left panel ── */}
      <div className="bk__list">
        <div className="bk__list-head">
          <h2 className="bk__list-title">הספרייה שלי</h2>
          <button className="bk__list-add-btn" onClick={() => setShowAdd(true)} title="הוסף ספר">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {/* Stats row */}
        <div className="bk__stats">
          <div className="bk__stat"><span className="bk__stat-n">{counts.reading}</span><span>קורא</span></div>
          <div className="bk__stat-sep" />
          <div className="bk__stat"><span className="bk__stat-n">{counts.done}</span><span>סיים</span></div>
          <div className="bk__stat-sep" />
          <div className="bk__stat"><span className="bk__stat-n">{counts.want}</span><span>ברשימה</span></div>
        </div>

        {/* Search */}
        <div className="bk__search">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input placeholder="חפש ספר..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Filter tabs */}
        <div className="bk__filters">
          {[['all','הכל'],['reading','קורא'],['want','רשימה'],['done','סיים']].map(([id, label]) => (
            <button key={id} className={`bk__filter${filter === id ? ' active' : ''}`} onClick={() => setFilter(id)}>
              {label}
              {counts[id] > 0 && <span className="bk__filter-count">{counts[id]}</span>}
            </button>
          ))}
        </div>

        {/* Add form */}
        {showAdd && (
          <div className="bk__add-form">
            <input
              className="bk__add-input"
              placeholder="שם הספר *"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && addBook()}
            />
            <input
              className="bk__add-input"
              placeholder="מחבר"
              value={newAuthor}
              onChange={e => setNewAuthor(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addBook()}
            />
            <div className="bk__add-actions">
              <button className="bk__add-cancel" onClick={() => { setShowAdd(false); setNewTitle(''); setNewAuthor(''); }}>ביטול</button>
              <button className="bk__add-save" onClick={addBook} disabled={!newTitle.trim()}>הוסף</button>
            </div>
          </div>
        )}

        {/* Book list */}
        <div className="bk__items">
          {filtered.length === 0 && (
            <div className="bk__list-empty">
              <p>{search ? `אין תוצאות לחיפוש "${search}"` : 'אין ספרים ברשימה'}</p>
              {!search && <button onClick={() => setShowAdd(true)}>+ הוסף ספר ראשון</button>}
            </div>
          )}
          {filtered.map(book => {
            const progress = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;
            return (
              <div
                key={book.id}
                className={`bk__item${selectedId === book.id ? ' active' : ''}`}
                onClick={() => setSelectedId(book.id)}
              >
                <BookCover title={book.title} color={book.color} size={38} />
                <div className="bk__item-info">
                  <p className="bk__item-title">{book.title}</p>
                  <p className="bk__item-author">{book.author || 'לא ידוע'}</p>
                  {book.status === 'reading' && book.pages > 0 && (
                    <div className="bk__item-progress">
                      <div className="bk__item-bar" style={{ width: `${progress}%`, background: book.color }} />
                    </div>
                  )}
                  <span className="bk__item-status" style={{ color: STATUS_COLOR[book.status] }}>
                    {STATUS_LABEL[book.status]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="bk__detail">
        {selected ? (
          <BookDetail
            book={selected}
            onChange={ch => update(selected.id, ch)}
            onDelete={() => deleteBook(selected.id)}
            onAddQuote={(text) => addQuote(selected.id, text)}
            onRemoveQuote={(qid) => removeQuote(selected.id, qid)}
          />
        ) : (
          <div className="bk__empty">
            <div className="bk__empty-icon">
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
            </div>
            <h3>בחר ספר</h3>
            <p>או הוסף ספר חדש לספרייה שלך</p>
            <button onClick={() => setShowAdd(true)}>+ הוסף ספר</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Book detail ───────────────────────────────────────────────────────────────
function BookDetail({ book, onChange, onDelete, onAddQuote, onRemoveQuote }) {
  const [newQuote, setNewQuote] = useState('');

  const progress = book.pages > 0 ? Math.round((book.currentPage / book.pages) * 100) : 0;

  const handleAddQuote = () => {
    if (!newQuote.trim()) return;
    onAddQuote(newQuote.trim());
    setNewQuote('');
  };

  return (
    <div className="bk__d">
      {/* Cover + title header */}
      <div className="bk__d-header" style={{ borderBottomColor: book.color + '30' }}>
        <div className="bk__d-cover-wrap">
          <div className="bk__d-cover" style={{ background: book.color }}>
            {(book.title || '?')[0].toUpperCase()}
          </div>
          {/* Color picker */}
          <div className="bk__d-colors">
            {COVER_COLORS.map(c => (
              <button key={c} className={`bk__d-color${book.color === c ? ' active' : ''}`}
                style={{ background: c }} onClick={() => onChange({ color: c })} />
            ))}
          </div>
        </div>

        <div className="bk__d-meta">
          <input
            className="bk__d-title"
            value={book.title}
            onChange={e => onChange({ title: e.target.value })}
            placeholder="שם הספר..."
          />
          <input
            className="bk__d-author"
            value={book.author}
            onChange={e => onChange({ author: e.target.value })}
            placeholder="מחבר..."
          />

          {/* Status */}
          <div className="bk__d-status-row">
            {Object.entries(STATUS_LABEL).map(([id, label]) => (
              <button
                key={id}
                className={`bk__d-status-btn${book.status === id ? ' active' : ''}`}
                style={book.status === id ? { background: STATUS_COLOR[id] + '20', color: STATUS_COLOR[id], borderColor: STATUS_COLOR[id] + '60' } : {}}
                onClick={() => onChange({ status: id, finishedAt: id === 'done' ? new Date().toISOString() : null })}
              >{label}</button>
            ))}
          </div>

          {/* Genre */}
          <select
            className="bk__d-genre"
            value={book.genre}
            onChange={e => onChange({ genre: e.target.value })}
          >
            <option value="">ז׳אנר...</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>

          {/* Rating */}
          <Stars value={book.rating} onChange={r => onChange({ rating: r })} />
        </div>
      </div>

      <div className="bk__d-body">
        {/* Progress */}
        {(book.status === 'reading' || book.status === 'done') && (
          <section className="bk__d-section">
            <h4 className="bk__d-section-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              התקדמות
            </h4>
            <div className="bk__progress-row">
              <span className="bk__progress-label">עמוד</span>
              <input
                type="number" min={0} max={book.pages || 9999}
                className="bk__progress-input"
                value={book.currentPage || ''}
                placeholder="0"
                onChange={e => onChange({ currentPage: parseInt(e.target.value) || 0 })}
              />
              <span className="bk__progress-label">מתוך</span>
              <input
                type="number" min={0}
                className="bk__progress-input"
                value={book.pages || ''}
                placeholder="סה״כ"
                onChange={e => onChange({ pages: parseInt(e.target.value) || 0 })}
              />
              <span className="bk__progress-pct" style={{ color: book.color }}>{progress}%</span>
            </div>
            {book.pages > 0 && (
              <div className="bk__progress-bar-bg">
                <div className="bk__progress-bar-fill" style={{ width: `${progress}%`, background: book.color }} />
              </div>
            )}
          </section>
        )}

        {/* Notes */}
        <section className="bk__d-section">
          <h4 className="bk__d-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            הרשמות ומחשבות
          </h4>
          <textarea
            className="bk__d-notes"
            placeholder="מה חשבת על הספר? תובנות, רעיונות, תגובות..."
            value={book.notes}
            onChange={e => onChange({ notes: e.target.value })}
            rows={5}
          />
        </section>

        {/* Quotes */}
        <section className="bk__d-section">
          <h4 className="bk__d-section-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>
            ציטוטים אהובים
          </h4>
          <div className="bk__quotes">
            {(book.quotes || []).map(q => (
              <div key={q.id} className="bk__quote" style={{ borderColor: book.color + '40' }}>
                <p className="bk__quote-text">"{q.text}"</p>
                <button className="bk__quote-del" onClick={() => onRemoveQuote(q.id)}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            ))}
            <div className="bk__quote-add">
              <textarea
                className="bk__quote-input"
                placeholder="הוסף ציטוט..."
                value={newQuote}
                onChange={e => setNewQuote(e.target.value)}
                rows={2}
              />
              <button className="bk__quote-save" style={{ background: book.color }} onClick={handleAddQuote} disabled={!newQuote.trim()}>
                הוסף
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="bk__d-footer">
          <span className="bk__d-date">נוסף: {new Date(book.addedAt).toLocaleDateString('he-IL')}</span>
          {book.finishedAt && <span className="bk__d-date">הסתיים: {new Date(book.finishedAt).toLocaleDateString('he-IL')}</span>}
          <button className="bk__d-delete" onClick={onDelete}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
            מחק ספר
          </button>
        </div>
      </div>
    </div>
  );
}
