// Diagnostic findings only. These checks do not certify a schedule or P6/DCMA compliance.
const REL_TYPES=new Set(["FS","SS","FF","SF"]);
const idOf=a=>a?.id??a?.activity_id;

function countFindings(findings){
  return {
    errors:findings.filter(f=>f.severity==="ERROR").length,
    warnings:findings.filter(f=>f.severity==="WARNING").length,
    information:findings.filter(f=>f.severity==="INFO").length
  };
}

export function inspectProgress({
  scheduledActivities=[],
  relationships=[],
  status=[],
  dataDateSlot=0,
  shiftRelationshipPoint=null
}={}){
  if(!Array.isArray(scheduledActivities)) throw new Error("scheduledActivities must be an array");
  if(!Array.isArray(relationships)) throw new Error("relationships must be an array");
  if(!Array.isArray(status)) throw new Error("status must be an array");
  const dataDate=Number(dataDateSlot);
  if(!Number.isFinite(dataDate)) throw new Error("dataDateSlot must be numeric");

  const activities=new Map();
  for(const a of scheduledActivities){
    const id=idOf(a);
    if(typeof id!=="string"||!id) throw new Error("Progress QA activities require id or activity_id");
    if(activities.has(id)) throw new Error(`Duplicate progress QA activity id: ${id}`);
    activities.set(id,a);
  }
  const statuses=new Map();
  for(const s of status){
    const id=s?.activity_id??s?.id;
    if(!activities.has(id)) throw new Error(`Progress QA status references unknown activity: ${id}`);
    if(statuses.has(id)) throw new Error(`Duplicate progress QA status row: ${id}`);
    statuses.set(id,s);
  }

  const findings=[];
  const add=(finding)=>findings.push(finding);
  for(const [id,a] of activities){
    const s=statuses.get(id);
    if(!s) continue;
    const actualStart=s.actual_start_slot;
    const actualFinish=s.actual_finish_slot;
    const remaining=s.remaining_duration;

    if(actualFinish!=null&&actualStart==null) add({code:"ACTUAL_FINISH_WITHOUT_ACTUAL_START",severity:"ERROR",activity_id:id,message:"Actual finish exists without an actual start."});
    if(actualStart!=null&&Number(actualStart)>dataDate) add({code:"ACTUAL_START_AFTER_DATA_DATE",severity:"ERROR",activity_id:id,actual_slot:Number(actualStart),data_date_slot:dataDate,message:"Actual start is later than the data date."});
    if(actualFinish!=null&&Number(actualFinish)>dataDate) add({code:"ACTUAL_FINISH_AFTER_DATA_DATE",severity:"ERROR",activity_id:id,actual_slot:Number(actualFinish),data_date_slot:dataDate,message:"Actual finish is later than the data date."});
    if(actualStart!=null&&actualFinish!=null&&Number(actualFinish)<Number(actualStart)) add({code:"ACTUAL_FINISH_BEFORE_ACTUAL_START",severity:"ERROR",activity_id:id,message:"Actual finish precedes actual start."});

    if(s.status==="IN_PROGRESS"&&remaining==null) add({code:"REMAINING_DURATION_REQUIRED",severity:"ERROR",activity_id:id,message:"In-progress work requires a remaining duration."});
    if(s.status==="IN_PROGRESS"&&Number(remaining)===0) add({code:"ZERO_REMAINING_WITHOUT_ACTUAL_FINISH",severity:"WARNING",activity_id:id,message:"In-progress activity has zero remaining duration but no actual finish."});
    if(s.status==="COMPLETED"&&remaining!=null&&Number(remaining)!==0) add({code:"COMPLETED_REMAINING_DURATION_NONZERO",severity:"ERROR",activity_id:id,message:"Completed activity must not retain nonzero remaining duration."});

    const plannedStart=Number(a.es);
    const plannedFinish=Number(a.ef);
    if(s.status==="NOT_STARTED"&&Number.isFinite(plannedFinish)&&plannedFinish<=dataDate){
      add({code:"SHOULD_HAVE_FINISHED",severity:"WARNING",activity_id:id,planned_finish_slot:plannedFinish,data_date_slot:dataDate,message:"Baseline finish is on or before the data date but no actual start is recorded."});
    }else if(s.status==="NOT_STARTED"&&Number.isFinite(plannedStart)&&plannedStart<dataDate){
      add({code:"SHOULD_HAVE_STARTED",severity:"WARNING",activity_id:id,planned_start_slot:plannedStart,data_date_slot:dataDate,message:"Baseline start precedes the data date but no actual start is recorded."});
    }
    if(s.status==="IN_PROGRESS"&&Number.isFinite(plannedFinish)&&plannedFinish<=dataDate){
      add({code:"IN_PROGRESS_PAST_PLANNED_FINISH",severity:"WARNING",activity_id:id,planned_finish_slot:plannedFinish,data_date_slot:dataDate,message:"Activity remains in progress even though its baseline finish is on or before the data date."});
    }
  }

  for(const raw of relationships){
    const predecessor=raw.predecessor??raw.predecessor_id;
    const successor=raw.successor??raw.successor_id;
    const type=String(raw.type??"FS").toUpperCase();
    const lag=Number(raw.lag??0);
    if(!activities.has(predecessor)||!activities.has(successor)) throw new Error(`Progress QA relationship references unknown activity: ${predecessor} -> ${successor}`);
    if(!REL_TYPES.has(type)) throw new Error(`Unsupported progress QA relationship type: ${type}`);
    if(!Number.isFinite(lag)) throw new Error("Progress QA relationship lag must be numeric");
    const ps=statuses.get(predecessor),ss=statuses.get(successor);
    if(!ps||!ss) continue;

    const predecessorField=(type==="FS"||type==="FF")?"actual_finish_slot":"actual_start_slot";
    const successorField=(type==="FS"||type==="SS")?"actual_start_slot":"actual_finish_slot";
    const successorActual=ss[successorField];
    if(successorActual==null) continue;
    const predecessorActual=ps[predecessorField];
    const relationship={...raw,predecessor,successor,type,lag};

    if(predecessorActual==null){
      add({code:"ACTUAL_LOGIC_UNRESOLVED",severity:"INFO",activity_id:successor,relationship,
        predecessor_actual_field:predecessorField,successor_actual_field:successorField,
        message:`Successor has an actual ${successorField.replace("actual_","").replace("_slot","")} but the predecessor actual needed to evaluate ${type} logic is not recorded yet.`});
      continue;
    }

    let required;
    try{
      required=shiftRelationshipPoint?shiftRelationshipPoint(Number(predecessorActual),relationship):Number(predecessorActual)+lag;
    }catch(error){
      add({code:"ACTUAL_LOGIC_EVALUATION_UNAVAILABLE",severity:"INFO",activity_id:successor,relationship,
        message:`The actual ${type} relationship could not be evaluated in the declared QA horizon: ${error.message}`});
      continue;
    }
    if(!Number.isFinite(required)) throw new Error(`Progress QA relationship produced a nonnumeric required point: ${predecessor} -> ${successor}`);
    if(Number(successorActual)+1e-9<required){
      add({code:"OUT_OF_SEQUENCE_PROGRESS",severity:"WARNING",activity_id:successor,relationship,
        actual_slot:Number(successorActual),required_slot:required,
        message:`Recorded successor actual violates the ${type} relationship boundary implied by recorded predecessor actuals.`});
    }
  }
  return {data_date_slot:dataDate,findings,counts:countFindings(findings)};
}

export function inspectSchedule({schedule,relationships=[],status=[],constraints=schedule.constraints??[],additionalFindings=[]}) {
  const findings=[];
  const incoming=new Set(relationships.map(r=>r.successor??r.successor_id));
  const outgoing=new Set(relationships.map(r=>r.predecessor??r.predecessor_id));
  for(const a of schedule.activities){
    if(!incoming.has(a.id)) findings.push({code:"OPEN_START",severity:"INFO",activity_id:a.id,message:"No incoming relationship; confirm this is an intended network entry."});
    if(!outgoing.has(a.id)) findings.push({code:"OPEN_FINISH",severity:"INFO",activity_id:a.id,message:"No outgoing relationship; confirm this is an intended network exit."});
    if(a.total_float < -1e-9) findings.push({code:"NEGATIVE_FLOAT",severity:"WARNING",activity_id:a.id,value:a.total_float,message:"Forecast logic exceeds a required finish or latest constraint."});
  }
  const seen=new Set();
  for(const r of relationships){
    const key=JSON.stringify([r.predecessor??r.predecessor_id,r.successor??r.successor_id,String(r.type??"FS").toUpperCase(),Number(r.lag??0)]);
    if(seen.has(key)) findings.push({code:"DUPLICATE_RELATIONSHIP",severity:"WARNING",relationship:r,message:"The same logical relationship is present more than once."});
    seen.add(key);
    if(Number(r.lag??0)<0) findings.push({code:"NEGATIVE_LAG",severity:"WARNING",relationship:r,message:"A lead overlaps work; verify that the overlap is intentional."});
  }
  for(const c of constraints) if(!c.ok) findings.push({code:"CONSTRAINT_VIOLATION",severity:"WARNING",activity_id:c.activity_id,constraint:c,message:"A calculated or actual point does not satisfy the declared constraint."});
  for(const s of status) for(const issue of s.issues??[]) findings.push({code:issue,severity:"WARNING",activity_id:s.activity_id,message:"Planned start precedes the data date and no actual start is recorded."});
  if(!Array.isArray(additionalFindings)) throw new Error("additionalFindings must be an array");
  findings.push(...additionalFindings);
  return {findings,counts:countFindings(findings)};
}
