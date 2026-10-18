# Third-party / upstream notices

This repository studies or interoperates with several open-source project-controls systems. Source code from GPL/CPAL projects is **not vendored into the kernel in v0.2**.

- IfcOpenShell / Ifc4D — https://github.com/IfcOpenShell/IfcOpenShell — applicable LGPL/GPL licenses by component.
- OpenProject — https://github.com/opf/openproject — GPL-3.0.
- ProjectLibre Desktop — https://sourceforge.net/projects/projectlibre/ — CPAL-covered code where applicable.
- TaskJuggler — https://github.com/taskjuggler/TaskJuggler — GPL-2.0-only.
- GanttProject — https://github.com/bardsoftware/ganttproject — GPL-3.0.

Primavera P6 and Microsoft Project are proprietary products and are referenced solely as interoperability/behavior targets.

Before vendoring, linking, distributing, or externally deploying any third-party code, verify the exact component license and obligations for that use.

- Three.js — https://threejs.org/ — MIT License, pinned version 0.180.0. The optional Skyforge 3D constellation dynamically loads the ESM build from `https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js` only when a user opens the 3D tab. No Three.js source is vendored into the repository. Three.js is not used for engineering verification or IFC representation.
