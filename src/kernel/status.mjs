import {scheduleNetwork} from "./cpm.mjs";

function idOf(a){return a.id??a.activity_id;}

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

export function rescheduleRemainingFS({scheduledActivities,relationships=[],updates={},dataDateSlot=0,requiredFinishSlot=null}){
  const statusRows=scheduledActivities.map(a=>({activity_id:idOf(a),...classifyStatus(a,updates[idOf(a)]??{},dataDateSlot)}));
  const byStatus=new Map(statusRows.map(x=>[x.activity_id,x]));
  const incomplete=scheduledActivities.filter(a=>byStatus.get(idOf(a)).status!=="COMPLETED");
  if(incomplete.length===0) return {data_date_slot:dataDateSlot,status:statusRows,remaining_schedule:null,forecast:[]};

  const unsupported=relationships.filter(r=>{
    const p=byStatus.get(r.predecessor),s=byStatus.get(r.successor);
    return p&&s&&p.status!=="COMPLETED"&&s.status!=="COMPLETED"&&String(r.type??"FS").toUpperCase()!=="FS";
  });
  if(unsupported.length) throw new Error("v0.3 remaining-work rescheduler currently supports FS relationships only");

  const remActs=incomplete.map(a=>{
    const st=byStatus.get(idOf(a));
    return {...a,id:idOf(a),duration:st.status==="IN_PROGRESS"?Number(st.remaining_duration):Number(a.duration)};
  });
  const activeIds=new Set(remActs.map(a=>a.id));
  const remRels=relationships
    .filter(r=>activeIds.has(r.successor)&&activeIds.has(r.predecessor))
    .map(r=>({...r,type:"FS"}));

  const required=requiredFinishSlot==null?null:Number(requiredFinishSlot)-dataDateSlot;
  const remainingSchedule=scheduleNetwork({activities:remActs,relationships:remRels,requiredFinish:required});
  const forecast=remainingSchedule.activities.map(a=>({...a,forecast_start_slot:dataDateSlot+a.es,forecast_finish_slot:dataDateSlot+a.ef}));
  return {data_date_slot:dataDateSlot,status:statusRows,remaining_schedule:remainingSchedule,forecast};
}
