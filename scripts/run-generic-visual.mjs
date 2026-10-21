import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {projectGenericVisual,jsonBytes,sha256Bytes} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {digitizeTaskSeedJSON} from "../src/kernel/generic-digitizer.mjs";
const root=resolve(new URL("..",import.meta.url).pathname);
const output=join(root,"generated/public/generic");
const fixtures=[
 {name:"community-clinic",project_id:"DEMO_CLINIC",activities:6,checklist:3,source_git_blob:"e78abdf144fba77235bb9ddb7c752a87d66f5427"},
 {name:"pedestrian-bridge",project_id:"DEMO_BRIDGE",activities:8,checklist:4,source_git_blob:"e2bc71d03b847b48c0c6746b74127f43d6308d30"},
 // Separate real user-provided SOURCE files; their own metadata explicitly says
 // synthetic building lifecycle, not an issued/actual construction schedule.
 {name:"uploaded-wbs",project_id:"UPLOADED_WBS_V1",activities:45,links:49,wbs:10,milestones:7,checklist:0,
  source_git_blob:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",
  dictionary_git_blob:"ff1e3126efe8811be9bc398054aec601efaf7482",
  kind:"USER_UPLOADED_SYNTHETIC_WBS"}
];
const gitblob=bytes=>createHash("sha1").update("blob "+Buffer.byteLength(bytes)+"\0").update(bytes).digest("hex");
const ver=process.argv[2]==="--verify",build=process.argv[2]==="--build";
if(!ver&&!build)throw Error("Use --build or --verify");
const manifest={format:"SKYFORGE_GENERIC_VISUAL_MANIFEST_V1",classification:"PUBLIC_SYNTHETIC_DRAFT_ONLY",
 engineering_release:false,baseline_approved:false,
 generic_compiler:"SKYFORGE_PROJECT_INPUT_V1",fixtures:[]};
for(const f of fixtures){
 let raw,spec,dictionaryOnly=[];
 if(f.kind==="USER_UPLOADED_SYNTHETIC_WBS"){
  // Original snapshots were already independently compared to both Drive
  // files, byte for byte. Reuse them directly, never synthesize a new WBS.
  raw=await readFile(join(root,"machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"),"utf8");
  const dict=await readFile(join(root,"machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md"),"utf8");
  if(gitblob(raw)!==f.source_git_blob||gitblob(dict)!==f.dictionary_git_blob)
   throw Error("Uploaded WBS source snapshot changed: public release blocked");
  if(raw.includes("drive.google.com")||dict.includes("drive.google.com")||
     raw.includes("docs.google.com")||dict.includes("docs.google.com")||
     raw.includes("SLACK:")||dict.includes("SLACK:"))
   throw Error("Private identifiers in source snapshot");
  const source=JSON.parse(raw);
  if(source.project_metadata?.project_name!=="Standard Building Lifecycle Template"||
     !/Synthetic/.test(source.project_metadata?.description??"")||
     source.tasks?.length!==f.activities)
   throw Error("Uploaded WBS not the reviewed synthetic seed");
  const candidate=digitizeTaskSeedJSON({text:raw,dictionary_text:dict,
   project_id:f.project_id,project_name:"Uploaded Building Lifecycle WBS — Synthetic v1.0",
   source_name:"Project Schedule Seed Data.md"});
  if(candidate.project.activities.filter(x=>x.activity_type==="FINISH_MILESTONE").length!==f.milestones||
     candidate.project.relationships.length!==f.links||
     candidate.project.wbs.length!==f.wbs||
     candidate.project.wbs.some(x=>x.name.startsWith("Unverified WBS code"))||
     candidate.project.source_manifest.length!==1||
     candidate.project.source_manifest[0].authority!=="UNVERIFIED_SOURCE"||
     candidate.source_sha256!==createHash("sha256").update(raw).digest("hex"))
   throw Error("Uploaded WBS failed source integrity/admission gates");
  // The dictionary is broader than the executable seed. Keep unmatched
  // dictionary work items visible as UNSCHEDULED, not fake CPM nodes.
  const scheduledCodes=new Set(source.tasks.map(x=>x.task_id.replace(/^[TM]/,"")));
  dictionaryOnly=[...dict.matchAll(/^\*\s+\*\*(\d{4,5})\s*:\*\*\s*(.+?)\s*$/gm)]
   .map(m=>({code:m[1],name:m[2].replace(/\*\*/g,"").trim(),
    status:"DICTIONARY_ONLY_NOT_SCHEDULED"}))
   .filter(x=>!scheduledCodes.has(x.code));
  if(dictionaryOnly.length!==2||dictionaryOnly[0].code!=="5020"||
     dictionaryOnly[1].code!=="9050")
   throw Error("Unexpected unscheduled WBS dictionary work items: review before publication");
  // Only THIS pinned, reviewed synthetic source is approved for PUBLIC
  // visualization. Activity evidence remains assumed, never approved.
  spec={...candidate.project,classification:"PUBLIC_SYNTHETIC"};
 }else{
  raw=await readFile(join(root,"machine/generic-projects",f.name+".json"),"utf8");
  if(gitblob(raw)!==f.source_git_blob)throw Error("Unreviewed synthetic project fixture: "+f.name);
  if(raw.includes("docs.google.com")||raw.includes("drive.google.com")||
     raw.includes("SLACK:")||raw.includes("C0CA3HYNP89"))
   throw Error("Private source found in public synthetic fixture");
  spec=JSON.parse(raw);
  if(spec.classification!=="PUBLIC_SYNTHETIC"||spec.project?.id!==f.project_id||
     spec.activities?.length!==f.activities||spec.checklist?.length!==f.checklist||
     spec.source_manifest?.length!==0)
   throw Error("Synthetic source classification/count authority mismatch");
 }
 const model=projectGenericVisual(spec);
 if(f.kind==="USER_UPLOADED_SYNTHETIC_WBS"){
  model.source_dictionary_only=dictionaryOnly;
  model.source_scope="USER_UPLOADED_SYNTHETIC_WBS";
  model.source_dictionary_item_count=47;
 }
 validateGenericViewModel(model);
 if(model.counts.activities!==f.activities||model.counts.checklist!==f.checklist||
 (f.links!=null&&model.counts.links!==f.links)||
 (f.wbs!=null&&model.counts.wbs!==f.wbs)||
 (f.milestones!=null&&model.activities.filter(a=>a.duration===0).length!==f.milestones)||
 model.project.id!==f.project_id||model.baseline_approved!==false||
 model.activities.some(x=>x.status!=="CALCULATED_DRAFT_NOT_ACTUAL"))
  throw Error("Generic source/result mismatch");
 const bytes=jsonBytes(model);
 const file=f.name+".json";
 if(ver){
  const existing=await readFile(join(output,file),"utf8");
  if(existing!==bytes)throw Error("Generic output differs byte-for-byte: "+file);
 }else{
  await mkdir(output,{recursive:true});await writeFile(join(output,file),bytes);
 }
 manifest.fixtures.push({name:f.name,project_id:f.project_id,input_git_blob:f.source_git_blob,
 input_sha256:model.input_sha256,model_sha256:sha256Bytes(bytes),
 ...(f.dictionary_git_blob?{dictionary_git_blob:f.dictionary_git_blob,
  source_scope:"USER_UPLOADED_SYNTHETIC_WBS"}:{}),
 activity_count:model.counts.activities,dependency_count:model.counts.links,
 checklist_count:model.counts.checklist});
}
const manifestBytes=JSON.stringify(manifest,null,2)+"\n";
if(ver){
 if(await readFile(join(output,"manifest.json"),"utf8")!==manifestBytes)
   throw Error("Generic manifest changed on readback");
}else await writeFile(join(output,"manifest.json"),manifestBytes);
console.log("GENERIC FOUR-VIEW "+(ver?"VERIFY":"BUILD")+" PASS: "+manifest.fixtures.map(x=>x.name+
 " "+x.activity_count+" activities / "+x.checklist_count+" supplied checks").join("; ")+"; deterministic SHA-256; no private records");
