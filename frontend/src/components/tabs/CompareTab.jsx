import React, { useState } from 'react';
import { GitCompare, Play, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function CompareTab({ activeRepo }) {
  const [repoList, setRepoList] = useState([
    activeRepo || 'Mayank459/CodeBase',
    'fastapi/fastapi'
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleAddRepo = () => {
    setRepoList([...repoList, '']);
  };

  const handleRemoveRepo = (index) => {
    if (repoList.length <= 2) return;
    setRepoList(repoList.filter((_, i) => i !== index));
  };

  const handleUpdateRepo = (index, value) => {
    const updated = [...repoList];
    updated[index] = value;
    setRepoList(updated);
  };

  const handleCompare = async () => {
    const cleanRepos = repoList.map((r) => r.trim()).filter(Boolean);
    if (cleanRepos.length < 2) {
      setError('Please provide at least two valid repository names/URLs to compare.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiPost('/agent/compare', {
        repositories: cleanRepos
      });
      setResult(res.answer || res.error || 'No comparison report generated.');
    } catch (err) {
      setError(err.message || 'Comparison failed.');
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
              <GitCompare size={18} className="text-indigo-400" />
              <span>Multi-Repository Architectural Comparison</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Side-by-side evaluation of structural complexity, design patterns, and engineering paradigms.
            </p>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="btn btn-primary gap-2 text-xs"
          >
            {loading ? (
              <>
                <GitCompare size={14} className="animate-spin" />
                <span>Comparing Repositories...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Compare Repositories</span>
              </>
            )}
          </button>
        </div>

        {/* Repositories input rows */}
        <div className="space-y-2.5 pt-2 border-t border-white/[0.06]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">Target Repositories:</span>
            <button
              onClick={handleAddRepo}
              className="btn btn-ghost btn-sm text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <Plus size={12} />
              <span>Add Repository</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {repoList.map((repo, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  value={repo}
                  onChange={(e) => handleUpdateRepo(idx, e.target.value)}
                  placeholder={`Repository ${idx + 1} (e.g. org/repo)`}
                  className="input-field font-mono text-xs py-2"
                />
                {repoList.length > 2 && (
                  <button
                    onClick={() => handleRemoveRepo(idx)}
                    className="p-2 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Remove repository"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 font-mono">
            Note: Target repositories must have been indexed prior to comparative analysis.
          </p>
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
            <span className="badge badge-primary">Comparative Architectural Analysis</span>
            <span className="text-xs font-mono text-slate-400">
              {repoList.filter(Boolean).join(' vs ')}
            </span>
          </div>
          <MarkdownView content={result} />
        </div>
      )}

      {!result && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-2">
          <GitCompare size={36} className="mx-auto text-indigo-400/50 mb-2" />
          <p className="text-sm font-medium text-slate-300">Compare architectures side by side</p>
          <p className="text-xs text-slate-500">
            Enter 2 or more indexed repository identifiers above and click "Compare Repositories" to analyze structural trade-offs.
          </p>
        </div>
      )}
    </div>
  );
}
