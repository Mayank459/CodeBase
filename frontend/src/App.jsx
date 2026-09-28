import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { Footer } from './components/Footer';

import { HomePage } from './components/pages/HomePage';
import { FeaturesPage } from './components/pages/FeaturesPage';
import { AboutPage } from './components/pages/AboutPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { NotFoundPage } from './components/pages/NotFoundPage';

import { useKeepAlive } from './hooks/useKeepAlive';

export const toIndexName = (repo) => (repo || '').trim().replace(/\.git$/, '').replace(/\/+$/, '').split('/').pop();

export function App() {
  // The backend names an index after the last URL segment (github.com/psf/requests -> "requests"),
  // so every tool must query that name, never "owner/repo".
  const [activeRepo, setActiveRepo] = useState(() => toIndexName(localStorage.getItem('codebase_active_repo') || 'requests'));
  // Only stats from a real indexing run in this browser; never a hard-coded default.
  const [indexStats, setIndexStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codebase_index_stats') || 'null');
    } catch (_) {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState('chat');
  const [activePage, setActivePage] = useState('home'); // home | features | about | settings | privacy | 404
  const [isIndexerOpen, setIsIndexerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const keepAlive = useKeepAlive();

  // Ctrl+K / Cmd+K command palette
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRepoIndexed = (repoName, stats) => {
    repoName = toIndexName(repoName);
    setActiveRepo(repoName);
    setIndexStats(stats);
    localStorage.setItem('codebase_active_repo', repoName);
    localStorage.setItem('codebase_index_stats', JSON.stringify(stats));
  };

  const openIndexer = () => {
    setIsIndexerOpen(true);
    setActivePage('features');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        activeRepo={activeRepo}
        keepAlive={keepAlive}
        onOpenIndexer={openIndexer}
        activePage={activePage}
        onNavigatePage={setActivePage}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectTab={(tabId) => {
          setActiveTab(tabId);
          setActivePage('features');
        }}
        onNavigatePage={setActivePage}
        activeRepo={activeRepo}
      />

      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-8 py-6 sm:py-10">
        {activePage === 'home' && (
          <HomePage
            onNavigatePage={setActivePage}
            onSelectTab={setActiveTab}
            activeRepo={activeRepo}
            indexStats={indexStats}
            onOpenIndexer={openIndexer}
          />
        )}

        {(activePage === 'features' || activePage === 'dashboard') && (
          <FeaturesPage
            activeRepo={activeRepo}
            indexStats={indexStats}
            onRepoIndexed={handleRepoIndexed}
            isIndexerOpen={isIndexerOpen}
            onToggleIndexer={() => setIsIndexerOpen(!isIndexerOpen)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            keepAlive={keepAlive}
          />
        )}

        {activePage === 'about' && <AboutPage onNavigateToDashboard={() => setActivePage('features')} />}
        {activePage === 'settings' && <SettingsPage onNavigate={setActivePage} />}
        {activePage === 'privacy' && <PrivacyPolicyPage onNavigateToDashboard={() => setActivePage('features')} />}
        {activePage === '404' && <NotFoundPage onNavigateToDashboard={() => setActivePage('home')} />}
      </main>

      <Footer onNavigatePage={setActivePage} onSelectTab={setActiveTab} activeRepo={(indexStats?.entities_indexed ?? indexStats?.entities) > 0 ? activeRepo : ''} />
    </div>
  );
}

export default App;
