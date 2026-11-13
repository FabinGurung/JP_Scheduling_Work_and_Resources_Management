/* Canonical company-first Projects UI. Read-only identity and source-verified WBS status. */
const registryUrl=new URL("../../projects/registry.json",import.meta.url);
const projectsBase=new URL("./",registryUrl);
const companies=["jp","fishtail","rohini","paila"];
const node=(tag,cls,value)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(value!==undefined)n.textContent=String(value);
 return n;
};
const add=(p,t,c,v)=>{const n=node(t,c,v);p.append(n);return n};
function anchor(p,title,path,cls=""){
 const a=add(p,"a",cls,title);a.href=new URL(path,projectsBase).href;return a;
}
const companyPath=(name)=>name+"/";
const projectPath=(p)=>p.company+"/"+p.slug+"/";
export function validateProjectCatalog(d){
 if(d?.format!=="SKYFORGE_PROJECT_CATALOG_V2"||
    d.root!=="PROJECTS_DIRECT_ENTERPRISE_GROUPING"||
    d.publishing!=="PUBLIC_PROJECT_NAMES_ONLY_NO_DRIVE_IDS_OR_PRIVATE_DATA"||
    !Array.isArray(d.enterprises)||d.enterprises.length!==4||
    !Array.isArray(d.projects)||d.projects.length!==22||
    d.enterprises.map(x=>x.key).join(",")!=="jp,fishtail,rohini,paila")
  throw Error("Canonical project catalog is unavailable or unreviewed");
 const ids=new Set(),routes=new Set();
 const groups=new Set(d.enterprises.map(e=>e.key));
 const limits=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
 for(let i=0;i<d.projects.length;i++){
  const p=d.projects[i],expected="PORT-"+String(i+1).padStart(6,"0");
  if(p.id!==expected||ids.has(p.id)||routes.has(p.company+"/"+p.slug)||
     !groups.has(p.company)||!limits.test(p.slug??"")||
     typeof p.title!=="string"||!p.title.trim()||p.title.length>130||
     typeof p.source_group!=="string"||p.source_group.length>140||
     p.approval_status!=="NO_REAL_WORK_APPROVAL"||
     !["EMPTY_NO_VERIFIED_PROJECT_WBS","NARAYANI_PUBLIC_SAFE_DRAFT","HARISHARAN_PUBLIC_SAFE_DRAFT"].includes(p.schedule_status)||
     (p.schedule_status==="NARAYANI_PUBLIC_SAFE_DRAFT"&&(p.id!=="PORT-000001"||p.source_project_id!=="PRJ-000007"))||
     (p.schedule_status==="HARISHARAN_PUBLIC_SAFE_DRAFT"&&p.id!=="PORT-000014")||
     (p.id!=="PORT-000001"&&p.id!=="PORT-000014"&&p.schedule_status!=="EMPTY_NO_VERIFIED_PROJECT_WBS"))
    throw Error("Project identity/source integrity check failed");
  if(p.source_authority==="DRIVE_PROJECT_FOLDER_NAME"&&
    (typeof p.source_folder_title!=="string"||!p.source_folder_title.trim()))
   throw Error("Missing Drive source folder identity");
  if(p.source_authority!=="DRIVE_PROJECT_FOLDER_NAME"&&
     !(p.id==="PORT-000011"&&p.source_authority==="OWNER_REQUESTED_POINTER_ONLY"))
   throw Error("Unexpected non-Drive source record");
  ids.add(p.id);routes.add(p.company+"/"+p.slug);
 }
 for(const e of d.enterprises)
  if(!limits.test(e.key)||typeof e.title!=="string"||
   typeof e.drive_folder_title!=="string"||e.title.length>90)
   throw Error("Invalid company source identity");
 return true;
}
function crumbs(parent,items){
 const nav=add(parent,"nav","pj-breadcrumb");nav.setAttribute("aria-label","Breadcrumb");
 items.forEach((item,i)=>{
  if(i)add(nav,"span","","/");
  if(item[1])anchor(nav,item[0],item[1]);
  else add(nav,"span","",item[0]);
 });
}
function companyCard(enterprise,records){
 const section=node("section","pj-company");
 section.id="company-"+enterprise.key;
 const head=add(section,"div","pj-company-head"),left=add(head,"div");
 const h=add(left,"h2","",enterprise.title);h.id=enterprise.key;
 add(left,"p","",enterprise.drive_folder_title+" · Source folder precedence");
 const right=add(head,"div");
 add(right,"span","pj-count",records.length+" projects");
 anchor(right,"View company →",companyPath(enterprise.key));
 const cards=add(section,"div","pj-cards");
 for(const record of records)cards.append(projectCard(record));
 return section;
}
function projectCard(p){
 const card=node("article","pj-card");
 card.dataset.catalogSearch=[p.title,p.source_folder_title||"",p.source_group,p.source_project_id||"",p.map_pk_id||""].join(" ").toLowerCase();
 add(card,"span","pj-status "+(p.schedule_status!=="EMPTY_NO_VERIFIED_PROJECT_WBS"?"pj-live":"pj-hold"),
  p.schedule_status==="HARISHARAN_PUBLIC_SAFE_DRAFT"?"Planning WBS available":p.schedule_status==="NARAYANI_PUBLIC_SAFE_DRAFT"?"WBS model available":"WBS not imported");
 add(card,"h3","",p.title);
 add(card,"div","pj-caption",p.source_group);
 if(p.source_project_id)add(card,"div","pj-caption",p.source_project_id);
 anchor(card,"Open workspace →",projectPath(p));
 return card;
}
function introduction(mount,title,description,breadcrumb){
 const header=add(mount,"header","pj-hero");
 crumbs(header,breadcrumb);
 add(header,"div","pj-eyebrow","Skyforge / Projects");
 add(header,"h1","",title);
 add(header,"p","",description);
 return header;
}
function renderIndex(mount,registry){
 const head=introduction(mount,"Projects, grouped by company",
  "One canonical project directory, 22 Drive-reconciled identities and one reusable scheduling engine. Project-specific WBS, dates and dependencies remain empty until their own sources are admitted.",
  [["Overview","../"],["Projects",null]]);
 const nav=add(head,"nav","pj-company-jumps");
 for(const e of registry.enterprises)anchor(nav,e.title,"#company-"+e.key);
 const search=add(mount,"div","pj-search");
 const label=add(search,"label","","Find a project");
 label.htmlFor="pj-query";
 const input=add(search,"input");input.id="pj-query";input.type="search";
 input.placeholder="Name, ward, PRJ ID…";input.autocomplete="off";
 const count=add(search,"small","",registry.projects.length+" projects");
 const sections=[];
 for(const e of registry.enterprises){
  const sec=companyCard(e,registry.projects.filter(p=>p.company===e.key));
  mount.append(sec);sections.push(sec);
 }
 input.addEventListener("input",()=>{
  let shown=0;
  const query=input.value.trim().toLowerCase();
  for(const sec of sections){
   let visible=0;
   for(const card of sec.querySelectorAll(".pj-card")){
    const hit=!query||card.dataset.catalogSearch.includes(query);
    card.classList.toggle("pj-hidden",!hit);
    if(hit){visible++;shown++;}
   }
   sec.classList.toggle("pj-hidden",visible===0);
  }
  count.textContent=shown+" matching project"+(shown===1?"":"s");
 });
 add(mount,"p","pj-note","Drive folder names are authoritative for project identity. Map references are cross-references only. No historical construction-completion labels, simulated dates or fabricated WBS activities appear in this directory.");
}
function renderCompany(mount,registry,e){
 const rows=registry.projects.filter(p=>p.company===e.key);
 const hero=introduction(mount,e.title,rows.length+" source-catalogued project"+(rows.length===1?"":"s")+
   " · "+e.drive_folder_title+". All scheduling workspaces share the same template, not the same project data.",
  [["Overview","../"],["Projects","./"],[e.title,null]]);
 const nav=add(hero,"div","pj-toolbar");
 anchor(nav,"← All companies","./");
 anchor(nav,"Scheduling Studio","../studio/");
 const grid=add(mount,"div","pj-cards");
 for(const p of rows)grid.append(projectCard(p));
 if(e.key==="paila")add(mount,"p","pj-note","The A9 Pilates folder is a governance pointer, not the inaccessible operational account's WBS. The Jawalakhel interior schedule is intentionally empty.");
}
function sourceMeta(mount,p,e){
 const box=add(mount,"section","pj-source-meta");
 add(box,"h2","","Source & project identity");
 const data=[
 ["Enterprise",e.title],
 ["Registered instance",p.id],
 ["Google Drive title",p.source_folder_title||"Operational source not accessible"],
 ["Drive classification",p.source_group],
 ["Existing PRJ ID",p.source_project_id||"No verified PRJ identifier"],
 ["Legacy map ID",p.map_pk_id||"Not present in map snapshot"],
 ["WBS admission",p.schedule_status==="HARISHARAN_PUBLIC_SAFE_DRAFT"?"839-task public-safe draft (not approved)":p.schedule_status==="NARAYANI_PUBLIC_SAFE_DRAFT"?"Published safe planning scenario":"Not admitted · no source WBS loaded"],
 ["Site approval","None verified"]
 ];
 const dl=add(box,"dl");
 for(const [a,b] of data){add(dl,"dt","",a);add(dl,"dd","",b)}
}
function emptySurface(mount,heading,body){
 const box=add(mount,"section","pj-workspace");
 add(box,"h2","",heading);
 const v=add(box,"div","pj-empty");
 add(v,"h3","","No verified project inputs");
 add(v,"p","",body);
 return box;
}
function renderProject(mount,registry,p,e){
 const isHar=p.schedule_status==="HARISHARAN_PUBLIC_SAFE_DRAFT";
 const has=p.schedule_status==="NARAYANI_PUBLIC_SAFE_DRAFT"||isHar;
 const hero=introduction(mount,p.title,
  "One source-owned project workspace under "+e.title+". Dates, activities and relationships belong to this project only.",
  [["Overview","../"],["Projects","./"],[e.title,companyPath(e.key)],[p.title,null]]);
 const buttons=add(hero,"nav","pj-toolbar");
 buttons.setAttribute("aria-label","Project-level navigation");
 anchor(buttons,"← "+e.title,companyPath(e.key));
 anchor(buttons,"All projects","./");
 if(has&&!isHar)anchor(buttons,"Open the scheduling desk →","narayani/desk.html");
 if(isHar)anchor(buttons,"Open detailed 839-activity schedule →","fishtail/harisharan-residence/detailed-preview.html");
 const status=add(mount,"div","pj-status "+(has?"pj-live":"pj-hold"),
  has?"PUBLIC-SAFE PLANNING SCENARIO · NOT APPROVED":"EMPTY PROJECT · WBS NOT LOADED");
 status.setAttribute("role","status");
 sourceMeta(mount,p,e);
 if(isHar){
  const work=add(mount,"section","pj-source-meta");
  add(work,"h2","","Harisharan V000001 · Detailed construction planning");
  add(work,"p","pj-muted","839 proposed activities, 1,321 dependency links; all relative dates, engineering holds and resources remain unapproved. Structural RCC M25; Ø8 mm transverse links require engineer inspection.");
  const links=add(work,"nav","pj-toolbar");
  links.setAttribute("aria-label","Harisharan scheduling draft");
  anchor(links,"Activity table + relative Gantt →","fishtail/harisharan-residence/detailed-preview.html");
  const note=add(work,"div","pj-note");
  note.textContent="No site/engineer release, no actual work recorded. Grid, footing geometry, tie detailing and source quantities require review.";
 }else if(has){
  const work=add(mount,"section","pj-source-meta");
  add(work,"h2","","Scheduling desk · one shared set of source activities");
  add(work,"p","pj-muted","The Gantt activity register and 12-month calendar are synchronized to ONE schedule. Select an activity in the Gantt; its Predecessors, Successors and Resources are in the lower Activity Details pane. The former constellation and 405 reported-only checklist entries remain in Reference history.");
  const links=add(work,"nav","pj-toolbar");
  links.setAttribute("aria-label","Scheduling desk views");
  anchor(links,"Activity table + Gantt →","narayani/desk.html#activities");
  anchor(links,"Year / month calendar →","narayani/desk.html#calendar");
  const note=add(work,"div","pj-note");
  note.textContent="The source scenario is NOT an approved baseline, actual progress or permission to start construction.";
 }else{
  const grid=add(mount,"div","pj-workspaces");
  emptySurface(grid,"WBS / Activity register","No verified project activity IDs, WBS or scope decomposition admitted.");
  emptySurface(grid,"Gantt and calendar","No project-specific durations, project calendar or approved scenario start/end dates admitted.");
  emptySurface(grid,"Predecessors / successors","No source-authored dependency links to calculate or authorize.");
  emptySurface(grid,"Site observations / work release","No authenticated actual progress, inspections or release evidence. Owner has paused private admission.");
 }
 add(mount,"p","pj-note",isHar?
  "Harisharan V000001 is a read-only, without-basement construction planning draft, not an approved baseline or site work release.":has?
  "The Narayani 45-activity scenario remains read-only and reported-only. Its dates and original checklist observations do not authorize work on site.":
  "Empty by design. Never copy an unrelated project's dates or assume benchmark production rates are site-approved durations.");
}
export async function bootstrapProjectCatalog(doc=document){
 const mount=doc.getElementById("project-catalog");
 if(!mount)return false;
 try{
  const response=await fetch(registryUrl,{cache:"no-store"});
  if(!response.ok)throw Error("Project source catalog unavailable");
  const data=await response.json();validateProjectCatalog(data);
  mount.replaceChildren();
  const companyKey=doc.body?.dataset?.projectCompany;
  const projectId=doc.body?.dataset?.projectId;
  if(projectId){
   const p=data.projects.find(x=>x.id===projectId);
   if(!p)throw Error("Unknown project registration");
   renderProject(mount,data,p,data.enterprises.find(x=>x.key===p.company));
  }else if(companyKey){
   const e=data.enterprises.find(x=>x.key===companyKey);
   if(!e)throw Error("Unknown company record");
   renderCompany(mount,data,e);
  }else renderIndex(mount,data);
  return true;
 }catch(error){
  mount.replaceChildren();
  add(mount,"p","pj-note","Project navigation blocked: "+error.message);
  return false;
 }
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>bootstrapProjectCatalog(),{once:true});
 }else bootstrapProjectCatalog();
}
