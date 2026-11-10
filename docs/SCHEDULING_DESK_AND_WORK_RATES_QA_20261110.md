# Skyforge Scheduling Desk & Work-Rate Memory Wall · 10 November 2026

## Scope, authority, ownership

- **Repo:** `FabinGurung/jp-scheduling-resources-management` (same stable GitHub repository ID `1307302088`; renamed from `FabinGurung/JP_Scheduling_Work_and_Resources_Management` during QA).
- **Source branch:** `kernel-v0.2-open-source-engines`. Changes must not be committed to `main` as a substitute.
- **Owner decision:** Replace constellation-centric source-inspection UX with activity-led, Primavera-inspired project planning. Real engineering acceptance, Google private sign-in, evidence signing and automatic work release remain PAUSED. A read-only scenario remains unapproved.
- **Snapshots:** `snapshot/pre-primavera-planning-desk-productivity-20261110` at original baseline; prepare POST only after latest SHA has a successful deployment.

## Design references and rationale

Oracle *P6 Professional User Guide*, Gantt Chart, https://docs.oracle.com/cd/F74771_01/English/User_Guides/p6_pro_user/the_gantt_chart.htm — explicitly uses an Activity Table together with aligned horizontal activity bars and configurable timescale, dates and relationships.

Oracle *General Columns of the Activity Table*, https://docs.oracle.com/cd/G18294_01/p6help/en/47225.htm — Activity ID, Name, WBS, Activity Status, calendars/duration and scheduled dates. The historical user-supplied Ten Six P6 screenshot also shows this layout. Our table shows **eight fields before the bar timeline**: Activity ID; Activity Name; WBS; Original Duration; Start; Finish*; Planning Status; Predecessors.

**Important:** Source finish in the existing Skyforge generic model denotes a work-slot *exclusive* finish boundary, which our UI labels `Finish*`. It must not be misrepresented as a P6 actual finish or a verified project milestone.

## Deployment design

- `projects/narayani/desk.html` — Narayani, existing public-safe 45 activities and 49 schedule dependency links; no sourced actual completion.
- `projects/generic/desk-clinic.html`, `desk-bridge.html`, `desk-uploaded-wbs.html` — independent public synthetic/source-pinned *technical* fixtures through the exact same browser renderer, not company project WBS.
- `src/presentation/scheduling-desk.mjs` is one client-side module; validates published project data, forbids source mutations and claimed actual release.
- Three primary views: `#activities` (left source activity table + aligned right Gantt; WBS filter and source IDs; month/week/day timescale), `#calendar` (Gregorian Jan–Dec 12 month grids, real 28/29/30/31 day lengths, source start/finish events and active scenario spans), and `#dependencies` (selected activity Before/Current/After cards with direct FS/SS/FF/SF lag links). The historical constellation and 405 reported-only checklist records remain preserved in the legacy viewer but are not a primary operational tab.
- **Four cardinal layout principle:** NORTH = view controls/source status; WEST = activity table and prerequisites; EAST = aligned bar chart and successors; SOUTH = selected-activity inspector and release-warning ribbon. This refers to meaningful *screen regions*, not structural north/site coordinates or physical BIM dimensions.
- All 21 company projects without authentic admitted WBS remain empty. Published source-safe template is **not a live issue-for-construction package**.
- Narayani company page has one desk entrance with three distinct, functional fragment links; no four clone links.

## Productivity reference is not activity duration

`work-items/productivity.html` is a shared **Work Rate Memory Wall**. Its source JSON `work-items/productivity-norms.v1.json` is the only published reference. It retains **37 BOQ keys** and **51 WBS/component keys** from the user's supplied work items, including fractional IDs (8.1, 17.1, 19.1, 19.2, WBS 6.1–6.8, WBS 7.1–7.8). **11 distinct rate classes**; **30 entries** point to a conditional analogue; **58 entries intentionally have no verified comparable numeric coefficient.** No project BOQ quantities or real site crew rosters are present.

Sources and applicability:
1. Nepal Government, Ministry of Energy, Water Resources and Irrigation, *Rate Analysis Norms for Works 2081*, https://www.moewri.gov.np/content/108/norms-for-rate-analysis/ ; published copy https://wriddkathmandu.bagamati.gov.np/upload/1a68c67a86f780513d61357d9d6149fd/files/Norms_for_Rate_Analysis_2081_DWRI.pdf . Government *rate analysis* = worker-days per quantity, not generic 24-hour activity duration. E.g. stone soling 1.5 unskilled md/m³; 12.5mm 1:4 wall plaster 0.12 skilled+0.16 unskilled md/m²; 20mm 1:4 plaster 0.14+0.19 md/m²; machine-assisted M20 concrete 0.5 skilled+3.5 unskilled md/m³. Item/method applicability requires individual confirmation.
2. DUDBC building norms via Gandaki Province, https://idoparwat.gandaki.gov.np/post/dudbc-norms — manual soft soil trench excavation/compaction only if matching site class/method, not hard soil, shoring or mechanical excavators.
3. *Labor Productivity Assessment of Armed Police Force Nepal Building*, https://www.researchgate.net/publication/329566858_LABOR_PRODUCTIVITY_ASSESSMENT_OF_ARMED_POLICE_FORCE_NEPAL_BUILDING — secondary, skilled-worker-only masonry and steel indicators are incomplete *crew* norms and must NOT compute a full duration.
4. Government of India CPWD *Delhi Analysis of Rates 2023*, https://cpwd.gov.in/Publication/CPWD_DAR_Vol_I_14092023-Civil.pdf — methodological cross-check, not automatically a Nepal legal/technical standard.

A rate may contain skilled and unskilled md per one specified unit of output. For a complete model with matching method and positive worker crew, `nominal_units_per_workday = min(number_of_skilled / skilled_md_per_unit, number_of_unskilled / unskilled_md_per_unit)`. A missing category can be omitted only when coefficient is explicitly 0. When source is incomplete (`full_crew=false`) or input applicability is unconfirmed, return HOLD/PARTIAL instead of a duration. `nominal_workdays = required_measured_quantity / nominal_units_per_workday` is NOT elapsed Gregorian days: add procurement, permits, access, curing, QA holds, calendar exceptions, constraints and weather separately. A nominal 8h design workday is a calculation **assumption**, not a labor law or site contract.

**Worked conditional example**: 100 m² 12.5mm 1:4 internal plaster, 2 skilled and 4 unskilled people, assuming method-matched norms and independently available access: `min(2/0.12, 4/0.16) = 16.67 m²/working day` bottlenecked by skilled. `100/16.67≈6 active working days`, excluding all curing, access/setup, finish, procurement, weather, inter-trade interference, and inspection. It is NOT a guaranteed finish date.

## QA controls and open debt

- GitHub Actions must run test suite, verify generated model source SHA, privacy exclusions and publication. The new public norm JSON is pinned by Git blob SHA `4773c1c3fa8728ebae532ebf0381bbfd0ad6d751`. Any future coefficient update requires corresponding source review plus digest pin rotation.
- No public original Drive IDs, private person emails, source OIDC subject, signing keys or unapproved actual completion.
- Real iPhone/Android interface acceptance remains OPEN; automated viewport CSS tests cannot replace device inspection.
- The rate library is **not yet auto-joined into each project WBS**. A future *controlled and versioned* mapping should join reference keys to project-specific BOQ records, with validated quantities, crew, effective calendars, FS/SS/FF/SF relations, testing/inspection holds and corresponding authenticated source authority. The user specifically paused private credential provisioning.
- The new desktop 8-column table plus Gantt preserves a wide horizontal scroll; mobile viewers should use an accessible table scroll and alternative one-activity inspector instead of pretending to show all columns within narrow phone widths.
- Flag project misalignment: the Narayani 45-activity public WBS is a **synthetic planning scenario** with no approved construction baseline; do not treat its original duration as measured productivity.
- Source references and numbers are information to cross-check, not design drawings or construction instructions.
