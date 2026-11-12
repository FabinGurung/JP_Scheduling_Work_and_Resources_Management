# Skyforge — Saturday-off house scheduling + material memory wall

**Date:** 12 November 2026 · Asia/Kathmandu  
**Repository:** `FabinGurung/jp-scheduling-resources-management`  
**Canonical source branch:** `kernel-v0.2-open-source-engines`  
**PRE snapshot:** `snapshot/pre-saturday-calendar-materials-20261112`

## Owner inputs and authority boundary

Owner uploaded phone/Android QA showing selected **T5030 · Formwork, Rebar, and Pour Footings / Pile Caps** in lower **Resources** Activity Details pane. Requested: Saturday to become the holiday in all calendar/Gantt views; a **standard illustrative house crew of 2 skilled workers + 3 unskilled workers**, typically 8 labour hours per working day, machine operation measured separately (e.g. 2h mixer, 3h vibrator); and a governed **Materials Planner**, sibling to the Work Output Planner, listing relevant materials and measurable consumption for all original source activities and supplied BOQ/WBS entries. Also requested conventional software terminology for future prompts.

**Important source conflict:** the Narayani published construction viewer had `working_weekdays=[1,2,3,4,5,6]`, i.e. Monday–Saturday with Sunday nonworking. This *new separate projection* instead uses `[0,1,2,3,4,5]` = Sunday–Friday; Saturday is the weekly holiday. We **did not silently rewrite the original Google Drive source or its archived published JSON**. The browser derives new scenario dates deterministically from the original work-slot indices, preserving original start/end under `source_start_date`/`source_finish_date`, source SHA, duration and all dependency links. Actual verified site hours, holidays and contracts remain unknown.

Nepal Labour Act 2074 section 28 provides the daily 8h / weekly 48h limit, **not a universal law forcing Saturday rather than a different designated weekly holiday**. Saturday in this project is an **owner-selected modelling policy**. National/festival holiday calendars and half-days are NOT yet imported.

The Gantt may display continuous bars spanning a Saturday on a civil-date axis, but the day/work-state calculation excludes Saturdays. The Gregorian calendar shades every Saturday and explicitly marks it **Holiday**. Workday-slot durations remain as in the original source until there are verified measured BOQ quantities and a formally calibrated productivity + constraints model; elapsed calendar days and projected start/finish dates adjust.

## Resource categories and default capacity

Reference house base crew = **2 skilled + 3 unskilled helpers**. A skilled-worker *person* is not automatically qualified for all specialist trades; where design/M&E trades need specialists the five-person crew is a **planning baseline, not an allocation or promise**.

Provisional equipment day capacities in the reference Materials/Resources pane:
- Concrete mixer: one unit, **2 operating hours/day** when used.
- Concrete vibrator / other small site machines: up to **3 operating hours/day** by preliminary assumption.
- Labour planning shift: **8 hours/day** (no Saturday work).
- Equipment running hours are modeled separately from person work hours in the Work Output Planner. No machine is presumed to run for eight hours merely because the team is on site.
- The old 116-row Narayani specialist staffing sketch remains preserved behind a collapsed disclosure as historical draft; it is NOT the five-person baseline or an approved 9-person/crew assignment.

## Materials Planner and source control

**Browser link:** `/work-items/materials.html`. Links beside Work Output Planner in Reference and the existing work-items reference centre; a selected Narayani activity can open `/work-items/materials.html?activity=T5030` from Activity Details → Resources.

**Source catalog:** `work-items/material-references.v1.json`, reviewed and pinned by Git blob SHA. Records:
- **27 distinct material names** (e.g. cement 50kg bag, clean sand, specified graded coarse aggregate, Fe500 BBS steel, cover blocks, binding wire, stone, brick, timber, paint, waterproof systems, ME/P fittings).
- **36 separate measured material assemblies**, accounting for unlike units instead of silently converting kg to m, or m² to each. Some are numeric source coefficients, others only a list of materials pending approved design/method.
- All **88 original BOQ/WBS reference IDs** (original source order, title, unit and authority retained), and **45 original Narayani synthetic scheduling activity IDs**, each with linked material assembly identifiers or explicitly no directly measurable material package. No project-measured quantities have been admitted.

**Client calculation:** User chooses a work code, project activity or recipe; then a *measured* quantity in the work's stated unit and an optional loss percentage (0–30%). For each material, `reference_units = quantity × material_coefficient_per_unit × (1 + selected_waste_fraction)`; whole bags and whole pieces are rounded up for illustrative procurement quantity. Missing multipliers remain **Requires BBS / approved drawing / manufacturer specification**, not zero. Multiple T5030 work units (concrete **m³**, reinforcement **kg**, formwork **m²**) are NEVER added together; each needs its own measured quantity.

### Reference examples (not project actuals)

| Work assembly | Base work input | Reference material output | Evidence distinction |
|---|---|---|---|
| Nominal M20 concrete 1:1.5:3 | **1 m³ finished concrete** | **~8.06 × 50kg cement bags**, **0.42 m³ sand**, **0.84 m³ coarse aggregate** | M20 ratio from NBC 205:2024; 1.54 dry-volume factor and 1440kg/m³ density from estimating convention, **not** an engineer-accepted mix design |
| PCC nominal 1:3:6 | **1 m³ finished plain concrete** | **~4.44 × 50kg cement bags**, **0.462 m³ sand**, **0.924 m³ coarse aggregate** | Approximate nominal concrete conversion; do NOT substitute for an RCC design mix |
| Machine-made brick masonry, mortar 1:4 | **1 m³ brickwork** | **530 machine-made bricks**, **100kg / 2 cement bags**, **0.27 m³ sand**, **50L mixing water** | Government DWRI Norms 2081 §6.1(A-II); owner's *chimney-burnt* brick may differ, flagged **OFFICIAL ANALOG**, site brick size confirmation required |
| Internal plaster, 12.5mm, mortar 1:4 | **100 m²** | **538kg / 10.76 cement bags**, **1.46m³ sand**, **100L mixing water** | DWRI Norms 2081 §13.1(C); curing/mixing losses additional |
| Fe500 steel | **500kg BBS-measured rebar** | **500kg steel** | Binding wire, spacers/chairs remain **unknown** until rebar specification and measured fabrication plan |
| Formwork | **20m² shutter-face area** | **20m² contact face** (minimum) | Actual plywood sheets, reuse, props, ties and shop-drawing details NOT inferred |

Water/cement ratio and curing water are governed by approved batch/procedure and design. No one should pour structural concrete based only on the illustrative 1.54 factor. Stones, mortar, plaster, tiles, paint, MEP, UPVC and wood products all require exact specification and brand method. Project quantity is unknown everywhere until measurements/BBS/Drawing issues are admitted.

### Official and estimating references

- [Nepal National Building Code NBC 205:2024, Section 7.3, M20 1:1.5:3 minimum for covered low-rise RCC examples](https://giwmscdnone.gov.np/media/pdf_upload/NBC%20205-2024%20READY-TO-USE%20DETAILING%20GUIDELINE_0khcwpn.pdf)
- [Government of Nepal, DWRI, Rate Analysis Norms for Works 2081 §6.1 and §13.1](https://giwmscdntwo.gov.np/media/pdf_upload/Norms%20for%20Rate%20Analysis%202081_1%20%281%29_4cwx9ez.pdf)
- [Engineer Nepal, Concrete Mix Materials (reference approximation: 1.54 dry volume, 1440kg/m³ bulk cement density)](https://engineernepal.com/en/tools/concrete-mix)
- [Nepal Law Commission, Labour Act 2074, Section 28 (8 hours/day, 48 hours/week)](https://repository.lawcommission.gov.np/np/documents/prevailing-law/statutes-acts/%E0%A4%B6%E0%A5%8D%E0%A4%B0%E0%A4%AE-%E0%A4%90%E0%A4%A8-%E0%A5%A8%E0%A5%A6%E0%A7%AD%E0%A7%AA/%E0%A4%AA%E0%A4%B0%E0%A4%BF%E0%A4%9A%E0%A5%8D%E0%A6%9B%E0%A5%87%E0%A6%A6-%E0%A7%AD-%E0%A4%95%E0%A4%BE%E0%A4%AE-%E0%A4%97%E0%A4%B0%E0%A5%8D%E0%A4%A8%E0%A5%87-%E0%A4%B8%E0%A4%AE%E0%A4%AF/)

## UI terminology

- **Application header / primary navigation**: site name and Overview / Projects / Studio / Reference tabs.
- **Toolbar**: horizontal Gantt controls (WBS filter, timescale, search and relationship-line visibility).
- **Activity table / data grid**: activity ID/name/WBS/duration/start/finish/predecessors rows, one row per activity.
- **Gantt timeline/chart**: date-based bars aligned with rows; relationship lines (logic links FS/SS/FF/SF).
- **Activity Details pane / bottom pane / inspector**: tabbed panel below the table/chart, with General, Resources, Predecessors, Successors and other tabs.
- **Resources tab / resource inspector**: Labour, Equipment and Materials as distinct resource classes. Labour resources have unit `person`, equipment `machine`/`set` and materials `kg`, `m³`, `m²`, `bag`, `each`.
- **Ribbons / status banners**: short labeled horizontal bands indicating view semantics or unapproved status, not functional tabs unless clickable.
- **Reference page / material assembly**: immutable per-unit coefficients and documentation. **BOQ takeoff** means the actual measured per-project quantity, which requires design/source evidence.

## QA and remaining debt

- Test Sunday–Friday mapping, strict date validation, source immutability, week crossover, link preservation and Saturday calendar exclusions.
- Test 88/45 source IDs, 27 material types, 36 recipes, material work-unit compatibility, no invented rebar/formwork/project totals, direct-vs-analog govt data and source SHA privacy allowlist.
- Confirm four desk entrypoints still render read-only with source authority, and the selected Resources tab shows material **names and per-unit benchmark**, not site totals.
- Physical phone/tablet QA is still pending. **This is a public-safe planning engine**, not an approved construction schedule.
- Future: attach measured drawing revisions, BBS, cement grade, supplier product sheets, 28-day concrete strength/curing holds, holiday festival calendar, actual shift resources and authorized BOQ measurements. Do not unlock live signing/Google authentication until separately requested.
