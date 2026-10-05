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
- Engine Lab applies the same constraints to both baseline and remaining forecasts, with data-date and constraint controls
- malformed actuals, numeric fields and unsupported priority semantics fail closed; the legacy shared-slot scheduler still rejects multiple activity calendars
- working hours/time zones, resource-dependent/level-of-effort activity types, advanced priority rules and deeper QA remain open

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

Calendar-aware total/free float is reported as **civil-day event distance**, not P6 work-period float. Working hours/time zones, suspended/intermittent work, resource-dependent/level-of-effort types, advanced priority, and P6/MS Project parity/exchange remain later work.

The SEQ5 regression file contains 18 focused tests. `npm run verify:calendar` independently enumerates 3,888 bounded placements across calendar pairs, holidays, all four relationship types, signed lag and three non-explicit lag-calendar modes.

## Knowledge separation

`activity_id` is a project schedule occurrence. `work_id` links that occurrence to reusable site knowledge such as ARC, WMS and ITP/QAQC.

Construction knowledge is deliberately usable as a standalone engineer-facing site rather than forcing field engineers into the Project Controls UI.
