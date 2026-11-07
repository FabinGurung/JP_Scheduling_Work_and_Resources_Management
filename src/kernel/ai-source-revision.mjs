import {sha256Hex} from "./sha256.mjs";
import {diffAiSourceRevision} from "./ai-revision-diff.mjs";
import {validateGenericViewModel} from "../presentation/generic-views.mjs";
import {makeBetaDraftSpec,assertBetaDraft,changeBetaDraft,recalculateBetaDraft} from "../presentation/beta-draft.mjs";
/** This module is an offline AI-agent contract, NOT a client-side LLM or website editor.
 * AI must translate the user's natural-language intent into typed operations,
 * explicitly preserve unknown inputs, and validate ALL operations before commit.
 * The returned object is an UNAPPROVED proposal; it does not write files.
 */
const isId=x=>typeof x==="string"&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const safe=x=>typeof x==="string"&&x.trim().length>0&&x.length<=180&&!/[<>\x00-\x1f]/.test(x);
const KINDS=new Set(["ADD_ACTIVITY","UPDATE_ACTIVITY","REMOVE_ACTIVITY","ADD_LINK","REMOVE_LINK","ADD_WBS","RENAME_WBS","MOVE_WBS","REMOVE_WBS"]);
const ALLOWED_FIELDS=Object.freeze({
 ADD_ACTIVITY:["kind","activity"],UPDATE_ACTIVITY:["kind","id","name","wbs_id","duration","confirm_milestone"],
 REMOVE_ACTIVITY:["kind","id"],ADD_LINK:["kind","from","to","type","lag"],
 REMOVE_LINK:["kind","from","to","type","lag"],ADD_WBS:["kind","id","name","parent_wbs_id"],
 RENAME_WBS:["kind","id","name"],MOVE_WBS:["kind","id","parent_wbs_id"],REMOVE_WBS:["kind","id"]
});
function rejectUnrecognizedFields(value,allowed,label){
 if(!value||typeof value!=="object"||Array.isArray(value))throw Error(label+" must be an object");
 for(const field of Object.keys(value))if(!allowed.includes(field))
  throw Error("Unexpected "+label+" field: "+field+" (no silent source edits)");
}
export function validateAiRevisionRequest(request,sourceModel){
 validateGenericViewModel(sourceModel);
 if(!request||request.format!=="SKYFORGE_AI_WBS_REVISION_V1"||
  request.project_id!==sourceModel.project.id||
  request.expected_source_sha256!==sourceModel.input_sha256||
  !safe(request.user_intent_summary)||
  !Array.isArray(request.operations)||request.operations.length<1||request.operations.length>100)
  throw Error("AI WBS revision must bind exact project/source SHA and include 1–100 explicit operations");
 for(const [i,op] of request.operations.entries()){
  if(!KINDS.has(op?.kind))throw Error("Unsupported AI operation at "+i);
  rejectUnrecognizedFields(op,ALLOWED_FIELDS[op.kind],"operation "+i);
  const ids=[op.id,op.from,op.to,op.wbs_id,op.parent_wbs_id].filter(x=>x!=null);
  if(ids.some(x=>!isId(x)))throw Error("Invalid AI operation ID at "+i);
  if(op.kind==="ADD_ACTIVITY"){
   rejectUnrecognizedFields(op.activity,["id","name","wbs_id","duration","activity_type"],"new activity");
   if(!isId(op.activity.id)||!safe(op.activity.name)||!isId(op.activity.wbs_id)||
      !Number.isSafeInteger(op.activity.duration)||op.activity.duration<0)
    throw Error("AI cannot invent activity ID/name/WBS/duration or use unknown duration as zero");
   if(op.activity.duration===0&&op.activity.activity_type!=="FINISH_MILESTONE")
    throw Error("Zero-duration activities require an explicit FINISH_MILESTONE declaration");
   if(op.activity.duration>0&&op.activity.activity_type!=null&&op.activity.activity_type!=="TASK")
    throw Error("Nonzero activity must be explicitly TASK or omit activity_type");
  }
  if(op.kind==="UPDATE_ACTIVITY"){
   if(!isId(op.id)||!["name","wbs_id","duration"].some(k=>Object.hasOwn(op,k)))
    throw Error("UPDATE_ACTIVITY needs an existing activity ID and at least one explicit changed field");
   if(op.name!==undefined&&!safe(op.name))throw Error("Updated activity name is invalid");
   if(op.wbs_id!==undefined&&!isId(op.wbs_id))throw Error("Updated WBS identity is invalid");
   if(op.duration!==undefined&&(!Number.isSafeInteger(op.duration)||op.duration<0))
    throw Error("AI source duration must be explicitly nonnegative integer");
   if(op.duration===0&&op.confirm_milestone!==true)
    throw Error("Changing duration to zero requires confirm_milestone=true; unknown is not a milestone");
   if(op.confirm_milestone!==undefined&&op.confirm_milestone!==true)
    throw Error("confirm_milestone must be true when provided");
  }
  if((op.kind==="ADD_WBS"||op.kind==="RENAME_WBS")&&!safe(op.name))
   throw Error("WBS name must be supplied explicitly");
  if((op.kind==="ADD_LINK"||op.kind==="REMOVE_LINK")&&(!isId(op.from)||!isId(op.to)||
   !["FS","SS","FF","SF"].includes(op.type)||!Number.isSafeInteger(op.lag)||
   Math.abs(op.lag)>10000))
   throw Error("AI relationship must name both activities, type and integer lag");
 }
 return true;
}
function wbsOperation(draft,op){
 const next=structuredClone(draft),w=next.wbs;
 const node=w.find(x=>x.wbs_id===op.id);
 if(op.kind==="ADD_WBS"){
  if(!isId(op.id)||!safe(op.name))throw Error("New WBS requires explicit code and label");
  if(w.some(x=>x.wbs_id===op.id))throw Error("WBS ID already exists");
  w.push({wbs_id:op.id,name:op.name,...(op.parent_wbs_id?{parent_wbs_id:op.parent_wbs_id}:{})});
 }else{
  if(!node)throw Error("WBS ID not found");
  if(op.kind==="RENAME_WBS")node.name=op.name;
  else if(op.kind==="MOVE_WBS"){
   if(op.parent_wbs_id===op.id)throw Error("Cannot parent WBS to itself");
   if(op.parent_wbs_id)node.parent_wbs_id=op.parent_wbs_id;
   else delete node.parent_wbs_id;
  }else if(op.kind==="REMOVE_WBS"){
   if(w.some(x=>x.parent_wbs_id===op.id)||next.activities.some(x=>x.wbs_id===op.id))
    throw Error("Cannot delete nonempty WBS: relocate source activities and child WBS first");
   w.splice(w.indexOf(node),1);
  }
 }
 assertBetaDraft(next);
 return next;
}
export function proposeAiWbsRevision(sourceModel,request){
 validateAiRevisionRequest(request,sourceModel);
 let draft=makeBetaDraftSpec(sourceModel);
 for(const op of request.operations){
  if(op.kind.endsWith("_WBS"))draft=wbsOperation(draft,op);
  else{
   // Legacy beta editing auto-removes links with a deleted task.
   // A governed AI request must spell out all deleted relationships first.
   if(op.kind==="REMOVE_ACTIVITY"&&draft.relationships.some(
    edge=>edge.predecessor===op.id||edge.successor===op.id))
    throw Error("REMOVE_ACTIVITY has dependency links: explicitly REMOVE_LINK each relationship first");
   draft=changeBetaDraft(draft,op);
  }
 }
 const projected=recalculateBetaDraft(draft);
 if(projected.engineering_release!==false||projected.baseline_approved!==false)
  throw Error("AI revisions cannot admit site approval");
 const revision_diff=diffAiSourceRevision(sourceModel,draft,projected);
 const normalizedRequest=JSON.stringify(request);
 return {
  format:"SKYFORGE_AI_WBS_REVISION_RESULT_V1",
  authority:"UNVERIFIED_AI_ASSISTED_PROPOSAL",
  project_id:request.project_id,source_sha256:sourceModel.input_sha256,
  request_sha256:sha256Hex(normalizedRequest),
  previous_activity_count:sourceModel.activities.length,
  result_activity_count:draft.activities.length,
  operations_count:request.operations.length,
  assumptions_and_unknowns:"No unstated duration, quantity, resource or approved date may be added. Unresolved facts require a separate source clarification.",
  source_reconciliation_required:true,approval_granted:false,
  review_required:true,revision_diff,
  candidate:draft,projected_model_sha256:sha256Hex(JSON.stringify(projected))
 };
}
