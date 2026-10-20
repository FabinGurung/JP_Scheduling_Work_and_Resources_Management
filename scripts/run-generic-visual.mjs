import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {projectGenericVisual,jsonBytes,sha256Bytes} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
const root=resolve(new URL("..",import.meta.url).pathname);
const output=join(root,"generated/public/generic");
const fixtures=[
 {name:"community-clinic",project_id:"DEMO_CLINIC",activities:6,checklist:3,source_git_blob:"e78abdf144fba77235bb9ddb7c752a87d66f5427"},
 {name:"pedestrian-bridge",project_id:"DEMO_BRIDGE",activities:8,checklist:4,source_git_blob:"e2bc71d03b847b48c0c6746b74127f43d6308d30"}
];
const gitblob=bytes=>createHash("sha1").update("blob "+Buffer.byteLength(bytes)+"\0").update(bytes).digest("hex");
const ver=process.argv[2]==="--verify",build=process.argv[2]==="--build";
if(!ver&&!build)throw Error("Use --build or --verify");
const manifest={format:"SKYFORGE_GENERIC_VISUAL_MANIFEST_V1",classification:"PUBLIC_SYNTHETIC_DRAFT_ONLY",
 engineering_release:false,baseline_approved:false,
 generic_compiler:"SKYFORGE_PROJECT_INPUT_V1",fixtures:[]};
for(const f of fixtures){
 const raw=await readFile(join(root,"machine/generic-projects",f.name+".json"),"utf8");
 if(gitblob(raw)!==f.source_git_blob)throw Error("Unreviewed synthetic project fixture: "+f.name);
 if(raw.includes("docs.google.com")||raw.includes("drive.google.com")||
    raw.includes("SLACK:")||raw.includes("C0CA3HYNP89"))
    throw Error("Private source found in public synthetic fixture");
 const spec=JSON.parse(raw);
 if(spec.classification!=="PUBLIC_SYNTHETIC"||spec.project?.id!==f.project_id||
    spec.activities?.length!==f.activities||spec.checklist?.length!==f.checklist||
    spec.source_manifest?.length!==0)throw Error("Synthetic source classification/count authority mismatch");
 const model=projectGenericVisual(spec);
 validateGenericViewModel(model);
 if(model.counts.activities!==f.activities||model.counts.checklist!==f.checklist||
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
