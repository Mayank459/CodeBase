import React from 'react';
import { 
  ChevronRight, Home, ArrowLeft, GitBranch, 
  MessageSquareCode, Network, ShieldAlert, Scissors, 
  BookOpen, Workflow, GitCompare, GitCommit, GitPullRequest, 
  Sliders, FileText, AlertTriangle, Info
} from 'lucide-react';
import { TABS } from './TabNavigation';

const TAB_ICON_MAP = {
  chat: MessageSquareCode,
  architecture: Network,
  security: ShieldAlert,
  dead_code: Scissors,
  docs: BookOpen,
  uml: Workflow,
  compare: GitCompare,
  evolution: GitCommit,
  pr: GitPullRequest,
};

export function Breadcrumbs({ 
  activePage = 'dashboard', 
  activeTab = 'chat', 
  onNavigatePage = () => {}, 
  onSelectTab = () => {}, 
  activeRepo = '' 
}) {
  const currentTabObj = TABS.find((t) => t.id === activeTab) || TABS[0];
  const CurrentTabIcon = TAB_ICON_MAP[activeTab] || MessageSquareCode;

  // Build crumbs array: [{ label, icon, onClick, isCurrent }]
  const crumbs = [
    {
      label: 'Home',
      icon: Home,
      onClick: () => onNavigatePage('home'),
      isCurrent: activePage === 'home',
    },
  ];

  if (activePage === 'features' || activePage === 'dashboard') {
    crumbs.push({
      label: 'Features Workstation',
      icon: null,
      onClick: () => onNavigatePage('features'),
      isCurrent: false,
    });
    crumbs.push({
      label: currentTabObj.label,
      icon: CurrentTabIcon,
      onClick: null,
      isCurrent: true,
      tag: currentTabObj.tag,
    });
  } else if (activePage === 'about') {

    crumbs.push({
      label: 'Platform',
      icon: null,
      onClick: () => onNavigatePage('about'),
      isCurrent: false,
    });
    crumbs.push({
      label: 'About & Architecture',
      icon: Info,
      onClick: null,
      isCurrent: true,
    });
  } else if (activePage === 'settings') {
    crumbs.push({
      label: 'Configuration',
      icon: null,
      onClick: () => onNavigatePage('settings'),
      isCurrent: false,
    });
    crumbs.push({
      label: 'System Settings',
      icon: Sliders,
      onClick: null,
      isCurrent: true,
    });
  } else if (activePage === 'privacy') {
    crumbs.push({
      label: 'Trust & Governance',
      icon: null,
      onClick: () => onNavigatePage('privacy'),
      isCurrent: false,
    });
    crumbs.push({
      label: 'Privacy Policy',
      icon: FileText,
      onClick: null,
      isCurrent: true,
    });
  } else if (activePage === '404') {
    crumbs.push({
      label: 'Diagnostics',
      icon: null,
      onClick: null,
      isCurrent: false,
    });
    crumbs.push({
      label: '404 Node Not Found',
      icon: AlertTriangle,
      onClick: null,
      isCurrent: true,
    });
  }

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1 py-1 text-xs font-mono">
      {/* Breadcrumb Path */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap text-slate-400">
        {crumbs.map((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          const Icon = crumb.icon;

          return (
            <React.Fragment key={crumb.label}>
              {idx > 0 && (
                <ChevronRight size={13} className="text-slate-600 flex-shrink-0" />
              )}
              {isLast ? (
                <span className="flex items-center gap-1.5 text-indigo-300 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md">
                  {Icon && <Icon size={13} className="text-cyan-400 flex-shrink-0" />}
                  <span>{crumb.label}</span>
                  {crumb.tag && (
                    <span className="text-[10px] text-indigo-400 bg-indigo-500/20 px-1 py-0.2 rounded font-mono">
                      {crumb.tag}
                    </span>
                  )}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={crumb.onClick || (() => {})}
                  className="flex items-center gap-1 text-slate-400 hover:text-white hover:underline transition-colors cursor-pointer"
                >
                  {Icon && <Icon size={13} className="text-slate-500" />}
                  <span>{crumb.label}</span>
                </button>
              )}
            </React.Fragment>
          );
        })}
      </nav>

      {/* Right side: Active Repo Context or Back to Workstation CTA */}
      <div className="flex items-center gap-2">
        {activePage !== 'dashboard' && (
          <button
            type="button"
            onClick={() => onNavigatePage('dashboard')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.04] border border-white/[0.08] hover:border-indigo-500/40 text-slate-300 hover:text-white transition-all text-xs font-sans group cursor-pointer"
            title="Return to Workstation Dashboard"
          >
            <ArrowLeft size={13} className="text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Workstation</span>
          </button>
        )}

        {activeRepo && activePage === 'dashboard' && (
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.02] border border-white/[0.06] text-slate-400 text-[11px]">
            <GitBranch size={11} className="text-emerald-400" />
            <span className="text-slate-400">Target:</span>
            <span className="text-slate-200 font-semibold truncate max-w-[150px]">{activeRepo}</span>
          </div>
        )}
      </div>
    </div>
  );
}
