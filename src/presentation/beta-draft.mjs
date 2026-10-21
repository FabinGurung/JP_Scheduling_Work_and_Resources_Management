import {projectGenericVisual} from "../visual/generic-project-model.mjs";
import {validateGenericViewModel} from "./generic-views.mjs";
const id=x=>typeof x==="string"&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const label=x=>typeof x==="string"&&x.trim().length>0&&x.trim().length<=180&&!/[<>\u0000-\u001f]/.test(x);
const types=["FS","SS","FF","SF"];
export function makeBetaDraftSpec(model){
 validateGenericViewModel(model);
 return {
  format:"SKYFORGE_PROJECT_INPUT_V1",classification:"LOCAL_UNVERIFIED",
  project:{id:model.project.id,name:model.project.name},
  wbs:model.wbs.map(w=>({wbs_id:w.id,name:w.title,...(w.parent_id?{parent_wbs_id:w.parent_id}:{})})),
  activities:model.activities.map(a=>({
   id:a.id,wbs_id:a.wbs_id,name:a.title,duration:a.duration,
   activity_type:a.duration===0?"FINISH_MILESTONE":"TASK",duration_basis:"ASSUMED_DRAFT",
   assumption_reason:"Unapproved copy of public source-view model "+model.input_sha256
  })),
  relationships:model.links.map(x=>({predecessor:x.from,successor:x.to,type:x.type??"FS",lag:x.lag??0})),
  source_manifest:[{source_id:"BASE_VIEW",revision:"UNVERIFIED_EDITOR_DRAFT",
   sha256:model.input_sha256,authority:"UNVERIFIED_SOURCE"}],
  scheduling_mode:"SHARED_CPM",checklist:[]
 };
}
function assertWbs(items){
 const nodes=new Map(items.map(w=>[w.wbs_id,w]));
 if(nodes.size!==items.length||items.some(w=>!id(w.wbs_id)||!label(w.name)))
  throw Error("Duplicate, invalid or empty WBS identity");
 const visiting=new Set(),done=new Set();
 function visit(x){
  if(visiting.has(x))throw Error("WBS hierarchy cycle");
  if(done.has(x))return;
  const p=nodes.get(x)?.parent_wbs_id;
  if(p&&!nodes.has(p))throw Error("Missing WBS parent "+p);
  visiting.add(x);if(p)visit(p);visiting.delete(x);done.add(x);
 }
 for(const x of nodes.keys())visit(x);
}
export function assertBetaDraft(spec){
 if(spec?.format!=="SKYFORGE_PROJECT_INPUT_V1"||spec.classification!=="LOCAL_UNVERIFIED"||
  !id(spec.project?.id)||!label(spec.project?.name)||
  spec.scheduling_mode!=="SHARED_CPM"||
  !Array.isArray(spec.wbs)||!spec.wbs.length||
  !Array.isArray(spec.activities)||!spec.activities.length||
  !Array.isArray(spec.relationships)||!Array.isArray(spec.source_manifest)||
  spec.source_manifest.length!==1||spec.source_manifest[0]?.authority!=="UNVERIFIED_SOURCE"||
  !/^[0-9a-f]{64}$/.test(spec.source_manifest[0].sha256??"")||
  spec.checklist?.length!==0)
  throw Error("This is not a source-bound unverified beta editing draft");
 assertWbs(spec.wbs);
 const tasks=new Set();
 for(const a of spec.activities){
  if(!id(a.id)||tasks.has(a.id)||!label(a.name)||
   !spec.wbs.some(w=>w.wbs_id===a.wbs_id)||
   !Number.isSafeInteger(a.duration)||a.duration<0||
   a.duration_basis!=="ASSUMED_DRAFT"||!label(a.assumption_reason)||
   (a.duration===0&&a.activity_type!=="FINISH_MILESTONE")||
   (a.duration>0&&a.activity_type!=="TASK"))
   throw Error("Activity requires unique ID, WBS, valid nominal duration and explicit draft basis");
  tasks.add(a.id);
 }
 const seen=new Set(),children=new Map([...tasks].map(a=>[a,[]]));
 for(const rel of spec.relationships){
  const p=rel.predecessor,s=rel.successor,t=rel.type,lag=rel.lag??0;
  if(!tasks.has(p)||!tasks.has(s)||p===s||!types.includes(t)||
   !Number.isSafeInteger(lag)||Math.abs(lag)>10000)
   throw Error("Dependency must reference two distinct activities and valid type/lag");
  const key=p+"|"+s+"|"+t+"|"+lag;
  if(seen.has(key))throw Error("Duplicate dependency");
  seen.add(key);children.get(p).push(s);
 }
 const gray=new Set(),black=new Set();
 function walk(a){
  if(gray.has(a))throw Error("Dependency cycle detected");
  if(black.has(a))return;
  gray.add(a);for(const next of children.get(a))walk(next);
  gray.delete(a);black.add(a);
 }
 for(const a of tasks)walk(a);
 return true;
}
export function changeBetaDraft(spec,action){
 const next=structuredClone(spec);
 const {kind}=action??{};
 if(kind==="ADD_ACTIVITY"){
  const a=action.activity;
  if(!id(a?.id)||!label(a?.name)||!Number.isSafeInteger(a?.duration)||a.duration<0)
   throw Error("New activity needs ID, name and nonnegative integer duration");
  next.activities.push({id:a.id,name:a.name.trim(),wbs_id:a.wbs_id,
   duration:a.duration,activity_type:a.duration===0?"FINISH_MILESTONE":"TASK",
   duration_basis:"ASSUMED_DRAFT",assumption_reason:"User-created local beta draft; not in published source"});
 }else if(kind==="UPDATE_ACTIVITY"){
  const a=next.activities.find(x=>x.id===action.id);
  if(!a)throw Error("Activity not found");
  for(const key of ["name","wbs_id","duration"])if(Object.hasOwn(action,key))a[key]=action[key];
  a.activity_type=a.duration===0?"FINISH_MILESTONE":"TASK";
  a.duration_basis="ASSUMED_DRAFT";
  a.assumption_reason="Locally modified draft; published source remains unchanged";
 }else if(kind==="REMOVE_ACTIVITY"){
  const at=next.activities.findIndex(a=>a.id===action.id);
  if(at<0)throw Error("Activity not found");
  if(next.activities.length<=1)throw Error("Cannot remove the final activity");
  next.activities.splice(at,1);
  next.relationships=next.relationships.filter(r=>r.predecessor!==action.id&&r.successor!==action.id);
 }else if(kind==="ADD_LINK"){
  next.relationships.push({predecessor:action.from,successor:action.to,
   type:action.type??"FS",lag:action.lag??0});
 }else if(kind==="REMOVE_LINK"){
  const n=next.relationships.findIndex(r=>r.predecessor===action.from&&r.successor===action.to&&
    r.type===(action.type??"FS")&&r.lag===(action.lag??0));
  if(n<0)throw Error("Link not found");
  next.relationships.splice(n,1);
 }else throw Error("Unsupported beta edit");
 assertBetaDraft(next);
 return next;
}
export function recalculateBetaDraft(spec){
 assertBetaDraft(spec);
 const model=projectGenericVisual(spec);
 validateGenericViewModel(model);
 if(model.engineering_release!==false||model.baseline_approved!==false||
  model.classification!=="LOCAL_UNVERIFIED_DRAFT_ONLY")
  throw Error("Unsafe beta calculation: approval must remain false");
 return model;
}
export function betaExportPackage({original,draft,positions={},revision=1}){
 assertBetaDraft(draft);
 if(draft.project.id!==original.project.id||
  draft.source_manifest[0].sha256!==original.input_sha256||
  !Number.isSafeInteger(revision)||revision<1)
  throw Error("Source identity or draft revision mismatch");
 const seen=new Set([...draft.activities.map(a=>a.id),...draft.wbs.map(w=>w.wbs_id)]);
 const normalized={};
 for(const [k,v] of Object.entries(positions)){
  if(!seen.has(k)||!Number.isFinite(v?.x)||!Number.isFinite(v?.y)||
   Math.abs(v.x)>1e7||Math.abs(v.y)>1e7)throw Error("Bad saved node position");
  normalized[k]={x:Math.round(v.x),y:Math.round(v.y)};
 }
 return {format:"SKYFORGE_BETA_DRAFT_PACKAGE_V1",
  project_id:original.project.id,base_input_sha256:original.input_sha256,revision,
  authority:"UNVERIFIED_LOCAL_DOWNLOAD_ONLY",engineering_release:false,
  baseline_approved:false,approved_field_progress:false,project:draft,
  constellation_positions:normalized};
}
export function restoreBetaPackage(pkg,original){
 if(pkg?.format!=="SKYFORGE_BETA_DRAFT_PACKAGE_V1"||
  pkg.authority!=="UNVERIFIED_LOCAL_DOWNLOAD_ONLY"||
  pkg.project_id!==original.project.id||pkg.base_input_sha256!==original.input_sha256||
  pkg.engineering_release!==false||pkg.baseline_approved!==false||
  pkg.approved_field_progress!==false)
  throw Error("Imported beta draft source identity or approval contract mismatch");
 const candidate=betaExportPackage({original,draft:pkg.project,
  positions:pkg.constellation_positions??{},revision:pkg.revision});
 return candidate;
}
