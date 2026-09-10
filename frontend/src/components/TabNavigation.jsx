import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  MessageSquareCode, Network, ShieldAlert, Scissors, BookOpen, 
  Workflow, GitCompare, GitCommit, GitPullRequest, ChevronLeft, ChevronRight 
} from 'lucide-react';

export const TABS = [
  { id: 'chat', label: 'Intelligence Chat', icon: MessageSquareCode, tag: 'LangGraph' },
  { id: 'architecture', label: 'Architecture', icon: Network, tag: 'AST' },
  { id: 'security', label: 'Security Audit', icon: ShieldAlert, tag: 'CVE' },
  { id: 'dead_code', label: 'Dead Code', icon: Scissors, tag: 'Analysis' },
  { id: 'docs', label: 'Documentation', icon: BookOpen, tag: 'Generator' },
  { id: 'uml', label: 'UML Diagrams', icon: Workflow, tag: 'Mermaid' },
  { id: 'compare', label: 'Multi-Repo', icon: GitCompare, tag: 'Diff' },
  { id: 'evolution', label: 'Evolution', icon: GitCommit, tag: 'History' },
  { id: 'pr', label: 'Pull Request', icon: GitPullRequest, tag: 'HITL' },
];

export function TabNavigation({ activeTab, onSelectTab }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Monitor scroll bounds to dynamically show navigation arrows & fade cues
  const updateScrollBounds = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 3);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 3);
  }, []);

  useEffect(() => {
    updateScrollBounds();
    const el = containerRef.current;
    if (!el) return;

    const handleResize = () => updateScrollBounds();
    window.addEventListener('resize', handleResize);
    el.addEventListener('scroll', updateScrollBounds, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      el.removeEventListener('scroll', updateScrollBounds);
    };
  }, [updateScrollBounds]);

  // Convert vertical mouse wheel into horizontal scroll on the tab bar
  const handleWheel = (e) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.deltaY !== 0 && el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollBy({ left: e.deltaY * 1.5, behavior: 'smooth' });
    }
  };

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
    // Small delay to recheck bounds after smooth scroll animation
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

  return (
    <div className="relative w-full mb-6">
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
          return (
            <button
              key={tab.id}
              ref={(el) => (tabRefs.current[tab.id] = el)}
              onClick={() => onSelectTab(tab.id)}
              className={`nav-tab-item ${isActive ? 'active' : ''}`}
              title={`${tab.label} (${tab.tag})`}
            >
              <Icon size={14} className={isActive ? 'text-indigo-400' : 'text-slate-400 flex-shrink-0'} />
              <span className="truncate">{tab.label}</span>
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
    </div>
  );
}
