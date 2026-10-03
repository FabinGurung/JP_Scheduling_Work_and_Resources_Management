const TYPES=new Set(["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"]);

export function evaluateConstraintViolations({scheduledActivities,constraints=[]}){
  const by=new Map(scheduledActivities.map(a=>[a.id??a.activity_id,a]));
  const results=[];
  for(const c of constraints){
    const id=c.activity_id??c.id, type=String(c.type??"").toUpperCase(), slot=Number(c.slot);
    if(!by.has(id)) throw new Error(`Constraint references unknown activity: ${id}`);
    if(!TYPES.has(type)) throw new Error(`Unsupported constraint type: ${type}`);
    if(!Number.isFinite(slot)) throw new Error(`Constraint slot must be numeric for ${id}`);
    const a=by.get(id); let actual,ok;
    if(type==="START_ON_OR_AFTER"){actual=a.es;ok=actual>=slot;}
    else if(type==="START_ON_OR_BEFORE"){actual=a.es;ok=actual<=slot;}
    else if(type==="FINISH_ON_OR_AFTER"){actual=a.ef;ok=actual>=slot;}
    else if(type==="FINISH_ON_OR_BEFORE"){actual=a.ef;ok=actual<=slot;}
    else if(type==="MUST_START_ON"){actual=a.es;ok=actual===slot;}
    else {actual=a.ef;ok=actual===slot;}
    results.push({activity_id:id,type,required_slot:slot,calculated_slot:actual,ok,variance:actual-slot});
  }
  return results;
}
