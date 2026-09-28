import React from 'react';
import { IndexDrawer } from '../IndexDrawer';
import { TabNavigation, TABS } from '../TabNavigation';

import { ChatTab } from '../tabs/ChatTab';
import { ArchitectureTab } from '../tabs/ArchitectureTab';
import { SecurityTab } from '../tabs/SecurityTab';
import { DeadCodeTab } from '../tabs/DeadCodeTab';
import { DocsTab } from '../tabs/DocsTab';
import { UmlTab } from '../tabs/UmlTab';
import { CompareTab } from '../tabs/CompareTab';
import { EvolutionTab } from '../tabs/EvolutionTab';
import { PullRequestTab } from '../tabs/PullRequestTab';

export function FeaturesPage({
  activeRepo,
  indexStats,
  onRepoIndexed,
  isIndexerOpen,
  onToggleIndexer,
  activeTab,
  onSelectTab,
  keepAlive,
}) {
  const tool = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="space-y-8">
      <IndexDrawer
        activeRepo={activeRepo}
        onRepoIndexed={onRepoIndexed}
        indexStats={indexStats}
        isOpen={isIndexerOpen}
        onToggle={onToggleIndexer}
        keepAlive={keepAlive}
      />

      <div>
        <TabNavigation activeTab={activeTab} onSelectTab={onSelectTab} />
        <section role="tabpanel" aria-label={tool.label} className="paper !rounded-tl-none p-4 sm:p-6 lg:p-8 min-h-[60vh]">
          <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 pb-4 mb-6 rule-b">
            <h1 className="font-cond font-bold text-2xl text-ink">{tool.label}</h1>
            <p className="text-sm text-ink-2 max-w-[70ch]">{tool.summary}</p>
          </header>

          {/* Chat stays mounted so a conversation survives tab switches */}
          <div className={activeTab === 'chat' ? 'block' : 'hidden'}>
            <ChatTab activeRepo={activeRepo} />
          </div>
          {activeTab === 'architecture' && <ArchitectureTab activeRepo={activeRepo} />}
          {activeTab === 'security' && <SecurityTab activeRepo={activeRepo} onNavigateToPr={() => onSelectTab('pr')} />}
          {activeTab === 'dead_code' && <DeadCodeTab activeRepo={activeRepo} />}
          {activeTab === 'docs' && <DocsTab activeRepo={activeRepo} />}
          {activeTab === 'uml' && <UmlTab activeRepo={activeRepo} />}
          {activeTab === 'compare' && <CompareTab activeRepo={activeRepo} />}
          {activeTab === 'evolution' && <EvolutionTab activeRepo={activeRepo} />}
          {activeTab === 'pr' && <PullRequestTab activeRepo={activeRepo} />}
        </section>
      </div>
    </div>
  );
}

export default FeaturesPage;
