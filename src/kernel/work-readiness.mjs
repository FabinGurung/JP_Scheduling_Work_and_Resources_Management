/**
 * Read-only, model-derived daily-work sequence semantics.
 * Uses the same published project/WBS/dependency model as the Gantt and
 * constellation. A schedule link is NEVER evidence of field acceptance.
 */
const TYPES=new Set(["FS","SS","FF","SF"]);
function explain(edge,other){
 const type=edge.type;
 if(!TYPES.has(type)||!Number.isFinite(edge.lag))throw Error("Unrecognized scheduled relationship");
 return {
  activity_id:other.id,activity_title:other.title,
  type,lag:edge.lag,
  predecessor_event:type[0]==="F"?"FINISH":"START",
  successor_event:type[1]==="S"?"START":"FINISH",
  starts_successor:type[1]==="S",
  verification:"NOT_VERIFIED_FROM_PUBLISHED_SCHEDULE"
 };
}
export function inspectWorkSequence(model,activityId){
 if(!model||!Array.isArray(model.activities)||!Array.isArray(model.links)||!Array.isArray(model.checklist))
  throw Error("Published project model required");
 const byId=new Map(model.activities.map(a=>[a.id,a]));
 if(byId.size!==model.activities.length)throw Error("Duplicate activity ID");
 const activity=byId.get(activityId);
 if(!activity)throw Error("Unknown activity ID");
 if(activity.status!=="CALCULATED_DRAFT_NOT_ACTUAL"||activity.engineering_release!==false||
    model.engineering_release!==false||model.baseline_approved!==false)
  throw Error("Cannot infer field readiness from unsupported authority");
 const before=[],after=[];
 for(const link of model.links){
  if(link.to!==activityId&&link.from!==activityId)continue;
  if(!byId.has(link.from)||!byId.has(link.to))throw Error("Unresolved dependency endpoint");
  if(link.to===activityId)before.push(explain(link,byId.get(link.from)));
  if(link.from===activityId)after.push(explain(link,byId.get(link.to)));
 }
 const checks=model.checklist.filter(c=>c.activity_id===activityId).map(c=>({
  id:c.id,title:c.title,reported_status:c.status,
  authorization:"NOT_A_VERIFIED_APPROVAL"
 }));
 return {
  activity,project_id:model.project?.id??null,
  input_sha256:model.input_sha256,
  before,after,checks,
  start_conditions:before.filter(x=>x.starts_successor),
  finish_constraints:before.filter(x=>!x.starts_successor),
  readiness:"UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS",
  completion:"UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS",
  no_predecessors:before.length===0,
  notes:{
   no_predecessors:"No modeled predecessor does not mean authorized to start.",
   approval:"Scheduled dates, reported checklist answers and dependency links do not prove work completion, safety clearance or inspection approval."
  }
 };
}
export function workSequenceSummary(model){
 if(!Array.isArray(model?.activities))throw Error("Project activities required");
 return {
  activities:model.activities.length,
  start_authorizations_verified:0,
  completions_verified:0,
  authority:"NO_APPROVED_FIELD_STATUS_SOURCE_CONNECTED",
  definition:"All published activity statuses are calculated scenarios, not verified field reports."
 };
}
