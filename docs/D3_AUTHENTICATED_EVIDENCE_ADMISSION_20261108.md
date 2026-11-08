# D3 / Skyforge — Authenticated Evidence Admission Foundation

**Audit date:** 8 November 2026 (Asia/Kathmandu)  
**Status:** Trusted-runtime implementation and tests; **no real site evidence admitted**.  
**Canonical repository/branch:** `FabinGurung/JP_Scheduling_Work_and_Resources_Management` / `kernel-v0.2-open-source-engines`.

## Live Google Drive intake audit

Inspected the existing three Project Controls field-progress folders using authenticated Drive readback (folder metadata and immediate contents):

| Folder | Content count | Result |
| --- | ---: | --- |
| 00_PENDING_FIELD_REPORTS | 0 | No reports received |
| 10_REVIEW_DECISIONS | 0 | No reviewer decisions available |
| 20_READBACK_AND_AUDIT | 0 | No authenticated reconciliation/audit evidence |

**Shared-permission blocker:** The three folders expose overlapping owner/writer collaborators. An individual who can upload a report may also have write access to the review folder. Folder membership or a review JSON object's `reviewer_id` therefore does **not** prove independent authorization. No source-reader and reviewer signing key registry, separate signing service, or immutable evidence event stream has been configured. These sources cannot establish any actual verified completion or construction start release.

Do not copy private Drive paths, reporter names, file IDs, review notes, private service credentials or signer keys into GitHub Pages.

## Implemented trusted-runtime chain

1. `src/kernel/field-evidence-attestation.mjs` consumes the exact same **already published public-safe** project model from the read-only viewer, plus a separate private signed-evidence bundle and *trusted* registry supplied by an authenticated runtime.
2. Source readbacks (`SOURCE_READBACK`) carry immutable evidence SHA-256, source item/revision, explicit observation type and UTC time.
3. Review decisions (`REVIEW_DECISION`) carry an evidence digest, source record reference, decision, reviewer identity, review note digest and UTC time.
4. Every receipt must have a valid Ed25519 signature over a domain-separated, exact payload. The corresponding public key must appear in the **out-of-band** trust registry and have the correct SOURCE_READER or FIELD_REVIEWER role.
5. The reviewer signing key and principal must differ from the automated source-reader service. If the responsible engineer was also the authenticated human reporter, the signed review must explicitly declare SELF_REVIEW_DISCLOSED and is NOT independent. Evidence SHA, project, activity and source model SHA must reconcile exactly. Future timestamp, unknown key, stale source, duplicate/conflicting review and unexpected approval fields fail closed.
6. The result is deliberately a **private** evidence-reconciliation summary with states `NO_VERIFIED_EVIDENCE`, `REVIEW_PENDING`, `REVIEW_REJECTED`, `SELF_REVIEW_REJECTED`, `SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED` or `EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION`.
7. `src/kernel/field-attested-readiness.mjs` projects the signed-readback review state across actual modeled START predecessors, while listing finish-only constraints separately. Accepted evidence is **not** assumed to prove actual work completion; nonzero lag and missing hold registers remain explicit blockers.
8. Even an accepted, independently signed source record NEVER makes the outcome `READY`: `verified_complete:false`, `ready_to_start:false`, `field_release_granted:false`, `publishable:false` and `approved_site_progress:false` remain enforced.

The old `src/kernel/field-readiness-gates.mjs` synthetic simulator is unchanged and **must not** be used as a real approval oracle. The new cryptographic chain is an admission **foundation**, not a completed Google Drive readback/signing integration.

## Trusted CLI (for private operator environments only)

```sh
node scripts/reconcile-field-evidence.mjs \
  public-project-model.json signed-receipts.json trusted-key-registry.json \
  2026-11-08T10:00:00.000Z
# Optional: append exact source activity ID to inspect predecessor-level reasons
node scripts/reconcile-field-evidence.mjs \
  public-project-model.json signed-receipts.json trusted-key-registry.json \
  2026-11-08T10:00:00.000Z CL02
```

No actual signing key files or real receipt examples are stored in this repository. Tests generate temporary Ed25519 keypairs in process and synthetic receipts only. The CLI does not create reviews, send mail, upload to Drive, perform background work, update Sheets, or change the public site. The trust registry must be supplied by an external authenticated and permission-governed service, not copied from a requester-supplied JSON or AI output.

## Future steps before actual work readiness

1. **Real intake:** Authenticate Google Drive reader service, read exact original file ID and version/bytes, compute source-content digest and source readback signed by a key controlled by that service.
2. **Role protection:** Keep the automated source-reader signing role distinct from the responsible engineer's reviewer signing role. The owner has chosen one human to submit and review: require an authenticated reporter identity and explicitly signed SELF_REVIEW_DISCLOSED mode. Only request an additional independent person for a task when its actual regulation, contract or hold point requires countersignature.
3. **Completion signoff:** Add signed work-completion evidence, exact START/FINISH event times and authorized engineering inspection acceptance, not just acceptance of a report.
4. **Hold registry:** Define per-activity method statements, safety/quality/permit holds from authentic project requirements. Absence of holds cannot be interpreted as no holds required.
5. **Clock and lag:** Reconcile local work calendars, lag/lead dates, data date and signed work-event evidence.
6. **Field release:** Require a distinct authorized site-release event, provenance and source revision, with appropriate professional review. Only then design a separately sanitized public `READY` projection.
7. **Operational QA:** Test on phones and desktop (D1 issue #3 remains open for full acceptance) and prove no private details leak into `dist/`.

## Versioning, publication, and limits

Preserve PRE and POST Git snapshots and append-only source event history. Do not overwrite the source live ID merely to change published HTML. The Pages build explicitly excludes `src/kernel/field-evidence-attestation.mjs` and `src/kernel/field-attested-readiness.mjs`; only the unapproved read-only project projection is published. Unit tests verify signature tampering, role separation, stale source, evidence chain, and the no-release boundary. Passing Actions tests is code QA, not an engineering/construction approval.

## 8 November 2026 single-account owner decision

The responsible engineer will both **submit** the site observations and **review** them using the same privately authenticated Google account. The public repository does not expose that account email. The cryptographic contract now distinguishes `SELF_REVIEW_DISCLOSED` from independent review, maintains separate counters, and never upgrades self-reviewed evidence to construction permission. The dedicated policy is `docs/D3_RESPONSIBLE_ENGINEER_REVIEWER_ROLE_20261108.md`.

No real human provider subject, private key, service-account authentication or engineering approval has been provisioned by this owner instruction. The original intake folders remain shared-writer and empty at the last authenticated inspection.
