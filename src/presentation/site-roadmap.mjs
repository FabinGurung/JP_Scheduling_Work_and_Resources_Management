// Field-facing progressive disclosure; no authority to edit or assert progress.
// All displayed project facts come exclusively from machine/wbs-sample/plan.json.
export function validateFieldPlan(plan){
 const fail=msg=>{throw Error("Field roadmap source rejected: "+msg);};
 if(!plan||plan.format!=="PCK_WBS_SAMPLE_V1"||plan.classification!=="PUBLIC_SYNTHETIC"||plan.status!=="NOT_ENGINEERING_APPROVED")fail("classification or schema mismatch");
 if(plan.method!=="ZERO_LAG_FS_SHARED_WORKING_DAY_SLOTS")fail("unsupported scheduling semantics");
 if(!Number.isInteger(plan.duration_workday_slots)||plan.duration_workday_slots<=0)fail("invalid project span");
 if(!Array.isArray(plan.activities)||!Array.isArray(plan.phases)||!Array.isArray(plan.milestones))fail("missing activity/WBS/milestone collections");
 if(plan.activities.length!==plan.task_count||plan.milestones.length!==plan.milestone_count)fail("count mismatch");
 if(plan.activities.length>500||plan.phases.length>50)fail("display size limit exceeded");
 const ids=new Map(),phases=new Map();
 const label=x=>typeof x==="string"&&x.length>0&&x.length<=180&&!/[<>]/.test(x);
 for(const p of plan.phases){
  if(!label(p.name)||typeof p.wbs_code!=="string"||phases.has(p.wbs_code))fail("invalid/duplicate WBS phase");
  if(!Number.isInteger(p.early_start_slot)||!Number.isInteger(p.early_finish_exclusive_slot)||p.early_start_slot>p.early_finish_exclusive_slot)fail("invalid phase slots");
  phases.set(p.wbs_code,p);
 }
 for(const a of plan.activities){
  if(!label(a.activity_id)||!label(a.name)||ids.has(a.activity_id)||!phases.has(a.wbs_code))fail("invalid/duplicate activity or orphan WBS");
  if(!["Task","Milestone"].includes(a.type)||!Number.isInteger(a.duration_days)||a.duration_days<0)fail("invalid activity type/duration");
  if(!Number.isInteger(a.early_start_slot)||!Number.isInteger(a.early_finish_exclusive_slot)||a.early_finish_exclusive_slot!==a.early_start_slot+a.duration_days)fail("invalid activity event slots");
  if(!Array.isArray(a.predecessor_ids)||a.predecessor_ids.some(x=>typeof x!=="string"))fail("missing machine-derived prerequisites");
  ids.set(a.activity_id,a);
 }
 for(const a of plan.activities)for(const id of a.predecessor_ids){
  const dep=ids.get(id);
  if(!dep||dep.early_finish_exclusive_slot>a.early_start_slot)fail("unresolved/violated FS prerequisite");
 }
 for(const m of plan.milestones)if(!ids.has(m.activity_id)||ids.get(m.activity_id).type!=="Milestone")fail("milestone outside activity registry");
 for(const p of plan.phases){
  const items=plan.activities.filter(a=>a.wbs_code===p.wbs_code);
  if(items.length!==p.activity_count||Math.min(...items.map(a=>a.early_start_slot))!==p.early_start_slot||Math.max(...items.map(a=>a.early_finish_exclusive_slot))!==p.early_finish_exclusive_slot)fail("WBS rollup mismatch");
 }
 return {ids,phases};
}
function el(tag,className,content){
 const n=document.createElement(tag);
 if(className)n.className=className;
 if(content!==undefined)n.textContent=String(content);
 return n;
}
function fieldUI(plan){
 const {ids}=validateFieldPlan(plan);
 const $=id=>document.getElementById(id);
 let selection=plan.phases[0]?.wbs_code;
 $("count-phases").textContent=plan.phases.length;
 $("count-steps").textContent=plan.task_count;
 $("count-milestones").textContent=plan.milestone_count;
 $("count-span").textContent=plan.duration_workday_slots;
 function choose(code,{scroll=false}={}){
  selection=code;
  renderPhases();renderSteps();
  if(scroll)$("roadmap").scrollIntoView({block:"start",behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});
 }
 function renderMilestones(){
  const list=$("milestone-list");list.replaceChildren();
  for(let i=0;i<plan.milestones.length;i++){
   const m=plan.milestones[i];
   const b=el("button","milestone");
   b.type="button";
   b.setAttribute("aria-label","Show steps for "+m.name);
   b.append(el("small","",String(i+1)+" of "+plan.milestones.length));
   b.append(el("b","",m.name.replace(/^Milestone:\s*/,"")));
   b.append(el("span","day","Target slot "+m.early_start_slot));
   b.append(el("em","","Status: not reported"));
   b.addEventListener("click",()=>choose(m.wbs_code,{scroll:true}));
   list.append(b);
  }
 }
 function renderPhases(){
  const list=$("phase-list");list.replaceChildren();
  for(const [i,p] of plan.phases.entries()){
   const b=el("button","phase-button");b.type="button";b.setAttribute("aria-pressed",String(selection===p.wbs_code));
   b.append(el("span","phase-n",String(i+1).padStart(2,"0")));
   b.append(el("span","phase-name",p.name));
   b.append(el("span","phase-count",p.activity_count+" steps"));
   b.addEventListener("click",()=>choose(p.wbs_code));
   list.append(b);
  }
 }
 function renderSteps(){
  const p=plan.phases.find(p=>p.wbs_code===selection);
  if(!p)throw Error("Selected phase is not in verified plan");
  const items=plan.activities.filter(a=>a.wbs_code===p.wbs_code)
   .sort((a,b)=>a.early_start_slot-b.early_start_slot||a.activity_id.localeCompare(b.activity_id));
  $("chosen-number").textContent="PHASE "+(plan.phases.indexOf(p)+1)+" · WBS "+p.wbs_code;
  $("chosen-phase").textContent=p.name;
  $("chosen-summary").textContent=items.length+" planned steps · Scheduled slots "+p.early_start_slot+"–"+p.early_finish_exclusive_slot+". These are relative offsets, not actual site dates.";
  $("steps-head").textContent="Required steps ("+items.length+") — open a step for prerequisites";
  const list=$("step-list");list.replaceChildren();
  for(const [i,a] of items.entries()){
   const wrapper=el("details","step");const summary=el("summary");
   summary.append(el("span","number",String(i+1)));
   const title=el("span","title-wrap");
   title.append(el("span","title",a.name.replace(/^Milestone:\s*/,"")));
   const sub=a.type==="Milestone"?"Planned milestone":"Planned duration: "+a.duration_days+" working-day slots";
   title.append(el("span","sub",a.activity_id+" · "+sub));
   summary.append(title);
   if(a.critical)summary.append(el("span","tag","Critical"));
   wrapper.append(summary);
   const body=el("div","step-body");
   const p1=el("p");p1.append(el("strong","","Planned window: "));
   p1.append(document.createTextNode("slot "+a.early_start_slot+" → "+a.early_finish_exclusive_slot+" (exclusive finish event)"));
   body.append(p1);
   const p2=el("p");p2.append(el("strong","","Prerequisites: "));
   if(a.predecessor_ids.length===0)p2.append(document.createTextNode("No predecessor specified in the source."));
   else p2.append(document.createTextNode(a.predecessor_ids.map(id=>id+" — "+ids.get(id).name).join("; ")));
   body.append(p2);
   const p3=el("p");p3.append(el("strong","","Site evidence: "));
   p3.append(document.createTextNode("Not provided. Do not infer actual completion or authorization from this schedule."));
   body.append(p3);
   if(a.critical){const p4=el("p");p4.append(el("strong","","Scheduling note: "));p4.append(document.createTextNode("Zero float in this source network; a delay here can affect planned completion."));body.append(p4);}
   wrapper.append(body);list.append(wrapper);
  }
 }
 renderMilestones();choose(selection);
}
async function boot(){
 const list=document.getElementById("step-list");
 try{
  const response=await fetch("./machine/wbs-sample/plan.json",{cache:"no-store"});
  if(!response.ok)throw Error("Published plan unavailable (HTTP "+response.status+")");
  const plan=await response.json();
  fieldUI(plan);
 }catch(error){
  const notice=el("p","no-data","Roadmap unavailable or source validation failed. No guessed project steps will be displayed. "+error.message);
  list.replaceChildren(notice);
  document.getElementById("milestone-list").replaceChildren(el("p","no-data","Roadmap source unavailable."));
  document.getElementById("chosen-phase").textContent="Roadmap not verified";
  document.getElementById("chosen-summary").textContent="Open the machine evidence page to investigate.";
 }
}
if(typeof document!=="undefined")boot();
