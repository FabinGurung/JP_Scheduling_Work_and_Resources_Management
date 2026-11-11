# Skyforge · Gantt Relation Lines and Activity Resources QA
**Change date:** 11 November 2026 · Asia/Kathmandu  
**Development branch:** `kernel-v0.2-open-source-engines`  
**Canonical mobile QA:** https://fabingurung.github.io/jp-scheduling-resources-management/projects/narayani/desk.html#activities  
**Previous source record:** `docs/PRODUCTIVITY_STARTERS_GANTT_ARROWS_QA_20261111.md`

## Decision and outcome

The owner tested the iPhone Gantt and supplied screenshots showing visible FS arrows, while reporting that the repeating `PLANNING ONLY` table column added no immediate value, that an obvious **show all arrows** toggle was missing, and that selecting an activity should expose individual resource *names and quantities* in the bottom Resources tab.

### Activity table: Status demoted (NOT deleted from source)

The seven fields before the Gantt bars are:
1. Activity ID
2. Activity name
3. WBS
4. Original duration
5. Start
6. Finish* (exclusive source scenario boundary)
7. Predecessors

`PLANNING ONLY` status is **not** repeated in every table row. The lower **Status** Activity Details tab still displays source-safe verification state and missing actuals, to avoid conflating an unapproved scenario with real construction progress. Existing 49 source-authored Narayani FS relationships remain unchanged.

### Arrow nomenclature and controls

These lines are **Gantt relationship lines / dependency links**. Valid relationships are FS, SS, FF and SF; the existing Narayani source contains only FS, so it must not display fabricated SS/FF/SF relationships.

Both visible controls are functional:
- **Show all visible links** checkbox (unchecked by default) → selected-activity links when off, all links between currently visible rows when on.
- **Relationship arrows** dropdown → Selected activity / All relationship lines / Hide relationship lines.

Both controls synchronize. WBS or search filtering narrows the visible activity set and therefore the set of arrows; the checkbox does not expose hidden-filter activities, does not change predecessor/successor schedule data and is not a completion approval. Arrow geometry is computed client-side from published source activities, start/end boundary and FS/SS/FF/SF link type.

### Selected activity → Resources: name + quantity + units

The original `machine/source-snapshots/wbs_schedule_sample/schedule_seed.json` is a **synthetic building lifecycle WBS** (45 activities and seven milestones). It does **not** contain verified named-worker, material BOQ or field resource assignments. The public Narayani read-only projection therefore has no genuine resource assignments.

To make the Resources tab useful for preliminary planning, a **separate, explicitly non-authoritative** overlay has been introduced:

- `work-items/narayani-resource-scenarios.v1.json`
- Format: `SKYFORGE_UNAPPROVED_RESOURCE_SCENARIOS_V1`
- Source-project ID: `PRJ-000007`; original task ID + title validated 1:1 against its published source WBS
- **45 tasks / milestones; 116 proposed labour or equipment records**; all 7 zero-duration milestones have zero independent resource lines
- Per-row fields: Resource name; type (`LABOR` or `EQUIPMENT`); proposed quantity; unit (`person`, `machine` or `set`); evidence: **Illustrative · NOT assigned**
- This public overlay is linked to reviewed source seed Git blob `40f2d8e35bf1fd71c5acb84a64272115cacadb99` and itself held by Git blob pin `e70d1ac324a7d7c139ff125f3d55ed8e3aff3f06` in the Pages allowlist.
- The selected activity determines which rows are shown; changing selection never modifies or persists source data.
- No named actual workers, real labour attendance, employment figures, procurement bills or approved BOQ material totals were fabricated.

**Sample reference roster (NOT an actual assignment):**

| Activity | Proposed resources and units |
|---|---|
| T4030 · Establish Site Survey Control & Set Out Building Grid | Surveyor **1 person**; survey assistant **1 person**; total station **1 set** |
| T5030 · Formwork, Rebar, and Pour Footings / Pile Caps | Site engineer **1 person**; formwork carpenter **2 people**; reinforcement fixer **2 people**; concrete crew helper **4 people**; concrete mixer **1 machine**; concrete vibrator **1 machine** |
| M1040 · Milestone: Project Kickoff | **No separate task crew** (zero-duration milestone) |

The Resources pane additionally says **verified assignments: none** and **measured materials / BOQ quantities: not imported**. The source allocation model requires a future governed readback of the actual activity resource assignments and quantities before this overlay can be promoted to a real site resource plan.

## Source boundaries and tests

- **Read-only page:** no Google Drive writes, no private authentication, no manual source edits from browser and no work-release action.
- `src/reference/selected-resource-drafts.mjs` enforces exact project identity, all 45 source activity IDs + titles, seven milestones with zero crew, positive proposed quantities, bounded resource units and explicit non-approval authority. Any mismatch fails closed.
- `src/presentation/scheduling-desk.mjs` loads the optional resource overlay only for the source-scoped Narayani example. Other projects without actual source inputs are not automatically assigned Narayani crews.
- `scripts/build-public-site.mjs` performs allowlist, digest, public-record and private-secret checks.
- Tests: `tests/gantt-all-links-resource-roster.test.mjs`, `tests/scheduling-desk-productivity.test.mjs` and prior engine/privacy regression tests. **CI at this stage:** 304/304 passed, generated 76 HTML outputs; actual on-device visual acceptance still open.

## Mobile acceptance actions

- [ ] Open Narayani Scheduling Desk → Activities + Gantt on an iPhone; confirm **Status** no longer appears among the seven table fields.
- [ ] Select T1030 or M1040. Confirm selected activity relationship lines appear and line names read `FS`.
- [ ] Tick **Show all visible links**, inspect the arrows for multiple activities; untick and verify selected-only mode; use dropdown **Hide relationship lines** to suppress all lines.
- [ ] Use the activity table to select **T4030** and open lower Resources: see surveyor 1, assistant 1 and total station 1 set, all marked provisional.
- [ ] Select **T5030** and confirm the footing crew/equipment counts in the example above; confirm no personal names or falsely approved quantities.
- [ ] Select milestone **M1040** and confirm the Resources tab shows *no dedicated crew*, not an invented staff quantity.
- [ ] Check that seven columns are horizontally scrollable without losing the Gantt and Resources navigation; physical browser QA remains an owner-accepted step.

## Later admission requirements

To populate real assigned resource names and numbers, the owner will need approved WBS activity resource records: role/resource ID, type, assigned quantity and unit (or demand per workday), crew calendar, equipment availability, estimated material BOQ and measured activity quantity. These inputs are **not** inferable from a generic construction norm and should not be merged into site authority until source governance resumes.

**Do not conflate:** rule-of-thumb labour coefficients, hypothetical staffing, actual site crew assignments, BOQ materials, or the right to commence construction.
