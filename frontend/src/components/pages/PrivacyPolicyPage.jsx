import React from 'react';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: 'Cloned code is deleted after indexing',
    body: <>To index a repository the backend makes a temporary shallow clone, parses it and builds the call graph. When indexing finishes the clone is removed from disk with <code className="font-mono text-ink">shutil.rmtree()</code>. What remains is the index: entities, call edges and their embeddings.</>,
  },
  {
    title: 'Model providers',
    body: <>CodeBase does not train or fine-tune any model on your code. To answer a question, code snippets and your prompt are sent to the configured providers (Groq or Google Gemini for generation, Cohere for embeddings). Those providers handle the data under their own API terms.</>,
  },
  {
    title: 'API keys stay in your browser',
    body: <>Keys entered on the Settings page are saved only in this browser's <code className="font-mono text-ink">localStorage</code>. They are not written to any server database.</>,
  },
  {
    title: 'Vectors are separated by repository',
    body: <>Every vector in Qdrant carries a <code className="font-mono text-ink">repository_name</code> field, and searches are filtered by it. A forced re-index deletes that repository's existing vectors before new ones are written.</>,
  },
  {
    title: 'Security findings',
    body: <>Security audit results are shown only in your session. They are not published or shared anywhere. A pull request is opened only after you approve it.</>,
  },
];

export function PrivacyPolicyPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button type="button" onClick={onNavigateToDashboard} className="btn btn-ghost btn-sm -ml-2 text-ink-kraft">
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back to workstation</span>
      </button>

      <h1 className="mt-4 font-cond font-bold text-4xl sm:text-5xl text-ink">Privacy</h1>
      <p className="mt-3 text-ink-kraft">Last updated September 2026.</p>

      <article className="paper slotted mt-8 p-6 sm:p-10">
        <div className="max-w-[70ch] text-ink-2 leading-relaxed">
          {SECTIONS.map((s, i) => (
            <section key={s.title} className={i ? 'rule-t pt-6 mt-6' : ''}>
              <h2 className="font-cond font-bold text-xl text-ink">{s.title}</h2>
              <p className="mt-2">{s.body}</p>
            </section>
          ))}
        </div>
      </article>
    </div>
  );
}
