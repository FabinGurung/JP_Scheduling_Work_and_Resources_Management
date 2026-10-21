import {sha256Hex} from "../kernel/sha256.mjs";
/** Only maps the existing reviewed PUBLIC-SAFE Narayani scenario into the
 * generic visual interface. Source checklist reports are carried as
 * REPORTED_ONLY and are never reinterpreted as completed/approved checks.
 */
export function adaptNarayaniPublicModel(source){
 if(source?.format!=="PCK_CONSTRUCTION_VIEW_MODEL_V1"||
  source.classification!=="PUBLIC_SAFE_PLANNING_SCENARIO"||
  source.project?.id!=="PRJ-000007"||
  source.project.baseline_approved!==false||
  source.planning_scenario?.approved_dates!==false||
  source.mcq_summary?.authority!=="REPORTED_ONLY"||
  source.activities?.length!==45||source.links?.length!==49||
  source.phases?.length!==10||source.milestones?.length!==7||
  source.activities.some(a=>a.checklist?.length!==9||a.status!=="UNVERIFIED"))
  throw Error("Narayani public scenario identity or authority invalid");
 const ids=new Set(source.activities.map(a=>a.id));
 const wbs=source.phases.map(p=>({id:p.id,title:p.title,parent_id:null}));
 const activities=source.activities.map(a=>({
  id:a.id,title:a.title,wbs_id:a.phase_id,duration:a.master_work_slots,
  start:a.master_start_slot,finish:a.master_finish_exclusive_slot,
  start_date:a.scenario_start,finish_date:a.scenario_finish,
  duration_basis:"ASSUMED_DRAFT",assumption_reason:"Unapproved public scheduling scenario derived from Narayani master WBS",
  status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false,
  original_report_state:a.mcq_report_state??"NOT_REPORTED"
 }));
 const links=source.links.map(e=>{
  if(!ids.has(e.from)||!ids.has(e.to)||e.actual_release!==false)
   throw Error("Orphan or approved Narayani link");
  return {from:e.from,to:e.to,type:"FS",lag:0};
 });
 const allowed=new Set(["NOT_REPORTED","NOT_DONE","IN_PROGRESS","REPORTED_DONE","BLOCKED","NOT_APPLICABLE_REQUESTED"]);
 const checklist=source.activities.flatMap(a=>a.checklist.map(c=>{
  if(!allowed.has(c.status))throw Error("Invalid original reported checklist status");
  return {id:c.id,activity_id:a.id,title:c.title,status:c.status,
   authority:"PUBLIC_SAFE_REPORTED_ONLY",source_status:"UNAPPROVED_FIELD_REPORT"};
 }));
 const calendar_events=activities.flatMap(a=>[
  {date:a.start_date,activity_id:a.id,kind:"START"},
  {date:a.finish_date,activity_id:a.id,kind:"FINISH"}
 ]).sort((a,b)=>a.date.localeCompare(b.date)||a.activity_id.localeCompare(b.activity_id)||a.kind.localeCompare(b.kind));
 const input_sha256=sha256Hex(JSON.stringify(source));
 return {
  format:"SKYFORGE_GENERIC_VIEW_MODEL_V1",classification:"PUBLIC_SAFE_GOVERNED_SCENARIO",
  project:{id:"PRJ-000007",name:source.project.title},
  input_sha256,planning_status:"GOVERNED_SOURCE_UNAPPROVED_SCENARIO",
  engine_mode:"SOURCE_PUBLISHED_CPM_SCENARIO",time_model:"SOURCE_WORKDAY_SCENARIO_NOT_BASELINE",
  project_start:source.planning_scenario.start_date,finish_event:Math.max(...activities.map(a=>a.finish)),
  engineering_release:false,baseline_approved:false,
  views_basis:"ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL",
  wbs,activities,links,calendar_events,checklist,
  counts:{wbs:wbs.length,activities:activities.length,links:links.length,checklist:checklist.length},
  original_governed_view:"projects/narayani/visual.html",
  source_status:"READ_ONLY_REPORTED_FIELDS_NO_PROJECT_ADMISSION"
 };
}
