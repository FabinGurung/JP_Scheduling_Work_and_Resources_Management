# Skyforge Visual + MCQ Data Contract v0.1

## Product direction
The core field product is a construction execution graph rather than a P6 imitation. It has one immutable, versioned visual **projection** `projects/narayani/project-model.json`; Constellation, Gantt, Calendar and Checklist components **all load that single file**. This projection is regenerated from a source-controlled master WBS and checklist templates plus a strictly sanitized reported-state snapshot. Calculation algorithms remain separate under `src/kernel/`.

### Source and event lineage (PUBLIC versus PRIVATE)
```
PRIVATE / AUTHORITATIVE
  Narayani drawings + site progress (Drive)
  #site-progress-mcq Slack channel (strict MCQ source)
            │ validate activity/checklist answer
            ▼
  Google Drive PRIVATE event ledger
  SKYFORGE__PRIVATE_MCQ_PROGRESS_EVENT_LEDGER__V1__PRJ000007
  Sheet: Events (append-only, deduplicated by Slack channel+message_ts)
            │ ChatGPT/operator validates reported-only state
            ▼
PUBLIC / SANITIZED — no Slack source IDs, user names or evidence links
  machine/project-mappings/narayani-mcq-public-state.json
  + original synthetic schedule_seed.json + WBS dictionary
  + reviewed checklist-config-v0.1.json + safe progress aggregate
            │ deterministic build with SHA-256 manifest
            ▼
  projects/narayani/project-model.json     ◄── ONE data model for all views
      ├─ Constellation: 45 activity nodes / 49 prerequisite edges
      ├─ Gantt: same start/finish relative slots and activity statuses
      ├─ 3-month calendar: same slots in illustrative six-day work scenario
      ├─ Checklist drawer: 405 typed questions
      └─ MCQ generation: stable activity/checklist IDs and answer options
```

## Structured Slack answer
The site engineer uses private `#site-progress-mcq`; the UI creates:
```
P=PRJ-000007 | A=T5030 | C=T5030-C01 | Q=B
```
Here `P` is project ID; `A` is exact WBS activity ID; `C` is a checklist ID, or literal `ACTIVITY`; `Q` is choice A–E from the shared model. No open-ended message interpretation is needed. Checklists have A not done, B in progress, C reported done, D blocked, E request N/A review. Whole activity answers have A not started, B in progress, C reported complete, D blocked, E needs clarification.

**Unverified report vs approval:** Activity state `REPORTED_COMPLETE` and checklist `REPORTED_DONE` are *not* `VERIFIED_COMPLETE`, not a permit, and not an engineer's release. The node may pulse amber for a report, but successors shall not be unlocked as actual authorized work. Specific engineer hold points and permits require signed external evidence.

## Private ledger
Controlled Google Sheet ID: `1Ih3yiYUJJD_B9K1lLXdVD5Zpmsf_DtYSKbrSncO_lg0` (Narayani/00_PROJECT_CONTROL). Tabs `Events` and `Controls`. Never copy the event ledger or private Slack links into GitHub Pages. Event PK recommended: `SLACK::<channel_id>::<message_ts>`; retain all revisions, supersedes links and rejected invalid input. Event rows are append-only; do not delete or silently overwrite history.

## Public reported-state projection
`machine/project-mappings/narayani-mcq-public-state.json` contains only a revision number and per-(activity_id, check_id) latest reported state:
```json
{
  "format":"PCK_PUBLIC_MCQ_STATE_V1",
  "classification":"PUBLIC_SAFE_REPORTED_STATES_ONLY",
  "project_id":"PRJ-000007",
  "authority":"REPORTED_ONLY_NOT_ENGINEERING_APPROVED",
  "version":1,
  "entries":[
    {"activity_id":"T5030","check_id":"T5030-C01","state":"IN_PROGRESS","reported_day":"2026-10-17"}
  ]
}
```
No raw Slack user/message IDs, notes, photos, or private URLs are allowed. CI checks schema, approved status invariants, activity and checklist PK references, no duplicate keys, no unauthorized engineering completion. Missing or mismatched event projections fail closed.

## Calendar and motion
The synthetic date anchor defaults to `2026-10-19` with Monday–Saturday working days, chosen as a **demonstration** for the current three-month lookahead. Changing the date in browser shifts scenario dates but neither edits the canonical baseline nor alters source project progress. The animated timeline replays a hypothetical dependency sequence; it does not claim construction actually happened.

## Roadmap and current activation
P0 2D constellation, P1 templated checklists, P2 animated sequence and three-month calendar: initial version implemented. P3 private channel and typed ledger exist. Validated ChatGPT/Slack ingestion, automatic idempotent event recording and safely published state projection still require a verified scheduled reconciliation; do not claim an unattended service until its actual run is confirmed. P4 Three.js/IFC spatial construction and full code-specific WMS/ITP are later phases. Three.js is not necessary to display abstract WBS dependencies in 2D, but becomes useful for the actual building geometry.
