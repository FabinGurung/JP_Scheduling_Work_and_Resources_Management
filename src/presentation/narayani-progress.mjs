// Deliberately browser-only, no Google auth or private Drive source URLs.
const node=id=>document.getElementById(id);
const make=(t,c,v)=>{const e=document.createElement(t);if(c)e.className=c;if(v!==undefined)e.textContent=String(v);return e;};
function verify(p){
 if(p?.format!=="PCK_NARAYANI_PROGRESS_PROJECTION_V1"||p.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||p.project_id!=="PRJ-000007")throw Error("Project progress source mismatch");
 if(p.auto_refresh_enabled!==false||p.plan_baseline_approved!==false||
    p.completed_wbs_activities!==0||p.verified_milestones!==0||p.source_evidence_is_site_approval!==false)throw Error("Invalid authority");
 if(p.evidence_inventory?.progress_rows!==34||p.evidence_inventory?.readiness_rows!==4||p.evidence_inventory?.source_done_reports!==14)throw Error("Unexpected source counts");
 if(!Array.isArray(p.task_evidence)||p.task_evidence.length!==2||
    p.task_evidence.some(e=>e.verified_activity_complete||e.approved_work_complete||e.ready_for_next_work))throw Error("Unsupported completed activity");
 if(p.unassigned_or_local_scope_records!==30||!Array.isArray(p.actionable_checks)||p.actionable_checks.length!==4||p.actionable_checks.some(e=>e.work_release!==false))throw Error("Unsupported field release");
}
async function boot(){
 const status=node("progress-status");
 try{
  const res=await fetch("./progress.json",{cache:"no-store"});
  if(!res.ok)throw Error("Progress snapshot unavailable");
  const p=await res.json();verify(p);
  status.textContent="Drive evidence reconciled on "+p.reconciled_on+" · latest readiness "+p.latest_readiness_record+" · one-time snapshot, NOT live syncing. No approved activity completion.";
  node("evidence-reports").textContent=p.evidence_inventory.progress_rows;
  node("linked-subwork").textContent=p.task_evidence.reduce((a,b)=>a+b.reported_subwork_entries,0);
  node("pending-mapping").textContent=p.unassigned_or_local_scope_records;
  node("verified-completions").textContent=p.completed_wbs_activities;
  const tasks=node("progress-task-list");tasks.replaceChildren();
  for(const t of p.task_evidence){
    const d=make("div","progress-row"),a=make("strong","",t.activity_id);
    d.append(a,document.createTextNode(" · "+t.reported_subwork_entries+" reported subwork entr"+(t.reported_subwork_entries===1?"y":"ies")+" — whole activity NOT verified"));
    tasks.append(d);
  }
  const checks=node("progress-check-list");checks.replaceChildren();
  for(const c of p.actionable_checks){
   const item=make("li"),s=make("strong","",c.name);
   item.append(s,document.createTextNode(" — "+c.status.replaceAll("_"," ").toLowerCase()));checks.append(item);
  }
 }catch(err){status.textContent="Evidence snapshot failed verification; no actual work may be inferred. "+err.message;}
}
if(typeof document!=="undefined")boot();
