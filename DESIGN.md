---
name: CodeBase
description: A hand-cranked paper machine that turns a repository into symbols, call edges and cited answers.
colors:
  kraft: "#c3a273"
  kraft-deep: "#a9895c"
  kraft-dark: "#8e7048"
  on-kraft-2: "#3a342d"
  pulp: "#f2ece1"
  pulp-2: "#e8e0d2"
  paper-grey: "#d6ccbc"
  writing-paper: "#fbf8f2"
  ink: "#2a2724"
  ink-2: "#4a443d"
  ash: "#6b645b"
  rule: "rgba(42, 39, 36, 0.16)"
  rule-strong: "rgba(42, 39, 36, 0.32)"
  crimson: "#b3262d"
  crimson-deep: "#8f1d23"
  crimson-hover: "#c02b33"
  crimson-wash: "rgba(179, 38, 45, 0.1)"
  forest: "#3f6a3a"
  forest-wash: "rgba(63, 106, 58, 0.12)"
  ochre: "#8a5f12"
  ochre-wash: "rgba(138, 95, 18, 0.12)"
  rust: "#a2451c"
  rust-wash: "rgba(162, 69, 28, 0.12)"
  plate: "#2a2724"
  plate-2: "#35312d"
  plate-ink: "#ede6d8"
  plate-dim: "#b5ab9b"
typography:
  display:
    fontFamily: "Matrixtype Display, Matrixtype, Courier Prime, monospace"
    fontSize: "clamp(2.75rem, 5.6vw, 5.25rem)"
    fontWeight: 400
    lineHeight: 0.95
  display-close:
    fontFamily: "Matrixtype Display, Matrixtype, Courier Prime, monospace"
    fontSize: "clamp(2rem, 4.4vw, 3.75rem)"
    fontWeight: 400
    lineHeight: 1
  stage-title:
    fontFamily: "Matrixtype Display, Matrixtype, Courier Prime, monospace"
    fontSize: "1.5rem"
    fontWeight: 400
    lineHeight: 1
  headline:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.02
  title:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  body-lg:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "1.125rem"
    fontWeight: 400
    lineHeight: 1.55
  prose:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  button:
    fontFamily: "Archivo Narrow, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.07em"
  mono:
    fontFamily: "Courier Prime, ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.65
rounded:
  strip: "2px"
  paper: "3px"
  full: "9999px"
spacing:
  gutter-sm: "16px"
  gutter: "32px"
  panel-sm: "16px"
  panel: "24px"
  panel-lg: "32px"
  stack: "24px"
  section-sm: "96px"
  section: "128px"
components:
  button-primary:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.pulp}"
    typography: "{typography.button}"
    rounded: "{rounded.strip}"
    padding: "9px 24px 9px 20px"
  button-primary-hover:
    backgroundColor: "{colors.crimson-hover}"
    textColor: "{colors.pulp}"
  button-secondary:
    backgroundColor: "{colors.pulp}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.strip}"
    padding: "9px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
    rounded: "{rounded.strip}"
    padding: "9px 16px"
  button-ghost-hover:
    backgroundColor: "{colors.rule}"
    textColor: "{colors.ink}"
  button-danger:
    backgroundColor: "{colors.pulp}"
    textColor: "{colors.crimson}"
    typography: "{typography.button}"
    rounded: "{rounded.strip}"
    padding: "9px 16px"
  button-sm:
    padding: "5px 10px"
  input:
    backgroundColor: "{colors.writing-paper}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.strip}"
    padding: "9px 14px"
  badge:
    backgroundColor: "{colors.pulp-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.strip}"
    padding: "2px 7px"
  badge-success:
    backgroundColor: "{colors.forest-wash}"
    textColor: "{colors.forest}"
  badge-warning:
    backgroundColor: "{colors.ochre-wash}"
    textColor: "{colors.ochre}"
  badge-danger:
    backgroundColor: "{colors.crimson-wash}"
    textColor: "{colors.crimson}"
  paper-panel:
    backgroundColor: "{colors.pulp}"
    textColor: "{colors.ink}"
    rounded: "{rounded.paper}"
    padding: "{spacing.panel}"
  paper-flat:
    backgroundColor: "{colors.pulp-2}"
    textColor: "{colors.ink}"
    rounded: "{rounded.strip}"
    padding: "12px"
  ink-plate:
    backgroundColor: "{colors.plate}"
    textColor: "{colors.plate-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.strip}"
    padding: "12px 16px"
  folder-tab:
    backgroundColor: "{colors.paper-grey}"
    textColor: "{colors.ink-2}"
    typography: "{typography.button}"
    padding: "9px 14px 10px"
  folder-tab-hover:
    backgroundColor: "{colors.pulp-2}"
    textColor: "{colors.ink}"
  folder-tab-selected:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.pulp}"
    padding: "9px 14px 14px"
  page-tab:
    backgroundColor: "{colors.paper-grey}"
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
    height: "36px"
    padding: "0 16px"
  page-tab-current:
    backgroundColor: "{colors.pulp}"
    textColor: "{colors.ink}"
    height: "44px"
  procession-card:
    backgroundColor: "{colors.pulp-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.strip}"
    width: "74px"
  procession-card-active:
    backgroundColor: "{colors.crimson}"
    textColor: "{colors.pulp}"
  procession-card-done:
    backgroundColor: "{colors.pulp}"
    textColor: "{colors.forest}"
  evidence-pill:
    backgroundColor: "{colors.pulp-2}"
    textColor: "{colors.ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.strip}"
    padding: "2px 8px"
  evidence-pill-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.pulp}"
---

# Design System: CodeBase

## Overview

**Creative North Star: "The Hand-Cranked Paper Machine"**

CodeBase is built as a kinetic paper automaton sitting on a sheet of kraft board. One crank turns a repository through its linkage (clone, parse, extract, graph, embed, store, answer), and whichever stage is moving lifts off the rail, turns crimson and folds open to show what it actually produced. Everything else is cut paper: pulp-white sheets slotted into the board, cut folder tabs, paper strips for buttons, charcoal ink plates for code. The world is warm, physical and matte; depth comes from paper lifting off board, never from glow.

Density follows the job. The home page is spacious and persuasive (one machine, one claim, four measured figures). The workstation is a dense tool: a sticky paper-tab nav, a repository strip, a row of nine numbered folder tabs, and one large paper sheet per tool. The system refuses the dark dev-tool dashboard it replaced: no glowing cards, no gradient text, no icon tiles, no indigo.

The machine only shows what is real. Figures are live from the index API or measured by a real run (the current `evals_report.json` is simulated and is not shown); anything drawn by hand says so on the page.

**Key Characteristics:**
- Kraft board ground with fibre grain; pulp paper pieces with soft cast shadows and slot marks.
- One moving colour: crimson marks the active tab, running stage, primary action and the failure or critical finding that stops the machine.
- Matrixtype Display as die-cut letterpress caps; Archivo Narrow caps for every tab, label and button strip; Courier Prime typewriter face for body, code and every figure.
- The Procession: stage cards pinned by linkage pins to one ink rail, reused on home, indexing and the chat agent pipeline.
- Crank motion: 700ms on `cubic-bezier(0.22, 1, 0.36, 1)`; stages unfold from their top crease.
- Near-square corners (2px strips, 3px sheets); cut shoulders on tabs.

## Colors

Three materials and one moving ink: kraft board, pulp paper, charcoal shadow-ink, and crimson for whatever is in motion. Printed status inks appear only as state.

### Primary
- **Signal Crimson** (crimson): the only saturated colour on screen. Active folder tab, running Procession card, primary button strip, the crank knob, the brand crank tile, the crimson "WIRING." strip in the hero, selection highlight, focus outline, input caret, and error or critical-severity text. **Crimson Deep** (crimson-deep) is the knob's pin and pressed shading; **Crimson Hover** (crimson-hover) is the primary strip under the pointer; **Crimson Wash** (crimson-wash) backs danger badges and destructive menu rows.

### Neutral
- **Kraft Board** (kraft): the page ground, always carrying the grain and fibre textures. Also the browser theme colour.
- **Deep Kraft** (kraft-deep) and **Dark Kraft** (kraft-dark): footer board, scrollbar thumb, the slot marks cut into the board, and the nav's bottom crease.
- **Board Ink** (on-kraft-2): body copy that sits directly on kraft.
- **Pulp** (pulp): every raised sheet, secondary buttons, the current page tab, done Procession cards.
- **Pressed Pulp** (pulp-2): flat inset pieces, badges, waiting Procession cards, evidence pills, hover of unselected tabs.
- **Paper Grey** (paper-grey): unselected folder and page tabs, low-severity fill, the eyelet ring.
- **Writing Paper** (writing-paper): input fields and the Mermaid grid viewport; slightly brighter than pulp so the writable surface reads.
- **Shadow Ink** (ink): headings, primary text on paper, the rail, selected list rows.
- **Ink Two** (ink-2): secondary text, linkage pins, diagram edges.
- **Pressed Ash** (ash): tertiary text, placeholders, labels and folder numbers on paper.
- **Rule** / **Rule Strong**: 1px hairlines and inset outlines; never solid borders.
- **Ink Plate** (plate, plate-2, plate-ink, plate-dim): code blocks, terminals, the ingestion log. plate-2 is the plate's header band; plate-dim is its secondary text.

### Status inks
- **Forest** (forest + forest-wash): done, healthy, backend up.
- **Ochre** (ochre + ochre-wash): warning, medium severity, waking backend (pulsing lamp).
- **Rust** (rust + rust-wash): high severity only, one step below crimson's critical.

### Named Rules
**The Crimson Moves Rule.** Crimson belongs only to what is moving or has stopped the machine: the active tab, the running stage, the primary action, the critical finding, the error. A static decoration never gets it. If two crimson things compete in one view, one of them is wrong.

**The Printed Ink Rule.** Forest, ochre and rust are state, never decoration. Each is used as a wash plus a 35% inset outline, or as a solid lamp.

**The Board Text Rule.** Text set directly on kraft uses ink or board ink only; ash and paper greys are for text on paper.

## Typography

**Display Font:** Matrixtype Display (with Matrixtype, Courier Prime)
**Body Font:** Courier Prime (with ui-monospace)
**Label Font:** Archivo Narrow (with system-ui)
**Mono Font:** Courier Prime (with ui-monospace)

**Character:** Matrixtype's dot-matrix caps read as die-cut letterpress stamped into the board; Archivo Narrow caps are the printed labels on every strip and tab; Courier Prime is the typewriter that fills in the paper: body copy, symbols, paths and figures all share it, so inline code is marked by a pulp chip rather than a face change.

### Hierarchy
- **Display** (400, clamp(2.75rem, 5.6vw, 5.25rem), 0.95): the hero claim only, all caps, last line on a crimson strip rotated -1deg.
- **Display Close** (400, clamp(2rem, 4.4vw, 3.75rem), 1): the closing call on a slotted sheet.
- **Stage Title** (400, 1.5rem, 1): the name of the stage currently folded open, all caps; also the brand wordmark (1.35rem) and giant tool numerals (5-6rem).
- **Headline** (Semi Condensed 700, 3rem desktop / 2.25rem mobile, 1.02): section headings in sentence case.
- **Title** (Semi Condensed 700, 1.875rem): tool names inside a sheet; smaller Semi Condensed 700 heads markdown.
- **Body** (Courier Prime 400, 16px, 1.55): default UI text. **Body Large** (1.125rem) for lead lines, capped near 46-56ch.
- **Prose** (1rem, 1.7, max 72ch): chat answers and generated docs.
- **Label** (Semi Condensed 600, 0.75rem, 0.08em, uppercase): every caps strip; drops to 10-11px inside Procession cards and figure strips.
- **Mono** (Courier Prime, 0.875rem, 1.6): code plates, symbols, file paths, latency, every number; always tabular.

### Named Rules
**The Figures Are Mono Rule.** Every number is Courier Prime (or Matrixtype at display scale) with tabular figures; inline code sits on a pulp chip, since body and code share one face.

**The Caps Are Condensed Rule.** Uppercase text is Archivo Narrow with positive tracking, or Matrixtype Display. Courier Prime is never set in caps.

## Layout

A single centred column at max 1600px with a 16px gutter on mobile and 32px from 640px. Main content pads 24px top/bottom on mobile and 40px from 640px. Home sections stack with 96px gaps (128px from 640px). The home first viewport is a 5:7 grid from 1024px (claim left, crank stage right) with a full-width paper strip of four measured figures beneath it; below 1024px it becomes one column. The workstation stacks the repository strip, the folder-tab row and one tool sheet (16/24/32px padding by breakpoint, min-height 60vh). Folder-tab rows scroll horizontally with a hidden scrollbar rather than wrapping. Page tabs collapse into a paper menu under 768px. Breakpoints are Tailwind defaults: 640, 768, 1024, 1280px.

## Elevation & Depth

Depth is paper lifted off board. Sheets cast soft, warm charcoal shadows offset down and right, with a 1px contact line at the base; inset pieces sit flush with a 1px inset rule. Code plates are the darkest layer and sit barely lifted. Nothing glows.

### Shadow Vocabulary
- **Lift 1** (`box-shadow: 0 1px 0 rgba(42,39,36,.18), 0 3px 8px -3px rgba(42,39,36,.35)`): buttons, ink plates, small raised tags.
- **Lift 2** (`box-shadow: 0 1px 0 rgba(42,39,36,.2), 3px 8px 18px -8px rgba(42,39,36,.5)`): paper sheets, primary strip on hover, the hero crimson strip.
- **Lift 3** (`box-shadow: 0 1px 0 rgba(42,39,36,.22), 6px 16px 32px -12px rgba(42,39,36,.6)`): a card lifted on hover.
- **Inset rule** (`box-shadow: inset 0 0 0 1px rgba(42,39,36,.16)`): flat paper, badges, pills, waiting stages.

### Named Rules
**The Lift Means Selected Rule.** A piece rises (translateY and a deeper shadow) when it is hovered, selected or running; at rest it stays down. The Procession's shadow grows with each card's lift.

**The Slot Rule.** Major sheets (the crank stage, repository strip, closing call) are tabbed into the board with two dark kraft slot marks at the side edges. Slots are for sheets that anchor a view, not for every card.

## Shapes

Near-square paper. Strips, badges, plates and inputs use 2px corners; sheets use 3px. Folder and page tabs are cut paper: top corners notched with a 7px diagonal shoulder (`clip-path: polygon(0 100%, 0 7px, 7px 0, calc(100% - 7px) 0, 100% 7px, 100% 100%)`), flat at the base, and the tool sheet under a tab row drops its top-left radius so the tab joins it. Circles appear only for mechanical parts: the rail pins, the crank axle and knob, the primary button's eyelet, status lamps. The rail itself is a 3px ink bar. Rounded pills and soft 8px+ card corners are not part of this world.

## Components

### Buttons
Paper strips pinned to the board: tactile, flat, uppercase.
- **Shape:** 2px corners; Semi Condensed 600 caps at 0.8125rem, 0.07em tracking; 9px 16px padding (small: 5px 10px at 0.72rem).
- **Primary:** crimson strip with pulp text and Lift 1, extra right padding, and an eyelet rivet (17px; 13px on small) riveted over its right end: an ink pin, a paper-grey ring and an ash rim drawn as a radial gradient. One primary per view.
- **Hover / Active:** rises 1px (primary also brightens to crimson-hover and deepens to Lift 2); presses down 1px with the shadow removed. 160ms on the UI ease-out. Disabled drops to 50% opacity.
- **Secondary:** pulp strip, ink text, Lift 1, Lift 2 on hover.
- **Ghost:** transparent, ink-2 text; hover fills with the rule tint and does not lift.
- **Danger:** pulp strip with crimson text and a 1.5px crimson inset outline.

### Chips / Badges
- **Style:** small printed tags: 2px corners, Semi Condensed 600 caps at 0.6875rem, pressed pulp with an inset rule.
- **State:** success, warning and danger use their ink's wash, text and a 35-40% inset outline; the primary badge is solid ink on pulp. Evidence pills (file citations) are mono on pressed pulp that invert to ink on hover.

### Cards / Containers
- **Paper sheet:** pulp with pulp grain, 3px corners, Lift 2; optionally slotted.
- **Flat paper:** pressed pulp, 2px, inset rule; used for examples and metric tiles inside a sheet.
- **Ink plate:** charcoal plate, plate-ink text, a plate-2 header band for filenames and actions.
- **Ticket:** a sheet with a perforated tear-off edge down its left side (kraft-coloured holes); reserved for a measured evaluation run once one exists.

### Inputs / Fields
- **Style:** writing paper, no border, a strong inset rule plus a slight inner shadow, 2px corners, 9px 14px padding; placeholder in ash; crimson caret.
- **Focus:** the inset rule becomes a 1.5px crimson line. Global focus-visible is a 2px crimson outline at 2px offset.

### Navigation
- **Page tabs:** cut paper tabs hanging from the top of a sticky kraft bar. Unselected: paper grey at 80%, 36px tall, rising to 40px on hover. Current: pulp, 44px, lifted with an upward shadow, continuing into the page. Under 768px they fold into a paper menu of strips.
- **Brand tab:** a crimson square holding the crank mark (which turns 120deg on hover over 500ms) joined to a pulp tab with the Matrixtype wordmark.
- **Folder tabs (tools):** numbered 01-09 in mono, icon, Semi Condensed caps. Unselected tabs sit 4px low in paper grey; hover raises them to pulp-2; the selected tab turns crimson, rises flush, grows 4px taller and overlaps the sheet below. 220ms on the crank ease. Alt+1..9 and arrow keys switch tools.
- **Status lamps:** 9px mechanical lamps: forest (up), ochre pulsing at 1.2s (waking), crimson (down), grey ring (unknown).

### The Procession (signature component)
Stage cards pinned to one ink rail, like cams on a shared crankshaft. A 3px ink rail runs across the base; each card stands on a linkage pin (3px ink-2 bar) that ends in a pulp pin ringed in ink on the rail. The active card lifts (28px, 12px compact), tilts -2deg, turns crimson with pulp text and casts a deeper shadow; neighbours rise in proportion to their distance from the current position, so dragging the crank moves the whole linkage continuously. Done cards are pulp with forest text and a check; waiting cards are pressed pulp in ink-2. The compact variant adds a running/waiting/done line under each label. The same component drives the home crank (seven stages, wrapping at the ends), the indexing log and the chat agent pipeline.

On home, a crank handle is mounted at the rail's end: an ink axle in a pulp-2 bearing plate, an ink-2 arm and a crimson knob. It is draggable, keyboard operable (a slider; arrow keys step one stage) and paired with previous/next strip buttons. One stage per quarter turn. It turns itself every 4.2s until someone touches it. The current stage's name and its real output unfold beneath it.

### Motion
- **Crank:** 700ms `cubic-bezier(0.22, 1, 0.36, 1)` for card lift, pin stretch, shadow and handle rotation; colour changes take 300ms. While dragging, transitions are off so the linkage tracks the pointer; on release the handle snaps to the nearest quarter turn.
- **Unfold:** a stage's title and output fold open from their top crease (rotateX -55deg to flat, 900px perspective, 520ms on the UI ease-out) every time the stage changes; tool summaries on home use the same unfold.
- **UI:** `cubic-bezier(0.16, 1, 0.3, 1)`: 140ms backdrop fade, 200ms rise-in (6px) for dialogs and expanding panels, 160ms for button lift.
- **Thinking:** three small paper tabs nodding 4px on a 0.9s loop, the middle one crimson. Progress is a 3px rule with a crimson beam feeding across (1.6s). The streaming caret is a 2px crimson bar blinking on steps.
- **Reduced motion:** all animation and transition durations collapse to 0.01ms and the crank stops auto-turning; stages switch in place without rotation, lift or unfold.

## Do's and Don'ts

### Do:
- **Do** keep crimson for what is moving or has stopped the machine: active tab, running stage, primary action, critical finding, error.
- **Do** build every surface from the paper pieces: sheet (3px, Lift 2), flat paper (2px, inset rule), ink plate for code, strip labels in Semi Condensed caps.
- **Do** make buttons paper strips; give the one primary action per view the crimson strip with its eyelet rivet.
- **Do** show pipelines with the Procession on one ink rail, and move them on the 700ms crank ease.
- **Do** unfold new stage content from its top crease when the stage changes, and let reduced motion switch it in place.
- **Do** set every figure in mono with tabular numbers, and take it live from the index API or from a real measured run; keep the weak scores in, and never show the simulated `evals_report.json`.
- **Do** label anything drawn by hand on the page itself ("Sample diagram drawn by hand, not generated from this index", "values illustrative", "Example").

### Don't:
- **Don't** invent numbers, customers, testimonials or usage figures; the old parse-integrity, latency and context-size figures must not return.
- **Don't** present a sample or illustrative diagram as generated output.
- **Don't** use crimson as decoration, and don't use forest, ochre or rust outside state.
- **Don't** bring back the dark indigo dashboard: glowing cards, gradient text, icon tiles, glassmorphism.
- **Don't** round paper beyond 3px or turn tags into rounded pills; circles are for pins, knobs, rivets and lamps only.
- **Don't** set ash or grey text directly on kraft.
