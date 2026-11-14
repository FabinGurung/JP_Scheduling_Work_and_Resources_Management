/**
 * Skyforge standard project scheduling contract V1.
 * Source/intake normalization is separate from published Gantt/calendar projections.
 * Never merge rates, quantities, project dates or permissions across projects.
 */
import {validateGenericViewModel} from "../presentation/generic-views.mjs";

export const STANDARD_SCHEDULE_INPUT_FORMAT="SKYFORGE_STANDARD_SCHEDULE_INPUT_V1";
export const STANDARD_SCHEDULE_EDITION_FORMAT="SKYFORGE_STANDARD_SCHEDULE_EDITION_V1";
const safeId=x=>typeof x==="string"&&/^[A-Za-z0-9][A-Za-z0-9_:.-]{0,79}$/.test(x);
const text=x=>typeof x==="string"&&x.length>0&&x.length<=500&&!/[<>\u0000-\u001f]/.test(x);
const date=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&
 Number.isFinite(Date.parse(x+"T00:00:00Z"))&&
 new Date(x+"T00:00:00Z").toISOString().slice(0,10)===x;
const validN=x=>typeof x==="number"&&Number.isFinite(x);
const required=(ok,message)=>{if(!ok)throw Error("Schedule template: "+message)};
const copy=x=>structuredClone(x);
const unique=(items,field)=>new Set(items.map(x=>x[field])).size===items.length;
const allowedUnit=u=>typeof u==="string"&&u.length>0&&u.length<=32&&!/[<>\u0000-\u001f]/.test(u);
function assertAcyclic(ids,links){
 const out=new Map([...ids].map(id=>[id,[]])),indeg=new Map([...ids].map(id=>[id,0]));
 for(const l of links){out.get(l.from).push(l.to);indeg.set(l.to,indeg.get(l.to)+1);}
 const queue=[...ids].filter(id=>indeg.get(id)===0);
 let count=0;
 for(let i=0;i<queue.length;i++){const id=queue[i];count++;for(const to of out.get(id)){indeg.set(to,indeg.get(to)-1);if(indeg.get(to)===0)queue.push(to);}}
 required(count===ids.size,"dependency cycle is not allowed");
}
export function validateStandardScheduleInput(spec){
 required(spec?.format===STANDARD_SCHEDULE_INPUT_FORMAT,"wrong source format");
 required(safeId(spec.project?.id)&&text(spec.project?.name),"project identity required");
 required(safeId(spec.edition?.id)&&text(spec.edition?.description),"source edition identity required");
 required(spec.authority?.baseline_approved===false&&spec.authority.engineering_release===false&&
  spec.authority.actual_progress_verified===false,"unapproved-source boundary must remain explicit");
 required(["UNSET","RELATIVE_CALENDAR_DAYS","DATED_WORK_SLOTS"].includes(spec.clock?.kind),"explicit time axis required");
 required(spec.clock.origin_date===null||date(spec.clock.origin_date),"invalid clock origin");
 required(spec.clock.kind==="UNSET"||date(spec.clock.origin_date),"active time axis requires a valid origin");
 required(Array.isArray(spec.calendar?.nonworking_weekdays)&&
  unique(spec.calendar.nonworking_weekdays.map(v=>({value:v})),"value")&&
  spec.calendar.nonworking_weekdays.every(x=>Number.isInteger(x)&&x>=0&&x<=6),"invalid nonworking weekdays");
 required(spec.calendar.hours_per_day===null||
  (validN(spec.calendar.hours_per_day)&&spec.calendar.hours_per_day>0&&spec.calendar.hours_per_day<=24),"hours/day invalid");
 required(spec.crew&&(["skilled","helpers","machines"].every(k=>spec.crew[k]===null||
  (Number.isInteger(spec.crew[k])&&spec.crew[k]>=0))),"crew values must be explicit or null");
 for(const key of ["wbs","activities","relationships","holds","source_manifest"])
  required(Array.isArray(spec[key]),key+" array required");
 const wids=new Set(),aids=new Set(),holds=new Set(),sources=new Set();
 for(const s of spec.source_manifest){
  required(safeId(s.id)&&!sources.has(s.id),"source ID must be unique");
  required(["ne","en","mixed","other"].includes(s.original_language),"source language must be identified");
  required(s.original_text_file_id===null||safeId(s.original_text_file_id),"source original text ID invalid");
  required(s.english_text_file_id===null||safeId(s.english_text_file_id),"English translation text ID invalid");
  required(["UNVERIFIED","OWNER_VERBATIM","REVIEWED","APPROVED_RECORD"].includes(s.authority),"source authority invalid");
  sources.add(s.id);
 }
 for(const w of spec.wbs){
  required(safeId(w.id)&&text(w.title)&&!wids.has(w.id),"invalid or duplicate WBS");
  wids.add(w.id);
 }
 for(const w of spec.wbs)required(w.parent_id===null||(wids.has(w.parent_id)&&w.parent_id!==w.id),"unknown WBS parent");
 const parentById=new Map(spec.wbs.map(w=>[w.id,w.parent_id]));
 for(const id of wids){const path=new Set();let k=id;while(k){required(!path.has(k),"WBS parent cycle");path.add(k);k=parentById.get(k)||null;}}
 for(const h of spec.holds){
  required(safeId(h.id)&&text(h.title)&&!holds.has(h.id)&&["OPEN","HELD","RESOLVED_UNVERIFIED"].includes(h.status),"invalid hold");
  required(Array.isArray(h.activity_ids),"hold activity IDs required");
  holds.add(h.id);
 }
 for(const a of spec.activities){
  required(safeId(a.id)&&text(a.title)&&wids.has(a.wbs_id)&&!aids.has(a.id),"invalid activity/WBS identity");
  required(a.duration&&["WORKDAYS","ELAPSED_DAYS","UNKNOWN"].includes(a.duration.unit),"duration unit required");
  required(["SOURCE_REVIEWED","OWNER_STATED","PLANNING_ALLOWANCE","UNKNOWN"].includes(a.duration.basis),"duration basis required");
  required(a.duration.value===null||(Number.isInteger(a.duration.value)&&a.duration.value>=0),"duration must be nonnegative integer or null");
  required(a.duration.value===null||a.duration.unit!=="UNKNOWN","numeric duration needs unit");
  required(a.quantity&&["SOURCE_REVIEWED","CALCULATED","SCENARIO","UNKNOWN"].includes(a.quantity.basis),"quantity provenance required");
  required(a.quantity.value===null||(validN(a.quantity.value)&&a.quantity.value>0&&allowedUnit(a.quantity.unit)),"invalid measured quantity/unit");
  required(a.quantity.value!==null||a.quantity.unit===null,"missing quantity must retain unknown unit");
  required(Array.isArray(a.source_refs)&&a.source_refs.every(x=>sources.has(x)),"unknown activity source reference");
  required(Array.isArray(a.hold_ids)&&a.hold_ids.every(x=>holds.has(x)),"unknown activity hold");
  required(a.actual_start===null&&a.actual_finish===null&&a.actual_percent===null,"no unverified actual progress");
  aids.add(a.id);
 }
 for(const h of spec.holds)required(h.activity_ids.every(x=>aids.has(x)),"hold references unknown activity");
 const pairs=new Set();
 for(const edge of spec.relationships){
  required(aids.has(edge.from)&&aids.has(edge.to)&&edge.from!==edge.to,"invalid dependency endpoints");
  required(["FS","SS","FF","SF"].includes(edge.type),"dependency type required");
  required(Number.isInteger(edge.lag)&&Math.abs(edge.lag)<=3650,"lag must be explicit integer");
  required(["WORKDAYS","ELAPSED_DAYS"].includes(edge.lag_unit),"lag requires time unit");
  const key=[edge.from,edge.to,edge.type,edge.lag,edge.lag_unit].join("|");
  required(!pairs.has(key),"duplicate dependency");pairs.add(key);
 }
 assertAcyclic(aids,spec.relationships);
 return true;
}
export function normalizeStandardScheduleInput(spec){
 validateStandardScheduleInput(spec);
 const gaps=[];
 if(spec.clock.kind==="UNSET")gaps.push({code:"TIME_AXIS_NOT_SELECTED",blocks_scheduling:true});
 if(spec.calendar.hours_per_day===null)gaps.push({code:"WORKDAY_HOURS_UNCONFIRMED",blocks_scheduling:false});
 if(spec.crew.skilled===null||spec.crew.helpers===null)
  gaps.push({code:"CREW_UNCONFIRMED",blocks_scheduling:false});
 if(spec.source_manifest.length===0)gaps.push({code:"SOURCE_REGISTER_EMPTY",blocks_scheduling:false});
 for(const activity of spec.activities){
  if(activity.duration.value===null)gaps.push({code:"ACTIVITY_DURATION_UNKNOWN",activity_id:activity.id,blocks_scheduling:true});
  if(activity.quantity.value===null)gaps.push({code:"ACTIVITY_QUANTITY_UNKNOWN",activity_id:activity.id,blocks_scheduling:false});
 }
 if(!spec.activities.length)gaps.push({code:"NO_ACTIVITIES",blocks_scheduling:true});
 const machine_ready=spec.activities.length>0&&!gaps.some(x=>x.blocks_scheduling);
 return {
  format:"SKYFORGE_STANDARD_SCHEDULE_NORMALIZED_V1",
  project:copy(spec.project),
  edition:copy(spec.edition),
  clock:copy(spec.clock),calendar:copy(spec.calendar),crew:copy(spec.crew),
  authority:copy(spec.authority),
  source_manifest:copy(spec.source_manifest),
  wbs:copy(spec.wbs),activities:copy(spec.activities),
  relationships:copy(spec.relationships),holds:copy(spec.holds),
  diagnostics:gaps,
  machine_ready,
  baseline_approved:false,
  engineering_release:false,
  note:"Canonical intake, not a solved Gantt, published baseline, engineering release, or verified site progress"
 };
}

/**
 * Common read-only Schedule Edition projection from the exact shared Gantt
 * model already used for Narayani and Harisharan. Do not change time axes.
 */
export function normalizePublishedScheduleEdition(model){
 validateGenericViewModel(model);
 const relative=date(model.relative_origin);
 const dated=date(model.planned_start_date);
 required(!(relative&&dated),"relative and dated calendar axes must not be mixed");
 required(model.baseline_approved===false&&model.engineering_release===false,"model release not authorized");
 const axis=relative?"RELATIVE_CALENDAR_DAYS":dated?"DATED_WORK_SLOTS":"UNSPECIFIED";
 const activities=model.activities.map(a=>{
  const elapsed=typeof a.estimate?.kind==="string"&&a.estimate.kind.startsWith("Elapsed");
  return {
   id:a.id,title:a.title,wbs_id:a.wbs_id,
   start_slot:a.start,finish_slot:a.finish,display_start_date:a.start_date??null,
   display_finish_date:a.finish_date??null,
   duration:{value:a.duration??null,unit:elapsed?"ELAPSED_DAYS":axis==="UNSPECIFIED"?"UNSPECIFIED":"WORKDAYS",
    basis:a.estimate?.kind??"SOURCE_COMPUTED_DRAFT"},
   measured_work:{quantity:typeof a.quantity==="number"?a.quantity:null,unit:a.quantity_unit??null,basis:a.quantity_basis??null},
   reference_estimate:a.estimate?copy(a.estimate):null,
   holds:copy(a.hold??[]),source_refs:copy(a.source_refs??[]),
   planning_status:a.status,critical:a.critical??null,
   total_float_workdays:a.total_float_workdays??null,
   engineering_release:false
  };
 });
 const relationships=model.links.map(l=>({
  from:l.from,to:l.to,type:l.type??"FS",lag:l.lag??0,
  lag_basis:l.lag_basis??"UNDECLARED",source:l.source??null
 }));
 const result={
  format:STANDARD_SCHEDULE_EDITION_FORMAT,
  project:copy(model.project),
  edition_id:model.revision??"unversioned",
  source_model_format:model.format,
  source_model_sha256:model.input_sha256,
  source_classification:model.classification,
  clock:{kind:axis,origin_date:relative?model.relative_origin:dated?model.planned_start_date:null,
   weekly_holiday:model.working_calendar?.weekly_holiday??(relative?"Saturday":null),
   hours_per_day:model.working_calendar?.hours_per_day??null,
   dates_approved:false},
  authority:{baseline_approved:false,engineering_release:false,actual_progress_verified:false},
  wbs:copy(model.wbs),activities,relationships,holds:copy(model.holds??[]),
  source_references:Object.entries(model.citations??{}).map(([id,v])=>({id,title:v.title,url:v.url??null,section:v.section??null})),
  counts:{wbs:model.wbs.length,activities:activities.length,
   scheduled:activities.filter(a=>a.display_start_date!==null&&a.display_finish_date!==null).length,
   links:relationships.length,holds:(model.holds??[]).length,
   provisional_rate_components:activities.reduce((sum,a)=>sum+(a.reference_estimate?.components?.length??0),0)},
  note:"Normalized read-only comparison/projection; original project sources, models and authority are unchanged"
 };
 return result;
}
export function compareStandardScheduleEditions(left,right){
 required(left?.format===STANDARD_SCHEDULE_EDITION_FORMAT&&
  right?.format===STANDARD_SCHEDULE_EDITION_FORMAT,"normalized edition required");
 return {
  format:"SKYFORGE_STANDARD_SCHEDULE_COMPARISON_V1",
  projects:[left,right].map(x=>({
   id:x.project.id,name:x.project.name,edition:x.edition_id,clock:x.clock.kind,
   origin_date:x.clock.origin_date,counts:copy(x.counts),
   baseline_approved:false,engineering_release:false
  })),
  common_contract:["WBS","ACTIVITIES","DEPENDENCIES","CALENDAR_AXIS","RESOURCE_REFERENCES","ENGINEERING_HOLDS","SOURCE_PROVENANCE"],
  differences_must_not_be_auto_reconciled:["RELATIVE_VS_DATED_CLOCK","WORKDAY_VS_ELAPSED_DAY_LAGS","PROJECT_MEASUREMENTS","MIX_DESIGN_AND_RATE_GRADES","CONSTRUCTION_APPROVAL"],
  reusable_presentation:"src/presentation/scheduling-desk.mjs",
  reusable_kernel:"src/kernel/project-template.mjs"
 };
}
