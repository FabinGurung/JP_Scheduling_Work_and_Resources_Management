// Public-safe Narayani progress boundary. Actual Google Drive evidence stays PRIVATE.
// This module can reconcile separately exported source rows within an authenticated
// private runner, but does not contain Google credentials or read Google Drive itself.
import {createHash} from "node:crypto";
export const PROGRESS_FORMAT="PCK_NARAYANI_PROGRESS_PROJECTION_V1";
const sha=s=>createHash("sha256").update(s).digest("hex");
const stringify=x=>JSON.stringify(x,null,2)+"\n";
const fail=s=>{throw Error("Narayani progress fail closed: "+s);};
const EXPECTED=["DONE","NEEDS_INPUT","NOTE","PLAN","NOT_STARTED"];
const BUCKETS=new Set(["T5030_SUBACTIVITY_ONLY","T4030_LAYOUT_SUBACTIVITY_ONLY","LOCAL_COLUMN_AND_MATERIAL_SCOPE_REVIEW","LOCAL_STONE_MASONRY_OR_COMPOSITE","UNMAPPED_NEEDS_SCOPE_VERIFICATION","LOCAL_LIFT_REFERENCE_ONLY","IDENTITY_STATE_ADMIN_EVENT","ENGINEERING_HOLD_001","LOCAL_PUJA_SCOPE_UNKNOWN","LOCAL_LINTEL_SILL_MANAGEMENT_ACCEPTED","LOCAL_NO_WORK_WEATHER_NOTE","FOUNDATION_QUALITY_HOLD","FOOTING_QUANTITY_CONFLICT","LOCAL_ELECTRICAL_REPAIR_PLAN","LOCAL_STAIR_DIMENSION","LOCAL_FOOTING_BASE_PCC"]);
export function classifyPrivateDiaryRow(r){
 if(!Array.isArray(r)||r.length<8||r[6]!=="PRJ-000007"||typeof r[5]!=="string"||!/^20\d{6}\|PRJ-000007\|PROGRESS\|\d\d$/.test(r[5]))fail("row project/PK");
 if(!EXPECTED.includes(r[2])||typeof r[3]!=="string"||typeof r[4]!=="string"||typeof r[7]!=="string")fail("row status/work/provenance");
 const w=r[3].toLowerCase();
 if(r[2]==="DONE"&&w.startsWith("footing concreting"))return "T5030_SUBACTIVITY_ONLY";
 if(r[2]==="DONE"&&w.includes("layout for column alignment"))return "T4030_LAYOUT_SUBACTIVITY_ONLY";
 if(w.includes("masonry / column interface"))return "ENGINEERING_HOLD_001";
 if(w.includes("post-soling"))return "FOUNDATION_QUALITY_HOLD";
 if(w.includes("opc total"))return "FOOTING_QUANTITY_CONFLICT";
 if(w.includes("stone masonry")||w.includes("pcc + stone"))return "LOCAL_STONE_MASONRY_OR_COMPOSITE";
 if(w.includes("pillar")||w.includes("column")||w.includes("rebar"))return "LOCAL_COLUMN_AND_MATERIAL_SCOPE_REVIEW";
 if(w.includes("lintel")||w.includes("sill"))return "LOCAL_LINTEL_SILL_MANAGEMENT_ACCEPTED";
 if(w.includes("pcc on footing base"))return "LOCAL_FOOTING_BASE_PCC";
 if(w.includes("puja"))return "LOCAL_PUJA_SCOPE_UNKNOWN";
 if(w.includes("repair"))return "LOCAL_ELECTRICAL_REPAIR_PLAN";
 if(w.includes("staircase"))return "LOCAL_STAIR_DIMENSION";
 if(w.includes("rain"))return "LOCAL_NO_WORK_WEATHER_NOTE";
 if(w.includes("lift"))return "LOCAL_LIFT_REFERENCE_ONLY";
 if(w.includes("project phase"))return "IDENTITY_STATE_ADMIN_EVENT";
 return "UNMAPPED_NEEDS_SCOPE_VERIFICATION";
}
// Read-only input adapter for trusted, private Google Sheets connector export. Never
// commit input or the per-row output to a public repository.
export function reconcilePrivateDriveExport(source){
 if(source?.format!=="PCK_PRIVATE_NARAYANI_DRIVE_EXPORT_V1"||source.project_id!=="PRJ-000007")fail("private input format");
 if(!Array.isArray(source.daily_progress_rows)||!Array.isArray(source.daily_readiness_rows))fail("missing source rows");
 const records=source.daily_progress_rows;
 if(records.length===0||records.length>600)fail("bounded progress source");
 const seen=new Set(),status={},counts={},mapped=[];
 for(const row of records){
  const bucket=classifyPrivateDiaryRow(row);
  if(!BUCKETS.has(bucket)||seen.has(row[5]))fail("unknown mapping or duplicated progress PK");
  seen.add(row[5]);status[row[2]]=(status[row[2]]||0)+1;counts[bucket]=(counts[bucket]||0)+1;
  mapped.push({private_pk:row[5],source_status:row[2],mapping:bucket,engineering_approved:false});
 }
 const rs={};let maxDate="";
 for(const r of source.daily_readiness_rows){
  if(!Array.isArray(r)||r.length<20||r[19]!=="PRJ-000007"||typeof r[0]!=="string"||!["NEEDS_INPUT","NOTE","PLAN","DONE","NOT_STARTED"].includes(r[13]))fail("readiness/project mismatch");
  rs[r[13]]=(rs[r[13]]||0)+1;
  if(r[0]>maxDate)maxDate=r[0];
 }
 const linked=(counts.T5030_SUBACTIVITY_ONLY||0)+(counts.T4030_LAYOUT_SUBACTIVITY_ONLY||0);
 const safe={
  progress_rows:records.length,unique_progress_events:seen.size,readiness_rows:source.daily_readiness_rows.length,
  progress_status_counts:Object.fromEntries(EXPECTED.map(k=>[k,status[k]||0])),
  readiness_status_counts:rs,linked_reported_task_subactivities:linked,
  other_records_pending_scope_or_review:records.length-linked,
  category_counts:counts,last_readiness_date:maxDate
 };
 return {private_audit:mapped,public_aggregate:safe};
}
export function buildPublicProgress(input,plan){
 if(input?.format!=="PCK_NARAYANI_PROGRESS_SOURCE_SUMMARY_V1"||
    input.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||
    input.project_id!=="PRJ-000007"||input.project_code!=="FBL-006")fail("source classification/project");
 if(input.refresh_mode!=="GOVERNED_ONE_TIME_READBACK_NOT_AUTOMATIC"||input.private_source!=="CANONICAL_DRIVE_PRIVATE_NO_SOURCE_IDS_EXPORTED")fail("refresh/provenance");
 if(!/^\d{4}-\d\d-\d\d$/.test(input.reconciliation_date)||input.last_readiness_date>input.reconciliation_date)fail("date provenance");
 const s=input.source_rollup;
 if(!s||s.progress_rows!==34||s.unique_progress_events!==34||s.readiness_rows!==4)fail("readback cardinality changed");
 if(EXPECTED.some(k=>!Number.isInteger(s.progress_status_counts[k])||s.progress_status_counts[k]<0))fail("invalid status counts");
 if(Object.values(s.progress_status_counts).reduce((n,v)=>n+v,0)!==34||s.readiness_status_counts.NEEDS_INPUT!==4)fail("status histogram mismatch");
 if(!Array.isArray(input.task_subactivities)||input.task_subactivities.length!==2||
    !input.task_subactivities.some(x=>x.activity_id==="T5030"&&x.reported_evidence_count===3)||
    !input.task_subactivities.some(x=>x.activity_id==="T4030"&&x.reported_evidence_count===1))fail("unsupported task attribution");
 const ids=new Set(plan?.activities?.map(x=>x.activity_id)||[]);
 if(input.task_subactivities.some(x=>!ids.has(x.activity_id)||x.status!=="PARTIAL_WORK_REPORTED_UNVERIFIED"))fail("untrusted or unmapped activity");
 if(input.other_records_pending_scope_or_review!==30||input.approved_complete_activities!==0||
    input.observed_complete_activities!==0||input.verified_milestones!==0||
    input.baseline_approved!==false||input.unresolved_engineering_or_quality_holds!==true)fail("unsafe completion/approval claim");
 const result={
  format:PROGRESS_FORMAT,classification:"PUBLIC_SAFE_COUNTS_ONLY",
  project_id:"PRJ-000007",reconciled_on:input.reconciliation_date,
  latest_readiness_record:input.last_readiness_date,latest_diary_record:input.last_progress_date,
  auto_refresh_enabled:false,progress_status:"SOURCE_REPORTED_PARTIAL_NOT_APPROVED",
  evidence_inventory:{progress_rows:s.progress_rows,readiness_rows:s.readiness_rows,
    source_done_reports:s.progress_status_counts.DONE,source_needs_input:s.progress_status_counts.NEEDS_INPUT,
    source_plan_reports:s.progress_status_counts.PLAN,source_notes:s.progress_status_counts.NOTE,
    source_not_started:s.progress_status_counts.NOT_STARTED},
  task_evidence:input.task_subactivities.map(x=>({activity_id:x.activity_id,reported_subwork_entries:x.reported_evidence_count,verified_activity_complete:false,approved_work_complete:false,ready_for_next_work:false})),
  unassigned_or_local_scope_records:input.other_records_pending_scope_or_review,
  actionable_checks:[
   {id:"CHK-FOUNDATION-QTY",name:"Reconcile foundation cement records and grid allocations",status:"NEEDS_INPUT",work_release:false},
   {id:"CHK-ENGINEERING",name:"Obtain responsible-engineer decisions for affected foundation work",status:"ENGINEERING_HOLD",work_release:false},
   {id:"CHK-MEP",name:"Verify early plumbing routes before closure",status:"NEEDS_SITE_INSPECTION",work_release:false},
   {id:"CHK-BASELINE",name:"Approve project work packages, missing WBS scope and durations",status:"UNAPPROVED",work_release:false}
  ],
  completed_wbs_activities:0,verified_milestones:0,
  plan_baseline_approved:false,source_evidence_is_site_approval:false,
  limitations:"One-time governed Drive readback; not a continuously authenticated live connection. Site engineer must use the private source register for evidence and official approvals."
 };
 validatePublicProgress(result,plan);
 return {output:result,files:{"progress.json":stringify(result)},manifest:{
  format:"PCK_NARAYANI_PROGRESS_EVIDENCE_MANIFEST_V1",
  classification:"PUBLIC_SAFE_COUNTS_ONLY",
  source_summary_sha256:sha(stringify(input)),
  output_sha256:{"progress.json":sha(stringify(result))},
  field_authorization:"NO_APPROVAL",private_source_rows_included:false,live_connector_active:false
 }};
}
export function validatePublicProgress(p,plan){
 if(p?.format!==PROGRESS_FORMAT||p.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||p.project_id!=="PRJ-000007")fail("unsafe output identity");
 if(p.auto_refresh_enabled!==false||p.completed_wbs_activities!==0||p.verified_milestones!==0||
  p.plan_baseline_approved!==false||p.source_evidence_is_site_approval!==false)fail("fabricated completion or connectivity");
 if(p.evidence_inventory?.progress_rows!==34||p.evidence_inventory?.readiness_rows!==4||p.unassigned_or_local_scope_records!==30)fail("unexpected output counts");
 if(p.task_evidence?.length!==2||p.task_evidence.some(x=>x.verified_activity_complete||x.approved_work_complete||x.ready_for_next_work||!plan.activities.some(a=>a.activity_id===x.activity_id)))fail("invalid task-level clearance");
 if(p.actionable_checks?.some(x=>x.work_release!==false)||p.actionable_checks?.length!==4)fail("unsafe gate release");
 return true;
}
