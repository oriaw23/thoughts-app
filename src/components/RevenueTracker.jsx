import { useState, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './RevenueTracker.css';

const KEY = 'foldbase_revenue_v1';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{"deals":[],"income":[]}'); } catch { return { deals:[], income:[] }; } };
const save = d => localStorage.setItem(KEY, JSON.stringify(d));

const DEAL_STATUS = [
  { id: 'pitched',   label: 'Pitched',    color: '#6366f1' },
  { id: 'negotiating',label:'Negotiating',color: '#eab308' },
  { id: 'confirmed', label: 'Confirmed',  color: '#3b82f6' },
  { id: 'delivered', label: 'Delivered',  color: '#f97316' },
  { id: 'paid',      label: 'Paid ✓',     color: '#22c55e' },
  { id: 'cancelled', label: 'Cancelled',  color: '#ef4444' },
];
const INCOME_CATS = ['Brand Deal','Ad Revenue','Affiliate','Course/Digital','Merch','Consulting','Speaking','Other'];
const PLATFORMS   = ['YouTube','Instagram','TikTok','Podcast','Newsletter','Blog','Twitter/X','LinkedIn','General'];

const fmt = n => '$' + Number(n||0).toLocaleString('en-US', { minimumFractionDigits: 0 });
const stColor = id => DEAL_STATUS.find(s=>s.id===id)?.color || '#6b7280';
const stLabel = id => DEAL_STATUS.find(s=>s.id===id)?.label || id;

export default function RevenueTracker() {
  const [data,      setData]      = useState(load);
  const [tab,       setTab]       = useState('overview'); // overview | deals | income
  const [showDeal,  setShowDeal]  = useState(false);
  const [showInc,   setShowInc]   = useState(false);
  const [editDeal,  setEditDeal]  = useState(null);
  const [editInc,   setEditInc]   = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [month,     setMonth]     = useState(() => new Date().toISOString().slice(0,7));

  const upd = next => { setData(next); save(next); };

  // ── DEALS ──
  const saveDeal = draft => {
    const deals = editDeal
      ? data.deals.map(d => d.id===editDeal.id ? {...d,...draft} : d)
      : [...data.deals, { ...draft, id: uuidv4(), createdAt: new Date().toISOString() }];
    upd({ ...data, deals });
    setShowDeal(false); setEditDeal(null);
  };
  const deleteDeal = id => upd({ ...data, deals: data.deals.filter(d=>d.id!==id) });
  const updateDealStatus = (id, status) => upd({ ...data, deals: data.deals.map(d=>d.id===id?{...d,status}:d) });

  // ── INCOME ──
  const saveIncome = draft => {
    const income = editInc
      ? data.income.map(i => i.id===editInc.id ? {...i,...draft} : i)
      : [...data.income, { ...draft, id: uuidv4(), date: draft.date || new Date().toISOString().slice(0,10) }];
    upd({ ...data, income });
    setShowInc(false); setEditInc(null);
  };
  const deleteIncome = id => upd({ ...data, income: data.income.filter(i=>i.id!==id) });

  // ── STATS ──
  const stats = useMemo(() => {
    const paidDeals   = data.deals.filter(d=>d.status==='paid');
    const totalDeals  = paidDeals.reduce((s,d)=>s+Number(d.amount||0),0);
    const pipeline    = data.deals.filter(d=>!['paid','cancelled'].includes(d.status)).reduce((s,d)=>s+Number(d.amount||0),0);
    const monthInc    = data.income.filter(i=>i.date?.startsWith(month)).reduce((s,i)=>s+Number(i.amount||0),0);
    const totalInc    = data.income.reduce((s,i)=>s+Number(i.amount||0),0);
    const byCategory  = INCOME_CATS.map(c => ({
      cat: c,
      total: data.income.filter(i=>i.category===c).reduce((s,i)=>s+Number(i.amount||0),0)
    })).filter(x=>x.total>0).sort((a,b)=>b.total-a.total);
    const activeDeals = data.deals.filter(d=>!['paid','cancelled'].includes(d.status)).length;
    return { totalDeals, pipeline, monthInc, totalInc, byCategory, activeDeals };
  }, [data, month]);

  const visibleDeals = data.deals.filter(d => filterStatus==='all' || d.status===filterStatus);

  return (
    <div className="rev">

      {/* ── Topbar ── */}
      <div className="rev__top">
        <div className="rev__top-left">
          <h1 className="rev__title">
            <span className="rev__title-icon">💰</span>
            Revenue & Deals
          </h1>
        </div>
        <div className="rev__top-right">
          <div className="rev__tabs">
            {[['overview','Overview'],['deals','Brand Deals'],['income','Income Log']].map(([id,l])=>(
              <button key={id} className={`rev__tab${tab===id?' active':''}`} onClick={()=>setTab(id)}>{l}</button>
            ))}
          </div>
          <button className="rev__add-btn" onClick={()=> tab==='income' ? setShowInc(true) : setShowDeal(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            {tab==='income' ? 'Log Income' : 'Add Deal'}
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="rev__body">

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="rev__overview">

            {/* Big stats */}
            <div className="rev__stats-row">
              <div className="rev__stat-card rev__stat-card--green">
                <p className="rev__stat-label">Total Earned</p>
                <p className="rev__stat-val">{fmt(stats.totalInc + stats.totalDeals)}</p>
                <p className="rev__stat-sub">all time</p>
              </div>
              <div className="rev__stat-card rev__stat-card--blue">
                <p className="rev__stat-label">Pipeline</p>
                <p className="rev__stat-val">{fmt(stats.pipeline)}</p>
                <p className="rev__stat-sub">{stats.activeDeals} active deals</p>
              </div>
              <div className="rev__stat-card rev__stat-card--yellow">
                <p className="rev__stat-label">This Month</p>
                <div className="rev__stat-month-row">
                  <input className="rev__month-pick" type="month" value={month} onChange={e=>setMonth(e.target.value)} />
                </div>
                <p className="rev__stat-val">{fmt(stats.monthInc)}</p>
              </div>
              <div className="rev__stat-card rev__stat-card--red">
                <p className="rev__stat-label">Brand Deals Paid</p>
                <p className="rev__stat-val">{fmt(stats.totalDeals)}</p>
                <p className="rev__stat-sub">{data.deals.filter(d=>d.status==='paid').length} completed</p>
              </div>
            </div>

            {/* By category */}
            {stats.byCategory.length > 0 && (
              <div className="rev__section">
                <h3 className="rev__section-title">Income by Source</h3>
                <div className="rev__cats">
                  {stats.byCategory.map(({cat,total}) => {
                    const max = stats.byCategory[0].total;
                    return (
                      <div key={cat} className="rev__cat-row">
                        <span className="rev__cat-name">{cat}</span>
                        <div className="rev__cat-bar-wrap">
                          <div className="rev__cat-bar" style={{width:`${(total/max)*100}%`}}/>
                        </div>
                        <span className="rev__cat-val">{fmt(total)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent deals */}
            {data.deals.length > 0 && (
              <div className="rev__section">
                <h3 className="rev__section-title">Recent Deals</h3>
                <div className="rev__deal-list">
                  {data.deals.slice(-5).reverse().map(d => (
                    <DealRow key={d.id} deal={d} onEdit={()=>{setEditDeal(d);setShowDeal(true);}} onStatus={s=>updateDealStatus(d.id,s)} />
                  ))}
                </div>
              </div>
            )}

            {data.deals.length === 0 && data.income.length === 0 && (
              <div className="rev__empty">
                <span>💰</span>
                <h3>Start tracking your revenue</h3>
                <p>Add a brand deal or log income to see your earnings</p>
                <div className="rev__empty-btns">
                  <button className="rev__add-btn" onClick={()=>setShowDeal(true)}>+ Add Deal</button>
                  <button className="rev__add-btn rev__add-btn--ghost" onClick={()=>setShowInc(true)}>+ Log Income</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEALS */}
        {tab === 'deals' && (
          <div className="rev__deals-view">
            {/* Status filter */}
            <div className="rev__status-filter">
              <button className={`rev__sf-btn${filterStatus==='all'?' active':''}`} onClick={()=>setFilterStatus('all')}>All ({data.deals.length})</button>
              {DEAL_STATUS.map(s => {
                const cnt = data.deals.filter(d=>d.status===s.id).length;
                return cnt > 0 ? (
                  <button key={s.id}
                    className={`rev__sf-btn${filterStatus===s.id?' active':''}`}
                    style={filterStatus===s.id?{background:s.color+'22',color:s.color,borderColor:s.color+'55'}:{borderColor:s.color+'44',color:s.color}}
                    onClick={()=>setFilterStatus(f=>f===s.id?'all':s.id)}>
                    {s.label} ({cnt})
                  </button>
                ) : null;
              })}
            </div>

            {visibleDeals.length === 0 ? (
              <div className="rev__empty">
                <span>🤝</span>
                <h3>No brand deals yet</h3>
                <p>Track your sponsorships, partnerships, and brand collaborations</p>
                <button className="rev__add-btn" onClick={()=>setShowDeal(true)}>+ Add First Deal</button>
              </div>
            ) : (
              <div className="rev__deal-list">
                {visibleDeals.map(d => (
                  <DealRow key={d.id} deal={d}
                    onEdit={()=>{setEditDeal(d);setShowDeal(true);}}
                    onDelete={()=>deleteDeal(d.id)}
                    onStatus={s=>updateDealStatus(d.id,s)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* INCOME LOG */}
        {tab === 'income' && (
          <div className="rev__income-view">
            {data.income.length === 0 ? (
              <div className="rev__empty">
                <span>📊</span>
                <h3>No income logged yet</h3>
                <p>Log ad revenue, affiliate income, course sales, and more</p>
                <button className="rev__add-btn" onClick={()=>setShowInc(true)}>+ Log First Income</button>
              </div>
            ) : (
              <table className="rev__table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Source</th>
                    <th>Platform</th>
                    <th>Category</th>
                    <th>Notes</th>
                    <th>Amount</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.income].sort((a,b)=>b.date?.localeCompare(a.date||'')).map(i => (
                    <tr key={i.id} onClick={()=>{setEditInc(i);setShowInc(true);}}>
                      <td>{i.date}</td>
                      <td className="rev__td-source">{i.source || '—'}</td>
                      <td><span className="rev__platform-tag">{i.platform}</span></td>
                      <td><span className="rev__cat-tag">{i.category}</span></td>
                      <td className="rev__td-notes">{i.notes || '—'}</td>
                      <td className="rev__td-amount">{fmt(i.amount)}</td>
                      <td>
                        <button className="rev__row-del" onClick={e=>{e.stopPropagation();deleteIncome(i.id);}}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="rev__table-total-label">Total</td>
                    <td className="rev__table-total">{fmt(data.income.reduce((s,i)=>s+Number(i.amount||0),0))}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>

      {/* ── Deal modal ── */}
      {showDeal && (
        <DealModal
          initial={editDeal}
          onSave={saveDeal}
          onClose={()=>{setShowDeal(false);setEditDeal(null);}}
        />
      )}

      {/* ── Income modal ── */}
      {showInc && (
        <IncomeModal
          initial={editInc}
          onSave={saveIncome}
          onClose={()=>{setShowInc(false);setEditInc(null);}}
        />
      )}
    </div>
  );
}

// ── Deal row ──────────────────────────────────────────────────────────────────
function DealRow({ deal, onEdit, onDelete, onStatus }) {
  const [showStatus, setShowStatus] = useState(false);
  const col = stColor(deal.status);
  return (
    <div className="rev__deal-row" onClick={onEdit}>
      <div className="rev__deal-row-left">
        <div className="rev__deal-brand">{deal.brand || 'Unknown brand'}</div>
        <div className="rev__deal-meta">
          {deal.platform && <span>{deal.platform}</span>}
          {deal.dueDate  && <span>Due: {deal.dueDate}</span>}
          {deal.notes    && <span className="rev__deal-notes">{deal.notes}</span>}
        </div>
      </div>
      <div className="rev__deal-row-right">
        <span className="rev__deal-amount">{fmt(deal.amount)}</span>
        <div className="rev__status-wrap" onClick={e=>e.stopPropagation()}>
          <button className="rev__status-badge"
            style={{background:col+'18',color:col,borderColor:col+'44'}}
            onClick={()=>setShowStatus(s=>!s)}>
            {stLabel(deal.status)}
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {showStatus && (
            <div className="rev__status-drop">
              {DEAL_STATUS.map(s => (
                <button key={s.id} className="rev__status-opt"
                  style={{color:s.color}}
                  onClick={()=>{onStatus(s.id);setShowStatus(false);}}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {onDelete && (
          <button className="rev__row-del" onClick={e=>{e.stopPropagation();onDelete();}}>✕</button>
        )}
      </div>
    </div>
  );
}

// ── Deal modal ────────────────────────────────────────────────────────────────
function DealModal({ initial, onSave, onClose }) {
  const [f, setF] = useState({ brand:'', platform:'YouTube', amount:'', status:'pitched', dueDate:'', deliverable:'', notes:'', ...initial });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div className="rev__modal-overlay" onClick={onClose}>
      <div className="rev__modal" onClick={e=>e.stopPropagation()}>
        <div className="rev__modal-head">
          <h3>{initial ? 'Edit Deal' : 'New Brand Deal'}</h3>
          <button className="rev__modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rev__modal-body">
          <div className="rev__mf">
            <label>Brand / Company</label>
            <input autoFocus placeholder="e.g. Nike, Squarespace…" value={f.brand} onChange={e=>set('brand',e.target.value)} />
          </div>
          <div className="rev__mf-row">
            <div className="rev__mf">
              <label>Amount ($)</label>
              <input type="number" placeholder="0" value={f.amount} onChange={e=>set('amount',e.target.value)} />
            </div>
            <div className="rev__mf">
              <label>Platform</label>
              <select value={f.platform} onChange={e=>set('platform',e.target.value)}>
                {PLATFORMS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="rev__mf">
              <label>Status</label>
              <select value={f.status} onChange={e=>set('status',e.target.value)}>
                {DEAL_STATUS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div className="rev__mf-row">
            <div className="rev__mf">
              <label>Due / Go-live Date</label>
              <input type="date" value={f.dueDate} onChange={e=>set('dueDate',e.target.value)} />
            </div>
            <div className="rev__mf">
              <label>Deliverable</label>
              <input placeholder="e.g. 60s integration, 3 IG posts…" value={f.deliverable} onChange={e=>set('deliverable',e.target.value)} />
            </div>
          </div>
          <div className="rev__mf">
            <label>Notes / Terms</label>
            <textarea rows={3} placeholder="Usage rights, exclusivity, talking points…" value={f.notes} onChange={e=>set('notes',e.target.value)} />
          </div>
        </div>
        <div className="rev__modal-foot">
          <button className="rev__modal-cancel" onClick={onClose}>Cancel</button>
          <button className="rev__modal-save" onClick={()=>f.brand.trim()&&onSave(f)}>
            {initial ? 'Save Changes' : 'Add Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Income modal ──────────────────────────────────────────────────────────────
function IncomeModal({ initial, onSave, onClose }) {
  const [f, setF] = useState({ source:'', platform:'YouTube', category:'Ad Revenue', amount:'', date:new Date().toISOString().slice(0,10), notes:'', ...initial });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  return (
    <div className="rev__modal-overlay" onClick={onClose}>
      <div className="rev__modal" onClick={e=>e.stopPropagation()}>
        <div className="rev__modal-head">
          <h3>{initial ? 'Edit Income' : 'Log Income'}</h3>
          <button className="rev__modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="rev__modal-body">
          <div className="rev__mf-row">
            <div className="rev__mf">
              <label>Amount ($)</label>
              <input autoFocus type="number" placeholder="0" value={f.amount} onChange={e=>set('amount',e.target.value)} />
            </div>
            <div className="rev__mf">
              <label>Date</label>
              <input type="date" value={f.date} onChange={e=>set('date',e.target.value)} />
            </div>
          </div>
          <div className="rev__mf-row">
            <div className="rev__mf">
              <label>Category</label>
              <select value={f.category} onChange={e=>set('category',e.target.value)}>
                {INCOME_CATS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="rev__mf">
              <label>Platform</label>
              <select value={f.platform} onChange={e=>set('platform',e.target.value)}>
                {PLATFORMS.map(p=><option key={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="rev__mf">
            <label>Source / Description</label>
            <input placeholder="e.g. YouTube AdSense May, Amazon Affiliate…" value={f.source} onChange={e=>set('source',e.target.value)} />
          </div>
          <div className="rev__mf">
            <label>Notes</label>
            <textarea rows={2} placeholder="Any additional notes…" value={f.notes} onChange={e=>set('notes',e.target.value)} />
          </div>
        </div>
        <div className="rev__modal-foot">
          <button className="rev__modal-cancel" onClick={onClose}>Cancel</button>
          <button className="rev__modal-save" onClick={()=>f.amount&&onSave(f)}>
            {initial ? 'Save' : 'Log Income'}
          </button>
        </div>
      </div>
    </div>
  );
}
