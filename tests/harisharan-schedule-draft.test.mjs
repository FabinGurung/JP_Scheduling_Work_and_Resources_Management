import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const path=new URL("../machine/project-mappings/harisharan-detailed-wbs-v000001.json",import.meta.url);
const data=JSON.parse(readFileSync(path,"utf8"));
const a=data.activities;
const ids=new Set(a.map(x=>x.activity_id));
const by=new Map(a.map(x=>[x.activity_id,x]));
test("Harisharan V000001 has consistent scope, owner decisions and no construction approval",()=>{
 assert.equal(data.project_id,"PORT-000014");
 assert.equal(data.scope,"WITHOUT_BASEMENT");
 assert.equal(data.decisions.structural_concrete_grade,"M25_RPT_MATERIALS_SECTION_OWNER_ADOPTED");
 assert.equal(data.decisions.grid_selected_derived_width_mm,11384);
 assert.equal(data.decisions.grid_staking_authorized,false);
 assert.equal(data.decisions.column_tie_diameter_mm,8);
 assert.match(data.decisions.previous_10mm_at100_column_tie_claim,/NOT_VERIFIED/);
 assert.equal(a.filter(x=>x.title.includes("Ø8 mm transverse links")).length,18);
 assert.ok(a.every(x=>!x.title.includes("Ø10/100")));
 assert.equal(data.engineering_release,false);
 assert.equal(data.decisions.project_start_date,null);
 assert.equal(data.activities.length,839);
 assert.equal(data.dependency_count,1321);
 assert.equal(data.source_preservation.original_cad_activities,34);
 assert.equal(data.source_preservation.original_cad_elements,631);
 assert.deepEqual(data.source_floors.map(x=>x.floor),["GROUND","FIRST","SECOND","THIRD","FOURTH"]);
 assert.deepEqual(data.decisions.working_weekdays,["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY"]);
});
test("every activity is unique, acyclic, predecessor-resolved and has non-approved actual/status",()=>{
 assert.equal(ids.size,a.length);
 for(let i=0;i<a.length;i++){
  const x=a[i];
  assert.match(x.activity_id,/^HAR-\d{4}$/);
  assert.ok(Number.isInteger(x.duration_workdays)&&x.duration_workdays>=0);
  assert.equal(x.actual_start,null);
  assert.equal(x.actual_finish,null);
  assert.equal(x.percent_complete,null);
  assert.equal(x.approved_work_release,false);
  assert.equal(x.status,"PROPOSED_NOT_ADMITTED_TO_APPROVED_WBS");
  assert.ok(Array.isArray(x.source_refs)&&x.source_refs.length);
  assert.ok(Array.isArray(x.predecessor_ids));
  assert.equal(new Set(x.predecessor_ids).size,x.predecessor_ids.length);
  for(const id of x.predecessor_ids){
   assert.ok(ids.has(id),"dangling predecessor "+id);
   assert.ok(a.indexOf(by.get(id))<i,"not topological "+x.activity_id+" "+id);
  }
 }
 assert.equal(a.reduce((n,x)=>n+x.predecessor_ids.length,0),1321);
});
test("independent FS CPM forward and backward pass preserves schedule network",()=>{
 let finish=new Map(),es=new Map(),horizon=0;
 for(const x of a){
  const start=Math.max(0,...x.predecessor_ids.map(id=>finish.get(id)));
  const end=start+x.duration_workdays;es.set(x.activity_id,start);finish.set(x.activity_id,end);
  assert.equal(x.planned_start_workday,start);
  assert.equal(x.planned_finish_workday,end);
  horizon=Math.max(horizon,end);
 }
 assert.equal(horizon,data.provisional_total_workdays);
 const ls=new Map(),successors=new Map(a.map(x=>[x.activity_id,[]]));
 for(const x of a)for(const p of x.predecessor_ids)successors.get(p).push(x.activity_id);
 for(const x of [...a].reverse()){
  const next=successors.get(x.activity_id);
  const lf=next.length?Math.min(...next.map(id=>ls.get(id))):horizon;
  const latest=lf-x.duration_workdays;ls.set(x.activity_id,latest);
  assert.equal(x.latest_start_workday,latest);
  assert.equal(x.total_float_workdays,latest-es.get(x.activity_id));
  assert.equal(x.critical,x.total_float_workdays===0);
  assert.ok(x.total_float_workdays>=0);
 }
});
test("No accidental cross-project or uncontrolled private source publication",()=>{
 const content=readFileSync(path,"utf8");
 assert.doesNotMatch(content,/narayani-parajuli|PRJ-000007|NARAYANI_AUTHENTICATED_SYNC|GOOGLE_OAUTH_ACCESS_TOKEN|BEGIN PRIVATE KEY/i);
 assert.doesNotMatch(content,/https:\/\/drive\.google\.com|https:\/\/docs\.google\.com|@(?:gmail|yahoo|outlook)\.com/i);
 assert.equal(data.references.length,4);
 assert.equal(data.activities_by_phase.SUPERSTRUCTURE,100);
 assert.equal(data.activities_by_phase.MEP_ROUGH_IN,80);
 assert.equal(data.activities_by_phase.FINISHES,106);
 assert.equal(data.activities_by_phase.COMMISSIONING,24);
});
