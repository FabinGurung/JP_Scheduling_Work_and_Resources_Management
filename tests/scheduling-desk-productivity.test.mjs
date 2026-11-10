import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateProductivityCatalog,findWork,calculateWorkRate} from "../src/reference/productivity-norms.mjs";
import {monthDays,activeInDay,inspectDeskModel,linkContext,scheduleWindow} from "../src/presentation/scheduling-desk.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const data=()=>JSON.parse(read("work-items/productivity-norms.v1.json"));
test("88 work-rate records preserve both owner-supplied enumerations and reference authority",()=>{
 const d=data();assert.equal(validateProductivityCatalog(d),true);
 assert.equal(d.items.filter(x=>x.key.startsWith("BOQ:")).length,37);
 assert.equal(d.items.filter(x=>x.key.startsWith("WBS:")).length,51);
 for(const key of ["BOQ:1","BOQ:8.1","BOQ:17.1","BOQ:19.1","BOQ:19.2","BOQ:33",
  "WBS:1.0","WBS:1.1","WBS:6.8","WBS:7.8","WBS:9.1","WBS:33.0"])
  assert.ok(findWork(d,key),"Missing "+key);
 assert.equal(d.items.filter(x=>x.rate_key).length,30);
 assert.equal(d.items.filter(x=>x.rate_key===null).length,58);
 assert.ok(d.items.every(x=>x.no_actual_duration&&x.no_approval&&x.no_verified_quantity));
});
test("Nepal government plaster and concrete coefficients correctly represent worker-days per unit",()=>{
 const d=data(),plaster=findWork(d,"BOQ:9"),m20=findWork(d,"BOQ:6");
 assert.equal(plaster.rate.skilled_md,0.12);
 assert.equal(plaster.rate.unskilled_md,0.16);
 assert.equal(plaster.rate.unit,"m²");
 assert.equal(m20.rate.skilled_md,0.5);
 assert.equal(m20.rate.unskilled_md,3.5);
 assert.equal(m20.rate.unit,"m³");
 assert.equal(m20.rate.source,"NEP-IRR-2081");
});
test("crew bottleneck computes daily output without authorizing any actual site duration",()=>{
 const d=data(),rate=findWork(d,"BOQ:9").rate;
 const props={quantity:100,skilled:2,unskilled:4,days:5,rate,unit:"m²"};
 const calc=calculateWorkRate({...props,applicabilityConfirmed:true});
 assert.equal(calc.status,"REFERENCE_SCENARIO_ONLY");
 assert.ok(Math.abs(calc.nominal_units_per_workday-(2/0.12))<1e-8);
 assert.equal(calc.rounded_workday_slots,6);
 assert.equal(calc.excludes_waits_holidays_and_actual_field_progress,true);
 assert.equal(calculateWorkRate({...props,applicabilityConfirmed:false}).status,"NO_ADMITTED_COEFFICIENT");
 const partial=calculateWorkRate({quantity:100,skilled:2,unskilled:3,days:5,
  rate:findWork(d,"BOQ:26").rate,unit:"kg",applicabilityConfirmed:true});
 assert.equal(partial.status,"PARTIAL_LABOUR_BASIS");
 assert.throws(()=>calculateWorkRate({...props,unit:"m³",applicabilityConfirmed:true}),/unit/);
});
test("Gregorian dates and 3 modes use true months and source-exclusive finish boundaries",()=>{
 assert.equal(monthDays(2027,1),28);
 assert.equal(monthDays(2028,1),29);
 assert.equal(monthDays(2026,3),30);
 assert.equal(monthDays(2026,0),31);
 const a={start_date:"2026-10-01",finish_date:"2026-10-03"};
 assert.equal(activeInDay(a,"2026-10-01"),true);
 assert.equal(activeInDay(a,"2026-10-02"),true);
 assert.equal(activeInDay(a,"2026-10-03"),false);
 const ui=read("src/presentation/scheduling-desk.mjs");
 for(const col of ["Activity ID","Activity name","WBS","Original duration","Start","Finish*","Status","Predecessors"])
  assert.ok(ui.includes('"'+col+'"'));
 for(const token of ["NORTH · View controls","WEST · Activity data","EAST · Aligned Gantt timeline",
  "SOUTH · Selected activity inspector","WEST · Prerequisites / Before","EAST · Follow-on / After"])
  assert.ok(ui.includes(token));
 assert.doesNotMatch(ui,/layoutOrganicSkillTree|renderConstellation|renderChecklist|localStorage/);
});
test("source/relationship validator refuses fake progress or unknown links",()=>{
 const m={format:"SKYFORGE_GENERIC_VIEW_MODEL_V1",classification:"PUBLIC_SYNTHETIC_DRAFT_ONLY",
  engineering_release:false,baseline_approved:false,views_basis:"ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL",
  input_sha256:"a".repeat(64),project:{id:"TEST",name:"Test"},wbs:[{id:"W1",title:"Test"}],
  activities:[{id:"A",title:"A",wbs_id:"W1",start:0,finish:3,duration:3,status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false},
   {id:"B",title:"B",wbs_id:"W1",start:3,finish:4,duration:1,status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false}],
  links:[{from:"A",to:"B",type:"FS",lag:0}],calendar_events:[],checklist:[],
  counts:{wbs:1,activities:2,links:1,checklist:0}};
 assert.equal(inspectDeskModel(m),true);
 assert.deepEqual(linkContext(m,"A").successors.map(x=>x.other.id),["B"]);
 assert.deepEqual(linkContext(m,"B").predecessors.map(x=>x.other.id),["A"]);
 assert.equal(scheduleWindow(m),null);
 const b=structuredClone(m);b.activities[0].status="COMPLETED";
 assert.throws(()=>inspectDeskModel(b),/authority|completion/i);
});
test("four published desk entrypoints and pinned productivity memory wall are allowlisted",()=>{
 const build=read("scripts/build-public-site.mjs");
 for(const path of ["work-items/productivity.html","work-items/productivity-norms.v1.json",
  "projects/narayani/desk.html","projects/generic/desk-clinic.html",
  "projects/generic/desk-bridge.html","projects/generic/desk-uploaded-wbs.html",
  "assets/productivity-norms.css","assets/scheduling-desk.css"]){
  assert.ok(build.includes('"'+path+'"'),path);
 }
 assert.match(build,/Source-backed productivity rates changed without explicit review/);
 assert.match(build,/skinned\.length!==61\|\|redirectOnly\.length!==15/);
 for(const file of ["projects/narayani/desk.html","projects/generic/desk-clinic.html",
  "projects/generic/desk-bridge.html","projects/generic/desk-uploaded-wbs.html"])
  assert.match(read(file),/src\/presentation\/scheduling-desk\.mjs/);
 assert.match(read("src/presentation/project-catalog.mjs"),/narayani\/desk\.html#activities/);
 assert.match(read("src/presentation/project-catalog.mjs"),/narayani\/desk\.html#calendar/);
 assert.match(read("src/presentation/project-catalog.mjs"),/narayani\/desk\.html#dependencies/);
});
