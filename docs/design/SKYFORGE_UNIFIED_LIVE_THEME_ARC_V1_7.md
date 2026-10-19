# Skyforge — Unified Live Pages Theme Arc v1.7

**Date:** 19 October 2026  
**Branch:** `kernel-v0.2-open-source-engines`  
**Pre-arc rollback milestone:** `v1.6.1-visual.1` → commit `0c0d97e68d8c1c8b9bde320b419cedbdbfaf5e40`  
**Version purpose:** normalize **every currently allowlisted live GitHub Pages HTML view** from a single design contract; make broad/empty regions useful, refine mobile readability; preserve all machine logic and the existing Pip behavior.

## 1. One visual vocabulary, all live workspaces

- Canvas: `#F5F8FB` with nearly imperceptible white/teal mist.
- Cards and inputs: `#FFFFFF`; text: `#203B4F`; muted copy: `#597487`; hairline: `#D7E6EC`.
- Navigation/active: `#147E83`; amber `#B37B26` for *advisory or reported*; coral `#AF4F47` for *hold/error*. **Do not treat any color as an authorization source**.
- Radius 16px, subtle blue-gray shadow and a consistent keyboard focus ring. No dark-navy body gutters, huge empty hero minimum heights or artificially decorative full-height sections.
- Components rebalanced by type: white work panels, soft-teal orientation bands, compact technical headers, legible tables, material and resource cards, consistent badges, and quiet blueprint-grid geometry behind genuinely empty constellation space.
- Pip's 16px/s zigzag, fleeing/petting and reduced-motion are untouched.

## 2. The published surfaces

| Published route | Page family | Purpose and treatment |
| --- | --- | --- |
| `/` | Home | White landing, clear project entry and concise overview |
| `/projects/narayani/visual.html` | Field graph | Legible constellation, synthetic dates, Gantt/calendar and checklists; blueprint canvas |
| `/projects/narayani/index.html` | Project evidence | Light source/hold panels and explicit evidence-state context |
| `/planner.html` | Planning workbench | White tools/forms, consistent timeline, resource and delay semantics |
| `/kernel-lab.html` | Kernel lab | Light computation panels, compact measured metrics |
| `/advanced.html` | Advanced control | White compact desktop/mobile toolbars, preserved grids |
| `/roadmap.html` | Development roadmap | Distinct shipped/tested vs planned guidance |
| `/machine/index.html` | Machine centre | Expanded responsive evidence cards and provenance guidance |
| `/machine/wbs-sample/index.html` | Generated WBS result | Current synthetic source and plan explanation |
| `/knowledge/index.html` | Methods catalogue | Readable searchable method cards |
| `/knowledge/task.html` | Task guide | Source-informed readiness and engineering approval distinctions |
| `/how/index.html` | Research handbook | Native interactive CPM/EVM examples; readable mobile math |
| `/more/legacy-home.html` | Archived UI | Existing history kept, with normalization and provenance guide |
| `/machine/demo-foundation/index.html` | Generated machine demo | Unified design when available as allowlisted public HTML |

Redirect-only methods aliases remain tiny redirects to their actual canonical method pages.

## 3. Layout filler must be useful, not fabricated

For a technical or historical workspace without enough explanatory context, a three-part `sf-page-guide` orientation panel fills **real layout space** near the top of the main page:

1. **This workspace:** its task and scope.
2. **Interpretation:** its data/approval limitation.
3. **Continue:** a direct link to the appropriate connected workspace.

For home, the busy Narayani field graph and the long researcher handbook, avoid duplicate orientation clutter. Context content is predefined, public-safe, versioned, and has no synthetic numerical claims, private Drive links or read/write actions.

Subdued blueprints and faint milestone geometry may decorate truly empty canvases; **they cannot replace data or pretend to be project progress**. Expand machine cards responsively; eliminate old forced hero min-heights.

## 4. Mobile rules

At max-width 900px, orientation becomes two columns with the leading explanatory card full width. At max-width 640px it becomes one compact column. Legacy planning metrics become two columns, wide technical grids stay horizontally navigable rather than becoming microscopic, and work headers wrap when needed.

Do not remove / hide Gantt rows, engineering controls, activity labels, sources, or warning/hold messages for mobile aesthetics. Page-specific main padding reduces to 12px. Focus visibility and the reduced-motion preference remain respected.

## 5. Source implementation and safety

- `assets/skyforge-unified.css`: one canonical skin and page-family overrides.
- `assets/site-shell.mjs`: exact route → page-type maps; contextual guide via safe DOM text nodes; correct main placement; no engine data.
- `scripts/build-public-site.mjs`: approved CSS asset is included in allowlist, injected **after every page's legacy CSS** and checked on built output for presence and order.
- `tests/skyforge-theme-arc.test.mjs`: route coverage, consistent CSS, mobile behavior and no interference with source contracts.
- Existing WBS geometry and its scheduling / resource logic, 45/49/405/7 source invariants, private-to-public filtering, immutable baseline / field authority boundaries and 3,888 calendar-oracle cases remain intact.
- No new external font, images, tracking, API calls, runtime dependencies, watchers, authentication adapters or privately sourced construction records.

## 6. Validation and rollback

Release only after GitHub Actions has validated code tests, calendar oracle, machine/WBS/pilot/progress/visual build and exact readback, public Pages privacy allowlist, and actual GitHub Pages deployment. The new build-time skin check rejects missing/late styles on any real published HTML.

**Known limitation:** Automated source/build checks are not equivalent to independent mobile Safari and desktop pixel QA; obtain new device screenshots before claiming 100% visual perfection.

**Rollback:** Restore v1.6.1 tag for the old proven page design. Do not overwrite or delete the previous deployment evidence; the new arc is forward-only and reversible via Git.
