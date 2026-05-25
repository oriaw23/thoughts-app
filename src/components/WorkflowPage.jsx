import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import './WorkflowPage.css';

const WF_KEY = 'foldbase_workflows_v1';
const loadWorkflows = () => { try { return JSON.parse(localStorage.getItem(WF_KEY)||'[]'); } catch { return []; }};
const saveWorkflows = w => localStorage.setItem(WF_KEY, JSON.stringify(w));

// ── Node type config ──────────────────────────────────────────────────────────
const NODE_TYPES = {
  trigger:   { label:'Trigger',   bg:'#dbeafe', color:'#2563eb', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> },
  input:     { label:'Input',     bg:'#dbeafe', color:'#2563eb', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> },
  selection: { label:'Selection', bg:'#dbeafe', color:'#2563eb', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg> },
  condition: { label:'Condition', bg:'#fef3c7', color:'#d97706', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 3h5v5"/><path d="M8 3H3v5"/><path d="M12 22v-8.3a4 4 0 0 0-1.172-2.872L3 3"/><path d="m15 9 6-6"/></svg> },
  ai:        { label:'Prompt',    bg:'#ede9fe', color:'#7c3aed', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2a10 10 0 1 0 10 10"/><path d="M12 8v4l3 3"/><path d="M18 2v6h6"/></svg> },
  action:    { label:'Action',    bg:'#fce7f3', color:'#be185d', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg> },
  response:  { label:'Response',  bg:'#dcfce7', color:'#16a34a', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  end:       { label:'End',       bg:'#f1f5f9', color:'#64748b', Icon: ()=><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1" fill="currentColor" stroke="none"/></svg> },
};

// ── Connector ─────────────────────────────────────────────────────────────────
function Connector({ branch = false }) {
  return (
    <div className={`wfn-connector${branch ? ' wfn-connector--branch' : ''}`}>
      <div className="wfn-line"/>
      <div className="wfn-dot"/>
    </div>
  );
}

// ── Single node card ──────────────────────────────────────────────────────────
function FlowNode({ type='action', label, description, collects, width='normal' }) {
  const cfg = NODE_TYPES[type] || NODE_TYPES.action;
  const { Icon } = cfg;
  return (
    <div className={`wfn-card wfn-card--${width}`}>
      <div className="wfn-card-head">
        <div className="wfn-card-icon" style={{ background: cfg.bg, color: cfg.color }}>
          <Icon/>
        </div>
        <span className="wfn-card-type" style={{ color: cfg.color }}>{label || cfg.label}</span>
        <button className="wfn-card-more">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></svg>
        </button>
      </div>
      {description && <p className="wfn-card-desc" dir="auto">{description}</p>}
      {collects && (
        <div className="wfn-card-collects">
          <span className="wfn-card-collects-label">Collects</span>
          <span className="wfn-card-collects-val">{collects}</span>
        </div>
      )}
    </div>
  );
}

// ── Branch section ────────────────────────────────────────────────────────────
function FlowBranch({ left = [], right = [], leftLabel, rightLabel }) {
  return (
    <div className="wfn-branch">
      <div className="wfn-branch-line-h"/>
      <div className="wfn-branch-cols">
        <div className="wfn-branch-col">
          {leftLabel && <span className="wfn-branch-label">{leftLabel}</span>}
          <RenderFlow steps={left}/>
        </div>
        <div className="wfn-branch-col">
          {rightLabel && <span className="wfn-branch-label">{rightLabel}</span>}
          <RenderFlow steps={right}/>
        </div>
      </div>
    </div>
  );
}

// ── Recursive flow renderer ───────────────────────────────────────────────────
function RenderFlow({ steps = [] }) {
  return (
    <div className="wfn-flow">
      {steps.map((step, i) => (
        <div key={i} className="wfn-step">
          {i > 0 && <Connector/>}
          {step.kind === 'branch' ? (
            <FlowBranch
              left={step.left}
              right={step.right}
              leftLabel={step.leftLabel}
              rightLabel={step.rightLabel}
            />
          ) : (
            <FlowNode {...step}/>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Workflow viewer ───────────────────────────────────────────────────────────
function WorkflowView({ workflow, onDelete }) {
  return (
    <div className="wfn-view">
      <div className="wfn-view-header">
        <div>
          <h2 className="wfn-view-title">{workflow.title}</h2>
          {workflow.description && <p className="wfn-view-desc">{workflow.description}</p>}
        </div>
        <button className="wfn-view-del" onClick={onDelete} title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
        </button>
      </div>
      <div className="wfn-view-canvas">
        <div className="wfn-dots-bg"/>
        <RenderFlow steps={workflow.steps || []}/>
      </div>
    </div>
  );
}

// ── Create workflow form (AI-powered) ─────────────────────────────────────────
function CreateDialog({ onClose, onCreate }) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const examples = [
    'Onboarding a new employee',
    'Customer support ticket flow',
    'Content approval process',
    'Trip planning workflow',
    'Bug report handling',
  ];

  const generate = async (text) => {
    const key = localStorage.getItem('groq_api_key') || localStorage.getItem('openrouter_api_key') || '';
    if (!key && window.location.protocol === 'file:') {
      // Fallback: create a demo workflow
      const demo = buildDemo(text);
      onCreate(demo);
      onClose();
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Try server first, then direct
      const isWeb = window.location.protocol !== 'file:';
      let res;
      if (isWeb) {
        res = await fetch('/api/chat', {
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body: JSON.stringify({
            messages: [
              { role:'system', content: WORKFLOW_SYSTEM },
              { role:'user', content: `Create a workflow for: ${text}` },
            ],
            max_tokens: 1500,
          }),
        });
      } else {
        const provider = localStorage.getItem('ai_provider') || 'groq';
        const urls = { groq:'https://api.groq.com/openai/v1/chat/completions', openrouter:'https://openrouter.ai/api/v1/chat/completions' };
        const keys = { groq: localStorage.getItem('groq_api_key'), openrouter: localStorage.getItem('openrouter_api_key') };
        const model = localStorage.getItem(`${provider}_model`) || (provider==='openrouter'?'google/gemma-3-27b-it:free':'llama-3.3-70b-versatile');
        res = await fetch(urls[provider]||urls.groq, {
          method:'POST',
          headers:{'Authorization':`Bearer ${keys[provider]||key}`,'Content-Type':'application/json'},
          body: JSON.stringify({ model, messages:[{role:'system',content:WORKFLOW_SYSTEM},{role:'user',content:`Create a workflow for: ${text}`}], max_tokens:1500, stream:false }),
        });
      }

      let fullText = '';
      if (res.headers.get('content-type')?.includes('text/event-stream')) {
        const reader = res.body.getReader(); const dec = new TextDecoder();
        while(true) {
          const {done,value} = await reader.read(); if(done) break;
          for(const line of dec.decode(value).split('\n')) {
            if(!line.startsWith('data: ')||line==='data: [DONE]') continue;
            try { const t=JSON.parse(line.slice(6)).choices?.[0]?.delta?.content; if(t) fullText+=t; } catch {}
          }
        }
      } else {
        const data = await res.json();
        fullText = data.choices?.[0]?.message?.content || '';
      }

      const jsonMatch = fullText.match(/```json\s*([\s\S]*?)```/) || fullText.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        const wf = JSON.parse(jsonMatch[1]);
        wf.id = uuidv4();
        wf.createdAt = new Date().toISOString();
        onCreate(wf);
        onClose();
      } else {
        throw new Error('Could not parse workflow');
      }
    } catch (e) {
      const demo = buildDemo(text);
      onCreate(demo);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="wfn-dialog-overlay" onClick={onClose}>
      <div className="wfn-dialog" onClick={e=>e.stopPropagation()}>
        <div className="wfn-dialog-head">
          <h3>Create Workflow with AI</h3>
          <button onClick={onClose} className="wfn-dialog-x">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <textarea
          className="wfn-dialog-input"
          placeholder="Describe your workflow... (e.g. 'Onboarding a new employee')"
          value={prompt}
          onChange={e=>setPrompt(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&(e.preventDefault(),prompt.trim()&&generate(prompt.trim()))}
          autoFocus
          rows={3}
        />
        <div className="wfn-dialog-examples">
          {examples.map(ex=>(
            <button key={ex} className="wfn-dialog-ex" onClick={()=>{ setPrompt(ex); generate(ex); }}>{ex}</button>
          ))}
        </div>
        {error && <p className="wfn-dialog-err">{error}</p>}
        <button
          className={`wfn-dialog-btn${loading?' loading':''}`}
          onClick={()=>prompt.trim()&&generate(prompt.trim())}
          disabled={loading||!prompt.trim()}>
          {loading ? (
            <><span className="wfn-btn-spinner"/>Building workflow…</>
          ) : 'Generate Workflow →'}
        </button>
      </div>
    </div>
  );
}

// ── System prompt for workflow generation ─────────────────────────────────────
const WORKFLOW_SYSTEM = `You generate workflow JSON for a visual workflow builder.
Return ONLY a JSON code block with this structure:

\`\`\`json
{
  "title": "Workflow Name",
  "description": "Brief description",
  "steps": [
    { "kind": "node", "type": "trigger", "label": "Start", "description": "...", "collects": "..." },
    { "kind": "node", "type": "input", "label": "Input", "description": "...", "collects": "..." },
    { "kind": "node", "type": "condition", "label": "Condition", "description": "..." },
    { "kind": "branch",
      "leftLabel": "Yes", "rightLabel": "No",
      "left": [
        { "kind": "node", "type": "ai", "label": "Prompt", "description": "...", "collects": "..." },
        { "kind": "node", "type": "response", "label": "Response" }
      ],
      "right": [
        { "kind": "node", "type": "action", "label": "Action", "description": "..." },
        { "kind": "node", "type": "end", "label": "End" }
      ]
    }
  ]
}
\`\`\`

Node types: trigger, input, selection, condition, ai, action, response, end
Keep it 4-8 steps. Be specific and practical.`;

// ── Demo workflow builder ─────────────────────────────────────────────────────
function buildDemo(title) {
  return {
    id: uuidv4(),
    title: title || 'My Workflow',
    description: 'AI-generated workflow',
    createdAt: new Date().toISOString(),
    steps: [
      { kind:'node', type:'trigger', label:'Start', description:`Begin: ${title}`, collects:'Input' },
      { kind:'node', type:'input',   label:'Gather Info', description:'Collect required information', collects:'Details' },
      { kind:'node', type:'condition', label:'Condition', description:'Evaluate and decide next step' },
      { kind:'branch', leftLabel:'Option A', rightLabel:'Option B',
        left: [
          { kind:'node', type:'ai', label:'Prompt', description:'Process with AI', collects:'Analysis' },
          { kind:'node', type:'response', label:'Response' },
        ],
        right: [
          { kind:'node', type:'action', label:'Action', description:'Execute action' },
          { kind:'node', type:'end', label:'End' },
        ],
      },
    ],
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorkflowPage() {
  const [workflows, setWorkflows] = useState(loadWorkflows);
  const [selected, setSelected]   = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(()=>{ saveWorkflows(workflows); },[workflows]);

  const addWorkflow = (wf) => {
    setWorkflows(prev => [wf, ...prev]);
    setSelected(wf.id);
  };

  const deleteWorkflow = (id) => {
    setWorkflows(prev => prev.filter(w=>w.id!==id));
    if (selected===id) setSelected(workflows.find(w=>w.id!==id)?.id || null);
  };

  const activeWf = workflows.find(w=>w.id===selected) || null;

  return (
    <div className="wfp">
      {/* Sidebar */}
      <div className="wfp__sidebar">
        <div className="wfp__sidebar-head">
          <span className="wfp__sidebar-title">Workflows</span>
          <button className="wfp__sidebar-new" onClick={()=>setShowCreate(true)} title="New workflow">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
        <div className="wfp__list">
          {workflows.length === 0 && (
            <div className="wfp__list-empty">No workflows yet</div>
          )}
          {workflows.map(wf=>(
            <button key={wf.id} className={`wfp__item${selected===wf.id?' active':''}`}
              onClick={()=>setSelected(wf.id)}>
              <div className="wfp__item-icon">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><line x1="5.5" y1="8" x2="5.5" y2="12"/><line x1="18.5" y1="8" x2="18.5" y2="12"/><path d="M5.5 12 Q5.5 16 12 16"/><path d="M18.5 12 Q18.5 16 12 16"/></svg>
              </div>
              <div className="wfp__item-body">
                <span className="wfp__item-title">{wf.title}</span>
                <span className="wfp__item-count">{wf.steps?.length||0} steps</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main canvas */}
      <div className="wfp__main">
        {activeWf ? (
          <WorkflowView workflow={activeWf} onDelete={()=>deleteWorkflow(activeWf.id)}/>
        ) : (
          <div className="wfp__empty">
            <div className="wfp__empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="5" height="5" rx="1"/><rect x="16" y="3" width="5" height="5" rx="1"/><rect x="9.5" y="16" width="5" height="5" rx="1"/><line x1="5.5" y1="8" x2="5.5" y2="12"/><line x1="18.5" y1="8" x2="18.5" y2="12"/><path d="M5.5 12 Q5.5 16 12 16"/><path d="M18.5 12 Q18.5 16 12 16"/></svg>
            </div>
            <h2>No workflow selected</h2>
            <p>Create a workflow with AI or select one from the sidebar</p>
            <button className="wfp__empty-btn" onClick={()=>setShowCreate(true)}>
              ✦ Create with AI
            </button>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateDialog onClose={()=>setShowCreate(false)} onCreate={addWorkflow}/>
      )}
    </div>
  );
}
