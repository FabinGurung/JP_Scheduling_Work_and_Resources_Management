import test from "node:test";
import assert from "node:assert/strict";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {evaluateConstraintViolations} from "../src/kernel/constraints.mjs";
import {rescheduleRemainingFS} from "../src/kernel/status.mjs";
import {buildWbsTree,rollupWbs} from "../src/kernel/wbs.mjs";

test("v0.3 constraint evaluator identifies violated latest finish",()=>{
  const s=scheduleNetwork({activities:[{id:"A",duration:5},{id:"B",duration:5}],relationships:[{predecessor:"A",successor:"B",type:"FS"}]});
  const r=evaluateConstraintViolations({scheduledActivities:s.activities,constraints:[{activity_id:"B",type:"FINISH_ON_OR_BEFORE",slot:8}]});
  assert.equal(r[0].ok,false); assert.equal(r[0].calculated_slot,10); assert.equal(r[0].variance,2);
});

test("v0.3 data-date rescheduler removes completed predecessor and reschedules remaining FS work",()=>{
  const base=scheduleNetwork({activities:[{id:"A",duration:3},{id:"B",duration:4},{id:"C",duration:2}],relationships:[{predecessor:"A",successor:"B",type:"FS"},{predecessor:"B",successor:"C",type:"FS"}]});
  const r=rescheduleRemainingFS({scheduledActivities:base.activities,relationships:[{predecessor:"A",successor:"B",type:"FS"},{predecessor:"B",successor:"C",type:"FS"}],updates:{A:{actual_start_slot:0,actual_finish_slot:3},B:{actual_start_slot:3,remaining_duration:2}},dataDateSlot:5});
  const by=Object.fromEntries(r.forecast.map(a=>[a.id,a]));
  assert.equal(by.B.forecast_start_slot,5); assert.equal(by.B.forecast_finish_slot,7); assert.equal(by.C.forecast_start_slot,7);
});

test("v0.3 rescheduler fails closed on non-FS remaining logic",()=>{
  const base=scheduleNetwork({activities:[{id:"A",duration:3},{id:"B",duration:3}],relationships:[{predecessor:"A",successor:"B",type:"SS"}]});
  assert.throws(()=>rescheduleRemainingFS({scheduledActivities:base.activities,relationships:[{predecessor:"A",successor:"B",type:"SS"}],updates:{},dataDateSlot:1}),/FS relationships only/i);
});

test("v0.3 WBS tree validates and rolls up activities",()=>{
  const nodes=[{wbs_id:"W1",name:"Project"},{wbs_id:"W1.1",parent_wbs_id:"W1",name:"Structure"}];
  const tree=buildWbsTree(nodes); assert.equal(tree[0].children[0].wbs_id,"W1.1");
  const roll=rollupWbs({nodes,activities:[{id:"A",wbs_id:"W1.1",duration:5},{id:"B",wbs_id:"W1.1",duration:3}]});
  assert.equal(roll[0].activity_count,2); assert.equal(roll[0].total_activity_duration,8);
});
