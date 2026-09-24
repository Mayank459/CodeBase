import React from 'react';
import { 
  Network, Shield, Workflow, GitCompare, GitPullRequest, 
  Layers, Terminal, Sparkles, Cpu
} from 'lucide-react';

const CHIPS = [
  { id: 'ast', label: 'AST Retrieval', tab: 'chat', color: '#06B6D4', query: 'Show all AST classes and methods in this repository' },
  { id: 'graph', label: 'Graph BFS', tab: 'architecture', color: '#14B8A6' },
  { id: 'security', label: 'Security Scan', tab: 'security', color: '#F43F5E' },
  { id: 'uml', label: 'UML Generator', tab: 'uml', color: '#F59E0B' },
  { id: 'tracer', label: 'Call Flow Tracer', tab: 'chat', color: '#F97316', query: 'Trace end-to-end execution flow of requests' },
  { id: 'pr', label: 'PR Gate', tab: 'pr', color: '#A855F7' },
  { id: 'diff', label: 'Diff Viewer', tab: 'compare', color: '#3B82F6' },
];

export function FeatureChipsStrip({ onSelectTab, onSendQuery }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto py-2.5 px-3 rounded-2xl bg-[#0b101c]/60 border border-white/[0.08] backdrop-blur-md mb-5 scrollbar-none shadow-lg">
      <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5 pr-2">
        <Sparkles size={12} className="text-cyan-400" />
        Capabilities:
      </span>

      {CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={() => {
            if (chip.tab) onSelectTab(chip.tab);
            if (chip.query && onSendQuery) onSendQuery(chip.query);
          }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/20 active:scale-[0.96] text-xs font-mono text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer shadow-sm group"
        >
          <span
            className="h-1.5 w-1.5 rounded-full transition-transform group-hover:scale-150"
            style={{ backgroundColor: chip.color, boxShadow: `0 0 10px ${chip.color}` }}
          />
          <span>{chip.label}</span>
        </button>
      ))}
    </div>
  );
}

export default FeatureChipsStrip;
