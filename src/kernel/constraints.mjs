const TYPES=new Set(["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"]);

function activityId(a){return a.id??a.activity_id;}

export function normalizeConstraints({activities=[],constraints=[]}){
  const ids=new Set(activities.map(activityId));
  const normalized=[];
  for(const raw of constraints){
    const activity_id=raw.activity_id??raw.id;
    const type=String(raw.type??"").toUpperCase();
    const slot=Number(raw.slot);
    if(!ids.has(activity_id)) throw new Error(`Constraint references unknown activity: ${activity_id}`);
    if(!TYPES.has(type)) throw new Error(`Unsupported constraint type: ${type}`);
    if(!Number.isFinite(slot)) throw new Error(`Constraint slot must be numeric for ${activity_id}`);
    normalized.push({...raw,activity_id,type,slot});
  }
  return normalized;
}

export function constraintStartBounds(constraint,duration){
  const d=Number(duration);
  if(!Number.isFinite(d)||d<0) throw new Error(`Invalid duration for constraint ${constraint.activity_id}`);
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
  const by=new Map(scheduledActivities.map(a=>[a.id??a.activity_id,a]));
  const normalized=normalizeConstraints({activities:scheduledActivities,constraints});
  const results=[];
  for(const c of normalized){
    const a=by.get(c.activity_id); let actual,ok;
    if(c.type==="START_ON_OR_AFTER"){actual=a.es;ok=actual>=c.slot;}
    else if(c.type==="START_ON_OR_BEFORE"){actual=a.es;ok=actual<=c.slot;}
    else if(c.type==="FINISH_ON_OR_AFTER"){actual=a.ef;ok=actual>=c.slot;}
    else if(c.type==="FINISH_ON_OR_BEFORE"){actual=a.ef;ok=actual<=c.slot;}
    else if(c.type==="MUST_START_ON"){actual=a.es;ok=actual===c.slot;}
    else {actual=a.ef;ok=actual===c.slot;}
    results.push({activity_id:c.activity_id,type:c.type,required_slot:c.slot,calculated_slot:actual,ok,variance:actual-c.slot});
  }
  return results;
}
