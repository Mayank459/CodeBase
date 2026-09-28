import React, { useState, useMemo } from 'react';
import { Wrench, Search, GitPullRequest, Shield } from 'lucide-react';
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

    // If report confirms 0 vulnerabilities or overall passed without issues:
    const isCleanPass = (
      (text.includes('PASSED (Grade A+)') || 
       text.includes('0 Vulnerabilities Detected') || 
       text.includes('0 security vulnerabilities') ||
       text.includes('passed all automated') ||
       text.includes('passed the security review')) &&
      !text.includes('ACTION REQUIRED') && 
      !text.includes('FAILED')
    );

    if (isCleanPass) {
      return [];
    }

    const findings = [];
    // Match finding blocks formatted like "### Finding #1: ...", "### Vulnerability #1: ...", or "**Finding #1:**"
    const blocks = text.split(/(?=###?\s*(?:Finding|Vulnerability|\d+\.)|\*\*Finding\s*#?\d+:)/i);

    blocks.forEach((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed || trimmed.length < 30) return;

      // Skip non-finding overview sections
      if (
        /executive summary/i.test(trimmed) || 
        /hardening roadmap/i.test(trimmed) || 
        /security control matrix/i.test(trimmed) ||
        /verified security/i.test(trimmed) ||
        /recommendations/i.test(trimmed) ||
        /conclusion/i.test(trimmed)
      ) {
        return;
      }

      // Must discuss an actual security issue
      if (!/finding|vulnerability|cwe|severity|risk/i.test(trimmed)) {
        return;
      }

      // Check if this finding was marked as a false positive
      const isFalsePositive = /false positive|no actual vulnerability|no risk/i.test(trimmed);

      let severity = 'MEDIUM';
      if (/\[CRITICAL\]|\bseverity:\s*\*?critical\b/i.test(trimmed)) severity = 'CRITICAL';
      else if (/\[HIGH\]|\bseverity:\s*\*?high\b/i.test(trimmed)) severity = 'HIGH';
      else if (/\[LOW\]|\bseverity:\s*\*?low\b/i.test(trimmed)) severity = 'LOW';
      else if (/\[MEDIUM\]|\bseverity:\s*\*?medium\b/i.test(trimmed)) severity = 'MEDIUM';

      if (isFalsePositive) {
        severity = 'LOW';
      }

      // Extract file reference (e.g. frontend/src/components/ProblemDescription.jsx:73)
      const fileMatch = trimmed.match(/(?:location|file):\s*`?([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+(?::\d+)?)`?/i) ||
                        trimmed.match(/([a-zA-Z0-9_\-\.\/]+\.[a-zA-Z0-9]+:\d+)/);
      const file = fileMatch ? fileMatch[1] : (activeRepo || 'Repository Source');

      // Extract title
      const titleMatch = trimmed.match(/(?:###?\s*(?:Finding\s*#?\d+:?|Vulnerability\s*#?\d+:?)|\*\*Finding\s*#?\d+:?\s*)([^\n\*#]+)/i) ||
                         trimmed.match(/(?:###?\s*)([^\n\*#]+)/);
      const title = titleMatch ? titleMatch[1].trim() : `Security Finding #${idx + 1}`;

      // Extract CWE tag if present
      const cweMatch = trimmed.match(/(CWE-\d+)/i);
      const cwe = cweMatch ? cweMatch[1] : null;

      // Extract code block snippet if present
      const codeMatch = trimmed.match(/```(?:[a-zA-Z]+)?\s*([\s\S]*?)```/);
      const snippet = codeMatch ? codeMatch[1].trim() : null;

      findings.push({
        id: findings.length + 1,
        title: title.replace(/^Finding\s*#?\d+:\s*/i, '').replace(/^Vulnerability\s*#?\d+:\s*/i, ''),
        severity,
        cwe,
        file,
        snippet,
        isFalsePositive,
        rawText: trimmed,
      });
    });

    return findings;
  }, [scanResult, activeRepo]);

  // Compute overall security score (0 - 100)
  const { score, criticalCount, highCount, mediumCount, lowCount, grade } = useMemo(() => {
    if (!scanResult) {
      return { score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, grade: 'Pending Scan' };
    }

    if (parsedFindings.length === 0) {
      return { score: 100, criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0, grade: 'A+ (Passed)' };
    }

    let crit = 0, high = 0, med = 0, low = 0;
    parsedFindings.forEach((f) => {
      if (f.isFalsePositive) return;
      if (f.severity === 'CRITICAL') crit++;
      else if (f.severity === 'HIGH') high++;
      else if (f.severity === 'MEDIUM') med++;
      else low++;
    });

    let calculated = 100 - (crit * 25 + high * 15 + med * 8 + low * 3);
    calculated = Math.max(calculated, 20);

    let g = 'A';
    if (calculated >= 95) g = 'A+ (Excellent)';
    else if (calculated >= 85) g = 'A (Good)';
    else if (calculated >= 70) g = 'B (Moderate Risk)';
    else if (calculated >= 50) g = 'C (Elevated Risk)';
    else g = 'D (High Risk)';

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
        (f.cwe && f.cwe.toLowerCase().includes(searchQuery.toLowerCase())) ||
        f.rawText.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSeverity && matchesSearch;
    });
  }, [parsedFindings, selectedSeverity, searchQuery]);

  const busy = loadingScan || loadingFixes;
  const total = criticalCount + highCount + mediumCount + lowCount;
  const segments = [
    { key: 'CRITICAL', label: 'Critical', count: criticalCount, fill: 'bg-crimson' },
    { key: 'HIGH', label: 'High', count: highCount, fill: 'bg-rust' },
    { key: 'MEDIUM', label: 'Medium', count: mediumCount, fill: 'bg-ochre' },
    { key: 'LOW', label: 'Low', count: lowCount, fill: 'bg-paper-grey' },
  ];
  const severityBadge = (sev) =>
    sev === 'CRITICAL' ? 'badge badge-danger'
      : sev === 'HIGH' ? 'badge !bg-[var(--rust-wash)] !text-rust'
      : sev === 'MEDIUM' ? 'badge badge-warning'
      : 'badge';
  const toggleClass = (on) => `btn btn-sm ${on ? 'bg-ink text-pulp' : 'btn-ghost'}`;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={handleScan} disabled={busy || !activeRepo} className="btn btn-primary">
          <Shield size={14} strokeWidth={2} />
          <span>{loadingScan ? 'Auditing…' : 'Run security audit'}</span>
        </button>
        <button onClick={handleFixes} disabled={busy || !activeRepo} className="btn btn-secondary">
          <Wrench size={14} strokeWidth={2} />
          <span>{loadingFixes ? 'Writing fixes…' : 'Generate fixes'}</span>
        </button>
        {busy && (
          <div className="flex items-center gap-2 text-sm text-ink-2" role="status">
            <div className="flex items-end gap-1">
              <div className="thinking-dot" />
              <div className="thinking-dot" />
              <div className="thinking-dot" />
            </div>
            <span>{loadingScan ? 'Scanning call sinks and tokens…' : 'Drafting remediation patches…'}</span>
          </div>
        )}
      </div>

      {error && (
        <div className="paper-flat p-4 text-sm">
          <p className="text-crimson font-semibold">{error}</p>
          <p className="text-ink-2 mt-1">Check that the repository is indexed, then run the audit again.</p>
        </div>
      )}

      {/* Score + severity strip */}
      <div className="flex flex-col sm:flex-row sm:items-end gap-6 rule-b pb-6">
        <div className="shrink-0">
          <div className="strip text-ash">Health score</div>
          <div className="flex items-baseline gap-2 mt-1">
            {scanResult ? (
              <>
                <span className="font-matrixtype-display text-5xl text-ink tabular-nums leading-none">{score}</span>
                <span className="font-mono text-sm text-ash tabular-nums">/ 100</span>
              </>
            ) : (
              <span className="font-cond font-semibold text-2xl text-ash leading-none">No score yet</span>
            )}
          </div>
          <p className="text-sm text-ink-2 mt-2">
            {scanResult ? grade : `Run an audit to score ${activeRepo || 'your repository'}`}
          </p>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex h-3 w-full overflow-hidden rounded-sm bg-paper-grey divide-x divide-pulp" aria-hidden="true">
            {total > 0 && segments.map((s) => s.count > 0 && (
              <div key={s.key} className={s.fill} style={{ flexGrow: s.count, flexBasis: 0 }} />
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {segments.map((s) => (
              <button
                key={s.key}
                onClick={() => setSelectedSeverity(s.key)}
                aria-pressed={selectedSeverity === s.key}
                className={`text-left rounded-sm px-1.5 py-1 transition-colors hover:bg-pulp-2 ${
                  selectedSeverity === s.key ? 'bg-pulp-2 shadow-[inset_0_-2px_0_var(--crimson)]' : ''
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`inline-block w-2 h-2 rounded-sm ${s.fill} shadow-[inset_0_0_0_1px_var(--rule)]`} />
                  <span className="strip text-ash">{s.label}</span>
                </div>
                <div className="font-mono tabular-nums text-ink text-lg mt-0.5">{s.count}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter and search */}
      {scanResult && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="strip text-ash mr-1">Filter</span>
            {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
              <button key={sev} onClick={() => setSelectedSeverity(sev)} className={toggleClass(selectedSeverity === sev)}>
                {sev}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search size={14} strokeWidth={2} className="absolute left-3 top-1/2 -translate-y-1/2 text-ash pointer-events-none" />
              <input
                type="text"
                placeholder="Search findings or files"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field py-1.5 text-sm has-icon-left"
              />
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setViewMode('cards')} className={toggleClass(viewMode === 'cards')}>Findings</button>
              <button onClick={() => setViewMode('markdown')} className={toggleClass(viewMode === 'markdown')}>Report</button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {scanResult ? (
        viewMode === 'cards' ? (
          filteredFindings.length > 0 ? (
            <ul className="rule-t">
              {filteredFindings.map((finding) => (
                <li key={finding.id} className="rule-b py-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={severityBadge(finding.severity)}>{finding.severity}</span>
                        {finding.cwe && <span className="badge">{finding.cwe}</span>}
                        <h4 className="text-ink font-semibold">{finding.title}</h4>
                      </div>
                      <div className="font-mono text-sm text-ash truncate">{finding.file}</div>
                    </div>
                    <button
                      onClick={onNavigateToPr}
                      className="btn btn-secondary btn-sm shrink-0"
                      title="Open the pull request workflow to remediate this finding"
                    >
                      <GitPullRequest size={14} strokeWidth={2} />
                      <span>Fix with PR</span>
                    </button>
                  </div>
                  <details className="mt-2">
                    <summary className="strip text-ink-2 hover:text-ink select-none">Detail and remediation</summary>
                    <div className="paper-flat p-4 mt-2 text-sm text-ink leading-relaxed">
                      <MarkdownView content={finding.rawText} />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          ) : parsedFindings.length === 0 ? (
            <div className="py-6 space-y-2">
              <span className="badge badge-success">Passed</span>
              <p className="text-ink">
                The audit reported no vulnerabilities, exposed credentials or execution sinks in <span className="font-mono">{activeRepo}</span>.
              </p>
              <p className="text-sm text-ink-2">Open the report view to read the full audit transcript.</p>
            </div>
          ) : (
            <div className="py-6 space-y-1">
              <p className="text-ink font-semibold">No findings match</p>
              <p className="text-sm text-ink-2">
                Nothing matched severity "{selectedSeverity}"{searchQuery ? ` and "${searchQuery}"` : ''}. Clear the filter or search to see all findings.
              </p>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between rule-b pb-3">
              <span className="strip text-ash">{scanResult.type === 'fixes' ? 'Remediation patches' : 'Audit transcript'}</span>
              <span className="font-mono text-sm text-ash">{activeRepo}</span>
            </div>
            <MarkdownView content={scanResult.content} />
          </div>
        )
      ) : (
        <p className="text-sm text-ink-2 max-w-prose">
          The audit scans {activeRepo ? <span className="font-mono">{activeRepo}</span> : 'your repository'} for hardcoded credentials, SQL injection, unsafe deserialization and dangerous execution calls, with file paths and line numbers.
        </p>
      )}
    </div>
  );
}
