// Browser-side fail-closed presentation verification; engine validation also runs in Node CI.
function validateNarayaniPilot(p){
 if(p?.format!=="PCK_PROJECT_WBS_ADOPTION_V1"||p.classification!=="PUBLIC_SAFE_DERIVED_PLANNING_ONLY"||p.project?.project_id!=="PRJ-000007")throw Error("Wrong project input");
 if(p.master?.activities!==45||p.master?.relationships!==49||p.master?.milestones!==7||p.master?.dictionary_defined!==47)throw Error("Invalid WBS source counts");
 if(!Array.isArray(p.activities)||p.activities.length!==45||!Array.isArray(p.phases)||p.phases.length!==10||!Array.isArray(p.milestones)||p.milestones.length!==7||!Array.isArray(p.hold_points)||p.hold_points.length!==5)throw Error("Incomplete WBS mapping");
 const ids=new Set(p.activities.map(a=>a.activity_id));
 if(ids.size!==45||p.activities.some(a=>a.actual_status!=="NO_VERIFIED_PROGRESS"||a.adoption_state!=="TEMPLATE_ONLY_SCOPE_UNAPPROVED"||a.predecessor_ids.some(id=>!ids.has(id))))throw Error("Unverified progress or invalid logic");
 if(p.project.verified_progress||p.project.site_permits_verified||p.project.schedule_baseline_approved||p.milestones.some(m=>m.verified_complete||m.site_target_date!==null))throw Error("Invalid approval claim");
 if(p.quality?.field_reporting_available!==false||p.quality?.no_authentication_claim!==true)throw Error("Public auth status invalid");
 return true;
}
const el=(name,cls,text)=>{const n=document.createElement(name);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n;};
const node=id=>document.getElementById(id);
function show(plan){
 validateNarayaniPilot(plan);
 node("n-phases").textContent=plan.phases.length;
 node("n-tasks").textContent=plan.activities.length;
 node("n-milestones").textContent=plan.milestones.length;
 node("n-holds").textContent=plan.hold_points.length;
 node("hold-note").textContent="Listed controls are unresolved. Reported observations do not independently establish completion, defects, approval, or permission to proceed.";
 const holds=node("holds");holds.replaceChildren();
 for(const h of plan.hold_points){
  const box=el("details","hold"),summary=el("summary","",h.title),body=el("div","body");
  body.append(el("span","status",h.authority.replaceAll("_"," ")));
  for(const [label,value] of [["Why flagged",h.reason],["What must be verified",h.action],["Related master tasks",h.activity_ids.length?h.activity_ids.join(", "):"Outside the standard task seed — independent work package required"]]){
   const p=el("p");p.append(el("strong","",label+": "));p.append(document.createTextNode(value));body.append(p);
  }
  box.append(summary,body);holds.append(box);
 }
 const milestoneCards=node("milestone-cards");milestoneCards.replaceChildren();
 const ids=new Map(plan.activities.map(a=>[a.activity_id,a]));
 let selection=plan.phases[0].wbs_code;
 const buttons=node("phases"),steps=node("activities");
 function select(code,scroll=false){
  selection=code;
  for(const b of buttons.children)b.setAttribute("aria-pressed",String(b.dataset.wbs===selection));
  const phase=plan.phases.find(p=>p.wbs_code===selection);
  node("phase-title").textContent=phase.name;
  node("phase-summary").textContent=phase.activity_count+" template activities · Review: "+phase.phase_review.replaceAll("_"," ").toLowerCase()+". No project-approved dates or verified completions.";
  steps.replaceChildren();
  const list=plan.activities.filter(a=>a.wbs_code===code)
   .sort((a,b)=>a.master_early_start_slot-b.master_early_start_slot||a.activity_id.localeCompare(b.activity_id));
  for(const a of list){
   const box=el("details","task"),summary=el("summary","",a.name.replace(/^Milestone:\s*/,"")),detail=el("div","details");
   summary.append(el("span","meta",a.activity_id+" · "+(a.type==="Milestone"?"Milestone":"Master duration "+a.planned_workday_slots+" abstract slots")+" · NO VERIFIED PROGRESS"));
   const deps=a.predecessor_ids.map(id=>id+" — "+ids.get(id).name).join("; ")||"No predecessors in the master template";
   for(const [title,val] of [["Must follow",deps],["Actual verification","Not recorded or approved for Narayani"],["Template adoption","Project scope and duration remain unapproved"],["Related holds",a.hold_ids.length?a.hold_ids.join(", "):"No activity-specific hold mapped; other general approvals still apply"]]){
    const p=el("p");p.append(el("strong","",title+": "));p.append(document.createTextNode(val));detail.append(p);
   }
   box.append(summary,detail);steps.append(box);
  }
  if(scroll)node("work").scrollIntoView({behavior:"smooth",block:"start"});
 }
 for(const [i,p] of plan.phases.entries()){
  const b=el("button","",p.name);b.type="button";b.dataset.wbs=p.wbs_code;
  b.append(el("span","",("0"+(i+1)).slice(-2)+" · "+p.activity_count+" steps"));
  b.addEventListener("click",()=>select(p.wbs_code));buttons.append(b);
 }
 for(const m of plan.milestones){
  const b=el("button","milestone");b.type="button";b.append(el("strong","",m.name.replace(/^Milestone:\s*/,"")));
  b.append(el("small","","STATUS: NOT VERIFIED"));
  b.addEventListener("click",()=>select(m.wbs_code,true));milestoneCards.append(b);
 }
 select(selection);
}
async function boot(){
 try{
  const r=await fetch("./map.json",{cache:"no-store"});
  if(!r.ok)throw Error("public project mapping unavailable");
  show(await r.json());
 }catch(e){
  node("hold-note").textContent="Project mapping unavailable or invalid — no invented field schedule displayed.";
  node("phase-summary").textContent=String(e.message||e);
  node("phase-title").textContent="Verification required";
 }
}
if(typeof document!=="undefined")boot();
