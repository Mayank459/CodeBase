import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, ExternalLink, Eye, Code, ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import mermaid from 'mermaid';
import { getMermaidLiveUrl } from '../api';

function sanitizeMermaid(raw) {
  if (!raw) return '';
  let text = String(raw).trim();

  // Strip code fences if present
  text = text.replace(/^```(?:mermaid|flowchart|diagram)?\s*/i, '').replace(/```\s*$/i, '').trim();

  // If text doesn't start with a supported diagram type, prepend flowchart TD
  const hasKeyword = /^\s*(flowchart|graph|sequenceDiagram|classDiagram|classDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|mindmap|gitGraph)\b/i.test(text);
  if (!hasKeyword) {
    text = `flowchart TD\n${text}`;
  }

  // Sanitize flowchart and graph lines: ensure special characters inside brackets are safely quoted
  if (text.startsWith('flowchart') || text.startsWith('graph')) {
    const lines = text.split('\n').map((line) => {
      let l = line;
      // Quote any unquoted node label brackets (e.g. A[path/to/file::function] -> A["path/to/file::function"])
      l = l.replace(/(\b[A-Za-z0-9_]+)\[([^"\]\n]+)\]/g, (match, id, content) => {
        const cleaned = content.replace(/"/g, "'").trim();
        return `${id}["${cleaned}"]`;
      });
      return l;
    });
    text = lines.join('\n');
  }

  return text;
}

export function MarkdownView({ content }) {
  if (!content) return null;

  // Split markdown into code blocks vs regular paragraphs/headers/tables
  const parts = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        text: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'text',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'markdown',
      text: content.slice(lastIndex),
    });
  }

  return (
    <div className="markdown-body chat-prose space-y-4 text-slate-100 font-tiempos text-[16px] sm:text-[17px] leading-[1.8] font-normal">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          const isMermaid = (part.lang && (part.lang.toLowerCase() === 'mermaid' || part.lang.toLowerCase() === 'flowchart' || part.lang.toLowerCase() === 'diagram')) ||
            /^\s*(flowchart|graph|sequenceDiagram|classDiagram|classDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|mindmap|gitGraph)\b/i.test(part.code);

          if (isMermaid) {
            return <MermaidSnippet key={idx} code={part.code} />;
          }
          return <CodeSnippet key={idx} lang={part.lang} code={part.code} />;
        }
        return <SimpleMarkdownRenderer key={idx} text={part.text} />;
      })}
    </div>
  );
}

function CodeSnippet({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="code-block-wrapper my-3 rounded-lg overflow-hidden border border-white/10 bg-[#060910]">
      <div className="code-header flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06] text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-indigo-400" />
          <span>{lang || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="btn btn-ghost btn-sm py-0.5 px-2 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
          title="Copy code"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-content p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MermaidSnippet({ code }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diagram');
  const [renderError, setRenderError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef(null);

  const sanitized = sanitizeMermaid(code);
  const liveUrl = getMermaidLiveUrl(sanitized || code);

  const handleZoomIn = () => setZoom((z) => Math.min(Math.round((z + 0.2) * 10) / 10, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(Math.round((z - 0.2) * 10) / 10, 0.4));
  const handleResetZoom = () => setZoom(1);

  useEffect(() => {
    if (viewMode === 'diagram' && containerRef.current && sanitized) {
      containerRef.current.innerHTML = '';
      setRenderError(false);
      const uniqueId = `mermaid-chat-${Math.random().toString(36).substring(2, 9)}`;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          fontFamily: 'Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
          fontSize: '13px',
          background: '#070b14',
          primaryColor: '#1e1b4b',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#6366f1',
          lineColor: '#818cf8',
          secondaryColor: '#0f172a',
          tertiaryColor: '#090d16',
          mainBkg: '#111827',
          nodeBorder: '#6366f1',
          clusterBkg: '#0b0f19',
          clusterBorder: '#3730a3',
          titleColor: '#e0e7ff',
          edgeLabelBackground: '#0b0f19',
        },
        flowchart: {
          curve: 'basis',
          htmlLabels: true,
          padding: 16,
          useMaxWidth: true,
        },
        securityLevel: 'loose',
      });

      mermaid.parse(sanitized, { suppressErrors: true })
        .then(() => mermaid.render(uniqueId, sanitized))
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            const svgEl = containerRef.current.querySelector('svg');
            if (svgEl) {
              svgEl.removeAttribute('height');
              svgEl.style.width = '100%';
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.minHeight = '200px';
              svgEl.style.display = 'block';
              svgEl.style.margin = '0 auto';
              svgEl.style.overflow = 'visible';
            }
          }
        })
        .catch((err) => {
          console.warn('Mermaid render error with sanitized code:', err);
          // Retry with raw code once
          mermaid.render(`retry-${uniqueId}`, code)
            .then(({ svg }) => {
              if (containerRef.current) {
                containerRef.current.innerHTML = svg;
              }
            })
            .catch(() => {
              setRenderError(true);
            });
        });
    }
  }, [sanitized, code, viewMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sanitized || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className={`mermaid-block-wrapper my-4 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#080c16] shadow-xl transition-all duration-200 ${
      isExpanded ? 'fixed inset-4 z-50 flex flex-col bg-[#080c16]/98 backdrop-blur-2xl border-indigo-500/40 shadow-2xl' : ''
    }`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-[#0d121f] border-b border-white/[0.08] text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-200 font-semibold tracking-tight">Mermaid Visual Diagram</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Zoom Controls (only shown in diagram mode) */}
          {viewMode === 'diagram' && !renderError && (
            <div className="flex items-center gap-0.5 bg-white/[0.04] px-1 py-0.5 rounded border border-white/[0.06] mr-1">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 0.4}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom Out (-20%)"
              >
                <ZoomOut size={12} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="px-1.5 py-0.5 text-[10px] font-mono text-indigo-300 hover:text-white hover:bg-white/[0.06] rounded transition-colors"
                title="Reset Zoom (100%)"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 2.5}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                title="Zoom In (+20%)"
              >
                <ZoomIn size={12} />
              </button>
              <button
                type="button"
                onClick={handleResetZoom}
                className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                title="Reset View"
              >
                <RotateCcw size={11} />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
            title={isExpanded ? 'Collapse' : 'Expand Fullscreen'}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            <span>{isExpanded ? 'Minimize' : 'Expand'}</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'diagram' ? 'code' : 'diagram')}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
          >
            {viewMode === 'diagram' ? <Code size={12} /> : <Eye size={12} />}
            <span>{viewMode === 'diagram' ? 'Source' : 'Diagram'}</span>
          </button>

          {liveUrl && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
              title="Open in Mermaid Live Editor"
            >
              <ExternalLink size={12} />
              <span>Editor</span>
            </a>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1 text-[11px] transition-colors"
            title="Copy Mermaid Code"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {viewMode === 'diagram' && !renderError ? (
        <div className={`p-4 overflow-auto flex items-start justify-center bg-gradient-to-b from-[#080c16] to-[#0a0f1d] ${
          isExpanded ? 'flex-1 h-full' : 'max-h-[640px] min-h-[240px]'
        }`}>
          <div
            ref={containerRef}
            className="w-full flex justify-center transition-transform duration-200 ease-out origin-top"
            style={{
              transform: `scale(${zoom})`,
            }}
          />
        </div>
      ) : (
        <div className="relative">
          {renderError && (
            <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono">
                <AlertCircle size={13} />
                <span>Showing source code due to syntax variance.</span>
              </div>
              {liveUrl && (
                <a href={liveUrl} target="_blank" rel="noreferrer" className="underline hover:text-white flex items-center gap-1 text-[11px]">
                  <span>Open in Live Editor</span>
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )}
          <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre bg-[#04060a]">
            <code>{sanitized || code}</code>
          </pre>
        </div>
      )}
    </div>
  );
}

function SimpleMarkdownRenderer({ text }) {
  // Parse lines for headers, lists, blockquotes, tables, bold, inline code
  const lines = text.split('\n');
  const renderedElements = [];
  let listItems = [];
  let tableRows = [];

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${renderedElements.length}`} className="list-disc pl-6 space-y-2 my-2.5 text-slate-200 text-[16px] sm:text-[17px] leading-[1.8] font-tiempos font-normal">
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      renderedElements.push(
        <div key={`table-${renderedElements.length}`} className="overflow-x-auto my-3 border border-white/10 rounded-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.05] border-b border-white/10 text-slate-200">
                {header.map((col, idx) => (
                  <th key={idx} className="p-3 font-semibold font-mono text-xs">
                    {formatInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-slate-200 text-sm">
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table line: | col 1 | col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.slice(1, -1).split('|');
      // Check if it's separator row like |---|---|
      const isSep = cells.every(c => /^[\s-:]+$/.test(c));
      if (!isSep) {
        tableRows.push(cells);
      }
      return;
    } else {
      flushTable();
    }

    // Unordered List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    } else {
      flushList();
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-lg font-bold text-slate-100 mt-5 mb-2 flex items-center gap-2 font-tiempos">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={idx} className="text-xl font-bold text-white mt-6 mb-2.5 pb-1 border-b border-white/10 font-tiempos">
          {formatInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={idx} className="text-2xl font-extrabold text-white mt-7 mb-3 font-tiempos">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Callout / Blockquote
    if (trimmed.startsWith('> ')) {
      const calloutText = trimmed.slice(2);
      const isAlert = calloutText.startsWith('[!WARNING]') || calloutText.startsWith('[!IMPORTANT]');
      const isTip = calloutText.startsWith('[!TIP]') || calloutText.startsWith('[!NOTE]');
      renderedElements.push(
        <div
          key={idx}
          className={`p-3.5 my-2.5 border-l-2 rounded-r-lg text-sm ${
            isAlert
              ? 'border-amber-500 bg-amber-500/10 text-amber-200'
              : isTip
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200'
              : 'border-slate-600 bg-white/[0.03] text-slate-200'
          }`}
        >
          {formatInline(calloutText.replace(/\[!(WARNING|IMPORTANT|TIP|NOTE)\]/, '').trim())}
        </div>
      );
      return;
    }

    // Blank line
    if (!trimmed) {
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Standard paragraph with Tiempos font and bigger size
    renderedElements.push(
      <p key={idx} className="text-slate-200 leading-[1.8] text-[16px] sm:text-[17px] font-normal font-tiempos">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <>{renderedElements}</>;
}

function formatInline(str) {
  if (!str) return '';
  // Convert `code` to <code class="font-mono">
  // Convert **bold** to <strong>
  const tokens = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;

  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) {
      tokens.push(str.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith('`')) {
      tokens.push(
        <code key={m.index} className="px-1.5 py-0.5 rounded bg-white/[0.08] text-indigo-300 font-mono text-[13px] border border-white/[0.08]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      tokens.push(
        <strong key={m.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    last = m.index + token.length;
  }
  if (last < str.length) {
    tokens.push(str.slice(last));
  }
  return tokens;
}
