import {mkdir,copyFile,readdir,readFile,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve,dirname} from "node:path";
const root=resolve(new URL("..",import.meta.url).pathname),out=join(root,"dist");
await rm(out,{recursive:true,force:true});
async function cp(relative){
 const src=join(root,relative),dst=join(out,relative);
 await mkdir(dirname(dst),{recursive:true});await copyFile(src,dst);
}
async function modules(relative){
 const p=join(root,relative);
 for(const ent of await readdir(p,{withFileTypes:true})){
  const child=join(relative,ent.name);
  if(ent.isDirectory())await modules(child);
  else if(ent.isFile()&&ent.name.endsWith(".mjs"))await cp(child);
  else throw Error("Disallowed public executable path: "+child);
 }
}
const approved=["index.html","planner.html","kernel-lab.html","roadmap.html","project-controls-demo.json",
 "construction-knowledge.json","THIRD_PARTY_NOTICES.md","assets/sky-theme.css","assets/sky-dragon.mjs",
 "knowledge/index.html","knowledge/task.html","knowledge/shuttering.html","knowledge/waterproofing.html","knowledge/soak-pit.html"];
for(const f of approved)await cp(f);
await modules("src");
const machine=["index.html","plan.json","upstreams.json","manifest.json"];
const raw=await readFile(join(root,"machine/requests/demo-foundation.json"),"utf8");
const digest=createHash("sha1").update("blob "+Buffer.byteLength(raw)+"\0").update(raw).digest("hex");
if(digest!=="65a93cdb49091df85df0af11902b89867b12a3d8")throw Error("Unreviewed public fixture; fail closed");
const input=JSON.parse(raw);
if(input.classification!=="PUBLIC_SYNTHETIC"||input.request_id!=="DEMO_FOUNDATION")throw Error("Refusing private/unapproved public machine artifact");
const manifest=JSON.parse(await readFile(join(root,"generated/public/demo-foundation/manifest.json"),"utf8"));
if(manifest.classification!=="PUBLIC_SYNTHETIC"||manifest.engineering_status!=="NOT_ENGINEERING_APPROVED"||manifest.input_sha256!==createHash("sha256").update(JSON.stringify(input,null,2)+"\n").digest("hex"))throw Error("Machine evidence input hash/visibility mismatch");
for(const f of machine){
 const src=join(root,"generated/public/demo-foundation",f);
 const dst=join(out,"machine/demo-foundation",f);
 await mkdir(dirname(dst),{recursive:true});await copyFile(src,dst);
}
// WBS source snapshots are reviewed synthetic Git blobs and remain OUTSIDE the
// Pages distribution. Only the machine-built result, checked by manifest, ships.
const wbssrc=await readFile(join(root,"machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"),"utf8");
const wbsdict=await readFile(join(root,"machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md"),"utf8");
const wbsBlob=x=>createHash("sha1").update("blob "+Buffer.byteLength(x)+"\0").update(x).digest("hex");
if(wbsBlob(wbssrc)!=="40f2d8e35bf1fd71c5acb84a64272115cacadb99"||
   wbsBlob(wbsdict)!=="ff1e3126efe8811be9bc398054aec601efaf7482")
 throw Error("Unreviewed WBS source snapshot; refusing public build");
const wbsManifest=JSON.parse(await readFile(join(root,"generated/public/wbs-sample/manifest.json"),"utf8"));
if(wbsManifest.classification!=="PUBLIC_SYNTHETIC"||wbsManifest.engineering_approved!==false||
   wbsManifest.calendar_dates_generated!==false||wbsManifest.validated_task_count!==45||
   wbsManifest.source_snapshot_git_blobs.schedule_seed!=="40f2d8e35bf1fd71c5acb84a64272115cacadb99"||
   wbsManifest.source_snapshot_git_blobs.wbs_dictionary!=="ff1e3126efe8811be9bc398054aec601efaf7482")
 throw Error("Unverified WBS source, classification, activity count or engineering status");
const wbsFiles=["index.html","plan.json","activities.csv","gantt.svg","manifest.json"];
for(const file of wbsFiles){
 const contents=await readFile(join(root,"generated/public/wbs-sample",file));
 if(file!=="manifest.json"&&wbsManifest.output_sha256[file]!==createHash("sha256").update(contents).digest("hex"))
  throw Error("WBS published output sha256 mismatch "+file);
 const dst=join(out,"machine/wbs-sample",file);
 await mkdir(dirname(dst),{recursive:true});
 await copyFile(join(root,"generated/public/wbs-sample",file),dst);
}
await cp("machine/index.html");
console.log("Public Pages allowlist PASS: no repository-wide upload, no private engineering files");
