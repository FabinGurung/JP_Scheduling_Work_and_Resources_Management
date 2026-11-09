import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {validatePortfolioRegistry} from "../src/presentation/portfolio-page.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const registry=()=>JSON.parse(read("projects/portfolio/registry.json"));
const slugs=[
 "15-narayani-parajuli","17-samirman-gubhaju","14-kharika-poudel",
 "13-hari-baral","16-yamuna-pun-adai","30-dipti-sabitri-giri",
 "31-sharada-adhikari","14-bishal-paiza","14-basanta-boral-poudel",
 "14-ashok-adhikari","jawalakhel-pilates-interior"
];
test("11 numbered portfolio project pages and 4 enterprise groups reuse only one source-honest UI renderer",()=>{
 const p=registry();
 assert.doesNotThrow(()=>validatePortfolioRegistry(p));
 assert.equal(p.enterprises.length,4);
 assert.equal(p.projects.length,11);
 assert.deepEqual(p.projects.map(x=>x.slug),slugs);
 assert.deepEqual(p.enterprises.map(e=>p.projects.filter(x=>x.enterprise_id===e.id).length),
  [0,7,3,1]);
 assert.deepEqual(p.projects.map(x=>x.instance_id),slugs.map((_,i)=>"PORT-"+String(i+1).padStart(6,"0")));
 const shell=read("projects/portfolio/index.html");
 assert.match(shell,/portfolio-page\.mjs/);
 for(const item of p.projects){
  const page=read("projects/portfolio/"+item.slug+"/index.html");
  assert.ok(page.includes('data-portfolio-record="'+item.slug+'"'));
  assert.match(page,/src\/presentation\/portfolio-page\.mjs/);
  assert.match(page,/assets\/portfolio\.css/);
  assert.doesNotMatch(page,/approved_site_progress|saveApprovedBaseline\(|scheduleProject\(/);
 }
 const script=read("src/presentation/portfolio-page.mjs");
 assert.match(script,/validatePortfolioRegistry/);
 assert.match(script,/renderIndex\(mount,data\)/);
 assert.match(script,/renderRecord\(mount,data,slug\)/);
 assert.match(script,/source-status|schedule_state|SOURCE_NOT_ADMITTED_NO_WBS/);
 assert.doesNotMatch(script,/localStorage|method:\s*["']POST["']|approved_work_complete|scheduleCalendarNetwork\(/i);
});
test("source name cross-check preserves identity uncertainty rather than merging similar surnames",()=>{
 const p=registry().projects;
 const byId=new Map(p.map(x=>[x.instance_id,x]));
 assert.equal(byId.get("PORT-000001").existing_project_id,"PRJ-000007");
 assert.equal(byId.get("PORT-000002").existing_project_id,"PRJ-000002");
 assert.equal(byId.get("PORT-000003").existing_project_id,"PRJ-000020");
 assert.equal(byId.get("PORT-000004").existing_project_id,"PRJ-000003");
 assert.match(byId.get("PORT-000002").drive_folder_name,/Samir_Man/);
 assert.match(byId.get("PORT-000003").drive_folder_name,/Paudel/);
 assert.match(byId.get("PORT-000008").drive_folder_name,/Paija/);
 assert.equal(byId.get("PORT-000009").source_match_status,"POSSIBLE_DIFFERENT_PERSON_DO_NOT_MERGE");
 assert.equal(byId.get("PORT-000006").source_match_status,"MULTI_NAME_IDENTITY_UNVERIFIED");
 assert.equal(byId.get("PORT-000011").source_match_status,"PROJECT_SOURCE_NOT_ACCESSIBLE");
 assert.match(registry().enterprises[1].requested_enterprise_alias,/Histel/);
 assert.match(registry().enterprises[1].name,/Fishtail/);
 for(const item of p.slice(1)){
  assert.equal(item.existing_project_id!==null&&item.published_view_path!==null,false);
  assert.equal(item.schedule_state,"SOURCE_NOT_ADMITTED_NO_WBS");
  assert.equal(item.published_view_path,null);
  assert.equal(item.published_readiness_path,null);
 }
});
test("portfolio and sources never claim field completion, approved dates or fabricated source links",()=>{
 const p=registry();
 const json=read("projects/portfolio/registry.json");
 assert.match(json,/PUBLIC_PROJECT_NAMES_ONLY_NO_PRIVATE_DRIVE_LINKS/);
 assert.doesNotMatch(json,/drive\.google\.com|docs\.google\.com|https?:\/\/|@|GOOGLE_OAUTH_ACCESS_TOKEN/);
 for(const item of p.projects){
  assert.equal(item.approval_state,"NO_AUTHORIZED_SITE_RELEASE");
  assert.equal(item.field_status,"NOT_VERIFIED");
 }
 const entry=p.projects[0];
 assert.equal(entry.schedule_state,"PUBLIC_SAFE_SCENARIO_EXISTING");
 assert.equal(entry.published_view_path,"../narayani/beta.html");
 assert.equal(entry.published_readiness_path,"../narayani/readiness.html");
 const source=read("src/presentation/studio-project-page.mjs");
 assert.match(source,/ONE shared view engine|ONE shared view engine|ONE shared/);
 assert.match(source,/validateGenericViewModel\(model\)/);
 assert.match(source,/renderGenericProject\(model,mount\)/);
 assert.doesNotMatch(read("src/presentation/portfolio-page.mjs"),/projectGenericVisual|compileProjectDraft/);
});
test("public Pages builder strictly verifies source and publishes all 11 portfolio shells",()=>{
 const build=read("scripts/build-public-site.mjs");
 assert.match(build,/Portfolio source is unreviewed/);
 assert.match(build,/portfolio\.projects\.length|portfolio\.projects\?\.length/);
 assert.match(build,/portfolioSlugs\.map/);
 assert.match(build,/\.\.\.portfolioPages/);
 assert.match(build,/"projects\/portfolio\/registry\.json"/);
 assert.match(build,/"assets\/portfolio\.css"/);
 assert.match(read("projects/index.html"),/href="\.\/portfolio\/"/);
 const published=[];
 for(const x of registry().projects){
  assert.ok(build.includes('"'+x.slug+'"'));
  published.push("projects/portfolio/"+x.slug+"/index.html");
 }
 assert.equal(new Set(published).size,11);
});
test("tampering with registry cannot admit other projects, duplicate identities, or claim READY",()=>{
 const p=registry();
 const dup=structuredClone(p);
 dup.projects[1].instance_id=dup.projects[0].instance_id;
 assert.throws(()=>validatePortfolioRegistry(dup),/identity/);
 const bad=structuredClone(p);
 bad.projects[1].schedule_state="PUBLIC_SAFE_SCENARIO_EXISTING";
 assert.throws(()=>validatePortfolioRegistry(bad),/schedule authority/);
 const fake=structuredClone(p);
 fake.projects[1].published_view_path="../narayani/beta.html";
 assert.throws(()=>validatePortfolioRegistry(fake),/unrelated schedule/);
 const approval=structuredClone(p);
 approval.projects[1].approval_state="READY";
 assert.throws(()=>validatePortfolioRegistry(approval),/identity/);
});
