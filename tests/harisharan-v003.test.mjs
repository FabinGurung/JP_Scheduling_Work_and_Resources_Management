import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {evaluateHarisharanBOQ} from "../src/reference/harisharan-boq-resource-v003.mjs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const source=read("machine/project-mappings/harisharan-boq-quantity-v003.json");
const profile=read("work-items/productivity-starters.v2.json");
const material=read("work-items/material-references.v1.json");
const result=evaluateHarisharanBOQ(source,profile,material);
test("V003 source grading protects 15m building, Ø8 transverse links, 2+3 crew",()=>{
 assert.equal(result.format,"HARISHARAN_MEASURED_RESOURCE_FEASIBILITY_V003");
 assert.equal(result.beginning,"2026-11-16");
 assert.equal(result.records.length,34);
 assert.equal(result.structural_report_requires_M25_all_RCC,true);
 assert.equal(result.owner_M20_other_structural_concrete,"BLOCKED_BY_15M_CODE_AND_REPORT");
 assert.equal(result.stirrup_diameter_mm,8);
 assert.equal(result.crew.skilled,2);assert.equal(result.crew.unskilled,3);
 assert.equal(result.crew.shift_hours,8);
 assert.equal(result.crew.mixer_max_operating_hours_per_day,2);
 assert.equal(result.crew.weekly_rest,"Saturday");
 assert.equal(result.construction_approval,false);
});
test("signed sloped footing geometry not invented and BOQ overage preserved",()=>{
 assert.equal(result.footing_geometry.gross_rectangular_m3,64.233);
 assert.equal(result.footing_geometry.net_sloped_m3,null);
 assert.ok(Math.abs(result.footing_geometry.discrepancy_m3-19.97492944)<1e-6);
 assert.ok(result.audit.some(x=>x.problem.includes("ONE_THIRD")));
 const excavation=result.records.find(x=>x.id==="EXCAVATION");
 assert.equal(excavation.duration_workdays,null);
 const rcc=result.records.find(x=>x.id==="RCC");
 assert.equal(rcc.duration_workdays,null);
 assert.equal(result.records.find(x=>x.id==="REBAR").duration_workdays,null);
 assert.equal(result.material_takeoff.reference_only,true);
 assert.equal(result.material_takeoff.not_ordered,true);
 assert.equal(result.material_takeoff.derived_work_packages,6);
 assert.equal(result.material_takeoff.lines.length,10);
 assert.equal(result.material_takeoff.lines.filter(x=>x.recipe_id==="concrete_M20").length,0);
 const plasterCement=result.material_takeoff.lines.find(x=>x.boq_id==="PLASTER_INT"&&x.material_id==="cement");
 assert.ok(Math.abs(plasterCement.reference_quantity-3163.151075*.1076)<.000002);
 assert.ok(result.material_takeoff.lines.every(x=>x.approval==="UNVERIFIED_SOURCE_ESTIMATE_NOT_ORDERED"));
});
test("no guessed dates, no arbitrary durations, source-supported BOQ rates only",()=>{
 assert.equal(result.activities_with_approved_resource_loaded_duration,0);
 assert.equal(result.derived_crew_workdays_minimum_for_scoped_items,1650);
 assert.equal(result.project_finish_date,null);
 assert.ok(result.coverage.published_direct>0);
 assert.ok(result.coverage.held_no_duration>0);
 assert.equal(result.coverage.published_direct+result.coverage.published_analogs+result.coverage.held_no_duration,34);
 for(const r of result.records){
  assert.equal(r.date_start,null);assert.equal(r.date_finish,null);
  assert.equal(r.quantity_approved,false);assert.equal(r.rate_approved,false);
  if(r.duration_workdays!==null){
   assert.ok(Number.isInteger(r.duration_workdays)&&r.duration_workdays>0);
   assert.ok(r.rate_grade!=="CALIBRATION_SEED");
   assert.ok(r.daily_output>0);
   assert.equal(r.status.startsWith("QUANTITY_RATE")||r.status.startsWith("OFFICIAL_ANALOG"),true);
  }else assert.equal(r.status,"HOLD_NO_DEFENSIBLE_DURATION");
 }
 const p=result.records.find(x=>x.id==="PLASTER_INT");
 assert.equal(p.reference_source,"NEP-DWRI-2081");
 assert.equal(p.duration_workdays,190);
 const t=result.records.find(x=>x.id==="FLOOR_TILE");
 assert.equal(t.duration_workdays,548);
});
test("V002 and Narayani immutable, public inventory gated",()=>{
 const old=read("machine/project-mappings/harisharan-detailed-wbs-v000001.json");
 const nar=read("projects/narayani/schedule-v002.json");
 assert.equal(old.activities.length,839);assert.equal(nar.activities.length,160);
 const build=readFileSync(new URL("../scripts/build-public-site.mjs",import.meta.url),"utf8");
 assert.match(build,/skinned\.length!==66\|\|redirectOnly\.length!==15/);
 assert.match(build,/const harBoq=evaluateHarisharanBOQ/);
 const page=readFileSync(new URL("../projects/fishtail/harisharan-residence/boq-v003.html",import.meta.url),"utf8");
 assert.match(page,/harisharan-resource-v003.mjs/);
 const browser=readFileSync(new URL("../src/presentation/harisharan-resource-v003.mjs",import.meta.url),"utf8");
 assert.match(browser,/new URL\("\.\.\/\.\.\/projects\/fishtail\/harisharan-residence\/boq-v003\.json"/);
});
