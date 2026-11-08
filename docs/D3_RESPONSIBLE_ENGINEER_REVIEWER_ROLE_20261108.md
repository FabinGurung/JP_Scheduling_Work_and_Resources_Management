# Narayani D3 — Single-account responsible-engineer field workflow

**Updated:** 8 November 2026 · **Project:** `PRJ-000007`  
**Status:** OWNER-NOMINATED DUAL ROLE; PROVIDER-AUTHENTICATED ACCESS AND SITE RELEASE NOT YET CONFIGURED.

## Owner's authoritative workflow decision

The owner confirms that **one existing Google account** will be used to **submit daily site observations and review them as the responsible engineer**. We must support that actual operating practice, rather than assuming an extra human reviewer has already been appointed.

The account email is intentionally **not duplicated into this public repository**. Its Google-verified immutable provider subject must be bound in a separately protected runtime. This owner instruction does not prove a live OAuth session, registration credentials, engineering qualification or an actual signed review.

## Model: one human, separate trusted service

1. The responsible engineer signs in to the controlled **private** field tool and submits an activity-linked report, dated observations and original photos or other evidence.
2. A **separate trusted Drive read-only source-reader service** independently authenticates the submitting Google subject and original stored file/revision/bytes. Its SOURCE_READBACK receipt cryptographically signs `reporter_principal_id`, `reporter_identity_basis: TRUSTED_SOURCE_SERVICE_AUTHENTICATED_SUBJECT`, project, activity, source SHA and original evidence digest. This is a **service**, not a second human reviewer.
3. The same responsible engineer may sign a REVIEW_DECISION receipt, declaring **`review_mode: SELF_REVIEW_DISCLOSED`** if the authenticated reporter and reviewer are the same principal. Both the original claim and reviewer verdict remain immutable/traceable.
4. The review engine returns **`SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED`** (or `SELF_REVIEW_REJECTED`) and increments **self_reviews** separately from **independent_reviews**, which remains zero for that receipt.
5. Undisclosed self-review, a fabricated distinct reviewer ID, a self-review mode on a different person, missing independent source-reader attestation, unknown signer keys, stale revisions and altered evidence fail closed.
6. A self-reviewed observation does **not** confirm work completion or release the next task. All existing public Work Readiness pages stay UNKNOWN/NOT VERIFIED until a separately governed site-release system is authorized, implemented and validated.

## Boundaries and genuine site responsibilities

The system must distinguish *reviewing one's own field observations* from *issuing an authorized engineering decision or releasing work*. The owner may designate a responsible engineer for both tasks, but any hold-point that legally or contractually requires independent inspection/countersignature still requires that separate signatory; the software must not imply otherwise.

Real READY/COMPLETE statuses still need (a) authenticated original source evidence, (b) genuine completed-work/start-finish events, (c) authentic per-activity inspection and safety hold definitions, (d) correct schedule/calendar/lag evaluation, and (e) an explicitly signed and authorized site-release event. This contract implements none of those final approval actions yet.

## Existing access / remaining integration debt

The original `00_PENDING_FIELD_REPORTS`, `10_REVIEW_DECISIONS` and `20_READBACK_AND_AUDIT` Drive folders currently have overlapping writer access. The earlier authenticated audit found **zero** direct submitted records. This role nomination does **not** modify Drive permissions, provision tokens, enroll keys, or create evidence.

Next private integration work is to configure a Google-authenticated field submission/viewer, service-protected Drive original-byte readback, engineer signoff through controlled signing infrastructure and an append-only private audit; **do not ask for OAuth tokens or signing keys in chat**.

The owner need not nominate another human **merely to submit and self-review field evidence**. Additional reviewers are needed only if genuine quality/safety/contractual requirements demand independence, and verified site-release authorization is a separate future gate.

## Versioning

Keep a single authoritative original file ID and preserve enumerated PRE/POST evidence and append-only review history where applicable. No raw Google account address, reviewer provider subject, private notes, photos, or signing credentials go into GitHub Pages. GitHub may hold public-safe schemas, tests and generic governance documentation. All field-ready statuses remain unapproved.
