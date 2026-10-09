# Native scheduling semantics

This document describes the kernel's own supported model. It does not claim
Primavera P6, Microsoft Project, DCMA or contract-schedule compliance.

## Time and duration

`scheduleNetwork` uses one shared working-slot coordinate. Activities have a
nonnegative duration. `es`/`ef` and `ls`/`lf` are start and exclusive-finish
points: `finish = start + duration`. Finite numeric values and nonblank numeric
strings are accepted; booleans, blank strings, NaN and infinity are rejected.

Activity IDs are nonempty strings. `activity_id` and `id` may both be supplied
only when equal. Relationship types are FS, SS, FF and SF; signed lag is in the
same shared slot coordinate. A lead is supported but reported by schedule QA.
Cycles, unknown endpoints and unsupported relationship types are rejected.

Per-activity calendar names may identify the one shared calendar. Multiple
activity calendars and explicit relationship lag calendars are rejected.
Working-date mapping is a separate display conversion, not multi-calendar CPM.
It returns an unknown date outside its horizon rather than clipping a point to
the last available date. Negative late slots remain unknown dates.

## Constraints and conflict priority

| Native type | Forward pass | Backward pass |
| --- | --- | --- |
| START_ON_OR_AFTER | Earliest start bound | — |
| START_ON_OR_BEFORE | — | Latest start bound |
| FINISH_ON_OR_AFTER | Earliest finish bound | — |
| FINISH_ON_OR_BEFORE | — | Latest finish bound |
| MUST_START_ON | Earliest start bound | Latest start bound |
| MUST_FINISH_ON | Earliest finish bound | Latest finish bound |

Every declared bound applies. Their list order does not choose a winner. The
forward pass preserves relationship logic and does not force work backward to
satisfy an impossible latest/exact point. The backward pass exposes the latest
permitted placement; therefore conflicts can create negative total float.
Every activity's finish is capped by the project completion target in that
backward pass, including SS/SF predecessors whose durations outlast a successor.

Constraint evaluation reports the actual calculated point and signed variance.
A tolerance of 1e-9 slots prevents floating-point noise from becoming a false
constraint violation. This tolerance does not implement calendar resolution or
P6 priority. `STRICT_ALL` remains the default constraint policy. `PRIORITY_RANKED` accepts nonnegative integer `priority`; higher values resolve only direct conflicts among declared constraints on the same activity. Compatible lower-priority constraints remain active, lower-priority conflicting constraints remain visible as suppressed results, and equal-priority ambiguity fails closed. Per-constraint `calendar_id` remains unsupported.

## Data date and actuals

`rescheduleRemaining` accepts the full activity/relationship graph, keyed status
updates, the same native constraints and an absolute `dataDateSlot`. Required
finish and actual points also use the original project slot coordinate.

| Status | Forecast duration | Start constraint point | Finish constraint point |
| --- | --- | --- | --- |
| NOT_STARTED | Original duration | Forecast start | Forecast finish |
| IN_PROGRESS | Explicit remaining duration | Immutable actual start | Forecast finish |
| COMPLETED | No remaining segment | Immutable actual start | Immutable actual finish |

For incomplete work, each applicable constraint slot is translated by subtracting
the data date. For started work, start bounds are evaluated against the actual
start and do not move its remaining segment. Finish bounds use the remaining
duration. A finish-not-earlier bound can postpone that remaining segment in this
fixed-duration model; it does not extend duration or model intermittent work.

Completed work is excluded from the forecast but retains all actual-based
constraint checks. Those checks still run when the whole project is complete.
Contradictory bounds remain separate visible violations.

FS/SS into an already in-progress successor are treated as satisfied because its
actual start is fixed. FF/SF finish-driving logic remains active. Completed
predecessors contribute actual finish for FS/FF and actual start for SS/SF. SS/SF
from an in-progress predecessor likewise use its actual start, not its restart
at the data date. Any unresolved actual-point lag becomes a documented boundary
constraint; internal zero-duration anchors are excluded from visible activities,
order and relationships.

`remaining_schedule` has relative slots and declares `time_origin_slot`.
`forecast_*_slot`, top-level `constraints` and top-level `project` use absolute
project slots. The forecast start of in-progress work means its remaining segment
start; it does not replace `status.actual_start_slot`. Late forecast points may
precede the data date when a deadline is impossible.

Actual dates after the data date, finish before start, finish without start,
invalid/missing remaining duration for in-progress work, nonzero remaining work
on a completed activity, unknown update IDs and cycles fail closed. A planned
start before the data date without an actual start is a visible warning, not
automatic fabricated progress.

## Suspend/resume progress boundary (SEQ8)

Both remaining-work paths accept one paired suspend/resume boundary for an in-progress TASK. In the shared-slot model the fields are `suspend_slot` and `resume_slot`; the calendar-aware model also accepts `suspend_date` and `resume_date`.

The pair is fail-closed: both points must be supplied together, the activity must already be in progress, suspension cannot precede immutable actual start or lie after the data date, and resume cannot precede suspension. Milestones cannot be suspended.

When resume is later than the data date, the remaining segment receives a system not-before boundary at resume. In the calendar-aware scheduler the resume point is a civil-day event boundary, so the actual remaining start may move to the activity calendar's next working day. When resume is on or before the data date, no extra forecast delay is introduced.

This models one forecast resume boundary only. It does not model multiple suspension windows, intermittent actual-work segments, time-of-day shifts, or Primavera P6 suspend/resume parity.

## Activity types and diagnostics

The canonical activity contract now recognizes five types:

- `TASK` — fixed activity duration on the activity calendar; native scheduling support is FULL.
- `START_MILESTONE` / `FINISH_MILESTONE` — atomic zero-duration points; native scheduling support is FULL.
- `LEVEL_OF_EFFORT` — duration/span is derived from surrounding logic boundaries rather than treated as a fixed independent task duration.
- `RESOURCE_DEPENDENT` — placement/duration semantics depend on assigned-resource calendars rather than silently substituting the activity calendar.

SEQ9 deliberately separates **type recognition / interchange contract** from **native execution**. LOE and Resource Dependent are therefore `CONTRACT_ONLY` in v0.3. Their source duration and other adapter fields are preserved for round-trip/interchange, but both native schedulers fail closed if asked to calculate them. This prevents a LOE from being misread as a milestone and prevents a Resource Dependent activity from being calculated as an ordinary activity-calendar task.

`RESOURCE_DEPENDENT` is not defined as a synonym for `effort_driven`. ProjectLibre/OpenProj-family scheduling exposes fixed-work/fixed-units/fixed-duration and effort-driven modes separately, while its Primavera reader distinguishes P6 Resource Dependent activities by whether resource calendars participate in scheduling. TaskJuggler and GanttProject effort-driven work reinforce that effort/resource-allocation equations are a separate scheduling concern. OpenProject and IfcOpenShell/Ifc4D remain schema/interchange references rather than claims of P6 execution parity.

The two milestone labels must have zero duration and either no actuals or equal actual start/finish points. They do not implement P6 milestone date-resolution rules. Multi-window intermittent work and time-of-day/calendar-shift semantics remain open.

`inspectSchedule` provides diagnostic findings: open starts/finishes are information
requiring a topology decision; negative lag, duplicate relationships, negative
float, constraint violations and missed planned starts are warnings. It does not
approve a schedule. Engine Lab displays synthetic example data and shares its
calculation function with integration tests.

## Calendar-aware day scheduler (SEQ5)

`scheduleCalendarNetwork` is a separate native path; the legacy `scheduleNetwork`
shared-slot API is intentionally unchanged. Calendar-aware time is an integer
**civil-day event coordinate** whose origin is `projectStart`. Task duration is
an integer number of working days on that activity's `calendar_id`. Start and
finish are event points; finish is exclusive. A task's displayed `finish_date`
is its last worked day, while an input `actual_finish_date` is an exclusive
finish event boundary, consistent with `ef`.

Each calendar declares working weekdays and holiday dates. Scheduling is bounded
by explicit `horizonStart` / `horizonEnd`; exhausting that horizon is an error,
not silent clipping. Zero-duration START_MILESTONE and FINISH_MILESTONE activities
remain atomic event points.

FS, SS, FF and SF use the same event inequalities as the shared-slot model, but
signed lag is consumed on an explicitly resolved lag calendar. Supported
`lag_calendar_mode` values are:

- `PREDECESSOR` — predecessor activity calendar (default when not declared)
- `SUCCESSOR` — successor activity calendar
- `PROJECT` — project calendar
- `EXPLICIT` — requires `lag_calendar_id`

A resolved relationship records its lag calendar. Supplying a conflicting
`lag_calendar_id` outside EXPLICIT mode fails closed. Positive lag consumes
working days forward; negative lag moves backward through working days.

The forward pass finds the earliest feasible placement for each activity across
its calendar. The backward pass finds the latest feasible placement within the
project completion target, relationships and native latest/exact constraints.
The implementation uses bounded exhaustive placement search for correctness and
clarity at day resolution. Calendar-aware total/free float is therefore measured
as **civil-day event distance**; it is not P6 work-period float.

The six native constraint types use the same conflict policy as the shared-slot
model. Calendar-aware constraints accept an integer event `slot` or ISO `date`.
Per-constraint calendars remain unsupported; constraint priority uses the same explicit policy as the shared-slot model.

`rescheduleCalendarRemaining` keeps the data date in the same absolute event
coordinate. Completed predecessors contribute actual finish for FS/FF and actual
start for SS/SF, then relationship lag is shifted on the resolved lag calendar.
SS/SF from an in-progress predecessor use its immutable actual start. FS/SS into
an already in-progress successor are treated as satisfied. Start constraints on
started work evaluate the actual start; finish constraints govern remaining work.
Completed work retains actual-based constraint checks even when no remaining
segment exists. Missing or contradictory actuals, missing remaining duration,
unknown IDs, cycles and horizon overflow fail closed.

## Constraint priority and time contract (SEQ11)

`STRICT_ALL` applies every declared constraint. `PRIORITY_RANKED` considers higher integer priorities first only when declared constraints on the same activity are incompatible after conversion to start bounds. Relationship logic, required-finish targets, data-date rules and immutable actuals remain outside this ranking policy.

The calendar-aware scheduler also preserves a validated intraday contract while continuing to execute at civil-day resolution. `projectTimeZone` and calendar `time_zone` values must be valid IANA names. Optional `working_periods` use non-overlapping `HH:MM` intervals and record nominal daily/weekly minutes. Overnight periods are not supported in this foundation. `timeResolution` remains `DAY`; an intraday request fails closed.

## Progress QA diagnostics (SEQ10)

The remaining-work APIs return a `progress_qa` object. It is diagnostic only: it does not rewrite actuals, change retained-logic behavior, or select a Primavera scheduling mode.

For recorded actual relationship events, the kernel evaluates the same event inequalities used by the schedule model:

- FS: successor actual start against predecessor actual finish + lag.
- SS: successor actual start against predecessor actual start + lag.
- FF: successor actual finish against predecessor actual finish + lag.
- SF: successor actual finish against predecessor actual start + lag.

When both actual event points exist and the successor event is earlier than the required point, the finding is `OUT_OF_SEQUENCE_PROGRESS`. When the successor event exists but the predecessor actual point needed to prove the rule is still missing, the kernel emits `ACTUAL_LOGIC_UNRESOLVED` information instead of guessing. In the calendar-aware path, lag is shifted on the relationship's resolved lag calendar.

Data-date diagnostics also report `SHOULD_HAVE_STARTED`, `SHOULD_HAVE_FINISHED`, `IN_PROGRESS_PAST_PLANNED_FINISH`, and `ZERO_REMAINING_WITHOUT_ACTUAL_FINISH`. Malformed actuals, actuals after the data date, missing required remaining duration, contradictory actual order, and completed work with nonzero remaining duration remain fail-closed validation errors.

The five upstream projects remain behavioral/interchange references. Seq10 is a kernel-native diagnostic contract and does not claim that IfcOpenShell/Ifc4D, OpenProject, ProjectLibre, TaskJuggler, or GanttProject use identical out-of-sequence terminology or calculation rules.

## Resource and productivity foundation (SEQ12)

The v0.4 foundation separates reusable resource capacity from consumable material quantity.

- `LABOR` and `EQUIPMENT` are renewable resources with explicit `max_units` capacity and optional `calendar_id`.
- `MATERIAL` is consumable and carries quantity-unit / optional inventory metadata rather than renewable capacity.
- crews contain reusable labor/equipment members and require an explicit crew calendar. Crew expansion preserves `source_crew_id`; the crew calendar is a scheduling contract only at this boundary.
- productivity duration is deterministic: quantity is divided by effective production per workday. `PER_WORKDAY` rates multiply by production units; `PER_HOUR` rates additionally require explicit `working_minutes_per_day`. The default schedule-facing duration rounds up to a whole workday while retaining the raw workday result.
- productivity-derived activities retain the incoming duration as `original_duration` and mark `duration_source: PRODUCTIVITY_DERIVED`.
- the resource histogram is an integer shared-slot diagnostic. Renewable rows expose demand units, capacity, utilization and overloads. Material rows expose per-slot consumption and cumulative consumption.
- the pre-v0.4 `findResourceOverloads` signature remains available for regression compatibility.

SEQ12 does not level resources, shift activities, enforce material inventory shortage dates, intersect multiple resource calendars, or natively execute RESOURCE_DEPENDENT activities. Those are later v0.4 scheduling boundaries.

## Resource-dependent availability placement (SEQ13)

SEQ13 connects the existing `RESOURCE_DEPENDENT` activity identity to a dedicated v0.4 resource-engine placement path without changing the ordinary CPM schedulers' fail-closed behavior.

- `RESOURCE_DEPENDENT.native_schedule_support` is `RESOURCE_ENGINE`. The shared-slot and calendar-aware CPM schedulers still reject Resource Dependent execution and direct callers to the resource engine.
- placement requires at least one assigned renewable LABOR or EQUIPMENT resource.
- direct renewable assignments require a resource `calendar_id`; crew-sourced assignments contribute the crew's explicit calendar. When a resource calendar and crew calendar are both present, a forecast work slot must be working on every required calendar.
- renewable demand is aggregated by resource. A candidate slot is unavailable when activity demand plus any fixed `resourceReservations` exceeds `max_units`.
- reservations are fixed external load evidence. Seq13 does not move, reprioritize or optimize the reserved/other activities.
- material assignments require explicit `inventory_quantity` truth. Each material assignment declares exactly one total `quantity` or `quantity_per_slot`.
- optional dated/slot `materialReceipts` increase material available from that event onward. Work proceeds only when cumulative material available covers the next work-slot consumption.
- insufficient calendar, renewable-capacity or material availability can create gaps in forecast work slots. If the declared horizon cannot supply the required working slots, placement fails closed.
- returned placement records exact `work_slots`, required calendar IDs, renewable demand, material consumption, and `resource_leveling_applied: false`.

This path is deterministic **single-activity placement against declared/frozen availability**. It is not multi-activity resource leveling, does not select activities by float/priority, and does not optimize or resequence a resource-constrained network. Those remain the next v0.4 boundary.

## Verification and remaining limitations

`npm test` covers all six native constraints across status states, immutable
actual points, completed-predecessor boundaries, negative float, typed milestones,
malformed input, date horizon behavior and Engine Lab calculation integration.

`scripts/verify-schedule-oracle.mjs` independently enumerates start-time placements
and checks event inequalities for three-activity chain, fork and join networks.
The extended finite matrix covers durations 0/1/2, every FS/SS/FF/SF pair,
lag -1/0/1, finish targets -2/4/8, each constrained activity, all six native types
and bound slots -2/0/3/6/8. Forward bounds and backward bounds are checked
separately, matching the documented conflict policy. Its finite horizons are
chosen to contain this matrix; this is not a proof for arbitrary networks.

Still open: LEVEL_OF_EFFORT native execution, multi-activity resource leveling/optimization, minute/intraday execution of the Seq11 working-period contract, suspended/intermittent actual-work semantics, retained-logic/progress-override mode selection, broader real-project QA and production editing. RESOURCE_DEPENDENT now has a dedicated Seq13 resource-engine placement path.
Resource/productivity foundation and deterministic Resource Dependent placement/availability enforcement are active in v0.4; multi-activity resource leveling remains open. Baselines/progress, P6/MS Project exchange, IFC/4D and risk remain separate later milestones. Soak Pit stays IDENTITY_PENDING.

## Seq14 — deterministic serial multi-activity resource leveling

The separate levelResourceDependentNetwork(input) day-resolution engine applies one explicit policy: SERIAL_TOPOLOGICAL_ID. Stable activity IDs determine a tie-break among precedence-eligible unstarted RESOURCE_DEPENDENT activities. All four relationship types and signed day lags use the existing calendar engine. No global optimum is claimed.

Fixed reservations and shared renewable demand occupy the same dated slots. Materials consume initial inventory and dated receipts through a cumulative cross-activity ledger: proposed earlier consumption cannot invalidate already committed later work. The algorithm can skip unavailable work days. Immutable actuals, date constraints, progressed work, intraday modes and non-resource-dependent activities explicitly fail closed.

Each result records network_reference_start, leveling_delay_days, actual work_slots and per-slot renewable/material ledgers. resource_leveling_applied=true means only that the declared serial policy ran; the Seq13 placeResourceDependentActivity API still reports false.
