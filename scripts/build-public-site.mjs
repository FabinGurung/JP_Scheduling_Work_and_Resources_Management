import {mkdir,copyFile,readdir,readFile,writeFile,rm} from "node:fs/promises";
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
const approved=["index.html","advanced.html","planner.html","kernel-lab.html","roadmap.html","project-controls-demo.json",
 "construction-knowledge.json","THIRD_PARTY_NOTICES.md","assets/sky-theme.css","assets/sky-dragon.mjs","assets/site-shell.css","assets/site-shell.mjs","more/legacy-home.html",
 "knowledge/index.html","knowledge/task.html","knowledge/shuttering.html","knowledge/waterproofing.html","knowledge/soak-pit.html","how/index.html","how/skyforge-anki.csv"];
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
// Only bounded, public-safe, machine-verified pilot planning projection.
const pilotConfig=await readFile(join(root,"machine/project-mappings/narayani-v0.1.json"),"utf8");
if(wbsBlob(pilotConfig)!=="572380334e6c262159059728fee70f610126fb14")throw Error("Unreviewed Narayani public mapping source");
const pilotManifest=JSON.parse(await readFile(join(root,"generated/public/narayani-pilot/manifest.json"),"utf8"));
if(pilotManifest.classification!=="PUBLIC_SAFE_DERIVED_PLANNING_ONLY"||pilotManifest.approval_status!=="WBS_ADOPTION_NOT_APPROVED"||pilotManifest.mapping_config_git_blob!=="572380334e6c262159059728fee70f610126fb14"||pilotManifest.private_source_identifiers_published!==false)throw Error("Project adoption/visibility guard failed");
const pilotJson=await readFile(join(root,"generated/public/narayani-pilot/map.json"));
const proj=JSON.parse(pilotJson);
if(proj.format!=="PCK_PROJECT_WBS_ADOPTION_V1"||proj.project.project_id!=="PRJ-000007"||proj.activities.length!==45||proj.hold_points.length!==5||proj.project.schedule_baseline_approved!==false||proj.project.verified_progress!==false||proj.quality.field_reporting_available!==false)throw Error("Unsafe Narayani public projection");
if(pilotManifest.output_sha256["map.json"]!==createHash("sha256").update(pilotJson).digest("hex"))throw Error("Pilot map SHA-256 mismatch");
await cp("projects/narayani/index.html");
for(const f of ["map.json","manifest.json"]){
 const dst=join(out,"projects/narayani",f);await mkdir(dirname(dst),{recursive:true});
 await copyFile(join(root,"generated/public/narayani-pilot",f),dst);
}
// Source-pinned, sanitized, one-time Narayani progress snapshot only. No
// private Google Drive event IDs, photos, field notes or source spreadsheet are
// ever admitted to the GitHub Pages allowlist.
const progressSource=await readFile(join(root,"machine/project-mappings/narayani-progress-public-v0.1.json"),"utf8");
if(wbsBlob(progressSource)!=="84eaa91483bad21554c2c16868bcc63054ce03a3")throw Error("Unreviewed Narayani progress summary");
const progressManifest=JSON.parse(await readFile(join(root,"generated/public/narayani-progress/manifest.json"),"utf8"));
const isLive=process.env.NARAYANI_AUTHENTICATED_SYNC==="true";
if(progressManifest.format!=="PCK_NARAYANI_PROGRESS_EVIDENCE_MANIFEST_V1"||
 progressManifest.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||
 progressManifest.private_source_rows_included!==false||
 progressManifest.live_connector_active!==isLive||
 progressManifest.field_authorization!=="NO_APPROVAL"||
 (isLive&&(progressManifest.auth_method!=="GITHUB_OIDC_WIF_SERVICE_ACCOUNT_READ_ONLY"||
   progressManifest.no_private_source_identifiers_in_output!==true||
   !/^[a-f0-9]{64}$/.test(progressManifest.source_digest_sha256))))
 throw Error("Invalid progress publication contract");
const progressData=await readFile(join(root,"generated/public/narayani-progress/progress.json"));
const progress=JSON.parse(progressData);
if(progress.format!=="PCK_NARAYANI_PROGRESS_PROJECTION_V1"||
 progress.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||
 progress.project_id!=="PRJ-000007"||
 progress.completed_wbs_activities!==0||
 progress.plan_baseline_approved!==false||
 progress.auto_refresh_enabled!==isLive||
 (isLive&&(progress.refresh_mode!=="AUTHENTICATED_GITHUB_ACTIONS_DRIVE_READ_ONLY"||
  progress.evidence_inventory.progress_rows<34||
  progress.evidence_inventory.readiness_rows<4||
  progress.task_evidence.some(x=>x.approved_work_complete||x.verified_activity_complete||x.ready_for_next_work)))||
 progressManifest.output_sha256["progress.json"]!==createHash("sha256").update(progressData).digest("hex")||
 progressData.toString("utf8").includes("|PRJ-000007|PROGRESS|")||
 progressData.toString("utf8").includes("SLACK:")||progressData.toString("utf8").includes("drive.google.com"))
 throw Error("Unapproved project progress or SHA mismatch");
for(const f of ["progress.json","progress-manifest.json"]){
 const src=join(root,"generated/public/narayani-progress",f==="progress-manifest.json"?"manifest.json":f);
 const dst=join(out,"projects/narayani",f);await mkdir(dirname(dst),{recursive:true});
 await copyFile(src,dst);
}
// One public-safe JSON is the sole canonical projection for constellation,
// animated Gantt, calendar and the MCQ checklist drawer.
const visualConfig=await readFile(join(root,"machine/project-mappings/narayani-checklist-config-v0.1.json"),"utf8");
if(wbsBlob(visualConfig)!=="0e7b8e881118cf557f845aabc16d387649f12b5c")
 throw Error("Checklist config unreviewed; publication halted");
const visualManifest=JSON.parse(await readFile(join(root,"generated/public/narayani-visual/visual-manifest.json"),"utf8"));
const modelBytes=await readFile(join(root,"generated/public/narayani-visual/project-model.json"));
const visualModel=JSON.parse(modelBytes);
if(visualManifest.format!=="PCK_VISUAL_PROJECT_MANIFEST_V1"||
 visualManifest.classification!=="PUBLIC_SAFE_PLANNING_SCENARIO"||
 visualManifest.private_input_included!==false||visualManifest.site_approval!==false||
 visualManifest.outputs_sha256["project-model.json"]!==createHash("sha256").update(modelBytes).digest("hex")||
 visualModel.format!=="PCK_CONSTRUCTION_VIEW_MODEL_V1"||
 visualModel.project?.baseline_approved!==false||
 visualModel.planning_scenario?.approved_dates!==false||
 visualModel.activities?.length!==45||visualModel.links?.length!==49||
 visualModel.activities.reduce((n,a)=>n+a.checklist.length,0)!==405||
 visualModel.activities.some(a=>a.approval_state!=="NO_APPROVED_ACTIVITY_COMPLETION")||
 modelBytes.toString("utf8").includes("|PRJ-000007|PROGRESS|")||
 modelBytes.toString("utf8").includes("drive.google.com")||
 modelBytes.toString("utf8").includes("C0CA3HYNP89"))
 throw Error("Canonical visual model safety or source signature failed");
await cp("projects/narayani/visual.html");
for(const file of ["project-model.json","visual-manifest.json"]){
 const dst=join(out,"projects/narayani",file);await mkdir(dirname(dst),{recursive:true});
 await copyFile(join(root,"generated/public/narayani-visual",file),dst);
}
await cp("machine/index.html");
// One shared futuristic navigation/theme on every PUBLIC, allowlisted page.
// Machine outputs and old dashboards remain intact, available only through More.
const skinned=[];
async function styleAllowlistedPages(dir=""){
 const full=join(out,dir);
 for(const entry of await readdir(full,{withFileTypes:true})){
  const relative=join(dir,entry.name);
  if(entry.isDirectory()){await styleAllowlistedPages(relative);continue;}
  if(!entry.isFile()||!entry.name.endsWith(".html"))continue;
  const absolute=join(out,relative);
  let markup=await readFile(absolute,"utf8");
  if(/http-equiv=["']refresh/i.test(markup))continue; // No unnecessary UI on redirects.
  const depth=relative.split("/").length-1;
  const prefix=/<base\s+href=/i.test(markup)?"./":"../".repeat(depth)||"./";
  if(!markup.includes("site-shell.css")){
   const link='<link rel="stylesheet" href="'+prefix+'assets/site-shell.css" data-skyforge-shell="1">';
   if(!/<\/head>/i.test(markup))throw Error("Missing head closure: "+relative);
   markup=markup.replace(/<\/head>/i,link+"</head>");
  }
  if(!markup.includes("site-shell.mjs")){
   const js='<script type="module" src="'+prefix+'assets/site-shell.mjs"></script>';
   if(!/<\/body>/i.test(markup))throw Error("Missing body closure: "+relative);
   markup=markup.replace(/<\/body>/i,js+"</body>");
  }
  await writeFile(absolute,markup);
  skinned.push(relative);
 }
}
await styleAllowlistedPages();
const essential=["index.html","projects/narayani/visual.html","projects/narayani/index.html",
"advanced.html","planner.html","kernel-lab.html","roadmap.html","machine/index.html",
"machine/wbs-sample/index.html","knowledge/index.html","knowledge/task.html","how/index.html","more/legacy-home.html"];
if(essential.some(p=>!skinned.includes(p)))throw Error("Site shell incomplete: "+essential.filter(p=>!skinned.includes(p)));
console.log("SKYFORGE SHARED SHELL PASS:",skinned.length,"public pages unified; legacy pages preserved under More.");
console.log("Public Pages allowlist PASS: no repository-wide upload, no private engineering files");
