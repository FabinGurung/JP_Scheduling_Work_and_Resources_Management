import {assertNativeSchedulingSupported,normalizeActivity} from "./activities.mjs";
import {activityId,numeric} from "./validation.mjs";

const DAY=86400000;
const REL_TYPES=new Set(["FS","SS","FF","SF"]);
const CONSTRAINT_TYPES=new Set(["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"]);
const LAG_MODES=new Set(["PREDECESSOR","SUCCESSOR","PROJECT","EXPLICIT"]);

function utc(value){return new Date(`${value}T00:00:00Z`);}
function iso(date){return new Date(date).toISOString().slice(0,10);}
function validateIso(value,label){
  if(typeof value!=="string"||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) throw new Error(`${label} must be an ISO date`);
  const date=utc(value);
  if(!Number.isFinite(date.getTime())||iso(date)!==value) throw new Error(`${label} is not a real date`);
  return date;
}
function integer(value,label,{nonnegative=false}={}){
  const n=numeric(value,label,{nonnegative});
  if(!Number.isInteger(n)) throw new Error(`${label} must be an integer working-day value`);
  return n;
}
function diffDays(a,b){return Math.round((a.getTime()-b.getTime())/DAY);}
function addDays(date,days){return new Date(date.getTime()+days*DAY);}

export function createCalendarEngine({projectStart,horizonStart=projectStart,horizonEnd,calendars,projectCalendarId=null}){
  const origin=validateIso(projectStart,"projectStart");
  const first=validateIso(horizonStart,"horizonStart");
  const last=validateIso(horizonEnd,"horizonEnd");
  if(first>origin) throw new Error("horizonStart must be on or before projectStart");
  if(last<origin) throw new Error("horizonEnd must be on or after projectStart");
  const list=Array.isArray(calendars)?calendars:Object.entries(calendars??{}).map(([id,value])=>({id,...value}));
  if(!list.length) throw new Error("At least one calendar is required");
  const byId=new Map();
  for(const raw of list){
    const id=raw.id??raw.calendar_id;
    if(typeof id!=="string"||!id.trim()) throw new Error("Every calendar requires a nonempty id");
    if(byId.has(id)) throw new Error(`Duplicate calendar id: ${id}`);
    const weekdays=raw.working_weekdays??raw.workingWeekdays??[1,2,3,4,5];
    const holidays=raw.holidays??[];
    if(!Array.isArray(weekdays)||weekdays.length===0||weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)) throw new Error(`Invalid working weekdays for calendar ${id}`);
    if(!Array.isArray(holidays)) throw new Error(`holidays must be an array for calendar ${id}`);
    for(const h of holidays) validateIso(h,`Holiday in ${id}`);
    byId.set(id,{id,weekdays:new Set(weekdays),holidays:new Set(holidays)});
  }
  const projectId=projectCalendarId??list[0].id??list[0].calendar_id;
  if(!byId.has(projectId)) throw new Error(`Unknown project calendar: ${projectId}`);
  const minDay=diffDays(first,origin),maxDay=diffDays(last,origin),minEvent=minDay,maxEvent=maxDay+1;
  function calendar(id){const c=byId.get(id);if(!c) throw new Error(`Unknown calendar: ${id}`);return c;}
  function dateForDay(day){return iso(addDays(origin,day));}
  function point(value,label){
    if(typeof value==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(value)) return diffDays(validateIso(value,label),origin);
    return integer(value,label);
  }
  function isWorking(id,day){
    if(day<minDay||day>maxDay) return false;
    const c=calendar(id),d=addDays(origin,day),s=iso(d);
    return c.weekdays.has(d.getUTCDay())&&!c.holidays.has(s);
  }
  function ensureEvent(event,label){
    if(!Number.isInteger(event)||event<minEvent||event>maxEvent) throw new Error(`${label} is outside the declared scheduling horizon`);
  }
  function placeForward(calendarId,startEvent,duration){
    ensureEvent(startEvent,"Start event");
    const d=integer(duration,"Activity duration",{nonnegative:true});
    if(d===0) return {start:startEvent,finish:startEvent};
    let day=startEvent,remaining=d,actualStart=null;
    while(day<=maxDay){
      if(isWorking(calendarId,day)){
        if(actualStart==null) actualStart=day;
        remaining--;
        if(remaining===0) return {start:actualStart,finish:day+1};
      }
      day++;
    }
    throw new Error(`Scheduling horizon exhausted while placing ${d} working days on ${calendarId}`);
  }
  function shiftEvent(event,lag,calendarId){
    ensureEvent(event,"Lag anchor event");
    let remaining=Math.abs(integer(lag,"Relationship lag"));
    if(remaining===0) return event;
    if(lag>0){
      let day=event;
      while(day<=maxDay){
        if(isWorking(calendarId,day)&&--remaining===0) return day+1;
        day++;
      }
    }else{
      let day=event-1;
      while(day>=minDay){
        if(isWorking(calendarId,day)&&--remaining===0) return day;
        day--;
      }
    }
    throw new Error(`Lag shift exceeds the declared scheduling horizon on ${calendarId}`);
  }
  function eventDate(event){ensureEvent(event,"Event");return dateForDay(event);}
  function finishDate(finish,duration){
    const d=integer(duration,"Activity duration",{nonnegative:true});
    return eventDate(d===0?finish:finish-1);
  }
  return {origin,projectStart,projectCalendarId:projectId,calendarIds:[...byId.keys()],minDay,maxDay,minEvent,maxEvent,point,isWorking,placeForward,shiftEvent,eventDate,finishDate};
}

function normalizeActivities(activities,engine){
  if(!Array.isArray(activities)||activities.length===0) throw new Error("activities must be a non-empty array");
  const map=new Map();
  for(const raw of activities){
    const a=normalizeActivity(raw),id=a.id;
    assertNativeSchedulingSupported(a,"Calendar-aware scheduler");
    if(!Number.isInteger(a.duration)) throw new Error(`Calendar-aware duration for ${id} must be an integer number of working days`);
    if(map.has(id)) throw new Error(`Duplicate activity id: ${id}`);
    const calendar_id=a.calendar_id??engine.projectCalendarId;
    if(!engine.calendarIds.includes(calendar_id)) throw new Error(`Unknown calendar ${calendar_id} for activity ${id}`);
    map.set(id,{...a,calendar_id});
  }
  return map;
}

function normalizeConstraints(activities,constraints,engine){
  if(!Array.isArray(constraints)) throw new Error("constraints must be an array");
  const ids=new Set(activities.keys()),out=[];
  for(const raw of constraints){
    const activity_id=raw.activity_id??raw.id,type=String(raw.type??"").toUpperCase();
    if(!ids.has(activity_id)) throw new Error(`Constraint references unknown activity: ${activity_id}`);
    if(!CONSTRAINT_TYPES.has(type)) throw new Error(`Unsupported constraint type: ${type}`);
    if(raw.priority!=null||raw.calendar_id!=null) throw new Error("Constraint priority and per-constraint calendars are unsupported in the calendar-aware day model");
    const source=raw.slot??raw.date;
    const slot=engine.point(source,`Constraint point for ${activity_id}`);
    out.push({...raw,activity_id,type,slot});
  }
  return out;
}

function normalizeRelationships(map,relationships,engine){
  if(!Array.isArray(relationships)) throw new Error("relationships must be an array");
  const out=[];
  for(const raw of relationships){
    const predecessor=raw.predecessor??raw.predecessor_id,successor=raw.successor??raw.successor_id;
    const type=String(raw.type??"FS").toUpperCase();
    if(!map.has(predecessor)||!map.has(successor)) throw new Error(`Relationship references unknown activity: ${predecessor} -> ${successor}`);
    if(!REL_TYPES.has(type)) throw new Error(`Unsupported relationship type: ${type}`);
    const lag=integer(raw.lag??0,"Relationship lag");
    let lag_calendar_mode=String(raw.lag_calendar_mode??(raw.lag_calendar_id!=null?"EXPLICIT":"PREDECESSOR")).toUpperCase();
    if(!LAG_MODES.has(lag_calendar_mode)) throw new Error(`Unsupported lag calendar mode: ${lag_calendar_mode}`);
    if(lag_calendar_mode==="EXPLICIT"&&raw.lag_calendar_id==null) throw new Error("EXPLICIT lag calendar mode requires lag_calendar_id");
    const pred=map.get(predecessor),succ=map.get(successor);
    const resolved=lag_calendar_mode==="PREDECESSOR"?pred.calendar_id:
      lag_calendar_mode==="SUCCESSOR"?succ.calendar_id:
      lag_calendar_mode==="PROJECT"?engine.projectCalendarId:raw.lag_calendar_id;
    if(lag_calendar_mode!=="EXPLICIT"&&raw.lag_calendar_id!=null&&!raw.resolved_lag_calendar) throw new Error("lag_calendar_id requires EXPLICIT lag calendar mode");
    if(raw.resolved_lag_calendar&&raw.lag_calendar_id!==resolved) throw new Error("Resolved lag calendar no longer matches its declared mode");
    const lag_calendar_id=resolved;
    if(!engine.calendarIds.includes(lag_calendar_id)) throw new Error(`Unknown lag calendar: ${lag_calendar_id}`);
    out.push({...raw,predecessor,successor,type,lag,lag_calendar_mode,lag_calendar_id,resolved_lag_calendar:true});
  }
  return out;
}

function topo(map,rels){
  const incoming=new Map([...map.keys()].map(id=>[id,[]])),outgoing=new Map([...map.keys()].map(id=>[id,[]]));
  for(const rel of rels){incoming.get(rel.successor).push(rel);outgoing.get(rel.predecessor).push(rel);}
  const indegree=new Map([...map.keys()].map(id=>[id,incoming.get(id).length]));
  const queue=[...map.keys()].filter(id=>indegree.get(id)===0),order=[];
  while(queue.length){const id=queue.shift();order.push(id);for(const rel of outgoing.get(id)){const n=indegree.get(rel.successor)-1;indegree.set(rel.successor,n);if(n===0)queue.push(rel.successor);}}
  if(order.length!==map.size) throw new Error("Network contains a relationship cycle");
  return {incoming,outgoing,order};
}

function relationSatisfied(rel,pred,succ,engine){
  const anchor=rel.type==="FS"||rel.type==="FF"?pred.finish:pred.start;
  const required=engine.shiftEvent(anchor,rel.lag,rel.lag_calendar_id);
  const actual=rel.type==="FS"||rel.type==="SS"?succ.start:succ.finish;
  return actual>=required;
}
function forwardConstraintSatisfied(c,p){
  if(c.type==="START_ON_OR_AFTER"||c.type==="MUST_START_ON") return p.start>=c.slot;
  if(c.type==="FINISH_ON_OR_AFTER"||c.type==="MUST_FINISH_ON") return p.finish>=c.slot;
  return true;
}
function backwardConstraintSatisfied(c,p){
  if(c.type==="START_ON_OR_BEFORE"||c.type==="MUST_START_ON") return p.start<=c.slot;
  if(c.type==="FINISH_ON_OR_BEFORE"||c.type==="MUST_FINISH_ON") return p.finish<=c.slot;
  return true;
}
export function evaluateCalendarConstraints({scheduledActivities,constraints=[],projectStart,horizonStart=projectStart,horizonEnd,calendars,projectCalendarId=null}){
  const engine=createCalendarEngine({projectStart,horizonStart,horizonEnd,calendars,projectCalendarId});
  const map=normalizeActivities(scheduledActivities,engine),normalized=normalizeConstraints(map,constraints,engine);
  const points=new Map(scheduledActivities.map(a=>[activityId(a),{start:a.es??a.start,finish:a.ef??a.finish}]));
  return normalized.map(c=>{
    const p=points.get(c.activity_id);if(!p||!Number.isInteger(p.start)||!Number.isInteger(p.finish)) throw new Error(`Calculated calendar points missing for ${c.activity_id}`);
    let actual,ok;
    if(c.type==="START_ON_OR_AFTER"){actual=p.start;ok=actual>=c.slot;}
    else if(c.type==="START_ON_OR_BEFORE"){actual=p.start;ok=actual<=c.slot;}
    else if(c.type==="FINISH_ON_OR_AFTER"){actual=p.finish;ok=actual>=c.slot;}
    else if(c.type==="FINISH_ON_OR_BEFORE"){actual=p.finish;ok=actual<=c.slot;}
    else if(c.type==="MUST_START_ON"){actual=p.start;ok=actual===c.slot;}
    else{actual=p.finish;ok=actual===c.slot;}
    return {activity_id:c.activity_id,type:c.type,required_slot:c.slot,required_date:engine.eventDate(c.slot),calculated_slot:actual,calculated_date:engine.eventDate(actual),ok,variance:actual-c.slot};
  });
}

export function scheduleCalendarNetwork({activities,relationships=[],constraints=[],calendars,projectStart,horizonStart=projectStart,horizonEnd,projectCalendarId=null,requiredFinish=null,notBefore=0}){
  const engine=createCalendarEngine({projectStart,horizonStart,horizonEnd,calendars,projectCalendarId});
  const map=normalizeActivities(activities,engine),rels=normalizeRelationships(map,relationships,engine),normalizedConstraints=normalizeConstraints(map,constraints,engine);
  const constraintsById=new Map([...map.keys()].map(id=>[id,[]]));for(const c of normalizedConstraints)constraintsById.get(c.activity_id).push(c);
  const {incoming,outgoing,order}=topo(map,rels);
  const floor=Math.max(engine.point(notBefore,"notBefore"),engine.minEvent),early=new Map();
  for(const id of order){
    const a=map.get(id);let chosen=null,lastStart=null;
    for(let candidate=floor;candidate<=engine.maxEvent;candidate++){
      let p;try{p=engine.placeForward(a.calendar_id,candidate,a.duration);}catch{break;}
      if(p.start===lastStart) continue;lastStart=p.start;
      if(incoming.get(id).every(rel=>relationSatisfied(rel,early.get(rel.predecessor),p,engine))&&constraintsById.get(id).every(c=>forwardConstraintSatisfied(c,p))){chosen=p;break;}
    }
    if(!chosen) throw new Error(`No feasible early placement for activity ${id} within the declared horizon`);
    early.set(id,chosen);
  }
  const earlyFinish=Math.max(...[...early.values()].map(p=>p.finish));
  const target=requiredFinish==null?earlyFinish:engine.point(requiredFinish,"requiredFinish");
  if(target<engine.minEvent||target>engine.maxEvent) throw new Error("requiredFinish is outside the declared scheduling horizon");
  const late=new Map();
  for(const id of [...order].reverse()){
    const a=map.get(id);let chosen=null,lastStart=null;
    for(let candidate=Math.min(target,engine.maxEvent);candidate>=engine.minEvent;candidate--){
      let p;try{p=engine.placeForward(a.calendar_id,candidate,a.duration);}catch{continue;}
      if(p.start===lastStart) continue;lastStart=p.start;
      if(p.finish>target) continue;
      if(!outgoing.get(id).every(rel=>relationSatisfied(rel,p,late.get(rel.successor),engine))) continue;
      if(!constraintsById.get(id).every(c=>backwardConstraintSatisfied(c,p))) continue;
      chosen=p;break;
    }
    if(!chosen) throw new Error(`No feasible late placement for activity ${id} within the declared horizon; extend horizonStart to inspect larger negative float`);
    late.set(id,chosen);
  }
  const rows=order.map(id=>{
    const a=map.get(id),e=early.get(id),l=late.get(id);
    let latestFree=e.start,lastStart=null;
    for(let candidate=e.start;candidate<=engine.maxEvent;candidate++){
      let p;try{p=engine.placeForward(a.calendar_id,candidate,a.duration);}catch{break;}
      if(p.start===lastStart) continue;lastStart=p.start;
      if(p.finish>target) break;
      if(outgoing.get(id).every(rel=>relationSatisfied(rel,p,early.get(rel.successor),engine))) latestFree=p.start;else break;
    }
    return {...a,es:e.start,ef:e.finish,ls:l.start,lf:l.finish,total_float:l.start-e.start,free_float:latestFree-e.start,critical:l.start-e.start<=0,
      start_date:engine.eventDate(e.start),finish_date:engine.finishDate(e.finish,a.duration),late_start_date:engine.eventDate(l.start),late_finish_date:engine.finishDate(l.finish,a.duration)};
  });
  const checks=evaluateCalendarConstraints({scheduledActivities:rows,constraints:normalizedConstraints,projectStart,horizonStart,horizonEnd,calendars,projectCalendarId:engine.projectCalendarId});
  return {time_model:"CIVIL_DAY_EVENTS_WITH_ACTIVITY_WORKING_DAY_DURATION",time_origin_date:projectStart,order,relationships:rels,
    project:{early_finish:earlyFinish,early_finish_date:engine.eventDate(earlyFinish),required_finish:target,required_finish_date:engine.eventDate(target),finish_variance:earlyFinish-target},activities:rows,constraints:checks};
}

function readUpdatePoint(update,slotField,dateField,engine,label){
  const value=update[slotField]??update[dateField];
  return value==null?null:engine.point(value,label);
}
function statusRowsFor(source,updates,dataDate,engine){
  const ids=new Set(source.map(a=>a.id));
  for(const id of Object.keys(updates??{})){if(!ids.has(id)) throw new Error(`Status update references unknown activity: ${id}`);if(!updates[id]||typeof updates[id]!=="object"||Array.isArray(updates[id])) throw new Error(`Invalid status update for ${id}`);}
  return source.map(a=>{
    const u=updates?.[a.id]??{};
    const actual_start_slot=readUpdatePoint(u,"actual_start_slot","actual_start_date",engine,`actual start for ${a.id}`);
    const actual_finish_slot=readUpdatePoint(u,"actual_finish_slot","actual_finish_date",engine,`actual finish for ${a.id}`);
    const suspend_slot=readUpdatePoint(u,"suspend_slot","suspend_date",engine,`suspend point for ${a.id}`);
    const resume_slot=readUpdatePoint(u,"resume_slot","resume_date",engine,`resume point for ${a.id}`);
    if(actual_finish_slot!=null&&actual_start_slot==null) throw new Error(`Activity ${a.id} requires actual start when actual finish is supplied`);
    if(actual_start_slot!=null&&actual_start_slot>dataDate) throw new Error(`Invalid status data for ${a.id}: ACTUAL_START_AFTER_DATA_DATE`);
    if(actual_finish_slot!=null&&actual_finish_slot>dataDate) throw new Error(`Invalid status data for ${a.id}: ACTUAL_FINISH_AFTER_DATA_DATE`);
    if(actual_start_slot!=null&&actual_finish_slot!=null&&actual_finish_slot<actual_start_slot) throw new Error(`Invalid status data for ${a.id}: ACTUAL_FINISH_BEFORE_ACTUAL_START`);
    const status=actual_finish_slot!=null?"COMPLETED":actual_start_slot!=null?"IN_PROGRESS":"NOT_STARTED";
    let remaining_duration=u.remaining_duration==null?null:integer(u.remaining_duration,`remaining_duration for ${a.id}`,{nonnegative:true});
    if(status==="IN_PROGRESS"&&remaining_duration==null) throw new Error(`Invalid status data for ${a.id}: REMAINING_DURATION_REQUIRED`);
    if(status==="COMPLETED"&&remaining_duration!=null&&remaining_duration!==0) throw new Error(`Invalid status data for ${a.id}: COMPLETED_REMAINING_DURATION_NONZERO`);
    const suspendResumePaired=(suspend_slot==null)===(resume_slot==null);
    const hasSuspendResume=suspend_slot!=null&&resume_slot!=null;
    if(!suspendResumePaired) throw new Error(`Invalid status data for ${a.id}: SUSPEND_RESUME_PAIR_REQUIRED`);
    if(hasSuspendResume&&status!=="IN_PROGRESS") throw new Error(`Invalid status data for ${a.id}: SUSPEND_RESUME_REQUIRES_IN_PROGRESS`);
    if(hasSuspendResume&&a.milestone) throw new Error(`Invalid status data for ${a.id}: MILESTONE_SUSPEND_RESUME_UNSUPPORTED`);
    if(hasSuspendResume&&actual_start_slot!=null&&suspend_slot<actual_start_slot) throw new Error(`Invalid status data for ${a.id}: SUSPEND_BEFORE_ACTUAL_START`);
    if(hasSuspendResume&&suspend_slot>dataDate) throw new Error(`Invalid status data for ${a.id}: SUSPEND_AFTER_DATA_DATE`);
    if(hasSuspendResume&&resume_slot<suspend_slot) throw new Error(`Invalid status data for ${a.id}: RESUME_BEFORE_SUSPEND`);
    if(a.milestone&&(actual_start_slot!=null||actual_finish_slot!=null)&&(actual_start_slot==null||actual_finish_slot==null||actual_start_slot!==actual_finish_slot)) throw new Error(`Invalid status data for ${a.id}: MILESTONE_ACTUALS_MUST_MATCH`);
    if(status==="NOT_STARTED") remaining_duration=a.duration;
    if(status==="COMPLETED") remaining_duration=0;
    return {activity_id:a.id,status,actual_start_slot,actual_finish_slot,remaining_duration,suspend_slot,resume_slot,
      suspended_at_data_date:hasSuspendResume&&resume_slot>dataDate,issues:status==="NOT_STARTED"&&(a.es??0)<dataDate?["SHOULD_HAVE_STARTED"]:[]};
  });
}

export function rescheduleCalendarRemaining({scheduledActivities,relationships=[],constraints=[],updates={},dataDate,requiredFinish=null,calendars,projectStart,horizonStart=projectStart,horizonEnd,projectCalendarId=null}){
  if(!Array.isArray(scheduledActivities)) throw new Error("scheduledActivities must be an array");
  const engine=createCalendarEngine({projectStart,horizonStart,horizonEnd,calendars,projectCalendarId});
  const dataDateSlot=engine.point(dataDate,"dataDate");if(dataDateSlot<0) throw new Error("dataDate must not precede projectStart");
  const sourceMap=normalizeActivities(scheduledActivities,engine),source=[...sourceMap.values()];
  const rels=normalizeRelationships(sourceMap,relationships,engine),normConstraints=normalizeConstraints(sourceMap,constraints,engine);
  topo(sourceMap,rels);
  const statuses=statusRowsFor(source,updates,dataDateSlot,engine),byStatus=new Map(statuses.map(s=>[s.activity_id,s]));
  const incomplete=source.filter(a=>byStatus.get(a.id).status!=="COMPLETED");
  const required=requiredFinish==null?null:engine.point(requiredFinish,"requiredFinish");
  function finalize(schedule,boundaryConstraints){
    const byForecast=new Map((schedule?.activities??[]).map(a=>[a.id,a]));
    const points=source.map(a=>{const st=byStatus.get(a.id),f=byForecast.get(a.id);return {...a,es:st.actual_start_slot??f?.es,ef:st.actual_finish_slot??f?.ef};});
    const checks=evaluateCalendarConstraints({scheduledActivities:points,constraints:normConstraints,projectStart,horizonStart,horizonEnd,calendars,projectCalendarId:engine.projectCalendarId}).map(c=>{
      const st=byStatus.get(c.activity_id),isStart=c.type.startsWith("START")||c.type==="MUST_START_ON";
      const actual=isStart?st.actual_start_slot:st.actual_finish_slot;
      return {...c,status:st.status,basis:(actual!=null?"ACTUAL_":"FORECAST_")+(isStart?"START":"FINISH")};
    });
    const finishes=points.map(p=>p.ef).filter(Number.isInteger),forecastFinish=finishes.length?Math.max(...finishes):null;
    return {time_model:"CIVIL_DAY_EVENTS_WITH_ACTIVITY_WORKING_DAY_DURATION",data_date_slot:dataDateSlot,data_date:engine.eventDate(dataDateSlot),status:statuses,remaining_schedule:schedule,
      forecast:(schedule?.activities??[]).map(a=>({...a,forecast_start_slot:a.es,forecast_finish_slot:a.ef,forecast_late_start_slot:a.ls,forecast_late_finish_slot:a.lf})),boundary_constraints:boundaryConstraints,constraints:checks,
      project:{forecast_finish_slot:forecastFinish,forecast_finish_date:forecastFinish==null?null:engine.eventDate(forecastFinish),required_finish_slot:required,required_finish_date:required==null?null:engine.eventDate(required),finish_variance:forecastFinish==null||required==null?null:forecastFinish-required}};
  }
  if(incomplete.length===0) return finalize(null,[]);
  const remActs=incomplete.map(a=>({...a,duration:byStatus.get(a.id).status==="IN_PROGRESS"?byStatus.get(a.id).remaining_duration:a.duration}));
  const remIds=new Set(remActs.map(a=>a.id)),remRels=[],boundaryConstraints=[],generated=[];
  for(const st of statuses){
    if(st.status==="IN_PROGRESS"&&st.suspended_at_data_date){
      generated.push({activity_id:st.activity_id,type:"START_ON_OR_AFTER",slot:st.resume_slot,source:"SUSPEND_RESUME"});
      boundaryConstraints.push({predecessor:null,successor:st.activity_id,type:"SUSPEND_RESUME",lag:0,
        bound_type:"START_ON_OR_AFTER",required_slot:st.resume_slot,required_date:engine.eventDate(st.resume_slot),source:"SUSPEND_RESUME"});
    }
  }
  for(const rel of rels){
    const ps=byStatus.get(rel.predecessor),ss=byStatus.get(rel.successor);
    if(ss.status==="COMPLETED") continue;
    const startedStartRelation=ps.status==="IN_PROGRESS"&&(rel.type==="SS"||rel.type==="SF");
    if(ps.status==="COMPLETED"||startedStartRelation){
      if(ss.status==="IN_PROGRESS"&&(rel.type==="FS"||rel.type==="SS")) continue;
      const anchor=(rel.type==="FS"||rel.type==="FF")?ps.actual_finish_slot:ps.actual_start_slot;
      if(anchor==null) throw new Error(`${ps.status==="COMPLETED"?"Completed":"In-progress"} predecessor ${rel.predecessor} lacks required actual point for ${rel.type}`);
      const point=engine.shiftEvent(anchor,rel.lag,rel.lag_calendar_id);
      const type=rel.type==="FS"||rel.type==="SS"?"START_ON_OR_AFTER":"FINISH_ON_OR_AFTER";
      generated.push({activity_id:rel.successor,type,slot:point});
      boundaryConstraints.push({predecessor:rel.predecessor,successor:rel.successor,type:rel.type,lag:rel.lag,lag_calendar_mode:rel.lag_calendar_mode,lag_calendar_id:rel.lag_calendar_id,bound_type:type,required_slot:point,required_date:engine.eventDate(point),source:startedStartRelation?"IN_PROGRESS_PREDECESSOR_ACTUAL_START":"COMPLETED_PREDECESSOR_ACTUAL"});
      continue;
    }
    if(remIds.has(rel.predecessor)&&remIds.has(rel.successor)){
      if(ss.status==="IN_PROGRESS"&&(rel.type==="FS"||rel.type==="SS")) continue;
      remRels.push(rel);
    }
  }
  const applicable=normConstraints.filter(c=>{const st=byStatus.get(c.activity_id);const isStart=c.type.startsWith("START")||c.type==="MUST_START_ON";return st.status!=="COMPLETED"&&!(st.status==="IN_PROGRESS"&&isStart);});
  const schedule=scheduleCalendarNetwork({activities:remActs,relationships:remRels,constraints:[...applicable,...generated],calendars,projectStart,horizonStart,horizonEnd,projectCalendarId:engine.projectCalendarId,requiredFinish:required,notBefore:dataDateSlot});
  return finalize(schedule,boundaryConstraints);
}
