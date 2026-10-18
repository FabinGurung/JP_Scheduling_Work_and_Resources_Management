import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileVisualModel,validateVisualModel,scenarioDate,horizonEndExclusive,parseMcqReply} from "../src/visual/project-model.mjs";
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
 assert.equal(model.channel.ingestion_state,"GOVERNED_PRIVATE_LEDGER_RECONCILIATION_PENDING");
 assert.equal(manifest.checks.checklist_items,405);
 assert.equal(manifest.private_input_included,false);
 assert.equal(validateVisualModel(model),true);
 assert.equal(files["project-model.json"],compile().files["project-model.json"]);
});
test("three-month calendar uses hypothetical work slots and six-day scenario",()=>{
 const {model}=compile();
 assert.equal(model.planning_scenario.horizon_months,3);
 assert.equal(horizonEndExclusive("2026-10-19",3),"2027-01-19");
 assert.equal(horizonEndExclusive("2027-01-31",1),"2027-02-28");
 assert.equal(model.planning_scenario.end_exclusive,"2027-01-19");
 assert.equal(model.activities[0].calendar_label,"Client consultation");
 assert.equal(model.activities.find(x=>x.id==="T5030").calendar_label,"Footing RCC");
 assert.ok(model.activities.every(x=>typeof x.calendar_label==="string"&&x.calendar_label.length>3));
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
test("sanitized MCQ answers illuminate only reported visual state, never engineering approval",()=>{
 const a=pilot.activities[0].activity_id;
 const record={format:"PCK_PUBLIC_MCQ_STATE_V1",classification:"PUBLIC_SAFE_REPORTED_STATES_ONLY",
 project_id:"PRJ-000007",authority:"REPORTED_ONLY_NOT_ENGINEERING_APPROVED",version:1,
 entries:[{activity_id:a,check_id:"ACTIVITY",reported_day:"2026-10-17",state:"REPORTED_COMPLETE"},
 {activity_id:a,check_id:a+"-C01",reported_day:"2026-10-17",state:"REPORTED_DONE"}]};
 const result=compileVisualModel(pilot,progress,cfg,record).model;
 assert.equal(result.activities[0].mcq_report_state,"REPORTED_COMPLETE");
 assert.equal(result.activities[0].checklist[0].status,"REPORTED_DONE");
 assert.equal(result.activities[0].approval_state,"NO_APPROVED_ACTIVITY_COMPLETION");
 assert.equal(result.project.baseline_approved,false);
 assert.equal(result.mcq_summary.reconciled_reported_answers,2);
 const bad=structuredClone(record);bad.entries[1].private_message_link="https://slack.com/private";
 assert.throws(()=>compileVisualModel(pilot,progress,cfg,bad),/extra fields/);
 const dup=structuredClone(record);dup.entries.push({...dup.entries[0]});
 assert.throws(()=>compileVisualModel(pilot,progress,cfg,dup),/duplicate public MCQ/);
});
test("user latest T1010 answer C supersedes earlier B in public reported state, never as approval",()=>{
 const state=JSON.parse(read("machine/project-mappings/narayani-mcq-public-state.json"));
 assert.equal(state.version,2);
 assert.deepEqual(state.entries,[{activity_id:"T1010",check_id:"ACTIVITY",reported_day:"2026-10-18",state:"REPORTED_COMPLETE"}]);
 const {model}=compileVisualModel(pilot,progress,cfg,state);
 const a=model.activities.find(x=>x.id==="T1010");
 assert.equal(a.mcq_report_state,"REPORTED_COMPLETE");
 assert.equal(a.approval_state,"NO_APPROVED_ACTIVITY_COMPLETION");
 assert.equal(model.evidence_summary.approved_complete_activities,0);
 assert.equal(model.mcq_summary.authority,"REPORTED_ONLY");
 assert.doesNotMatch(JSON.stringify(model),/C0CA3HYNP89|1792261186|U0BQDRXK96E|slack.com/);
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
 assert.match(ui,/visibleDayLabels/);
 assert.match(ui,/day-label/);
 assert.match(ui,/plusMonthsExact/);
 assert.doesNotMatch(ui,/work.length\+" work"/);
 assert.doesNotMatch(ui,/fetch\("\.\/map\.json"/);
 assert.doesNotMatch(ui,/fetch\("\.\/progress\.json"/);
 assert.doesNotMatch(page,/drive\.google\.com|slack\.com\/archives\//);
});

test("all WBS nodes include optional field learning briefs without promoting field reports to approval",()=>{
 const {model}=compile();
 assert.equal(Object.keys(cfg.per_phase_briefs).length,10);
 assert.equal(model.activities.length,45);
 assert.equal(model.activities.filter(a=>a.field_brief.basis==="NARAYANI_HOLD_AWARE_DRAFT").length,5);
 assert.ok(model.activities.every(a=>a.field_brief.authority==="GUIDANCE_ONLY_NOT_ENGINEERING_RELEASE"));
 assert.ok(model.activities.every(a=>["goal","leads","prepare","execute","inspect","evidence"].every(k=>a.field_brief[k]?.length>0)));
 const f=model.activities.find(a=>a.id==="T5030");
 assert.ok(f.hold_ids.length>0);
 assert.match(f.field_brief.inspect,/plumbing-before-closure/);
 assert.equal(f.approval_state,"NO_APPROVED_ACTIVITY_COMPLETION");
 assert.match(model.activities.find(a=>a.id==="T8020").field_brief.prepare,/two unresolved locations/);
 assert.match(model.activities.find(a=>a.id==="T3040").field_brief.inspect,/not yet verified/);
 assert.equal(model.activities.find(a=>a.id==="T7010").field_brief.basis,"GENERAL_PHASE_TEMPLATE");
 const ui=read("src/presentation/narayani-visual.mjs");
 assert.match(ui,/Phase preparation field guide/);
 assert.match(ui,/Project hold-aware field guide/);
 assert.match(ui,/Evidence to capture/);
 const invalid=structuredClone(cfg);invalid.activity_briefs.T5030.inspect="<script>";
 assert.throws(()=>compileVisualModel(pilot,progress,invalid),/invalid field brief/);
});

test("all WBS activities derive hold-aware drawing and preparation needs without authority promotion",()=>{
 const {model}=compile();
 assert.equal(model.activities.length,45);
 assert.ok(model.activities.every(a=>a.preparation?.lead_workdays===2));
 assert.ok(model.activities.every(a=>a.preparation?.source_register==="PRIVATE_PROJECT_FILE_INDEX"));
 assert.ok(model.activities.every(a=>a.preparation?.effective_revision==="NOT_VERIFIED"&&a.preparation.material_quantities==="NOT_VERIFIED"));
 assert.ok(model.activities.every(a=>a.preparation?.engineering_release===false&&a.preparation.resource_booking===false));
 assert.match(model.activities.find(a=>a.id==="T5030").preparation.document_family,/CF1\/C4/);
 assert.match(model.activities.find(a=>a.id==="T3040").preparation.document_family,/permit/);
 assert.ok(model.activities.every(a=>["document_family","crew","materials","equipment","stop_point"].every(k=>a.preparation[k]?.length>0)));
 assert.doesNotMatch(JSON.stringify(model),/19AyrQbMaZ4ze59ixqKMlMlR0UZ|1zwmKrfwW9IN5ourLGFdfleJOCi7dcH2_|docs.google.com\/|drive.google.com\//);
 const ui=read("src/presentation/narayani-visual.mjs");
 for(const token of ["preparationDay","preparingOnDay","gantt-prep","day-prep","Prepare for upcoming work","2-day preparation"])assert.ok(ui.includes(token),token);
 const failed=structuredClone(model);failed.activities[0].preparation.engineering_release=true;
 assert.throws(()=>validateVisualModel(failed),/preparation approval boundary/);
});

test("field engineers can use private drawing crosswalk lookup without leaking private source IDs",()=>{
 const {model}=compile();
 assert.equal(model.activities.length,45);
 assert.ok(model.activities.every(a=>a.preparation.source_register==="PRIVATE_PROJECT_FILE_INDEX"));
 const js=read("src/presentation/narayani-visual.mjs"),html=read("projects/narayani/visual.html");
 assert.match(js,/function copyDrawingLookup/);
 assert.match(js,/Skyforge_WBS_Drawing_Crosswalk/);
 assert.match(js,/ACTIVITY=/);
 assert.match(js,/ISSUE=VERIFY_WITH_DOCUMENT_CONTROLLER/);
 assert.match(js,/Copy private drawing lookup key/);
 assert.match(js,/function focusFieldPanel/);
 assert.match(js,/onSmallScreen/);
 assert.match(js,/box\.scrollIntoView/);
 assert.match(html,/class="mobile-scroll-hint"/);
 assert.match(html,/id="day-readout" role="region"/);
 assert.match(html,/@media\(max-width:680px\)/);
 assert.ok(html.indexOf('id="day-readout"')<html.indexOf('id="calendar-months"'),"selected day readout should appear before the long month grid");
 assert.doesNotMatch(js,/docs\.google\.com\/spreadsheets\/d\/|drive\.google\.com\/file\/d\//);
 assert.doesNotMatch(html,/docs\.google\.com\/spreadsheets\/d\/|drive\.google\.com\/file\/d\//);
});
