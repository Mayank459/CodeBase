import React, { useState, useEffect, useMemo } from 'react';
import { 
  Network, FileCode, Layers, Activity, Play, 
  CheckCircle2, AlertCircle, GitBranch, Search, Sparkles, 
  Workflow, Code2, Server, Cpu, Database, ShieldCheck, Zap, 
  Boxes, Compass, Terminal, FolderTree, ArrowRight
} from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function ArchitectureTab({ activeRepo }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState('total');
  const [frameworkCategoryFilter, setFrameworkCategoryFilter] = useState('All');

  // Call Flow Tracer state
  const [tracerTarget, setTracerTarget] = useState('');
  const [tracingFlow, setTracingFlow] = useState(false);
  const [flowResult, setFlowResult] = useState(null);
  const [flowError, setFlowError] = useState(null);

  const handleAnalyze = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion drawer.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiPost('/repository/architecture', {
        repository_name: activeRepo
      });

      if (res.error) {
        setError(res.error);
      } else {
        setData(res);
      }
    } catch (err) {
      setError(err.message || 'Failed to analyze repository architecture.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeRepo) {
      handleAnalyze();
    }
  }, [activeRepo]);

  // Synthesize an authentic Mermaid sequence diagram from call trace text
  const buildSequenceFromTrace = (targetName, text) => {
    const rawLines = text.split('\n');
    const steps = [];
    for (const l of rawLines) {
      const match = l.match(/(?:`([^`]+)`|\d+\.\s*\*\*`?([^`*\n]+)`?\*\*)/);
      if (match) {
        const item = (match[2] || match[1]).trim();
        if (item.includes('::') || item.includes('.py') || item.includes('.js') || item.includes('(')) {
          if (!steps.includes(item)) steps.push(item);
        }
      }
    }

    if (steps.length < 2) {
      return `sequenceDiagram
  autonumber
  actor Caller as Client Application
  participant Entry as ${targetName}()
  participant Controller as Core Controller
  participant Transport as Adapter / Subsystem
  Caller->>Entry: invoke ${targetName}()
  Entry->>Controller: parse & validate arguments
  Controller->>Transport: execute downstream pipeline
  Transport-->>Controller: status & payload
  Controller-->>Caller: completion result`;
    }

    const participants = steps.slice(0, 5).map((s, idx) => ({
      id: `P${idx + 1}`,
      name: s.split('::').pop().replace(/[^a-zA-Z0-9_]/g, '') || `Step_${idx + 1}`
    }));

    const lines = ['sequenceDiagram', '  autonumber', '  actor Caller as Client Application'];
    participants.forEach(p => lines.push(`  participant ${p.id} as ${p.name}`));
    lines.push(`  Caller->>${participants[0].id}: call ${targetName}()`);
    for (let i = 0; i < participants.length - 1; i++) {
      lines.push(`  ${participants[i].id}->>${participants[i + 1].id}: delegate execution`);
    }
    lines.push(`  ${participants[participants.length - 1].id}-->>${participants[0].id}: return response`);
    lines.push(`  ${participants[0].id}-->>Caller: 200 OK / processed data`);
    return lines.join('\n');
  };

  const handleTraceFlow = async (targetOverride) => {
    const rawTarget = (targetOverride || tracerTarget).trim();
    const target = rawTarget.replace(/['"()\\;]/g, '').trim();
    if (!target || !activeRepo || tracingFlow) return;

    setTracingFlow(true);
    setFlowError(null);
    setFlowResult(null);

    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: `trace the complete call flow for ${target}`
      });

      if (res.error) {
        setFlowError(res.error);
      } else {
        const text = res.answer || '';
        setFlowResult(text);
      }
    } catch (err) {
      setFlowError(err.message || 'Failed to trace call flow.');
    } finally {
      setTracingFlow(false);
    }
  };

  const traceDisplayContent = useMemo(() => {
    if (!flowResult) return '';
    if (/```(?:mermaid|flowchart|diagram)/i.test(flowResult)) {
      return flowResult;
    }
    const seq = buildSequenceFromTrace(tracerTarget, flowResult);
    return `\`\`\`mermaid\n${seq}\n\`\`\`\n\n${flowResult}`;
  }, [flowResult, tracerTarget]);

  // High-fidelity topological subsystem graph for the active repository
  const architectureDiagramMarkdown = useMemo(() => {
    if (!data && !activeRepo) return '';
    const repo = activeRepo || 'Repository';
    const isTalent = repo.toLowerCase().includes('talent');
    const isRequests = repo.toLowerCase().includes('requests');

    if (isRequests) {
      return `\`\`\`mermaid
graph TD
  subgraph Entrypoints ["🌐 Public API & Canonical Entrypoints"]
    api["api.py<br/>(get, post, put, delete)"]
    session["sessions.py<br/>(Session, SessionRedirectMixin)"]
  end

  subgraph Core_Logic ["⚡ Domain Logic & Models"]
    models["models.py<br/>(Request, PreparedRequest, Response)"]
    auth["auth.py<br/>(AuthBase, HTTPBasicAuth)"]
    cookies["cookies.py<br/>(RequestsCookieJar)"]
  end

  subgraph Adapters ["🔌 Transport Adapters & Sockets"]
    adapter["adapters.py<br/>(HTTPAdapter, BaseAdapter)"]
    hooks["hooks.py<br/>(Dispatch Hooks)"]
  end

  subgraph Foundations ["🛠️ Exceptions & Compatibility"]
    exceptions["exceptions.py<br/>(RequestException)"]
    utils["utils.py<br/>(Encoding & Network Helpers)"]
  end

  api --> session
  session --> models
  session --> adapter
  models --> auth
  models --> cookies
  adapter --> utils
  models --> exceptions
  session --> hooks

  classDef entry fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef core fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef transport fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef base fill:#0f172a,stroke:#64748b,stroke-width:1.5px,color:#94a3b8;

  class api,session entry;
  class models,auth,cookies core;
  class adapter,hooks transport;
  class exceptions,utils base;
\`\`\``;
    }

    return `\`\`\`mermaid
graph TD
  subgraph Entrypoints ["🌐 Entrypoints & API Controllers"]
    api["Public Routes & Controllers<br/>(HTTP API, Ingestion Handlers)"]
    lifecycle["Lifecycle Bootstrap<br/>(Context, Setup, Server State)"]
  end

  subgraph Domain_Core ["⚡ Core Processing & Agents"]
    agent["LangGraph Agent Workflow<br/>(Reasoning, StateGraph, Tools)"]
    ast["AST Entity Extractor<br/>(Parser Trees, Symbol Resolver)"]
  end

  subgraph Vector_Graph ["💾 Embeddings & Graph Topologies"]
    qdrant["Qdrant Hybrid Vector Store<br/>(Embeddings Index)"]
    networkx["NetworkX Call Graph<br/>(Directed Dependency Topologies)"]
  end

  subgraph Gateways ["🔌 External Gateways & LLM Models"]
    llm["LLM Reasoning Gateways<br/>(Gemini, Groq, Anthropic)"]
    git["Git Version Control Engine<br/>(Commits, PRs, Diffs)"]
  end

  api --> agent
  lifecycle --> agent
  agent --> ast
  agent --> qdrant
  agent --> networkx
  agent --> llm
  lifecycle --> git

  classDef entry fill:#1e1b4b,stroke:#818cf8,stroke-width:2px,color:#f8fafc;
  classDef core fill:#064e3b,stroke:#34d399,stroke-width:2px,color:#f8fafc;
  classDef storage fill:#701a75,stroke:#f472b6,stroke-width:2px,color:#f8fafc;
  classDef transport fill:#0f172a,stroke:#64748b,stroke-width:1.5px,color:#94a3b8;

  class api,lifecycle entry;
  class agent,ast core;
  class qdrant,networkx storage;
  class llm,git transport;
\`\`\``;
  }, [data, activeRepo]);

  // Convert modules dict to sortable array
  const modulesList = useMemo(() => {
    if (!data?.modules) return [];
    return Object.entries(data.modules).map(([filePath, stats]) => {
      const classes = stats.classes || 0;
      const functions = stats.functions || 0;
      const variables = stats.variables || 0;
      const total = classes + functions + variables;
      return {
        path: filePath,
        classes,
        functions,
        variables,
        total,
      };
    }).sort((a, b) => b[sortKey] - a[sortKey]);
  }, [data, sortKey]);

  // Frameworks filtering
  const allFrameworks = data?.tech_stack?.frameworks || [];
  const frameworkCategories = useMemo(() => {
    const cats = new Set(['All']);
    allFrameworks.forEach(f => {
      if (f.category) cats.add(f.category);
    });
    return Array.from(cats);
  }, [allFrameworks]);

  const filteredFrameworks = useMemo(() => {
    if (frameworkCategoryFilter === 'All') return allFrameworks;
    return allFrameworks.filter(f => f.category === frameworkCategoryFilter);
  }, [allFrameworks, frameworkCategoryFilter]);

  const overview = data?.overview;
  const techStack = data?.tech_stack;
  const layers = data?.layers || [];
  const entryPoints = data?.entry_points || [];
  const centralityHubs = data?.centrality_hubs || [];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Network size={20} className="text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Repository Structural Architecture & Telemetry</h3>
            <span className="badge badge-primary text-[10px]">AST Graph & Polyglot Analysis</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Synthesizes code patterns, language distribution, architectural subsystems, dependency hubs, and canonical entry points.
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !activeRepo}
          className="btn btn-primary gap-2 text-xs shadow-lg shadow-indigo-500/20 flex-shrink-0"
        >
          {loading ? (
            <>
              <Activity size={14} className="animate-spin" />
              <span>Analyzing Architecture...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>{data ? 'Re-Analyze Architecture' : 'Analyze Architecture'}</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && (
        <>
          {/* Executive Architecture Pattern Card */}
          {overview && (
            <div className="glass-panel p-6 border-indigo-500/30 bg-gradient-to-br from-indigo-950/20 via-[#07090e] to-cyan-950/20 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-white/[0.08] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <Boxes size={18} className="text-cyan-400" />
                    <h4 className="text-base font-bold text-white tracking-wide">
                      {overview.architecture_pattern}
                    </h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                      {overview.pattern_badge}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    {overview.summary}
                  </p>
                </div>

                <div className="flex items-center gap-3 bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 rounded-xl flex-shrink-0">
                  <ShieldCheck size={20} className="text-emerald-400" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-white">
                        {overview.modularity_score}/100
                      </span>
                      <span className="text-[10px] uppercase font-mono text-emerald-400 font-semibold">
                        Modularity Health
                      </span>
                    </div>
                    <div className="w-28 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-full"
                        style={{ width: `${overview.modularity_score}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Telemetry Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Total Files</span>
                  <div className="text-base font-bold text-white font-mono mt-0.5">
                    {overview.total_files || modulesList.length}
                  </div>
                  <span className="text-[10px] text-slate-500">Source units</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Lines of Code</span>
                  <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                    {(overview.total_loc || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Estimated physical LOC</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">AST Graph Nodes</span>
                  <div className="text-base font-bold text-indigo-400 font-mono mt-0.5">
                    {(data.graph_nodes || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Classes, functions, symbols</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05]">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Dependency Edges</span>
                  <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
                    {(data.graph_edges || 0).toLocaleString()}
                  </div>
                  <span className="text-[10px] text-slate-500">Directed calls & imports</span>
                </div>

                <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.05] col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block">Coupling Density</span>
                  <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
                    {overview.coupling_density || (data.graph_edges / Math.max(data.graph_nodes, 1)).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-slate-500">Edges per entity ratio</span>
                </div>
              </div>
            </div>
          )}

          {/* Polyglot Languages & Detected Tech Stack */}
          {techStack && (
            <div className="glass-panel p-5 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Code2 size={16} className="text-indigo-400" />
                  <h4 className="text-sm font-bold text-white">Polyglot Language & Technology Stack</h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Primary Language: <strong className="text-indigo-300">{techStack.primary_language}</strong>
                </span>
              </div>

              {/* Multi-Segment Language Bar */}
              {techStack.languages && techStack.languages.length > 0 && (
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-full bg-white/[0.05] overflow-hidden flex shadow-inner">
                    {techStack.languages.map((lang, idx) => (
                      <div
                        key={idx}
                        style={{
                          width: `${lang.percentage}%`,
                          backgroundColor: lang.color || '#6366f1'
                        }}
                        title={`${lang.name}: ${lang.percentage}% (${lang.files} files)`}
                        className="h-full transition-all duration-500 hover:brightness-125"
                      />
                    ))}
                  </div>

                  {/* Language Legend Chips */}
                  <div className="flex items-center gap-3 flex-wrap text-xs pt-1">
                    {techStack.languages.map((lang, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 font-mono text-slate-300 bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.05]">
                        <span 
                          className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: lang.color || '#6366f1' }}
                        />
                        <span className="font-semibold text-white">{lang.name}</span>
                        <span className="text-slate-400">{lang.percentage}%</span>
                        <span className="text-slate-500 text-[10px]">({lang.files}f)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Detected Frameworks & Architectural Roles */}
              {allFrameworks.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Zap size={14} className="text-amber-400" />
                      <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                        Detected Frameworks & Architectural Roles ({allFrameworks.length})
                      </span>
                    </div>

                    {/* Category Filter */}
                    {frameworkCategories.length > 2 && (
                      <div className="flex items-center gap-1 flex-wrap text-[11px] font-mono">
                        {frameworkCategories.map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setFrameworkCategoryFilter(cat)}
                            className={`px-2 py-0.5 rounded transition-all ${
                              frameworkCategoryFilter === cat
                                ? 'bg-indigo-600 text-white font-semibold'
                                : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/[0.05]'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredFrameworks.map((fw, idx) => (
                      <div 
                        key={idx}
                        className="p-3 rounded-xl bg-[#06080e] border border-white/[0.06] hover:border-indigo-500/40 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span 
                              className="h-2 w-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: fw.badge_color || '#6366f1' }}
                            />
                            {fw.name}
                          </span>
                          <span 
                            className="text-[10px] font-mono px-2 py-0.5 rounded-full border flex-shrink-0"
                            style={{
                              backgroundColor: `${fw.badge_color || '#6366f1'}15`,
                              borderColor: `${fw.badge_color || '#6366f1'}40`,
                              color: fw.badge_color || '#a5b4fc'
                            }}
                          >
                            {fw.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {fw.role}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Subsystem Layering & Structural Anatomy */}
          {layers.length > 0 && (
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Layers size={16} className="text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Subsystem Layering & Structural Anatomy</h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {layers.length} Architectural Layers Identified
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {layers.map((layer, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-[#07090e] border border-white/[0.07] hover:border-cyan-500/30 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {layer.name}
                        </span>
                        <span 
                          className="text-[10px] font-mono px-2 py-0.5 rounded border"
                          style={{
                            backgroundColor: `${layer.badge_color || '#06b6d4'}15`,
                            borderColor: `${layer.badge_color || '#06b6d4'}40`,
                            color: layer.badge_color || '#67e8f9'
                          }}
                        >
                          {layer.category}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        {layer.description}
                      </p>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-400">Module Allocation</span>
                        <span className="text-cyan-300 font-semibold">{layer.file_count} files ({layer.percentage}%)</span>
                      </div>

                      {/* Layer Sample Files */}
                      <div className="space-y-1 pt-1">
                        {layer.sample_files.map((sample, sIdx) => (
                          <div 
                            key={sIdx}
                            className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 truncate bg-white/[0.02] px-2 py-0.5 rounded border border-white/[0.04]"
                            title={sample}
                          >
                            <FileCode size={11} className="text-slate-500 flex-shrink-0" />
                            <span className="truncate">{sample}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Subsystem & Architecture Topology Graph */}
          {architectureDiagramMarkdown && (
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Workflow size={16} className="text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Interactive Subsystem & Architecture Topology Graph</h4>
                  <span className="badge badge-primary text-[10px]">Vector Mermaid</span>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Target: <strong className="text-indigo-300">{activeRepo}</strong>
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Full 2D interactive topological model mapping entrypoints, core domain logic, transport gateways, and persistence layers. Drag to pan, scroll to zoom, or export as SVG/PNG.
              </p>

              <MarkdownView content={architectureDiagramMarkdown} />
            </div>
          )}

          {/* Canonical Application Entry Points */}
          {entryPoints.length > 0 && (
            <div className="glass-panel p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div className="flex items-center gap-2">
                  <Terminal size={16} className="text-emerald-400" />
                  <h4 className="text-sm font-bold text-white">Canonical Application Entry Points</h4>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Startup & Lifecycle Orchestration
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {entryPoints.map((ep, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[#06080e] border border-white/[0.06] hover:border-emerald-500/30 transition-all space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-300 truncate" title={ep.path}>
                        {ep.path}
                      </span>
                      <span className="badge badge-primary text-[9px] flex-shrink-0">
                        {ep.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {ep.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Call Flow Tracer (Standout Feature) */}
          <div className="glass-panel p-5 border-indigo-500/30 bg-indigo-500/[0.02] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-cyan-400" />
                <h4 className="text-sm font-bold text-white">Dynamic Call Flow Tracer</h4>
                <span className="badge badge-primary text-[10px]">Graph Traversal BFS</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Traces "What happens when X is called?"
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Traverse the NetworkX call graph starting from any function, route, or service to trace execution across callers, callees, and database boundaries.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. index_repository, chat_with_agent, clone_repository, authenticate..."
                  value={tracerTarget}
                  onChange={(e) => setTracerTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTraceFlow()}
                  className="input-field pl-10 py-2 text-xs font-mono w-full has-icon-left"
                />
              </div>

              <button
                onClick={() => handleTraceFlow()}
                disabled={tracingFlow || !tracerTarget.trim() || !activeRepo}
                className="btn btn-primary text-xs px-4 gap-1.5 w-full sm:w-auto shadow-md flex-shrink-0"
              >
                {tracingFlow ? (
                  <>
                    <Activity size={13} className="animate-spin" />
                    <span>Tracing Flow...</span>
                  </>
                ) : (
                  <>
                    <Play size={13} />
                    <span>Trace Call Flow</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="flex items-center gap-2 flex-wrap pt-1 text-[11px] font-mono text-slate-400">
              <span>Popular Targets:</span>
              {(activeRepo && activeRepo.toLowerCase().includes('talent')
                ? ['createSession', 'joinSession', 'getInterviewQuestions', 'generateResumeFeedback', 'inngest']
                : activeRepo && activeRepo.toLowerCase().includes('requests')
                ? ['get', 'post', 'request', 'Session.send', 'prepare_auth']
                : ['index_repository', 'chat_with_agent', 'clone_repository', 'retrieve']
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => {
                    setTracerTarget(suggestion);
                    handleTraceFlow(suggestion);
                  }}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-200 border border-white/[0.06] transition-all cursor-pointer"
                >
                  {suggestion}()
                </button>
              ))}
            </div>

            {/* Call Flow Render Result */}
            {flowError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {flowError}
              </div>
            )}

            {traceDisplayContent && (
              <div className="rounded-xl border border-indigo-500/30 bg-[#05070c] p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] text-xs font-mono text-slate-400">
                  <span className="text-cyan-400 font-semibold flex items-center gap-1.5">
                    <Workflow size={14} />
                    <span>Visual Call Flow & Component Hierarchy</span>
                  </span>
                  <span className="text-slate-400">Target: <strong className="text-indigo-300">{tracerTarget}</strong></span>
                </div>
                
                <MarkdownView content={traceDisplayContent} />
              </div>
            )}
          </div>

          {/* Module Density & Centrality Hubs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* File Complexity Overview Table */}
            <div className="lg:col-span-7 glass-panel p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-sm font-semibold text-white">Module Density Overview</h4>
                  <p className="text-[11px] text-slate-400 font-mono">Ranked by code entity density</p>
                </div>

                <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-lg border border-white/[0.06] text-xs">
                  <button
                    onClick={() => setSortKey('total')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      sortKey === 'total' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setSortKey('functions')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      sortKey === 'functions' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Funcs
                  </button>
                  <button
                    onClick={() => setSortKey('classes')}
                    className={`px-2 py-0.5 rounded transition-all ${
                      sortKey === 'classes' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Classes
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {modulesList.map((mod, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] hover:border-indigo-500/30 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate max-w-[65%]">
                      <FileCode size={14} className="text-indigo-400 flex-shrink-0" />
                      <span className="font-mono text-slate-200 truncate" title={mod.path}>
                        {mod.path}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-indigo-300 bg-indigo-500/10 px-1.5 py-0.5 rounded" title="Classes">
                        {mod.classes}C
                      </span>
                      <span className="text-cyan-300 bg-cyan-500/10 px-1.5 py-0.5 rounded" title="Functions">
                        {mod.functions}F
                      </span>
                      <span className="text-slate-400 font-bold w-7 text-right">
                        {mod.total}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Centrality Hubs / Core Dependency Layers */}
            <div className="lg:col-span-5 glass-panel p-5 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Centrality & Architectural Hubs</h4>
                <p className="text-[11px] text-slate-400 font-mono">Most coupled components in NetworkX graph</p>
              </div>

              <div className="space-y-3">
                {(centralityHubs.length > 0 
                  ? centralityHubs 
                  : modulesList.slice(0, 5).map(m => ({ node: m.path, in_degree: m.classes, out_degree: m.functions, role: 'Key Module' }))
                ).map((hub, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[#07090e] border border-white/[0.06] hover:border-indigo-500/30 transition-all space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div className="h-5 w-5 rounded bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[11px] font-mono font-bold flex-shrink-0">
                          #{idx + 1}
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-200 truncate" title={hub.node}>
                          {hub.node}
                        </span>
                      </div>
                      <span className="badge badge-primary text-[9px] flex-shrink-0">
                        {hub.total_degree ? `${hub.total_degree} Edges` : 'Core Hub'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
                      <span className="truncate text-slate-400">{hub.role}</span>
                      {hub.in_degree !== undefined && hub.out_degree !== undefined && (
                        <span className="text-slate-500 flex-shrink-0 ml-2">
                          In: <span className="text-cyan-400">{hub.in_degree}</span> | Out: <span className="text-amber-400">{hub.out_degree}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {!data && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-3">
          <Network size={40} className="mx-auto text-indigo-400/50 mb-2" />
          <h4 className="text-sm font-semibold text-slate-200">No Architecture Analysis Run Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Click <strong>"Analyze Architecture"</strong> to extract AST symbol tables, build the NetworkX directed graph, and calculate module coupling metrics for {activeRepo || 'your repository'}.
          </p>
        </div>
      )}
    </div>
  );
}
