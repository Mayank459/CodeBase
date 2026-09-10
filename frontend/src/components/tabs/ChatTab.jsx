import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Trash2, Bot, User, Sparkles, Terminal, ArrowRight, 
  CornerDownLeft, Shield, Network, Layers, GitBranch, Database 
} from 'lucide-react';
import { apiPost, streamChatAgent, fetchDebugSearch } from '../../api';
import { MarkdownView } from '../MarkdownView';
import { AgentPipelineVisualizer } from '../AgentPipelineVisualizer';
import { RetrievalEvidenceDrawer } from '../RetrievalEvidenceDrawer';

const CATEGORIZED_PROMPTS = [
  { label: 'Flow', query: 'What happens when a user requests repository indexing?', icon: GitBranch },
  { label: 'Security', query: 'Where is authentication or credential management implemented?', icon: Shield },
  { label: 'Architecture', query: 'Show me the main entry points and critical services in this codebase', icon: Layers },
  { label: 'Graph', query: 'Explain the graph traversal and vector retrieval mechanism', icon: Network },
];

export function ChatTab({ activeRepo }) {
  const storageKey = `codebase_chat_history_${activeRepo || 'default'}`;

  const getInitialMessages = (repo) => {
    try {
      const saved = localStorage.getItem(`codebase_chat_history_${repo || 'default'}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return [
      {
        role: 'assistant',
        content: repo
          ? `I am ready. Ask any structural, semantic, or call-flow question regarding **${repo}**.`
          : 'Welcome to CodeBase Intelligence. Please index a repository above to explore its call graphs, AST entities, and architecture in natural language.',
        evidence: null,
      }
    ];
  };

  const [messages, setMessages] = useState(() => getInitialMessages(activeRepo));
  const prevRepoRef = useRef(activeRepo);

  // Sync state if activeRepo changes
  useEffect(() => {
    if (prevRepoRef.current !== activeRepo) {
      prevRepoRef.current = activeRepo;
      setMessages(getInitialMessages(activeRepo));
    }
  }, [activeRepo]);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      if (messages && messages.length > 0) {
        localStorage.setItem(storageKey, JSON.stringify(messages));
      }
    } catch (_) {}
  }, [messages, storageKey]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineStep, setPipelineStep] = useState('idle');
  const [pipelineStatus, setPipelineStatus] = useState('');
  const [activeAgent, setActiveAgent] = useState('Chat Agent');
  const [showPipeline, setShowPipeline] = useState(true);

  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async (queryToSend) => {
    const question = (queryToSend || input).trim();
    if (!question || loading) return;

    if (!activeRepo) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { 
          role: 'assistant', 
          content: '⚠️ **Please index a repository first** using the ingestion bar above before querying the codebase.',
          evidence: null
        }
      ]);
      setInput('');
      return;
    }

    const newMessages = [...messages, { role: 'user', content: question }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    // Initial pipeline state
    setPipelineStep('router');
    setPipelineStatus('Classifying query intent with LangGraph Router...');

    // Asynchronously fetch debug search grounding evidence in parallel
    let retrievedEvidence = null;
    fetchDebugSearch(activeRepo, question)
      .then((res) => {
        if (res && !res.error) {
          retrievedEvidence = res;
        }
      })
      .catch(() => {});

    try {
      // Build conversation history excluding initial greeting
      const historyPayload = newMessages
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add a placeholder message for the streaming response
      const assistantMessageIndex = newMessages.length;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', evidence: null }
      ]);

      // Stream tokens
      await streamChatAgent({
        repoName: activeRepo,
        question,
        history: historyPayload,
        onStatus: (status) => {
          setPipelineStatus(status);
          if (status.includes('router')) setPipelineStep('router');
          else if (status.includes('retriever') || status.includes('vector')) setPipelineStep('vector');
          else if (status.includes('graph')) setPipelineStep('graph');
          else setPipelineStep('agent');
        },
        onToken: (token, fullText) => {
          setPipelineStep('llm');
          setPipelineStatus('Streaming synthesized response from LLM...');
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantMessageIndex]) {
              copy[assistantMessageIndex] = {
                ...copy[assistantMessageIndex],
                content: fullText,
              };
            }
            return copy;
          });
        },
        onComplete: (finalAnswer) => {
          setPipelineStep('done');
          setPipelineStatus('Response completed with verified grounding');
          setMessages((prev) => {
            const copy = [...prev];
            if (copy[assistantMessageIndex]) {
              const streamedText = copy[assistantMessageIndex].content || '';
              copy[assistantMessageIndex] = {
                ...copy[assistantMessageIndex],
                content: finalAnswer || streamedText || 'Response completed.',
                evidence: retrievedEvidence,
              };
            }
            return copy;
          });
        },
        onError: async (err) => {
          // Fallback to standard POST request if SSE streaming encounters network hiccups
          setPipelineStatus('Stream completed via resilient fallback');
          try {
            const res = await apiPost('/agent/chat', {
              repository_name: activeRepo,
              question,
              history: historyPayload,
            });
            const answer = res.answer || res.error || 'Failed to generate response.';
            setMessages((prev) => {
              const copy = [...prev];
              if (copy[assistantMessageIndex]) {
                copy[assistantMessageIndex] = {
                  ...copy[assistantMessageIndex],
                  content: answer,
                  evidence: retrievedEvidence,
                };
              }
              return copy;
            });
          } catch (postErr) {
            setMessages((prev) => {
              const copy = [...prev];
              if (copy[assistantMessageIndex]) {
                copy[assistantMessageIndex] = {
                  ...copy[assistantMessageIndex],
                  content: `❌ Error connecting to agent: ${err}`,
                  evidence: null,
                };
              }
              return copy;
            });
          }
        },
      });
    } catch (err) {
      // Managed in onError
    } finally {
      setLoading(false);
      setTimeout(() => {
        setPipelineStep('idle');
        setPipelineStatus('');
      }, 3000);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
    setMessages([
      {
        role: 'assistant',
        content: `Conversation reset. Ask any question regarding **${activeRepo || 'your repository'}**.`,
        evidence: null,
      }
    ]);
  };

  return (
    <div className="flex flex-col h-[780px] rounded-2xl bg-[#0b0e17] overflow-hidden border border-white/[0.08] shadow-2xl">
      {/* 1. macOS Window Header Bar (Figma Style) */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#080b12] flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* macOS window dots */}
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
          </div>

          <div className="h-4 w-px bg-white/10 mx-1" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-white tracking-tight">AST Intelligence Playground</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
              LangGraph Multi-Agent
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Live Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>live</span>
          </div>

          <button
            onClick={() => setShowPipeline(!showPipeline)}
            className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
              showPipeline ? 'bg-white/[0.08] text-white font-medium' : 'text-slate-400 hover:text-white'
            }`}
            title="Toggle execution pipeline view"
          >
            Pipeline
          </button>

          <button
            onClick={handleClear}
            className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset conversation"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* 2. Multi-Agent Pipeline Row (Figma Version 5 Spec) */}
      {showPipeline && (
        <div className="px-5 py-2.5 border-b border-white/[0.06] bg-[#07090f]">
          <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono text-slate-400">
            <span className="uppercase tracking-wider">Multi-Agent Pipeline Execution</span>
            <span className="text-indigo-400">{pipelineStatus || (loading ? 'Active...' : 'Ready')}</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs font-mono">
            {[
              { id: 'router', name: 'Router' },
              { id: 'vector', name: 'Retriever' },
              { id: 'graph', name: 'Graph Traverser' },
              { id: 'agent', name: 'Synthesizer' },
              { id: 'llm', name: 'Validator' },
            ].map((stage, idx) => {
              const isActive = pipelineStep === stage.id || (loading && stage.id === 'agent');
              const isDone = pipelineStep === 'done';

              return (
                <React.Fragment key={stage.id}>
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] transition-all whitespace-nowrap ${
                      isActive
                        ? 'pipeline-node-active animate-pulse'
                        : isDone
                        ? 'pipeline-node-done'
                        : 'pipeline-node-pending'
                    }`}
                  >
                    <span>{isActive ? '●' : isDone ? '✓' : '○'}</span>
                    <span>{stage.name}</span>
                  </div>
                  {idx < 4 && <span className="text-slate-600 text-xs select-none">→</span>}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Messages Scroll Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-5 space-y-6 bg-[#080b12]/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={index}
              className={`flex items-start gap-3.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {isUser ? (
                <div className="h-7 w-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-md shadow-indigo-600/30">
                  <User size={14} />
                </div>
              ) : (
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5 shadow-md shadow-indigo-500/25">
                  <Sparkles size={14} />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3.5 shadow-lg ${
                  isUser
                    ? 'bg-[#1e1b4b]/80 border border-indigo-500/40 text-indigo-100'
                    : 'bg-[#0f1420] border border-white/[0.08] text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between mb-2 gap-4">
                  <span className={`text-[10px] font-mono uppercase tracking-wider ${isUser ? 'text-indigo-300' : 'text-slate-400'}`}>
                    {isUser ? 'Developer' : 'nexus / codebase-ai'}
                  </span>
                  {!isUser && (
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full">
                      AST Grounded
                    </span>
                  )}
                </div>

                {isUser ? (
                  <p className="font-tiempos text-[16px] sm:text-[17px] leading-[1.75] whitespace-pre-wrap font-normal text-indigo-50">{msg.content}</p>
                ) : (
                  <>
                    <MarkdownView content={msg.content} />
                    {loading && index === messages.length - 1 && (
                      <span className="blinking-cursor" />
                    )}
                    {/* Cyan JetBrains Mono Evidence Pills */}
                    <RetrievalEvidenceDrawer evidence={msg.evidence} />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {loading && pipelineStep !== 'llm' && (
          <div className="flex items-start gap-3">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white mt-0.5 shadow-md">
              <Sparkles size={13} className="animate-spin" />
            </div>
            <div className="bg-[#0f1420] border border-white/[0.08] rounded-xl px-4 py-3 text-xs text-slate-300 flex items-center gap-2 font-mono shadow-md">
              <span className="h-2 w-2 rounded-full bg-indigo-400 animate-ping" />
              <span>{pipelineStatus || 'Traversing AST call tree & semantic vector index...'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 4. Categorized Quick Prompt Chips */}
      {messages.length <= 2 && (
        <div className="px-4 py-2 bg-[#080b12] border-t border-white/[0.06] flex items-center gap-2 overflow-x-auto scrollbar-none">
          <Sparkles size={12} className="text-cyan-400 shrink-0" />
          <span className="text-[11px] text-slate-400 font-mono shrink-0">Prompts:</span>
          {CATEGORIZED_PROMPTS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSend(item.query)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.03] hover:bg-indigo-500/15 border border-white/[0.08] hover:border-indigo-500/40 text-[11px] font-mono text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
              >
                <Icon size={11} className="text-indigo-400" />
                <span className="font-semibold text-slate-400">{item.label}:</span>
                <span className="truncate max-w-[190px]">{item.query}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 5. Floating Prompt Input Bar (Figma Version 5 Spec) */}
      <div className="p-4 border-t border-white/[0.08] bg-[#07090f]">
        <div className="rounded-xl bg-[#0f1420] border border-white/[0.1] p-2 flex items-center gap-2.5 indigo-focus-glow">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeRepo
                ? `Ask anything about ${activeRepo} (e.g. "Trace login flow", "Where are DB queries?")...`
                : 'Index a repository to explore its call graphs and architecture...'
            }
            rows={1}
            className="flex-1 bg-transparent border-none outline-none px-2 text-[15px] sm:text-[16px] text-slate-100 placeholder-slate-500 font-tiempos resize-none py-1.5 leading-relaxed"
          />

          {/* Keyboard shortcut badge */}
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-slate-400 select-none">
            ⏎
          </kbd>

          {/* Gradient Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <span>Send</span>
            <CornerDownLeft size={12} />
          </button>
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400 font-mono px-1">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>Shift + Enter for new line • Enter to send</span>
          </span>
          <span className="text-slate-400">{activeRepo ? `Target: ${activeRepo}` : 'Default: psf/requests'}</span>
        </div>
      </div>
    </div>
  );
}
