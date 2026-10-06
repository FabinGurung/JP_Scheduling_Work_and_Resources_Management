import {activityId, numeric} from "./validation.mjs";

export const CONSTRAINT_POLICIES=Object.freeze(["STRICT_ALL","PRIORITY_RANKED"]);
const TYPES=new Set(["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"]);
const EPSILON=1e-9;

export function normalizeConstraintPolicy(value="STRICT_ALL"){
  const policy=String(value??"STRICT_ALL").toUpperCase();
  if(!CONSTRAINT_POLICIES.includes(policy)) throw new Error(`Unsupported constraint policy: ${policy}`);
  return policy;
}

export function normalizeConstraintPriority(value,label="Constraint priority"){
  if(value==null) return 0;
  const priority=numeric(value,label,{nonnegative:true});
  if(!Number.isInteger(priority)) throw new Error(`${label} must be a nonnegative integer`);
  return priority;
}

export function normalizeConstraints({activities=[],constraints=[],policy="STRICT_ALL"}){
  if (!Array.isArray(constraints)) throw new Error("constraints must be an array");
  const ids=new Set(activities.map(activityId));
  const constraint_policy=normalizeConstraintPolicy(policy);
  const normalized=[];
  for(let index=0;index<constraints.length;index++){
    const raw=constraints[index];
    const activity_id=raw.activity_id??raw.id;
    const type=String(raw.type??"").toUpperCase();
    const slot=numeric(raw.slot,`Constraint slot for ${activity_id}`);
    if(!ids.has(activity_id)) throw new Error(`Constraint references unknown activity: ${activity_id}`);
    if(!TYPES.has(type)) throw new Error(`Unsupported constraint type: ${type}`);
    if(raw.calendar_id!=null) throw new Error("Per-constraint calendars are unsupported in the shared-slot model");
    const priority=normalizeConstraintPriority(raw.priority,`Constraint priority for ${activity_id}`);
    normalized.push({...raw,activity_id,type,slot,priority,constraint_policy,_constraint_index:index});
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

function combinedBounds(constraints,duration,seed={min_start:-Infinity,max_start:Infinity}){
  let min_start=seed.min_start,max_start=seed.max_start;
  for(const c of constraints){
    const b=constraintStartBounds(c,duration);
    if(b.min_start!=null) min_start=Math.max(min_start,b.min_start);
    if(b.max_start!=null) max_start=Math.min(max_start,b.max_start);
  }
  return {min_start,max_start,feasible:min_start<=max_start+EPSILON};
}

export function resolveNormalizedConstraintPolicy({activities=[],constraints=[],policy="STRICT_ALL"}){
  const constraint_policy=normalizeConstraintPolicy(policy);
  const byActivity=new Map(activities.map(a=>[activityId(a),a]));
  if(constraint_policy==="STRICT_ALL"){
    return {policy:constraint_policy,effective:constraints.map(c=>({...c,applied:true,suppressed:false})),suppressed:[],
      decisions:constraints.map(c=>({constraint_index:c._constraint_index,activity_id:c.activity_id,priority:c.priority??0,applied:true,reason:"STRICT_ALL"}))};
  }

  const grouped=new Map();
  for(const c of constraints){
    if(!byActivity.has(c.activity_id)) throw new Error(`Constraint references unknown activity: ${c.activity_id}`);
    if(!grouped.has(c.activity_id)) grouped.set(c.activity_id,[]);
    grouped.get(c.activity_id).push(c);
  }
  const effective=[],suppressed=[],decisions=[];
  for(const [activity_id,list] of grouped){
    const duration=byActivity.get(activity_id).duration;
    const priorities=[...new Set(list.map(c=>c.priority??0))].sort((a,b)=>b-a);
    let accepted=[],bounds={min_start:-Infinity,max_start:Infinity};
    for(const priority of priorities){
      const group=list.filter(c=>(c.priority??0)===priority);
      const whole=combinedBounds(group,duration,bounds);
      if(whole.feasible){
        for(const c of group){effective.push({...c,applied:true,suppressed:false});decisions.push({constraint_index:c._constraint_index,activity_id,priority,applied:true,reason:"COMPATIBLE_WITH_HIGHER_PRIORITY"});}
        accepted.push(...group);bounds={min_start:whole.min_start,max_start:whole.max_start};
        continue;
      }
      const individuallyFeasible=group.filter(c=>combinedBounds([c],duration,bounds).feasible);
      if(individuallyFeasible.length>1){
        const together=combinedBounds(individuallyFeasible,duration,bounds);
        if(!together.feasible) throw new Error(`Equal-priority constraint conflict for activity ${activity_id} at priority ${priority}; assign distinct priorities or use STRICT_ALL`);
      }
      for(const c of group){
        if(individuallyFeasible.includes(c)){
          const next=combinedBounds([c],duration,bounds);
          effective.push({...c,applied:true,suppressed:false});accepted.push(c);bounds={min_start:next.min_start,max_start:next.max_start};
          decisions.push({constraint_index:c._constraint_index,activity_id,priority,applied:true,reason:"COMPATIBLE_WITH_HIGHER_PRIORITY"});
        }else{
          const item={...c,applied:false,suppressed:true,suppressed_reason:"CONFLICTS_WITH_HIGHER_PRIORITY_CONSTRAINT"};
          suppressed.push(item);decisions.push({constraint_index:c._constraint_index,activity_id,priority,applied:false,reason:item.suppressed_reason});
        }
      }
    }
  }
  const seen=new Set([...effective,...suppressed].map(c=>c._constraint_index));
  for(const c of constraints) if(!seen.has(c._constraint_index)){
    effective.push({...c,applied:true,suppressed:false});
    decisions.push({constraint_index:c._constraint_index,activity_id:c.activity_id,priority:c.priority??0,applied:true,reason:"NO_CONFLICT_GROUP"});
  }
  effective.sort((a,b)=>a._constraint_index-b._constraint_index);
  suppressed.sort((a,b)=>a._constraint_index-b._constraint_index);
  decisions.sort((a,b)=>a.constraint_index-b.constraint_index);
  return {policy:constraint_policy,effective,suppressed,decisions};
}

export function resolveConstraintPolicy({activities=[],constraints=[],policy="STRICT_ALL"}){
  const normalized=normalizeConstraints({activities,constraints,policy});
  return {...resolveNormalizedConstraintPolicy({activities,constraints:normalized,policy}),all:normalized};
}

export function evaluateConstraintViolations({scheduledActivities,constraints=[],constraintPolicy="STRICT_ALL"}){
  const by=new Map(scheduledActivities.map(a=>[activityId(a),a]));
  const resolution=resolveConstraintPolicy({activities:scheduledActivities,constraints,policy:constraintPolicy});
  const appliedByIndex=new Map(resolution.effective.map(c=>[c._constraint_index,c]));
  const suppressedByIndex=new Map(resolution.suppressed.map(c=>[c._constraint_index,c]));
  const results=[];
  for(const c of resolution.all){
    const a=by.get(c.activity_id); let actual,ok;
    if(c.type==="START_ON_OR_AFTER"){actual=a.es;ok=actual>=c.slot-EPSILON;}
    else if(c.type==="START_ON_OR_BEFORE"){actual=a.es;ok=actual<=c.slot+EPSILON;}
    else if(c.type==="FINISH_ON_OR_AFTER"){actual=a.ef;ok=actual>=c.slot-EPSILON;}
    else if(c.type==="FINISH_ON_OR_BEFORE"){actual=a.ef;ok=actual<=c.slot+EPSILON;}
    else if(c.type==="MUST_START_ON"){actual=a.es;ok=Math.abs(actual-c.slot)<=EPSILON;}
    else {actual=a.ef;ok=Math.abs(actual-c.slot)<=EPSILON;}
    if(!Number.isFinite(actual)) throw new Error(`Calculated constraint point must be numeric for ${c.activity_id}`);
    const suppressed=suppressedByIndex.get(c._constraint_index);
    results.push({activity_id:c.activity_id,type:c.type,required_slot:c.slot,calculated_slot:actual,ok,variance:actual-c.slot,
      priority:c.priority??0,constraint_policy:resolution.policy,applied:appliedByIndex.has(c._constraint_index),suppressed:!!suppressed,
      suppressed_reason:suppressed?.suppressed_reason??null});
  }
  return results;
}
