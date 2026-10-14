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
