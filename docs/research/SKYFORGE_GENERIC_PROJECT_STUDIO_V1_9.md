# Skyforge v1.9 — General-purpose Four-View Project Studio

**2026-10-20 · Release candidate · Source-first, read-only, public-synthetic**  
**Canonical branch:** `kernel-v0.2-open-source-engines`.  
**Public route:** `/projects/generic/`.  
**Rollback safety:** Earlier annotated `v1.6.1-visual.1` preserved; original Narayani pipeline and all project data untouched.

## The principle the user approved

> Source-controlled project inputs → one normalized WBS, activities, calendars and relationships → one tested kernel calculation → one canonical project view model → consistent constellation, Gantt, event-calendar and evidence/checklist views.

Never copy Narayani's fixed 45 activities, 49 links, 7 milestones or 405 MCQs into a new project's schedule. Never derive actual progress, approved date, inspection clearance, crew availability, material consumption or equipment usage from a prettier timeline. The browser renderer **does not independently recalculate dates**: all four views consume the exact same machine-produced model.

## What v1.9 delivers

1. `src/visual/generic-project-model.mjs`: generic projection that calls `compileProjectDraft` on a project-specific source fixture and reads the resulting kernel activity schedule. Emits a public-safe `SKYFORGE_GENERIC_VIEW_MODEL_V1`, with source-input SHA-256, exact activity IDs, WBS hierarchy, dependencies, event dates, source-defined checklist prompts, provenance and explicit draft status.
2. `src/presentation/generic-views.mjs`: browser-side, dependency-free renderer for **four coordinated views**. Adaptive 2D node constellation (click/keyboard selection and labeled relationships), computed Gantt (same event slots), calendar (only genuine calculated start/finish events, not invented daily work) and read-only source-defined checklist. No checklist → explicit **No supplied checklist** warning.
3. `projects/generic/index.html`: responsive white/teal standalone workbench. Switch between two separate synthetic project examples, or inspect a **locally compiled public-synthetic generic view JSON**; the file is never uploaded. It refuses raw unsupported project WBS files as model input.
4. `machine/generic-projects/community-clinic.json`: a synthetic six-task community clinic with a specific WBS of site, shell, services; five FS links, three explicitly entered synthetic readiness questions; five/six-working-day calendars.
5. `machine/generic-projects/pedestrian-bridge.json`: a different eight-task synthetic pedestrian footbridge WBS, branching fabrication and excavation dependencies; eight FS links, four explicitly supplied synthetic readiness prompts; five/six-day calendars.
6. `scripts/run-generic-visual.mjs --build/--verify`: pins **Git blob SHA-1** of each original fixture, compiles project-specific canonical model, writes separate SHA-256-verified JSON artifacts and machine manifest, and verifies exact byte reproduction.
7. `scripts/build-public-site.mjs`: publishes ONLY the two SHA-validated synthetic **derived view models**, public manifest and reviewed UI via Pages allowlist. Raw fixture inputs, source snapshots and private site data are not published. Model identity and approval flags must match; unauthorized rows fail closed.
8. GitHub Actions requires independent generic build+verify steps, confirms outputs and absence of raw fixtures, while retaining every previous Narayani deterministic, oracle, evidence and privacy gate.
9. `tests/generic-project-studio.test.mjs`: checks two unrelated WBS taxonomies, equal machine/visual scheduling, 100% byte reproducibility on replay, missing-input refusal, no checklist fabrication, no approval promotion, relationship integrity and privacy invariants.

## Project interface

The core compiler expects:

```json
{
  "format": "SKYFORGE_PROJECT_INPUT_V1",
  "classification": "PUBLIC_SYNTHETIC",
  "project": {"id": "DEMO_CLINIC", "name": "Synthetic Community Clinic"},
  "wbs": [{"wbs_id": "CLINIC", "name": "Clinic delivery"}],
  "activities": [{
    "id": "CL01", "wbs_id": "CLINIC", "name": "Survey",
    "duration": 2, "duration_basis": "ASSUMED_DRAFT",
    "assumption_reason": "Synthetic exercise, not an approved duration"
  }],
  "relationships": [],
  "source_manifest": [],
  "scheduling_mode": "CALENDAR_CPM",
  "projectStart": "2026-11-02",
  "horizonEnd": "2027-01-29",
  "projectCalendarId": "FIVE",
  "calendars": {"FIVE": {"working_weekdays": [1,2,3,4,5], "holidays": []}},
  "checklist": []
}
```

**The published generic renderer accepts only a compiled and validated `SKYFORGE_GENERIC_VIEW_MODEL_V1` classified `PUBLIC_SYNTHETIC_DRAFT_ONLY`.** It does not accept a PDF, XER, Excel or unstructured paragraph and claim to have interpreted it. Real private project records require a future authenticated compiler/admission pipeline and independent authorization before publication.

**Same bytes + same pinned engine** ⇒ same canonical JSON and manifest SHA-256, verified by the GitHub workflow. HTML interactive viewport scroll, selection and local state may vary; they do not mutate the model.

## Capabilities and outstanding debt

| Requirement | v1.9 status |
| --- | --- |
| Arbitrary project count and WBS structure via governed JSON | **Implemented** for validated synthetic inputs |
| Multi-calendar CPM to generic four views | **Implemented** for supported calendar contracts |
| All four views share exact activity identity and calculated dates | **Implemented** |
| Missing input / unverified checklist fail-closed | **Implemented** |
| Byte-for-byte build/replay and SHA-256 checks | **Implemented** for public synthetic fixtures |
| Source-traceable reference work items and project assumptions | **v1.8 catalog and compiler remain independent** |
| Narayani original 45/49/405 project website, approval/field states | **Unchanged and preserved** |
| Live private Drive/P6/MS Project/Excel/DXF/PDF importer | **Not implemented in this milestone** |
| Arbitrary site-authenticated real-progress/inspection/checklist workflow | **Not implemented** |
| Global optimal resource leveling / certified issued schedule | **Not implemented** |
| Real browser/mobile pixel interaction validation | **Not certified by static CI** |

The two public projects are explicitly fictitious demonstrations, **not the user's actual building, structural design, construction plan or BOQ**. All calculated dates are draft scenarios, no actual work has been verified. This implements the normalized rendering architecture, not general-purpose automated extraction of all project-specific requirements from the internet.

## Reproduction protocol

1. Pin the canonical engine commit and source fixture identity SHA.
2. Inspect project-specific WBS IDs and FK relationships.
3. Verify every activity's source/assumption duration, calendars, quantities and required hold points.
4. Compile with `compileProjectDraft` (server-side/Node) through `projectGenericVisual`.
5. Require no gaps, false approval claims, orphaned relationships or implicit checklist creation.
6. Run `npm run generic:build` then `npm run generic:verify`.
7. Confirm browser reads only allowlisted generic view JSON and the four representations use the same source schedule.
8. For a real project, **do not** publicly publish model or working records until the private source index, effective revisions, human approvals and privacy classification are independently verified.

The long-term goal remains an AI/SQL-adapted, source-governed project constructor producing equivalent outputs from any valid engineering project. No implementation is allowed to silently fill missing verified information with plausible fabricated quantities or progress.
