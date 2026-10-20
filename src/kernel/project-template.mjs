import {createHash} from "node:crypto";
import {buildWbsTree} from "./wbs.mjs";
import {scheduleProject} from "./schedule-project.mjs";
/**
 * Generic, fail-closed schedule input contract; no Narayani source or activity count.
 * This compiler returns mathematical data, NOT permission to publish private inputs.
 */
const validId=s=>typeof s==="string"&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(s);
const sane=s=>typeof s==="string"&&s.length>0&&s.length<=180&&!/[<>\u0000-\u001f]/.test(s);
const hash=s=>createHash("sha256").update(s).digest("hex");
export function compileProjectDraft(spec){
 if(spec?.format!=="SKYFORGE_PROJECT_INPUT_V1"||!validId(spec.project?.id)||!sane(spec.project.name))
  throw Error("Invalid project input contract");
 if(!Array.isArray(spec.wbs)||!spec.wbs.length||!Array.isArray(spec.activities)||!spec.activities.length)
  throw Error("WBS and activities required");
 if(!Array.isArray(spec.relationships)||!Array.isArray(spec.source_manifest))
  throw Error("Relationships and source_manifest arrays required");
 if(!["SHARED_CPM","CALENDAR_CPM","RESOURCE_LEVELING"].includes(spec.scheduling_mode))
  throw Error("Explicit scheduling mode required");
 const refs=new Map();
 for(const s of spec.source_manifest){
  if(!validId(s.source_id)||refs.has(s.source_id)||!sane(s.revision)||!/^[0-9a-f]{64}$/.test(s.sha256??"")||
    !["REVIEWED_SOURCE","APPROVED_RECORD","UNVERIFIED_SOURCE"].includes(s.authority))
   throw Error("Invalid or duplicate source manifest entry");
  refs.set(s.source_id,s);
 }
 const ids=new Set();
 for(const w of spec.wbs){if(!validId(w.wbs_id)||!sane(w.name))throw Error("Invalid WBS ID or name");ids.add(w.wbs_id)}
 if(ids.size!==spec.wbs.length)throw Error("Duplicate WBS IDs");
 buildWbsTree(spec.wbs);
 const acts=new Set(),gaps=[],canonical=[];
 for(const a of spec.activities){
  if(!validId(a.id)||acts.has(a.id)||!ids.has(a.wbs_id)||!sane(a.name))
    throw Error("Activity identity or WBS foreign key invalid");
  acts.add(a.id);
  if(!["REVIEWED_SOURCE","ASSUMED_DRAFT"].includes(a.duration_basis))
    throw Error("Activity duration provenance is required");
  if(a.duration_basis==="REVIEWED_SOURCE"&&(!validId(a.source_id)||!refs.has(a.source_id)))
    throw Error("Reviewed duration missing referenced source");
  if(a.duration_basis==="ASSUMED_DRAFT"&&!sane(a.assumption_reason))
    throw Error("Draft duration needs an explicit assumption reason");
  if(a.duration==null)gaps.push({activity_id:a.id,code:"DURATION_NOT_PROVIDED"});
  else if(typeof a.duration!=="number"||!Number.isInteger(a.duration)||a.duration<0)
    throw Error("Duration must be nonnegative integer slots/days");
  if(a.work_quantity!=null){
   if(!Number.isFinite(a.work_quantity)||a.work_quantity<=0||!sane(a.work_unit))
    throw Error("Invalid quantity or unit");
   if(!["REVIEWED_SOURCE","CALCULATED","ASSUMED_DRAFT"].includes(a.quantity_basis))
    throw Error("Quantity provenance is required");
   if(a.quantity_basis==="REVIEWED_SOURCE"&&(!validId(a.quantity_source_id)||!refs.has(a.quantity_source_id)))
    throw Error("Quantity source missing");
   if(a.quantity_basis==="CALCULATED"&&!sane(a.quantity_formula))
    throw Error("Calculated quantity needs formula");
   if(a.quantity_basis==="ASSUMED_DRAFT"&&!sane(a.quantity_assumption_reason))
    throw Error("Quantity assumption reason missing");
  }
  canonical.push({...a});
 }
 for(const r of spec.relationships){
  const p=r.predecessor??r.predecessor_id, s=r.successor??r.successor_id;
  if(!acts.has(p)||!acts.has(s)||!["FS","SS","FF","SF"].includes(r.type??"FS"))
   throw Error("Invalid relationship endpoint/type");
 }
 // No implicit crew, country norms, calendars or costs.
 const src={...spec,wbs:[...spec.wbs],activities:canonical};
 const canonicalText=JSON.stringify(src);
 const inputSha=hash(canonicalText);
 const hasAssumptions=canonical.some(a=>a.duration_basis==="ASSUMED_DRAFT"||a.quantity_basis==="ASSUMED_DRAFT");
 if(spec.scheduling_mode==="CALENDAR_CPM"&&(!spec.projectStart||!spec.horizonEnd||!spec.calendars))
  gaps.push({code:"CALENDAR_DEFINITIONS_AND_HORIZON_REQUIRED"});
 if(spec.scheduling_mode==="RESOURCE_LEVELING"&&(!spec.resources||!spec.assignments||!spec.calendars))
  gaps.push({code:"RESOURCE_ASSIGNMENTS_AND_CALENDARS_REQUIRED"});
 if(gaps.length){
  return {format:"SKYFORGE_PROJECT_DRAFT_V1",project_id:spec.project.id,input_sha256:inputSha,
    activity_count:canonical.length,wbs_count:spec.wbs.length,
    planning_status:"INCOMPLETE_NO_SCHEDULE",engineering_release:false,assumptions_present:hasAssumptions,
    gaps,views_authority:"GENERIC_MACHINE_MODEL_ONLY_NO_APPROVED_FOUR_VIEW_RENDERER",schedule:null};
 }
 const solverActivities=canonical.map(a=>({id:a.id,name:a.name,wbs_id:a.wbs_id,duration:a.duration,
   calendar_id:a.calendar_id,activity_type:a.activity_type}));
 const result=scheduleProject({activities:solverActivities,relationships:spec.relationships,
  calendars:spec.calendars,projectStart:spec.projectStart,horizonEnd:spec.horizonEnd,
  projectCalendarId:spec.projectCalendarId,resources:spec.resources,assignments:spec.assignments,
  materialReceipts:spec.materialReceipts,resourceReservations:spec.resourceReservations,crews:spec.crews},
  spec.scheduling_mode);
 return {format:"SKYFORGE_PROJECT_DRAFT_V1",project_id:spec.project.id,input_sha256:inputSha,
    activity_count:canonical.length,wbs_count:spec.wbs.length,
    planning_status:hasAssumptions?"CALCULATED_WITH_EXPLICIT_ASSUMPTIONS":"CALCULATED_DRAFT_NOT_BASELINE",
    engineering_release:false,assumptions_present:hasAssumptions,gaps:[],
    views_authority:"GENERIC_MACHINE_MODEL_ONLY_NO_APPROVED_FOUR_VIEW_RENDERER",schedule:result};
}
