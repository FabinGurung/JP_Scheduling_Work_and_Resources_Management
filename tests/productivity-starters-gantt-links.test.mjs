import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateStarterCatalog,estimateStarterOutput,selectStarter} from "../src/reference/productivity-starters.mjs";
import {relationEndpoints,buildGanttLinkGeometry} from "../src/presentation/gantt-dependencies.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const base=()=>JSON.parse(read("work-items/productivity-norms.v1.json"));
const starters=()=>JSON.parse(read("work-items/productivity-starters.v2.json"));
test("88 source-linked BOQ/WBS profiles now offer numerical reference for 82 measurable work items",()=>{
 const v1=base(),v2=starters();
 assert.equal(validateStarterCatalog(v2,v1),true);
 assert.equal(v2.coverage.item_count,88);
 assert.equal(v2.coverage.with_planning_start,82);
 assert.equal(v2.coverage.non_activity,6);
 assert.equal(v2.profiles.length,46);
 const unique=new Set(v2.items.map(x=>x.key));assert.equal(unique.size,88);
 for(const key of ["BOQ:1","BOQ:6","BOQ:7","BOQ:8.1","BOQ:13","BOQ:20","BOQ:23","BOQ:26",
 "BOQ:30","BOQ:33","WBS:6.1","WBS:6.2","WBS:6.3","WBS:6.4","WBS:6.5","WBS:7.1","WBS:7.2","WBS:7.4"])
   assert.ok(selectStarter(v2,v1,key).profile,"Missing numerical scenario "+key);
 for(const key of ["BOQ:17.1","WBS:1.0","WBS:6.0","WBS:7.0","WBS:9.0","WBS:19.0"])
   assert.equal(selectStarter(v2,v1,key).profile,null,"Aggregate/supply-only work must not be double-counted "+key);
 assert.equal(selectStarter(v2,v1,"BOQ:8.1").profile.kind,"OFFICIAL_DIRECT");
 assert.equal(selectStarter(v2,v1,"BOQ:20").profile.kind,"CALIBRATION_SEED");
});
test("masonry 1:4 and column formwork v2 coefficients are directly traceable to Nepal government norms",()=>{
 const v1=base(),v2=starters(),brick=selectStarter(v2,v1,"BOQ:8.1").profile,form=selectStarter(v2,v1,"WBS:7.2").profile;
 assert.equal(brick.skilled_days_per_unit,1.5);
 assert.equal(brick.helper_days_per_unit,2.2);
 assert.equal(brick.source_item.includes("§6.1"),true);
 assert.equal(form.skilled_days_per_unit,0.275);
 assert.equal(form.helper_days_per_unit,0.24);
 assert.equal(form.source_item.includes("§9.3"),true);
});
test("one mixer, one skilled and one helper display daily AND hourly illustrative concrete output",()=>{
 const m=selectStarter(starters(),base(),"WBS:6.1").profile;
 const args={quantity:5,skilled:1,helper:1,machines:1,hours:8,efficiency:100};
 const one=estimateStarterOutput(m,args);
 assert.equal(one.status,"ILLUSTRATIVE_ONLY");
 const expected=(1/3.5)/1.15;
 assert.ok(Math.abs(one.units_per_workday-expected)<1e-8);
 assert.ok(Math.abs(one.units_per_hour-expected/8)<1e-8);
 assert.equal(one.not_actual_or_approved,true);
 const two=estimateStarterOutput(m,{...args,helper:2});
 assert.ok(two.units_per_workday>one.units_per_workday);
 const helpersAndCrew=estimateStarterOutput(m,{...args,helper:4,skilled:2});
 assert.ok(helpersAndCrew.units_per_workday>two.units_per_workday);
 const noMixer=estimateStarterOutput(m,{...args,machines:0});
 assert.equal(noMixer.status,"INSUFFICIENT_RESOURCES");
 const observed=estimateStarterOutput(m,{...args,actualQuantity:one.units_per_workday*1.2});
 assert.ok(Math.abs(observed.actual_efficiency_percent-120)<1e-8);
});
test("wall thickness transforms identical masonry volume into different measured floor/wall areas",()=>{
 const p=selectStarter(starters(),base(),"BOQ:8.1").profile;
 const args={quantity:2,skilled:1,helper:1,machines:0,hours:8,efficiency:100};
 const thin=estimateStarterOutput(p,{...args,thicknessMm:115});
 const thick=estimateStarterOutput(p,{...args,thicknessMm:230});
 assert.ok(Math.abs(thin.wall_m2_per_workday/(thick.wall_m2_per_workday)-2)<1e-8);
 assert.ok(Math.abs(thin.wall_sqft_per_workday/(thick.wall_sqft_per_workday)-2)<1e-8);
 assert.throws(()=>estimateStarterOutput(p,{...args,hours:0}),/hours/);
});
test("all four P6 dependency kinds attach source and successor at correct start/finish endpoints",()=>{
 assert.deepEqual(relationEndpoints("FS"),["finish","start"]);
 assert.deepEqual(relationEndpoints("SS"),["start","start"]);
 assert.deepEqual(relationEndpoints("FF"),["finish","finish"]);
 assert.deepEqual(relationEndpoints("SF"),["start","finish"]);
 assert.throws(()=>relationEndpoints("FX"),/Unsupported/);
 const activities=[
  {id:"A",start_date:"2026-11-01",finish_date:"2026-11-05"},
  {id:"B",start_date:"2026-11-05",finish_date:"2026-11-09"}
 ];
 const links=["FS","SS","FF","SF"].map(type=>({from:"A",to:"B",type,lag:0}));
 const opts={links,activities,visibleIds:["A","B"],scenarioStart:"2026-11-01",px:10,
  rowY:new Map([["A",25],["B",75]]),scope:"all"};
 const geometries=buildGanttLinkGeometry(opts);
 assert.equal(geometries.length,4);
 assert.deepEqual(geometries.map(g=>[g.type,g.x0,g.x1]),[
  ["FS",40,40],["SS",0,40],["FF",40,80],["SF",0,80]]);
 assert.equal(buildGanttLinkGeometry({...opts,scope:"selected",selected:"A"}).length,4);
 assert.equal(buildGanttLinkGeometry({...opts,scope:"none"}).length,0);
 assert.equal(buildGanttLinkGeometry({...opts,scope:"selected",selected:"X"}).length,0);
});
test("read-only Gantt arrow UI and Primavera-like bottom detail tabs use the same source activity",()=>{
 const script=read("src/presentation/scheduling-desk.mjs");
 const arrows=read("src/presentation/gantt-dependencies.mjs");
 for(const field of ["Relationship arrows","Gantt + arrows","← Activity columns",
  "General","Status","Resources","Predecessors","Successors","Constraints","Quantities","Steps & Notes"])
  assert.ok(script.includes(field),"Missing Gantt or detail pane "+field);
 assert.match(script,/drawGanttConnectors/);
 assert.match(arrows,/desk-link-arrow/);
 assert.match(script,/VERIFIED site assignments and measured BOQ quantities: NONE admitted/);
 assert.match(script,/No source-verified BOQ quantities/);
 assert.match(script,/No verified report/);
 assert.doesNotMatch(arrows,/setInterval|postMessage|fetch\(/);
});
test("work-rate UI begins with real-time calculator before its catalog, with quantity, crew, machine and hours controls",()=>{
 const script=read("src/presentation/productivity-starters-page.mjs");
 const html=read("work-items/productivity.html");
 const build=read("scripts/build-public-site.mjs");
 for(const s of ["Work output planner","Skilled workers","Helpers / unskilled",
 "Work hours per day","Output / hour","Output / workday","Active duration",
 "Wall thickness (mm)","Actual output observed today"])
  assert.ok(script.includes(s),s);
 assert.match(script,/scrollIntoView/);
 assert.match(html,/productivity-starters-page\.mjs/);
 assert.match(html,/productivity-starters\.css/);
 assert.match(build,/Provisional productivity starter sources changed without reviewed pin/);
 for(const item of ["work-items/productivity-starters.v2.json","assets/productivity-starters.css"])
  assert.ok(build.includes('"'+item+'"'));
 assert.match(read("assets/site-shell.mjs"),/pageKey\(\)\.startsWith\("work-items\/"\)/);
});
