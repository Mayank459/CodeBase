import React from 'react';
import { 
  Code2, ExternalLink, ShieldCheck, Cpu, Terminal, 
  Sparkles, GitBranch, ArrowUpRight, Lock, CheckCircle2 
} from 'lucide-react';
import { TABS } from './TabNavigation';

function GitHubIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function Footer({ 
  activePage = 'dashboard', 
  onNavigatePage = () => {}, 
  onSelectTab = () => {}, 
  activeRepo = '' 
}) {
  const handleTabClick = (tabId) => {
    onSelectTab(tabId);
    onNavigatePage('dashboard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePageClick = (pageId) => {
    onNavigatePage(pageId);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="border-t border-white/[0.08] bg-[#05070c] pt-14 pb-8 mt-16 text-xs text-slate-400 font-sans">
      <div className="w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 space-y-12">
        {/* Top 4-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Col 1: Brand & Overview */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-indigo-500/20 flex-shrink-0">
                <div className="h-full w-full bg-[#090d16] rounded-[7px] flex items-center justify-center">
                  <Cpu className="text-indigo-400" size={16} />
                </div>
              </div>
              <div>
                <span className="font-bold text-white tracking-tight text-sm">
                  CodeBase Intelligence
                </span>
                <span className="block text-[10px] text-indigo-400 font-mono">
                  RAG v2.0 Engine
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Compiler AST parsing, topological call graph traversal, and multi-agent code reasoning for production software repositories.
            </p>

            <div className="space-y-2 pt-1 font-mono text-[11px]">
              {activeRepo ? (
                <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-md">
                  <GitBranch size={12} />
                  <span className="text-slate-400">Indexed:</span>
                  <span className="truncate max-w-[150px] font-semibold">{activeRepo}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-amber-400/80 bg-amber-500/5 border border-amber-500/15 px-2.5 py-1 rounded-md">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                  <span>No Repository Loaded</span>
                </div>
              )}

              <a
                href="https://github.com/Mayank459/CodeBase"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-slate-300 hover:text-white px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] hover:border-white/20 transition-colors"
              >
                <GitHubIcon size={13} />
                <span>Star on GitHub</span>
                <ArrowUpRight size={11} className="text-slate-500" />
              </a>
            </div>
          </div>

          {/* Col 2: Capabilities / Tools (9 items) */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={12} className="text-indigo-400" />
              <span>Workstation Tools</span>
            </h4>
            <ul className="space-y-1.5 text-xs">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => handleTabClick(tab.id)}
                      className="group flex items-center gap-2 text-slate-400 hover:text-indigo-300 transition-colors py-0.5 text-left w-full cursor-pointer"
                    >
                      <Icon size={12} className="text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      <span className="group-hover:translate-x-0.5 transition-transform">{tab.label}</span>
                      <span className="text-[10px] font-mono text-slate-600 group-hover:text-indigo-400/70 ml-auto">
                        {tab.tag}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Col 3: Platform & Docs */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <Terminal size={12} className="text-cyan-400" />
              <span>Platform & Specs</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handlePageClick('dashboard')}
                  className={`hover:text-white transition-colors cursor-pointer ${
                    activePage === 'dashboard' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  Workstation Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handlePageClick('about')}
                  className={`hover:text-white transition-colors cursor-pointer ${
                    activePage === 'about' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  About & Architecture
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handlePageClick('settings')}
                  className={`hover:text-white transition-colors cursor-pointer ${
                    activePage === 'settings' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  System Settings & Keys
                </button>
              </li>
              <li>
                <a
                  href="https://github.com/Mayank459/CodeBase#readme"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1 text-slate-400"
                >
                  <span>Technical Documentation</span>
                  <ExternalLink size={10} className="text-slate-500" />
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/Mayank459/CodeBase/blob/main/DOCUMENTATION.md"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center gap-1 text-slate-400"
                >
                  <span>Full API & Graph Spec</span>
                  <ExternalLink size={10} className="text-slate-500" />
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Trust & Security */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>Trust & Governance</span>
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={() => handlePageClick('privacy')}
                  className={`hover:text-white transition-colors cursor-pointer ${
                    activePage === 'privacy' ? 'text-indigo-400 font-semibold' : 'text-slate-400'
                  }`}
                >
                  Privacy Policy & Guarantees
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handlePageClick('404')}
                  className={`hover:text-rose-400 transition-colors cursor-pointer ${
                    activePage === '404' ? 'text-rose-400 font-semibold' : 'text-slate-500'
                  }`}
                  title="Test Terminal 404 Route"
                >
                  Terminal 404 Demo
                </button>
              </li>
              <li className="pt-1 text-[11px] text-slate-500 space-y-1">
                <div className="flex items-center gap-1 text-slate-400">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>Ephemeral Git Sandboxes</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>Zero Code Retained for Training</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <CheckCircle2 size={11} className="text-emerald-400" />
                  <span>Local Client-Side Key Storage</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar: Tech Matrix & Keyboard Hint */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-2 flex-wrap justify-center">
            <span className="text-slate-400 font-semibold">Engine Stack:</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-slate-300">Tree-sitter AST</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-slate-300">Cohere 384d</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-slate-300">Qdrant Vector DB</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-slate-300">NetworkX Graph</span>
            <span>•</span>
            <span className="px-2 py-0.5 rounded bg-white/[0.03] border border-white/[0.06] text-slate-300">LangGraph HITL</span>
          </div>

          <div className="flex items-center gap-3">
            <span>
              Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono text-[10px] border border-white/10">⌘K</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] text-slate-300 font-mono text-[10px] border border-white/10">Ctrl+K</kbd> for Command Palette
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="text-center text-[10px] text-slate-600 font-mono">
          CodeBase RAG Assistant © 2026. Architected for High-Assurance Developer Intelligence.
        </div>
      </div>
    </footer>
  );
}
