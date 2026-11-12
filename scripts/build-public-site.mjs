import {mkdir,copyFile,readdir,readFile,writeFile,rm} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve,dirname} from "node:path";
const root=resolve(new URL("..",import.meta.url).pathname),out=join(root,"dist");
await rm(out,{recursive:true,force:true});
async function cp(relative){
 const src=join(root,relative),dst=join(out,relative);
 await mkdir(dirname(dst),{recursive:true});await copyFile(src,dst);
}
// Browser distribution excludes obsolete editors and AI authoring logic.
// Those modules may be used by the trusted AI/developer workflow but must not
// become a downloadable user-facing code path on public GitHub Pages.
const privateSourceModules=new Set([
 "src/presentation/project-beta-workspace.mjs",
 "src/presentation/beta-draft.mjs",
 "src/kernel/ai-source-revision.mjs",
 "src/kernel/ai-revision-diff.mjs",
 "src/kernel/ai-revision-report.mjs",
 "src/kernel/field-readiness-gates.mjs",
 "src/kernel/field-evidence-attestation.mjs",
 "src/kernel/field-attested-readiness.mjs",
 "src/kernel/drive-evidence-readback.mjs",
 "src/kernel/drive-field-evidence-reconcile.mjs"
]);
async function modules(relative){
 const p=join(root,relative);
 for(const ent of await readdir(p,{withFileTypes:true})){
  const child=join(relative,ent.name);
  if(privateSourceModules.has(child))continue;
  if(ent.isDirectory())await modules(child);
  else if(ent.isFile()&&ent.name.endsWith(".mjs"))await cp(child);
  else throw Error("Disallowed public executable path: "+child);
 }
}
// Canonical company-first public catalog; old /portfolio URLs stay redirect-only.
const portfolioSlugs=Object.freeze([
 "15-narayani-parajuli","17-samirman-gubhaju","14-kharika-poudel",
 "13-hari-baral","16-yamuna-pun-adai","30-dipti-sabitri-giri",
 "31-sharada-adhikari","14-bishal-paiza","14-basanta-boral-poudel",
 "14-ashok-adhikari","jawalakhel-pilates-interior"
]);
const portfolioPages=portfolioSlugs.map(slug=>"projects/portfolio/"+slug+"/index.html");
const companyKeys=["jp","fishtail","rohini","paila"];
const companyPages=companyKeys.map(key=>"projects/"+key+"/index.html");
const expectedRoutes=[
 "fishtail/narayani-parajuli-residence",
 "fishtail/17-samir-man-gubhaju",
 "fishtail/14-kharika-paudel",
 "fishtail/13-hari-baral",
 "fishtail/yamuna-pun-residence",
 "fishtail/sabitri-giri-residence",
 "fishtail/sharada-adhikari-residence",
 "rohini/bishal-paija-residence",
 "rohini/14-basanti-poudel-baral",
 "rohini/ashok-adhikari",
 "paila/jawalakhel-interior-design",
 "fishtail/subin-supplier-residence",
 "fishtail/hari-thapa-residence",
 "fishtail/harisharan-residence",
 "fishtail/aviskar-hospital",
 "fishtail/vyas-retreat-hotel-waterproofing",
 "rohini/14-amrit-rawat",
 "rohini/14-ramachandra-devkota-one-storey",
 "rohini/14-amrit-hardware",
 "rohini/kumari-gurung-residence",
 "rohini/harka-bahadur-sherchan-renovation",
 "jp/astam-village-naren-gurung"
];
const projectPages=expectedRoutes.map(route=>"projects/"+route+"/index.html");
const projectCatalogText=await readFile(join(root,"projects/registry.json"),"utf8");
const sourceBlob=createHash("sha1").update("blob "+Buffer.byteLength(projectCatalogText)+"\0").update(projectCatalogText).digest("hex");
if(sourceBlob!=="90e23cfd3611d442b47e1504fb613df1caa44740")
 throw Error("Drive-first project catalog changed without reviewed source acceptance");
const projectCatalog=JSON.parse(projectCatalogText);
const retired=JSON.parse(await readFile(join(root,"projects/portfolio/registry.json"),"utf8"));
if(retired.format!=="SKYFORGE_DEPRECATED_REGISTRY_POINTER_V1"||
 retired.canonical!=="../registry.json"||
 projectCatalog.format!=="SKYFORGE_PROJECT_CATALOG_V2"||
 projectCatalog.root!=="PROJECTS_DIRECT_ENTERPRISE_GROUPING"||
 projectCatalog.publishing!=="PUBLIC_PROJECT_NAMES_ONLY_NO_DRIVE_IDS_OR_PRIVATE_DATA"||
 projectCatalog.enterprises?.length!==4||projectCatalog.projects?.length!==22||
 projectCatalog.enterprises.map(x=>x.key).join(",")!==companyKeys.join(",")||
 projectCatalog.projects.map(p=>p.company+"/"+p.slug).join(",")!==expectedRoutes.join(",")||
 projectCatalog.projects.some((p,i)=>
  p.id!=="PORT-"+String(i+1).padStart(6,"0")||
  p.approval_status!=="NO_REAL_WORK_APPROVAL"||
  (i===0?(p.schedule_status!=="NARAYANI_PUBLIC_SAFE_DRAFT"||
   p.source_project_id!=="PRJ-000007"):
   p.schedule_status!=="EMPTY_NO_VERIFIED_PROJECT_WBS")||
  !companyKeys.includes(p.company)||
  (p.source_authority==="DRIVE_PROJECT_FOLDER_NAME"&&!p.source_folder_title))||
 ["drive.google.com","docs.google.com","https://","http://","@","SLACK::","GOOGLE_OAUTH_ACCESS_TOKEN"].some(x=>projectCatalogText.includes(x)))
 throw Error("Public project source identity, authority or privacy mismatch");

// Source-pinned, public-only construction work-rate reference. No site release.
const productivityText=await readFile(join(root,"work-items/productivity-norms.v1.json"),"utf8");
const productivityBlob=createHash("sha1").update("blob "+Buffer.byteLength(productivityText)+"\0").update(productivityText).digest("hex");
if(productivityBlob!=="4773c1c3fa8728ebae532ebf0381bbfd0ad6d751")
 throw Error("Source-backed productivity rates changed without explicit review");
const productivity=JSON.parse(productivityText);
if(productivity.format!=="SKYFORGE_PRODUCTIVITY_REFERENCE_V1"||
 productivity.authority!=="READ_ONLY_REFERENCE_BENCHMARKS_NO_PROJECT_RELEASE"||
 productivity.live_site_authority!==false||
 productivity.items?.length!==88||productivity.rates?.length!==11||
 productivity.sources?.length!==4||
 productivity.items.some(x=>x.no_approval!==true||x.no_actual_duration!==true)||
 ["docs.google.com","drive.google.com","SLACK::","GOOGLE_OAUTH_ACCESS_TOKEN","BEGIN PRIVATE KEY"].some(x=>productivityText.includes(x)))
 throw Error("Invalid or unsafe public work productivity reference");

// Published public starter coefficients: never auto-admit to a project WBS or actuals.
// Source digest rotation requires peer review of every norm-vs-analog assumption.
const starterText=await readFile(join(root,"work-items/productivity-starters.v2.json"),"utf8");
const starterBlob=createHash("sha1").update("blob "+Buffer.byteLength(starterText)+"\0").update(starterText).digest("hex");
if(starterBlob!=="7622251da134559d99938748d983ed99abf877be")
 throw Error("Provisional productivity starter sources changed without reviewed pin");
const starter=JSON.parse(starterText);
if(starter.format!=="SKYFORGE_PRODUCTIVITY_STARTERS_V2"||
 starter.authority!=="REFERENCE_SCENARIOS_NOT_CONSTRUCTION_BASELINE"||
 starter.excludes_site_authority!==true||
 starter.items?.length!==88||starter.profiles?.length!==46||
 starter.coverage?.with_planning_start!==82||starter.coverage?.non_activity!==6||
 starter.items.some((x,i)=>x.key!==productivity.items[i].key)||
 starter.profiles.some(x=>!["OFFICIAL_DIRECT","OFFICIAL_ANALOG","CALIBRATION_SEED"].includes(x.kind))||
 ["docs.google.com","drive.google.com","SLACK::","GOOGLE_OAUTH_ACCESS_TOKEN","BEGIN PRIVATE KEY"].some(x=>starterText.includes(x)))
 throw Error("Unreviewed source profile, fabricated authority or private starter record");

// Public-safe provisional resource quantities: expressly NOT verified site assignments.
const resourceDraftText=await readFile(join(root,"work-items/narayani-resource-scenarios.v1.json"),"utf8");
const resourceDraftBlob=createHash("sha1").update("blob "+Buffer.byteLength(resourceDraftText)+"\0").update(resourceDraftText).digest("hex");
if(resourceDraftBlob!=="e70d1ac324a7d7c139ff125f3d55ed8e3aff3f06")
 throw Error("Narayani public resource draft changed without review");
const resourceDraft=JSON.parse(resourceDraftText);
if(resourceDraft.format!=="SKYFORGE_UNAPPROVED_RESOURCE_SCENARIOS_V1"||
 resourceDraft.classification!=="REFERENCE_CREW_SUGGESTIONS_NOT_SOURCE_ASSIGNMENTS"||
 resourceDraft.no_approved_site_assignment!==true||
 resourceDraft.no_bill_quantities!==true||
 resourceDraft.activities?.length!==45||
 resourceDraft.activities.reduce((n,a)=>n+a.resources.length,0)!==116||
 resourceDraft.activities.filter(a=>a.activity_type==="Milestone").length!==7||
 resourceDraft.activities.some(a=>a.assignment_status!=="PROPOSED_REFERENCE_ONLY")||
 ["docs.google.com","drive.google.com","SLACK::","GOOGLE_OAUTH_ACCESS_TOKEN","BEGIN PRIVATE KEY"].some(x=>resourceDraftText.includes(x)))
 throw Error("Unapproved or private Narayani resource record cannot publish");

// Reviewed reference materials only: NOT actual project procurement or approved BOQ.
const materialText=await readFile(join(root,"work-items/material-references.v1.json"),"utf8");
const materialBlob=createHash("sha1").update("blob "+Buffer.byteLength(materialText)+"\0").update(materialText).digest("hex");
if(materialBlob!=="3da5f0cc1427db3b46631478c091bfad96efed39")
 throw Error("Reviewed material reference changed without source evidence / pin rotation");
const material=JSON.parse(materialText);
if(material.format!=="SKYFORGE_WORK_MATERIAL_REFERENCE_V1"||
 material.authority!=="READ_ONLY_REFERENCE_NOT_PROJECT_BOQ"||
 material.no_actual_or_approved_project_quantities!==true||
 material.materials?.length!==27||material.recipes?.length!==33||
 material.work_items?.length!==88||material.project_activities?.length!==45||
 material.project_activities.some(a=>a.materials_release!==false||a.actual_quantities!==null)||
 material.work_items.some(a=>a.measured_quantity!==null||a.no_approved_material_takeoff!==true)||
 ["docs.google.com","drive.google.com","SLACK::","GOOGLE_OAUTH_ACCESS_TOKEN","BEGIN PRIVATE KEY"].some(x=>materialText.includes(x)))
 throw Error("Unverified, private or site-approved material quantity cannot publish");
const masterSeed=JSON.parse(await readFile(join(root,"machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"),"utf8"));
if(masterSeed.tasks?.length!==45||
 material.project_activities.some((a,i)=>a.activity_id!==masterSeed.tasks[i].task_id||
 a.activity_title!==masterSeed.tasks[i].name))
 throw Error("Public material reference does not match immutable 45-task WBS source");

const approved=["index.html","advanced.html","planner.html","kernel-lab.html","roadmap.html","project-controls-demo.json",
 "construction-knowledge.json","THIRD_PARTY_NOTICES.md","assets/sky-theme.css","assets/sky-dragon.mjs","assets/site-shell.css","assets/site-shell.mjs","assets/skyforge-unified.css","assets/studio-project.css","assets/work-readiness.css","assets/portfolio.css","assets/project-catalog.css","assets/scheduling-desk.css","assets/productivity-norms.css","assets/productivity-starters.css","assets/material-planner.css","more/legacy-home.html","more/index.html",
 "knowledge/index.html","knowledge/task.html","work-items/index.html","work-items/productivity.html","work-items/materials.html","work-items/productivity-norms.v1.json","work-items/productivity-starters.v2.json","work-items/material-references.v1.json","work-items/narayani-resource-scenarios.v1.json","projects/generic/index.html","studio/index.html","projects/index.html","projects/registry.json",...companyPages,...projectPages,"projects/portfolio/index.html","projects/portfolio/registry.json",...portfolioPages,"projects/community-clinic/index.html","projects/community-clinic/readiness.html","projects/pedestrian-bridge/index.html","projects/pedestrian-bridge/readiness.html","projects/uploaded-wbs/index.html","projects/uploaded-wbs/readiness.html","projects/narayani/beta.html","projects/narayani/desk.html","projects/generic/desk-clinic.html","projects/generic/desk-bridge.html","projects/generic/desk-uploaded-wbs.html","projects/narayani/readiness.html","studio/projects/narayani/index.html","studio/projects/community-clinic/index.html","studio/projects/pedestrian-bridge/index.html","knowledge/shuttering.html","knowledge/waterproofing.html","knowledge/soak-pit.html","how/index.html","how/skyforge-anki.csv"];
for(const f of approved)await cp(f);
await modules("src");
// Separate, reviewed, PUBLIC work-item catalog only. No private project source files.
// A source change requires explicit Git-blob pin review before it can be published.
const catalogText=await readFile(join(root,"machine/work-items/work-item-library-v0.1.json"),"utf8");
const catalogBlob=createHash("sha1").update("blob "+Buffer.byteLength(catalogText)+"\0").update(catalogText).digest("hex");
if(catalogBlob!=="ea105e6b404d3a8b136e5e89a55a172485f4156e")throw Error("Unreviewed work-item catalog source");
const catalog=JSON.parse(catalogText);
if(catalog.format!=="SKYFORGE_WORK_ITEM_LIBRARY_V1"||
 catalog.classification!=="PUBLIC_REFERENCE_NO_PRIVATE_PROJECT_RECORDS"||
 catalog.items?.length!==14||catalog.items.some(x=>x.authority!=="NOT_SITE_APPROVED")||
 catalogText.includes("docs.google.com")||catalogText.includes("drive.google.com")||
 catalogText.includes("SLACK::"))throw Error("Unsafe work-item source");
await mkdir(join(out,"work-items"),{recursive:true});
await writeFile(join(out,"work-items/library.json"),catalogText);

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
// Generic, variable-count workspaces are published from only two reviewed
// PUBLIC_SYNTHETIC fixtures. Their full raw schedule inputs remain private to
// source control and are never copied to GitHub Pages.
const genericManifestText=await readFile(join(root,"generated/public/generic/manifest.json"),"utf8");
const genericManifest=JSON.parse(genericManifestText);
if(genericManifest.format!=="SKYFORGE_GENERIC_VISUAL_MANIFEST_V1"||
 genericManifest.classification!=="PUBLIC_SYNTHETIC_DRAFT_ONLY"||
 genericManifest.engineering_release!==false||genericManifest.baseline_approved!==false||
 genericManifest.fixtures?.length!==3)throw Error("Generic four-view publication authority mismatch");
const approvedGeneric={"community-clinic":{id:"DEMO_CLINIC",activities:6,checklist:3},
 "pedestrian-bridge":{id:"DEMO_BRIDGE",activities:8,checklist:4},
 "uploaded-wbs":{id:"UPLOADED_WBS_V1",activities:45,checklist:0,links:49,wbs:10,scope:"USER_UPLOADED_SYNTHETIC_WBS",
  source:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",
  dict:"ff1e3126efe8811be9bc398054aec601efaf7482"}};
await mkdir(join(out,"projects/generic"),{recursive:true});
for(const fixture of genericManifest.fixtures){
 const allow=approvedGeneric[fixture.name];
 if(!allow||fixture.project_id!==allow.id||fixture.activity_count!==allow.activities||
 fixture.checklist_count!==allow.checklist||
 (allow.links!=null&&fixture.dependency_count!==allow.links)||
 (allow.scope!=null&&(fixture.source_scope!==allow.scope||
 fixture.input_git_blob!==allow.source||
 fixture.dictionary_git_blob!==allow.dict)))
  throw Error("Generic fixture not allowlisted");
 const modelBytes=await readFile(join(root,"generated/public/generic",fixture.name+".json"));
 if(createHash("sha256").update(modelBytes).digest("hex")!==fixture.model_sha256)
  throw Error("Generic model digest mismatch "+fixture.name);
 const model=JSON.parse(modelBytes);
 if(model.format!=="SKYFORGE_GENERIC_VIEW_MODEL_V1"||
 model.classification!=="PUBLIC_SYNTHETIC_DRAFT_ONLY"||
 model.project?.id!==allow.id||model.input_sha256!==fixture.input_sha256||
 model.engineering_release!==false||model.baseline_approved!==false||
 model.activities?.length!==allow.activities||model.checklist?.length!==allow.checklist||
 (allow.links!=null&&model.links?.length!==allow.links)||
 (allow.wbs!=null&&model.wbs?.length!==allow.wbs)||
 (allow.scope!=null&&(model.source_scope!==allow.scope||
 model.source_dictionary_item_count!==47||
 model.source_dictionary_only?.length!==2||
 model.source_dictionary_only[0].code!=="5020"||
 model.source_dictionary_only[1].code!=="9050"||
 model.calendar_events?.length!==0||
 model.activities.some(a=>a.duration_basis!=="ASSUMED_DRAFT")||
 model.activities.filter(a=>a.duration===0).length!==7))||
 model.activities.some(x=>x.status!=="CALCULATED_DRAFT_NOT_ACTUAL")||
 modelBytes.toString("utf8").includes("drive.google.com")||
 modelBytes.toString("utf8").includes("docs.google.com")||
 modelBytes.toString("utf8").includes("SLACK:"))
  throw Error("Generic model unsafe for Pages");
 await writeFile(join(out,"projects/generic",fixture.name+".json"),modelBytes);
}
await writeFile(join(out,"projects/generic/manifest.json"),genericManifestText);
await cp("machine/index.html");
// One shared futuristic navigation/theme on every PUBLIC, allowlisted page.
// Machine outputs and old dashboards remain intact, available only through More.
const skinned=[],redirectOnly=[];
async function styleAllowlistedPages(dir=""){
 const full=join(out,dir);
 for(const entry of await readdir(full,{withFileTypes:true})){
  const relative=join(dir,entry.name);
  if(entry.isDirectory()){await styleAllowlistedPages(relative);continue;}
  if(!entry.isFile()||!entry.name.endsWith(".html"))continue;
  const absolute=join(out,relative);
  let markup=await readFile(absolute,"utf8");
  if(/http-equiv=["']refresh/i.test(markup))redirectOnly.push(relative);
  if(/http-equiv=["']refresh/i.test(markup))continue; // No unnecessary UI on redirects.
  const depth=relative.split("/").length-1;
  const prefix=/<base\s+href=/i.test(markup)?"./":"../".repeat(depth)||"./";
  if(!markup.includes("site-shell.css")){
   const link='<link rel="stylesheet" href="'+prefix+'assets/site-shell.css" data-skyforge-shell="1">';
   if(!/<\/head>/i.test(markup))throw Error("Missing head closure: "+relative);
   markup=markup.replace(/<\/head>/i,link+"</head>");
  }
  // Enforce last-position canonical CSS after every page's legacy inline/external styles.
  // Non-redirect pages only; dynamic project data and engineering JSON are untouched.
  if(!markup.includes("skyforge-unified.css")){
   const unified='<link rel="stylesheet" href="'+prefix+'assets/skyforge-unified.css" data-skyforge-unified="1">';
   if(!/<\/head>/i.test(markup))throw Error("Missing head closure for canonical skin: "+relative);
   markup=markup.replace(/<\/head>/i,unified+"</head>");
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
// Strict build-time readback: every live HTML must load the same canonical CSS
// after all legacy inline styles. Redirect-only archival stubs are excluded.
for(const relative of skinned){
 const page=await readFile(join(out,relative),"utf8");
 const linkIndex=page.indexOf("assets/skyforge-unified.css");
 const matches=page.match(/assets\/skyforge-unified\.css/g)??[];
 if(linkIndex<0||matches.length!==1||
    page.lastIndexOf("</style>")>linkIndex||
    page.lastIndexOf("assets/site-shell.css")>linkIndex||
    linkIndex>page.indexOf("</head>"))
  throw Error("Unnormalized public page: "+relative);
}
const essential=["index.html","projects/narayani/visual.html","projects/narayani/index.html",
"advanced.html","planner.html","kernel-lab.html","roadmap.html","machine/index.html",
"machine/wbs-sample/index.html","knowledge/index.html","knowledge/task.html","how/index.html","work-items/index.html","work-items/productivity.html","work-items/materials.html","projects/generic/index.html","studio/index.html","projects/index.html",...companyPages,...projectPages,"more/index.html","projects/community-clinic/index.html","projects/community-clinic/readiness.html","projects/pedestrian-bridge/index.html","projects/pedestrian-bridge/readiness.html","projects/uploaded-wbs/index.html","projects/uploaded-wbs/readiness.html","projects/narayani/beta.html","projects/narayani/desk.html","projects/generic/desk-clinic.html","projects/generic/desk-bridge.html","projects/generic/desk-uploaded-wbs.html","projects/narayani/readiness.html","studio/projects/narayani/index.html","studio/projects/community-clinic/index.html","studio/projects/pedestrian-bridge/index.html","more/legacy-home.html"];
if(essential.some(p=>!skinned.includes(p)))throw Error("Site shell incomplete: "+essential.filter(p=>!skinned.includes(p)));
if(skinned.length!==62||redirectOnly.length!==15)
 throw Error("Unexpected Pages HTML inventory: "+skinned.length+" unified; "+redirectOnly.length+" redirects");
console.log("SKYFORGE HTML INVENTORY PASS:",skinned.length+redirectOnly.length,"HTML outputs =",skinned.length,"unified +",redirectOnly.length,"redirect-only stubs");
console.log("SKYFORGE SHARED SHELL PASS:",skinned.length,"public pages unified; legacy pages preserved under More.");
console.log("Public Pages allowlist PASS: no repository-wide upload, no private engineering files");
