import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {REFERENCE_HOUSE_CALENDAR,isHouseWorkDay,dateAtHouseWorkSlot,countHouseWorkDays,applySaturdayHouseScenario} from "../src/reference/house-saturday-calendar.mjs";
import {validateMaterialCatalog,materialTakeoff,projectMaterialScopes} from "../src/reference/material-planner.mjs";
import {calendarDaySnapshot} from "../src/presentation/scheduling-desk.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const refs=()=>JSON.parse(read("work-items/material-references.v1.json"));
const boq=()=>JSON.parse(read("work-items/productivity-norms.v1.json"));
const seed=()=>JSON.parse(read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
test("Saturday is the only standard weekly holiday; Sundays operate in the six-day Nepal house scenario",()=>{
 const c=REFERENCE_HOUSE_CALENDAR;
 assert.deepEqual(c.working_weekdays,[0,1,2,3,4,5]);
 assert.equal(c.weekly_holiday,6);
 assert.equal(c.base_skilled,2);assert.equal(c.base_helpers,3);assert.equal(c.working_hours_per_day,8);
 assert.equal(isHouseWorkDay("2026-10-24"),false);
 assert.equal(isHouseWorkDay("2026-10-25"),true);
 assert.equal(dateAtHouseWorkSlot("2026-10-19",0),"2026-10-19");
 assert.equal(dateAtHouseWorkSlot("2026-10-19",4),"2026-10-23");
 assert.equal(dateAtHouseWorkSlot("2026-10-19",5),"2026-10-25");
 assert.equal(dateAtHouseWorkSlot("2026-10-19",6),"2026-10-26");
 assert.equal(countHouseWorkDays("2026-10-19","2026-10-26"),6);
});
test("work-slot schedule is rebased to no Saturday and source dates remain recorded without source mutation",()=>{
 const src={
 project:{id:"PRJ-000007"},input_sha256:"a".repeat(64),
 activities:[
  {id:"A",start:0,finish:5,duration:5,start_date:"2026-10-19",finish_date:"2026-10-25"},
  {id:"B",start:5,finish:8,duration:3,start_date:"2026-10-25",finish_date:"2026-10-28"},
  {id:"M",start:8,finish:8,duration:0,start_date:"2026-10-28",finish_date:"2026-10-28"}
 ],links:[{from:"A",to:"B",type:"FS"},{from:"B",to:"M",type:"FS"}],calendar_events:[],
 engineering_release:false,baseline_approved:false
 };
 const clone=structuredClone(src);
 const projected=applySaturdayHouseScenario(src,{anchor:"2026-10-19"});
 assert.deepEqual(src,clone,"Immutable source must not be overwritten");
 assert.equal(projected.activities[0].start_date,"2026-10-19");
 assert.equal(projected.activities[0].finish_date,"2026-10-25");
 assert.equal(projected.activities[1].start_date,"2026-10-25");
 assert.equal(projected.activities[1].finish_date,"2026-10-28");
 assert.equal(projected.activities[1].duration,3);
 assert.equal(projected.activities[1].source_start_date,src.activities[1].start_date);
 assert.equal(projected.activities[1].date_basis,"SATURDAY_OFF_OWNER_SCENARIO_UNAPPROVED");
 assert.equal(projected.house_calendar.original_source_sha256,src.input_sha256);
 assert.deepEqual(projected.links,src.links);
 assert.equal(projected.engineering_release,false);
 assert.equal(calendarDaySnapshot(projected,"2026-10-24","A").activeCount,0);
 assert.equal(calendarDaySnapshot(projected,"2026-10-25","B").activeCount,1);
 const shift=applySaturdayHouseScenario({...src,activities:[{...src.activities[0],finish:8,duration:8}, {...src.activities[1],start:8,finish:11,duration:3},{...src.activities[2],start:11,finish:11}]},{anchor:"2026-10-19"});
 assert.equal(shift.activities[0].duration,8);
 assert.equal(countHouseWorkDays(shift.activities[0].start_date,shift.activities[0].finish_date),8);
});
test("materials library covers 88 source work IDs and all 45 Narayani activities; rejects cross-unit conversion",()=>{
 const cat=refs();
 assert.equal(validateMaterialCatalog(cat,boq(),seed()),true);
 assert.equal(cat.materials.length,27);
 assert.equal(cat.recipes.length,36);
 assert.equal(cat.work_items.length,88);
 assert.equal(cat.project_activities.length,45);
 const byId=new Map(cat.recipes.map(x=>[x.id,x]));
 for(const x of cat.work_items){
  for(const id of x.recipe_ids)assert.equal(byId.get(id).work_unit,x.unit,x.key+" cannot silently convert its measured unit");
 }
 assert.ok(cat.work_items.some(x=>x.key==="BOQ:20"&&x.recipe_ids.includes("upvc_area")));
 assert.ok(cat.project_activities.every(x=>x.materials_release===false&&x.actual_quantities===null));
 const changed=structuredClone(cat);
 changed.project_activities.find(x=>x.activity_id==="T5030").activity_title="Fake foundation work";
 assert.throws(()=>validateMaterialCatalog(changed,boq(),seed()),/source WBS/);
});
test("M20 material per cubic metre uses 1:1.5:3 with explicit 1.54 approximate dry factor, not approved batch",()=>{
 const cat=refs();
 const a=materialTakeoff(cat,"concrete_M20",1);
 const byId=new Map(a.material_lines.map(x=>[x.id,x]));
 assert.ok(Math.abs(byId.get("cement").quantity-8.064)<1e-10);
 assert.ok(Math.abs(byId.get("sand").quantity-.42)<1e-10);
 assert.ok(Math.abs(byId.get("coarse").quantity-.84)<1e-10);
 assert.equal(byId.get("cement").order_quantity,9);
 assert.equal(a.grade,"GEOMETRIC_ESTIMATE");
 assert.equal(a.reference_only,true);
 const five=materialTakeoff(cat,"concrete_M20",5,{wastePct:0});
 assert.ok(Math.abs(five.material_lines.find(x=>x.id==="sand").quantity-2.1)<1e-8);
 assert.throws(()=>materialTakeoff(cat,"concrete_M20",5,{wastePct:40}),/Invalid measured/);
});
test("government 2081 section 13.1(C) plaster and 6.1 brick references hold original per-unit material quantities",()=>{
 const cat=refs();
 const p=materialTakeoff(cat,"plaster_12_5",100),m=materialTakeoff(cat,"brick_1_4",1);
 const P=id=>p.material_lines.find(x=>x.id===id).quantity;
 const M=id=>m.material_lines.find(x=>x.id===id).quantity;
 assert.ok(Math.abs(P("cement")-10.76)<1e-8); // 538 kg per 100 m² => 10.76 bags
 assert.ok(Math.abs(P("sand")-1.46)<1e-8);
 assert.equal(P("water"),100);
 assert.equal(M("bricks"),530);
 assert.equal(M("cement"),2);
 assert.equal(M("sand"),.27);
 assert.equal(M("water"),50);
 assert.equal(m.grade,"OFFICIAL_ANALOG"); // Machine-made differs from owner's chimney-burnt item
});
test("the T5030 resources bundle exposes concrete, rebar and shuttering separately without fabricated project quantities",()=>{
 const c=refs(),t=projectMaterialScopes(c,"T5030");
 assert.deepEqual(t.activity.recipe_ids,["concrete_M20","rebar","formwork"]);
 assert.equal(t.has_verified_quantities,false);
 assert.equal(t.release_authorized,false);
 assert.equal(t.recipes.length,3);
 assert.equal(materialTakeoff(c,"rebar",500).material_lines.find(x=>x.id==="wire").quantity,null);
 assert.equal(materialTakeoff(c,"formwork",20).material_lines.find(x=>x.id==="props").quantity,null);
 assert.deepEqual(projectMaterialScopes(c,"M1040").recipes,[]);
});
test("public build pins material JSON and directly links Materials Planner beside work-rate page without publishing original WBS",()=>{
 const build=read("scripts/build-public-site.mjs");
 for(const p of ["work-items/material-references.v1.json","work-items/materials.html","assets/material-planner.css"])
  assert.ok(build.includes('"'+p+'"'),p);
 assert.match(build,/Reviewed material reference changed without source evidence/);
 assert.match(build,/skinned\.length!==65\|\|redirectOnly\.length!==15/);
 assert.match(read("more/index.html"),/work-items\/materials\.html/);
 assert.match(read("work-items/index.html"),/href="\.\/materials\.html"/);
 const desk=read("src/presentation/scheduling-desk.mjs");
 assert.match(desk,/materials\.html\?activity=/);
 assert.match(desk,/projectMaterialScopes/);
 assert.match(desk,/2 skilled workers \+ 3 unskilled helpers/);
 assert.match(desk,/up to 2 operating hours\/day/);
 assert.match(desk,/SATURDAY HOLIDAY/);
 assert.match(read("src/presentation/productivity-starters-page.mjs"),/Machine operating hours\/day/);
});
