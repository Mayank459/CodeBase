import React, { useState, useRef, useEffect } from 'react';
import { GitBranch, Play, RefreshCw, ChevronDown, Copy, Check } from 'lucide-react';
import { streamIndexRepo } from '../api';
import confetti from 'canvas-confetti';
import { Procession } from './Procession';

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
  if (known[trimmed.toLowerCase()]) return known[trimmed.toLowerCase()];
  if (trimmed.includes('/')) return `https://github.com/${trimmed}`;
  return `https://github.com/${trimmed}/${trimmed}`;
}

const PRESETS = [
  { label: 'psf/requests', url: 'https://github.com/psf/requests' },
  { label: 'fastapi/fastapi', url: 'https://github.com/fastapi/fastapi' },
  { label: 'pallets/flask', url: 'https://github.com/pallets/flask' },
  { label: 'This repository', url: 'https://github.com/Mayank459/CodeBase' },
];

// Stations are marked done when the SSE log mentions them.
const STATIONS = [
  { label: 'Clone', test: (l) => l.some((x) => x.includes('Cloning') || x.includes('Clone done')) },
  { label: 'Scan', test: (l) => l.some((x) => x.includes('Scanning') || x.includes('Found')) },
  { label: 'Parse', test: (l) => l.some((x) => x.includes('Parsing') || x.includes('Parsed')) },
  { label: 'Graph', test: (l) => l.some((x) => x.includes('graph') || x.includes('entities')) },
  { label: 'Embed', test: (l) => l.some((x) => x.includes('Embedding') || x.includes('embedded')) },
  { label: 'Store', test: (l) => l.some((x) => x.includes('Storing') || x.includes('complete') || x.includes('Loaded from cache')) },
];

function Figure({ label, value }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-ink tabular-nums">{value ?? '—'}</span>
      <span className="strip !text-[10px] text-ash">{label}</span>
    </div>
  );
}

export function IndexDrawer({ activeRepo, onRepoIndexed, indexStats, isOpen, onToggle, keepAlive }) {
  const [repoUrl, setRepoUrl] = useState(() => normalizeRepoUrl(activeRepo || 'https://github.com/psf/requests'));
  const [force, setForce] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const logRef = useRef(null);

  useEffect(() => { if (activeRepo) setRepoUrl(normalizeRepoUrl(activeRepo)); }, [activeRepo]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [logs]);

  const handleIndex = async () => {
    const validUrl = normalizeRepoUrl(repoUrl);
    if (!validUrl || isIndexing) return;
    setRepoUrl(validUrl);
    setIsIndexing(true);
    setError(null);
    setLogs([
      `[client] Indexing ${validUrl}`,
      `[client] Streaming progress over server-sent events`,
      `[client] Cache: ${force ? 'bypassed, full rebuild' : 'used if indexed in the last 24h'}`,
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
        setLogs((prev) => [...prev, `[error] ${err}`]);
        setIsIndexing(false);
      },
      onComplete: (result) => {
        setLogs((prev) => [
          ...prev,
          `[done] Indexed in ${result.index_time_seconds || '?'}s`,
          `[done] ${result.files_parsed || 0} files · ${result.entities || 0} entities · ${result.graph_nodes || 0} nodes · ${result.graph_edges || 0} edges`,
        ]);
        setIsIndexing(false);
        onRepoIndexed(result.repository || repoUrl.trim(), result);
        try {
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.3 }, shapes: ['square'], colors: ['#b3262d', '#f2ece1', '#2a2724', '#d6ccbc'] });
        } catch (_) {}
      },
    });
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(logs.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const s = indexStats || {};
  const online = keepAlive?.online;
  const lamp = online ? 'active' : keepAlive?.checking ? 'idle' : 'offline';

  return (
    <section className="paper slotted" aria-label="Repository">
      {/* Repo bar */}
      <div className="px-5 sm:px-6 py-4 flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3 min-w-0">
          <GitBranch size={18} className="text-ink-2 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <div className="strip !text-[10px] text-ash">Repository</div>
            <div className="font-mono font-semibold text-ink truncate">{activeRepo || 'Nothing indexed yet'}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
          {!(s.entities_indexed ?? s.entities) && <span className="text-sm text-ink-2">Not indexed in this browser yet. Index it to fill every tool.</span>}
          {(s.entities_indexed ?? s.entities) ? <Figure label="entities" value={(s.entities_indexed ?? s.entities).toLocaleString()} /> : null}
          {(s.edges_count ?? s.graph_edges) ? <Figure label="call edges" value={(s.edges_count ?? s.graph_edges).toLocaleString()} /> : null}
          {s.files_parsed ? <Figure label="files" value={s.files_parsed} /> : null}
          {s.index_time_seconds ? <Figure label="to index" value={`${s.index_time_seconds}s`} /> : null}
        </div>

        <div className="flex items-center gap-2 text-sm text-ink-2">
          <span className={`status-dot ${lamp}`} aria-hidden="true" />
          <span>{online ? `Backend up${keepAlive?.latency != null ? ` · ${keepAlive.latency} ms` : ''}` : keepAlive?.checking ? 'Waking backend (free tier, up to a minute)' : 'Backend unreachable'}</span>
        </div>

        <button type="button" onClick={onToggle} aria-expanded={isOpen} className="ml-auto btn btn-secondary btn-sm">
          {isOpen ? 'Close' : 'Index a repo'}
          <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
        </button>
      </div>

      {isOpen && (
        <div className="px-5 sm:px-6 pb-6 pt-5 rule-t space-y-5 motion-expand-body">
          <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
            <label className="relative flex-1">
              <span className="sr-only">GitHub repository URL</span>
              <GitBranch size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash pointer-events-none" aria-hidden="true" />
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleIndex()}
                placeholder="https://github.com/owner/repository or owner/repository"
                className="input-field has-icon-left font-mono !text-[13px]"
                disabled={isIndexing}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2 select-none">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} disabled={isIndexing} className="accent-[#b3262d] w-4 h-4" />
              Rebuild, ignore cache
            </label>
            <button type="button" onClick={handleIndex} disabled={isIndexing || !repoUrl.trim()} className="btn btn-primary">
              {isIndexing ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <Play size={14} aria-hidden="true" />}
              {isIndexing ? 'Indexing' : 'Index repository'}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-ash">Try:</span>
            {PRESETS.map((p) => (
              <button key={p.url} type="button" onClick={() => setRepoUrl(p.url)} disabled={isIndexing}
                className={`px-2.5 py-1 rounded-sm font-mono text-[12px] transition-colors ${normalizeRepoUrl(repoUrl) === p.url ? 'bg-ink text-pulp' : 'bg-pulp-2 text-ink hover:bg-paper-grey shadow-[inset_0_0_0_1px_var(--rule)]'}`}>
                {p.label}
              </button>
            ))}
          </div>

          {(isIndexing || logs.length > 0) && (
            <div className="space-y-3">
              {/* The same procession as the home page, driven by the live log */}
              {(() => {
                const doneIds = STATIONS.filter((st) => st.test(logs)).map((st) => st.label);
                const firstOpen = STATIONS.findIndex((st) => !st.test(logs));
                return (
                  <div className="overflow-x-auto">
                    <Procession
                      compact
                      className="max-w-[760px]"
                      items={STATIONS.map((st) => ({ id: st.label, label: st.label }))}
                      pos={isIndexing ? firstOpen : -1}
                      done={doneIds}
                    />
                  </div>
                );
              })()}

              <div className="ink-plate overflow-hidden">
                <div className="px-3 py-2 bg-plate-2 flex items-center justify-between text-[12px] font-mono text-plate-dim">
                  <span>{isIndexing ? 'Streaming…' : error ? 'Stopped with an error' : 'Log'}</span>
                  <span className="flex items-center gap-1">
                    <button type="button" onClick={copyLogs} className="px-2 py-0.5 rounded-sm hover:bg-plate hover:text-plate-ink inline-flex items-center gap-1">
                      {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}
                    </button>
                    <button type="button" onClick={() => setLogs([])} disabled={isIndexing} className="px-2 py-0.5 rounded-sm hover:bg-plate hover:text-plate-ink">Clear</button>
                  </span>
                </div>
                <div ref={logRef} className="p-3 max-h-56 overflow-y-auto font-mono text-[12px] leading-relaxed" role="log" aria-live="polite">
                  {logs.map((log, i) => (
                    <div key={i} className={log.startsWith('[error]') ? 'text-[#f08a8f]' : log.startsWith('[done]') ? 'text-[#a9d39f]' : log.startsWith('[client]') ? 'text-plate-dim' : 'text-plate-ink'}>
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
