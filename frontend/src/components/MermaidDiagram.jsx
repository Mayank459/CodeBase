import React, { useEffect, useState } from 'react';

// Diagrams render in the browser with the bundled mermaid package. They used to
// be <img> tags pointing at mermaid.ink with the whole diagram base64-encoded in
// the URL, which fails with "414 Request-URI Too Large" for any sizeable repo.

let mermaidReady = null;
let seq = 0;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: 'base',
        // SVG <text> labels instead of HTML in <foreignObject>: required for PNG
        // export, since foreignObject taints the canvas.
        htmlLabels: false,
        flowchart: { htmlLabels: false, curve: 'basis' },
        themeVariables: {
          fontFamily: '"Archivo Narrow", system-ui, sans-serif',
          fontSize: '14px',
          background: '#fbf8f2',
          primaryColor: '#f2ece1',
          primaryTextColor: '#2a2724',
          primaryBorderColor: '#2a2724',
          secondaryColor: '#e8e0d2',
          tertiaryColor: '#fbf8f2',
          lineColor: '#4a443d',
          clusterBkg: '#fbf8f2',
          clusterBorder: '#6b645b',
          edgeLabelBackground: '#e8e0d2',
        },
      });
      return mermaid;
    });
  }
  return mermaidReady;
}

export async function renderMermaidSvg(code) {
  const mermaid = await loadMermaid();
  seq += 1;
  const { svg } = await mermaid.render(`cb-mermaid-${seq}`, (code || '').trim());
  return svg;
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadMermaidSvg(code, filename) {
  const svg = await renderMermaidSvg(code);
  saveBlob(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), filename);
}

export async function downloadMermaidPng(code, filename, scale = 2) {
  const svg = await renderMermaidSvg(code);
  const doc = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
  const box = doc.viewBox?.baseVal;
  const width = Math.ceil(box?.width || parseFloat(doc.getAttribute('width')) || 1200);
  const height = Math.ceil(box?.height || parseFloat(doc.getAttribute('height')) || 800);
  doc.setAttribute('width', width);
  doc.setAttribute('height', height);
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(doc))}`;
  const img = new Image();
  await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; img.src = src; });
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fbf8f2';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob) saveBlob(blob, filename);
}

export function MermaidDiagram({ code, className = '', label = 'Diagram', onError }) {
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    let alive = true;
    setError(null);
    if (!code) { setSvg(''); return undefined; }
    renderMermaidSvg(code)
      .then((out) => { if (alive) setSvg(out); })
      .catch((err) => {
        if (!alive) return;
        setSvg('');
        setError(err?.message || String(err));
        if (onError) onError(err);
      });
    return () => { alive = false; };
  }, [code]);

  if (error) {
    return (
      <div className="paper-flat p-4 max-w-lg text-sm" role="alert">
        <p className="text-crimson font-bold">This diagram could not be drawn</p>
        <p className="mt-1 text-ink-2">The Mermaid source has a syntax problem. Open the Source view to see it, or try Live to edit it.</p>
        <p className="mt-2 font-mono text-[12px] text-ash break-words">{error.split('\n')[0].slice(0, 200)}</p>
      </div>
    );
  }
  if (!svg) {
    return (
      <div className="flex items-center gap-3 text-sm text-ink-2" aria-live="polite">
        <span className="flex items-end gap-1" aria-hidden="true"><span className="thinking-dot" /><span className="thinking-dot" /><span className="thinking-dot" /></span>
        Drawing the diagram…
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={label}
      className={`mermaid-inline ${className}`}
      // mermaid output is sanitised by securityLevel: 'strict'
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default MermaidDiagram;
