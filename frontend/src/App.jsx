import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { GlobalSearchModal } from './components/GlobalSearchModal';

// Page Components
import { HomePage } from './components/pages/HomePage';
import { FeaturesPage } from './components/pages/FeaturesPage';
import { AboutPage } from './components/pages/AboutPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { PrivacyPolicyPage } from './components/pages/PrivacyPolicyPage';
import { NotFoundPage } from './components/pages/NotFoundPage';

// Navigation & Layout Components
import { Breadcrumbs } from './components/Breadcrumbs';
import { Footer } from './components/Footer';

import { useKeepAlive } from './hooks/useKeepAlive';
import { useScrollReveal } from './hooks/useScrollReveal';

export function App() {
  const [activeRepo, setActiveRepo] = useState(() => {
    return localStorage.getItem('codebase_active_repo') || 'psf/requests';
  });
  const [indexStats, setIndexStats] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('codebase_index_stats') || '{"entities_indexed": 661, "edges_count": 916}');
    } catch (_) {
      return { entities_indexed: 661, edges_count: 916 };
    }
  });
  const [activeTab, setActiveTab] = useState('chat');
  const [activePage, setActivePage] = useState('home'); // 'home' (Dedicated Home) | 'features' (Dedicated Workstation) | 'about' | 'settings' | 'privacy' | '404'
  const [isIndexerOpen, setIsIndexerOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const keepAlive = useKeepAlive();
  useScrollReveal();

  // Global Ctrl+K / Cmd+K Command Palette Listener
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
    setActiveRepo(repoName);
    setIndexStats(stats);
    localStorage.setItem('codebase_active_repo', repoName);
    localStorage.setItem('codebase_index_stats', JSON.stringify(stats));
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navbar with Page Switcher, Capabilities Dropdown & Search */}
      <Navbar
        activeRepo={activeRepo}
        keepAlive={keepAlive}
        onOpenIndexer={() => {
          setIsIndexerOpen(true);
          setActivePage('features');
        }}
        activePage={activePage}
        activeTab={activeTab}
        onNavigatePage={setActivePage}
        onSelectTab={setActiveTab}
        onOpenSearch={() => setIsSearchOpen(true)}
      />

      {/* Global Command Palette / Search Modal (Ctrl+K) */}
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


      {/* Main Content Area: Spaced Out & Takes All Available Width */}
      <main className="flex-1 w-full max-w-[1920px] mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8 space-y-8">
        {/* Dynamic Contextual Breadcrumbs - Only on Sub-pages */}
        {activePage !== 'home' && (
          <Breadcrumbs 
            activePage={activePage}
            activeTab={activeTab}
            onNavigatePage={setActivePage}
            onSelectTab={setActiveTab}
            activeRepo={activeRepo}
          />
        )}

        {/* VIEW 1: Dashboard (Main Developer Workstation) */}
        {/* VIEW 1: Dedicated Home Page */}
        {activePage === 'home' && (
          <HomePage
            onNavigatePage={setActivePage}
            onSelectTab={setActiveTab}
            activeRepo={activeRepo}
            onOpenIndexer={() => {
              setIsIndexerOpen(true);
              setActivePage('features');
            }}
            onOpenSearch={() => setIsSearchOpen(true)}
          />
        )}

        {/* VIEW 2: Dedicated Features Workstation Page (All 9 Developer Tools) */}
        {(activePage === 'features' || activePage === 'dashboard') && (
          <FeaturesPage
            activeRepo={activeRepo}
            onSelectRepo={(repo) => {
              setActiveRepo(repo);
              localStorage.setItem('codebase_active_repo', repo);
            }}
            indexStats={indexStats}
            onRepoIndexed={handleRepoIndexed}
            isIndexerOpen={isIndexerOpen}
            onToggleIndexer={() => setIsIndexerOpen(!isIndexerOpen)}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            keepAlive={keepAlive}
          />
        )}

        {/* VIEW 3: About & Architecture Page */}
        {activePage === 'about' && (
          <AboutPage onNavigateToDashboard={() => setActivePage('features')} />
        )}

        {/* VIEW 4: Settings Page */}
        {activePage === 'settings' && (
          <SettingsPage onNavigate={setActivePage} />
        )}

        {/* VIEW 5: Privacy Policy Page */}
        {activePage === 'privacy' && (
          <PrivacyPolicyPage onNavigateToDashboard={() => setActivePage('features')} />
        )}

        {/* VIEW 6: 404 Not Found Page */}
        {activePage === '404' && (
          <NotFoundPage onNavigateToDashboard={() => setActivePage('home')} />
        )}

      </main>

      {/* Multi-Column Senior Dev Engineering Footer */}
      <Footer 
        activePage={activePage}
        onNavigatePage={setActivePage}
        onSelectTab={setActiveTab}
        activeRepo={activeRepo}
      />
    </div>
  );
}

export default App;
