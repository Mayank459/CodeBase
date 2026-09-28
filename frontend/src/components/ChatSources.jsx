import React, { useMemo, useState } from 'react';
import { ChevronRight, FileCode, AlertTriangle } from 'lucide-react';

// What an answer was built from: the entities retrieval matched (with their code)
// and the call-graph neighbourhood around them. Line ranges come from the graph
// context, joined on graph_node_id.
function useSources(evidence) {
  return useMemo(() => {
    const semantic = evidence?.semantic_results || [];
    const graph = evidence?.graph_context || [];
    const lines = new Map(graph.map((g) => [g.node, g.metadata || {}]));
    const seen = new Set();
    const read = semantic
      .filter((r) => { const k = r.graph_node_id || `${r.file_path}::${r.name}`; if (seen.has(k)) return false; seen.add(k); return true; })
      .map((r) => {
        const m = lines.get(r.graph_node_id) || {};
        return { id: r.graph_node_id || `${r.file_path}::${r.name}`, name: r.name, kind: r.entity_type, file: r.file_path, start: m.start_line, end: m.end_line, code: r.content || '' };
      });
    const pick = (rel) => graph.filter((g) => g.relationship === rel).map((g) => ({ id: g.node, name: g.metadata?.name || g.node, file: g.metadata?.file_path, start: g.metadata?.start_line, end: g.metadata?.end_line }));
    return { read, callers: pick('caller'), callees: pick('callee') };
  }, [evidence]);
}

const where = (s) => `${(s.file || '').replace(/^src\//, '')}${s.start ? `:${s.start}${s.end && s.end !== s.start ? `–${s.end}` : ''}` : ''}`;

function SourceRow({ s }) {
  const [open, setOpen] = useState(false);
  const code = s.code.split('\n').slice(0, 14);
  return (
    <li className="rule-b last:border-0">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="w-full py-2 flex items-start gap-2 text-left group">
        <ChevronRight size={14} className={`mt-1 shrink-0 text-ash transition-transform ${open ? 'rotate-90' : ''}`} aria-hidden="true" />
        <span className="min-w-0">
          <span className="block font-mono font-bold text-ink truncate group-hover:underline underline-offset-4">{s.name}</span>
          <span className="block font-mono text-[12.5px] text-ash truncate">{where(s)}</span>
        </span>
        {s.kind && <span className="badge ml-auto shrink-0">{s.kind}</span>}
      </button>
      {open && code.length > 0 && (
        <pre className="ink-plate mb-3 p-3 overflow-x-auto font-mono text-[12.5px] leading-relaxed motion-expand-body">
          {code.map((l, i) => (
            <div key={i} className="flex gap-3">
              {/* real line numbers only; without a known start the gutter stays empty */}
              {s.start && <span className="w-8 shrink-0 text-right text-plate-dim select-none tabular-nums">{s.start + i}</span>}
              <span className="whitespace-pre">{l || ' '}</span>
            </div>
          ))}
          {s.code.split('\n').length > 14 && <div className={`${s.start ? 'pl-11' : ''} text-plate-dim`}>…</div>}
        </pre>
      )}
    </li>
  );
}

function Neighbours({ title, items }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="strip text-ash mb-1.5">{title} <span className="font-mono normal-case tracking-normal">{items.length}</span></h4>
      <ul className="space-y-1">
        {items.slice(0, 8).map((n) => (
          <li key={n.id} className="flex items-baseline gap-2 min-w-0 text-[13.5px]">
            <span className="font-mono text-ink shrink-0">{n.name}</span>
            <span className="font-mono text-[12px] text-ash truncate">{where(n)}</span>
          </li>
        ))}
        {items.length > 8 && <li className="text-xs text-ash">and {items.length - 8} more</li>}
      </ul>
    </div>
  );
}

export function ChatSources({ evidence, pending, repo, answerNo, hasAnswer }) {
  const { read, callers, callees } = useSources(evidence);

  if (pending) {
    return (
      <div className="flex items-center gap-3 text-sm text-ink-2 py-2">
        <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
        Collecting the code this answer read…
      </div>
    );
  }
  if (!hasAnswer) {
    return <p className="text-sm text-ink-2">The entities and call relations each answer was built from appear here, with their files and line ranges.</p>;
  }
  if (evidence == null) {
    return <p className="text-sm text-ink-2">Sources were not recorded for this answer.</p>;
  }
  if (!read.length) {
    return (
      <div className="paper-flat p-3 text-sm">
        <p className="flex items-center gap-2 text-crimson font-bold"><AlertTriangle size={14} aria-hidden="true" /> No indexed code matched</p>
        <p className="mt-1 text-ink-2">This answer is not grounded in the index{repo ? ` for ${repo}` : ''}. Index the repository, or rephrase with a function or file name.</p>
      </div>
    );
  }
  return (
    <div className="space-y-5">
      <div>
        <h4 className="strip text-ash mb-1 flex items-center gap-1.5">
          <FileCode size={13} aria-hidden="true" /> Read {answerNo ? `for answer ${answerNo}` : ''} <span className="font-mono normal-case tracking-normal">{read.length}</span>
        </h4>
        <ul>{read.map((s) => <SourceRow key={s.id} s={s} />)}</ul>
      </div>
      <Neighbours title="Called by" items={callers} />
      <Neighbours title="Calls" items={callees} />
    </div>
  );
}

export const countSources = (evidence) => new Set((evidence?.semantic_results || []).map((r) => r.graph_node_id || `${r.file_path}::${r.name}`)).size;
