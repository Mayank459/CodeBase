import React, { useState, useEffect } from 'react';
import { Save, RotateCcw, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { getApiBase, setApiBase } from '../../api';

export function SettingsPage({ onNavigate }) {
  // API Keys
  const [groqKey, setGroqKey] = useState(() => localStorage.getItem('codebase_groq_key') || '');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('codebase_gemini_key') || '');
  const [cohereKey, setCohereKey] = useState(() => localStorage.getItem('codebase_cohere_key') || '');

  // Visibility toggles
  const [showGroq, setShowGroq] = useState(false);
  const [showGemini, setShowGemini] = useState(false);
  const [showCohere, setShowCohere] = useState(false);

  // Model & Generation Config
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('codebase_model') || 'qwen/qwen3.8-27b');
  const [graphDepth, setGraphDepth] = useState(() => Number(localStorage.getItem('codebase_graph_depth')) || 2);
  const [topK, setTopK] = useState(() => Number(localStorage.getItem('codebase_top_k')) || 5);
  const [temperature, setTemperature] = useState(() => Number(localStorage.getItem('codebase_temperature')) || 0.7);

  // Connection Base
  const [apiEndpoint, setApiEndpoint] = useState(() => getApiBase());

  // Save feedback state
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveAll = () => {
    localStorage.setItem('codebase_groq_key', groqKey.trim());
    localStorage.setItem('codebase_gemini_key', geminiKey.trim());
    localStorage.setItem('codebase_cohere_key', cohereKey.trim());

    localStorage.setItem('codebase_model', selectedModel);
    localStorage.setItem('codebase_graph_depth', String(graphDepth));
    localStorage.setItem('codebase_top_k', String(topK));
    localStorage.setItem('codebase_temperature', String(temperature));

    setApiBase(apiEndpoint);

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset all parameters to system defaults?')) {
      setSelectedModel('qwen/qwen3.8-27b');
      setGraphDepth(2);
      setTopK(5);
      setTemperature(0.7);
      setApiEndpoint('/api-proxy');
      setApiBase('/api-proxy');
    }
  };

  const keyFields = [
    { id: 'groq', label: 'Groq API key', hint: 'Generation', value: groqKey, set: setGroqKey, show: showGroq, toggle: setShowGroq, placeholder: 'gsk_...' },
    { id: 'gemini', label: 'Google Gemini API key', hint: 'Generation', value: geminiKey, set: setGeminiKey, show: showGemini, toggle: setShowGemini, placeholder: 'AIzaSy...' },
    { id: 'cohere', label: 'Cohere API key', hint: 'Embeddings, 384-d', value: cohereKey, set: setCohereKey, show: showCohere, toggle: setShowCohere, placeholder: 'co_...' },
  ];

  const endpoints = [
    { url: '/api-proxy', name: 'Proxy (recommended)', desc: 'Forwards to the Render backend without browser CORS limits.' },
    { url: 'https://codebase-ys83.onrender.com', name: 'Render backend, direct', desc: 'The deployed FastAPI service. Cold-starts on the free tier.' },
    { url: 'http://localhost:8000', name: 'Local FastAPI', desc: 'A Uvicorn server running on this machine.' },
  ];

  const group = 'strip text-ash pb-2 rule-b w-full';
  const fieldLabel = 'text-sm font-semibold text-ink';
  const sliderRow = (id, label, value, input, scale) => (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={fieldLabel}>{label}</label>
        <span className="font-mono tabular-nums text-sm text-ink">{value}</span>
      </div>
      {input}
      <div className="flex justify-between text-xs text-ash">
        {scale.map((t) => <span key={t}>{t}</span>)}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto pb-12">
      <button type="button" onClick={() => onNavigate && onNavigate('dashboard')} className="btn btn-ghost btn-sm -ml-2 text-ink-kraft">
        <ArrowLeft size={14} strokeWidth={2} />
        <span>Back to workstation</span>
      </button>

      <h1 className="mt-4 font-cond font-bold text-4xl sm:text-5xl text-ink">Settings</h1>
      <p className="mt-3 text-ink-kraft max-w-[60ch]">
        Provider keys, model and retrieval parameters, and which backend this browser talks to. Everything here is saved in this browser only.
      </p>
      <p className="mt-2 text-ink-kraft max-w-[60ch]">
        <b className="text-ink">Right now only the backend endpoint takes effect.</b> Keys and model settings are saved but not yet sent with requests; the server uses its own configuration.
      </p>

      <form
        className="paper slotted mt-8 p-6 sm:p-10 space-y-10"
        onSubmit={(e) => { e.preventDefault(); handleSaveAll(); }}
      >
        <fieldset className="space-y-4">
          <legend className={group}>API keys</legend>
          <p className="text-sm text-ink-2 max-w-[70ch]">
            Stored in <code className="font-mono text-ink">localStorage</code> and never written to a server database.
          </p>
          {keyFields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`key-${f.id}`} className={fieldLabel}>{f.label}</label>
                <span className="text-xs text-ash">{f.hint}</span>
              </div>
              <div className="relative">
                <input
                  id={`key-${f.id}`}
                  type={f.show ? 'text' : 'password'}
                  value={f.value}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  autoComplete="off"
                  spellCheck={false}
                  className="input-field font-mono text-sm pr-10 has-icon-right"
                />
                <button
                  type="button"
                  onClick={() => f.toggle(!f.show)}
                  aria-label={f.show ? `Hide ${f.label}` : `Show ${f.label}`}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ash hover:text-ink p-0.5"
                >
                  {f.show ? <EyeOff size={14} strokeWidth={2} /> : <Eye size={14} strokeWidth={2} />}
                </button>
              </div>
            </div>
          ))}
        </fieldset>

        <fieldset className="space-y-6">
          <legend className={group}>Model and retrieval</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label htmlFor="set-model" className={`${fieldLabel} block`}>Model</label>
              <select id="set-model" value={selectedModel} onChange={(e) => setSelectedModel(e.target.value)} className="input-field font-mono text-sm">
                <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (Groq, default)</option>
                <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Groq)</option>
                <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Groq)</option>
                <option value="gemini-3.6-flash">gemini-3.6-flash (Google)</option>
              </select>
            </div>

            {sliderRow('set-temp', 'Temperature', temperature, (
              <input id="set-temp" type="range" min="0.0" max="1.0" step="0.05" value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-ink" />
            ), ['0.0 precise', '0.7', '1.0 loose'])}

            {sliderRow('set-depth', 'Call graph expansion', `${graphDepth} ${graphDepth === 1 ? 'hop' : 'hops'}`, (
              <input id="set-depth" type="range" min="1" max="3" step="1" value={graphDepth}
                onChange={(e) => setGraphDepth(Number(e.target.value))} className="w-full accent-ink" />
            ), ['1', '2 default', '3'])}

            {sliderRow('set-topk', 'Vector matches (top-k)', topK, (
              <input id="set-topk" type="range" min="3" max="10" step="1" value={topK}
                onChange={(e) => setTopK(Number(e.target.value))} className="w-full accent-ink" />
            ), ['3', '5 default', '10'])}
          </div>
        </fieldset>

        <fieldset>
          <legend className={`${group} mb-1`}>Backend endpoint</legend>
          {endpoints.map((item) => {
            const isSelected = apiEndpoint === item.url;
            return (
              <label
                key={item.url}
                className={`flex items-start gap-3 py-3 px-3 -mx-3 rounded-sm rule-b last:border-0 ${isSelected ? 'bg-[var(--crimson-wash)]' : 'hover:bg-pulp-2'}`}
              >
                <input
                  type="radio"
                  name="api-endpoint"
                  value={item.url}
                  checked={isSelected}
                  onChange={() => setApiEndpoint(item.url)}
                  className="mt-1 accent-crimson"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">{item.name}</span>
                  <span className="block font-mono text-sm text-ash break-all">{item.url}</span>
                  <span className="block text-sm text-ink-2">{item.desc}</span>
                </span>
              </label>
            );
          })}
        </fieldset>

        <div className="rule-t pt-6 flex flex-wrap items-center justify-end gap-3">
          {savedSuccess && (
            <span role="status" className="mr-auto inline-flex items-center gap-1.5 text-sm text-forest">
              <Check size={14} strokeWidth={2} />
              Saved to this browser.
            </span>
          )}
          <button type="button" onClick={handleResetDefaults} className="btn btn-ghost btn-md">
            <RotateCcw size={14} strokeWidth={2} />
            <span>Reset defaults</span>
          </button>
          <button type="submit" className="btn btn-primary btn-md">
            {savedSuccess ? <Check size={14} strokeWidth={2} /> : <Save size={14} strokeWidth={2} />}
            <span>{savedSuccess ? 'Saved' : 'Save settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
