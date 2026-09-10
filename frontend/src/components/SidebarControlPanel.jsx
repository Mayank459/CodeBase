import React from 'react';
import { 
  GitBranch, Check, Layers, Database, Shield, RefreshCw, 
  Sparkles, ExternalLink, Activity, Cpu, Server, ChevronRight
} from 'lucide-react';

const RECENT_REPOS = [
  { name: 'psf/requests', timeAgo: '5h ago', entities: '661' },
  { name: 'django/django', timeAgo: '2h ago', entities: '4.2k' },
  { name: 'fastapi/fastapi', timeAgo: '1d ago', entities: '1.8k' },
];

export function SidebarControlPanel({
  activeRepo,
  onSelectRepo,
  indexStats,
  onOpenIndexer,
  keepAlive,
  onSelectTab
}) {
  const { online, latency } = keepAlive || { online: true, latency: 87 };

  return (
    <aside className="w-full lg:w-72 shrink-0 space-y-4">
      
      {/* 1. ACTIVE REPOSITORY CARD */}
      <div className="p-4 rounded-xl bg-[#0f1420] border border-white/[0.08] shadow-xl relative overflow-hidden">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
          <span>Active Repository</span>
          <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ready
          </span>
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <GitBranch size={15} className="text-indigo-400 shrink-0 mt-0.5" />
          <h3 className="font-mono text-sm font-bold text-white truncate" title={activeRepo || 'psf/requests'}>
            {activeRepo || 'psf/requests'}
          </h3>
        </div>

        {/* Entities / Edges Metric Pills */}
        <div className="grid grid-cols-2 gap-2 my-3">
          <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
            <div className="text-[10px] font-mono text-slate-400">Entities</div>
            <div className="text-xs font-mono font-bold text-cyan-300">
              {indexStats?.entities_indexed || '661'}
            </div>
          </div>
          <div className="px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-center">
            <div className="text-[10px] font-mono text-slate-400">Call Edges</div>
            <div className="text-xs font-mono font-bold text-indigo-300">
              {indexStats?.edges_count || '916'}
            </div>
          </div>
        </div>

        {/* Switch Repository Button */}
        <button
          type="button"
          onClick={onOpenIndexer}
          className="w-full py-1.5 px-3 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all text-xs font-mono flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <RefreshCw size={11} className="text-cyan-400" />
          <span>Switch Repository</span>
        </button>
      </div>

      {/* 2. INGESTION PIPELINE STEPPER (Figma Style) */}
      <div className="p-4 rounded-xl bg-[#0f1420] border border-white/[0.08] shadow-xl space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Ingestion Pipeline</span>
          <span className="text-[10px] font-mono text-indigo-400">AST + Qdrant</span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px]">✓</span>
              <span>Clone & Ingest</span>
            </span>
            <span className="text-[10px] text-slate-500">done</span>
          </div>

          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px]">✓</span>
              <span>Parse AST Trees</span>
            </span>
            <span className="text-[10px] text-slate-500">done</span>
          </div>

          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px]">✓</span>
              <span>Extract Entities</span>
            </span>
            <span className="text-[10px] text-slate-500">done</span>
          </div>

          <div className="flex items-center justify-between text-emerald-400">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-[10px]">✓</span>
              <span>Build Call Graph</span>
            </span>
            <span className="text-[10px] text-slate-500">done</span>
          </div>

          <div className="flex items-center justify-between text-indigo-300">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-[10px]">●</span>
              <span>Vector Embed</span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold uppercase">active</span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full bg-white/[0.04] border border-white/[0.1] flex items-center justify-center text-[10px]">○</span>
              <span>Semantic Index</span>
            </span>
            <span className="text-[10px] text-slate-500">ready</span>
          </div>
        </div>
      </div>

      {/* 3. RECENTLY ANALYZED */}
      <div className="p-4 rounded-xl bg-[#0f1420] border border-white/[0.08] shadow-xl space-y-2.5">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Recently Analyzed
        </div>

        <div className="space-y-1.5">
          {RECENT_REPOS.map((repo) => (
            <button
              key={repo.name}
              type="button"
              onClick={() => onSelectRepo(repo.name)}
              className={`w-full p-2 rounded-lg text-left transition-all flex items-center justify-between font-mono text-xs cursor-pointer ${
                activeRepo === repo.name
                  ? 'bg-indigo-600/15 border border-indigo-500/30 text-white'
                  : 'bg-white/[0.02] hover:bg-white/[0.05] border border-transparent text-slate-300'
              }`}
            >
              <div className="truncate max-w-[140px]">
                <span className="text-slate-400 text-[10px]">github/</span>
                <span className="font-semibold text-slate-200">{repo.name.split('/')[1]}</span>
              </div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                <span>{repo.timeAgo}</span>
                <span className="text-cyan-400 font-medium">| {repo.entities}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 4. SYSTEM HEALTH FOOTER */}
      <div className="p-3.5 rounded-xl bg-[#0b0e17] border border-white/[0.06] text-xs font-mono space-y-2">
        <div className="text-[10px] uppercase tracking-wider text-slate-400">System Health</div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>LLM Runtime</span>
          </span>
          <span className="text-emerald-400 font-semibold">{latency ? `${latency}ms` : 'nominal'}</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Vector DB</span>
          </span>
          <span className="text-emerald-400 font-semibold">nominal</span>
        </div>
        <div className="flex items-center justify-between text-slate-300 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>AST Parser</span>
          </span>
          <span className="text-emerald-400 font-semibold">nominal</span>
        </div>
      </div>

    </aside>
  );
}

export default SidebarControlPanel;
