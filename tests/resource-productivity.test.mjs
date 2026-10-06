import test from "node:test";
import assert from "node:assert/strict";
import {normalizeResource,normalizeResources,normalizeCrews,expandCrewAssignments,buildResourceHistogram,findResourceOverloads} from "../src/kernel/resources.mjs";
import {deriveDurationFromProductivity,applyProductivityDurations} from "../src/kernel/productivity.mjs";

test("v0.4 resource contract separates renewable labor/equipment from consumable material",()=>{
  const labor=normalizeResource({id:"LAB",resource_type:"LABOR",max_units:4,calendar_id:"DAY"});
  const plant=normalizeResource({id:"EXC",resource_type:"EQUIPMENT",max_units:1,calendar_id:"DAY"});
  const mat=normalizeResource({id:"CEM",resource_type:"MATERIAL",unit:"bag",inventory_quantity:100});
  assert.equal(labor.availability_mode,"RENEWABLE");
  assert.equal(plant.max_units,1);
  assert.equal(mat.availability_mode,"CONSUMABLE");
  assert.equal(mat.max_units,null);
  assert.equal(mat.inventory_quantity,100);
});

test("resource identities and capacities fail closed",()=>{
  assert.throws(()=>normalizeResources([{id:"R1"},{id:"R1"}]),/Duplicate resource/);
  assert.throws(()=>normalizeResource({id:"R",resource_type:"MAGIC"}),/Unsupported resource type/);
  assert.throws(()=>normalizeResource({id:"R",max_units:0}),/greater than zero/);
});

test("crew contract requires explicit crew calendar and reusable members",()=>{
  const resources=[
    {id:"MASON",resource_type:"LABOR",max_units:4,calendar_id:"DAY"},
    {id:"MIXER",resource_type:"EQUIPMENT",max_units:1,calendar_id:"DAY"},
    {id:"CEM",resource_type:"MATERIAL",unit:"bag"}
  ];
  const c=normalizeCrews({resources,knownCalendarIds:["DAY"],crews:[{id:"CREW1",calendar_id:"DAY",members:[{resource_id:"MASON",units:2},{resource_id:"MIXER",units:1}]}]});
  assert.equal(c.crews[0].calendar_id,"DAY");
  assert.equal(c.crews[0].members.length,2);
  assert.equal(c.crews[0].native_schedule_support,"CONTRACT_ONLY");
  assert.throws(()=>normalizeCrews({resources,crews:[{id:"BAD",calendar_id:"DAY",members:[{resource_id:"CEM"}]}]}),/cannot contain MATERIAL/);
});

test("crew assignments expand deterministically into resource assignments",()=>{
  const resources=[{id:"L",resource_type:"LABOR",max_units:10},{id:"E",resource_type:"EQUIPMENT",max_units:2}];
  const crews=[{id:"C",calendar_id:"DAY",members:[{resource_id:"L",units:3},{resource_id:"E",units:1}]}];
  const x=expandCrewAssignments({resources,crews,assignments:[{activity_id:"A",crew_id:"C",crew_units:2}]});
  assert.deepEqual(x.map(r=>[r.resource_id,r.units,r.source_crew_id]),[["L",6,"C"],["E",2,"C"]]);
});

test("productivity converts quantity and crew production units to workdays",()=>{
  const p=deriveDurationFromProductivity({quantity:100,productivity_rate:20,production_units:2});
  assert.equal(p.effective_quantity_per_workday,40);
  assert.equal(p.raw_workdays,2.5);
  assert.equal(p.scheduled_workdays,3);
});

test("hourly productivity consumes an explicit working-day minute contract",()=>{
  const p=deriveDurationFromProductivity({quantity:96,productivity_rate:6,production_units:2,rate_basis:"PER_HOUR",working_minutes_per_day:480});
  assert.equal(p.effective_quantity_per_workday,96);
  assert.equal(p.raw_workdays,1);
  assert.equal(p.scheduled_workdays,1);
  assert.throws(()=>deriveDurationFromProductivity({quantity:10,productivity_rate:2,rate_basis:"PER_HOUR"}),/working_minutes_per_day/);
});

test("productivity duration application preserves provenance and rejects orphan plans",()=>{
  const a=applyProductivityDurations({activities:[{id:"A",duration:9},{id:"B",duration:2}],plans:[{activity_id:"A",quantity:45,productivity_rate:20,quantity_unit:"m2"}]});
  assert.equal(a[0].duration,3);
  assert.equal(a[0].original_duration,9);
  assert.equal(a[0].duration_source,"PRODUCTIVITY_DERIVED");
  assert.equal(a[0].productivity.quantity_unit,"m2");
  assert.equal(a[1].duration,2);
  assert.throws(()=>applyProductivityDurations({activities:[{id:"A",duration:1}],plans:[{activity_id:"X",quantity:1,productivity_rate:1}]}),/unknown activity/);
});

test("resource histogram reports renewable loading and overloads",()=>{
  const scheduledActivities=[{id:"A",es:0,ef:2,duration:2},{id:"B",es:1,ef:3,duration:2}];
  const resources=[{id:"LAB",resource_type:"LABOR",max_units:3}];
  const h=buildResourceHistogram({scheduledActivities,resources,assignments:[
    {activity_id:"A",resource_id:"LAB",units:2},
    {activity_id:"B",resource_id:"LAB",units:2}
  ]});
  assert.equal(h.rows.length,3);
  assert.equal(h.overloads.length,1);
  assert.equal(h.overloads[0].slot,1);
  assert.equal(h.overloads[0].demand_units,4);
  assert.equal(h.overloads[0].utilization,4/3);
});

test("material histogram spreads total quantity uniformly and tracks cumulative use",()=>{
  const h=buildResourceHistogram({
    scheduledActivities:[{id:"A",es:0,ef:2,duration:2}],
    resources:[{id:"CEM",resource_type:"MATERIAL",unit:"bag",inventory_quantity:100}],
    assignments:[{activity_id:"A",resource_id:"CEM",quantity:10}]
  });
  assert.deepEqual(h.rows.map(r=>r.material_quantity),[5,5]);
  assert.equal(h.rows[1].cumulative_material_quantity,10);
  assert.equal(h.material_totals.CEM,10);
  assert.equal(h.overloads.length,0);
});

test("crew loading appears in histogram with source crew traceability",()=>{
  const h=buildResourceHistogram({
    scheduledActivities:[{id:"A",es:0,ef:1,duration:1}],
    resources:[{id:"LAB",resource_type:"LABOR",max_units:4}],
    crews:[{id:"CREW",calendar_id:"DAY",members:[{resource_id:"LAB",units:2}]}],
    assignments:[{activity_id:"A",crew_id:"CREW",crew_units:1.5}]
  });
  assert.equal(h.rows[0].demand_units,3);
  assert.deepEqual(h.rows[0].source_crews,["CREW"]);
});

test("legacy overload API remains backward compatible",()=>{
  const over=findResourceOverloads({
    scheduledActivities:[{id:"A",duration:2,es:0,ef:2},{id:"B",duration:2,es:1,ef:3}],
    assignments:[{activity_id:"A",resource_id:"R1",units:1},{activity_id:"B",resource_id:"R1",units:1}],
    capacities:{R1:1}
  });
  assert.equal(over.length,1);
  assert.equal(over[0].slot,1);
});

test("native resource leveling is not implied by the histogram foundation",()=>{
  const h=buildResourceHistogram({
    scheduledActivities:[{id:"A",es:0,ef:1,duration:1},{id:"B",es:0,ef:1,duration:1}],
    resources:[{id:"LAB",resource_type:"LABOR",max_units:1}],
    assignments:[{activity_id:"A",resource_id:"LAB",units:1},{activity_id:"B",resource_id:"LAB",units:1}]
  });
  assert.equal(h.overloads.length,1);
  assert.deepEqual(h.rows[0].activities,["A","B"]);
});
