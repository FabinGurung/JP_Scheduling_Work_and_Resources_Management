import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateWorkItemLibrary,estimateCatalogWork} from "../src/kernel/work-item-library.mjs";
import {scheduleProject} from "../src/kernel/schedule-project.mjs";
import {calculateGovernedEvm} from "../src/kernel/governed-evm.mjs";
import {auditSerialPrioritySpace} from "../src/kernel/resource-priority-audit.mjs";
const library=JSON.parse(readFileSync(new URL("../machine/work-items/work-item-library-v0.1.json",import.meta.url),"utf8"));
const task=(id,duration=1)=>({id,activity_type:"RESOURCE_DEPENDENT",duration});
test("work-item library validates exact sources; generic Nepal templates never fabricate coefficients",()=>{
 assert.equal(validateWorkItemLibrary(library),true);
 assert.equal(library.items.length,14);
 const nepal=library.items.find(x=>x.id==="BRICK_NEPALESE");
 assert.equal(nepal.material_per_unit.length,0);
 assert.equal(nepal.labor_role_days_per_unit.length,0);
 const empty=estimateCatalogWork({library,work_item_id:"BRICK_NEPALESE",quantity:5,unit:"m3"});
 assert.equal(empty.calculation_status,"INCOMPLETE");
 assert.equal(empty.crew_days,null);
 assert.ok(empty.gates.includes("NO_PUBLISHED_QUANTITIES_OR_PRODUCTIVITY"));
 const dup=structuredClone(library);dup.items.push({...dup.items[0]});
 assert.throws(()=>validateWorkItemLibrary(dup),/identity/);
 const disguised=structuredClone(library);disguised.items[0].material_per_unit=[{id:"FAKE",unit:"kg",quantity:10}];
 assert.throws(()=>validateWorkItemLibrary(disguised),/Unsourced catalog coefficient/);
});
test("2023 CPWD masonry reference computes material and role bottleneck as NOT approved",()=>{
 const result=estimateCatalogWork({library,work_item_id:"MASONRY_CPWD_6322",quantity:2,unit:"m3",
  crew:{MASON_FIRST_CLASS:1,MASON_SECOND_CLASS:1,HELPER:2,WATER_CARRIER:1},
  working_hours_per_day:8,product_reference_confirmed:true});
 assert.equal(result.engineering_approval,false);
 assert.equal(result.site_productivity_verified,false);
 assert.equal(result.calculation_status,"REFERENCE_SCENARIO_ONLY");
 assert.equal(result.crew_days,2);
 assert.deepEqual(result.material_requirements.map(x=>x.quantity),[988,.5]);
 assert.ok(Math.abs(result.output_per_crew_hour-(2/1.8/8))<1e-10);
 assert.throws(()=>estimateCatalogWork({library,work_item_id:"MASONRY_CPWD_6322",quantity:1,unit:"m2"}),/unit mismatch/);
 const missed=estimateCatalogWork({library,work_item_id:"MASONRY_CPWD_6341",quantity:3,unit:"m3"});
 assert.ok(missed.gates.includes("NO_VERIFIED_LABOR_COEFFICIENT"));
 assert.equal(missed.crew_days,null);
});
test("multi-calendar CPM dispatches to calendar solver and refuses ignored resources",()=>{
 const base={projectStart:"2026-10-05",horizonEnd:"2026-11-30",
  calendars:{FIVE:{working_weekdays:[1,2,3,4,5],holidays:[]},SIX:{working_weekdays:[1,2,3,4,5,6],holidays:[]}},
  projectCalendarId:"FIVE",
  activities:[{id:"A",duration:5,calendar_id:"FIVE"},{id:"B",duration:1,calendar_id:"SIX"}],
  relationships:[{predecessor:"A",successor:"B",type:"FS"}]};
 const result=scheduleProject(base);
 assert.equal(result.engine_mode,"CALENDAR_CPM");
 assert.equal(result.approved_baseline,false);
 assert.equal(result.output.activities.find(x=>x.id==="B").start_date,"2026-10-10");
 assert.throws(()=>scheduleProject({...base,resources:[{id:"L"}]}),/Explicit RESOURCE_LEVELING/);
 assert.throws(()=>scheduleProject(base,"SHARED_CPM"),/Use CALENDAR_CPM/);
 const shared=scheduleProject({activities:[{id:"A",duration:2}]});
 assert.equal(shared.engine_mode,"SHARED_CPM");
});
test("evidence gated EVM uses immutable approved baseline and rejects fake progress",()=>{
 const sha="a".repeat(64),as_of="2026-10-20";
 const input={
  baseline:{status:"APPROVED",revision:"BL001",approved_by:"PROJ-MGR-SIGNED",approved_at:"2026-10-10",
   source_sha256:sha,currency:"NPR",activities:[
    {activity_id:"A",wbs_id:"W1",budget:1000,planned_as_of:as_of,planned_fraction:.5},
    {activity_id:"B",wbs_id:"W2",budget:2000,planned_as_of:as_of,planned_fraction:.25}
   ]},
  as_of,currency:"NPR",physical_progress:[
   {activity_id:"A",event_id:"EVENT-A",evidence_ref:"SITE-EVID-A",signed_by:"QS-A",
    verified_at:"2026-10-19",verification_status:"VERIFIED_PHYSICAL",physical_fraction:.4},
   {activity_id:"B",event_id:"EVENT-B",evidence_ref:"SITE-EVID-B",signed_by:"QS-B",
    verified_at:"2026-10-19",verification_status:"VERIFIED_PHYSICAL",physical_fraction:.25}],
  actual_costs:[{event_id:"COST-1",evidence_ref:"VOUCHER-1",approved_by:"FINANCE",
    verification_status:"VERIFIED_COST",paid_or_accrued_at:"2026-10-18",currency:"NPR",amount:950}]
 };
 const r=calculateGovernedEvm(input);
 assert.equal(r.metrics.pv,1000);assert.equal(r.metrics.ev,900);assert.equal(r.metrics.ac,950);
 assert.equal(r.metrics.spi,.9);assert.equal(r.engineering_release,false);
 const unsigned=structuredClone(input);unsigned.baseline.status="DRAFT";
 assert.throws(()=>calculateGovernedEvm(unsigned),/NOT_READY/);
 const faked=structuredClone(input);faked.physical_progress[0].verification_status="REPORTED";
 assert.throws(()=>calculateGovernedEvm(faked),/NOT_READY/);
 const missing=structuredClone(input);missing.physical_progress.pop();
 assert.throws(()=>calculateGovernedEvm(missing),/Incomplete physical/);
});
test("bounded serial priority audit visits orderings but explicitly cannot claim global optimum",()=>{
 const fixture={projectStart:"2026-10-05",horizonEnd:"2026-10-20",
  calendars:[{id:"LAB",working_weekdays:[1,2,3,4,5]}],projectCalendarId:"LAB",
  resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}],
  activities:[task("B",2),task("A",1)],assignments:[
   {activity_id:"B",resource_id:"L",units:1},{activity_id:"A",resource_id:"L",units:1}
  ]};
 const s=auditSerialPrioritySpace(fixture);
 assert.equal(s.tested_orders,2);
 assert.equal(s.best_finish_event,3);
 assert.equal(s.optimality_claim,"EXACT_WITHIN_SERIAL_PRIORITY_FAMILY_NOT_GLOBAL_RESOURCE_OPTIMUM");
 assert.equal(s.solution.resource_leveling_applied,true);
 assert.throws(()=>auditSerialPrioritySpace({...fixture,activities:Array.from({length:8},(_,i)=>task("X"+i))}),/bounded/);
});
