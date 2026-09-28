import React, { useState } from 'react';
import { GitPullRequest, Check, X, Download, Copy, RotateCcw, ShieldAlert } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';
import { DiffViewer } from '../DiffViewer';
import { Procession } from '../Procession';

// Scan -> real diffs -> the reviewer ticks which fixes to keep (a LangGraph
// interrupt holds the run) -> a git-apply patch and PR text. Nothing is pushed.

const STAGES = [
  { id: 'scan', label: 'Scan' },
  { id: 'patch', label: 'Patch' },
  { id: 'review', label: 'Your approval' },
  { id: 'done', label: 'Patch file' },
];

const SEV_BADGE = { CRITICAL: 'badge-danger', HIGH: 'badge-danger', MEDIUM: 'badge-warning', LOW: '' };

function save(text, filename, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button type="button" className="btn btn-ghost btn-sm" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch (_) {}
    }}>
      {done ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />} {done ? 'Copied' : label}
    </button>
  );
}

export function PullRequestTab({ activeRepo }) {
  const [phase, setPhase] = useState('idle'); // idle | scanning | review | building | done | rejected | empty
  const [threadId, setThreadId] = useState(null);
  const [review, setReview] = useState(null);   // interrupt payload: { files, manual, findings, message }
  const [selected, setSelected] = useState(new Set());
  const [result, setResult] = useState(null);   // { title, body, patch, diffs, manual }
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  const scan = async () => {
    if (!activeRepo) return;
    const id = `pr-${Date.now()}`; // a fresh LangGraph thread per review
    setThreadId(id);
    setPhase('scanning');
    setError(null);
    setReview(null);
    setResult(null);
    const res = await apiPost('/agent/chat', {
      repository_name: activeRepo,
      question: 'create a pull request that fixes the security findings',
      thread_id: id,
    });
    if (res.error) { setError(res.error); setPhase('idle'); return; }
    if (res.approval_needed) {
      const req = res.approval_request || {};
      setReview(req);
      setSelected(new Set((req.files || []).flatMap((f) => f.changes.map((c) => c.id))));
      setPhase('review');
    } else {
      setMessage(res.answer || 'Nothing to fix.');
      setResult(res.pr && res.pr.patch ? res.pr : null);
      setPhase(res.pr && res.pr.patch ? 'done' : 'empty');
    }
  };

  const decide = async (approved) => {
    setPhase(approved ? 'building' : 'scanning');
    setError(null);
    const res = await apiPost('/agent/approve', {
      request_id: threadId,
      approved,
      selected: approved ? [...selected] : null,
    });
    if (res.error) { setError(res.error); setPhase('review'); return; }
    if (!approved) { setMessage(res.answer || 'Rejected.'); setPhase('rejected'); return; }
    if (res.pr?.patch) { setResult(res.pr); setMessage(''); setPhase('done'); }
    else { setMessage(res.answer || 'No patch was produced.'); setPhase('empty'); }
  };

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allIds = (review?.files || []).flatMap((f) => f.changes.map((c) => c.id));
  const nFiles = new Set((review?.files || []).filter((f) => f.changes.some((c) => selected.has(c.id))).map((f) => f.path)).size;

  const stageIndex = { idle: -1, scanning: 0, review: 2, building: 3, done: -1, rejected: -1, empty: -1 }[phase];
  const doneStages = { review: ['scan', 'patch'], building: ['scan', 'patch', 'review'], done: ['scan', 'patch', 'review', 'done'] }[phase] || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={scan} disabled={!activeRepo || phase === 'scanning' || phase === 'building'} className="btn btn-primary">
          <GitPullRequest size={14} aria-hidden="true" />
          {phase === 'scanning' ? 'Scanning' : phase === 'idle' ? 'Scan and draft fixes' : 'Scan again'}
        </button>
        <p className="text-sm text-ink-2 max-w-[70ch]">
          Nothing is pushed to GitHub. You review every diff, keep the fixes you want, and get a patch file plus PR text to apply in your own clone.
        </p>
      </div>

      <div className="max-w-[640px] overflow-x-auto">
        <Procession compact items={STAGES} pos={stageIndex} done={doneStages} />
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm" role="alert">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Check that the repository is indexed and the backend is up, then scan again.</p>
        </div>
      )}

      {phase === 'scanning' && (
        <div className="flex items-center gap-3 text-sm text-ink-2" role="status">
          <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
          Scanning {activeRepo} and drafting fixes against the real files…
        </div>
      )}

      {/* Review: the run is paused until you decide */}
      {(phase === 'review' || phase === 'building') && review && (
        <section className="space-y-5" aria-label="Review fixes">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 rule-b">
            <div>
              <h2 className="font-cond font-bold text-xl text-ink">Review {allIds.length} fix{allIds.length !== 1 ? 'es' : ''} in {review.files.length} file{review.files.length !== 1 ? 's' : ''}</h2>
              <p className="text-sm text-ink-2">The run is paused at the approval step. Untick anything you don’t want in the patch.</p>
            </div>
            <div className="flex gap-2 text-sm">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set(allIds))}>Select all</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Select none</button>
            </div>
          </div>

          {review.files.map((f) => (
            <div key={f.path} className="space-y-2">
              <h3 className="font-mono font-bold text-ink text-[14px]">{f.path}</h3>
              <ul className="space-y-1.5">
                {f.changes.map((c) => (
                  <li key={c.id}>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} className="accent-[#b3262d] w-4 h-4 mt-1" />
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-[12.5px] text-ash">line {c.line}</span>
                          <span className={`badge ${SEV_BADGE[c.severity] || ''}`}>{c.severity.toLowerCase()}</span>
                          <span className="text-ink font-semibold">{c.rule.replace(/_/g, ' ')}</span>
                        </span>
                        <span className="block text-sm text-ink-2">{c.explanation}</span>
                      </span>
                    </label>
                  </li>
                ))}
                {f.imports_added?.length > 0 && <li className="text-sm text-ash pl-7">Adds <span className="font-mono">import {f.imports_added.join(', ')}</span> for the fix.</li>}
              </ul>
              <DiffViewer diffText={f.diff} filename={f.path} title={`${f.changes.length} change${f.changes.length !== 1 ? 's' : ''}`} />
            </div>
          ))}

          {review.manual?.length > 0 && (
            <div className="paper-flat p-4 space-y-1.5">
              <h3 className="font-cond font-bold text-ink flex items-center gap-2"><ShieldAlert size={15} aria-hidden="true" /> Needs manual attention ({review.manual.length})</h3>
              <ul className="space-y-1 text-sm">
                {review.manual.map((m) => (
                  <li key={m.id}><span className="font-mono text-ink">{m.file}:{m.line}</span> <span className="text-ink-2">{m.rule.replace(/_/g, ' ')}. {m.reason}</span></li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 rule-t">
            <button type="button" onClick={() => decide(true)} disabled={phase === 'building' || selected.size === 0} className="btn btn-primary">
              <Check size={14} aria-hidden="true" /> {phase === 'building' ? 'Building patch' : `Approve ${selected.size} fix${selected.size !== 1 ? 'es' : ''}`}
            </button>
            <button type="button" onClick={() => decide(false)} disabled={phase === 'building'} className="btn btn-danger">
              <X size={14} aria-hidden="true" /> Reject
            </button>
            <span className="text-sm text-ash">{selected.size} of {allIds.length} selected across {nFiles} file{nFiles !== 1 ? 's' : ''}</span>
          </div>
        </section>
      )}

      {/* Approved: the patch and the PR text */}
      {phase === 'done' && result && (
        <section className="space-y-5" aria-label="Approved patch">
          <div className="paper-flat p-4 space-y-2">
            <p className="strip text-forest">Approved</p>
            <h2 className="font-cond font-bold text-2xl text-ink">{result.title}</h2>
            <div className="flex flex-wrap gap-2 pt-1">
              <button type="button" className="btn btn-primary btn-sm" onClick={() => save(result.patch, 'codebase-security-fixes.patch', 'text/x-diff')}>
                <Download size={13} aria-hidden="true" /> Download .patch
              </button>
              <CopyButton text={result.body} label="Copy PR description" />
              <CopyButton text={result.title} label="Copy title" />
            </div>
          </div>
          <MarkdownView content={result.body} />
          {(result.diffs || []).map((f) => <DiffViewer key={f.path} diffText={f.diff} filename={f.path} title="approved" />)}
        </section>
      )}

      {(phase === 'rejected' || phase === 'empty') && (
        <div className="paper-flat p-4 text-sm space-y-2">
          <MarkdownView content={message} />
          <button type="button" onClick={scan} className="btn btn-secondary btn-sm"><RotateCcw size={13} aria-hidden="true" /> Scan again</button>
        </div>
      )}

      {phase === 'idle' && !error && (
        <p className="text-ink-2 max-w-[70ch]">
          Scans {activeRepo ? <span className="font-mono">{activeRepo}</span> : 'the indexed repository'} with the security rules, drafts a one-line fix for each finding it can fix safely, and stops for your approval before producing anything.
        </p>
      )}
    </div>
  );
}

export default PullRequestTab;
