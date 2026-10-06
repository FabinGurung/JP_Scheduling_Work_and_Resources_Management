import {numeric} from "./validation.mjs";

export const PRODUCTIVITY_RATE_BASES=Object.freeze(["PER_WORKDAY","PER_HOUR"]);
export const PRODUCTIVITY_ROUNDING=Object.freeze(["CEIL_WORKDAY","NONE"]);

function positive(v,label){const n=numeric(v,label,{nonnegative:true});if(n<=0)throw new Error(`${label} must be greater than zero`);return n;}

export function deriveDurationFromProductivity({
  quantity,productivity_rate,production_units=1,rate_basis="PER_WORKDAY",
  working_minutes_per_day=null,rounding="CEIL_WORKDAY"
}={}){
  const q=numeric(quantity,"quantity",{nonnegative:true});
  const rate=positive(productivity_rate,"productivity_rate");
  const units=positive(production_units,"production_units");
  const basis=String(rate_basis).toUpperCase();
  if(!PRODUCTIVITY_RATE_BASES.includes(basis))throw new Error(`Unsupported productivity rate_basis: ${basis}`);
  const round=String(rounding).toUpperCase();
  if(!PRODUCTIVITY_ROUNDING.includes(round))throw new Error(`Unsupported productivity rounding: ${rounding}`);
  let effective_per_workday=rate*units,minutes=null;
  if(basis==="PER_HOUR"){
    minutes=positive(working_minutes_per_day,"working_minutes_per_day");
    effective_per_workday*=minutes/60;
  }
  const raw_workdays=q===0?0:q/effective_per_workday;
  const scheduled_workdays=round==="CEIL_WORKDAY"?Math.ceil(raw_workdays):raw_workdays;
  return {quantity:q,productivity_rate:rate,production_units:units,rate_basis:basis,working_minutes_per_day:minutes,
    effective_quantity_per_workday:effective_per_workday,raw_workdays,scheduled_workdays,rounding:round};
}

export function applyProductivityDurations({activities=[],plans=[]}={}){
  if(!Array.isArray(activities)||!Array.isArray(plans))throw new Error("activities and plans must be arrays");
  const planById=new Map();
  for(const raw of plans){
    const activity_id=raw.activity_id??raw.id;
    if(typeof activity_id!=="string"||!activity_id.trim())throw new Error("Every productivity plan requires activity_id");
    if(planById.has(activity_id))throw new Error(`Duplicate productivity plan for ${activity_id}`);
    planById.set(activity_id,raw);
  }
  const seen=new Set();
  const rows=activities.map(activity=>{
    const id=activity.id??activity.activity_id;
    const plan=planById.get(id);
    if(!plan)return {...activity};
    seen.add(id);
    const calc=deriveDurationFromProductivity(plan);
    return {...activity,duration:calc.scheduled_workdays,original_duration:activity.duration,
      duration_source:"PRODUCTIVITY_DERIVED",productivity:{...calc,quantity_unit:plan.quantity_unit??null,source_crew_id:plan.crew_id??null}};
  });
  for(const id of planById.keys())if(!seen.has(id))throw new Error(`Productivity plan references unknown activity: ${id}`);
  return rows;
}
