import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Trash2, Bot, User, Sparkles, Terminal, ArrowRight, 
  CornerDownLeft, Shield, Network, Layers, GitBranch, Database,
  Maximize2, Minimize2, X, Minus, Download
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
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'maximized' | 'minimized' | 'closed'

  // Press Esc to exit maximized mode
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && windowState === 'maximized') {
        setWindowState('normal');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [windowState]);

  const handleExportMarkdown = () => {
    if (!messages || messages.length === 0) return;
    const md = messages
      .map((m) => `### ${m.role === 'user' ? '👤 Developer' : '🤖 CodeBase Intelligence AI'}\n\n${m.content}\n`)
      .join('\n---\n\n');
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `codebase_chat_${activeRepo || 'session'}_${Date.now()}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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
        onComplete: async (finalAnswer) => {
          setPipelineStep('done');
          setPipelineStatus('Response completed with verified grounding');
          let streamedText = '';
          setMessages((prev) => {
            if (prev[assistantMessageIndex]) {
              streamedText = prev[assistantMessageIndex].content || '';
            }
            return prev;
          });

          const resolved = (finalAnswer && finalAnswer.trim()) || (streamedText && streamedText.trim());
          if (!resolved) {
            try {
              const res = await apiPost('/agent/chat', {
                repository_name: activeRepo,
                question,
                history: historyPayload,
              });
              const answer = res.answer || res.error || 'Unable to retrieve response. Please check repository indexing status.';
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
            } catch (_) {
              setMessages((prev) => {
                const copy = [...prev];
                if (copy[assistantMessageIndex]) {
                  copy[assistantMessageIndex] = {
                    ...copy[assistantMessageIndex],
                    content: 'Unable to retrieve response. Please check repository indexing status.',
                    evidence: retrievedEvidence,
                  };
                }
                return copy;
              });
            }
          } else {
            setMessages((prev) => {
              const copy = [...prev];
              if (copy[assistantMessageIndex]) {
                copy[assistantMessageIndex] = {
                  ...copy[assistantMessageIndex],
                  content: resolved,
                  evidence: retrievedEvidence,
                };
              }
              return copy;
            });
          }
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

  // 1. Minimized Dock State
  if (windowState === 'minimized') {
    return (
      <div className="rounded-2xl border border-white/[0.1] bg-[#090d16] p-4 shadow-2xl flex items-center justify-between transition-all duration-300 hover:border-indigo-500/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWindowState('closed')}
              className="h-3.5 w-3.5 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Close chat"
            >
              <X size={8} className="text-[#450000] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
            <button
              onClick={() => setWindowState('normal')}
              className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Restore chat"
            >
              <Minus size={8} className="text-[#4e3200] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
            <button
              onClick={() => setWindowState('maximized')}
              className="h-3.5 w-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
              title="Maximize to full page"
            >
              <Maximize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
            </button>
          </div>
          <div className="h-4 w-px bg-white/10 mx-1" />
          <span className="text-xs font-mono font-bold text-white">AST Intelligence Playground</span>
          <span className="text-[11px] font-mono text-indigo-300 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Minimized • {messages.length} message{messages.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWindowState('normal')}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
          >
            <span>Restore Window</span>
            <Maximize2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  // 2. Closed State
  if (windowState === 'closed') {
    return (
      <div className="p-8 rounded-2xl bg-[#090d16]/90 border border-white/[0.08] text-center space-y-4 shadow-xl">
        <div className="h-12 w-12 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
          <Bot size={22} />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white font-mono">AST Intelligence Playground Closed</h4>
          <p className="text-xs text-slate-400">You can reopen the interactive multi-agent chat session at any time.</p>
        </div>
        <button
          onClick={() => setWindowState('normal')}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-mono font-semibold inline-flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
        >
          <Sparkles size={14} />
          <span>Reopen Chat Playground</span>
        </button>
      </div>
    );
  }

  const isMax = windowState === 'maximized';

  return (
    <div
      className={
        isMax
          ? 'fixed inset-0 z-[999] bg-[#07090e]/95 backdrop-blur-2xl p-2 sm:p-4 md:p-6 w-screen h-screen flex flex-col overflow-hidden animate-in fade-in duration-200'
          : 'flex flex-col h-[780px] rounded-2xl bg-[#0b0e17] overflow-hidden border border-white/[0.08] shadow-2xl transition-all duration-300'
      }
    >
      <div className={isMax ? 'flex flex-col h-full rounded-2xl bg-[#0b0e17] overflow-hidden border border-white/[0.14] shadow-2xl' : 'flex flex-col h-full'}>
        {/* 1. macOS Window Header & Top Navigation Bar */}
        <div className="px-4 py-3 border-b border-white/[0.08] bg-[#080b12] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Interactive macOS window traffic lights */}
            <div className="flex items-center gap-2">
              {/* Red Dot = Close */}
              <button
                type="button"
                onClick={() => setWindowState('closed')}
                className="h-3.5 w-3.5 rounded-full bg-[#ff5f56] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title="Close chat window"
              >
                <X size={8} className="text-[#450000] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
              </button>

              {/* Yellow Dot = Minimize */}
              <button
                type="button"
                onClick={() => setWindowState('minimized')}
                className="h-3.5 w-3.5 rounded-full bg-[#ffbd2e] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title="Minimize chat to dock"
              >
                <Minus size={8} className="text-[#4e3200] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
              </button>

              {/* Green Dot = Maximize to full page / Restore */}
              <button
                type="button"
                onClick={() => setWindowState(isMax ? 'normal' : 'maximized')}
                className="h-3.5 w-3.5 rounded-full bg-[#27c93f] hover:brightness-110 flex items-center justify-center cursor-pointer transition-transform hover:scale-110 group/btn border border-black/20"
                title={isMax ? 'Restore normal window (Esc)' : 'Maximize chat to full page'}
              >
                {isMax ? (
                  <Minimize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                ) : (
                  <Maximize2 size={8} className="text-[#003808] opacity-0 group-hover/btn:opacity-100 transition-opacity stroke-[3]" />
                )}
              </button>
            </div>

            <div className="h-4 w-px bg-white/10 mx-1" />

            {/* Title & Context Pills */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-white tracking-tight">AST Intelligence Playground</span>
              <span className="hidden sm:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
                LangGraph Multi-Agent
              </span>
              {activeRepo && (
                <span className="hidden md:inline-flex text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                  {activeRepo}
                </span>
              )}
            </div>
          </div>

          {/* Right: Navbar Controls & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>live</span>
            </div>

            {/* Pipeline View Toggle */}
            <button
              type="button"
              onClick={() => setShowPipeline(!showPipeline)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                showPipeline ? 'bg-white/[0.08] text-white font-medium border border-white/10' : 'text-slate-400 hover:text-white'
              }`}
              title="Toggle execution pipeline view"
            >
              Pipeline
            </button>

            {/* Export Markdown */}
            <button
              type="button"
              onClick={handleExportMarkdown}
              className="p-1.5 rounded text-slate-400 hover:text-white transition-colors cursor-pointer hover:bg-white/[0.06]"
              title="Export conversation as Markdown"
            >
              <Download size={14} />
            </button>

            {/* Clear Chat */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 transition-colors cursor-pointer hover:bg-white/[0.06]"
              title="Reset conversation"
            >
              <Trash2 size={14} />
            </button>

            <div className="h-4 w-px bg-white/10 mx-0.5" />

            {/* Fullscreen / Restore Action Button */}
            <button
              type="button"
              onClick={() => setWindowState(isMax ? 'normal' : 'maximized')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-indigo-600 border border-white/[0.08] hover:border-indigo-500 text-slate-300 hover:text-white text-xs font-mono flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title={isMax ? 'Exit Full Page (Esc)' : 'Maximize Chat to Full Page'}
            >
              {isMax ? (
                <>
                  <Minimize2 size={13} />
                  <span className="hidden sm:inline">Exit Fullscreen</span>
                  <kbd className="hidden md:inline px-1 py-0.2 rounded bg-black/30 text-[9px] border border-white/10">Esc</kbd>
                </>
              ) : (
                <>
                  <Maximize2 size={13} />
                  <span className="hidden sm:inline">Maximize</span>
                </>
              )}
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
  </div>
  );
}
