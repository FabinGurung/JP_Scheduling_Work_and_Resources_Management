import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {executeWbsSample} from "../src/machine/wbs-cpm.mjs";
const seed=JSON.parse(readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/schedule_seed.json",import.meta.url),"utf8"));
const dictionary=readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md",import.meta.url),"utf8");
const pins={seedSnapshotSha:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",dictionarySnapshotSha:"ff1e3126efe8811be9bc398054aec601efaf7482"};
const clone=x=>JSON.parse(JSON.stringify(x));
test("native CPM processes exact Drive-labeled sample without inventing dates",()=>{
 const {plan,manifest}=executeWbsSample(seed,dictionary,pins);
 assert.equal(plan.task_count,45);
 assert.equal(plan.relationship_count,49);
 assert.equal(plan.milestone_count,7);
 assert.equal(plan.duration_workday_slots,481);
 assert.equal(plan.critical_activity_count,41);
 assert.equal(plan.phases.length,10);
 assert.equal(manifest.calendar_dates_generated,false);
 assert.equal(manifest.engineering_approved,false);
 assert.equal(manifest.external_upstream_execution,false);
 assert.equal(plan.activities.filter(a=>a.total_float_days>0).length,4);
 assert.equal(plan.activities.at(-1).early_finish_exclusive_slot,481);
});
test("machine emits deterministic output digest and no imaginary schedule date",()=>{
 const x=executeWbsSample(seed,dictionary,pins),y=executeWbsSample(clone(seed),dictionary,pins);
 assert.deepEqual(x.files,y.files);
 assert.match(x.files["gantt.svg"],/<svg/);
 assert.match(x.files["index.html"],/NOT ENGINEERING APPROVED/);
 assert.ok(!("start_date" in x.plan));
 assert.equal(x.manifest.source_snapshot_git_blobs.schedule_seed,pins.seedSnapshotSha);
});
test("reconciles dictionary-only WBS codes, never silently inserts them",()=>{
 const plan=executeWbsSample(seed,dictionary,pins).plan;
 const warning=plan.warnings.find(x=>x.code==="DICTIONARY_ONLY_TASKS");
 assert.deepEqual(warning.values,["5020","9050"]);
 assert.equal(plan.activities.length,45);
});
test("rejects missing predecessor and cyclic link",()=>{
 const missing=clone(seed);missing.tasks[1].predecessors=[{id:"NOT_A_REAL_TASK",type:"FS"}];
 assert.throws(()=>executeWbsSample(missing,dictionary,pins),/Missing predecessor/i);
 const cyc=clone(seed);cyc.tasks[0].predecessors=[{id:"T1020",type:"FS"}];
 assert.throws(()=>executeWbsSample(cyc,dictionary,pins),/cycle/i);
});
test("rejects invalid zero milestone, unsupported dates and duplicate IDs",()=>{
 const wrong=clone(seed);wrong.tasks.find(t=>t.type==="Milestone").duration_days=1;
 assert.throws(()=>executeWbsSample(wrong,dictionary,pins),/milestone/i);
 const dates=clone(seed);dates.project_metadata.start_date="2026-10-11";
 assert.throws(()=>executeWbsSample(dates,dictionary,pins),/unknown field/i);
 const dup=clone(seed);dup.tasks[1].task_id=dup.tasks[0].task_id;
 assert.throws(()=>executeWbsSample(dup,dictionary,pins),/Duplicate/i);
});
test("rejects unsafe markup and unsupported predecessors",()=>{
 const injection=clone(seed);injection.tasks[0].name="<script>alert(1)</script>";
 assert.throws(()=>executeWbsSample(injection,dictionary,pins),/Unsafe/i);
 const ss=clone(seed);ss.tasks[1].predecessors[0].type="SS";
 assert.throws(()=>executeWbsSample(ss,dictionary,pins),/Only zero-lag FS/i);
 const lag=clone(seed);lag.tasks[1].predecessors[0].lag=2;
 assert.throws(()=>executeWbsSample(lag,dictionary,pins),/unknown field/i);
});
