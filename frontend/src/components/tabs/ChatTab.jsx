import React, { useState, useRef, useEffect } from 'react';
import {
  Trash2, CornerDownLeft, Shield, Network, Layers, GitBranch,
  Maximize2, Minimize2, Download, Copy, Check, Share,
  RefreshCw, MoreHorizontal, FileText
} from 'lucide-react';
import { Procession } from '../Procession';
import { apiPost, streamChatAgent, fetchDebugSearch } from '../../api';
import { MarkdownView } from '../MarkdownView';
import { ChatSources, countSources } from '../ChatSources';

const PIPELINE_STAGES = [
  { id: 'router', name: 'Router' },
  { id: 'vector', name: 'Retriever' },
  { id: 'graph', name: 'Graph Traverser' },
  { id: 'agent', name: 'Synthesizer' },
  { id: 'llm', name: 'Validator' },
];

// Phrased to work on any indexed repository
const CATEGORIZED_PROMPTS = [
  { label: 'Flow', query: 'Trace what happens, function by function, when the main public API is called.', icon: GitBranch },
  { label: 'Security', query: 'Where is authentication or credential handling implemented?', icon: Shield },
  { label: 'Architecture', query: 'What are the entry points, and which modules do they depend on?', icon: Layers },
  { label: 'Graph', query: 'Which functions are called from the most places, and by whom?', icon: Network },
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
          ? `Ask anything about **${repo}**: where something happens, what calls what, or how a feature works end to end.`
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
  const [selectedIdx, setSelectedIdx] = useState(null); // answer whose sources are shown
  const [inlineSourcesIdx, setInlineSourcesIdx] = useState(null); // phones: sources folded under an answer
  const composerRef = useRef(null);
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'maximized' | 'minimized' | 'closed'
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [activeMenuIndex, setActiveMenuIndex] = useState(null);
  const [shareToastIndex, setShareToastIndex] = useState(null);
  const menuContainerRef = useRef(null);

  // Close dropdown menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(e.target)) {
        setActiveMenuIndex(null);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const handleCopyMessage = async (e, text, idx) => {
    if (e) e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(idx);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (_) {}
  };

  const handleShareMessage = async (e, msg, idx) => {
    if (e) e.stopPropagation();
    try {
      const filename = `Nexus_CodeBase_${activeRepo || 'AI'}_${Date.now()}.md`;
      const blob = new Blob([msg.content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const shareText = `CodeBase answer${activeRepo ? ` about ${activeRepo}` : ''}\n\n${msg.content}`;
      await navigator.clipboard.writeText(shareText);

      setShareToastIndex(idx);
      setTimeout(() => setShareToastIndex(null), 2500);
    } catch (_) {}
  };

  const handleRegenerate = async (e, assistantIndex) => {
    if (e) e.stopPropagation();
    if (loading) return;

    let userQuery = '';
    for (let i = assistantIndex - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userQuery = messages[i].content;
        break;
      }
    }
    if (!userQuery) return;

    setMessages((prev) => prev.slice(0, assistantIndex));

    setTimeout(() => {
      handleSend(userQuery);
    }, 60);
  };

  const handleToggleMenu = (e, idx) => {
    if (e) {
      e.stopPropagation();
      if (e.nativeEvent) e.nativeEvent.stopImmediatePropagation();
    }
    setActiveMenuIndex((prev) => (prev === idx ? null : idx));
  };

  const handleCopyPlainText = async (e, content, idx) => {
    if (e) e.stopPropagation();
    const plain = content
      .replace(/```[\s\S]*?```/g, '')
      .replace(/#{1,6}\s+/g, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
    try {
      await navigator.clipboard.writeText(plain);
      setCopiedIndex(idx);
      setActiveMenuIndex(null);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (_) {}
  };

  const handleDeleteMessage = (e, idx) => {
    if (e) e.stopPropagation();
    setMessages((prev) => prev.filter((_, i) => i !== idx));
    setActiveMenuIndex(null);
  };

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
      .map((m) => `### ${m.role === 'user' ? 'You' : 'CodeBase'}\n\n${m.content}\n`)
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

  const questionRefs = useRef({});
  useEffect(() => {
    const box = messagesContainerRef.current;
    if (!box) return;
    let lastQ = -1;
    messages.forEach((m, i) => { if (m.role === 'user') lastQ = i; });
    const el = questionRefs.current[lastQ];
    box.scrollTop = el ? el.offsetTop - box.offsetTop - 8 : box.scrollHeight;
  }, [messages.length]);

  const handleSend = async (queryToSend) => {
    const question = (queryToSend || input).trim();
    if (!question || loading) return;

    if (!activeRepo) {
      setMessages((prev) => [
        ...prev,
        { role: 'user', content: question },
        { 
          role: 'assistant', 
          content: '**Please index a repository first** using the ingestion bar above before querying the codebase.',
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


    try {
      // Build conversation history excluding initial greeting
      const historyPayload = newMessages
        .slice(1)
        .map((m) => ({ role: m.role, content: m.content }));

      // Add a placeholder message for the streaming response
      const assistantMessageIndex = newMessages.length;
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: '', evidence: null, evidencePending: true }
      ]);
      setSelectedIdx(assistantMessageIndex);

      // The code this answer reads, fetched alongside the stream and attached whenever it lands
      const attachEvidence = (evidence) => setMessages((prev) => {
        const copy = [...prev];
        if (copy[assistantMessageIndex]) copy[assistantMessageIndex] = { ...copy[assistantMessageIndex], evidence, evidencePending: false };
        return copy;
      });
      fetchDebugSearch(activeRepo, question)
        .then((res) => attachEvidence(res && !res.error ? res : null))
        .catch(() => attachEvidence(null));

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
                  content: `Error connecting to agent: ${err}`,
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

  const isMax = windowState === 'maximized';
  const stageOrder = PIPELINE_STAGES.map((s) => s.id);
  const currentStageIndex = stageOrder.indexOf(pipelineStep);
  const iconBtn = 'btn btn-ghost btn-sm !px-2';

  // Only the greeting so far: show the starting sheet instead of a lone message
  const conversationStarted = messages.some((m) => m.role === 'user');
  const answerNumbers = {};
  let qn = 0;
  messages.forEach((m, i) => {
    if (m.role === 'user') { qn += 1; answerNumbers[i] = qn; }
    else if (conversationStarted && i > 0) answerNumbers[i] = qn;
  });
  const answerIdxs = messages.map((m, i) => (m.role === 'assistant' && i > 0 ? i : -1)).filter((i) => i > -1);
  const lastAnswerIdx = answerIdxs.length ? answerIdxs[answerIdxs.length - 1] : null;
  const shownIdx = selectedIdx != null && messages[selectedIdx]?.role === 'assistant' ? selectedIdx : lastAnswerIdx;
  const shown = shownIdx != null ? messages[shownIdx] : null;

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  };
  useEffect(() => { autoGrow(composerRef.current); }, [input]);

  const menuItem = 'w-full px-3 py-1.5 text-left text-sm text-ink hover:bg-pulp-2 flex items-center gap-2.5';
  const toast = 'badge badge-success absolute -top-7 left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap';

  const answerActions = (msg, index) => (
    <div className="flex flex-wrap items-center gap-0.5 mt-3 -ml-2">
      <button
        type="button"
        onClick={() => { setSelectedIdx(index); setInlineSourcesIdx((v) => (v === index ? null : index)); }}
        className={`btn btn-sm !normal-case !tracking-normal !font-sans ${shownIdx === index ? 'bg-ink text-pulp' : 'btn-ghost'}`}
        aria-pressed={shownIdx === index}
        title="Show the code this answer read"
      >
        <FileText size={14} strokeWidth={2} />
        {msg.evidencePending ? 'Collecting sources…' : msg.evidence ? `${countSources(msg.evidence)} sources` : 'Sources'}
      </button>
      <button type="button" onClick={(e) => handleCopyMessage(e, msg.content, index)} className={`${iconBtn} relative`} title="Copy answer" aria-label="Copy answer">
        {copiedIndex === index ? <Check size={14} strokeWidth={2} className="text-forest" /> : <Copy size={14} strokeWidth={2} />}
        {copiedIndex === index && <span className={toast}>Copied</span>}
      </button>
      <button type="button" onClick={(e) => handleShareMessage(e, msg, index)} className={`${iconBtn} relative`} title="Download as Markdown and copy" aria-label="Download as Markdown and copy">
        <Share size={14} strokeWidth={2} />
        {shareToastIndex === index && <span className={toast}>Exported .md</span>}
      </button>
      <button type="button" onClick={(e) => handleRegenerate(e, index)} disabled={loading} className={iconBtn} title="Ask again" aria-label="Ask again">
        <RefreshCw size={14} strokeWidth={2} />
      </button>
      <div className="relative" ref={activeMenuIndex === index ? menuContainerRef : null}>
        <button type="button" onClick={(e) => handleToggleMenu(e, index)} className={`${iconBtn} ${activeMenuIndex === index ? '!bg-[var(--rule)] !text-ink' : ''}`} title="More" aria-label="More" aria-expanded={activeMenuIndex === index}>
          <MoreHorizontal size={14} strokeWidth={2} />
        </button>
        {activeMenuIndex === index && (
          <div onClick={(e) => e.stopPropagation()} className="paper absolute left-0 bottom-full mb-2 w-52 py-1.5 z-40">
            <button type="button" onClick={(e) => handleCopyMessage(e, msg.content, index)} className={menuItem}><Copy size={14} className="text-ink-2" />Copy Markdown</button>
            <button type="button" onClick={(e) => handleCopyPlainText(e, msg.content, index)} className={menuItem}><FileText size={14} className="text-ink-2" />Copy plain text</button>
            <button type="button" onClick={(e) => handleShareMessage(e, msg, index)} className={menuItem}><Download size={14} className="text-ink-2" />Download .md</button>
            <div className="rule-t my-1" />
            <button type="button" onClick={(e) => handleDeleteMessage(e, index)} className="w-full px-3 py-1.5 text-left text-sm text-crimson hover:bg-[var(--crimson-wash)] flex items-center gap-2.5"><Trash2 size={14} />Delete answer</button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={isMax ? 'fixed inset-0 z-[999] bg-kraft p-2 sm:p-4 md:p-6 w-screen h-screen flex flex-col overflow-hidden' : 'h-[max(520px,calc(100vh-330px))]'}>
      <div className={`${isMax ? 'paper h-full p-4 sm:p-6' : 'h-full'} grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-x-8 min-h-0`}>
        {/* Conversation column */}
        <div className="flex flex-col min-h-0 min-w-0">
          <div className="flex items-center gap-3 pb-3 rule-b">
            <span className="flex items-center gap-2 min-w-0 text-sm text-ink-2">
              <span className={`status-dot ${loading ? 'idle' : activeRepo ? 'active' : ''}`} />
              {activeRepo ? <span className="font-mono text-ink truncate">{activeRepo}</span> : <span>No repository indexed</span>}
            </span>
            <div className="ml-auto flex items-center gap-1">
              <button type="button" onClick={handleExportMarkdown} className={iconBtn} title="Export conversation as Markdown" aria-label="Export conversation as Markdown"><Download size={15} strokeWidth={2} /></button>
              <button type="button" onClick={handleClear} className={iconBtn} title="New conversation" aria-label="New conversation"><Trash2 size={15} strokeWidth={2} /></button>
              <button type="button" onClick={() => setWindowState(isMax ? 'normal' : 'maximized')} className="btn btn-secondary btn-sm ml-1" title={isMax ? 'Exit full page (Esc)' : 'Full page'}>
                {isMax ? <Minimize2 size={14} strokeWidth={2} /> : <Maximize2 size={14} strokeWidth={2} />}
                <span className="hidden sm:inline">{isMax ? 'Exit full page' : 'Full page'}</span>
              </button>
            </div>
          </div>

          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto pr-2">
            {!conversationStarted ? (
              <div className="py-8 max-w-[68ch]">
                <h2 className="font-matrixtype-display text-4xl text-ink leading-none">ASK THE CODE.</h2>
                <p className="mt-3 text-ink-2">
                  {activeRepo
                    ? <>Ask where something happens, what calls what, or how a feature works end to end in <b className="text-ink">{activeRepo}</b>. Each answer lists the code it read beside it.</>
                    : 'Index a repository first, then ask about its code here.'}
                </p>
                <div className="mt-6 grid sm:grid-cols-2 gap-3">
                  {CATEGORIZED_PROMPTS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={() => handleSend(item.query)}
                        disabled={loading || !activeRepo}
                        className="paper-flat text-left p-4 hover:bg-pulp hover:shadow-lift-1 transition-shadow group disabled:opacity-50"
                      >
                        <span className="strip text-ash flex items-center gap-1.5"><Icon size={13} strokeWidth={2} />{item.label}</span>
                        <span className="mt-1.5 block text-[15px] text-ink group-hover:underline underline-offset-4 decoration-1">{item.query}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <ol className="py-2">
                {messages.map((msg, index) => {
                  if (index === 0 && msg.role === 'assistant') return null; // greeting
                  if (msg.role === 'user') {
                    return (
                      <li key={index} ref={(el) => (questionRefs.current[index] = el)} className={`group pt-6 ${answerNumbers[index] > 1 ? 'mt-6 rule-t' : ''}`}>
                        <div className="flex items-start gap-3">
                          <span className="font-mono text-sm text-ash pt-1.5 tabular-nums shrink-0 w-6">Q{answerNumbers[index]}</span>
                          <h3 className="font-cond font-bold text-[1.35rem] leading-snug text-ink whitespace-pre-wrap flex-1 min-w-0">{msg.content}</h3>
                          <button type="button" onClick={(e) => handleCopyMessage(e, msg.content, index)} className={`${iconBtn} opacity-0 group-hover:opacity-100 focus:opacity-100`} title="Copy question" aria-label="Copy question">
                            {copiedIndex === index ? <Check size={14} strokeWidth={2} className="text-forest" /> : <Copy size={14} strokeWidth={2} />}
                          </button>
                        </div>
                      </li>
                    );
                  }
                  const streaming = loading && index === messages.length - 1;
                  return (
                    <li key={index} className="sm:pl-9 pt-3 min-w-0">
                      {!msg.content && streaming ? (
                        <div className="py-2 max-w-[600px]" aria-live="polite">
                          <Procession
                            compact
                            items={PIPELINE_STAGES.map((st) => ({ id: st.id, label: st.name }))}
                            pos={currentStageIndex}
                            done={PIPELINE_STAGES.filter((st, idx) => currentStageIndex > -1 && idx < currentStageIndex).map((st) => st.id)}
                          />
                          <p className="mt-2 text-sm text-ink-2">{pipelineStatus || 'Routing the question…'}</p>
                        </div>
                      ) : (
                        <>
                          <MarkdownView content={msg.content} />
                          {streaming && <span className="blinking-cursor" />}
                          {msg.content && !streaming && answerActions(msg, index)}
                          {/* Phones: sources fold open under the answer */}
                          {inlineSourcesIdx === index && (
                            <div className="lg:hidden mt-3 paper-flat p-3 motion-expand-body">
                              <ChatSources evidence={msg.evidence} pending={msg.evidencePending} repo={activeRepo} hasAnswer />
                            </div>
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>

          {/* Composer */}
          <div className="pt-3 rule-t">
            <div className="flex items-end gap-2">
              <textarea
                ref={composerRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeRepo ? `Ask about ${activeRepo}` : 'Index a repository first'}
                rows={1}
                aria-label="Ask a question about the codebase"
                className="input-field flex-1 resize-none text-[15px] leading-relaxed"
              />
              <button type="button" onClick={() => handleSend()} disabled={loading || !input.trim()} className="btn btn-primary btn-md shrink-0">
                <CornerDownLeft size={14} strokeWidth={2} />
                <span>{loading ? 'Answering' : 'Ask'}</span>
              </button>
            </div>
            <p className="mt-1.5 text-xs text-ash">Enter to ask · Shift+Enter for a new line</p>
          </div>
        </div>

        {/* Sources rail: the code the selected answer read */}
        <aside className="hidden lg:flex flex-col min-h-0 border-l border-rule pl-8" aria-label="Sources">
          <div className="pb-3 rule-b flex items-baseline justify-between gap-2">
            <h3 className="strip text-ink">Sources</h3>
            {shown && answerNumbers[shownIdx] ? <span className="font-mono text-xs text-ash">answer {answerNumbers[shownIdx]}</span> : null}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto py-4 pr-1">
            <ChatSources evidence={shown?.evidence} pending={shown?.evidencePending} repo={activeRepo} hasAnswer={Boolean(shown && conversationStarted)} />
          </div>
        </aside>
      </div>
    </div>
  );
}
