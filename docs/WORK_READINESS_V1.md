# Skyforge Work Readiness V1 — Before / Current / After

**Owner:** JP Scheduling, Work & Resources Management (not Notifications / Communications).  
**Audience:** Supervisors and site engineers needing a short activity-level workflow.
**Mode:** Read-only field-oriented inspector; NOT a new plan engine and NOT a work-approval interface.

## Why this is a separate project surface
Gantt and constellation answer *when/where a task sits in a schedule*. The work-readiness view answers *what directly precedes the selected work, what is being considered, and what follows it*. It uses the **identical published public-safe project JSON** as the four existing project viewers, with one shared renderer for all four project records:

- `/projects/narayani/readiness.html` — unapproved, public-safe Narayani scenario.
- `/projects/uploaded-wbs/readiness.html` — original user-supplied 45-task synthetic WBS, not actual site progress.
- `/projects/community-clinic/readiness.html` — synthetic clinic example.
- `/projects/pedestrian-bridge/readiness.html` — synthetic footbridge example.

Project pages link directly to the corresponding read-only readiness view. No raw private field reports, private Drive URLs, Google accounts, internal sheets, or approvals are published.

## V1 operational contract

1. Pick a project and an existing activity by ID/name/WBS.
2. **Before:** inspect direct incoming typed relationships (FS, SS, FF, SF) and signed lag. FS/SS constrain the successor's **start**; FF/SF constrain its **finish**. A finish constraint does not automatically block task start.
3. **Current:** show exact source activity ID, WBS, nominal duration and only **source-supplied** checklist prompts. Reported checklist states remain unapproved observations, never signoffs.
4. **After:** inspect direct outgoing relationships and navigate to a successor to examine *its own* full set of prerequisites; one predecessor cannot single-handedly release a task with several gates.
5. **Readiness:** `UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS` for all current published scenarios. Zero incoming links means *no modeled predecessor*, **not** permission to start. Missing source checks never count as passed.
6. No browser writes, upload forms, fabricated task steps, date decisions or automatic approvals. Public model approval flags must be `false`; unexpected status/identity fails closed.

### Example — structural work sequence (illustrative only)

```text
Survey / setting out [predecessor FINISH? verified externally]
       |
       v   FS +0 planning slots
Excavation [CURRENT work; field authorization UNKNOWN]
       |
       v   FS +0 planning slots
Foundation preparation [successor; ALL of its other gates still matter]
```

An FS +0 schedule link alone cannot substitute for inspection, hold-point release, drawings, safe excavation conditions, crew readiness, local permissions or actual predecessor completion.

## Explicitly outside V1
- Daily productivity, quantities, crew loading, material readiness, method statements / WMS, ITP hold point authorization, cost, plan-versus-actual, remaining durations or signed inspection actions.
- A claimed READY/BLOCKED classification from unapproved, stale, synthetic or reported-only records.
- AI-initiated approved source writes or physical mobile/Safari device acceptance. These remain Phase 2/3 tasks.

## Next version — micro-work execution (do not fabricate now)
Use an authenticated and source-authorized daily-work record linked to stable `project_id`, `activity_id`, `work_step_id`, WBS and source SHA; explicit task decomposition, prerequisite evidence IDs, per-step status, reviewer role/signature, timestamps, acceptance criteria and `READY / WAIT / BLOCKED / UNKNOWN` with traceable reasons. Only afterwards add one-day slices, measurements, productivity, resources, receipts, cost and notifications. Communications consumes authorized events and sends alerts; scheduling owns gate evaluation and result provenance.

## QA and version control
`npm test` includes `tests/work-readiness.test.mjs` for typed gates, no-admission policy, four routes, stable source selection and read-only UI. The standard GitHub Actions build and strict Pages allowlist must pass before publication. Preserve PRE/POST commit snapshots and source SHA provenance. CI success certifies source-contract consistency, not site authorization.
