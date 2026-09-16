import React from 'react';
import { 
  Sparkles, ArrowRight, ShieldAlert, Network, MessageSquareCode, 
  Scissors, BookOpen, Workflow, GitCompare, GitCommit, GitPullRequest, 
  GitBranch, Database, Zap, Cpu, CheckCircle2, ChevronRight, Layers, Search
} from 'lucide-react';


export function HomePage({ 
  onNavigatePage, 
  onSelectTab, 
  activeRepo, 
  onOpenIndexer,
  onOpenSearch 
}) {
  const handleLaunchTool = (tabId) => {
    onSelectTab(tabId);
    onNavigatePage('features');
  };

  const FEATURES = [
    {
      id: 'chat',
      title: 'Repository Intelligence Chat',
      tag: 'LangGraph + Qdrant',
      color: '#6366f1',
      icon: MessageSquareCode,
      desc: 'Contextual code comprehension with LangGraph multi-agent orchestration, hybrid vector search, and AST citation evidence.',
      cta: 'Launch AI Chat'
    },
    {
      id: 'architecture',
      title: 'Architecture Call Graph',
      tag: 'NetworkX + AST',
      color: '#06b6d4',
      icon: Network,
      desc: 'Interactive 2D topological call graph visualizer. Trace caller/callee relationships, BFS traversal paths, and modular coupling.',
      cta: 'Explore Graph'
    },
    {
      id: 'security',
      title: 'Automated Security Audit',
      tag: 'CVE Scanner',
      color: '#f43f5e',
      icon: ShieldAlert,
      desc: 'Static vulnerability assessment across dependencies and code surfaces with CVSS risk scores, severity badges, and remediation steps.',
      cta: 'Run Security Scan'
    },
    {
      id: 'dead_code',
      title: 'Dead Code Detection',
      tag: 'Symbol Hygiene',
      color: '#10b981',
      icon: Scissors,
      desc: 'AST-based static symbol resolution identifying unreferenced functions, dangling classes, and zero-callsite methods.',
      cta: 'Scan Dead Code'
    },
    {
      id: 'docs',
      title: 'Documentation Generator',
      tag: 'Automated Docstrings',
      color: '#f59e0b',
      icon: BookOpen,
      desc: 'Automated generation of Google/NumPy docstrings, parameter specifications, exception handling, and full module overviews.',
      cta: 'Generate Docs'
    },
    {
      id: 'uml',
      title: 'UML Class & Sequence Models',
      tag: 'Mermaid Engine',
      color: '#a855f7',
      icon: Workflow,
      desc: 'Transform raw abstract syntax trees into interactive sequence diagrams, class hierarchies, and execution flow charts.',
      cta: 'View UML Models'
    },
    {
      id: 'compare',
      title: 'Multi-Repo Semantic Diff',
      tag: 'Cross-Repo Analytics',
      color: '#3b82f6',
      icon: GitCompare,
      desc: 'Compare architectural drift and semantic implementations between multiple repositories or divergent forks side by side.',
      cta: 'Compare Repos'
    },
    {
      id: 'evolution',
      title: 'Commit Evolution Tracker',
      tag: 'Git Timeline',
      color: '#ec4899',
      icon: GitCommit,
      desc: 'Trace structural modifications and complexity shifts across commit history with AST change velocity telemetry.',
      cta: 'Track Evolution'
    },
    {
      id: 'pr',
      title: 'Autonomous Remediation PR',
      tag: 'HITL Workflow',
      color: '#8b5cf6',
      icon: GitPullRequest,
      desc: 'Generate automated GitHub pull request patches for identified vulnerabilities and dead code with Human-In-The-Loop review.',
      cta: 'Review PR Gate'
    },
  ];

  return (
    <div className="space-y-16 lg:space-y-20 w-full">
      
      {/* 1. HERO SECTION (Cosmo Core Typography) */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#0f172a]/90 via-[#0d1322]/70 to-[#07090e] p-8 sm:p-12 lg:p-16 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-8">
          {/* Top Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs shadow-sm font-matrixtype">
            <Sparkles size={14} className="text-cyan-400 animate-spin" />
            <span className="tracking-wide font-matrixtype">
              LangGraph Multi-Agent RAG v2.0 • Senior Developer Workstation
            </span>
          </div>

          {/* Hero Main Headline (Matrixtype Display) */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-wide leading-[1.15] font-matrixtype-display">
            Repository Intelligence <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300">
              & Full-Stack Code Comprehension.
            </span>
          </h1>

          <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-3xl font-normal">
            Parse complete abstract syntax trees, traverse topological call graphs, audit vulnerabilities, detect dead code, and query logic with hybrid semantic and graph vector search.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => onNavigatePage('features')}
              className="px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2.5 group tracking-wide font-matrixtype"
            >
              <Zap size={16} className="text-cyan-200 group-hover:scale-110 transition-transform" />
              <span>Open Features Workstation</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              type="button"
              onClick={onOpenIndexer}
              className="px-5 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-200 hover:text-white transition-all cursor-pointer text-sm flex items-center gap-2.5 tracking-wide font-matrixtype"
            >
              <GitBranch size={16} className="text-indigo-400" />
              <span>{activeRepo ? `Manage: ${activeRepo}` : 'Ingest Repository'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenSearch}
              className="hidden sm:inline-flex items-center gap-2.5 px-4 py-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-mono transition-all cursor-pointer"
            >
              <Search size={14} className="text-indigo-400" />
              <span>Command Palette</span>
              <kbd className="px-2 py-0.5 rounded bg-white/[0.06] text-[11px] text-slate-400 border border-white/10">⌘K</kbd>
            </button>
          </div>
        </div>

        {/* 2. PLATFORM METRICS BANNER (Matrixtype Typography) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-12 border-t border-white/[0.08] mt-12">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide font-matrixtype">
              99.99%
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-matrixtype">
              uptime SLA
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide font-matrixtype">
              87ms
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-matrixtype">
              p50 query latency
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide font-matrixtype">
              128k
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-matrixtype">
              sliding context
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-wide font-matrixtype">
              AST + Qdrant
            </div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-matrixtype">
              hybrid retrieval
            </div>
          </div>
        </div>





      </section>

      {/* 2. DEDICATED FEATURES MATRIX SHOWCASE (Matrixtype Typography) */}
      <section className="space-y-8">

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-matrixtype">
              <Layers size={13} />
              <span>Full Capability Suite</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-wide font-matrixtype-display">
              All 9 Developer Tools on One Dedicated Platform
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
              Select any capability below to launch directly into the dedicated features workstation.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigatePage('features')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 text-xs font-matrixtype text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer tracking-wide"
          >
            <span>Open All Tools in Workstation</span>
            <ChevronRight size={15} />
          </button>
        </div>

        {/* 9 Cards Grid Spaced Out */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            return (
              <div
                key={feat.id}
                className="group relative p-7 rounded-2xl bg-[#0f1420] border border-white/[0.08] hover:border-indigo-500/40 transition-all duration-300 flex flex-col justify-between space-y-6 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div 
                      className="h-12 w-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg"
                      style={{ backgroundColor: `${feat.color}18`, border: `1px solid ${feat.color}40`, color: feat.color }}
                    >
                      <Icon size={22} />
                    </div>
                    <span className="text-[11px] font-matrixtype px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06] tracking-wide">
                      {feat.tag}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors font-matrixtype tracking-tight">
                    {feat.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchTool(feat.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-white/[0.03] hover:bg-indigo-600 border border-white/[0.08] hover:border-indigo-500 text-slate-300 hover:text-white transition-all text-xs sm:text-sm font-matrixtype flex items-center justify-between cursor-pointer group-hover:border-indigo-500/40 tracking-wide"
                >
                  <span className="font-semibold">{feat.cta}</span>
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. ARCHITECTURE PIPELINE BREAKDOWN (Spacious Full Width) */}
      <section className="p-8 sm:p-12 rounded-3xl bg-[#0a0e17] border border-white/[0.08] space-y-8 shadow-xl">
        <div className="max-w-3xl space-y-2">
          <div className="text-[11px] font-matrixtype text-indigo-400 uppercase tracking-wider font-bold">
            Execution Pipeline Architecture
          </div>
          <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-wide font-matrixtype-display">
            How CodeBase Indexes & Comprehends Complex Repositories
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            From raw repository cloning to multi-agent citation, every line of code is structured into an interconnected knowledge topology.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 text-xs font-matrixtype">
          {[
            { step: '01', title: 'Shallow Clone', desc: 'depth=1 Git snapshot' },
            { step: '02', title: 'Tree-sitter AST', desc: 'Symbol extraction' },
            { step: '03', title: 'Call Graph', desc: 'NetworkX topology' },
            { step: '04', title: 'Cohere 384-d', desc: 'Dense vector embeddings' },
            { step: '05', title: 'Qdrant Store', desc: 'Hybrid payload index' },
            { step: '06', title: 'LangGraph RAG', desc: 'Multi-agent verification' },
          ].map((s, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition-colors space-y-2">
              <span className="text-indigo-400 font-bold text-xs block font-matrixtype">{s.step}</span>
              <div className="text-slate-200 font-semibold text-xs sm:text-sm font-matrixtype tracking-tight">{s.title}</div>
              <div className="text-[11px] text-slate-400">{s.desc}</div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}

export default HomePage;
