import React, { useState } from 'react';
import { Scissors, Play, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function DeadCodeTab({ activeRepo }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion bar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: 'find dead code and unused functions'
      });
      setResult(res.answer || res.error || 'No dead code report returned.');
    } catch (err) {
      setError(err.message || 'Failed to detect dead code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <Scissors size={18} className="text-amber-400" />
            <span>Dead Code & Unused Symbol Detection</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Uses call graph reachability analysis to discover unreferenced functions, classes, and dead branches.
          </p>
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !activeRepo}
          className="btn btn-primary gap-2 text-xs"
        >
          {loading ? (
            <>
              <Scissors size={14} className="animate-spin" />
              <span>Scanning Graph...</span>
            </>
          ) : (
            <>
              <Play size={14} />
              <span>Find Dead Code</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <span className="badge badge-warning">Reachability Report</span>
            <span className="text-xs font-mono text-slate-400">Target: {activeRepo}</span>
          </div>
          <MarkdownView content={result} />
        </div>
      )}

      {!result && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-2">
          <Scissors size={36} className="mx-auto text-amber-400/50 mb-2" />
          <p className="text-sm font-medium text-slate-300">Clean up unnecessary code</p>
          <p className="text-xs text-slate-500">
            Click "Find Dead Code" to traverse the AST and identify uncalled functions, unused imports, and unreachable methods.
          </p>
        </div>
      )}
    </div>
  );
}
