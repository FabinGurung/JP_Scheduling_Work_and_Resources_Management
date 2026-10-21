# Skyforge v1.12 — Original uploaded WBS in the Generic Four-View Project Engine

**Release scope:** A real *user-uploaded source dataset*, classified by its authors as a **synthetic standard building lifecycle template**, not actual completed construction progress.  
**Canonical routes:** `/projects/uploaded-wbs/` and `/projects/generic/` (choose **Uploaded complete WBS**).  
**Repository branch:** `kernel-v0.2-open-source-engines`.

## Exact input authority

- `Project Schedule Seed Data.md` from the owner's governed WBS_Schedule_Sample Drive folder: copied earlier as `machine/source-snapshots/wbs_schedule_sample/schedule_seed.json`, **Git blob SHA-1 `40f2d8e35bf1fd71c5acb84a64272115cacadb99`**.
- `Master Construction WBS Dictionary.md` from the same folder: copied earlier as `machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md`, **Git blob SHA-1 `ff1e3126efe8811be9bc398054aec601efaf7482`**.
- Both currently stored Git source snapshots were directly compared with the live Drive files and were **byte-identical** on 21 October 2026.
- The source descriptions say **Synthetic P6-style schedule** and **Synthetic Baseline**. Those descriptions are **source context only**; they do not amount to an approved baseline for any real project.

These inputs are not a new hidden synthetic replacement. Every compiled activity and typed dependency is generated from the user-provided `tasks` records through `digitizeTaskSeedJSON`; the WBS titles come from the provided dictionary. No separate dates, tasks or relationships were typed into the presentation layer.

## Reconciled counts

| Measure | Exact source reading |
| --- | ---: |
| WBS divisions | 10 |
| Explicit tasks in the schedule seed | 45 |
| Typed predecessor relationships | 49 |
| Milestones, duration=0 | 7 |
| Dictionary's listed work items | 47 |
| Dictionary-only, **not scheduled** | 2 |
| Approved project baseline | None |
| Source-specified working calendar or project start | None |
| Source-supplied task checklists | None |

**Source difference preserved explicitly:** `5020` Shoring & Retaining Walls (if applicable); `9050` Millwork, Cabinetry & Doors. Those appear in the WBS dictionary but **not the activity schedule seed**. They are reported in the project source-QA panel with status `DICTIONARY_ONLY_NOT_SCHEDULED`. They are not fabricated as 46th/47th scheduled tasks and receive no invented durations, lag or completion.

## Build & publication

`scripts/run-generic-visual.mjs` now provides the third source-pinned fixture `uploaded-wbs` by reading the immutable source snapshots and compiling the source via the existing `src/kernel/generic-digitizer.mjs` and `src/visual/generic-project-model.mjs`. The derived public JSON lands at `generated/public/generic/uploaded-wbs.json`. It has immutable input SHA-256, 45 schedule rows, 49 links, all 10 WBS divisions, no fabricated calendar or inspections, and no engineering release.

`scripts/build-public-site.mjs` enforces the strict third-fixture allowlist, source Git blob IDs, exact counts, zero-date events, the two dictionary-only items, SHA-256 readback, false approvals, and no private source URLs. The raw original Markdown and JSON snapshots are **not copied to GitHub Pages**. Browser presentations all consume the same computed `SKYFORGE_GENERIC_VIEW_MODEL_V1`. This does not create a new independent scheduling engine.

`projects/uploaded-wbs/index.html` is the dedicated Level-2 project QA page. The project registry uses `src/presentation/studio-project-page.mjs`, which also renders the two source-only discrepancies. The Level-1 Projects and Level-1 Studio list the new item. The generic importer Studio offers it as a third public reviewed-source example.

## QA procedure

1. Open `/projects/uploaded-wbs/`. Confirm 10 WBS divisions / 45 activities / 49 links / 7 zero-duration milestone tasks, source warnings and two dictionary-only items.
2. On the **Constellation**, use **Jump to a WBS branch** to browse actual source-defined WBS titles from initiating a project to handover. Select activity leaves to inspect original IDs and computed slots. This is a branching WBS hierarchy, not the Gantt timeline.
3. On **Gantt**, check that durations and starts/finishes correspond to the source-seed's nominal day-slot logic. No calendar or site dates are claimed.
4. On **Calendar**, expect an explicit *No calendar dates exist* message. On **Checklists**, expect *No source-supplied task checklist*; neither should be auto-filled from generic engineering advice.
5. Open `/projects/generic/` and choose **Uploaded complete WBS — 45 activities**; this must be the exact same source-pinned model.
6. Drag-and-drop **authoring** of new constellation nodes, deletion, connection editing, dynamic source revision storage and approval controls are **not yet enabled**. Those are the next workflow milestone, after visual QA of this uploaded dataset.

## Reproducibility

GitHub Actions must run all old tests, 3,888 calendar-oracle cases, `generic:build`, exact `generic:verify`, and public allowlist/privacy readback at the **final commit SHA**. Source file changes, mismatched counts, unexplained dictionary scope or unauthorized approval flags must fail the pipeline.

This release is a visual verification of the user's original submitted WBS, not proof that the activity durations, government procedures, resource loads or final handover are correct for a particular real construction site.
