import React from 'react';
import { ExternalLink } from 'lucide-react';
import { TABS } from './TabNavigation';
import { CrankMark, GitHubIcon } from './Navbar';

const EXTERNAL = [
  { label: 'README', href: 'https://github.com/Mayank459/CodeBase#readme' },
  { label: 'Documentation', href: 'https://github.com/Mayank459/CodeBase/blob/main/DOCUMENTATION.md' },
];

export function Footer({ onNavigatePage = () => {}, onSelectTab = () => {}, activeRepo = '' }) {
  const go = (page, tab) => {
    if (tab) onSelectTab(tab);
    onNavigatePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const link = 'text-ink-kraft hover:text-ink underline-offset-4 hover:underline text-left';

  return (
    <footer className="mt-24 bg-kraft-deep/60 shadow-[inset_0_1px_0_var(--kraft-dark)]" style={{ backgroundImage: 'var(--fibre)' }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr] text-sm">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-ink">
            <CrankMark size={20} className="text-crimson" />
            <span className="font-matrixtype-display text-xl leading-none pt-0.5">CODEBASE</span>
          </div>
          <p className="text-ink-kraft max-w-[36ch]">Parses a repository into symbols and call edges and answers with the files it read.</p>
          {activeRepo && <p className="text-ink-kraft">Indexed: <span className="font-mono text-ink">{activeRepo}</span></p>}
        </div>

        <nav aria-label="Tools">
          <h2 className="strip text-ink mb-3">Tools</h2>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {TABS.map((t) => (
              <li key={t.id}><button type="button" onClick={() => go('features', t.id)} className={link}>{t.label}</button></li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Site">
          <h2 className="strip text-ink mb-3">Site</h2>
          <ul className="space-y-1.5">
            <li><button type="button" onClick={() => go('about')} className={link}>About</button></li>
            <li><button type="button" onClick={() => go('settings')} className={link}>Settings</button></li>
            <li><button type="button" onClick={() => go('privacy')} className={link}>Privacy</button></li>
          </ul>
        </nav>

        <nav aria-label="Source">
          <h2 className="strip text-ink mb-3">Source</h2>
          <ul className="space-y-1.5">
            <li>
              <a href="https://github.com/Mayank459/CodeBase" target="_blank" rel="noreferrer" className={`${link} inline-flex items-center gap-1.5`}>
                <GitHubIcon size={14} /> Mayank459/CodeBase
              </a>
            </li>
            {EXTERNAL.map((e) => (
              <li key={e.href}>
                <a href={e.href} target="_blank" rel="noreferrer" className={`${link} inline-flex items-center gap-1`}>
                  {e.label} <ExternalLink size={11} aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-4 flex flex-wrap justify-between gap-2 text-[12px] text-ink-kraft shadow-[inset_0_1px_0_rgba(42,39,36,.15)]">
        <span>tree-sitter · NetworkX · Cohere · Qdrant · LangGraph · FastAPI · React</span>
        <span>Press <kbd className="font-mono">Ctrl K</kbd> to find anything</span>
      </div>
    </footer>
  );
}
