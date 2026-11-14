import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHarisharanV002} from "../src/reference/harisharan-v002.mjs";
import {inspectDeskModel,calendarDaySnapshot,scheduleWindow,activeInDay,linkContext} from "../src/presentation/scheduling-desk.mjs";
import {sha256Hex} from "../src/kernel/sha256.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const orig=JSON.parse(read("machine/project-mappings/harisharan-detailed-wbs-v000001.json"));
const rates=JSON.parse(read("work-items/productivity-starters.v2.json"));
const materials=JSON.parse(read("work-items/material-references.v1.json"));
const model=buildHarisharanV002(orig,rates,materials);
const by=new Map(model.activities.map(x=>[x.id,x]));
const ms=86400000,day=x=>new Date(x+"T00:00:00Z").getUTCDay();
test("v002 is a separate 839-activity source-graded dated model, not v001 rewrite",()=>{
 assert.equal(inspectDeskModel(model),true);
 assert.equal(model.revision,"v002");assert.equal(model.project.id,"PORT-000014");
 assert.equal(model.planned_start_date,"2026-11-16");
 assert.equal(model.activities.length,839);assert.equal(model.links.length,1321);
 assert.equal(model.counts.activities,839);assert.equal(model.counts.links,1321);
 assert.equal(model.baseline_approved,false);assert.equal(model.engineering_release,false);
 assert.equal(model.no_actual_progress,true);assert.equal(model.working_calendar.weekly_holiday,"Saturday");
 assert.equal(model.working_calendar.other_holidays_applied,false);
 assert.equal(orig.decisions.column_tie_diameter_mm,8);
 assert.equal(orig.decisions.structural_concrete_grade,"M25_RPT_MATERIALS_SECTION_OWNER_ADOPTED");
 assert.deepEqual(model.activities.map(x=>x.id),orig.activities.map(x=>x.activity_id));
 assert.equal(model.input_sha256.length,64);
 assert.equal(model.input_sha256,sha256Hex(JSON.stringify({revision:"v002",v1_digest:sha256Hex(JSON.stringify(orig)),rate_version:rates.version,material_version:materials.version,start:"2026-11-16"})));
});
test("every activity has correct resource-calendar dates; Saturdays never start or finish; FS precedence correct",()=>{
 assert.equal(day("2026-11-16"),1);
 assert.equal(model.activities[0].start_date,"2026-11-16");
 for(const a of model.activities){
  assert.match(a.start_date,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(a.finish_date>=a.start_date);
  assert.notEqual(day(a.start_date),6,a.id+" Saturday start");
  assert.notEqual(day(a.finish_date),6,a.id+" Saturday finish");
  assert.equal(a.status,"CALCULATED_DRAFT_NOT_ACTUAL");
  assert.equal(a.engineering_release,false);
  assert.equal(a.actual_start,null);assert.equal(a.actual_finish,null);
  assert.equal(a.actual_percent,null);
  assert.equal(a.duration,a.finish-a.start);
  assert.ok(a.total_float_workdays>=0);
  assert.equal(a.critical,a.total_float_workdays===0);
 }
 for(const e of model.links){
  const p=by.get(e.from),s=by.get(e.to);
  assert.ok(p&&s);
  assert.ok(s.start>=p.finish,e.from+" -> "+e.to);
 }
 assert.equal(model.planned_finish_exclusive,by.get("HAR-0839").finish_date);
 assert.equal(scheduleWindow(model).start,"2026-11-16");
 assert.equal(activeInDay({start_date:"2026-11-20",finish_date:"2026-11-22"},"2026-11-21"),false);
 const snap=calendarDaySnapshot(model,"2026-11-16","HAR-0002");assert.ok(snap.items.length>=1);
 assert.ok(linkContext(model,"HAR-0002").predecessors.length>=1);
});
test("work rate used ONLY for 18 source-quantity footing placements, with documented grade and material limitations",()=>{
 assert.equal(model.planner_integration.work_rate_profiles_available,46);
 assert.equal(model.planner_integration.material_recipes_available,36);
 assert.equal(model.planner_integration.quantified_activities,18);
 assert.equal(model.planner_integration.labour_analogy_calculated_activities,18);
 assert.equal(model.planner_integration.unmeasured_or_unrated_activities,821);
 assert.equal(model.planner_integration.material_retakeoff_numeric_items_for_M25,0);
 assert.equal(model.planner_integration.m25_recipe_applied,false);
 assert.equal(model.planner_integration.ambiguous_footing_slope_excluded,true);
 assert.ok(Math.abs(model.planner_integration.gross_prismatic_footing_m3-64.233)<0.002);
 const placed=model.activities.filter(x=>x.estimate.components.length);
 assert.equal(placed.length,18);
 for(const a of placed){
  assert.equal(a.estimate.components[0].source,"NEP-DWRI-2081");
  assert.equal(a.estimate.components[0].profile,"m20_footing");
  assert.equal(a.estimate.components[0].crew.skilled,2);
  assert.equal(a.estimate.components[0].crew.helpers,3);
  assert.equal(a.estimate.components[0].machine_hours_per_day,2);
  assert.equal(a.estimate.components[0].assemblies[0].grade,"DESIGN_INPUT_REQUIRED");
  assert.ok(a.estimate.components[0].assemblies[0].lines.every(l=>l.quantity===null));
  assert.ok(a.duration>=a.original_v001_duration);
 }
 assert.ok(model.provisional_span_workdays>orig.provisional_total_workdays);
 assert.equal(model.activities.filter(x=>x.estimate.components.length===0).length,821);
});
test("Harisharan v001 stays immutable, separate from Narayani v002 source and release controls",()=>{
 const ui=read("src/presentation/scheduling-desk.mjs");
 const build=read("scripts/build-public-site.mjs");
 const catalog=read("src/presentation/project-catalog.mjs");
 const html=read("projects/fishtail/harisharan-residence/schedule-v002.html");
 const nar=JSON.parse(read("projects/narayani/schedule-v002.json"));
 assert.equal(nar.revision,"v002");assert.equal(nar.activities.length,160);
 assert.match(ui,/harisharan-v002/);assert.match(ui,/model.harisharan_v002/);
 assert.match(catalog,/harisharan-residence\/schedule-v002\.html#activities/);
 assert.match(html,/data-schedule-project="harisharan-v002"/);
 assert.match(build,/const harV002=buildHarisharanV002/);
 assert.match(build,/harisharan-residence\/schedule-v002\.json/);
 assert.match(build,/skinned\.length!==65\|\|redirectOnly\.length!==15/);
 assert.doesNotMatch(JSON.stringify(model),/drive\.google\.com\/file\/d\/|docs\.google\.com\/spreadsheets\/d\/|BEGIN PRIVATE KEY|@gmail\.com/);
});
