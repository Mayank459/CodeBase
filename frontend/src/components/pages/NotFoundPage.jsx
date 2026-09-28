import React from 'react';
import { Home } from 'lucide-react';

export function NotFoundPage({ onNavigateToDashboard }) {
  return (
    <div className="max-w-xl mx-auto my-12 paper slotted p-8 sm:p-12 text-center">
      <h1 className="font-matrixtype-display text-crimson text-[7rem] sm:text-[9rem] leading-none tabular-nums">404</h1>
      <p className="mt-6 text-ink-2 max-w-[40ch] mx-auto">This page does not exist. Head back to the start and pick up from there.</p>
      <button type="button" onClick={onNavigateToDashboard} className="btn btn-primary btn-md mt-8">
        <Home size={14} strokeWidth={2} />
        <span>Back to home</span>
      </button>
    </div>
  );
}
