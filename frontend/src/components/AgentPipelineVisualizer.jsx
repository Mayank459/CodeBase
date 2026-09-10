import React from 'react';
import { Sparkles, Network, Database, Cpu, CheckCircle2, Loader2, GitBranch } from 'lucide-react';

export function AgentPipelineVisualizer({ currentStep = 'idle', statusMessage = '', activeAgent = 'Chat Agent' }) {
  const steps = [
    { id: 'router', label: 'Intent Router', icon: GitBranch, detail: 'LangGraph Router' },
    { id: 'agent', label: activeAgent || 'Specialized Agent', icon: Sparkles, detail: 'Domain Reasoning' },
    { id: 'vector', label: 'Vector Search', icon: Database, detail: 'Qdrant Top-5' },
    { id: 'graph', label: 'Graph Expansion', icon: Network, detail: 'NetworkX 2-Hop BFS' },
    { id: 'llm', label: 'LLM Generation', icon: Cpu, detail: 'Groq / Gemini' },
  ];

  const getStepStatus = (stepId) => {
    if (currentStep === 'done') return 'completed';
    if (currentStep === 'idle') return 'idle';

    const order = ['router', 'agent', 'vector', 'graph', 'llm', 'done'];
    const currentIndex = order.indexOf(currentStep);
    const stepIndex = order.indexOf(stepId);

    if (currentIndex > stepIndex) return 'completed';
    if (currentIndex === stepIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full bg-[#090d16] border border-white/[0.08] rounded-xl p-3.5 shadow-lg space-y-2.5">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
          <span className="font-mono font-semibold text-slate-300">
            Multi-Agent Execution Pipeline
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            (LangGraph 14-Node StateGraph)
          </span>
        </div>
        {statusMessage && (
          <span className="text-[11px] font-mono text-indigo-300 truncate max-w-xs sm:max-w-md">
            {statusMessage}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        {steps.map((step) => {
          const Icon = step.icon;
          const status = getStepStatus(step.id);

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between gap-1.5 ${
                status === 'completed'
                  ? 'bg-emerald-500/[0.06] border-emerald-500/30 text-emerald-300'
                  : status === 'active'
                  ? 'bg-indigo-500/15 border-indigo-500/50 text-indigo-200 shadow-lg shadow-indigo-500/10'
                  : 'bg-white/[0.02] border-white/[0.05] text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={14} className={status === 'active' ? 'text-cyan-400' : ''} />
                {status === 'completed' && <CheckCircle2 size={13} className="text-emerald-400" />}
                {status === 'active' && <Loader2 size={13} className="animate-spin text-cyan-400" />}
              </div>

              <div>
                <div className="text-[11px] font-semibold leading-tight font-sans">
                  {step.label}
                </div>
                <div className="text-[9px] font-mono opacity-70 truncate">
                  {step.detail}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
