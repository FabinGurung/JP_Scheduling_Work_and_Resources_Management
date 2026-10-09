import test from "node:test";
import assert from "node:assert/strict";
import {examplePlanner,calculatePlanner,dateAt} from "../src/presentation/planner.mjs";
test("sample invokes serial resource leveling with dates and shared resource",()=>{
 const out=calculatePlanner(examplePlanner());
 assert.equal(out.schedule.resource_leveling_applied,true);
 assert.equal(out.schedule.policy,"SERIAL_TOPOLOGICAL_ID");
 assert.equal(out.tasks.length,6);
 assert.ok(out.tasks.some(a=>a.leveling_delayed));
 assert.ok(out.schedule.material_allocations.some(a=>a.resource_id==="CEMENT"));
 assert.equal(dateAt("2026-10-12",1),"2026-10-13");
});
test("increased capacity allows parallel steel and formwork",()=>{
 const data=examplePlanner();
 data.resources.find(r=>r.id==="CIVIL").max_units=2;
 const x=calculatePlanner(data);
 assert.equal(x.tasks.find(a=>a.activity_id==="A030").start,x.tasks.find(a=>a.activity_id==="A040").start);
});
test("unsupported progress constraints and invalid assignments fail closed",()=>{
 const d=examplePlanner();
 assert.throws(()=>calculatePlanner({...d,activities:[{...d.activities[0],status:"IN_PROGRESS"},...d.activities.slice(1)]}),/progress|actual/i);
 assert.throws(()=>calculatePlanner({...d,constraints:[{activity_id:"A010",type:"MUST_START_ON",date:"2026-10-12"}]}),/constraint/i);
 assert.throws(()=>calculatePlanner({...d,assignments:[...d.assignments,{activity_id:"A010",resource_id:"MISSING",units:1}]}),/unknown resource/i);
 assert.throws(()=>calculatePlanner({...d,relationships:[{predecessor:"A010",successor:"A020"},{predecessor:"A020",successor:"A010"}]}),/cyclic/i);
});
test("JSON roundtrip retains engine result",()=>{
 const d=examplePlanner();
 assert.deepEqual(calculatePlanner(d).schedule,calculatePlanner(JSON.parse(JSON.stringify(d))).schedule);
});
