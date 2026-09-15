---
name: git-evolution-analyzer
description: Analyzes git commit histories, tag diffs, architectural complexity drift, hotspots, and code churn over repository releases.
---

# Git Repository Evolution & Drift Analyzer

This skill guides the agent to investigate commit histories, identify high-churn hotspots, and assess architectural drift across release milestones.

## When to Use
- When reviewing "What changed between v1.0 and v2.0?" or analyzing a commit range.
- When identifying architectural hotspots (files edited frequently that may be prone to regression).
- When generating automated release changelogs and architectural migration notes.

## Workflow

### 1. Commit Range & Diff Extraction
- Extract changes between two git references:
  ```bash
  git log <tag_a>..<tag_b> --oneline --stat
  git diff <tag_a>..<tag_b> --name-status
  ```

### 2. Hotspot & Churn Identification
- Identify files with disproportionately high commit frequency or churn:
  - Files modified across >50% of feature branches typically indicate architectural coupling or god-object antipatterns.

### 3. Structural & Contract Drift
- Detect breaking API changes:
  - Renamed or deleted public functions.
  - Modified function signatures (added non-default arguments).
  - Database schema alterations or migration changes.

### 4. Synthesizing the Evolution Report
Format the report with:
- **Executive Summary**: Major milestones and objectives achieved in the commit window.
- **Architectural Shift**: Core components added, restructured, or deprecated.
- **Breaking Changes**: Action items required for consumers updating to the new version.
- **Changelog**: Categorized items (Features, Fixes, Refactors, Performance).
