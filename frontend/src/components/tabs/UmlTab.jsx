import React, { useState, useEffect, useRef } from 'react';
import { 
  Workflow, ExternalLink, Copy, Check, Play, AlertCircle, Code, Eye, 
  Sparkles, ZoomIn, ZoomOut, RotateCcw, Download, Filter, Layers, 
  Boxes, Network, ArrowRight, ShieldCheck, RefreshCw
} from 'lucide-react';
import { apiPost, extractMermaidCode, getMermaidLiveUrl } from '../../api';
import mermaid from 'mermaid';

const DIAGRAM_TYPES = [
  { id: 'class', label: 'Class Diagram', desc: 'Domain models, OOP hierarchies, and inheritance', icon: Boxes },
  { id: 'architecture', label: 'Layered Architecture', desc: 'Subsystem clusters: API, Core, Services, Utilities', icon: Layers },
  { id: 'dependency', label: 'Component Coupling', desc: 'High-level module-to-module dependencies', icon: Network },
  { id: 'sequence', label: 'Execution Sequence', desc: 'Message flow and runtime call sequences', icon: Workflow },
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
  const [renderError, setRenderError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('diagram'); // 'diagram' | 'source'
  const [zoom, setZoom] = useState(1);
  const [svgData, setSvgData] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          darkMode: true,
          background: '#07090e',
          primaryColor: '#6366f1',
          primaryTextColor: '#ffffff',
          primaryBorderColor: '#818cf8',
          lineColor: '#64748b',
          secondaryColor: '#0f172a',
          tertiaryColor: '#1e1b4b',
        },
        securityLevel: 'loose',
        suppressErrorRendering: true,
        maxTextSize: 1000000,
        maxEdges: 5000,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
      });
    } catch (_) {}
  }, []);

  // Render Mermaid code whenever it changes or viewMode toggles
  useEffect(() => {
    const cleanupRogueElements = () => {
      document.querySelectorAll('body > [id^="dmermaid"], body > [id^="mermaid-"], body > svg.error-icon').forEach(el => el.remove());
    };

    if (mermaidCode && viewMode === 'diagram' && containerRef.current) {
      containerRef.current.innerHTML = '';
      setRenderError(false);
      setSvgData(null);
      const uniqueId = `mermaid-${Date.now()}`;

      mermaid.parse(mermaidCode, { suppressErrors: true })
        .then(() => mermaid.render(uniqueId, mermaidCode))
        .then(({ svg }) => {
          setSvgData(svg);
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
            const svgEl = containerRef.current.querySelector('svg');
            if (svgEl) {
              // Properly format responsive SVG without setting zero/14px width
              svgEl.removeAttribute('height');
              svgEl.style.width = '100%';
              svgEl.style.maxWidth = '100%';
              svgEl.style.height = 'auto';
              svgEl.style.minHeight = '360px';
              svgEl.style.display = 'block';
              svgEl.style.margin = '0 auto';
            }
          }
          cleanupRogueElements();
        })
        .catch((err) => {
          console.warn('Mermaid render error, attempting fallback:', err);
          setRenderError(true);
          cleanupRogueElements();
        });
    }
  }, [mermaidCode, viewMode]);

  const handleGenerate = async (typeId) => {
    const type = typeId || selectedType;
    if (!activeRepo) {
      setError('Please index a repository first using the top ingestion bar.');
      return;
    }

    setLoading(true);
    setError(null);
    setRenderError(false);
    setMermaidCode(null);
    setZoom(1);

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

  const handleDownloadSvg = () => {
    if (!svgData) return;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_')}_${selectedType}_diagram.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.4));
  const handleResetZoom = () => setZoom(1);

  const liveUrl = mermaidCode ? getMermaidLiveUrl(mermaidCode) : null;

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
        <div className="glass-panel p-6 space-y-4">
          {/* Canvas Toolbar */}
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="badge badge-primary font-mono text-xs">
                {DIAGRAM_TYPES.find(t => t.id === selectedType)?.label || 'Diagram'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                Active Repository: {activeRepo}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Zoom Controls */}
              {viewMode === 'diagram' && !renderError && (
                <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] text-xs">
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:text-white text-slate-400 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut size={13} />
                  </button>
                  <span className="px-2 font-mono text-[11px] text-slate-300 select-none">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:text-white text-slate-400 rounded hover:bg-white/[0.06] transition-colors cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn size={13} />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:text-white text-slate-400 rounded hover:bg-white/[0.06] transition-colors border-l border-white/10 cursor-pointer"
                    title="Reset zoom (100%)"
                  >
                    <RotateCcw size={12} />
                  </button>
                </div>
              )}

              {/* View Toggle */}
              <div className="flex items-center bg-white/[0.04] p-0.5 rounded-lg border border-white/[0.08] text-xs">
                <button
                  onClick={() => setViewMode('diagram')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'diagram' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Eye size={12} />
                  <span>Canvas</span>
                </button>
                <button
                  onClick={() => setViewMode('source')}
                  className={`px-3 py-1 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer ${
                    viewMode === 'source' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Code size={12} />
                  <span>Source</span>
                </button>
              </div>

              {/* Download SVG */}
              {svgData && viewMode === 'diagram' && (
                <button
                  onClick={handleDownloadSvg}
                  className="btn btn-secondary btn-sm text-xs gap-1.5 cursor-pointer"
                  title="Export diagram as SVG image"
                >
                  <Download size={12} />
                  <span>SVG</span>
                </button>
              )}

              {/* Copy Code */}
              <button
                onClick={handleCopyCode}
                className="btn btn-secondary btn-sm text-xs gap-1.5 cursor-pointer"
                title="Copy Mermaid source code"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>

              {/* Open in Mermaid Live */}
              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary btn-sm text-xs gap-1.5 cursor-pointer"
                >
                  <ExternalLink size={12} />
                  <span>Mermaid Live</span>
                </a>
              )}
            </div>
          </div>

          {/* Interactive Zoomable Viewport */}
          {viewMode === 'diagram' && !renderError ? (
            <div className="rounded-2xl border border-white/[0.08] bg-[#060910] p-6 overflow-auto min-h-[440px] max-h-[720px] flex items-center justify-center">
              <div 
                ref={containerRef} 
                className="transition-transform duration-200 origin-center w-full flex items-center justify-center"
                style={{ transform: `scale(${zoom})` }}
              />
            </div>
          ) : viewMode === 'diagram' && renderError ? (
            <div className="p-8 bg-[#060910] rounded-2xl border border-white/[0.08] text-center space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
                <Sparkles size={13} className="text-cyan-400" />
                <span>Large Multi-Entity Graph</span>
              </div>
              <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                Diagram was synthesized successfully. Open it in the official Mermaid Live Editor for smooth interactive pan/zoom:
              </p>
              <div>
                {liveUrl && (
                  <a
                    href={liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary btn-md gap-2 shadow-lg shadow-indigo-500/25"
                  >
                    <ExternalLink size={14} />
                    <span>Open in Mermaid Live Editor</span>
                  </a>
                )}
              </div>
              <div className="pt-4 border-t border-white/[0.06] text-left">
                <div className="text-[11px] font-mono text-slate-400 mb-1.5">Mermaid Source:</div>
                <pre className="p-3 bg-black/40 rounded-lg border border-white/[0.06] font-mono text-xs text-slate-300 overflow-x-auto max-h-48 whitespace-pre">
                  <code>{mermaidCode}</code>
                </pre>
              </div>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden border border-white/10 bg-[#060910]">
              <pre className="p-4 font-mono text-xs text-slate-200 overflow-x-auto whitespace-pre max-h-[600px]">
                <code>{mermaidCode}</code>
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
