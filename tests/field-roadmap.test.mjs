import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {executeWbsSample} from "../src/machine/wbs-cpm.mjs";
import {validateFieldPlan} from "../src/presentation/site-roadmap.mjs";
const seed=JSON.parse(readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/schedule_seed.json",import.meta.url),"utf8"));
const dictionary=readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md",import.meta.url),"utf8");
const make=()=>executeWbsSample(seed,dictionary,{seedSnapshotSha:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",dictionarySnapshotSha:"ff1e3126efe8811be9bc398054aec601efaf7482"}).plan;
const clone=x=>JSON.parse(JSON.stringify(x));
test("archived field roadmap keeps all original engineer resources without showing them on the new homepage",()=>{
 const page=readFileSync(new URL("../more/legacy-home.html",import.meta.url),"utf8");
 assert.match(page,/<h2 id="milestone-title">Major milestones<\/h2>/);
 assert.match(page,/<h2 id="roadmap-title">Full construction roadmap<\/h2>/);
 assert.match(page,/Planner \/ Admin/);
 assert.match(page,/src\/presentation\/site-roadmap.mjs/);
 assert.match(page,/Actual completion status.*NOT been supplied/);
 assert.match(page,/advanced.html/);
});
test("field UI binds 45 activities and 49 actual source prerequisites to verified WBS IDs",()=>{
 const plan=make(),registries=validateFieldPlan(plan);
 assert.equal(plan.activities.length,45);
 assert.equal(plan.milestones.length,7);
 assert.equal(plan.phases.length,10);
 assert.equal(plan.duration_workday_slots,481);
 assert.equal(plan.activities.reduce((n,a)=>n+a.predecessor_ids.length,0),49);
 assert.equal(registries.ids.size,45);
 assert.equal(registries.phases.size,10);
 assert.equal(plan.activities.find(a=>a.activity_id==="T2050").predecessor_ids.length,2);
});
test("fail-closed field model rejects false progress, unknown dependency or altered schedule",()=>{
 const plan=make();
 const altered=clone(plan);altered.activities[0].predecessor_ids=["M9999"];
 assert.throws(()=>validateFieldPlan(altered),/unresolved\/violated/);
 const falseClass=clone(plan);falseClass.classification="PRIVATE_SITE_DATA";
 assert.throws(()=>validateFieldPlan(falseClass),/classification/);
 const wrongCount=clone(plan);wrongCount.task_count=44;
 assert.throws(()=>validateFieldPlan(wrongCount),/count mismatch/);
 const brokenFinish=clone(plan);brokenFinish.activities[0].early_finish_exclusive_slot+=1;
 assert.throws(()=>validateFieldPlan(brokenFinish),/invalid activity event slots/);
});
test("existing P6-like kernel scheduling evidence preserved and page JSON remain byte-repeatable",()=>{
 const a=executeWbsSample(seed,dictionary),b=executeWbsSample(seed,dictionary);
 assert.equal(a.files["plan.json"],b.files["plan.json"]);
 assert.equal(a.files["manifest.json"],b.files["manifest.json"]);
 assert.equal(a.manifest.external_upstream_execution,false);
 assert.equal(a.manifest.calendar_dates_generated,false);
 assert.equal(a.manifest.engineering_approved,false);
});
