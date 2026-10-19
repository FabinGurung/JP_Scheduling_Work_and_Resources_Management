// Single-source construction constellation. Browser reads ONLY project-model.json.
// No Google Drive / Slack credentials and no implicit completion write.
const $=id=>document.getElementById(id),SVG_NS="http://www.w3.org/2000/svg";
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n};
const svg=(tag,attributes={},text)=>{const n=document.createElementNS(SVG_NS,tag);for(const [key,v] of Object.entries(attributes))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;return n};
let model=null,selected=null,activeTab="constellation",phaseFilter="ALL",term="",monthOffset=0,anchor="2026-10-19",drag=null;
// A portrait phone must show usable nodes, not a 1600-unit-wide miniature.
function initialGraphViewport(){
 return window.matchMedia?.("(max-width: 720px)")?.matches?
  {x:0,y:0,w:490,h:690}:{x:0,y:0,w:1600,h:840};
}
let viewport=initialGraphViewport();
let graphWasPhone=window.innerWidth<=720;
let threeSession=null,threeOpening=false;
let previewSlot=-1,playTimer=null,previewMax=80;
function computePreviewMax(){
 const end=iso(plusMonthsExact(anchor,3));
 let n=0;while(n<110&&workday(n)<end)n++;
 previewMax=Math.min(n,110);
 $("timeline-position").max=String(previewMax);
}
function pausePreview(){if(playTimer!==null){clearInterval(playTimer);playTimer=null;}}
function updatePreview(){
 $("timeline-position").value=String(Math.max(0,previewSlot));
 $("timeline-readout").textContent=previewSlot<0?"Preview paused — no real progress implied":"Simulation "+workday(previewSlot)+" · synthetic sequence only";
 if(activeTab==="constellation")renderGraph();
 if(activeTab==="universe")threeSession?.preview(previewSlot);
 if(activeTab==="gantt"){
  const max=Math.max(...model.activities.map(a=>a.master_finish_exclusive_slot))+1;
  for(const p of document.querySelectorAll(".gantt-playhead")){p.hidden=previewSlot<0;p.style.left=100*Math.max(0,previewSlot)/max+"%";}
 }
}
function playPreview(){
 pausePreview();
 if(previewSlot<0||previewSlot>=previewMax)previewSlot=0;
 updatePreview();
 playTimer=setInterval(()=>{
  if(previewSlot>=previewMax){pausePreview();return}
  previewSlot++;updatePreview();
 },120);
}
const byId=()=>new Map(model.activities.map(a=>[a.id,a]));
const clean=x=>String(x).replace(/^Milestone:\s*/,"");
function utc(x){return new Date(x+"T00:00:00Z")}
function addMonths(x,n){const d=utc(x);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);return d}
function iso(d){return d.toISOString().slice(0,10)}
function plusMonthsExact(date,n){
 const d=utc(date);const t=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1));
 t.setUTCDate(Math.min(d.getUTCDate(),new Date(Date.UTC(t.getUTCFullYear(),t.getUTCMonth()+1,0)).getUTCDate()));
 return t;
}
function visibleDayLabels(items){
 if(items.length<=2)return items.map(a=>a.calendar_label);
 return [items[0].calendar_label,items[1].calendar_label,"+"+(items.length-2)+" more work"];
}
function preparationDay(a){return workday(Math.max(0,a.master_start_slot-a.preparation.lead_workdays))}
function preparingOnDay(a,day){return a.master_start_slot>0&&preparationDay(a)===day}
function workday(slot){
 const d=utc(anchor);while(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1);
 let i=0;while(i<slot){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0)i++}
 return iso(d)
}
function schedule(a){return {start:workday(a.master_start_slot),finish:workday(a.master_finish_exclusive_slot)}}
function status(a){return a.hold_ids.length||a.mcq_report_state==="BLOCKED"?"held":
 (a.reported_subwork_count||a.mcq_report_state&&a.mcq_report_state!=="NOT_STARTED")?"reported":"unverified"}
function setupPicker(){const pick=$("phase-picker");for(const p of model.phases){const o=el("option",p.title);o.value=p.id;pick.append(o)}}
function coordMap(){
 const maximum=Math.max(...model.activities.map(a=>a.master_finish_exclusive_slot),1);
 const phaseMap=new Map(model.phases.map((p,i)=>[p.id,i]));
 const grouped=new Map();
 return new Map(model.activities.map(a=>{
  const ph=phaseMap.get(a.phase_id),index=grouped.get(a.phase_id)||0;grouped.set(a.phase_id,index+1);
  // Relative-time horizontal distribution, recognizable phase lanes, stable ID positions.
  const center=a.type==="Milestone"?a.master_start_slot:(a.master_start_slot+a.master_finish_exclusive_slot)/2;
  return [a.id,{x:85+1430*center/maximum,y:72+ph*72+((index%4)-1.5)*10}];
 }));
}
function relatedIds(id){
 const ids=new Set([id]),pred=new Map(model.activities.map(a=>[a.id,a.predecessor_ids]));
 const queue=[id];while(queue.length){const n=queue.shift();for(const p of pred.get(n)||[])if(!ids.has(p)){ids.add(p);queue.push(p)}}
 // Neighboring future branches should glow as possible PLAN, not unlocked work.
 for(const a of model.activities)if(a.predecessor_ids.includes(id))ids.add(a.id);
 return ids;
}
function setViewport(){const g=$("graph");g.setAttribute("viewBox",[viewport.x,viewport.y,viewport.w,viewport.h].join(" "))}
function renderGraph(){
 const graph=$("graph"),coords=coordMap(),by=byId(),focus=selected?relatedIds(selected):new Set();
 graph.replaceChildren();
 for(const p of model.phases){
  const lane=model.phases.indexOf(p),y=72+lane*72;
  graph.append(svg("line",{x1:20,y1:y+32,x2:1580,y2:y+32,stroke:"#214063","stroke-width":1,opacity:.6}));
  graph.append(svg("text",{x:24,y:y-24,class:"wbs-guide"},p.title));
 }
 for(const link of model.links){
  const a=coords.get(link.from),b=coords.get(link.to),relevance=selected&&(link.to===selected||focus.has(link.to)&&focus.has(link.from));
  const start=a.x+12,end=b.x-12,dx=Math.max(22,(end-start)/2);
  const path=svg("path",{d:"M"+start+" "+a.y+" C"+(start+dx)+" "+a.y+" "+(end-dx)+" "+b.y+" "+end+" "+b.y,
   class:"graph-link"+(relevance?" related":"")+(by.get(link.to).hold_ids.length?" hold":"")+
   (previewSlot>=0&&by.get(link.from).master_start_slot<=previewSlot&&by.get(link.to).master_start_slot<=previewSlot?" preview-active":"")});
  graph.append(path);
 }
 for(const a of model.activities){
  const n=coords.get(a.id),dim=(phaseFilter!=="ALL"&&phaseFilter!==a.phase_id)||term&&!((a.title+" "+a.id).toLowerCase().includes(term));
  const cls="graph-node "+status(a)+(a.type==="Milestone"?" milestone":"")+
   (a.id===selected?" selected":focus.has(a.id)?" related":"")+
   (previewSlot>=a.master_start_slot&&(a.type==="Milestone"?previewSlot===a.master_start_slot:previewSlot<a.master_finish_exclusive_slot)?" preview-active":"");
  const g=svg("g",{class:cls,transform:"translate("+n.x+" "+n.y+")",tabindex:"0",role:"button","aria-label":a.id+" "+a.title,opacity:dim?.17:1});
  g.append(svg("circle",{class:"outer",r:a.type==="Milestone"?17:13}));
  g.append(svg("circle",{class:"dot",r:a.type==="Milestone"?6:4}));
  g.append(svg("text",{class:"label",x:0,y:-22,"text-anchor":"middle"},a.id));
  const title=svg("title",{},a.title+" — "+status(a));g.append(title);
  g.addEventListener("click",()=>{if(!drag?.moved)choose(a.id)});
  g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();choose(a.id)}});
  graph.append(g);
 }
 setViewport();
}
function focusGraphOn(id){
 const point=coordMap().get(id);if(!point)return;
 viewport.x=point.x-viewport.w/2;viewport.y=point.y-viewport.h/2;setViewport();
}
function changeZoom(factor){const cx=viewport.x+viewport.w/2,cy=viewport.y+viewport.h/2;
 viewport.w=Math.max(280,Math.min(2500,viewport.w*factor));
 viewport.h=Math.max(155,Math.min(1400,viewport.h*factor));
 viewport.x=cx-viewport.w/2;viewport.y=cy-viewport.h/2;setViewport();
}
function initPan(){
 const g=$("graph");
 g.addEventListener("wheel",e=>{e.preventDefault();changeZoom(e.deltaY>0?1.12:0.89)},{passive:false});
 g.addEventListener("pointerdown",e=>{if(e.button!==0)return;drag={startX:e.clientX,startY:e.clientY,x:viewport.x,y:viewport.y,moved:false};g.setPointerCapture(e.pointerId)});
 g.addEventListener("pointermove",e=>{if(!drag)return;const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(Math.abs(dx)+Math.abs(dy)>6)drag.moved=true;
  if(drag.moved){const box=g.getBoundingClientRect();viewport.x=drag.x-dx*viewport.w/box.width;viewport.y=drag.y-dy*viewport.h/box.height;setViewport();}
 });
 g.addEventListener("pointerup",()=>{if(drag)setTimeout(()=>{drag=null},10)});
 g.addEventListener("pointercancel",()=>drag=null);
}
function mcqRow(title,key,options,defaultCode="A"){
 const wrap=el("div",undefined,"question"),label=el("label",title),select=el("select",undefined,"control");
 select.setAttribute("aria-label",title);
 for(const o of options){const opt=el("option",o.code+" · "+o.label);opt.value=o.code;select.append(opt)}
 select.value=defaultCode;
 const btn=el("button","Copy Slack answer","btn");btn.type="button";
 btn.addEventListener("click",()=>copyAnswer(selected,key,select.value));
 wrap.append(label,select,btn);return wrap;
}
async function copyAnswer(id,check,answer){
 const reply="P=PRJ-000007 | A="+id+" | C="+check+" | Q="+answer;
 try{
  if(!navigator.clipboard?.writeText)throw Error("Clipboard not available");
  await navigator.clipboard.writeText(reply);
  $("copy-status").textContent="Copied. Paste into private #site-progress-mcq. This is a reported event, not engineering signoff.";
 }catch{$("copy-status").textContent="Copy manually: "+reply}
}
async function copyDrawingLookup(activity){
 // Public website never includes Drive IDs, source URLs or user credentials.
 // The engineer searches the governed PRIVATE crosswalk by WBS activity ID.
 const value="PRJ-000007 | ACTIVITY="+activity.id+" | REGISTER=Skyforge_WBS_Drawing_Crosswalk | ISSUE=VERIFY_WITH_DOCUMENT_CONTROLLER";
 try{
  if(!navigator.clipboard?.writeText)throw Error("Clipboard is unavailable");
  await navigator.clipboard.writeText(value);
  $("copy-status").textContent="Drawing lookup key copied. Search the private Narayani Project File Index crosswalk. Source references are candidates, not construction approvals.";
 }catch{$("copy-status").textContent="Copy lookup manually: "+value}
}
function onSmallScreen(){return window.matchMedia?.("(max-width: 990px)")?.matches??false}
function focusFieldPanel(){
 if(!onSmallScreen())return;
 const target=$("selected-title");
 if(target?.scrollIntoView)target.scrollIntoView({block:"start",behavior:"smooth"});
}
function renderDrawer(){
 const a=byId().get(selected);if(!a)return;
 $("selected-title").textContent=clean(a.title);
 $("selected-details").textContent=a.id+" · WBS "+a.phase_id+" · "+(a.type==="Milestone"?"Milestone":"Master duration "+a.master_work_slots+" workday slots")+" · "+status(a).toUpperCase()+" · Scenario "+schedule(a).start+" → "+schedule(a).finish+" (finish boundary)";
 const deps=$("selected-deps");deps.replaceChildren();
 const d=el("div",undefined,"dep"),heading=el("h3","What must happen before this?"),list=el("ul");
 if(a.predecessor_ids.length===0)list.append(el("li","No master predecessor defined"));
 for(const pred of a.predecessor_ids){const link=el("button",pred+" — "+clean(byId().get(pred).title),"btn");link.addEventListener("click",()=>choose(pred));const li=el("li");li.append(link);list.append(li)}
 d.append(heading,list);
 if(a.hold_ids.length){d.append(el("h3","HOLD — not authorized to proceed"));const holds=el("ul");
  for(const h of model.hold_points.filter(h=>a.hold_ids.includes(h.id)))holds.append(el("li",h.id+" · "+h.title));
  d.append(holds);
 }
 const successors=model.activities.filter(x=>x.predecessor_ids.includes(a.id));
 if(successors.length){
  const nextTitle=el("h3","What this work feeds into");
  const nextList=el("ul");
  for(const next of successors){
   const li=el("li"),b=el("button",next.id+" · "+next.calendar_label,"btn");
   b.title=next.title+" — not authorized to start";
   b.addEventListener("click",()=>choose(next.id));li.append(b);nextList.append(li);
  }
  d.append(nextTitle,nextList,el("p","Potential next WBS steps only. A reported-complete answer does not release a successor."));
 }
 deps.append(d);
 $("activity-mcq").replaceChildren(el("h3","Activity progress MCQ"), mcqRow("Choose the reported activity state","ACTIVITY",model.activity_options,model.activity_options.find(x=>x.state===a.mcq_report_state)?.code||"A"));
 const checks=$("checklist");checks.replaceChildren(el("h3","Work checklist · "+a.checklist.length+" checks"));
 checks.append(el("p","Expand only the work stage you need. MCQ reports remain unverified until accepted by a responsible authority."));
 if(a.field_brief){
  const brief=a.field_brief,guide=el("details",undefined,"question-group field-brief");
  guide.append(el("summary",(brief.basis==="NARAYANI_HOLD_AWARE_DRAFT"?"Project hold-aware field guide":"Phase preparation field guide")+" · expand"));
  guide.append(el("p","Draft learning guidance only — not an approved method statement, inspection release or schedule commitment."));
  for(const [key,label] of [["goal","Purpose"],["leads","Who coordinates"],["prepare","Before starting"],["execute","Execution sequence"],["inspect","Inspection and stop points"],["evidence","Evidence to capture"]]){
   const section=el("section",undefined,"brief-step");
   section.append(el("h4",label),el("p",brief[key]));guide.append(section);
  }
  checks.append(guide);
 }
 if(a.preparation){
  const p=a.preparation,packet=el("details",undefined,"question-group prepare-packet");
  packet.append(el("summary","2-day preparation · drawings, crew and materials"));
  packet.append(el("p","Illustrative only: effective drawings, quantities and work release are not verified."));
  for(const [key,label] of [["document_family","Drawing / source family"],["crew","Crew and supervision"],["materials","Materials to verify"],["equipment","Equipment to verify"],["stop_point","Inspection / stop point"]]){
   const section=el("section",undefined,"brief-step");
   section.append(el("h4",label),el("p",p[key]));packet.append(section);
  }
  packet.append(el("p","PRIVATE CROSSWALK: Narayani Project File Index → Skyforge_WBS_Drawing_Crosswalk → find "+a.id+". Linked source files are indexed candidates only, NOT approved construction drawings."));
  const lookup=el("button","Copy private drawing lookup key · "+a.id,"btn lookup-key");lookup.type="button";
  lookup.addEventListener("click",()=>copyDrawingLookup(a));packet.append(lookup);
  packet.append(el("p","The public website does not expose private Drive links or signoffs."));
  checks.append(packet);
 }
 const categories=[
  ["Before starting",["PRECONDITION"]],
  ["Prepare the crew",["PREPARATION"]],
  ["Execute the work",["EXECUTION","PHASE_SPECIFIC"]],
  ["Inspect & hand over",["QA_PENDING","HANDOFF"]]
 ];
 for(let i=0;i<categories.length;i++){
  const [name,kinds]=categories[i],matching=a.checklist.filter(q=>kinds.includes(q.category));
  if(!matching.length)continue;
  const group=el("details",undefined,"question-group");
  const summary=el("summary",name+" · "+matching.length+" checks");group.append(summary);
  if(i===0)group.open=true;
  for(const c of matching){
   const wrap=mcqRow(c.id+" · "+c.title,c.id,model.checklist_options,
    model.checklist_options.find(x=>x.state===c.status)?.code||"A");
   wrap.insertBefore(el("small",c.guidance),wrap.children[1]);group.append(wrap);
  }
  checks.append(group);
 }
  $("copy-status").textContent="";
}
function choose(id){selected=id;renderDrawer();renderGraph();threeSession?.select(id);if(activeTab==="gantt")renderGantt();focusFieldPanel()}
function renderGantt(){
 const body=$("gantt-scroll");body.replaceChildren();
 const related=selected?relatedIds(selected):new Set();
 const max=Math.max(...model.activities.map(a=>a.master_finish_exclusive_slot))+1,range=Math.max(max,1);
 const axis=el("div",undefined,"gantt-row gantt-axis");axis.append(el("div","Activity / phase","gantt-label"));
 const ticks=el("div",undefined,"gantt-track");
 for(let n=0;n<13;n++){const left=n/12*100;const txt=el("span",workday(Math.floor(range*n/12)));txt.style.cssText="position:absolute;left:"+left+"%;font-size:10px;color:#aec7e5;top:6px;transform:translateX(-50%)";ticks.append(txt)}
 axis.append(ticks);body.append(axis);
 for(const a of model.activities){
  const row=el("div",undefined,"gantt-row"+(a.id===selected?" active":"")+(selected&&a.id!==selected&&related.has(a.id)?" related":""));
  const label=el("div",a.id+" · "+clean(a.title),"gantt-label");label.title=a.title;label.addEventListener("click",()=>choose(a.id));row.append(label);
  const track=el("div",undefined,"gantt-track");
  const bar=el("button","", "gantt-bar "+(status(a)==="held"?"hold":status(a)==="reported"?"reported":""));
  bar.type="button";bar.title=a.id+" · "+a.title+" · "+schedule(a).start+" to "+schedule(a).finish;
  bar.style.left=(100*a.master_start_slot/range)+"%";bar.style.width=Math.max(0.35,100*Math.max(0.5,a.master_work_slots)/range)+"%";
  bar.setAttribute("aria-label",a.id+" "+a.title);bar.addEventListener("click",()=>choose(a.id));
  track.append(bar);
  if(a.type!=="Milestone"&&a.master_start_slot>0){
   const lead=Math.max(0,a.master_start_slot-a.preparation.lead_workdays);
   const cue=el("button","", "gantt-prep");cue.type="button";
   cue.title="Prepare "+a.calendar_label+" · "+a.preparation.document_family+" · hypothetical scenario";
   cue.setAttribute("aria-label","Prepare "+a.calendar_label);
   cue.style.left=100*lead/range+"%";cue.style.width=Math.max(.35,100*(a.master_start_slot-lead)/range)+"%";
   cue.addEventListener("click",()=>choose(a.id));track.append(cue);
  }
  const cursor=el("span",undefined,"gantt-playhead");cursor.style.left=(100*Math.max(0,previewSlot)/range)+"%";
  cursor.hidden=previewSlot<0;track.append(cursor);
  row.append(track);body.append(row);
 }
}
function activeOnDay(a,day){
 const {start,finish}=schedule(a);return a.type==="Milestone"?day===start:day>=start&&day<finish;
}
function renderCalendar(){
 const out=$("calendar-months");out.replaceChildren();
 // Four calendar-page blocks cover an actual rolling 3-month interval, including
 // the partial beginning and ending months, anchored at the scenario start.
 const start=plusMonthsExact(anchor,monthOffset),end=plusMonthsExact(iso(start),model.planning_scenario.horizon_months),boundary=end;
 for(let k=0;k<4;k++){
  const mo=addMonths(iso(start),k);
  const y=mo.getUTCFullYear(),m=mo.getUTCMonth(),numDays=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const card=el("section",undefined,"month");
  card.append(el("h3",mo.toLocaleDateString("en-US",{timeZone:"UTC",month:"long",year:"numeric"})));
  const grid=el("div",undefined,"days");
  for(const d of ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"])grid.append(el("div",d,"weekday"));
  for(let blank=0;blank<mo.getUTCDay();blank++)grid.append(el("div","","weekday"));
  for(let date=1;date<=numDays;date++){
   const day=iso(new Date(Date.UTC(y,m,date)));
   const inWindow=day>=iso(start)&&day<iso(end);
   const work=model.activities.filter(a=>activeOnDay(a,day));
   const prepare=model.activities.filter(a=>preparingOnDay(a,day));
   const b=el("button",undefined,"day"+(!inWindow?" inactive":"")+(day===anchor?" current":""));
   b.type="button";b.disabled=!inWindow;
   b.append(el("span",String(date),"day-number"));
   const labels=visibleDayLabels(work);
   const box=el("span",undefined,"day-work");
   for(const title of labels){
    const label=el("span",title,"day-label");
    if(work.some(a=>a.hold_ids.length))label.classList.add("held");
    if(work.some(a=>a.mcq_report_state==="REPORTED_COMPLETE"||a.mcq_report_state==="IN_PROGRESS"))label.classList.add("reported");
    box.append(label);
   }
   if(prepare.length&&inWindow)box.append(el("span","Prep: "+prepare[0].calendar_label+(prepare.length>1?" +"+(prepare.length-1):""),"day-prep"));
   if(work.length===0&&prepare.length===0&&inWindow)box.append(el("span","No task","day-empty"));
   b.append(box);
   b.title=day+(work.length?"\nWork: "+work.map(a=>a.id+" — "+a.title).join("\n"):"")+(prepare.length?"\nPrepare: "+prepare.map(a=>a.id+" — "+a.title).join("\n"):"");
   b.setAttribute("aria-label",day+" · "+work.length+" scenario activities · "+prepare.length+" preparation cues");
   b.addEventListener("click",()=>showDay(day,work,prepare));grid.append(b);
  }
  card.append(grid);out.append(card);
 }
 if(monthOffset===0)$("day-readout").textContent="Planning scenario window "+anchor+" through "+iso(boundary)+"; choose a date. All dates derive from master time slots, not Narayani's approved schedule.";
}
function showDay(day,items,prepare=[]){
 const box=$("day-readout");box.replaceChildren(el("strong",day+" · "+items.length+" template works · "+prepare.length+" prep cues. "));
 box.append(el("p","Synthetic scenario only: dates and preparation cues are not approved work, crew or purchasing orders."));
 for(const a of items){
  const reported=a.mcq_report_state?" [reported: "+a.mcq_report_state.replaceAll("_"," ").toLowerCase()+"]":"";
  const blocked=a.hold_ids.length?" [hold]":"";
  const b=el("button",a.id+" · "+clean(a.title)+reported+blocked,"btn");
  b.title="Phase "+a.phase_id+" · Full original WBS activity · "+schedule(a).start+" → "+schedule(a).finish;
  b.style.margin="4px";b.addEventListener("click",()=>choose(a.id));box.append(b)
 }
 if(prepare.length){
  box.append(el("h3","Prepare for upcoming work"));
  for(const a of prepare){
   const b=el("button","Prep · "+a.id+" · "+a.calendar_label+" · "+a.preparation.document_family,"btn prep-action");
   b.type="button";b.addEventListener("click",()=>choose(a.id));box.append(b);
  }
 }
 if(items.length===0&&prepare.length===0)box.append(el("span","No work or prep cue on this scenario date."));
 if(onSmallScreen()&&box.scrollIntoView)box.scrollIntoView({behavior:"smooth",block:"start"});
}
async function openUniverse(){
 if(threeOpening||threeSession)return;
 threeOpening=true;
 const message=$("three-status");
 message.textContent="Starting optional Three.js renderer…";
 try{
  const {mountConstellation3D}=await import("./narayani-three.mjs");
  // Three.js is downloaded ONLY on explicit 3D selection. No 3D dependency
  // can break the default 2D, Gantt, calendar, or checklist experience.
  if(activeTab!=="universe"){threeOpening=false;return}
  const session=await mountConstellation3D({
   host:$("three-scene"),model,selected,
   onSelect:id=>choose(id),
   onUnavailable:message=>{$("copy-status").textContent=message;tab("constellation")}
  });
  if(activeTab!=="universe"){session.dispose();return}
  threeSession=session;
  session.preview(previewSlot);
  message.textContent="45 real WBS identities · 49 master dependencies · drag to orbit · scroll to zoom · reported ≠ approved. This is NOT a building model.";
 }catch(err){
  message.textContent="3D unavailable ("+(err?.message||"renderer error")+"). 2D is still available.";
  $("copy-status").textContent="Optional 3D view unavailable; 2D graph, checklist, calendar and Gantt remain operational.";
  tab("constellation");
 }finally{threeOpening=false;}
}
function tab(to){
 if(!["constellation","universe","gantt","calendar"].includes(to))return;
 if(activeTab==="universe"&&to!=="universe"&&threeSession){
  threeSession.dispose();threeSession=null;
 }
 activeTab=to;
 if(location.hash!=="#"+to)history.replaceState(null,"","#"+to);
 for(const b of document.querySelectorAll("[data-view]"))b.setAttribute("aria-selected",String(b.dataset.view===to));
 for(const x of ["constellation","universe","gantt","calendar"])$(x).hidden=x!==to;
 if(to==="universe")void openUniverse();
 if(to==="gantt")renderGantt();if(to==="calendar")renderCalendar();if(to==="constellation")renderGraph();
}
function hook(){
 for(const b of document.querySelectorAll("[data-view]"))b.addEventListener("click",()=>tab(b.dataset.view));
 computePreviewMax();
 $("timeline-play").addEventListener("click",playPreview);
 $("timeline-pause").addEventListener("click",pausePreview);
 $("timeline-position").addEventListener("input",e=>{pausePreview();previewSlot=Number(e.target.value);updatePreview()});
  $("scenario-start").value=anchor;
 $("scenario-start").addEventListener("change",e=>{if(!/^\d{4}-\d\d-\d\d$/.test(e.target.value))return;anchor=e.target.value;monthOffset=0;pausePreview();previewSlot=-1;computePreviewMax();updatePreview();renderDrawer();if(activeTab==="gantt")renderGantt();if(activeTab==="calendar")renderCalendar()});
 $("reset-3d").addEventListener("click",()=>threeSession?.reset());
 $("back-2d").addEventListener("click",()=>tab("constellation"));
 $("zoom-in").addEventListener("click",()=>changeZoom(.78));$("zoom-out").addEventListener("click",()=>changeZoom(1.3));
 $("reset-view").addEventListener("click",()=>{viewport=initialGraphViewport();setViewport()});
 $("graph-overview").addEventListener("click",()=>{viewport={x:0,y:0,w:1600,h:840};setViewport()});
 $("graph-focus").addEventListener("click",()=>focusGraphOn(selected));
 window.addEventListener("resize",()=>{
  const phone=window.innerWidth<=720;
  if(phone!==graphWasPhone){graphWasPhone=phone;viewport=initialGraphViewport();setViewport()}
 },{passive:true});
 $("phase-picker").addEventListener("change",e=>{phaseFilter=e.target.value;renderGraph()});
 $("activity-search").addEventListener("input",e=>{term=e.target.value.toLowerCase();renderGraph()});
 $("calendar-prev").addEventListener("click",()=>{monthOffset-=3;renderCalendar()});
 $("calendar-next").addEventListener("click",()=>{monthOffset+=3;renderCalendar()});
 $("calendar-reset").addEventListener("click",()=>{monthOffset=0;renderCalendar()});
 $("gantt-selected").addEventListener("click",()=>{const all=[...$("gantt-scroll").children];const index=model.activities.findIndex(a=>a.id===selected);all[index+1]?.scrollIntoView({block:"center",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"})});
 initPan();
}
async function main(){
 try{
  const r=await fetch("./project-model.json",{cache:"no-store"});
  if(!r.ok)throw Error("Canonical project model unavailable");
  model=await r.json();
  if(model.format!=="PCK_CONSTRUCTION_VIEW_MODEL_V1"||model.project?.baseline_approved!==false||model.activities?.length!==45||
     model.links?.length!==49||model.channel?.response_contract!=="PCK_MCQ_V1"||model.mcq_summary?.authority!=="REPORTED_ONLY"||model.activities.some(a=>a.checklist.length!==9))throw Error("Invalid or unapproved project model");
  anchor=model.planning_scenario.start_date;
  $("count-nodes").textContent=model.activities.length;$("count-links").textContent=model.links.length;
  $("count-checks").textContent=model.activities.reduce((n,a)=>n+a.checklist.length,0);
  $("count-miles").textContent=model.milestones.length;
  setupPicker();hook();selected=model.activities[0].id;renderDrawer();renderGraph();
  const requested=location.hash.slice(1);
  if(["gantt","calendar","universe"].includes(requested))tab(requested);
  else if(requested==="checklist"){
   tab("constellation");history.replaceState(null,"","#checklist");
   document.querySelector(".drawer")?.scrollIntoView({block:"start",behavior:"auto"});
  }else tab("constellation");
  addEventListener("hashchange",()=>{
   const target=location.hash.slice(1);
   if(["constellation","universe","gantt","calendar"].includes(target)&&target!==activeTab)tab(target);
   if(target==="checklist")document.querySelector(".drawer")?.scrollIntoView({block:"start"});
  });
 }catch(e){$("selected-title").textContent="Model verification failed";$("selected-details").textContent=String(e.message||e);}
}
main();
