// Seq14: bounded serial multi-activity resource leveling, independent of Seq13 placement.
import {resolveResourceDependentAvailability} from "./resource-scheduler.mjs";

const REL_TYPES=new Set(["FS","SS","FF","SF"]);
const LAG_MODES=new Set(["PREDECESSOR","SUCCESSOR","PROJECT","EXPLICIT"]);
const EPS=1e-9;
const cmp=(a,b)=>a<b?-1:a>b?1:0;

function int(v,label){
  if(typeof v==="boolean"||v===null||v===""||!Number.isInteger(Number(v)))
    throw new Error(label+" must be an integer");
  return Number(v);
}
function rejectActuals(raw){
  const keys=["actual_start","actual_finish","actual_start_slot","actual_finish_slot",
    "actual_start_date","actual_finish_date","remaining_duration","suspend_slot",
    "resume_slot","suspend_date","resume_date"];
  for(const k of keys)if(raw[k]!=null)throw new Error("Seq14 leveling does not move actual/progress data; unsupported "+k+" for "+raw.id);
  if(raw.status!=null&&String(raw.status).toUpperCase()!=="NOT_STARTED")
    throw new Error("Seq14 leveling requires NOT_STARTED activities; actual/progress data must remain immutable");
}
function supply(state,id,day){
  const r=state.resources.get(id);
  let n=r.inventory_quantity;
  for(const receipt of state.receipts)if(receipt.resource_id===id&&receipt.slot<=day)n+=receipt.quantity;
  return n;
}
function materialPossible(state,id,day,qty,existing,tentative){
  const committed=existing.get(id)??new Map(),within=tentative.get(id)??new Map();
  const days=new Set([day,...committed.keys(),...within.keys()]);
  let cumulative=0;
  for(const slot of [...days].sort((a,b)=>a-b)){
    cumulative+=(committed.get(slot)??0)+(within.get(slot)??0)+(slot===day?qty:0);
    if(cumulative>supply(state,id,slot)+EPS)return false;
  }
  return true;
}
function add(map,id,slot,qty){
  if(!map.has(id))map.set(id,new Map());
  const byDay=map.get(id);byDay.set(slot,(byDay.get(slot)??0)+qty);
}
function feasiblePlacement(state,notBefore,renewableUsage,materialUsage){
  const {activity,duration,engine}=state;
  if(notBefore<engine.minEvent||notBefore>engine.maxEvent)
    throw new Error("Activity "+activity.id+" bound outside declared horizon");
  if(duration===0)return {start:notBefore,finish:notBefore,work_slots:[],conflicts:[]};
  const tentative=new Map(),work=[],conflicts=[];
  for(let slot=notBefore;slot<=engine.maxDay;slot++){
    if(!state.required_calendar_ids.every(c=>engine.isWorking(c,slot)))continue;
    let failed=false;
    for(const [id,units] of state.renewable){
      const fixed=state.reservations.get(id+"@"+slot)??0;
      const allocated=renewableUsage.get(id)?.get(slot)??0;
      if(units+fixed+allocated>state.resources.get(id).max_units+EPS){
        conflicts.push({slot,resource_id:id,reason:allocated>0?"SHARED_RENEWABLE_CAPACITY":"FIXED_RESERVATION_OR_CAPACITY"});
        failed=true;
      }
    }
    if(failed)continue;
    for(const [id,p] of state.materials){
      if(!materialPossible(state,id,slot,p.per_slot,materialUsage,tentative)){
        conflicts.push({slot,resource_id:id,reason:"MATERIAL_STOCK_OR_RECEIPT"});
        failed=true;
      }
    }
    if(failed)continue;
    work.push(slot);
    for(const [id,p] of state.materials)add(tentative,id,slot,p.per_slot);
    if(work.length===duration)return {start:work[0],finish:slot+1,work_slots:work,conflicts};
  }
  throw new Error("Resource/material availability horizon exhausted for RESOURCE_DEPENDENT activity "+activity.id);
}
function normalizeLinks(relationships,states){
  if(!Array.isArray(relationships))throw new Error("relationships must be an array");
  const edges=[],seen=new Set();
  for(const row of relationships){
    const predecessor=row.predecessor??row.predecessor_id,successor=row.successor??row.successor_id;
    if(!states.has(predecessor)||!states.has(successor)||predecessor===successor)
      throw new Error("Invalid or unknown relationship endpoint: "+predecessor+" -> "+successor);
    const type=String(row.type??"FS").toUpperCase();
    if(!REL_TYPES.has(type))throw new Error("Unsupported relationship type: "+type);
    const lag=int(row.lag??0,"Relationship lag");
    const mode=String(row.lag_calendar_mode??(row.lag_calendar_id==null?"PREDECESSOR":"EXPLICIT")).toUpperCase();
    if(!LAG_MODES.has(mode))throw new Error("Unsupported lag calendar mode: "+mode);
    if(mode!=="EXPLICIT"&&row.lag_calendar_id!=null)
      throw new Error("lag_calendar_id requires EXPLICIT lag calendar mode");
    if(mode==="EXPLICIT"&&!row.lag_calendar_id)throw new Error("EXPLICIT lag calendar requires lag_calendar_id");
    const key=[predecessor,successor,type,lag,mode,row.lag_calendar_id??""].join("|");
    if(seen.has(key))throw new Error("Duplicate relationship: "+key);
    seen.add(key);
    const pred=states.get(predecessor),succ=states.get(successor),engine=pred.engine;
    const cal=mode==="PROJECT"?engine.projectCalendarId:
      mode==="PREDECESSOR"?(pred.activity.calendar_id??engine.projectCalendarId):
      mode==="SUCCESSOR"?(succ.activity.calendar_id??engine.projectCalendarId):row.lag_calendar_id;
    if(!engine.calendarIds.includes(cal))throw new Error("Unknown lag calendar: "+cal);
    edges.push({predecessor,successor,type,lag,lag_calendar_mode:mode,lag_calendar_id:cal});
  }
  return edges.sort((a,b)=>cmp(a.successor,b.successor)||cmp(a.predecessor,b.predecessor)||cmp(a.type,b.type)||a.lag-b.lag);
}
function topology(ids,edges){
  const order=[],done=new Set();
  while(order.length<ids.length){
    const eligible=ids.filter(id=>!done.has(id)&&edges.every(e=>e.successor!==id||done.has(e.predecessor)));
    if(!eligible.length)throw new Error("Cyclic resource-leveling relationship network");
    const id=eligible.sort(cmp)[0];
    done.add(id);order.push(id);
  }
  return order;
}
function boundFor(id,links,placed,state){
  const engine=state.engine;
  let earliest=engine.point(state.activity.notBefore??state.activity.not_before??engine.minEvent,"notBefore for "+id);
  let minimumFinish=engine.minEvent;
  for(const edge of links){
    if(edge.successor!==id)continue;
    const prior=placed.get(edge.predecessor);
    if(!prior)throw new Error("Unresolved predecessor "+edge.predecessor);
    const anchor=edge.type==="FS"||edge.type==="FF"?prior.finish:prior.start;
    const required=engine.shiftEvent(anchor,edge.lag,edge.lag_calendar_id);
    if(edge.type==="FS"||edge.type==="SS")earliest=Math.max(earliest,required);
    else minimumFinish=Math.max(minimumFinish,required);
  }
  return {earliest,minimumFinish};
}
function choosePlacement(state,bound,renewable,materials){
  for(let candidate=bound.earliest;candidate<=state.engine.maxEvent;candidate++){
    const result=feasiblePlacement(state,candidate,renewable,materials);
    if(result.finish>=bound.minimumFinish)return result;
  }
  throw new Error("Relationship finish bound exceeds horizon for "+state.activity.id);
}

/**
 * Bounded deterministic serial schedule-generation scheme. No global optimum is claimed.
 * Only unstarted RESOURCE_DEPENDENT work with FS/SS/FF/SF precedence and signed day lag.
 * Unsupported constraints, actual work, mixed activity types and intraday modes fail closed.
 */
export function levelResourceDependentNetwork(input={}){
  const {activities,relationships=[],constraints=[],resources=[],crews=[],assignments=[]}=input;
  if(!Array.isArray(activities)||activities.length===0)
    throw new Error("activities must be a nonempty array");
  if(!Array.isArray(constraints)||constraints.length)
    throw new Error("Seq14 serial resource leveling does not yet implement date constraints");
  if(input.dataDate!=null||input.dataDateSlot!=null||input.data_date!=null)
    throw new Error("Seq14 serial resource leveling does not yet implement data-date rescheduling");
  if(input.levelingPolicy!=null&&input.levelingPolicy!=="SERIAL_TOPOLOGICAL_ID")
    throw new Error("Unsupported leveling policy");
  if(!Array.isArray(assignments))throw new Error("assignments must be an array");
  const states=new Map();
  for(const raw of activities){
    if(!raw||typeof raw!=="object")throw new Error("Invalid activity");
    rejectActuals(raw);
    const state=resolveResourceDependentAvailability({...input,activity:raw,resources,crews,assignments});
    const id=state.activity.id;
    if(states.has(id))throw new Error("Duplicate activity id: "+id);
    states.set(id,state);
  }
  for(const row of assignments){
    if(!states.has(row.activity_id??row.activityId))
      throw new Error("Assignment references unknown activity: "+(row.activity_id??row.activityId));
  }
  const links=normalizeLinks(relationships,states);
  const order=topology([...states.keys()].sort(cmp),links);
  const renewable=new Map(),materials=new Map(),placed=new Map(),diagnostics=[];
  for(const id of order){
    const state=states.get(id),bound=boundFor(id,links,placed,state);
    const baseline=choosePlacement(state,bound,new Map(),new Map());
    const selected=choosePlacement(state,bound,renewable,materials);
    const delayed=selected.start>baseline.start;
    const conflictDays=selected.conflicts.filter(c=>c.reason==="SHARED_RENEWABLE_CAPACITY"||c.reason==="MATERIAL_STOCK_OR_RECEIPT");
    const result={
      activity_id:id,activity_type:state.activity.activity_type,start:selected.start,finish:selected.finish,
      start_date:state.engine.eventDate(selected.start),
      finish_date:state.engine.eventDate(selected.work_slots.length?selected.work_slots.at(-1):selected.finish),
      finish_event_date:state.engine.eventDate(selected.finish),
      work_slots:selected.work_slots,required_calendar_ids:state.required_calendar_ids,
      renewable_demand:Object.fromEntries(state.renewable),
      material_consumption:Object.fromEntries([...state.materials].map(([rid,p])=>[rid,p.per_slot*state.duration])),
      network_reference_start:baseline.start,
      leveling_delay_days:selected.start-baseline.start,
      leveling_delayed:delayed,
      resource_leveling_applied:true,
      scheduling_policy:"SERIAL_TOPOLOGICAL_ID"
    };
    placed.set(id,result);
    for(const slot of selected.work_slots){
      for(const [rid,units] of state.renewable)add(renewable,rid,slot,units);
      for(const [rid,p] of state.materials)add(materials,rid,slot,p.per_slot);
    }
    if(delayed)diagnostics.push({activity_id:id,code:"RESOURCE_LEVELING_DELAY",network_reference_start:baseline.start,
      leveled_start:selected.start,delay_civil_days:selected.start-baseline.start,
      conflicts:conflictDays});
  }
  return {
    policy:"SERIAL_TOPOLOGICAL_ID",resolution:"DAY",resource_leveling_applied:true,
    optimality_claim:"NONE",order,activities:order.map(id=>placed.get(id)),
    diagnostics,resource_allocations:[...renewable].flatMap(([id,slots])=>[...slots].map(([slot,units])=>({resource_id:id,slot,units})))
      .sort((a,b)=>a.slot-b.slot||cmp(a.resource_id,b.resource_id)),
    material_allocations:[...materials].flatMap(([id,slots])=>[...slots].map(([slot,quantity])=>({resource_id:id,slot,quantity})))
      .sort((a,b)=>a.slot-b.slot||cmp(a.resource_id,b.resource_id))
  };
}
