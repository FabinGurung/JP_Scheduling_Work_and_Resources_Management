import test from "node:test";
import assert from "node:assert/strict";
import {levelResourceDependentNetwork as level} from "../src/kernel/resource-leveler.mjs";

const shared={
  projectStart:"2026-10-05",horizonEnd:"2026-10-20",
  calendars:[{id:"LAB",working_weekdays:[1,2,3,4,5]},{id:"ALT",working_weekdays:[2,3,4,5]}],
  projectCalendarId:"LAB",
  resources:[{id:"L",resource_type:"LABOR",max_units:1,calendar_id:"LAB"}]
};
const task=(id,duration=1)=>({id,activity_type:"RESOURCE_DEPENDENT",duration});
const assignments=(...ids)=>ids.map(activity_id=>({activity_id,resource_id:"L",units:1}));
const byId=(out,id)=>out.activities.find(a=>a.activity_id===id);

test("shared capacity serializes independent work by stable ID regardless of input order",()=>{
  const x=level({...shared,activities:[task("B",2),task("A",2)],assignments:assignments("A","B")});
  const y=level({...shared,activities:[task("A",2),task("B",2)],assignments:assignments("B","A")});
  assert.deepEqual(x,y);
  assert.deepEqual(x.order,["A","B"]);
  assert.deepEqual(byId(x,"A").work_slots,[0,1]);
  assert.deepEqual(byId(x,"B").work_slots,[2,3]);
  assert.equal(byId(x,"B").leveling_delay_days,2);
  assert.equal(x.resource_leveling_applied,true);
  assert.equal(x.optimality_claim,"NONE");
});
test("fork/join FS network respects predecessors and shared capacity",()=>{
  const out=level({...shared,activities:[task("JOIN"),task("B"),task("ROOT"),task("A")],
    assignments:assignments("ROOT","A","B","JOIN"),
    relationships:[{predecessor:"ROOT",successor:"A"},{predecessor:"ROOT",successor:"B"},
      {predecessor:"B",successor:"JOIN"},{predecessor:"A",successor:"JOIN"}]});
  assert.deepEqual(out.order,["ROOT","A","B","JOIN"]);
  assert.equal(byId(out,"ROOT").start,0);
  assert.equal(byId(out,"JOIN").start,3);
});
test("SS/FF/SF and signed lag constraints are honored on day events",()=>{
  for(const type of ["SS","FF","SF"]){
    const out=level({...shared,resources:[{id:"L",resource_type:"LABOR",max_units:2,calendar_id:"LAB"}],
      activities:[task("P",2),task("S",1)],assignments:assignments("P","S"),
      relationships:[{predecessor:"P",successor:"S",type,lag:1,lag_calendar_mode:"PROJECT"}]});
    const p=byId(out,"P"),s=byId(out,"S");
    const anchor=type==="FF"?p.finish:p.start;
    assert.ok((type==="SS"?s.start:s.finish)>=anchor+1,type);
  }
  const lead=level({...shared,resources:[{id:"L",resource_type:"LABOR",max_units:2,calendar_id:"LAB"}],
    activities:[task("P",2),task("S")],assignments:assignments("P","S"),
    relationships:[{predecessor:"P",successor:"S",type:"FS",lag:-1}]});
  assert.equal(byId(lead,"S").start,1);
});
test("shared material inventory prevents double allocation before replenishment",()=>{
  const out=level({...shared,activities:[task("A"),task("B")],
    resources:[...shared.resources,{id:"M",resource_type:"MATERIAL",inventory_quantity:5}],
    assignments:[...assignments("A","B"),{activity_id:"A",resource_id:"M",quantity:5},
      {activity_id:"B",resource_id:"M",quantity:5}],
    materialReceipts:[{resource_id:"M",date:"2026-10-08",quantity:5}]});
  assert.deepEqual(byId(out,"A").work_slots,[0]);
  assert.deepEqual(byId(out,"B").work_slots,[3]);
  assert.equal(out.material_allocations.reduce((s,r)=>s+r.quantity,0),10);
});
test("earlier material use cannot violate future commitments",()=>{
  const out=level({...shared,activities:[task("A"),task("B")],
    resources:[{id:"LA",resource_type:"LABOR",max_units:1,calendar_id:"ALT"},
      {id:"LB",resource_type:"LABOR",max_units:1,calendar_id:"LAB"},
      {id:"M",resource_type:"MATERIAL",inventory_quantity:5}],
    assignments:[{activity_id:"A",resource_id:"LA",units:1},
      {activity_id:"A",resource_id:"M",quantity:5},
      {activity_id:"B",resource_id:"LB",units:1},
      {activity_id:"B",resource_id:"M",quantity:5}],
    materialReceipts:[{resource_id:"M",date:"2026-10-07",quantity:5}]});
  assert.deepEqual(byId(out,"A").work_slots,[1]);
  assert.deepEqual(byId(out,"B").work_slots,[2]);
});
test("fixed reservations reduce capacity and crew/resource calendars intersect",()=>{
  const out=level({...shared,activities:[task("A"),task("B")],assignments:assignments("A","B"),
    resourceReservations:[{resource_id:"L",date:"2026-10-05",units:1}]});
  assert.deepEqual(byId(out,"A").work_slots,[1]);
  assert.deepEqual(byId(out,"B").work_slots,[2]);
  const crew=level({...shared,activities:[task("A",2)],
    crews:[{id:"C",calendar_id:"ALT",members:[{resource_id:"L",units:1}]}],
    assignments:[{activity_id:"A",crew_id:"C"}]});
  assert.deepEqual(byId(crew,"A").work_slots,[1,2]);
  assert.deepEqual(byId(crew,"A").required_calendar_ids,["ALT","LAB"]);
});
test("shortages and impossible capacity fail closed at the horizon",()=>{
  assert.throws(()=>level({...shared,activities:[task("A")],
    resources:[...shared.resources,{id:"M",resource_type:"MATERIAL",inventory_quantity:0}],
    assignments:[...assignments("A"),{activity_id:"A",resource_id:"M",quantity:1}]}),/horizon exhausted/i);
  assert.throws(()=>level({...shared,activities:[task("A")],
    assignments:[{activity_id:"A",resource_id:"L",units:2}]}),/horizon exhausted/i);
});
test("cycles, duplicate IDs and unknown assignments fail closed",()=>{
  assert.throws(()=>level({...shared,activities:[task("A"),task("B")],assignments:assignments("A","B"),
    relationships:[{predecessor:"A",successor:"B"},{predecessor:"B",successor:"A"}]}),/cyclic/i);
  assert.throws(()=>level({...shared,activities:[task("A"),task("A")],assignments:assignments("A")}),/duplicate activity/i);
  assert.throws(()=>level({...shared,activities:[task("A")],assignments:assignments("A","UNKNOWN")}),/unknown activity/i);
});
test("actuals, constraints, mixed types, intraday and data-date progress are rejected",()=>{
  const fixture={...shared,activities:[task("A")],assignments:assignments("A")};
  assert.throws(()=>level({...fixture,activities:[{...task("A"),actual_start:"2026-10-05"}]}),/actual/i);
  assert.throws(()=>level({...fixture,constraints:[{activity_id:"A",type:"MUST_START_ON",date:"2026-10-05"}]}),/constraints/i);
  assert.throws(()=>level({...fixture,activities:[{id:"A",duration:1}]}),/RESOURCE_DEPENDENT/i);
  assert.throws(()=>level({...fixture,timeResolution:"HOUR"}),/DAY/i);
  assert.throws(()=>level({...fixture,dataDate:"2026-10-05"}),/data-date/i);
});
