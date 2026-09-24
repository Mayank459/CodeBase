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
    <div className="space-y-16 lg:space-y-24 w-full">
      
      {/* 1. HERO SECTION (Double-Bezel Hardware Architecture) */}
      <section className="bezel-shell relative overflow-hidden">
        <div className="bezel-core relative p-8 sm:p-12 lg:p-16 overflow-hidden">
          {/* Subtle Ambient Radial Illuminations */}
          <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-indigo-500/[0.08] rounded-full blur-3xl pointer-events-none -mr-28 -mt-28" />
          <div className="absolute bottom-0 left-1/3 w-[450px] h-[450px] bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-4xl space-y-8">
            {/* Eyebrow Hardware Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.1] text-indigo-300 text-xs shadow-sm font-matrixtype">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              <span className="tracking-wider uppercase text-[11px] font-semibold text-slate-300">
                LangGraph Multi-Agent Engine • v2.0 Production
              </span>
            </div>

            {/* Hero Display Headline with Optical Descender Balance */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-matrixtype-display">
              Repository Intelligence <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-indigo-300">
                & Full-Stack Code Comprehension.
              </span>
            </h1>

            <p className="text-sm sm:text-base lg:text-lg text-slate-300 leading-relaxed max-w-3xl font-normal">
              Parse complete abstract syntax trees, traverse topological call graphs, audit vulnerabilities, detect dead code, and query logic with hybrid semantic and graph vector search.
            </p>

            {/* Island Button CTAs with Button-in-Button Trailing Icons */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                type="button"
                onClick={() => onNavigatePage('features')}
                className="btn-island pl-6 pr-2.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm shadow-xl shadow-indigo-600/30 cursor-pointer group"
              >
                <span>Launch Workstation</span>
                <div className="btn-island-disc bg-white/20 text-white">
                  <ArrowRight size={15} />
                </div>
              </button>

              <button
                type="button"
                onClick={onOpenIndexer}
                className="btn-island px-5 py-3 bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.1] text-slate-200 hover:text-white cursor-pointer text-sm font-mono"
              >
                <GitBranch size={15} className="text-emerald-400" />
                <span>{activeRepo ? `Active: ${activeRepo}` : 'Ingest Repository'}</span>
              </button>

              <button
                type="button"
                onClick={onOpenSearch}
                className="hidden sm:inline-flex items-center gap-2.5 px-4 py-3 rounded-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.08] text-slate-400 hover:text-slate-200 text-xs font-mono transition-all cursor-pointer"
              >
                <Search size={14} className="text-indigo-400" />
                <span>Command Palette</span>
                <kbd className="px-2 py-0.5 rounded-full bg-white/[0.08] text-[10px] text-slate-300 border border-white/10 font-mono">⌘K</kbd>
              </button>
            </div>
          </div>

          {/* Platform Telemetry Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-10 border-t border-white/[0.08] mt-12">
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-matrixtype tabular-nums">
                99.8%
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                AST parse integrity
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-matrixtype tabular-nums">
                87ms
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                p50 vector latency
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-matrixtype tabular-nums">
                128k
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                sliding context
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-matrixtype">
                AST + Qdrant
              </div>
              <div className="text-[11px] text-slate-400 uppercase tracking-wider font-mono">
                hybrid knowledge
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ASYMMETRICAL BENTO GRID SHOWCASE */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
              <Layers size={13} />
              <span>Full Capability Suite</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight font-matrixtype-display">
              All 9 Developer Tools on One Dedicated Platform
            </h2>
            <p className="text-slate-400 text-sm sm:text-base max-w-2xl">
              Engineered with LangGraph multi-agent orchestration, abstract syntax tree extraction, and topological call graph traversal.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onNavigatePage('features')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/[0.04] border border-white/[0.1] hover:border-indigo-500/40 text-xs font-mono text-indigo-300 hover:text-white transition-all cursor-pointer"
          >
            <span>Open All Tools</span>
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Bento Tile 1: Flagship Intelligence Chat (Spans 2 columns on lg) */}
          <div className="lg:col-span-2 bezel-shell">
            <div className="bezel-core p-7 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shadow-lg">
                    <MessageSquareCode size={24} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-mono px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold tracking-wider">
                      Flagship Agent
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-white/[0.04] text-slate-400 border border-white/[0.06]">
                      LangGraph + Qdrant
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-matrixtype">
                    Repository Intelligence Chat
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed max-w-2xl">
                    Multi-turn conversational code comprehension powered by LangGraph multi-agent routing. Queries the hybrid Qdrant vector space, retrieves AST symbols, and cites exact lines and functions with proof of evidence.
                  </p>
                </div>

                {/* Interactive Telemetry Sample Chips */}
                <div className="pt-2 flex flex-wrap gap-2">
                  {['"Where is session token validation handled?"', '"Trace dependencies of get_current_user"', '"Explain the indexer pipeline"'].map((promptText, i) => (
                    <span key={i} className="text-xs font-mono px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-slate-400">
                      {promptText}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleLaunchTool('chat')}
                  className="btn-island pl-5 pr-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold cursor-pointer group"
                >
                  <span>Launch Intelligence Chat</span>
                  <div className="btn-island-disc bg-white/20 text-white">
                    <ArrowRight size={13} />
                  </div>
                </button>
                <span className="text-xs text-slate-500 font-mono hidden sm:inline">Active Tab: Chat</span>
              </div>
            </div>
          </div>

          {/* Bento Tile 2: Architecture Call Graph (Spans 1 column on lg, featured visual) */}
          <div className="lg:col-span-1 bezel-shell">
            <div className="bezel-core p-7 sm:p-8 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-12 w-12 rounded-xl flex items-center justify-center bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-lg">
                    <Network size={24} />
                  </div>
                  <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-semibold">
                    Interactive 2D
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white tracking-tight font-matrixtype">
                    Architecture Call Graph
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    2D Cytoscape visualizer for complete caller/callee relationships, modular coupling swimlanes, and BFS shortest-path execution traces.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleLaunchTool('architecture')}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.04] hover:bg-cyan-600 border border-white/[0.08] hover:border-cyan-500 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center justify-between cursor-pointer group"
              >
                <span>Explore Topology</span>
                <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Remaining 7 Bento Tiles in Clean Precision Hardware Enclosures */}
          {FEATURES.filter(f => f.id !== 'chat' && f.id !== 'architecture').map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.id} className="bezel-shell">
                <div className="bezel-core p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div 
                        className="h-11 w-11 rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${feat.color}15`, border: `1px solid ${feat.color}35`, color: feat.color }}
                      >
                        <Icon size={20} />
                      </div>
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-white/[0.03] text-slate-400 border border-white/[0.06]">
                        {feat.tag}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-white tracking-tight font-matrixtype">
                      {feat.title}
                    </h3>

                    <p className="text-xs text-slate-400 leading-relaxed">
                      {feat.desc}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLaunchTool(feat.id)}
                    className="w-full py-2 px-3.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all text-xs font-mono flex items-center justify-between cursor-pointer group"
                  >
                    <span>{feat.cta}</span>
                    <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            );
          })}

        </div>
      </section>

      {/* 3. ARCHITECTURE PIPELINE BREAKDOWN (Double-Bezel Hardware Architecture) */}
      <section className="bezel-shell">
        <div className="bezel-core p-8 sm:p-12 space-y-8">
          <div className="max-w-3xl space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono">
              <span>Pipeline Telemetry</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-matrixtype-display">
              How CodeBase Indexes & Comprehends Complex Repositories
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl">
              From raw repository cloning to multi-agent citation, every line of code is structured into an interconnected knowledge topology.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-2 text-xs font-mono">
            {[
              { step: '01', title: 'Shallow Clone', desc: 'depth=1 Git snapshot' },
              { step: '02', title: 'Tree-sitter AST', desc: 'Symbol extraction' },
              { step: '03', title: 'Call Graph', desc: 'NetworkX topology' },
              { step: '04', title: 'Cohere 384-d', desc: 'Dense vector embeddings' },
              { step: '05', title: 'Qdrant Store', desc: 'Hybrid payload index' },
              { step: '06', title: 'LangGraph RAG', desc: 'Multi-agent verification' },
            ].map((s, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/40 transition-colors space-y-2 group">
                <span className="text-cyan-400 font-bold text-xs block font-mono tracking-wider">{s.step}</span>
                <div className="text-slate-200 font-semibold text-xs sm:text-sm tracking-tight group-hover:text-indigo-300 transition-colors">{s.title}</div>
                <div className="text-[11px] text-slate-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}

export default HomePage;
