import {drawGanttConnectors} from "./gantt-dependencies.mjs";
import {adaptNarayaniPublicModel} from "./narayani-beta-adapter.mjs";
import {validateGenericViewModel} from "./generic-views.mjs";
/* One read-only operational scheduling desk for 4 source-validated published
 * examples. The organic constellation and generic checklist are legacy only.
 * A view never changes an original activity or invents a construction release. */
const allowed=Object.freeze({
 "narayani":{file:"../../projects/narayani/project-model.json",governed:true,project:"PRJ-000007"},
 "uploaded-wbs":{file:"../../projects/generic/uploaded-wbs.json",project:"UPLOADED_WBS_V1"},
 "community-clinic":{file:"../../projects/generic/community-clinic.json",project:"DEMO_CLINIC"},
 "pedestrian-bridge":{file:"../../projects/generic/pedestrian-bridge.json",project:"DEMO_BRIDGE"}
});
const modes=["activities","calendar","dependencies"];
const validISO=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"));
const utc=s=>new Date(s+"T00:00:00Z").getTime();
const addDays=(day,n)=>new Date(utc(day)+n*86400000).toISOString().slice(0,10);
const nice=s=>validISO(s)?new Date(utc(s)).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"2-digit",timeZone:"UTC"}):"—";
const fmtDay=s=>new Date(utc(s)).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric",timeZone:"UTC"});
const el=(tag,cls,label)=>{
 const e=document.createElement(tag);if(cls)e.className=cls;
 if(label!==undefined)e.textContent=String(label);return e;
};
const put=(parent,tag,cls,label)=>{const e=el(tag,cls,label);parent.append(e);return e;};
const link=(parent,title,path)=>{const a=put(parent,"a","",title);a.href=path;return a};
const td=(tr,cls,value)=>put(tr,"td",cls,value);
const daysBetween=(a,b)=>Math.round((utc(b)-utc(a))/86400000);
export function inspectDeskModel(model){
 validateGenericViewModel(model);
 const ids=new Set(model.activities.map(a=>a.id));
 if(model.activities.some(a=>a.engineering_release!==false||a.status!=="CALCULATED_DRAFT_NOT_ACTUAL"))
  throw Error("Desk cannot admit work-completion claims");
 if(model.links.some(e=>!ids.has(e.from)||!ids.has(e.to)||
   !["FS","SS","FF","SF"].includes(e.type||"FS")||
   (e.lag!==undefined&&!Number.isFinite(e.lag))))
  throw Error("Desk relationship source not verified");
 return true;
}
export function linkContext(model,id){
 inspectDeskModel(model);
 if(!model.activities.some(a=>a.id===id))throw Error("Unknown activity ID");
 const byId=new Map(model.activities.map(a=>[a.id,a]));
 const predecessors=model.links.filter(e=>e.to===id).map(e=>({...e,other:byId.get(e.from)}));
 const successors=model.links.filter(e=>e.from===id).map(e=>({...e,other:byId.get(e.to)}));
 return {predecessors,successors,release:"NOT_VERIFIED",site_complete:false};
}
export function monthDays(year,monthIndex){
 if(!Number.isInteger(year)||year<1970||year>2100||!Number.isInteger(monthIndex)||monthIndex<0||monthIndex>11)
  throw Error("Calendar year/month out of range");
 return new Date(Date.UTC(year,monthIndex+1,0)).getUTCDate();
}
export function activeInDay(activity,day){
 return validISO(activity.start_date)&&validISO(activity.finish_date)&&
 activity.start_date<=day&&day<activity.finish_date;
}
export function scheduleWindow(model){
 inspectDeskModel(model);
 const dated=model.activities.filter(a=>validISO(a.start_date)&&validISO(a.finish_date)&&a.finish_date>=a.start_date);
 if(!dated.length)return null;
 const start=dated.reduce((v,a)=>a.start_date<v?a.start_date:v,dated[0].start_date);
 const finish=dated.reduce((v,a)=>a.finish_date>v?a.finish_date:v,dated[0].finish_date);
 return {start,finish,days:Math.max(1,daysBetween(start,finish))};
}
function labelStatus(){
 return "PLANNING ONLY";
}
function createHeader(mount,model){
 const header=put(mount,"header","desk-hero");
 const crumb=put(header,"div","desk-breadcrumb");
 link(crumb,"Projects","../");put(crumb,"span","","/");
 if(model.project.id==="PRJ-000007")
  link(crumb,"Narayani project","../../projects/fishtail/narayani-parajuli-residence/");
 else link(crumb,"Source examples","../../more/#historical");
 put(crumb,"span","","/ Scheduling desk");
 put(header,"h1","",model.project.name+" · Scheduling desk");
 put(header,"p","","Activity IDs, WBS membership, scenario durations and dates are shown alongside the aligned Gantt. This is a read-only planning scenario, not an approved baseline or actual site record.");
 const bar=put(header,"div","desk-source");
 bar.textContent="SOURCE STATUS: "+model.classification+" · "+model.activities.length+
  " activities · "+model.links.length+" dependencies · NO authenticated activity completion or site release.";
 return header;
}
function timeAxis(windowInfo,scale){
 const px=scale==="day"?27:scale==="week"?11:3.5;
 const w=Math.max(450,Math.ceil(windowInfo.days*px)+2);
 const slices=[];
 if(scale==="day"&&windowInfo.days<=240){
  for(let i=0;i<windowInfo.days;i+=7)
   slices.push({left:i*px,width:Math.min(7,windowInfo.days-i)*px,label:nice(addDays(windowInfo.start,i))});
 }else{
  let year=+windowInfo.start.slice(0,4),month=+windowInfo.start.slice(5,7)-1;
  while(year<+windowInfo.finish.slice(0,4)+1){
   const thisMonth=new Date(Date.UTC(year,month,1)).toISOString().slice(0,10);
   const next=new Date(Date.UTC(year,month+1,1)).toISOString().slice(0,10);
   const offset=daysBetween(windowInfo.start,thisMonth);
   const endOffset=daysBetween(windowInfo.start,next);
   const left=Math.max(0,offset)*px;
   const width=Math.max(0,Math.min(windowInfo.days,endOffset)-Math.max(0,offset))*px;
   if(width>0)slices.push({left,width,label:new Date(utc(thisMonth)).toLocaleDateString("en-GB",{month:"short",year:"numeric",timeZone:"UTC"})});
   if(next>windowInfo.finish)break;
   month++;if(month===12){month=0;year++;}
  }
 }
 return {w,px,slices};
}
function setupActivityTable(container,model,state,showDetails){
 const controls=put(container,"div","desk-controls");
 const searchlabel=put(controls,"label","","Search");
 const search=put(searchlabel,"input","","");
 search.type="search";search.placeholder="Activity ID or name";search.setAttribute("aria-label","Filter activities");
 const wbslabel=put(controls,"label","","WBS");
 const wbs=put(wbslabel,"select");
 const all=put(wbs,"option","","All WBS branches");all.value="ALL";
 for(const item of model.wbs){const opt=put(wbs,"option","",item.title);opt.value=item.id;}
 const scalelabel=put(controls,"label","","Timescale");
 const scale=put(scalelabel,"select");scale.setAttribute("aria-label","Timeline timescale");
 for(const [v,n] of [["month","Months"],["week","Weeks"],["day","Days"]]){
  const opt=put(scale,"option","",n);opt.value=v;
 }
 const counter=put(controls,"small","","");
 const arrowsLabel=put(controls,"label","","Relationship arrows");
 const arrows=put(arrowsLabel,"select");arrows.setAttribute("aria-label","Gantt relationship arrows");
 for(const [id,title] of [["selected","Selected activity"],["all","All visible links"],["none","Hide arrows"]]){
  const option=put(arrows,"option","",title);option.value=id;
 }
 arrows.value="selected";
 const wrap=put(container,"div","desk-table-scroll");
 wrap.tabIndex=0;wrap.setAttribute("aria-label","Scrollable activity table and aligned Gantt");
 const jumping=put(container,"div","desk-mobile-jumps");
 const toTable=put(jumping,"button","","← Activity columns");
 toTable.type="button";toTable.addEventListener("click",()=>wrap.scrollTo({left:0,behavior:"smooth"}));
 const toGantt=put(jumping,"button","","Gantt + arrows →");
 toGantt.type="button";toGantt.addEventListener("click",()=>{
  const head=wrap.querySelector(".desk-chart-head");
  if(head)wrap.scrollTo({left:Math.max(0,head.offsetLeft-115),behavior:"smooth"});
 });
 put(jumping,"span","","Swipe sideways for eight columns and the bar chart.");
 const note=put(container,"div","desk-axis","","");
 note.textContent="Table: eight required fields BEFORE the bar timeline. 'Finish*' is the source's exclusive scenario finish boundary; actual dates, remaining duration and total float are not verified.";
 const reference=new Map(model.activities.map(a=>[a.id,a]));
 const wbsMap=new Map(model.wbs.map(p=>[p.id,p.title]));
 const win=scheduleWindow(model);
 let filtered=[];
 function render(){
  const previousLeft=wrap.scrollLeft,previousTop=wrap.scrollTop;
  wrap.replaceChildren();
  const table=put(wrap,"table","desk-table");
  const head=put(table,"thead");const tr=put(head,"tr");
  const columns=[
   ["Activity ID","desk-col-id"],["Activity name","desk-col-title"],
   ["WBS","desk-col-wbs"],["Original duration","desk-col-dur"],
   ["Start","desk-col-date"],["Finish*","desk-col-date"],
   ["Status","desk-col-status"],["Predecessors","desk-col-prev"]
  ];
  for(const [label,cls] of columns)put(tr,"th",cls,label);
  const axis=win?timeAxis(win,scale.value):null;
  const chartHeader=put(tr,"th","desk-chart-head");
  chartHeader.style.minWidth=(axis?.w||450)+"px";
  chartHeader.setAttribute("scope","col");
  chartHeader.setAttribute("aria-label","Aligned Gantt timeline, "+scale.value+" timescale");
  if(axis)for(const d of axis.slices){
   const b=put(chartHeader,"span","desk-scale",d.label);
   b.style.left=d.left+"px";b.style.width=d.width+"px";
  }
  else chartHeader.textContent="No dated scenario";
  const body=put(table,"tbody");
  const needle=search.value.trim().toLowerCase();
  filtered=model.activities.filter(a=>(wbs.value==="ALL"||wbs.value===a.wbs_id)&&
   (!needle||[a.id,a.title,wbsMap.get(a.wbs_id)||""].some(x=>String(x).toLowerCase().includes(needle))));
  counter.textContent=filtered.length+" of "+model.activities.length+" activities";
  for(const a of filtered){
   const row=put(body,"tr");row.tabIndex=0;
   row.setAttribute("aria-selected",String(state.selected===a.id));
   row.setAttribute("aria-label","Select "+a.id+" "+a.title);
   td(row,"desk-col-id",a.id);
   td(row,"desk-col-title",a.title);
   td(row,"desk-col-wbs",wbsMap.get(a.wbs_id)||a.wbs_id);
   td(row,"desk-col-dur",Number.isFinite(a.duration)?a.duration+" working days":"Not supplied");
   td(row,"desk-col-date",nice(a.start_date));
   td(row,"desk-col-date",nice(a.finish_date));
   td(row,"desk-col-status",labelStatus());
   const pres=model.links.filter(e=>e.to===a.id).map(e=>e.from);
   td(row,"desk-col-prev",pres.length?pres.join(", "):"—");
   const chart=td(row,"desk-timeline");
   const track=put(chart,"div","desk-chart-track");track.style.width=(axis?.w||450)+"px";
   if(axis&&validISO(a.start_date)&&validISO(a.finish_date)){
    const start=Math.max(0,daysBetween(win.start,a.start_date)),end=Math.max(start,daysBetween(win.start,a.finish_date));
    const bar=put(track,"div","desk-bar"+(a.duration===0?" desk-milestone":"")+
      (state.selected===a.id?" desk-selected":""));
    bar.style.left=(start*axis.px)+"px";
    bar.style.width=Math.max(5,(end-start)*axis.px)+"px";
    bar.title=a.id+" "+a.title+" | "+nice(a.start_date)+" → "+nice(a.finish_date)+" (exclusive)";
   }
   const choose=()=>{
    state.selected=a.id;
    showDetails();
    render();
   };
   row.addEventListener("click",choose);
   row.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose();}});
  }
  wrap.scrollLeft=previousLeft;wrap.scrollTop=previousTop;
  if(axis&&filtered.length&&typeof requestAnimationFrame==="function"){
   requestAnimationFrame(()=>{
    if(!body.isConnected)return;
    const summary=drawGanttConnectors({table,body,axis,win,model,filtered,selected:state.selected,scope:arrows.value});
    counter.textContent=filtered.length+" of "+model.activities.length+" activities · "+summary.visible+" arrows";
   });
  }
 }
 search.addEventListener("input",render);wbs.addEventListener("change",render);
 scale.addEventListener("change",render);arrows.addEventListener("change",render);
 render();
 return {render};
}
function prepareEvents(model){
 const events=new Map();
 for(const a of model.activities){
  for(const [date,kind] of [[a.start_date,"START"],[a.finish_date,"FINISH BOUNDARY"]]){
   if(!validISO(date))continue;
   if(!events.has(date))events.set(date,[]);
   events.get(date).push({a,kind});
  }
 }
 return events;
}
function renderYearCalendar(container,model,state,select){
 const events=prepareEvents(model);
 const top=put(container,"div","desk-calendar-header");
 const title=put(top,"h2","","");
 const prev=put(top,"button","","← Previous year");
 const next=put(top,"button","","Next year →");
 const year=put(top,"span","desk-status","");
 const months=put(container,"div","desk-months");
 const dayDetail=put(container,"section","desk-day-list");
 dayDetail.setAttribute("aria-label","Selected calendar date detail");
 function renderDay(day){
  dayDetail.replaceChildren();
  put(dayDetail,"h3","",fmtDay(day));
  const worklist=put(dayDetail,"div","desk-worklist");
  const active=model.activities.filter(a=>activeInDay(a,day));
  const event=events.get(day)||[];
  const unique=[...new Map([...active,...event.map(x=>x.a)].map(a=>[a.id,a])).values()];
  if(!unique.length)put(dayDetail,"p","","No scheduled scenario activity for this day.");
  for(const a of unique){
   const b=put(worklist,"button");
   b.type="button";put(b,"strong","",a.id+" · "+a.title);
   const kinds=event.filter(x=>x.a.id===a.id).map(x=>x.kind).join(" / ");
   put(b,"small","",kinds||"Scenario active · not actual progress");
   b.addEventListener("click",()=>select(a.id));
  }
 }
 function render(){
  months.replaceChildren();
  title.textContent="January–December "+state.year;
  year.textContent="Gregorian dates · planning scenario, not actual site attendance";
  for(let month=0;month<12;month++){
   const cell=put(months,"section","desk-month");
   put(cell,"h3","",new Date(Date.UTC(state.year,month,1)).toLocaleDateString("en-GB",{month:"long",timeZone:"UTC"}));
   const week=put(cell,"div","desk-week-days");
   for(const d of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])put(week,"span","",d);
   const days=put(cell,"div","desk-days");
   const first=(new Date(Date.UTC(state.year,month,1)).getUTCDay()+6)%7;
   for(let i=0;i<first;i++){const blank=put(days,"button","desk-day");blank.disabled=true;blank.setAttribute("aria-hidden","true");}
   for(let d=1;d<=monthDays(state.year,month);d++){
    const date=new Date(Date.UTC(state.year,month,d)).toISOString().slice(0,10);
    const count=events.get(date)?.length||0;
    const b=put(days,"button","desk-day");
    b.setAttribute("data-count",String(count));b.setAttribute("aria-pressed",String(state.day===date));
    b.setAttribute("aria-label",fmtDay(date)+", "+count+" scenario boundary events");
    put(b,"strong","",String(d));
    if(count)put(b,"small","",count+" event"+(count===1?"":"s"));
    b.addEventListener("click",()=>{state.day=date;render();renderDay(date)});
   }
  }
 }
 prev.addEventListener("click",()=>{state.year--;state.day=state.year+"-01-01";render();renderDay(state.day)});
 next.addEventListener("click",()=>{state.year++;state.day=state.year+"-01-01";render();renderDay(state.day)});
 render();renderDay(state.day);
}
function renderRelatives(container,title,items,callback){
 const card=put(container,"section","desk-link-card");
 put(card,"h3","",title+" ("+items.length+")");
 if(!items.length)put(card,"p","","None recorded in the published schedule network.");
 for(const edge of items){
  const r=put(card,"div","desk-link-row");
  const b=put(r,"button","desk-rel-button",edge.other.id+" · "+edge.other.title);
  b.type="button";b.style.cssText="border:0;background:transparent;text-align:left;color:#067d83;cursor:pointer;font:inherit;font-weight:750;padding:2px 0";
  b.addEventListener("click",()=>callback(edge.other.id));
  put(r,"small","","Relation: "+(edge.type||"FS")+" · Lag "+(edge.lag||0)+" · Actual completion NOT VERIFIED");
 }
 return card;
}
function renderDependencyPanel(container,model,state,select){
 container.replaceChildren();
 const controls=put(container,"div","desk-controls");
 const label=put(controls,"label","","Activity");
 const picker=put(label,"select");
 picker.setAttribute("aria-label","Selected activity for predecessor and successor inspection");
 for(const a of model.activities){
  const o=put(picker,"option","",a.id+" · "+a.title);
  o.value=a.id;
 }
 picker.value=state.selected;
 picker.addEventListener("change",()=>select(picker.value));
 put(controls,"small","","Choose an activity to show direct before/current/after work. No dependencies are auto-released.");
 const cards=put(container,"div","desk-link-grid");
 const links=linkContext(model,state.selected),activity=model.activities.find(a=>a.id===state.selected);
 renderRelatives(cards,"WEST · Prerequisites / Before",links.predecessors,select);
 const current=put(cards,"section","desk-link-card");
 put(current,"h3","","CENTRE · Current activity");
 put(current,"strong","",activity.id+" · "+activity.title);
 put(current,"p","","WBS "+activity.wbs_id+" · "+(Number.isFinite(activity.duration)?activity.duration+" scenario workdays":"Duration not available"));
 put(current,"p","","Start "+nice(activity.start_date)+" · Finish boundary "+nice(activity.finish_date));
 put(current,"p","", "STATUS: NOT VERIFIED · No actual completion, hold-point clearance or authorized release.");
 renderRelatives(cards,"EAST · Follow-on / After",links.successors,select);
 const guide=put(container,"div","desk-workflow-guide");
 put(guide,"strong","","SOUTH · Construction release is a separate decision");
 put(guide,"p","","A valid FS/SS/FF/SF link governs planning relationships. It cannot certify concrete strength, accepted inspections, field completion, handovers or permits. All successors remain unapproved until authenticated actual and hold-point evidence is separately admitted.");
}
function renderSouth(container,model,state){
 container.replaceChildren();
 const activity=model.activities.find(a=>a.id===state.selected);
 if(!activity)return;
 const head=put(container,"div","desk-ribbon desk-south");
 put(head,"span","","SOUTH · Primavera-style Activity Details · "+activity.id+" · "+activity.title);
 const tabs=put(container,"nav","desk-detail-tabs");tabs.setAttribute("role","tablist");
 tabs.setAttribute("aria-label","Selected activity details");
 const views=["General","Status","Resources","Predecessors","Successors","Constraints","Quantities","Steps & Notes"];
 const panel=put(container,"section","desk-detail-body");
 function kv(parent,records){
  const dl=put(parent,"dl","desk-kv");
  for(const [key,value] of records){
   put(dl,"dt","",key);
   put(dl,"dd","",String(value));
  }
 }
 function listRelations(parent,title,rows){
  put(parent,"h3","",title);
  if(!rows.length)put(parent,"p","","No declared relationship in the published source for this activity.");
  const list=put(parent,"div","desk-relations-list");
  for(const edge of rows){
   const card=put(list,"article","desk-relation-detail");
   put(card,"strong","",edge.other.id+" · "+edge.other.title);
   put(card,"span","", (edge.type||"FS")+" · Lag "+(edge.lag||0)+" nominal workdays");
   put(card,"small","","Actual predecessor/successor completion: NOT VERIFIED");
  }
 }
 const context=linkContext(model,activity.id);
 function showDetail(name){
  state.detailTab=name;
  panel.replaceChildren();
  for(const button of tabs.querySelectorAll("button"))
   button.setAttribute("aria-selected",String(button.dataset.detail===name));
  put(panel,"h2","",activity.id+" · "+activity.title);
  if(name==="General"){
   kv(panel,[["Activity ID",activity.id],["Activity name",activity.title],["WBS",activity.wbs_id],
    ["Original duration",activity.duration+" nominal workday slots"],["Activity type",activity.duration===0?"Milestone":"Planning activity"],
    ["Scenario start",nice(activity.start_date)],["Scenario finish*",nice(activity.finish_date)],
    ["Project",model.project.id],["Schedule basis",model.planning_status||"Source-pinned scenario"]]);
  }else if(name==="Status"){
   kv(panel,[["Activity status","NOT ACTUALLY VERIFIED"],["Actual start","No verified report"],
    ["Actual finish","No verified report"],["Remaining duration","Not verified"],
    ["Physical % complete","Not admitted"],["Approved baseline","NO"],
    ["Activity completion release","NOT AUTHORIZED"]]);
   put(panel,"p","desk-detail-warning","Do not infer actual progress from an unapproved source-planning bar.");
  }else if(name==="Resources"){
   put(panel,"p","desk-detail-warning","No source-approved workforce, equipment, cost or resource assignment has been admitted for this activity.");
   kv(panel,[["Assigned people","No reviewed roster"],["Primary resource","Not verified"],
    ["Tools and equipment","Not verified"],["Crew-hours","Not verified"],
    ["Resource units / time","Not verified"],["Actual productivity","Not measured"],
    ["Cost and materials","Not verified"]]);
   const a=put(panel,"a","","Open shared BOQ / work-rate calculator →");
   a.href=new URL("../../work-items/productivity.html",import.meta.url).href;
   put(panel,"p","desk-muted","Use the reference coefficients only as provisional BOQ comparisons; never treat them as approved assignments or change this source schedule automatically.");
  }else if(name==="Predecessors"){
   listRelations(panel,"Previous work to inspect",context.predecessors);
  }else if(name==="Successors"){
   listRelations(panel,"Follow-on work to inspect",context.successors);
  }else if(name==="Constraints"){
   kv(panel,[["Start constraint","No authoritative constraint imported"],
    ["Finish constraint","No authoritative constraint imported"],
    ["Total float","Not established by project-approved schedule"],
    ["Site condition / access","Not verified"],["Permit release","Not verified"],
    ["Inspection / test hold","Not verified"]]);
  }else if(name==="Quantities"){
   put(panel,"p","desk-detail-warning","No source-verified BOQ quantities, measured quantities, rates or item-specific resource crews are joined to this activity yet.");
   kv(panel,[["BOQ item key","Not mapped"],["Contract unit","Not mapped"],
    ["Required quantity","Not measured"],["Planned output / day","Not admitted"],
    ["Achieved output / day","Not measured"],["Efficiency vs benchmark","Not measured"]]);
  }else{
   put(panel,"p","","Step-by-step checklists and site-preparation reports are preserved only as historical, reported-only source records.");
   kv(panel,[["Inspection signoff","NOT VERIFIED"],["Reported checklist states","Reported, not approved"],
    ["Source SHA-256",model.input_sha256],["Work release","NOT AUTHORIZED"]]);
   if(model.project.id==="PRJ-000007"){
    const link=put(panel,"a","","Original Narayani reported-only checklist archive →");
    link.href=new URL("../../projects/narayani/visual.html#checklist",import.meta.url).href;
   }
  }
 }
 for(const name of views){
  const button=put(tabs,"button","desk-detail-tab",name);
  button.type="button";button.dataset.detail=name;button.setAttribute("role","tab");
  button.addEventListener("click",()=>showDetail(name));
 }
 showDetail(views.includes(state.detailTab)?state.detailTab:"General");
}
export function renderSchedulingDesk(model,mount,options={}){
 inspectDeskModel(model);
 mount.replaceChildren();
 createHeader(mount,model);
 const ribbon=put(mount,"div","desk-ribbon");
 put(ribbon,"span","","NORTH · View controls");
 put(ribbon,"span","","ONE source-bound model · NO write actions");
 const modesNav=put(mount,"div","desk-modes");
 modesNav.setAttribute("role","tablist");modesNav.setAttribute("aria-label","Scheduling desk views");
 const panelMap=new Map(),btnMap=new Map();
 for(const [mode,title] of [["activities","Activities + Gantt"],["calendar","Year calendar"],["dependencies","Before / Current / After"]]){
  const b=put(modesNav,"button","",title);b.type="button";b.setAttribute("role","tab");
  b.addEventListener("click",()=>choose(mode));
  btnMap.set(mode,b);
  const panel=put(mount,"section","desk-surface");
  panel.setAttribute("role","tabpanel");
  panel.dataset.deskView=mode;panel.hidden=true;panelMap.set(mode,panel);
 }
 const state={selected:model.activities[0].id,year:+(scheduleWindow(model)?.start||"2026-01-01").slice(0,4),
  day:scheduleWindow(model)?.start||"2026-01-01"};
 const first=panelMap.get("activities");
 put(first,"div","desk-ribbon","","");
 first.querySelector(".desk-ribbon").textContent="WEST · Activity data (8 columns)  |  EAST · Aligned Gantt timeline";
 const south=put(first,"div","desk-south-wrap");
 const details=put(first,"div");
 const table=setupActivityTable(south,model,state,()=>{renderSouth(details,model,state);});
 renderSouth(details,model,state);
 renderYearCalendar(panelMap.get("calendar"),model,state,(id)=>select(id));
 function select(id){
  if(!model.activities.some(a=>a.id===id))throw Error("Unknown selected activity");
  state.selected=id;
  table.render();renderSouth(details,model,state);
  renderDependencyPanel(panelMap.get("dependencies"),model,state,select);
 }
 renderDependencyPanel(panelMap.get("dependencies"),model,state,select);
 function choose(mode){
  if(!modes.includes(mode))mode="activities";
  for(const key of modes){panelMap.get(key).hidden=key!==mode;btnMap.get(key).setAttribute("aria-selected",String(key===mode));}
  if(mode==="activities")table.render(); // Recompute arrow coordinates after unhiding the Gantt panel.
  if(mode==="dependencies")renderDependencyPanel(panelMap.get(mode),model,state,select);
  if(options.updateHash!==false)history.replaceState(null,"","#"+mode);
 }
 choose(modes.includes(location.hash.slice(1))?location.hash.slice(1):"activities");
 window.addEventListener("hashchange",()=>choose(modes.includes(location.hash.slice(1))?location.hash.slice(1):"activities"));
 return {select,choose,state};
}
export async function bootSchedulingDesk(doc=document){
 const mount=doc.getElementById("scheduling-desk");
 if(!mount)return false;
 try{
  const key=doc.body.dataset.scheduleProject;
  const config=allowed[key];if(!config)throw Error("Unregistered schedule model");
  const res=await fetch(new URL(config.file,import.meta.url),{cache:"no-store"});
  if(!res.ok)throw Error("Verified public source model unavailable: "+res.status);
  const raw=await res.json();
  const model=config.governed?adaptNarayaniPublicModel(raw):raw;
  if(model.project.id!==config.project)throw Error("Wrong project source");
  inspectDeskModel(model);
  renderSchedulingDesk(model,mount);
  return true;
 }catch(e){mount.replaceChildren();put(mount,"div","desk-source","SCHEDULING DESK HELD: "+e.message);return false;}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootSchedulingDesk(),{once:true});
 else bootSchedulingDesk();
}
