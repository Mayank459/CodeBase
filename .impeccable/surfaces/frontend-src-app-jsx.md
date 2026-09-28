---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/components"]
---

# Surface brief: CodeBase web app (home + workstation + all tools)

Scope: whole frontend. Home page is **Persuade** (reviewers decide in one viewport whether this is a real system). Workstation, tool tabs, settings are **Operate** (developers run tasks; task and state outrank expression). About / Privacy are **Read**.

Audience and job: reviewers opening the live link cold; developers indexing a repo and working across the nine tools. Action: home → open the workstation on the indexed repo. Proof: live index stats (entities, call edges), real eval figures from evals_report.json, real symbols from psf/requests. Constraints: keep Matrixtype; keep all features, API calls, keyboard shortcuts; no invented numbers.

## Direction contract

THESIS: CodeBase is a hand-cranked paper machine: one crank turns a repository through its linkage (clone, parse, graph, embed, retrieve, answer) and each stage folds open to show what it produced. Refuses the dark dev-tool dashboard of glowing cards, gradient text, and icon tiles.

OWN-WORLD: kraft board ground with fibre grain; pulp-white paper panels with slot marks and hard charcoal cast shadows; shadow-ink charcoal for text and code plates; paper grey and pressed ash for secondary; crimson reserved only for the thing currently moving (active tab, running stage, primary action, critical finding). Buttons are paper strips, the primary one crimson with a pinned rivet. Tabs are cut paper tabs. Selection = the piece lifts and turns crimson. Matrixtype Display stands in for die-cut letterpress caps; Barlow Semi Condensed caps for tab and label strips; Barlow for body; JetBrains Mono for code.

STORY: a visitor sees the machine at work on a real repo, understands the pipeline in order, believes it because every figure is live or measured, and opens the workstation.

FIRST VIEWPORT: paper-tab nav across the top. Left half: huge Matrixtype headline "TURN A REPO. READ ITS WIRING." with the last line crimson, a short body line, crimson "OPEN WORKSTATION" strip with rivet plus a paper "INDEX A REPO" strip. Right half: the crank stage, a paper box with a procession of seven stage cards on a crank line and a drag/keyboard crank handle at the base; the stage in motion is crimson and folded open to show its real output. Under both: a paper strip of four measured figures from the evals report.

FORM: kinetic-sculpture paper automata (dealt challenger, chosen by the user over the assigned direction; the assigned direction was grounded candidate 3). Seed key ce5b1dd1.

SIGNATURE INTERACTION: the crank. Dragging the handle, pressing arrow keys, or pressing the step buttons advances the procession one stage per quarter turn; the workstation's ingestion log and agent pipeline reuse the same stage-procession grammar. Reduced motion: stages switch without rotation.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
