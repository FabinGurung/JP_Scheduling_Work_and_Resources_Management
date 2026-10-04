import {activityId, numeric} from "./validation.mjs";
const TYPES=new Set(["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"]);
const EPSILON=1e-9;

export function normalizeConstraints({activities=[],constraints=[]}){
  if (!Array.isArray(constraints)) throw new Error("constraints must be an array");
  const ids=new Set(activities.map(activityId));
  const normalized=[];
  for(const raw of constraints){
    const activity_id=raw.activity_id??raw.id;
    const type=String(raw.type??"").toUpperCase();
    const slot=numeric(raw.slot,`Constraint slot for ${activity_id}`);
    if(!ids.has(activity_id)) throw new Error(`Constraint references unknown activity: ${activity_id}`);
    if(!TYPES.has(type)) throw new Error(`Unsupported constraint type: ${type}`);
    if(raw.priority!=null || raw.calendar_id!=null) throw new Error("Constraint priority and per-constraint calendars are unsupported in the shared-slot model");
    normalized.push({...raw,activity_id,type,slot});
  }
  return normalized;
}

export function constraintStartBounds(constraint,duration){
  const d=numeric(duration,`Invalid duration for constraint ${constraint.activity_id}`,{nonnegative:true});
  const {type,slot}=constraint;
  if(type==="START_ON_OR_AFTER") return {min_start:slot,max_start:null};
  if(type==="START_ON_OR_BEFORE") return {min_start:null,max_start:slot};
  if(type==="FINISH_ON_OR_AFTER") return {min_start:slot-d,max_start:null};
  if(type==="FINISH_ON_OR_BEFORE") return {min_start:null,max_start:slot-d};
  if(type==="MUST_START_ON") return {min_start:slot,max_start:slot};
  if(type==="MUST_FINISH_ON") return {min_start:slot-d,max_start:slot-d};
  throw new Error(`Unsupported constraint type: ${type}`);
}

export function evaluateConstraintViolations({scheduledActivities,constraints=[]}){
  const by=new Map(scheduledActivities.map(a=>[activityId(a),a]));
  const normalized=normalizeConstraints({activities:scheduledActivities,constraints});
  const results=[];
  for(const c of normalized){
    const a=by.get(c.activity_id); let actual,ok;
    if(c.type==="START_ON_OR_AFTER"){actual=a.es;ok=actual>=c.slot-EPSILON;}
    else if(c.type==="START_ON_OR_BEFORE"){actual=a.es;ok=actual<=c.slot+EPSILON;}
    else if(c.type==="FINISH_ON_OR_AFTER"){actual=a.ef;ok=actual>=c.slot-EPSILON;}
    else if(c.type==="FINISH_ON_OR_BEFORE"){actual=a.ef;ok=actual<=c.slot+EPSILON;}
    else if(c.type==="MUST_START_ON"){actual=a.es;ok=Math.abs(actual-c.slot)<=EPSILON;}
    else {actual=a.ef;ok=Math.abs(actual-c.slot)<=EPSILON;}
    if(!Number.isFinite(actual)) throw new Error(`Calculated constraint point must be numeric for ${c.activity_id}`);
    results.push({activity_id:c.activity_id,type:c.type,required_slot:c.slot,calculated_slot:actual,ok,variance:actual-c.slot});
  }
  return results;
}
