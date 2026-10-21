import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {digitizeTaskSeedJSON} from "../src/kernel/generic-digitizer.mjs";
import {projectGenericVisual,jsonBytes,sha256Bytes} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {layoutOrganicSkillTree} from "../src/presentation/generic-organic-layout.mjs";
const load=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const seedText=load("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"),
 dictionary=load("machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md");
const original=JSON.parse(seedText);
const blob=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex");
function compileUploaded(){
 const d=digitizeTaskSeedJSON({text:seedText,dictionary_text:dictionary,
  project_id:"UPLOADED_WBS_V1",project_name:"Uploaded Building Lifecycle WBS — Synthetic v1.0",
  source_name:"Project Schedule Seed Data.md"});
 const spec={...d.project,classification:"PUBLIC_SYNTHETIC"};
 return {candidate:d,model:projectGenericVisual(spec)};
}
test("exact two uploaded Drive source snapshots remain immutably pinned by their Git blobs",()=>{
 assert.equal(blob(seedText),"40f2d8e35bf1fd71c5acb84a64272115cacadb99");
 assert.equal(blob(dictionary),"ff1e3126efe8811be9bc398054aec601efaf7482");
 assert.equal(original.project_metadata.project_name,"Standard Building Lifecycle Template");
 assert.match(original.project_metadata.description,/Synthetic/);
 const src=load("scripts/run-generic-visual.mjs"),builder=load("scripts/build-public-site.mjs");
 assert.match(src,/gitblob\(dict\)!==f\.dictionary_git_blob/);
 assert.match(src,/project_id:"UPLOADED_WBS_V1"/);
 assert.match(builder,/fixture\.dictionary_git_blob!==allow\.dict/);
});
test("the published uploaded project uses all 45 original activity IDs, 49 typed links, 10 original phases and seven milestone types",()=>{
 const {candidate,model}=compileUploaded();
 assert.equal(candidate.project.activities.length,45);
 assert.equal(candidate.project.relationships.length,49);
 assert.equal(candidate.project.wbs.length,10);
 assert.equal(candidate.project.activities.filter(a=>a.activity_type==="FINISH_MILESTONE").length,7);
 assert.equal(model.activities.length,45);
 assert.equal(model.links.length,49);
 assert.equal(model.wbs.length,10);
 assert.equal(model.checklist.length,0);
 assert.equal(model.calendar_events.length,0);
 assert.equal(validateGenericViewModel(model),true);
 assert.deepEqual(model.activities.map(a=>a.id),original.tasks.map(x=>x.task_id));
 assert.deepEqual(model.activities.map(a=>a.duration),original.tasks.map(x=>x.duration_days));
 for(const source of original.tasks){
  const actual=model.activities.find(a=>a.id===source.task_id);
  assert.ok(actual);
  assert.equal(actual.wbs_id,"WBS_"+source.wbs_code);
  assert.equal(actual.duration_basis,"ASSUMED_DRAFT");
  assert.equal(actual.status,"CALCULATED_DRAFT_NOT_ACTUAL");
  assert.equal(actual.engineering_release,false);
 }
 assert.equal(model.engineering_release,false);
 assert.equal(model.baseline_approved,false);
 assert.equal(model.classification,"PUBLIC_SYNTHETIC_DRAFT_ONLY");
 assert.match(model.planning_status,/ASSUMPTIONS/);
 assert.deepEqual(model,compileUploaded().model);
 assert.match(sha256Bytes(jsonBytes(model)),/^[a-f0-9]{64}$/);
});
test("47 dictionary items are distinct from the 45 schedulable tasks; unscheduled 5020 and 9050 remain a visible gap",()=>{
 const scheduled=new Set(original.tasks.map(x=>x.task_id.replace(/^[TM]/,"")));
 const dictItems=[...dictionary.matchAll(/^\*\s+\*\*(\d{4,5})\s*:\*\*\s*(.+?)\s*$/gm)]
  .map(x=>({code:x[1],title:x[2].replace(/\*\*/g,"")}));
 assert.equal(dictItems.length,47);
 const missing=dictItems.filter(x=>!scheduled.has(x.code));
 assert.deepEqual(missing.map(x=>x.code),["5020","9050"]);
 assert.ok(missing[0].title.includes("Shoring"));
 assert.ok(missing[1].title.includes("Millwork"));
 for(const m of missing)assert.ok(!original.tasks.some(a=>a.task_id.endsWith(m.code)),"Unscheduled work inserted into task source");
 const builder=load("scripts/build-public-site.mjs");
 assert.match(builder,/model\.source_dictionary_only\?\.length!==2/);
 assert.match(builder,/model\.source_dictionary_only\[0\]\.code!=="5020"/);
 assert.match(builder,/model\.source_dictionary_only\[1\]\.code!=="9050"/);
 const html=load("projects/uploaded-wbs/index.html");
 assert.match(html,/id="source-differences"/);
 assert.match(load("src/presentation/studio-project-page.mjs"),/DICTIONARY_ONLY_NOT_SCHEDULED/);
});
test("WBS constellation is project-agnostic, non-temporal and handles all 45 leaves",()=>{
 const {model}=compileUploaded();
 const tree=layoutOrganicSkillTree(model);
 assert.equal(tree.geometry_basis,"WBS_MEMBERSHIP_NOT_TIME");
 assert.equal(tree.activity_count,45);
 assert.equal(tree.wbs_count,10);
 assert.equal(tree.dependencies.length,49);
 assert.equal(tree.branches.length,55);
 assert.equal(Object.keys(tree.taskPositions).length,45);
 assert.ok(tree.nodes.every(n=>n.y<tree.root.y));
});
test("Pages publishes only SHA-validated derived WBS model and project shell, not original files",()=>{
 const builder=load("scripts/build-public-site.mjs"),generator=load("scripts/run-generic-visual.mjs");
 const page=load("projects/uploaded-wbs/index.html"),bootstrap=load("src/presentation/studio-project-page.mjs");
 assert.ok(builder.includes('"projects/uploaded-wbs/index.html"'));
 assert.match(builder,/genericManifest\.fixtures\?\.length!==3/);
 assert.match(builder,/model\.source_dictionary_item_count!==47/);
 assert.match(generator,/USER_UPLOADED_SYNTHETIC_WBS/);
 assert.match(page,/data-studio-project="uploaded-wbs"/);
 assert.match(page,/src\/presentation\/studio-project-page\.mjs/);
 assert.match(bootstrap,/"uploaded-wbs":\{filename:"uploaded-wbs\.json",projectId:"UPLOADED_WBS_V1"\}/);
 assert.doesNotMatch(page,/drive\.google\.com|docs\.google\.com|SLACK::/);
});
