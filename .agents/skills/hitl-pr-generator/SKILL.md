---
name: hitl-pr-generator
description: Orchestrates Human-in-the-Loop (HITL) pull request generation, patch branch creation, verified diff formatting, and review checkpoint gates.
---

# Human-in-the-Loop (HITL) Pull Request Generator

This skill guides the agent to create verified, clean pull requests with formal human approval gates before committing or publishing changes.

## When to Use
- When preparing an automated patch or feature implementation for upstream review.
- When generating git branches, commits, and pull request descriptions.
- When an operation requires human review and confirmation before pushing live.

## HITL Protocol

### 1. Verification Before Proposal
- Never propose a PR or patch without first running local verification (unit tests, build checks, linter).
- Ensure git working tree is clean or properly staged.

### 2. Preparing the Patch Branch
- Create a semantic branch named after the issue or feature:
  ```bash
  git checkout -b feat/<descriptive-name>
  # or
  git checkout -b fix/<cve-or-bug-id>
  ```

### 3. Drafting the PR Description
Structure the PR summary with high context for human reviewers:
```markdown
## Summary of Changes
- Concise 2-3 bullet explanation of what this PR accomplishes.

## Motivation & Context
- Why was this change made? References to related issues or requirements.

## Detailed Diff Highlights
- Key files touched and architectural reasoning for non-obvious choices.

## Verification & Testing
- Automated test output: e.g., `pytest` (11 passed).
- Manual verification steps.
```

### 4. Human Approval Gate
- Present the planned branch name, commit message, and full diff summary to the user.
- Explicitly pause for user approval before executing `git push` or merging upstream.
