# A9 / Skyforge — Activity dependencies and source-graded production starters

**QA revision:** 11 November 2026 · Asia/Kathmandu  
**Repository:** `FabinGurung/jp-scheduling-resources-management` · authoritative development branch `kernel-v0.2-open-source-engines`.  
**Historical baseline:** `docs/SCHEDULING_DESK_AND_WORK_RATES_QA_20261110.md`.

## Source hierarchy and why this update happened

The first memory wall carried 88 owner-supplied work keys but only 30 of them linked to a numeric reference coefficient, and the wall placed a huge catalog above the calculator on mobile. That was a usability failure: an engineer needs a **testable starting quantity per crew-day and per hour**, even when the best available number is a rule of thumb requiring field measurement.

The **source v1** `work-items/productivity-norms.v1.json` is retained with its SHA and original references. The **v2 overlay** `work-items/productivity-starters.v2.json` now stores:
- 46 production profiles: 13 directly matching official items, 18 explicit official-item analogs and 15 scenario calibration seeds.
- 82 of the 88 BOQ/WBS entries receive a profile; six correctly do **not** receive a fabricated stand-alone duration: `BOQ:17.1` (tile supply), `WBS:1.0`, `WBS:6.0`, `WBS:7.0`, `WBS:9.0`, `WBS:19.0` (parent work categories that would double count sub-items).
- No source site output, adopted rate, construction start/finish or engineering approval is written.

### Verified numeric examples and provenance

| Original source / section | Exact published unit | Source labour per unit | Illustrative crew output |
|---|---|---|---|
| Government of Nepal DWRI Works 2081, §6.1 chimney brick 1:4 or 1:6 | 1 m³ | 1.5 skilled + 2.2 unskilled man-days | 1 skilled + 1 helper: **0.455 m³/day** |
| DWRI §9.3 plywood column form up to 3m | 10 m² | 2.75 skilled + 2.4 helpers days | 1 skilled + 1 helper: **3.64 m²/day** |
| DWRI §12.19 3mm cement punning | 10 m² | 1 skilled + 1 helper day | 1+1 crew: **10 m²/day** |
| DWRI §12.25 glazed wall tiles | 10 m² | 13 skilled + 4.5 helpers days | 1+1 crew: **0.77 m²/day** |
| DWRI §12.21 16mm granite floor | 10 m² | 2 skilled + 21.5 helper days | DO NOT extrapolate to stair/tread without method check |
| DWRI §13.1C 12.5mm internal plaster 1:4 | 100m² | 12 skilled +16 helper man-days | 2 skilled + 4 helpers: **16.67m²/day** |
| DWRI §8 M20 mechanical concrete, baseline | 1m³ | 0.5 skilled +3.5 helpers man-days | Separate calibrated footing/column/beam/slab factors required |

**Official printed rate is not the same as the site's achievable output**. Example: the conservative published ceramic tile coefficient is used as *an official planning reference*, not a promise that a labour crew should install only 0.77m²/day. For site comparisons use measured output and note whether scaffolding, preparation, tile cuts, room complexity and cleanup were included.

**Analog and calibration factor:** Original government M20 placement does not prescribe separate production factors for all these building components. The proposed factors (footing 1.15, column 1.35, beam 1.20, slab 1.05, staircase 1.40 and small-band 1.50) are **author-entered calibration seeds**, **NOT Government of Nepal values**. They only affect an illustrative crew/plant-output scenario and require site readback.

**Unsupported special trades:** UPVC doors/windows, non-standard waterproofing, structural metal fabrication, decorative cornices and putty use provisional ***numerical seeds*** with source-family analogies and prominent warnings. They are intentionally provided as field comparison targets, never misrepresented as clauses quoted from CPWD or DWRI.

## Calculator / planned outputs (client only)

- User inputs: verified work type, measured quantity and unit, number of skilled workers, number of helpers, number of applicable machines, hours/day (planning default 8), efficiency factor, optional actually measured work today, and brick thickness when brick masonry.
- Base equation for working day:
  `labour_units_day = min(skilled_count / skilled_mday_per_unit, helper_count / helper_mday_per_unit)`
  `equipment_units_day = equipment_count × hours_per_day / equipment_hours_per_unit`
  `units_day = min(labour_units_day × hours_per_day/8, equipment_units_day) × efficiency_ratio / provisional_element_factor`
- Output cards: units/hour, units/active workday, active workdays for required quantity; optional ft² conversions for 115mm/230mm wall from m³; site efficiency = observed output ÷ projected output. No localStorage, server write, project WBS write or authentication.
- **Initial footing example:** for one skilled, one helper, one mixer, 8h, 100% factor and nominal 1.15 footing element adjustment: `min(1/0.5,1/3.5,8/0.4)/1.15 ≈ 0.248 m³/workday` (≈0.031m³/hour). With two helpers and one skilled the same formula gives ≈0.497m³/day. The mixer does not become the bottleneck at this small crew size. This is *not a verified site production norm*.
- **Brick thickness example:** `0.455 m³/day / 0.115m ≈3.95m²/day` of 115mm wall; or `0.455 /0.23≈1.98m²/day` at 230mm; area changes with thickness for the same volume.

## Gantt connector and Activity Details decisions

Official Oracle P6 references:
- Relationship geometry: https://docs.oracle.com/cd/F74771_01/English/User_Guides/p6_pro_user/view_activity_relationships_in_the_gantt_chart.htm — FS end→start; SS start→start; FF end→end; SF start→end. The arrow UI draws only recorded, visible dependencies, never imaginary links; selected/all/hidden toggle.
- Activity Details: https://docs.oracle.com/cd/F88968_01/client_help/en_US/activity_details.htm — General, Status, Resources, Predecessors, Successors, Codes/other detail views, not a single two-column mini summary.
- https://primavera.oraclecloud.com/help/en/user/101996.htm — synchronized activity table and Gantt with configurable relationship lines and timescale.

Current Narayani public source carries **49 FS links** only. A full FS/SS/FF/SF geometry library and automated tests are ready for future authenticated project-source relationships; it would be misleading to invent non-FS connections merely to demonstrate them on Narayani.

The primary scheduling desk bottom pane now provides eight informational tabs: General, Status, Resources, Predecessors, Successors, Constraints, Quantities, and Steps & Notes. Resource assignments, real quantities, actual percent complete, accepted hold points and signoffs show **not verified** when source absent. Activity-table/Gantt horizontal mobile scroll offers explicit jump controls. Historical 405 reported-only checklist entries remain preserved in the legacy viewer; they have not been discarded or recast as accepted inspections.

## Required QA and limitations

- Test exact source row counts, 82/6 executable/aggregate split, no duplicates, coefficient/provenance classes, 115mm/230mm brick area conversions, one mixer + crew bottleneck and actual efficiency percentage.
- Test correct endpoint anchoring and toggle for FS, SS, FF, SF. Source-linked Narayani Gantt still has only the 49 recorded FS links.
- Test that public Pages build pins the v1 source and v2 overlay SHA separately and excludes private Drive originals.
- A visible arrow is a schedule relationship **not permission to perform the successor**. Release requires authenticated actual predecessor completion, approved structural documents and specified hold-point evidence separately; identity/signing was paused by the owner.
- Physical iPhone QA of bar-chart arrows, table horizontal swipe, lower details tabs and mobile-rate steppers remains an owner acceptance step.
- **Future:** source WBS+BOQ joins with unit/quantity, equipment productivity, actual daily measured outputs, validated project calendars, official source revisions and field photo/evidence; no speculative site commitments before source approval.

## Sources used

1. [Government of Nepal DWRI, Rate Analysis Norms for Works 2081 (official-hosted PDF)](https://wriddkathmandu.bagamati.gov.np/upload/1a68c67a86f780513d61357d9d6149fd/files/Norms_for_Rate_Analysis_2081_DWRI.pdf) — especially §§6.1, 8, 9.3, 11.1–11.2, 12.19–12.27, 13.1, 14.
2. [Gandaki Infrastructure Office / DUDBC Building norms](https://idoparwat.gandaki.gov.np/post/dudbc-norms) — confirm item, methods, soil groups and current revisions before adoption.
3. [Nepal Armed Police Force building labour study](https://www.researchgate.net/publication/329566858_LABOR_PRODUCTIVITY_ASSESSMENT_OF_ARMED_POLICE_FORCE_NEPAL_BUILDING) — incomplete skilled-only rebar reference 83.33kg per skilled worker-day; helper rate in v2 is explicitly a provisional estimate.
4. [CPWD Delhi Analysis of Rates Vol I 2023](https://cpwd.gov.in/Publication/CPWD_DAR_Vol_I_14092023-Civil.pdf) — official India indicative methodology with non-transferability caution for Nepal.
5. [Oracle P6 Relationship Lines](https://docs.oracle.com/cd/F74771_01/English/User_Guides/p6_pro_user/view_activity_relationships_in_the_gantt_chart.htm)
6. [Oracle P6 Activity Details](https://docs.oracle.com/cd/F88968_01/client_help/en_US/activity_details.htm)
