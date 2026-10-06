import test from "node:test";
import assert from "node:assert/strict";
import {scheduleCalendarNetwork,rescheduleCalendarRemaining,createCalendarEngine} from "../src/kernel/calendar-scheduler.mjs";

const calendars={
  FIVE:{working_weekdays:[1,2,3,4,5],holidays:[]},
  SIX:{working_weekdays:[1,2,3,4,5,6],holidays:[]},
  SIX_HOL:{working_weekdays:[1,2,3,4,5,6],holidays:["2026-10-10"]},
  SEVEN:{working_weekdays:[0,1,2,3,4,5,6],holidays:[]}
};
const base={projectStart:"2026-10-05",horizonStart:"2026-09-01",horizonEnd:"2026-12-31",calendars,projectCalendarId:"FIVE"};

function byId(s){return Object.fromEntries(s.activities.map(a=>[a.id,a]));}

test("cross-calendar FS uses the successor activity calendar",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type:"FS"}]});
  const a=byId(s);assert.equal(a.A.start_date,"2026-10-05");assert.equal(a.A.finish_date,"2026-10-09");
  assert.equal(a.B.start_date,"2026-10-10");assert.equal(a.B.finish_date,"2026-10-10");
});

test("a holiday on one activity calendar does not contaminate another",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX_HOL"}],relationships:[{predecessor:"A",successor:"B",type:"FS"}]});
  assert.equal(byId(s).B.start_date,"2026-10-12");
});

test("PREDECESSOR and SUCCESSOR lag calendars are explicitly different",()=>{
  const input={...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}]};
  const pred=scheduleCalendarNetwork({...input,relationships:[{predecessor:"A",successor:"B",type:"FS",lag:1,lag_calendar_mode:"PREDECESSOR"}]});
  const succ=scheduleCalendarNetwork({...input,relationships:[{predecessor:"A",successor:"B",type:"FS",lag:1,lag_calendar_mode:"SUCCESSOR"}]});
  assert.equal(byId(pred).B.start_date,"2026-10-13");
  assert.equal(byId(succ).B.start_date,"2026-10-12");
  assert.equal(pred.relationships[0].lag_calendar_id,"FIVE");assert.equal(succ.relationships[0].lag_calendar_id,"SIX");
});

test("EXPLICIT lag calendar requires and records an explicit calendar",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type:"FS",lag:1,lag_calendar_mode:"EXPLICIT",lag_calendar_id:"SEVEN"}]});
  assert.equal(byId(s).B.start_date,"2026-10-12");assert.equal(s.relationships[0].lag_calendar_id,"SEVEN");
  assert.throws(()=>scheduleCalendarNetwork({...base,activities:[{id:"A",duration:1}],relationships:[{predecessor:"A",successor:"A",lag_calendar_mode:"EXPLICIT"}]}),/requires lag_calendar_id/);
});

test("signed negative lag is a working-calendar lead",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type:"FS",lag:-1,lag_calendar_mode:"PREDECESSOR"}]});
  assert.equal(byId(s).B.start_date,"2026-10-09");
});

test("all four relationship types are evaluated in common civil-day event coordinates",()=>{
  const expected={FS:7,SS:0,FF:3,SF:0};
  for(const type of Object.keys(expected)){
    const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:2,calendar_id:"FIVE"}],relationships:[{predecessor:"A",successor:"B",type}]});
    assert.equal(byId(s).B.es,Math.max(0,expected[type]),type);
  }
});

test("backward pass finds latest feasible placements across different calendars",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:2,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type:"FS"}],requiredFinish:6});
  const a=byId(s);assert.ok(a.A.ls>=a.A.es);assert.ok(a.B.ls>=a.B.es);assert.equal(a.B.lf,6);
  assert.equal(a.A.lf,a.B.ls);
});

test("native constraints operate on calendar event points and report dates",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:2,calendar_id:"FIVE"}],constraints:[{activity_id:"A",type:"START_ON_OR_AFTER",date:"2026-10-08"},{activity_id:"A",type:"FINISH_ON_OR_BEFORE",date:"2026-10-13"}],requiredFinish:"2026-10-13"});
  const a=byId(s).A;assert.equal(a.start_date,"2026-10-08");assert.equal(a.finish_date,"2026-10-09");assert.deepEqual(s.constraints.map(x=>x.ok),[true,true]);
});

test("MUST constraints remain visible conflicts rather than silently overriding relationships",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:3,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"FIVE"}],relationships:[{predecessor:"A",successor:"B",type:"FS"}],constraints:[{activity_id:"B",type:"MUST_START_ON",slot:1}]});
  assert.equal(s.constraints[0].ok,false);assert.ok(byId(s).B.total_float<0);
});

test("typed milestones remain atomic zero-duration event points",()=>{
  const s=scheduleCalendarNetwork({...base,activities:[{id:"M",duration:0,activity_type:"FINISH_MILESTONE",calendar_id:"FIVE"}],constraints:[{activity_id:"M",type:"MUST_START_ON",date:"2026-10-11"}],requiredFinish:"2026-10-11"});
  const m=byId(s).M;assert.equal(m.es,m.ef);assert.equal(m.start_date,"2026-10-11");assert.equal(m.finish_date,"2026-10-11");
  assert.throws(()=>scheduleCalendarNetwork({...base,activities:[{id:"M",duration:1,activity_type:"START_MILESTONE"}]}),/zero duration/);
});

test("calendar-aware duration is integer working days and horizon exhaustion fails closed",()=>{
  assert.throws(()=>scheduleCalendarNetwork({...base,activities:[{id:"A",duration:1.5,calendar_id:"FIVE"}]}),/integer number of working days/);
  assert.throws(()=>scheduleCalendarNetwork({projectStart:"2026-10-05",horizonStart:"2026-10-05",horizonEnd:"2026-10-05",calendars:{FIVE:calendars.FIVE},activities:[{id:"A",duration:2,calendar_id:"FIVE"}]}),/horizon/);
});

test("calendar engine preserves bounded signed lag semantics",()=>{
  const e=createCalendarEngine(base);assert.equal(e.shiftEvent(5,1,"FIVE"),8);assert.equal(e.shiftEvent(5,-1,"FIVE"),4);
  assert.equal(e.eventDate(0),"2026-10-05");
});

test("remaining-work scheduling uses completed predecessor actuals with its lag calendar",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:2,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type:"FS",lag:1,lag_calendar_mode:"PREDECESSOR"}]});
  const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,relationships:baseline.relationships,dataDate:"2026-10-12",updates:{A:{actual_start_date:"2026-10-05",actual_finish_date:"2026-10-09"}}});
  const b=r.forecast.find(x=>x.id==="B");assert.equal(b.start_date,"2026-10-12");assert.equal(r.boundary_constraints[0].lag_calendar_id,"FIVE");
});

test("in-progress predecessor SS/SF use immutable actual start while remaining work starts at data date",()=>{
  for(const type of ["SS","SF"]){
    const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:2,calendar_id:"SIX"}],relationships:[{predecessor:"A",successor:"B",type,lag:2,lag_calendar_mode:"PROJECT"}]});
    const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,relationships:baseline.relationships,dataDate:"2026-10-08",updates:{A:{actual_start_date:"2026-10-05",remaining_duration:3}}});
    assert.equal(r.boundary_constraints[0].source,"IN_PROGRESS_PREDECESSOR_ACTUAL_START",type);
    assert.ok(r.forecast.find(x=>x.id==="A").es>=3,type);
  }
});

test("start constraints on in-progress work check actual start without moving the remaining segment",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:5,calendar_id:"FIVE"}]});
  const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,dataDate:"2026-10-08",updates:{A:{actual_start_date:"2026-10-05",remaining_duration:2}},constraints:[{activity_id:"A",type:"MUST_START_ON",date:"2026-10-05"}]});
  assert.equal(r.constraints[0].basis,"ACTUAL_START");assert.equal(r.constraints[0].ok,true);assert.equal(r.forecast[0].start_date,"2026-10-08");
});

test("completed work keeps actual-based constraint checks when no remaining work exists",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:2,calendar_id:"FIVE"}]});
  const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,dataDate:"2026-10-12",updates:{A:{actual_start_date:"2026-10-05",actual_finish_date:"2026-10-06"}},constraints:[{activity_id:"A",type:"MUST_FINISH_ON",date:"2026-10-06"}]});
  assert.equal(r.remaining_schedule,null);assert.equal(r.constraints[0].basis,"ACTUAL_FINISH");assert.equal(r.constraints[0].ok,true);
});

test("data-date and actual validation fail closed",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:2,calendar_id:"FIVE"}]});
  assert.throws(()=>rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,dataDate:"2026-10-06",updates:{A:{actual_start_date:"2026-10-07",remaining_duration:1}}}),/ACTUAL_START_AFTER_DATA_DATE/);
  assert.throws(()=>rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,dataDate:"2026-10-06",updates:{A:{actual_start_date:"2026-10-05"}}}),/REMAINING_DURATION_REQUIRED/);
});

test("ambiguous lag calendar declarations fail closed",()=>{
  assert.throws(()=>scheduleCalendarNetwork({...base,activities:[{id:"A",duration:1},{id:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",lag_calendar_mode:"PROJECT",lag_calendar_id:"FIVE"}]}),/requires EXPLICIT/);
  assert.throws(()=>scheduleCalendarNetwork({...base,activities:[{id:"A",duration:1},{id:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",lag_calendar_mode:"MAGIC"}]}),/Unsupported lag calendar mode/);
});


test("calendar remaining work respects a future resume boundary on the activity calendar",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:8,calendar_id:"FIVE"}]});
  const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,dataDate:"2026-10-08",
    updates:{A:{actual_start_date:"2026-10-05",remaining_duration:2,suspend_date:"2026-10-07",resume_date:"2026-10-11"}}});
  const a=r.forecast[0];
  assert.equal(a.start_date,"2026-10-12");
  assert.equal(a.finish_date,"2026-10-13");
  assert.equal(r.status[0].suspended_at_data_date,true);
  assert.equal(r.boundary_constraints[0].source,"SUSPEND_RESUME");
  assert.equal(r.boundary_constraints[0].required_date,"2026-10-11");
});

test("calendar suspend/resume validation fails closed",()=>{
  const baseline=scheduleCalendarNetwork({...base,activities:[{id:"A",duration:8,calendar_id:"FIVE"}]});
  const args={...base,scheduledActivities:baseline.activities,dataDate:"2026-10-08"};
  assert.throws(()=>rescheduleCalendarRemaining({...args,updates:{A:{actual_start_date:"2026-10-05",remaining_duration:2,suspend_date:"2026-10-07"}}}),/SUSPEND_RESUME_PAIR_REQUIRED/);
  assert.throws(()=>rescheduleCalendarRemaining({...args,updates:{A:{actual_start_date:"2026-10-05",remaining_duration:2,suspend_date:"2026-10-09",resume_date:"2026-10-12"}}}),/SUSPEND_AFTER_DATA_DATE/);
  assert.throws(()=>rescheduleCalendarRemaining({...args,updates:{A:{actual_start_date:"2026-10-05",remaining_duration:2,suspend_date:"2026-10-07",resume_date:"2026-10-06"}}}),/RESUME_BEFORE_SUSPEND/);
});


test("calendar progress QA evaluates out-of-sequence actuals on the resolved lag calendar",()=>{
  const relationships=[{predecessor:"A",successor:"B",type:"FS",lag:1,lag_calendar_mode:"PREDECESSOR"}];
  const baseline=scheduleCalendarNetwork({...base,
    activities:[{id:"A",duration:3,calendar_id:"FIVE"},{id:"B",duration:2,calendar_id:"SIX"}],
    relationships});
  const r=rescheduleCalendarRemaining({...base,scheduledActivities:baseline.activities,relationships:baseline.relationships,
    dataDate:"2026-10-12",
    updates:{
      A:{actual_start_date:"2026-10-05",actual_finish_date:"2026-10-08"},
      B:{actual_start_date:"2026-10-08",remaining_duration:1}
    }});
  const finding=r.progress_qa.findings.find(x=>x.code==="OUT_OF_SEQUENCE_PROGRESS");
  assert.ok(finding);
  assert.equal(finding.activity_id,"B");
  assert.equal(finding.relationship.lag_calendar_id,"FIVE");
  assert.ok(finding.required_slot>finding.actual_slot);
});
