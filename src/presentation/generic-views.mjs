/** Shared renderer for ANY verified Skyforge generic public draft model.
 * Browser-only; never calls scheduling solvers and never writes source records.
 */
const NS="http://www.w3.org/2000/svg";
const el=(tag,cls,textValue)=>{
 const x=document.createElement(tag);
 if(cls)x.className=cls;
 if(textValue!==undefined)x.textContent=String(textValue);
 return x;
};
const svg=(tag,attributes={})=>{
 const n=document.createElementNS(NS,tag);
 for(const [key,value] of Object.entries(attributes))n.setAttribute(key,String(value));
 return n;
};
export function validateGenericViewModel(model){
 if(model?.format!=="SKYFORGE_GENERIC_VIEW_MODEL_V1"||
 model.classification!=="PUBLIC_SYNTHETIC_DRAFT_ONLY"||
 model.engineering_release!==false||model.baseline_approved!==false||
 model.views_basis!=="ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL")
  throw Error("Model is not an approved public-synthetic generic visualization");
 if(!model.project?.id||!model.project?.name||!/^[a-f0-9]{64}$/.test(model.input_sha256??""))
  throw Error("Invalid model identity");
 for(const field of ["wbs","activities","links","calendar_events","checklist"]){
  if(!Array.isArray(model[field]))throw Error("Missing "+field+" array");
 }
 if(!model.activities.length||!model.wbs.length)throw Error("Project has no tasks or WBS");
 const aids=new Set(model.activities.map(x=>x.id)),wid=new Set(model.wbs.map(x=>x.id));
 if(aids.size!==model.activities.length||wid.size!==model.wbs.length)throw Error("Duplicate graph IDs");
 for(const a of model.activities){
  if(!wid.has(a.wbs_id)||!Number.isFinite(a.start)||!Number.isFinite(a.finish)||
   a.finish<a.start||a.status!=="CALCULATED_DRAFT_NOT_ACTUAL"||a.engineering_release!==false)
   throw Error("Invalid activity calculation/authority");
 }
 for(const edge of model.links)if(!aids.has(edge.from)||!aids.has(edge.to))throw Error("Invalid dependency");
 for(const c of model.checklist)if(!aids.has(c.activity_id)||
   c.authority!=="PUBLIC_SYNTHETIC_DRAFT"||c.status!=="NOT_REPORTED")throw Error("Invalid checklist provenance");
 for(const c of model.calendar_events)if(!aids.has(c.activity_id)||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!["START","FINISH"].includes(c.kind))throw Error("Invalid event-only calendar");
 const nums=model.counts;
 if(!nums||nums.activities!==model.activities.length||nums.wbs!==model.wbs.length||
 nums.links!==model.links.length||nums.checklist!==model.checklist.length)throw Error("Model totals disagree");
 return true;
}
export function renderGenericProject(model,mount){
 validateGenericViewModel(model);
 if(!mount||typeof mount.replaceChildren!=="function")throw Error("Mount element required");
 mount.replaceChildren();
 const project=el("div","gv-project");
 const heading=el("h2","",model.project.name);
 const intro=el("p","gv-muted",
  "Draft schedule · "+model.engine_mode+" · "+model.activities.length+" activities · "+model.links.length+" links · "+model.checklist.length+" source-supplied prompts");
 const ethics=el("p","gv-warning",
 "SYNTHETIC TRAINING ONLY · Assumed durations; neither construction completion nor an approved baseline. Calendar dates show calculated START/FINISH events, not verified daily progress.");
 project.append(heading,intro,ethics);
 const meta=el("div","gv-meta");
 for(const [key,val] of [["Model SHA-256 input",model.input_sha256],
  ["Project ID",model.project.id],["Planning status",model.planning_status],
  ["Views authority",model.views_basis]]){const p=el("p");p.append(el("strong","",key+": "),document.createTextNode(val));meta.append(p)}
 project.append(meta);mount.append(project);
 const nav=el("div","gv-tabs");nav.setAttribute("role","tablist");nav.setAttribute("aria-label","Schedule views");
 const panels=new Map(),buttons=new Map();
 const types=[["graph","Constellation"],["gantt","Gantt"],["calendar","Calendar"],["checklist","Checklists"]];
 function choose(name){
  if(!panels.has(name))return;
  for(const [key,section] of panels){const active=key===name;section.hidden=!active;buttons.get(key).setAttribute("aria-selected",String(active))}
 }
 for(const [key,label] of types){
  const b=el("button","gv-tab",label);b.type="button";b.setAttribute("role","tab");b.setAttribute("aria-selected","false");
  b.addEventListener("click",()=>{choose(key);history.replaceState(null,"","#"+key)});
  const panel=el("section","gv-panel");panel.setAttribute("role","tabpanel");panel.dataset.view=key;panel.hidden=true;
  buttons.set(key,b);panels.set(key,panel);nav.append(b);
 }
 mount.append(nav,...panels.values());
 const byId=new Map(model.activities.map(a=>[a.id,a]));
 // Graph positions depend on source WBS assignments; no project-specific IDs.
 const activeWbs=model.wbs.filter(w=>model.activities.some(a=>a.wbs_id===w.id));
 const groups=activeWbs.map(w=>model.activities.filter(a=>a.wbs_id===w.id));
 const maxPer=Math.max(1,...groups.map(g=>g.length)),width=Math.max(660,activeWbs.length*270+100);
 const height=Math.max(340,maxPer*88+138),stage=svg("svg",{
  viewBox:"0 0 "+width+" "+height,width,height,role:"img",
  "aria-label":"Project activity dependency constellation, computed draft"
 });
 const positions=new Map();
 groups.forEach((group,col)=>{
  const x=125+col*270;
  stage.append(Object.assign(svg("text",{x,y:34,fill:"#246779","font-size":14,"font-weight":750}),{textContent:activeWbs[col].title.slice(0,27)}));
  group.forEach((a,i)=>positions.set(a.id,{x,y:83+i*88}));
 });
 for(const link of model.links){
  const a=positions.get(link.from),b=positions.get(link.to);
  if(!a||!b)continue;
  const l=svg("path",{d:"M"+a.x+","+a.y+" Q"+((a.x+b.x)/2)+","+((a.y+b.y)/2-12)+" "+b.x+","+b.y,
   fill:"none",stroke:"#82a5b2","stroke-width":"1.7","stroke-dasharray":"4 4"});
  stage.append(l);
 }
 let activeActivity=null;const detail=el("div","gv-detail");
 function select(id){
  activeActivity=id;const a=byId.get(id);detail.replaceChildren();
  if(!a)return;
  detail.append(el("strong","",a.id+" · "+a.title),
   el("p","gv-muted","Start "+a.start+" · Finish "+a.finish+
    (a.start_date?" · "+a.start_date+" → "+a.finish_date:"")+
    " · "+a.duration+" declared duration"));
  detail.append(el("p","gv-muted","Duration basis: "+a.duration_basis+"; "+(a.assumption_reason||"source-linked")));
  for(const node of stage.querySelectorAll("[data-task]"))
   node.setAttribute("data-selected",String(node.getAttribute("data-task")===id));
 }
 for(const a of model.activities){
  const p=positions.get(a.id);if(!p)continue;
  const group=svg("g",{tabindex:"0",role:"button","aria-label":a.title,"data-task":a.id,"data-selected":"false"});
  const r=svg("rect",{x:p.x-101,y:p.y-27,width:203,height:54,rx:12,fill:"#fff",stroke:a.critical?"#bd872e":"#7ab4b7","stroke-width":a.critical?2.6:1.6});
  const t=svg("text",{x:p.x,y:p.y-3,"text-anchor":"middle","font-size":12,fill:"#21445c","font-weight":720});
  t.textContent=a.id+" · "+a.title.slice(0,25);
  const sub=svg("text",{x:p.x,y:p.y+14,"text-anchor":"middle","font-size":10,fill:"#567d8d"});
  sub.textContent="Day "+a.start+" → "+a.finish;
  group.append(r,t,sub);
  group.addEventListener("click",()=>select(a.id));
  group.addEventListener("keydown",event=>{if(event.key==="Enter"||event.key===" "){event.preventDefault();select(a.id)}});
  stage.append(group);
 }
 const graphScroll=el("div","gv-scroll");graphScroll.append(stage);
 panels.get("graph").append(el("p","gv-muted","Each WBS phase contains its own activity nodes. Select a node for its inputs and calculated dates; dependency lines are scenario logic, not verified execution."),graphScroll,detail);
 // Gantt uses the SAME start/finish events; no separately entered dates.
 const horizon=Math.max(1,Math.max(...model.activities.map(a=>a.finish)));
 const gantt=el("div","gv-gantt");
 for(const a of model.activities){
  const row=el("div","gv-gantt-row"),label=el("div","gv-gantt-label",a.id+" · "+a.title);
  const track=el("div","gv-gantt-track");
  const bar=el("div","gv-gantt-bar");bar.style.left=(100*a.start/horizon)+"%";
  bar.style.width=Math.max(0.4,100*(a.finish-a.start)/horizon)+"%";
  bar.title="Computed "+a.start+"–"+a.finish+" · "+a.duration+" slots";
  if(a.critical)bar.dataset.critical="true";
  track.append(bar);row.append(label,track);gantt.append(row);
 }
 panels.get("gantt").append(el("p","gv-muted","Bars represent calculated event slots. They use the same activities and time coordinates as the constellation."),gantt);
 const calendarPanel=panels.get("calendar");
 if(!model.calendar_events.length)calendarPanel.append(el("p","gv-warning","No calendar dates exist in this model. Abstract slots must not be displayed as real dates."));
 else{
  calendarPanel.append(el("p","gv-muted","Dated start/finish events only. Workday-by-workday actual progress is not inferred."));
  const list=el("div","gv-dates");
  for(const ev of model.calendar_events){
   const item=el("div","gv-date");
   item.append(el("span","gv-date-stamp",ev.date),el("span","gv-date-label",ev.kind),
    el("span","",ev.activity_id+" · "+byId.get(ev.activity_id).title));
   list.append(item);
  }
  calendarPanel.append(list);
 }
 const cp=panels.get("checklist");
 if(!model.checklist.length)cp.append(el("p","gv-warning","No source-supplied task checklist was provided. Skyforge does not generate or certify inspection instructions from a bare WBS."));
 else{
  cp.append(el("p","gv-muted","These are explicitly supplied synthetic prompts. Their state is NOT_REPORTED and no interaction records approval."));
  for(const item of model.checklist){
   const row=el("div","gv-check");
   row.append(el("strong","",item.activity_id+" · "+byId.get(item.activity_id).title),
    el("p","",item.title),el("small","gv-muted",item.authority+" · "+item.status));
   cp.append(row);
  }
 }
 if(model.activities[0])select(model.activities[0].id);
 choose(types.some(([id])=>location.hash==="#"+id)?location.hash.slice(1):"graph");
 return {model,choose};
}
