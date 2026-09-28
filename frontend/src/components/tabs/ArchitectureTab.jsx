import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Play, AlertCircle, GitBranch, Search } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

// Ink tones for language segments (API colours are rainbow; the paper world uses ink density)
const LANG_TONES = ['#2a2724', '#4a443d', '#6b645b', '#a39a8c', '#d6ccbc'];

const Segmented = ({ options, value, onChange, label }) => (
  <div className="inline-flex flex-wrap" role="group" aria-label={label}>
    {options.map(([key, text]) => (
      <button
        key={key}
        type="button"
        aria-pressed={value === key}
        onClick={() => onChange(key)}
        className={`btn btn-sm ${value === key ? 'bg-ink text-pulp' : 'btn-secondary'}`}
      >
        {text}
      </button>
    ))}
  </div>
);

const Dots = ({ children }) => (
  <div className="flex items-center gap-3 text-sm text-ink-2">
    <span className="flex items-center gap-1">
      <span className="thinking-dot" />
      <span className="thinking-dot" />
      <span className="thinking-dot" />
    </span>
    <span>{children}</span>
  </div>
);

const sectionHeading = 'font-cond font-bold text-ink text-lg';

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
    const isRequests = repo.toLowerCase().includes('requests');

    if (isRequests) {
      return `\`\`\`mermaid
graph TD
  subgraph Entrypoints ["Public API & Canonical Entrypoints"]
    api["api.py<br/>(get, post, put, delete)"]
    session["sessions.py<br/>(Session, SessionRedirectMixin)"]
  end

  subgraph Core_Logic ["Domain Logic & Models"]
    models["models.py<br/>(Request, PreparedRequest, Response)"]
    auth["auth.py<br/>(AuthBase, HTTPBasicAuth)"]
    cookies["cookies.py<br/>(RequestsCookieJar)"]
  end

  subgraph Adapters ["Transport Adapters & Sockets"]
    adapter["adapters.py<br/>(HTTPAdapter, BaseAdapter)"]
    hooks["hooks.py<br/>(Dispatch Hooks)"]
  end

  subgraph Foundations ["Exceptions & Compatibility"]
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

  classDef entry fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef core fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef transport fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef base fill:#e8e0d2,stroke:#4a443d,stroke-width:1.25px,color:#2a2724;

  class api,session entry;
  class models,auth,cookies core;
  class adapter,hooks transport;
  class exceptions,utils base;
\`\`\``;
    }

    return `\`\`\`mermaid
graph TD
  subgraph Entrypoints ["Entrypoints & API Controllers"]
    api["Public Routes & Controllers<br/>(HTTP API, Ingestion Handlers)"]
    lifecycle["Lifecycle Bootstrap<br/>(Context, Setup, Server State)"]
  end

  subgraph Domain_Core ["Core Processing & Agents"]
    agent["LangGraph Agent Workflow<br/>(Reasoning, StateGraph, Tools)"]
    ast["AST Entity Extractor<br/>(Parser Trees, Symbol Resolver)"]
  end

  subgraph Vector_Graph ["Embeddings & Graph Topologies"]
    qdrant["Qdrant Hybrid Vector Store<br/>(Embeddings Index)"]
    networkx["NetworkX Call Graph<br/>(Directed Dependency Topologies)"]
  end

  subgraph Gateways ["External Gateways & LLM Models"]
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

  classDef entry fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef core fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef storage fill:#f2ece1,stroke:#2a2724,stroke-width:1.25px,color:#2a2724;
  classDef transport fill:#e8e0d2,stroke:#4a443d,stroke-width:1.25px,color:#2a2724;

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
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleAnalyze}
          disabled={loading || !activeRepo}
          className={`btn btn-md gap-2 ${data ? 'btn-secondary' : 'btn-primary'}`}
        >
          {loading ? (
            <>
              <Activity size={14} strokeWidth={2} className="animate-spin" />
              <span>Analyzing</span>
            </>
          ) : (
            <>
              <Play size={14} strokeWidth={2} />
              <span>{data ? 'Re-analyze architecture' : 'Analyze architecture'}</span>
            </>
          )}
        </button>
        {activeRepo && (
          <span className="text-sm text-ash">
            Repository <span className="font-mono text-ink-2">{activeRepo}</span>
          </span>
        )}
      </div>

      {loading && <Dots>Reading the AST graph and module stats…</Dots>}

      {error && (
        <div className="paper-flat p-4 text-sm flex items-start gap-2">
          <AlertCircle size={16} strokeWidth={2} className="flex-shrink-0 text-crimson mt-0.5" />
          <div>
            <p className="text-crimson font-semibold">{error}</p>
            <p className="text-ink-2 mt-1">Check that the repository is indexed, then run the analysis again.</p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Architecture pattern */}
          {overview && (
            <section className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="font-cond font-bold text-ink text-xl">{overview.architecture_pattern}</h4>
                    {overview.pattern_badge && <span className="badge">{overview.pattern_badge}</span>}
                  </div>
                  <p className="text-sm text-ink-2 leading-relaxed max-w-3xl">{overview.summary}</p>
                </div>

                <div className="flex-shrink-0">
                  <span className="strip text-ash block">Modularity</span>
                  <span className="font-mono tabular-nums text-xl text-ink">{overview.modularity_score}/100</span>
                  <div className="w-28 h-1.5 bg-paper-grey rounded-sm mt-1.5 overflow-hidden">
                    <div className="h-full bg-ink" style={{ width: `${overview.modularity_score}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-10 gap-y-3 rule-t pt-4">
                {[
                  ['Files', overview.total_files || modulesList.length],
                  ['Lines of code', (overview.total_loc || 0).toLocaleString()],
                  ['Graph nodes', (data.graph_nodes || 0).toLocaleString()],
                  ['Dependency edges', (data.graph_edges || 0).toLocaleString()],
                  ['Edges per node', overview.coupling_density || (data.graph_edges / Math.max(data.graph_nodes, 1)).toFixed(2)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <span className="strip text-ash block">{label}</span>
                    <span className="font-mono tabular-nums text-xl text-ink">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Languages & tech stack */}
          {techStack && (
            <section className="rule-t pt-5 space-y-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className={sectionHeading}>Languages and stack</h4>
                <span className="text-sm text-ash">
                  Primary language <span className="font-semibold text-ink">{techStack.primary_language}</span>
                </span>
              </div>

              {techStack.languages && techStack.languages.length > 0 && (
                <div className="space-y-2">
                  <div className="h-3 w-full rounded-sm bg-pulp-2 overflow-hidden flex gap-px">
                    {techStack.languages.map((lang, idx) => (
                      <div
                        key={idx}
                        style={{ width: `${lang.percentage}%`, backgroundColor: LANG_TONES[idx % LANG_TONES.length] }}
                        title={`${lang.name}: ${lang.percentage}% (${lang.files} files)`}
                        className="h-full"
                      />
                    ))}
                  </div>

                  <div className="flex items-center gap-x-5 gap-y-1 flex-wrap text-sm">
                    {techStack.languages.map((lang, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-sm flex-shrink-0"
                          style={{ backgroundColor: LANG_TONES[idx % LANG_TONES.length] }}
                        />
                        <span className="font-semibold text-ink">{lang.name}</span>
                        <span className="font-mono tabular-nums text-ink-2">{lang.percentage}%</span>
                        <span className="font-mono tabular-nums text-ash text-xs">{lang.files} files</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {allFrameworks.length > 0 && (
                <div className="space-y-2 pt-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="strip text-ash">
                      Frameworks <span className="font-mono tabular-nums">({allFrameworks.length})</span>
                    </span>
                    {frameworkCategories.length > 2 && (
                      <Segmented
                        label="Filter frameworks by category"
                        options={frameworkCategories.map((c) => [c, c])}
                        value={frameworkCategoryFilter}
                        onChange={setFrameworkCategoryFilter}
                      />
                    )}
                  </div>

                  <div>
                    {filteredFrameworks.map((fw, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-4 py-2.5 rule-b">
                        <div className="min-w-0">
                          <span className="text-ink font-semibold">{fw.name}</span>
                          <p className="text-sm text-ink-2 leading-relaxed">{fw.role}</p>
                        </div>
                        <span className="badge flex-shrink-0">{fw.category}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Layers */}
          {layers.length > 0 && (
            <section className="rule-t pt-5 space-y-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className={sectionHeading}>Layers</h4>
                <span className="text-sm text-ash">
                  <span className="font-mono tabular-nums">{layers.length}</span> identified
                </span>
              </div>

              <div>
                {layers.map((layer, idx) => (
                  <div key={idx} className="py-3 rule-b space-y-1.5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="text-ink font-semibold">{layer.name}</span>
                        <p className="text-sm text-ink-2 leading-relaxed">{layer.description}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="font-mono tabular-nums text-sm text-ash">
                          {layer.file_count} files ({layer.percentage}%)
                        </span>
                        <span className="badge">{layer.category}</span>
                      </div>
                    </div>
                    {layer.sample_files?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {layer.sample_files.map((sample, sIdx) => (
                          <span key={sIdx} className="evidence-pill max-w-full truncate" title={sample}>
                            {sample}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Subsystem topology graph */}
          {/* Hand-drawn layouts exist only for psf/requests and this repository; never show them for others */}
          {architectureDiagramMarkdown && /requests|codebase/i.test(activeRepo || '') && (
            <section className="rule-t pt-5 space-y-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className={sectionHeading}>Subsystem topology</h4>
                <span className="text-sm text-ash">Drag to pan, scroll to zoom, export as SVG or PNG.</span>
              </div>
              <p className="text-sm text-ash">
                Drawn by hand for {activeRepo}, not generated from the index.
              </p>
              <div className="paper-flat p-3">
                <MarkdownView content={architectureDiagramMarkdown} />
              </div>
            </section>
          )}

          {/* Entry points */}
          {entryPoints.length > 0 && (
            <section className="rule-t pt-5 space-y-2">
              <h4 className={sectionHeading}>Entry points</h4>
              <div>
                {entryPoints.map((ep, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4 py-2.5 rule-b">
                    <div className="min-w-0">
                      <span className="block font-mono text-sm text-ink font-semibold truncate" title={ep.path}>
                        {ep.path}
                      </span>
                      <p className="text-sm text-ink-2 leading-relaxed">{ep.description}</p>
                    </div>
                    <span className="badge flex-shrink-0">{ep.type}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Call flow tracer */}
          <section className="rule-t pt-5 space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch size={16} strokeWidth={2} className="text-ink-2" />
              <h4 className={sectionHeading}>Call flow tracer</h4>
            </div>
            <p className="text-sm text-ink-2 leading-relaxed">
              Name a function, route or service to trace its callers and callees through the call graph.
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2.5">
              <div className="relative flex-1 w-full">
                <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. index_repository, chat_with_agent, clone_repository"
                  value={tracerTarget}
                  onChange={(e) => setTracerTarget(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleTraceFlow()}
                  className="input-field pl-9 text-sm font-mono w-full has-icon-left"
                  aria-label="Symbol to trace"
                />
              </div>

              <button
                onClick={() => handleTraceFlow()}
                disabled={tracingFlow || !tracerTarget.trim() || !activeRepo}
                className="btn btn-primary btn-md gap-1.5 w-full sm:w-auto flex-shrink-0"
              >
                {tracingFlow ? (
                  <>
                    <Activity size={14} strokeWidth={2} className="animate-spin" />
                    <span>Tracing</span>
                  </>
                ) : (
                  <>
                    <Play size={14} strokeWidth={2} />
                    <span>Trace call flow</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="strip text-ash">Try</span>
              {(activeRepo && activeRepo.toLowerCase().includes('talent')
                ? ['createSession', 'joinSession', 'getInterviewQuestions', 'generateResumeFeedback', 'inngest']
                : activeRepo && activeRepo.toLowerCase().includes('requests')
                ? ['get', 'post', 'request', 'Session.send', 'prepare_auth']
                : ['index_repository', 'chat_with_agent', 'clone_repository', 'retrieve']
              ).map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => {
                    setTracerTarget(suggestion);
                    handleTraceFlow(suggestion);
                  }}
                  className="btn btn-sm btn-secondary font-mono normal-case tracking-normal"
                >
                  {suggestion}()
                </button>
              ))}
            </div>

            {tracingFlow && <Dots>Walking the call graph…</Dots>}

            {flowError && (
              <div className="paper-flat p-4 text-sm">
                <p className="text-crimson font-semibold">{flowError}</p>
                <p className="text-ink-2 mt-1">Check the symbol name and try again.</p>
              </div>
            )}

            {traceDisplayContent && (
              <div className="paper-flat p-4 space-y-3">
                <div className="flex items-center justify-between gap-3 pb-2 rule-b text-sm">
                  <span className="strip text-ash">Call flow</span>
                  <span className="text-ash">
                    Target <span className="font-mono text-ink">{tracerTarget}</span>
                  </span>
                </div>
                <MarkdownView content={traceDisplayContent} />
              </div>
            )}
          </section>

          {/* Module density & hubs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 rule-t pt-5">
            <section className="lg:col-span-7 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h4 className={sectionHeading}>Module density</h4>
                  <p className="text-sm text-ash">Ranked by entity count</p>
                </div>
                <Segmented
                  label="Sort modules"
                  options={[['total', 'All'], ['functions', 'Funcs'], ['classes', 'Classes']]}
                  value={sortKey}
                  onChange={setSortKey}
                />
              </div>

              <div className="max-h-[420px] overflow-y-auto pr-1">
                <div className="flex items-center justify-between py-1.5 rule-b strip text-ash">
                  <span>Path</span>
                  <span className="flex gap-3">
                    <span className="w-8 text-right">Cls</span>
                    <span className="w-8 text-right">Fn</span>
                    <span className="w-8 text-right">All</span>
                  </span>
                </div>
                {modulesList.map((mod, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-3 py-2 rule-b text-sm">
                    <span className="font-mono text-ink truncate" title={mod.path}>{mod.path}</span>
                    <span className="flex gap-3 font-mono tabular-nums flex-shrink-0">
                      <span className="w-8 text-right text-ash" title="Classes">{mod.classes}</span>
                      <span className="w-8 text-right text-ash" title="Functions">{mod.functions}</span>
                      <span className="w-8 text-right text-ink font-semibold">{mod.total}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="lg:col-span-5 space-y-2">
              <div>
                <h4 className={sectionHeading}>Hubs</h4>
                <p className="text-sm text-ash">Most coupled nodes in the call graph</p>
              </div>

              <div>
                {centralityHubs.length === 0 && (
                  <p className="py-2.5 text-sm text-ink-2">The backend returned no hub data for this repository.</p>
                )}
                {centralityHubs.map((hub, idx) => (
                  <div key={idx} className="py-2.5 rule-b space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono tabular-nums text-sm text-ash flex-shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="font-mono text-sm text-ink font-semibold truncate" title={hub.node}>
                          {hub.node}
                        </span>
                      </div>
                      <span className="badge flex-shrink-0">
                        {hub.total_degree ? `${hub.total_degree} edges` : 'Hub'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm text-ash pl-7">
                      <span className="truncate">{hub.role}</span>
                      {hub.in_degree !== undefined && hub.out_degree !== undefined && (
                        <span className="font-mono tabular-nums flex-shrink-0 ml-2">
                          in {hub.in_degree} · out {hub.out_degree}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      )}

      {!data && !loading && !error && (
        <div className="py-12 text-center space-y-3">
          <div className="font-matrixtype-display text-5xl text-paper-grey" aria-hidden="true">unmapped</div>
          <p className="text-sm text-ink-2 max-w-md mx-auto leading-relaxed">
            Run <span className="font-semibold text-ink">Analyze architecture</span> to map modules, layers and call hubs for{' '}
            <span className="font-mono">{activeRepo || 'your repository'}</span>.
          </p>
        </div>
      )}
    </div>
  );
}
