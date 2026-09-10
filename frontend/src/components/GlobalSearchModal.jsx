import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, X, CornerDownLeft, MessageSquareCode, Network, ShieldAlert, 
  Scissors, BookOpen, Workflow, GitCompare, GitCommit, GitPullRequest, 
  Settings, Info, ShieldCheck, ArrowRight, Sparkles, Terminal 
} from 'lucide-react';

export function GlobalSearchModal({ 
  isOpen, 
  onClose, 
  onSelectTab, 
  onNavigatePage,
  activeRepo 
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const items = [
    // Tabs Navigation
    { id: 'chat', type: 'tool', label: 'Intelligence Chat', desc: 'Query codebase with hybrid vector + AST graph RAG', icon: MessageSquareCode, action: () => { onNavigatePage('dashboard'); onSelectTab('chat'); onClose(); } },
    { id: 'architecture', type: 'tool', label: 'Architecture & Call Graph', desc: 'Inspect module complexity and trace call hierarchies', icon: Network, action: () => { onNavigatePage('dashboard'); onSelectTab('architecture'); onClose(); } },
    { id: 'security', type: 'tool', label: 'Security Command Center', desc: 'Scan for hardcoded secrets and SQL injections', icon: ShieldAlert, action: () => { onNavigatePage('dashboard'); onSelectTab('security'); onClose(); } },
    { id: 'dead_code', type: 'tool', label: 'Dead Code Analyzer', desc: 'Identify unreferenced functions with zero callers', icon: Scissors, action: () => { onNavigatePage('dashboard'); onSelectTab('dead_code'); onClose(); } },
    { id: 'docs', type: 'tool', label: 'Documentation Generator', desc: 'Synthesize Markdown docs for functions and classes', icon: BookOpen, action: () => { onNavigatePage('dashboard'); onSelectTab('docs'); onClose(); } },
    { id: 'uml', type: 'tool', label: 'UML & Class Diagrams', desc: 'Generate Mermaid and PlantUML diagrams', icon: Workflow, action: () => { onNavigatePage('dashboard'); onSelectTab('uml'); onClose(); } },
    { id: 'compare', type: 'tool', label: 'Multi-Repo Comparison', desc: 'Compare architecture between two indexed repos', icon: GitCompare, action: () => { onNavigatePage('dashboard'); onSelectTab('compare'); onClose(); } },
    { id: 'evolution', type: 'tool', label: 'Repository Evolution', desc: 'Diff two versions or commits of a repository', icon: GitCommit, action: () => { onNavigatePage('dashboard'); onSelectTab('evolution'); onClose(); } },
    { id: 'pr', type: 'tool', label: 'Autonomous Pull Request', desc: 'Generate security remediation patches with human approval', icon: GitPullRequest, action: () => { onNavigatePage('dashboard'); onSelectTab('pr'); onClose(); } },

    // Pages
    { id: 'settings', type: 'page', label: 'Settings & API Keys', desc: 'Configure Groq, Gemini, Cohere keys and endpoints', icon: Settings, action: () => { onNavigatePage('settings'); onClose(); } },
    { id: 'about', type: 'page', label: 'About & System Topology', desc: 'Technical specifications and architecture details', icon: Info, action: () => { onNavigatePage('about'); onClose(); } },
    { id: 'privacy', type: 'page', label: 'Privacy & Data Protection', desc: 'Ephemeral cloning and zero-training guarantees', icon: ShieldCheck, action: () => { onNavigatePage('privacy'); onClose(); } },
  ];

  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q);
  });

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      } else if (query.trim()) {
        // Fallback: send query to chat
        onNavigatePage('dashboard');
        onSelectTab('chat');
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-2xl bg-[#0a0e17] border border-white/15 shadow-2xl shadow-indigo-500/10 overflow-hidden flex flex-col"
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/10 bg-white/[0.02]">
          <Search size={18} className="text-indigo-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              activeRepo 
                ? `Search tools, symbols, or query ${activeRepo}...` 
                : 'Search developer tools, settings, pages...'
            }
            className="w-full bg-transparent text-sm text-white placeholder:text-slate-500 font-sans outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-slate-500 hover:text-white p-1"
            >
              <X size={14} />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.08] text-slate-400 border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-1">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-indigo-600/20 text-white border border-indigo-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-indigo-500/30 text-indigo-300' : 'bg-white/[0.04] text-slate-400'
                    }`}>
                      <Icon size={16} />
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold font-sans">{item.label}</span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 uppercase">
                          {item.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans truncate">{item.desc}</div>
                    </div>
                  </div>

                  {isSelected && (
                    <CornerDownLeft size={14} className="text-indigo-400 flex-shrink-0 ml-2" />
                  )}
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center space-y-3">
              <Sparkles size={24} className="mx-auto text-indigo-400/60" />
              <div className="text-xs font-semibold text-slate-200">
                Ask query "{query}" in Intelligence Chat
              </div>
              <button
                onClick={() => {
                  onNavigatePage('dashboard');
                  onSelectTab('chat');
                  onClose();
                }}
                className="btn btn-primary btn-sm gap-1.5 mx-auto"
              >
                <span>Search with Chat RAG</span>
                <CornerDownLeft size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 bg-white/[0.02] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-500">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>CodeBase Intelligence Palette</span>
        </div>
      </div>
    </div>
  );
}
