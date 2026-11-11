import {drawGanttConnectors} from "./gantt-dependencies.mjs";
import {applySaturdayHouseScenario,isHouseWorkDay,REFERENCE_HOUSE_CALENDAR} from "../reference/house-saturday-calendar.mjs";
import {validateDraftResourceRoster,resourceRowsForSelected} from "../reference/selected-resource-drafts.mjs";
import {validateMaterialCatalog,projectMaterialScopes} from "../reference/material-planner.mjs";
import {adaptNarayaniPublicModel} from "./narayani-beta-adapter.mjs";
import {validateGenericViewModel} from "./generic-views.mjs";
/* One read-only operational scheduling desk for 4 source-validated published
 * examples. The organic constellation and generic checklist are legacy only.
 * A view never changes an original activity or invents a construction release. */
const allowed=Object.freeze({
 "narayani":{file:"../../projects/narayani/project-model.json",governed:true,project:"PRJ-000007",resource_drafts:"../../work-items/narayani-resource-scenarios.v1.json",materials:"../../work-items/material-references.v1.json",material_boq:"../../work-items/productivity-norms.v1.json"},
 "uploaded-wbs":{file:"../../projects/generic/uploaded-wbs.json",project:"UPLOADED_WBS_V1"},
 "community-clinic":{file:"../../projects/generic/community-clinic.json",project:"DEMO_CLINIC"},
 "pedestrian-bridge":{file:"../../projects/generic/pedestrian-bridge.json",project:"DEMO_BRIDGE"}
});
const modes=["activities","calendar"];
const validISO=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
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
 activity.start_date<=day&&day<activity.finish_date&&isHouseWorkDay(day);
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
 for(const [id,title] of [["selected","Selected activity"],["all","All relationship lines"],["none","Hide relationship lines"]]){
  const option=put(arrows,"option","",title);option.value=id;
 }
 arrows.value="selected";
 const allLabel=put(controls,"label","desk-all-links-toggle","Show all visible links");
 const allToggle=put(allLabel,"input");
 allToggle.type="checkbox";allToggle.checked=false;
 allToggle.setAttribute("aria-label","Show all dependency relationship lines at once");
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
 put(jumping,"span","","Swipe sideways for seven fields and the aligned bar chart.");
 const note=put(container,"div","desk-axis","","");
 note.textContent="Table: seven planning fields before the bar timeline; repetitive Status is in Activity Details only. Finish* is the exclusive scenario finish boundary; actual completion is not verified.";
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
   ["Predecessors","desk-col-prev"]
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
 scale.addEventListener("change",render);
 arrows.addEventListener("change",()=>{allToggle.checked=arrows.value==="all";render();});
 allToggle.addEventListener("change",()=>{arrows.value=allToggle.checked?"all":"selected";render();});
 render();
 function revealSelected(){
  const index=filtered.findIndex(a=>a.id===state.selected);
  if(index>=0){
   const row=wrap.querySelectorAll("tbody tr")[index];
   if(row)wrap.scrollTop=Math.max(0,wrap.scrollTop+row.getBoundingClientRect().top-wrap.getBoundingClientRect().top-74);
  }
 }
 return {render,revealSelected};
}
/** Both the aligned Gantt bars and the Gregorian calendar come from the exact
 * same immutable, source-validated activity start/finish date fields. The
 * finish_date is an EXCLUSIVE finish boundary, never a day of ongoing work. */
export function calendarDaySnapshot(model,day,selectedId=null){
 if(!validISO(day))throw Error("Calendar date must be ISO YYYY-MM-DD");
 const working=[],boundary=[];
 for(const a of model.activities){
  const active=activeInDay(a,day);
  const begins=a.start_date===day,finishes=a.finish_date===day;
  if(active)working.push(a);
  if(begins)boundary.push({activity:a,type:"START"});
  if(finishes)boundary.push({activity:a,type:"FINISH_BOUNDARY"});
 }
 const all=new Map([...working,...boundary.map(x=>x.activity)].map(x=>[x.id,x]));
 return {
  day,working,events:boundary,items:[...all.values()],
  activeCount:working.length,boundaryCount:boundary.length,
  selectedWorking:working.some(a=>a.id===selectedId),
  selectedBoundary:boundary.some(e=>e.activity.id===selectedId),
  selectedScheduled:all.has(selectedId)
 };
}
function renderYearCalendar(container,model,state,select,openActivities){
 const top=put(container,"div","desk-calendar-header");
 const title=put(top,"h2","","");
 const prev=put(top,"button","","← Previous year");prev.type="button";
 const next=put(top,"button","","Next year →");next.type="button";
 const year=put(top,"span","desk-status","");
 const picked=put(container,"section","desk-calendar-selected");
 picked.setAttribute("aria-label","Selected activity shared by Gantt and calendar");
 const pickedLabel=put(picked,"div","desk-calendar-picked-info");
 const actions=put(picked,"div","desk-calendar-picked-actions");
 const locate=put(actions,"button","","Jump to selected activity");locate.type="button";
 const goToTable=put(actions,"button","","Open selected in Gantt + details →");goToTable.type="button";
 goToTable.addEventListener("click",openActivities);
 const legend=put(container,"p","desk-calendar-legend");
 legend.textContent="Saturday is a non-working day for this reference calendar. Each activity uses the same source work slots in the Gantt and calendar; non-Saturday date spans remain unapproved and are not proof of site attendance.";
 const months=put(container,"div","desk-months");
 const dayDetail=put(container,"section","desk-day-list");
 dayDetail.setAttribute("aria-label","Selected calendar day and scheduled activities");
 function selectedActivity(){return model.activities.find(a=>a.id===state.selected);}
 function selectedDay(){
  const a=selectedActivity();
  return validISO(a?.start_date)?a.start_date:
   validISO(a?.finish_date)?a.finish_date:
   validISO(state.day)?state.day:state.year+"-01-01";
 }
 function updateSelected(){
  pickedLabel.replaceChildren();
  const a=selectedActivity();
  if(!a){put(pickedLabel,"strong","","No selected activity");return;}
  put(pickedLabel,"strong","",a.id+" · "+a.title);
  put(pickedLabel,"span","","Source-derived date: "+nice(a.start_date)+
   " → "+nice(a.finish_date)+" (exclusive finish boundary)");
  put(pickedLabel,"small","","Selecting an activity in the Gantt chooses the SAME work here. One input model; no duplicate calendar entry.");
 }
 function renderDay(day){
  dayDetail.replaceChildren();
  if(!validISO(day))return;
  const snap=calendarDaySnapshot(model,day,state.selected);
  put(dayDetail,"h3","",fmtDay(day));
  put(dayDetail,"p","",snap.activeCount+" activity date ranges spanning this day · "+
    snap.boundaryCount+" source start/finish boundary events. "+
    (snap.selectedScheduled?"Selected activity is visible on this day.":""));
  const worklist=put(dayDetail,"div","desk-worklist");
  if(!snap.items.length)put(dayDetail,"p","","No source-scheduled activities for this date.");
  for(const a of snap.items){
   const b=put(worklist,"button");
   b.type="button";b.setAttribute("aria-pressed",String(a.id===state.selected));
   put(b,"strong","",a.id+" · "+a.title);
   const kinds=snap.events.filter(x=>x.activity.id===a.id).map(x=>x.type).join(" / ");
   put(b,"small","",kinds||"Scheduled scenario · not actual site progress");
   b.addEventListener("click",()=>select(a.id));
  }
 }
 function render({scrollMonth=false}={}){
  months.replaceChildren();
  title.textContent="January–December "+state.year;
  year.textContent="One source schedule · read-only Gregorian calendar";
  updateSelected();
  for(let month=0;month<12;month++){
   const cell=put(months,"section","desk-month");
   cell.dataset.month=String(month);cell.dataset.year=String(state.year);
   put(cell,"h3","",new Date(Date.UTC(state.year,month,1)).toLocaleDateString("en-GB",{month:"long",timeZone:"UTC"}));
   const week=put(cell,"div","desk-week-days");
   for(const d of ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])put(week,"span","",d);
   const days=put(cell,"div","desk-days");
   const first=(new Date(Date.UTC(state.year,month,1)).getUTCDay()+6)%7;
   for(let i=0;i<first;i++){
    const blank=put(days,"button","desk-day");blank.disabled=true;
    blank.setAttribute("aria-hidden","true");
   }
   for(let d=1;d<=monthDays(state.year,month);d++){
    const date=new Date(Date.UTC(state.year,month,d)).toISOString().slice(0,10);
    const snap=calendarDaySnapshot(model,date,state.selected);
    const b=put(days,"button","desk-day");b.type="button";
    if(!isHouseWorkDay(date)){b.dataset.holiday="saturday";b.title="Saturday · weekly holiday · no scheduled shift";}
    b.dataset.count=String(snap.activeCount);
    b.dataset.selectedWork=String(snap.selectedWorking);
    b.dataset.selectedBoundary=String(snap.selectedBoundary);
    b.setAttribute("aria-pressed",String(state.day===date));
    b.setAttribute("aria-label",fmtDay(date)+", "+snap.activeCount+
     " activity date ranges, "+snap.boundaryCount+" boundary events"+
     (snap.selectedScheduled?", selected activity here":""));
    put(b,"strong","",String(d));
    if(!isHouseWorkDay(date))put(b,"small","desk-calendar-holiday","Holiday");
    if(snap.activeCount)put(b,"small","",snap.activeCount+" planned");
    if(snap.boundaryCount)put(b,"small","desk-calendar-event-count",snap.boundaryCount+" event"+(snap.boundaryCount===1?"":"s"));
    if(snap.selectedWorking)put(b,"small","desk-calendar-selected-mark","● Selected");
    if(snap.selectedBoundary&&!snap.selectedWorking)put(b,"small","desk-calendar-boundary-mark","◆ Selected");
    b.addEventListener("click",()=>{
     state.day=date;render();renderDay(date);
    });
   }
  }
  renderDay(state.day);
  if(scrollMonth&&typeof requestAnimationFrame==="function")
   requestAnimationFrame(()=>{
    if(!container.isConnected||container.hidden)return;
    const month=Number(state.day.slice(5,7))-1;
    const section=[...months.children].find(x=>Number(x.dataset.month)===month);
    if(section&&typeof section.scrollIntoView==="function")
     section.scrollIntoView({behavior:"smooth",block:"start"});
   });
 }
 function followSelected({scroll=true}={}){
  const day=selectedDay();
  state.year=Number(day.slice(0,4));
  state.day=day;
  render({scrollMonth:scroll});
 }
 function changeYear(delta){
  const nextYear=state.year+delta;
  if(nextYear<1970||nextYear>2100)return;
  state.year=nextYear;state.day=String(nextYear)+"-01-01";
  render();
 }
 locate.addEventListener("click",()=>followSelected({scroll:true}));
 prev.addEventListener("click",()=>changeYear(-1));
 next.addEventListener("click",()=>changeYear(1));
 render();
 return {followSelected,render,renderDay};
}
function renderSouth(container,model,state,options={}){
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
   const resourceInfo=resourceRowsForSelected(model,options.resourceRoster??null,activity.id);
   put(panel,"p","desk-detail-warning","VERIFIED site assignments and measured BOQ quantities: NONE admitted. The five-person house baseline and source-graded material assemblies below are PLANNING REFERENCES, not issued-for-construction orders.");
   const baseline=put(panel,"section","desk-reference-baseline");
   put(baseline,"h3","","Standard house reference crew · not a verified assignment");
   const summary=put(baseline,"p","","2 skilled workers + 3 unskilled helpers · 8-hour Sunday–Friday working day · Saturday holiday. Concrete mixer (when required): 1 machine, up to 2 operating hours/day; vibrator/other portable equipment: up to 3 operating hours/day as-needed. Equipment hours are not eight-hour continuous shifts.");
   summary.setAttribute("role","note");
   if(resourceInfo.draft_rows.length){
    const legacy=put(panel,"details","desk-extra-crew");
    put(legacy,"summary","","Older activity-specific crew suggestions · inspect only (can exceed 2+3 baseline)");
    put(legacy,"h3","","Unapproved specialist roster · "+activity.id);
    const holder=put(legacy,"div","desk-resources-scroll");
    const table=put(holder,"table","desk-resources-table");
    const heading=put(table,"thead"),h=put(heading,"tr");
    for(const column of ["Resource name","Type","Proposed quantity","Unit","Evidence"])
     put(h,"th","",column);
    const body=put(table,"tbody");
    for(const resource of resourceInfo.draft_rows){
     const row=put(body,"tr");
     for(const value of [resource.name,resource.type==="LABOR"?"Labour":"Equipment",
       String(resource.quantity),resource.unit,"Illustrative · NOT assigned"])put(row,"td","",value);
    }
    const personCount=resourceInfo.draft_rows.filter(r=>r.unit==="person").reduce((total,r)=>total+r.quantity,0);
    const equipment=resourceInfo.draft_rows.filter(r=>r.unit!=="person");
    const previousSummary=put(legacy,"p","desk-crew-total");
    previousSummary.textContent="Previous alternative crew sketch: "+personCount+" people; "
      equipment.map(r=>r.quantity+" "+r.name+" ("+r.unit+")").join(", ")+
      (equipment.length?".": " no separate equipment specified.");
   }else if(resourceInfo.zero_duration_milestone){
    put(panel,"p","","Zero-duration milestone: no independent draft work crew. Review the prerequisites and evidence for its release.");
   }else{
    put(panel,"p","","No source-matched draft roster is available for this project/activity.");
   }
   if(model.project.id==="PRJ-000007"&&options.materialCatalog){
    const scope=projectMaterialScopes(options.materialCatalog,activity.id);
    put(panel,"h3","","Materials · reference items for "+activity.id);
    const intro=put(panel,"p","desk-muted","Work quantities are NOT imported for this activity. Listed numbers are per stated work unit, not quantities ordered for the site.");
    const materialLink=put(panel,"a","desk-material-link","Open Materials Planner and enter measured work quantity →");
    materialLink.href=new URL("../../work-items/materials.html?activity="+encodeURIComponent(activity.id),import.meta.url).href;
    if(scope.recipes.length){
     const div=put(panel,"div","desk-resources-scroll");
     const table=put(div,"table","desk-resources-table");
     const th=put(put(table,"thead"),"tr");
     for(const text of ["Assembly","Material","Reference per work unit","Unit","Project total"])
      put(th,"th","",text);
     const body=put(table,"tbody");
     for(const recipe of scope.recipes){
      for(const line of recipe.lines){
       const mat=options.materialCatalog.materials.find(m=>m.id===line.material_id);
       const row=put(body,"tr");
       const value=line.quantity_per_unit===null?"Requires BBS / approved drawing / product spec":
        Number(line.quantity_per_unit.toFixed(3)).toString();
       for(const item of [recipe.title+" / "+recipe.work_unit,mat?.name||line.material_id,
         value,line.unit,"NOT VERIFIED"])put(row,"td","",item);
      }
     }
    }else put(panel,"p","","No physical material assembly defined for this project WBS activity; do not assign a fabricated quantity.");
   }else if(model.project.id==="PRJ-000007")put(panel,"p","desk-detail-warning","Reference material catalog unavailable: no project total can be calculated.");
   kv(panel,[["Site-assigned crew","NOT VERIFIED"],["Measured materials and BOQ quantities","NOT IMPORTED"],
    ["Crew availability calendar","NOT VERIFIED"],["Unit basis","Per illustrative working shift; not total project demand"],
    ["Actual output or resource usage","NOT MEASURED"]]);
   const a=put(panel,"a","","Open shared work-output calculator →");
   a.href=new URL("../../work-items/productivity.html",import.meta.url).href;
   put(panel,"p","desk-muted","These names and numbers come from an explicitly separate unapproved reference crew roster. They do not overwrite source WBS activities, schedules, budget quantities or Google Drive records.");
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
 put(ribbon,"span","","ONE source-pinned schedule · SATURDAY HOLIDAY · 8h reference shift · 2 skilled + 3 helpers (draft) · NO write actions");
 const modesNav=put(mount,"nav","desk-modes");
 modesNav.setAttribute("role","tablist");
 modesNav.setAttribute("aria-label","Two scheduling desk views");
 const panelMap=new Map(),btnMap=new Map();
 for(const [mode,title] of [["activities","Activities + Gantt"],["calendar","Year calendar"]]){
  const b=put(modesNav,"button","",title);b.type="button";b.setAttribute("role","tab");
  b.addEventListener("click",()=>choose(mode));
  btnMap.set(mode,b);
  const panel=put(mount,"section","desk-surface");
  panel.setAttribute("role","tabpanel");
  panel.dataset.deskView=mode;panel.hidden=true;panelMap.set(mode,panel);
 }
 const windowInfo=scheduleWindow(model);
 const firstActivity=model.activities[0];
 const firstDay=validISO(firstActivity.start_date)?firstActivity.start_date:
    windowInfo?.start||"2026-01-01";
 const state={selected:firstActivity.id,year:Number(firstDay.slice(0,4)),
  day:firstDay,activeMode:"activities",detailTab:"General"};
 const first=panelMap.get("activities");
 const firstRibbon=put(first,"div","desk-ribbon");
 firstRibbon.textContent="WEST · Seven activity fields  |  EAST · Aligned Gantt  |  SOUTH · Resource, predecessor and successor details";
 const south=put(first,"div","desk-south-wrap");
 const details=put(first,"div");
 const table=setupActivityTable(south,model,state,()=>{renderSouth(details,model,state,options);});
 renderSouth(details,model,state,options);
 const calendar=renderYearCalendar(panelMap.get("calendar"),model,state,
  id=>select(id),()=>choose("activities"));
 function select(id){
  if(!model.activities.some(a=>a.id===id))throw Error("Unknown selected source activity");
  state.selected=id;
  table.render();
  renderSouth(details,model,state,options);
  if(state.activeMode==="calendar")calendar.render();
 }
 function choose(requested){
  const legacy=requested==="dependencies";
  const mode=modes.includes(requested)?requested:"activities";
  if(legacy)state.detailTab="Predecessors";
  const previous=state.activeMode;
  state.activeMode=mode;
  for(const key of modes){
   panelMap.get(key).hidden=key!==mode;
   btnMap.get(key).setAttribute("aria-selected",String(key===mode));
  }
  if(mode==="activities"){
   table.render(); // source selection remains synchronized between views
   renderSouth(details,model,state,options);
   if(previous==="calendar")table.revealSelected();
  }else{
   calendar.followSelected({scroll:true});
  }
  if(options.updateHash!==false&&typeof history!=="undefined")
   history.replaceState(null,"","#"+mode);
 }
 const requestedHash=typeof location!=="undefined"?location.hash.slice(1):"activities";
 choose(requestedHash);
 if(typeof window!=="undefined")window.addEventListener("hashchange",()=>{
  const next=location.hash.slice(1);
  choose(next);
 });
 return {select,choose,state,calendar,calendarPolicy:REFERENCE_HOUSE_CALENDAR};
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
  const sourceModel=config.governed?adaptNarayaniPublicModel(raw):raw;
  if(sourceModel.project.id!==config.project)throw Error("Wrong project source");
  inspectDeskModel(sourceModel);
  const model=applySaturdayHouseScenario(sourceModel,{anchor:config.governed?"2026-10-19":null});
  inspectDeskModel(model);
  const opts={};
  if(config.resource_drafts){
   try{
    const resourceResult=await fetch(new URL(config.resource_drafts,import.meta.url),{cache:"no-store"});
    if(!resourceResult.ok)throw Error("Public draft crew roster unavailable");
    const resourceRoster=await resourceResult.json();
    validateDraftResourceRoster(resourceRoster,model);
    opts.resourceRoster=resourceRoster;
   }catch(error){
    opts.resourceRoster=null;
    opts.resourceLoadIssue=error.message;
   }
  }
  if(config.materials&&config.material_boq){
   try{
    const [materialRes,boqRes]=await Promise.all([config.materials,config.material_boq]
     .map(path=>fetch(new URL(path,import.meta.url),{cache:"no-store"})));
    if(!materialRes.ok||!boqRes.ok)throw Error("Public material catalog is missing");
    const materialCatalog=await materialRes.json(),base=await boqRes.json();
    validateMaterialCatalog(materialCatalog,base,null);
    opts.materialCatalog=materialCatalog;
   }catch(error){opts.materialCatalog=null;opts.materialLoadIssue=error.message;}
  }
  renderSchedulingDesk(model,mount,opts);
  return true;
 }catch(e){mount.replaceChildren();put(mount,"div","desk-source","SCHEDULING DESK HELD: "+e.message);return false;}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootSchedulingDesk(),{once:true});
 else bootSchedulingDesk();
}
