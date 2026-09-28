import React, { useEffect, useMemo, useState } from 'react';
import { Download, Copy, Check, RefreshCw, Search, PenLine, ChevronRight } from 'lucide-react';
import { apiPost } from '../../api';

// The Docs tab reads the repository's public API as parsed from source:
// signatures, docstrings and documentation coverage, with a docstring drafter
// for anything undocumented.

function Coverage({ documented, total, className = '' }) {
  const pct = total ? Math.round((100 * documented) / total) : 0;
  return (
    <span className={`inline-flex items-center gap-2 ${className}`} title={`${documented} of ${total} documented`}>
      <span className="w-16 h-1.5 bg-paper-grey rounded-full overflow-hidden" aria-hidden="true">
        <span className="block h-full bg-ink" style={{ width: `${pct}%` }} />
      </span>
      <span className="font-mono text-[12px] text-ash tabular-nums">{documented}/{total}</span>
    </span>
  );
}

function Tags({ item }) {
  const tags = [
    item.is_async && 'async',
    item.kind && item.kind !== 'method' && item.kind,
    item.deprecated && 'deprecated',
  ].filter(Boolean);
  return tags.map((t) => (
    <span key={t} className={`badge ${t === 'deprecated' ? 'badge-warning' : ''}`}>{t}</span>
  ));
}

function Docstring({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  const [first, ...rest] = text.split('\n\n');
  return (
    <div className="mt-1.5 text-[14.5px] text-ink-2 max-w-[78ch]">
      <p className="whitespace-pre-wrap">{first}</p>
      {rest.length > 0 && (
        <>
          {open && <pre className="mt-2 whitespace-pre-wrap font-mono text-[13px] text-ink-2">{rest.join('\n\n')}</pre>}
          <button type="button" onClick={() => setOpen((o) => !o)} className="mt-1 text-sm text-ink underline underline-offset-4">
            {open ? 'Show less' : 'Show full docstring'}
          </button>
        </>
      )}
    </div>
  );
}

function Drafter({ repo, symbolId, style }) {
  const [state, setState] = useState({ loading: false, text: '', error: '' });
  const [copied, setCopied] = useState(false);

  const draft = async () => {
    setState({ loading: true, text: '', error: '' });
    const res = await apiPost('/repository/docstring', { repository_name: repo, symbol_id: symbolId, style });
    setState(res.error ? { loading: false, text: '', error: res.error } : { loading: false, text: res.docstring, error: '' });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`"""${state.text}\n"""`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  if (state.text) {
    return (
      <div className="mt-2 max-w-[78ch]">
        <div className="ink-plate overflow-hidden">
          <div className="px-3 py-1.5 bg-plate-2 flex items-center justify-between text-[12px] font-mono text-plate-dim">
            <span>Draft · {style === 'numpy' ? 'NumPy' : 'Google'} style · review before committing</span>
            <span className="flex gap-1">
              <button type="button" onClick={copy} className="px-2 py-0.5 rounded-sm hover:bg-plate hover:text-plate-ink inline-flex items-center gap-1">
                {copied ? <Check size={11} aria-hidden="true" /> : <Copy size={11} aria-hidden="true" />}{copied ? 'Copied' : 'Copy'}
              </button>
              <button type="button" onClick={draft} className="px-2 py-0.5 rounded-sm hover:bg-plate hover:text-plate-ink">Redraft</button>
            </span>
          </div>
          <pre className="p-3 whitespace-pre-wrap font-mono text-[13px] leading-relaxed">{state.text}</pre>
        </div>
      </div>
    );
  }
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-2">
      <span className="badge">No docstring</span>
      <button type="button" onClick={draft} disabled={state.loading} className="btn btn-ghost btn-sm !normal-case !tracking-normal !font-sans">
        <PenLine size={13} aria-hidden="true" />
        {state.loading ? 'Drafting…' : 'Draft docstring'}
      </button>
      {state.error && <span className="text-sm text-crimson">{state.error}</span>}
    </div>
  );
}

function Symbol({ item, repo, style, owner, level = 'h3' }) {
  const H = level;
  const isClass = 'methods' in item;
  const bases = isClass && item.bases?.length ? `(${item.bases.join(', ')})` : '';
  const code = isClass
    ? `class ${item.name}${bases}`
    : `${item.is_async ? 'async ' : ''}${owner ? `${owner}.` : ''}${item.name}${item.signature}${item.return_type ? ` -> ${item.return_type}` : ''}`;
  return (
    <div id={item.id} className="scroll-mt-24">
      <div className="flex flex-wrap items-baseline gap-2">
        <H className={`font-mono font-bold text-ink break-words [overflow-wrap:anywhere] min-w-0 max-w-full ${isClass ? 'text-[17px]' : 'text-[15px]'}`}>{code}</H>
        <Tags item={item} />
        {item.start_line && <span className="font-mono text-[12px] text-ash">L{item.start_line}–{item.end_line}</span>}
      </div>
      {isClass && item.signature !== '()' && (
        <p className="mt-1 font-mono text-[13px] text-ink-2 break-words">{item.name}{item.signature}</p>
      )}
      {item.docstring ? <Docstring text={item.docstring} /> : <Drafter repo={repo} symbolId={item.id} style={style} />}
    </div>
  );
}

function ModulePage({ mod, repo, style, onlyMissing }) {
  const keep = (x) => !onlyMissing || !x.docstring;
  const classes = mod.classes
    .map((c) => ({ ...c, methods: c.methods.filter(keep) }))
    .filter((c) => keep(c) || c.methods.length);
  const functions = mod.functions.filter(keep);

  return (
    <article>
      <header className="pb-4 mb-6 rule-b">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-cond font-bold text-2xl text-ink">{mod.module}</h2>
          <Coverage documented={mod.documented_count} total={mod.public_count} />
        </div>
        <p className="font-mono text-[12.5px] text-ash">{mod.path}</p>
        {mod.docstring && <p className="mt-3 text-ink-2 whitespace-pre-wrap max-w-[78ch]">{mod.docstring}</p>}
      </header>

      {classes.length === 0 && functions.length === 0 && (
        <p className="text-ink-2">{onlyMissing ? 'Everything public in this module is documented.' : 'No public classes or functions.'}</p>
      )}

      <div className="space-y-10">
        {classes.map((c) => (
          <section key={c.id} className="space-y-5">
            <Symbol item={c} repo={repo} style={style} />
            {c.methods.length > 0 && (
              <ul className="space-y-5 border-l border-rule pl-5 ml-1">
                {c.methods.map((m) => (
                  <li key={m.id}><Symbol item={m} repo={repo} style={style} owner={c.name} level="h4" /></li>
                ))}
              </ul>
            )}
          </section>
        ))}
        {functions.length > 0 && (
          <section className="space-y-5">
            {classes.length > 0 && <h3 className="strip text-ash">Functions</h3>}
            {functions.map((f) => <Symbol key={f.id} item={f} repo={repo} style={style} />)}
          </section>
        )}
      </div>
    </article>
  );
}

export function DocsTab({ activeRepo }) {
  const [ref, setRef] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [style, setStyle] = useState('google');
  const [copied, setCopied] = useState(false);

  const load = async () => {
    if (!activeRepo) return;
    setLoading(true);
    setError(null);
    const res = await apiPost('/repository/docs', { repository_name: activeRepo });
    if (res.error) {
      setError(res.error);
      setRef(null);
    } else {
      setRef(res);
      setSelected((s) => (s && res.modules.some((m) => m.path === s) ? s : res.modules[0]?.path || null));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeRepo]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (!ref || !q) return [];
    const out = [];
    for (const m of ref.modules) {
      for (const c of m.classes) {
        if (c.name.toLowerCase().includes(q)) out.push({ mod: m, item: c });
        for (const meth of c.methods) if (`${c.name}.${meth.name}`.toLowerCase().includes(q)) out.push({ mod: m, item: meth, owner: c.name });
      }
      for (const f of m.functions) if (f.name.toLowerCase().includes(q)) out.push({ mod: m, item: f });
    }
    return out.slice(0, 60);
  }, [ref, q]);

  const download = () => {
    if (!ref?.markdown) return;
    const blob = new Blob([ref.markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_')}_API_REFERENCE.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(ref.markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (_) {}
  };

  if (!activeRepo) {
    return <p className="text-ink-2">Index a repository to read its API reference here.</p>;
  }

  const mod = ref?.modules.find((m) => m.path === selected);
  const s = ref?.stats;

  return (
    <div className="space-y-6">
      {/* Summary and actions */}
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        {s ? (
          <p className="text-ink-2">
            <b className="text-ink tabular-nums">{s.public_symbols}</b> public symbols in <b className="text-ink tabular-nums">{s.modules}</b> modules,{' '}
            <b className="text-ink tabular-nums">{s.coverage_pct}%</b> documented
          </p>
        ) : (
          <p className="text-ink-2">{loading ? 'Reading signatures and docstrings…' : ' '}</p>
        )}
        {s && <Coverage documented={s.documented} total={s.public_symbols} />}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={load} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Rebuild
          </button>
          {ref && (
            <>
              <button type="button" onClick={copy} className="btn btn-ghost btn-sm">
                {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {copied ? 'Copied' : 'Copy .md'}
              </button>
              <button type="button" onClick={download} className="btn btn-secondary btn-sm">
                <Download size={13} aria-hidden="true" /> Download .md
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Index the repository, then press Rebuild.</p>
        </div>
      )}

      {loading && !ref && (
        <div className="flex items-center gap-3 text-sm text-ink-2" role="status">
          <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
          Reading signatures and docstrings…
        </div>
      )}

      {ref && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3 pb-4 rule-b">
            <label className="relative flex-1 min-w-[220px] max-w-md">
              <span className="sr-only">Search symbols</span>
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ash pointer-events-none" aria-hidden="true" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a class, function or method" className="input-field has-icon-left" />
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2 select-none">
              <input type="checkbox" checked={onlyMissing} onChange={(e) => setOnlyMissing(e.target.checked)} className="accent-[#b3262d] w-4 h-4" />
              Only undocumented
            </label>
            <label className="flex items-center gap-2 text-sm text-ink-2">
              Draft style
              <select value={style} onChange={(e) => setStyle(e.target.value)} className="input-field !w-auto !py-1.5">
                <option value="google">Google</option>
                <option value="numpy">NumPy</option>
              </select>
            </label>
          </div>

          {q ? (
            <section>
              <h2 className="strip text-ash mb-4">{matches.length} {matches.length === 1 ? 'match' : 'matches'} for “{query}”</h2>
              <ul className="space-y-6">
                {matches.map(({ mod: m, item, owner }) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => { setSelected(m.path); setQuery(''); setTimeout(() => document.getElementById(item.id)?.scrollIntoView({ block: 'start' }), 50); }}
                      className="font-mono text-[12.5px] text-ash hover:text-ink inline-flex items-center gap-1">
                      {m.module} <ChevronRight size={12} aria-hidden="true" />
                    </button>
                    <Symbol item={item} repo={activeRepo} style={style} owner={owner} />
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-8">
              {/* Module index */}
              <nav aria-label="Modules" className="lg:sticky lg:top-24 lg:self-start lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto pr-1">
                <h2 className="strip text-ash mb-2">Modules</h2>
                <ul>
                  {ref.modules.map((m) => {
                    const sel = m.path === selected;
                    return (
                      <li key={m.path}>
                        <button type="button" onClick={() => setSelected(m.path)} aria-current={sel ? 'true' : undefined}
                          className={`w-full text-left px-2.5 py-1.5 rounded-sm flex items-center justify-between gap-2 ${sel ? 'bg-ink text-pulp' : 'text-ink hover:bg-pulp-2'}`}>
                          <span className="font-mono text-[13px] truncate">{m.module}</span>
                          <span className={`font-mono text-[11px] tabular-nums shrink-0 ${sel ? 'text-plate-dim' : m.documented_count < m.public_count ? 'text-ochre' : 'text-ash'}`}>
                            {m.documented_count}/{m.public_count}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="min-w-0">
                {mod ? <ModulePage mod={mod} repo={activeRepo} style={style} onlyMissing={onlyMissing} /> : <p className="text-ink-2">No public modules found.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DocsTab;
