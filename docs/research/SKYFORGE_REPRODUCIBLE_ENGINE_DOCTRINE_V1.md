# Skyforge — canonical scheduling principles, reproduction protocol and researcher handover

**Release doctrine v1.0 · 19 October 2026 · Maintained in GitHub alongside source.**

> **Why this project exists.** A project schedule must be the calculated consequence of a governed relational graph, real calendars, capacities and source-backed field observations—not a grid of manually typed dates. Every new hospital, house, bridge, renovation or different trade/industry reuses the **same principles**, not Narayani's activity names, durations, calendars, material quantities or drawings.

## A. Product vision and separation of concerns

**Engine / product distinction:** `src/kernel/` owns scheduling mathematics, contracts and validation; `src/machine/` builds deterministic source projections; `src/visual/` validates the public-safe project model; `src/presentation/` renders interactions. **Google Drive private register(s)** govern site-specific source records, effective revisions and actual approvals. The public GitHub Pages WBS is a demonstration/projection, not a site-approved baseline.

**P6 / MS Project reference doctrine:** They use dependency-aware time computation, linked WBS/resource information and baseline/performance reporting rather than merely drawing colored bars. Neither tool implies that every function exists in Skyforge or that P6/MS Project necessarily uses a specific single-file SQL implementation in all editions. **Do not claim parity.** Refer to tested Skyforge behavior under the `src/kernel/` module and test suite.

## B. Canonical relational schema and reproducibility

| Entity | Primary key | Required foreign keys / truth |
|---|---|---|
| `projects` | project_id | owner, scope, status, timezone, version |
| `wbs_nodes` | (project_id,wbs_id) | parent_wbs_id recursively in same project |
| `activities` | (project_id,activity_id) | wbs_id, duration mode, calendar_id, quantity basis |
| `relationships` | (project_id,relation_id) | predecessor_activity_id, successor_activity_id, FS/SS/FF/SF, signed lag |
| `calendars` | (project_id,calendar_id) | week pattern, holidays, source time contract |
| `resources` | (project_id,resource_id) | renewable labor/equipment or consumable material, unit |
| `assignments` | (project_id,activity_id,resource_id) | effort, quantity/rate and capacity contract |
| `receipts_or_reservations` | evidence_id | resource_id, verified effective time, nonduplicated event |
| `baselines` | (project_id,baseline_revision) | immutable approved schedule/cost/hash and authority |
| `field_events` | immutable event_id | activity_id, source pointer, timestamp, reported progress; not automatic approval |
| `approvals` | approval_id | controlling gate, authorized reviewer, signed evidence |
| `source_register` | file/source_id | owner, effective revision, location, hash and classification |
| `assumptions` | assumption_id | field, value, unit, basis, uncertainty, calculations and reviewer |
| `releases` | version_id | input manifest, code SHA, output hashes, tests and rollback parent |

These are the **conceptual target contract**, not a claim that a complete production Postgres schema exists. Use true PK/FK and referential integrity if implementing a database. Never make duplicate spreadsheet-per-vendor/activity copies the source of truth. Preserve prior revisions and aliases.

## C. CPM/PDM mathematical law

Use **half-open working slots** `[ES,EF)` where `EF = ES + D`, `D ≥ 0`. For predecessor P → successor S with lag `L` expressed in the relationship's defined calendar:

- **FS:** `ES_S ≥ EF_P + L`
- **SS:** `ES_S ≥ ES_P + L`
- **FF:** `EF_S ≥ EF_P + L`, i.e. `ES_S ≥ EF_P + L − D_S`
- **SF:** `EF_S ≥ ES_P + L`, i.e. `ES_S ≥ ES_P + L − D_S`

The **forward pass** performs a cycle-checked topological traversal and takes the maximum lower bound imposed by all incoming relationships and applicable constraints, then calculates early finish. The **backward pass** calculates late dates against the defined project-required finish and supported constraints. **Total float** `TF = LS − ES` (equivalently `LF − EF` for constant duration in a single calendar). Criticality and driving/longest path must be interpreted using relationship types, lag, deadline, constraints and calendar logic; a negative float under a forced finish signals infeasibility/slippage and is not automatically a physical driving chain.

**Test:** Any change to an activity duration, relationship, lag, calendar, constraint or material delivery must yield a deterministic recalculation or a clear validation error—not a silent manually typed date. Prevent cycles, dangling dependencies, duplicate IDs, unsupported modes and invalid values. Preserve actuals when rescheduling.

## D. Calendars are governed arithmetic, not decoration

Distinguish **project/global**, **activity/weather/task** and **resource-specific** availability, timezone, weekday pattern, holiday exceptions, time resolution and lag-calendar reference. A `10-day` duration means `10 allowed working slots` on its declared calendar, not ten elapsed days. Calendar intersection is required for resource-constrained placement. Do not silently equate continuous concrete curing with crew workdays. Boundaries, sign conventions, weekend/holiday shifts and working-day arithmetic must be tested. This repository has a tested day-resolution calendar engine and a **3,888-case oracle**, but no general proof of 100% Primavera functionality.

## E. WBS, crews, equipment, materials and capacities

WBS decomposition is a controlled hierarchy: `Site → Substructure → Foundation → Footings` or trade-by-zone; child activities roll up, but a parent's cost/duration and criticality must be computed under explicit rollup rules. A simple sum of task durations is **not** the calendar critical-path duration when tasks overlap.

Separate **LABOR** (person-hours), **EQUIPMENT** (machine-hours) and **MATERIAL** (physical inventory with units), then govern assignments, capacities, reservations and timed receipts. Overloads are computed, not merely colored by visual intuition. Resource leveling may push eligible planned activities while maintaining precedence and calendars; it must never falsify actuals or claim global optimality when a bounded heuristic is used. The repository has a bounded serial resource-leveling implementation, not a generic enterprise optimizer.

## F. Baselines, actuals and EVM

A baseline is a signed, **immutable snapshot** of approved time, costs and WBS assignments, with change orders recorded as additional identified revisions. Field messages are *reported* until appropriately verified, and completion is not accepted because a checklist was filled. Define:
- `BAC` Budget at Completion; `PV` planned value; `EV` budgeted value of verified physical work earned; `AC` actual cost from governed finance.
- `SV = EV − PV`, `CV = EV − AC`, `SPI = EV / PV`, `CPI = EV / AC` (ratios undefined for zero denominators).
- `SPI < 1` is unfavorable **budgeted-value schedule performance**, but does not on its own prove a literal calendar finish delay; critical-path/slippage analysis is separate. Physical % complete, duration % complete and units % complete must not be confused.
- No credible EVM if baseline, physical measurement, percent-complete definition or AC are missing; show `NOT_READY`, never invented numbers.

The source has `src/kernel/earned-value.mjs` computing metrics; **Narayani public view does not have an approved cost-loaded baseline or legitimate EV/PV/AC actuals**. Do not project those metrics as real.

## G. AI-driven new-project compilation — the exact procedure

**AI consumes the declared engine and validated project adapter**, not free-association. Reuse invariants below for every project:

1. **Discover live authority:** Read the project control register, schema, pinned engine version, branch, source file index, latest checkpoint and prior approved changes. Do not replace live source truth with chat context.
2. **Identify project-specific taxonomy:** Define `project_id`, site scope, zones/levels, disciplines, units, owner, WBS hierarchy and activity types using source evidence. Do not clone the 45 Narayani activities unless truly applicable.
3. **Parameter intake with provenance:** Capture geometry, quantities, design loads, productivity, crew sizes, cost rates, calendar and logic. Each input: exact source/owner/revision/unit/coordinate system/uncertainty/approval status. Missing value must be tagged `ASSUMED_DRAFT` or `UNKNOWN_BLOCKED`.
4. **Mathematical derivation rather than blanks:** You may calculate derived geometry or quantities *only from enough geometrically/physically justified parameters*, preserving exact formulas, units, rounding and trace to the input. Example: rectangular excavation `V=L×B×D`; if L/B/D are all verified and allowances defined, calculate V; if depth is missing, a scenario may use an explicit assumed depth but label resulting volume **ESTIMATE_NOT_APPROVED**. Do not assume reinforcement sizes, structural safety, soil bearing, load paths or code compliance from absent design evidence.
5. **Instantiate relational entities:** Stable PKs/FKs for WBS, activities, dependencies, calendars, resource assignments, receipts, baselines, field events and gates. Enforce no orphan, circular, duplicated or unsourced rows.
6. **Run deterministic pipeline:** Validate, cycle-check, compute baseline candidate (forward/backward pass), apply selected calendar and resources, emit Gantt/calendar/constellation from one model. Admit field facts only with evidence and correct authorities.
7. **Independent QA:** Re-run scheduling oracle, edge cases, progress/approval/privacy invariants, unit/dimensional checks, material conservation, over-capacity flags, reproducibility and read-back of hashes. Capture any discrepancies and do not conceal unsupported features.
8. **Hold and explain:** Statutory permit, structural/design, inspection, procurement, baseline adoption and payment approvals are **separate gates**; no simulation or AI text clears them.
9. **Release with provenance:** `release_version`, `source_refs + revision hashes`, `parameters + assumptions`, `engine_commit`, `exact configuration`, `test run`, `model/output hashes`, `approved_by`, `rollback_commit`, `open_debt`. Read back deployment and private logs.

### Required AI output envelope

```json
{
  "project_id": "project-defined-stable-id",
  "engine_contract_version": "pinned-commit-or-tag",
  "source_manifest": [{"source_id": "...", "revision": "...", "sha256": "...", "authority": "SOURCE|APPROVED|HISTORICAL"}],
  "parameters": [{"name": "length", "value": 12, "unit": "m", "basis": "MEASURED|CALCULATED|ASSUMED_DRAFT", "source_id": "..."}],
  "assumptions": [{"parameter": "...", "reason": "...", "approval": "PENDING", "impact": "..."}],
  "wbs_activity_count": "project-specific integer after validation",
  "open_gates": ["document authorization pending"],
  "planning_status": "CALCULATED_DRAFT_NOT_BASELINE",
  "release_evidence": {"code_commit": "...", "test_run": "...", "manifest_sha256": "..."}
}
```

This is a **proposed interoperable handoff envelope** to implement/test, not a schema already enforced everywhere.

## H. Researcher's repeatable checkpoint (100/100)

- Same inputs + same engine version + same calendar contract + same units + same assumptions → **byte-reproducible modeled output** whenever the machine build is defined deterministic.
- Reproduction success does **not** mean project assumptions or engineering work are verified, nor does it mean the mathematical network is the right site schedule.
- Never overwrite approved source data or delete rollback history. Preserve Git commits/Drive source folders and add forward/back references.
- The initial source-based product may be 45 WBS nodes (Narayani demonstration); a different project may need 12, 300 or 2,000. Constant laws, flexible actual taxonomy.
- Every factual claim must be pinned to a record and every calculated claim trace to a formula/inputs; conflicting evidence remains a hold.
- Flashcards are available at `how/skyforge-anki.csv` and the public [How the Engine Works](../../how/index.html) page.

## I. Actual module / test authority (checked at this checkpoint)

- `src/kernel/cpm.mjs` — CPM four relation types, shared-slot mode, rejects multiple activity calendars in that mode.
- `src/kernel/calendar-scheduler.mjs` — calendar day/time contracts, holidays, relationship lag choices; subject to documented constraints.
- `src/kernel/resource-scheduler.mjs` and `resource-leveler.mjs` — bounded capacities/material receipts and serial leveling, no optimality promise.
- `src/kernel/wbs.mjs` — hierarchy and duration/count rollup; **not** P6-level production WBS budgeting.
- `src/kernel/earned-value.mjs` — basic BAC/PV/EV/AC metrics, not authorized Narayani EVM.
- `src/visual/project-model.mjs` — fixed Narayani public-safe 45-node projection, not a generic compiler yet.
- `machine/project-mappings/`, `scripts/run-narayani-visual.mjs` — canonical source-pinned build path. No claim that all new projects compile automatically today.
- `.github/workflows/deploy-kernel-v02.yml` — safety/tests/oracle and public allowlist, WIF Drive sync optional and not commissioned.
- `tests/` — reproducible oracle and safety fixtures; retain them as acceptance gates.

## J. What is still missing (do not hallucinate)

A robust **new-project adapter compiler** with fully variable WBS taxonomy; production SQL migrations for the whole conceptual relational schema; authenticated source/approval readback; validated issue-for-construction drawing binding at sheet/page/revision level; approved cost-loaded baselines; weather and all resource productivity contracts as needed; general performance benchmarking on thousands of WBS nodes; 100%-accurate P6/MS Project import/export parity. Those belong on the roadmap, **not** in the current-capability column.

**Researcher oath:** Change the project evidence and parameter set, never the mathematical/safety principles. Show every assumption. Verify what the engine actually supports before adding features or promising numerical equivalence to P6.
