import React, { useState, useEffect, useRef } from 'react';
import {
  Workflow, ExternalLink, Copy, Check, Play, AlertCircle, Code, Eye,
  ZoomIn, ZoomOut, RotateCcw, Download, Layers, Boxes, Network, RefreshCw,
  Image as ImageIcon, Move, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  X, Minus, Maximize2, Minimize2
} from 'lucide-react';
import { apiPost, extractMermaidCode, getMermaidLiveUrl } from '../../api';
import { MermaidDiagram, downloadMermaidSvg, downloadMermaidPng } from '../MermaidDiagram';

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
      cleanedLines.push(SAMPLE_TAG.trim());
    }

    return cleanedLines.join('\n');
  }

  // If code is an unformatted graph TD with raw file_content or noise
  if (code.startsWith('graph TD') || code.startsWith('graph LR') || code.startsWith('flowchart')) {
    // If it has massive raw file_content hairball edges like n1[".readthedocs.yaml"] --> n2["file_content"]
    if (code.includes('file_content') || code.includes('README.md') || code.includes('.readthedocs.yaml')) {
      return `graph TD
  subgraph API ["API & Public Entrypoints"]
    api["api.py / Request Handlers"]
    session["sessions.py / Session Orchestrator"]
  end

  subgraph Core ["Core Business Logic & Models"]
    models["models.py / Request & Response"]
    auth["auth.py / Authentication & Security"]
    cookies["cookies.py / State & Headers"]
  end

  subgraph Transport ["Transport & Network Adapters"]
    adapters["adapters.py / HTTP Transport"]
    hooks["hooks.py / Lifecycle Hooks"]
  end

  subgraph Utils ["Utilities & Support"]
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

  classDef api fill:#f2ece1,stroke:#2a2724,stroke-width:1.5px,color:#2a2724;
  classDef core fill:#e8e0d2,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef transport fill:#d6ccbc,stroke:#4a443d,stroke-width:1.25px,color:#2a2724;
  classDef utils fill:#fbf8f2,stroke:#6b645b,stroke-width:1px,color:#4a443d;

  class api,session api;
  class models,auth,cookies core;
  class adapters,hooks transport;
  class utils,exceptions utils;` + SAMPLE_TAG;
    }
  }

  return code;
}

/**
 * Generate fallback diagrams from repository architecture data
 */
// Hand-drawn diagrams are tagged with a Mermaid comment so the UI can label them honestly.
const SAMPLE_TAG = '\n%% sample';
const markSample = (code) => (code && !code.includes(SAMPLE_TAG) ? code + SAMPLE_TAG : code);

function synthesizeDiagramFromArch(archData, diagramType, activeRepo) {
  return markSample(drawSampleDiagram(archData, diagramType, activeRepo));
}

function drawSampleDiagram(archData, diagramType, activeRepo) {
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
  subgraph Entrypoints ["Public API & Entrypoints"]
    api["api.py<br/>(get, post, put, delete)"]
    session["sessions.py<br/>(Session, SessionRedirectMixin)"]
  end

  subgraph Core_Logic ["Domain Logic & Models"]
    models["models.py<br/>(Request, PreparedRequest, Response)"]
    auth["auth.py<br/>(AuthBase, HTTPBasicAuth, HTTPDigestAuth)"]
    cookies["cookies.py<br/>(RequestsCookieJar)"]
  end

  subgraph Adapters ["Transport Adapters"]
    adapter["adapters.py<br/>(BaseAdapter, HTTPAdapter)"]
    hooks["hooks.py<br/>(Response Event Hooks)"]
  end

  subgraph Foundations ["Exceptions & Compatibility"]
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

  classDef entry fill:#f2ece1,stroke:#2a2724,stroke-width:1.5px,color:#2a2724;
  classDef core fill:#e8e0d2,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef transport fill:#d6ccbc,stroke:#4a443d,stroke-width:1.25px,color:#2a2724;
  classDef base fill:#fbf8f2,stroke:#6b645b,stroke-width:1px,color:#4a443d;

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

  const exportName = (ext) => `${(activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedType}_diagram.${ext}`;

  const handleDownloadSvg = async () => {
    if (!mermaidCode) return;
    try {
      await downloadMermaidSvg(mermaidCode, exportName('svg'));
    } catch (err) {
      console.error('Download SVG failed:', err);
    }
  };

  const handleDownloadPng = async () => {
    if (!mermaidCode) return;
    try {
      await downloadMermaidPng(mermaidCode, exportName('png'));
    } catch (err) {
      console.error('Download PNG failed:', err);
    }
  };

  const liveUrl = mermaidCode ? getMermaidLiveUrl(mermaidCode) : null;

  const typeLabel = DIAGRAM_TYPES.find(t => t.id === selectedType)?.label || 'Diagram';
  const seg = (on) => `btn btn-sm ${on ? 'bg-ink text-pulp shadow-lift-1' : 'btn-secondary'}`;
  const tool = 'btn btn-secondary btn-sm';

  return (
    <div className="space-y-4">
      {/* Toolbar: diagram type, filter, generate */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Diagram type">
          {DIAGRAM_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            return (
              <button
                key={type.id}
                type="button"
                aria-pressed={isSelected}
                title={`${type.label}: ${type.desc}`}
                onClick={() => {
                  setSelectedType(type.id);
                  handleGenerate(type.id);
                }}
                className={seg(isSelected)}
              >
                <Icon size={14} strokeWidth={2} />
                <span>{type.shortLabel}</span>
              </button>
            );
          })}
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={excludeTests}
            onChange={handleToggleExcludeTests}
            className="h-3.5 w-3.5 accent-crimson"
          />
          <span>Exclude tests and fixtures</span>
        </label>

        <button
          type="button"
          onClick={() => handleGenerate()}
          disabled={loading || !activeRepo}
          className="btn btn-primary sm:ml-auto"
        >
          {loading ? <RefreshCw size={14} strokeWidth={2} className="animate-spin" /> : <Play size={14} strokeWidth={2} />}
          <span>{loading ? 'Generating diagram' : 'Generate diagram'}</span>
        </button>
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="flex items-center gap-2 font-semibold text-crimson">
            <AlertCircle size={16} strokeWidth={2} />
            <span>No diagram generated</span>
          </p>
          <p className="mt-1 text-ink-2">{error}</p>
        </div>
      )}

      {/* Render Canvas */}
      {mermaidCode && (
        windowState === 'closed' ? (
          <div className="paper-flat p-6 text-center space-y-3">
            <p className="text-sm text-ink-2">The diagram is closed. Reopen it to keep working.</p>
            <button type="button" onClick={() => setWindowState('normal')} className={tool}>
              <Eye size={14} strokeWidth={2} />
              <span>Reopen diagram</span>
            </button>
          </div>
        ) : windowState === 'minimized' ? (
          <div className="paper-flat px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="strip text-ash">Minimized</span>
              <span className="font-semibold text-ink">{typeLabel}</span>
              {activeRepo && <span className="text-sm font-mono text-ash truncate">{activeRepo}</span>}
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
        ) : (
          <div className={isMax ? 'fixed inset-0 z-[999] bg-kraft p-2 sm:p-4 flex flex-col' : ''}>
            <div className={isMax ? 'paper flex flex-col h-full overflow-hidden p-3 sm:p-4 gap-3' : 'space-y-3'}>
              {/* Diagram header: title or type switcher, view mode, exports, window */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 rule-b flex-shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {isMax ? (
                    <div className="flex items-center gap-1 overflow-x-auto" role="group" aria-label="Diagram type">
                      {DIAGRAM_TYPES.map((t, idx) => {
                        const Icon = t.icon;
                        const isSel = selectedType === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            aria-pressed={isSel}
                            onClick={() => {
                              setSelectedType(t.id);
                              handleGenerate(t.id);
                            }}
                            className={seg(isSel)}
                            title={`Switch to ${t.label} (press ${idx + 1})`}
                          >
                            <Icon size={14} strokeWidth={2} />
                            <span>{t.shortLabel || t.label}</span>
                            <kbd className="hidden lg:inline font-mono text-[10px] opacity-70">{idx + 1}</kbd>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <h4 className="font-cond font-bold text-ink text-lg whitespace-nowrap">{typeLabel}</h4>
                  )}
                  {activeRepo && (
                    <span className="text-sm font-mono text-ash truncate max-w-[200px] hidden sm:inline">{activeRepo}</span>
                  )}
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
                      onClick={() => setViewMode('source')}
                      aria-pressed={viewMode === 'source'}
                      aria-label="Show Mermaid source"
                      className={seg(viewMode === 'source')}
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
                    onClick={handleCopyCode}
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
                      aria-label={`${typeLabel} canvas. Drag or use arrow keys to pan.`}
                      className={`paper-flat bg-[#fbf8f2] w-full flex items-center justify-center relative overflow-hidden select-none ${
                        isMax ? 'flex-1 min-h-0' : 'p-4 sm:p-6 h-[580px] max-h-[75vh]'
                      } ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                    >
                      {loading && (
                        <div className="absolute inset-0 z-20 bg-pulp/90 flex items-center justify-center gap-3 pointer-events-none">
                          <div className="flex items-center gap-1">
                            <span className="thinking-dot" />
                            <span className="thinking-dot" />
                            <span className="thinking-dot" />
                          </div>
                          <span className="text-sm text-ink-2">Generating diagram from the repository</span>
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
                        <MermaidDiagram
                          code={mermaidCode}
                          label={`${selectedType} diagram`}
                          className="max-w-full max-h-full pointer-events-none select-none"
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
                        <button type="button" onClick={handleZoomIn} disabled={zoom >= 4} className={tool} aria-label="Zoom in" title="Zoom in (+)">
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

                    {mermaidCode?.includes(SAMPLE_TAG.trim()) && (
                      <p className="pt-2 text-sm text-ochre">
                        Sample diagram drawn by hand, not generated from this index. The backend has not returned a diagram{activeRepo ? ` for ${activeRepo}` : ''} yet; press Generate to try.
                      </p>
                    )}
                    <p className="hidden md:flex items-center gap-2 pt-2 text-xs text-ash flex-shrink-0">
                      <Move size={14} strokeWidth={2} />
                      <span>Drag or use arrow keys to pan · {isMax ? 'Scroll' : `${modKeyText} + scroll`} to zoom · Double-click to reset</span>
                    </p>
                  </>
                ) : (
                  <div className={`ink-plate overflow-auto ${isMax ? 'flex-1 min-h-0' : 'max-h-[650px]'}`}>
                    <pre className="p-4 font-mono text-[12.5px] whitespace-pre">
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
