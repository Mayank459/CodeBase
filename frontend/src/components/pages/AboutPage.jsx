import React from 'react';
import { 
  Cpu, Network, Database, Sparkles, GitBranch, Shield, 
  Terminal, Layers, Code2, ExternalLink, CheckCircle2, ArrowRight, ArrowLeft
} from 'lucide-react';

function GitHubIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

export function AboutPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Hero Header */}
      <div className="glass-panel p-8 relative overflow-hidden border-white/[0.08]">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <button
            type="button"
            onClick={onNavigateToDashboard}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-1 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={13} className="text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Workstation</span>
          </button>

          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
            <Sparkles size={12} className="text-cyan-400" />
            <span>Developer Intelligence Platform • Architecture Specification</span>
          </div>

          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            About CodeBase RAG Assistant
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
            An open-source repository understanding and developer intelligence engine. Designed to bridge the gap between compiler AST structures, non-linear call hierarchies, and modern Large Language Models.
          </p>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onNavigateToDashboard}
              className="btn btn-primary btn-sm gap-2"
            >
              <span>Launch Workstation</span>
              <ArrowRight size={13} />
            </button>

            <a
              href="https://github.com/Mayank459/CodeBase"
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm gap-2"
            >
              <GitHubIcon size={14} />
              <span>GitHub Repository</span>
              <ExternalLink size={11} className="text-slate-500" />
            </a>
          </div>
        </div>
      </div>

      {/* The Core Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel p-6 border-rose-500/20 bg-rose-500/[0.02] space-y-3">
          <h3 className="text-sm font-bold text-rose-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span>❌ Why Naive RAG Fails on Code</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Standard document RAG treats code like plain text, chunking blindly by character or line counts. This destroys class hierarchies, severs caller from callee, drops import contexts, and leads to hallucinations when asked about runtime execution paths.
          </p>
        </div>

        <div className="glass-panel p-6 border-emerald-500/20 bg-emerald-500/[0.02] space-y-3">
          <h3 className="text-sm font-bold text-emerald-300 uppercase tracking-wider font-mono flex items-center gap-2">
            <span>✓ The CodeBase Hybrid Solution</span>
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            CodeBase parses compiler Abstract Syntax Trees using <strong>Tree-sitter</strong>, constructs an explicit <strong>NetworkX Directed Dependency Graph</strong>, and joins top-k <strong>Cohere dense vector embeddings</strong> with a 2-hop BFS graph traversal for context-grounded reasoning.
          </p>
        </div>
      </div>

      {/* System Architecture Flow */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <h3 className="text-base font-semibold text-white">System Architecture & Processing Pipeline</h3>
          <span className="badge badge-primary text-[10px]">End-to-End Topology</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/[0.06] space-y-1.5">
            <span className="text-[10px] text-indigo-400 font-bold block">TIER 1 • INGESTION</span>
            <div className="font-semibold text-white">Tree-sitter AST</div>
            <p className="text-[11px] text-slate-400 font-sans">
              Recursively parses classes, functions, calls, imports, and variables across 30+ extensions.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/[0.06] space-y-1.5">
            <span className="text-[10px] text-cyan-400 font-bold block">TIER 2 • TOPOLOGY</span>
            <div className="font-semibold text-white">NetworkX DiGraph</div>
            <p className="text-[11px] text-slate-400 font-sans">
              Directed call graph connecting modules, functions, classes, and inheritance edges.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/[0.06] space-y-1.5">
            <span className="text-[10px] text-emerald-400 font-bold block">TIER 3 • VECTORS</span>
            <div className="font-semibold text-white">Cohere + Qdrant</div>
            <p className="text-[11px] text-slate-400 font-sans">
              384-dim light embeddings stored in Qdrant with isolated repository payload indexing.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-[#090d16] border border-white/[0.06] space-y-1.5">
            <span className="text-[10px] text-amber-400 font-bold block">TIER 4 • AGENTS</span>
            <div className="font-semibold text-white">LangGraph Engine</div>
            <p className="text-[11px] text-slate-400 font-sans">
              14-node StateGraph routing chat, security audits, dead code detection, and HITL gates.
            </p>
          </div>
        </div>
      </div>

      {/* Tech Stack Matrix */}
      <div className="glass-panel p-6 space-y-4">
        <h3 className="text-base font-semibold text-white pb-3 border-b border-white/[0.08]">
          Technology Stack
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Frontend</span>
            <span className="text-indigo-300 font-semibold">React 19 + Vite</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Backend Gateway</span>
            <span className="text-cyan-300 font-semibold">FastAPI (Python 3.12)</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Agent Framework</span>
            <span className="text-emerald-300 font-semibold">LangGraph StateGraph</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Vector Database</span>
            <span className="text-amber-300 font-semibold">Qdrant Vector DB</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Embeddings</span>
            <span className="text-indigo-300 font-semibold">Cohere 384-dim</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Primary Inference</span>
            <span className="text-cyan-300 font-semibold">Groq LPU (Qwen/Llama)</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Fallback Inference</span>
            <span className="text-emerald-300 font-semibold">Google Gemini 2.5</span>
          </div>
          <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
            <span className="text-slate-500 text-[10px] block">Code Parsing</span>
            <span className="text-amber-300 font-semibold">Tree-sitter AST</span>
          </div>
        </div>
      </div>

      {/* Author & Open Source Details */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono">
        <div>
          <div className="font-semibold text-slate-200">Maintained & Built by Mayank</div>
          <div className="text-slate-400">Open-source software licensed under MIT.</div>
        </div>
        <a
          href="https://github.com/Mayank459/CodeBase"
          target="_blank"
          rel="noreferrer"
          className="btn btn-secondary btn-sm gap-2"
        >
          <GitHubIcon size={14} />
          <span>Star on GitHub</span>
        </a>
      </div>
    </div>
  );
}
