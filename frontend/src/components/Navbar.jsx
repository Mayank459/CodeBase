import React, { useState, useRef, useEffect } from 'react';
import { 
  Cpu, Activity, RefreshCw, GitBranch, Radio, Settings2, Check, 
  ExternalLink, X, ChevronDown, Sparkles, Menu, Search,
  MessageSquareCode, Network, ShieldAlert, Scissors, BookOpen, 
  Workflow, GitCompare, GitCommit, GitPullRequest, ArrowRight, ShieldCheck
} from 'lucide-react';
import { getApiBase, setApiBase } from '../api';
import { TABS } from './TabNavigation';

function GitHubIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

// Grouped tools for the Capabilities dropdown
const TOOL_GROUPS = [
  {
    group: 'Code Intelligence',
    items: [
      { id: 'chat', label: 'Intelligence Chat', desc: 'LangGraph multi-agent reasoning & Qdrant RAG', icon: MessageSquareCode, tag: 'LangGraph' },
      { id: 'architecture', label: 'Architecture Graph', desc: 'Topological call graph & AST traversal', icon: Network, tag: 'AST' },
      { id: 'security', label: 'Security Audit', desc: 'CVE vulnerability scanner & health score', icon: ShieldAlert, tag: 'CVE' },
    ]
  },
  {
    group: 'Code Hygiene',
    items: [
      { id: 'dead_code', label: 'Dead Code Analysis', desc: 'AST unreferenced symbol detector', icon: Scissors, tag: 'Analysis' },
      { id: 'docs', label: 'Documentation Generator', desc: 'Automated docstrings & module summaries', icon: BookOpen, tag: 'Generator' },
      { id: 'uml', label: 'UML Diagrams', desc: 'Interactive Mermaid sequence & class models', icon: Workflow, tag: 'Mermaid' },
    ]
  },
  {
    group: 'Multi-Repo & Git',
    items: [
      { id: 'compare', label: 'Multi-Repo Compare', desc: 'Semantic diff across repository pairs', icon: GitCompare, tag: 'Diff' },
      { id: 'evolution', label: 'Commit Evolution', desc: 'Git timeline & AST architectural drift', icon: GitCommit, tag: 'History' },
      { id: 'pr', label: 'Autonomous PR', desc: 'Human-in-the-loop remediation PRs', icon: GitPullRequest, tag: 'HITL' },
    ]
  }
];

export function Navbar({ 
  activeRepo, 
  keepAlive, 
  onOpenIndexer, 
  activePage = 'dashboard', 
  activeTab = 'chat',
  onNavigatePage = () => {}, 
  onSelectTab = () => {},
  onOpenSearch = () => {} 
}) {
  const { online, latency, checking, countdown, refresh } = keepAlive;
  const [showSettings, setShowSettings] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [customUrl, setCustomUrl] = useState(getApiBase());

  const capabilitiesRef = useRef(null);
  const settingsRef = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (capabilitiesRef.current && !capabilitiesRef.current.contains(e.target)) {
        setShowCapabilities(false);
      }
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleSelectEndpoint = (url) => {
    setApiBase(url);
    setCustomUrl(url || getApiBase());
    refresh();
  };

  const handleToolSelect = (toolId) => {
    onSelectTab(toolId);
    onNavigatePage('features');
    setShowCapabilities(false);
    setIsMobileMenuOpen(false);
  };

  const handlePageSelect = (pageId) => {
    onNavigatePage(pageId);
    setIsMobileMenuOpen(false);
  };

  const currentBase = getApiBase();

  return (
    <header className="sticky top-2 sm:top-4 z-40 w-full max-w-[1720px] mx-auto px-3 sm:px-6 transition-all">
      <div className="w-full bg-[#0b101c]/80 border border-white/[0.1] rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
        
        {/* Left: Brand Logo (Interactive Click-to-Home) */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => handlePageSelect('home')}
            className="flex items-center gap-3 text-left group transition-transform active:scale-95 cursor-pointer"
            title="Return to Home Page"
          >
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/25 group-hover:shadow-indigo-500/40 transition-all flex-shrink-0">
              <div className="h-full w-full bg-[#090d16] rounded-[11px] flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors" />
                <Cpu className="text-indigo-400 group-hover:text-cyan-300 transition-colors" size={20} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white tracking-tight text-base sm:text-lg font-sans group-hover:text-indigo-200 transition-colors">
                  CodeBase
                </span>
                <span className="badge badge-primary text-[10px] py-0.5 px-2 font-mono">
                  RAG v2.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono tracking-tight hidden sm:block">
                Repository Intelligence Engine
              </p>
            </div>
          </button>
        </div>

        {/* Center: Streamlined & Spaced-Out Navigation */}
        <div className="hidden md:flex items-center">
          <nav className="flex items-center gap-1.5 bg-white/[0.04] p-1.5 rounded-2xl border border-white/[0.08] text-sm font-sans shadow-inner">
            {/* 1. Dedicated Home Page */}
            <button
              onClick={() => onNavigatePage('home')}
              className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer ${
                activePage === 'home'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full transition-colors ${activePage === 'home' ? 'bg-cyan-300' : 'bg-transparent'}`} />
              <span>Home</span>
            </button>

            {/* 2. Dedicated Features Page */}
            <button
              onClick={() => onNavigatePage('features')}
              className={`px-5 py-2 rounded-xl transition-all flex items-center gap-2 text-xs sm:text-sm font-medium cursor-pointer ${
                activePage === 'features' || activePage === 'dashboard'
                  ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-500/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span className={`h-2 w-2 rounded-full transition-colors ${activePage === 'features' || activePage === 'dashboard' ? 'bg-cyan-300' : 'bg-transparent'}`} />
              <span>Features</span>
            </button>
          </nav>
        </div>

        {/* Right Actions: Search + Active Repo + Minimal Live Status */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Quick Search CTA (⌘K) */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono group cursor-pointer"
            title="Open Command Palette (⌘K / Ctrl+K)"
          >
            <Search size={14} className="text-slate-400 group-hover:text-indigo-400 transition-colors" />
            <span className="hidden xl:inline text-xs text-slate-400 group-hover:text-slate-200">Search tools & symbols...</span>
            <span className="hidden sm:inline xl:hidden text-xs text-slate-400">Search...</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 border border-white/10 text-[10px] group-hover:border-indigo-400/50">
              ⌘K
            </kbd>
          </button>

          {/* Active Repository Pill */}
          {activeRepo ? (
            <button
              onClick={onOpenIndexer}
              className="flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/15 transition-all text-xs font-mono group cursor-pointer"
              title="Click to switch or re-index repository"
            >
              <GitBranch size={14} className="text-emerald-400 group-hover:rotate-12 transition-transform shrink-0" />
              <span className="font-semibold max-w-[110px] sm:max-w-[160px] truncate">{activeRepo}</span>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.5 rounded font-bold hidden sm:inline">Ready</span>
            </button>
          ) : (
            <button
              onClick={onOpenIndexer}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              title="Ingest a GitHub repository"
            >
              <Sparkles size={14} className="text-cyan-200" />
              <span>⚡ Ingest Repo</span>
            </button>
          )}

          {/* Minimal Live Status Pill */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] hover:border-white/20 text-xs font-mono transition-all cursor-pointer text-slate-300"
              title="Backend status & connection settings"
            >
              <span className={`status-dot ${online ? 'active' : checking ? 'idle' : 'offline'}`} />
              <span className="text-slate-300 text-xs hidden lg:inline">
                {online ? 'Live' : checking ? 'Connecting...' : 'Offline'}
              </span>
              {latency !== null && (
                <span className="text-slate-400 text-[11px] hidden xl:inline">
                  {latency}ms
                </span>
              )}
            </button>

            {/* Endpoint Switcher Dropdown */}
            {showSettings && (
              <div className="absolute right-0 mt-2.5 w-80 rounded-2xl bg-[#0a0e17] border border-white/10 p-4 shadow-2xl z-50 space-y-3 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-2xl">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <Activity size={13} className="text-indigo-400" />
                    Backend API Connection
                  </h4>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-slate-400 hover:text-white"
                  >
                    <X size={13} />
                  </button>
                </div>

                <div className="space-y-1.5 text-xs font-mono">
                  <div className="text-[11px] text-slate-400">Current Base URL:</div>
                  <div className="p-2 rounded-lg bg-black/40 border border-white/10 text-indigo-300 break-all text-[11px]">
                    {currentBase === '/api-proxy' ? '/api-proxy → Render Backend' : currentBase}
                  </div>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="text-[11px] font-mono text-slate-400">Select Connection Target:</div>
                  <button
                    onClick={() => handleSelectEndpoint('/api-proxy')}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentBase === '/api-proxy'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                        : 'bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div>
                      <div>⚡ Vite Proxy (Recommended)</div>
                      <div className="text-[10px] text-slate-400">Zero CORS • Render Backend Proxy</div>
                    </div>
                    {currentBase === '/api-proxy' && <Check size={13} className="text-indigo-400" />}
                  </button>

                  <button
                    onClick={() => handleSelectEndpoint('https://codebase-ys83.onrender.com')}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentBase === 'https://codebase-ys83.onrender.com'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                        : 'bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div>
                      <div>🌐 Direct Render URL</div>
                      <div className="text-[10px] text-slate-400">codebase-ys83.onrender.com</div>
                    </div>
                    {currentBase === 'https://codebase-ys83.onrender.com' && <Check size={13} className="text-indigo-400" />}
                  </button>

                  <button
                    onClick={() => handleSelectEndpoint('http://localhost:8000')}
                    className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                      currentBase === 'http://localhost:8000'
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                        : 'bg-white/[0.02] text-slate-300 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div>
                      <div>💻 Local FastAPI Instance</div>
                      <div className="text-[10px] text-slate-400">http://localhost:8000</div>
                    </div>
                    {currentBase === 'http://localhost:8000' && <Check size={13} className="text-indigo-400" />}
                  </button>
                </div>

                <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Keep-alive ping ({formatCountdown(countdown)})</span>
                  <button
                    onClick={refresh}
                    disabled={checking}
                    className="btn btn-secondary btn-sm py-0.5 px-2 text-[11px] flex items-center gap-1"
                  >
                    <RefreshCw size={10} className={checking ? 'animate-spin' : ''} />
                    <span>Ping Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Vercel App link button */}
          <a
            href="https://code-base-self.vercel.app/"
            target="_blank"
            rel="noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 hover:text-white hover:bg-indigo-500/20 transition-all hidden lg:flex items-center gap-1.5 text-xs font-mono font-medium shadow-sm"
            title="Open Live Vercel App"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live App</span>
            <ExternalLink size={11} className="text-indigo-400/80" />
          </a>

          {/* GitHub source icon button */}
          <a
            href="https://github.com/Mayank459/CodeBase"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-slate-400 hover:text-white hover:border-white/20 transition-all hidden sm:flex items-center justify-center"
            title="View on GitHub"
          >
            <GitHubIcon size={15} />
          </a>

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20 transition-all cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Drawer Menu (md:hidden) */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-white/[0.08] bg-[#07090e]/95 backdrop-blur-2xl px-4 py-6 space-y-5 animate-in slide-in-from-top-2 duration-150">
          {/* Quick Search on Mobile */}
          <button
            type="button"
            onClick={() => {
              setIsMobileMenuOpen(false);
              onOpenSearch();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-slate-300 text-xs font-mono"
          >
            <div className="flex items-center gap-2">
              <Search size={14} className="text-indigo-400" />
              <span>Search capabilities, symbols...</span>
            </div>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] text-slate-300 text-[10px] border border-white/10">⌘K</kbd>
          </button>

          {/* Mobile Main Pages */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold">
              Navigation
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handlePageSelect('home')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                  activePage === 'home' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/[0.04] text-slate-300 hover:text-white'
                }`}
              >
                Home
              </button>
              <button
                type="button"
                onClick={() => handlePageSelect('features')}
                className={`py-2.5 px-3 rounded-xl text-xs font-semibold text-center transition-all cursor-pointer ${
                  activePage === 'features' || activePage === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/[0.04] text-slate-300 hover:text-white'
                }`}
              >
                Features
              </button>
            </div>
          </div>


          {/* Mobile Tools (9 Capabilities) */}
          <div className="space-y-1.5">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-1 font-bold">
              Workstation Tools
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 max-h-60 overflow-y-auto pr-1">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isSelected = activePage === 'dashboard' && activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleToolSelect(tab.id)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 font-semibold'
                        : 'bg-white/[0.02] text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon size={14} className={isSelected ? 'text-cyan-400' : 'text-slate-500'} />
                      <span>{tab.label}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">{tab.tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Footer Links & GitHub */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-between text-xs text-slate-400">
            <button
              type="button"
              onClick={() => handlePageSelect('privacy')}
              className="hover:text-white transition-colors"
            >
              Privacy Policy
            </button>
            <a
              href="https://github.com/Mayank459/CodeBase"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-300 hover:text-white"
            >
              <GitHubIcon size={14} />
              <span>GitHub</span>
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
