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
await cp("machine/index.html");
console.log("Public Pages allowlist PASS: no repository-wide upload, no private engineering files");
