import React, { useState, useRef, useEffect } from 'react';
import { 
  GitBranch, Play, RefreshCw, Terminal, CheckCircle2, AlertCircle, 
  ChevronDown, ChevronUp, Copy, Check, Sparkles, Clock, Layers, Network, FileCode
} from 'lucide-react';
import { streamIndexRepo } from '../api';
import confetti from 'canvas-confetti';

export function normalizeRepoUrl(url) {
  const trimmed = (url || '').trim();
  if (!trimmed) return 'https://github.com/psf/requests';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('git@')) {
    return trimmed;
  }
  const known = {
    requests: 'https://github.com/psf/requests',
    fastapi: 'https://github.com/fastapi/fastapi',
    flask: 'https://github.com/pallets/flask',
    django: 'https://github.com/django/django',
    codebase: 'https://github.com/Mayank459/CodeBase',
  };
  if (known[trimmed.toLowerCase()]) {
    return known[trimmed.toLowerCase()];
  }
  if (trimmed.includes('/')) {
    return `https://github.com/${trimmed}`;
  }
  return `https://github.com/${trimmed}/${trimmed}`;
}

export function IndexDrawer({ 
  activeRepo, 
  onRepoIndexed, 
  indexStats, 
  isOpen, 
  onToggle 
}) {
  const [repoUrl, setRepoUrl] = useState(() => normalizeRepoUrl(activeRepo || 'https://github.com/psf/requests'));
  const [force, setForce] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalContainerRef = useRef(null);

  // Sync when activeRepo changes
  useEffect(() => {
    if (activeRepo) {
      setRepoUrl(normalizeRepoUrl(activeRepo));
    }
  }, [activeRepo]);

  // Quick repository presets
  const presets = [
    { label: 'Requests', url: 'https://github.com/psf/requests' },
    { label: 'FastAPI', url: 'https://github.com/fastapi/fastapi' },
    { label: 'Flask', url: 'https://github.com/pallets/flask' },
    { label: 'This Repository', url: 'https://github.com/Mayank459/CodeBase' },
  ];

  useEffect(() => {
    if (autoScroll && terminalContainerRef.current) {
      terminalContainerRef.current.scrollTop = terminalContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleIndex = async () => {
    const validUrl = normalizeRepoUrl(repoUrl);
    if (!validUrl || isIndexing) return;

    setRepoUrl(validUrl);
    setIsIndexing(true);
    setError(null);
    setLogs([
      `[client] Initiating index pipeline for: ${validUrl}`,
      `[client] Connection mode: Server-Sent Events (SSE) stream`,
      `[client] Bypass cache: ${force ? 'YES (force rebuild)' : 'NO (24h cache enabled)'}`,
    ]);

    await streamIndexRepo({
      repoUrl: validUrl,
      force,

      onEvent: (event) => {
        const msg = event.message || event.step || JSON.stringify(event);
        setLogs((prev) => [...prev, `[indexer] ${msg}`]);
      },
      onError: (err) => {
        setError(err);
        setLogs((prev) => [...prev, `[error] ❌ ${err}`]);
        setIsIndexing(false);
      },
      onComplete: (result) => {
        setLogs((prev) => [
          ...prev,
          `[success] ✅ Indexing completed in ${result.index_time_seconds || '?'}s`,
          `[summary] ${result.files_parsed || 0} files | ${result.entities || 0} entities | ${result.graph_nodes || 0} nodes | ${result.graph_edges || 0} edges`
        ]);
        setIsIndexing(false);
        onRepoIndexed(result.repository || repoUrl.trim(), result);
        
        // Trigger celebratory confetti for senior dev delight
        try {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.8 },
            colors: ['#6366f1', '#06b6d4', '#10b981']
          });
        } catch (_) {}
      }
    });
  };

  const copyTerminalLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="w-full glass-panel overflow-hidden border border-white/[0.08] mb-6">
      {/* Drawer Header / Summary Bar */}
      <div 
        onClick={onToggle}
        className="px-5 py-4 flex items-center justify-between cursor-pointer hover:bg-white/[0.02] transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <GitBranch size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-white">Repository Ingestion & Vector Index</h3>
              {activeRepo ? (
                <div className="flex items-center gap-1.5">
                  <span className="badge badge-success text-[10px]">
                    Active: {activeRepo}
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[10px]">
                    <span>AST ✓</span>
                    <span>Graph ✓</span>
                    <span>Embeddings ✓</span>
                    <span className="text-emerald-400 font-bold">Ready</span>
                  </span>
                </div>
              ) : (
                <span className="badge badge-warning text-[10px]">
                  No Repository Indexed
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Tree-sitter AST parsing • Cohere 384-dim embeddings • Qdrant vector storage • NetworkX graph
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {indexStats && indexStats.files_parsed && (
            <div className="hidden md:flex items-center gap-3 text-xs font-mono text-slate-400 pr-2 border-r border-white/10">
              <span>{indexStats.files_parsed} files</span>
              <span>•</span>
              <span>{indexStats.graph_nodes} nodes</span>
              <span>•</span>
              <span>{indexStats.index_time_seconds}s</span>
            </div>
          )}
          <button className="btn btn-ghost btn-sm text-slate-400">
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Expandable Body */}
      {isOpen && (
        <div className="px-5 pb-5 pt-2 border-t border-white/[0.06] space-y-4">
          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="text-slate-400 font-mono text-[11px]">Quick Load:</span>
            {presets.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setRepoUrl(p.url)}
                className="px-2.5 py-1 rounded bg-white/[0.04] border border-white/[0.06] hover:border-indigo-500/40 hover:bg-indigo-500/10 text-slate-300 hover:text-indigo-300 text-xs transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Form Input + Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/organization/repository"
                className="input-field pl-9 font-mono text-xs"
                disabled={isIndexing}
              />
              <GitBranch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none px-2">
              <input
                type="checkbox"
                checked={force}
                onChange={(e) => setForce(e.target.checked)}
                disabled={isIndexing}
                className="rounded bg-[#080c14] border-white/20 text-indigo-600 focus:ring-indigo-500"
              />
              <span>Force Re-index (Bypass Cache)</span>
            </label>

            <button
              onClick={handleIndex}
              disabled={isIndexing || !repoUrl.trim()}
              className="btn btn-primary btn-md gap-2"
            >
              {isIndexing ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Play size={14} />
                  <span>Index Repository</span>
                </>
              )}
            </button>
          </div>

          {/* Statistics Grid (when available) */}
          {indexStats && indexStats.files_parsed && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
              <div className="metric-tile">
                <div className="flex items-center justify-between">
                  <span className="metric-label">Parsed Files</span>
                  <FileCode size={14} className="text-indigo-400" />
                </div>
                <div className="metric-value">{indexStats.files_parsed}</div>
              </div>
              <div className="metric-tile">
                <div className="flex items-center justify-between">
                  <span className="metric-label">Code Entities</span>
                  <Layers size={14} className="text-cyan-400" />
                </div>
                <div className="metric-value">{indexStats.entities || '—'}</div>
              </div>
              <div className="metric-tile">
                <div className="flex items-center justify-between">
                  <span className="metric-label">Graph Nodes</span>
                  <Network size={14} className="text-emerald-400" />
                </div>
                <div className="metric-value">{indexStats.graph_nodes || '—'}</div>
              </div>
              <div className="metric-tile">
                <div className="flex items-center justify-between">
                  <span className="metric-label">Graph Edges</span>
                  <Network size={14} className="text-amber-400" />
                </div>
                <div className="metric-value">{indexStats.graph_edges || '—'}</div>
              </div>
              <div className="metric-tile">
                <div className="flex items-center justify-between">
                  <span className="metric-label">Duration</span>
                  <Clock size={14} className="text-rose-400" />
                </div>
                <div className="metric-value">{indexStats.index_time_seconds ? `${indexStats.index_time_seconds}s` : '—'}</div>
              </div>
            </div>
          )}

          {/* Visual Ingestion Pipeline Stepper */}
          {(isIndexing || logs.length > 0) && (
            <div className="p-3 rounded-xl bg-[#070a12] border border-white/[0.08] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sparkles size={12} className="text-cyan-400" />
                  <span>Real-Time Indexing Pipeline</span>
                </span>
                <span className="text-[10px] text-indigo-400">
                  {isIndexing ? 'Active SSE Stream' : 'Pipeline Execution Complete'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-[11px] font-mono">
                {[
                  { step: 'clone', label: '1. Clone Repo', test: (l) => l.some(x => x.includes('Cloning') || x.includes('Clone done')) },
                  { step: 'scan', label: '2. Scan Files', test: (l) => l.some(x => x.includes('Scanning') || x.includes('Found')) },
                  { step: 'parse', label: '3. AST Parse', test: (l) => l.some(x => x.includes('Parsing') || x.includes('Parsed')) },
                  { step: 'graph', label: '4. Build Graph', test: (l) => l.some(x => x.includes('graph') || x.includes('entities')) },
                  { step: 'embed', label: '5. Embeddings', test: (l) => l.some(x => x.includes('Embedding') || x.includes('embedded')) },
                  { step: 'store', label: '6. Qdrant Store', test: (l) => l.some(x => x.includes('Storing') || x.includes('complete') || x.includes('Loaded from cache')) },
                ].map((item, idx) => {
                  const isDone = item.test(logs);
                  return (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg border text-center transition-all ${
                        isDone
                          ? 'bg-emerald-500/[0.08] border-emerald-500/30 text-emerald-300 font-semibold'
                          : isIndexing
                          ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300'
                          : 'bg-white/[0.02] border-white/[0.05] text-slate-500'
                      }`}
                    >
                      <div className="text-[10px] truncate">{item.label}</div>
                      <div className="text-[9px] opacity-70 mt-0.5">
                        {isDone ? '✓ Done' : isIndexing ? 'Processing...' : 'Pending'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SSE Terminal Console */}
          {logs.length > 0 && (
            <div className="rounded-lg overflow-hidden border border-white/10 bg-[#04060a] shadow-2xl">
              <div className="px-3 py-2 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between text-xs font-mono text-slate-400">
                <div className="flex items-center gap-2">
                  <Terminal size={13} className="text-indigo-400" />
                  <span>Pipeline Console</span>
                  {isIndexing && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-indigo-300">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-ping" />
                      Streaming
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoScroll}
                      onChange={(e) => setAutoScroll(e.target.checked)}
                      className="rounded text-indigo-500"
                    />
                    <span>Auto-scroll</span>
                  </label>

                  <button
                    onClick={copyTerminalLogs}
                    className="btn btn-ghost btn-sm py-0.5 px-2 text-xs"
                    title="Copy console output"
                  >
                    {copiedLogs ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                    <span>{copiedLogs ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={() => setLogs([])}
                    className="btn btn-ghost btn-sm py-0.5 px-2 text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div ref={terminalContainerRef} className="p-3 max-h-56 overflow-y-auto font-mono text-xs text-slate-300 space-y-1">
                {logs.map((log, index) => {
                  let colorClass = 'text-slate-300';
                  if (log.includes('[error]')) colorClass = 'text-rose-400 font-semibold';
                  else if (log.includes('[success]')) colorClass = 'text-emerald-400 font-semibold';
                  else if (log.includes('[client]')) colorClass = 'text-indigo-300';
                  return (
                    <div key={index} className={`leading-relaxed ${colorClass}`}>
                      {log}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
