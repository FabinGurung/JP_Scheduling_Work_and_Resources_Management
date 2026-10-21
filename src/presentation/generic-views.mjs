import {layoutOrganicSkillTree} from "./generic-organic-layout.mjs";
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
 !["PUBLIC_SYNTHETIC_DRAFT_ONLY","LOCAL_UNVERIFIED_DRAFT_ONLY","PUBLIC_SAFE_GOVERNED_SCENARIO"].includes(model.classification)||
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
  !((c.authority==="PUBLIC_SYNTHETIC_DRAFT"&&c.status==="NOT_REPORTED")||
    (model.classification==="PUBLIC_SAFE_GOVERNED_SCENARIO"&&
     c.authority==="PUBLIC_SAFE_REPORTED_ONLY"&&
     ["NOT_REPORTED","NOT_DONE","IN_PROGRESS","REPORTED_DONE","BLOCKED","NOT_APPLICABLE_REQUESTED"].includes(c.status))))
  throw Error("Invalid checklist provenance");
 for(const c of model.calendar_events)if(!aids.has(c.activity_id)||
    !/^\d{4}-\d{2}-\d{2}$/.test(c.date)||!["START","FINISH"].includes(c.kind))throw Error("Invalid event-only calendar");
 const nums=model.counts;
 if(!nums||nums.activities!==model.activities.length||nums.wbs!==model.wbs.length||
 nums.links!==model.links.length||nums.checklist!==model.checklist.length)throw Error("Model totals disagree");
 return true;
}
export function renderGenericProject(model,mount,options={}){
 validateGenericViewModel(model);
 if(!mount||typeof mount.replaceChildren!=="function")throw Error("Mount element required");
 mount.replaceChildren();
 const project=el("div","gv-project");
 const heading=el("h2","",model.project.name);
 const intro=el("p","gv-muted",
  "Draft schedule · "+model.engine_mode+" · "+model.activities.length+" activities · "+model.links.length+" links · "+model.checklist.length+" source-supplied prompts");
 const ethics=el("p","gv-warning",
 model.classification==="LOCAL_UNVERIFIED_DRAFT_ONLY"?
 "LOCAL UNVERIFIED BETA EDIT · No source writes. Schedule slots are recalculated from local assumptions and no approval or field completion is inferred.":
 model.classification==="PUBLIC_SAFE_GOVERNED_SCENARIO"?
 "NARAYANI REPORTED-ONLY SCENARIO · Original 405 check statuses are read-only reports, not engineering acceptance. Dates are an unapproved scenario. Original field controls remain on the preserved project page.":
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
 // A botanical/WBS skill constellation — entirely independent from CPM time slots.
 // Solid teal branches signify WBS membership, gold dotted lines signify dependencies.
 const tree=layoutOrganicSkillTree(model);
 // Visual coordinates may be dragged in a draft, independently of CPM dates.
 // A layout adjustment does not change source WBS membership or scheduling.
 if(options.layoutPositions&&typeof options.layoutPositions==="object"){
  const positions=new Map([["PROJECT",tree.root],...tree.nodes.map(n=>[n.id,n]),
   ...Object.values(tree.taskPositions).map(n=>[n.id,n])]);
  for(const [id,pos] of Object.entries(options.layoutPositions)){
   const point=positions.get(id);
   if(point&&Number.isFinite(pos?.x)&&Number.isFinite(pos?.y)){
    point.x=Math.max(20,Math.min(tree.width-20,pos.x));
    point.y=Math.max(15,Math.min(tree.height-15,pos.y));
   }
  }
  for(const line of [...tree.branches,...tree.dependencies]){
   line.a=positions.get(line.from);line.b=positions.get(line.to);
  }
 }
 const stage=svg("svg",{viewBox:"0 0 "+tree.width+" "+tree.height,width:tree.width,
  height:tree.height,role:"group",
  "aria-label":"Organic project skill tree — WBS branches grow upward from project roots"});
 stage.classList.add("gv-skill-tree");
 const branchesLayer=svg("g",{"class":"gv-skill-branches","aria-hidden":"true"});
 function curve(a,b){const span=Math.abs(b.y-a.y);
  return "M"+a.x+","+a.y+" C"+a.x+","+(a.y-span*.47)+" "+b.x+","+(b.y+span*.47)+" "+b.x+","+b.y}
 for(const e of tree.branches){
  const path=svg("path",{d:curve(e.a,e.b),"class":"gv-tree-branch",fill:"none",
   stroke:"#5aafa5","stroke-width":e.from==="PROJECT"?6:3.5,"stroke-linecap":"round"});
  branchesLayer.append(path);
 }
 stage.append(branchesLayer);
 const depLayer=svg("g",{"class":"gv-dependency-lines","aria-hidden":"true"});
 for(const e of tree.dependencies){
  // Cross-links float behind task leaves; the graph is not a temporal axis.
  const midY=Math.min(e.a.y,e.b.y)-78-(Math.abs(e.a.x-e.b.x)*.06);
  const path=svg("path",{d:"M"+e.a.x+","+e.a.y+" Q"+((e.a.x+e.b.x)/2)+","+midY+
    " "+e.b.x+","+e.b.y,fill:"none","class":"gv-dependency-line",
    stroke:"#caa45d","stroke-width":1.7,"stroke-dasharray":"5 8"});
  depLayer.append(path);
 }
 stage.append(depLayer);
 function medallion(p,kind,label){
  const g=svg("g",{"class":"gv-skill-"+kind,"transform":"translate("+p.x+" "+p.y+")"});
  g.append(svg("circle",{cx:0,cy:0,r:kind==="root"?52:kind==="wbs"?41:27,
   "class":"gv-skill-halo"}));
  g.append(svg("circle",{cx:0,cy:0,r:kind==="root"?37:kind==="wbs"?29:19,
   "class":"gv-skill-core"}));
  if(kind==="activity"){
   g.append(svg("path",{d:"M0,-11 C11,-8 12,3 0,12 C-12,3 -11,-8 0,-11Z",
    fill:"#66bdaf",stroke:"#f8fffd","stroke-width":1.5}));
   const t=svg("text",{x:0,y:46,"text-anchor":"middle","class":"gv-skill-label"});
   t.textContent=label.length>30?label.slice(0,28)+"…":label;g.append(t);
  }else{
   const emblem=svg("text",{x:0,y:6,"text-anchor":"middle","class":"gv-skill-emblem"});
   emblem.textContent=kind==="root"?"✦":"✧";g.append(emblem);
   const t=svg("text",{x:0,y:kind==="root"?69:56,
     "text-anchor":"middle","class":"gv-skill-label gv-skill-label-major"});
   t.textContent=label.length>34?label.slice(0,32)+"…":label;g.append(t);
  }
  return g;
 }
 stage.append(medallion(tree.root,"root",model.project.name));
 function draggable(node,point,id){
  if(typeof options.onNodeMoved!=="function")return;
  node.classList.add("gv-drag-enabled");
  let start=null,moved=false;
  node.addEventListener("pointerdown",event=>{
   if(event.button!==0&&event.pointerType!=="touch")return;
   start={x:event.clientX,y:event.clientY,px:point.x,py:point.y};
   moved=false;node.setPointerCapture?.(event.pointerId);
  });
  node.addEventListener("pointermove",event=>{
   if(!start)return;
   const dx=event.clientX-start.x,dy=event.clientY-start.y;
   if(Math.abs(dx)+Math.abs(dy)>4)moved=true;
   if(moved)node.setAttribute("transform","translate("+
    Math.round(Math.max(20,Math.min(tree.width-20,start.px+dx)))+" "+
    Math.round(Math.max(15,Math.min(tree.height-15,start.py+dy)))+")");
  });
  node.addEventListener("pointerup",event=>{
   if(!start)return;
   const {x,y,px,py}=start;start=null;
   if(moved){
    node.dataset.justDragged="true";
    options.onNodeMoved(id,{x:Math.round(Math.max(20,Math.min(tree.width-20,px+event.clientX-x))),
     y:Math.round(Math.max(15,Math.min(tree.height-15,py+event.clientY-y)))});
   }
  });
  node.addEventListener("pointercancel",()=>{start=null});
 }
 for(const w of tree.nodes){
  const node=medallion(w,"wbs",w.label);
  draggable(node,w,w.id);stage.append(node);
 }
 const detail=el("div","gv-detail");
 let selectedId=null;
 const scroll=el("div","gv-scroll gv-tree-viewport");
 const toolbar=el("div","gv-tree-toolbar");
 const overview=el("button","gv-tree-control","Trunk / origin");
 overview.type="button";overview.title="Return to the base of the workflow tree";
 const dependencies=el("button","gv-tree-control","Dependencies: shown");
 dependencies.type="button";dependencies.setAttribute("aria-pressed","true");
 dependencies.title="Toggle the secondary, dotted CPM dependency connections";
 function centerOn(p){
  const v=scroll.getBoundingClientRect();
  scroll.scrollLeft=Math.max(0,p.x-v.width*.5);
  scroll.scrollTop=Math.max(0,p.y-v.height*.53);
 }
 overview.addEventListener("click",()=>centerOn(tree.root));
 let depsVisible=true;
 dependencies.addEventListener("click",()=>{
  depsVisible=!depsVisible;depLayer.style.display=depsVisible?"":"none";
  dependencies.textContent="Dependencies: "+(depsVisible?"shown":"hidden");
  dependencies.setAttribute("aria-pressed",String(depsVisible));
 });
 const branchPicker=el("select","gv-branch-picker");
 branchPicker.setAttribute("aria-label","Focus WBS skill-tree branch");
 const blank=el("option","","Jump to a WBS branch…");blank.value="";branchPicker.append(blank);
 for(const w of tree.nodes){
  const option=el("option","",w.label);option.value=w.id;branchPicker.append(option);
 }
 branchPicker.addEventListener("change",()=>{
  const w=tree.nodes.find(x=>x.id===branchPicker.value);
  if(w)centerOn(w);
 });
 toolbar.append(overview,dependencies,branchPicker);
 function select(id){
  const a=byId.get(id);if(!a)return;
  selectedId=id;detail.replaceChildren();
  options.onSelect?.(id);
  detail.append(el("strong","",a.id+" · "+a.title),
   el("p","gv-muted","WBS branch: "+a.wbs_id+" · Scheduled start "+a.start+
    " · finish "+a.finish+(a.start_date?" · "+a.start_date+" → "+a.finish_date:"")+
    " · "+a.duration+" declared duration"));
  detail.append(el("p","gv-muted","Duration basis: "+a.duration_basis+
   "; "+(a.assumption_reason||"source-linked")));
  for(const node of stage.querySelectorAll("[data-task]"))
   node.setAttribute("data-selected",String(node.getAttribute("data-task")===id));
 }
 for(const a of model.activities){
  const p=tree.taskPositions[a.id];if(!p)continue;
  const node=medallion(p,"activity",a.title);
  node.setAttribute("data-task",a.id);node.setAttribute("data-selected","false");
  node.setAttribute("tabindex","0");node.setAttribute("role","button");
  node.setAttribute("aria-label","Inspect "+a.id+": "+a.title);
  draggable(node,p,a.id);
  node.addEventListener("click",()=>{if(node.dataset.justDragged==="true"){node.dataset.justDragged="false";return}select(a.id);centerOn(p)});
  node.addEventListener("keydown",event=>{
   if(event.key==="Enter"||event.key===" "){event.preventDefault();select(a.id);centerOn(p)}
  });
  stage.append(node);
 }
 scroll.append(stage);
 panels.get("graph").append(el("p","gv-muted",
  "An upward-growing WBS skill tree, not a Gantt chart. Solid branches connect scope to activities; dotted gold arcs show separate CPM dependencies. "+
  (options.onNodeMoved?"Drag a leaf or WBS branch to arrange your local draft; use the editor above for schedule changes.":"Select a leaf to inspect its computed dates.")),
  toolbar,scroll,detail);
 if(model.activities.length)select(byId.has(options.selectedId)?options.selectedId:model.activities[0].id);
 // Begin at the trunk so users can climb through the scope to its tasks.
 requestAnimationFrame(()=>{
  // Keep the user's viewport when the editor recalculates or drops a node.
  // New project loads still begin at the root of the organic WBS.
  if(options.initialScroll&&Number.isFinite(options.initialScroll.left)&&
    Number.isFinite(options.initialScroll.top)){
   scroll.scrollLeft=Math.max(0,options.initialScroll.left);
   scroll.scrollTop=Math.max(0,options.initialScroll.top);
  }else centerOn(tree.root);
 });
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
 panels.get("gantt").append(el("p","gv-muted","Bars represent recalculated event slots from the same project model. The constellation uses WBS ancestry, not this time axis."),gantt);
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
  cp.append(el("p","gv-muted",model.classification==="PUBLIC_SAFE_GOVERNED_SCENARIO"?
  "Original Narayani reports, READ ONLY. REPORTED_DONE is not engineer-approved completion. This beta cannot change or approve any field report.":
  "These are explicitly supplied synthetic prompts. Their state is NOT_REPORTED and no interaction records approval."));
  for(const item of model.checklist){
   const row=el("div","gv-check");
   row.append(el("strong","",item.activity_id+" · "+byId.get(item.activity_id).title),
    el("p","",item.title),el("small","gv-muted",item.authority+" · "+item.status));
   cp.append(row);
  }
 }
 choose(types.some(([id])=>location.hash==="#"+id)?location.hash.slice(1):"graph");
 return {model,choose};
}
