import test from "node:test";
import assert from "node:assert/strict";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {rescheduleRemaining, classifyStatus} from "../src/kernel/status.mjs";
import {normalizeActivity} from "../src/kernel/activities.mjs";

const activity = {id:"A",duration:3};
function forecast(type,slot,options={}) {
  return rescheduleRemaining({scheduledActivities:[activity],dataDateSlot:5,requiredFinishSlot:20,
    constraints:[{activity_id:"A",type,slot}],...options});
}

test("all six constraint types translate from project slots to the data-date origin",()=>{
  const cases=[
    ["START_ON_OR_AFTER",9,9,12,17],
    ["START_ON_OR_BEFORE",9,5,8,9],
    ["FINISH_ON_OR_AFTER",12,9,12,17],
    ["FINISH_ON_OR_BEFORE",10,5,8,7],
    ["MUST_START_ON",9,9,12,9],
    ["MUST_FINISH_ON",12,9,12,9]
  ];
  for(const [type,slot,es,ef,ls] of cases){
    const r=forecast(type,slot),a=r.forecast[0];
    assert.equal(a.forecast_start_slot,es,type);
    assert.equal(a.forecast_finish_slot,ef,type);
    assert.equal(a.forecast_late_start_slot,ls,type);
    assert.equal(r.translated_constraints[0].slot,slot-5,type);
    assert.equal(r.translated_constraints[0].original_slot,slot,type);
    assert.equal(r.constraints[0].required_slot,slot,type);
    assert.equal(r.constraints[0].basis,type.startsWith("START")||type==="MUST_START_ON"?"FORECAST_START":"FORECAST_FINISH");
    assert.equal(r.constraints[0].ok,true,type);
    assert.equal(r.remaining_schedule.time_origin_slot,5);
  }
});

test("start bounds on in-progress work check actual start without postponing the remaining segment",()=>{
  for(const [type,slot,ok] of [["START_ON_OR_AFTER",9,false],["START_ON_OR_BEFORE",3,true],["MUST_START_ON",2,true],["MUST_START_ON",9,false]]){
    const r=forecast(type,slot,{updates:{A:{actual_start_slot:2,remaining_duration:2}}});
    assert.equal(r.forecast[0].forecast_start_slot,5);
    assert.equal(r.forecast[0].forecast_finish_slot,7);
    assert.equal(r.translated_constraints.length,0);
    assert.equal(r.constraints[0].calculated_slot,2);
    assert.equal(r.constraints[0].basis,"ACTUAL_START");
    assert.equal(r.constraints[0].ok,ok);
  }
});

test("finish bounds on in-progress work use remaining duration and preserve actual start",()=>{
  const r=forecast("MUST_FINISH_ON",12,{updates:{A:{actual_start_slot:2,remaining_duration:2}}});
  assert.equal(r.forecast[0].forecast_start_slot,10);
  assert.equal(r.forecast[0].forecast_finish_slot,12);
  assert.equal(r.status[0].actual_start_slot,2);
  assert.equal(r.constraints[0].basis,"FORECAST_FINISH");
  assert.equal(r.constraints[0].ok,true);
});

test("completed constraints are checked against actuals even with no remaining work",()=>{
  const r=rescheduleRemaining({scheduledActivities:[activity],dataDateSlot:8,requiredFinishSlot:4,
    updates:{A:{actual_start_slot:1,actual_finish_slot:3}},constraints:[
      {activity_id:"A",type:"MUST_START_ON",slot:1},
      {activity_id:"A",type:"MUST_FINISH_ON",slot:3},
      {activity_id:"A",type:"FINISH_ON_OR_BEFORE",slot:2}
    ]});
  assert.equal(r.remaining_schedule,null);
  assert.deepEqual(r.forecast,[]);
  assert.deepEqual(r.constraints.map(c=>c.ok),[true,true,false]);
  assert.deepEqual(r.constraints.map(c=>c.basis),["ACTUAL_START","ACTUAL_FINISH","ACTUAL_FINISH"]);
  assert.equal(r.project.forecast_finish_slot,3);
  assert.equal(r.project.finish_variance,-1);
});

test("past latest and exact dates remain explicit conflicts with negative float",()=>{
  for(const type of ["START_ON_OR_BEFORE","MUST_START_ON","FINISH_ON_OR_BEFORE","MUST_FINISH_ON"]){
    const r=forecast(type,4);
    assert.equal(r.forecast[0].forecast_start_slot,5);
    assert.equal(r.constraints[0].ok,false);
    assert.ok(r.forecast[0].total_float<0,type);
    assert.ok(r.forecast[0].forecast_late_start_slot<5,type);
  }
});

test("completed-predecessor lag and a translated lower bound combine without exposing the anchor",()=>{
  const acts=[{id:"A",duration:4},{id:"B",duration:2,calendar_id:"C1"}].map(a=>({...a,calendar_id:"C1"}));
  const r=rescheduleRemaining({scheduledActivities:acts,dataDateSlot:5,requiredFinishSlot:11,
    relationships:[{predecessor:"A",successor:"B",type:"FS",lag:3}],
    updates:{A:{actual_start_slot:0,actual_finish_slot:4}},
    constraints:[{activity_id:"B",type:"START_ON_OR_AFTER",slot:10}]});
  assert.equal(r.forecast[0].forecast_start_slot,10);
  assert.equal(r.forecast[0].forecast_finish_slot,12);
  assert.equal(r.forecast[0].total_float,-1);
  assert.equal(r.boundary_constraints[0].min_start_slot,7);
  assert.equal(r.forecast.length,1);
  assert.deepEqual(r.remaining_schedule.order,["B"]);
  assert.equal(r.remaining_schedule.activities.some(a=>a.synthetic),false);
});

test("SS/SF from an in-progress predecessor use its immutable actual start",()=>{
  for(const [type,lag,start,finish] of [["SS",1,5,8],["SS",7,9,12],["SF",10,9,12]]){
    const r=rescheduleRemaining({scheduledActivities:[{id:"A",duration:8},{id:"B",duration:3}],
      relationships:[{predecessor:"A",successor:"B",type,lag}],
      updates:{A:{actual_start_slot:2,remaining_duration:4}},dataDateSlot:5});
    const b=r.forecast.find(a=>a.id==="B");
    assert.equal(b.forecast_start_slot,start,type);
    assert.equal(b.forecast_finish_slot,finish,type);
    if(start>5) assert.equal(r.boundary_constraints[0].source,"IN_PROGRESS_PREDECESSOR_ACTUAL_START");
  }
});

test("numeric dates, remaining duration and actual ordering fail closed",()=>{
  const bad=[
    {actual_start_slot:6,remaining_duration:1},
    {actual_start_slot:1,actual_finish_slot:6},
    {actual_start_slot:3,actual_finish_slot:2},
    {actual_start_slot:"",remaining_duration:1},
    {actual_start_slot:true,remaining_duration:1},
    {actual_start_slot:NaN,remaining_duration:1},
    {actual_start_slot:1,remaining_duration:Infinity},
    {actual_start_slot:1,remaining_duration:-1},
    {actual_start_slot:1},
    {actual_start_slot:1,actual_finish_slot:2,remaining_duration:1}
  ];
  for(const update of bad) assert.throws(()=>rescheduleRemaining({scheduledActivities:[activity],dataDateSlot:5,updates:{A:update}}),/Invalid status data/);
  for(const value of ["",true,NaN,Infinity,-1]) assert.throws(()=>rescheduleRemaining({scheduledActivities:[activity],dataDateSlot:value}),/dataDateSlot/);
});

test("the status classifier keeps a missing-start warning separate from malformed actuals",()=>{
  assert.deepEqual(classifyStatus({...activity,es:1},{},5).issues,["SHOULD_HAVE_STARTED"]);
  assert.equal(classifyStatus(activity,{actual_start_slot:1,remaining_duration:2},5).status,"IN_PROGRESS");
});

test("all-completed and empty forecasts still validate constraint and deadline inputs",()=>{
  const updates={A:{actual_start_slot:0,actual_finish_slot:3}};
  assert.throws(()=>forecast("P6_SPECIAL",3,{updates}),/Unsupported constraint/);
  assert.throws(()=>forecast("MUST_START_ON",null,{updates}),/numeric/);
  assert.throws(()=>forecast("MUST_START_ON",3,{updates,requiredFinishSlot:""}),/requiredFinishSlot/);
  assert.throws(()=>rescheduleRemaining({scheduledActivities:[],constraints:[{activity_id:"X",type:"MUST_START_ON",slot:1}]}),/unknown activity/);
  assert.equal(rescheduleRemaining({scheduledActivities:[]}).project.forecast_finish_slot,null);
});

test("unknown status identities and cycles do not silently disappear when work completes",()=>{
  assert.throws(()=>rescheduleRemaining({scheduledActivities:[activity],updates:{TYPO:{}}}),/unknown activity/);
  assert.throws(()=>rescheduleRemaining({scheduledActivities:[activity,{id:"B",duration:1}],dataDateSlot:5,
    updates:{A:{actual_start_slot:0,actual_finish_slot:3},B:{actual_start_slot:3,actual_finish_slot:4}},
    relationships:[{predecessor:"A",successor:"B"},{predecessor:"B",successor:"A"}]}),/cycle/);
});

test("remaining forecasts do not mutate input schedules, constraints or updates",()=>{
  const inputs={scheduledActivities:[{...activity}],constraints:[{activity_id:"A",type:"MUST_FINISH_ON",slot:12}],
    updates:{A:{actual_start_slot:2,remaining_duration:2}},dataDateSlot:5};
  const before=structuredClone(inputs);
  Object.freeze(inputs.scheduledActivities[0]);Object.freeze(inputs.constraints[0]);Object.freeze(inputs.updates.A);
  rescheduleRemaining(inputs);assert.deepEqual(inputs,before);
});

test("typed milestones are atomic, zero-duration points in both baseline and remaining schedules",()=>{
  for(const activity_type of ["START_MILESTONE","FINISH_MILESTONE"]){
    const a={id:"M",duration:0,activity_type};
    const r=rescheduleRemaining({scheduledActivities:[a],dataDateSlot:5,constraints:[{activity_id:"M",type:"MUST_FINISH_ON",slot:8}]});
    assert.equal(r.forecast[0].forecast_start_slot,8);
    assert.equal(r.forecast[0].forecast_finish_slot,8);
    assert.equal(r.forecast[0].milestone,true);
    assert.throws(()=>normalizeActivity({...a,duration:1}),/zero duration/);
    assert.throws(()=>rescheduleRemaining({scheduledActivities:[a],dataDateSlot:5,updates:{M:{actual_start_slot:2,remaining_duration:0}}}),/MILESTONE_ACTUALS_MUST_MATCH/);
    const done=rescheduleRemaining({scheduledActivities:[a],dataDateSlot:5,updates:{M:{actual_start_slot:2,actual_finish_slot:2}}});
    assert.equal(done.project.forecast_finish_slot,2);
  }
});

test("contract-only activity execution, calendar and constraint priority semantics fail closed",()=>{
  assert.throws(()=>scheduleNetwork({activities:[{id:"LOE",duration:1,activity_type:"LEVEL_OF_EFFORT"}]}),/does not execute LEVEL_OF_EFFORT/i);
  assert.throws(()=>scheduleNetwork({activities:[activity,{id:"B",duration:1,calendar_id:"OTHER"}]}),/Multiple activity calendars/);
  assert.throws(()=>scheduleNetwork({activities:[activity],constraints:[{activity_id:"A",type:"MUST_START_ON",slot:2,priority:1}]}),/priority/);
  assert.throws(()=>scheduleNetwork({activities:[activity,{id:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",lag:1,lag_calendar_id:"C1"}]}),/lag calendars/);
  assert.throws(()=>scheduleNetwork({activities:[{id:"A",activity_id:"B",duration:1}]}),/Conflicting id/);
});

test("every SS/SF predecessor late finish respects the project completion boundary",()=>{
  for(const type of ["SS","SF"]){
    const s=scheduleNetwork({activities:[{id:"A",duration:10},{id:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",type,lag:0}],requiredFinish:5});
    const a=s.activities.find(a=>a.id==="A");
    assert.equal(a.ls,-5,type);assert.equal(a.lf,5,type);assert.equal(a.total_float,-5,type);
  }
});

test("fractional slot roundoff does not manufacture an exact-date violation",()=>{
  const s=scheduleNetwork({activities:[{id:"A",duration:0.1},{id:"B",duration:0.2},{id:"C",duration:1}],
    relationships:[{predecessor:"A",successor:"B"},{predecessor:"B",successor:"C"}],
    constraints:[{activity_id:"C",type:"MUST_START_ON",slot:0.3}]});
  assert.equal(s.constraints[0].ok,true);
  assert.ok(Math.abs(s.constraints[0].variance)<1e-9);
});


test("suspend/resume progress delays only the remaining segment",()=>{
  const r=rescheduleRemaining({scheduledActivities:[{id:"A",duration:10}],dataDateSlot:5,
    updates:{A:{actual_start_slot:0,remaining_duration:3,suspend_slot:4,resume_slot:8}}});
  const a=r.forecast[0];
  assert.equal(a.forecast_start_slot,8);
  assert.equal(a.forecast_finish_slot,11);
  assert.equal(r.status[0].suspended_at_data_date,true);
  assert.equal(r.status[0].suspend_slot,4);
  assert.equal(r.status[0].resume_slot,8);
  assert.equal(r.boundary_constraints[0].source,"SUSPEND_RESUME");
  assert.equal(r.boundary_constraints[0].min_start_slot,8);

  const resumed=rescheduleRemaining({scheduledActivities:[{id:"A",duration:10}],dataDateSlot:5,
    updates:{A:{actual_start_slot:0,remaining_duration:3,suspend_slot:3,resume_slot:4}}});
  assert.equal(resumed.forecast[0].forecast_start_slot,5);
  assert.equal(resumed.status[0].suspended_at_data_date,false);
  assert.equal(resumed.boundary_constraints.length,0);
});

test("suspend/resume progress validation fails closed",()=>{
  const base={scheduledActivities:[{id:"A",duration:10}],dataDateSlot:5};
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{actual_start_slot:0,remaining_duration:3,suspend_slot:4}}}),/SUSPEND_RESUME_PAIR_REQUIRED/);
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{actual_start_slot:0,remaining_duration:3,resume_slot:8}}}),/SUSPEND_RESUME_PAIR_REQUIRED/);
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{actual_start_slot:2,remaining_duration:3,suspend_slot:1,resume_slot:8}}}),/SUSPEND_BEFORE_ACTUAL_START/);
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{actual_start_slot:0,remaining_duration:3,suspend_slot:6,resume_slot:8}}}),/SUSPEND_AFTER_DATA_DATE/);
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{actual_start_slot:0,remaining_duration:3,suspend_slot:4,resume_slot:3}}}),/RESUME_BEFORE_SUSPEND/);
  assert.throws(()=>rescheduleRemaining({...base,updates:{A:{suspend_slot:4,resume_slot:8}}}),/SUSPEND_RESUME_REQUIRES_IN_PROGRESS/);
});
