import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validateProjectCatalog} from "../src/presentation/project-catalog.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const catalog=()=>JSON.parse(read("projects/registry.json"));
test("canonical Projects directory has four enterprise groups and 22 independently numbered project identities",()=>{
 const c=catalog();
 assert.equal(validateProjectCatalog(c),true);
 assert.deepEqual(c.enterprises.map(e=>e.title),
  ["JP Enterprise","Fishtail Builders","Rohini Engineering and Builders","Paila Pilates"]);
 assert.deepEqual(c.enterprises.map(e=>c.projects.filter(p=>p.company===e.key).length),
  [1,12,8,1]);
 assert.equal(c.projects.length,22);
 assert.deepEqual(c.projects.map(p=>p.id),
  c.projects.map((_,i)=>"PORT-"+String(i+1).padStart(6,"0")));
 assert.equal(c.enterprises[3].drive_folder_title,"08 Paila Pilates");
 assert.equal(c.projects[0].source_folder_title,"Narayani_Parajuli_Residence");
 assert.equal(c.projects[1].source_folder_title,"PRJ-000002__FBL-001__17_Samir_Man_Gubhaju");
 assert.equal(c.projects[2].source_folder_title,"PRJ-000020__FBL-019__14_Kharika_Paudel");
 assert.equal(c.projects[7].title,"Bishal Paija Residence");
 assert.equal(c.projects[8].title,"14 Basanti Poudel Baral");
 assert.equal(c.projects[5].title,"Sabitri Giri Residence");
});
test("all 22 company pages use the exact same rendering code and do not clone other WBS activities",()=>{
 const c=catalog(),ui=read("src/presentation/project-catalog.mjs");
 assert.match(ui,/validateProjectCatalog/);
 assert.match(ui,/renderProject\(mount,data,p/);
 assert.match(ui,/renderCompany\(mount,data,e/);
 assert.match(ui,/renderIndex\(mount,data/);
 assert.doesNotMatch(ui,/createApprovedWork|compileProjectDraft|scheduleProject|saveApprovedBaseline|localStorage/);
 const dirs=new Set();
 for(const e of c.enterprises){
  const html=read("projects/"+e.key+"/index.html");
  assert.match(html,/src\/presentation\/project-catalog\.mjs/);
  assert.ok(html.includes('data-project-company="'+e.key+'"'));
 }
 for(const p of c.projects){
  const path="projects/"+p.company+"/"+p.slug+"/index.html";
  assert.ok(!dirs.has(path));dirs.add(path);
  const html=read(path);
  assert.ok(html.includes('data-project-id="'+p.id+'"'));
  assert.match(html,/src\/presentation\/project-catalog\.mjs/);
  assert.doesNotMatch(html,/scheduleProject|drive\.google\.com|docs\.google\.com|approved_work_complete/);
 }
});
test("Narayani links to its existing public-safe four-view record; all 21 remaining schedules are empty",()=>{
 const c=catalog();
 assert.equal(c.projects[0].source_project_id,"PRJ-000007");
 assert.equal(c.projects[0].schedule_status,"NARAYANI_PUBLIC_SAFE_DRAFT");
 for(const p of c.projects.slice(1))assert.equal(p.schedule_status,"EMPTY_NO_VERIFIED_PROJECT_WBS");
 for(const p of c.projects){
  assert.equal(p.approval_status,"NO_REAL_WORK_APPROVAL");
  if(p.source_authority==="DRIVE_PROJECT_FOLDER_NAME")assert.ok(p.source_folder_title);
 }
 assert.equal(c.projects[10].source_authority,"OWNER_REQUESTED_POINTER_ONLY");
 const ui=read("src/presentation/project-catalog.mjs");
 assert.match(ui,/narayani\/desk\.html#activities/);
 assert.match(ui,/narayani\/desk\.html#dependencies/);
 assert.match(ui,/No verified project activity IDs/);
 assert.match(ui,/EMPTY_NO_VERIFIED_PROJECT_WBS/);
});
test("old portfolio URLs are redirects and historic 11-instance registry remains in non-public archive",()=>{
 const c=catalog();
 const pointer=JSON.parse(read("projects/portfolio/registry.json"));
 assert.equal(pointer.status,"MOVED_NOT_AUTHORITATIVE");
 assert.equal(pointer.canonical,"../registry.json");
 const archive=JSON.parse(read("docs/archive/20261109_SKYFORGE_PORTFOLIO_V1_REGISTRY.json"));
 assert.equal(archive.projects.length,11);
 assert.match(read("projects/portfolio/index.html"),/http-equiv="refresh"/);
 for(const p of c.projects.slice(0,11)){
  const old=read("projects/portfolio/"+p.legacy_portfolio_slug+"/index.html");
  assert.match(old,/http-equiv="refresh"/);
  assert.ok(old.includes("../../"+p.company+"/"+p.slug+"/"));
 }
});
test("builder pins Drive-first catalog, excludes original Drive IDs and publishes authoritative company routes",()=>{
 const build=read("scripts/build-public-site.mjs"),reg=read("projects/registry.json");
 assert.match(build,/const companyKeys=/);
 assert.match(build,/const expectedRoutes=/);
 assert.match(build,/const projectPages=/);
 assert.match(build,/Drive-first project catalog changed without reviewed source acceptance/);
 assert.match(build,/\.\.\.projectPages/);
 assert.match(build,/"projects\/registry\.json"/);
 assert.match(build,/"assets\/project-catalog\.css"/);
 assert.match(build,/"more\/index\.html"/);
 assert.match(reg,/PUBLIC_PROJECT_NAMES_ONLY_NO_DRIVE_IDS_OR_PRIVATE_DATA/);
 assert.doesNotMatch(reg,/drive\.google\.com|docs\.google\.com|https?:\/\/|@|GOOGLE_OAUTH_ACCESS_TOKEN/);
 assert.match(read("projects/index.html"),/project-catalog\.mjs/);
 assert.match(read("assets/site-shell.mjs"),/\["Projects","projects\/index\.html"\]/);
});
test("tampering with WBS, project identities and approval claims fails closed",()=>{
 const c=catalog();
 const dup=structuredClone(c);dup.projects[1].id=dup.projects[0].id;
 assert.throws(()=>validateProjectCatalog(dup),/integrity/);
 const fake=structuredClone(c);fake.projects[1].schedule_status="NARAYANI_PUBLIC_SAFE_DRAFT";
 assert.throws(()=>validateProjectCatalog(fake),/integrity/);
 const ready=structuredClone(c);ready.projects[2].approval_status="READY";
 assert.throws(()=>validateProjectCatalog(ready),/integrity/);
 const bogus=structuredClone(c);bogus.projects[0].source_folder_title="";
 assert.throws(()=>validateProjectCatalog(bogus),/folder/);
});
