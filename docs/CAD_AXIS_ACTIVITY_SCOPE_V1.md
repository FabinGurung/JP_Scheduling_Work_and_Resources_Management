# CAD axis/member scope → Scheduling / Gantt (V000001)

CAD Control Tower: https://fabingurung.github.io/JP_Computer-Aided-Drawings/templates/project-workspace/control-tower/

CAD Engineering Memory Palace: https://fabingurung.github.io/JP_Computer-Aided-Drawings/memory-wall/

## Owner and status

This scheduling module owns activities, dependencies, calendars, resource allocation, readiness and site-progress attestations. CAD owns original geometry, structural axis source identity, member IDs and their source revision. This contract **does not copy structural source data**; it merely validates a source-attested scheduling scope when an activity declares `sourceSystem: "CAD"`. For synthetic or purely WBS activities with no CAD claim, the existing CPM and other scheduling computations are unchanged.

Source files / branch ownership: `contracts/cad-axis-scheduling.v1.json` and `src/kernel/cad-axis-scope.mjs` in this scheduling repository. Canonical drawing rules live separately in CAD `public/data/cad/view-control-tower.v1.json`. A7 remains read-only.

## Required fields for a CAD activity

`cadScope` must include exact CAD repository, versioned source/model revision, source file SHA-256, floor ID, **stable element IDs**, **actual occupied column-axis IDs**, confirmed source-to-model registration, verified member scope and source reviewer ID.

The only currently eligible `axisStatus` for CAD-backed draft scheduling is `SOURCE_MODEL_REGISTERED_VERIFIED`; `SOURCE_MARKS_REGISTERED_REVIEW_ONLY`, `DISPLAY_REVIEW_ONLY` and `AXES_NOT_ADMITTED` are explicit HOLD. The 18 original Harisharan report-marked positions and the Narayani 23 DXF GF positions are not by themselves evidence of approved structural loads, member elevations, engineering approval or dates.

At the **actual `scheduleProject` calculation entrypoint**, any CAD claim without valid scope throws `CAD_SCOPE_HOLD` before CPM, calendars or resource leveling. A valid synthetic source claim may produce only **CALCULATED_DRAFT_NOT_BASELINE** with source IDs preserved in `cad_axis_scope.cadActivityScopes`. It is neither an issued programme nor permission to start work.

## Still required for a real project

- CAD-to-scheduler authenticated source export with provider readback, explicit source hash and source-to-model transform.
- Engineer/owner review of each physical member scope and construction precedence.
- Independently sourced activities, realistic durations, calendars and dependency constraints.
- Field safety, site inspection and approval decisions, separately from calculated schedule.

No live Narayani, Harisharan, Ashok or Amrit task, date, quantity, crew, resource or gate has been fabricated or signed off by this change. All stored original historical documents and published site programmes are preserved.

## QA

Run `npm test`. `tests/cad-axis-scope.test.mjs` proves approved synthetic scope passes as a draft while source-only marks, duplicate IDs, missing fingerprints and unverified alignments block before scheduling. Existing scheduling-engine tests must also remain green.
