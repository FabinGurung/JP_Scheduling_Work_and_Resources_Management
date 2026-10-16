// v1.0: provider-neutral, deterministic Drive-to-WBS refresh. PRIVATE inputs
// are processed in memory; only bounded aggregate counts leave this module.
import {createHash} from "node:crypto";
import {reconcilePrivateDriveExport} from "./narayani-progress.mjs";
const sha=s=>createHash("sha256").update(s).digest("hex");
const stable=x=>JSON.stringify(x,null,2)+"\n";
const fail=s=>{throw Error("Narayani authenticated sync rejected: "+s);};
const statuses=["DONE","NEEDS_INPUT","NOTE","PLAN","NOT_STARTED"];
export function selectCanonicalRows(progressValues,readinessValues){
 if(!Array.isArray(progressValues)||!Array.isArray(readinessValues))fail("missing sheet values");
 if(progressValues.length>1500||readinessValues.length>1500)fail("source exceeds bounded scan");
 const isNarayani=x=>String(x||"").toLowerCase().includes("narayani");
 const pick=(rows,idcol,width,kind)=>{
  const selected=[];
  for(const r of rows){
   if(!Array.isArray(r))fail("unexpected source row type");
   if(r.every(x=>x==null||x===""))continue;
   const matchesId=r[idcol]==="PRJ-000007";
   if(!matchesId&&!isNarayani(r[1]))continue;
   if(!matchesId||!isNarayani(r[1]))fail(kind+" identity mismatch");
   selected.push(Array.from({length:width},(_,i)=>r[i]??""));
  }
  return selected;
 };
 const daily_progress_rows=pick(progressValues,6,8,"progress");
 const daily_readiness_rows=pick(readinessValues,19,23,"readiness");
 if(daily_progress_rows.length<34||daily_readiness_rows.length<4)fail("baseline source row loss");
 if(daily_progress_rows.length>600||daily_readiness_rows.length>600)fail("project bounded size exceeded");
 return {format:"PCK_PRIVATE_NARAYANI_DRIVE_EXPORT_V1",project_id:"PRJ-000007",daily_progress_rows,daily_readiness_rows};
}
function parseDiaryDate(s){
 const parts=/^(\d{2})-([A-Za-z]{3})-(20\d{2})$/.exec(s);
 if(!parts)fail("unrecognized source diary date");
 const months=["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"];
 const month=months.indexOf(parts[2].toLowerCase())+1;
 if(!month)fail("unknown month");
 const date=parts[3]+"-"+String(month).padStart(2,"0")+"-"+parts[1];
 if(new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date)fail("invalid diary date");
 return date;
}
export function buildAuthenticatedProgress(source,plan,{reconciled_at,source_id}={}){
 if(typeof reconciled_at!=="string"||!/^20\d\d-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(reconciled_at))fail("missing immutable UTC read timestamp");
 if(source_id!=="CANONICAL_NARAYANI_FISHTAIL_SHEETS")fail("source authority not verified");
 const r=reconcilePrivateDriveExport(source);
 const a=r.public_aggregate;
 if(a.progress_rows<34||a.readiness_rows<4||a.unique_progress_events!==a.progress_rows)fail("source count regression");
 if(statuses.some(s=>!Number.isInteger(a.progress_status_counts[s])||a.progress_status_counts[s]<0))fail("unrecognized status histogram");
 if(a.readiness_status_counts.DONE>0)fail("readiness DONE requires governance review");
 if(Object.values(a.readiness_status_counts).reduce((n,v)=>n+v,0)!==a.readiness_rows)fail("readiness histogram");
 const activityIDs=new Set(plan?.activities?.map(x=>x.activity_id));
 if(!activityIDs.has("T5030")||!activityIDs.has("T4030")||plan?.activities?.length!==45)fail("P6 source identity or master drift");
 let lastDiary="";
 for(const p of source.daily_progress_rows){const d=parseDiaryDate(p[0]);if(d>lastDiary)lastDiary=d;}
 const latestReadiness=a.last_readiness_date;
 if(!/^20\d\d-\d\d-\d\d$/.test(latestReadiness))fail("invalid readiness date");
 const reconcileDay=reconciled_at.slice(0,10);
 if(lastDiary>reconcileDay||latestReadiness>reconcileDay)fail("future site evidence");
 const linked=a.linked_reported_task_subactivities;
 const taskEvidence=[
 {activity_id:"T5030",reported_subwork_entries:a.category_counts.T5030_SUBACTIVITY_ONLY||0},
 {activity_id:"T4030",reported_subwork_entries:a.category_counts.T4030_LAYOUT_SUBACTIVITY_ONLY||0}
 ].map(x=>({...x,verified_activity_complete:false,approved_work_complete:false,ready_for_next_work:false}));
 const output={
  format:"PCK_NARAYANI_PROGRESS_PROJECTION_V1",classification:"PUBLIC_SAFE_COUNTS_ONLY",
  project_id:"PRJ-000007",reconciled_on:reconcileDay,
  latest_readiness_record:latestReadiness,latest_diary_record:lastDiary,
  auto_refresh_enabled:true,refresh_mode:"AUTHENTICATED_GITHUB_ACTIONS_DRIVE_READ_ONLY",
  progress_status:"SOURCE_REPORTED_PARTIAL_NOT_APPROVED",
  evidence_inventory:{
   progress_rows:a.progress_rows,readiness_rows:a.readiness_rows,
   source_done_reports:a.progress_status_counts.DONE,source_needs_input:a.progress_status_counts.NEEDS_INPUT,
   source_plan_reports:a.progress_status_counts.PLAN,source_notes:a.progress_status_counts.NOTE,
   source_not_started:a.progress_status_counts.NOT_STARTED
  },task_evidence:taskEvidence,unassigned_or_local_scope_records:a.other_records_pending_scope_or_review,
  actionable_checks:[
   {id:"CHK-FOUNDATION-QTY",name:"Reconcile foundation cement records and grid allocations",status:"NEEDS_INPUT",work_release:false},
   {id:"CHK-ENGINEERING",name:"Obtain responsible-engineer decisions for affected foundation work",status:"ENGINEERING_HOLD",work_release:false},
   {id:"CHK-MEP",name:"Verify early plumbing routes before closure",status:"NEEDS_SITE_INSPECTION",work_release:false},
   {id:"CHK-BASELINE",name:"Approve project work packages, missing WBS scope and durations",status:"UNAPPROVED",work_release:false}
  ],
  completed_wbs_activities:0,verified_milestones:0,plan_baseline_approved:false,
  source_evidence_is_site_approval:false,
  limitations:"Authenticated read-only scheduled snapshot, not a field-signoff, building permit, or schedule baseline. Publication cannot approve site work."
 };
 validateAuthenticatedProgress(output,plan);
 const outputText=stable(output);
 const manifest={
  format:"PCK_NARAYANI_PROGRESS_EVIDENCE_MANIFEST_V1",classification:"PUBLIC_SAFE_COUNTS_ONLY",
  source_digest_sha256:sha(stable(source)),output_sha256:{"progress.json":sha(outputText)},
  field_authorization:"NO_APPROVAL",private_source_rows_included:false,
  live_connector_active:true,auth_method:"GITHUB_OIDC_WIF_SERVICE_ACCOUNT_READ_ONLY",
  no_private_source_identifiers_in_output:true
 };
 return {output,manifest,files:{"progress.json":outputText,"manifest.json":stable(manifest)},
  private_audit:r.private_audit,private_event_count:r.private_audit.length};
}
export function validateAuthenticatedProgress(p,plan){
 if(p?.format!=="PCK_NARAYANI_PROGRESS_PROJECTION_V1"||
 p.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||p.project_id!=="PRJ-000007"||
 p.auto_refresh_enabled!==true||p.refresh_mode!=="AUTHENTICATED_GITHUB_ACTIONS_DRIVE_READ_ONLY")fail("mode mismatch");
 if(p.completed_wbs_activities!==0||p.verified_milestones!==0||p.plan_baseline_approved!==false||p.source_evidence_is_site_approval!==false)fail("unapproved schedule promotion");
 if(p.evidence_inventory?.progress_rows<34||p.evidence_inventory?.readiness_rows<4)fail("missing evidence");
 if(p.evidence_inventory.source_done_reports+p.evidence_inventory.source_needs_input+
 p.evidence_inventory.source_plan_reports+p.evidence_inventory.source_notes+
 p.evidence_inventory.source_not_started!==p.evidence_inventory.progress_rows)fail("progress histogram mismatch");
 if(p.task_evidence?.length!==2||p.task_evidence.some(x=>!plan.activities.some(a=>a.activity_id===x.activity_id)||x.verified_activity_complete||x.approved_work_complete||x.ready_for_next_work||!Number.isInteger(x.reported_subwork_entries)))fail("invalid mapped task");
 if(p.task_evidence.reduce((n,x)=>n+x.reported_subwork_entries,0)+p.unassigned_or_local_scope_records!==p.evidence_inventory.progress_rows)fail("unassigned remainder mismatch");
 if(p.actionable_checks?.length!==4||p.actionable_checks.some(x=>x.work_release!==false))fail("work release not authorized");
 return true;
}
