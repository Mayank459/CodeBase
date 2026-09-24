import React, { useState, useRef, useEffect } from 'react';
import { 
  Copy, Check, Terminal, ExternalLink, Eye, Code, ZoomIn, ZoomOut, RotateCcw, 
  Maximize2, Minimize2, Move, Download, Image as ImageIcon,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Minus, Sparkles, Network
} from 'lucide-react';
import { getMermaidLiveUrl, getMermaidInkUrl } from '../api';

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
  const inkUrl = getMermaidInkUrl(sanitized || code, 'svg', 'dark');

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
    if (!inkUrl) return;
    try {
      const res = await fetch(inkUrl);
      const content = await res.text();
      const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `diagram_${Date.now()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error('Download SVG failed:', err);
    }
  };

  const handleDownloadPng = () => {
    const pngUrl = getMermaidInkUrl(sanitized || code, 'png', 'dark');
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `diagram_${Date.now()}.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 1. Minimized Dock State
  if (windowState === 'minimized') {
    return (
      <div className="my-4 rounded-2xl border border-white/[0.1] bg-[#090d16] p-4 shadow-2xl flex items-center justify-between transition-all duration-300 hover:border-indigo-500/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWindowState('closed')}
              className="h-3.5 w-3.5 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Close diagram"
            >
              <X size={8} className="text-[#450000] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => setWindowState('normal')}
              className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Restore diagram"
            >
              <Minus size={8} className="text-[#4e3200] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => setWindowState('maximized')}
              className="h-3.5 w-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Maximize diagram to full screen"
            >
              <Maximize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <span className="text-xs font-mono font-bold text-white">Mermaid Visual Diagram</span>
          <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Minimized • Vector Canvas
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setWindowState('normal')}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <span>Restore Window</span>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Closed State
  if (windowState === 'closed') {
    return (
      <div className="p-8 my-4 rounded-2xl bg-[#090d16]/90 border border-white/[0.08] text-center space-y-4 shadow-xl">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Network size={22} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white font-mono">Mermaid Visual Diagram Closed</h4>
          <p className="text-xs text-slate-400">You can reopen the interactive vector diagram canvas at any time.</p>
        </div>
        <button
          type="button"
          onClick={() => setWindowState('normal')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Sparkles size={14} />
          <span>Reopen Diagram</span>
        </button>
      </div>
    );
  }

  return (
    <div className={`mermaid-block-wrapper transition-all duration-200 ${
      isMax 
        ? 'fixed inset-0 z-[999] bg-[#07090e]/98 backdrop-blur-2xl p-2 sm:p-4 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-200' 
        : 'my-4 rounded-xl overflow-hidden border border-indigo-500/20 bg-[#080c16] shadow-xl'
    }`}>
      <div className={isMax ? 'flex flex-col h-full rounded-2xl bg-[#070a12] overflow-hidden border border-white/[0.12] shadow-2xl relative' : 'flex flex-col'}>
        {/* Universal Diagram Toolbar - Clean Single-Row Studio Header */}
        <div className={`flex items-center justify-between border-b border-white/[0.08] flex-nowrap gap-3 min-w-0 flex-shrink-0 ${
          isMax ? 'px-4 sm:px-6 py-3 bg-[#090d18]' : 'px-3.5 py-2.5 bg-[#0d121f]'
        } text-xs font-mono text-slate-300`}>
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            {/* Interactive macOS window traffic lights */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Red Dot = Close */}
              <button
                type="button"
                onClick={() => setWindowState('closed')}
                className="h-3.5 w-3.5 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title="Close diagram window"
              >
                <X size={8} className="text-[#450000] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
              </button>

              {/* Yellow Dot = Minimize */}
              <button
                type="button"
                onClick={() => setWindowState('minimized')}
                className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title="Minimize diagram to dock"
              >
                <Minus size={8} className="text-[#4e3200] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
              </button>

              {/* Green Dot = Maximize / Fullscreen / Restore */}
              <button
                type="button"
                onClick={() => setWindowState(isMax ? 'normal' : 'maximized')}
                className="h-3.5 w-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title={isMax ? 'Exit Fullscreen (Esc)' : 'Maximize to full screen'}
              >
                {isMax ? (
                  <Minimize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                ) : (
                  <Maximize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                )}
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-0.5 flex-shrink-0" />

            <div className="flex items-center gap-2 min-w-0">
              <span className="badge badge-primary font-mono text-xs whitespace-nowrap">
                Mermaid Diagram
              </span>
              {isMax && (
                <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 whitespace-nowrap">
                  Fullscreen (Press Esc)
                </span>
              )}
            </div>
          </div>

          {/* Right: View Mode, Exports, Copy, Live, Exit Fullscreen */}
          <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] text-xs">
              <button
                type="button"
                onClick={() => setViewMode('diagram')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'diagram' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="View Vector Diagram (D)"
              >
                <Eye size={12} />
                <span className="hidden sm:inline">Diagram</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'code' ? 'bg-indigo-600 text-white font-semibold shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
                title="View Mermaid DSL Source (S)"
              >
                <Code size={12} />
                <span className="hidden sm:inline">Source</span>
              </button>
            </div>

            {/* Export SVG */}
            {viewMode === 'diagram' && (
              <button
                type="button"
                onClick={handleDownloadSvg}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
                title="Export diagram as SVG image"
              >
                <Download size={12} />
                <span>SVG</span>
              </button>
            )}

            {/* Export PNG */}
            {viewMode === 'diagram' && (
              <button
                type="button"
                onClick={handleDownloadPng}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
                title="Export high-resolution PNG image"
              >
                <ImageIcon size={12} />
                <span>PNG</span>
              </button>
            )}

            {/* Copy Code */}
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
              title="Copy Mermaid Code"
            >
              {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Open in Live Editor */}
            {liveUrl && (
              <a
                href={liveUrl}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-indigo-500/30"
                title="Open in Mermaid Live Editor"
              >
                <ExternalLink size={12} />
                <span className="hidden sm:inline">Live</span>
              </a>
            )}

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Fullscreen Toggle */}
            <button
              type="button"
              onClick={() => setWindowState(isMax ? 'normal' : 'maximized')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md ${
                isMax
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white'
              }`}
              title={isMax ? 'Exit Fullscreen (Esc)' : 'Maximize diagram to full screen'}
            >
              {isMax ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
              <span>{isMax ? 'Exit (Esc)' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Viewport and Canvas Container */}
        <div className={`relative flex-1 w-full overflow-hidden flex flex-col ${isMax ? 'min-h-0' : ''}`}>
          {viewMode === 'diagram' ? (
            <div 
              ref={viewportRef}
              tabIndex={0}
              onKeyDown={handleKeyDown}
              onPointerDown={handlePointerDown}
              onDoubleClick={handleResetZoom}
              style={{ touchAction: 'none' }}
              className={`w-full flex items-center justify-center relative select-none outline-none ${
                isMax 
                  ? 'flex-1 h-full min-h-0 bg-[#060910]' 
                  : 'p-4 sm:p-6 h-[520px] max-h-[70vh] min-h-[280px] bg-gradient-to-b from-[#080c16] to-[#0a0f1d]'
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
                <img
                  src={inkUrl}
                  alt="Architecture and sequence diagram"
                  className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-2xl select-none pointer-events-none"
                  draggable={false}
                  onError={() => setViewMode('code')}
                />
              </div>

              {/* Momentary Google-Maps-Style Scroll-to-Zoom Hint Toast */}
              {showScrollHint && !isMax && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] z-30 flex items-center justify-center pointer-events-none animate-in fade-in duration-150">
                  <div className="px-4 py-2 rounded-xl bg-[#090d16]/95 border border-indigo-500/40 text-white text-xs font-mono shadow-2xl flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                      {modKeyText}
                    </span>
                    <span>+ Scroll to zoom diagram</span>
                  </div>
                </div>
              )}

              {/* Floating Interactive Canvas Controls Dock */}
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-1.5 rounded-2xl bg-[#090d18]/90 border border-white/[0.12] shadow-2xl backdrop-blur-xl pointer-events-auto">
                {/* Zoom Controls */}
                <div className="flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 0.4}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Zoom Out (-)"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    className="px-2.5 py-1 text-xs font-mono font-bold text-indigo-300 hover:text-white transition-colors cursor-pointer"
                    title="Reset Zoom to 100% (R / 0)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 3.5}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    title="Zoom In (+)"
                  >
                    <ZoomIn size={13} />
                  </button>
                </div>

                {/* Pan Directional Buttons */}
                <div className="flex items-center gap-0.5 bg-white/[0.04] p-0.5 rounded-xl border border-white/[0.06]">
                  <button
                    type="button"
                    onClick={() => handlePan(60, 0)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                    title="Pan Left (←)"
                  >
                    <ChevronLeft size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePan(0, 60)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                    title="Pan Up (↑)"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePan(0, -60)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                    title="Pan Down (↓)"
                  >
                    <ChevronDown size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePan(-60, 0)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer"
                    title="Pan Right (→)"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>

                {/* Center View */}
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-2.5 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-xs font-mono text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors border border-white/[0.06] cursor-pointer"
                  title="Center & Reset View (Double-click or R)"
                >
                  <RotateCcw size={12} />
                  <span className="hidden sm:inline">Center</span>
                </button>

                {/* Floating Guidance Badge */}
                <div className="hidden md:flex items-center gap-2 border-l border-white/10 pl-2.5 text-[11px] font-mono text-slate-400">
                  <span className="flex items-center gap-1 text-indigo-300">
                    <Move size={11} />
                    <span>Drag or arrows</span>
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-300">{isMax ? 'Scroll to zoom' : `${modKeyText} + Scroll`}</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Double-click reset</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative flex-1 overflow-auto bg-[#04060a]">
              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre">
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
        <ul key={`ul-${renderedElements.length}`} className="list-disc pl-6 space-y-1.5 my-2.5 text-slate-200 text-[15.5px] sm:text-[16.5px] leading-[1.8] font-tiempos font-normal">
          {unorderedItems.map((item, i) => {
            // Task list check: [ ] or [x]
            const taskMatch = item.match(/^\[([ xX])\]\s*(.*)$/);
            if (taskMatch) {
              const isChecked = taskMatch[1].toLowerCase() === 'x';
              return (
                <li key={i} className="list-none -ml-5 flex items-start gap-2.5 my-1">
                  <span className={`inline-flex items-center justify-center h-4 w-4 rounded mt-1 border text-[10px] ${
                    isChecked 
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                      : 'bg-white/[0.04] border-white/20 text-transparent'
                  }`}>
                    ✓
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
        <ol key={`ol-${renderedElements.length}`} className="list-decimal pl-6 space-y-1.5 my-2.5 text-slate-200 text-[15.5px] sm:text-[16.5px] leading-[1.8] font-tiempos font-normal">
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
        <div key={`table-${renderedElements.length}`} className="overflow-x-auto my-3.5 border border-white/10 rounded-xl bg-[#090d16]/70 shadow-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.06] border-b border-white/10 text-slate-200">
                {header.map((col, idx) => (
                  <th key={idx} className="p-3 font-semibold font-mono text-xs text-indigo-300 uppercase tracking-wider">
                    {formatInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors">
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
      renderedElements.push(<hr key={idx} className="my-5 border-t border-white/[0.08]" />);
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
          <h2 key={idx} className="text-xl sm:text-2xl font-bold text-white mt-6 mb-3 pb-2 border-b border-white/10 flex items-center gap-2.5 font-tiempos">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-indigo-600 inline-block shrink-0" />
            <span>{formatInline(headingContent)}</span>
          </h2>
        );
      } else if (level === 2) {
        renderedElements.push(
          <h3 key={idx} className="text-lg sm:text-xl font-bold text-white mt-5 mb-2.5 pb-1.5 border-b border-white/[0.07] flex items-center gap-2 font-tiempos">
            <span className="h-3.5 w-1 rounded-full bg-gradient-to-b from-cyan-400 to-indigo-500 inline-block shrink-0" />
            <span>{formatInline(headingContent)}</span>
          </h3>
        );
      } else if (level === 3) {
        renderedElements.push(
          <h4 key={idx} className="text-base sm:text-lg font-semibold text-cyan-200 mt-4 mb-2 flex items-center gap-2 font-tiempos">
            <span className="text-cyan-400/80 font-mono text-xs select-none">§</span>
            <span>{formatInline(headingContent)}</span>
          </h4>
        );
      } else if (level === 4) {
        renderedElements.push(
          <h5 key={idx} className="text-[15px] sm:text-base font-semibold text-indigo-200 mt-3.5 mb-1.5 flex items-center gap-2 font-tiempos">
            <span className="text-indigo-400/70 font-mono text-xs select-none">▸</span>
            <span>{formatInline(headingContent)}</span>
          </h5>
        );
      } else {
        // level 5 or 6
        renderedElements.push(
          <h6 key={idx} className="text-xs sm:text-sm font-semibold text-slate-300 mt-3 mb-1 uppercase tracking-wider font-mono flex items-center gap-2">
            <span className="text-slate-500 text-[10px] select-none">•</span>
            <span>{formatInline(headingContent)}</span>
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
          className={`p-3.5 my-3 border-l-2 rounded-r-xl text-sm leading-relaxed ${
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
      flushAll();
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Standard paragraph with Tiempos font and clean leading
    renderedElements.push(
      <p key={idx} className="text-slate-200 leading-[1.8] text-[15.5px] sm:text-[16.5px] font-normal font-tiempos">
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
        <code key={m.index} className="px-1.5 py-0.5 mx-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-[12.5px] border border-cyan-500/20">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') || token.startsWith('__')) {
      tokens.push(
        <strong key={m.index} className="font-semibold text-white tracking-wide">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*')) {
      tokens.push(
        <em key={m.index} className="italic text-slate-300">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('~~')) {
      tokens.push(
        <del key={m.index} className="line-through text-slate-400">
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
          className={`inline-flex items-center gap-1 font-mono text-[13px] px-1.5 py-0.5 rounded transition-all ${
            isFileLink 
              ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/25 hover:bg-cyan-500/20 hover:text-cyan-100'
              : 'text-indigo-400 hover:text-indigo-300 underline underline-offset-2'
          }`}
          title={linkUrl}
        >
          <span>{linkText}</span>
          {!isFileLink && <ExternalLink size={10} className="inline opacity-70" />}
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

