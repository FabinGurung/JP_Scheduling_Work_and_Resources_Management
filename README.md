# Project Controls Kernel

Open, testable project-controls kernel for construction planning and execution.

Development is isolated on feature branches before any merge to `main`.

## Current development branch

`kernel-v0.2-open-source-engines`

## Native v0.2 functions

- CPM forward/backward pass
- FS / SS / FF / SF relationships + lag
- required-finish negative float
- total float / free float / critical flag
- working-calendar date mapping
- earned value metrics
- resource over-allocation detection
- adapter contracts for IfcOpenShell/Ifc4D, OpenProject, ProjectLibre, TaskJuggler and GanttProject

## Product model

`activity_id` is a project schedule occurrence. `work_id` links the activity to reusable construction knowledge such as ARC, WMS and ITP/QAQC.

Open `kernel-lab.html` in the deployed branch to inspect computed schedule output and adapter previews.

See `docs/UPSTREAM_CAPABILITY_MATRIX.md` and `UPSTREAM_SOURCES.json` for the five upstream capability sources and their license boundaries.
