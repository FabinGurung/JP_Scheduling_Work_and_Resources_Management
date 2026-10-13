import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {executeWbsSample} from "../src/machine/wbs-cpm.mjs";
import {FIELD_PROJECT,OBSERVATIONS,newFieldReport,validateFieldReport,evaluateFieldStatus,validateReviewDecision} from "../src/field/progress.mjs";
const seed=JSON.parse(readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/schedule_seed.json",import.meta.url),"utf8"));
const dictionary=readFileSync(new URL("../machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md",import.meta.url),"utf8");
const plan=executeWbsSample(seed,dictionary).plan;
const sample=()=>newFieldReport(plan,{uuid:"00000000-0000-4000-8000-000000000001",activity_id:"T1010",observation:"WORK_REPORTED_COMPLETE",observed_at:"2026-10-13T02:00:00.000Z",reporter_display_name:"Synthetic inspector",field_note:"Synthetic test only, not actual work",evidence_kind:"DAILY_LOG",evidence_url:"https://drive.google.com/file/d/SYNTHETIC/view",evidence_description:"Synthetic controlled evidence"});
test("field report is evidence-linked, explicitly synthetic and always unverified",()=>{
 const r=sample();
 assert.equal(r.project_id,FIELD_PROJECT);
 assert.equal(r.authority_state,"UNVERIFIED_SUBMISSION");
 assert.equal(validateFieldReport(r,plan).valid,true);
 assert.equal(OBSERVATIONS.length,4);
});
test("unverified report never changes milestone completion or approves construction readiness",()=>{
 const r=sample(),s=evaluateFieldStatus(plan,[r]);
 assert.equal(s.verified_complete_count,0);
 assert.equal(s.authority,"NO_APPROVED_SITE_PROGRESS");
 assert.equal(s.pending_observation_count,1);
 assert.ok(s.milestoneStates.every(m=>m.verified_complete===false));
 assert.ok(s.activityStates.every(a=>a.ready_for_construction===false));
 assert.equal(s.activityStates.find(a=>a.activity_id==="T1010").review_state,"REPORT_PENDING_REVIEW");
});
test("fail closed on wrong project, unsupported task, missing evidence and fake approval",()=>{
 const r=sample();
 assert.throws(()=>validateFieldReport({...r,project_id:"REAL_SITE"},plan),/source\/project mismatch/);
 assert.throws(()=>validateFieldReport({...r,activity_id:"M9999"},plan),/activity not in source/);
 assert.throws(()=>validateFieldReport({...r,evidence_refs:[]},plan),/evidence references required/);
 assert.throws(()=>validateFieldReport({...r,authority_state:"APPROVED"},plan),/cannot claim approval/);
 assert.throws(()=>validateFieldReport({...r,reviewer_id:"fraud"},plan),/unknown field/);
});
test("reject untrusted and credential-bearing URLs, bad observed time, bad reporter",()=>{
 const r=sample();
 for(const url of ["http://example.com/photo","https://name:secret@drive.google.com/file","javascript:alert(1)","https://drive.google.com:8443/file"])
   assert.throws(()=>validateFieldReport({...r,evidence_refs:[{...r.evidence_refs[0],url}]},plan),/URL/);
 assert.throws(()=>validateFieldReport({...r,observed_at:"2026-10-13"},plan),/observation time/);
 assert.throws(()=>validateFieldReport({...r,reporter_display_name:""},plan),/reporter/);
});
test("authenticated reviewer binding and source readback are mandatory, not self-asserted",()=>{
 const r=sample();
 const d={format:"PCK_FIELD_REVIEW_V1",report_id:r.report_id,decision:"ACCEPT",reviewer_id:"VERIFIED_PRIVATE_ACCOUNT",reviewed_at:"2026-10-13T02:05:00.000Z",evidence_checked:true,review_note:"Synthetic review scenario"};
 assert.throws(()=>validateReviewDecision(d,r),/authentication/);
 assert.throws(()=>validateReviewDecision(d,r,{authenticatedReviewerId:"WRONG",sourceReadbackVerified:true}),/authentication/);
 assert.throws(()=>validateReviewDecision(d,r,{authenticatedReviewerId:"VERIFIED_PRIVATE_ACCOUNT"}),/readback/);
 assert.deepEqual(validateReviewDecision(d,r,{authenticatedReviewerId:"VERIFIED_PRIVATE_ACCOUNT",sourceReadbackVerified:true}),{decision:"ACCEPT",report_id:r.report_id,reviewer_verified:true});
});
test("single field page has evidence-capture and separate authenticated Drive upload, no public write gateway",()=>{
 const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const ui=readFileSync(new URL("../src/presentation/site-roadmap.mjs",import.meta.url),"utf8");
 assert.match(html,/id="field-form"/);
 assert.match(html,/id="field-evidence-url"/);
 assert.match(html,/id="field-observed"/);
 assert.match(html,/00_PENDING_FIELD_REPORTS|1z6s5wqMjuSWACO-C7866wyOFD5wfy6Uo/);
 assert.match(html,/not valid updates for a named real construction project/i);
 assert.match(ui,/UNVERIFIED|Unverified/);
 assert.match(ui,/newFieldReport/);
 assert.match(ui,/URL.createObjectURL/);
 assert.doesNotMatch(ui,/fetch\([^)]*method:\s*["']POST/);
});
