import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './Marketplace.css';

const KEY = 'mynotion_marketplace';

const CATEGORIES = [
  { id:'all',       label:'All',          icon:'✦' },
  { id:'courses',   label:'Courses',      icon:'🎓' },
  { id:'templates', label:'Templates',    icon:'📋' },
  { id:'tips',      label:'Tips & Tricks',icon:'💡' },
  { id:'tools',     label:'Tools',        icon:'🛠️' },
  { id:'leads',     label:'Leads',        icon:'🎯' },
];

const FEATURED = [
  { id:'f1', title:'Project Management System', type:'templates', price:49,  rating:4.8, reviews:124, sales:890,  author:'Studio Pro',      badge:'Best Seller', desc:'A complete project management template with Kanban, goals, timeline and reporting dashboards.' },
  { id:'f2', title:'AI Business Toolkit',       type:'tools',     price:89,  rating:4.9, reviews:87,  sales:1240, author:'AI Works',        badge:'Top Rated',   desc:'Automate your workflow with 15 AI-powered tools. Includes prompts, templates and processes.' },
  { id:'f3', title:'Sales Lead Database 2026',  type:'leads',     price:299, rating:4.7, reviews:45,  sales:213,  author:'BizConnect',      badge:'New',         desc:'200 verified tech companies actively looking for services. Updated weekly.' },
];

const PRODUCTS = [
  { id:'p1',  title:'Advanced Notion Course',    type:'courses',   price:199, rating:4.9, reviews:201, author:'Digital Academy',   desc:'10 lessons to master knowledge management and productivity workflows.' },
  { id:'p2',  title:'50 Productivity Hacks',     type:'tips',      price:19,  rating:4.6, reviews:310, author:'Pro Tips',          desc:'A concise guide with 50 actionable tips to boost your daily efficiency.' },
  { id:'p3',  title:'Habit Tracker Template',    type:'templates', price:29,  rating:4.7, reviews:456, author:'Habit Lab',         desc:'Daily, weekly and monthly habit tracking with streaks and analytics.' },
  { id:'p4',  title:'Marketing Leads Pack',      type:'leads',     price:149, rating:4.5, reviews:67,  author:'LeadGen Pro',       desc:'100 decision-maker contacts in the SaaS space, verified emails included.' },
  { id:'p5',  title:'Productivity OS',           type:'templates', price:79,  rating:4.8, reviews:189, author:'Creator Labs',      desc:'All-in-one operating system for your work and personal life.' },
  { id:'p6',  title:'Design Thinking Workshop',  type:'courses',   price:149, rating:4.7, reviews:93,  author:'UX Academy',        desc:'6-week crash course in design thinking with real-world case studies.' },
  { id:'p7',  title:'Chrome Extension Bundle',   type:'tools',     price:39,  rating:4.4, reviews:134, author:'DevTools',          desc:'5 productivity Chrome extensions to streamline your browser workflow.' },
  { id:'p8',  title:'Growth Hacking Tips',       type:'tips',      price:29,  rating:4.6, reviews:278, author:'Growth Club',       desc:'40 battle-tested growth tactics for startups and solopreneurs.' },
];

function load() { try { return JSON.parse(localStorage.getItem(KEY)||'[]'); } catch { return []; } }
function persist(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

function Stars({ rating }) {
  return (
    <div className="mkt__stars">
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="12" height="12" viewBox="0 0 24 24"
          fill={i <= Math.round(rating) ? '#f59e0b' : 'none'}
          stroke="#f59e0b" strokeWidth="2">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      ))}
      <span>{rating}</span>
    </div>
  );
}

export default function Marketplace() {
  const [listings, setListings]       = useState(load);
  const [cat, setCat]                 = useState('all');
  const [search, setSearch]           = useState('');
  const [showCreate, setShowCreate]   = useState(false);
  const [form, setForm]               = useState({ title:'', type:'templates', price:'', desc:'' });
  const [sortBy, setSortBy]           = useState('popular');

  const allItems = [...FEATURED, ...PRODUCTS, ...listings];
  const filtered = allItems.filter(it =>
    (cat === 'all' || it.type === cat) &&
    (!search || it.title.toLowerCase().includes(search.toLowerCase()) || it.desc.toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'popular') return (b.reviews||0) - (a.reviews||0);
    if (sortBy === 'newest')  return (b.id||'').localeCompare(a.id||'');
    if (sortBy === 'price-lo') return (a.price||0) - (b.price||0);
    if (sortBy === 'price-hi') return (b.price||0) - (a.price||0);
    return 0;
  });

  const publish = () => {
    if (!form.title.trim() || !form.price) return;
    const item = { id: uuidv4(), ...form, price: +form.price, rating: 5, reviews: 0, sales: 0, author: 'Me', isOwn: true };
    const next = [...listings, item]; setListings(next); persist(next);
    setForm({ title:'', type:'templates', price:'', desc:'' }); setShowCreate(false);
  };

  const totalSales = allItems.reduce((s,i) => s + (i.sales||i.reviews||0), 0);

  return (
    <div className="mkt">
      {/* ── Hero ── */}
      <div className="mkt__hero">
        <div className="mkt__hero-badge">✦ Community Marketplace</div>
        <h1 className="mkt__hero-title">Discover & Sell<br/>Knowledge Products</h1>
        <p className="mkt__hero-sub">Browse courses, templates, tips and tools from creators worldwide</p>
        <div className="mkt__hero-search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            placeholder="Search products, courses, templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && <button className="mkt__hero-search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="mkt__hero-stats">
          <div className="mkt__hero-stat"><b>{allItems.length}</b> Products</div>
          <div className="mkt__hero-stat-sep" />
          <div className="mkt__hero-stat"><b>{totalSales.toLocaleString()}</b> Sales</div>
          <div className="mkt__hero-stat-sep" />
          <div className="mkt__hero-stat"><b>12</b> Creators</div>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="mkt__cats-wrap">
        <div className="mkt__cats">
          {CATEGORIES.map(c => (
            <button key={c.id} className={`mkt__cat${cat===c.id?' active':''}`}
              onClick={() => setCat(c.id)}>
              <span>{c.icon}</span> {c.label}
            </button>
          ))}
        </div>
        <div className="mkt__sort">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="mkt__sort-select">
            <option value="popular">Most Popular</option>
            <option value="newest">Newest</option>
            <option value="price-lo">Price: Low to High</option>
            <option value="price-hi">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* ── Featured row (only when "all" + no search) ── */}
      {cat === 'all' && !search && (
        <div className="mkt__section">
          <div className="mkt__section-head">
            <h2 className="mkt__section-title">⭐ Featured</h2>
          </div>
          <div className="mkt__featured-row">
            {FEATURED.map(item => (
              <div key={item.id} className="mkt__featured-card">
                <div className="mkt__featured-top">
                  {item.badge && <span className="mkt__badge">{item.badge}</span>}
                  <span className="mkt__type-tag">{CATEGORIES.find(c=>c.id===item.type)?.label || item.type}</span>
                </div>
                <h3 className="mkt__featured-title">{item.title}</h3>
                <p className="mkt__featured-desc">{item.desc}</p>
                <div className="mkt__featured-meta">
                  <Stars rating={item.rating} />
                  <span className="mkt__meta-reviews">({item.reviews} reviews)</span>
                </div>
                <div className="mkt__featured-foot">
                  <div>
                    <span className="mkt__price">${item.price}</span>
                    <span className="mkt__sales">{item.sales}+ sales</span>
                  </div>
                  <button className="mkt__buy">Get Now →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All products ── */}
      <div className="mkt__section">
        <div className="mkt__section-head">
          <h2 className="mkt__section-title">
            {cat === 'all' ? 'All Products' : CATEGORIES.find(c=>c.id===cat)?.label}
            <span className="mkt__count">{filtered.length}</span>
          </h2>
          <button className="mkt__sell-btn" onClick={() => setShowCreate(true)}>
            + Sell Your Product
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="mkt__empty">
            <span>🔍</span>
            <p>No products found</p>
            <small>Try a different search or category</small>
          </div>
        ) : (
          <div className="mkt__grid">
            {filtered.map(item => (
              <div key={item.id} className="mkt__card">
                <div className="mkt__card-header">
                  <span className="mkt__card-type">{CATEGORIES.find(c=>c.id===item.type)?.icon} {CATEGORIES.find(c=>c.id===item.type)?.label || item.type}</span>
                  {item.badge && <span className="mkt__card-badge">{item.badge}</span>}
                </div>
                <h3 className="mkt__card-title">{item.title}</h3>
                <p className="mkt__card-desc">{item.desc}</p>
                <div className="mkt__card-meta">
                  {item.rating && <Stars rating={item.rating} />}
                  <span className="mkt__card-author">by {item.author}</span>
                </div>
                <div className="mkt__card-foot">
                  <span className="mkt__price">${item.price}</span>
                  <button className="mkt__card-buy">Get →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create listing modal ── */}
      {showCreate && (
        <div className="mkt__overlay" onClick={() => setShowCreate(false)}>
          <div className="mkt__modal" onClick={e => e.stopPropagation()}>
            <div className="mkt__modal-head">
              <h3>List a Product</h3>
              <button onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="mkt__modal-body">
              <label>Product Name</label>
              <input className="mkt__input" autoFocus value={form.title}
                onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Ultimate Notion Template" />
              <label>Category</label>
              <select className="mkt__select" value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                {CATEGORIES.slice(1).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
              <label>Price (USD)</label>
              <input type="number" className="mkt__input" value={form.price}
                onChange={e => setForm(f=>({...f,price:e.target.value}))} placeholder="e.g. 49" />
              <label>Description</label>
              <textarea className="mkt__textarea" rows={3} value={form.desc}
                onChange={e => setForm(f=>({...f,desc:e.target.value}))} placeholder="Describe what you're selling..." />
            </div>
            <div className="mkt__modal-foot">
              <button className="mkt__cancel" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="mkt__publish" onClick={publish}>Publish Listing</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
