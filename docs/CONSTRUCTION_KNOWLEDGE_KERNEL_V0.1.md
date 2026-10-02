# Construction Project Controls — branch prototype v0.2

This branch is evolving from a construction-knowledge browser into a **P6-style project planning and control surface**. The repository `main` branch remains untouched.

## Product split

```
PROJECT CONTROLS SURFACE
├── WBS
├── Activities
├── Baseline / Current Dates
├── Logic / Relationships
├── Total Float / Criticality
├── Progress / Actuals
├── Resources
├── Costs / Earned Value
├── Codes / Layouts / Filters
└── Documents
        │
        ▼
SELECTED ACTIVITY
        │
        └── work_id
              │
              ▼
CONSTRUCTION KNOWLEDGE
├── ARC / Resource Readiness
├── WMS / Method Statement
├── Technical / Codal References
├── ITP / QAQC
├── Safety / JSA
├── BOQ / Cost Knowledge
├── Drawings / Details
└── Evidence / Lessons Learned
```

## Why this separation matters

A Primavera-like schedule activity is a project occurrence. A reusable construction method/checklist is knowledge. They are linked, but they are not the same record.

Example:

```
A090 (project activity)
    -> work_id = WRK-000023
        -> Waterproofing ARC
        -> Waterproofing WMS
        -> CK-BLD-WP-001 QA reference
```

## Prototype status

The dashboard uses synthetic schedule, cost, resource and earned-value numbers only. It demonstrates UI/schema behavior and does not assert live project truth.

## Open ecosystem direction

- IFC 4.3 — task/schedule/resource/cost/document interoperability
- IfcOpenShell / Ifc4D — open-source manipulation and 4D/schedule exchange
- bSDD — reusable terminology and properties
- IDS — machine-readable information requirements
- BCF — issue exchange
- Primavera P6 — external scheduling interoperability

## Guardrails

1. Never fabricate real project dates, costs, progress, resources, evidence or execution IDs.
2. Reusable work knowledge is distinct from activity occurrence.
3. Technical/codal numeric requirements need authoritative source, edition and applicability.
4. GitHub branch demo contains code and synthetic/reference data only.
