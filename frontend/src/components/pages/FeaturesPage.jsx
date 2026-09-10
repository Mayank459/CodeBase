import React from 'react';
import { FeatureChipsStrip } from '../FeatureChipsStrip';
import { SidebarControlPanel } from '../SidebarControlPanel';
import { IndexDrawer } from '../IndexDrawer';
import { TabNavigation } from '../TabNavigation';

// Tab Components
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
  onSelectRepo,
  indexStats,
  onRepoIndexed,
  isIndexerOpen,
  onToggleIndexer,
  activeTab,
  onSelectTab,
  keepAlive
}) {
  return (
    <div className="space-y-6">
      
      {/* 1. Sub-Header Feature Action Strip (7 Glowing Chips from Figma) */}
      <FeatureChipsStrip 
        onSelectTab={onSelectTab} 
        onSendQuery={(query) => {
          onSelectTab('chat');
        }}
      />

      {/* 2. Main Two-Column Power Workstation Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column: Repository & Pipeline Control Panel */}
        <SidebarControlPanel
          activeRepo={activeRepo}
          onSelectRepo={onSelectRepo}
          indexStats={indexStats}
          onOpenIndexer={onToggleIndexer}
          keepAlive={keepAlive}
          onSelectTab={onSelectTab}
        />

        {/* Right Column: Workstation Tools (Drawer, Tabs, Active Tool Canvas) */}
        <div className="flex-1 w-full min-w-0 space-y-5">
          {/* Repository Ingestion & SSE Terminal Drawer */}
          <IndexDrawer
            activeRepo={activeRepo}
            onRepoIndexed={onRepoIndexed}
            indexStats={indexStats}
            isOpen={isIndexerOpen}
            onToggle={onToggleIndexer}
          />

          {/* Tab Navigation (9 Developer Tools) */}
          <TabNavigation activeTab={activeTab} onSelectTab={onSelectTab} />

          {/* Active Tab View */}
          <div className="transition-all duration-300">
            {activeTab === 'chat' && <ChatTab activeRepo={activeRepo} />}
            {activeTab === 'architecture' && <ArchitectureTab activeRepo={activeRepo} />}
            {activeTab === 'security' && (
              <SecurityTab
                activeRepo={activeRepo}
                onNavigateToPr={() => onSelectTab('pr')}
              />
            )}
            {activeTab === 'dead_code' && <DeadCodeTab activeRepo={activeRepo} />}
            {activeTab === 'docs' && <DocsTab activeRepo={activeRepo} />}
            {activeTab === 'uml' && <UmlTab activeRepo={activeRepo} />}
            {activeTab === 'compare' && <CompareTab activeRepo={activeRepo} />}
            {activeTab === 'evolution' && <EvolutionTab activeRepo={activeRepo} />}
            {activeTab === 'pr' && <PullRequestTab activeRepo={activeRepo} />}
          </div>
        </div>

      </div>

    </div>
  );
}

export default FeaturesPage;
