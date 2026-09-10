import React, { useState } from 'react';
import { GitCommit, Play, AlertCircle, History, ArrowRight } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function EvolutionTab({ activeRepo }) {
  const [oldRepo, setOldRepo] = useState(activeRepo ? `${activeRepo}@v1` : '');
  const [newRepo, setNewRepo] = useState(activeRepo ? `${activeRepo}@v2` : '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!oldRepo.trim() || !newRepo.trim()) {
      setError('Please provide both the previous and current repository identifiers.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost('/agent/evolution', {
        old_repository: oldRepo.trim(),
        new_repository: newRepo.trim()
      });
      setResult(res.answer || res.error || 'No evolution data returned.');
    } catch (err) {
      setError(err.message || 'Evolution analysis failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <GitCommit size={18} className="text-cyan-400" />
              <span>Repository Evolution & Semantic Diff</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Analyzes code churn, API contract alterations, architectural drift, and breaking changes.
            </p>
          </div>

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className="btn btn-primary gap-2 text-xs"
          >
            {loading ? (
              <>
                <GitCommit size={14} className="animate-spin" />
                <span>Diffing Versions...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Analyze Evolution</span>
              </>
            )}
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Base / Previous Version (Indexed Name):
            </label>
            <input
              type="text"
              value={oldRepo}
              onChange={(e) => setOldRepo(e.target.value)}
              placeholder="e.g. repo-name@v1.0"
              className="input-field font-mono text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-mono text-slate-400 mb-1.5">
              Head / Current Version (Indexed Name):
            </label>
            <input
              type="text"
              value={newRepo}
              onChange={(e) => setNewRepo(e.target.value)}
              placeholder="e.g. repo-name@v2.0"
              className="input-field font-mono text-xs"
            />
          </div>
        </div>
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
            <span className="badge badge-primary">Semantic Evolution Report</span>
            <span className="text-xs font-mono text-slate-400">
              {oldRepo} → {newRepo}
            </span>
          </div>
          <MarkdownView content={result} />
        </div>
      )}

      {!result && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-2">
          <History size={36} className="mx-auto text-cyan-400/50 mb-2" />
          <p className="text-sm font-medium text-slate-300">Track architectural drift across releases</p>
          <p className="text-xs text-slate-500">
            Index both release versions, specify their identifiers above, and click "Analyze Evolution" to generate a semantic diff.
          </p>
        </div>
      )}
    </div>
  );
}
