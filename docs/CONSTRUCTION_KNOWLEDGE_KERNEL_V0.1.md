# Construction Knowledge Kernel — v0.1 branch prototype

This branch is a **prototype only**. The repository `main` branch remains untouched.

## Identity model

```
work_id                 reusable construction work type
wbs_id                  project scope hierarchy
activity_id             project occurrence of reusable work
checklist_template_id   reusable control template
checklist_execution_id  real execution only
source_system_id        source provenance
source_record_id        provider/source identity
evidence_id             actual captured evidence only
```

## Knowledge envelope

```
WORK TYPE
├── ARC / Resource Readiness
├── WMS / Method Statement
├── Technical Specification
├── Codal / Authority References
├── ITP / QAQC
├── Safety / JSA
├── BOQ / Cost
├── Drawings / Details
└── Evidence / Lessons Learned
```

## Open ecosystem

IFC 4.3 provides open task/schedule/resource/cost/document concepts. IfcOpenShell/Ifc4D supplies open-source programmatic manipulation and schedule interoperability. bSDD supplies reusable terminology/property dictionaries. IDS supplies machine-readable requirement/validation patterns. BCF provides issue exchange. Primavera P6 remains an external interoperable scheduler, not the canonical knowledge store.

## Guardrails

1. Do not fabricate identifiers.
2. Do not convert user/local practice into an approved standard without verification.
3. Any numerical/codal technical requirement requires source, edition, clause/table/figure and applicability.
4. Reusable work knowledge is separate from project execution facts.
5. GitHub contains code, schemas, mappings, tests and sanitized/reference data — not confidential live site truth.
