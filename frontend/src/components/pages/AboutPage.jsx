import React from 'react';
import { ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';

function GitHubIcon({ size = 15, className = "" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

const PIPELINE = [
  ['Clone', <>A shallow <code className="font-mono text-ink">git clone --depth 1</code>. The working tree is deleted once indexing finishes.</>],
  ['Parse', <>tree-sitter builds a syntax tree for every Python file (tree-sitter-python). Other languages go through a simpler generic extractor.</>],
  ['Extract', <>Classes, functions and methods become entities, each with its file path and line range.</>],
  ['Call graph', <>NetworkX links every call site to its target in a directed graph.</>],
  ['Embed', <>Each entity is embedded with Cohere <code className="font-mono text-ink">embed-english-light-v3.0</code> (384 dimensions).</>],
  ['Store', <>Vectors go to the Qdrant collection <code className="font-mono text-ink">codebase_entities_cohere</code>, filtered by <code className="font-mono text-ink">repository_name</code>.</>],
  ['Answer', <>A LangGraph router hands the request to a specialist agent: chat, architecture, flow, security, dead code, documentation, UML, compare, evolution or PR. Retrieval joins the top vector matches with a two-hop walk of the call graph.</>],
];

const STACK = [
  ['Frontend', 'React 19, Vite, Tailwind 3 on Vercel'],
  ['Backend', 'FastAPI on Render (free tier, cold-starts)'],
  ['Agents', 'LangGraph, 14 agents under app/agents'],
  ['LLMs', 'Groq and Google Gemini (gemini-3.6-flash)'],
  ['Embeddings', 'Cohere embed-english-light-v3.0'],
  ['Vector store', 'Qdrant'],
  ['Graph', 'NetworkX'],
  ['Parsing', 'tree-sitter'],
];

const h2 = 'font-cond font-bold text-xl text-ink';

export function AboutPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button type="button" onClick={onNavigateToDashboard} className="btn btn-ghost btn-sm -ml-2 text-ink-kraft">
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back to workstation</span>
      </button>

      <h1 className="mt-4 font-cond font-bold text-4xl sm:text-5xl text-ink">About CodeBase</h1>
      <p className="mt-3 text-lg text-ink-kraft max-w-[60ch]">
        CodeBase indexes a GitHub repository into symbols, call edges and vectors, then answers questions and runs analyses over that structure.
      </p>

      <article className="paper slotted mt-8 p-6 sm:p-10">
        <div className="max-w-[70ch] space-y-10 text-ink-2 leading-relaxed">
          <section className="space-y-3">
            <h2 className={h2}>Why structure, not chunks</h2>
            <p>
              Plain text retrieval cuts code by character count. That separates a caller from its callee and drops the imports that explain a name. CodeBase keeps the structure: it knows which function is defined where, and which functions call it. Every chat answer cites the files and line ranges it read.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className={h2}>The pipeline</h2>
            <ol className="rule-t">
              {PIPELINE.map(([name, text], i) => (
                <li key={name} className="grid grid-cols-[2.25rem_7rem_1fr] max-sm:grid-cols-[2.25rem_1fr] gap-x-3 gap-y-1 py-3 rule-b">
                  <span className="font-mono tabular-nums text-ash text-sm pt-0.5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="font-cond font-bold text-ink">{name}</span>
                  <p className="max-sm:col-start-2 text-[0.95rem]">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className={h2}>The approval gate</h2>
            <p>
              Remediation patches never leave on their own. The PR agent drafts the change, then the graph pauses at an approval node (a LangGraph interrupt, with state held under a thread id). Nothing is published to GitHub until a person approves it in the Pull Request tool. Guardrails also check input and output for prompt injection and leaked secrets.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className={h2}>Stack</h2>
            <dl className="rule-t">
              {STACK.map(([k, v]) => (
                <div key={k} className="grid grid-cols-[8rem_1fr] gap-3 py-2 rule-b">
                  <dt className="strip text-ash pt-1">{k}</dt>
                  <dd className="text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rule-t pt-6 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onNavigateToDashboard} className="btn btn-primary btn-md">
              <span>Open the workstation</span>
              <ArrowRight size={14} strokeWidth={2} />
            </button>
            <a href="https://github.com/Mayank459/CodeBase" target="_blank" rel="noreferrer" className="btn btn-secondary btn-md">
              <GitHubIcon size={14} />
              <span>Source on GitHub</span>
              <ExternalLink size={14} strokeWidth={2} className="text-ash" />
            </a>
            <span className="text-sm text-ash">Built by Mayank.</span>
          </section>
        </div>
      </article>
    </div>
  );
}
