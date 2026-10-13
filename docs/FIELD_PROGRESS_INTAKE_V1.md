# Skyforge Field Observation Intake v0.7 — Review-gated execution contract

## Purpose
One field-facing page only: read the scheduled milestone/WBS/prerequisites, choose an activity, record an observation plus evidence, **download** an immutable candidate JSON report, and upload it through a Google-authenticated Drive account to an intake folder. The static public page does **not** upload private records or authenticate anyone. It cannot mark work COMPLETE or READY from a browser observation.

## Durable Drive parent (inherited collaborators; not a separate reviewer role)
- Parent Project Controls: https://drive.google.com/drive/folders/1pRC6PIyqx1LXz1zm98H1eIlpPQ3Hk5-p
- Intake root: https://drive.google.com/drive/folders/1NZKE-1-QwHSmxK_HwuJNc97_QmQSkvQN
- 00_PENDING_FIELD_REPORTS: https://drive.google.com/drive/folders/1z6s5wqMjuSWACO-C7866wyOFD5wfy6Uo
- 10_REVIEW_DECISIONS: https://drive.google.com/drive/folders/1YESP4CNYe_sSFjUXTsulZIN0x3KjXE3W
- 20_READBACK_AND_AUDIT: https://drive.google.com/drive/folders/108oR5HZJ_WOGZnrGytm1uccDLuvc4-Bx

All three new folders are inherited from the Project Controls parent. Provider metadata readback found four individual Drive collaborators and no domain/anyone role. **This is not separation-of-duties approval:** the same inherited writers can write into the review folder. Approver authorization and immutable audit anchoring must be configured before this system accepts real site completion. Do not mistake Drive permission to upload for engineering authorization.

## Report contract
- Schema: PCK_FIELD_REPORT_V1, versioned in \`src/field/progress.mjs\`
- Origin: project_id = SYNTHETIC_WBS_DEMO, plan_format = PCK_WBS_SAMPLE_V1, activity_id FK resolved to machine plan.
- One observed event: WORK_STARTED / WORK_REPORTED_COMPLETE / WORK_BLOCKED / NEEDS_CLARIFICATION.
- Explicit observed_at UTC, self-reported name, full note, and 1-6 HTTPS evidence_refs (PHOTO, DAILY_LOG, INSPECTION, OTHER).
- authority_state fixed to UNVERIFIED_SUBMISSION. Reporters cannot declare approval.
- The site never writes to GitHub, Drive, cloud storage or shared localStorage; the JSON is downloaded locally. The user must manually upload it (using their authenticated Google session) to pending Drive records.

## Reviewer gate
1. Verify authentic Drive source identity and metadata, source readback and attachment links.
2. Independently validate activity identity, WBS, timestamps, predecessor evidence, contractual quality checkpoints and site authorization.
3. Use a **separately authorized reviewer** to issue a review decision; merely writing a JSON file to the review folder is not proof of reviewer identity. \`validateReviewDecision\` deliberately needs identity from a trusted authenticated runtime and \`sourceReadbackVerified=true\`.
4. Reconcile immutable report ID, Google Drive file ID, SHA-256 and reviewer decision into the private audit trail. Never overwrite source originals or duplicate prior reports.
5. Only after a verified approval process exists may a private backend compute real completion and a separately reviewed, sanitized status projection be published. **None of these real-site authority gates are yet connected.**

## Limitations / next execution gates
- Only the previously read-only **synthetic** 45-activity schedule is addressable; this is **not a real named project's WBS**.
- No background syncing, offline persistent store, background uploads, PDF inspection, authenticated IDP integration, AI-generated approvals or field photo storage inside GitHub Pages.
- Reporting work complete is just a statement awaiting review. All milestone and ready-to-start statuses remain unverified.
- Public Pages must not receive the pending reports, underlying private Drive photos, review decisions, reviewer identities or secrets.
- Next backend lane: authenticated identity and reviewer-role separation (Drive IAM or a private app), evidence upload/API integration, manual quality signoff, event sourcing, machine-produced readback and a non-sensitive projection; test with real project WBS only after authority/permission review.

## Reproducibility
Run \`npm test\` for the field report contract tests; \`node scripts/verify-field-report.mjs <path-to-report.json>\` validates a supplied unverified report against the GitHub-pinned synthetic WBS. A passing validation means **schema/data correctness only**, not source authenticity or site approval. All existing CPM/independent-oracle and Pages strict-allowlist verification must continue passing.
