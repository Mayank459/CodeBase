import React, { useEffect, useRef } from 'react';
import {
  MessageSquareCode, Network, ShieldAlert, Scissors, BookOpen,
  Workflow, GitCompare, GitCommit, GitPullRequest,
} from 'lucide-react';

// The nine tools. `reads` / `returns` describe what each tool actually does with the index.
export const TABS = [
  { id: 'chat', label: 'Chat', tag: 'LangGraph', icon: MessageSquareCode,
    summary: 'Ask about the code. Every answer cites the files and line ranges it read.',
    reads: 'symbols, call graph, vectors', returns: 'cited answer' },
  { id: 'architecture', label: 'Call graph', tag: 'NetworkX', icon: Network,
    summary: 'Callers and callees of any function, module coupling, and the blast radius of a change.',
    reads: 'call graph', returns: 'traversal + diagram' },
  { id: 'security', label: 'Security', tag: 'Static scan', icon: ShieldAlert,
    summary: 'Hardcoded secrets, injection sinks, and unsafe calls, ranked by severity.',
    reads: 'AST call sinks, tokens', returns: 'findings + fixes' },
  { id: 'dead_code', label: 'Dead code', tag: 'Zero callers', icon: Scissors,
    summary: 'Functions and classes nothing calls, with a confidence for each.',
    reads: 'call graph', returns: 'unreferenced symbols' },
  { id: 'docs', label: 'Docs', tag: 'Docstrings', icon: BookOpen,
    summary: 'The public API read from source: signatures, docstrings and coverage, with drafts for anything undocumented.',
    reads: 'signatures, docstrings', returns: 'API reference' },
  { id: 'uml', label: 'UML', tag: 'Mermaid', icon: Workflow,
    summary: 'Class and sequence diagrams generated from the syntax tree.',
    reads: 'classes, calls', returns: 'Mermaid diagram' },
  { id: 'compare', label: 'Compare', tag: 'Two repos', icon: GitCompare,
    summary: 'Up to four repositories side by side: size, API and docs, coupling, dead code, security and shared packages. Missing ones are indexed first.',
    reads: 'two to four indexes', returns: 'side-by-side comparison' },
  { id: 'evolution', label: 'Evolution', tag: 'Git history', icon: GitCommit,
    summary: 'Two versions of one repository compared: breaking API changes first, then added, moved and changed symbols, files, packages and commits.',
    reads: 'git tags and branches', returns: 'version diff' },
  { id: 'pr', label: 'Pull request', tag: 'Human approval', icon: GitPullRequest,
    summary: 'Security findings turned into real diffs. You pick which fixes to keep and approve them; you get a patch file and PR text. Nothing is pushed.',
    reads: 'security findings', returns: 'patch + PR text' },
];

export function TabNavigation({ activeTab, onSelectTab }) {
  const tabRefs = useRef({});

  // Alt+1 … Alt+9 switch tools
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      const tab = TABS[Number(e.key) - 1];
      if (tab) { e.preventDefault(); onSelectTab(tab.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSelectTab]);

  useEffect(() => {
    tabRefs.current[activeTab]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  // Arrow keys move between tabs (WAI-ARIA tabs pattern)
  const onKeyDown = (e) => {
    const i = TABS.findIndex((t) => t.id === activeTab);
    const next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const tab = TABS[(next + TABS.length) % TABS.length];
    onSelectTab(tab.id);
    tabRefs.current[tab.id]?.focus();
  };

  return (
    <div role="tablist" aria-label="Tools" className="folder-tabs" onKeyDown={onKeyDown}>
      {TABS.map((tab, i) => {
        const Icon = tab.icon;
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            ref={(el) => (tabRefs.current[tab.id] = el)}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onSelectTab(tab.id)}
            className="folder-tab"
            title={`${tab.summary} (Alt+${i + 1})`}
          >
            <span className="folder-num">{String(i + 1).padStart(2, '0')}</span>
            <Icon size={15} strokeWidth={2} aria-hidden="true" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
