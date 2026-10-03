# Project Controls Kernel

Open, testable project-controls kernel for construction planning and execution.

## Branch policy

All new ChatGPT development continues on **one working branch**:

`kernel-v0.2-open-source-engines`

The branch name is historical. Milestones v0.3, v0.4 and later evolve **in place on this same branch**. `main` and the earlier prototype branch remain preserved and are not used as scratch branches.

## Product surfaces

- `index.html` — P6-style Project Controls operations
- `kernel-lab.html` — scheduling calculation / adapter engine lab
- `roadmap.html` — one-page development roadmap
- `knowledge/` — separate Construction Knowledge portal for engineers
- `knowledge/shuttering.html` — direct share link for Shuttering / Formwork
- `knowledge/waterproofing.html` — direct share link for Waterproofing
- `knowledge/soak-pit.html` — direct research-gated Soak Pit link

## v0.2 foundation

CPM forward/backward pass, FS/SS/FF/SF + lag, negative float, total/free float, working-calendar mapping, earned value, resource-overload detection and five upstream adapter contracts.

## v0.3 — in progress

- WBS tree validation and rollups
- schedule constraint evaluation
- data-date activity statusing
- actual start / actual finish validation
- remaining-duration validation
- basic FS remaining-work rescheduling
- explicit fail-closed behavior for unsupported non-FS status rescheduling
- fuller calendar / constraint semantics next

## Knowledge separation

`activity_id` is a project schedule occurrence. `work_id` links that occurrence to reusable site knowledge such as ARC, WMS and ITP/QAQC.

Construction knowledge is deliberately usable as a standalone engineer-facing site rather than forcing field engineers into the Project Controls UI.
