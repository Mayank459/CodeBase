import React, { useState, useEffect, useRef } from 'react';
import { Search, CornerDownLeft, Settings, Info, ShieldCheck, Home, MessageSquareCode } from 'lucide-react';
import { TABS } from './TabNavigation';

export function GlobalSearchModal({ isOpen, onClose, onSelectTab, onNavigatePage, activeRepo }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 30);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  // Escape closes the dialog wherever focus is (the input only gets focus after opening)
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const openTool = (id) => { onSelectTab(id); onClose(); };
  const openPage = (id) => { onNavigatePage(id); onClose(); };

  const items = [
    ...TABS.map((t, i) => ({ id: t.id, group: 'Tool', label: t.label, desc: t.summary, icon: t.icon, hint: `Alt ${i + 1}`, action: () => openTool(t.id) })),
    { id: 'home', group: 'Page', label: 'Home', desc: 'How CodeBase works, with the crank', icon: Home, action: () => openPage('home') },
    { id: 'settings', group: 'Page', label: 'Settings', desc: 'API keys for Groq, Gemini, Cohere; backend endpoint', icon: Settings, action: () => openPage('settings') },
    { id: 'about', group: 'Page', label: 'About', desc: 'Architecture and how the system is built', icon: Info, action: () => openPage('about') },
    { id: 'privacy', group: 'Page', label: 'Privacy', desc: 'What is cloned, stored, and deleted', icon: ShieldCheck, action: () => openPage('privacy') },
  ];

  const q = query.trim().toLowerCase();
  const filtered = q ? items.filter((it) => it.label.toLowerCase().includes(q) || it.desc.toLowerCase().includes(q)) : items;

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((p) => (p + 1) % Math.max(1, filtered.length)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((p) => (p - 1 + filtered.length) % Math.max(1, filtered.length)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[selectedIndex]) filtered[selectedIndex].action(); else if (q) openTool('chat'); }
    else if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-ink/45 motion-modal-backdrop">
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Command palette" className="paper w-full max-w-2xl overflow-hidden motion-modal-card !shadow-lift-3">
        <div className="flex items-center gap-3 px-4 py-3 rule-b">
          <Search size={18} className="text-ink-2 shrink-0" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Find a tool or page"
            aria-label="Search tools and pages"
            className="w-full bg-transparent text-base text-ink placeholder:text-ash outline-none"
          />
          <kbd className="hidden sm:inline font-mono text-[10px] px-1.5 py-px rounded-sm bg-pulp-2 text-ink-2 shadow-[inset_0_0_0_1px_var(--rule)]">Esc</kbd>
        </div>

        <ul className="max-h-[60vh] overflow-y-auto p-2" role="listbox">
          {filtered.map((it, idx) => {
            const Icon = it.icon;
            const sel = idx === selectedIndex;
            return (
              <li
                key={it.id}
                role="option"
                aria-selected={sel}
                onClick={it.action}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`px-3 py-2.5 rounded-sm cursor-pointer flex items-center gap-3 ${sel ? 'bg-ink text-pulp' : 'text-ink'}`}
              >
                <Icon size={16} className={sel ? 'text-pulp' : 'text-ink-2'} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="text-sm font-semibold">{it.label}</span>
                  <span className={`ml-2 strip !text-[10px] ${sel ? 'text-plate-dim' : 'text-ash'}`}>{it.group}</span>
                  <span className={`block text-[13px] truncate ${sel ? 'text-plate-dim' : 'text-ink-2'}`}>{it.desc}</span>
                </span>
                {it.hint && <span className={`font-mono text-[11px] ${sel ? 'text-plate-dim' : 'text-ash'}`}>{it.hint}</span>}
                {sel && <CornerDownLeft size={14} aria-hidden="true" />}
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="p-8 text-center">
              <p className="text-sm text-ink">Nothing called “{query}”.</p>
              <button type="button" onClick={() => openTool('chat')} className="mt-3 btn btn-primary btn-sm">
                <MessageSquareCode size={13} aria-hidden="true" /> Ask chat{activeRepo ? ` about ${activeRepo}` : ''}
              </button>
            </li>
          )}
        </ul>

        <div className="px-4 py-2 rule-t flex gap-4 text-[11px] font-mono text-ash">
          <span>↑↓ move</span><span>Enter open</span><span>Esc close</span>
        </div>
      </div>
    </div>
  );
}
