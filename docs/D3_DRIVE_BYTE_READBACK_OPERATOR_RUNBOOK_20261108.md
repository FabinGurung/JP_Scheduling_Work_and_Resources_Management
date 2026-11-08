# D3 — Original Drive-byte verification: operator runbook

**Established:** 8 November 2026 · **Scope:** PRIVATE source-integrity engineering.  
**Authoritative project code:** `FabinGurung/JP_Scheduling_Work_and_Resources_Management` on `kernel-v0.2-open-source-engines`.  
**Release state:** NO real work-release capability. No source/reference quantities or approvals are invented.

## What live records are available?
Authenticated Google Drive folder readbacks on 8 November 2026 returned **zero direct items** in the three existing Project Controls evidence folders:

| Folder role | Items | Authority conclusion |
| --- | ---: | --- |
| Pending field observations | 0 | No source report to reconcile |
| Independent review decisions | 0 | No source-reviewed decision |
| Private readback and audit | 0 | No immutable audit record |

These folders currently inherit overlapping writer permissions. Merely placing a file under the review folder does not prove a different, authorized reviewer accepted it. Do not mark any item READY or COMPLETE on the basis of a folder label, an uploaded photo, an AI answer or a self-declared reporter/reviewer name.

## Improvements implemented autonomously
- `src/kernel/drive-evidence-readback.mjs`: protected read-only Google Drive `files.get` metadata, original stored byte stream, SHA-256 content comparison, byte size cap (3 MB), exact monotonic Drive file `version` comparison, and metadata re-read to catch changes during download. Stored files only; **Google-native Docs/Sheets are explicitly not silently exported**.
- `src/kernel/drive-field-evidence-reconcile.mjs`: first validates separately trusted source-reader and reviewer **Ed25519** receipts and exact project/activity/source IDs, then independently reads referenced Drive file bytes under OAuth; rejects stale revisions, substituted bytes, missing credentials, oversized files and mismatched receipts. Bounded batches (up to 24 source readbacks).
- `scripts/verify-live-drive-field-evidence.mjs`: private **manual** authenticated command, prints a count/authority summary only, never private evidence contents, review notes, original Drive IDs or tokens; no cloud writes or automatic uploads.
- `tests/drive-field-evidence-reconcile.test.mjs`: synthetic mock provider tests for altered bytes, altered revision during read, stale source, invalid MIME, access denied, missing token, valid signed review, zero evidence and the private-Pages boundary.
- `scripts/build-public-site.mjs`: excludes both new private kernel modules from GitHub Pages. No browser path handles Google OAuth or field approval.

## How to run in a separately authorized trusted environment

**Preconditions (MUST ALL hold):**

1. Real uploaded report/source artifact has a stable Google Drive ID and file `version` returned by Google, not guessed by an AI model.
2. Google-supplied **read-only** OAuth access to that original stored file exists with `https://www.googleapis.com/auth/drive.readonly` (or a narrower supported Drive read scope). Do not reuse a Sheets-only token for Drive file-media access.
3. Two independently operated and authenticated signing roles exist: SOURCE_READER and appropriately qualified FIELD_REVIEWER. Their private keys stay in separately controlled secret stores. A public-key registry is supplied by the trusted runtime, not the report author or ChatGPT.
4. A source readback and independent review receipt bind the exact project `input_sha256`, activity ID, original Drive version, source evidence SHA-256 and immutable record identity. The signed payload must not be manufactured for a test pretending to be real site evidence.
5. The original source is a Google Drive **stored file** with real downloadable bytes, 3 MB or smaller. Larger files or Google-native documents require an independently reviewed, versioned source adapter; no silent fallback.

In the private trusted runner (not public GitHub Actions):

```sh
# Inject the short-lived OAuth token through protected runtime environment.
# Never paste tokens into ChatGPT or commit them to GitHub.
# Set SKYFORGE_PRIVATE_EVIDENCE_READBACK=true in the trusted runtime.

node scripts/verify-live-drive-field-evidence.mjs \
  /secure/published-model.json \
  /secure/signed-evidence-bundle.json \
  /secure/source-and-review-public-key-registry.json \
  2026-11-08T10:00:00.000Z
```

The timestamp is illustrative; use the actual authenticated run's UTC as-of time. The runner fails closed if the required environment variables or evidence are unavailable. **At present this live run is blocked by empty folders, missing independent signing configuration and lack of authorized Drive readback credentials for the field flow.** No new user credentials are requested in chat.

## Correct statuses
A successful byte readback means only that a signed evidence claim matches the retrieved original Drive bytes at the stated version. A successful independent review means only that the evidence record was accepted for review. Neither proves construction completion.

Even after all current checks pass, the result remains:

```text
AUTHENTICATED SOURCE BYTES → SIGNED SOURCE READBACK
                           → INDEPENDENT SIGNED EVIDENCE REVIEW
                           → EVIDENCE ACCEPTED (NOT COMPLETION)
                           → HOLD: actual FINISH / inspection / permit
                           → HOLD: site-specific work-release authority
                           → NO REAL READY STATUS
```

## Exact owner decisions required for the next stage
- Designate the first real project and an activity from the genuine WBS for a controlled pilot.
- Name an appropriately qualified **independent** reviewing engineer/account distinct from the report uploader; approve a separate reviewer authorization policy and audit trail.
- Provide authentic site observation evidence through the private pending intake, with source provenance, not a screenshot of the public demo.
- Authorize a trusted Drive-read-only service identity to read only the required original evidence (using Google IAM/WIF; **no private keys in chat**).

Once those exist, run the byte-and-signature preflight privately, reconcile the actual source into append-only records, establish real hold points, and separately introduce a signed work-completion and work-release contract. Preserve one live source ID per subject and enumerated PRE/POST snapshots.

## Remaining debt and acceptance boundaries
- D1 mobile zoom is user-confirmed; pan/gesture, 45-node and cross-device QA remain open in issue #3.
- D2 governed LLM intent-to-authoritative-source comparison and full calendar/resource-preserving revisions remain open.
- D3 the original Drive folders contain no evidence; reviewer separation/authorization, signing service, OAuth read-only service account, signed actual completion, calendar reconciliation and real field-release authority are **not deployed**.
- No live signed Drive receipt has been generated, inspected or approved. Passing Node tests, source digest checks or Pages deployment is engineering software QA only.

Use the GitHub issues as the task authority. Never claim a construction permit, professional engineering signoff or site readiness from source-code tests.
