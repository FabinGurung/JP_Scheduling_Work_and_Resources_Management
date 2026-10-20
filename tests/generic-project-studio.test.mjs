import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual,jsonBytes,sha256Bytes} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {compileProjectDraft} from "../src/kernel/project-template.mjs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const inputs=["community-clinic","pedestrian-bridge"].map(n=>JSON.parse(read("machine/generic-projects/"+n+".json")));
const known={DEMO_CLINIC:{a:6,c:3},DEMO_BRIDGE:{a:8,c:4}};
test("two independently defined projects compile to distinct identical-on-repeat canonical view models",()=>{
 const models=inputs.map(projectGenericVisual);
 assert.equal(new Set(models.map(x=>x.input_sha256)).size,2);
 for(let i=0;i<models.length;i++){
  const m=models[i],s=inputs[i],expected=known[m.project.id];
  assert.equal(validateGenericViewModel(m),true);
  assert.equal(m.activities.length,expected.a);assert.equal(m.checklist.length,expected.c);
  assert.equal(m.classification,"PUBLIC_SYNTHETIC_DRAFT_ONLY");
  assert.equal(m.engineering_release,false);assert.equal(m.baseline_approved,false);
  assert.equal(m.views_basis,"ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL");
  assert.equal(jsonBytes(m),jsonBytes(projectGenericVisual(s)));
  assert.match(sha256Bytes(jsonBytes(m)),/^[0-9a-f]{64}$/);
  assert.deepEqual(m.activities.map(a=>a.id),s.activities.map(a=>a.id));
  assert.equal(m.links.length,s.relationships.length);
  assert.equal(m.calendar_events.length,s.activities.length*2);
  for(const a of m.activities) {
   assert.equal(a.status,"CALCULATED_DRAFT_NOT_ACTUAL");
   assert.equal(a.engineering_release,false);
   assert.equal(a.duration_basis,"ASSUMED_DRAFT");
  }
  for(const row of m.checklist)assert.ok(s.checklist.some(q=>q.id===row.id&&q.title===row.title));
 }
});
test("Gantt, constellation, event calendar and checklist share activity identities and source calculations",()=>{
 for(const spec of inputs){
  const compiled=compileProjectDraft(spec),model=projectGenericVisual(spec);
  const schedule=new Map(compiled.schedule.output.activities.map(a=>[a.id,a]));
  const ids=new Set(model.activities.map(a=>a.id));
  for(const a of model.activities){
   const fromSolver=schedule.get(a.id);
   assert.equal(a.start,fromSolver.es);
   assert.equal(a.finish,fromSolver.ef);
   assert.equal(a.start_date,fromSolver.start_date);
   assert.equal(a.finish_date,fromSolver.finish_date);
  }
  assert.ok(model.links.every(x=>ids.has(x.from)&&ids.has(x.to)));
  assert.ok(model.calendar_events.every(x=>ids.has(x.activity_id)));
  assert.ok(model.checklist.every(x=>ids.has(x.activity_id)));
 }
});
test("no checklists or dates are fabricated from a bare WBS",()=>{
 const minimal=structuredClone(inputs[0]);
 minimal.checklist=[];
 const a=projectGenericVisual(minimal);
 assert.equal(a.checklist.length,0);
 assert.equal(a.counts.checklist,0);
 const raw=structuredClone(inputs[0]);raw.activities[0].duration=null;
 assert.equal(compileProjectDraft(raw).planning_status,"INCOMPLETE_NO_SCHEDULE");
 assert.throws(()=>projectGenericVisual(raw),/Incomplete project/);
});
test("reject wrong public scope, fake approval or orphan inspections at the boundary",()=>{
 const draft=structuredClone(inputs[0]);draft.classification="PRIVATE_PROJECT";
 assert.throws(()=>projectGenericVisual(draft),/public-synthetic/);
 const fabricated=structuredClone(inputs[0]);fabricated.checklist.push({id:"FAKE",activity_id:"CL01",title:"Approve",authority:"ENGINEER_APPROVED",status:"DONE"});
 assert.throws(()=>projectGenericVisual(fabricated),/Unverified checklist/);
 const m=projectGenericVisual(inputs[0]);m.engineering_release=true;
 assert.throws(()=>validateGenericViewModel(m),/not an approved public-synthetic/);
 const n=projectGenericVisual(inputs[0]);n.activities[0].status="COMPLETE";
 assert.throws(()=>validateGenericViewModel(n),/authority/);
 const broken=projectGenericVisual(inputs[0]);broken.counts.activities++;
 assert.throws(()=>validateGenericViewModel(broken),/totals disagree/);
});
test("public compiler and source pins prevent cross-project output from exposing private input fixtures",()=>{
 const build=read("scripts/build-public-site.mjs");
 const wf=read(".github/workflows/deploy-kernel-v02.yml");
 const ui=read("projects/generic/index.html");
 const renderer=read("src/presentation/generic-views.mjs");
 assert.match(build,/Generic four-view publication authority mismatch/);
 assert.match(build,/Generic model digest mismatch/);
 assert.match(build,/projects\/generic\/index.html/);
 assert.match(wf,/npm run generic:build/);
 assert.match(wf,/npm run generic:verify/);
 assert.match(wf,/test ! -e dist\/machine\/generic-projects\/community-clinic.json/);
 assert.match(renderer,/No source-supplied task checklist was provided/);
 assert.match(renderer,/document\.createElementNS/);
 assert.match(ui,/file\.size>max/);
 assert.match(ui,/ext==="pdf"\?15_000_000:ext==="xlsx"\?12_000_000:8_000_000/);
 assert.doesNotMatch(ui,/fetch\(.+api\.github\.com/);
});
