/**
 * One source-honest read-only project identity shell for all enumerated records.
 * No schedules are cloned; only the existing Narayani public-safe scenario has
 * an admitted viewer. All other records stay SOURCE_NOT_ADMITTED_NO_WBS.
 */
const registryUrl=new URL("../../projects/portfolio/registry.json",import.meta.url);
const el=(tag,cls,text)=>{
 const x=document.createElement(tag);
 if(cls)x.className=cls;
 if(text!==undefined)x.textContent=String(text);
 return x;
};
const put=(parent,tag,cls,text)=>{const x=el(tag,cls,text);parent.append(x);return x};
const link=(parent,label,href)=>{
 const a=el("a","",label);a.href=href;parent.append(a);return a;
};
const url=(path)=>new URL(path,registryUrl).href;
const route=(record)=>url("./"+record.slug+"/");
const matchLabel={
 MATCHED:"Folder title cross-checked",
 ALIAS_SPELLING_RECONCILIATION:"Spelling differs from Drive",
 IDENTITY_SUFFIX_UNVERIFIED:"Name extension not in Drive folder",
 MULTI_NAME_IDENTITY_UNVERIFIED:"Two requested names, one source folder",
 POSSIBLE_DIFFERENT_PERSON_DO_NOT_MERGE:"Possible different person — identity hold",
 PROJECT_SOURCE_NOT_ACCESSIBLE:"Operational project source inaccessible"
};
export function validatePortfolioRegistry(data){
 if(data?.format!=="SKYFORGE_ENTERPRISE_PORTFOLIO_REGISTRY_V1"||
  data.classification!=="PUBLIC_PROJECT_NAMES_ONLY_NO_PRIVATE_DRIVE_LINKS"||
  data.mode!=="READ_ONLY_IDENTITY_STAGING"||
  data.project_template!=="SINGLE_SHARED_SKYFORGE_VIEWER"||
  !Array.isArray(data.enterprises)||data.enterprises.length!==4||
  !Array.isArray(data.projects)||data.projects.length!==11)
   throw Error("Unreviewed enterprise registry");
 const enterpriseIds=new Set(data.enterprises.map(x=>x.id));
 const instanceIds=new Set(),slugs=new Set();
 for(const p of data.projects){
  if(instanceIds.has(p.instance_id)||slugs.has(p.slug)||!enterpriseIds.has(p.enterprise_id)||
    !/^PORT-\d{6}$/.test(p.instance_id)||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)||
    typeof p.requested_name!=="string"||p.requested_name.length>110||
    !Object.hasOwn(matchLabel,p.source_match_status)||
    p.field_status!=="NOT_VERIFIED"||p.approval_state!=="NO_AUTHORIZED_SITE_RELEASE")
   throw Error("Invalid or duplicate public project identity");
  instanceIds.add(p.instance_id);slugs.add(p.slug);
  if(p.schedule_state!=="SOURCE_NOT_ADMITTED_NO_WBS"&&
    !(p.instance_id==="PORT-000001"&&p.schedule_state==="PUBLIC_SAFE_SCENARIO_EXISTING"&&
      p.existing_project_id==="PRJ-000007"))
   throw Error("Undocumented schedule authority");
  if(p.instance_id!=="PORT-000001"&&(p.published_view_path!==null||p.published_readiness_path!==null))
   throw Error("Non-Narayani project cannot inherit an unrelated schedule view");
 }
}
function renderIndex(mount,registry){
 for(const enterprise of registry.enterprises.slice().sort((a,b)=>a.order-b.order)){
  const projects=registry.projects.filter(p=>p.enterprise_id===enterprise.id);
  const sec=el("section","pf-enterprise");
  const heading=put(sec,"h2","",String(enterprise.order).padStart(2,"0")+" · "+enterprise.name);
  heading.id=enterprise.id.toLowerCase();
  put(sec,"p","pf-enterprise-sub",enterprise.source_folder_label+" · "+projects.length+" enumerated project instance"+(projects.length===1?"":"s"));
  if(enterprise.requested_enterprise_alias)
   put(sec,"p","pf-alert","Requested label: "+enterprise.requested_enterprise_alias+" — "+enterprise.identity_note);
  if(enterprise.identity_note&&!enterprise.requested_enterprise_alias)
   put(sec,"p","pf-enterprise-sub",enterprise.identity_note);
  const cards=el("div","pf-records");
  if(!projects.length){
   const box=el("div","pf-card");
   put(box,"span","pf-pill pf-hold","NO PROJECT REQUESTED");
   put(box,"h3","","Enterprise registered");
   put(box,"p","","No project instances were specified for this enterprise. No WBS or schedule has been invented.");
   cards.append(box);
  }
  for(const p of projects){
   const box=el("article","pf-card");
   put(box,"span","pf-pill"+(p.published_view_path?"":" pf-hold"),
    p.instance_id+" · "+(p.published_view_path?"EXISTING PUBLIC VIEW":"SOURCE PENDING"));
   put(box,"h3","",p.requested_name);
   put(box,"p","",matchLabel[p.source_match_status]);
   put(box,"p","","Source project ID: "+(p.existing_project_id||"not verified"));
   link(box,"Inspect project instance →",route(p));
   cards.append(box);
  }
  sec.append(cards);mount.append(sec);
 }
 const notice=el("div","pf-alert");
 notice.textContent="This portfolio registers project names and individual QA shells only. The existing Narayani viewer is source-backed; all other portfolio records await their own authenticated WBS. No sample durations, costs, predecessor relationships or site approvals are copied between projects.";
 mount.append(notice);
}
function check(parent,success,title,description){
 const item=el("div","pf-check");
 put(item,"span","pf-check-icon"+(success?"":" pf-open"),success?"✓":"○");
 const txt=el("div");
 put(txt,"strong","",title);
 put(txt,"p","",description);
 item.append(txt);parent.append(item);
}
function renderRecord(mount,registry,key){
 const record=registry.projects.find(p=>p.slug===key);
 if(!record)throw Error("Unknown or unregistered project route");
 const ent=registry.enterprises.find(e=>e.id===record.enterprise_id);
 const header=el("header","pf-hero");
 put(header,"div","pf-eyebrow",ent.name+" / "+record.instance_id+" / source-honest project shell");
 put(header,"h1","",record.requested_name);
 put(header,"p","","A separately enumerated Skyforge project record. All projects reuse the same read-only visual and scheduling architecture; this identity page does not duplicate another project's activities or fabricate site data.");
 const nav=el("nav","pf-nav");nav.setAttribute("aria-label","Project navigation");
 link(nav,"← Four-enterprise portfolio",url("./"));
 link(nav,"All projects",url("../"));
 link(nav,"Reusable Studio",url("../../studio/"));
 if(record.published_view_path){
  link(nav,"Open existing verified-source viewer",url(record.published_view_path));
  link(nav,"Before / Current / After",url(record.published_readiness_path));
 }
 header.append(nav);mount.append(header);
 const status=el("div","pf-state");
 status.setAttribute("role","status");
 status.textContent=record.published_view_path?
  "Existing Narayani public-safe 45-activity planning scenario is available. Actual work completion and engineering release remain NOT VERIFIED.":
  "WBS SOURCE NOT ADMITTED. Shared viewer is intentionally not activated; project-specific schedule, activity IDs and field readiness have not been validated.";
 mount.append(status);
 const split=el("div","pf-split");
 const info=el("section","pf-panel");
 put(info,"h2","","Project identity & evidence boundary");
 const dl=el("dl","pf-identities");
 const identity=[
 ["Instance ID",record.instance_id],
 ["Enterprise",ent.name],
 ["Requested project name",record.requested_name],
 ["Existing Drive folder label",record.drive_folder_name||"No accessible source folder matched"],
 ["Name reconciliation",matchLabel[record.source_match_status]],
 ["Existing source project ID",record.existing_project_id||"NOT VERIFIED (not invented)"],
 ["Schedule source",record.schedule_state],
 ["Site work release","NOT VERIFIED / NOT AUTHORIZED"]
 ];
 for(const [label,value] of identity){put(dl,"dt","",label);put(dl,"dd","",value)}
 info.append(dl);
 const qa=el("section","pf-panel");
 put(qa,"h2","","Project onboarding & engine QA checklist");
 const checks=el("div","pf-checks");
 check(checks,true,"Distinct numbered project shell",record.instance_id+" reuses the one common project template");
 check(checks,true,"Enterprise and Drive name cross-check","Folder name is recorded separately from the requested label");
 check(checks,Boolean(record.published_view_path),"Published project-specific WBS",
  record.published_view_path?"Existing Narayani 45-activity public-safe model":"No source-authoritative WBS or activity dictionary admitted");
 check(checks,Boolean(record.published_view_path),"Constellation, Gantt, Calendar & Checklists",
  record.published_view_path?"Available in existing Narayani common viewer":"No activity data — do not substitute another project's schedule");
 check(checks,Boolean(record.published_readiness_path),"Before / Current / After",
  record.published_readiness_path?"Existing Narayani source-typed dependencies, actual status unknown":"No validated predecessor/successor relationships");
 check(checks,false,"Real progress / inspections verified","No approved site event or inspection evidence is connected");
 check(checks,false,"Authorized work release","No READY/COMPLETE status may be inferred");
 qa.append(checks);
 split.append(info,qa);mount.append(split);
 const flow=el("section","pf-panel");
 put(flow,"h2","","Field workflow · the next executable work");
 const grid=el("div","pf-stage-grid");
 for(const [heading,body] of [
 ["01 · Before","Check direct scheduled predecessors and required inspection/permit holds. "+
  (record.published_view_path?"Use the linked Narayani dependency inspector; field evidence remains unverified.":"Cannot calculate until this project's WBS is imported.")],
 ["02 · Current","Choose the source activity and review its prerequisites. No measured daily progress, approval or productivity values have been provided."],
 ["03 · After","Identify all direct successors only after their own constraints are inspected. Completing one predecessor never releases all successors automatically."]
 ]){
  const card=el("div","pf-stage");put(card,"h3","",heading);put(card,"p","",body);grid.append(card);
 }
 flow.append(grid);mount.append(flow);
 put(mount,"p","pf-foot","This is a public-safe identity and QA shell, not the original Drive source. Historical IDs, engineering evidence, approvals and quantities remain owned by their actual source records.");
}
export async function bootstrapPortfolio(){
 const mount=document.getElementById("portfolio-mount");
 if(!mount)return;
 try{
  const response=await fetch(registryUrl,{cache:"no-store"});
  if(!response.ok)throw Error("Portfolio identity registry not available");
  const data=await response.json();
  validatePortfolioRegistry(data);
  const slug=document.body?.dataset?.portfolioRecord;
  mount.replaceChildren();
  if(slug)renderRecord(mount,data,slug);
  else renderIndex(mount,data);
 }catch(error){
  mount.replaceChildren();
  put(mount,"p","pf-alert","Project registry blocked: "+error.message);
 }
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",bootstrapPortfolio,{once:true});
 else bootstrapPortfolio();
}
