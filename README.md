# Project Controls Kernel

Open, testable project-controls kernel for construction planning and execution.

## Branch policy

All new ChatGPT development continues on **one working branch**:

`kernel-v0.2-open-source-engines`

The branch name is historical. Milestones v0.3, v0.4 and later evolve **in place on this same branch**. `main` and the earlier prototype branch remain preserved and are not used as scratch branches.

## Product surfaces

- `index.html` — P6-style Project Controls operations
- `kernel-lab.html` — scheduling calculation / adapter engine lab
- `roadmap.html` — one-page development roadmap
- `knowledge/` — separate Construction Knowledge portal for engineers
- `knowledge/shuttering.html` — direct share link for Shuttering / Formwork
- `knowledge/waterproofing.html` — direct share link for Waterproofing
- `knowledge/soak-pit.html` — direct research-gated Soak Pit link

## v0.2 foundation

CPM forward/backward pass, FS/SS/FF/SF + lag, negative float, total/free float, working-calendar mapping, earned value, resource-overload detection and five upstream adapter contracts.

## v0.3 — in progress

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
- native execution of contract-only resource-dependent/level-of-effort activity types, retained-logic/progress-override modes, multi-window intermittent progress and broader real-project QA remain open

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

## Knowledge separation

`activity_id` is a project schedule occurrence. `work_id` links that occurrence to reusable site knowledge such as ARC, WMS and ITP/QAQC.

Construction knowledge is deliberately usable as a standalone engineer-facing site rather than forcing field engineers into the Project Controls UI.
