import React, { useState } from 'react';
import { 
  FileCode, Network, Database, ChevronDown, ChevronUp, Copy, 
  Check, ExternalLink, ShieldCheck, Tag, GitCommit 
} from 'lucide-react';

export function RetrievalEvidenceDrawer({ evidence, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copiedItem, setCopiedItem] = useState(null);

  if (!evidence || (!evidence.semantic_results?.length && !evidence.graph_context?.length)) {
    return null;
  }

  const semanticResults = evidence.semantic_results || [];
  const graphNodes = evidence.graph_context || [];

  const copyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(key);
    setTimeout(() => setCopiedItem(null), 2000);
  };

  return (
    <div className="mt-3 border border-white/10 rounded-xl bg-[#080c14]/90 overflow-hidden shadow-md">
      {/* Drawer Header Toggle */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-mono bg-white/[0.02] hover:bg-white/[0.05] transition-colors text-left"
      >
        <div className="flex items-center gap-2 text-indigo-300">
          <Database size={13} className="text-cyan-400" />
          <span className="font-semibold font-sans">Grounded Retrieval Evidence</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            {semanticResults.length} Vector Hits • {graphNodes.length} Graph Rel
          </span>
        </div>
        <div className="flex items-center gap-1 text-slate-400">
          <span className="text-[10px]">{expanded ? 'Hide Evidence' : 'Inspect Grounding'}</span>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 space-y-4 text-xs border-t border-white/[0.06] bg-black/30 motion-expand-body">
          {/* 1. Retrieved AST Entities */}
          {semanticResults.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <FileCode size={12} className="text-indigo-400" />
                <span>Vector Entities Matched in Qdrant (Top-k)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {semanticResults.slice(0, 6).map((item, idx) => {
                  const filePath = item.file_path || 'unknown';
                  const entityName = item.name || 'Unnamed';
                  const entityType = item.entity_type || 'code';
                  const itemKey = `entity-${idx}`;

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition-all flex flex-col justify-between gap-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 uppercase">
                            {entityType}
                          </span>
                          <span className="font-mono font-semibold text-slate-200 truncate" title={entityName}>
                            {entityName}
                          </span>
                        </div>
                        <button
                          onClick={() => copyText(`${filePath} (${entityName})`, itemKey)}
                          className="text-slate-500 hover:text-white p-0.5 rounded transition-colors"
                          title="Copy reference"
                        >
                          {copiedItem === itemKey ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        </button>
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 truncate" title={filePath}>
                        📁 {filePath}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Graph Traversal Context */}
          {graphNodes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                <Network size={12} className="text-cyan-400" />
                <span>NetworkX 2-Hop Graph Traversal (Callers & Callees)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {graphNodes.slice(0, 10).map((gNode, idx) => {
                  const nodeName = gNode.node || String(gNode);
                  const nodeType = gNode.metadata?.type || 'node';
                  return (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0c1220] border border-white/[0.08] text-[10px] font-mono text-cyan-300"
                      title={nodeName}
                    >
                      <span className="opacity-50">[{nodeType}]</span>
                      <span className="max-w-[180px] truncate">{nodeName}</span>
                    </span>
                  );
                })}
                {graphNodes.length > 10 && (
                  <span className="px-2 py-1 rounded bg-white/[0.02] text-[10px] font-mono text-slate-500">
                    +{graphNodes.length - 10} more graph relationships
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
