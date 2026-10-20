# Skyforge v1.8 — Generic project engine and source-governed construction work-item library

**20 October 2026 · Canonical source branch `kernel-v0.2-open-source-engines`.**  
**Order of authority:** Live approved project sources → project-measured facts → matched published reference coefficients → explicitly labeled user assumptions → unknown/blocked. A Google Drive index entry is not itself an engineering approval.

## Scope accomplished before returning to Narayani

1. **One safe scheduling entry point:** `src/kernel/schedule-project.mjs`, with explicit `SHARED_CPM`, `CALENDAR_CPM` and `RESOURCE_LEVELING` modes. `AUTO` uses multi-calendar solver if calendars are defined, but refuses to silently ignore resources.
2. **Bounded priority audit:** `src/kernel/resource-priority-audit.mjs` enumerates precedence-feasible priority orders for up to seven activities and finds the best among the **existing serial placement family**, with explicit non-global-optimum label. It is not an enterprise exact RCPSP optimizer and must not be advertised as such.
3. **Source-gated EVM:** `src/kernel/governed-evm.mjs` requires supplied immutable identified approved baseline, a complete set of *verified physical progress* records and separately *verified cost* events to calculate earned value. It **does not authenticate** signatures, install accounting software, or persist revisions; these remain integration work.
4. **Reusable project compiler core:** `src/kernel/project-template.mjs` handles different WBS sizes, IDs and task descriptions. It checks WBS parents and FKs, duration and quantity provenance, source manifests, role of draft assumptions, schedule mode and missing inputs. Same exact input ⇒ same schedule and SHA-256. It does **not** yet export an arbitrary project as the full shared 2D/3D/Gantt/calendar/checklist product.
5. **Reference library:** `machine/work-items/work-item-library-v0.1.json` with 14 method templates, two carefully scoped CPWD masonry records with numeric components, and four separate public research/source references; optional `machine/work-items/optional-schema-v0.1.sql` for future SQLite without installing a database. `src/kernel/work-item-library.mjs` computes source-aware coefficients for a user-supplied quantity, crew role counts and optionally working hours. It never invents missing rates or accepts unsourced ones as verified.
6. **Public research UI:** `work-items/index.html`, backed by only the validated public JSON `work-items/library.json`; this JSON is explicitly Git-blob pinned in `scripts/build-public-site.mjs`. Site-generated numbers remain **reference scenarios**, never private or approved field records. Existing Narayani mappings/progress/hold registers remain untouched.

## Evidence ledger — online references accessed 20 October 2026

| Ref | Source | Provenance and allowable inference |
|---|---|---|
| CPWD_DAR2023_CIVIL_V1 | [Official CPWD Delhi Analysis of Rates 2023, Civil Vol I](https://cpwd.gov.in/Publication/CPWD_DAR_Vol_I_14092023-Civil.pdf) | Item **6.32.2** one cubic meter: **494 nonmodular class 7.5 clay/fly-ash bricks**, **0.25 m³ mortar 1:6**, mason first-class **0.47**, mason second-class **0.47**, coolie/helper **1.80**, bhisti/water carrier **0.20 worker-days**. A further **1.13** helper-days for lifts above floor two is explicitly **not included** in the default estimate. Item **6.34.1** one cubic meter: **487 class 10 fly-ash bricks** and **0.22 m³ mortar 1:4**; labor omitted as unverified from this run. Delhi standard, **not** Nepal labor productivity. Do not combine the two masonry specifications. |
| RICS_NRM2022 | [RICS New Rules of Measurement](https://www.rics.org/profession-standards/rics-standards-and-guidance/sector-standards/construction-standards/nrm) | Classification and measurement rules, not automatic productivity/crew coefficient values. |
| NEPAL_DOR_SPEC | [Nepal Department of Roads specifications and codes](https://www.dor.gov.np/mo-dang/publication/qrdc-guidelines-standard-specifications-codes-and-norms) | Official context for Nepal civil works; **not** imported as house-specific quantities or productivity rates. |
| ASCE_PROD_CONTEXT | [Tsehayae & Fayek (2016), DOI 10.1061/(ASCE)CO.1943-7862.0001127](https://doi.org/10.1061/%28ASCE%29CO.1943-7862.0001127) | Context factors change labor productivity, so one geographic construction coefficient is not universal. |

Do not copy long copyrighted source tables into this library. Only bounded coefficient facts verified in identified clauses are entered, with linked source. No 2026 Nepal market rates are invented.

## Formula and limits

With (Q) in an item's work units and matching `material_per_unit` coefficient (m_i), required material (M_i=Qm_i).

With a worker-day per unit coefficient `role_days_per_unit` (r_j) and available matching workers (n_j), the theoretical role-capacity time is:

[
D_{capacity,lower bound}=max_jleft(rac{Q r_j}{n_j}ight)
]

The displayed rounded crew days is the **ceiling of this lower bound**, not an approved construction duration. The implied *upper-bound* crew output per day is (Q/D_{capacity,lower bound}); divide by **user-supplied** working hours per day to get an hourly upper-bound. These quantities ignore flow constraints, mobilization, skill matching, productivity losses, waiting/inspections, curing, quality defects, material receipts, weather, site access and safety holds.

If the exact spec is unverified, the output includes `BENCHMARK_SPECIFICATION_AND_LOCAL_APPLICABILITY_UNVERIFIED`. If labor input is unverified or missing, duration is **null/INCOMPLETE**. Never fill source or crew gaps by default or multiply a market cost index into physical productivity.

## Full project reproduction contract

**Input fields:** `format: SKYFORGE_PROJECT_INPUT_V1`, project ID and name, project-specific WBS and typed activity IDs, duration basis, explicit relationships, project-specific calendars/resources if used, source manifest IDs/hashes, quantities with source/formula/assumption, and chosen scheduling mode.

**Outcomes:**
- `CALCULATED_DRAFT_NOT_BASELINE`: inputs sufficiently specified; modeled network result not approved.
- `CALCULATED_WITH_EXPLICIT_ASSUMPTIONS`: deterministic scenario with recorded assumptions.
- `INCOMPLETE_NO_SCHEDULE`: missing duration, calendars or resources; explicit gaps, no invented dates.
- `REFERENCE_SCENARIO_ONLY` or `INCOMPLETE` for catalog work, never measured Nepal productivity or an approved work order.
- `SOURCE_GATED_CALCULATION` EVM only after supplied baseline/progress/cost ledger fields pass the contract. **Authorization of signers is not verified by this code.**
- `EXACT_WITHIN_SERIAL_PRIORITY_FAMILY_NOT_GLOBAL_RESOURCE_OPTIMUM` for the small exhaustive leveling-order audit. This is **not** a universal resource-optimum certificate.

### Source-first new-project procedure

1. Read the project's live Drive index, approved BOQ, actual dates/resources, drawing revisions and known WBS.
2. Normalize unit and scope; derive dimensions only where formulas and verified geometry suffice.
3. Lookup the **exact** `work_item_id` and required specification fields. No silent fuzzy match between user text and an unrelated government rate.
4. If a matching published coefficient exists, label it *reference only*. If completed measured project events are available with quantity and person-hours, qualify the measured observation separately.
5. Preserve absent capacity, productivity, cost, holidays, dates or approvals as gaps or explicit `ASSUMED_DRAFT`, not as facts.
6. Compile into project-specific WBS network; validate PK/FK, cycle, calendar modes, resources and source SHA.
7. Re-run tests/oracles; publish the views only after generic view generation is implemented and privacy/readback is verified. Never stamp generic results as Narayani completion.

## Historical completed-project search outcome

A prior **Master Construction WBS Dictionary** and construction-knowledge closeout references were discovered in Drive, but an identifiable **completed-project measurement ledger containing verified work quantities PLUS actual crew-hours/dates/method** could not be matched reliably in this search. Therefore **zero historical measured productivity coefficients** were admitted. It would be wrong to infer productivity from a final bill or schedule alone; matched hours and quantity are required. Candidate past files should be resolved by original filename/document ID and then checked for source/provenance before admission.

## Remaining debt / no false parity

- Authenticated approval/signature verification and immutable live finance/progress baseline storage: **not commissioned**.
- Full globally optimal enterprise resource leveling: **not implemented**; bounded priority audit is a deterministic diagnostic, not the optimum over all feasible resource schedules.
- Unlimited multi-calendar minute/hour precision: **not implemented**; tested calendar solver uses civil-day contracts.
- Native P6 XER/XML, MSPDI/XML imports with round-trip loss QA: **not implemented**.
- Generalized full 2D/3D, calendar, Gantt and MCQ renderer from any new project schema: **next compiler milestone**.
- Fully calibrated Nepal site-specific library for all 14 trades: **not complete**; requires verified regional norms and measured completed-site evidence.
- Do not alter Narayani's public-safe project mapping merely to exercise these foundational components.

The target is **100% reproducible semantics with pinned evidence**, not 100% assumed real-world productivity.
