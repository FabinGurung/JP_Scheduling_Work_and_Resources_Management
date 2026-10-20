import {sha256Hex} from "../kernel/sha256.mjs";
import {compileProjectDraft} from "../kernel/project-template.mjs";
/** Project-agnostic, privacy-limited view projection. Node-side compile only.
 * All four visualizations consume ONE model, not independently computed dates.
 * Checklist entries are passed through ONLY when explicitly supplied.
 */
const digest=x=>sha256Hex(x);
const name=x=>typeof x==="string"&&x.trim().length>0&&x.length<=180&&!/[<>\u0000-\u001f]/.test(x);
export function projectGenericVisual(spec){
 if(!["PUBLIC_SYNTHETIC","LOCAL_UNVERIFIED"].includes(spec?.classification))throw Error("Generic view compilation requires public-synthetic or local-unverified source scope");
 const local=spec.classification==="LOCAL_UNVERIFIED";
 if(!["CALENDAR_CPM","SHARED_CPM","RESOURCE_LEVELING"].includes(spec.scheduling_mode))throw Error("Unsupported scheduling mode");
 const compiled=compileProjectDraft(spec);
 if(compiled.schedule===null||compiled.gaps.length)throw Error("Incomplete project cannot publish calculated model: "+JSON.stringify(compiled.gaps));
 const output=compiled.schedule.output;
 const rows=output.activities;
 const computed=new Map(rows.map(a=>[a.id??a.activity_id,a]));
 if(computed.size!==spec.activities.length)throw Error("Calculated activity count mismatch");
 const phases=spec.wbs.map((w,i)=>({id:w.wbs_id,title:w.name,parent_id:w.parent_wbs_id??null,order:i}));
 const wbsIds=new Set(phases.map(x=>x.id)),ids=new Set(spec.activities.map(x=>x.id));
 const activities=spec.activities.map(a=>{
  const r=computed.get(a.id);
  if(!r||!wbsIds.has(a.wbs_id))throw Error("Missing solver result or WBS parent: "+a.id);
  const es=r.es??r.start,ef=r.ef??r.finish;
  if(!Number.isFinite(es)||!Number.isFinite(ef)||ef<es)throw Error("Nonfinite event point: "+a.id);
  return {id:a.id,title:a.name,wbs_id:a.wbs_id,duration:a.duration,
    start:es,finish:ef,late_start:r.ls??null,late_finish:r.lf??null,
    total_float:r.total_float??null,critical:r.critical??null,
    start_date:r.start_date??null,finish_date:r.finish_date??null,
    duration_basis:a.duration_basis,assumption_reason:a.duration_basis==="ASSUMED_DRAFT"?a.assumption_reason:null,
    calendar_id:a.calendar_id??null,status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false};
 });
 const links=spec.relationships.map(x=>({from:x.predecessor??x.predecessor_id,
  to:x.successor??x.successor_id,type:x.type??"FS",lag:x.lag??0}));
 for(const x of links)if(!ids.has(x.from)||!ids.has(x.to))throw Error("Orphan relationship");
 const checklist=(spec.checklist??[]).map(q=>{
  if(!name(q.id)||!name(q.title)||!ids.has(q.activity_id)||
    q.authority!=="PUBLIC_SYNTHETIC_DRAFT"||q.status!=="NOT_REPORTED")throw Error("Unverified checklist or unsupported authority");
  return {id:q.id,activity_id:q.activity_id,title:q.title,authority:q.authority,status:q.status};
 });
 if(new Set(checklist.map(x=>x.id)).size!==checklist.length)throw Error("Duplicate checklist ID");
 const calendar_events=activities.flatMap(a=>[
  ...(a.start_date?[{date:a.start_date,activity_id:a.id,kind:"START"}]:[]),
  ...(a.finish_date?[{date:a.finish_date,activity_id:a.id,kind:"FINISH"}]:[])
 ]).sort((a,b)=>a.date.localeCompare(b.date)||a.activity_id.localeCompare(b.activity_id)||a.kind.localeCompare(b.kind));
 return {
  format:"SKYFORGE_GENERIC_VIEW_MODEL_V1",classification:local?"LOCAL_UNVERIFIED_DRAFT_ONLY":"PUBLIC_SYNTHETIC_DRAFT_ONLY",
  project:{id:spec.project.id,name:spec.project.name},
  input_sha256:compiled.input_sha256,
  planning_status:compiled.planning_status,
  engine_mode:compiled.schedule.engine_mode,
  time_model:output.time_model??"SHARED_ABSTRACT_SLOTS",
  project_start:spec.projectStart??null,
  finish_event:output.project?.early_finish??Math.max(...activities.map(a=>a.finish)),
  engineering_release:false,baseline_approved:false,
  views_basis:"ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL",
  wbs:phases,activities,links,calendar_events,checklist,
  counts:{wbs:phases.length,activities:activities.length,links:links.length,checklist:checklist.length}
 };
}
export const jsonBytes=m=>JSON.stringify(m,null,2)+"\n";
export const sha256Bytes=bytes=>digest(bytes);
