import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildHarisharanV002} from "../src/reference/harisharan-v002.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {validateStandardScheduleInput,normalizeStandardScheduleInput,
 normalizePublishedScheduleEdition,compareStandardScheduleEditions}
 from "../src/kernel/standard-schedule-template.mjs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const template=()=>read("templates/scheduling/standard-schedule-input-v1.example.json");
const n=read("projects/narayani/schedule-v002.json");
const h=buildHarisharanV002(read("machine/project-mappings/harisharan-detailed-wbs-v000001.json"),
 read("work-items/productivity-starters.v2.json"),read("work-items/material-references.v1.json"));

test("new-project intake template is valid but visibly incomplete, never an approved/solved schedule",()=>{
 const t=template(),before=JSON.stringify(t);
 assert.equal(validateStandardScheduleInput(t),true);
 const r=normalizeStandardScheduleInput(t);
 assert.equal(r.format,"SKYFORGE_STANDARD_SCHEDULE_NORMALIZED_V1");
 assert.equal(r.machine_ready,false);
 assert.equal(r.engineering_release,false);
 assert.equal(r.baseline_approved,false);
 assert.ok(r.diagnostics.some(x=>x.code==="TIME_AXIS_NOT_SELECTED"&&x.blocks_scheduling));
 assert.ok(r.diagnostics.some(x=>x.code==="ACTIVITY_DURATION_UNKNOWN"&&x.blocks_scheduling));
 assert.ok(r.diagnostics.some(x=>x.code==="ACTIVITY_QUANTITY_UNKNOWN"&&!x.blocks_scheduling));
 assert.equal(JSON.stringify(t),before,"intake normalization may not mutate the owner/source template");
});
test("reusable source contract accepts a second project with dated input, Nepali original, English translation references, and measured quantity",()=>{
 const a=template();
 a.project={id:"SECOND_PROJECT",name:"Source-preservation acceptance fixture"};
 a.clock={kind:"DATED_WORK_SLOTS",origin_date:"2026-11-16"};
 a.crew={skilled:2,helpers:3,machines:null};
 a.source_manifest=[{id:"S1",original_language:"ne",original_text_file_id:"DRIVE-NE-001",
  english_text_file_id:"DRIVE-EN-001",authority:"OWNER_VERBATIM"}];
 a.activities[0].duration={value:3,unit:"WORKDAYS",basis:"OWNER_STATED"};
 a.activities[0].quantity={value:10,unit:"m³",basis:"SOURCE_REVIEWED"};
 a.activities[0].source_refs=["S1"];
 a.activities.push({id:"ACT-002",title:"Follow-on works",wbs_id:"WBS-001",
  duration:{value:2,unit:"WORKDAYS",basis:"PLANNING_ALLOWANCE"},
  quantity:{value:null,unit:null,basis:"UNKNOWN"},source_refs:["S1"],hold_ids:[],
  actual_start:null,actual_finish:null,actual_percent:null});
 a.relationships.push({from:"ACT-001",to:"ACT-002",type:"FS",lag:0,lag_unit:"WORKDAYS"});
 assert.equal(validateStandardScheduleInput(a),true);
 const r=normalizeStandardScheduleInput(a);
 assert.equal(r.machine_ready,true);
 assert.equal(r.clock.kind,"DATED_WORK_SLOTS");
 assert.equal(r.source_manifest[0].original_language,"ne");
 assert.equal(r.source_manifest[0].english_text_file_id,"DRIVE-EN-001");
 assert.equal(r.activities[0].quantity.value,10);
 assert.equal(r.activities[0].quantity.unit,"m³");
 assert.equal(r.relationships[0].lag_unit,"WORKDAYS");
 assert.equal(r.baseline_approved,false);
});
test("unknown source, cycle, cross-unit duration, invalid progress and approval claims fail closed",()=>{
 const base=template();
 const expectBad=(change,pattern)=>{
  const copy=structuredClone(base);change(copy);
  assert.throws(()=>validateStandardScheduleInput(copy),pattern);
 };
 expectBad(x=>{x.activities[0].source_refs=["INVENTED"];},/unknown activity source/);
 expectBad(x=>{x.activities[0].duration={value:2,unit:"UNKNOWN",basis:"OWNER_STATED"};},/numeric duration needs unit/);
 expectBad(x=>{x.activities[0].actual_percent=100;},/unverified actual progress/);
 expectBad(x=>{x.authority.engineering_release=true;},/unapproved-source boundary/);
 expectBad(x=>{x.activities[0].quantity={value:8,unit:null,basis:"SOURCE_REVIEWED"};},/measured quantity/);
 expectBad(x=>{x.wbs.push({id:"WBS-002",title:"Cycle",parent_id:"WBS-001"});x.wbs[0].parent_id="WBS-002";},/WBS parent cycle/);
 expectBad(x=>{
  x.activities.push({...structuredClone(x.activities[0]),id:"ACT-002",hold_ids:[]});
  x.relationships.push({from:"ACT-001",to:"ACT-002",type:"FS",lag:0,lag_unit:"WORKDAYS"});
  x.relationships.push({from:"ACT-002",to:"ACT-001",type:"FS",lag:0,lag_unit:"WORKDAYS"});
 },/dependency cycle/);
 expectBad(x=>{x.relationships.push({from:"ACT-001",to:"ACT-001",type:"FS",lag:0,lag_unit:"WORKDAYS"});},/dependency endpoints/);
});
test("Narayani v002 and Harisharan v002 normalize to one project-independent Gantt edition contract",()=>{
 const origN=JSON.stringify(n),origH=JSON.stringify(h);
 assert.equal(validateGenericViewModel(n),true);
 assert.equal(validateGenericViewModel(h),true);
 const a=normalizePublishedScheduleEdition(n);
 const b=normalizePublishedScheduleEdition(h);
 assert.equal(a.format,b.format);
 assert.equal(a.clock.kind,"RELATIVE_CALENDAR_DAYS");
 assert.equal(b.clock.kind,"DATED_WORK_SLOTS");
 assert.equal(a.clock.origin_date,"2000-01-02");
 assert.equal(b.clock.origin_date,"2026-11-16");
 assert.deepEqual([a.counts.activities,a.counts.links,a.counts.holds,a.counts.scheduled],[160,210,6,156]);
 assert.deepEqual([b.counts.activities,b.counts.links,b.counts.scheduled],[839,1321,839]);
 assert.ok(a.activities.some(x=>x.duration.unit==="ELAPSED_DAYS"));
 assert.ok(a.relationships.some(x=>x.lag_basis==="elapsed"));
 assert.ok(b.activities.some(x=>x.reference_estimate?.components?.length));
 assert.equal(b.authority.baseline_approved,false);
 assert.equal(a.authority.engineering_release,false);
 assert.equal(a.activities[0].id,n.activities[0].id);
 assert.equal(b.activities[0].id,h.activities[0].id);
 assert.equal(JSON.stringify(n),origN);
 assert.equal(JSON.stringify(h),origH);
 const result=compareStandardScheduleEditions(a,b);
 assert.equal(result.format,"SKYFORGE_STANDARD_SCHEDULE_COMPARISON_V1");
 assert.equal(result.projects[0].id,"PRJ-000007");
 assert.equal(result.projects[1].id,"PORT-000014");
 assert.ok(result.differences_must_not_be_auto_reconciled.includes("RELATIVE_VS_DATED_CLOCK"));
 assert.equal(result.reusable_presentation,"src/presentation/scheduling-desk.mjs");
});
test("Harisharan measured BOQ v003 is not silently substituted for its dated V002 schedule",()=>{
 const a=normalizePublishedScheduleEdition(h);
 const boq=read("machine/project-mappings/harisharan-boq-quantity-v003.json");
 assert.equal(boq.records.length,34);
 assert.equal(a.counts.activities,839);
 assert.equal(a.authority.actual_progress_verified,false);
 assert.equal(a.source_model_sha256,h.input_sha256);
 assert.notEqual(a.source_model_format,boq.format);
 assert.ok(a.activities.some(x=>x.measured_work.quantity===null));
});
test("public output admits the reusable input template but never a private or project-owned raw schedule",()=>{
 const build=readFileSync(new URL("../scripts/build-public-site.mjs",import.meta.url),"utf8");
 assert.match(build,/templates\/scheduling\/standard-schedule-input-v1\.example\.json/);
 assert.doesNotMatch(JSON.stringify(template()),/docs\.google\.com|drive\.google\.com|access_token|BEGIN PRIVATE KEY/i);
 assert.match(readFileSync(new URL("../studio/index.html",import.meta.url),"utf8"),/templates\/scheduling\/standard-schedule-input-v1\.example\.json/);
});
