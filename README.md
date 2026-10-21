## Skyforge v1.14 — Audited roadmap, editor safety repairs (22 October 2026)

**Current product roadmap:** [Skyforge live roadmap](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/roadmap.html) · **Project registry:** [all four projects](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/) · **Engine Studio:** [reusable template](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/studio/).

**Completed in this arc:** synchronized the public roadmap to the actual v1.13 source, documented what is built and all D1–D6 remaining engineering debts, and archived the older SEQ/v0.x product roadmap in a collapsible section instead of presenting it as current status. Corrected two shared beta defects: a blank duration must no longer silently become a zero-duration milestone, and constellation browsing position is retained when editing/dragging rather than snapping to project origin. Draft recalculation now visibly warns that source calendars and checklist reports are not automatically imported into a revised scenario. Added regression tests that keep these requirements enforced across the shared template.

**Incomplete by design:** user-led real-device mobile QA, drag-to-connect and editable WBS parent structure, cross-device persistence/governed project revision adoption, calendar/resource integration in draft edits, verified P6/Excel exports and round-trip, secure actual-cost/progress baselines and IFC geometry-linked 4D. The prior 45/49/405 Narayani source contracts and two unmatched WBS dictionary work items remain unchanged.

**Status rule:** zero open GitHub issues is not evidence of zero technical debt; this roadmap is the current capability and known-debt ledger. Passing regression tests certifies reproducibility of supported mathematical contracts, not engineering approval or physical site facts.

---

## Skyforge v1.13 — Universal Beta Constellation Editor, four project records (21 October 2026)

**One shared main template** now powers all four project beta workspaces and the [generic import Studio](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/generic/). [Full source/QA contract](docs/research/SKYFORGE_UNIVERSAL_BETA_EDITOR_V1_13.md).

**Universal editable project pages:** [Community Clinic](projects/community-clinic/index.html) · [Pedestrian Bridge](projects/pedestrian-bridge/index.html) · [Original uploaded 45-task WBS](projects/uploaded-wbs/index.html) · [Narayani unified beta](projects/narayani/beta.html).

The previously discussed editing tools had **not** been implemented at v1.12: those pages were calculated view-only. They now use one reusable beta UI (`src/presentation/project-beta-workspace.mjs`), one `src/presentation/generic-views.mjs` and the existing `projectGenericVisual` + `compileProjectDraft` to support **activity/WBS medallion dragging, adding/editing/deleting local draft activities, typed FS/SS/FF/SF dependency additions/removals, cycle and FK validation, recomputed Gantt/constellation, undo, restore, and source-hash-bound JSON download/import**. Dragging layout changes only coordinates, not CPM results. All edits remain explicitly **LOCAL_UNVERIFIED**, never live approved construction records.

Narayani's `projects/narayani/project-model.json` is read only through a public-safe adapter, retaining 405 original reported checklist states as `PUBLIC_SAFE_REPORTED_ONLY`. The original field/dashboard, 3D view, inspections and evidence status remain at their established URLs and are untouched. When modifying the local Narayani draft, checklist reports are not carried forward as approved records.

**Not implemented/claimed:** automatically writing edited drafts to Drive, collaborative edits, physically tested iPhone/Safari interactions, real-project baseline admission or cloning Narayani-only 3D/field-management screens across all public examples. The user will perform manual graphical QA after release.

---

## Skyforge v1.12 — Original uploaded complete WBS, source-verified project visualization (21 October 2026)

**New Level-2 project:** [Uploaded Full Construction WBS](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/uploaded-wbs/) · **Level-1 project registry:** [Projects](projects/index.html) · **Shared model workbench:** [Generic Studio](projects/generic/index.html) (choose Uploaded complete WBS) · **Full research and QA contract:** [v1.12 WBS source reconciliation](docs/research/SKYFORGE_UPLOADED_WBS_VISUALIZATION_V1_12.md).

The two uploaded WBS files in the governed planning source folder were independently compared to repository snapshots and matched byte-for-byte. They describe a **synthetic standard building lifecycle template**, not construction works verified on a real site. A source-pinned build compiles **10 original WBS phases, 45 activities, 49 predecessor relationships and seven zero-duration milestones** through `digitizeTaskSeedJSON` into the same generic four-view source model. There is **no separate hardcoded scheduling engine or independent manual HTML timeline**.

**Important reconciliation:** The dictionary lists 47 work items; the activity seed has 45. `5020` (Shoring & Retaining Walls) and `9050` (Millwork, Cabinetry & Doors) exist in the dictionary but have **no scheduled activity**. The Level-2 project shows both as `DICTIONARY_ONLY_NOT_SCHEDULED` rather than creating tasks or durations. No approved start date/calendar, verified field progress, crew capacity, construction checklists or actual completion is invented. Calendar and Checklist views report these absence conditions.

`scripts/run-generic-visual.mjs` now compiles three public synthetic fixture models and verifies their SHA-256 output byte-for-byte. `scripts/build-public-site.mjs` and GitHub Actions use strict source Git-blob pins and allowlist checks and exclude raw source snapshots from published Pages. Prior Narayani source/evidence contracts are preserved unchanged.

**Next goal (not in this release):** Generic constellation editing—adding WBS activities, dragging nodes and changing dependency links—with revisioned draft save, conflict checks and source provenance. Do not confuse current pan/zoom/activity inspection with authoring.

---

## Skyforge v1.11 — One Studio, multiple project records (20 October 2026)

**Level 0:** [Overview homepage](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/) · **Level 1 — Studio:** [Engine](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/studio/) · **Level 1 — Projects:** [Project registry](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/) · **Level 2:** records inside Projects. [Full source/governance architecture](docs/architecture/SKYFORGE_LEVELS_AND_PROJECT_TEMPLATE_V1_11.md).

Studio and Projects are separate **sibling Level-1 departments**. All calculation and digitization tools are discoverable inside Studio; project registration and records belong to Projects. The Level-0 homepage provides an architectural entry point rather than a Narayani-only visual dashboard. The shared global navigation uses Overview / Studio / Projects, with Studio and Projects at the same level; former deep links are retained under More and from the Studio.

Canonical Level-2 URLs: [Community Clinic](projects/community-clinic/index.html), [Pedestrian Footbridge](projects/pedestrian-bridge/index.html) and [Narayani](projects/narayani/index.html). Older `/studio/projects/` deep links remain compatible. The two synthetic instances call the **same shared generic four-view renderer** and read separate source-validated model JSON, without cloning the kernel. Narayani's already governed historical workbench and 45/49/405 records remain at existing URLs; this Level-2 index does **not** falsely claim an unapproved generic conversion.

**Future AI authoring contract:** user may describe a WBS in chat first—no Excel, XER or XML file is necessary. Normalize IDs/scope/dependencies/evidence and identify missing fields, then build requested editable Excel and supported P6 exchange exports from one canonical model, and only afterward instantiate a new source-scoped project record. Native P6 export-round-trip validation is not currently part of the website importer; avoid claiming fully verified P6 authoring until target-version import succeeds. No approved baseline or actual field progress is fabricated.

**Protection:** The v1.10 native importers, source hashes, Pip motion, 3,888 calendar oracle, Narayani source governance and public Pages allowlist remain intact. Earlier project URLs are not removed or redirected. Manual mobile visual QA is reserved for the user.

---

## Skyforge v1.10 — Native Generic Project Digitization (20 October 2026)

**Updated product:** [Generic Project Studio](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/generic/). **Reproduction/specification:** [Native format digitization v1.10](docs/research/SKYFORGE_GENERIC_NATIVE_DIGITIZATION_V1_10.md).

The Studio now supports user-selected **native .xlsx Excel schedule tables, single-project Primavera P6 XER and BusinessObjects XML schedule structures, and machine-readable PDF schedule-table text** in addition to CSV/TSV, structured task-seed and canonical local JSON. Formats are deliberately bounded and schema-sensitive, **not** generalized AI guessing of arbitrary documents. Excel demands exact known header columns; P6 requires explicit hours-per-working-day normalization, preserves WBS parents without fabricating tasks, and rejects fractional conversions; PDF text is extracted locally with pinned PDF.js and must be explicitly reviewed/corrected before draft compilation. Encrypted workbooks, formula-based cells, scanned PDFs and unknown formats fail closed.

**Authority:** Every accepted source remains `LOCAL_UNVERIFIED`, with SHA-256 of the original file bytes, explicit import warnings, and no project approvals or actual-progress writes. Inputs remain local in the browser. PDF.js external runtime JavaScript is fetched on demand; only the module/worker code comes from CDN, never project document data. All four views still use the same deterministic draft project compiler. Original Narayani 45/49/405 field structures and private Google Drive registries remain untouched.

**Validation:** `tests/native-importers.test.mjs` exercises XER, P6 XML, a real compressed XLSX fixture and PDF geometry-extracted schedule rows; existing 3,888 calendar oracle and public Pages privacy build checks remain required. Physical browser graphical QA is intentionally left to the user after release.

---

## Skyforge v1.9 — Project-agnostic four-view studio (20 October 2026)

**Product:** [Generic Project Studio](projects/generic/index.html) · **Researcher contract:** [Generic Project Studio v1.9](docs/research/SKYFORGE_GENERIC_PROJECT_STUDIO_V1_9.md).

The generic project compiler from v1.8 now feeds a **single canonical project view model** to four unified views: WBS/dependency constellation, computed Gantt, start/finish event calendar and **only explicitly source-supplied checklist prompts**. The renderer never recalculates schedule dates in browser or invents completed work.

Independent public-synthetic demonstration projects prove the principle: a **six-activity community clinic** (three draft readiness prompts) and an **eight-activity pedestrian footbridge** (four draft readiness prompts), with different WBS structures and dependencies. No private project data is included.

- Kernel adapters: `src/visual/generic-project-model.mjs` converts `compileProjectDraft` results to `SKYFORGE_GENERIC_VIEW_MODEL_V1`; `src/presentation/generic-views.mjs` renders the four views from it.
- Exact source reproduction: `npm run generic:build` / `npm run generic:verify`. Git blob hashes of each original synthetic input, canonical JSON SHA-256 and manifest checks are enforced on every Actions deployment.
- [Public generic demo](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/generic/) allows switching between reviewed examples and locally opening a precompiled **public-synthetic** view JSON. Raw Excel/PDF/P6/WBS ingestion is **not** implemented in that browser surface; users must first compile and validate inputs.
- Skyforge Pages explicitly publishes only the two derived public-synthetic models, not the original input fixtures, local private project source registers, or unverified field/finance records.
- The previous **Narayani field model, 45 activities, 49 edges, 405 MCQ prompts, 7 milestones, permit/inspection holds and private evidence governance remain unchanged**. Its field UI has not been replaced by the generic prototype.

**Outstanding:** Project-agnostic real-site authenticated importer, issued drawing/quantity revision reconciliation, full resource-loaded baseline, live EVM approval, 3D construction BIM, field evidence sync and independent mobile/desktop graphical QA. v1.9 is a tested **public-synthetic planning engine/display** milestone, not a certification of project scope or issued construction dates. Preserve historical release tag [v1.6.1-visual.1](https://github.com/FabinGurung/JP_Scheduling_Work_and_Resources_Management/releases/tag/v1.6.1-visual.1) and Git history.

---

## Skyforge v1.8 — Engine-first construction planning and work-item library (20 October 2026)

**Authoritative research and runbook:** [Skyforge Work Item & Engine v1.8](docs/research/SKYFORGE_WORK_ITEM_AND_ENGINE_V1_8.md).  
**Public reference catalog:** [Construction Work-Item Library](work-items/index.html).  
**Catalog machine authority:** `machine/work-items/work-item-library-v0.1.json` (Git-blob pinned on public build), optional `machine/work-items/optional-schema-v0.1.sql` (schema only; no database deployed).  

### Kernel advancements before Narayani next calls it

- `src/kernel/schedule-project.mjs` delegates explicit `SHARED_CPM`, `CALENDAR_CPM` or `RESOURCE_LEVELING` modes, auto-routes genuine multi-calendar input to existing calendar-aware CPM, and fails closed if resource constraints could be ignored.
- `src/kernel/resource-priority-audit.mjs` exhaustively checks precedence-feasible serial priority orders for **at most seven activities**; offers a certified optimality result **within that restricted scheduling family only**, not the global NP-hard RCPSP optimum. The existing deterministic serial leveler remains and supports an explicitly validated priority order without changing its default output.
- `src/kernel/governed-evm.mjs` computes EVM only from supplied approved baseline identity/hash, complete verified physical progress and verified cost event ledgers, rejecting unsupported or duplicated events. **No external signature authentication, persistent baseline storage or live finance reconciliation is claimed.**
- `src/kernel/project-template.mjs` compiles **any valid project-specific WBS and activity list** into a canonical *draft machine schedule* with source manifest, explicit quantity/duration assumptions and SHA-256 input identity. Missing durations or calendar/resource definitions return `INCOMPLETE_NO_SCHEDULE` rather than fabricated dates. The generic project four-view UI remains a separate milestone; Narayani's fixed model and safety holds are untouched.
- The public work-item library has **14 trade templates**; only **two specific 2023 CPWD masonry clauses** currently carry numerically source-verified Delhi material coefficients, with a role-based labor coefficient for one clause. Remaining Nepal-specific productivity fields deliberately remain blank. The calculator displays theoretical crew-capacity lower bounds, **not a site duration estimate or construction approval**.
- Historical completed-project source search did **not** identify a reliable joined record of measured output and actual labor-hours, so **zero private site-measured productivity factors** were admitted; further source reconciliation is needed before calibration.

**Required design distinction:** Exact same signed/pinned inputs + pinned code + units + calendars ⇒ exact deterministic machine output. Source evidence and accepted site productivity are not guaranteed by algorithmic reproducibility. Research references: official [CPWD 2023 DAR](https://cpwd.gov.in/Publication/CPWD_DAR_Vol_I_14092023-Civil.pdf), [RICS NRM](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm), [Nepal DoR](https://www.dor.gov.np/mo-dang/publication/qrdc-guidelines-standard-specifications-codes-and-norms), and [ASCE context research](https://doi.org/10.1061/%28ASCE%29CO.1943-7862.0001127).

**Governance:** Publish only allowlisted reference JSON; no updates to Narayani-specific WBS, drawing register, engineering acceptance or private attendance/finance sources. Prior [v1.6.1 tagged release](https://github.com/FabinGurung/JP_Scheduling_Work_and_Resources_Management/releases/tag/v1.6.1-visual.1) remains preserved. The previous v1.7 theme remains active. Deployment still requires all tests, 3,888 calendar cases and deterministic/privacy readback.

---

## Skyforge v1.7 — Unify every published website surface (19 October 2026)

All **14 current public HTML pages**, including generated machine examples and preserved technical/history pages, now load a **single white/teal style last**, after each legacy page's earlier CSS. The Pages builder also performs post-build readback to reject missing, duplicated or earlier-than-legacy canonical stylesheets.

[Unified Theme Arc v1.7 spec](docs/design/SKYFORGE_UNIFIED_LIVE_THEME_ARC_V1_7.md) defines the exact colors, spacing, component behavior, responsive breakpoints, page families and safe treatment of formerly empty layout areas. On older tools/methods/evidence pages, compact **This Workspace / Interpret Results / Continue** panels explain actual available functions and limitations rather than invented reports or decorative filler. On the homepage and already dense constellation/research handbook these context strips are omitted to avoid clutter. Wide cards and desktop layouts use a shared page grid; mobile views retain legible controls, touch navigation and horizontal technical scrolling instead of hiding information.

**Safety:** This arc changes shared presentation CSS/navigation and allowlisted static-site assembly only; no CPM, WBS, calendars, EVM, resources, MCQ, source-pinned models, live-sync controls, permits, engineering approvals, private Drive evidence, or Pip movement. The previous annotated tag [v1.6.1-visual.1](https://github.com/FabinGurung/JP_Scheduling_Work_and_Resources_Management/releases/tag/v1.6.1-visual.1) remains the rollback point. Confirm live CI separately; actual cross-device visual screenshots have not been independently obtained.

---

## Skyforge v1.6.1 — slow continuous zigzag for Pip (19 October 2026)

Pip's previous route had a `3.1s` transition followed by an approximately `2.8s` idle gap. The presentation-only walker now traverses short **serpentine/zigzag segments across the visible viewport at approximately 16 CSS pixels per second**, with next travel scheduled at transition completion instead of an arbitrary 5.9-second cycle. Movement uses distance-based linear CSS transitions and stays completely separate from engineering model, activity progress and approval logic.

The hover approach still makes Pip gently escape (now **1.7s**, rather than the original very fast 0.52s); every tenth encounter retains the **9-second stationary petting window**, plus mobile touch/keyboard input, the user's pause control, and reduced-motion behavior. The deterministic waypoints cover upper/mid/lower screen bands without data reads, network requests, storage or mutation of scheduling logic.

This patch changes only `assets/site-shell.mjs`, `assets/site-shell.css`, its UI regression test, version and this README. The previous v1.6 commit `30c0e5956d09aa0c297bc1d2a366c9ab5f614fc9` is a rollback point. CI and Pages deployment are the release gate; the speed is code-defined, and real-device motion smoothness remains independent visual QA.

---

## Skyforge v1.6 — Screenshot QA, roaming Pip and exact engine doctrine (19 October 2026)

**Reason:** User-provided iPhone screenshots showed a dark outer home page with nearly unreadable section headings, and a miniature all-45-node WBS graph in a tall empty field view. These are explicit UI regressions, not changes in scheduling mathematics.

**Changes:**
- Strong white/off-white home palette and high-contrast text; phone header broken into a readable two-row navigation area with a scrollable view list.
- Mobile constellation defaults to a **490×690 SVG viewport** so individual nodes can be read and selected. Drag to pan, Reset, **Full graph** (45-node overview), and **Find selected** remain available. This is a zoom window, not a new WBS layout/model.
- Pip crawls around the **visible webpage**, fleeing user mouse hover and phone taps. On each **tenth distinct interaction**, Pip stays for a roughly nine-second petting opportunity. Existing user-controlled pause and reduced-motion behavior remain; all movement is ephemeral and unrelated to engineering progress.
- **New [How Skyforge Works](how/index.html)** page is published with interactive CPM/EVM demonstrations **calling the real kernel** with synthetic example data, a truthful built-vs-future capabilities table, and 32 cards in [Anki CSV](how/skyforge-anki.csv).
- Permanent [research doctrine](docs/research/SKYFORGE_REPRODUCIBLE_ENGINE_DOCTRINE_V1.md) enshrines CPM/PDM, WBS, calendars, crew/equipment/material resources, basic EVM, source/assumption authority, deterministic reproduction and the **AI adapter procedure** for truly different projects. **Each project's specific WBS must be compiled from verified project evidence; Narayani's template is not universal.**
- [v1.6 mobile/mascot design specification](docs/design/SKYFORGE_MOBILE_ROAMING_PIP_V1_6.md) records screenshot issues, requested ten-encounter behavior and rollback to v1.5 commit `0e6122e77465e7f39667d771aac2147788126d16`.

**Governance:** The scheduling kernel, project-model schema, 45/49/405/7 Narayani public data, MCQ authority, source hashes and engineered permits/holds are unchanged. The new generic project compiler, approved real cost-loaded baselines and complete P6/MS Project parity are **not** falsely described as delivered. Only public handbook HTML/CSV are added to Pages allowlist. Formal browser/device graphical QA remains separate from GitHub Actions tests.

---

## Skyforge v1.5 — white theme and Pip the scheduling crawler (19 October 2026)

**Design specification:** [Skyforge White + Pip Crawler v1.5](docs/design/SKYFORGE_WHITE_PIP_CRAWLER_V1_5.md).

Skyforge's **shared site navigation, homepage, Narayani 2D dependency constellation, Gantt, calendar, activity drawer and optional Three.js scene** now use a consistent soft-white engineering interface with dark text, teal navigation, amber reported/advisory states and coral hold states. The older flying dragon is hidden rather than deleted; archives and technical views remain in **More**.

**Pip** is an original inline SVG fluffy inchworm-robot. It crawls only along a narrow seven-milestone strip directly below the sticky header (about 33 seconds for an alternating traversal), compresses gently like an inchworm, and never crosses or obstructs scheduling or data-entry controls. The visible **Pip** button pauses/resumes movement, keyboard interaction and `aria-pressed` are supported, and system reduced-motion settings disable motion and the playback control. Seven decorative stops are **not** progress, engineering approval or commitments.

Only presentation files, UI tests, documentation and version metadata were updated. No CPM, WBS model, MCQ schema/answer, drawing data, evidence ledger, permit gate, resource code or GitHub Actions workflow was changed. The allowlisted Pages build, engineering-status fail-closed checks, 45/49/405/7 Narayani model checks, deterministic readback and 3,888-case calendar oracle remain mandatory. Independent browser/mobile pixel QA is distinct from Actions validation.

---

## Skyforge v1.4 — Governed drawing crosswalk and mobile field lookup (18 October 2026)

The existing private Narayani Project File Index (Google Drive) now contains an additional `Skyforge_WBS_Drawing_Crosswalk` tab, keyed by `PRJ-000007` and all 45 canonical WBS activity IDs. It has 101 **candidate** source references across indexed architectural and structural drawing files and the code report; no indexed source has been certified as a live approved issue solely because of this mapping. The mapping is based on WBS discipline/category, **not page- or sheet-level drawing content review**. Statutory permit, dedicated MEP release, issue register, G05/G06/G07/G08 engineering holds and baseline signoff remain unresolved. The existing Files, Project and RunLog sheets remain source authorities; no copies were made.

**Site-engineer workflow:** On the public Narayani constellation/Gantt/calendar page, select an activity → expand the preparation packet → choose **Copy private drawing lookup key**. In the private Project File Index, open the `Skyforge_WBS_Drawing_Crosswalk` tab and find the activity ID. Inspect candidate PDFs/DWGs only through authorized private Drive access, confirm the current effective revision and responsible engineer's documented decision before work release. The public UI copies only an activity lookup key and **does not embed a Google Drive spreadsheet/file ID or private URL**.

**Mobile layout:** Selected date readout is above the multi-month scrolling grid; scrolling hint, touch-sized view tabs, readable labels and selected node/day focus are added. These are responsive source-code changes validated by static/CI tests; independent physical-device/browser checks are still required.

The public `project-model.json` remains a public-safe synthetic scenario, not construction authorization. Its 45 WBS nodes, 49 FS edges, 405 MCQ questions, seven milestones, required human engineering gate releases and opt-in Three.js constellation remain unchanged. Private crosswalk revisions are *not* live-synchronized to GitHub Pages and must not be misrepresented as such.

---

## Skyforge v1.3 — drawing readiness and preparation lookahead (18 October 2026)

The **same canonical 45-node project-model.json** now includes a preparation packet per WBS activity: required drawing/document family, responsible crew, materials and equipment to verify, and the engineering stop point. Five activity-specific Narayani hints are backed by source-category knowledge from the private project file index; indexed drawings are NOT verified issued-for-construction revisions. No private Drive IDs or documents are published.

The Gantt adds narrow teal **two-working-day scenario preparation bars** before planned synthetic work and highlights the selected activity's related predecessor chain. The three-month calendar keeps up to two named overlapping works visible and adds clickable prep cues, leading to the same node's field learning and MCQ checklist. These dates do NOT constitute Narayani's approved programme or authorize procurement, crew booking, concrete pour, statutory permission or structural release.

All 405 MCQ checklist IDs, 49 dependencies, seven milestones, optional Three.js 3D constellation, approved-state safety boundaries and archived pages remain unchanged. The registered source drawings and private ledger remain governed in Google Drive.

---

## v1.2.0 — field engineer learning briefs (18 October 2026)

Every one of the 45 WBS nodes now projects an optional six-part field preparation brief from the same canonical public-safe model used by the constellation, Gantt, calendar, and 405 MCQ checklist items. Ten generic phase briefs cover the full WBS, and five Narayani hold-aware drafts identify relevant preparation and engineering limitations for T5030, T8020, T4030, T3040, and T2050. Expand the field guide in the selected node's checklist drawer; the main interface remains compact. Guidance is educational, never an approved method statement, permit, inspection release, completion, or baseline. No source dimensions, private notes or provider credentials are published.

The edited configuration remains pinned to its exact git blob in the build runner; tests enforce coverage, authority separation and privacy. The existing optional abstract Three.js universe and 2D fallback remain intact.

---

## v1.2 visual progression — optional Three.js universe and field-workflow debt reduction

Skyforge's **2D constellation is still the offline-safe default**. The Narayani visual command center now includes an optional **3D Universe** tab, loaded only when selected, using pinned Three.js v0.180.0 from a CDN. It renders the same 45 WBS activity IDs and 49 dependency edges as the canonical public-safe `project-model.json`, supports orbit/zoom/star selection, and synchronizes activity selection and the hypothetical timeline with the checklist and other views. Missing WebGL, CDN errors or a lost rendering context revert to 2D with a visible notice.

Work steps are compacted into four expandable work-stage sections: Before starting, Prepare the crew, Execute the work, Inspect & hand over. The Gantt now reads both bounded site-diary observations and structured **reported-only MCQ state**, fixing discrepancies such as T1010 reported complete showing as unreported in Gantt. The selected activity also lists its possible successors without falsely authorizing their release.

The shared site shell's root detection now uses the exact repository root, not every nested directory ending in `/`. This fixes project-index URL styling. Every prior WBS document, old page and engineering tool remains in GitHub and under **More**; no source data or MCQ event history was deleted.

**Remaining gates:** The optional 3D constellation is an abstract dependency visualization, **not** surveyed BIM/IFC, not a construction animation with actual geometry. Activity checklists remain generic nine-item templates; actual method statements, ITP, drawing-grid locations, engineering signoffs and an approved dated baseline require project adoption. GitHub Pages cannot authorize engineering clearance. The automated Slack event reconciliation and Google WIF sync must not be called fully operational without a verified real authenticated read/write and publication cycle.

---

## Skyforge site engineer homepage and More (October 2026)

The primary GitHub Pages homepage is now deliberately **compact**: one launch point into the Narayani constellation, Gantt, three-month calendar and checklist, all backed by one reviewed `project-model.json`. The shared navy/teal Skyforge header/theme is injected into every allowlisted HTML page, including engineering/knowledge archives, through `scripts/build-public-site.mjs`. The More menu preserves the original field homepage at `more/legacy-home.html`, the classic detailed Narayani WBS, technical planner, engineering lab, machine evidence, developer roadmap, and historic technical dashboard—no source records, calculations, or workflows are deleted.

The public site keeps all engineering approvals and planning dates unapproved unless their authority is verified. Site engineers should not use the archived manual field-report form as the official structured MCQ channel.

**Actions:** only the full Pages deployment is triggered for every canonical branch push. The synthetic machine evidence builder remains available **manually**, eliminating duplicate automatic machine CI while retaining every validation inside full deployment; historical knowledge validation remains restricted to its historical branch. The independently gated authenticated Drive sync remains disabled until provisioned.

---

## v1.1 visual preview — graph-first field engineering workflow

[Launch Narayani Constellation](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/narayani/visual.html): one `project-model.json` supports an animated SVG activity graph (45 activities and 49 dependencies), Gantt, rolling three-month calendar, seven milestones, and 405 activity-level checklist prompts (nine per activity). The calendar uses an **illustrative** six-day week starting 2026-10-19; it is NOT the approved construction schedule. Editing the scenario date in the browser never alters authority.

The field engineer copies the provided `P=PRJ-000007 | A=T5030 | C=T5030-C01 | Q=B` multiple-choice response into a dedicated **private Slack channel** `#site-progress-mcq`. This initial release provides the structured message contract and parser, **not** an unattended Slack-to-GitHub progress writer. ChatGPT may reconcile replies using available Slack tools upon explicit execution, with evidence and validation; reported work never becomes an engineering signoff automatically. The original v1.0 OIDC Drive sync remains unactivated.

Raw hierarchy + checklists come from pinned, reviewed project mapping inputs and the visual config. A deterministic CI build produces ONE allowlisted `project-model.json` with a SHA-256 manifest. The private event ledger, when introduced, should be append-only JSONL in governed private Drive or normalized SQLite on a private server; never write sensitive Slack messages into public GitHub Pages.

---

## v1.0 (staged) — authenticated, read-only Narayani progress synchronization

v1.0 adds a tested *gated* Google Sheets reader using GitHub OIDC → Google Workload Identity Federation → a dedicated read-only Google service account. It dynamically aggregates source-scoped Narayani progress and readiness rows, maps known P6 subwork conservatively, enforces unique event IDs/date bounds/minimum source counts and publishes a sanitized SHA-256-audited `progress.json`. Detailed source rows and identities never enter GitHub Pages.

**Not active by deployment alone:** The WIF provider, service account Viewer sharing, repository Actions secrets and `NARAYANI_SYNC_ENABLED=true` variable require one-time configuration; the default-branch scheduler is gated. The existing one-time v0.9 snapshot remains served until a successful authenticated run. No full P6 activity or structural hold can be automatically approved. [Activation and security SOP](docs/NARAYANI_AUTHENTICATED_SYNC_V1.md).

---

## v0.9.0 — Narayani Drive-to-WBS source reconciliation

The [Narayani single-page roadmap](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/narayani/) now contains a **public-safe evidence summary** derived from a controlled, read-only 15-Oct-2026 Google Drive reconciliation: 34 dated site diary event records, 4 readiness records, 14 source status DONE (not approved task completions), 4 limited subwork observations mapped to T5030/T4030, and 30 site-specific/unresolved records. No schedule completion, permit, engineer signoff or approved baseline is fabricated.

The detailed per-event source PKs, notes, and source links remain in private Narayani Drive reconciliation register and **are not committed to GitHub**. GitHub contains only the reviewed aggregate JSON at `machine/project-mappings/narayani-progress-public-v0.1.json`. CI pins that exact blob, validates zero approvals and SHA-256 output and copies only a sanitized projection under `projects/narayani/progress.json`. Build: `npm run pilot:build && npm run progress:build && npm run progress:verify && npm run site:build`.

The reusable private source adapter (`npm run progress:private-reconcile -- PRIVATE_EXPORT.json`) accepts authenticated structured Google Sheets row exports and produces machine-reconcilable **private** audit/candidate outputs under `generated/private/narayani`; it never publishes those outputs or accesses Drive directly. **Live auto-refresh is NOT enabled**: deployment needs separate authenticated Drive credentials/permissions, source reconciliation and an explicit reviewer-controlled publication gate; GitHub Actions cannot access private Drive on its own. Do not commit private exports, credentials, PKs, photos or source documents. Use the status and action checks, not a false 'ready to start' signal.

---

## v0.8.0 — Narayani Parajuli governed P6-style WBS pilot

The [Narayani field roadmap](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/narayani/) is a public-safe, read-only **project-mapping pilot**. It reuses the pinned master Primavera P6-style WBS, with 45 activities, 49 FS relations, 7 milestones and 10 phases. Dictionary-only items 5020/9050 remain unresolved, not invented.

Mapping reference: `machine/project-mappings/narayani-v0.1.json`. Five source-derived, unapproved hold/review points cover the RCC/masonry interface, plumbing coordination before tie-beam closure, permit-stage conflict, underground tank code hold (outside master template), and project-specific drawing/block split. The machine mapping is deterministic and source-pinned; test it with `npm run pilot:build && npm run pilot:verify`.

**Do not use the synthetic master durations or critical path as Narayani's adopted baseline.** No real site task, permit, milestone, readiness, actual start/finish or engineering approval is confirmed. The public project page does not publish private Drive file IDs, contacts, drawings or photographs. Private authorizing evidence remains in the user's controlled Narayani Drive project. Evidence ingestion and role-separated approval for this project are a separate unimplemented workstream.

---

## v0.7.0 — on-page field observation, evidence and review handoff

The public field roadmap is still one page, now with a "Report work from site" evidence-entry form. Every report includes a site observation, timestamp, activity FK, human-reported name and an HTTPS evidence reference, but it is **always unverified**. A local JSON download is uploaded manually through an authorized Drive account to the registered intake folder; there is no public POST gateway, server-side authentication or automatic completion. The current WBS is a synthetic demonstration, not a named real site.

[Field intake specification](docs/FIELD_PROGRESS_INTAKE_V1.md) · [Authorized Drive intake](https://drive.google.com/drive/folders/1NZKE-1-QwHSmxK_HwuJNc97_QmQSkvQN) · [First milestone roadmap](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/).

---

# Skyforge — Construction Site Roadmap

**For field staff:** start at [Site Roadmap](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/). One mobile-friendly page displays all phases, major milestones, and the ordered activities required to reach them. Open a step to inspect its source-linked predecessors. Real site status/authorization is NOT supplied, so no progress is fabricated.

**For planners and administrators:** use the "Planner / Admin" disclosure. The existing editable [resource scheduler](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/planner.html), [engine lab](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/kernel-lab.html), [machine evidence](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/machine/), and [archived original dashboard](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/advanced.html) remain accessible.

**Source contract:** the public UI reads *only* the verified machine-generated JSON at `machine/wbs-sample/plan.json`, including explicit predecessor IDs from the reviewed synthetic source. Fail-closed validation checks classification, WBS rollups, activity identities, milestone identities, declared semantics, and FS feasibility. GitHub Actions recomputes native CPM with an independent oracle and emits a source/output SHA-256 manifest. No AI text counts as a certified construction fact.

**Important:** The currently displayed 45-activity WBS is a **synthetic demonstration**, not a real construction site or progress record. Workday slots are relative; the source has no start date, resources, authority approval or verified site status. Future authenticated site progress ingestion must include evidence, approved roles, and revisioned audit trails before any "today"/"done"/"blocked"/"ready" claim.

---
# Project Controls Kernel — Skyforge | Machine execution v0.5.0

Open, testable project-controls kernel for construction planning and execution.

## Branch policy

All new ChatGPT development continues on **one working branch**:

`kernel-v0.2-open-source-engines`

The branch name is historical. Milestones v0.3, v0.4 and later evolve **in place on this same branch**. `main` and the earlier prototype branch remain preserved and are not used as scratch branches.

## Product surfaces

- `index.html` — light Skyforge product homepage with live links, capability explainer and preserved synthetic P6-style chart
- `kernel-lab.html` — scheduling calculation / adapter engine lab
- `planner.html` — interactive resource-leveled scheduling workspace backed by the v0.4.2 kernel
- `roadmap.html` — one-page development roadmap
- `knowledge/` — separate Construction Knowledge portal for engineers
- `knowledge/shuttering.html` — direct share link for Shuttering / Formwork
- `knowledge/waterproofing.html` — direct share link for Waterproofing
- `knowledge/soak-pit.html` — direct research-gated Soak Pit link

## v0.2 foundation

CPM forward/backward pass, FS/SS/FF/SF + lag, negative float, total/free float, working-calendar mapping, earned value, resource-overload detection and five upstream adapter contracts.

## v0.3 — core pass

- WBS tree validation and rollups
- data-date activity statusing
- actual start / actual finish validation
- remaining-duration validation
- paired suspend/resume progress boundaries for in-progress tasks; a future resume holds the remaining segment without changing immutable actual start
- remaining-work rescheduling across FS / SS / FF / SF relationships + lag
- completed-predecessor actuals carried forward as remaining-work boundary constraints
- FS / SS start-driving logic into already in-progress successors treated as satisfied; FF / SF finish-driving logic remains active
- fail-closed validation when relationship actuals / IDs / types are insufficient
- schedule-driving constraints in base CPM:
  - START_ON_OR_AFTER / FINISH_ON_OR_AFTER drive the forward pass
  - START_ON_OR_BEFORE / FINISH_ON_OR_BEFORE drive the backward pass / float
  - MUST_START_ON / MUST_FINISH_ON act as exact bounds when feasible
  - conflicts remain explicit constraint violations and can create negative float
- all six native constraint types translate into remaining-work/data-date coordinates
- start constraints on started work check immutable actual starts; finish constraints govern remaining work
- completed work retains actual-based constraint checks, including an all-completed schedule
- SS/SF from an in-progress predecessor use its actual start instead of its remaining-work restart
- typed TASK / START_MILESTONE / FINISH_MILESTONE support; milestones must be zero-duration atomic points
- all activities, including long SS/SF predecessors, respect the backward-pass project completion boundary
- forecast QA findings: open ends, leads, duplicate relationships, negative float, constraint violations and missed starts
- progress QA: out-of-sequence recorded actual events, unresolved predecessor-actual boundaries, data-date slippage and zero-remaining/no-finish contradictions
- Engine Lab applies the same constraints to both baseline and remaining forecasts, with data-date and constraint controls
- malformed actuals and numeric fields fail closed; the legacy shared-slot scheduler still rejects multiple activity calendars
- constraint policy supports `STRICT_ALL` and deterministic `PRIORITY_RANKED`; priority never overrides relationships, required finish or immutable actuals
- calendar contracts now preserve validated IANA time zones and weekday working periods, while native intraday execution remains fail-closed
- native execution of contract-only resource-dependent/level-of-effort activity types, retained-logic/progress-override modes, multi-window intermittent progress and broader real-project QA remain deferred beyond the v0.3 core

The original `scheduleNetwork` API remains a **shared working-slot model** for regression stability. SEQ5 adds a separate native calendar-aware day scheduler; neither path is a claim of P6 compatibility. See [Scheduling semantics](docs/SCHEDULING_SEMANTICS.md) for exact supported rules and limitations.

Run `npm test` for the regression suite. `node scripts/verify-schedule-oracle.mjs` performs a longer, independent bounded placement enumeration; it is deliberately separate from the fast CI suite. All dates, actuals and quantities in Engine Lab are synthetic demo data.

## SEQ5 — native calendar-aware day scheduling

The separate `scheduleCalendarNetwork` / `rescheduleCalendarRemaining` path now supports:

- per-activity working-week calendars and holidays
- FS / SS / FF / SF relationships in a common civil-day event coordinate
- signed working-day lag with explicit `PREDECESSOR`, `SUCCESSOR`, `PROJECT` or `EXPLICIT` lag-calendar policy
- forward and backward feasible placement across different calendars
- the same six native date constraints and typed zero-duration milestones
- data-date remaining-work scheduling with immutable actual starts/finishes and completed-predecessor boundaries
- bounded-horizon, integer-working-day, fail-closed validation

Calendar-aware total/free float is reported as **civil-day event distance**, not P6 work-period float. SEQ11 adds time-zone/working-period contracts and constraint-priority policy, but native intraday scheduling, suspended/intermittent work, contract-only resource-dependent/level-of-effort execution, and P6/MS Project parity/exchange remain later work.

The SEQ5 regression file contains 18 focused tests. `npm run verify:calendar` independently enumerates 3,888 bounded placements across calendar pairs, holidays, all four relationship types, signed lag and three non-explicit lag-calendar modes.

## SEQ8 — suspend/resume progress semantics

The remaining-work APIs now accept a paired suspension/resume boundary for **in-progress TASK activities**:

- shared-slot updates use `suspend_slot` + `resume_slot`
- calendar-aware updates also accept `suspend_date` + `resume_date`
- the suspension must be on/after actual start and on/before the data date
- the resume must not precede suspension
- when resume is after the data date, the remaining segment is held until that boundary; calendar-aware placement then advances to the activity's next working day
- incomplete pairs, not-started/completed activities and milestones fail closed

This is intentionally one suspension/resume boundary for forecast control. Multiple intermittent work windows, P6 suspend/resume parity and time-of-day semantics remain later work.

## SEQ9 — level-of-effort + resource-dependent activity contract

The canonical activity schema now recognizes `LEVEL_OF_EFFORT` and `RESOURCE_DEPENDENT` alongside TASK and the two milestone types.

- LOE is modeled as a boundary-derived span, not as a milestone and not as an independently fixed-duration task.
- Resource Dependent is modeled as assigned-resource-calendar dependent; it is **not** treated as a synonym for generic effort-driven scheduling.
- Both types are `CONTRACT_ONLY` in v0.3 so adapters can preserve/round-trip their identity and source fields without the native schedulers fabricating unsupported dates.
- The shared-slot and calendar-aware schedulers fail closed when asked to execute either contract-only type.
- TASK and milestone behavior remain unchanged.

The contract is intentionally informed by the same five upstream references already used by the kernel: IfcOpenShell/Ifc4D, OpenProject, ProjectLibre Desktop, TaskJuggler and GanttProject. Their behavior is used as compatibility/reference evidence; implementation code is not copied.

## SEQ10 — progress QA diagnostics

Remaining-work results now include a `progress_qa` diagnostic package without changing retained-logic scheduling behavior.

- Recorded successor actuals are checked against the actual predecessor event required by FS / SS / FF / SF logic.
- A proven actual-event violation is reported as `OUT_OF_SEQUENCE_PROGRESS`.
- If the successor event is actual but the predecessor actual needed to prove the relationship is not yet recorded, the result is `ACTUAL_LOGIC_UNRESOLVED` information rather than a fabricated violation.
- Calendar-aware QA evaluates relationship lag on the already-resolved lag calendar.
- Data-date checks identify activities that should already have started/finished, in-progress work beyond its baseline finish, and zero remaining duration without an actual finish.
- Existing malformed/future actual validation remains fail-closed.

These are diagnostic findings only. Seq10 does not introduce Primavera retained-logic/progress-override modes, rewrite actual dates, or certify a P6/DCMA schedule.

## SEQ11 — constraint priority + working-hours/time-zone foundation

The two native scheduling paths now expose an explicit constraint-policy contract:

- `STRICT_ALL` remains the default and preserves prior behavior: every declared constraint is schedule-driving even when conflicts produce negative float or violations.
- `PRIORITY_RANKED` accepts nonnegative integer `priority`; a higher number wins only when declared constraints on the same activity are directly incompatible.
- Compatible lower-priority constraints remain active.
- Equal-priority incompatible constraints fail closed instead of using input order as a hidden tie-breaker.
- Priority does **not** override relationship logic, required-finish targets, data-date rules or immutable actuals.

The calendar-aware path also validates a time contract without pretending that day scheduling has become minute scheduling:

- project/calendar `time_zone` values are validated as IANA time-zone names.
- optional weekday `working_periods` use non-overlapping `HH:MM` intervals and record nominal minutes/day and minutes/week.
- overnight intervals are intentionally unsupported in the Seq11 foundation.
- the scheduler still executes at `DAY` resolution; requesting intraday execution fails closed.
- returned schedule metadata labels native intraday support as `CONTRACT_ONLY`.

The same five upstream references remain the basis for interoperability and behavior research: IfcOpenShell/Ifc4D, OpenProject, ProjectLibre Desktop, TaskJuggler and GanttProject. Seq11 reimplements its own deterministic contract and copies no upstream scheduler code.

## v0.4 — Resource & Productivity Engine

SEQ12 starts the v0.4 engine with explicit resource/productivity contracts rather than stretching the legacy overload detector.

- resources are typed as `LABOR`, `EQUIPMENT` or `MATERIAL`
- labor/equipment are renewable-capacity resources with `max_units`; materials are consumable resources with quantity/inventory metadata
- resources can carry explicit `calendar_id` values for later resource-dependent scheduling
- crews require an explicit crew calendar and reusable labor/equipment members; crew expansion preserves source-crew traceability
- quantity-to-productivity duration supports per-workday rates and per-hour rates using explicit working minutes/day
- productivity-derived durations preserve original duration and calculation provenance
- resource histograms report renewable demand/capacity/utilization/overloads and material consumption/cumulative totals by integer schedule slot
- the legacy `findResourceOverloads` API remains backward-compatible

This first v0.4 boundary does not move activities to resolve overloads, enforce material inventory availability, or execute RESOURCE_DEPENDENT activities against resource calendars. Those remain later v0.4 boundaries before resource leveling is claimed.

## SEQ13 — resource-dependent placement + availability

The v0.4 resource engine now has a dedicated native placement path for `RESOURCE_DEPENDENT` activities.

- the canonical activity contract marks Resource Dependent work as `RESOURCE_ENGINE`, while the ordinary shared-slot/calendar CPM paths still fail closed instead of substituting an activity calendar
- at least one renewable LABOR or EQUIPMENT assignment is required
- direct renewable assignments require a resource calendar; crew assignments contribute their explicit crew calendar; when both resource and crew calendars exist, availability is their intersection
- resource demand is aggregated per assigned renewable resource and checked against `max_units`
- optional fixed `resourceReservations` consume capacity by slot/date; the activity waits for a feasible slot but the engine does not resequence or optimize other activities
- material assignments require explicit inventory truth, support total quantity or quantity-per-work-slot, and may receive dated `materialReceipts`
- material is consumed only on actual eligible work slots; insufficient supply delays forecast work until supply exists, otherwise the declared horizon fails closed
- output exposes the exact working slots, required calendar IDs, renewable demand, material consumption, and `resource_leveling_applied: false`

This is deterministic single-activity resource-dependent placement against declared/frozen availability. It is **not resource leveling** and does not optimize a multi-activity resource-constrained network. Resource leveling remains the next v0.4 boundary.

## Knowledge separation

`activity_id` is a project schedule occurrence. `work_id` links that occurrence to reusable site knowledge such as ARC, WMS and ITP/QAQC.

Construction knowledge is deliberately usable as a standalone engineer-facing site rather than forcing field engineers into the Project Controls UI.

## SEQ14 — bounded multi-activity resource leveling (v0.4.2)

The independent levelResourceDependentNetwork function in src/kernel/resource-leveler.mjs implements a deterministic serial topology/ID-priority schedule generation scheme for unstarted RESOURCE_DEPENDENT activities. Seq13 single-activity placement remains unchanged.

- Accepts FS/SS/FF/SF precedence, signed working-day lags, explicit/project/predecessor/successor lag-calendar modes.
- Stable lexical activity ID breaks ties between precedence-eligible candidates; this is not global optimization.
- Allocates shared renewable LABOR/EQUIPMENT capacity against fixed reservations, intersecting resource and crew calendars.
- Tracks shared material stock with dated receipts and safeguards previously allocated future consumption.
- Reports slots, resource/material allocation ledgers, reference starts, leveling delays and conflict diagnostics.
- Rejects date constraints, actual/progress/data-date updates, mixed activity types, and intraday scheduling until semantics are supported.

This first bounded Seq14 boundary does not imply Primavera/ProjectLibre leveling parity or a globally optimized makespan. User-interface integration is separate. Run npm test; the 3,888-case calendar oracle is unchanged.

## v0.4.3 — Browser scheduling workspace (Seq15)

Open `planner.html` from GitHub Pages or the **Open Scheduler (F9)** link on the P6-style prototype. Edit activities, resources, assignments and FS/SS/FF/SF relationships. Press **Schedule** to run the existing `levelResourceDependentNetwork()` kernel; review allocated-day Gantt, calendar dates, resource utilization and resource-leveling delay diagnostics. Import/export versioned JSON or save a draft in browser localStorage (not cloud). Imported JSON can include fixed reservations, crew definitions and dated material receipts supported by the underlying engine. Only unstarted RESOURCE_DEPENDENT day-resolution work is supported. Actuals, constraints, mixed activity types, intraday modes and global makespan optimality remain outside scope and fail closed. Published static frontend has no database or Google Drive synchronization. The original landing demo remains synthetic.

## Seq16 v0.4.4 — Skyforge theme and product clarity

The website is light-first with white clouds, golden/orange lightning and a looping decorative SVG dragon; users can pause animations and reduced-motion media preferences are respected. The theme is lightweight local CSS/SVG, not a new scheduling engine. Homepage now explains the vision, working calculator/API boundaries, required construction planning inputs, a 3-step walkthrough, which features are still planned, and the **five upstreams actually registered** in `UPSTREAM_SOURCES.json`: IfcOpenShell/Ifc4D, OpenProject, ProjectLibre, TaskJuggler, GanttProject. They are references/adapters, **not incorporated runtime codebases**. Previous demonstration/Gantt, live scheduling, lab, roadmap and knowledge URLs remain. Roadmap corrected to show Seq14 leveling and Seq15 planner completed. See `docs/SKYFORGE_DESIGN_AND_PRODUCT_BLUEPRINT.md` for visual spec, product plan and QA checklist. No kernel scheduling semantics, persistence, real project records, or P6 parity has been changed or claimed. Independent browser/mobile visual QA is still a separate gate.

## v0.5.0 — AI conductor / GitHub machine execution

The GitHub runner, not ChatGPT, is now responsible for calculating a **synthetic** example schedule from a pinned structured JSON request. Run `npm run machine:build`, `npm run machine:verify`, `npm run site:build`. Actions validates the same inputs and deterministic outputs and uploads signed-by-content SHA-256 provenance to the run artifact. GitHub Pages shows only an approved public-safe synthetic machine build under `/machine/`; the site builder now deploys a strict file allowlist rather than the entire repository. Five adapter payloads are emitted **as explicitly unverified previews**, not actual upstream integrations. Real building CAD geometry, actual site data, engineering design validation, external API credentials and project approvals remain out of scope for this scheduling repository.

Read `docs/AI_MACHINE_EXECUTION_CONTRACT.md` for the proposed future authenticated project gateway, engineering source and approval boundaries, expected output packages, and the five-specific external acceptance tests. Independent browser QA and upstream tool execution are not certified by this change.

## v0.5.1 — first machine-executed Drive WBS / CPM sample

The source [WBS_Schedule_Sample folder](https://drive.google.com/drive/folders/1URHEOYqqJZ0xjn7ATQkip35MPuH39W6M) contains a Drive-owned synthetic schedule seed and WBS dictionary. Original files stay in Drive unchanged. Explicit **immutable public-synthetic snapshot Git blobs** are pinned in `scripts/run-wbs-sample.mjs`. GitHub Actions now runs `npm run wbs:build` and `npm run wbs:verify`, invoking the existing **native zero-lag FS CPM** and a separate independent topological longest-path oracle; it produces `plan.json`, `activities.csv`, `gantt.svg`, `index.html` and a SHA-256 `manifest.json`. The site allowlist publishes only these verified outputs under `/machine/wbs-sample/`, not the underlying Drive snapshot files. The 45 tasks, 49 FS relationships and 7 milestones generate a **481 abstract working-day-slot** schedule, not dates. Missing dictionary items 5020 and 9050 are warnings, never invented tasks. No crew, quantities, resources, productivity, cost, external scheduler runtime or approved construction/structural design is claimed.
