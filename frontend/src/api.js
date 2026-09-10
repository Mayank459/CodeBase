/**
 * CodeBase Intelligence API Client
 * Connects to the FastAPI backend (deployed on Render or local via Vite reverse proxy)
 */

export function getApiBase() {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('codebase_api_base');
    if (saved) return saved.replace(/\/+$/, '');
    
    // When running locally in Vite dev server, default to /api-proxy
    // which forwards directly to https://codebase-ys83.onrender.com without browser CORS restrictions
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api-proxy';
    }
  }
  return (import.meta.env.VITE_API_BASE || 'https://codebase-ys83.onrender.com').replace(/\/+$/, '');
}

export function setApiBase(url) {
  if (typeof window !== 'undefined') {
    if (!url) {
      localStorage.removeItem('codebase_api_base');
    } else {
      localStorage.setItem('codebase_api_base', url.trim().replace(/\/+$/, ''));
    }
  }
}

/**
 * Standard JSON POST request
 */
export async function apiPost(endpoint, payload = {}, timeoutMs = 120000) {
  const base = getApiBase();
  const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  const url = `${base}${path}`;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!res.ok) {
      let errorMsg = `HTTP Error ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) errorMsg = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        else if (errorJson.error) errorMsg = errorJson.error;
      } catch (_) {}
      return { error: errorMsg };
    }

    return await res.json();
  } catch (err) {
    clearTimeout(id);
    if (err.name === 'AbortError') {
      return { error: 'Request timed out after 120s. Backend operation might still be processing.' };
    }
    return { error: err.message || 'Failed to connect to backend' };
  }
}

/**
 * GET request with latency measurement
 */
export async function checkBackendHealth() {
  const base = getApiBase();
  const start = performance.now();
  try {
    const res = await fetch(`${base}/`, { method: 'GET', signal: AbortSignal.timeout(10000) });
    const latency = Math.round(performance.now() - start);
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { online: true, latency, message: data.message || 'Online' };
    }
    return { online: false, latency, error: `HTTP ${res.status}` };
  } catch (err) {
    const latency = Math.round(performance.now() - start);
    return { online: false, latency, error: err.message || 'Offline' };
  }
}

/**
 * Stream SSE events from /repository/index-stream or /repository/reindex-stream
 */
export async function streamIndexRepo({ repoUrl, force = false, onEvent, onError, onComplete }) {
  const base = getApiBase();
  const endpoint = force ? '/repository/reindex-stream' : '/repository/index-stream';
  const url = `${base}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_url: repoUrl, force }),
    });

    if (!response.ok) {
      throw new Error(`Indexing failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete trailing chunk

      for (const block of lines) {
        const trimmed = block.trim();
        if (!trimmed) continue;
        const dataPrefix = 'data: ';
        if (trimmed.startsWith(dataPrefix)) {
          const raw = trimmed.slice(dataPrefix.length);
          try {
            const event = JSON.parse(raw);
            onEvent && onEvent(event);
            if (event.step === 'done') {
              onComplete && onComplete(event);
            } else if (event.step === 'error') {
              onError && onError(event.message || 'Indexing error occurred');
            }
          } catch (jsonErr) {
            onEvent && onEvent({ step: 'log', message: raw });
          }
        }
      }
    }
  } catch (err) {
    onError && onError(err.message);
  }
}

/**
 * Stream conversational tokens from /agent/chat-stream
 */
export async function streamChatAgent({
  repoName,
  question,
  history = [],
  threadId = '',
  onToken,
  onStatus,
  onComplete,
  onError,
}) {
  const base = getApiBase();
  const url = `${base}/agent/chat-stream`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repository_name: repoName,
        question,
        history,
        thread_id: threadId || `chat-${Date.now()}`,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat stream failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let accumulatedAnswer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop() || '';

      for (const part of parts) {
        const trimmed = part.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith('data: ')) {
          const raw = trimmed.slice(6);
          // Check for status messages vs token stream
          if (raw.startsWith('[') && raw.includes(']')) {
            onStatus && onStatus(raw);
          } else {
            accumulatedAnswer += raw;
            onToken && onToken(raw, accumulatedAnswer);
          }
        }
      }
    }

    onComplete && onComplete(accumulatedAnswer);
    return accumulatedAnswer;
  } catch (err) {
    onError && onError(err.message || 'Error streaming chat response');
    throw err;
  }
}

/**
 * Fetch debug search info (semantic payloads + graph context) for grounding
 */
export async function fetchDebugSearch(repoName, question) {
  return await apiPost('/repository/debug-search', {
    repository_name: repoName,
    question,
  });
}

/**
 * Generate a Mermaid Live Editor URL
 */
export function getMermaidLiveUrl(code) {
  try {
    const state = {
      code: code.trim(),
      mermaid: JSON.stringify({ theme: 'dark' }),
      autoSync: true,
      updateDiagram: true,
    };
    const jsonStr = JSON.stringify(state);
    const b64 = btoa(unescape(encodeURIComponent(jsonStr)));
    return `https://mermaid.live/edit#base64:${b64}`;
  } catch (err) {
    return `https://mermaid.live/edit`;
  }
}

/**
 * Clean extract of Mermaid code
 */
export function extractMermaidCode(rawText) {
  if (!rawText) return null;
  let text = String(rawText).trim();

  const codeBlockMatch = text.match(/```(?:mermaid)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }

  const keywords = [
    'classDiagram', 'classDiagram-v2', 'graph ', 'graph\n', 'flowchart',
    'sequenceDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt',
    'pie', 'mindmap', 'gitGraph', 'timeline', 'C4Context'
  ];

  const firstLine = text.split('\n')[0].trim();
  if (keywords.some(k => firstLine.startsWith(k))) {
    // Sanitize flowchart node labels with inner square brackets, angle brackets, and quotes
    if (text.startsWith('graph ') || text.startsWith('flowchart')) {
      const cleanLabel = (labelContent) => {
        let s = labelContent.trim();
        if (s.startsWith('"') && s.endsWith('"')) {
          s = s.slice(1, -1);
        }
        s = s.replace(/\\"/g, "'").replace(/"/g, "'");
        s = s.replace(/\[/g, '#91;').replace(/\]/g, '#93;');
        s = s.replace(/</g, '#lt;').replace(/>/g, '#gt;');
        return `["${s}"]`;
      };

      const lines = text.split('\n').map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('graph') || trimmed.startsWith('flowchart')) {
          return line;
        }
        const m = trimmed.match(/^(n\d+)\[(.*)\]\s*(-->)\s*(n\d+)\[(.*)\]$/);
        if (m) {
          const [, id1, l1, arrow, id2, l2] = m;
          return `${id1}${cleanLabel(l1)} ${arrow} ${id2}${cleanLabel(l2)}`;
        }
        return line;
      });
      text = lines.join('\n');
    }
    return text;
  }
  return null;
}
