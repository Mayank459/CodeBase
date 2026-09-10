import React, { useState } from 'react';
import { FileCode, Copy, Check, Plus, Minus, GitCommit, ChevronDown, ChevronUp } from 'lucide-react';

export function DiffViewer({ diffText = '', filename = 'patch.diff', title = 'Proposed Code Patch' }) {
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const copyDiff = async () => {
    try {
      await navigator.clipboard.writeText(diffText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  const lines = diffText ? diffText.split('\n') : [];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#05070a] overflow-hidden shadow-lg font-mono text-xs my-3">
      {/* Diff Header */}
      <div className="px-4 py-2.5 bg-white/[0.03] border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCode size={14} className="text-indigo-400" />
          <span className="font-semibold text-slate-200">{filename}</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-mono">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={copyDiff}
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white transition-all text-[11px]"
            title="Copy diff"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="text-slate-400 hover:text-white p-1 rounded"
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {/* Diff Lines Body */}
      {!collapsed && (
        <div className="overflow-x-auto max-h-96 p-2 space-y-0.5 leading-relaxed selection:bg-indigo-500/30">
          {lines.length > 0 ? (
            lines.map((line, idx) => {
              const isAddition = line.startsWith('+') && !line.startsWith('+++');
              const isDeletion = line.startsWith('-') && !line.startsWith('---');
              const isMeta = line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index');

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 py-0.5 rounded text-[11px] font-mono ${
                    isAddition
                      ? 'bg-emerald-500/10 text-emerald-300 border-l-2 border-emerald-500'
                      : isDeletion
                      ? 'bg-rose-500/10 text-rose-300 border-l-2 border-rose-500 line-through opacity-85'
                      : isMeta
                      ? 'text-indigo-400 font-semibold bg-indigo-500/5'
                      : 'text-slate-300'
                  }`}
                >
                  <span className="w-8 text-right pr-3 select-none text-slate-600 flex-shrink-0 text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="w-4 select-none flex-shrink-0 text-center">
                    {isAddition ? '+' : isDeletion ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre flex-1 overflow-x-visible">
                    {line.replace(/^[+-]/, '')}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-slate-500 italic">No code diff available.</div>
          )}
        </div>
      )}
    </div>
  );
}
