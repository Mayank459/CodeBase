import React, { useState, useEffect } from 'react';
import { 
  Key, Cpu, Network, Database, Save, RotateCcw, Check, 
  Eye, EyeOff, Radio, Server, Sliders, ShieldCheck, AlertCircle, ArrowLeft 
} from 'lucide-react';
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

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('dashboard')}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white mb-2 transition-colors cursor-pointer group"
          >
            <ArrowLeft size={13} className="text-indigo-400 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Workstation</span>
          </button>
          <div className="flex items-center gap-2">
            <Sliders size={20} className="text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">System Settings & Engine Configuration</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure LLM inference providers, vector retrieval bounds, and backend proxy endpoints.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="btn btn-ghost btn-sm text-slate-400 hover:text-white gap-1.5"
          >
            <RotateCcw size={13} />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAll}
            className="btn btn-primary btn-sm px-4 gap-1.5 shadow-lg shadow-indigo-500/25"
          >
            {savedSuccess ? (
              <>
                <Check size={14} className="text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save Configuration</span>
              </>
            )}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 font-mono">
          <Check size={15} />
          <span>All environment parameters and endpoint settings saved to local application storage.</span>
        </div>
      )}

      {/* 1. API Keys Management */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Key size={16} className="text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Client API Keys</h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Saved securely in browser localStorage</span>
          </span>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Override default server credentials with personal provider API keys to bypass shared usage quotas.
        </p>

        <div className="space-y-3.5 pt-1">
          {/* Groq Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Groq API Key (Primary LLM Engine)</span>
              <span className="text-[10px] text-slate-500">Fast inference LPU</span>
            </label>
            <div className="relative">
              <input
                type={showGroq ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="input-field font-mono text-xs pr-10 has-icon-right"
              />
              <button
                type="button"
                onClick={() => setShowGroq(!showGroq)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showGroq ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Gemini Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Google Gemini API Key (Fallback Engine)</span>
              <span className="text-[10px] text-slate-500">Automatic resilience</span>
            </label>
            <div className="relative">
              <input
                type={showGemini ? 'text' : 'password'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="input-field font-mono text-xs pr-10 has-icon-right"
              />
              <button
                type="button"
                onClick={() => setShowGemini(!showGemini)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showGemini ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Cohere Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 flex items-center justify-between">
              <span>Cohere API Key (Embeddings)</span>
              <span className="text-[10px] text-slate-500">384-dim light embeddings</span>
            </label>
            <div className="relative">
              <input
                type={showCohere ? 'text' : 'password'}
                value={cohereKey}
                onChange={(e) => setCohereKey(e.target.value)}
                placeholder="co_..."
                className="input-field font-mono text-xs pr-10 has-icon-right"
              />
              <button
                type="button"
                onClick={() => setShowCohere(!showCohere)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5"
              >
                {showCohere ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Model & Generation Parameters */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Cpu size={16} className="text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Model Selection & Generation Parameters</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* LLM Model Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-300 block">
              Primary LLM Architecture
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input-field font-mono text-xs cursor-pointer bg-[#090d16]"
            >
              <option value="qwen/qwen3.8-27b">Qwen 3.8 27B (Default Groq Engine)</option>
              <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Groq)</option>
              <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (Ultra-Fast)</option>
              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Direct Google)</option>
            </select>
          </div>

          {/* Temperature Slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span>Sampling Temperature</span>
              <span className="text-indigo-400 font-bold">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Precise (0.0)</span>
              <span>Balanced (0.7)</span>
              <span>Creative (1.0)</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/[0.06]">
          {/* Graph BFS Depth */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <Network size={13} className="text-cyan-400" />
                <span>AST Graph BFS Expansion Depth</span>
              </span>
              <span className="text-cyan-400 font-bold">{graphDepth} Hops</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="1"
              value={graphDepth}
              onChange={(e) => setGraphDepth(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>1 Hop (Callers only)</span>
              <span>2 Hops (Recommended)</span>
              <span>3 Hops (Deep context)</span>
            </div>
          </div>

          {/* Vector Top-K */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono text-slate-300">
              <span className="flex items-center gap-1.5">
                <Database size={13} className="text-amber-400" />
                <span>Vector Retrieval Top-K</span>
              </span>
              <span className="text-amber-400 font-bold">{topK} Entities</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="1"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>3 Matches</span>
              <span>5 Matches (Default)</span>
              <span>10 Matches</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Connection & Endpoint Selector */}
      <div className="glass-panel p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/[0.08]">
          <Server size={16} className="text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">FastAPI Backend Connection Endpoint</h3>
        </div>

        <div className="space-y-2.5">
          {[
            {
              url: '/api-proxy',
              name: 'Vite Reverse Proxy (Recommended)',
              desc: 'Forwards queries to Render with zero browser CORS restrictions',
              badge: 'Fast & Secure',
            },
            {
              url: 'https://codebase-ys83.onrender.com',
              name: 'Direct Render Cloud Instance',
              desc: 'Production cloud backend deployed on Render',
              badge: 'Cloud Host',
            },
            {
              url: 'http://localhost:8000',
              name: 'Local FastAPI Daemon (:8000)',
              desc: 'Connect to a locally running Uvicorn server',
              badge: 'Local Dev',
            },
          ].map((item) => {
            const isSelected = apiEndpoint === item.url;
            return (
              <div
                key={item.url}
                onClick={() => setApiEndpoint(item.url)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                  isSelected
                    ? 'bg-indigo-600/15 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/10'
                    : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:bg-white/[0.05]'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{item.name}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400">
                      {item.badge}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">{item.desc}</div>
                </div>

                <div className="h-4 w-4 rounded-full border border-white/20 flex items-center justify-center">
                  {isSelected && <div className="h-2 w-2 rounded-full bg-indigo-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
