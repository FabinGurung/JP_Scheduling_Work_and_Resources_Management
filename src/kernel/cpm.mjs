import {normalizeConstraints,constraintStartBounds,evaluateConstraintViolations} from "./constraints.mjs";

const REL_TYPES = new Set(["FS","SS","FF","SF"]);
const asId = a => a.activity_id ?? a.id;

export function scheduleNetwork({activities, relationships = [], constraints = [], requiredFinish = null}) {
  if (!Array.isArray(activities) || activities.length === 0) throw new Error("activities must be a non-empty array");
  const map = new Map();
  for (const raw of activities) {
    const id = asId(raw);
    if (!id) throw new Error("Every activity requires id or activity_id");
    if (map.has(id)) throw new Error(`Duplicate activity id: ${id}`);
    const duration = Number(raw.duration ?? raw.original_duration ?? 0);
    if (!Number.isFinite(duration) || duration < 0) throw new Error(`Invalid duration for ${id}`);
    map.set(id, {...raw,id,duration});
  }
  const normalizedConstraints=normalizeConstraints({activities:[...map.values()],constraints});
  const constraintsById=new Map([...map.keys()].map(id=>[id,[]]));
  for(const c of normalizedConstraints) constraintsById.get(c.activity_id).push(c);

  const incoming = new Map([...map.keys()].map(id=>[id,[]]));
  const outgoing = new Map([...map.keys()].map(id=>[id,[]]));
  for (const raw of relationships) {
    const predecessor=raw.predecessor ?? raw.predecessor_id;
    const successor=raw.successor ?? raw.successor_id;
    const type=String(raw.type ?? "FS").toUpperCase();
    const lag=Number(raw.lag ?? 0);
    if (!map.has(predecessor) || !map.has(successor)) throw new Error(`Relationship references unknown activity: ${predecessor} -> ${successor}`);
    if (!REL_TYPES.has(type)) throw new Error(`Unsupported relationship type: ${type}`);
    if (!Number.isFinite(lag)) throw new Error("Relationship lag must be numeric");
    const rel={predecessor,successor,type,lag};
    incoming.get(successor).push(rel); outgoing.get(predecessor).push(rel);
  }
  const indegree=new Map([...map.keys()].map(id=>[id,incoming.get(id).length]));
  const queue=[...map.keys()].filter(id=>indegree.get(id)===0), order=[];
  while(queue.length){
    const id=queue.shift(); order.push(id);
    for(const rel of outgoing.get(id)){const n=indegree.get(rel.successor)-1; indegree.set(rel.successor,n); if(n===0) queue.push(rel.successor);}
  }
  if(order.length!==map.size) throw new Error("Network contains a relationship cycle");
  const calc=new Map();
  for(const id of order){
    const a=map.get(id); let es=0;
    for(const rel of incoming.get(id)){
      const p=calc.get(rel.predecessor); let candidate=0;
      if(rel.type==="FS") candidate=p.ef+rel.lag;
      if(rel.type==="SS") candidate=p.es+rel.lag;
      if(rel.type==="FF") candidate=p.ef+rel.lag-a.duration;
      if(rel.type==="SF") candidate=p.es+rel.lag-a.duration;
      es=Math.max(es,candidate);
    }
    for(const c of constraintsById.get(id)){
      const b=constraintStartBounds(c,a.duration);
      if(b.min_start!=null) es=Math.max(es,b.min_start);
    }
    calc.set(id,{...a,es,ef:es+a.duration});
  }
  const earlyProjectFinish=Math.max(...[...calc.values()].map(a=>a.ef));
  const targetFinish=requiredFinish==null?earlyProjectFinish:Number(requiredFinish);
  if(!Number.isFinite(targetFinish)) throw new Error("requiredFinish must be numeric");
  for(const id of [...order].reverse()){
    const a=calc.get(id), successors=outgoing.get(id); let ls;
    if(successors.length===0) ls=targetFinish-a.duration;
    else ls=Math.min(...successors.map(rel=>{
      const s=calc.get(rel.successor);
      if(rel.type==="FS") return s.ls-rel.lag-a.duration;
      if(rel.type==="SS") return s.ls-rel.lag;
      if(rel.type==="FF") return s.lf-rel.lag-a.duration;
      return s.lf-rel.lag;
    }));
    for(const c of constraintsById.get(id)){
      const b=constraintStartBounds(c,a.duration);
      if(b.max_start!=null) ls=Math.min(ls,b.max_start);
    }
    a.ls=ls; a.lf=ls+a.duration;
  }
  for(const id of order){
    const a=calc.get(id), successors=outgoing.get(id); let ff;
    if(successors.length===0) ff=targetFinish-a.ef;
    else ff=Math.min(...successors.map(rel=>{
      const s=calc.get(rel.successor);
      if(rel.type==="FS") return s.es-a.ef-rel.lag;
      if(rel.type==="SS") return s.es-a.es-rel.lag;
      if(rel.type==="FF") return s.ef-a.ef-rel.lag;
      return s.ef-a.es-rel.lag;
    }));
    a.total_float=a.ls-a.es; a.free_float=ff; a.critical=a.total_float<=0;
  }
  const scheduledActivities=order.map(id=>({...calc.get(id)}));
  const constraintResults=evaluateConstraintViolations({scheduledActivities,constraints:normalizedConstraints});
  return {
    order,
    project:{early_finish:earlyProjectFinish,required_finish:targetFinish,finish_variance:earlyProjectFinish-targetFinish},
    activities:scheduledActivities,
    constraints:constraintResults
  };
}
