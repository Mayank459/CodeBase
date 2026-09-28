import React, { useState, useRef, useEffect } from 'react';
import {
  Copy, Check, Terminal, ExternalLink, Eye, Code, ZoomIn, ZoomOut, RotateCcw,
  Maximize2, Minimize2, Move, Download, Image as ImageIcon,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Minus
} from 'lucide-react';
import { getMermaidLiveUrl } from '../api';
import { MermaidDiagram, downloadMermaidSvg, downloadMermaidPng } from './MermaidDiagram';

function sanitizeMermaid(raw) {
  if (!raw) return '';
  let text = String(raw).trim();

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Strip code fences if present
  text = text.replace(/^```(?:mermaid|flowchart|diagram)?\s*/i, '').replace(/```\s*$/i, '').trim();

  const keywords = [
    'classDiagram', 'classDiagram-v2', 'graph ', 'graph\n', 'flowchart',
    'sequenceDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt',
    'pie', 'mindmap', 'gitGraph', 'timeline', 'C4Context'
  ];

  // Filter out any lines after mermaid block (e.g. if markdown headers are included)
  const rawLines = text.split('\n');
  const cleanLines = [];
  let foundStart = false;

  for (let line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!foundStart) {
      if (keywords.some(k => trimmed.startsWith(k))) {
        foundStart = true;
        cleanLines.push(trimmed);
      }
      continue;
    }

    // Stop if a markdown header or section separator is encountered
    if (/^#{1,6}\s+/.test(trimmed) || trimmed.startsWith('---') || trimmed.startsWith('***')) {
      break;
    }

    // Skip ellipses, truncation indicators, or bullet points without arrows
    if (/^(\.{3,}|…|etc\.?)$/.test(trimmed)) continue;
    if (/^[-*]\s+/.test(trimmed) && !trimmed.includes('-->') && !trimmed.includes('---')) continue;

    cleanLines.push(line);
  }

  if (!foundStart || cleanLines.length === 0) {
    text = `flowchart TD\n${text}`;
  } else {
    text = cleanLines.join('\n');
  }

  // Sanitize flowchart and graph lines: ensure special characters inside brackets are safely quoted
  if (text.startsWith('flowchart') || text.startsWith('graph')) {
    const lines = text.split('\n').map((line) => {
      let l = line.trimEnd();
      l = l.replace(/;+$/, '');
      // Normalize raw '&' inside brackets to 'and' to prevent parser syntax errors
      l = l.replace(/\[([^\]]+)\]/g, (match, inner) => {
        return `[${inner.replace(/&/g, 'and')}]`;
      });
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

  // Normalize line endings to Unix \n so regex matches reliably on Windows / CRLF
  const normalizedContent = String(content).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split markdown into code blocks vs regular paragraphs/headers/tables
  const parts = [];
  const regex = /```([a-zA-Z0-9_-]*)[ \t]*\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(normalizedContent)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        text: normalizedContent.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'text',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < normalizedContent.length) {
    parts.push({
      type: 'markdown',
      text: normalizedContent.slice(lastIndex),
    });
  }

  return (
    <div className="markdown-body chat-prose space-y-4 text-ink text-[16px] leading-[1.7]">
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
    <div className="code-block-wrapper">
      <div className="code-header">
        <div className="flex items-center gap-2">
          <Terminal size={14} strokeWidth={2} />
          <span>{lang || 'code'}</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-sm px-1.5 py-0.5 text-xs font-mono text-plate-dim hover:text-plate-ink"
          title="Copy code"
        >
          {copied ? <Check size={14} strokeWidth={2} /> : <Copy size={14} strokeWidth={2} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-content text-[12.5px]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function MermaidSnippet({ code }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diagram');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'maximized' | 'minimized' | 'closed'
  const viewportRef = useRef(null);

  const isMax = windowState === 'maximized';

  // Fullscreen global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      if (windowState !== 'maximized') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        setWindowState('normal');
      } else if (e.key === 'd' || e.key === 'D') {
        setViewMode('diagram');
      } else if (e.key === 's' || e.key === 'S') {
        setViewMode('code');
      } else if (e.key === 'r' || e.key === 'R' || e.key === '0') {
        handleResetZoom();
      } else if (e.key === '+' || e.key === '=') {
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        handleZoomOut();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [windowState]);

  const sanitized = sanitizeMermaid(code);
  const liveUrl = getMermaidLiveUrl(sanitized || code);

  const handleZoomIn = () => setZoom((z) => Math.min(Math.round((z + 0.25) * 100) / 100, 3.5));
  const handleZoomOut = () => setZoom((z) => Math.max(Math.round((z - 0.25) * 100) / 100, 0.4));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handlePan = (dx, dy) => {
    setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handleKeyDown = (e) => {
    const step = 50;
    if (e.key === 'ArrowUp') { e.preventDefault(); handlePan(0, step); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); handlePan(0, -step); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); handlePan(step, 0); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); handlePan(-step, 0); }
    else if (e.key === 'r' || e.key === 'R') { handleResetZoom(); }
    else if (e.key === '+' || e.key === '=') { handleZoomIn(); }
    else if (e.key === '-' || e.key === '_') { handleZoomOut(); }
  };

  // Universal pointer pan handler (mouse, touch, trackpad, stylus)
  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    setIsDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startPanX = pan.x;
    const startPanY = pan.y;

    const onPointerMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;
      setPan({
        x: Math.round(startPanX + dx),
        y: Math.round(startPanY + dy),
      });
    };

    const onPointerUp = () => {
      setIsDragging(false);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
  };

  const [showScrollHint, setShowScrollHint] = useState(false);
  const hintTimeoutRef = useRef(null);
  const isMacPlatform = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const modKeyText = isMacPlatform ? '⌘ Cmd' : 'Ctrl';

  // Smart non-conflicting wheel zoom listener
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const onWheel = (e) => {
      // 1. If in Fullscreen (isMax) or holding modifier key (Ctrl/Cmd) or trackpad pinch-to-zoom (emits ctrlKey):
      if (isMax || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
        setZoom((prev) => +(Math.min(Math.max(0.4, prev + zoomDelta), 3.5)).toFixed(2));
      } else {
        // 2. Normal wheel scroll without Ctrl in normal view:
        // Do NOT call e.preventDefault() -> allows main page to scroll smoothly!
        // Show momentary hint badge so the user knows they can Ctrl+scroll to zoom
        setShowScrollHint(true);
        if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
        hintTimeoutRef.current = setTimeout(() => {
          setShowScrollHint(false);
        }, 1400);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
    };
  }, [viewMode, isMax]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(sanitized || code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleDownloadSvg = async () => {
    try {
      await downloadMermaidSvg(sanitized || code, `diagram_${Date.now()}.svg`);
    } catch (err) {
      console.error('Download SVG failed:', err);
    }
  };

  const handleDownloadPng = async () => {
    try {
      await downloadMermaidPng(sanitized || code, `diagram_${Date.now()}.png`);
    } catch (err) {
      console.error('Download PNG failed:', err);
    }
  };

  const seg = (on) => `btn btn-sm ${on ? 'bg-ink text-pulp shadow-lift-1' : 'btn-secondary'}`;
  const tool = 'btn btn-secondary btn-sm';

  // 1. Minimized Dock State
  if (windowState === 'minimized') {
    return (
      <div className="my-4 paper-flat px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="strip text-ash">Minimized</span>
          <span className="font-semibold text-ink">Mermaid diagram</span>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setWindowState('normal')} className={tool}>
            Restore
          </button>
          <button
            type="button"
            onClick={() => setWindowState('maximized')}
            className={tool}
            aria-label="Open diagram full screen"
            title="Open diagram full screen"
          >
            <Maximize2 size={14} strokeWidth={2} />
          </button>
          <button
            type="button"
            onClick={() => setWindowState('closed')}
            className="btn btn-ghost btn-sm"
            aria-label="Close diagram"
            title="Close diagram"
          >
            <X size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Closed State
  if (windowState === 'closed') {
    return (
      <div className="my-4 paper-flat p-6 text-center space-y-3">
        <p className="text-sm text-ink-2">The diagram is closed. Reopen it to view it again.</p>
        <button type="button" onClick={() => setWindowState('normal')} className={tool}>
          <Eye size={14} strokeWidth={2} />
          <span>Reopen diagram</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`mermaid-block-wrapper ${
      isMax
        ? 'fixed inset-0 z-[999] bg-kraft p-2 sm:p-4 flex flex-col'
        : 'my-4'
    }`}>
      <div className={isMax ? 'paper flex flex-col h-full overflow-hidden p-3 sm:p-4 gap-3' : 'flex flex-col gap-2'}>
        {/* Diagram toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 rule-b flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="strip text-ash whitespace-nowrap">Mermaid diagram</span>
            {isMax && <span className="text-xs text-ash whitespace-nowrap">Press Esc to exit</span>}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            <div className="flex items-center gap-1" role="group" aria-label="View mode">
              <button
                type="button"
                onClick={() => setViewMode('diagram')}
                aria-pressed={viewMode === 'diagram'}
                aria-label="Show diagram"
                className={seg(viewMode === 'diagram')}
                title="Show diagram (D)"
              >
                <Eye size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                aria-pressed={viewMode === 'code'}
                aria-label="Show Mermaid source"
                className={seg(viewMode === 'code')}
                title="Show Mermaid source (S)"
              >
                <Code size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Source</span>
              </button>
            </div>

            {viewMode === 'diagram' && (
              <>
                <button type="button" onClick={handleDownloadSvg} className={tool} title="Export as SVG">
                  <Download size={14} strokeWidth={2} />
                  <span>SVG</span>
                </button>
                <button type="button" onClick={handleDownloadPng} className={tool} title="Export as PNG">
                  <ImageIcon size={14} strokeWidth={2} />
                  <span>PNG</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className={tool}
              aria-label={copied ? 'Copied Mermaid source' : 'Copy Mermaid source'}
              title="Copy Mermaid source"
            >
              {copied ? <Check size={14} strokeWidth={2} className="text-forest" /> : <Copy size={14} strokeWidth={2} />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className={tool}
                aria-label="Open in Mermaid Live editor"
                title="Open in Mermaid Live editor"
              >
                <ExternalLink size={14} strokeWidth={2} />
                <span className="hidden sm:inline">Live</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => setWindowState(isMax ? 'normal' : 'maximized')}
              className={tool}
              title={isMax ? 'Exit full screen (Esc)' : 'Full screen'}
            >
              {isMax ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
              <span>{isMax ? 'Exit (Esc)' : 'Full screen'}</span>
            </button>
            <button
              type="button"
              onClick={() => setWindowState('minimized')}
              className="btn btn-ghost btn-sm"
              aria-label="Minimize diagram"
              title="Minimize diagram"
            >
              <Minus size={14} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={() => setWindowState('closed')}
              className="btn btn-ghost btn-sm"
              aria-label="Close diagram"
              title="Close diagram"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Viewport */}
        <div className={`relative w-full flex flex-col ${isMax ? 'flex-1 min-h-0' : ''}`}>
          {viewMode === 'diagram' ? (
            <>
              <div
                ref={viewportRef}
                tabIndex={0}
                onKeyDown={handleKeyDown}
                onPointerDown={handlePointerDown}
                onDoubleClick={handleResetZoom}
                style={{ touchAction: 'none' }}
                aria-label="Diagram canvas. Drag or use arrow keys to pan."
                className={`paper-flat bg-[#fbf8f2] w-full flex items-center justify-center relative overflow-hidden select-none ${
                  isMax ? 'flex-1 min-h-0' : 'p-4 sm:p-6 h-[520px] max-h-[70vh] min-h-[280px]'
                } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
              >
                <div
                  className="w-full h-full flex items-center justify-center origin-center select-none"
                  style={{
                    transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                    transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                    willChange: 'transform'
                  }}
                >
                  <MermaidDiagram
                    code={sanitized || code}
                    label="Diagram"
                    className="max-w-full max-h-full select-none pointer-events-none"
                    onError={() => setViewMode('code')}
                  />
                </div>

                {/* Momentary scroll-to-zoom hint */}
                {showScrollHint && !isMax && (
                  <div className="absolute inset-x-0 top-3 z-30 flex justify-center pointer-events-none">
                    <div className="paper px-3 py-1.5 text-sm text-ink flex items-center gap-2">
                      <kbd className="font-mono text-xs px-1.5 py-0.5 rounded-sm bg-pulp-2 border border-rule">{modKeyText}</kbd>
                      <span>+ scroll to zoom</span>
                    </div>
                  </div>
                )}

                {/* Zoom and pan controls */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 pointer-events-auto">
                  <button type="button" onClick={handleZoomOut} disabled={zoom <= 0.4} className={tool} aria-label="Zoom out" title="Zoom out (-)">
                    <ZoomOut size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={handleResetZoom} className={`${tool} font-mono tabular-nums`} aria-label="Reset zoom to 100%" title="Reset zoom (R / 0)">
                    {Math.round(zoom * 100)}%
                  </button>
                  <button type="button" onClick={handleZoomIn} disabled={zoom >= 3.5} className={tool} aria-label="Zoom in" title="Zoom in (+)">
                    <ZoomIn size={14} strokeWidth={2} />
                  </button>
                  <span className="w-2" aria-hidden="true" />
                  <button type="button" onClick={() => handlePan(60, 0)} className={tool} aria-label="Pan left" title="Pan left">
                    <ChevronLeft size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handlePan(0, 60)} className={tool} aria-label="Pan up" title="Pan up">
                    <ChevronUp size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handlePan(0, -60)} className={tool} aria-label="Pan down" title="Pan down">
                    <ChevronDown size={14} strokeWidth={2} />
                  </button>
                  <button type="button" onClick={() => handlePan(-60, 0)} className={tool} aria-label="Pan right" title="Pan right">
                    <ChevronRight size={14} strokeWidth={2} />
                  </button>
                  <span className="w-2" aria-hidden="true" />
                  <button type="button" onClick={handleResetZoom} className={tool} aria-label="Center and reset view" title="Center and reset view (double-click or R)">
                    <RotateCcw size={14} strokeWidth={2} />
                    <span className="hidden sm:inline">Center</span>
                  </button>
                </div>
              </div>

              <p className="hidden md:flex items-center gap-2 pt-2 text-xs text-ash flex-shrink-0">
                <Move size={14} strokeWidth={2} />
                <span>Drag or use arrow keys to pan · {isMax ? 'Scroll' : `${modKeyText} + scroll`} to zoom · Double-click to reset</span>
              </p>
            </>
          ) : (
            <div className={`ink-plate overflow-auto ${isMax ? 'flex-1 min-h-0' : 'max-h-[520px]'}`}>
              <pre className="p-4 font-mono text-[12.5px] whitespace-pre">
                <code>{sanitized || code}</code>
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleMarkdownRenderer({ text }) {
  // Parse lines for headers 1-6, ordered/unordered lists, task lists, blockquotes, tables, bold, code, links
  const lines = text.split('\n');
  const renderedElements = [];
  let unorderedItems = [];
  let orderedItems = [];
  let tableRows = [];

  const flushUnorderedList = () => {
    if (unorderedItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${renderedElements.length}`} className="pl-6 space-y-1.5 my-2.5 text-ink-2">
          {unorderedItems.map((item, i) => {
            // Task list check: [ ] or [x]
            const taskMatch = item.match(/^\[([ xX])\]\s*(.*)$/);
            if (taskMatch) {
              const isChecked = taskMatch[1].toLowerCase() === 'x';
              return (
                <li key={i} className="list-none -ml-5 flex items-start gap-2.5 my-1">
                  <span
                    role="img"
                    aria-label={isChecked ? 'Done' : 'Not done'}
                    className={`inline-flex items-center justify-center h-4 w-4 rounded-sm mt-1 border shrink-0 ${
                      isChecked
                        ? 'bg-[var(--forest-wash)] border-forest text-forest'
                        : 'bg-pulp-2 border-rule'
                    }`}
                  >
                    {isChecked && <Check size={12} strokeWidth={2.5} />}
                  </span>
                  <span>{formatInline(taskMatch[2])}</span>
                </li>
              );
            }
            return <li key={i}>{formatInline(item)}</li>;
          })}
        </ul>
      );
      unorderedItems = [];
    }
  };

  const flushOrderedList = () => {
    if (orderedItems.length > 0) {
      renderedElements.push(
        <ol key={`ol-${renderedElements.length}`} className="list-decimal pl-6 space-y-1.5 my-2.5 text-ink-2 marker:text-ash">
          {orderedItems.map((item, i) => (
            <li key={i} className="pl-1">
              {formatInline(item)}
            </li>
          ))}
        </ol>
      );
      orderedItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      renderedElements.push(
        <div key={`table-${renderedElements.length}`} className="overflow-x-auto my-3.5">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="rule-b">
                {header.map((col, idx) => (
                  <th key={idx} className="strip text-ash px-3 py-2">
                    {formatInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="rule-b">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 text-ink-2 text-sm align-top">
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

  const flushAll = () => {
    flushUnorderedList();
    flushOrderedList();
    flushTable();
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table line: | col 1 | col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushUnorderedList();
      flushOrderedList();
      const cells = trimmed.slice(1, -1).split('|');
      const isSep = cells.every(c => /^[\s-:]+$/.test(c));
      if (!isSep) {
        tableRows.push(cells);
      }
      return;
    } else {
      flushTable();
    }

    // Ordered List item: 1. 2. 10.
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (orderedMatch) {
      flushUnorderedList();
      orderedItems.push(orderedMatch[2]);
      return;
    } else {
      flushOrderedList();
    }

    // Unordered List item: - or * or +
    const unorderedMatch = trimmed.match(/^[-*+]\s+(.*)$/);
    if (unorderedMatch) {
      flushOrderedList();
      unorderedItems.push(unorderedMatch[1]);
      return;
    } else {
      flushUnorderedList();
    }

    // Horizontal Rule: --- or *** or ___
    if (/^(?:---|\*\*\*|___)$/.test(trimmed)) {
      flushAll();
      renderedElements.push(<hr key={idx} className="my-5 border-0 rule-t" />);
      return;
    }

    // Headings: 1 to 6 hashes (#, ##, ###, ####, #####, ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s*(.*)$/);
    if (headingMatch) {
      flushAll();
      const level = headingMatch[1].length;
      const headingContent = headingMatch[2].replace(/\s*#+\s*$/, '').trim();

      if (level === 1) {
        renderedElements.push(
          <h2 key={idx} className="font-cond font-bold text-ink text-2xl mt-6 mb-3 pb-2 rule-b">
            {formatInline(headingContent)}
          </h2>
        );
      } else if (level === 2) {
        renderedElements.push(
          <h3 key={idx} className="font-cond font-bold text-ink text-xl mt-5 mb-2.5">
            {formatInline(headingContent)}
          </h3>
        );
      } else if (level === 3) {
        renderedElements.push(
          <h4 key={idx} className="font-cond font-bold text-ink text-lg mt-4 mb-2">
            {formatInline(headingContent)}
          </h4>
        );
      } else if (level === 4) {
        renderedElements.push(
          <h5 key={idx} className="font-cond font-bold text-ink text-base mt-3.5 mb-1.5">
            {formatInline(headingContent)}
          </h5>
        );
      } else {
        // level 5 or 6
        renderedElements.push(
          <h6 key={idx} className="strip text-ash mt-3 mb-1">
            {formatInline(headingContent)}
          </h6>
        );
      }
      return;
    }

    // Callout / Blockquote
    if (trimmed.startsWith('>')) {
      flushAll();
      const calloutText = trimmed.replace(/^>\s*/, '');
      const isAlert = calloutText.startsWith('[!WARNING]') || calloutText.startsWith('[!IMPORTANT]');
      const isTip = calloutText.startsWith('[!TIP]') || calloutText.startsWith('[!NOTE]');
      renderedElements.push(
        <div
          key={idx}
          className={`my-3 border-l pl-4 italic text-ink-2 ${
            isAlert
              ? 'border-ochre bg-[var(--ochre-wash)] py-2 pr-3'
              : isTip
              ? 'border-ink bg-pulp-2 py-2 pr-3'
              : 'border-ink py-1'
          }`}
        >
          {formatInline(calloutText.replace(/\[!(WARNING|IMPORTANT|TIP|NOTE)\]/, '').trim())}
        </div>
      );
      return;
    }

    // Blank line
    if (!trimmed) {
      flushAll();
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Standard paragraph
    renderedElements.push(
      <p key={idx} className="text-ink-2">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushAll();

  return <>{renderedElements}</>;
}

function formatInline(str) {
  if (!str) return '';
  const tokens = [];
  // Tokenize `code`, **bold**, __bold__, *italic*, links [text](url), strikethrough ~~del~~
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|(?<!\*)\*[^*]+\*(?!\*)|\[([^\]]+)\]\(([^)]+)\)|~~[^~]+~~)/g;
  let last = 0;
  let m;

  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) {
      tokens.push(str.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith('`')) {
      tokens.push(
        <code key={m.index} className="font-mono text-ink bg-pulp-2 px-1 rounded-sm text-[0.875em]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      tokens.push(
        <strong key={m.index} className="font-semibold text-ink">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      tokens.push(
        <em key={m.index} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('~~')) {
      tokens.push(
        <del key={m.index} className="line-through text-ash">
          {token.slice(2, -2)}
        </del>
      );
    } else if (token.startsWith('[')) {
      const linkText = m[2];
      const linkUrl = m[3];
      const isFileLink = linkUrl.startsWith('file://');
      tokens.push(
        <a
          key={m.index}
          href={linkUrl}
          target="_blank"
          rel="noreferrer"
          className={
            isFileLink
              ? 'evidence-pill'
              : 'inline-flex items-center gap-1 text-ink underline underline-offset-2 decoration-ink/40 hover:decoration-ink'
          }
          title={linkUrl}
        >
          <span>{linkText}</span>
          {!isFileLink && <ExternalLink size={12} strokeWidth={2} className="inline text-ash" />}
        </a>
      );
    }
    last = m.index + token.length;
  }
  if (last < str.length) {
    tokens.push(str.slice(last));
  }
  return tokens;
}

