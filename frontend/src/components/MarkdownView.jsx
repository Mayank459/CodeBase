import React, { useState } from 'react';
import { Copy, Check, Terminal, ExternalLink } from 'lucide-react';

export function MarkdownView({ content }) {
  if (!content) return null;

  // Split markdown into code blocks vs regular paragraphs/headers/tables
  const parts = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        text: content.slice(lastIndex, match.index),
      });
    }
    parts.push({
      type: 'code',
      lang: match[1] || 'text',
      code: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'markdown',
      text: content.slice(lastIndex),
    });
  }

  return (
    <div className="markdown-body chat-prose space-y-4 text-slate-100 font-tiempos text-[16px] sm:text-[17px] leading-[1.8] font-normal">
      {parts.map((part, idx) => {
        if (part.type === 'code') {
          return <CodeSnippet key={idx} lang={part.lang} code={part.code} />;
        }
        return <SimpleMarkdownRenderer key={idx} text={part.text} />;
      })}
    </div>
  );
}

function CodeSnippet({ lang, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  return (
    <div className="code-block-wrapper my-3 rounded-lg overflow-hidden border border-white/10 bg-[#060910]">
      <div className="code-header flex items-center justify-between px-3 py-1.5 bg-white/[0.04] border-b border-white/[0.06] text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal size={13} className="text-indigo-400" />
          <span>{lang || 'code'}</span>
        </div>
        <button
          onClick={handleCopy}
          className="btn btn-ghost btn-sm py-0.5 px-2 text-xs text-slate-400 hover:text-white flex items-center gap-1.5"
          title="Copy code"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="code-content p-4 text-xs font-mono text-slate-200 overflow-x-auto whitespace-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function SimpleMarkdownRenderer({ text }) {
  // Parse lines for headers, lists, blockquotes, tables, bold, inline code
  const lines = text.split('\n');
  const renderedElements = [];
  let listItems = [];
  let tableRows = [];

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${renderedElements.length}`} className="list-disc pl-6 space-y-2 my-2.5 text-slate-200 text-[16px] sm:text-[17px] leading-[1.8] font-tiempos font-normal">
          {listItems.map((item, i) => (
            <li key={i}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const header = tableRows[0];
      const body = tableRows.slice(1);
      renderedElements.push(
        <div key={`table-${renderedElements.length}`} className="overflow-x-auto my-3 border border-white/10 rounded-lg">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white/[0.05] border-b border-white/10 text-slate-200">
                {header.map((col, idx) => (
                  <th key={idx} className="p-3 font-semibold font-mono text-xs">
                    {formatInline(col.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-slate-200 text-sm">
                      {formatInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Table line: | col 1 | col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList();
      const cells = trimmed.slice(1, -1).split('|');
      // Check if it's separator row like |---|---|
      const isSep = cells.every(c => /^[\s-:]+$/.test(c));
      if (!isSep) {
        tableRows.push(cells);
      }
      return;
    } else {
      flushTable();
    }

    // Unordered List item
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2));
      return;
    } else {
      flushList();
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-lg font-bold text-slate-100 mt-5 mb-2 flex items-center gap-2 font-tiempos">
          {formatInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      renderedElements.push(
        <h3 key={idx} className="text-xl font-bold text-white mt-6 mb-2.5 pb-1 border-b border-white/10 font-tiempos">
          {formatInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      renderedElements.push(
        <h2 key={idx} className="text-2xl font-extrabold text-white mt-7 mb-3 font-tiempos">
          {formatInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Callout / Blockquote
    if (trimmed.startsWith('> ')) {
      const calloutText = trimmed.slice(2);
      const isAlert = calloutText.startsWith('[!WARNING]') || calloutText.startsWith('[!IMPORTANT]');
      const isTip = calloutText.startsWith('[!TIP]') || calloutText.startsWith('[!NOTE]');
      renderedElements.push(
        <div
          key={idx}
          className={`p-3.5 my-2.5 border-l-2 rounded-r-lg text-sm ${
            isAlert
              ? 'border-amber-500 bg-amber-500/10 text-amber-200'
              : isTip
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-200'
              : 'border-slate-600 bg-white/[0.03] text-slate-200'
          }`}
        >
          {formatInline(calloutText.replace(/\[!(WARNING|IMPORTANT|TIP|NOTE)\]/, '').trim())}
        </div>
      );
      return;
    }

    // Blank line
    if (!trimmed) {
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Standard paragraph with Tiempos font and bigger size
    renderedElements.push(
      <p key={idx} className="text-slate-200 leading-[1.8] text-[16px] sm:text-[17px] font-normal font-tiempos">
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();
  flushTable();

  return <>{renderedElements}</>;
}

function formatInline(str) {
  if (!str) return '';
  // Convert `code` to <code class="font-mono">
  // Convert **bold** to <strong>
  const tokens = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  let m;

  while ((m = regex.exec(str)) !== null) {
    if (m.index > last) {
      tokens.push(str.slice(last, m.index));
    }
    const token = m[0];
    if (token.startsWith('`')) {
      tokens.push(
        <code key={m.index} className="px-1.5 py-0.5 rounded bg-white/[0.08] text-indigo-300 font-mono text-[13px] border border-white/[0.08]">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**')) {
      tokens.push(
        <strong key={m.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    }
    last = m.index + token.length;
  }
  if (last < str.length) {
    tokens.push(str.slice(last));
  }
  return tokens;
}
