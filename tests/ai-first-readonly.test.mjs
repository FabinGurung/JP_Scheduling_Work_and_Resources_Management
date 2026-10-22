import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {proposeAiWbsRevision,validateAiRevisionRequest} from "../src/kernel/ai-source-revision.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
const request=(base,operations)=>({format:"SKYFORGE_AI_WBS_REVISION_V1",project_id:base.project.id,
 expected_source_sha256:base.input_sha256,user_intent_summary:"User requested a WBS revision",operations});
test("AI agent creates a source-bound draft from natural-language-intent operations, never an approved schedule",()=>{
 const original=source(),serialized=JSON.stringify(original),draft=request(original,[
  {kind:"ADD_WBS",id:"WBS_NEW",name:"External utilities"},
  {kind:"ADD_ACTIVITY",activity:{id:"NEW101",name:"Connect water supply",wbs_id:"WBS_NEW",duration:3}},
  {kind:"ADD_LINK",from:original.activities[0].id,to:"NEW101",type:"FS",lag:0}
 ]);
 const result=proposeAiWbsRevision(original,draft);
 assert.equal(result.authority,"UNVERIFIED_AI_ASSISTED_PROPOSAL");
 assert.equal(result.approval_granted,false);
 assert.equal(result.source_reconciliation_required,true);
 assert.equal(result.operations_count,3);
 assert.equal(result.result_activity_count,original.activities.length+1);
 assert.equal(result.candidate.wbs.some(x=>x.wbs_id==="WBS_NEW"),true);
 assert.equal(result.candidate.relationships.at(-1).successor,"NEW101");
 assert.equal(JSON.stringify(original),serialized);
 assert.match(result.request_sha256,/^[a-f0-9]{64}$/);
 assert.match(result.projected_model_sha256,/^[a-f0-9]{64}$/);
 assert.deepEqual(proposeAiWbsRevision(original,draft),result);
});
test("AI WBS operations validate exact existing FK, reject hierarchy cycles and unsafe deletion",()=>{
 const m=source();
 assert.throws(()=>proposeAiWbsRevision(m,request(m,[{kind:"REMOVE_WBS",id:m.wbs[0].id}])),/nonempty/);
 assert.throws(()=>proposeAiWbsRevision(m,request(m,[{kind:"MOVE_WBS",id:m.wbs[0].id,parent_wbs_id:"NO_SUCH_PARENT"}])),/parent/);
 assert.throws(()=>proposeAiWbsRevision(m,request(m,[{kind:"ADD_ACTIVITY",activity:{id:"BAD_ZERO",name:"Unknown duration",wbs_id:m.wbs[0].id,duration:null}}])),/duration/);
 assert.throws(()=>proposeAiWbsRevision(m,request(m,[{kind:"ADD_LINK",from:m.activities[0].id,to:m.activities[1].id,type:"SOMETHING",lag:0}])),/relationship/);
});
test("AI cannot rewrite wrong project/source, create an empty task, guess lag or bypass admission",()=>{
 const m=source();
 const wrong=request(m,[{kind:"RENAME_WBS",id:m.wbs[0].id,name:"Renamed"}]);
 wrong.expected_source_sha256="0".repeat(64);
 assert.throws(()=>validateAiRevisionRequest(wrong,m),/source SHA/);
 wrong.expected_source_sha256=m.input_sha256;wrong.project_id="OTHER";
 assert.throws(()=>validateAiRevisionRequest(wrong,m),/source SHA/);
 const empty=request(m,[{kind:"ADD_ACTIVITY",activity:{id:"TASK_NEW",name:"",wbs_id:m.wbs[0].id,duration:0}}]);
 assert.throws(()=>proposeAiWbsRevision(m,empty),/duration|ID/);
 const lag=request(m,[{kind:"ADD_LINK",from:m.activities[0].id,to:m.activities[1].id,type:"FS"}]);
 assert.throws(()=>validateAiRevisionRequest(lag,m),/lag/);
});
test("every public project consumes only the read-only renderer, no beta editor code or browser file forms",()=>{
 const bootstrap=read("src/presentation/studio-project-page.mjs");
 const generic=read("projects/generic/index.html"),viewer=read("src/presentation/generic-views.mjs");
 const builder=read("scripts/build-public-site.mjs");
 assert.match(bootstrap,/renderGenericProject\(model,mount\)/);
 assert.doesNotMatch(bootstrap,/mountBetaWorkspace|project-beta-workspace/);
 assert.match(generic,/renderGenericProject\(model,mount\)/);
 assert.doesNotMatch(generic,/type="file"|<textarea|mountBetaWorkspace|digitizeGenericTable|digitizeXer|digitizePdfTable|save-draft|confirm-pdf/i);
 assert.doesNotMatch(viewer,/onNodeMoved|pointerdown|setPointerCapture|draggable\(/);
 for(const s of ["src/presentation/project-beta-workspace.mjs","src/presentation/beta-draft.mjs","src/kernel/ai-source-revision.mjs"])
  assert.ok(builder.includes('"'+s+'"'));
 for(const s of ["gv-inspector-bubble","gv-dependency-hit","gv-branch-hit","pointerenter","keydown","role","showBubble"])
  assert.ok(viewer.includes(s),"Missing read-only node/edge inspection "+s);
 const page=read("projects/narayani/beta.html");
 assert.match(page,/read-only/i);
 assert.doesNotMatch(page,/This beta provides local editing/);
});
