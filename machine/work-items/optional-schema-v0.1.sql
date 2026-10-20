-- SKYFORGE_WORK_ITEM_REFERENCE_V1 / OPTIONAL SQLite schema, NOT DEPLOYED.
-- JSON in machine/work-items/work-item-library-v0.1.json is the actual authority for this release.
-- 2026-10-20. The tables below are a future normalized persistence contract.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS source_register (
 source_id TEXT PRIMARY KEY, agency TEXT NOT NULL, publication_year INTEGER NOT NULL,
 source_url TEXT NOT NULL, source_scope TEXT NOT NULL,
 source_sha256 TEXT, reviewed_at TEXT, authority TEXT NOT NULL DEFAULT 'REFERENCE_ONLY',
 CHECK (authority IN ('REFERENCE_ONLY','FIELD_MEASURED','REVIEWED_APPROVED'))
);
CREATE TABLE IF NOT EXISTS work_item (
 work_item_id TEXT PRIMARY KEY,
 work_name TEXT NOT NULL,
 work_unit TEXT NOT NULL CHECK (work_unit IN ('m3','m2','kg','m','each','day')),
 discipline TEXT NOT NULL, work_type TEXT NOT NULL,
 applicability TEXT NOT NULL, evidence_level TEXT NOT NULL,
 source_id TEXT REFERENCES source_register(source_id),
 source_clause TEXT, allowed_for_site INTEGER NOT NULL DEFAULT 0 CHECK (allowed_for_site IN (0,1)),
 version TEXT NOT NULL, notes TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS material_coefficient (
 work_item_id TEXT NOT NULL REFERENCES work_item(work_item_id),
 material_id TEXT NOT NULL, material_unit TEXT NOT NULL, quantity_per_unit REAL NOT NULL,
 source_id TEXT NOT NULL REFERENCES source_register(source_id),
 PRIMARY KEY (work_item_id,material_id,source_id),
 CHECK (quantity_per_unit>0)
);
CREATE TABLE IF NOT EXISTS labor_coefficient (
 work_item_id TEXT NOT NULL REFERENCES work_item(work_item_id),
 labor_role TEXT NOT NULL, worker_days_per_unit REAL NOT NULL,
 source_id TEXT NOT NULL REFERENCES source_register(source_id),
 PRIMARY KEY (work_item_id,labor_role,source_id),
 CHECK (worker_days_per_unit>0)
);
CREATE TABLE IF NOT EXISTS equipment_coefficient (
 work_item_id TEXT NOT NULL REFERENCES work_item(work_item_id),
 equipment_id TEXT NOT NULL, machine_hours_per_unit REAL NOT NULL,
 source_id TEXT NOT NULL REFERENCES source_register(source_id),
 PRIMARY KEY (work_item_id,equipment_id,source_id),
 CHECK (machine_hours_per_unit>0)
);
CREATE TABLE IF NOT EXISTS field_productivity_evidence (
 event_id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL, activity_id TEXT NOT NULL,
 work_item_id TEXT NOT NULL REFERENCES work_item(work_item_id),
 source_id TEXT NOT NULL REFERENCES source_register(source_id),
 measured_quantity REAL NOT NULL, measured_unit TEXT NOT NULL,
 actual_crew_hours REAL NOT NULL, actual_machine_hours REAL,
 work_start TEXT NOT NULL, work_finish TEXT NOT NULL, work_method TEXT NOT NULL,
 source_revision TEXT NOT NULL, observation_status TEXT NOT NULL,
 recorded_at TEXT NOT NULL,
 CHECK (measured_quantity>0), CHECK (actual_crew_hours>0),
 CHECK (observation_status IN ('REPORTED','VERIFIED','REJECTED')),
 CHECK (actual_machine_hours IS NULL OR actual_machine_hours>=0)
);
CREATE TABLE IF NOT EXISTS project_work_item_assumption (
 assumption_id TEXT PRIMARY KEY,
 project_id TEXT NOT NULL, activity_id TEXT NOT NULL,
 work_item_id TEXT NOT NULL REFERENCES work_item(work_item_id),
 parameter_name TEXT NOT NULL, parameter_value REAL NOT NULL,
 parameter_unit TEXT NOT NULL, reason TEXT NOT NULL,
 status TEXT NOT NULL CHECK (status IN ('ASSUMED_DRAFT','REVIEWED','REJECTED')),
 source_id TEXT REFERENCES source_register(source_id),
 recorded_at TEXT NOT NULL
);
-- Reproduction query deliberately does not aggregate REPORTED into VERIFIED.
-- A measured productivity rate must be computed from approved quantity + actual hours,
-- with comparable site methods, crew composition, dates and input provenance.
CREATE VIEW IF NOT EXISTS verified_observed_productivity AS
 SELECT project_id,work_item_id,work_method,measured_unit,
        SUM(measured_quantity) AS verified_quantity,
        SUM(actual_crew_hours) AS verified_crew_hours,
        SUM(measured_quantity)/NULLIF(SUM(actual_crew_hours),0) AS units_per_crew_hour
 FROM field_productivity_evidence WHERE observation_status='VERIFIED'
 GROUP BY project_id,work_item_id,work_method,measured_unit;
