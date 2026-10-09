# Skyforge visual and product blueprint — Seq16 v0.4.4

Status: Light-sky theme and product explanation implemented; the scheduling site remains a prototype, not a certified production scheduler.

## Purpose
Build a browser-based construction scheduling and project-controls system grounded in engineer/site-manager workflows: schedule activities against calendars, labor, equipment and materials, then eventually record actual progress, baseline comparisons, construction QA evidence, reports and revisions. Keep the scheduling calculation layer separated from the presentation layer.

## Design system: Lightning fighting the heavens
- Use bright pale-blue sky, white clouds, airy translucent white cards and dark readable navy body text.
- Yellow lightning and orange/gold energy for primary actions; blue secondary actions. No dark-mode-first dashboard.
- Animated SVG lightning dragon travels in a recurring 35-second loop, with layered white clouds and small sparks. It is decorative, not a control.
- Implement with local SVG and CSS animations, not external animation packages. Reduced-motion users get a static picture. Homepage provides Pause/Play with aria-pressed.
- Responsive cards, visible keyboard focus and text labels; keep the scheduler interface above background art and all art pointer-events none.
- One shared CSS theme for home, planner, Engine Lab, roadmap and construction knowledge. Original calculation logic, element IDs and links remain unchanged.

## Page purpose
- Home (index.html): product definition, quickstart, modules built, explicit missing features, inputs, actual upstreams, roadmap; historic P6-style synthetic visual demo retained below.
- Live Planner (planner.html): editable activities, day durations, FS/SS/FF/SF logic, renewable capacities, material inventory and assignments, Gantt and delay diagnostics using the resource-leveling engine. Browser-only draft and portable JSON.
- Engine Lab (kernel-lab.html): separate synthetic CPM/status/constraints experiment; not fully unified with Live Planner.
- Roadmap (roadmap.html): completed vs in-progress vs planned features.
- Knowledge pages: field guidance separated from authority over construction facts.

## Actual technical status
The repo contains custom ES module scheduling algorithms for CPM, calendars, certain constraint/data-date/status features and deterministic serial multi-activity Resource Dependent leveling. It is not a global makespan optimizer and does not implement the full Primavera P6 feature set. Day-resolution leveled RESOURCE_DEPENDENT path rejects actual/progress, mixed activity types, constraints and intraday modes. Shared database, baseline tracking in real projects, full site progress controls, collaboration and production reporting remain unfinished.

## Input contract
Minimal working planner: project start and horizon, activity IDs/names/durations, calendar, dependencies, resource catalog, capacities/inventory and assignments. Imported engine JSON optionally permits declared crew calendars, material receipts and fixed reservations.
Future engineering controls: WBS and BOQ, quantities/productivity, zones, subcontractors, delivery lead times, baseline and data-date progress, actuals, photos, lookahead, site QA/ITP, cost and risk.

## Five actual registered open-source ecosystems
Read UPSTREAM_SOURCES.json for exact authority and intended integration mode:
1. IfcOpenShell / Ifc4D — IFC, BIM/scheduling and interoperability reference.
2. OpenProject — work packages, collaboration and API.
3. ProjectLibre Desktop — CPM, baselines and resource UX.
4. TaskJuggler — optimization/scheduling policy research.
5. GanttProject — task hierarchy, Gantt UX and interoperability.
No full upstream codebase is vendored into the current custom kernel. Verify license before reuse; see THIRD_PARTY_NOTICES.md. Primavera P6 and Microsoft Project are proprietary reference/interop targets.

## Acceptance criteria
Maintain old URLs and source branch. Test light-theme/dragon elements on every substantive page, reduced-motion and accessible pause, clear navigation and upstream mapping, preserve original demo/Gantt, no stale roadmap, no impact on scheduling kernels. GitHub Actions unit tests, calendar oracle, data/governance validation and Pages deployment must pass. Independently opening a browser and verifying the responsive visual and interactions is a separate QA gate; do not mistake a Pages deploy job for browser QA.

## Next milestones
First: desktop/mobile interactive visual QA, keyboard navigation and accessibility; production usability on real but explicitly approved non-secret sample schedules.
Second: real WBS/project data model, crews/productivity, daily progress, baseline, lookahead, manpower/materials and printable reports.
Third: authenticated database, shared project records, revisions/audit, validated Excel/CSV and P6/MSP adapters, IFC/4D.
Seq16 itself is a visual/product-clarity milestone only; it does not alter scheduling calculations or claim real project data integration.
