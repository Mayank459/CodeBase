import React, { useState } from 'react';
import { GitCompare, Plus, X, Download, Copy, Check, RefreshCw } from 'lucide-react';
import { apiPost, streamIndexRepo } from '../../api';
import { normalizeRepoUrl } from '../IndexDrawer';

const PRESETS = [
  { label: 'psf/requests', value: 'psf/requests' },
  { label: 'pallets/flask', value: 'pallets/flask' },
  { label: 'fastapi/fastapi', value: 'fastapi/fastapi' },
  { label: 'This repository', value: 'Mayank459/CodeBase' },
];

const SEV = [
  ['critical', 'bg-crimson'],
  ['high', 'bg-rust'],
  ['medium', 'bg-ochre'],
  ['low', 'bg-paper-grey'],
];

// Index one repository over the existing SSE endpoint; resolves when it ends.
function indexRepo(input, onProgress) {
  return new Promise((resolve) => {
    streamIndexRepo({
      repoUrl: normalizeRepoUrl(input),
      onEvent: (e) => onProgress({ message: e.message || e.step, progress: e.progress }),
      onError: (err) => resolve({ ok: false, error: String(err) }),
      onComplete: (res) => resolve({ ok: true, result: res }),
    });
  });
}

function Bar({ value, max }) {
  const pct = max > 0 ? Math.max(3, Math.round((100 * value) / max)) : 0;
  return (
    <span className="block h-1 mt-1 bg-paper-grey rounded-full overflow-hidden" aria-hidden="true">
      <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
    </span>
  );
}

function Row({ label, repos, get, fmt = (v) => v.toLocaleString(), bar = true, hint }) {
  const values = repos.map(get);
  const max = Math.max(...values.map((v) => (typeof v === 'number' ? v : 0)));
  return (
    <tr className="rule-b align-top">
      <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2 whitespace-nowrap">
        {label}
        {hint && <span className="block text-[12px] text-ash">{hint}</span>}
      </th>
      {values.map((v, i) => (
        <td key={i} className="py-2.5 pr-6 min-w-[150px]">
          <span className="font-mono text-ink tabular-nums">{fmt(v)}</span>
          {bar && typeof v === 'number' && <Bar value={v} max={max} />}
        </td>
      ))}
    </tr>
  );
}

function Section({ title }) {
  return (
    <tr>
      <th colSpan={99} scope="colgroup" className="pt-6 pb-1 text-left strip text-ash">{title}</th>
    </tr>
  );
}

function Severity({ counts }) {
  const total = SEV.reduce((n, [k]) => n + (counts[k] || 0), 0);
  return (
    <div>
      <span className="font-mono text-ink tabular-nums">{total}</span>
      <span className="ml-2 font-mono text-[12px] text-ash">{SEV.map(([k]) => counts[k] || 0).join(' / ')}</span>
      <span className="flex h-1.5 mt-1.5 w-full max-w-[140px] rounded-full overflow-hidden bg-paper-grey" aria-hidden="true">
        {total > 0 && SEV.map(([k, cls]) => counts[k] ? <span key={k} className={cls} style={{ width: `${(100 * counts[k]) / total}%` }} /> : null)}
      </span>
    </div>
  );
}

function Chips({ items, empty = 'none', mark }) {
  if (!items.length) return <span className="text-ash text-sm">{empty}</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {items.map((d) => (
        <span key={d} className={`font-mono text-[12px] px-1.5 py-0.5 rounded-sm ${mark?.has(d) ? 'bg-ink text-pulp' : 'bg-pulp-2 text-ink shadow-[inset_0_0_0_1px_var(--rule)]'}`}>{d}</span>
      ))}
    </span>
  );
}

export function CompareTab({ activeRepo }) {
  const [repoList, setRepoList] = useState(() => [
    activeRepo || 'psf/requests',
    (activeRepo || '').toLowerCase().includes('flask') ? 'psf/requests' : 'pallets/flask',
  ]);
  const [phase, setPhase] = useState('idle'); // idle | checking | indexing | comparing | done
  const [status, setStatus] = useState({}); // input -> { state, message, progress }
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const busy = phase === 'checking' || phase === 'indexing' || phase === 'comparing';
  const update = (i, v) => setRepoList((l) => l.map((x, j) => (j === i ? v : x)));
  const addPreset = (v) => setRepoList((l) => (l.some((x) => x.trim().toLowerCase() === v.toLowerCase()) ? l : [...l.filter((x) => x.trim()), v]));
  const setOne = (input, patch) => setStatus((s) => ({ ...s, [input]: { ...(s[input] || {}), ...patch } }));

  const handleCompare = async () => {
    const repos = repoList.map((r) => r.trim()).filter(Boolean);
    if (repos.length < 2) {
      setError('Add at least two repositories to compare.');
      return;
    }
    setError(null);
    setResult(null);
    setPhase('checking');
    setStatus(Object.fromEntries(repos.map((r) => [r, { state: 'checking' }])));

    let res = await apiPost('/repository/compare', { repositories: repos });
    if (res.error) {
      setError(res.error);
      setPhase('idle');
      return;
    }

    // Index whatever is missing, one at a time (the free-tier backend is small)
    if (res.missing?.length) {
      setPhase('indexing');
      const missingInputs = new Set(res.missing.map((m) => m.input));
      repos.forEach((r) => { if (!missingInputs.has(r)) setOne(r, { state: 'ready' }); });
      res.missing.forEach((m) => setOne(m.input, { state: 'queued' }));
      for (const m of res.missing) {
        setOne(m.input, { state: 'indexing', message: 'Starting…', progress: 0 });
        const out = await indexRepo(m.input, (p) => setOne(m.input, { message: p.message, progress: p.progress ?? undefined }));
        setOne(m.input, out.ok
          ? { state: 'ready', message: `Indexed: ${out.result?.entities ?? '?'} entities`, progress: 100 }
          : { state: 'failed', message: out.error });
      }
      setPhase('comparing');
      res = await apiPost('/repository/compare', { repositories: repos });
      if (res.error) {
        setError(res.error);
        setPhase('idle');
        return;
      }
    } else {
      repos.forEach((r) => setOne(r, { state: 'ready' }));
    }

    setResult(res);
    setPhase('done');
  };

  const download = () => {
    if (!result?.markdown) return;
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compare_${result.repositories.map((r) => r.name).join('_vs_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  const repos = result?.repositories || [];
  const shared = result?.shared || {};
  const sharedDeps = new Set(shared.dependencies || []);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {repoList.map((repo, idx) => {
            const st = status[repo.trim()];
            return (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Repository {idx + 1}</span>
                    <input
                      type="text"
                      value={repo}
                      onChange={(e) => update(idx, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !busy && handleCompare()}
                      placeholder="owner/repo or GitHub URL"
                      disabled={busy}
                      className="input-field font-mono !text-[13px]"
                    />
                  </label>
                  {repoList.length > 2 && (
                    <button type="button" onClick={() => setRepoList((l) => l.filter((_, i) => i !== idx))} disabled={busy} className="btn btn-ghost btn-sm !px-2" aria-label={`Remove repository ${idx + 1}`}>
                      <X size={14} aria-hidden="true" />
                    </button>
                  )}
                </div>
                {st && (
                  <div className="text-[12.5px]">
                    <span className="flex items-center gap-2">
                      <span className={`status-dot ${st.state === 'ready' ? 'active' : st.state === 'failed' ? 'offline' : st.state === 'indexing' ? 'idle' : ''}`} aria-hidden="true" />
                      <span className={st.state === 'failed' ? 'text-crimson' : 'text-ink-2'}>
                        {{ checking: 'Checking…', queued: 'Not indexed: waiting to index', indexing: 'Indexing', ready: 'Indexed', failed: 'Indexing failed' }[st.state]}
                        {st.message && st.state !== 'ready' ? ` · ${st.message}` : ''}
                      </span>
                    </span>
                    {st.state === 'indexing' && (
                      <span className="block h-1 mt-1.5 bg-paper-grey rounded-full overflow-hidden" aria-hidden="true">
                        <span className="block h-full bg-crimson transition-all duration-500" style={{ width: `${Math.max(4, st.progress || 0)}%` }} />
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={handleCompare} disabled={busy} className="btn btn-primary">
            {busy ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <GitCompare size={14} aria-hidden="true" />}
            {{ checking: 'Checking', indexing: 'Indexing', comparing: 'Comparing' }[phase] || 'Compare'}
          </button>
          <button type="button" onClick={() => setRepoList((l) => [...l, ''])} disabled={busy || repoList.length >= 4} className="btn btn-ghost btn-sm">
            <Plus size={14} aria-hidden="true" /> Add repository
          </button>
          <span className="text-sm text-ash">Try:</span>
          {PRESETS.map((p) => (
            <button key={p.value} type="button" onClick={() => addPreset(p.value)} disabled={busy}
              className="px-2 py-0.5 rounded-sm font-mono text-[12px] bg-pulp-2 text-ink hover:bg-paper-grey shadow-[inset_0_0_0_1px_var(--rule)]">
              {p.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-ash">Repositories that are not indexed yet are indexed first, then compared. That takes about a minute each.</p>
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Check the names (owner/repo or a GitHub URL), then compare again.</p>
        </div>
      )}

      {phase === 'comparing' && (
        <div className="flex items-center gap-3 text-sm text-ink-2" role="status">
          <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
          Analysing structure, docs, dead code and security for each repository…
        </div>
      )}

      {result && repos.length >= 2 && (
        <section className="space-y-6" aria-label="Comparison">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 rule-b">
            <h2 className="font-cond font-bold text-xl text-ink">{repos.map((r) => r.name).join(' vs ')}</h2>
            <div className="flex gap-2">
              <button type="button" onClick={copy} className="btn btn-ghost btn-sm">
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? 'Copied' : 'Copy .md'}
              </button>
              <button type="button" onClick={download} className="btn btn-secondary btn-sm"><Download size={13} aria-hidden="true" /> Download .md</button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="rule-b">
                  <td className="pb-2" />
                  {repos.map((r) => (
                    <th key={r.name} scope="col" className="pb-2 pr-6 text-left align-bottom">
                      <span className="block font-mono font-bold text-ink text-[15px]">{r.name}</span>
                      <span className="badge mt-1">{r.structure.pattern}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <Section title="Size" />
                <Row label="Files" repos={repos} get={(r) => r.size.files} />
                <Row label="Lines" repos={repos} get={(r) => r.size.lines} />
                <Row label="Classes" repos={repos} get={(r) => r.size.classes} />
                <Row label="Functions and methods" repos={repos} get={(r) => r.size.functions + r.size.methods} />

                <Section title="Public API and docs" />
                <Row label="Public symbols" repos={repos} get={(r) => r.api.public_symbols} />
                <Row label="Documented" repos={repos} get={(r) => r.api.doc_coverage_pct} fmt={(v) => `${v}%`} hint="public symbols with a docstring" />

                <Section title="Structure" />
                <Row label="Calls per symbol" repos={repos} get={(r) => r.structure.calls_per_symbol} fmt={(v) => v} hint="resolved calls ÷ functions, methods, classes" />
                <Row label="Calls within one file" repos={repos} get={(r) => r.structure.same_file_calls_pct} fmt={(v) => `${v}%`} hint="higher means more self-contained modules" />
                <tr className="rule-b align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2">Most connected</th>
                  {repos.map((r) => (
                    <td key={r.name} className="py-2.5 pr-6">
                      <ul className="space-y-0.5">
                        {r.structure.hubs.map((h) => (
                          <li key={h.node} className="font-mono text-[12px] text-ink truncate max-w-[260px]" title={h.node}>
                            {h.node.split('::').slice(1).join('.') || h.node}
                            <span className="text-ash"> · {h.callers} in / {h.callees} out</span>
                          </li>
                        ))}
                        {!r.structure.hubs.length && <li className="text-ash">no resolved calls</li>}
                      </ul>
                    </td>
                  ))}
                </tr>

                <Section title="Quality" />
                <Row label="Dead code" repos={repos} get={(r) => r.quality.dead_code} hint="unreferenced functions and methods" />
                <tr className="rule-b align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2">
                    Security findings
                    <span className="block text-[12px] text-ash">critical / high / medium / low</span>
                  </th>
                  {repos.map((r) => <td key={r.name} className="py-2.5 pr-6"><Severity counts={r.quality.security} /></td>)}
                </tr>

                <Section title="Stack" />
                <tr className="rule-b align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2">Frameworks</th>
                  {repos.map((r) => <td key={r.name} className="py-2.5 pr-6"><Chips items={r.stack.frameworks} /></td>)}
                </tr>
                <tr className="rule-b align-top">
                  <th scope="row" className="py-2.5 pr-4 text-left font-normal text-ink-2">
                    Third-party packages
                    <span className="block text-[12px] text-ash">shared ones in ink</span>
                  </th>
                  {repos.map((r) => <td key={r.name} className="py-2.5 pr-6"><Chips items={r.stack.dependencies} mark={sharedDeps} /></td>)}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="paper-flat p-4 text-sm space-y-1.5">
            <p className="text-ink">
              <b>{shared.public_name_overlap_pct ?? 0}%</b> of public class and function names are shared
              {shared.dependencies?.length ? <>; both use <span className="font-mono">{shared.dependencies.join(', ')}</span></> : '; no third-party package in common'}.
            </p>
            {shared.public_names?.length > 0 && <Chips items={shared.public_names.slice(0, 24)} />}
          </div>
        </section>
      )}

      {result && repos.length < 2 && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="text-crimson font-semibold">Only {repos.length} repository could be compared.</p>
          <p className="text-ink-2 mt-1">
            {result.missing?.length ? `Still not indexed: ${result.missing.map((m) => m.name).join(', ')}. ` : ''}
            Fix the failed repository above and compare again.
          </p>
        </div>
      )}

      {!result && !busy && !error && (
        <div className="py-10 text-center space-y-2">
          <p className="font-matrixtype-display text-5xl text-paper-grey select-none" aria-hidden="true">VS</p>
          <p className="text-ink-2">Pick two to four repositories and press Compare.</p>
        </div>
      )}
    </div>
  );
}
