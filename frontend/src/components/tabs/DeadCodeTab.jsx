import React, { useState } from 'react';
import { Scissors } from 'lucide-react';
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
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleAnalyze} disabled={loading || !activeRepo} className="btn btn-primary">
          <Scissors size={14} strokeWidth={2} />
          <span>{loading ? 'Scanning graph…' : 'Find dead code'}</span>
        </button>
        {loading && (
          <div className="flex items-center gap-2 text-sm text-ink-2" role="status">
            <div className="flex items-end gap-1">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <span>Walking the call graph for symbols with no callers…</span>
          </div>
        )}
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Check that the repository is indexed, then run the scan again.</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between rule-b pb-3">
            <span className="strip text-ash">Reachability report</span>
            <span className="font-mono text-sm text-ash">{activeRepo}</span>
          </div>
          <MarkdownView content={result} />
        </div>
      )}

      {!result && !loading && (
        <p className="text-sm text-ink-2 max-w-prose">
          Run the scan to list functions, classes and methods in {activeRepo ? <span className="font-mono">{activeRepo}</span> : 'your repository'} that nothing calls.
        </p>
      )}
    </div>
  );
}
