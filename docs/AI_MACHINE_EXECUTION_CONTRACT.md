# A9 PCK | AI Maestro and GitHub Machines | Execution contract v0.5.0

## What runs where

AI (ChatGPT or another authorized agent) is a **conductor**: it can propose a machine request, inspect input, prepare source patches, interpret machine evidence, and request a reviewed GitHub change. Its narrative is not a source of engineering dimensions, quantities, resource truth, or approved designs.

GitHub **Actions** is the executor. It accepts reviewed and strictly bounded machine input, runs versioned Node/Python/CLI code, checks calculations, and creates immutable run artifacts and SHA-256 evidence. GitHub **Pages** is a static, public-safe visual projection; it cannot execute an authenticated backend or safely contain private records.

A9 Google Drive is governance/project-document authority; GitHub is versioned code authority. Real measurements, site observations, CAD/BIM files, human approvals and design codes need their own authenticated source references. This site currently handles **scheduling**, not CAD drafting or structural analysis. Those jobs belong to the CAD/engineering engines, connected by a versioned interface later.

## Release v0.5.0 machine lane — what works

1. Machine fixture: machine/requests/demo-foundation.json (public, pinned, synthetic).
2. Contract: src/machine/execute.mjs, PCK_MACHINE_REQUEST_V1 → PCK_EXECUTED_PLAN_V1.
3. Engine: existing v0.4.2 resource-leveling implementation called through the v0.4.3 planner adapter.
4. Adapters: five explicitly labeled **preview/export contracts**, with no false claims that external upstream executables were run.
5. Evidence: input SHA-256, output SHA-256, machine-computed work slots, zero self-declared engineering approvals, explicit unsupported claims.
6. Two independent invocations compare byte-for-byte output; changes and mismatches fail the run.
7. Only DEMO_FOUNDATION is accepted for Pages (Git blob SHA pinned in machine runner), and the Pages distribution is made from a strict allowlist, not from the repo root.
8. Actions run npm test, calendar oracle, machine build/readback, public-safe file staging, and GitHub Pages deployment.

Commands (Node 24, no packages required):
- npm test
- npm run verify:calendar
- npm run machine:build
- npm run machine:verify
- npm run site:build

Separate workflow file: .github/workflows/machine-build.yml. The ordinary deployment workflow also regenerates the public machine example on each accepted branch push. The manual workflow may require a workflow dispatch exposed on the repository's default branch; the existing branch-only deployment remains its verified path.

## Five-source integration boundaries and future gates

| Upstream | Implemented here | Remaining external integration gate |
| --- | --- | --- |
| IfcOpenShell / Ifc4D | Neutral IFC-compatible task mapping preview | Invoke pinned Python IfcOpenShell/Ifc4D; serialize real IFC schedule; reload and round-trip validate task IDs, resources, date events, IFC schema/version |
| OpenProject | Offline proposed work-package payload | Connect to a named authenticated OpenProject API v3 instance, read schema/capabilities, dry-run, enforce access/permissions, use idempotency and verify API readback. No write without authorization. |
| ProjectLibre Desktop | Neutral work-item export and behavior contract | Compatible import/export with exact format and round-trip against an isolated ProjectLibre runner; applicable CPAL/license review |
| TaskJuggler | Restricted FS, zero-lag TJP text preview only | Pin/execute tj3 in an isolated runner, parse/run project, compare schedule and resource semantics, fail on unsupported links |
| GanttProject | Neutral task payload preview | Generate supported import format, execute desktop or test import harness, verify task, calendar, dependency and milestone round-trip |

All five adapter records include upstream_runtime_executed=false and certified_interoperability=false. No import/run/export parity is claimed until an actual upstream process and readback is captured.

## Fail-closed / trust rules

- Never synthesize missing input values, add silent architectural dimensions, approve a design, or upgrade a synthetic fixture to site truth.
- Reject unsupported formats, duplicate IDs, HTML/control characters, invalid relationships, non-ready planner status, unsupported constraints, and an invented approval field.
- Never publish private data to Pages. Private jobs require an authorized private store and separate workflow, NOT public repository fixtures.
- Treat output as NOT_ENGINEERING_APPROVED, including machine-derived plans. Engineer check, code checks and approvals remain a separate mandatory stage.
- Never treat Actions success as proof of engineering correctness or 100% hallucination-free performance: tests cannot cover all possible errors. Require input completeness, unit/integration/round-trip tests, provenance, review and conservative "unknown/unverified" reporting.
- AI must not claim external software integrated merely because a neutral mapping file exists.
- Build input file is pinned to reviewed Git blob SHA; updating it requires a conscious code review and changed allowlist/pin.
- No tokens/secrets in public Pages or git. Pin build tools and minimize Actions permissions, use separate protected environments for write-capable future jobs.
- Follow a written safe rollback procedure; do not overwrite archived PRE/POST snapshots.

## Proposed v1 machine request for real projects (NOT implemented)

Each request must identify stable project ID, authority_uri, source_rev or digest, classification, constraint policy, calendar, work breakdown and quantities, machine/capability version, required output types, independent QA policy and approval state. GitHub Actions should read it from an authenticated approved source, not chat transcription, and write private result artifacts to authenticated storage. A final published projection should contain only deliberately approved public-safe fields.

Designs and 3D plans require a separate CAD adapter: dimensioned geometry, datum/unit conventions, permitted setbacks, approved codes and revisioned DXF/IFC sources; then CAD/IFC/geometry tools compute and independently check them. Scheduling may later consume the resulting IFC task/work-package IDs. Never use the scheduling planner to invent design geometry.

## Verification and limitations

GitHub Actions success certifies exactly the automated tests run and Pages deployment, not real-browser usability, external source completeness, external interoperability, standards compliance or engineering approval. Human review and independent calculation/test oracles remain required for life-safety engineering.
