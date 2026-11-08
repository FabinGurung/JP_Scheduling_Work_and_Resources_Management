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
3. Two separate protected signing roles exist: an automated SOURCE_READER and an authorized FIELD_REVIEWER. The reporter and reviewer may be the same human only with a signed SELF_REVIEW_DISCLOSED declaration. Role keys stay in separately controlled secret stores. A public-key registry is supplied by the trusted runtime, not the report author or ChatGPT.
4. A signed source readback and reviewer receipt bind the exact project `input_sha256`, activity ID, original Drive version, source evidence SHA-256 and immutable record identity. The signed payload must not be manufactured for a test pretending to be real site evidence.
5. The original source is a Google Drive **stored file** with real downloadable bytes, 3 MB or smaller. Larger files or Google-native documents require an reviewed, versioned source adapter; no silent fallback.

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
                           → SIGNED REVIEW (INDEPENDENT OR DISCLOSED SELF-REVIEW)
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


## 8 November 2026 — Owner-confirmed single-account reporting and review

The owner confirmed that the **same responsible-engineer Google account** will submit daily field observations and review them. Do not request another human reviewer solely to get reports into the intake.

The private `SOURCE_READER` remains a distinct **automated** authenticated service responsible for binding the actual reporter's Google provider subject, original Drive file ID/revision, and byte digest into a signed SOURCE_READBACK. This does not require a second human, but it **does** require separately controlled service credentials. Neither self-reported email nor a mutable Drive folder label is authenticated identity.

A review signed by that same human may explicitly carry `review_mode: SELF_REVIEW_DISCLOSED`. It is admitted only as **self-reviewed evidence** (not an independent countersignature) and counts in `self_reviews`, never `independent_reviews`. Omission or falsification of this declaration fails closed. It **never** yields approved completion or `READY`.

The requirement for a second human arises only where a particular regulation, contract, safety or quality hold point explicitly demands independent verification. The ability to issue a separate authorized construction release remains future work; the existing trust/signing test and Drive-byte verifier do not issue it.

**No new Drive grants, keys, authentic review receipts or field-progress records were made from this owner designation.** The three Drive folders retain their original shared-writer permissions and were empty at the latest audit. See `docs/D3_RESPONSIBLE_ENGINEER_REVIEWER_ROLE_20261108.md`.
