// Single-source construction constellation. Browser reads ONLY project-model.json.
// No Google Drive / Slack credentials and no implicit completion write.
const $=id=>document.getElementById(id),SVG_NS="http://www.w3.org/2000/svg";
const el=(tag,text,className)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n};
const svg=(tag,attributes={},text)=>{const n=document.createElementNS(SVG_NS,tag);for(const [key,v] of Object.entries(attributes))n.setAttribute(key,String(v));if(text!==undefined)n.textContent=text;return n};
let model=null,selected=null,activeTab="constellation",phaseFilter="ALL",term="",monthOffset=0,anchor="2026-10-19",drag=null;
let viewport={x:0,y:0,w:1600,h:840};
const byId=()=>new Map(model.activities.map(a=>[a.id,a]));
const clean=x=>String(x).replace(/^Milestone:\s*/,"");
function utc(x){return new Date(x+"T00:00:00Z")}
function addMonths(x,n){const d=utc(x);d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+n);return d}
function iso(d){return d.toISOString().slice(0,10)}
function workday(slot){
 const d=utc(anchor);while(d.getUTCDay()===0)d.setUTCDate(d.getUTCDate()+1);
 let i=0;while(i<slot){d.setUTCDate(d.getUTCDate()+1);if(d.getUTCDay()!==0)i++}
 return iso(d)
}
function schedule(a){return {start:workday(a.master_start_slot),finish:workday(a.master_finish_exclusive_slot)}}
function status(a){return a.hold_ids.length?"held":a.reported_subwork_count?"reported":"unverified"}
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
   class:"graph-link"+(relevance?" related":"")+(by.get(link.to).hold_ids.length?" hold":"")});
  graph.append(path);
 }
 for(const a of model.activities){
  const n=coords.get(a.id),dim=(phaseFilter!=="ALL"&&phaseFilter!==a.phase_id)||term&&!((a.title+" "+a.id).toLowerCase().includes(term));
  const cls="graph-node "+status(a)+(a.type==="Milestone"?" milestone":"")+
   (a.id===selected?" selected":focus.has(a.id)?" related":"");
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
 deps.append(d);
 $("activity-mcq").replaceChildren(el("h3","Activity progress MCQ"),mcqRow("Choose the reported activity state","ACTIVITY",model.activity_options));
 const checks=$("checklist");checks.replaceChildren(el("h3","Detailed checklist · "+a.checklist.length+" prompts"));
 checks.append(el("p","Answer the relevant question one at a time. Completion answers are reports pending separate acceptance."));
 for(const c of a.checklist){
  const wrap=mcqRow(c.id+" · "+c.title,c.id,model.checklist_options);
  wrap.insertBefore(el("small",c.guidance),wrap.children[1]);checks.append(wrap);
 }
 $("copy-status").textContent="";
}
function choose(id){selected=id;renderDrawer();renderGraph();if(activeTab==="gantt")renderGantt()}
function renderGantt(){
 const body=$("gantt-scroll");body.replaceChildren();
 const max=Math.max(...model.activities.map(a=>a.master_finish_exclusive_slot))+1,range=Math.max(max,1);
 const axis=el("div",undefined,"gantt-row gantt-axis");axis.append(el("div","Activity / phase","gantt-label"));
 const ticks=el("div",undefined,"gantt-track");
 for(let n=0;n<13;n++){const left=n/12*100;const txt=el("span",workday(Math.floor(range*n/12)));txt.style.cssText="position:absolute;left:"+left+"%;font-size:10px;color:#aec7e5;top:6px;transform:translateX(-50%)";ticks.append(txt)}
 axis.append(ticks);body.append(axis);
 for(const a of model.activities){
  const row=el("div",undefined,"gantt-row"+(a.id===selected?" active":""));
  const label=el("div",a.id+" · "+clean(a.title),"gantt-label");label.title=a.title;label.addEventListener("click",()=>choose(a.id));row.append(label);
  const track=el("div",undefined,"gantt-track");
  const bar=el("button","", "gantt-bar "+(a.hold_ids.length?"hold":a.reported_subwork_count?"reported":""));
  bar.type="button";bar.title=a.id+" · "+a.title+" · "+schedule(a).start+" to "+schedule(a).finish;
  bar.style.left=(100*a.master_start_slot/range)+"%";bar.style.width=Math.max(0.35,100*Math.max(0.5,a.master_work_slots)/range)+"%";
  bar.setAttribute("aria-label",a.id+" "+a.title);bar.addEventListener("click",()=>choose(a.id));
  track.append(bar);row.append(track);body.append(row);
 }
}
function activeOnDay(a,day){
 const {start,finish}=schedule(a);return a.type==="Milestone"?day===start:day>=start&&day<finish;
}
function renderCalendar(){
 const out=$("calendar-months");out.replaceChildren();
 // Four calendar-page blocks cover an actual rolling 3-month interval, including
 // the partial beginning and ending months, anchored at the scenario start.
 const boundary=addMonths(anchor,3),start=addMonths(anchor,monthOffset),end=addMonths(iso(start),3);
 for(let k=0;k<4;k++){
  const mo=new Date(start);mo.setUTCMonth(start.getUTCMonth()+k);
  const y=mo.getUTCFullYear(),m=mo.getUTCMonth(),numDays=new Date(Date.UTC(y,m+1,0)).getUTCDate();
  const card=el("section",undefined,"month");
  card.append(el("h3",mo.toLocaleDateString("en-US",{timeZone:"UTC",month:"long",year:"numeric"})));
  const grid=el("div",undefined,"days");
  for(const d of ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"])grid.append(el("div",d,"weekday"));
  for(let blank=0;blank<mo.getUTCDay();blank++)grid.append(el("div","","weekday"));
  for(let date=1;date<=numDays;date++){
   const day=iso(new Date(Date.UTC(y,m,date)));
   const inWindow=day>=iso(start)&&day<iso(end)&&day>=anchor || monthOffset!==0&&day>=iso(start)&&day<iso(end);
   const work=model.activities.filter(a=>activeOnDay(a,day));
   const b=el("button",undefined,"day"+(!inWindow?" inactive":"")+(day===anchor?" current":""));
   b.type="button";b.disabled=!inWindow;b.append(el("span",String(date)));
   const n=el("span",work.length+" work","count");if(work.some(a=>a.hold_ids.length))n.classList.add("red");b.append(n);
   b.title=day+" · "+work.length+" template activities";b.addEventListener("click",()=>showDay(day,work));grid.append(b);
  }
  card.append(grid);out.append(card);
 }
 if(monthOffset===0)$("day-readout").textContent="Planning scenario window "+anchor+" through "+iso(boundary)+"; choose a date. All dates derive from master time slots, not Narayani's approved schedule.";
}
function showDay(day,items){
 const box=$("day-readout");box.replaceChildren(el("strong",day+" — "+items.length+" possible activities in synthetic scenario. "));
 for(const a of items){const b=el("button",a.id+" · "+clean(a.title),"btn");b.style.margin="4px";b.addEventListener("click",()=>choose(a.id));box.append(b)}
 if(items.length===0)box.append(el("span","No master activity occupies this date."));
}
function tab(to){
 activeTab=to;
 for(const b of document.querySelectorAll("[data-view]"))b.setAttribute("aria-selected",String(b.dataset.view===to));
 for(const x of ["constellation","gantt","calendar"])$(x).hidden=x!==to;
 if(to==="gantt")renderGantt();if(to==="calendar")renderCalendar();if(to==="constellation")renderGraph();
}
function hook(){
 for(const b of document.querySelectorAll("[data-view]"))b.addEventListener("click",()=>tab(b.dataset.view));
 $("scenario-start").value=anchor;
 $("scenario-start").addEventListener("change",e=>{if(!/^\d{4}-\d\d-\d\d$/.test(e.target.value))return;anchor=e.target.value;monthOffset=0;renderDrawer();if(activeTab==="gantt")renderGantt();if(activeTab==="calendar")renderCalendar()});
 $("zoom-in").addEventListener("click",()=>changeZoom(.78));$("zoom-out").addEventListener("click",()=>changeZoom(1.3));
 $("reset-view").addEventListener("click",()=>{viewport={x:0,y:0,w:1600,h:840};setViewport()});
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
     model.links?.length!==49||model.channel?.response_contract!=="PCK_MCQ_V1"||model.activities.some(a=>a.checklist.length!==9))throw Error("Invalid or unapproved project model");
  anchor=model.planning_scenario.start_date;
  $("count-nodes").textContent=model.activities.length;$("count-links").textContent=model.links.length;
  $("count-checks").textContent=model.activities.reduce((n,a)=>n+a.checklist.length,0);
  $("count-miles").textContent=model.milestones.length;
  setupPicker();hook();selected=model.activities[0].id;renderDrawer();renderGraph();
 }catch(e){$("selected-title").textContent="Model verification failed";$("selected-details").textContent=String(e.message||e);}
}
main();
