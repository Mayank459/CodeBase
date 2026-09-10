import React, { useState, useEffect, useRef } from 'react';
import { Copy, Check, Terminal, ExternalLink, Eye, Code, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import mermaid from 'mermaid';
import { getMermaidLiveUrl } from '../api';

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
          if (part.lang && part.lang.toLowerCase() === 'mermaid') {
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
  const containerRef = useRef(null);
  const liveUrl = getMermaidLiveUrl(code);

  const handleZoomIn = () => setZoom((z) => Math.min(Math.round((z + 0.2) * 10) / 10, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(Math.round((z - 0.2) * 10) / 10, 0.4));
  const handleResetZoom = () => setZoom(1);

  useEffect(() => {
    if (viewMode === 'diagram' && containerRef.current && code) {
      containerRef.current.innerHTML = '';
      setRenderError(false);
      const uniqueId = `mermaid-chat-${Math.random().toString(36).substring(2, 9)}`;

      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#080c16',
          primaryColor: '#6366f1',
          primaryTextColor: '#f8fafc',
          primaryBorderColor: '#818cf8',
          lineColor: '#94a3b8',
          secondaryColor: '#1e1b4b',
          tertiaryColor: '#0f172a',
        },
        flowchart: { curve: 'basis', htmlLabels: true },
        securityLevel: 'loose',
      });

      mermaid.parse(code, { suppressErrors: true })
        .then(() => mermaid.render(uniqueId, code))
        .then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            const svgEl = containerRef.current.querySelector('svg');
            if (svgEl) {
              svgEl.removeAttribute('height');
              svgEl.style.width = '100%';
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.minHeight = '220px';
              svgEl.style.display = 'block';
              svgEl.style.margin = '0 auto';
            }
          }
        })
        .catch(() => {
          setRenderError(true);
        });
    }
  }, [code, viewMode]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="mermaid-block-wrapper my-4 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#080c16] shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0d121f] border-b border-white/[0.08] text-xs font-mono text-slate-300">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
          <span className="text-indigo-200 font-semibold">Mermaid Visual Diagram</span>
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
        <div className="p-4 overflow-auto max-h-[640px] flex items-start justify-center min-h-[240px] bg-gradient-to-b from-[#080c16] to-[#0a0f1d]">
          <div
            ref={containerRef}
            className="w-full flex justify-center transition-transform duration-200 ease-out origin-top"
            style={{
              transform: `scale(${zoom})`,
            }}
          />
        </div>
      ) : (
        <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre bg-[#04060a]">
          <code>{code}</code>
        </pre>
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
