import {sha256Hex} from "./sha256.mjs";

/**
 * Trusted, offline AI proposal review. Compare the published source VIEW with
 * the unapproved draft candidate; never interpret a delta as an approved edit.
 * Use stable IDs and typed link keys, not array positions or calculated dates.
 */
function uniqueIndex(items,kind,project){
 const out=new Map();
 for(const item of items){
  const id=item.id;
  if(typeof id!=="string"||out.has(id))throw Error("Duplicate or invalid "+kind+" identity in "+project);
  out.set(id,item);
 }
 return out;
}
const baseActivity=a=>({id:a.id,title:a.title,wbs_id:a.wbs_id,duration:a.duration});
const draftActivity=a=>({id:a.id,title:a.name,wbs_id:a.wbs_id,duration:a.duration});
const baseWbs=w=>({id:w.id,title:w.title,parent_id:w.parent_id??null});
const draftWbs=w=>({id:w.wbs_id,title:w.name,parent_id:w.parent_wbs_id??null});
const baseLink=l=>({from:l.from,to:l.to,type:l.type,lag:l.lag});
const draftLink=l=>({from:l.predecessor,to:l.successor,type:l.type,lag:l.lag});
const order=(a,b)=>a.localeCompare(b,"en");
const keyedLink=x=>JSON.stringify([x.from,x.to,x.type,x.lag]);
function entityDiff(oldItems,newItems,fields){
 const prior=uniqueIndex(oldItems,"entity","source");
 const current=uniqueIndex(newItems,"entity","candidate");
 const added=[],removed=[],updated=[];
 for(const [id,after] of current){
  if(!prior.has(id)){added.push({id,after});continue}
  const before=prior.get(id);
  const changes=fields.filter(f=>!Object.is(before[f],after[f]))
   .map(field=>({field,before:before[field],after:after[field]}));
  if(changes.length)updated.push({id,before,after,changes});
 }
 for(const [id,before] of prior)if(!current.has(id))removed.push({id,before});
 for(const group of [added,removed,updated])group.sort((a,b)=>order(a.id,b.id));
 return {added,removed,updated};
}
function linkDiff(before,after){
 const b=new Map(),a=new Map();
 for(const e of before){const key=keyedLink(e);if(b.has(key))throw Error("Duplicate source link");b.set(key,e)}
 for(const e of after){const key=keyedLink(e);if(a.has(key))throw Error("Duplicate draft link");a.set(key,e)}
 return {
  added:[...a].filter(([k])=>!b.has(k)).map(([,v])=>v).sort((x,y)=>order(keyedLink(x),keyedLink(y))),
  removed:[...b].filter(([k])=>!a.has(k)).map(([,v])=>v).sort((x,y)=>order(keyedLink(x),keyedLink(y)))
 };
}
export function diffAiSourceRevision(sourceModel,candidate,projected){
 if(sourceModel?.format!=="SKYFORGE_GENERIC_VIEW_MODEL_V1"||
    candidate?.format!=="SKYFORGE_PROJECT_INPUT_V1"||
    candidate.classification!=="LOCAL_UNVERIFIED"||
    sourceModel.project?.id!==candidate.project?.id||
    candidate.source_manifest?.[0]?.sha256!==sourceModel.input_sha256||
    projected?.classification!=="LOCAL_UNVERIFIED_DRAFT_ONLY"||
    projected.project?.id!==sourceModel.project.id||
    projected.engineering_release!==false||projected.baseline_approved!==false)
  throw Error("Revision diff requires exact source-bound unapproved project model");
 const activities=entityDiff(sourceModel.activities.map(baseActivity),
   candidate.activities.map(draftActivity),["title","wbs_id","duration"]);
 const wbs=entityDiff(sourceModel.wbs.map(baseWbs),candidate.wbs.map(draftWbs),["title","parent_id"]);
 const relationships=linkDiff(sourceModel.links.map(baseLink),candidate.relationships.map(draftLink));
 const count=section=>({added:section.added.length,removed:section.removed.length,
  updated:section.updated?.length??0});
 const context_not_adopted={
  source_calendar_events:sourceModel.calendar_events.length,
  source_checklist_entries:sourceModel.checklist.length,
  source_has_dated_plan:Boolean(sourceModel.project_start)||sourceModel.calendar_events.length>0,
  original_reported_checklist_states_preserved:false,
  original_calendar_resource_cost_baseline_not_migrated:true,
  source_duration_basis_replaced_by_assumed_draft:true
 };
 const warnings=[
  "UNVERIFIED PROPOSAL: no source was saved and no project or field approval was issued.",
  "The projected draft uses SHARED_CPM planning slots; do not compare its dates with the original calendar model.",
  "Original duration provenance, approved resources, field reports and baseline were not adopted by the local beta draft."
 ];
 if(context_not_adopted.source_calendar_events)warnings.push(
  context_not_adopted.source_calendar_events+" published calendar events were not carried to this draft.");
 if(context_not_adopted.source_checklist_entries)warnings.push(
  context_not_adopted.source_checklist_entries+" source-supplied checklist records were not carried to this draft.");
 return {
  format:"SKYFORGE_AI_SOURCE_REVIEW_DIFF_V1",
  project_id:sourceModel.project.id,
  source_view_sha256:sourceModel.input_sha256,
  draft_content_sha256:sha256Hex(JSON.stringify({
    wbs:candidate.wbs,activities:candidate.activities,relationships:candidate.relationships
  })),
  authority:"UNVERIFIED_DIFF_FOR_HUMAN_SOURCE_RECONCILIATION",
  activities,wbs,relationships,
  counts:{activities:count(activities),wbs:count(wbs),
    relationships:{added:relationships.added.length,removed:relationships.removed.length}},
  context_not_adopted,warnings,
  admission:"BLOCKED_PENDING_SOURCE_AUTHORITY_RECONCILIATION_AND_EXPLICIT_APPROVAL",
  direct_source_writes:false
 };
}
