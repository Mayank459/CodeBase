import React from 'react';
import { Check } from 'lucide-react';

// The paper procession: stage cards pinned to one ink rail. The card at `pos`
// lifts and turns crimson; neighbours rise with it by distance, like cams on a
// shared crank. `ring` wraps distance around the ends (the home crank loops).
// Used by the home crank, the indexing log, and the chat agent pipeline.
export function Procession({ items, pos = -1, done = [], ring = false, compact = false, dragging = false, className = '' }) {
  const n = items.length;
  const dist = (i) => {
    if (pos < 0) return Infinity;
    const d = Math.abs(i - pos);
    return ring ? Math.min(d % n, n - (d % n)) : d;
  };
  const active = pos < 0 ? -1 : ((Math.round(pos) % n) + n) % n;
  const ease = dragging ? 'none' : 'transform 700ms var(--ease-crank), background-color 300ms, color 300ms, box-shadow 700ms var(--ease-crank)';
  const H = compact ? 112 : 150;
  const rise = compact ? 12 : 28;
  const base = compact ? 30 : 18;

  return (
    <ol className={`relative ${compact ? '' : 'h-[112px] sm:h-[150px]'} ${className}`} style={compact ? { height: H } : undefined} aria-label="Stages">
      <span className="absolute left-0 right-0 bottom-[14px] h-[3px] bg-ink rounded-full" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-full grid items-end gap-1.5 sm:gap-3" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {items.map((s, i) => {
          const lift = Math.max(0, 1 - dist(i));
          const isActive = i === active;
          const isDone = done.includes(s.id);
          const Icon = s.icon;
          return (
            <li key={s.id} className="relative flex flex-col items-center justify-end h-full" aria-current={isActive ? 'step' : undefined}>
              <div
                className={`relative z-10 w-full ${compact ? 'max-w-[108px] py-2 px-1.5' : 'max-w-[74px] aspect-[4/5]'} rounded-[2px] flex flex-col items-center justify-center gap-1 ${isActive ? 'bg-crimson text-pulp' : isDone ? 'bg-pulp text-forest' : 'bg-pulp-2 text-ink-2'}`}
                style={{
                  transform: `translateY(${-rise * lift - base}px) rotate(${(isActive ? -2 : 0) * lift}deg)`,
                  transition: ease,
                  boxShadow: `0 1px 0 rgba(42,39,36,.2), ${4 + 6 * lift}px ${8 + 14 * lift}px ${14 + 10 * lift}px -8px rgba(42,39,36,${0.35 + 0.25 * lift})`,
                }}
              >
                {Icon && <Icon size={compact ? 15 : 20} strokeWidth={2} aria-hidden="true" />}
                <span className={`strip !text-[10px] text-center leading-tight ${compact ? 'block' : 'hidden sm:block'}`}>{s.label}</span>
                {compact && (
                  <span className="text-[10px] leading-none opacity-80">
                    {isActive ? 'running' : isDone ? <Check size={11} aria-label="done" /> : 'waiting'}
                  </span>
                )}
              </div>
              {/* linkage pin from the card down to the rail */}
              <span
                className="absolute bottom-[14px] w-[3px] origin-bottom bg-ink-2 rounded-full"
                style={{ height: base + rise, transform: `scaleY(${(base + rise * lift) / (base + rise)})`, transition: dragging ? 'none' : 'transform 700ms var(--ease-crank)' }}
                aria-hidden="true"
              />
              <span className="absolute bottom-[9px] w-[12px] h-[12px] rounded-full bg-pulp shadow-[inset_0_0_0_2.5px_var(--ink)]" aria-hidden="true" />
            </li>
          );
        })}
      </div>
    </ol>
  );
}
