# Skyforge — Standard Schedule Template V1 · 14 November 2026

Status: **shared normalized source intake + unified read-only Gantt edition comparison**, not a site-approved project baseline.
Owner workstream: JP Scheduling, Work and Resources Management (Skyforge).
Repository branch: `kernel-v0.2-open-source-engines`.

## Question: was the generic project template already implemented?

**Partly.** The shared engine and project presentation were previously implemented:
- `src/kernel/project-template.mjs` validates a general `SKYFORGE_PROJECT_INPUT_V1` CPM resource input.
- `src/presentation/scheduling-desk.mjs` is the actual common Scheduling Desk renderer used by both Narayani v002 and Harisharan v002, using `SKYFORGE_GENERIC_VIEW_MODEL_V1`.
- The existing Studio/Projects split separates a reusable engine from project-specific source models and the old Narayani 45-activity pilot.

However, the two active construction schedules were **not equivalent source-input contracts**. Narayani v002 is a relative-week owner-translation *planning* preview with placeholder work quantities and some elapsed waits; Harisharan v002 derives 839 dated entries from its 839-row V000001 draft and work-rate analogies. Its v003 measured BOQ assessment is separate and cannot replace a full Gantt model. A generic project input template with explicit bilingual source provenance, a unified edition summary, and a cross-project comparison was not yet offered to every project. This version provides those reusable contracts without replacing original sources.

## Verified comparison

| Property | Narayani v002 | Harisharan v002 |
| --- | --- | --- |
| Project source ID | `PRJ-000007` | `PORT-000014` |
| Activities | 160 | 839 |
| Links | 210 | 1,321 |
| Date axis | `RELATIVE_CALENDAR_DAYS`, anchored at fictitious 2000-01-02 | `DATED_WORK_SLOTS`, starting 2026-11-16 |
| Timed activities | 156 | 839 |
| Explicit hold groups | 6 | 2 |
| Rate/material assumptions | Planner samples, source-graded component references; **not** measured Narayani BOQ | 18 source-quantity footing labour analogies, remaining 821 unrated at whole-activity level; M25 material mix still requires design |
| Scheduling approval | Not approved | Not approved |
| Extra resource edition | Not an approved BOQ | Harisharan V003 has 34 BOQ-resource records, including unresolved durations; it is **not** a substitute for v002 Gantt |

Both project desks use `assets/scheduling-desk.css` and `src/presentation/scheduling-desk.mjs`. Switching projects should change the **model**, not fork the Gantt widget or silently change reference quantities.

## Reusable files, schemas, and consumption

| Resource | Path | Purpose |
| --- | --- | --- |
| New-project input example | `templates/scheduling/standard-schedule-input-v1.example.json` | Copy for a new project with unknown values retained as `null` |
| Validating JSON Schema | `schemas/standard-schedule-input.schema.json` | Fields, enum bounds, basic required structure |
| Semantic validator and source normalizer | `src/kernel/standard-schedule-template.mjs` | IDs, WBS parent cycles, dependency cycles, explicit lag units, source trace, no invented approved actuals |
| Normalized edition adapter | Same module, `normalizePublishedScheduleEdition` | Converts *already validated public* Gantt models into common comparison shapes without changing model's dates, durations or resource components |
| Comparison function | Same module, `compareStandardScheduleEditions` | Compares project identity, calendar axes, activity/link/hold/rate counts and explicitly disallowed auto-conversions |
| Published comparison | `templates/scheduling/edition-comparison.json` generated in `dist/` | Public-safe comparison manifest built from actual Narayani and Harisharan models |
| Template tests | `tests/standard-schedule-template.test.mjs` | Validates both real projects and a synthetic future project; protects unknown quantities, language links and cycles |

The JSON Schema alone is not a substitute for semantic validation. Source references must be matched against their actual controlled Google Drive files, and final Gantt schedules continue to run through the pinned scheduling kernel and build pipeline. The template **does not** make arbitrary text auto-publishable.

## Normalized new-project source contract

```text
A9 Drive (human authoritative records; original Nepali and English text versions)
  └── Project / Schedule / Source and Revision Register
         ├── original text / source documents (immutable historical versions)
         ├── controlled English working translation (linked to exact original)
         └── source and reviewer decisions / audit log
                               |
                               v
Standard input JSON (source edition; unverified fields explicitly null)
  project ID, edition, calendar/clock, project crew (null until reviewed)
  WBS IDs, activities and source line refs, quantity/unit/basis
  dependency FS/SS/FF/SF, lag and lag unit, holds, approvals=false
                               |
                               v
Semantic validation: reject unknown references, cycles, duplicate IDs,
  cross-unit inference, invented completion, missing source identity
                               |
                               v
Project-specific scheduling/quantity adapters (no automatic rate adoption)
  e.g. Narayani relative planning; Harisharan dated work slots + separate V003 BOQ
                               |
                               v
Validated SKYFORGE_GENERIC_VIEW_MODEL_V1
                               |
                               v
ONE shared Scheduling Desk (Gantt + synchronized calendar + detail tabs)
                               |
                               v
GitHub Actions read-only Pages publishing + device QA
```

### Steps for a future project

1. Create a controlled Drive source folder and source register for that project; preserve the owner's words in Nepali and English where provided, with separate versions and stable links.
2. Download the standard JSON example from Studio; replace the dummy project/WBS/activity IDs, then fill source-manifest references. Do not embed private Drive URLs/IDs in public Pages. Translate the language of *storage and derivation* into English while keeping the Nepali original unchanged.
3. Use `validateStandardScheduleInput` and `normalizeStandardScheduleInput`; resolve blocking diagnostics. An UNKNOWN duration does **not** become a random workday estimate.
4. Run the shared CPM/calendar/resource kernel and a project-specific evidenced adapter to create an unapproved generic view model.
5. Add a project-specific, allowlisted publication record and thin HTML shell. The common renderer is reused; project data, planning clocks, engineering holds and approvals stay isolated.
6. QA both Gantt and calendar on desktop/mobile, link the related but independently governed Materials and Work Output Planners, and release a versioned milestone before any baseline replacement.

## Separation and non-negotiable safety rules

- Relative-week origins are not real site start dates. Dated work-slot indices are not elapsed-day time axes.
- A Saturday-off reference calendar can be adopted across projects only as an explicit input; other holidays and actual progress are not silently inferred.
- 2 skilled + 3 helpers / 8-hour shifts are existing **reference house policy**, not a universal actual resource booking. New projects start with crew fields unknown.
- Missing materials, source-rated labour or drawing-measured BOQs remain unknown. Do **not** apply M20 mix coefficients to Harisharan M25 structural concrete or infer rebar from plain concrete volume.
- A measured-BOQ feasibility projection is not an approved finish date or construction release.
- There are no changes to the original Narayani 45-activity pilot, Narayani v002 schedule, Harisharan V000001/V002/V003 datasets or private Drive source files in this normalization milestone.
- Historical input, published project records and version history must not be deleted. Any future source revision should maintain a rollback path.

**Achievement definition:** source-generic intake + schema + common project-edition adapter + cross-project tests + source-verified Pages comparison manifest, with normal kernel QA and authenticated Pages publishing passing. This justifies a *template/normalization milestone*; **not** a statement that all future project schedules are already normalized or approved.
