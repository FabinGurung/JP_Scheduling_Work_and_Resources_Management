import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileVisualModel,validateVisualModel,scenarioDate,parseMcqReply} from "../src/visual/project-model.mjs";
import {buildNarayaniPilot} from "../src/machine/narayani-pilot.mjs";
import {buildPublicProgress} from "../src/machine/narayani-progress.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const cfg=JSON.parse(read("machine/project-mappings/narayani-checklist-config-v0.1.json"));
const seed=JSON.parse(read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
const dict=read("machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md");
const pilot=buildNarayaniPilot(seed,dict,JSON.parse(read("machine/project-mappings/narayani-v0.1.json"))).project;
const progress=buildPublicProgress(JSON.parse(read("machine/project-mappings/narayani-progress-public-v0.1.json")),pilot).output;
const compile=()=>compileVisualModel(pilot,progress,cfg);
test("one canonical projected model powers 45 WBS nodes, 49 edges, 405 MCQ checklist prompts",()=>{
 const {model,manifest,files}=compile();
 assert.equal(model.activities.length,45);
 assert.equal(model.links.length,49);
 assert.equal(model.activities.reduce((n,a)=>n+a.checklist.length,0),405);
 assert.equal(model.milestones.length,7);
 assert.equal(model.phases.length,10);
 assert.equal(model.project.baseline_approved,false);
 assert.equal(model.planning_scenario.approved_dates,false);
 assert.equal(model.channel.ingestion_state,"MANUAL_CHATGPT_RECONCILIATION_PENDING");
 assert.equal(manifest.checks.checklist_items,405);
 assert.equal(manifest.private_input_included,false);
 assert.equal(validateVisualModel(model),true);
 assert.equal(files["project-model.json"],compile().files["project-model.json"]);
});
test("three-month calendar uses hypothetical work slots and six-day scenario",()=>{
 const {model}=compile();
 assert.equal(model.planning_scenario.horizon_months,3);
 assert.equal(scenarioDate("2026-10-18",0),"2026-10-19"); // Sunday
 assert.equal(scenarioDate("2026-10-19",6),"2026-10-26"); // Skip Sunday
 assert.equal(model.activities.find(x=>x.master_start_slot===0).scenario_start,"2026-10-19");
 assert.ok(model.activities.some(x=>x.scenario_finish>="2027-01-19"));
 assert.ok(model.activities.every(x=>x.status==="UNVERIFIED"&&x.approval_state==="NO_APPROVED_ACTIVITY_COMPLETION"));
});
test("valid MCQ keys resolve only existing activities and checklist IDs without claiming approval",()=>{
 const {model}=compile();
 const a=model.activities[0],q=a.checklist[0].id;
 const activity=parseMcqReply("P=PRJ-000007 | A="+a.id+" | C=ACTIVITY | Q=C",model);
 assert.equal(activity.interpreted_state,"REPORTED_COMPLETE");
 assert.equal(activity.approved,false);
 const checklist=parseMcqReply("P=PRJ-000007 | A="+a.id+" | C="+q+" | Q=B",model);
 assert.equal(checklist.interpreted_state,"IN_PROGRESS");
 assert.throws(()=>parseMcqReply("P=PRJ-000007 | A=UNKNOWN | C=ACTIVITY | Q=A",model),/unknown project activity/);
 assert.throws(()=>parseMcqReply("P=PRJ-000007 | A="+a.id+" | C="+q+" | Q=Z",model),/invalid multiple-choice/);
 assert.throws(()=>parseMcqReply("P=PRJ-000007 | A="+a.id+" | C=UNKNOWN | Q=A",model),/unknown checklist/);
});
test("unapproved project progress and malformed template fail closed",()=>{
 const x=structuredClone(pilot);x.project.schedule_baseline_approved=true;
 assert.throws(()=>compileVisualModel(x,progress,cfg),/master WBS/);
 const bad=structuredClone(cfg);delete bad.per_phase_checks["5000"];
 assert.throws(()=>compileVisualModel(pilot,progress,bad),/calendar\/checklist contract/);
 const changed=structuredClone(progress);changed.completed_wbs_activities=1;
 assert.throws(()=>compileVisualModel(pilot,changed,cfg),/field progress authority/);
});
test("single-file browser experience renders graph, Gantt, calendar, MCQ from project-model",()=>{
 const page=read("projects/narayani/visual.html");
 const ui=read("src/presentation/narayani-visual.mjs");
 assert.match(page,/id="graph"/);
 assert.match(page,/id="gantt-scroll"/);
 assert.match(page,/id="calendar-months"/);
 assert.match(page,/id="checklist"/);
 assert.match(ui,/fetch\("\.\/project-model\.json"/);
 assert.match(ui,/copyAnswer/);
 assert.match(page,/id="timeline-play"/);
 assert.match(page,/id="timeline-position"/);
 assert.match(ui,/function playPreview/);
 assert.match(ui,/previewSlot/);
 assert.match(ui,/gantt-playhead/);
 assert.doesNotMatch(ui,/fetch\("\.\/map\.json"/);
 assert.doesNotMatch(ui,/fetch\("\.\/progress\.json"/);
 assert.doesNotMatch(page,/drive\.google\.com|slack\.com\/archives\//);
});
