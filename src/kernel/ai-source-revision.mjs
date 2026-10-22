import {sha256Hex} from "./sha256.mjs";
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
  const ids=[op.id,op.from,op.to,op.wbs_id,op.parent_wbs_id].filter(x=>x!=null);
  if(ids.some(x=>!isId(x)))throw Error("Invalid AI operation ID at "+i);
  if(op.kind==="ADD_ACTIVITY"&&(!isId(op.activity?.id)||!safe(op.activity?.name)||
     !isId(op.activity?.wbs_id)||!Number.isSafeInteger(op.activity?.duration)||op.activity.duration<0))
   throw Error("AI cannot invent activity ID/name/WBS/duration or use unknown duration as zero");
  if(op.kind==="UPDATE_ACTIVITY"&&op.duration!==undefined&&
   (!Number.isSafeInteger(op.duration)||op.duration<0))
   throw Error("AI source duration must be explicitly nonnegative integer");
  if((op.kind==="ADD_WBS"||op.kind==="RENAME_WBS")&&!safe(op.name))
   throw Error("WBS name must be supplied explicitly");
  if((op.kind==="ADD_LINK"||op.kind==="REMOVE_LINK")&&(!isId(op.from)||!isId(op.to)||
   !["FS","SS","FF","SF"].includes(op.type)||!Number.isSafeInteger(op.lag)))
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
  else draft=changeBetaDraft(draft,op);
 }
 const projected=recalculateBetaDraft(draft);
 if(projected.engineering_release!==false||projected.baseline_approved!==false)
  throw Error("AI revisions cannot admit site approval");
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
  candidate:draft,projected_model_sha256:sha256Hex(JSON.stringify(projected))
 };
}
