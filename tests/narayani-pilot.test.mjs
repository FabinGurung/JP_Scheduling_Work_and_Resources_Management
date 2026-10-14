import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildNarayaniPilot,validateNarayaniPilot} from "../src/machine/narayani-pilot.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const seed=JSON.parse(read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
const dictionary=read("machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md");
const config=JSON.parse(read("machine/project-mappings/narayani-v0.1.json"));
const pinned={seedBlob:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",dictionaryBlob:"ff1e3126efe8811be9bc398054aec601efaf7482",configBlob:"572380334e6c262159059728fee70f610126fb14"};
const build=()=>buildNarayaniPilot(seed,dictionary,config,pinned);
test("45 tasks, 49 source links, 7 milestones, dictionary gap retained",()=>{
 const r=build().project;
 assert.equal(r.project.project_id,"PRJ-000007");
 assert.equal(r.master.activities,45);assert.equal(r.master.relationships,49);
 assert.equal(r.master.milestones,7);assert.equal(r.phases.length,10);
 assert.equal(r.master.dictionary_defined,47);
 assert.deepEqual(r.master.dictionary_seed_missing,["5020","9050"]);
 assert.equal(r.activities.reduce((n,a)=>n+a.predecessor_ids.length,0),49);
 assert.equal(validateNarayaniPilot(r),true);
});
test("no fabricated progress, baseline or approval",()=>{
 const p=build().project;
 assert.equal(p.project.verified_progress,false);
 assert.equal(p.project.site_permits_verified,false);
 assert.equal(p.project.schedule_baseline_approved,false);
 assert.ok(p.activities.every(a=>a.actual_status==="NO_VERIFIED_PROGRESS"&&a.adoption_state==="TEMPLATE_ONLY_SCOPE_UNAPPROVED"));
 assert.ok(p.milestones.every(m=>m.verified_complete===false&&m.site_target_date===null));
 assert.equal(p.quality.field_reporting_available,false);
 assert.equal(p.quality.approved_task_count,0);
});
test("five mapped, unresolved hold points",()=>{
 const p=build().project;
 assert.equal(p.hold_points.length,5);
 assert.ok(p.hold_points.find(x=>x.id==="NAR-HOLD-002").activity_ids.includes("T8020"));
 assert.equal(p.hold_points.find(x=>x.id==="NAR-HOLD-004").activity_ids.length,0);
 assert.ok(p.hold_points.every(x=>x.authority!=="APPROVED"&&x.source_categories.length>0));
 assert.ok(p.activities.find(a=>a.activity_id==="T5030").hold_ids.includes("NAR-HOLD-001"));
});
test("reject invalid mapping and approval claims",()=>{
 const wrong=JSON.parse(JSON.stringify(config));wrong.holds[0].activity_ids=["T9999"];
 assert.throws(()=>buildNarayaniPilot(seed,dictionary,wrong,pinned),/unresolved activity/);
 const missing=JSON.parse(JSON.stringify(config));delete missing.phase_mapping["5000"];
 assert.throws(()=>buildNarayaniPilot(seed,dictionary,missing,pinned),/unmapped WBS phase/);
 const p=build().project;p.project.verified_progress=true;
 assert.throws(()=>validateNarayaniPilot(p),/cannot certify real project/);
});
test("public project page and strict build controls",()=>{
 const page=read("projects/narayani/index.html");
 assert.match(page,/Narayani Parajuli/);
 assert.match(page,/PLANNING PILOT/);
 assert.match(page,/id="holds"/);
 assert.match(page,/id="milestone-cards"/);
 assert.doesNotMatch(page,/drive[.]google[.]com/);
 assert.match(read("scripts/build-public-site.mjs"),/private_source_identifiers_published/);
 assert.match(read("scripts/run-narayani-pilot.mjs"),/Unreviewed source/);
});
test("repeatable machine output",()=>{
 const a=build(),b=build();
 assert.equal(a.files["map.json"],b.files["map.json"]);
 assert.equal(a.files["manifest.json"],b.files["manifest.json"]);
 assert.equal(a.manifest.approval_status,"WBS_ADOPTION_NOT_APPROVED");
 assert.equal(a.manifest.private_source_identifiers_published,false);
});
