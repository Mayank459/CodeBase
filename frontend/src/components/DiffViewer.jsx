import React, { useState } from 'react';
import { FileCode, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

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
    <div className="ink-plate overflow-hidden font-mono text-[12.5px] my-3">
      <div className="px-3 py-2 bg-plate-2 flex items-center justify-between gap-3 text-plate-dim">
        <div className="flex items-center gap-2 min-w-0">
          <FileCode size={14} strokeWidth={2} className="flex-shrink-0" aria-hidden="true" />
          <span className="text-plate-ink truncate">{filename}</span>
          <span className="text-[12px] truncate">{title}</span>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 text-[12px]">
          <button
            type="button"
            onClick={copyDiff}
            className="px-2 py-0.5 rounded-sm hover:bg-plate hover:text-plate-ink inline-flex items-center gap-1"
            title="Copy diff"
          >
            {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-sm hover:bg-plate hover:text-plate-ink"
            aria-label={collapsed ? 'Expand diff' : 'Collapse diff'}
            aria-expanded={!collapsed}
          >
            {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="overflow-x-auto max-h-96 py-2 leading-relaxed">
          {lines.length > 0 ? (
            lines.map((line, idx) => {
              const isAddition = line.startsWith('+') && !line.startsWith('+++');
              const isDeletion = line.startsWith('-') && !line.startsWith('---');
              const isMeta = line.startsWith('@@') || line.startsWith('diff') || line.startsWith('index');

              return (
                <div
                  key={idx}
                  className={`flex items-start px-2 ${
                    isAddition
                      ? 'bg-[rgba(169,211,159,0.08)] text-[#a9d39f]'
                      : isDeletion
                      ? 'bg-[rgba(240,138,143,0.08)] text-[#f08a8f]'
                      : isMeta
                      ? 'text-plate-dim'
                      : 'text-plate-ink'
                  }`}
                >
                  <span className="w-9 text-right pr-3 select-none text-plate-dim flex-shrink-0 tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="w-4 select-none flex-shrink-0 text-center">
                    {isAddition ? '+' : isDeletion ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre flex-1">
                    {line.replace(/^[+-]/, '')}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-4 text-center text-plate-dim">No code diff available.</div>
          )}
        </div>
      )}
    </div>
  );
}
