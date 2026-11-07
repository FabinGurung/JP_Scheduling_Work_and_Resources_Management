# Phase 2 — AI source revisions and device-acceptance ledger

**Date:** 2026-11-07 (Asia/Kathmandu)  
**Repository:** `FabinGurung/JP_Scheduling_Work_and_Resources_Management`  
**Development branch:** `kernel-v0.2-open-source-engines`  
**Safety/authority:** GitHub Pages is a read-only projection; original Drive evidence and approved field status are NOT mutated.

## Delivered and source-tested
- The trusted AI revision engine now produces `revision_diff` comparing stable activity IDs, WBS IDs, and precisely typed relationships including signed lag. Every changed field provides before/after values.
- The Markdown review formatter and `node scripts/review-ai-source-revision.mjs <published-model.json> <request.json>` produce review-only output; neither performs live source writes.
- Unknown/zero durations cannot silently become milestones. New zero-duration activities must explicitly declare `activity_type: FINISH_MILESTONE`; an activity changed to duration 0 needs `confirm_milestone: true`.
- No-op `UPDATE_ACTIVITY`, unexpected operation fields, hidden approval flags and out-of-range lag fail closed rather than being ignored.
- Activity removal cannot silently cascade deletion of incoming/outgoing links; the source request must remove those links explicitly first.
- Existing source-derived calendar dates and checklist states are reported as **not migrated** to the offline proposal. Such a candidate is never an automatically adoptable version of the real-world schedule.
- All three offline AI modules are excluded from Pages by `scripts/build-public-site.mjs`. The live common four-view renderer and Work Readiness page remain read-only.
- Field-view CSS adds minimum 44px click/touch targets, 16px input/select font sizing for mobile browser zoom prevention, and safe wrapping. Cross-WBS dependency navigation clears an incompatible current filter, keeping the newly selected task visible.

## Reproduction and review
1. In trusted offline code, load a reviewed public `SKYFORGE_GENERIC_VIEW_MODEL_V1` model and exact `SKYFORGE_AI_WBS_REVISION_V1` request tied to the published `input_sha256`.
2. Run `node scripts/review-ai-source-revision.mjs model.json request.json > review.md`. If the request is stale/invalid, the command exits nonzero and prints `SOURCE REVISION BLOCKED`.
3. Examine `review.md`, especially removed predecessor/successor edges, changed WBS hierarchy, any zero-duration milestones and the lost-source-context warnings.
4. Obtain the exact authoritative Drive/Git source and review independently. The draft is an unapproved `SHARED_CPM` calculation, not a replacement for full calendars, crews, approval status, actuals or BIM.
5. Only after separate authorization should a governed source revision process preserve PRE, update the real live source ID (if appropriate), validate/reconcile, and preserve POST. THIS PROCESS IS NOT YET AUTOMATED.

## Device QA matrix (not claims of physical acceptance)

| Test | Automated/static checks available | Physical/device verification still required |
| --- | --- | --- |
| iPhone Safari, 375–430 px viewport | 44px tap targets; 16px input font; 720px single-column breakpoint | Open all four pages and test actual tap/scroll/keyboard; capture screenshots |
| Android Chrome, 360–412 px viewport | No fixed side-by-side work stages under 1100px; text wrapping | Tap predecessor/successor while search and WBS filter are active |
| Desktop keyboard-only | Buttons use native keyboard semantics; selected activity has `aria-pressed`, work detail `aria-live` | Tab/Enter navigation, visible focus, no trap, logical reading order |
| Source safety | Exact model identity; no automatic READY, approved completion or private reporter data | Review banner and unknown state visibility across all projects |
| Constellation / Gantt | Existing source-model regression tests; CI builds all four project routes | Touch navigation and pan/zoom on physical Safari/Android, 45-node inspection |
| Cross-project identity | Per-route project key registry, validation, source SHA status | Compare live page activity ID to original source for each project |

**Important:** A CI test and mobile CSS review are not equivalent to a real phone test. No verified real-device screenshot, iPhone Safari session, authenticated site-signoff or live Drive sync has been recorded. Retain D1 as **OPEN / PHYSICAL DEVICE ACCEPTANCE PENDING**.

## Next engineering priority
Continue D1 with real device browser acceptance, then D2/D3 with authoritative Drive source reconciliation, approval identities, full-calendar/resource preservation and revision adoption controls. Do **not** add unverified field READY statuses or fabricated daily quantities to the public Pages.
