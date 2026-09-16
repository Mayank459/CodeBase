import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  MessageSquareCode, Network, ShieldAlert, Scissors, BookOpen, 
  Workflow, GitCompare, GitCommit, GitPullRequest, ChevronLeft, ChevronRight,
  Sparkles, ArrowRight, CheckCircle2, Lightbulb, Zap, Terminal
} from 'lucide-react';

export const TABS = [
  { 
    id: 'chat', 
    label: 'Intelligence Chat', 
    icon: MessageSquareCode, 
    tag: 'LangGraph',
    badge: 'Multi-Agent RAG',
    color: '#6366f1',
    glowBg: 'rgba(99, 102, 241, 0.15)',
    borderColor: 'rgba(99, 102, 241, 0.35)',
    badgeBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    title: 'Repository Intelligence Chat',
    tagline: 'Deep conversational codebase reasoning powered by LangGraph multi-agent flow & Qdrant hybrid vector search.',
    features: [
      'AST-grounded symbol & syntax tree reasoning',
      'Multi-agent reflection for complex bug finding & explanations',
      'Clickable file and line-range citations directly to source code'
    ],
    tip: 'Ask about end-to-end user flows, call paths, or specific function implementations.',
    shortcut: 'Alt + 1'
  },
  { 
    id: 'architecture', 
    label: 'Architecture', 
    icon: Network, 
    tag: 'AST',
    badge: 'NetworkX Engine',
    color: '#a855f7',
    glowBg: 'rgba(168, 85, 247, 0.15)',
    borderColor: 'rgba(168, 85, 247, 0.35)',
    badgeBg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    title: 'Topological Architecture & Call Graph',
    tagline: 'Interactive 2D graph visualizer mapping functions, classes, and cross-module caller/callee dependencies.',
    features: [
      'Directed topological dependency graph with force-directed physics',
      'Blast-radius analysis before refactoring critical shared modules',
      'Cycle detection, fan-in/fan-out metrics, and module coupling'
    ],
    tip: 'Click any node in the graph to isolate its upstream callers and downstream dependencies.',
    shortcut: 'Alt + 2'
  },
  { 
    id: 'security', 
    label: 'Security Audit', 
    icon: ShieldAlert, 
    tag: 'CVE',
    badge: 'CVSS 3.1 & Secrets',
    color: '#f43f5e',
    glowBg: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    badgeBg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
    title: 'Automated Security & CVE Auditor',
    tagline: 'Static AST scanner detecting OWASP Top 10 vulnerabilities, credential leaks, and unpatched CVEs.',
    features: [
      'Static taint analysis for SQLi, XSS, and command injection flaws',
      'High-entropy secret detection for committed API keys and tokens',
      'CVSS risk scoring with 1-click autonomous HITL patch generation'
    ],
    tip: 'Filter by "Critical" severity to prioritize high-risk vulnerability mitigations first.',
    shortcut: 'Alt + 3'
  },
  { 
    id: 'dead_code', 
    label: 'Dead Code', 
    icon: Scissors, 
    tag: 'Analysis',
    badge: 'Symbol Resolver',
    color: '#10b981',
    glowBg: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    title: 'Dead Code & Symbol Hygiene',
    tagline: 'Deterministic AST analysis detecting orphaned functions, unreferenced methods, and unused imports.',
    features: [
      'Full codebase AST traversal identifying zero-reference symbols',
      'Safe surgical deprecation recommendations with confidence ratings',
      'Prunes unused legacy utilities and reduces bundle footprint'
    ],
    tip: 'Run this prior to major releases to clean up unreferenced helpers and dead classes.',
    shortcut: 'Alt + 4'
  },
  { 
    id: 'docs', 
    label: 'Documentation', 
    icon: BookOpen, 
    tag: 'Generator',
    badge: 'Google / NumPy AST',
    color: '#3b82f6',
    glowBg: 'rgba(59, 130, 246, 0.15)',
    borderColor: 'rgba(59, 130, 246, 0.35)',
    badgeBg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    title: 'AST Docstring & API Generator',
    tagline: 'Extracts syntax tree signatures to generate standardized Google, NumPy, and Sphinx docstrings.',
    features: [
      'Automatic inference of parameter types, return contracts, and raises',
      'Generates comprehensive module summaries and architectural notes',
      'One-click clipboard copy or direct code patch insertion'
    ],
    tip: 'Select any function to generate standardized, publication-ready docstrings in seconds.',
    shortcut: 'Alt + 5'
  },
  { 
    id: 'uml', 
    label: 'UML Diagrams', 
    icon: Workflow, 
    tag: 'Mermaid',
    badge: 'Class & Sequence',
    color: '#ec4899',
    glowBg: 'rgba(236, 72, 153, 0.15)',
    borderColor: 'rgba(236, 72, 153, 0.35)',
    badgeBg: 'bg-pink-500/10 text-pink-400 border-pink-500/30',
    title: 'UML Class & Sequence Modeler',
    tagline: 'Synthesizes interactive Mermaid class hierarchies, inheritance trees, and runtime execution workflows.',
    features: [
      'Class inheritance diagrams with method signatures & typed fields',
      'Cross-component sequence workflows mapping asynchronous calls',
      'Interactive pan/zoom canvas with 1-click SVG export capability'
    ],
    tip: 'Export generated SVG diagrams to embed directly in GitHub pull request descriptions.',
    shortcut: 'Alt + 6'
  },
  { 
    id: 'compare', 
    label: 'Multi-Repo', 
    icon: GitCompare, 
    tag: 'Diff',
    badge: 'Cross-Repo AST',
    color: '#8b5cf6',
    glowBg: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    badgeBg: 'bg-violet-500/10 text-violet-400 border-violet-500/30',
    title: 'Multi-Repository Semantic Diff',
    tagline: 'Side-by-side comparative analysis across repository pairs for schema and API contract drift.',
    features: [
      'AST-level structural diff beyond standard text-only git diffs',
      'Detect breaking API contract changes between microservices',
      'Comparative dependency and tech-stack version audit matrices'
    ],
    tip: 'Ideal for comparing upstream open-source forks against internal repositories.',
    shortcut: 'Alt + 7'
  },
  { 
    id: 'evolution', 
    label: 'Evolution', 
    icon: GitCommit, 
    tag: 'History',
    badge: 'Churn Analytics',
    color: '#f59e0b',
    glowBg: 'rgba(245, 158, 11, 0.15)',
    borderColor: 'rgba(245, 158, 11, 0.35)',
    badgeBg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    title: 'Commit History & Evolution Tracker',
    tagline: 'Chronological Git commit visualizer mapping file churn, structural complexity, and author velocity.',
    features: [
      'Code churn heatmap highlighting regression-prone hotspots',
      'Architectural complexity drift and commit frequency metrics',
      'Milestone tag comparisons with structural delta summaries'
    ],
    tip: 'Inspect high-churn files to prioritize additional test suites and architectural refactoring.',
    shortcut: 'Alt + 8'
  },
  { 
    id: 'pr', 
    label: 'Pull Request', 
    icon: GitPullRequest, 
    tag: 'HITL',
    badge: 'Autonomous PR',
    color: '#10b981',
    glowBg: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    title: 'Autonomous Remediation & HITL PR',
    tagline: 'Transforms audit findings into verified Git patch branches with human-in-the-loop review gates.',
    features: [
      'Autonomous patch synthesis fixing security & dead-code issues',
      'Interactive side-by-side diff reviewer before code mutations',
      'Direct GitHub branch creation and automated PR publishing'
    ],
    tip: 'Review the generated patch diff and click to confirm and publish your PR directly.',
    shortcut: 'Alt + 9'
  },
];

export function TabNavigation({ activeTab, onSelectTab }) {
  const wrapperRef = useRef(null);
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Feature Guide Hover State
  const [hoveredTabId, setHoveredTabId] = useState(null);
  const [guidePos, setGuidePos] = useState(null);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Monitor scroll bounds to dynamically show navigation arrows & fade cues
  const updateScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 3);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 3);
  }, []);

  // Recalculate popover coordinates relative to wrapperRef
  const computeGuidePosition = useCallback((tab) => {
    const tabEl = tabRefs.current[tab.id];
    const wrapperEl = wrapperRef.current;
    if (!tabEl || !wrapperEl) return null;

    const tabRect = tabEl.getBoundingClientRect();
    const wrapperRect = wrapperEl.getBoundingClientRect();

    const tabCenter = (tabRect.left + tabRect.right) / 2 - wrapperRect.left;
    const cardWidth = 450;

    let cardLeft = tabCenter - cardWidth / 2;
    const minLeft = 8;
    const maxLeft = Math.max(minLeft, wrapperRect.width - cardWidth - 8);
    cardLeft = Math.max(minLeft, Math.min(cardLeft, maxLeft));

    // Pointer arrow offset relative to the card's left edge
    const arrowLeft = Math.max(24, Math.min(tabCenter - cardLeft, cardWidth - 24));

    return {
      tab,
      left: cardLeft,
      arrowLeft,
      top: tabEl.offsetTop + tabEl.offsetHeight + 10,
    };
  }, []);

  // Reposition popover if scroll or resize happens
  useEffect(() => {
    if (!hoveredTabId) return;
    const currentTab = TABS.find((t) => t.id === hoveredTabId);
    if (!currentTab) return;

    const pos = computeGuidePosition(currentTab);
    if (pos) setGuidePos(pos);
  }, [hoveredTabId, canScrollLeft, canScrollRight, computeGuidePosition]);

  useEffect(() => {
    updateScrollBounds();
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => {
      updateScrollBounds();
      if (hoveredTabId) {
        const currentTab = TABS.find((t) => t.id === hoveredTabId);
        if (currentTab) setGuidePos(computeGuidePosition(currentTab));
      }
    };

    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', updateScrollBounds, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', updateScrollBounds);
    };
  }, [updateScrollBounds, hoveredTabId, computeGuidePosition]);

  // Convert vertical mouse wheel into horizontal scroll on the tab bar
  const handleWheel = (e) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
    }
  };

  // Close guide on Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setHoveredTabId(null);
        setGuidePos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Ensure newly selected tab is always fully visible in viewport
  useEffect(() => {
    const activeEl = tabRefs.current[activeTab];
    const container = containerRef.current;
    if (activeEl && container) {
      const elLeft = activeEl.offsetLeft;
      const elRight = elLeft + activeEl.offsetWidth;
      const scrollLeft = container.scrollLeft;
      const containerWidth = container.clientWidth;
      if (elLeft < scrollLeft) {
        container.scrollTo({ left: Math.max(0, elLeft - 16), behavior: 'smooth' });
      } else if (elRight > scrollLeft + containerWidth) {
        container.scrollTo({ left: elRight - containerWidth + 16, behavior: 'smooth' });
      }
    }
    const timer = setTimeout(updateScrollBounds, 300);
    return () => clearTimeout(timer);
  }, [activeTab, updateScrollBounds]);

  const scrollByAmount = (direction) => {
    const el = containerRef.current;
    if (!el) return;
    const distance = 220;
    el.scrollBy({
      left: direction === 'left' ? -distance : distance,
      behavior: 'smooth'
    });
  };

  // Hover handlers with debounce and grace period
  const handleTabMouseEnter = (tab) => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    const triggerShow = () => {
      const pos = computeGuidePosition(tab);
      if (pos) {
        setGuidePos(pos);
        setHoveredTabId(tab.id);
      }
    };

    // If guide already showing, switch immediately; otherwise apply subtle 120ms debounce
    if (hoveredTabId) {
      triggerShow();
    } else {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(triggerShow, 120);
    }
  };

  const handleTabMouseLeave = () => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
    // Grace period so user can cross into the guide dropdown window
    hideTimerRef.current = setTimeout(() => {
      setHoveredTabId(null);
      setGuidePos(null);
    }, 180);
  };

  const handleGuideMouseEnter = () => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const handleGuideMouseLeave = () => {
    hideTimerRef.current = setTimeout(() => {
      setHoveredTabId(null);
      setGuidePos(null);
    }, 150);
  };

  const handleSelect = (tabId) => {
    onSelectTab(tabId);
    // Smoothly close guide window upon tab selection
    if (showTimerRef.current) clearTimeout(showTimerRef.current);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setHoveredTabId(null);
    setGuidePos(null);
  };

  const currentHoveredTab = hoveredTabId ? TABS.find((t) => t.id === hoveredTabId) : null;

  return (
    <div ref={wrapperRef} className="relative w-full mb-6">
      {/* Left Chevron Indicator */}
      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollByAmount('left')}
          className="absolute -left-2.5 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-[#0c1220] border border-white/20 text-slate-200 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-400/50 shadow-lg shadow-black/50 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
          title="Scroll left"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft size={15} />
        </button>
      )}

      {/* Left Gradient Mask */}
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#07090e] to-transparent z-10 rounded-l-xl" />
      )}

      {/* Nav Tab Container */}
      <div
        ref={containerRef}
        onWheel={handleWheel}
        className="nav-tab-container"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const isHovered = hoveredTabId === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              onClick={() => handleSelect(tab.id)}
              onMouseEnter={() => handleTabMouseEnter(tab)}
              onMouseLeave={handleTabMouseLeave}
              className={`nav-tab-item group relative ${isActive ? 'active' : ''}`}
              title={`${tab.label} — ${tab.badge || tab.tag}`}
            >
              {/* Active / Hover Glow Accent */}
              {isHovered && !isActive && (
                <div 
                  className="absolute inset-0 rounded-md pointer-events-none transition-opacity duration-300 opacity-20"
                  style={{ backgroundColor: tab.color }}
                />
              )}

              <Icon 
                size={14} 
                className={`transition-all duration-200 flex-shrink-0 ${
                  isActive 
                    ? 'text-indigo-400 scale-105' 
                    : isHovered 
                    ? 'scale-110' 
                    : 'text-slate-400'
                }`}
                style={isHovered && !isActive ? { color: tab.color } : {}}
              />
              <span className="truncate">{tab.label}</span>

              {/* Mini tag indicator */}
              <span 
                className={`text-[9px] px-1 py-0.2 rounded border font-mono tracking-tighter transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white/90 border-white/20'
                    : isHovered
                    ? tab.badgeBg
                    : 'bg-white/[0.03] text-slate-500 border-white/5 group-hover:border-white/10'
                }`}
              >
                {tab.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Right Gradient Mask */}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#07090e] to-transparent z-10 rounded-r-xl" />
      )}

      {/* Right Chevron Indicator */}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollByAmount('right')}
          className="absolute -right-2.5 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-[#0c1220] border border-white/20 text-slate-200 hover:text-white hover:bg-indigo-600/30 hover:border-indigo-400/50 shadow-lg shadow-black/50 flex items-center justify-center transition-all cursor-pointer backdrop-blur-md"
          title="Scroll right"
          aria-label="Scroll tabs right"
        >
          <ChevronRight size={15} />
        </button>
      )}

      {/* Interactive Feature Guide Dropdown Window */}
      {guidePos && currentHoveredTab && (
        <div
          onMouseEnter={handleGuideMouseEnter}
          onMouseLeave={handleGuideMouseLeave}
          className="absolute z-50 w-[450px] max-w-[calc(100vw-32px)] tab-guide-card rounded-2xl p-5 animate-tab-guide-in"
          style={{
            left: `${guidePos.left}px`,
            top: `${guidePos.top}px`,
            '--tab-glow': currentHoveredTab.color,
          }}
        >
          {/* Caret Pointer pointing to the hovered tab */}
          <div
            className="absolute -top-2 w-4 h-4 rotate-45 tab-guide-card border-b-0 border-r-0 pointer-events-none"
            style={{ 
              left: `${guidePos.arrowLeft}px`,
              borderColor: 'rgba(255, 255, 255, 0.2)'
            }}
          />

          {/* Ambient Glow Gradient inside card */}
          <div 
            className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 w-64 h-24 rounded-full blur-3xl opacity-25"
            style={{ backgroundColor: currentHoveredTab.color }}
          />

          {/* Header Row */}
          <div className="relative flex items-start gap-3.5 mb-3">
            <div 
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg transition-transform duration-300"
              style={{ 
                background: currentHoveredTab.glowBg, 
                border: `1px solid ${currentHoveredTab.borderColor}` 
              }}
            >
              {React.createElement(currentHoveredTab.icon, {
                size: 24,
                style: { color: currentHoveredTab.color }
              })}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                <h4 className="text-base font-bold text-white font-matrixtype tracking-wide">
                  {currentHoveredTab.label}
                </h4>
                <span className={`text-xs uppercase font-semibold px-2 py-0.5 rounded border font-mono tracking-wider ${currentHoveredTab.badgeBg}`}>
                  {currentHoveredTab.badge}
                </span>
              </div>
              <p className="text-xs sm:text-[13px] text-slate-300 font-sans leading-relaxed">
                {currentHoveredTab.tagline}
              </p>
            </div>
          </div>

          {/* Key Capabilities Section */}
          <div className="relative mt-3.5 pt-3 border-t border-white/10">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2 font-matrixtype">
              <Sparkles size={13} style={{ color: currentHoveredTab.color }} />
              <span>Core Capabilities</span>
            </div>
            
            <div className="space-y-2">
              {currentHoveredTab.features.map((feat, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-200 leading-snug">
                  <div 
                    className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 shadow-sm"
                    style={{ backgroundColor: currentHoveredTab.color }}
                  />
                  <span>{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pro Tip Box */}
          <div className="relative mt-3.5 p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5 text-xs sm:text-[13px] text-slate-300 leading-relaxed shadow-inner">
            <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5 animate-pulse" />
            <div>
              <span className="font-semibold text-slate-100">Pro Tip: </span>
              <span className="text-slate-300">{currentHoveredTab.tip}</span>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="relative mt-3.5 pt-3 border-t border-white/10 flex items-center justify-between text-xs sm:text-[13px]">
            {activeTab === currentHoveredTab.id ? (
              <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs sm:text-[13px]">
                <CheckCircle2 size={15} />
                <span>Currently Active View</span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <Terminal size={13} className="text-slate-500" />
                <span>Quick switch tool</span>
              </span>
            )}

            {activeTab !== currentHoveredTab.id ? (
              <button
                type="button"
                onClick={() => handleSelect(currentHoveredTab.id)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white px-3 py-1.5 rounded-lg transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                style={{
                  background: `linear-gradient(135deg, ${currentHoveredTab.color}cc, ${currentHoveredTab.color}88)`,
                  border: `1px solid ${currentHoveredTab.color}`,
                }}
              >
                <span>Launch Feature</span>
                <ArrowRight size={13} />
              </button>
            ) : (
              <span className="text-xs text-slate-400 font-mono">
                {currentHoveredTab.shortcut}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
