import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import './Editor.css';

function renderMarkdown(text) {
  if (!text) return '<p class="editor__placeholder">התחל לכתוב...</p>';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const lines = html.split('\n');
  const result = [];
  let inList = false;
  let inOrderedList = false;
  let inCode = false;
  let codeLines = [];
  let codeLang = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      if (!inCode) {
        inCode = true;
        codeLang = line.slice(3).trim();
        codeLines = [];
      } else {
        inCode = false;
        result.push(`<pre class="md-code"><code class="lang-${codeLang}">${codeLines.join('\n')}</code></pre>`);
        codeLines = [];
      }
      continue;
    }
    if (inCode) { codeLines.push(line); continue; }

    // Close lists
    if (inList && !line.match(/^[-*+] /)) { result.push('</ul>'); inList = false; }
    if (inOrderedList && !line.match(/^\d+\. /)) { result.push('</ol>'); inOrderedList = false; }

    // Headings
    if (line.startsWith('# ')) { result.push(`<h1>${inlineFormat(line.slice(2))}</h1>`); continue; }
    if (line.startsWith('## ')) { result.push(`<h2>${inlineFormat(line.slice(3))}</h2>`); continue; }
    if (line.startsWith('### ')) { result.push(`<h3>${inlineFormat(line.slice(4))}</h3>`); continue; }

    // Horizontal rule
    if (line.match(/^---+$/)) { result.push('<hr>'); continue; }

    // Blockquote
    if (line.startsWith('> ')) { result.push(`<blockquote>${inlineFormat(line.slice(2))}</blockquote>`); continue; }

    // Checkbox list
    if (line.match(/^- \[[ x]\] /)) {
      const checked = line[4] === 'x';
      const text = line.slice(6);
      result.push(`<div class="md-checkbox"><input type="checkbox" ${checked ? 'checked' : ''} disabled><span>${inlineFormat(text)}</span></div>`);
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+] /)) {
      if (!inList) { result.push('<ul>'); inList = true; }
      result.push(`<li>${inlineFormat(line.slice(2))}</li>`);
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\. /)) {
      if (!inOrderedList) { result.push('<ol>'); inOrderedList = true; }
      result.push(`<li>${inlineFormat(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }

    // Empty line
    if (!line.trim()) { result.push('<br>'); continue; }

    // Paragraph
    result.push(`<p>${inlineFormat(line)}</p>`);
  }

  if (inList) result.push('</ul>');
  if (inOrderedList) result.push('</ol>');
  if (inCode) result.push(`<pre class="md-code"><code>${codeLines.join('\n')}</code></pre>`);

  return result.join('');
}

function inlineFormat(text) {
  return text
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<del>$1</del>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank">$1</a>');
}

export default function Editor({ page, onUpdate }) {
  const [mode, setMode] = useState('preview');
  const [editTitle, setEditTitle] = useState(false);
  const textareaRef = useRef(null);
  const titleRef = useRef(null);

  useEffect(() => {
    if (mode === 'edit' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [mode]);

  useEffect(() => {
    if (editTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [editTitle]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = textareaRef.current;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const val = el.value;
      const newVal = val.substring(0, start) + '  ' + val.substring(end);
      onUpdate({ content: newVal });
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
    if (e.key === 'Escape') setMode('preview');
  }, [onUpdate]);

  if (!page) {
    return (
      <div className="editor editor--empty">
        <div className="editor__empty-state">
          <div className="editor__empty-icon">📄</div>
          <h3>בחר דף מהסרגל הצד</h3>
          <p>או צור דף חדש כדי להתחיל</p>
        </div>
      </div>
    );
  }

  const updatedAt = page.updatedAt
    ? format(new Date(page.updatedAt), 'dd בMMM yyyy, HH:mm', { locale: he })
    : '';

  return (
    <div className="editor">
      <div className="editor__topbar">
        <div className="editor__breadcrumb">
          <span>{page.icon}</span>
          <span>{page.title}</span>
        </div>
        <div className="editor__toolbar">
          {mode === 'edit' && (
            <span className="editor__autosave">✓ נשמר</span>
          )}
          <button
            className={`editor__mode-btn ${mode === 'preview' ? 'active' : ''}`}
            onClick={() => setMode('preview')}
          >
            👁 תצוגה
          </button>
          <button
            className={`editor__mode-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            ✏️ עריכה
          </button>
        </div>
      </div>

      <div className="editor__content">
        <div className="editor__page-header">
          <button
            className="editor__page-icon"
            onClick={() => {}}
            title="שנה אייקון"
          >
            {page.icon}
          </button>

          {editTitle ? (
            <input
              ref={titleRef}
              className="editor__title-input"
              value={page.title}
              onChange={e => onUpdate({ title: e.target.value })}
              onBlur={() => setEditTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setEditTitle(false)}
              placeholder="כותרת הדף..."
            />
          ) : (
            <h1 className="editor__title" onClick={() => setEditTitle(true)}>
              {page.title || 'דף ללא שם'}
            </h1>
          )}

          {updatedAt && (
            <p className="editor__meta">עודכן: {updatedAt}</p>
          )}
        </div>

        {mode === 'edit' ? (
          <div className="editor__edit-area">
            <div className="editor__markdown-hint">
              <span>**עבה**</span>
              <span>*נטוי*</span>
              <span># כותרת</span>
              <span>- רשימה</span>
              <span>- [x] משימה</span>
              <span>&gt; ציטוט</span>
              <span>```קוד```</span>
            </div>
            <textarea
              ref={textareaRef}
              className="editor__textarea"
              value={page.content || ''}
              onChange={e => onUpdate({ content: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder="התחל לכתוב... (תומך ב-Markdown)"
              spellCheck={false}
            />
          </div>
        ) : (
          <div
            className="editor__preview"
            onClick={() => setMode('edit')}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(page.content) }}
          />
        )}
      </div>
    </div>
  );
}
