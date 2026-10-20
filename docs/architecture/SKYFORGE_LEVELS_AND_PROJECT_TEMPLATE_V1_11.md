# Skyforge v1.11 — One Template, Many Project Records

**Date:** 20 October 2026. **Branch:** `kernel-v0.2-open-source-engines`.  
**Change classification:** navigation/instance architecture, not engineering approval or project-data replacement.  
**Public canonical entry points:** `/` → two sibling Level-1 departments (`/studio/` and `/projects/`), then Level-2 project records at `/projects/{project}/`. Older `/studio/projects/` links remain compatibility routes.

## The governing levels

| Logical level | Canonical public location | Meaning | Authority |
| --- | --- | --- | --- |
| Level 0 | `/` | Only the overview homepage: explain the system | No real-project scheduling data |
| Level 1 | `/studio/` | ONE reusable engine/studio surface: import, normalization, CPM/PDM, EVM, work-item methods, visualization components and QA evidence | Versioned engine and reference contracts |
| Level 1 | `/projects/` | Sister department to Studio: project registry and source-controlled independent project records | Distinct source/evidence authority for each project |
| Level 2 | `/projects/{project}/` | Individual WBS, quantities, relationships, calendars, provenance and view instances consuming the shared Studio engine | Project-level source revision, evidence and approvals |

**Critical:** A "Level 1" is a logical department, not a requirement that all source modules physically sit in one folder. Avoid moving kernel source paths, changing existing deep links or copying each engine into every project directory. All earlier tools continue to work at their established URLs and become linked from the Level-1 Studio.

## Technical implementation

- `studio/index.html` is the single Level-1 portal.
- `projects/community-clinic/index.html` and `projects/pedestrian-bridge/index.html` are the canonical thin independent Level-2 **instances** of the SAME `src/presentation/studio-project-page.mjs` bootstrap and `src/presentation/generic-views.mjs` renderer. They load separate SHA-verified, allowlisted synthetic project models and never duplicate scheduling formulas.
- `assets/studio-project.css` is the common responsive project-instance presentation layer.
- `projects/narayani/index.html` remains the governed Level-2 project; `studio/projects/narayani/index.html` is an older compatibility record. The canonical path is a Level-2 **governed legacy project record** that directs to Narayani's existing source-locked field interface and does not falsely claim an unapproved conversion into a generic project. Its 45/49/405/7 work contracts, evidence and approvals remain untouched.
- `projects/generic/index.html` remains the active project **digitization workbench**, supporting structured CSV/TSV/JSON and strictly scoped local XLSX, P6 XER/XML, and machine-readable PDF extraction. Its source files are unverified until project review.
- `assets/site-shell.mjs` shows only **Overview · Studio · Projects** in primary navigation. Technical tools and historical deep links are retained under **More** and inside Studio.
- `scripts/build-public-site.mjs` has a closed allowlist for the new pages and CSS, then applies canonical unified CSS and enforces public privacy checks. No repository-wide deployment.

## Project creation from a future natural-language request

1. User provides a WBS in plain language, tables, photos, BOQ, PDF/drawings, or construction procedure. **Do not demand a pre-existing Excel/XER file.** Extract a candidate WBS with stable `project_id`, hierarchical `wbs_id`, typed `activity_id`, work descriptions, units and predecessor relationships.
2. Keep input facts in `SOURCE_VERIFIED`, `CALCULATED_WITH_FORMULA`, `ASSUMED_DRAFT`, and `UNKNOWN_OR_BLOCKED` categories. Do not invent actual crew output, working calendars, drawings, issued construction quantities or dates. If a quantity is derivable, record dimensions, source, units, formula, tolerance and revision.
3. Validate the WBS tree (PKs, parent FKs), unique activities, dependency endpoints and cycles, material/crew inputs, source hashes, calendar rules and all unsupported constraints.
4. Derive scheduling results through the **pinned shared CPM/resource/EVM kernel**. Never hand-edit Gantt dates separately from constellation/calendar/checklist views.
5. From the **same canonical structured dataset**, generate (a) Excel schedule workbook with machine-readable IDs, source/assumption columns and formulas/checks when requested; (b) P6-compatible import/exchange XML or XER when validated against its target schema/version; (c) portable normalized JSON; (d) project-specific four views. **Writing a plausible XER/XML file is not evidence of 100% Primavera import compatibility.** Native P6 export generation and round-trip QA are separate from the current browser importers.
6. Add a new project registration with a verified project model path and its own Level-2 record. Do not commit confidential materials to public GitHub Pages or replace an older published site without a checkpoint and rollback.
7. Re-run all kernel, browser-source, schema and privacy tests. Verify published project identity, source digest, deterministic replay and actual release. Device-level appearance QA may be performed by the user.

## Reproducibility and non-hallucination conditions

**Given the same normalized validated input bytes, assumptions, calendar interpretation, engine version, source revision, and publication contract, a project must reproduce the same canonical model and four-view data.**

Different drawings/revisions, source-file parsing interpretations, missing/changed calendars, user-supplied assumptions, weather and unknown resource capacity can change results. Such differences must be visible as diagnostics—not silently treated as the same 100/100 answer.

Engine mathematically derived draft schedules are NOT the site's actual progress; a generated workbook or P6 exchange file is NOT an engineer-authorized baseline or an issued construction document.

## Compatibility ledger

- **Established deep links:** `/projects/narayani/visual.html`, `/projects/generic/`, `/how/`, `/planner.html`, `/machine/` remain active and unchanged.
- **Previous theme / mascot:** White/teal design, Pip's 16 px/s crawl and ten-encounter petting remain as previously released.
- **Private sources:** No site-progress, approvals, private Drive IDs, payment ledgers or inspection release states are copied into the synthetic Level-2 records.
- **Unfinished:** A connected real-project catalog, authenticated source reconciliation, generic signed baseline, and certified P6 export/round-trip remain separate milestones. The new Level-2 Narayani index is deliberately a compatibility bridge until a source-equivalence-tested migration is approved.

## How a future researcher should remember the product

*The website is not the engine, and a project's Gantt is not its source. One normalized engineering engine interprets many evidence-governed project datasets. Level 0 is an overview, Level 1 is the engine, Level 2 is the project. Views and files are projections and exports from that model, never separately invented construction truths.*

## October 20 clarification — Constellation is not an authoring editor

The v1.11 navigation/level reorganization did not touch `src/presentation/narayani-visual.mjs`, `src/presentation/generic-views.mjs` or their scheduling math relative to v1.10. Narayani retains pan/zoom, phase filter, node selection, calendar/scenario playback, optional 3D camera and checklist workflow. The **generic public-synthetic constellation is read-only**: it supports branch navigation, node selection and inspection, but it cannot edit WBS nodes, relationships, durations or publish a new baseline in place. This is an outstanding authoring capability, not a regression caused by the latest navigation change. For data changes, normalize WBS from user description or import in Studio, then rebuild a new deterministic project model; do not silently mutate the served source JSON.
