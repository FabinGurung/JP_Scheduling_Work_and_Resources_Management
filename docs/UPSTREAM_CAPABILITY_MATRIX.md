# Upstream capability matrix — v0.2

These projects do not inherit Primavera P6 or Microsoft Project source code. They overlap with professional project-controls functions and, in several cases, interoperate with P6/MS Project formats.

| Capability | IfcOpenShell / Ifc4D | OpenProject | ProjectLibre Desktop | TaskJuggler | GanttProject | Kernel v0.2 |
|---|---|---|---|---|---|---|
| WBS / hierarchy | IFC task nesting | Work packages / parent-child | Yes | Yes | Yes | Canonical IDs + adapters |
| CPM / critical path | Schedule model / 4D | Date/dependency scheduling | Yes | Optimizing scheduler | Scheduling | **Implemented day-slot CPM** |
| FS/SS/FF/SF logic | IFC sequence relationships | Dependency model | Yes | Dependency scheduling | Dependencies | **Implemented 4 relation types** |
| Total / free float | Exchange/model target | Partial UI semantics | Yes | Criticalness/scheduling | Scheduling | **Implemented** |
| Baselines / scenarios | IFC schedules | Baseline comparison | Yes | Unlimited scenarios | Baselines | Data model next |
| Resource assignment | IFC resources | Assignees/work packages | Yes | Yes | Yes | Over-allocation detector implemented |
| LOE / resource-dependent / effort semantics | IFC task/resource exchange target | Estimated-time + schedule metadata | Fixed work/units/duration + P6 resource-calendar distinction | Effort + allocation | Effort-driven work tracked separately | **SEQ9 canonical contract; LOE/RD native execution fail-closed** |
| Resource leveling | Interop target | Not core | Yes | Yes | Resource load | Heuristic engine next |
| Earned value | IFC cost + schedule bridge | Work tracking | Yes | Cost/accounting | Cost calc | **EV metrics implemented** |
| P6 interoperability | **XER/XML via Ifc4D** | API/import path | Migration concepts | External exports | Not P6-focused | Ifc4D adapter target |
| Microsoft Project interoperability | **MS Project XML via Ifc4D** | Sync/import patterns | Core compatibility goal | Export | **MPX/MPP/MSPDI** | Adapter contracts |
| BIM / 4D | **Native strength** | IFC/BCF ecosystem | No | No | No | Ifc4D bridge |
| Collaboration/API | Libraries | **Strong REST/web app** | Desktop/cloud split | Reports/timesheets | WebDAV/cloud option | OpenProject adapter target |

## License boundary

- **IfcOpenShell/Ifc4D:** library integration can be used under the applicable component license.
- **OpenProject, TaskJuggler, GanttProject:** integrate through documented APIs/formats or isolated tools unless we intentionally accept GPL obligations.
- **ProjectLibre Desktop:** CPAL-covered code is not copied into this repository; behavior and file interoperability are compatibility targets.
- **Primavera P6 and Microsoft Project:** proprietary interoperability targets only.

## Native kernel first

The first engine is intentionally small and testable: deterministic day-slot CPM with FS/SS/FF/SF and lag, late dates, total/free float, critical flag, required-finish negative float, earned-value metrics, and resource-overload detection.


## SEQ9 activity-contract interpretation

The five upstream projects remain reference bases, not copied scheduling engines. For the new activity contract:

- **IfcOpenShell / Ifc4D** anchors future IFC/P6/MS Project schedule exchange and preserves task/resource semantics across adapters.
- **OpenProject** informs the separation between work/estimated-time metadata and calculated schedule dates.
- **ProjectLibre Desktop / OpenProj lineage** informs the distinction between fixed work/units/duration, effort-driven behavior, and Primavera Resource Dependent activities that use resource calendars.
- **TaskJuggler** is a reference for effort + resource allocation as a scheduling model distinct from P6 activity-type naming.
- **GanttProject** is a reference for task/resource interoperability and its explicitly separate effort-driven scheduling work.

Kernel rule: behavior is reimplemented under this repository's own tested contract. No GPL/CPAL implementation code is copied into the kernel.
