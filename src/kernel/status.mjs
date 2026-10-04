import {scheduleNetwork} from "./cpm.mjs";

const REL_TYPES=new Set(["FS","SS","FF","SF"]);
const ANCHOR_BASE="__PCK_DATA_DATE_ANCHOR__";
function idOf(a){return a.id??a.activity_id;}

function normalizeRelationship(raw,knownIds){
  const predecessor=raw.predecessor??raw.predecessor_id;
  const successor=raw.successor??raw.successor_id;
  const type=String(raw.type??"FS").toUpperCase();
  const lag=Number(raw.lag??0);
  if(!knownIds.has(predecessor)||!knownIds.has(successor)) throw new Error(`Relationship references unknown activity: ${predecessor} -> ${successor}`);
  if(!REL_TYPES.has(type)) throw new Error(`Unsupported relationship type: ${type}`);
  if(!Number.isFinite(lag)) throw new Error("Relationship lag must be numeric");
  return {...raw,predecessor,successor,type,lag};
}

function completedBoundaryOffset({rel,predecessorStatus,successorStatus,successorDuration,dataDateSlot}){
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
  const actualStart=update.actual_start_slot??null;
  const actualFinish=update.actual_finish_slot??null;
  const remaining=update.remaining_duration??null;
  const issues=[];
  if(actualFinish!=null&&actualStart==null) issues.push("ACTUAL_FINISH_WITHOUT_ACTUAL_START");
  if(actualStart!=null&&actualStart>dataDateSlot) issues.push("ACTUAL_START_AFTER_DATA_DATE");
  if(actualFinish!=null&&actualFinish>dataDateSlot) issues.push("ACTUAL_FINISH_AFTER_DATA_DATE");
  let status;
  if(actualFinish!=null) status="COMPLETED";
  else if(actualStart!=null) status="IN_PROGRESS";
  else status="NOT_STARTED";
  if(status==="IN_PROGRESS"&&(remaining==null||Number(remaining)<0)) issues.push("REMAINING_DURATION_REQUIRED");
  if(status==="NOT_STARTED"&&(activity.es??0)<dataDateSlot) issues.push("SHOULD_HAVE_STARTED");
  return {status,actual_start_slot:actualStart,actual_finish_slot:actualFinish,remaining_duration:status==="COMPLETED"?0:(remaining??activity.duration),issues};
}

export function rescheduleRemaining({scheduledActivities,relationships=[],updates={},dataDateSlot=0,requiredFinishSlot=null}){
  const dataDate=Number(dataDateSlot);
  if(!Number.isFinite(dataDate)) throw new Error("dataDateSlot must be numeric");
  const ids=new Set(scheduledActivities.map(idOf));
  if(ids.size!==scheduledActivities.length||ids.has(undefined)||ids.has(null)) throw new Error("scheduledActivities require unique id or activity_id values");
  const normalizedRelationships=relationships.map(r=>normalizeRelationship(r,ids));
  const statusRows=scheduledActivities.map(a=>({activity_id:idOf(a),...classifyStatus(a,updates[idOf(a)]??{},dataDate)}));
  const byStatus=new Map(statusRows.map(x=>[x.activity_id,x]));
  const incomplete=scheduledActivities.filter(a=>byStatus.get(idOf(a)).status!=="COMPLETED");
  if(incomplete.length===0) return {data_date_slot:dataDate,status:statusRows,remaining_schedule:null,forecast:[],boundary_constraints:[]};

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

  for(const rel of normalizedRelationships){
    const pStatus=byStatus.get(rel.predecessor),sStatus=byStatus.get(rel.successor);
    if(sStatus.status==="COMPLETED") continue;
    if(pStatus.status==="COMPLETED"){
      const offset=completedBoundaryOffset({rel,predecessorStatus:pStatus,successorStatus:sStatus,successorDuration:remById.get(rel.successor).duration,dataDateSlot:dataDate});
      if(offset!=null&&offset>0){
        boundaryConstraints.push({predecessor:rel.predecessor,successor:rel.successor,type:rel.type,lag:rel.lag,min_start_offset:offset,min_start_slot:dataDate+offset,source:"COMPLETED_PREDECESSOR_ACTUAL"});
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
    remActs.push({id:anchorId,duration:0,name:"Data date boundary anchor",synthetic:true});
    for(const c of boundaryConstraints) remRels.push({predecessor:anchorId,successor:c.successor,type:"FS",lag:c.min_start_offset,synthetic:true,source:c.source});
  }

  const required=requiredFinishSlot==null?null:Number(requiredFinishSlot)-dataDate;
  if(requiredFinishSlot!=null&&!Number.isFinite(required)) throw new Error("requiredFinishSlot must be numeric");
  const rawSchedule=scheduleNetwork({activities:remActs,relationships:remRels,requiredFinish:required});
  const visibleActivities=rawSchedule.activities.filter(a=>a.id!==anchorId);
  const remainingSchedule={...rawSchedule,order:rawSchedule.order.filter(id=>id!==anchorId),activities:visibleActivities};
  const forecast=visibleActivities.map(a=>({...a,forecast_start_slot:dataDate+a.es,forecast_finish_slot:dataDate+a.ef}));
  return {data_date_slot:dataDate,status:statusRows,remaining_schedule:remainingSchedule,forecast,boundary_constraints:boundaryConstraints};
}

// Backward-compatible v0.3 API name. It now supports all native relationship types.
export function rescheduleRemainingFS(args){return rescheduleRemaining(args);}
