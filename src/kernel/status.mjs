import {scheduleNetwork} from "./cpm.mjs";
import {normalizeConstraints,evaluateConstraintViolations} from "./constraints.mjs";
import {normalizeActivity} from "./activities.mjs";
import {activityId,numeric} from "./validation.mjs";
import {inspectProgress} from "./qa.mjs";

const REL_TYPES=new Set(["FS","SS","FF","SF"]);
const ANCHOR_BASE="__PCK_DATA_DATE_ANCHOR__";
const idOf=activityId;

function normalizeRelationship(raw,knownIds){
  const predecessor=raw.predecessor??raw.predecessor_id;
  const successor=raw.successor??raw.successor_id;
  const type=String(raw.type??"FS").toUpperCase();
  const lag=numeric(raw.lag??0,"Relationship lag");
  if(!knownIds.has(predecessor)||!knownIds.has(successor)) throw new Error(`Relationship references unknown activity: ${predecessor} -> ${successor}`);
  if(!REL_TYPES.has(type)) throw new Error(`Unsupported relationship type: ${type}`);
  if(!Number.isFinite(lag)) throw new Error("Relationship lag must be numeric");
  return {...raw,predecessor,successor,type,lag};
}

function actualBoundaryOffset({rel,predecessorStatus,successorStatus,successorDuration,dataDateSlot}){
  if(successorStatus.status==="IN_PROGRESS"&&(rel.type==="FS"||rel.type==="SS")) return null;
  const needsFinish=rel.type==="FS"||rel.type==="FF";
  const predecessorPoint=needsFinish?predecessorStatus.actual_finish_slot:predecessorStatus.actual_start_slot;
  if(predecessorPoint==null){
    const field=needsFinish?"actual_finish_slot":"actual_start_slot";
    throw new Error(`Completed predecessor ${rel.predecessor} requires ${field} for ${rel.type} relationship`);
  }
  let absoluteMinStart;
  if(rel.type==="FS"||rel.type==="SS") absoluteMinStart=Number(predecessorPoint)+rel.lag;
  else absoluteMinStart=Number(predecessorPoint)+rel.lag-successorDuration;
  return Math.max(0,absoluteMinStart-dataDateSlot);
}

function uniqueAnchorId(knownIds){
  let id=ANCHOR_BASE,n=1;
  while(knownIds.has(id)){id=`${ANCHOR_BASE}${n++}`;}
  return id;
}

export function classifyStatus(activity,update={},dataDateSlot=0){
  const issues=[];
  function read(field,issue){
    if(update[field]==null) return null;
    try{return numeric(update[field],field,{nonnegative:true});}
    catch{issues.push(issue);return NaN;}
  }
  const actualStart=read("actual_start_slot","ACTUAL_START_INVALID");
  const actualFinish=read("actual_finish_slot","ACTUAL_FINISH_INVALID");
  const remaining=read("remaining_duration","REMAINING_DURATION_INVALID");
  const suspend=read("suspend_slot","SUSPEND_SLOT_INVALID");
  const resume=read("resume_slot","RESUME_SLOT_INVALID");
  if(actualFinish!=null&&actualStart==null) issues.push("ACTUAL_FINISH_WITHOUT_ACTUAL_START");
  if(actualStart!=null&&actualStart>dataDateSlot) issues.push("ACTUAL_START_AFTER_DATA_DATE");
  if(actualFinish!=null&&actualFinish>dataDateSlot) issues.push("ACTUAL_FINISH_AFTER_DATA_DATE");
  if(actualFinish!=null&&actualStart!=null&&actualFinish<actualStart) issues.push("ACTUAL_FINISH_BEFORE_ACTUAL_START");
  let status;
  if(actualFinish!=null) status="COMPLETED";
  else if(actualStart!=null) status="IN_PROGRESS";
  else status="NOT_STARTED";
  if(status==="IN_PROGRESS"&&remaining==null) issues.push("REMAINING_DURATION_REQUIRED");
  if(status==="COMPLETED"&&remaining!=null&&remaining!==0) issues.push("COMPLETED_REMAINING_DURATION_NONZERO");
  const suspendResumePaired=(suspend==null)===(resume==null);
  const hasSuspendResume=suspend!=null&&resume!=null;
  if(!suspendResumePaired) issues.push("SUSPEND_RESUME_PAIR_REQUIRED");
  if(hasSuspendResume&&status!=="IN_PROGRESS") issues.push("SUSPEND_RESUME_REQUIRES_IN_PROGRESS");
  if(hasSuspendResume&&activity.milestone) issues.push("MILESTONE_SUSPEND_RESUME_UNSUPPORTED");
  if(hasSuspendResume&&actualStart!=null&&suspend<actualStart) issues.push("SUSPEND_BEFORE_ACTUAL_START");
  if(hasSuspendResume&&suspend>dataDateSlot) issues.push("SUSPEND_AFTER_DATA_DATE");
  if(hasSuspendResume&&resume<suspend) issues.push("RESUME_BEFORE_SUSPEND");
  if(activity.milestone&&(actualStart!=null||actualFinish!=null)&&
      (actualStart==null||actualFinish==null||actualStart!==actualFinish)) issues.push("MILESTONE_ACTUALS_MUST_MATCH");
  if(status==="NOT_STARTED"&&(activity.es??0)<dataDateSlot) issues.push("SHOULD_HAVE_STARTED");
  return {status,actual_start_slot:actualStart,actual_finish_slot:actualFinish,remaining_duration:status==="COMPLETED"?0:(remaining??activity.duration),
    suspend_slot:suspend,resume_slot:resume,suspended_at_data_date:hasSuspendResume&&resume>dataDateSlot,issues};
}

export function rescheduleRemaining({scheduledActivities,relationships=[],constraints=[],updates={},dataDateSlot=0,requiredFinishSlot=null}){
  const dataDate=numeric(dataDateSlot,"dataDateSlot",{nonnegative:true});
  const requiredAbsolute=requiredFinishSlot==null?null:numeric(requiredFinishSlot,"requiredFinishSlot",{nonnegative:true});
  if(!Array.isArray(scheduledActivities)) throw new Error("scheduledActivities must be an array");
  if(!updates||typeof updates!=="object"||Array.isArray(updates)) throw new Error("updates must be an object keyed by activity ID");
  const sourceActivities=scheduledActivities.map(normalizeActivity);
  const ids=new Set(sourceActivities.map(idOf));
  if(ids.size!==sourceActivities.length) throw new Error("scheduledActivities require unique id or activity_id values");
  for(const id of Object.keys(updates)){
    if(!ids.has(id)) throw new Error(`Status update references unknown activity: ${id}`);
    if(!updates[id]||typeof updates[id]!=="object"||Array.isArray(updates[id])) throw new Error(`Invalid status update for ${id}`);
  }
  const normalizedRelationships=relationships.map(r=>normalizeRelationship(r,ids));
  const normalizedConstraints=normalizeConstraints({activities:sourceActivities,constraints});
  // Validate the complete input graph, even when completed work drops out of the forecast.
  if(sourceActivities.length) scheduleNetwork({activities:sourceActivities,relationships:normalizedRelationships});
  const statusRows=sourceActivities.map(a=>({activity_id:idOf(a),...classifyStatus(a,updates[idOf(a)]??{},dataDate)}));
  for(const st of statusRows){
    if(st.issues.includes("ACTUAL_FINISH_WITHOUT_ACTUAL_START")) throw new Error(`Activity ${st.activity_id} requires actual_start_slot when actual_finish_slot is supplied`);
    const fatal=st.issues.filter(x=>x!=="SHOULD_HAVE_STARTED");
    if(fatal.length) throw new Error(`Invalid status data for ${st.activity_id}: ${fatal.join(", ")}`);
  }
  const byStatus=new Map(statusRows.map(x=>[x.activity_id,x]));
  const incomplete=sourceActivities.filter(a=>byStatus.get(idOf(a)).status!=="COMPLETED");

  function result(remainingSchedule,forecast,boundaryConstraints,translatedConstraints){
    const byForecast=new Map(forecast.map(a=>[a.id,a]));
    const points=sourceActivities.map(a=>{
      const st=byStatus.get(a.id),f=byForecast.get(a.id);
      return {...a,es:st.actual_start_slot??f?.forecast_start_slot,ef:st.actual_finish_slot??f?.forecast_finish_slot};
    });
    const checks=evaluateConstraintViolations({scheduledActivities:points,constraints:normalizedConstraints}).map(c=>{
      const st=byStatus.get(c.activity_id);
      const isStart=c.type.startsWith("START")||c.type==="MUST_START_ON";
      const isActual=isStart?st.actual_start_slot!=null:st.actual_finish_slot!=null;
      return {...c,status:st.status,basis:(isActual?"ACTUAL_":"FORECAST_")+(isStart?"START":"FINISH")};
    });
    const finishes=points.map(a=>a.ef);
    const finish=finishes.length?Math.max(...finishes):null;
    const progressQa=inspectProgress({scheduledActivities:sourceActivities,relationships:normalizedRelationships,status:statusRows,dataDateSlot:dataDate});
    return {data_date_slot:dataDate,status:statusRows,remaining_schedule:remainingSchedule,forecast,
      boundary_constraints:boundaryConstraints,translated_constraints:translatedConstraints,constraints:checks,progress_qa:progressQa,
      project:{forecast_finish_slot:finish,required_finish_slot:requiredAbsolute,
        finish_variance:finish==null||requiredAbsolute==null?null:finish-requiredAbsolute}};
  }
  if(incomplete.length===0) return result(null,[],[],[]);

  const remActs=incomplete.map(a=>{
    const st=byStatus.get(idOf(a));
    const duration=st.status==="IN_PROGRESS"?Number(st.remaining_duration):Number(a.duration);
    if(!Number.isFinite(duration)||duration<0) throw new Error(`Invalid remaining duration for ${idOf(a)}`);
    return {...a,id:idOf(a),duration};
  });
  const remById=new Map(remActs.map(a=>[a.id,a]));
  const activeIds=new Set(remById.keys());
  const remRels=[];
  const boundaryConstraints=[];
  for(const st of statusRows){
    if(st.status==="IN_PROGRESS"&&st.suspended_at_data_date){
      const offset=st.resume_slot-dataDate;
      boundaryConstraints.push({predecessor:null,successor:st.activity_id,type:"SUSPEND_RESUME",lag:0,
        min_start_offset:offset,min_start_slot:st.resume_slot,source:"SUSPEND_RESUME"});
    }
  }

  for(const rel of normalizedRelationships){
    const pStatus=byStatus.get(rel.predecessor),sStatus=byStatus.get(rel.successor);
    if(sStatus.status==="COMPLETED") continue;
    // SS/SF from a started predecessor use the immutable actual start, never the restart date.
    const startedStartRelation=pStatus.status==="IN_PROGRESS"&&(rel.type==="SS"||rel.type==="SF");
    if(pStatus.status==="COMPLETED"||startedStartRelation){
      const offset=actualBoundaryOffset({rel,predecessorStatus:pStatus,successorStatus:sStatus,successorDuration:remById.get(rel.successor).duration,dataDateSlot:dataDate});
      if(offset!=null&&offset>0){
        boundaryConstraints.push({predecessor:rel.predecessor,successor:rel.successor,type:rel.type,lag:rel.lag,min_start_offset:offset,min_start_slot:dataDate+offset,source:startedStartRelation?"IN_PROGRESS_PREDECESSOR_ACTUAL_START":"COMPLETED_PREDECESSOR_ACTUAL"});
      }
      continue;
    }
    if(!activeIds.has(rel.predecessor)||!activeIds.has(rel.successor)) continue;
    if(sStatus.status==="IN_PROGRESS"&&(rel.type==="FS"||rel.type==="SS")) continue;
    remRels.push(rel);
  }

  const knownForAnchor=new Set(ids);
  let anchorId=null;
  if(boundaryConstraints.length){
    anchorId=uniqueAnchorId(knownForAnchor);
    remActs.push({id:anchorId,duration:0,activity_type:"START_MILESTONE",name:"Data date boundary anchor",synthetic:true,calendar_id:remActs[0].calendar_id});
    for(const c of boundaryConstraints) remRels.push({predecessor:anchorId,successor:c.successor,type:"FS",lag:c.min_start_offset,synthetic:true,source:c.source});
  }

  const translatedConstraints=normalizedConstraints.filter(c=>{
    const st=byStatus.get(c.activity_id);
    const isStart=c.type.startsWith("START")||c.type==="MUST_START_ON";
    return st.status!=="COMPLETED"&&!(st.status==="IN_PROGRESS"&&isStart);
  }).map(c=>({...c,original_slot:c.slot,slot:c.slot-dataDate,source:"DATA_DATE_TRANSLATION"}));
  const required=requiredAbsolute==null?null:requiredAbsolute-dataDate;
  const rawSchedule=scheduleNetwork({activities:remActs,relationships:remRels,constraints:translatedConstraints,requiredFinish:required});
  const visibleActivities=rawSchedule.activities.filter(a=>a.id!==anchorId);
  const remainingSchedule={...rawSchedule,time_origin_slot:dataDate,order:rawSchedule.order.filter(id=>id!==anchorId),activities:visibleActivities,
    relationships:remRels.filter(r=>r.predecessor!==anchorId&&r.successor!==anchorId)};
  const forecast=visibleActivities.map(a=>({...a,forecast_start_slot:dataDate+a.es,forecast_finish_slot:dataDate+a.ef,
    forecast_late_start_slot:dataDate+a.ls,forecast_late_finish_slot:dataDate+a.lf}));
  return result(remainingSchedule,forecast,boundaryConstraints,translatedConstraints);
}

// Backward-compatible v0.3 API name. It now supports all native relationship types.
export function rescheduleRemainingFS(args){return rescheduleRemaining(args);}
