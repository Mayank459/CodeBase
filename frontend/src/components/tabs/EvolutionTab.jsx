import React, { useEffect, useState } from 'react';
import { GitCommit, ArrowRight, RefreshCw, Download, Copy, Check, ChevronDown } from 'lucide-react';
import { apiPost } from '../../api';
import { normalizeRepoUrl } from '../IndexDrawer';

// What changed between two versions of one repository, read from git: the
// public API (breaking first), files, third-party packages and commits.

function Fold({ title, count, children, open: initial = false }) {
  const [open, setOpen] = useState(initial);
  if (!count) return null;
  return (
    <section className="rule-t pt-4">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full flex items-center justify-between text-left">
        <h3 className="font-cond font-bold text-lg text-ink">{title} <span className="font-mono text-sm text-ash tabular-nums">{count}</span></h3>
        <ChevronDown size={16} className={`text-ash transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && <div className="mt-3 motion-expand-body">{children}</div>}
    </section>
  );
}

function Sym({ name }) {
  const parts = name.split('.');
  return (
    <span className="font-mono text-[13.5px] break-words">
      <span className="text-ash">{parts.slice(0, -1).join('.')}.</span>
      <span className="text-ink font-bold">{parts[parts.length - 1]}</span>
    </span>
  );
}

export function EvolutionTab({ activeRepo }) {
  const [repo, setRepo] = useState(activeRepo || 'psf/requests');
  const [refs, setRefs] = useState(null);
  const [base, setBase] = useState('');
  const [head, setHead] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadRefs = async (target = repo) => {
    if (!target.trim()) return;
    setLoadingRefs(true);
    setError(null);
    const res = await apiPost('/repository/refs', { repo_url: normalizeRepoUrl(target) });
    setLoadingRefs(false);
    if (res.error) {
      setError(res.error);
      setRefs(null);
      return;
    }
    setRefs(res);
    // Newest tag against the one before it; otherwise default branch against its first tag
    if (res.tags.length >= 2) { setHead(res.tags[0]); setBase(res.tags[1]); }
    else if (res.tags.length === 1) { setHead('HEAD'); setBase(res.tags[0]); }
    else { setHead('HEAD'); setBase(res.branches.find((b) => b !== res.default_branch) || ''); }
  };

  useEffect(() => { loadRefs(activeRepo || repo); }, [activeRepo]);

  const analyse = async () => {
    if (!base || !head) {
      setError('Pick an older version and a newer version.');
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    const res = await apiPost('/repository/evolution', { repo_url: normalizeRepoUrl(repo), base, head }, 240000);
    setLoading(false);
    if (res.error) setError(res.error);
    else setResult(res);
  };

  const download = () => {
    const blob = new Blob([result.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repo.split('/').pop()}_${base}_to_${head}.md`.replace(/[^a-zA-Z0-9._-]/g, '_');
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

  const refOptions = refs && (
    <>
      <option value="HEAD">{refs.default_branch ? `${refs.default_branch} (latest)` : 'Default branch (latest)'}</option>
      {refs.tags.length > 0 && <optgroup label="Tags">{refs.tags.map((t) => <option key={t} value={t}>{t}</option>)}</optgroup>}
      {refs.branches.filter((b) => b !== refs.default_branch).length > 0 && (
        <optgroup label="Branches">{refs.branches.filter((b) => b !== refs.default_branch).map((b) => <option key={b} value={b}>{b}</option>)}</optgroup>
      )}
    </>
  );

  const s = result?.summary;
  const api = result?.api;
  const compatible = api?.changed.filter((c) => c.severity === 'compatible') || [];
  const maxChurn = Math.max(1, ...(result?.files || []).map((f) => f.added + f.removed));

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)_auto] gap-3 items-end">
        <label className="block">
          <span className="strip text-ash">Repository</span>
          <input value={repo} onChange={(e) => setRepo(e.target.value)} onBlur={() => loadRefs()} onKeyDown={(e) => e.key === 'Enter' && loadRefs()}
            placeholder="owner/repo or GitHub URL" className="mt-1 input-field font-mono !text-[13px]" disabled={loading} />
        </label>
        <button type="button" onClick={() => loadRefs()} disabled={loadingRefs || loading} className="btn btn-ghost btn-sm lg:mb-1.5" title="Reload versions">
          <RefreshCw size={13} className={loadingRefs ? 'animate-spin' : ''} aria-hidden="true" /> Versions
        </button>
        <label className="block">
          <span className="strip text-ash">From (older)</span>
          <select value={base} onChange={(e) => setBase(e.target.value)} disabled={!refs || loading} className="mt-1 input-field font-mono !text-[13px]">
            {!refs && <option value="">{loadingRefs ? 'Loading…' : '—'}</option>}
            {refOptions}
          </select>
        </label>
        <ArrowRight size={18} className="hidden lg:block text-ash mb-3" aria-hidden="true" />
        <label className="block">
          <span className="strip text-ash">To (newer)</span>
          <select value={head} onChange={(e) => setHead(e.target.value)} disabled={!refs || loading} className="mt-1 input-field font-mono !text-[13px]">
            {!refs && <option value="">{loadingRefs ? 'Loading…' : '—'}</option>}
            {refOptions}
          </select>
        </label>
        <button type="button" onClick={analyse} disabled={loading || !refs} className="btn btn-primary">
          {loading ? <RefreshCw size={14} className="animate-spin" aria-hidden="true" /> : <GitCommit size={14} aria-hidden="true" />}
          {loading ? 'Comparing' : 'Compare versions'}
        </button>
      </div>
      {refs && <p className="text-sm text-ash">{refs.tags.length} tags and {refs.branches.length} branches on {refs.url.replace('https://github.com/', '')}. Nothing needs indexing: both versions are read straight from git.</p>}

      {error && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Check the repository name and that both versions exist, then try again.</p>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 text-sm text-ink-2" role="status">
          <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
          Checking out {base} and {head === 'HEAD' ? 'the latest code' : head}, then comparing their public API…
        </div>
      )}

      {result && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3 pb-3 rule-b">
            <h2 className="font-cond font-bold text-2xl text-ink">
              <span className="font-mono">{result.base}</span> <ArrowRight size={18} className="inline text-ash" aria-hidden="true" /> <span className="font-mono">{result.head === 'HEAD' ? 'latest' : result.head}</span>
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={copy} className="btn btn-ghost btn-sm">{copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? 'Copied' : 'Copy .md'}</button>
              <button type="button" onClick={download} className="btn btn-secondary btn-sm"><Download size={13} aria-hidden="true" /> Download .md</button>
            </div>
          </div>

          {/* Summary figures */}
          <dl className="flex flex-wrap gap-x-10 gap-y-3">
            {[
              ['commits', s.commits ?? '?'],
              ['files changed', s.files_changed],
              ['lines', <><span className="text-forest">+{s.lines_added.toLocaleString()}</span> <span className="text-crimson">−{s.lines_removed.toLocaleString()}</span></>],
              ['API added', s.api_added],
              ['API changed', s.api_changed],
              ['moved', s.api_moved],
            ].map(([k, v]) => (
              <div key={k}><dt className="strip text-ash">{k}</dt><dd className="font-mono text-xl text-ink tabular-nums">{v}</dd></div>
            ))}
            <div><dt className="strip text-ash">breaking</dt><dd className={`font-mono text-xl tabular-nums ${s.breaking ? 'text-crimson font-bold' : 'text-forest'}`}>{s.breaking}</dd></div>
          </dl>

          {/* Breaking changes lead */}
          {api.breaking.length > 0 ? (
            <section className="paper-flat p-4 space-y-2" aria-label="Breaking changes">
              <h3 className="font-cond font-bold text-lg text-crimson">Breaking changes <span className="font-mono text-sm tabular-nums">{api.breaking.length}</span></h3>
              <p className="text-sm text-ink-2">Code written against {result.base} that uses these will need changes.</p>
              <ul className="divide-y divide-rule">
                {api.breaking.map((b) => (
                  <li key={b.name} className="py-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <Sym name={b.name} />
                    <span className="badge badge-danger">{b.reason}</span>
                    {b.old && <span className="w-full font-mono text-[12.5px] text-ash break-words">{b.old} → {b.new}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="paper-flat p-4 text-forest font-semibold">No breaking changes to the public API. Everything public in {result.base} still exists with a compatible signature.</p>
          )}

          <Fold title="Added to the public API" count={api.added.length} open>
            <ul className="space-y-1.5">
              {api.added.map((a) => (
                <li key={a.name} className="flex flex-wrap items-baseline gap-x-2"><Sym name={a.name} />{a.signature && <span className="font-mono text-[12.5px] text-ash break-words">{a.signature}</span>}<span className="badge">{a.kind}</span></li>
              ))}
            </ul>
          </Fold>

          <Fold title="Changed, still compatible" count={compatible.length}>
            <ul className="space-y-2.5">
              {compatible.map((c) => (
                <li key={c.name}>
                  <div className="flex flex-wrap items-baseline gap-2"><Sym name={c.name} /><span className="badge badge-warning">{c.reason}</span></div>
                  <p className="font-mono text-[12.5px] text-ash break-words">{c.old} → {c.new}</p>
                </li>
              ))}
            </ul>
          </Fold>

          <Fold title="Moved (still available)" count={api.moved.length}>
            <ul className="space-y-1">
              {api.moved.map((m) => <li key={m.name} className="flex flex-wrap items-baseline gap-2"><Sym name={m.name} /><span className="text-sm text-ash">{m.reason}</span></li>)}
            </ul>
          </Fold>

          <Fold title="Most changed files" count={result.files.length} open>
            <table className="w-full text-sm">
              <tbody>
                {result.files.map((f) => (
                  <tr key={f.path} className="rule-b align-top">
                    <td className="py-1.5 pr-3">
                      <span className="font-mono text-[13px] text-ink break-all">{f.path}</span>
                      {f.from && <span className="block font-mono text-[11.5px] text-ash">from {f.from}</span>}
                    </td>
                    <td className="py-1.5 pr-3"><span className={`badge ${f.status === 'removed' ? 'badge-danger' : f.status === 'added' ? 'badge-success' : ''}`}>{f.status}</span></td>
                    <td className="py-1.5 w-[180px]">
                      <span className="font-mono text-[12px] tabular-nums"><span className="text-forest">+{f.added}</span> <span className="text-crimson">−{f.removed}</span></span>
                      <span className="flex h-1 mt-1 rounded-full overflow-hidden bg-paper-grey" aria-hidden="true">
                        <span className="bg-forest" style={{ width: `${(100 * f.added) / maxChurn}%` }} />
                        <span className="bg-crimson" style={{ width: `${(100 * f.removed) / maxChurn}%` }} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Fold>

          <Fold title="Third-party packages" count={result.dependencies.added.length + result.dependencies.removed.length + result.dependencies.kept.length}>
            <p className="text-sm text-ink-2">
              Added: <span className="font-mono text-ink">{result.dependencies.added.join(', ') || 'none'}</span> · Removed: <span className="font-mono text-ink">{result.dependencies.removed.join(', ') || 'none'}</span> · Unchanged: <span className="font-mono">{result.dependencies.kept.join(', ') || 'none'}</span>
            </p>
          </Fold>

          <Fold title="Commits in between" count={result.commits.count || 0}>
            <p className="text-sm text-ink-2">{result.commits.first_date} to {result.commits.last_date} · by {result.commits.authors.map((a) => `${a.name} (${a.commits})`).join(', ')}</p>
            <ul className="mt-2 space-y-1">
              {result.commits.recent.map((c) => (
                <li key={c.sha} className="text-sm flex gap-3"><span className="font-mono text-ash shrink-0">{c.sha}</span><span className="text-ink">{c.subject}</span><span className="text-ash shrink-0 hidden sm:inline">{c.date}</span></li>
              ))}
            </ul>
          </Fold>
        </div>
      )}

      {!result && !loading && !error && (
        <div className="py-10 text-center space-y-2">
          <p className="font-matrixtype-display text-5xl text-paper-grey select-none" aria-hidden="true">v1 → v2</p>
          <p className="text-ink-2">Pick two versions and see what changed in the public API, files, packages and commits.</p>
        </div>
      )}
    </div>
  );
}

export default EvolutionTab;
