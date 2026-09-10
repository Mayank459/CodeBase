import React from 'react';
import { ShieldCheck, Lock, Trash2, Database, EyeOff, FileText, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-emerald-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Code Confidentiality & Privacy Policy</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 font-mono">
            Last Updated: September 2026 • Strict Developer Data Protection
          </p>
        </div>

        <button
          onClick={onNavigateToDashboard}
          className="btn btn-secondary btn-sm gap-1.5"
        >
          <ArrowLeft size={13} />
          <span>Back to Workstation</span>
        </button>
      </div>

      {/* Core Principles */}
      <div className="glass-panel p-6 space-y-6 text-xs text-slate-300 leading-relaxed font-sans">
        {/* Section 1 */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <Trash2 size={16} className="text-rose-400" />
            <span>1. Ephemeral Repository Cloning & Immediate Cleanup</span>
          </div>
          <p className="text-slate-400">
            When you index a Git repository, the backend performs a temporary clone to extract AST syntax nodes and construct the NetworkX call graph. Once extraction and vectorization are finalized, the raw repository source files on disk are <strong>immediately purged via <code>shutil.rmtree()</code></strong>. No raw code files remain resident on disk.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-2 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <EyeOff size={16} className="text-indigo-400" />
            <span>2. Zero Model Training Policy</span>
          </div>
          <p className="text-slate-400">
            Your proprietary source code, function bodies, and architectural tokens are <strong>never used to train, fine-tune, or reinforce any foundation model</strong>. Queries sent to Groq and Google Gemini operate under standard zero-retention commercial API terms where user prompt data is discarded following inference.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-2 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <Lock size={16} className="text-cyan-400" />
            <span>3. Client-Side API Key Storage</span>
          </div>
          <p className="text-slate-400">
            Personal API keys entered via the Settings panel are stored exclusively within your browser's sandboxed <code>localStorage</code>. Keys are never logged or stored in persistent server databases, ensuring you retain total sovereignty over your provider credentials.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-2 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <Database size={16} className="text-amber-400" />
            <span>4. Vector Isolation & On-Demand Purging</span>
          </div>
          <p className="text-slate-400">
            All code vectors stored in Qdrant are segregated using a dedicated <code>repository_name</code> keyword index. If you trigger a <strong>Force Re-index</strong> or delete an indexed repository, all associated vector points and graph nodes are instantly deleted from the collection.
          </p>
        </div>

        {/* Section 5 */}
        <div className="space-y-2 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-2 text-sm font-semibold text-white font-mono">
            <FileText size={16} className="text-emerald-400" />
            <span>5. Security Auditing Disclosures</span>
          </div>
          <p className="text-slate-400">
            The Static Security Scanner performs AST pattern inspection locally. Any flagged credentials or security vulnerabilities remain entirely within your private session and are never broadcast or shared externally.
          </p>
        </div>
      </div>
    </div>
  );
}
