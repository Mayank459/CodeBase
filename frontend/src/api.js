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

      for (const block of parts) {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) continue;

        // An SSE event can contain multiple "data: " lines or raw multi-line chunks
        const lines = trimmedBlock.split('\n');
        let blockData = '';
        let isStatusMessage = false;

        for (const line of lines) {
          let raw = line;
          if (raw.startsWith('data:')) {
            raw = raw.replace(/^data:\s?/, '');
          }

          const trimmedRaw = raw.trim();
          // Check for explicit pipeline status tags vs markdown/mermaid tokens
          const isPipelineTag = /^\[(router|retriever|vector|graph|agent|llm|validator|progress|indexer|status)[\w\s:-]*\]/i.test(trimmedRaw);
          const isProgressStatus = /^(Scanning repository|Building graph|Architecture analysis|Generating answer|Synthesizing|Indexing)/i.test(trimmedRaw);

          if (isPipelineTag || isProgressStatus) {
            isStatusMessage = true;
            onStatus && onStatus(trimmedRaw);
          } else if (raw !== undefined) {
            blockData += (blockData ? '\n' : '') + raw;
          }
        }

        if (!isStatusMessage && blockData) {
          accumulatedAnswer += (accumulatedAnswer ? '\n' : '') + blockData;
          onToken && onToken(blockData, accumulatedAnswer);
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

  // Normalize line endings
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const codeBlockMatch = text.match(/```(?:mermaid|flowchart|diagram)?\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  } else {
    // If not closed by ```, check if it starts with ```mermaid
    const unclosedMatch = text.match(/```(?:mermaid|flowchart|diagram)?\s*([\s\S]*)$/i);
    if (unclosedMatch) {
      text = unclosedMatch[1].trim();
    }
  }

  const keywords = [
    'classDiagram', 'classDiagram-v2', 'graph ', 'graph\n', 'flowchart',
    'sequenceDiagram', 'stateDiagram', 'erDiagram', 'journey', 'gantt',
    'pie', 'mindmap', 'gitGraph', 'timeline', 'C4Context'
  ];

  // Filter out any lines after mermaid block (e.g. if markdown headers are included)
  const rawLines = text.split('\n');
  const cleanLines = [];
  let foundStart = false;

  for (let line of rawLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (!foundStart) {
      if (keywords.some(k => trimmed.startsWith(k))) {
        foundStart = true;
        cleanLines.push(trimmed);
      }
      continue;
    }

    // Stop if a markdown header or section separator is encountered
    if (/^#{1,6}\s+/.test(trimmed) || trimmed.startsWith('---') || trimmed.startsWith('***')) {
      break;
    }

    // Skip ellipses, truncation indicators, or bullet points without arrows
    if (/^(\.{3,}|…|etc\.?)$/.test(trimmed)) continue;
    if (/^[-*]\s+/.test(trimmed) && !trimmed.includes('-->') && !trimmed.includes('---')) continue;

    cleanLines.push(line);
  }

  if (!foundStart || cleanLines.length === 0) {
    // Fallback: check if the first line itself was a keyword
    const firstLine = text.split('\n')[0].trim();
    if (keywords.some(k => firstLine.startsWith(k))) {
      return text;
    }
    return null;
  }

  let result = cleanLines.join('\n');

  // Sanitize flowchart node labels
  if (result.startsWith('graph ') || result.startsWith('flowchart')) {
    const lines = result.split('\n').map((line) => {
      let l = line.trimEnd();
      l = l.replace(/;+$/, '');
      // Ensure node labels with brackets are safely quoted: A[label] -> A["label"]
      l = l.replace(/(\b[A-Za-z0-9_]+)\[([^"\]\n]+)\]/g, (match, id, content) => {
        const cleaned = content.replace(/"/g, "'").trim();
        return `${id}["${cleaned}"]`;
      });
      return l;
    });
    result = lines.join('\n');
  }

  return result;
}
