import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {calendarDaySnapshot,activeInDay,monthDays} from "../src/presentation/scheduling-desk.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const fixture=()=>({activities:[
 {id:"A",title:"Foundation",start_date:"2026-12-30",finish_date:"2027-01-03",duration:4},
 {id:"B",title:"Formwork",start_date:"2027-01-01",finish_date:"2027-01-02",duration:1},
 {id:"M",title:"Hold milestone",start_date:"2027-01-02",finish_date:"2027-01-02",duration:0}
]});
test("calendar shows EVERY active scenario day of a Gantt bar, not just start and finish events",()=>{
 const model=fixture();
 const before=calendarDaySnapshot(model,"2026-12-29","A");
 assert.equal(before.activeCount,0);
 const dec30=calendarDaySnapshot(model,"2026-12-30","A");
 assert.equal(dec30.activeCount,1);
 assert.equal(dec30.boundaryCount,1);
 assert.equal(dec30.selectedWorking,true);
 const dec31=calendarDaySnapshot(model,"2026-12-31","A");
 assert.equal(dec31.activeCount,1);
 assert.equal(dec31.boundaryCount,0);
 assert.equal(dec31.selectedWorking,true);
 const jan1=calendarDaySnapshot(model,"2027-01-01","A");
 assert.deepEqual(jan1.working.map(a=>a.id),["A","B"]);
 assert.equal(jan1.boundaryCount,1);
 const jan2=calendarDaySnapshot(model,"2027-01-02","M");
 assert.equal(jan2.activeCount,1);
 assert.equal(jan2.boundaryCount,3); // B finish + milestone start/finish
 assert.equal(jan2.selectedBoundary,true);
 assert.equal(jan2.selectedWorking,false);
 assert.ok(jan2.items.some(a=>a.id==="M"));
 const jan3=calendarDaySnapshot(model,"2027-01-03","A");
 assert.equal(jan3.activeCount,0);
 assert.equal(jan3.boundaryCount,1); // Exclusive finish
 assert.equal(jan3.selectedBoundary,true);
 assert.equal(activeInDay(model.activities[0],"2027-01-03"),false);
});
test("changing the one source activity date automatically changes the matching calendar projection",()=>{
 const model=fixture();
 assert.ok(calendarDaySnapshot(model,"2027-01-01").working.some(a=>a.id==="B"));
 const revised=structuredClone(model);
 revised.activities[1].start_date="2027-01-02";
 revised.activities[1].finish_date="2027-01-04";
 const original=calendarDaySnapshot(model,"2027-01-01");
 const after=calendarDaySnapshot(revised,"2027-01-01");
 assert.equal(original.activeCount,2);
 assert.equal(after.activeCount,1);
 assert.ok(calendarDaySnapshot(revised,"2027-01-03").working.some(a=>a.id==="B"));
 assert.equal(calendarDaySnapshot(model,"2027-01-03").activeCount,0);
 assert.equal(calendarDaySnapshot(revised,"2027-01-04").activeCount,0);
});
test("Gregorian calendar gives 28/29 day February and rejects fabricated rollover calendar dates",()=>{
 assert.equal(monthDays(2026,1),28);
 assert.equal(monthDays(2028,1),29);
 assert.throws(()=>calendarDaySnapshot(fixture(),"2027-02-29"),/ISO/);
 assert.throws(()=>calendarDaySnapshot(fixture(),"2027-02-30"),/ISO/);
 assert.throws(()=>calendarDaySnapshot(fixture(),"not-a-date"),/ISO/);
});
test("primary site viewer has exactly two views; old deep link remains compatible only through bottom predecessor tab",()=>{
 const ui=read("src/presentation/scheduling-desk.mjs");
 const project=read("src/presentation/project-catalog.mjs");
 assert.match(ui,/const modes=\["activities","calendar"\]/);
 assert.match(ui,/\["activities","Activities \+ Gantt"\],\["calendar","Year calendar"\]/);
 assert.doesNotMatch(ui,/\["dependencies","Before \/ Current \/ After"\]/);
 assert.doesNotMatch(ui,/function renderDependencyPanel/);
 assert.match(ui,/const legacy=requested==="dependencies"/);
 assert.match(ui,/if\(legacy\)state\.detailTab="Predecessors"/);
 assert.match(project,/narayani\/desk\.html#activities/);
 assert.match(project,/narayani\/desk\.html#calendar/);
 assert.doesNotMatch(project,/anchor\(links,"Before \/ Current \/ After/);
 assert.match(ui,/const views=\["General","Status","Resources","Predecessors","Successors"/);
});
test("calendar controls and Gantt selection share state, preserve original model data and navigate to scheduled month",()=>{
 const ui=read("src/presentation/scheduling-desk.mjs");
 const html=read("projects/narayani/desk.html");
 assert.match(ui,/const calendar=renderYearCalendar\(panelMap\.get\("calendar"\),model,state/);
 assert.match(ui,/if\(state\.activeMode==="calendar"\)calendar\.render\(\)/);
 assert.match(ui,/calendar\.followSelected\(\{scroll:true\}\)/);
 assert.match(ui,/state\.year=Number\(day\.slice\(0,4\)\)/);
 assert.match(ui,/cell\.dataset\.month=String\(month\)/);
 assert.match(ui,/month\.scrollIntoView|section\.scrollIntoView/);
 assert.match(ui,/b\.dataset\.count=String\(snap\.activeCount\)/);
 assert.match(ui,/b\.dataset\.selectedWork=String\(snap\.selectedWorking\)/);
 assert.match(ui,/Open selected in Gantt \+ details/);
 assert.match(ui,/No duplicate calendar entry|no duplicate calendar entry/);
 assert.doesNotMatch(ui,/localStorage|indexedDB|POST.*fetch/);
 assert.match(html,/data-schedule-project="narayani"/);
 assert.match(read("assets/scheduling-desk.css"),/desk-day\[data-selected-work="true"\]/);
});
