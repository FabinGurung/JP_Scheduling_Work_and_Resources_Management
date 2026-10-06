import test from "node:test";
import assert from "node:assert/strict";
import {activityTypeContract,normalizeActivity,assertResourceEngineSchedulingSupported} from "../src/kernel/activities.mjs";
import {resolveResourceDependentAvailability,placeResourceDependentActivity} from "../src/kernel/resource-scheduler.mjs";

const base={
  projectStart:"2026-10-05",
  horizonEnd:"2026-10-31",
  calendars:[
    {id:"SITE",working_weekdays:[1,2,3,4,5,6]},
    {id:"LAB",working_weekdays:[1,2,3,4,5]},
    {id:"PLANT",working_weekdays:[1,2,3,4,5,6]},
    {id:"CREW",working_weekdays:[1,2,3,4,5]}
  ],
  projectCalendarId:"SITE"
};

test("RESOURCE_DEPENDENT contract is executable only through the v0.4 resource engine",()=>{
  const c=activityTypeContract("RESOURCE_DEPENDENT");
  assert.equal(c.native_schedule_support,"RESOURCE_ENGINE");
  const a=normalizeActivity({id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:2});
  assert.equal(assertResourceEngineSchedulingSupported(a).id,"RD");
  assert.throws(()=>assertResourceEngineSchedulingSupported({id:"T",duration:1}),/requires RESOURCE_DEPENDENT/i);
});

test("resource-dependent placement intersects assigned renewable calendars",()=>{
  const out=placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:3},
    resources:[
      {id:"L",resource_type:"LABOR",max_units:2,calendar_id:"LAB"},
      {id:"E",resource_type:"EQUIPMENT",max_units:1,calendar_id:"PLANT"}
    ],
    assignments:[
      {activity_id:"RD",resource_id:"L",units:1},
      {activity_id:"RD",resource_id:"E",units:1}
    ],
    notBefore:"2026-10-09"
  });
  assert.deepEqual(out.required_calendar_ids,["LAB","PLANT"]);
  assert.deepEqual(out.work_slots,[4,7,8]);
  assert.equal(out.start_date,"2026-10-09");
  assert.equal(out.finish_date,"2026-10-13");
  assert.equal(out.resource_leveling_applied,false);
});

test("crew calendar participates in availability intersection and preserves resource calendar",()=>{
  const out=placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:2},
    resources:[{id:"L",resource_type:"LABOR",max_units:4,calendar_id:"SITE"}],
    crews:[{id:"C1",calendar_id:"CREW",members:[{resource_id:"L",units:2}]}],
    assignments:[{activity_id:"RD",crew_id:"C1"}],
    notBefore:"2026-10-09"
  });
  assert.deepEqual(out.required_calendar_ids,["CREW","SITE"]);
  assert.deepEqual(out.work_slots,[4,7]);
  assert.equal(out.renewable_demand.L,2);
});

test("direct renewable assignment without resource calendar fails closed",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[{id:"L",resource_type:"LABOR",max_units:1}],
    assignments:[{activity_id:"RD",resource_id:"L",units:1}]
  }),/requires a resource or crew calendar/i);
});

test("unknown resource calendar fails closed",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"MISSING"}],
    assignments:[{activity_id:"RD",resource_id:"L",units:1}]
  }),/Unknown resource calendar/i);
});

test("renewable capacity reservations delay work without claiming leveling",()=>{
  const out=placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:2},
    resources:[{id:"L",resource_type:"LABOR",max_units:2,calendar_id:"LAB"}],
    assignments:[{activity_id:"RD",resource_id:"L",units:2}],
    resourceReservations:[{resource_id:"L",date:"2026-10-05",units:1}],
    notBefore:"2026-10-05"
  });
  assert.deepEqual(out.work_slots,[1,2]);
  assert.equal(out.start_date,"2026-10-06");
  assert.equal(out.resource_leveling_applied,false);
});

test("assignment demand above renewable capacity waits to horizon then fails closed",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    projectStart:"2026-10-05",horizonEnd:"2026-10-08",
    calendars:[{id:"LAB",working_weekdays:[1,2,3,4,5]}],
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}],
    assignments:[{activity_id:"RD",resource_id:"L",units:2}]
  }),/availability horizon exhausted/i);
});

test("material inventory can delay work until a dated receipt",()=>{
  const out=placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:2},
    resources:[
      {id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"},
      {id:"M",resource_type:"MATERIAL",unit:"bag",inventory_quantity:5}
    ],
    assignments:[
      {activity_id:"RD",resource_id:"L",units:1},
      {activity_id:"RD",resource_id:"M",quantity:10}
    ],
    materialReceipts:[{resource_id:"M",date:"2026-10-07",quantity:5}],
    notBefore:"2026-10-05"
  });
  assert.deepEqual(out.work_slots,[0,2]);
  assert.equal(out.material_consumption.M,10);
});

test("material assignment without inventory truth fails closed",()=>{
  assert.throws(()=>resolveResourceDependentAvailability({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[
      {id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"},
      {id:"M",resource_type:"MATERIAL",unit:"bag"}
    ],
    assignments:[
      {activity_id:"RD",resource_id:"L",units:1},
      {activity_id:"RD",resource_id:"M",quantity:1}
    ]
  }),/inventory_quantity is required/i);
});

test("material receipt cannot target a renewable resource",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}],
    assignments:[{activity_id:"RD",resource_id:"L",units:1}],
    materialReceipts:[{resource_id:"L",date:"2026-10-05",quantity:1}]
  }),/must target MATERIAL/i);
});

test("resource-dependent activity requires at least one renewable assignment",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    ...base,
    activity:{id:"RD",activity_type:"RESOURCE_DEPENDENT",duration:1},
    resources:[{id:"M",resource_type:"MATERIAL",inventory_quantity:10}],
    assignments:[{activity_id:"RD",resource_id:"M",quantity:1}]
  }),/requires at least one LABOR or EQUIPMENT/i);
});

test("non-resource-dependent activity is rejected by the resource placement path",()=>{
  assert.throws(()=>placeResourceDependentActivity({
    ...base,
    activity:{id:"T",activity_type:"TASK",duration:1},
    resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}],
    assignments:[{activity_id:"T",resource_id:"L",units:1}]
  }),/requires RESOURCE_DEPENDENT activity/i);
});

test("zero-duration resource-dependent placement is an atomic availability boundary",()=>{
  const out=placeResourceDependentActivity({
    ...base,
    activity:{id:"RD0",activity_type:"RESOURCE_DEPENDENT",duration:0},
    resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}],
    assignments:[{activity_id:"RD0",resource_id:"L",units:1}],
    notBefore:"2026-10-06"
  });
  assert.equal(out.start,out.finish);
  assert.deepEqual(out.work_slots,[]);
  assert.equal(out.resource_leveling_applied,false);
});
