import test from "node:test";
import assert from "node:assert/strict";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {evaluateConstraintViolations} from "../src/kernel/constraints.mjs";
import {rescheduleRemaining,rescheduleRemainingFS} from "../src/kernel/status.mjs";
import {buildWbsTree,rollupWbs} from "../src/kernel/wbs.mjs";

test("v0.3 constraint evaluator identifies violated latest finish",()=>{
  const s=scheduleNetwork({activities:[{id:"A",duration:5},{id:"B",duration:5}],relationships:[{predecessor:"A",successor:"B",type:"FS"}]});
  const r=evaluateConstraintViolations({scheduledActivities:s.activities,constraints:[{activity_id:"B",type:"FINISH_ON_OR_BEFORE",slot:8}]});
  assert.equal(r[0].ok,false); assert.equal(r[0].calculated_slot,10); assert.equal(r[0].variance,2);
});

test("v0.3 start-not-earlier constraint drives forward scheduling",()=>{
  const s=scheduleNetwork({
    activities:[{id:"A",duration:3},{id:"B",duration:2}],
    relationships:[{predecessor:"A",successor:"B",type:"FS"}],
    constraints:[{activity_id:"B",type:"START_ON_OR_AFTER",slot:6}]
  });
  const by=Object.fromEntries(s.activities.map(a=>[a.id,a]));
  assert.equal(by.B.es,6); assert.equal(by.B.ef,8);
  assert.equal(s.constraints[0].ok,true);
});

test("v0.3 latest-finish constraint drives backward pass and exposes negative float when impossible",()=>{
  const s=scheduleNetwork({
    activities:[{id:"A",duration:5},{id:"B",duration:5}],
    relationships:[{predecessor:"A",successor:"B",type:"FS"}],
    constraints:[{activity_id:"B",type:"FINISH_ON_OR_BEFORE",slot:8}]
  });
  const by=Object.fromEntries(s.activities.map(a=>[a.id,a]));
  assert.equal(by.B.ls,3); assert.equal(by.B.total_float,-2);
  assert.equal(by.A.total_float,-2);
  assert.equal(s.constraints[0].ok,false);
});

test("v0.3 must-start constraint is exact when feasible and reports a conflict when relationship logic forces later",()=>{
  const feasible=scheduleNetwork({
    activities:[{id:"A",duration:5},{id:"B",duration:2}],
    relationships:[{predecessor:"A",successor:"B",type:"FS"}],
    constraints:[{activity_id:"B",type:"MUST_START_ON",slot:5}]
  });
  let b=feasible.activities.find(a=>a.id==="B");
  assert.equal(b.es,5); assert.equal(b.ls,5); assert.equal(feasible.constraints[0].ok,true);

  const conflict=scheduleNetwork({
    activities:[{id:"A",duration:5},{id:"B",duration:2}],
    relationships:[{predecessor:"A",successor:"B",type:"FS",lag:2}],
    constraints:[{activity_id:"B",type:"MUST_START_ON",slot:5}]
  });
  b=conflict.activities.find(a=>a.id==="B");
  assert.equal(b.es,7); assert.equal(b.ls,5); assert.equal(b.total_float,-2); assert.equal(conflict.constraints[0].ok,false);
});

test("v0.3 data-date rescheduler removes completed predecessor and preserves FS behavior",()=>{
  const rels=[{predecessor:"A",successor:"B",type:"FS"},{predecessor:"B",successor:"C",type:"FS"}];
  const base=scheduleNetwork({activities:[{id:"A",duration:3},{id:"B",duration:4},{id:"C",duration:2}],relationships:rels});
  const r=rescheduleRemainingFS({scheduledActivities:base.activities,relationships:rels,updates:{A:{actual_start_slot:0,actual_finish_slot:3},B:{actual_start_slot:3,remaining_duration:2}},dataDateSlot:5});
  const by=Object.fromEntries(r.forecast.map(a=>[a.id,a]));
  assert.equal(by.B.forecast_start_slot,5); assert.equal(by.B.forecast_finish_slot,7); assert.equal(by.C.forecast_start_slot,7);
});

test("v0.3 remaining rescheduler supports SS/FF/SF relationships with lag",()=>{
  const cases=[
    {type:"SS",lag:1,expectedStart:6,expectedFinish:9},
    {type:"FF",lag:2,expectedStart:8,expectedFinish:11},
    {type:"SF",lag:5,expectedStart:7,expectedFinish:10}
  ];
  for(const c of cases){
    const rels=[{predecessor:"A",successor:"B",type:c.type,lag:c.lag}];
    const base=scheduleNetwork({activities:[{id:"A",duration:4},{id:"B",duration:3}],relationships:rels});
    const r=rescheduleRemaining({scheduledActivities:base.activities,relationships:rels,updates:{},dataDateSlot:5});
    const by=Object.fromEntries(r.forecast.map(a=>[a.id,a]));
    assert.equal(by.B.forecast_start_slot,c.expectedStart,`${c.type} start`);
    assert.equal(by.B.forecast_finish_slot,c.expectedFinish,`${c.type} finish`);
  }
});

test("v0.3 completed predecessor actuals carry forward unresolved relationship lag",()=>{
  const rels=[{predecessor:"A",successor:"B",type:"FS",lag:3}];
  const base=scheduleNetwork({activities:[{id:"A",duration:4},{id:"B",duration:2}],relationships:rels});
  const r=rescheduleRemaining({scheduledActivities:base.activities,relationships:rels,updates:{A:{actual_start_slot:0,actual_finish_slot:4}},dataDateSlot:5});
  const b=r.forecast.find(a=>a.id==="B");
  assert.equal(b.forecast_start_slot,7);
  assert.equal(r.boundary_constraints.length,1);
  assert.equal(r.boundary_constraints[0].min_start_slot,7);
});

test("v0.3 start-driving logic into an already in-progress successor is treated as satisfied",()=>{
  const rels=[{predecessor:"A",successor:"B",type:"FS",lag:0}];
  const base=scheduleNetwork({activities:[{id:"A",duration:4},{id:"B",duration:6}],relationships:rels});
  const r=rescheduleRemaining({scheduledActivities:base.activities,relationships:rels,updates:{B:{actual_start_slot:2,remaining_duration:2}},dataDateSlot:5});
  const b=r.forecast.find(a=>a.id==="B");
  assert.equal(b.forecast_start_slot,5);
  assert.equal(b.forecast_finish_slot,7);
});

test("v0.3 completed predecessor SS/SF logic fails closed if required actual start is missing",()=>{
  const rels=[{predecessor:"A",successor:"B",type:"SS",lag:6}];
  const base=scheduleNetwork({activities:[{id:"A",duration:4},{id:"B",duration:2}],relationships:rels});
  assert.throws(()=>rescheduleRemaining({scheduledActivities:base.activities,relationships:rels,updates:{A:{actual_finish_slot:4}},dataDateSlot:5}),/requires actual_start_slot/i);
});

test("v0.3 WBS tree validates and rolls up activities",()=>{
  const nodes=[{wbs_id:"W1",name:"Project"},{wbs_id:"W1.1",parent_wbs_id:"W1",name:"Structure"}];
  const tree=buildWbsTree(nodes); assert.equal(tree[0].children[0].wbs_id,"W1.1");
  const roll=rollupWbs({nodes,activities:[{id:"A",wbs_id:"W1.1",duration:5},{id:"B",wbs_id:"W1.1",duration:3}]});
  assert.equal(roll[0].activity_count,2); assert.equal(roll[0].total_activity_duration,8);
});
