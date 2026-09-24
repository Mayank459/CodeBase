import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, Terminal, Copy, Check, Send, ChevronRight, Play, 
  ArrowUpRight, Shield, Zap, Cpu, Server, Code, Layers, 
  Activity, CheckCircle2, Circle, Clock, Sliders, ExternalLink,
  Lock, RefreshCw, Key, Database, GitBranch
} from 'lucide-react';
import { streamChatAgent } from '../../api';

export function NexusSeniorDevView({ onOpenWorkstation, activeRepo }) {
  // Playground State
  const [selectedModel, setSelectedModel] = useState('nexus-3');
  const [activeWindowTab, setActiveWindowTab] = useState('playground'); // playground | logs | models
  const [activeCodeLang, setActiveCodeLang] = useState('TypeScript'); // TypeScript | Python | Go | Rust
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedNpm, setCopiedNpm] = useState(false);
  const [copiedCurl, setCopiedCurl] = useState(false);

  // Runtime Parameters
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [topP, setTopP] = useState(0.95);
  const [streamEnabled, setStreamEnabled] = useState(true);

  // Chat & Pipeline State (Figma Version 5 spec)
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: 'nexus-3 ready. Ask me anything — code, reasoning, analysis.',
      evidence: [],
      timestamp: 'just now',
      isStreaming: false
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState(0); // 0: idle, 1: Router, 2: Retriever, 3: Graph Traverser, 4: Synthesizer, 5: Validator
  const chatScrollRef = useRef(null);

  const PIPELINE_STAGES = [
    { id: 'router', name: 'Router', description: 'Intent classification' },
    { id: 'retriever', name: 'Retriever', description: 'Hybrid AST search' },
    { id: 'traverser', name: 'Graph Traverser', description: 'BFS call-tree resolve' },
    { id: 'synthesizer', name: 'Synthesizer', description: 'Context synthesis' },
    { id: 'validator', name: 'Validator', description: 'Citation audit' }
  ];

  const MODELS = [
    { id: 'nexus-3', name: 'nexus-3', latency: '142ms', desc: 'Flagship reasoning & architecture' },
    { id: 'nexus-3-fast', name: 'nexus-3-fast', latency: '38ms', desc: 'Ultra-low latency inference' },
    { id: 'nexus-code', name: 'nexus-code', latency: '91ms', desc: 'AST-specialized code synthesis' },
    { id: 'nexus-edge', name: 'nexus-edge', latency: '12ms', desc: 'Quantized edge worker' }
  ];

  const CODE_SNIPPETS = {
    TypeScript: `import { Nexus } from "@nexus/sdk"

const client = new Nexus({
  apiKey: process.env.NEXUS_KEY
});

const stream = await client.chat.stream({
  model: "nexus-3",
  messages: [{ role: "user", content: prompt }],
});

for await (const chunk of stream)
  process.stdout.write(chunk.content);`,

    Python: `from nexus import Nexus
import os

client = Nexus(api_key=os.getenv("NEXUS_KEY"))

response = client.chat.stream(
    model="nexus-3",
    messages=[{"role": "user", "content": prompt}]
)

for chunk in response:
    print(chunk.content, end="", flush=True)`,

    Go: `package main

import (
    "context"
    "fmt"
    "github.com/nexus-ai/nexus-go"
)

func main() {
    client := nexus.NewClient(nexus.WithAPIKey(apiKey))
    stream, err := client.ChatStream(context.Background(), &nexus.ChatRequest{
        Model: "nexus-3",
        Messages: []nexus.Message{{Role: "user", Content: prompt}},
    })
    for chunk := range stream.Chunks() {
        fmt.Print(chunk.Content)
    }
}`,

    Rust: `use nexus_sdk::{NexusClient, ChatRequest, Message};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = NexusClient::from_env()?;
    let mut stream = client.chat_stream(ChatRequest {
        model: "nexus-3".into(),
        messages: vec![Message::user(prompt)],
        ..Default::default()
    }).await?;

    while let Some(chunk) = stream.next().await {
        print!("{}", chunk?.content);
    }
    Ok(())
}`
  };

  useEffect(() => {
    chatScrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Copy helpers
  const handleCopyCode = (text, setter) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  // Send message handling with character streaming and multi-agent pipeline animation
  const handleSendMessage = async (customText) => {
    const text = (customText || inputValue).trim();
    if (!text || isProcessing) return;

    setInputValue('');
    setIsProcessing(true);

    const userMsg = {
      id: Date.now(),
      role: 'user',
      content: text,
      timestamp: 'just now'
    };

    const assistantMsgId = Date.now() + 1;
    const initialAssistantMsg = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      evidence: [],
      timestamp: 'just now',
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);

    // Animate Multi-Agent Pipeline Row: Router → Retriever → Graph Traverser → Synthesizer → Validator
    setPipelineStep(1); // Router
    await new Promise((r) => setTimeout(r, 350));
    setPipelineStep(2); // Retriever
    await new Promise((r) => setTimeout(r, 400));
    setPipelineStep(3); // Graph Traverser
    await new Promise((r) => setTimeout(r, 450));
    setPipelineStep(4); // Synthesizer
    await new Promise((r) => setTimeout(r, 400));
    setPipelineStep(5); // Validator
    await new Promise((r) => setTimeout(r, 350));

    // Simulated responses tailored to query or using active repository context
    const sampleResponses = [
      {
        content: `Analyzing repository topology for "${text}". Found primary execution flow traversing through the dependency graph:\n\n` +
          `• Verified entrypoint orchestrates request dispatch with zero-copy stream processing.\n` +
          `• Core data layer binds connection pooling with automated backoff retry logic.\n` +
          `• Invariant checks confirm SOC 2 audit readiness with AST-backed boundary guards.`,
        evidence: ['requests/api.py:L42-L89', 'AST:Session.send', 'Graph:Edge(HTTPAdapter)', 'tokens: 284']
      },
      {
        content: `Query intent resolved to architectural synthesis. Multi-agent traversal extracted 3 structural patterns across indexed nodes:\n\n` +
          `1. **Transport Layer**: Abstract adapter pattern isolating network protocol semantics.\n` +
          `2. **State Machine**: Deterministic connection reuse with Sliding Window Attention.\n` +
          `3. **Memory Safety**: Linear buffer allocation achieving 87ms p50 latency under heavy load.`,
        evidence: ['core/engine.py:L114', 'AST:ConnectionPool', 'Graph:CallPath(Session->Adapter)', 'tokens: 312']
      }
    ];

    const targetResponse = sampleResponses[Math.floor(Math.random() * sampleResponses.length)];
    const fullText = targetResponse.content;

    // Character by character streaming simulation (matching Figma Version 5 spec)
    let currentIdx = 0;
    const streamInterval = setInterval(() => {
      currentIdx += 3;
      if (currentIdx >= fullText.length) {
        clearInterval(streamInterval);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: fullText,
                  evidence: targetResponse.evidence,
                  isStreaming: false
                }
              : msg
          )
        );
        setIsProcessing(false);
        setPipelineStep(0);
      } else {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: fullText.slice(0, currentIdx) }
              : msg
          )
        );
      }
    }, 24);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* 1. TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#0a0a0c]/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2.5 cursor-pointer">
              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 flex items-center justify-center shadow-lg shadow-indigo-600/30 border border-indigo-400/30">
                <span className="font-mono font-black text-white text-xs tracking-tighter">N</span>
              </div>
              <span className="font-bold text-lg tracking-tight text-white font-sans">nexus</span>
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <button 
                type="button" 
                className="px-3 py-1.5 text-xs font-medium text-white bg-white/[0.06] rounded-md transition-colors"
              >
                Playground
              </button>
              <a 
                href="#models-section" 
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Models
              </a>
              <a 
                href="#sdk-section" 
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Docs
              </a>
              <a 
                href="#pricing-section" 
                className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
              >
                Pricing
              </a>
            </nav>
          </div>

          {/* Right Status & Actions */}
          <div className="flex items-center gap-4">
            {/* Operational Status Badge */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-400 text-xs font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>all systems operational</span>
            </div>

            {/* Switch to Deep Workstation / CodeBase Suite */}
            <button
              type="button"
              onClick={onOpenWorkstation}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white transition-all text-xs font-medium cursor-pointer"
              title="Switch to full CodeBase repository tools (Architecture, Security, AST, UML)"
            >
              <Layers size={13} className="text-cyan-400" />
              <span>Repo Suite</span>
              <ArrowUpRight size={13} />
            </button>

            <button 
              type="button" 
              className="hidden lg:block text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Log in
            </button>

            <button 
              type="button" 
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all cursor-pointer"
            >
              Get API key
            </button>
          </div>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
        {/* Subtle high-tech background aura */}
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[320px] bg-gradient-to-b from-indigo-600/15 via-purple-600/5 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          {/* Announcement pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.1] text-xs font-mono text-slate-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span className="font-semibold text-white">nexus-3</span>
            <span className="text-slate-400">— now generally available</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1]">
            The inference API <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-indigo-300">
              built for production.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed max-w-2xl font-normal">
            Language models that are fast enough to use in hot paths, large enough to replace your reasoning pipeline, and priced so the math works out.
          </p>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('playground-window');
                el?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm shadow-xl shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-2"
            >
              <span>Start building free</span>
              <ChevronRight size={15} />
            </button>

            {/* Install pill */}
            <div 
              onClick={() => handleCopyCode('npm i @nexus/sdk', setCopiedNpm)}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-slate-300 hover:text-white transition-all cursor-pointer text-xs font-mono"
              title="Click to copy npm install command"
            >
              <span className="text-indigo-400 font-bold">$</span>
              <span>npm i @nexus/sdk</span>
              {copiedNpm ? (
                <Check size={13} className="text-emerald-400" />
              ) : (
                <Copy size={13} className="text-slate-500" />
              )}
            </div>
          </div>
        </div>

        {/* 3. PLATFORM METRICS BANNER (4 Columns) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 border-t border-white/[0.08] mt-16">
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">99.99%</div>
            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">uptime</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">87ms</div>
            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">p50 latency</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">128k</div>
            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">context</div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono tracking-tight">4.8B</div>
            <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">tokens / day</div>
          </div>
        </div>
      </section>

      {/* 4. ANALYTICS TELEMETRY CARDS (4 Cards) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="p-5 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-white/[0.15] transition-all">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Requests / Day</div>
            <div className="text-3xl font-bold text-white font-mono mt-2">2.4M</div>
            <div className="text-xs font-mono text-emerald-400 mt-2 flex items-center gap-1">
              <span>+12%</span>
              <span className="text-slate-500">vs last week</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-white/[0.15] transition-all">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">P50 Latency</div>
            <div className="text-3xl font-bold text-white font-mono mt-2">87ms</div>
            <div className="text-xs font-mono text-emerald-400 mt-2 flex items-center gap-1">
              <span>-8ms</span>
              <span className="text-slate-500">vs last week</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-white/[0.15] transition-all">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Tokens / Day</div>
            <div className="text-3xl font-bold text-white font-mono mt-2">4.8B</div>
            <div className="text-xs font-mono text-emerald-400 mt-2 flex items-center gap-1">
              <span>+31%</span>
              <span className="text-slate-500">vs last week</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-white/[0.15] transition-all">
            <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Error Rate</div>
            <div className="text-3xl font-bold text-white font-mono mt-2">0.04%</div>
            <div className="text-xs font-mono text-rose-400 mt-2 flex items-center gap-1">
              <span>+0.01%</span>
              <span className="text-slate-500">vs last week</span>
            </div>
          </div>

        </div>
      </section>

      {/* 5. INTERACTIVE SENIOR DEV PLAYGROUND (VERSION 5 CORE) */}
      <section id="playground-window" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* macOS Window Frame Container */}
        <div className="rounded-2xl border border-white/[0.1] bg-[#121318] shadow-2xl overflow-hidden">
          
          {/* Window Header */}
          <div className="px-4 py-3 bg-[#0d0e12] border-b border-white/[0.08] flex items-center justify-between">
            {/* macOS Dots */}
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
              <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
              <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
              
              {/* Window Tabs */}
              <div className="ml-4 flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveWindowTab('playground')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                    activeWindowTab === 'playground'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  playground
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWindowTab('logs')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                    activeWindowTab === 'logs'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  logs
                </button>
                <button
                  type="button"
                  onClick={() => setActiveWindowTab('models')}
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-colors ${
                    activeWindowTab === 'models'
                      ? 'bg-white/[0.08] text-white font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  models
                </button>
              </div>
            </div>

            {/* Live Indicator */}
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-mono text-emerald-400 font-medium">live</span>
            </div>
          </div>

          {/* Window Body: Chat Canvas (Left) + Model & Parameter Controls (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
            
            {/* Left: Chat Canvas & Input Bar (8 cols) */}
            <div className="lg:col-span-8 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-white/[0.08] bg-[#0a0a0c]/60">
              
              {/* Top Sub-Bar: Animated Multi-Agent Pipeline Row (Figma Version 5 Spec) */}
              <div className="px-6 py-3 border-b border-white/[0.06] bg-[#0c0d12]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
                    Multi-Agent Pipeline Orchestration
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">
                    {isProcessing ? 'Status: Active Execution' : 'Status: Ready'}
                  </span>
                </div>

                {/* Animated Pipeline Stage Flow */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 text-xs font-mono">
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const stepNum = idx + 1;
                    const isActive = pipelineStep === stepNum;
                    const isDone = pipelineStep > stepNum || (!isProcessing && pipelineStep === 0 && messages.length > 1);

                    return (
                      <React.Fragment key={stage.id}>
                        <div
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border transition-all duration-200 whitespace-nowrap ${
                            isActive
                              ? 'pipeline-node-active animate-pulse'
                              : isDone
                              ? 'pipeline-node-done'
                              : 'pipeline-node-pending'
                          }`}
                        >
                          <span className="text-[11px]">
                            {isActive ? '●' : isDone ? '✓' : '○'}
                          </span>
                          <span>{stage.name}</span>
                        </div>
                        {idx < PIPELINE_STAGES.length - 1 && (
                          <span className="text-slate-600 text-xs select-none">→</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {/* Chat Thread Messages */}
              <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[460px]">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      /* User Bubble: Dim Indigo, Right-aligned */
                      <div className="max-w-xl rounded-xl px-4 py-3 bg-[#1e1b4b]/70 border border-indigo-500/30 text-indigo-100 text-sm leading-relaxed shadow-lg">
                        {msg.content}
                      </div>
                    ) : (
                      /* AI Bubble: Left-aligned with Gradient Sparkle Avatar */
                      <div className="max-w-2xl flex items-start gap-3.5">
                        {/* Gradient Sparkle Avatar */}
                        <div className="h-7 w-7 shrink-0 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 mt-0.5">
                          <Sparkles size={14} className="text-white" />
                        </div>

                        {/* Content Body */}
                        <div className="space-y-3">
                          <div className="rounded-xl p-4 bg-[#121318] border border-white/[0.08] text-slate-200 text-sm leading-relaxed shadow-lg">
                            {!msg.content && msg.isStreaming ? (
                              <div className="flex items-center gap-2 py-1">
                                <div className="thinking-dot" />
                                <div className="thinking-dot" />
                                <div className="thinking-dot" />
                                <span className="text-xs font-mono text-slate-400 ml-2">Reasoning...</span>
                              </div>
                            ) : (
                              <div className="whitespace-pre-wrap font-sans">
                                {msg.content}
                                {msg.isStreaming && (
                                  <span className="blinking-cursor" />
                                )}
                              </div>
                            )}
                          </div>

                          {/* Source Evidence Pills in Cyan JetBrains Mono (Figma Version 5 Spec) */}
                          {msg.evidence && msg.evidence.length > 0 && !msg.isStreaming && (
                            <div className="flex flex-wrap items-center gap-2 pt-1">
                              <span className="text-[11px] font-mono text-slate-500">
                                Grounding Evidence:
                              </span>
                              {msg.evidence.map((ev, i) => (
                                <span key={i} className="evidence-pill">
                                  <Terminal size={11} />
                                  <span>{ev}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatScrollRef} />
              </div>

              {/* Floating Input Bar (Figma Version 5 Spec) */}
              <div className="p-4 border-t border-white/[0.08] bg-[#0c0d12]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="rounded-xl bg-[#121318] border border-white/[0.1] p-2 flex items-center gap-3 indigo-focus-glow"
                >
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Message nexus..."
                    className="flex-1 bg-transparent border-none outline-none px-3 text-sm text-slate-100 placeholder-slate-500 font-sans"
                    disabled={isProcessing}
                  />

                  {/* Keyboard shortcut badge */}
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-slate-400 select-none">
                    ⏎
                  </kbd>

                  {/* Gradient Send Button */}
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isProcessing}
                    className="px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-medium text-xs shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5"
                  >
                    <span>Send</span>
                    <Send size={12} />
                  </button>
                </form>
              </div>

            </div>

            {/* Right: Model Selection & Runtime Parameters (4 cols) */}
            <div className="lg:col-span-4 p-6 bg-[#0e0f14] space-y-6">
              
              {/* MODEL SELECTOR */}
              <div className="space-y-3">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Model
                </div>
                <div className="space-y-2">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => setSelectedModel(model.id)}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        selectedModel === model.id
                          ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-md'
                          : 'bg-white/[0.02] border-white/[0.06] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            selectedModel === model.id ? 'bg-emerald-400' : 'bg-slate-600'
                          }`}
                        />
                        <span className="font-mono text-xs font-semibold">{model.name}</span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-500">{model.latency}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* PARAMETERS SLIDERS */}
              <div className="space-y-4 pt-4 border-t border-white/[0.08]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400">
                  Parameters
                </div>

                {/* Temperature */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">temperature</span>
                    <span className="text-white">{temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Max Tokens */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">max_tokens</span>
                    <span className="text-white">{maxTokens.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="512"
                    max="8192"
                    step="256"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Top P */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">top_p</span>
                    <span className="text-white">{topP}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={topP}
                    onChange={(e) => setTopP(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-white/[0.1] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                {/* Stream Toggle */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs font-mono text-slate-400">stream</span>
                  <button
                    type="button"
                    onClick={() => setStreamEnabled(!streamEnabled)}
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                      streamEnabled ? 'bg-indigo-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        streamEnabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Token Meter Gauge */}
                <div className="space-y-2 pt-3 border-t border-white/[0.06]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">tokens</span>
                    <span className="text-slate-300">4 891 / 128k</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 w-[14%] rounded-full" />
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 6. SDK QUICKSTART CODE SECTION */}
      <section id="sdk-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          {/* Left Text */}
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-semibold">
              SDK
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Five lines from <br />zero to production.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              The SDK handles auth, retries, streaming, rate-limit back-off, and type safety. You write the logic.
            </p>

            <div className="pt-2 space-y-2 text-xs font-mono text-slate-400">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Automated HTTP/2 persistent connection pooling</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Zero-copy chunked streaming response iterator</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>Fully typed TypeScript & Python definitions</span>
              </div>
            </div>
          </div>

          {/* Right Code Window */}
          <div className="lg:col-span-7">
            <div className="rounded-xl border border-white/[0.1] bg-[#121318] shadow-2xl overflow-hidden">
              
              {/* Terminal Titlebar */}
              <div className="px-4 py-3 bg-[#0d0e12] border-b border-white/[0.08] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f]" />
                  <span className="ml-3 text-xs font-mono text-slate-400">
                    quickstart.{activeCodeLang === 'TypeScript' ? 'ts' : activeCodeLang === 'Python' ? 'py' : activeCodeLang === 'Go' ? 'go' : 'rs'}
                  </span>
                </div>

                {/* Language Switcher Tabs */}
                <div className="flex items-center gap-1">
                  {['TypeScript', 'Python', 'Go', 'Rust'].map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => setActiveCodeLang(lang)}
                      className={`px-2.5 py-1 rounded text-xs font-mono transition-colors cursor-pointer ${
                        activeCodeLang === lang
                          ? 'bg-white/[0.1] text-white font-medium'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                  
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopyCode(CODE_SNIPPETS[activeCodeLang], setCopiedCode)}
                    className="ml-2 p-1.5 rounded hover:bg-white/[0.08] text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy code"
                  >
                    {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {/* Code Editor Body */}
              <div className="p-5 font-mono text-xs sm:text-sm text-slate-200 leading-relaxed overflow-x-auto bg-[#0a0a0c]">
                <pre className="text-slate-300">
                  <code>{CODE_SNIPPETS[activeCodeLang]}</code>
                </pre>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 7. FEATURES GRID ("Built for the entire stack.") */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.08]">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Built for the entire stack.
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            From edge functions to long-running pipelines — one API, no footguns.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="p-6 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-indigo-500/40 transition-all space-y-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Zap size={18} />
            </div>
            <div className="text-base font-bold text-white font-sans">Sub-100ms p50, every region</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Distributed GPU pools across 14 regions with anycast routing ensure hot-path execution with zero cold-starts.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-indigo-500/40 transition-all space-y-3">
            <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Database size={18} />
            </div>
            <div className="text-base font-bold text-white font-sans">128 000-token windows</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Full abstract syntax trees, graph structures, and codebases ingested in a single call with sliding-window attention.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-indigo-500/40 transition-all space-y-3">
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <Shield size={18} />
            </div>
            <div className="text-base font-bold text-white font-sans">Zero-trust by default</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              SOC 2 Type II certified. Zero data retention policies, ephemeral sandboxes, and hardware-level encryption at rest.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#121318] border border-white/[0.08] hover:border-indigo-500/40 transition-all space-y-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Code size={18} />
            </div>
            <div className="text-base font-bold text-white font-sans">SDK in four languages</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Official bindings for TypeScript, Python, Go, and Rust. Fully compatible with standard OpenAI REST endpoints.
            </p>
          </div>

        </div>

        {/* Live Terminal cURL Preview */}
        <div className="mt-8 rounded-xl border border-white/[0.1] bg-[#0c0d12] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3 text-slate-400 overflow-x-auto">
            <span className="text-indigo-400 font-bold">$</span>
            <span className="text-slate-200">curl https://api.nexus.ai/v1/chat -H "Authorization: Bearer $NEXUS_KEY" -d '&#123;"model":"nexus-3","stream":true&#125;'</span>
          </div>
          <button
            type="button"
            onClick={() => handleCopyCode('curl https://api.nexus.ai/v1/chat -H "Authorization: Bearer $NEXUS_KEY" -d \'{"model":"nexus-3","stream":true}\'', setCopiedCurl)}
            className="px-3 py-1.5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            {copiedCurl ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>Copy cURL</span>
          </button>
        </div>
      </section>

      {/* 8. PRICING SECTION ("Pricing that scales with you.") */}
      <section id="pricing-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-white/[0.08]">
        <div className="max-w-2xl mb-12">
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Pricing that scales with you.
          </h2>
          <p className="text-slate-400 text-sm mt-2">
            No surprise overages. Upgrade or downgrade any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Tier 1: Hobby */}
          <div className="p-6 rounded-2xl bg-[#121318] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-lg font-bold text-white">Hobby</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono">$0</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400">For side projects, experimentation, and early prototyping.</p>
              
              <ul className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>1M tokens / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>nexus-3-fast model only</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Community Discord support</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>REST API + SDK access</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Start for free
            </button>
          </div>

          {/* Tier 2: Pro (Recommended) */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-b from-[#191924] to-[#121318] border-2 border-indigo-500/80 shadow-2xl shadow-indigo-500/15 flex flex-col justify-between space-y-6">
            <div className="absolute -top-3 right-6 px-2.5 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-mono uppercase tracking-wider font-semibold">
              Most Popular
            </div>

            <div className="space-y-4">
              <div className="text-lg font-bold text-white">Pro</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono">$49</span>
                <span className="text-xs text-slate-400">/ month</span>
              </div>
              <p className="text-xs text-slate-400">For fast-growing engineering teams shipping high-volume AI.</p>
              
              <ul className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>50M tokens / month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>All models (including nexus-3)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Priority GPU routing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Streaming + Webhooks</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Email & private Slack support</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/30 transition-colors cursor-pointer"
            >
              Start trial
            </button>
          </div>

          {/* Tier 3: Enterprise */}
          <div className="p-6 rounded-2xl bg-[#121318] border border-white/[0.08] flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="text-lg font-bold text-white">Enterprise</div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold text-white font-mono">Custom</span>
              </div>
              <p className="text-xs text-slate-400">Dedicated GPU infrastructure and custom model fine-tuning.</p>
              
              <ul className="space-y-2.5 pt-4 border-t border-white/[0.06] text-xs text-slate-300 font-mono">
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Unlimited tokens</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Private VPC deployment</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>99.99% uptime SLA</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>Dedicated infrastructure</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check size={13} className="text-emerald-400" />
                  <span>24/7 on-call engineer</span>
                </li>
              </ul>
            </div>

            <button
              type="button"
              className="w-full py-2.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.1] text-white font-medium text-xs transition-colors cursor-pointer"
            >
              Contact sales
            </button>
          </div>

        </div>
      </section>

      {/* 9. SENIOR DEV FOOTER */}
      <footer className="border-t border-white/[0.08] bg-[#08080a] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-[10px] font-mono font-bold text-white">N</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              © 2026 Nexus AI Systems Inc. All rights reserved.
            </span>
          </div>

          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#privacy" className="hover:text-slate-200 transition-colors">Privacy</a>
            <a href="#terms" className="hover:text-slate-200 transition-colors">Terms</a>
            <a href="#status" className="hover:text-slate-200 transition-colors">Status</a>
            <a href="#docs" className="hover:text-slate-200 transition-colors">Docs</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-200 transition-colors">GitHub</a>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>all systems nominal</span>
          </div>

        </div>
      </footer>

    </div>
  );
}

export default NexusSeniorDevView;
