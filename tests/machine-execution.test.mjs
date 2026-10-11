import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {executeRequest,verifyFiles,UPSTREAM_IDS} from "../src/machine/execute.mjs";
import {examplePlanner} from "../src/presentation/planner.mjs";
const fixture=JSON.parse(readFileSync(new URL("../machine/requests/demo-foundation.json",import.meta.url),"utf8"));
const clone=x=>JSON.parse(JSON.stringify(x));
test("machine executes approved synthetic input and returns stable hashes",()=>{
 const a=executeRequest(fixture,{publicBuild:true});
 const b=executeRequest(clone(fixture),{publicBuild:true});
 assert.deepEqual(a.files,b.files);
 assert.equal(a.plan.activities.length,6);
 assert.equal(a.plan.engineering_status,"NOT_ENGINEERING_APPROVED");
 assert.equal(a.plan.computed_by,"PCK_RESOURCE_LEVELER");
 assert.equal(a.manifest.registered_adapter_count,5);
 assert.equal(a.manifest.externally_executed_upstreams,0);
 assert.ok(a.plan.activities.some(x=>x.leveling_delay_days>0));
 assert.ok(verifyFiles(a.files,fixture,{publicBuild:true}));
 assert.throws(()=>verifyFiles({...a.files,"plan.json":a.files["plan.json"]+" "},fixture,{publicBuild:true}),/readback/i);
});
test("adapter integration is truthful; all five outputs are neutral/not executed",()=>{
 const {upstream}=executeRequest(fixture,{publicBuild:true});
 assert.deepEqual(Object.keys(upstream.adapters).sort(),UPSTREAM_IDS.slice().sort());
 for(const [key,item] of Object.entries(upstream.adapters)){
  assert.equal(item.upstream_id,key);
  assert.equal(item.upstream_runtime_executed,false);
  assert.equal(item.certified_interoperability,false);
  assert.ok(item.limitations.length>0);
 }
 assert.match(upstream.adapters.TASKJUGGLER.data.tjp_source,/2026-10-12/);
});
test("public/private boundaries are fail closed",()=>{
 const bad=clone(fixture);bad.classification="PRIVATE_RESTRICTED";
 assert.throws(()=>executeRequest(bad,{publicBuild:true}),/synthetic/i);
 const illegal=clone(fixture);illegal.approval="ENGINEERING_APPROVED_EXTERNAL";
 assert.throws(()=>executeRequest(illegal,{publicBuild:true}),/independent/i);
 const drift=clone(fixture);drift.planner.project.id="SITE-REAL";
 assert.throws(()=>executeRequest(drift,{publicBuild:true}),/DEMO/i);
 const injected=clone(fixture);injected.planner.activities[0].name="<img onerror=alert(1)>";
 assert.throws(()=>executeRequest(injected,{publicBuild:true}),/unsafe/i);
 const unknown=clone(fixture);unknown.planner.untraceable_quantity=123;
 assert.throws(()=>executeRequest(unknown,{publicBuild:true}),/Unsupported planner field/);
 const duplicate=clone(fixture);duplicate.planner.activities[1].id=duplicate.planner.activities[0].id;
 assert.throws(()=>executeRequest(duplicate,{publicBuild:true}),/Duplicate activities/);
 const noClaim=clone(fixture);noClaim.raw_engineering_approval=true;
 assert.throws(()=>executeRequest(noClaim,{publicBuild:true}),/Unsupported request field/);
});
test("non-FS/lag schedules must not be exported as runnable TaskJuggler parity",()=>{
 const req=clone(fixture);req.planner.relationships[0].type="SS";req.planner.relationships[0].lag=1;
 const r=executeRequest(req,{publicBuild:true});
 assert.equal(r.upstream.adapters.TASKJUGGLER.mode,"BLOCKED_UNSUPPORTED_SEMANTICS");
 assert.equal(r.upstream.adapters.TASKJUGGLER.data.tjp_source,null);
});
test("independent planner engine stays compatible with original fixture",()=>{
 const example=examplePlanner();
 const x=executeRequest(fixture,{publicBuild:true});
 assert.equal(x.plan.activities.length,example.activities.length);
 for(const row of x.plan.activities)assert.equal(row.work_slots.length,row.duration_workdays);
});
