# Skyforge v1.6 · Mobile Evidence, Pip Encounters and Template Doctrine

**19 October 2026 — corrective field-UX and reproducibility contract.**

## 1. Screenshots and witnessed regressions

Two October 2026 iPhone screenshots revealed: (a) home hero had turned white while the outer body remained navy and its section header became illegible, (b) Narayani constellation's 1,600×840 full-space SVG rendered tiny nodes in a portrait canvas, wasting most vertical space, (c) the top navigation squeezed the Checklist link. Those screenshots are the primary visual evidence for v1.6 corrections. Unit/CI validation is not independent physical Safari verification.

### Exact fixes
- Home must have **true pale white gutters** `#f6f9fc` and dark readable `#20384b` body, heading, cards, footnotes and tool labels. Do not leave old dark style specificity winning with `!important`.
- Mobile global navigation uses **two rows**: brand + Pip motion toggle, then a full-width horizontal scroller for all views and More. Do not clip labels without a scroll path.
- Mobile 2D WBS uses initial `viewBox="0 0 490 690"` on max-width 720px instead of automatically fitting the whole graph at 1600×840. The full graph is still available with **Full graph**, and **Find selected** centers an identified WBS node. Drag to pan and Zoom/Reset remain available.
- Toolbar is compact in three responsive columns. The default zoom is a **slice** of the whole WBS (not 45 tasks onscreen at once). Explicit note in UI explains the view to field engineers. Model, node identity and edges remain unchanged.

## 2. Mascot specification: interactive page-crawling Pip

- Original cream/fluffy inchworm SVG reused without any downloaded images or character assets. Pip is not a construction activity, resource, inspection or approval.
- Pip **moves across the visible webpage**, no longer stays on a small horizontal header rail. Its positions form a bounded deterministic viewport route, with six-second dwell/transition cycles, small ~54–67px footprint. Small decorative schedule rail remains in the header.
- On desktop mouse/pen approach, Pip **flees** to the next safe position with a fast CSS move; on phones/touch it reacts to tap. Keyboard Enter/Space is supported.
- **Exactly every 10th meaningful encounter** Pip pauses for approximately nine seconds, displays a tiny **Pet Pip!** label and permits a click/tap to pet. Afterward the cycle resets. Repeat events are debounced; encounter count is local ephemeral UI state, never stored as progress.
- Reduced motion starts Pip still and disables the pause/play toggle. Pause freezes timed crawling; allowing user play resumes.
- The hit area must remain small, the jump must make blocking short-lived, and no raw private materials, stored user behavior, network polling, persistence, or engine mutation may be added.
- It never silently approves a milestone or implies that decorative motion reflects scheduling status.

## 3. A framework, not Narayani hard-coded across all projects

**Non-negotiable:** The **laws** are reusable: typed relational identities, cycle-free dependency network, FS/SS/FF/SF, day/calendar contracts, resource and material capacities, earned-value baseline metrics, validation, provenance, explicit assumptions, QA and rollback. The **project data** is not reusable by copy: every site's WBS taxonomy, durations, dimensioned tasks, trades, resource pool, contract calendar, source revisions and approvals are separate.

[Canonical research doctrine](../research/SKYFORGE_REPRODUCIBLE_ENGINE_DOCTRINE_V1.md) is the definitive reproducibility record. Public [How Engine Works](../../how/index.html) page includes a hands-on CPM and EVM demonstration using real Skyforge kernel imports. 32 Anki cards provide spaced recall.

### AI adapter contract
1. Read the live authoritative project inputs and this pinned-engine doctrine.
2. Classify every input as VERIFIED, CALCULATED, ASSUMED_DRAFT or UNKNOWN_BLOCKED.
3. For a missing measurement, derive from **sufficient verified** inputs and show formula/units/rounding or make an explicit scenario assumption with uncertainty and reviewer gate.
4. Normalize actual project-specific tasks into stable WBS and relationship/resource/calendar records. Never copy Narayani as a universal template.
5. Use the tested mathematical functions and output one canonical project model, with consistent Gantt/constellation/calendar.
6. Admit no approvals or actuals without governed authority. EVM requires real approved baseline, earned work and actual cost, not a simulated percent complete.
7. Verify deterministic hashes, tests, source read-back and versioned rollback. Do not assert P6 parity that has not been tested.

This is the **required future generic project compiler doctrine**, not a claim that the compiler is already complete.

## 4. Allowed code surfaces / rollback

Presentation-only modifications:
`assets/site-shell.mjs`, `assets/site-shell.css`, `src/presentation/narayani-visual.mjs`, `projects/narayani/visual.html`, `index.html`, `how/index.html`, `how/skyforge-anki.csv`, the public allowlist in `scripts/build-public-site.mjs`, tests and this documentation.

All `src/kernel/` mathematics and `src/visual/project-model.mjs` data authority stay unchanged. The public allowlist must include only the two explicitly reviewed handbook files. Private drawing links, source snapshots, actual reports, engineering approvals and authentication tokens are forbidden from output.

**Validation:** CI tests and 3,888-case calendar oracle, deterministic pilot/visual build/readback and Pages allowlist. Physical Safari screenshot remains a separate final check; no claim of visual QA absent it. Roll back by reverting v1.6 presentation/documentation commits to v1.5 commit `0e6122e77465e7f39667d771aac2147788126d16`.

**Operational caution:** Screen-crawling mascots are decorative. Site engineers must always have complete usable navigation, legible graph controls and uninterrupted engineering workflows regardless of whether Pip runs, pauses or fails.
