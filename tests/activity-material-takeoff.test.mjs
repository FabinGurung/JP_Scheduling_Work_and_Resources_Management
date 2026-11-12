import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateMaterialCatalog,scopeMaterialTakeoff} from "../src/reference/material-planner.mjs";

const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const catalog=read("work-items/material-references.v1.json");
const boq=read("work-items/productivity-norms.v1.json");
const seed=read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json");

test("activity calculator accepts live-source compatible catalog and independently entered work quantities",()=>{
 assert.equal(validateMaterialCatalog(catalog,boq,seed),true);
 const t=scopeMaterialTakeoff(catalog,"activity","T5030",{concrete_M20:8});
 assert.equal(t.reference_only,true);
 assert.equal(t.approved_project_quantity,false);
 assert.equal(t.assembly_count,3);
 assert.equal(t.measured_assemblies,1);
 assert.equal(t.complete,false);
 assert.deepEqual(t.pending.map(x=>x.recipe_id),["rebar","formwork"]);
 const byId=new Map(t.material_lines.map(x=>[x.id,x]));
 assert.ok(Math.abs(byId.get("cement").quantity-64.512)<1e-9);
 assert.equal(byId.get("cement").order_quantity,65);
 assert.ok(Math.abs(byId.get("sand").quantity-3.36)<1e-9);
 assert.ok(Math.abs(byId.get("coarse").quantity-6.72)<1e-9);
 assert.equal(byId.has("rebar"),false,"Concrete volume cannot invent rebar weight");
 assert.equal(byId.has("form"),false,"Concrete volume cannot invent formwork area");
});
test("different unit assemblies keep their own input; unknown coefficients are unresolved",()=>{
 const t=scopeMaterialTakeoff(catalog,"activity","T5030",
  {concrete_M20:8,rebar:500,formwork:20},{wastePct:5});
 assert.equal(t.pending.length,0);
 assert.equal(t.components.length,3);
 assert.deepEqual(t.components.map(x=>x.work_unit),["m³","kg","m²"]);
 assert.ok(t.unresolved.some(x=>x.material_id==="wire"));
 assert.ok(t.unresolved.some(x=>x.material_id==="props"));
 assert.equal(t.complete,false);
 assert.ok(Math.abs(t.material_lines.find(x=>x.id==="sand").quantity-3.528)<1e-9);
 assert.equal(t.material_lines.find(x=>x.id==="cement").order_quantity,68);
});
test("blank, unknown or invalid material measurements never quietly become quantities",()=>{
 const empty=scopeMaterialTakeoff(catalog,"activity","T5030",{});
 assert.equal(empty.material_lines.length,0);
 assert.equal(empty.pending.length,3);
 const milestone=scopeMaterialTakeoff(catalog,"activity","M1040",{});
 assert.equal(milestone.assembly_count,0);
 assert.equal(milestone.complete,false);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","T5030",{concrete_M20:0}),/Invalid measured/);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","T5030",{concrete_M20:"8"}),/Invalid measured/);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","T5030",{concrete_M20:-1}),/Invalid measured/);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","T5030",{unknown:8}),/Unexpected/);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","T5030",{}, {wastePct:31}),/Invalid measured/);
 assert.throws(()=>scopeMaterialTakeoff(catalog,"activity","NONEXISTENT",{}),/Unknown/);
});
test("BOQ work lookups remain source-mapped and do not become approved project BOQs",()=>{
 const item=scopeMaterialTakeoff(catalog,"work","BOQ:20",{});
 assert.equal(item.reference_only,true);
 assert.equal(item.approved_project_quantity,false);
 assert.ok(item.assembly_count>0);
 assert.ok(item.pending.length>0);
 assert.ok(item.material_lines.length===0);
});
