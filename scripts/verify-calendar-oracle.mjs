import assert from "node:assert/strict";
import {createCalendarEngine,scheduleCalendarNetwork} from "../src/kernel/calendar-scheduler.mjs";

const calendars={
  FIVE:{working_weekdays:[1,2,3,4,5],holidays:["2026-10-14"]},
  SIX:{working_weekdays:[1,2,3,4,5,6],holidays:["2026-10-10"]},
  SEVEN:{working_weekdays:[0,1,2,3,4,5,6],holidays:["2026-10-12"]}
};
const pairs=[["FIVE","SIX"],["SIX","FIVE"],["FIVE","FIVE"],["SIX","SIX"]];
const modes=["PREDECESSOR","SUCCESSOR","PROJECT"],types=["FS","SS","FF","SF"],lags=[-1,0,1],durations=[0,1,2];
let cases=0;

function relationOk(rel,p,s,e){
  const anchor=rel.type==="FS"||rel.type==="FF"?p.finish:p.start;
  const required=e.shiftEvent(anchor,rel.lag,rel.lag_calendar_id);
  return (rel.type==="FS"||rel.type==="SS"?s.start:s.finish)>=required;
}
for(const projectCalendarId of ["FIVE","SIX","SEVEN"]){
  const common={projectStart:"2026-10-05",horizonStart:"2026-09-01",horizonEnd:"2026-11-30",calendars,projectCalendarId};
  const engine=createCalendarEngine(common);
  for(const [pc,sc] of pairs) for(const type of types) for(const lag of lags) for(const pd of durations) for(const sd of durations) for(const mode of modes){
    const rel={predecessor:"A",successor:"B",type,lag,lag_calendar_mode:mode};
    const schedule=scheduleCalendarNetwork({...common,activities:[{id:"A",duration:pd,calendar_id:pc},{id:"B",duration:sd,calendar_id:sc}],relationships:[rel],requiredFinish:24});
    const resolved=schedule.relationships[0],A=schedule.activities.find(a=>a.id==="A"),B=schedule.activities.find(a=>a.id==="B");
    const pred=engine.placeForward(pc,0,pd);
    let earliest=null;
    for(let c=0;c<=24;c++){
      const succ=engine.placeForward(sc,c,sd);
      if(relationOk(resolved,pred,succ,engine)){earliest=succ;break;}
    }
    assert.ok(earliest);assert.equal(A.es,pred.start);assert.equal(A.ef,pred.finish);assert.equal(B.es,earliest.start);assert.equal(B.ef,earliest.finish);
    let latestB=null;
    for(let c=24;c>=engine.minEvent;c--){
      const p=engine.placeForward(sc,c,sd);if(p.finish<=24){latestB=p;break;}
    }
    assert.ok(latestB);assert.equal(B.ls,latestB.start);assert.equal(B.lf,latestB.finish);
    let latestA=null;
    for(let c=24;c>=engine.minEvent;c--){
      const p=engine.placeForward(pc,c,pd);if(p.finish<=24&&relationOk(resolved,p,latestB,engine)){latestA=p;break;}
    }
    assert.ok(latestA);assert.equal(A.ls,latestA.start);assert.equal(A.lf,latestA.finish);
    cases++;
  }
}
assert.equal(cases,3888);
console.log(`Calendar oracle PASS: ${cases} cases across calendars, holidays, FS/SS/FF/SF, signed lag and lag-calendar modes.`);
