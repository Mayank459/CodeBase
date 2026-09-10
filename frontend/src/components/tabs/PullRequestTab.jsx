import React, { useState } from 'react';
import { 
  GitPullRequest, Play, CheckCircle2, XCircle, AlertTriangle, 
  FileCode, Check, ShieldCheck, Sparkles, GitBranch, ArrowRight, Eye
} from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';
import { DiffViewer } from '../DiffViewer';
import confetti from 'canvas-confetti';

export function PullRequestTab({ activeRepo }) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [threadId] = useState(`pr-${Date.now()}`);
  const [approvalStatus, setApprovalStatus] = useState('idle'); // 'idle' | 'approved' | 'rejected'

  const handleGenerate = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion bar.');
      return;
    }

    setLoading(true);
    setError(null);
    setPendingApproval(null);
    setResult(null);
    setApprovalStatus('idle');

    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: 'create a pull request to fix security vulnerabilities with exact file diffs and regression unit tests',
        thread_id: threadId
      });

      if (res.error) {
        setError(res.error);
      } else if (res.approval_needed) {
        setPendingApproval(res);
      } else {
        setResult(res.answer || 'Pull request synthesized.');
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize PR workflow.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (approved) => {
    if (!pendingApproval) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await apiPost('/agent/approve', {
        request_id: pendingApproval.request_id || threadId,
        approved
      });

      setPendingApproval(null);
      setApprovalStatus(approved ? 'approved' : 'rejected');

      if (res.error) {
        setError(res.error);
      } else {
        setResult(res.answer || (approved ? 'Pull request created and committed successfully.' : 'Pull request generation aborted by operator.'));
        if (approved) {
          try {
            confetti({
              particleCount: 75,
              spread: 80,
              origin: { y: 0.6 },
              colors: ['#6366f1', '#10b981', '#06b6d4']
            });
          } catch (_) {}
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to process approval decision.');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper to extract code diff blocks from markdown text
  const extractDiff = (text) => {
    if (!text) return null;
    const diffMatch = text.match(/```(?:diff)?\s*([\s\S]*?)```/);
    if (diffMatch && (diffMatch[1].includes('+') || diffMatch[1].includes('-'))) {
      return diffMatch[1].trim();
    }
    return null;
  };

  const findings = pendingApproval?.approval_request?.findings || [];
  const extractedDiff = extractDiff(result || pendingApproval?.approval_request?.answer);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <GitPullRequest size={20} className="text-indigo-400" />
            <h3 className="text-base font-semibold text-white">Autonomous PR & Human-in-the-Loop (HITL)</h3>
            <span className="badge badge-primary text-[10px]">LangGraph Checkpointer</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Detects vulnerabilities, generates before/after patches, and mandates human review before applying changes.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || actionLoading || !activeRepo}
          className="btn btn-primary gap-2 text-xs shadow-lg shadow-indigo-500/20"
        >
          {loading ? (
            <>
              <GitPullRequest size={14} className="animate-spin" />
              <span>Detecting & Staging PR...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Generate Pull Request</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* HITL Approval Gate Modal / Card */}
      {pendingApproval && (
        <div className="glass-panel p-6 border-amber-500/40 bg-amber-500/[0.03] space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={18} />
            <h4 className="text-sm font-bold">Human Approval Checkpoint Required</h4>
            <span className="badge badge-warning text-[10px] ml-auto">Interrupt Gate</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The security agent detected actionable issues in <strong>{activeRepo}</strong>. LangGraph has paused execution and requires your explicit authorization before synthesizing and committing this Pull Request:
          </p>

          {findings.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {findings.map((f, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded bg-[#060910] border border-white/[0.06] text-xs font-mono">
                  <div className="flex items-center gap-2 truncate">
                    <FileCode size={13} className="text-indigo-400 flex-shrink-0" />
                    <span className="text-slate-200 truncate">{f.file || 'unknown_file'}</span>
                  </div>
                  <span className="text-amber-400 text-[11px] bg-amber-400/10 px-2 py-0.5 rounded flex-shrink-0">
                    {f.type || 'vulnerability'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Review proposed changes and test cases below before authorizing.</p>
          )}

          {/* Render Diff Preview if available */}
          {extractedDiff && (
            <div className="pt-2">
              <DiffViewer diffText={extractedDiff} filename="staged-remediation.diff" title="Staged PR Review" />
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
            <button
              onClick={() => handleDecision(false)}
              disabled={actionLoading}
              className="btn btn-danger btn-sm text-xs gap-1.5"
            >
              <XCircle size={14} />
              <span>Reject PR</span>
            </button>

            <button
              onClick={() => handleDecision(true)}
              disabled={actionLoading}
              className="btn btn-primary btn-sm text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20"
            >
              {actionLoading ? (
                <>
                  <CheckCircle2 size={14} className="animate-spin" />
                  <span>Authorizing PR...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Approve & Commit PR</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PR Result / Diff Viewer */}
      {result && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className={`badge ${approvalStatus === 'approved' ? 'badge-success' : 'badge-primary'}`}>
                {approvalStatus === 'approved' ? 'PR Approved & Committed' : 'Generated PR Specification'}
              </span>
              <span className="text-xs font-mono text-slate-400">Target: {activeRepo}</span>
            </div>
            {approvalStatus === 'approved' && (
              <span className="text-xs font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 size={13} />
                <span>Sign-off Verified</span>
              </span>
            )}
          </div>

          {/* Display Code Diff Viewer if diff detected */}
          {extractedDiff && (
            <DiffViewer diffText={extractedDiff} filename="security-patch.diff" title="Unified Diff" />
          )}

          <MarkdownView content={result} />
        </div>
      )}

      {!pendingApproval && !result && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-3">
          <GitPullRequest size={40} className="mx-auto text-indigo-400/50 mb-2" />
          <h4 className="text-sm font-semibold text-slate-200">Autonomous Remediation & Human Sign-off</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Click <strong>"Generate Pull Request"</strong> above to detect codebase vulnerabilities, synthesize before/after patches, formulate regression test cases, and review before applying.
          </p>
        </div>
      )}
    </div>
  );
}
