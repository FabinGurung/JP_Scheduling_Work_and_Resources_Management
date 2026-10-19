# SKYFORGE WHITE + PIP CRAWLER — DESIGN AND RELEASE SPEC v1.5

**Status:** Implemented in canonical working branch; CI/deployment evidence must be read back before claiming live release.
**Scope:** Public, allowlisted Skyforge UI only, including home, shared header and Narayani visual WBS workspace.
**Reference:** User-provided CAD Test-Facility's fluffy flying companion is conceptual inspiration only. Pip is original vector artwork, not a copied character.
**Data authority:** GitHub for UI code, Google Drive for private engineering drawings and revisions, canonical generated `project-model.json` for the public WBS views.
**Non-goal:** New scheduling logic, inferred construction progress, BIM reconstruction, resource booking or approval automation.

## 1. Visual language (all public pages)

- **Surface:** #FFFFFF for raised panels; #F6F9FC page canvas, #F0F8FC for light 3D network stage.
- **Text:** #1C344A primary; #597184 muted; readable labels and no low-contrast gray-on-gray status.
- **Rules:** #DBE6EF separators; use restrained shadows rather than thick borders.
- **Semantics:** #187F86 teal for *navigation/active selection*, #BD7919 amber for *reported, advisory and needs-review*, #B9434F coral for *holds and errors*, #1D9472 green only where appropriately verified.
- **Critical invariant:** A teal planning highlight never means an activity is actually approved, achieved or resource-committed.
- **Components:** Shared sticky white navigation; rounded white field cards, Gantt, calendar and MCQ groups; white drawer; accessible focus rings and legible disabled/active states.
- **Scope:** Keep the original machine views under **More**, including public allowlisted archives and engineers' technical tools. Retire display of the old flying dragon, retain its source for rollback.

## 2. Character: Pip, the scheduling crawler

- **Identity:** Small cream/white fluffy inchworm with soft teal backpack/mini Gantt bars, friendly eyes, pink cheeks, four stylized crawling feet and amber antenna bead.
- **Rendering:** Original **inline SVG**, fully bundled with existing shared navigation module. No outside image/character/3D/animation dependency; no external font.
- **Geometry:** `viewBox="0 0 112 79"`, visual footprint ~76 × 51 px desktop, ~63 × 42 px mobile.
- **Movement:** Crawls **horizontally along a 51 px header timeline rail**; there are seven purely illustrative milestone ticks corresponding to seven master milestone objects, but no direct data binding to actual completion.
- **Animation:** 33-second alternate round trip, staged short dwells along rail. Slight X compression/Y expansion of body and alternating foot rotations simulate crawling. No flying, jumping, big vertical translation, covering charts or following pointer.
- **Safeguards:** Dedicated rail is `pointer-events:none`, overflow hidden, `aria-hidden=true`; character is decorative, never an actionable schedule node. No project IDs, approvals or private Drive links enter mascot assets.
- **Control:** Small, keyboard accessible **Pause Pip / Play Pip** button. `aria-pressed` reflects paused state; no fake controls. Motion turns off when `prefers-reduced-motion:reduce`; its playback control is disabled and labeled accordingly.
- **Performance:** CSS-only movement; no timer, interval, JS animation loop, polling, network request, or layout-affecting writes beyond startup. No new dependency.

## 3. Site layout / behavior

- **Global shell:** Original `assets/site-shell.mjs` creates one header and one crawler per loaded page; existing menu and links unchanged. A slim rail sits directly under the navigation.
- **Home:** White technical hero and three clear WBS/Gantt/calendar cards, dark readable typography, teal CTA.
- **Narayani visual:** Pale constellation background with slate activity labels and high-contrast selected/report/hold states. White Gantt tracks, calendar dates, MCQ cards and preparation drawer. Existing graph pan/zoom, synthetic preview, 405 checklists and clipboard actions unchanged.
- **Optional 3D:** White-sky Three.js scene background and readable labels. The renderer stays optional and lazy-loaded; its semantics are a WBS network, not a building BIM.
- **Advanced/legacy:** Preserve existing CSS selectors and UI/engine IDs; shared header white with other pages remaining legible and accessible.
- **Small screens:** Header scrolls navigation safely; character rail shrinks, without covering task areas. Calendar retains horizontal scroll; selected-day readout stays above the long grid.
- **Accessibility:** Focus-visible controls, skip decorative SVG from screen readers, readable status language, honor reduced-motion preference.

## 4. Engineering kernel preservation — MUST PASS

1. Do not edit `src/machine/`, `src/visual/project-model.mjs`, project-mappings, WBS snapshots, CPM code, scheduling API, live sync adapters, `machine/` source data, engineering evidence or approved/pending state.
2. No WBS IDs, predecessors, milestones, MCQ answer codes, source digests or JSON schema changes.
3. Run `npm test`, the full **3,888-case** calendar oracle, deterministic machine/WBS/pilot/progress/visual build/readback and Pages public-data allowlist unchanged.
4. Do not publish Google Drive/Slack private URLs or drawing files through the site to support Pip. No new repositories, schedules, automations or branch.
5. Do not mark any inspection gate, WBS activity, permit or resource commitment as approved.
6. Preserve existing Git history and use the existing `kernel-v0.2-open-source-engines` deployment branch. Changes reversible by reverting only presentation/spec/test commits.

## 5. Acceptance criteria and QA record

| Criterion | Expected |
| --- | --- |
| Home, shell and Narayani 2D/Gantt/calendar | White/light skin with readable dark copy |
| 3D selection | Pale network canvas, functional fallback to 2D |
| Pip behavior | Clearly *crawls*, pauses at decorative ticks, does not fly or cover inputs |
| Motion control | Keyboard action toggles real animation pause; reduced motion starts still |
| Existing 45/49/405/7 WBS counts | Exact previous counts |
| MCQ/private status/engineering holds | No authority promotion or private-source leakage |
| Static CI | Tests + oracle + deterministic build + privacy allowlist all pass |
| Published release | Only claim live after exact-head GitHub Pages Action **success** |
| Browser interaction / responsive pixels | Independent graphical browser QA should be recorded separately; do not infer from static CI |

## 6. Source-file scope

- `assets/site-shell.mjs`: Original Pip SVG + motion toggle in shared navigation.
- `assets/site-shell.css`: Unified light tokens, page/visual styles and Pip rail keyframes.
- `index.html`, `projects/narayani/visual.html`: Apply shared skin after older inline theme CSS, set light browser theme color.
- `assets/sky-theme.css`: Hide former flight visual, preserve file for historical rollback.
- `src/presentation/narayani-three.mjs`: Light 3D visualization only.
- `tests/skyforge-white-crawler.test.mjs`: Static regression gate.
- `package.json`, `README.md`: v1.5 release identification and boundary.

## 7. Rollback and support

Revert the dedicated presentation commits, not the project's machine/WBS/history. Existing `kernel-v0.2-open-source-engines` branch and normal Actions pipeline continue to deploy. If 3D fails, use 2D. If Pip is paused, disabled or unsupported, the scheduler/checklists continue independently.

**Disclaimer on appearance:** Production-site and physical-mobile screenshots remain independent QA evidence. CI output confirms only checked code/data, not actual computed browser colors or touch ergonomics.
