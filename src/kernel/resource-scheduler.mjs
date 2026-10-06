import {normalizeActivity} from "./activities.mjs";
import {createCalendarEngine} from "./calendar-scheduler.mjs";
import {normalizeResources,normalizeCrews,expandCrewAssignments} from "./resources.mjs";
import {numeric} from "./validation.mjs";

function positive(value,label){
  const n=numeric(value,label,{nonnegative:true});
  if(n<=0) throw new Error(`${label} must be greater than zero`);
  return n;
}
function integer(value,label){
  const n=numeric(value,label,{nonnegative:true});
  if(!Number.isInteger(n)) throw new Error(`${label} must be a nonnegative integer`);
  return n;
}
function aggregateRenewable(assignments,resources){
  const demand=new Map();
  for(const a of assignments){
    const r=resources.get(a.resource_id);
    if(!r) throw new Error(`Unknown resource: ${a.resource_id}`);
    if(r.resource_type==="MATERIAL") continue;
    const units=positive(a.units??1,`Assignment units for ${a.activity_id}/${r.id}`);
    demand.set(r.id,(demand.get(r.id)??0)+units);
  }
  return demand;
}
function materialPlans(assignments,resources,duration){
  const plans=new Map();
  for(const a of assignments){
    const r=resources.get(a.resource_id);
    if(!r||r.resource_type!=="MATERIAL") continue;
    if(r.inventory_quantity==null) throw new Error(`Material inventory_quantity is required for RESOURCE_DEPENDENT placement: ${r.id}`);
    const hasTotal=a.quantity!=null,hasRate=a.quantity_per_slot!=null;
    if(hasTotal===hasRate) throw new Error(`Material assignment ${a.activity_id}/${r.id} must declare exactly one quantity or quantity_per_slot`);
    if(duration===0&&(hasRate||numeric(a.quantity,"Material quantity",{nonnegative:true})>0)) throw new Error("Zero-duration RESOURCE_DEPENDENT activity cannot consume material");
    const per_slot=hasRate?positive(a.quantity_per_slot,`Material quantity_per_slot for ${a.activity_id}/${r.id}`)
      :duration===0?0:numeric(a.quantity,`Material quantity for ${a.activity_id}/${r.id}`,{nonnegative:true})/duration;
    const p=plans.get(r.id)??{resource:r,per_slot:0};
    p.per_slot+=per_slot;plans.set(r.id,p);
  }
  return plans;
}
function reservationState({reservations=[],resources,engine}){
  if(!Array.isArray(reservations)) throw new Error("reservations must be an array");
  const map=new Map();
  for(const raw of reservations){
    const resource_id=raw.resource_id??raw.resourceId,r=resources.get(resource_id);
    if(!r) throw new Error(`Reservation references unknown resource: ${resource_id}`);
    if(r.resource_type==="MATERIAL") throw new Error(`Renewable reservation cannot target MATERIAL resource ${resource_id}`);
    const slot=engine.point(raw.slot??raw.date,`Reservation point for ${resource_id}`);
    const units=positive(raw.units,`Reservation units for ${resource_id}`);
    if(units>r.max_units) throw new Error(`Reservation exceeds capacity for ${resource_id}`);
    const key=`${resource_id}@${slot}`;map.set(key,(map.get(key)??0)+units);
    if(map.get(key)>r.max_units) throw new Error(`Reservations exceed capacity for ${resource_id} at slot ${slot}`);
  }
  return map;
}
function receiptState({receipts=[],resources,engine}){
  if(!Array.isArray(receipts)) throw new Error("materialReceipts must be an array");
  const rows=[];
  for(const raw of receipts){
    const resource_id=raw.resource_id??raw.resourceId,r=resources.get(resource_id);
    if(!r) throw new Error(`Material receipt references unknown resource: ${resource_id}`);
    if(r.resource_type!=="MATERIAL") throw new Error(`Material receipt must target MATERIAL resource: ${resource_id}`);
    rows.push({resource_id,slot:engine.point(raw.slot??raw.date,`Material receipt point for ${resource_id}`),quantity:positive(raw.quantity,`Material receipt quantity for ${resource_id}`)});
  }
  return rows.sort((a,b)=>a.slot-b.slot||a.resource_id.localeCompare(b.resource_id));
}
function availableMaterial(resourceId,slot,resource,receipts){
  let q=resource.inventory_quantity??0;
  for(const r of receipts) if(r.resource_id===resourceId&&r.slot<=slot) q+=r.quantity;
  return q;
}

export function resolveResourceDependentAvailability({
  activity,resources=[],crews=[],assignments=[],calendars,projectStart,horizonStart=projectStart,horizonEnd,
  projectCalendarId=null,projectTimeZone="UTC",timeResolution="DAY",resourceReservations=[],materialReceipts=[]
}={}){
  const a=normalizeActivity(activity);
  if(a.activity_type!=="RESOURCE_DEPENDENT") throw new Error(`Resource engine requires RESOURCE_DEPENDENT activity, got ${a.activity_type}`);
  const duration=integer(a.duration,`RESOURCE_DEPENDENT duration for ${a.id}`);
  const engine=createCalendarEngine({projectStart,horizonStart,horizonEnd,calendars,projectCalendarId,projectTimeZone,timeResolution});
  const resourceState=normalizeResources(resources);
  for(const r of resourceState.resources) if(r.calendar_id!=null&&!engine.calendarIds.includes(r.calendar_id)) throw new Error(`Unknown resource calendar ${r.calendar_id} for ${r.id}`);
  const crewState=normalizeCrews({crews,resources:resourceState.by_id,knownCalendarIds:engine.calendarIds});
  const expanded=expandCrewAssignments({assignments,resources:resourceState.by_id,crews:crewState.by_id}).filter(x=>x.activity_id===a.id);
  if(expanded.length===0) throw new Error(`RESOURCE_DEPENDENT activity ${a.id} requires resource assignments`);

  const renewable=aggregateRenewable(expanded,resourceState.by_id);
  if(renewable.size===0) throw new Error(`RESOURCE_DEPENDENT activity ${a.id} requires at least one LABOR or EQUIPMENT assignment`);
  const requiredCalendars=new Set();
  for(const x of expanded){
    const r=resourceState.by_id.get(x.resource_id);
    if(r.resource_type==="MATERIAL") continue;
    if(r.calendar_id) requiredCalendars.add(r.calendar_id);
    if(x.crew_calendar_id) requiredCalendars.add(x.crew_calendar_id);
    if(!r.calendar_id&&!x.crew_calendar_id) throw new Error(`Renewable resource ${r.id} requires a resource or crew calendar for RESOURCE_DEPENDENT placement`);
  }
  const materials=materialPlans(expanded,resourceState.by_id,duration);
  const reservations=reservationState({reservations:resourceReservations,resources:resourceState.by_id,engine});
  const receipts=receiptState({receipts:materialReceipts,resources:resourceState.by_id,engine});

  return {activity:a,duration,engine,resources:resourceState.by_id,assignments:expanded,renewable,materials,reservations,receipts,required_calendar_ids:[...requiredCalendars].sort()};
}

export function placeResourceDependentActivity(input={}){
  const state=resolveResourceDependentAvailability(input),{activity:a,duration,engine}=state;
  const notBefore=engine.point(input.notBefore??input.not_before??0,`notBefore for ${a.id}`);
  if(duration===0) return {activity_id:a.id,activity_type:a.activity_type,start:notBefore,finish:notBefore,start_date:engine.eventDate(notBefore),finish_event_date:engine.eventDate(notBefore),work_slots:[],required_calendar_ids:state.required_calendar_ids,availability_mode:"RESOURCE_INTERSECTION",resource_leveling_applied:false};

  const consumed=new Map();
  const work=[];
  let start=null,finish=null;
  for(let day=notBefore;day<=engine.maxDay;day++){
    if(!state.required_calendar_ids.every(id=>engine.isWorking(id,day))) continue;
    let capacityOk=true;
    for(const [resourceId,demand] of state.renewable){
      const r=state.resources.get(resourceId),reserved=state.reservations.get(`${resourceId}@${day}`)??0;
      if(demand+reserved>r.max_units){capacityOk=false;break;}
    }
    if(!capacityOk) continue;
    let materialOk=true;
    for(const [resourceId,plan] of state.materials){
      const next=(consumed.get(resourceId)??0)+plan.per_slot;
      if(next>availableMaterial(resourceId,day,plan.resource,state.receipts)+1e-9){materialOk=false;break;}
    }
    if(!materialOk) continue;
    if(start==null) start=day;
    work.push(day);
    for(const [resourceId,plan] of state.materials) consumed.set(resourceId,(consumed.get(resourceId)??0)+plan.per_slot);
    if(work.length===duration){finish=day+1;break;}
  }
  if(finish==null) throw new Error(`Resource/material availability horizon exhausted for RESOURCE_DEPENDENT activity ${a.id}`);
  return {
    activity_id:a.id,activity_type:a.activity_type,start,finish,
    start_date:engine.eventDate(start),finish_date:engine.eventDate(work[work.length-1]),finish_event_date:engine.eventDate(finish),
    work_slots:work,required_calendar_ids:state.required_calendar_ids,
    renewable_demand:Object.fromEntries(state.renewable),
    material_consumption:Object.fromEntries([...consumed]),
    availability_mode:"RESOURCE_INTERSECTION_WITH_FIXED_RESERVATIONS_AND_MATERIAL_SUPPLY",
    resource_leveling_applied:false
  };
}
