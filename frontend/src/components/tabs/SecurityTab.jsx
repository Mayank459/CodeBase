import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, ShieldCheck, Wrench, AlertTriangle, Play, ArrowRight, 
  Search, Filter, CheckCircle2, FileCode, ExternalLink, Zap, Shield, Bug
} from 'lucide-react';
import { apiPost } from '../../api';
import { MarkdownView } from '../MarkdownView';

export function SecurityTab({ activeRepo, onNavigateToPr }) {
  const [loadingScan, setLoadingScan] = useState(false);
  const [loadingFixes, setLoadingFixes] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'markdown'

  const handleScan = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion bar.');
      return;
    }
    setLoadingScan(true);
    setError(null);
    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: 'run a comprehensive security audit detecting hardcoded secrets, SQL injections, insecure deserialization, and dangerous execution patterns with exact file paths and line numbers.'
      });
      setScanResult({
        type: 'audit',
        content: res.answer || res.error || 'No audit details returned.'
      });
    } catch (err) {
      setError(err.message || 'Security scan failed.');
    } finally {
      setLoadingScan(false);
    }
  };

  const handleFixes = async () => {
    if (!activeRepo) {
      setError('Please index a repository first using the ingestion bar.');
      return;
    }
    setLoadingFixes(true);
    setError(null);
    try {
      const res = await apiPost('/agent/chat', {
        repository_name: activeRepo,
        question: 'generate security remediation patches and proposed fixes for all detected vulnerabilities'
      });
      setScanResult({
        type: 'fixes',
        content: res.answer || res.error || 'No fix suggestions returned.'
      });
    } catch (err) {
      setError(err.message || 'Remediation generation failed.');
    } finally {
      setLoadingFixes(false);
    }
  };

  // Parse structured finding items from the audit markdown text
  const parsedFindings = useMemo(() => {
    if (!scanResult?.content) return [];

    const text = scanResult.content;
    const findings = [];

    // Match markdown sections or bullet items
    const sections = text.split(/(?=###?\s+|\d+\.\s+\*\*)/);

    sections.forEach((sec, idx) => {
      const trimmed = sec.trim();
      if (!trimmed || trimmed.length < 20) return;

      let severity = 'MEDIUM';
      if (/critical/i.test(trimmed)) severity = 'CRITICAL';
      else if (/high/i.test(trimmed)) severity = 'HIGH';
      else if (/low/i.test(trimmed) || /info/i.test(trimmed)) severity = 'LOW';

      // Extract file reference (e.g. app/core/config.py:42 or file.py)
      const fileMatch = trimmed.match(/([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+(?::\d+)?)/);
      const file = fileMatch ? fileMatch[1] : 'repository/source';

      // Extract title
      const titleMatch = trimmed.match(/(?:###?\s*|\*\*|^\d+\.\s*)([^\n\*#]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `Security Finding #${idx + 1}`;

      // Extract code block snippet if present
      const codeMatch = trimmed.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
      const snippet = codeMatch ? codeMatch[1].trim() : null;

      findings.push({
        id: idx + 1,
        title,
        severity,
        file,
        snippet,
        rawText: trimmed,
      });
    });

    // Fallback if regex split found nothing
    if (findings.length === 0 && text.length > 50) {
      findings.push({
        id: 1,
        title: 'General Security Audit Summary',
        severity: 'MEDIUM',
        file: activeRepo || 'Repository Root',
        snippet: null,
        rawText: text,
      });
    }

    return findings;
  }, [scanResult, activeRepo]);

  // Compute overall security score (0 - 100)
  const { score, criticalCount, highCount, mediumCount, lowCount, grade } = useMemo(() => {
    if (!scanResult) {
      return { score: 92, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, grade: 'A' };
    }

    let crit = 0, high = 0, med = 0, low = 0;
    parsedFindings.forEach((f) => {
      if (f.severity === 'CRITICAL') crit++;
      else if (f.severity === 'HIGH') high++;
      else if (f.severity === 'MEDIUM') med++;
      else low++;
    });

    let calculated = 100 - (crit * 25 + high * 15 + med * 8 + low * 3);
    calculated = Math.max(calculated, 35);

    let g = 'A+';
    if (calculated < 60) g = 'D (High Risk)';
    else if (calculated < 75) g = 'C (Moderate Risk)';
    else if (calculated < 90) g = 'B (Good)';

    return {
      score: calculated,
      criticalCount: crit,
      highCount: high,
      mediumCount: med,
      lowCount: low,
      grade: g,
    };
  }, [scanResult, parsedFindings]);

  // Filtered findings based on search and severity tag
  const filteredFindings = useMemo(() => {
    return parsedFindings.filter((f) => {
      const matchesSeverity = selectedSeverity === 'ALL' || f.severity === selectedSeverity;
      const matchesSearch = 
        !searchQuery.trim() ||
        f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.file.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.rawText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [parsedFindings, selectedSeverity, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="glass-panel p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert size={20} className="text-rose-400" />
              <h3 className="text-base font-semibold text-white">Security Command Center</h3>
              <span className="badge badge-warning text-[10px]">Static AST + Vulnerability Scanner</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Scans AST call sinks and tokens for hardcoded secrets, SQL injection risks, and CVE patterns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleScan}
              disabled={loadingScan || loadingFixes || !activeRepo}
              className="btn btn-secondary gap-2 text-xs"
            >
              {loadingScan ? (
                <>
                  <ShieldAlert size={14} className="animate-spin text-rose-400" />
                  <span>Auditing Codebase...</span>
                </>
              ) : (
                <>
                  <Shield size={14} className="text-rose-400" />
                  <span>Run Security Audit</span>
                </>
              )}
            </button>

            <button
              onClick={handleFixes}
              disabled={loadingScan || loadingFixes || !activeRepo}
              className="btn btn-primary gap-2 text-xs shadow-lg shadow-indigo-500/20"
            >
              {loadingFixes ? (
                <>
                  <Wrench size={14} className="animate-spin" />
                  <span>Formulating Fixes...</span>
                </>
              ) : (
                <>
                  <Wrench size={14} />
                  <span>Generate Fixes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Health Score & Severity Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {/* Score Dial Tile */}
        <div className="sm:col-span-2 glass-panel p-5 flex items-center justify-between border-white/[0.08]">
          <div className="space-y-1">
            <span className="metric-label">Security Health Index</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-extrabold font-mono ${
                score >= 85 ? 'text-emerald-400' : score >= 70 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {scanResult ? `${score}/100` : '-- / 100'}
              </span>
              <span className="text-xs font-mono text-slate-400">
                {scanResult ? grade : 'Pending Scan'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              {scanResult ? 'Weighted score derived from AST vulnerability severity.' : 'Run a security scan to calculate health.'}
            </p>
          </div>

          <div className={`h-16 w-16 rounded-full border-4 flex items-center justify-center font-mono font-bold text-sm ${
            score >= 85 
              ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' 
              : score >= 70
              ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
              : 'border-rose-500/50 bg-rose-500/10 text-rose-300'
          }`}>
            {score}%
          </div>
        </div>

        {/* Severity Counters */}
        <div className="sm:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div 
            onClick={() => setSelectedSeverity('CRITICAL')}
            className={`metric-tile cursor-pointer transition-all ${
              selectedSeverity === 'CRITICAL' ? 'border-rose-500 bg-rose-500/10' : ''
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-rose-400 font-bold">Critical</span>
            <div className="text-2xl font-bold font-mono text-rose-400 mt-1">{criticalCount}</div>
          </div>

          <div 
            onClick={() => setSelectedSeverity('HIGH')}
            className={`metric-tile cursor-pointer transition-all ${
              selectedSeverity === 'HIGH' ? 'border-amber-500 bg-amber-500/10' : ''
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">High</span>
            <div className="text-2xl font-bold font-mono text-amber-400 mt-1">{highCount}</div>
          </div>

          <div 
            onClick={() => setSelectedSeverity('MEDIUM')}
            className={`metric-tile cursor-pointer transition-all ${
              selectedSeverity === 'MEDIUM' ? 'border-indigo-500 bg-indigo-500/10' : ''
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">Medium</span>
            <div className="text-2xl font-bold font-mono text-indigo-300 mt-1">{mediumCount}</div>
          </div>

          <div 
            onClick={() => setSelectedSeverity('LOW')}
            className={`metric-tile cursor-pointer transition-all ${
              selectedSeverity === 'LOW' ? 'border-emerald-500 bg-emerald-500/10' : ''
            }`}
          >
            <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">Low</span>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">{lowCount}</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      {scanResult && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Severity Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-mono mr-1">Filter:</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
                  selectedSeverity === sev
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                    : 'bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.06]'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          {/* Search Input & View Toggle */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search findings or files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field pl-8 py-1.5 text-xs font-mono"
              />
            </div>

            <div className="flex items-center rounded-lg border border-white/10 bg-white/[0.02] p-0.5 text-xs">
              <button
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Cards
              </button>
              <button
                onClick={() => setViewMode('markdown')}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  viewMode === 'markdown' ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {scanResult ? (
        viewMode === 'cards' ? (
          <div className="space-y-3.5">
            {filteredFindings.length > 0 ? (
              filteredFindings.map((finding) => {
                const isCrit = finding.severity === 'CRITICAL';
                const isHigh = finding.severity === 'HIGH';
                const isMed = finding.severity === 'MEDIUM';

                return (
                  <div
                    key={finding.id}
                    className={`glass-panel p-5 border-l-4 transition-all hover:border-white/20 ${
                      isCrit
                        ? 'border-l-rose-500 bg-rose-500/[0.02]'
                        : isHigh
                        ? 'border-l-amber-500 bg-amber-500/[0.02]'
                        : isMed
                        ? 'border-l-indigo-500'
                        : 'border-l-emerald-500'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isCrit
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : isHigh
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : isMed
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                          {finding.severity}
                        </span>

                        <h4 className="text-sm font-semibold text-white tracking-tight">
                          {finding.title}
                        </h4>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#070a12] border border-white/[0.08] text-[11px] font-mono text-slate-300">
                          <FileCode size={12} className="text-indigo-400 flex-shrink-0" />
                          <span className="truncate max-w-[200px]">{finding.file}</span>
                        </span>

                        <button
                          onClick={onNavigateToPr}
                          className="btn btn-primary btn-sm text-[11px] gap-1 px-2.5"
                          title="Open Pull Request workflow to remediate this finding"
                        >
                          <Zap size={11} className="text-cyan-300" />
                          <span>Fix with PR</span>
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 text-xs text-slate-300 leading-relaxed font-sans">
                      <MarkdownView content={finding.rawText} />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="glass-panel p-10 text-center text-slate-400 space-y-2">
                <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                <p className="text-sm font-semibold text-slate-200">No matching vulnerabilities</p>
                <p className="text-xs text-slate-500">
                  No issues matched severity filter "{selectedSeverity}" or search term "{searchQuery}".
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <span className="badge badge-warning">Raw Security Audit Transcript</span>
              <span className="text-xs font-mono text-slate-400">Target: {activeRepo}</span>
            </div>
            <MarkdownView content={scanResult.content} />
          </div>
        )
      ) : (
        /* Empty State */
        <div className="glass-panel p-12 text-center text-slate-400 space-y-3">
          <ShieldAlert size={40} className="mx-auto text-rose-400/50 mb-2" />
          <h4 className="text-sm font-semibold text-slate-200">No Security Scan Executed Yet</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Click <strong>"Run Security Audit"</strong> to scan {activeRepo || 'your repository'} for hardcoded credentials, SQL injection risks, unsafe functions, and vulnerability sinks.
          </p>
        </div>
      )}
    </div>
  );
}
