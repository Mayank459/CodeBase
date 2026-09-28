import React, { useEffect, useRef, useState } from 'react';
import {
  GitBranch, TreePine, ListTree, Network, Binary, Database, Route,
  ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { TABS } from '../TabNavigation';
import { Procession } from '../Procession';

// ---------------------------------------------------------------------------
// The seven stages a repository passes through. Every output shown is real
// structure from psf/requests or real configuration from this backend.
// ---------------------------------------------------------------------------
const STAGES = [
  { id: 'clone', name: 'Clone', icon: GitBranch },
  { id: 'parse', name: 'Parse', icon: TreePine },
  { id: 'extract', name: 'Extract', icon: ListTree },
  { id: 'graph', name: 'Graph', icon: Network },
  { id: 'embed', name: 'Embed', icon: Binary },
  { id: 'store', name: 'Store', icon: Database },
  { id: 'answer', name: 'Answer', icon: Route },
];
const N = STAGES.length;
const PROCESSION = STAGES.map((s) => ({ id: s.id, label: s.name, icon: s.icon }));
const STEP = 90; // one stage per quarter turn of the crank

const mod = (a, n) => ((a % n) + n) % n;

function StageOutput({ id, stats }) {
  const entities = stats?.entities_indexed ?? stats?.entities;
  const edges = stats?.edges_count ?? stats?.graph_edges;
  const mono = 'font-mono text-[12.5px] leading-relaxed whitespace-pre-wrap break-words sm:whitespace-pre';

  switch (id) {
    case 'clone':
      return (
        <>
          <p className="text-ink-2">A shallow snapshot: one commit, no history. The working tree is all the indexer reads.</p>
          <pre className={`ink-plate mt-3 px-4 py-3 overflow-x-auto ${mono}`}><span className="text-plate-dim">$ </span>git clone --depth 1 https://github.com/psf/requests</pre>
        </>
      );
    case 'parse':
      return (
        <>
          <p className="text-ink-2">tree-sitter turns every Python file into a syntax tree, so classes and functions are found by structure, not by regex.</p>
          <pre className={`ink-plate mt-3 px-4 py-3 overflow-x-auto ${mono}`}>{`(class_definition
  name: (identifier)            `}<span className="text-pulp">Session</span>{`
  body: (block
    (function_definition name:  `}<span className="text-pulp">request</span>{`)
    (function_definition name:  `}<span className="text-pulp">send</span>{`)))`}</pre>
        </>
      );
    case 'extract':
      return (
        <>
          <p className="text-ink-2">Each definition becomes an entity with its file and line range. {entities
            ? <><b className="text-ink tabular-nums">{Number(entities).toLocaleString()}</b> entities in the current index.</>
            : <>psf/requests produced <b className="text-ink tabular-nums">568</b> entities when indexed on 28 Sep 2026.</>}</p>
          <table className={`mt-3 w-full ${mono}`}>
            <tbody>
              {[
                ['class', 'Session', 'sessions.py'],
                ['method', 'Session.request', 'sessions.py'],
                ['method', 'Session.send', 'sessions.py'],
                ['method', 'HTTPAdapter.send', 'adapters.py'],
                ['function', 'get', 'api.py'],
              ].map(([k, s, f]) => (
                <tr key={s} className="rule-b last:border-0">
                  <td className="py-1 pr-3 text-ash w-20">{k}</td>
                  <td className="py-1 pr-3 text-ink font-medium">{s}</td>
                  <td className="py-1 text-ash text-right">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      );
    case 'graph':
      return (
        <>
          <p className="text-ink-2">NetworkX links every call site to its target{edges
            ? <>: <b className="text-ink tabular-nums">{Number(edges).toLocaleString()}</b> call edges in the current index.</>
            : <>. psf/requests had <b className="text-ink tabular-nums">1,227</b> call edges when indexed on 28 Sep 2026.</>} This is the path a plain <code className="font-mono text-ink">requests.get()</code> travels:</p>
          <ol className="mt-4 flex flex-wrap items-center gap-y-3 font-mono text-[12px]">
            {['api.get', 'api.request', 'Session.request', 'Session.send', 'HTTPAdapter.send'].map((s, i, a) => (
              <li key={s} className="flex items-center">
                <span className={`px-2 py-1 rounded-sm ${i === a.length - 1 ? 'bg-crimson text-pulp' : 'bg-pulp-2 text-ink shadow-[inset_0_0_0_1px_var(--rule)]'}`}>{s}</span>
                {i < a.length - 1 && <span className="w-5 h-[2px] bg-ink-2 mx-1" aria-hidden="true" />}
              </li>
            ))}
          </ol>
        </>
      );
    case 'embed':
      return (
        <>
          <p className="text-ink-2">Each entity becomes a 384-dimension vector (Cohere embed-english-light-v3.0), so a question like “where do retries happen?” finds <code className="font-mono text-ink">HTTPAdapter</code> even when the words differ.</p>
          <div className="mt-4 flex items-end gap-[3px] h-14" aria-hidden="true">
            {Array.from({ length: 48 }, (_, i) => (
              <span key={i} className="flex-1 bg-ink-2 rounded-t-[1px]" style={{ height: `${18 + Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1) * 82}%`, opacity: i % 7 === 3 ? 1 : 0.7, background: i % 7 === 3 ? 'var(--crimson)' : undefined }} />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-ash">48 of 384 dimensions drawn, values illustrative.</p>
        </>
      );
    case 'store':
      return (
        <>
          <p className="text-ink-2">Vectors and their payloads go to Qdrant, filtered by repository so answers never mix codebases.</p>
          <pre className={`ink-plate mt-3 px-4 py-3 overflow-x-auto ${mono}`}>{`collection  `}<span className="text-pulp">codebase_entities_cohere</span>{`
index       repository_name = "psf/requests"
payload     symbol, kind, file, lines, code`}</pre>
        </>
      );
    default:
      return (
        <>
          <p className="text-ink-2">A LangGraph router reads the question and hands it to a specialist agent: chat, call flow, architecture, security, docs, UML and more. The answer comes back with the files and line ranges it used.</p>
          <div className="mt-3 paper-flat p-3">
            <p className="text-[11px] strip text-ash">Example</p>
            <p className="mt-1 text-sm text-ink"><b>Where does a request actually get sent?</b></p>
            <p className="mt-1 text-sm text-ink-2"><code className="font-mono text-ink">Session.send</code> picks the mounted adapter and calls <code className="font-mono text-ink">HTTPAdapter.send</code>, which opens the connection through urllib3.</p>
            <p className="mt-2 flex flex-wrap gap-1.5"><span className="evidence-pill">requests/sessions.py</span><span className="evidence-pill">requests/adapters.py</span></p>
          </div>
        </>
      );
  }
}

// The crank stage: drag the handle, use the arrow keys, or press the step buttons.
function CrankStage({ stats }) {
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [touched, setTouched] = useState(false);
  const discRef = useRef(null);
  const lastRef = useRef(0);

  const pos = angle / STEP; // fractional stage position
  const stage = mod(Math.round(pos), N);

  // Turns itself slowly until someone takes the handle.
  useEffect(() => {
    if (touched || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setAngle((a) => a + STEP), 4200);
    return () => clearInterval(t);
  }, [touched]);

  const pointerAngle = (e) => {
    const r = discRef.current.getBoundingClientRect();
    const ax = r.left + (48 / 96) * r.width;
    const ay = r.top + (134.5 / 150) * r.height;
    return (Math.atan2(e.clientY - ay, e.clientX - ax) * 180) / Math.PI;
  };
  const onDown = (e) => {
    setTouched(true);
    setDragging(true);
    lastRef.current = pointerAngle(e);
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e) => {
    if (!dragging) return;
    const a = pointerAngle(e);
    let d = a - lastRef.current;
    if (d > 180) d -= 360;
    if (d < -180) d += 360;
    lastRef.current = a;
    setAngle((x) => x + d);
  };
  const onUp = () => {
    setDragging(false);
    setAngle((x) => Math.round(x / STEP) * STEP);
  };
  const step = (dir) => { setTouched(true); setAngle((x) => Math.round(x / STEP) * STEP + dir * STEP); };
  const onKey = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); step(-1); }
  };

  const current = STAGES[stage];
  const turn = dragging ? 'none' : 'transform 700ms var(--ease-crank)';

  return (
    <div className="paper slotted p-4 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="strip text-ink">How a repository moves through CodeBase</h2>
        <span className="font-mono text-xs text-ash tabular-nums whitespace-nowrap">{stage + 1} / {N}</span>
      </div>

      {/* Seven stage cards on one rail; the crank is mounted on the rail's end and drives them */}
      <div className="relative mt-6 flex items-end">
        <Procession items={PROCESSION} pos={pos} ring dragging={dragging} className="flex-1 min-w-0" />
        <svg
          ref={discRef}
          role="slider"
          tabIndex={0}
          aria-label="Crank: turn to move the repository through each stage"
          aria-valuemin={1}
          aria-valuemax={N}
          aria-valuenow={stage + 1}
          aria-valuetext={`${stage + 1}. ${current.name}`}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
          viewBox="0 0 96 150"
          overflow="visible"
          className={`crank-handle shrink-0 w-[72px] sm:w-[96px] h-auto touch-none select-none rounded-sm ${dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {/* the rail runs on to the axle */}
          <rect x="-4" y="133" width="52" height="3" rx="1.5" fill="var(--ink)" />
          {/* bearing plate the axle turns in */}
          <rect x="26" y="112.5" width="44" height="44" rx="2" fill="var(--pulp-2)" stroke="var(--rule-strong)" />
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '48px 134.5px', transition: turn }}>
            <rect x="44" y="129.5" width="44" height="10" rx="5" fill="var(--ink-2)" />
            <circle cx="88" cy="134.5" r="12" fill="var(--crimson)" />
            <circle cx="88" cy="134.5" r="4" fill="var(--crimson-deep)" />
          </g>
          <circle cx="48" cy="134.5" r="9" fill="var(--ink)" />
          <circle cx="48" cy="134.5" r="3" fill="var(--pulp)" />
        </svg>
      </div>

      {/* The stage in motion folds open to show what it produced */}
      <div className="mt-10 flex items-center justify-between gap-3">
        <h3 key={`h-${current.id}`} className="font-matrixtype-display text-2xl text-ink leading-none stage-unfold">{current.name.toUpperCase()}</h3>
        <div className="flex items-center gap-1.5">
          <span className="strip !text-[10px] text-ash hidden sm:inline mr-1">Turn the crank or</span>
          <button type="button" onClick={() => step(-1)} className="btn btn-secondary btn-sm !px-2" aria-label="Previous stage"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => step(1)} className="btn btn-secondary btn-sm !px-2" aria-label="Next stage"><ChevronRight size={16} /></button>
        </div>
      </div>
      {/* Every stage is stacked in one grid cell so the panel always holds the tallest one:
          turning the crank swaps what is visible without the box changing size. */}
      <div className="grid mt-2 text-[14.5px] min-w-0" aria-live="polite">
        {STAGES.map((st) => (
          <div
            key={st.id}
            className={`[grid-area:1/1] min-w-0 ${st.id === current.id ? 'stage-unfold' : 'invisible'}`}
            aria-hidden={st.id !== current.id}
          >
            <StageOutput id={st.id} stats={stats} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolDrawer({ onLaunch }) {
  const [sel, setSel] = useState('chat');
  const i = TABS.findIndex((t) => t.id === sel);
  const tool = TABS[i];
  return (
    <div>
      <div role="tablist" aria-label="Tools" className="folder-tabs !px-0">
        {TABS.map((t, n) => (
          <button key={t.id} role="tab" type="button" aria-selected={sel === t.id} onClick={() => setSel(t.id)} onMouseEnter={() => setSel(t.id)} className="folder-tab">
            <span className="folder-num">{String(n + 1).padStart(2, '0')}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>
      <div role="tabpanel" className="paper !rounded-tl-none p-6 sm:p-10 grid md:grid-cols-[auto_1fr_auto] gap-6 md:gap-10 items-center">
        <span className="font-matrixtype-display text-[5rem] sm:text-[6rem] leading-[.8] text-ink tabular-nums" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <div key={tool.id} className="stage-unfold">
          <h3 className="font-cond font-bold text-3xl text-ink">{tool.label}</h3>
          <p className="mt-2 text-lg text-ink-2 max-w-[56ch]">{tool.summary}</p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-1 text-sm">
            <div><dt className="strip inline text-ash">Reads </dt><dd className="inline text-ink">{tool.reads}</dd></div>
            <div><dt className="strip inline text-ash">Returns </dt><dd className="inline text-ink">{tool.returns}</dd></div>
          </dl>
        </div>
        <button type="button" onClick={() => onLaunch(tool.id)} className="btn btn-primary justify-self-start md:justify-self-end">
          Open {tool.label}
        </button>
      </div>
    </div>
  );
}

export function HomePage({ onNavigatePage, onSelectTab, activeRepo, indexStats, onOpenIndexer }) {
  const launch = (tabId) => { onSelectTab(tabId); onNavigatePage('features'); window.scrollTo({ top: 0 }); };
  const entities = indexStats?.entities_indexed ?? indexStats?.entities;
  const edges = indexStats?.edges_count ?? indexStats?.graph_edges;
  const indexed = Boolean(activeRepo && Number(entities) > 0);

  return (
    <div className="space-y-24 sm:space-y-32 pb-8">
      {/* 1. First viewport: the claim and the machine */}
      <section>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-10 lg:gap-14 items-center">
        <div>
          <h1 className="font-matrixtype-display text-ink leading-[0.95] text-[clamp(2.75rem,5.6vw,5.25rem)]">
            TURN A REPO.<br />READ ITS<br />
            <span className="inline-block mt-2 px-3 pt-1 bg-crimson text-pulp shadow-lift-2 -rotate-1">WIRING.</span>
          </h1>
          <p className="mt-6 text-lg text-ink-kraft max-w-[46ch]">
            CodeBase parses a Python repository into symbols and call edges, then answers questions with the exact files and line ranges it read.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => launch('chat')} className="btn btn-primary !text-sm !py-3 !pl-5 !pr-9">Open the workstation</button>
            <button type="button" onClick={onOpenIndexer} className="btn btn-secondary !text-sm !py-3">Index a repo</button>
          </div>
          {indexed && (
            <p className="mt-5 text-sm text-ink-kraft">
              Indexed now: <span className="font-mono text-ink">{activeRepo}</span>
              {entities ? <> · <span className="tabular-nums">{Number(entities).toLocaleString()}</span> entities</> : null}
              {edges ? <> · <span className="tabular-nums">{Number(edges).toLocaleString()}</span> call edges</> : null}
            </p>
          )}
        </div>
        <CrankStage stats={indexStats} />
      </div>

      </section>

      {/* 3. Nine tools, one index */}
      <section>
        <div className="mb-6">
          <h2 className="font-cond font-bold text-4xl sm:text-5xl text-ink leading-[1.02]">Nine tools read the same index.</h2>
          <p className="mt-4 text-ink-kraft max-w-[52ch]">Index once. Chat, graph, security, docs and the rest all work from the same symbols and edges.</p>
        </div>
        <ToolDrawer onLaunch={launch} />
      </section>

      {/* 4. The approval gate */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="font-cond font-bold text-4xl sm:text-5xl text-ink leading-[1.02]">Nothing merges without you.</h2>
          <p className="mt-4 text-ink-kraft max-w-[46ch]">
            Security findings become a patch first. The LangGraph run pauses at an approval step, and a pull request is opened only after you have read and approved the diff.
          </p>
          <button type="button" onClick={() => launch('pr')} className="mt-6 btn btn-secondary">See the approval gate <ArrowRight size={14} aria-hidden="true" /></button>
        </div>
        <ol className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-0">
          {[
            { k: 'Finding', v: 'security' },
            { k: 'Patch', v: 'security_fix' },
            { k: 'Your approval', v: 'await_approval', gate: true },
            { k: 'Pull request', v: 'pr' },
          ].map((s, i, a) => (
            <li key={s.k} className="flex sm:flex-1 items-center">
              <div className={`relative flex-1 px-3 py-4 rounded-[2px] text-center paper ${s.gate ? 'shadow-[inset_0_0_0_2px_var(--crimson),var(--lift-2)] sm:-translate-y-2' : ''}`}>
                {s.gate && <span className="absolute -top-2 left-1/2 -ml-2 w-4 h-4 rounded-full bg-crimson shadow-lift-1" aria-hidden="true" />}
                <div className="strip">{s.k}</div>
                <div className="mt-1 font-mono text-[11px] text-ash">{s.v}</div>
              </div>
              {i < a.length - 1 && <span className="hidden sm:block w-4 h-[3px] bg-ink shrink-0" aria-hidden="true" />}
            </li>
          ))}
        </ol>
      </section>

      {/* 5. Close */}
      <section className="paper slotted px-6 sm:px-12 py-12 sm:py-16 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <h2 className="font-matrixtype-display text-ink text-[clamp(2rem,4.4vw,3.75rem)] leading-[1]">
          {indexed ? <>{activeRepo.toUpperCase()} IS INDEXED.<br />ASK IT SOMETHING.</> : <>INDEX A REPO.<br />ASK IT SOMETHING.</>}
        </h2>
        <button type="button" onClick={() => (indexed ? launch('chat') : onOpenIndexer())} className="btn btn-primary !text-sm !py-3 !pl-6 !pr-10 self-start lg:self-auto">
          {indexed ? 'Open chat' : 'Index a repo'}
        </button>
      </section>
    </div>
  );
}

export default HomePage;
