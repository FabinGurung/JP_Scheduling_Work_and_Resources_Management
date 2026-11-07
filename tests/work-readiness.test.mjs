import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {inspectWorkSequence,workSequenceSummary} from "../src/kernel/work-readiness.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const model=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
test("actual four-project source model is reused; predecessor/successor links are exact, not synthesized",()=>{
 const m=model();
 const edge=m.links[0];assert.ok(edge);
 const before=inspectWorkSequence(m,edge.to);
 const after=inspectWorkSequence(m,edge.from);
 assert.ok(before.before.some(x=>x.activity_id===edge.from&&x.type===edge.type&&x.lag===edge.lag));
 assert.ok(after.after.some(x=>x.activity_id===edge.to&&x.type===edge.type&&x.lag===edge.lag));
 assert.equal(before.readiness,"UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS");
 assert.equal(after.completion,"UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS");
 assert.equal(workSequenceSummary(m).start_authorizations_verified,0);
});
test("FS/SS control start while FF/SF control finish, with signed lag retained",()=>{
 const activities=["A","B","C","D","E","Z"].map(id=>({id,title:"Work "+id,status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false}));
 const m={project:{id:"TEST"},input_sha256:"a".repeat(64),baseline_approved:false,engineering_release:false,activities,
  links:[{from:"A",to:"B",type:"FS",lag:0},{from:"C",to:"B",type:"FF",lag:2},
   {from:"D",to:"B",type:"SS",lag:-1},{from:"E",to:"B",type:"SF",lag:0},
   {from:"B",to:"Z",type:"FS",lag:3}],
  checklist:[{id:"ONE",activity_id:"B",title:"Site observation reported",status:"REPORTED_DONE"}]};
 const b=inspectWorkSequence(m,"B");
 assert.equal(b.before.length,4);assert.equal(b.start_conditions.length,2);
 assert.equal(b.finish_constraints.length,2);assert.equal(b.after.length,1);
 assert.equal(b.before.find(x=>x.activity_id==="D").lag,-1);
 assert.equal(b.before.find(x=>x.activity_id==="C").predecessor_event,"FINISH");
 assert.equal(b.before.find(x=>x.activity_id==="E").successor_event,"FINISH");
 assert.equal(b.checks[0].authorization,"NOT_A_VERIFIED_APPROVAL");
 assert.equal(b.completion,"UNVERIFIED_NO_AUTHORIZED_FIELD_STATUS");
 const root=inspectWorkSequence(m,"A");
 assert.equal(root.no_predecessors,true);
 assert.notEqual(root.readiness,"READY");
});
test("fail closed for missing IDs, unsupported statuses and malformed relationships",()=>{
 const m=model();
 assert.throws(()=>inspectWorkSequence(m,"NOT_IN_SOURCE"),/Unknown activity/);
 const copy=structuredClone(m);copy.activities[0].status="APPROVED_COMPLETE";
 assert.throws(()=>inspectWorkSequence(copy,copy.activities[0].id),/unsupported authority/);
 const broken=structuredClone(m);broken.links[0].type="XY";
 assert.throws(()=>inspectWorkSequence(broken,broken.links[0].to),/relationship/);
});
test("all four project-specific readiness routes are allowlisted, linked and read-only",()=>{
 const build=read("scripts/build-public-site.mjs");
 const bootstrap=read("src/presentation/work-readiness-page.mjs");
 const view=read("src/presentation/studio-project-page.mjs");
 assert.match(bootstrap,/validateGenericViewModel\(model\)/);
 assert.match(bootstrap,/adaptNarayaniPublicModel\(source\)/);
 assert.match(bootstrap,/inspectWorkSequence\(model,id\)/);
 assert.match(bootstrap,/cache:"no-store"/);
 assert.match(bootstrap,/No approved field completion/);
 assert.doesNotMatch(bootstrap,/saveApprovedBaseline|updateFile\(|localStorage|fetch\([^)]*method.*POST/i);
 for(const [slug,id] of [["community-clinic","DEMO_CLINIC"],["pedestrian-bridge","DEMO_BRIDGE"],
  ["uploaded-wbs","UPLOADED_WBS_V1"],["narayani","PRJ-000007"]]){
  const page=read("projects/"+slug+"/readiness.html");
  const primary=read("projects/"+slug+"/"+(slug==="narayani"?"beta.html":"index.html"));
  assert.match(page,new RegExp('data-work-readiness-project="'+slug+'"'));
  assert.match(page,/work-readiness-page.mjs/);
  assert.match(page,/read-only planning inspector/);
  assert.match(primary,/href="\.\/readiness.html"/);
  assert.ok(build.includes('"projects/'+slug+'/readiness.html"'));
  assert.ok(bootstrap.includes('id:"'+id+'"'));
 }
 assert.match(view,/renderGenericProject\(model,mount\)/);
 assert.ok(build.includes('"assets/work-readiness.css"'));
 assert.match(read("assets/work-readiness.css"),/@media\(max-width:720px\)/);
});
