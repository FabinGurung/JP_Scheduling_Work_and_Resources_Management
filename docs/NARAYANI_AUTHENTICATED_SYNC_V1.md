# Narayani v1.0 — Authorized Drive → WBS automatic refresh

## Status
IMPLEMENTED AS GATED CODE, NOT ACTIVATED UNTIL CREDENTIALS ARE PROVISIONED.

The current v0.9 public snapshot remains authoritative until a real successful GitHub Actions OIDC/Sheets read-and-deploy run. This code does **not** mean Google permissions or a recurring execution already exist.

## Authority and data contract
- Canonical source is the Fishtail shared Google Sheet, tabs `Daily Progress` columns A:H and `Daily Readiness` columns A:W. The only selected rows are scoped to project `PRJ-000007`; name/ID conflicts fail closed.
- Only authenticated Google Sheets API reads; no Google service-account key JSON, no copy of raw rows into git, Actions artifacts, the public website, or output logs. Tokens are emitted by GitHub OIDC → Google Workload Identity Federation; access_token scopes are `spreadsheets.readonly`.
- Each source event requires a valid unique PK. Row loss below the currently verified minimum (34 diary entries; 4 readiness records), duplicate IDs, unexpected statuses, future dates, and source/project mismatch abort publication.
- Generated `progress.json` contains only counts, two known P6 **subwork** attribution counts and generic open checks. Everything reporting construction completion/engineering release stays **false/zero**.
- Privacy and deterministic SHA-256 checks run before Pages deployment; no construction authorization is inferred.
- The public page states the latest source dates and latest reconciliation day. It is a scheduled **snapshot**, not realtime socket/field push.

## Required one-time setup (outside ChatGPT repository tools)

1. In Google Cloud create or use a Google project, enable **Google Sheets API**, and configure an OIDC Workload Identity Pool/Provider restricted to `FabinGurung/JP_Scheduling_Work_and_Resources_Management` (and approved main/working-branch workflow references). Grant the GitHub identity `roles/iam.workloadIdentityUser` on one dedicated **read-only** service account. Follow the vendor guide: https://github.com/google-github-actions/auth .
2. Share only the canonical Fishtail Google Sheet with that service account as **Viewer**. Do NOT grant broad My Drive access. Confirm its access using an authenticated manual refresh run. No service account key file should be created.
3. In GitHub repository Settings → Secrets and variables → Actions, set these secrets: `NARAYANI_WIF_PROVIDER` (full workload identity provider resource path), `NARAYANI_SERVICE_ACCOUNT` (service-account email), `NARAYANI_DRIVE_SHEET_ID` (canonical sheet ID). Never commit or print their values.
4. After access, identity claims, privacy tests and first manual refresh succeed, set repository Actions variable `NARAYANI_SYNC_ENABLED=true`. This enables the gated full-release refresh and the default-branch scheduler.
5. A **minimal scheduler workflow** in the repository default branch `main` invokes the independently versioned workflow `.github/workflows/narayani-drive-sync.yml` from the canonical working branch. This is necessary because GitHub `schedule` triggers only on the **default branch**; the product source remains on `kernel-v0.2-open-source-engines`. Schedule uses minute 17 every 6 hours UTC, subject to GitHub scheduler delays and disabled schedules after inactivity.
6. Verify the new run generated a green Pages deployment and the public `progress.json` is labeled `auto_refresh_enabled: true` and `AUTHENTICATED_GITHUB_ACTIONS_DRIVE_READ_ONLY`. If not, do not claim active automatic refresh. Push builds use the same gated authentication so they cannot silently overwrite a live projection with an old static snapshot after activation.

## Operational control
- GitHub workflow failures do not publish new data; the last successful static Pages artifact remains, so stale dates are visible.
- Raw private site evidence does not reach GitHub; the original private event registry and source sheets remain in Drive. The public manifest records a digest only.
- Do not store private exports, OAuth tokens, site photos or contacts in Actions artifacts, commit history or Logs. The current v1.0 job has no write scopes to Drive.
- The engine is intentionally NOT a statutory-permit, structural-engineering or site-acceptance authority; no role-separated engineer signing portal yet.
- A9 registration and readback should record the **first real authenticated scheduled run**, not label a staged adapter as a running connector.
- If reconciliation fails on source loss, duplicate PK, changed mapping, or data-quality drift, investigate the private source; do not edit a public aggregate to suppress the error.

## Local / CI verification
```bash
npm test
npm run verify:calendar
npm run machine:build && npm run machine:verify
npm run wbs:build && npm run wbs:verify
npm run pilot:build && npm run pilot:verify
npm run progress:build && npm run progress:verify
npm run site:build
```

`src/machine/narayani-live-sync.mjs` contains source-scoped reconciliation and output-validation functions that are covered by synthetic unit tests. `scripts/run-narayani-live-sync.mjs` requires authenticated environment variables and refuses to run otherwise.
