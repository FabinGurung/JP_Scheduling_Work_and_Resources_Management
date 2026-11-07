# Skyforge D1 Zoom Repair + D3 Work-Readiness Gate Engine (7 November 2026)

**Canonical branch:** `kernel-v0.2-open-source-engines`  
**Governance:** A7/A9 source preservation, read-only Pages, private authority, no fabricated actual progress.

## D1 — Screenshot evidence and repair

A real iPhone screenshot reported the Narayani Constellation was difficult to zoom and showed no visible zoom controls. This was a real mobile usability defect and is recorded as such; the screenshot is **not** proof of successful device acceptance.

**Implemented in the shared renderer (all four projects):**

- Persistent diagram overlay controls **+ / − / Fit / 100%**. Fit views the entire WBS extent; individual activity labels may be tiny at that scale for 45 activities, so use + or branch navigation afterward.
- Explicit two-finger touch pinch and ctrl/meta+wheel zoom, while leaving normal one-finger diagram panning enabled.
- Responsive default view at 72% on narrow screens, as a visual preference only.
- Zoomed SVG size changes while the original WBS geometry and CPM data remain untouched.
- Selected activity, branch picker, and trunk-center navigation now multiply original geometry by the active zoom, avoiding the old wrong-coordinate focus.
- Zoom controls have labeled buttons, a readable live percentage, visible minimum 44px tap targets, and no editing or source mutation.

**Caveat:** Numeric tests and a successful GitHub Pages deployment do not certify physical Safari pinch behavior. The original screenshot establishes that the old behavior was problematic; real-device retesting is still required for acceptance. D1 remains open in issue #3 until that evidence is supplied.

**Live retest:** [Narayani read-only common viewer](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/narayani/beta.html) · [Original 45-activity WBS](https://fabingurung.github.io/JP_Scheduling_Work_and_Resources_Management/projects/uploaded-wbs/) · [QA issue #3](https://github.com/FabinGurung/JP_Scheduling_Work_and_Resources_Management/issues/3).

## D3 — What is actually built now

The trusted offline `src/kernel/field-readiness-gates.mjs` exports `evaluateSimulatedStartGates(model,scenario,activityId)`.

This is an **explicitly PRIVATE_SYNTHETIC_TEST_ONLY** gate simulation, NOT a connection to authenticated site completions or Drive approval workflows.

- It binds the exact project ID and published model SHA-256.
- It requires an explicit activity-specific **START** gate register; no registered gate means UNKNOWN, even where no CPM predecessor is modeled.
- It evaluates FS/SS start dependencies separately from FF/SF finish-only constraints.
- An unknown predecessor event remains UNKNOWN. A simulated WAIT is waiting; a simulated STOP is blocked.
- Any nonzero lag/lead requires explicit simulated time-clearance evidence; nominal schedule slots do not establish that enough real time elapsed.
- Duplicate, invalid, wrong-project, unknown, or forged fields fail closed. Source checklist reports cannot become signoffs.
- If every simulated prerequisite is satisfied, the strongest possible result is `CANDIDATE_PREREQUISITES_SATISFIED_NOT_AUTHORIZED`, not `READY`.
- It always returns `field_release_granted:false`, `reviewer_authorized:false`, and `approved_site_progress:false`.
- This private rule engine is deliberately excluded from the public JavaScript distribution.

**No live field authorization is operational.** The private Narayani evidence ledger, authenticated reviewer-role separation, verified source readback, inspection/quality hold registers, calendar-aware lag evidence, immutable event audit, and signed-release service are not yet connected to this engine. The public Work Readiness pages therefore remain `UNKNOWN / NOT VERIFIED`, including all original Narayani reported-only checklist records.

## Future D3 acceptance gates (not complete)

1. Authenticate original Drive source and immutable file identity, version history, SHA-256 and relevant site records.
2. Define a real project/task-specific hold-point registry with human-authored requirements; never invent micro-steps or required approvals.
3. Enforce identity provider authentication and reviewer separation of duties outside browser-provided booleans.
4. Reconcile verified predecessor START/FINISH, physical workday calendar/lag and concurrent constraints against current data date.
5. Keep private evidence and identity records in restricted storage; publish only separately reviewed sanitized status projections.
6. Require authorized field release before displaying real `READY`. A QA test or AI-generated proposal is not approval.
7. Test on an actual device and maintain source PRE/POST and append-only audit.

## Validation
`tests/constellation-zoom.test.mjs` checks zoom math/viewport limits and common four-project read-only UI wiring. `tests/field-readiness-gates.test.mjs` tests candidate/UNKNOWN/WAIT/BLOCK simulation, typed relationships, lag, invalid source and privacy exclusion. GitHub Actions must pass the main Node test suite, public Pages allowlist, reproducibility and deployment.

**Next task:** Physical iPhone retest of the zoom overlay and then authenticated field-authority integration on a **private** controlled source, retaining all engineering/site approval holds.
