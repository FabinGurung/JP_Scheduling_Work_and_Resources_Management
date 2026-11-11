import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateDraftResourceRoster,resourceRowsForSelected} from "../src/reference/selected-resource-drafts.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const roster=()=>JSON.parse(read("work-items/narayani-resource-scenarios.v1.json"));
const model=()=>{
 const seed=JSON.parse(read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
 return {project:{id:"PRJ-000007"},activities:seed.tasks.map(t=>({id:t.task_id,title:t.name,duration:t.duration_days}))};
};
test("45 source-tied public tasks have 116 unapproved proposed resource lines; all seven milestones have none",()=>{
 const r=roster(),m=model();
 assert.equal(validateDraftResourceRoster(r,m),true);
 assert.equal(r.activities.length,45);
 assert.equal(r.activities.reduce((n,a)=>n+a.resources.length,0),116);
 assert.equal(r.activities.filter(x=>x.resources.length===0).length,7);
 assert.equal(r.no_approved_site_assignment,true);
 assert.equal(r.no_bill_quantities,true);
 assert.ok(r.activities.every(x=>x.assignment_status==="PROPOSED_REFERENCE_ONLY"));
});
test("selected activity lists resource NAME, QUANTITY, TYPE and UNIT without asserting a verified site assignment",()=>{
 const m=model(),r=roster();
 const footing=resourceRowsForSelected(m,r,"T5030");
 assert.equal(footing.authority,"NO_VERIFIED_ASSIGNMENTS");
 assert.equal(footing.source_rows.length,0);
 assert.ok(footing.draft_rows.some(x=>x.name==="Formwork carpenter"&&x.quantity===2&&x.unit==="person"&&x.type==="LABOR"));
 assert.ok(footing.draft_rows.some(x=>x.name==="Concrete mixer"&&x.quantity===1&&x.unit==="machine"&&x.type==="EQUIPMENT"));
 assert.ok(footing.draft_rows.every(x=>x.authority==="ILLUSTRATIVE_NOT_ASSIGNED"));
 const survey=resourceRowsForSelected(m,r,"T4030");
 assert.ok(survey.draft_rows.some(x=>x.name==="Surveyor"&&x.quantity===1&&x.unit==="person"));
 assert.ok(survey.draft_rows.some(x=>x.name==="Total station"&&x.quantity===1&&x.unit==="set"));
 const milestone=resourceRowsForSelected(m,r,"M1040");
 assert.equal(milestone.zero_duration_milestone,true);
 assert.deepEqual(milestone.draft_rows,[]);
 assert.equal(resourceRowsForSelected(m,null,"T5030").draft_rows.length,0);
});
test("source changes, contradictory approvals and altered resource counts cause the roster to fail closed",()=>{
 const m=model(),r=roster();
 const duplicate=structuredClone(r);duplicate.activities[1].activity_id=duplicate.activities[0].activity_id;
 assert.throws(()=>validateDraftResourceRoster(duplicate,m),/source\/task|roster|source/);
 const changed=structuredClone(r);changed.activities[0].resources[0].quantity=0;
 assert.throws(()=>validateDraftResourceRoster(changed,m),/crew quantity/);
 const wrong=structuredClone(r);wrong.activities[0].activity_title="Approved 100 percent";
 assert.throws(()=>validateDraftResourceRoster(wrong,m),/source\/task/);
 const bad=structuredClone(r);bad.no_approved_site_assignment=false;
 assert.throws(()=>validateDraftResourceRoster(bad,m),/source assignment/);
 const wrongMilestone=structuredClone(r);wrongMilestone.activities.find(x=>x.activity_type==="Milestone").resources.push({name:"Site engineer",quantity:1,unit:"person",type:"LABOR"});
 assert.throws(()=>validateDraftResourceRoster(wrongMilestone,m),/milestone/);
});
test("seven-field Gantt table is status-free; all-relationship toggle is operable while the Status detail tab remains",()=>{
 const ui=read("src/presentation/scheduling-desk.mjs");
 for(const v of ["Activity ID","Activity name","WBS","Original duration","Start","Finish*","Predecessors"]){
  assert.ok(ui.includes('["'+v+'","desk-col-')||ui.includes('"'+v+'"'),"Missing field "+v);
 }
 assert.doesNotMatch(ui,/\["Status","desk-col-status"\]/);
 assert.doesNotMatch(ui,/td\(row,"desk-col-status"/);
 assert.match(ui,/\["General","Status","Resources"/);
 assert.match(ui,/Show all visible links/);
 assert.match(ui,/Show all dependency relationship lines at once/);
 assert.match(ui,/allToggle\.addEventListener\("change"/);
 assert.match(ui,/arrows\.value=allToggle\.checked\?"all":"selected"/);
 assert.match(ui,/\["all","All relationship lines"\]/);
 assert.match(ui,/\["none","Hide relationship lines"\]/);
 assert.match(ui,/resourceRowsForSelected/);
 assert.match(ui,/Proposed quantity/);
 assert.match(ui,/options\.resourceRoster/);
});
test("public build includes hash-pinned resource drafts but not private Google Drive or actual payroll data",()=>{
 const build=read("scripts/build-public-site.mjs");
 const serialized=read("work-items/narayani-resource-scenarios.v1.json");
 assert.match(build,/"work-items\/narayani-resource-scenarios\.v1\.json"/);
 assert.match(build,/Narayani public resource draft changed without review/);
 assert.doesNotMatch(serialized,/drive\.google\.com|docs\.google\.com|Bearer |BEGIN PRIVATE KEY|gmail\.com/);
 assert.match(serialized,/REFERENCE_CREW_SUGGESTIONS_NOT_SOURCE_ASSIGNMENTS/);
 assert.equal(JSON.parse(serialized).source_seed_git_blob,"40f2d8e35bf1fd71c5acb84a64272115cacadb99");
});
