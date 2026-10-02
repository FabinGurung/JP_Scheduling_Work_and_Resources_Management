import test from "node:test";
import assert from "node:assert/strict";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {earnedValueMetrics} from "../src/kernel/earned-value.mjs";
import {findResourceOverloads} from "../src/kernel/resources.mjs";
import {toTaskJuggler} from "../src/adapters/taskjuggler.mjs";

test("CPM handles FS/SS/FF/SF relationships",()=>{
  const activities=[{id:"A",name:"A",duration:4},{id:"B",name:"B",duration:3},{id:"C",name:"C",duration:2},{id:"D",name:"D",duration:1}];
  const relationships=[
    {predecessor:"A",successor:"B",type:"FS",lag:0},
    {predecessor:"A",successor:"C",type:"SS",lag:1},
    {predecessor:"B",successor:"D",type:"FF",lag:0},
    {predecessor:"C",successor:"D",type:"SF",lag:0}
  ];
  const s=scheduleNetwork({activities,relationships}), by=Object.fromEntries(s.activities.map(a=>[a.id,a]));
  assert.equal(by.A.es,0); assert.equal(by.B.es,4); assert.equal(by.C.es,1); assert.ok(Number.isFinite(by.D.total_float)); assert.equal(s.project.early_finish,7);
});

test("required finish creates negative float",()=>{
  const s=scheduleNetwork({activities:[{id:"A",duration:5},{id:"B",duration:5}],relationships:[{predecessor:"A",successor:"B",type:"FS",lag:0}],requiredFinish:8});
  const by=Object.fromEntries(s.activities.map(a=>[a.id,a]));
  assert.equal(s.project.early_finish,10); assert.equal(by.A.total_float,-2); assert.equal(by.B.total_float,-2); assert.equal(by.A.critical,true);
});

test("cycle is rejected",()=>assert.throws(()=>scheduleNetwork({activities:[{id:"A",duration:1},{id:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",type:"FS"},{predecessor:"B",successor:"A",type:"FS"}]}),/cycle/i));

test("earned value metrics calculate SPI and CPI",()=>{
  const m=earnedValueMetrics({bac:1000,pv:500,ev:450,ac:480});
  assert.equal(m.spi,0.9); assert.equal(m.cpi,0.9375); assert.equal(m.sv,-50); assert.equal(m.cv,-30);
});

test("resource overloads are detected",()=>{
  const scheduledActivities=[{id:"A",duration:2,es:0,ef:2},{id:"B",duration:2,es:1,ef:3}];
  const over=findResourceOverloads({scheduledActivities,assignments:[{activity_id:"A",resource_id:"R1",units:1},{activity_id:"B",resource_id:"R1",units:1}],capacities:{R1:1}});
  assert.equal(over.length,1); assert.equal(over[0].slot,1); assert.deepEqual(over[0].activities,["A","B"]);
});

test("TaskJuggler adapter reports unsupported non-FS logic",()=>{
  const schedule=scheduleNetwork({activities:[{id:"A",name:"A",duration:1},{id:"B",name:"B",duration:1}],relationships:[{predecessor:"A",successor:"B",type:"SS",lag:0}]});
  const out=toTaskJuggler(schedule,[{predecessor:"A",successor:"B",type:"SS",lag:0}]);
  assert.equal(out.unsupported_relationships.length,1);
});
