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
P6 priority. Explicit `priority` and per-constraint `calendar_id` are unsupported
and rejected rather than silently ignored.

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

## Activity types and diagnostics

Supported native types are TASK, START_MILESTONE and FINISH_MILESTONE. The two
milestone labels identify atomic zero-duration points in this slot model. They
must have zero duration and either no actuals or equal actual start/finish points.
They do not implement P6 milestone date-resolution rules. Level of effort,
resource-dependent types, suspended work and calendar-based shifts remain open.

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
Per-constraint calendars and explicit priority are still rejected.

`rescheduleCalendarRemaining` keeps the data date in the same absolute event
coordinate. Completed predecessors contribute actual finish for FS/FF and actual
start for SS/SF, then relationship lag is shifted on the resolved lag calendar.
SS/SF from an in-progress predecessor use its immutable actual start. FS/SS into
an already in-progress successor are treated as satisfied. Start constraints on
started work evaluate the actual start; finish constraints govern remaining work.
Completed work retains actual-based constraint checks even when no remaining
segment exists. Missing or contradictory actuals, missing remaining duration,
unknown IDs, cycles and horizon overflow fail closed.

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

Still open: resource-dependent and level-of-effort activity types, advanced
priority, working hours/time zones, suspended/intermittent work, broader
real-project QA and production editing.
Resource/productivity, baselines/progress, P6/MS Project exchange, IFC/4D and risk
remain separate later milestones. Soak Pit stays IDENTITY_PENDING.
