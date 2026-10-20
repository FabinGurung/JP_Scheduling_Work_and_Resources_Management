# Skyforge v1.10 — Native Generic Schedule Digitization

**Date:** 2026-10-20. **Branch:** `kernel-v0.2-open-source-engines`. **Scope:** Universal project input digitization only. Do not mutate Narayani authority or public-private approval gates.

## Architecture

Browser `projects/generic/index.html` accepts local files and creates a draft `SKYFORGE_PROJECT_INPUT_V1`, then invokes `compileProjectDraft` and `projectGenericVisual` and renders constellation, Gantt, event-calendar and source-supplied checklists. Original files never leave the browser; no fields are uploaded, stored, auto-approved, or converted into physical progress.

All source bytes are SHA-256 hashed. Unsupported conversions **fail closed** with explicit diagnostics. Material quantities and productivity are never fabricated. Source labels are `LOCAL_UNVERIFIED`, and emitted views are `LOCAL_UNVERIFIED_DRAFT_ONLY`.

| Source | Implementation | Supported contract | Strict limits |
| --- | --- | --- | --- |
| CSV / TSV | `src/kernel/generic-digitizer.mjs` | Exact table columns `activity_id, activity_name, wbs_id, wbs_name, duration_slots` plus optional `parent_wbs_id, predecessors, work_quantity, work_unit, calendar_id` | Unknown columns warned; missing duration blocks computed views; unknown calendar ID requires explicit calendar |
| Excel .xlsx | `src/kernel/xlsx-native-import.mjs` | OOXML .xlsx ZIP first uniquely matching worksheet with explicit activity table header and stored/shared strings | Encrypted, formula-based, unsupported sheets or multiple matching sheets fail; no macros or date guessing |
| Primavera P6 .xer | `src/kernel/p6-native-import.mjs` | `TASK`, `PROJWBS`, `TASKPRED` in one project, FK checked, FS/SS/FF/SF with signed integer lag | User must state hours per nominal day. Only exact whole-number day conversion; cannot interpret calendars/units/resources/actuals; no rounding |
| P6 XML | `src/kernel/p6-native-import.mjs` | P6 BusinessObjects single-project WBS / Activity / Relationship, integer P6 hour values and typed relation | XML DTD/entity injection rejected. Same explicit hours-per-day and calendar caveat |
| PDF | `src/kernel/pdf-table-import.mjs` + pinned Mozilla PDF.js `4.10.38` loaded **only when PDF chosen** | Up to 100 pages of machine-readable text; recognized exact schedule headers positioned as columns; coordinate grouping yields editable CSV preview | **Mandatory human source-table review before digitization**. No OCR. Scans, graphics-only PDFs, missing headers and ambiguous layouts stop. Pinned PDF.js code downloads from Cloudflare cdnjs, but original PDF bytes remain local (no file upload) |
| Structured task-seed JSON/MD | Existing `digitizeTaskSeedJSON` | Source task IDs, WBS, explicitly typed relationships | Unverified nominal slots only |
| Canonical local JSON | Existing view/project contract | Project-specific `LOCAL_UNVERIFIED` inputs, or read-only compiled model | No external approvals or private publication |

### Important semantic boundary

P6 `target_drtn_hr_cnt` or `orig_dur_hr_cnt` and relationship `lag_hr_cnt` are in **hours**, not automatically in working days. The user supplies `hours_per_day`; no default eight-hour calendar is assumed and no fractional day is rounded. One accepted division supplies *nominal abstract work slots* only; it does not reconstruct specific calendar dates, holidays, weather stops, resource availability or the original Primavera engine's calendar semantics.

XER `PROJWBS` nodes **without direct tasks** must remain in the hierarchy. Importing WBS parents must not create fake activities. Original business object keys remain traceable through the canonical model and source manifest.

PDF text extraction is a parsing aid, **not certified recognition of a scanned schedule**. The editable review stage is explicit because PDF rendering order and apparent column positions may differ from logical table structure. If the user cannot verify the recovered table, retain it as an unverified text candidate without emitting false dates.

### QA / rollback

New `tests/native-importers.test.mjs` constructs real compressed XLSX OOXML files in memory and checks XER, BusinessObjects XML, and PDF coordinate extraction. Legacy pipeline still gates all tests, 3888 calendar oracle scenarios, readback hashes, source privacy, Narayani 45/49/405 unchanged, synthetic two-project generic build, and Pages deployment. Actual visual QA on a physical phone is deferred to the user as requested.

**Current limitations:** Native MSP .mpp, binary .xls, encrypted spreadsheets, Excel formulas, PDF scans/OCR, exotic XER encodings/relationships, complete P6 calendars and resources, and broad schema transformations are not silently treated as supported. They are explicit future format extensions, not hallucinated features.

**Reference contracts:** [Oracle TASKPRED relationship fields](https://docs.oracle.com/cd/F25599_01/English/Mapping_and_Schema/xer_import_export_data_map_project/97914.htm) and [Mozilla PDF.js pinned 4.10.38](https://cdnjs.com/libraries/pdf.js/4.10.38).
