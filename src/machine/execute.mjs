import {createHash} from "node:crypto";
import {calculatePlanner,dateAt,PLANNER_FORMAT} from "../presentation/planner.mjs";
import {toIfc4dNeutral} from "../adapters/ifc4d.mjs";
import {toOpenProjectWorkPackages} from "../adapters/openproject.mjs";
import {toProjectLibreNeutral} from "../adapters/projectlibre.mjs";
import {toTaskJuggler} from "../adapters/taskjuggler.mjs";
import {toGanttProjectNeutral} from "../adapters/ganttproject.mjs";

// This contract produces machine-computed draft schedules and clearly labeled
// adapter previews; it NEVER claims that an upstream app was executed.
export const REQUEST_FORMAT="PCK_MACHINE_REQUEST_V1";
export const UPSTREAM_IDS=["IFCOPENSHELL_IFC4D","OPENPROJECT","PROJECTLIBRE_DESKTOP","TASKJUGGLER","GANTTPROJECT"];
const validId=x=>typeof x==="string"&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const safe=x=>typeof x==="string"&&x.length<=140&&!/[\u0000-\u001f<>]/.test(x);
const isObj=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const json=x=>JSON.stringify(x,null,2)+"\n";
const hash=x=>createHash("sha256").update(x).digest("hex");
function checkKeys(x,allow,name){
 if(!isObj(x))throw Error(name+" must be an object");
 for(const k of Object.keys(x))if(!allow.includes(k))throw Error("Unsupported "+name+" field "+k);
}
export function validateRequest(q,{publicBuild=false}={}){
 checkKeys(q,["format","request_id","classification","source_authority","approval","planner"],"request");
 if(q.format!==REQUEST_FORMAT||!validId(q.request_id))throw Error("Invalid request contract or ID");
 if(!["PUBLIC_SYNTHETIC","PRIVATE_RESTRICTED"].includes(q.classification))throw Error("Invalid data classification");
 if(q.source_authority!=="GITHUB_REVIEWED_FILE")throw Error("Only repository-reviewed requests are accepted");
 if(q.approval!=="NOT_ENGINEERING_APPROVED")throw Error("Engineering approval must be independent, never asserted in input JSON");
 if(publicBuild&&(q.classification!=="PUBLIC_SYNTHETIC"||q.request_id!=="DEMO_FOUNDATION"))throw Error("Only approved synthetic demo may be deployed to public Pages");
 checkKeys(q.planner,["format","project","calendar","activities","resources","assignments","relationships","materialReceipts","resourceReservations","crews","constraints"],"planner");
 const m=q.planner;
 if(m.format!==PLANNER_FORMAT||!validId(m.project?.id)||!safe(m.project?.name))throw Error("Invalid project and planner format");
 if(q.classification==="PUBLIC_SYNTHETIC"&&!m.project.id.startsWith("DEMO-"))throw Error("Public data must have DEMO project ID");
 if(!Array.isArray(m.activities)||!Array.isArray(m.resources)||!Array.isArray(m.relationships))throw Error("Missing required planner arrays");
 if(m.activities.some(a=>!validId(a.id)||!safe(a.name))||m.resources.some(r=>!validId(r.id)||!safe(r.name)))throw Error("Unsafe activity/resource identities");
 if(m.activities.length!==new Set(m.activities.map(a=>a.id)).size)throw Error("Duplicate activities");
 if(m.resources.length!==new Set(m.resources.map(a=>a.id)).size)throw Error("Duplicate resources");
 if(m.relationships.some(r=>!validId(r.predecessor)||!validId(r.successor)))throw Error("Invalid relationship endpoints");
 return q;
}
const record=(id,mode,data,limitations)=>({upstream_id:id,mode,upstream_runtime_executed:false,certified_interoperability:false,limitations,data});
export function executeRequest(request,{publicBuild=false}={}){
 validateRequest(request,{publicBuild});
 const out=calculatePlanner(request.planner);
 const m=out.model;
 if(out.tasks.length!==m.activities.length)throw Error("Kernel activity coverage mismatch");
 const durations=new Map(m.activities.map(a=>[a.id,a.duration]));
 const activities=out.tasks.map(t=>{
   if(!durations.has(t.activity_id)||!Array.isArray(t.work_slots)||t.work_slots.length!==durations.get(t.activity_id))throw Error("Kernel slot coverage invalid");
   if(!Number.isInteger(t.start)||!Number.isInteger(t.finish)||t.start<0||t.finish<t.start)throw Error("Invalid kernel date slots");
   return {activity_id:t.activity_id,name:t.name,duration_workdays:durations.get(t.activity_id),
    start_slot:t.start,finish_exclusive_slot:t.finish,start_date:dateAt(m.project.start,t.start),
    finish_exclusive_date:dateAt(m.project.start,t.finish),work_slots:[...t.work_slots],
    leveling_delay_days:t.leveling_delay_days??0};
 }).sort((a,b)=>a.activity_id.localeCompare(b.activity_id,"en"));
 const neutral={project:{id:m.project.id,name:m.project.name,start:m.project.start},
  activities:activities.map(a=>({id:a.activity_id,name:a.name,duration:a.duration_workdays,start:a.start_slot,finish:a.finish_exclusive_slot}))};
 const tj=toTaskJuggler(neutral,m.relationships);
 const tjSupported=m.relationships.every(r=>(r.type??"FS")==="FS"&&Number(r.lag??0)===0)&&m.activities.every(a=>/^[A-Za-z][A-Za-z0-9_]*$/.test(a.id));
 const tjSource=tjSupported?tj.text.replace(/^project p .*$/m,'project p "Synthetic Schedule Export" "1.0" '+m.project.start+' +3y'):null;
 const adapters={
 IFCOPENSHELL_IFC4D:record("IFCOPENSHELL_IFC4D","NEUTRAL_IFC_MAPPING_ONLY",toIfc4dNeutral(neutral),["No IfcOpenShell Python execution, IFC serialization, geometry or 4D verification"]),
 OPENPROJECT:record("OPENPROJECT","OFFLINE_WORK_PACKAGE_PAYLOAD_ONLY",toOpenProjectWorkPackages(neutral),["No OpenProject server/API connection or authenticated write"]),
 PROJECTLIBRE_DESKTOP:record("PROJECTLIBRE_DESKTOP","NEUTRAL_PROJECTLIBRE_MAPPING_ONLY",toProjectLibreNeutral(neutral),["No ProjectLibre execution or verified import"]),
 TASKJUGGLER:record("TASKJUGGLER",tjSupported?"TJP_SOURCE_EXPORT_NOT_EXECUTED":"BLOCKED_UNSUPPORTED_SEMANTICS",{tjp_source:tjSource,unsupported_relationships:tj.unsupported_relationships},["No tj3 runtime execution or certified TJP syntax","Non-FS relations or lags block export"]),
 GANTTPROJECT:record("GANTTPROJECT","NEUTRAL_GANTT_MAPPING_ONLY",toGanttProjectNeutral(neutral),["No GanttProject execution or verified .gan import"])
 };
 if(Object.keys(adapters).sort().join("|")!==UPSTREAM_IDS.slice().sort().join("|"))throw Error("Adapter registry coverage mismatch");
 const plan={format:"PCK_EXECUTED_PLAN_V1",request_id:request.request_id,classification:request.classification,
  engineering_status:"NOT_ENGINEERING_APPROVED",computed_by:"PCK_RESOURCE_LEVELER",
  project:m.project,policy:out.schedule.policy,optimality_claim:out.schedule.optimality_claim,
  activities,resource_allocations:out.workloads,conflicts:out.conflicts,delayed_activities:out.delayed,
  notes:["Draft computed from explicit machine input; not approved for construction.",
   "Exclusive finish is a scheduling event; do not confuse with last work day.",
   "This scheduling repository does not generate architectural or structural designs."]};
 const upstream={format:"PCK_UPSTREAM_ADAPTER_EVIDENCE_V1",request_id:request.request_id,adapters};
 const files={"plan.json":json(plan),"upstreams.json":json(upstream)};
 const manifest={format:"PCK_MACHINE_EVIDENCE_V1",request_id:request.request_id,
  classification:request.classification,engineering_status:"NOT_ENGINEERING_APPROVED",
  source_authority:request.source_authority,input_sha256:hash(json(request)),
  outputs_sha256:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,hash(v)])),
  execution:"DETERMINISTIC_CUSTOM_KERNEL",registered_adapter_count:5,externally_executed_upstreams:0,
  machine_checks:["format","source classification","ID uniqueness","kernel coverage","allocated work-slot count","output SHA256"],
  unverified:["external application interoperability","engineering safety","field quantities and productivity","BIM geometry","architectural/structural approval"]};
 return {plan,upstream,manifest,files:{...files,"manifest.json":json(manifest)}};
}
export function verifyFiles(files,request,options={}){
 const expected=executeRequest(request,options).files;
 for(const name of ["plan.json","upstreams.json","manifest.json"]){
  if(typeof files[name]!=="string"||files[name]!==expected[name])throw Error("Deterministic readback failed for "+name);
 }
 return true;
}
