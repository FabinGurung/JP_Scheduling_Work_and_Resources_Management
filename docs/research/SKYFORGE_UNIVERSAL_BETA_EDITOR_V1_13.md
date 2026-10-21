# Skyforge v1.13 — One Universal Beta Template for All Four Projects

**21 October 2026 · Source-governed, draft-only constellation editing**  
**Main versioned template:** `src/presentation/project-beta-workspace.mjs` and `src/presentation/generic-views.mjs`  
**Calculation contract:** `src/kernel/project-template.mjs` + `src/visual/generic-project-model.mjs`  
**Immutable public dataset scope:** no Drive writes, no private source promotion and no issued construction approvals.

## Previous gap and correction

Previous v1.12 correctly used the common calculation engine for three synthetic datasets, but the generic constellation was read-only. Narayani had richer pan/zoom, inspector, animated scenario and reported MCQ controls at its legacy page. The previously discussed editing beta (node dragging, adding activities, changing links) was **not** committed then. v1.13 implements one project-agnostic edit layer and routes the main workbench and **all four project records** to it.

| Project | Shared beta record | Original preserved |
| --- | --- | --- |
| Community Clinic | `/projects/community-clinic/` | Same six source activities, no public source mutation |
| Pedestrian Footbridge | `/projects/pedestrian-bridge/` | Same eight source activities |
| Uploaded 45-activity construction WBS | `/projects/uploaded-wbs/` | Two source snapshots SHA-pinned; dictionary-only 5020/9050 remain unscheduled |
| Narayani (PRJ-000007) | `/projects/narayani/beta.html` | Original `/projects/narayani/` homepage and `/projects/narayani/visual.html` field interface retained unchanged |

**Level 0:** Overview → **Level 1 sisters:** Studio and Projects → **Level 2:** four project records. `/projects/generic/` is also an instance of the universal editing surface after project import or selection. Project records all use `src/presentation/studio-project-page.mjs`; none duplicate the kernel.

## Editing capabilities

- Select WBS/activity nodes; **drag activity leaves or WBS medallions** to move only local constellation coordinates. WBS geometry is deliberately independent from scheduled time. Connecting branches and dependency path coordinates are regenerated on drop.
- Add an activity with an explicit unique ID, WBS, title and nonnegative integer nominal duration.
- Edit selected activity's name, nominal duration and WBS assignment, or remove an activity with its incident links in the **local draft only**.
- Create/delete a dependency with typed `FS`, `SS`, `FF` or `SF` and explicit integer signed lag. Missing FK, duplicate edge, self-dependency, directed cycle, orphaned WBS, invalid IDs and noninteger durations are **blocked**.
- Recalculate the derived generic four-view model from the modified normalized `LOCAL_UNVERIFIED` input using **the same deterministic compiler**. The recomputed model drives constellation, Gantt, calendar event listing (when actually present) and source-supplied checklists. No separate hardcoded scheduling algorithm is introduced.
- Undo up to 25 local editing operations; restore original published model; download a source-bound unapproved beta package containing canonical JSON, layout coordinates and revision. Reimport verifies the exact project ID and original input SHA-256. No durable automatic browser save, no cloud writes and no silent live project updates.

## Narayani special authority

`src/presentation/narayani-beta-adapter.mjs` reads only the **existing public-safe** `projects/narayani/project-model.json`, checks project identity, 45/49/10/7 counts and baseline/MCQ status, namespaces P6 phase codes as valid WBS IDs and maps the public scenario into the shared four-view display. All **405 original checklist report states** are displayed read-only as `PUBLIC_SAFE_REPORTED_ONLY`. `REPORTED_DONE` does *not* mean engineer-accepted or verified complete. Once a user changes activity dates or dependencies in the local draft, a fresh source-agnostic candidate schedule is recomputed with **zero source-supplied checklist edits**. The preserved Narayani field dashboard continues to show the original governed checklist/report logic and 3D scenario; the beta is not an automated admission of those records into the generic model.

## Safety and QA requirements

1. Verify main public project pages resolve to **one common beta workspace**, plus the Studio generic importer.
2. Unit-test activity edits, adding/removing typed edges, recomputation, model immutability, cycle/fk/duplicate rejection, exported draft source-hash checks and reported Narayani checklist boundaries.
3. Run the complete existing kernel/CLI tests, 3,888 calendar oracle cases, generated generic/Narayani model byte-for-byte verification and GitHub Pages allowlist/privacy readback.
4. Confirm no authenticated Drive write, no source modification, no auto-promotion of unverified progress, no browser persistence claims and no new private data published.
5. User will perform **manual desktop/mobile UI QA** after successful deployment; static CI is not a physical Safari touch test.

## Explicit boundaries for follow-on work

This first actual beta **edits source-derived local drafts**, not the authoritative project records. It does not implement server collaboration, multiuser conflict merges, automatic Google Drive commit, authenticated edits, full P6 round-trip, source issue/revision signoff, or project-baseline admission. Those functions need an independent workflow and controls. Original Narayani-only 3D camera and live field-specific reporting remain in the preserved original page; they are **not silently claimed** for every beta project.

**Reproduction rule:** source-sha + cloned draft normalization + pinning of solver code and assumptions → deterministic calculated view model. Visual-only dragged coordinates are saved separately and never change duration or an engineering status.
