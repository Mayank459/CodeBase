import React, { useState } from 'react';
import { BookOpen, Download, Play, AlertCircle, CheckCircle2, FileText } from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function DocsTab({ activeRepo }) {
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState(null);
  const [error, setError] = useState(null);

  const handleGenerate = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion bar.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: 'generate documentation for this repository'
      });
      setDocs(res.answer || res.error || 'No documentation generated.');
    } catch (err) {
      setError(err.message || 'Documentation generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!docs) return;
    const cleanRepoName = (activeRepo || 'codebase').replace(/[^a-zA-Z0-9_-]/g, '_');
    const blob = new Blob([docs], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanRepoName}_DOCUMENTATION.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <BookOpen size={18} className="text-indigo-400" />
            <span>Automated Technical Documentation Generator</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Synthesizes docstrings, type signatures, interfaces, and architecture summaries into Markdown.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {docs && (
            <button
              onClick={handleDownload}
              className="btn btn-secondary gap-2 text-xs"
            >
              <Download size={14} />
              <span>Download .md</span>
            </button>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading || !activeRepo}
            className="btn btn-primary gap-2 text-xs"
          >
            {loading ? (
              <>
                <BookOpen size={14} className="animate-spin" />
                <span>Generating Docs...</span>
              </>
            ) : (
              <>
                <Play size={14} />
                <span>Generate Documentation</span>
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} />
          <span>{error}</span>
        </div>
      )}

      {docs && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <span className="badge badge-primary">Structured Markdown Docs</span>
            <span className="text-xs font-mono text-slate-400">Target: {activeRepo}</span>
          </div>
          <MarkdownView content={docs} />
        </div>
      )}

      {!docs && !loading && (
        <div className="glass-panel p-12 text-center text-slate-400 space-y-2">
          <FileText size={36} className="mx-auto text-indigo-400/50 mb-2" />
          <p className="text-sm font-medium text-slate-300">Auto-document classes, methods & modules</p>
          <p className="text-xs text-slate-500">
            Click "Generate Documentation" above to extract API references, parameter types, and descriptions.
          </p>
        </div>
      )}
    </div>
  );
}
