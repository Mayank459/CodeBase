import React from 'react';
import { Terminal, ArrowLeft, Home, Compass, AlertCircle } from 'lucide-react';

export function NotFoundPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-2xl mx-auto my-12 glass-panel p-8 border-rose-500/30 bg-[#080c14] shadow-2xl space-y-6 text-center">
      <div className="h-16 w-16 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
        <Terminal size={32} />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 font-mono text-xs font-bold border border-rose-500/20">
          <AlertCircle size={13} />
          <span>HTTP 404 • AST_NODE_NOT_FOUND</span>
        </div>
        <h2 className="text-2xl font-extrabold text-white tracking-tight">
          Symbol or Route Unresolved
        </h2>
        <p className="text-xs text-slate-400 font-mono leading-relaxed max-w-md mx-auto">
          The requested path or code symbol could not be traversed in the repository's abstract syntax tree or application state graph.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-black/50 border border-white/[0.06] text-left font-mono text-xs text-slate-400 space-y-1">
        <div className="text-rose-400">$ resolve_graph_node --route current_location</div>
        <div className="text-slate-500">&gt; Traversal failed: 0 incoming edges found</div>
        <div className="text-slate-500">&gt; Returning to root entrypoint...</div>
      </div>

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={onNavigateToDashboard}
          className="btn btn-primary btn-md gap-2"
        >
          <Home size={14} />
          <span>Return to Workstation</span>
        </button>
      </div>
    </div>
  );
}
