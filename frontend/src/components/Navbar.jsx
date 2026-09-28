import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, GitBranch, Check, X, Menu, Search, ExternalLink } from 'lucide-react';
import { getApiBase, setApiBase } from '../api';
import { TABS } from './TabNavigation';

export function GitHubIcon({ size = 15, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

// The brand mark: a crank disc, its arm, and the knob you turn.
export function CrankMark({ size = 22, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="10" cy="13" r="7" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle cx="10" cy="13" r="1.8" fill="currentColor" />
      <path d="M10 13 L19 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="19.5" cy="4.5" r="2.6" fill="currentColor" />
    </svg>
  );
}

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'features', label: 'Workstation' },
  { id: 'about', label: 'About' },
  { id: 'settings', label: 'Settings' },
];

const ENDPOINTS = [
  { url: '/api-proxy', label: 'Vite proxy', note: 'Dev server → Render, no CORS' },
  { url: 'https://codebase-ys83.onrender.com', label: 'Render, direct', note: 'codebase-ys83.onrender.com' },
  { url: 'http://localhost:8000', label: 'Local FastAPI', note: 'localhost:8000' },
];

const isWorkstation = (p) => p === 'features' || p === 'dashboard';

export function Navbar({
  activeRepo,
  keepAlive,
  onOpenIndexer,
  activePage = 'home',
  onNavigatePage = () => {},
  onSelectTab = () => {},
  onOpenSearch = () => {},
}) {
  const { online, latency, checking, countdown, refresh } = keepAlive;
  const [showStatus, setShowStatus] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [, force] = useState(0);
  const statusRef = useRef(null);

  useEffect(() => {
    const close = (e) => { if (statusRef.current && !statusRef.current.contains(e.target)) setShowStatus(false); };
    const esc = (e) => { if (e.key === 'Escape') { setShowStatus(false); setMenuOpen(false); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, []);

  const currentBase = getApiBase();
  const lamp = online ? 'active' : checking ? 'idle' : 'offline';
  const statusText = online ? 'Backend up' : checking ? 'Waking backend' : 'Backend down';
  const mmss = `${Math.floor(countdown / 60)}:${String(countdown % 60).padStart(2, '0')}`;

  const go = (id) => { onNavigatePage(id); setMenuOpen(false); };
  const pickEndpoint = (url) => { setApiBase(url); force((n) => n + 1); refresh(); };

  return (
    <header className="sticky top-0 z-40 w-full bg-kraft/95 backdrop-blur-[2px] shadow-[0_1px_0_var(--kraft-dark)]" style={{ backgroundImage: 'var(--grain)' }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 h-16 flex items-end gap-3">
        {/* Brand tab */}
        <button type="button" onClick={() => go('home')} className="flex items-stretch self-center shadow-lift-1 rounded-paper overflow-hidden group" aria-label="CodeBase home">
          <span className="bg-crimson text-pulp w-10 flex items-center justify-center">
            <CrankMark size={22} className="transition-transform duration-500 group-hover:rotate-[120deg]" />
          </span>
          <span className="bg-pulp text-ink px-3 flex items-center font-matrixtype-display text-[1.35rem] leading-none tracking-wide pt-0.5">
            CODEBASE
          </span>
        </button>

        {/* Page tabs */}
        <nav aria-label="Pages" className="hidden md:flex items-end gap-[3px] ml-4">
          {PAGES.map((p) => {
            const current = p.id === 'features' ? isWorkstation(activePage) : activePage === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => go(p.id)}
                aria-current={current ? 'page' : undefined}
                className={`strip tab-cut px-4 transition-all duration-200 ${
                  current
                    ? 'bg-pulp text-ink h-11 pt-1 shadow-[0_-2px_6px_-2px_rgba(42,39,36,.3)]'
                    : 'bg-paper-grey/80 text-ink-2 h-9 hover:h-10 hover:bg-pulp-2'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2 self-center">
          <button type="button" onClick={onOpenSearch} className="btn btn-secondary btn-sm !normal-case !tracking-normal !font-sans !font-medium gap-2" title="Command palette (Ctrl+K)">
            <Search size={14} aria-hidden="true" />
            <span className="hidden lg:inline text-ash">Find a tool or page</span>
            <kbd className="font-mono text-[10px] px-1.5 py-px rounded-sm bg-pulp-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--rule)]">Ctrl K</kbd>
          </button>

          <button
            type="button"
            onClick={onOpenIndexer}
            className="hidden sm:inline-flex btn btn-secondary btn-sm !normal-case !tracking-normal font-mono !font-medium max-w-[220px]"
            title="Index or switch repository"
          >
            <GitBranch size={14} aria-hidden="true" />
            <span className="truncate">{activeRepo || 'Index a repo'}</span>
          </button>

          {/* Backend status + endpoint switcher */}
          <div className="relative" ref={statusRef}>
            <button
              type="button"
              onClick={() => setShowStatus((s) => !s)}
              aria-expanded={showStatus}
              className="btn btn-secondary btn-sm !normal-case !tracking-normal !font-sans !font-medium"
              title="Backend connection"
            >
              <span className={`status-dot ${lamp}`} aria-hidden="true" />
              <span className="hidden xl:inline">{statusText}</span>
              {latency !== null && online && <span className="hidden lg:inline font-mono text-[11px] text-ash tabular-nums">{latency} ms</span>}
            </button>

            {showStatus && (
              <div className="paper absolute right-0 mt-2 w-80 p-4 z-50 motion-modal-card" role="dialog" aria-label="Backend connection">
                <div className="flex items-center justify-between pb-2 rule-b">
                  <span className="strip text-ink">Backend connection</span>
                  <button type="button" onClick={() => setShowStatus(false)} className="text-ash hover:text-ink" aria-label="Close"><X size={14} /></button>
                </div>
                <p className="mt-3 text-xs text-ink-2">
                  <span className={`status-dot ${lamp} mr-2 align-middle`} />
                  {statusText}{latency !== null && online ? ` · ${latency} ms round trip` : ''}
                </p>
                <p className="mt-1 font-mono text-[11px] text-ash break-all">{currentBase}</p>

                <div className="mt-3 space-y-1">
                  {ENDPOINTS.map((ep) => {
                    const sel = currentBase === ep.url;
                    return (
                      <button
                        key={ep.url}
                        type="button"
                        onClick={() => pickEndpoint(ep.url)}
                        className={`w-full text-left px-3 py-2 rounded-sm flex items-center justify-between transition-colors ${sel ? 'bg-ink text-pulp' : 'hover:bg-pulp-2 text-ink'}`}
                      >
                        <span>
                          <span className="block text-sm font-semibold">{ep.label}</span>
                          <span className={`block text-[11px] font-mono ${sel ? 'text-plate-dim' : 'text-ash'}`}>{ep.note}</span>
                        </span>
                        {sel && <Check size={14} aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 pt-3 rule-t flex items-center justify-between text-[11px] text-ash">
                  <span>Keep-alive ping in <span className="font-mono tabular-nums">{mmss}</span></span>
                  <button type="button" onClick={refresh} disabled={checking} className="btn btn-ghost btn-sm">
                    <RefreshCw size={11} className={checking ? 'animate-spin' : ''} aria-hidden="true" />
                    Ping now
                  </button>
                </div>
              </div>
            )}
          </div>

          <a href="https://github.com/Mayank459/CodeBase" target="_blank" rel="noreferrer" className="hidden sm:inline-flex btn btn-ghost btn-sm !px-2" aria-label="Source on GitHub">
            <GitHubIcon size={17} />
          </a>

          <button type="button" onClick={() => setMenuOpen((o) => !o)} className="md:hidden btn btn-secondary btn-sm !px-2" aria-label="Menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 pb-4 motion-expand-body">
          <div className="paper p-4 space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {PAGES.map((p) => {
                const current = p.id === 'features' ? isWorkstation(activePage) : activePage === p.id;
                return (
                  <button key={p.id} type="button" onClick={() => go(p.id)} className={`btn btn-sm ${current ? 'btn-primary' : 'btn-secondary'}`}>
                    {p.label}
                  </button>
                );
              })}
            </div>
            <div>
              <div className="strip text-ash mb-2">Tools</div>
              <div className="grid grid-cols-1 gap-px">
                {TABS.map((t, i) => (
                  <button key={t.id} type="button" onClick={() => { onSelectTab(t.id); go('features'); }} className="flex items-center gap-3 px-2 py-2 text-left text-sm text-ink hover:bg-pulp-2 rounded-sm">
                    <span className="font-mono text-[11px] text-ash w-5">{String(i + 1).padStart(2, '0')}</span>
                    <t.icon size={15} aria-hidden="true" />
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="pt-3 rule-t flex items-center justify-between text-sm">
              <button type="button" onClick={() => go('privacy')} className="text-ink-2 underline">Privacy</button>
              <a href="https://github.com/Mayank459/CodeBase" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink">
                <GitHubIcon size={14} /> GitHub <ExternalLink size={11} aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
