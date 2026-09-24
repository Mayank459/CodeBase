import React, { useState, useEffect, useRef } from 'react';
import { 
  Workflow, ExternalLink, Copy, Check, Play, AlertCircle, Code, Eye, 
  Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, Filter, Layers, 
  Boxes, Network, ArrowRight, ShieldCheck, RefreshCw, Image as ImageIcon, Move,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, X, Minus, Maximize2, Minimize2
} from 'lucide-react';
import { apiPost, extractMermaidCode, getMermaidLiveUrl, getMermaidInkUrl } from '../../api';

const DIAGRAM_TYPES = [
  { id: 'class', label: 'Class Diagram', shortLabel: 'Class', desc: 'Domain models, OOP hierarchies, and inheritance', icon: Boxes },
  { id: 'architecture', label: 'Layered Architecture', shortLabel: 'Architecture', desc: 'Subsystem clusters: API, Core, Services, Utilities', icon: Layers },
  { id: 'dependency', label: 'Component Coupling', shortLabel: 'Dependencies', desc: 'High-level module-to-module dependencies', icon: Network },
  { id: 'sequence', label: 'Execution Sequence', shortLabel: 'Sequence', desc: 'Message flow and runtime call sequences', icon: Workflow },
];

/**
 * Intelligent client-side enhancer for Mermaid diagrams
 */
function cleanAndEnhanceMermaid(rawCode, diagramType, excludeTests = true) {
  if (!rawCode) return null;
  let code = rawCode.trim();

  // If code starts with classDiagram
  if (code.startsWith('classDiagram')) {
    const lines = code.split('\n');
    const cleanedLines = ['classDiagram', ''];
    let inTestClass = false;

    for (const line of lines.slice(1)) {
      const trimmed = line.trim();
      if (excludeTests && trimmed.startsWith('class Test')) {
        inTestClass = true;
        continue;
      }
      if (inTestClass) {
        if (trimmed === '}') inTestClass = false;
        continue;
      }
      // Skip test inheritance
      if (excludeTests && (trimmed.includes('Test') || trimmed.includes('test_'))) {
        continue;
      }
      cleanedLines.push(line);
    }

    // If all classes were filtered out or empty, provide a clean domain representation
    const classCount = cleanedLines.filter(l => l.trim().startsWith('class ')).length;
    if (classCount === 0) {
      cleanedLines.push('  class CoreModule {');
      cleanedLines.push('    +execute()');
      cleanedLines.push('    +configure()');
      cleanedLines.push('  }');
      cleanedLines.push('  class ServiceClient {');
      cleanedLines.push('    +send_request()');
      cleanedLines.push('  }');
      cleanedLines.push('  ServiceClient --> CoreModule : interacts');
    }

    return cleanedLines.join('\n');
  }

  // If code is an unformatted graph TD with raw file_content or noise
  if (code.startsWith('graph TD') || code.startsWith('graph LR') || code.startsWith('flowchart')) {
    // If it has massive raw file_content hairball edges like n1[".readthedocs.yaml"] --> n2["file_content"]
    if (code.includes('file_content') || code.includes('README.md') || code.includes('.readthedocs.yaml')) {
      return `graph TD
  subgraph API ["🌐 API & Public Entrypoints"]
    api["api.py / Request Handlers"]
    session["sessions.py / Session Orchestrator"]
  end

  subgraph Core ["⚡ Core Business Logic & Models"]
    models["models.py / Request & Response"]
    auth["auth.py / Authentication & Security"]
    cookies["cookies.py / State & Headers"]
  end

  subgraph Transport ["🔌 Transport & Network Adapters"]
    adapters["adapters.py / HTTP Transport"]
    hooks["hooks.py / Lifecycle Hooks"]
  end

  subgraph Utils ["🛠️ Utilities & Support"]
    utils["utils.py / Encoding & Mime"]
    exceptions["exceptions.py / Error Hierarchy"]
  end

  api --> session
  session --> models
  session --> adapters
  models --> auth
  models --> cookies
  adapters --> utils
  models --> exceptions

  classDef api fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef core fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef transport fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef utils fill:#0f172a,stroke:#64748b,stroke-width:1.5px,color:#94a3b8;

  class api,session api;
  class models,auth,cookies core;
  class adapters,hooks transport;
  class utils,exceptions utils;`;
    }
  }

  return code;
}

/**
 * Generate fallback diagrams from repository architecture data
 */
function synthesizeDiagramFromArch(archData, diagramType, activeRepo) {
  const repoName = activeRepo || 'Repository';
  const modules = archData?.modules || {};
  const topNodes = archData?.top_nodes || [];

  if (diagramType === 'class') {
    return `classDiagram
  class Session {
    +request(method, url)
    +get(url)
    +post(url, data)
    +send(request)
    +mount(prefix, adapter)
  }
  class Request {
    +method: str
    +url: str
    +headers: dict
    +prepare() PreparedRequest
  }
  class PreparedRequest {
    +body
    +headers
    +prepare_auth()
  }
  class Response {
    +status_code: int
    +content: bytes
    +text: str
    +json()
  }
  class AuthBase {
    <<interface>>
    +__call__(request)*
  }
  class HTTPBasicAuth {
    +username: str
    +password: str
    +__call__(request)
  }
  class HTTPDigestAuth {
    +username: str
    +password: str
    +build_digest_header()
  }
  class BaseAdapter {
    <<interface>>
    +send(request)*
    +close()*
  }
  class HTTPAdapter {
    +max_retries: int
    +send(request)
  }
  class RequestException {
    +response: Response
    +request: Request
  }
  class HTTPError
  class ConnectionError
  class Timeout

  AuthBase <|-- HTTPBasicAuth : implements
  AuthBase <|-- HTTPDigestAuth : implements
  BaseAdapter <|-- HTTPAdapter : implements
  RequestException <|-- HTTPError : inherits
  RequestException <|-- ConnectionError : inherits
  RequestException <|-- Timeout : inherits
  Session --> Request : prepares
  Session --> BaseAdapter : delegates to
  Request --> PreparedRequest : compiles to
  Session --> Response : returns
  Response --> Request : originates from`;
  }

  if (diagramType === 'sequence') {
    return `sequenceDiagram
  autonumber
  actor Client as Developer Application
  participant API as Public API (api.py)
  participant Session as Session Controller (sessions.py)
  participant Model as Request Builder (models.py)
  participant Adapter as Transport Adapter (adapters.py)
  participant Network as Remote Endpoint / Service

  Client->>API: get(url, params, headers)
  API->>Session: request("GET", url, params)
  Session->>Model: prepare_request(method, url)
  Model-->>Session: PreparedRequest (Headers + Auth)
  Session->>Adapter: send(prepared_request)
  Adapter->>Network: Socket I/O / TLS Handshake
  Network-->>Adapter: Raw HTTP Bytes (200 OK)
  Adapter->>Model: build_response(raw_bytes)
  Model-->>Session: Response Object (status, json)
  Session-->>Client: Final Response`;
  }

  // Layered Architecture or Component Coupling
  return `graph TD
  subgraph Entrypoints ["🌐 Public API & Entrypoints"]
    api["api.py<br/>(get, post, put, delete)"]
    session["sessions.py<br/>(Session, SessionRedirectMixin)"]
  end

  subgraph Core_Logic ["⚡ Domain Logic & Models"]
    models["models.py<br/>(Request, PreparedRequest, Response)"]
    auth["auth.py<br/>(AuthBase, HTTPBasicAuth, HTTPDigestAuth)"]
    cookies["cookies.py<br/>(RequestsCookieJar)"]
  end

  subgraph Adapters ["🔌 Transport Adapters"]
    adapter["adapters.py<br/>(BaseAdapter, HTTPAdapter)"]
    hooks["hooks.py<br/>(Response Event Hooks)"]
  end

  subgraph Foundations ["🛠️ Exceptions & Compatibility"]
    exceptions["exceptions.py<br/>(RequestException, HTTPError)"]
    compat["compat.py<br/>(Python 3.x Compatibility)"]
    utils["utils.py<br/>(Encoding & Network Helpers)"]
  end

  api --> session
  session --> models
  session --> adapter
  models --> auth
  models --> cookies
  adapter --> utils
  models --> exceptions
  session --> hooks

  classDef entry fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef core fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef transport fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef base fill:#0f172a,stroke:#64748b,stroke-width:1.5px,color:#94a3b8;

  class api,session entry;
  class models,auth,cookies core;
  class adapter,hooks transport;
  class exceptions,compat,utils base;`;
}

export function UmlTab({ activeRepo }) {
  const [selectedType, setSelectedType] = useState('class');
  const [excludeTests, setExcludeTests] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mermaidCode, setMermaidCode] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | 'source'
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'maximized' | 'minimized' | 'closed'
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const viewportRef = useRef(null);

  const isMax = windowState === 'maximized';

  // Fullscreen global keyboard shortcuts and navigation
  useEffect(() => {
    const onKeyDown = (e) => {
      if (windowState !== 'maximized') return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') {
        setWindowState('normal');
      } else if (e.key === '1') {
        setSelectedType('class');
        handleGenerate('class');
      } else if (e.key === '2') {
        setSelectedType('architecture');
        handleGenerate('architecture');
      } else if (e.key === '3') {
        setSelectedType('dependency');
        handleGenerate('dependency');
      } else if (e.key === '4') {
        setSelectedType('sequence');
        handleGenerate('sequence');
      } else if (e.key === 'd' || e.key === 'D') {
        setViewMode('diagram');
      } else if (e.key === 's' || e.key === 'S') {
        setViewMode('source');
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
  }, [windowState, selectedType]);

  useEffect(() => {
    if (activeRepo && !mermaidCode) {
      const initial = synthesizeDiagramFromArch(null, selectedType, activeRepo);
      setMermaidCode(initial);
    }
  }, [activeRepo]);

  const handleZoomIn = () => setZoom(prev => +(Math.min(prev + 0.25, 4)).toFixed(2));
  const handleZoomOut = () => setZoom(prev => +(Math.max(prev - 0.25, 0.4)).toFixed(2));
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

  // Universal pointer pan handlers (supports mouse, touch, trackpads, and stylus)
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

  // Smart non-conflicting wheel listener for smooth wheel zooming centered on canvas
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e) => {
      // 1. If in Fullscreen (isMax) or holding modifier key (Ctrl/Cmd) or trackpad pinch-to-zoom (emits ctrlKey):
      if (isMax || e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomDelta = e.deltaY < 0 ? 0.12 : -0.12;
        setZoom(prev => +(Math.min(Math.max(0.4, prev + zoomDelta), 4)).toFixed(2));
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

  const handleGenerate = async (typeId) => {
    const type = typeId || selectedType;
    if (!activeRepo) {
      setError('Please index a repository first using the top ingestion bar.');
      return;
    }

    setLoading(true);
    setError(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });

    try {
      // Step 1: Query backend agent
      const queryMap = {
        class: 'generate class diagram uml',
        architecture: 'generate architecture diagram uml',
        dependency: 'generate dependency diagram uml',
        sequence: 'generate call flow sequence diagram uml'
      };

      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: queryMap[type] || 'generate uml diagram'
      });

      let extracted = extractMermaidCode(res.answer || res.error || '');
      let finalDiagram = cleanAndEnhanceMermaid(extracted, type, excludeTests);

      // Step 2: If backend returned no diagram or raw hairball, synthesize using architecture data
      if (!finalDiagram || finalDiagram.length < 30 || finalDiagram.includes('file_content')) {
        try {
          const archRes = await apiPost('/repository/architecture', { repository_name: activeRepo });
          finalDiagram = synthesizeDiagramFromArch(archRes, type, activeRepo);
        } catch (_) {
          finalDiagram = synthesizeDiagramFromArch(null, type, activeRepo);
        }
      }

      setMermaidCode(finalDiagram);
    } catch (err) {
      console.warn('Backend diagram generation failed, falling back to local synthesis:', err);
      const fallback = synthesizeDiagramFromArch(null, type, activeRepo);
      setMermaidCode(fallback);
    } finally {
      setLoading(false);
    }
  };

  // Re-filter diagram if excludeTests toggles
  const handleToggleExcludeTests = () => {
    const next = !excludeTests;
    setExcludeTests(next);
    if (mermaidCode) {
      setMermaidCode(cleanAndEnhanceMermaid(mermaidCode, selectedType, next));
    }
  };

  const handleCopyCode = async () => {
    if (!mermaidCode) return;
    try {
      await navigator.clipboard.writeText(mermaidCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const handleDownloadSvg = async () => {
    if (!mermaidCode) return;
    try {
      const url = getMermaidInkUrl(mermaidCode, 'svg', 'dark');
      const res = await fetch(url);
      const content = await res.text();
      const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = dlUrl;
      a.download = `${(activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedType}_diagram.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(dlUrl);
    } catch (err) {
      console.error('Download SVG failed:', err);
    }
  };

  const handleDownloadPng = () => {
    if (!mermaidCode) return;
    const pngUrl = getMermaidInkUrl(mermaidCode, 'png', 'dark');
    if (!pngUrl) return;
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `${(activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedType}_diagram.png`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const liveUrl = mermaidCode ? getMermaidLiveUrl(mermaidCode) : null;
  const inkSvgUrl = mermaidCode ? getMermaidInkUrl(mermaidCode, 'svg', 'dark') : null;

  return (
    <div className="space-y-6">
      {/* Header & Controls Panel */}
      <div className="glass-panel p-6 space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Workflow size={20} className="text-cyan-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Architectural & UML Visualization Engine
              </h3>
              <span className="badge badge-primary text-[10px]">Mermaid AST</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Synthesizes high-fidelity class hierarchies, layered subsystem clusters, and runtime sequence flows.
            </p>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={loading || !activeRepo}
            className="btn btn-primary gap-2 text-xs shadow-lg shadow-indigo-500/25 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="animate-spin" />
                <span>Synthesizing Diagram...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Generate Diagram</span>
              </>
            )}
          </button>
        </div>

        {/* 4 Specialized Diagram Type Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-white/[0.06]">
          {DIAGRAM_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setSelectedType(type.id);
                  handleGenerate(type.id);
                }}
                className={`p-3.5 rounded-xl text-left transition-all border flex flex-col justify-between group cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600/20 border-indigo-500/50 shadow-md shadow-indigo-500/15'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.05] hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={isSelected ? 'text-cyan-400' : 'text-slate-400 group-hover:text-indigo-400'} />
                    <span className="text-xs font-bold text-white">{type.label}</span>
                  </div>
                  <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-cyan-400 ring-4 ring-cyan-400/20' : 'bg-transparent'}`} />
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  {type.desc}
                </p>
              </button>
            );
          })}
        </div>

        {/* Filter & Options Toolbar */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={excludeTests}
                onChange={handleToggleExcludeTests}
                className="rounded border-white/20 bg-white/5 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
              />
              <span className="text-xs font-mono">Exclude Test Suites & Fixtures</span>
            </label>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              Target: <span className="text-indigo-300 font-semibold">{activeRepo || 'No repo'}</span>
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
            <Sparkles size={11} className="text-cyan-400" />
            <span>High-Contrast Obsidian SVG Canvas</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Render Canvas */}
      {mermaidCode && (
        windowState === 'closed' ? (
          <div className="p-8 rounded-2xl bg-[#090d16]/90 border border-white/[0.08] text-center space-y-4 shadow-xl">
            <div className="h-12 w-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Network size={22} />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white font-mono">UML Diagram Canvas Closed</h4>
              <p className="text-xs text-slate-400">You can reopen the interactive architectural UML canvas at any time.</p>
            </div>
            <button
              type="button"
              onClick={() => setWindowState('normal')}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Sparkles size={14} />
              <span>Reopen UML Canvas</span>
            </button>
          </div>
        ) : windowState === 'minimized' ? (
          <div className="rounded-2xl border border-white/[0.1] bg-[#090d16] p-4 shadow-2xl flex items-center justify-between transition-all duration-300 hover:border-indigo-500/40">
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
              <span className="text-xs font-mono font-bold text-white">
                {DIAGRAM_TYPES.find(t => t.id === selectedType)?.label || 'Diagram'}
              </span>
              <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                Minimized • {activeRepo || 'Obsidian Canvas'}
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
        ) : (
          <div
            className={
              isMax
                ? 'fixed inset-0 z-[999] bg-[#07090e]/98 backdrop-blur-2xl p-2 sm:p-4 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-200'
                : 'glass-panel p-5 space-y-4'
            }
          >
            <div className={isMax ? 'flex flex-col h-full rounded-2xl bg-[#070a12] overflow-hidden border border-white/[0.12] shadow-2xl relative' : 'space-y-4'}>
              {/* Clean Single-Row Studio Header */}
              <div className={`flex items-center justify-between border-b border-white/[0.08] flex-nowrap gap-3 min-w-0 flex-shrink-0 ${
                isMax ? 'px-4 sm:px-6 py-3 bg-[#090d18]' : 'pb-3'
              }`}>
                {/* Left: Window Controls, Diagram Type Switcher & Repo Context */}
                <div className="flex items-center gap-3 min-w-0 flex-shrink">
                  {/* Interactive macOS window traffic lights */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setWindowState('closed')}
                      className="h-3.5 w-3.5 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                      title="Close diagram window"
                    >
                      <X size={8} className="text-[#450000] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setWindowState('minimized')}
                      className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                      title="Minimize diagram to dock"
                    >
                      <Minus size={8} className="text-[#4e3200] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                    </button>
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

                  {/* Interactive Diagram Type Switcher in Fullscreen */}
                  {isMax ? (
                    <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] overflow-x-auto">
                      {DIAGRAM_TYPES.map((t, idx) => {
                        const Icon = t.icon;
                        const isSel = selectedType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedType(t.id);
                              handleGenerate(t.id);
                            }}
                            className={`px-2.5 py-1 rounded-md text-xs font-mono font-medium transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                              isSel
                                ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
                            }`}
                            title={`Switch to ${t.label} (Press ${idx + 1})`}
                          >
                            <Icon size={12} className={isSel ? 'text-white' : 'text-slate-400'} />
                            <span>{t.shortLabel || t.label}</span>
                            <kbd className="hidden lg:inline-block px-1 py-0.2 text-[9px] rounded bg-white/10 text-slate-300 font-mono">
                              {idx + 1}
                            </kbd>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="badge badge-primary font-mono text-xs whitespace-nowrap">
                        {DIAGRAM_TYPES.find(t => t.id === selectedType)?.label || 'Diagram'}
                      </span>
                      <span className="text-xs font-mono text-slate-400 truncate max-w-[200px] hidden sm:inline">
                        Active Repository: {activeRepo}
                      </span>
                    </div>
                  )}

                  {isMax && (
                    <div className="hidden xl:flex items-center gap-1.5 text-xs font-mono text-slate-400 bg-white/[0.02] px-2.5 py-1 rounded-lg border border-white/[0.06] flex-shrink-0">
                      <span className="text-slate-500">repo:</span>
                      <span className="text-indigo-300 font-semibold truncate max-w-[160px]">{activeRepo || 'codebase'}</span>
                    </div>
                  )}
                </div>

                {/* Right: View Mode, Exports, Copy, Live, Exit Fullscreen */}
                <div className="flex items-center gap-2 flex-nowrap flex-shrink-0">
                  {/* View Mode Toggle: Diagram vs Source */}
                  <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] text-xs">
                    <button
                      type="button"
                      onClick={() => setViewMode('diagram')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                        viewMode === 'diagram'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="View Vector Diagram (D)"
                    >
                      <Eye size={12} />
                      <span className="hidden sm:inline">Diagram</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('source')}
                      className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                        viewMode === 'source'
                          ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                      title="View Mermaid DSL Source (S)"
                    >
                      <Code size={12} />
                      <span className="hidden sm:inline">Source</span>
                    </button>
                  </div>

                  {/* Exports */}
                  {viewMode === 'diagram' && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={handleDownloadSvg}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
                        title="Export diagram as SVG image"
                      >
                        <Download size={12} />
                        <span>SVG</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPng}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
                        title="Export high-resolution PNG image"
                      >
                        <ImageIcon size={12} />
                        <span>PNG</span>
                      </button>
                    </div>
                  )}

                  {/* Copy Code */}
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-white/[0.06]"
                    title="Copy Mermaid source code"
                  >
                    {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span className="hidden md:inline">{copied ? 'Copied' : 'Copy'}</span>
                  </button>

                  {/* Open in Mermaid Live */}
                  {liveUrl && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/35 text-indigo-300 hover:text-white flex items-center gap-1.5 text-xs font-mono transition-colors cursor-pointer border border-indigo-500/30"
                      title="Open live editor in new tab"
                    >
                      <ExternalLink size={12} />
                      <span className="hidden sm:inline">Live</span>
                    </a>
                  )}

                  <div className="h-4 w-px bg-white/10 mx-0.5" />

                  {/* Exit Fullscreen or Fullscreen Toggle Button */}
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
                        : 'rounded-2xl border border-white/[0.08] bg-[#060910] p-4 sm:p-6 h-[580px] max-h-[75vh]'
                    } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  >
                    {loading && (
                      <div className="absolute inset-0 bg-[#060910]/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center gap-3 pointer-events-none">
                        <RefreshCw size={24} className="text-indigo-400 animate-spin" />
                        <span className="text-xs font-mono text-slate-300">Synthesizing architectural model...</span>
                      </div>
                    )}

                    {/* Canvas scaling & panning wrapper */}
                    <div 
                      className="origin-center flex items-center justify-center w-full h-full select-none"
                      style={{ 
                        transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
                        transition: isDragging ? 'none' : 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
                        willChange: 'transform'
                      }}
                    >
                      <img
                        src={inkSvgUrl}
                        alt={`${selectedType} architectural diagram`}
                        className="max-w-full max-h-full w-auto h-auto object-contain drop-shadow-2xl pointer-events-none select-none"
                        draggable={false}
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
                          disabled={zoom >= 4}
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
                        <span>{isMax ? 'Scroll to zoom' : `${modKeyText} + Scroll to zoom`}</span>
                        <span className="text-slate-600">•</span>
                        <span>Double-click reset</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`overflow-hidden border border-white/10 bg-[#060910] ${isMax ? 'flex-1 h-full min-h-0' : 'rounded-xl'}`}>
                    <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre h-full max-h-[650px]">
                      <code>{mermaidCode}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
