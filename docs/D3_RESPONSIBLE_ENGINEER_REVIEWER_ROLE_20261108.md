# Narayani — Responsible engineer/reviewer role nomination and independent report admission

**Recorded:** 8 November 2026 · **Project:** `PRJ-000007`  
**Status:** ROLE NOMINATED BY PROJECT OWNER; AUTHENTICATED AUTHORITY NOT YET PROVISIONED.

## Decision from owner

The project owner identified the existing Narayani collaborator account as the **responsible engineer and the designated evidence/inspection reviewer**.

This *role nomination* is not itself an authenticated Google identity, a verified engineering credential, signed review receipt, professional engineering decision or permission to start an activity. **The nominated Google account address is deliberately omitted from the public repository**. The exact account-to-provider-subject binding must be configured in a protected identity registry after a real Google sign-in and source-authorized account verification. A requester-supplied email string is insufficient.

## Observed Drive permissions

The three original pending/reviewer/audit folders still have the same four owner/writer collaborators (including the nominated reviewer). Existing inherited Drive access does not establish submitter/reviewer separation. Do not change inherited permissions or overwrite any original source to simulate this separation.

## Required role rules

1. **SOURCE_READER:** A dedicated automated service with Google Drive file read access only. This service attests to original file bytes, Google Drive revision, SHA and the **authenticated human reporter identity**. It may not sign review decisions.
2. **FIELD_REPORTER:** The authenticated person who uploaded/submitted the observation. Source reader must sign `reporter_principal_id` and `reporter_identity_basis: TRUSTED_SOURCE_SERVICE_AUTHENTICATED_SUBJECT`, derived from a trusted provider session or independently validated identity binding—not typed reporter names or mutable Drive file descriptions.
3. **RESPONSIBLE_ENGINEER / FIELD_REVIEWER:** The designated engineer, bound to a verified Google provider subject by the protected trust registry, signs a review using independently controlled credentials.
4. **No self-review:** Even when SOURCE_READER is a separate service, the signer of the review must not be the authenticated `reporter_principal_id` from the signed source readback. A self-reported account is rejected. If the responsible engineer needs to submit a report personally, a different authorized reviewer must be appointed for that report.
5. **Field release:** A separate site/project authority, genuine approval evidence, actual start/finish timestamps, hold-point register, calendar/lag verification and final release event remain required. Review of a report cannot be converted into actual `READY` or `COMPLETE`.

## Implemented contract change

The pre-live `SKYFORGE_SIGNED_FIELD_RECEIPT_V1` source-readback payload now **requires** `reporter_principal_id` and `reporter_identity_basis`. This tightens the schema without migrating any actual signed production receipts, because the three live intake folders contained no files when audited. Test suites use synthetic source-reader and reviewer identities; nothing implies the nominated engineer has signed a real receipt.

The trusted source signer and reviewer must remain distinct keys and service identities, and the human reporter and reviewer must also be distinct for each reviewed record.

## What the owner needs to provide next

- Name or account for the **person who will submit site observations**, separate from the designated reviewer. Reports must be associated with actual authenticated people.
- Arrange an authenticated Google identity connection for the nominated reviewer in a private reviewer/signing service, without sending OAuth tokens or private keys to ChatGPT.
- Authorize a separate read-only Drive service to access originals. No sharing permissions have been changed as part of this role nomination.
- Supply the first real field report in the private pending intake after access separation has been configured; source evidence should include activity ID, observed work, date and inspection references.

**Do not publish** the nominated account email, provider subject, reporter names, private original evidence, reviewer credentials or signing keys on GitHub Pages. Versioned source/approval evidence remains in restricted authoritative storage; source code and non-sensitive rules remain in GitHub. Public Pages continues to show UNKNOWN.
