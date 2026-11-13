# Skyforge milestone — 2026-11-13 — Sheets-backed reference engine and material takeoff

Status: RELEASE BASELINE (before owner-authored Narayani activity/work schedule).
Source repository: `FabinGurung/jp-scheduling-resources-management`.
Frozen application branch: `kernel-v0.2-open-source-engines`.
Do not treat this milestone as structural design, construction schedule approval, project BOQ approval, or Narayani progress sign-off.

## Frozen deliverables

1. Scheduling engine with native CPM scheduling, dependency logic, two synchronized Gantt/calendar views, a mobile-friendly Narayani activity desk, and Saturday-off reference calendar.
2. Existing public Narayani synthetic/pilot WBS: 45 activities, 49 dependencies, 405 checklist items. These are historical project scaffolding, not an owner-approved detailed work schedule.
3. Work Output Planner: 88 work codes / 46 reference rate profiles, with unit-aware crew and productivity calculations.
4. Material references: 27 material categories/items, 36 assemblies and 65 per-unit coefficients; mapping to 88 work records and the existing 45 Narayani pilot activities.
5. Material Quantity Calculator: select an activity or work code, enter independent measured quantities in the unit of each associated assembly, aggregate material totals, show missing coefficients and per-unit order rounding. Never infer kilograms of reinforcement from cubic metres of concrete, or formwork square metres from concrete volume alone.
6. Source architecture: private native Google Sheets under the A9 Drive workspace are editable reference registers; authenticated GitHub Actions reads them with existing read-only Google Workload Identity Federation, validates and publishes source-labelled, public-safe JSON to GitHub Pages. No persistent private token, raw private Sheet, project-approved BOQ, or live private site report is published.
7. Source normalization remains read-only and non-approving. An illustrative material/work reference is not a construction instruction.

## Reproducible QA checkpoints

- Kernel validation: `https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43228474556` — success, SHA `e87a6c29ae4d7b5e4db225cdef1dee2f6bf39ceb`, before this documentation-only milestone commit.
- Sheets-backed publisher: `https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43228606267` — success, publishing the material UI.
- Scheduled authenticated publisher: `https://github.com/FabinGurung/jp-scheduling-resources-management/actions/runs/43331166612` — success, checking continuing refresh.
- Pages base: `https://fabingurung.github.io/jp-scheduling-resources-management/`.
- Materials UI: `https://fabingurung.github.io/jp-scheduling-resources-management/work-items/materials.html`.
- Work output UI: `https://fabingurung.github.io/jp-scheduling-resources-management/work-items/productivity.html`.
- Narayani desk: `https://fabingurung.github.io/jp-scheduling-resources-management/projects/narayani/desk.html#activities`.

## Next phase: author-supplied Narayani schedule as canonical source text

This milestone **must be tagged before replacing/adopting** the owner-supplied detailed Narayani activities.

### Source preservation contract

- The owner will supply detailed work/activity sequence, timing, quantities, dependencies, notes, and corrections in future chat messages or files. **No detailed new schedule has been supplied as part of this milestone.**
- Preserve the owner's exact original words and ordering as an append-only, human-readable `.txt` transcript for Narayani (first), maintaining original units, ambiguities, revisions, dates, and source timestamps. Do not summarize, paraphrase, correct, or silently replace this raw source.
- Keep the **authoritative original transcript in the access-controlled A9 Google Drive project source folder** (Drive is the document warehouse). Link its stable file ID in a restricted internal source register after creation. If it contains names, contractual information, or project details not explicitly cleared for publication, do **not** copy it into this public repository or Pages.
- Maintain separately derived, versioned structures (e.g. activity ID, WBS, start/end/duration, predecessor/successor, material/crew references, quantity, unit, provenance, unresolved assumptions), with line-level trace to the raw transcript. Inferred values and externally sourced benchmarks must never be represented as direct quotes from the owner.
- Preserve earlier public 45-task synthetic/pilot source and this milestone intact. Any new owner-specified Narayani schedule is a **new version**, not an in-place rewrite of historical evidence. Supersede/retire the old schedule in live Narayani views only after source mapping, unit/dependency QA, and reviewed acceptance; preserve an explicit rollback point.
- One canonical approved project data model should derive synced 2D/3D, Gantt, calendar, predecessor/successor, resources and checklists as applicable; do not independently re-enter values across display surfaces.
- User direction for intake: **do not automatically run the incoming words through the existing Work Output Planner, Materials Planner or other estimators**. First capture the words exactly. Any use of reference calculations later is a separate, traceable derived step, subject to the user's subsequent explicit instructions, unit compatibility and source-grade warnings.
- All authored quantities and units are to remain exactly as supplied. Do not fabricate a missing quantity, work rate, concrete mix, reinforcement BBS, or structural approval. Keep unknowns visible.
- The A7 memory wall / repository constellation can point to this project-specific policy; detailed Narayani source and derivations belong to the scheduling repository and controlled Drive source folder.

### Suggested source lifecycle for the next turn

```text
Owner words / supplied documents
    -> restricted Drive / Narayani / Schedule / Source Text / VERBATIM_V000001.txt
    -> timestamped change log and version history (original remains immutable)
    -> derived reviewed WBS / dependencies / durations / resource references
    -> source-to-output QA (identity, unit, order, missingness, privacy)
    -> GitHub versioned public-safe machine JSON and site build
    -> derived Narayani project views on Pages
```

The filenames above are a **future naming convention**, not a claim that any future user's schedule or Drive file has already been received, created, or approved.

## Release policy

Tag the frozen kernel commit and publish the tag as a GitHub Release. The release should point at the exact frozen commit, not `main` (which contains the separate authenticated site publisher). Preserve the release notes and QA references with the release. Do not include new schedule activities in this version.
