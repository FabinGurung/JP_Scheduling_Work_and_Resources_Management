import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {calculateExample} from "../src/presentation/engine-lab.mjs";
import {buildWorkingCalendar,finishSlotToDate,scheduleToDates} from "../src/kernel/calendar.mjs";
import {inspectSchedule} from "../src/kernel/qa.mjs";

const demo=JSON.parse(await readFile(new URL("../examples/kernel-network.json",import.meta.url)));

test("Engine Lab uses the same declared constraints in baseline and remaining-work scheduling",()=>{
  const constrained=calculateExample(demo),unconstrained=calculateExample(demo,{applyConstraints:false});
  assert.equal(constrained.schedule.constraints.length,demo.constraints.length);
  assert.equal(constrained.remaining.constraints.length,demo.constraints.length);
  assert.equal(unconstrained.schedule.constraints.length,0);
  assert.equal(unconstrained.remaining.constraints.length,0);
  assert.equal(constrained.remaining.status.find(a=>a.activity_id==="A030").actual_start_slot,5);
  assert.equal(constrained.remaining.forecast.find(a=>a.id==="A060").forecast_start_slot,19);
  assert.equal(unconstrained.remaining.forecast.find(a=>a.id==="A060").forecast_start_slot,17);
  assert.equal(constrained.schedule.activities.find(a=>a.id==="A090").activity_type,"FINISH_MILESTONE");
  assert.ok(constrained.qa.findings.some(f=>f.code==="CONSTRAINT_VIOLATION"));
});

test("Engine Lab recalculation rejects data dates before actuals and recomputes later forecasts",()=>{
  assert.throws(()=>calculateExample(demo,{dataDateSlot:4}),/ACTUAL_(START|FINISH)_AFTER_DATA_DATE/);
  const at7=calculateExample(demo),at10=calculateExample(demo,{dataDateSlot:10});
  assert.equal(at7.remaining.data_date_slot,7);assert.equal(at10.remaining.data_date_slot,10);
  assert.equal(at10.remaining.forecast.find(a=>a.id==="A030").forecast_start_slot,10);
  assert.ok(at10.remaining.project.forecast_finish_slot>=at7.remaining.project.forecast_finish_slot);
});

test("working-date mapping does not invent a date outside the declared horizon",()=>{
  const dates=buildWorkingCalendar({start:"2026-10-02",end:"2026-10-06",workingWeekdays:[1,2,3,4,5],holidays:["2026-10-05"]});
  assert.deepEqual(dates,["2026-10-02","2026-10-06"]);
  assert.equal(finishSlotToDate(2,0,dates),null);
  assert.equal(finishSlotToDate(2,2,dates),"2026-10-06");
  const a=scheduleToDates({activities:[{es:0,ef:1,ls:-2,lf:-1,duration:1}]},dates)[0];
  assert.equal(a.late_start_date,null);assert.equal(a.late_finish_date,null);
  for(const options of [{start:"2026-02-30",end:"2026-03-01"},{start:"2026-10-02",end:"2026-10-01"},{start:"2026-10-02",end:"2026-10-06",workingWeekdays:[8]}]) assert.throws(()=>buildWorkingCalendar(options));
});

test("schedule diagnostics distinguish intentional open ends from actual warning findings",()=>{
  const schedule={activities:[{id:"A",total_float:-2},{id:"B",total_float:0}],constraints:[{activity_id:"A",ok:false}]};
  const relationships=[{predecessor:"A",successor:"B",type:"SS",lag:-1},{predecessor:"A",successor:"B",type:"SS",lag:-1}];
  const qa=inspectSchedule({schedule,relationships,status:[{activity_id:"B",issues:["SHOULD_HAVE_STARTED"]}]});
  assert.equal(qa.counts.information,2);
  assert.ok(qa.findings.some(f=>f.code==="DUPLICATE_RELATIONSHIP"));
  assert.ok(qa.findings.some(f=>f.code==="NEGATIVE_FLOAT"));
  assert.ok(qa.findings.some(f=>f.code==="CONSTRAINT_VIOLATION"));
  assert.ok(qa.findings.some(f=>f.code==="SHOULD_HAVE_STARTED"));
});
