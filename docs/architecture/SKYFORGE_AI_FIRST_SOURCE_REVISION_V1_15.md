# Skyforge v1.15 — AI-first source revisions and read-only GitHub Pages

**Established:** 22 October 2026. **Working branch:** `kernel-v0.2-open-source-engines`.  
**Owner intent:** Humans describe changes in ordinary language to the AI assistant. Nobody edits WBS nodes, activity data, dependencies, calendars or project source directly in the GitHub Pages interface; visitors may explore, hover, click and inspect labels. GitHub serves as versioned source infrastructure, GitHub Actions as deterministic validation and deployment, and Pages as read-only display.

## Architecture

```text
Owner → natural-language instruction and/or drawings/file
      ↓
AI interprets intent, locates named project and checks LIVE source authority
      ↓
Typed operation proposal: SKYFORGE_AI_WBS_REVISION_V1
      ↓
Source SHA / activity-WBS foreign keys / typed links / durations / cycles /
 calendars / resources / quantity provenance / unsupported facts validation
      ↓
Explicit UNKNOWN or BLOCKED for missing site information; never silently fabricate
      ↓
Versioned project source candidate with exact diff + source/revision links
      ↓
AI/connected repository workflow updates source, preserving rollback point
      ↓
GitHub Actions runs engine tests, calendar oracle, reproducibility, allowlist
      ↓
Read-only four-view model built from validated source data
      ↓
GitHub Pages: inspect node / edge labels, WBS tree, Gantt, calendar, checklist
```

**No ChatGPT plugin, LLM inference, credentials, file editing, agent or scheduling computation runs inside the static browser viewer.** AI-assisted updates run in a trusted interaction outside Pages, subject to user instruction and source authority. GitHub Actions does not hallucinate: it only executes explicit validation/build commands against a proposed source revision. An Actions PASS is not professional structural/construction approval.

## Read-only UI contract

All four project instances plus the `/projects/generic/` Studio viewer call `renderGenericProject(model,mount)`; they do not mount the former `project-beta-workspace.mjs`. Supported inspection includes:
- Hover/click/tap and keyboard focus/Enter on an activity, WBS node or project root to show its original ID, label and appropriate source/computed context in a floating label beside the item.
- Hover/click/tap/focus on a **gold CPM dependency** to show predecessor, successor, relationship type and explicit signed lag.
- Hover/click/tap/focus on a **teal WBS membership edge** to show hierarchy and explicitly distinguish it from schedule precedence.
- Read-only pan/scroll, WBS branch navigation, dependency visibility toggle, Gantt/calendar/checklist tabs and provenance. These affect presentation only, not source.
- Clear status for synthetic durations, reported-only evidence, unknown calendars and nonapproved actuals.

**Forbidden in Pages:** WBS/activity creation, deletion, dragging to modify layout or source; drag-to-connect; dependency editing forms; uploaded local spreadsheet input; Save/Undo/Restore source; browser compilation/export of new schedule; automatic cloud writes. Previous beta editor/validator modules are excluded from the public output's JavaScript copy list; their checked source remains in the GitHub repository for trusted tooling.

## AI operation contract

The offline module `src/kernel/ai-source-revision.mjs` exports `validateAiRevisionRequest` and `proposeAiWbsRevision`, and enforces:
- `format: SKYFORGE_AI_WBS_REVISION_V1`
- `project_id` must exactly equal the inspected source model's project ID.
- `expected_source_sha256` must equal the canonical source view input SHA; stale/conflicting requests must stop.
- `user_intent_summary` records the plain-language intent at a reasonable length.
- `operations` is a bounded ordered array of explicit actions. Supported: `ADD_ACTIVITY`, `UPDATE_ACTIVITY`, `REMOVE_ACTIVITY`, `ADD_LINK`, `REMOVE_LINK`, `ADD_WBS`, `RENAME_WBS`, `MOVE_WBS`, `REMOVE_WBS`.
- Every activity needs a unique stable ID, valid WBS membership, explicit name and **explicit nonnegative integer nominal duration**. Unknown duration is *not* duration zero. Milestone must be explicitly source-backed.
- Every relationship needs a real predecessor, successor, FS/SS/FF/SF type and explicit signed integral lag. Self-links, duplicate links, cycles and dangling foreign keys are blocked.
- WBS nesting must remain an acyclic hierarchy; nonempty WBS items cannot be removed until their source activities/children have been explicitly relocated or removed.
- Output is `UNVERIFIED_AI_ASSISTED_PROPOSAL` with request digest, original source digest, exact activity delta and calculated model digest. No approved baseline, cost, resource, drawing or site progress is inferred.

Example typed operation generated **by the trusted AI after resolving the user's plain-language instruction**:
```json
{
  "format": "SKYFORGE_AI_WBS_REVISION_V1",
  "project_id": "DEMO_CLINIC",
  "expected_source_sha256": "<read exact published source SHA from the project>",
  "user_intent_summary": "Add an explicitly scoped plumbing task",
  "operations": [
    { "kind": "ADD_ACTIVITY",
      "activity": { "id": "PIPE101", "name": "Install water service",
        "wbs_id": "WBS_MEP", "duration": 3 } },
    { "kind": "ADD_LINK", "from": "EXISTING_FK",
      "to": "PIPE101", "type": "FS", "lag": 0 }
  ]
}
```
*The placeholder IDs and duration above are illustrative only, not fabricated facts for the user's construction project.*

## Source and approval rules

Google Drive remains the authority for original private engineering drawings, specifications, evidence and historical records. The GitHub repository is the authorized version history for public-safe scheduling *code* and reviewed synthetic models. Do not treat a public projection as permission to change private Narayani approvals. If sources conflict, stop publication for the affected project and reconcile before committing. Preserve source revision references/PK-FK mapping/assumptions and a rollback commit.

Never claim a construction schedule has 100% real-world accuracy without explicit quantities, dates, calendars, productivity, resources and reviewed site assumptions. Determinism means **identical validated inputs, pinned engine and same rules reproduce the same output**; it does not turn an unknown site duration into truth.

## Remaining debt

Automatic source-authority discovery/reconciliation for all private Drive projects, signed approval workflows, AI source editing across authenticated apps, format round-trips and live calendar/resource/actuals integration remain independent milestones. A typed AI revision proposal is validated and reproducible, but is **not** autonomous language understanding or automatic server-side ChatGPT execution.

**Pages publication guarantee:** static HTML/JS can display approved-public or synthetic-view models only. All modifications require an external validated source change and repeatable build.
