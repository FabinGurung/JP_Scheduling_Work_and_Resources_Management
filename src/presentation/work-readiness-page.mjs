import {validateGenericViewModel} from "./generic-views.mjs";
import {adaptNarayaniPublicModel} from "./narayani-beta-adapter.mjs";
import {inspectWorkSequence,workSequenceSummary} from "../kernel/work-readiness.mjs";

/** The project IDs/filenames mirror the existing Level-2 public record registry.
 * This screen reads the exact same immutable JSON as the four-view renderer.
 */
const registry=Object.freeze({
 "community-clinic":{id:"DEMO_CLINIC",file:"community-clinic.json"},
 "pedestrian-bridge":{id:"DEMO_BRIDGE",file:"pedestrian-bridge.json"},
 "uploaded-wbs":{id:"UPLOADED_WBS_V1",file:"uploaded-wbs.json"},
 "narayani":{id:"PRJ-000007",governed:true}
});
const node=(tag,cls,text)=>{
 const n=document.createElement(tag);
 if(cls)n.className=cls;
 if(text!==undefined)n.textContent=String(text);
 return n;
};
function appendText(parent,tag,cls,text){const e=node(tag,cls,text);parent.append(e);return e}
function badge(title,description){
 const item=node("div","wr-summary-cell");
 appendText(item,"strong","",title);appendText(item,"span","",description);return item;
}
const relationNames={FS:"Finish to Start",SS:"Start to Start",FF:"Finish to Finish",SF:"Start to Finish"};
function makeLinkCard(dep,kind,onSelect){
 const item=node("button","wr-dependency");item.type="button";
 const top=node("div","wr-dependency-top");
 appendText(top,"strong","",dep.activity_id+" · "+dep.activity_title);
 appendText(top,"span","",dep.starts_successor?"Start condition":"Finish constraint");
 item.append(top);
 const event=kind==="before"?
  "PREVIOUS "+dep.predecessor_event+" → CURRENT "+dep.successor_event:
  "CURRENT "+dep.predecessor_event+" → NEXT "+dep.successor_event;
 appendText(item,"p","",relationNames[dep.type]+" · "+event);
 appendText(item,"small","","Lag "+(dep.lag>0?"+":"")+dep.lag+" planning slots · field verification unknown");
 item.addEventListener("click",()=>onSelect(dep.activity_id));
 return item;
}
function renderDetail(model,id,mount,onSelect){
 const result=inspectWorkSequence(model,id);
 const lookup=new Map(model.wbs.map(w=>[w.id,w.title]));
 mount.replaceChildren();
 const head=node("section","wr-work-header");
 appendText(head,"div","wr-eyebrow","CURRENT WORK · "+result.activity.id);
 appendText(head,"h2","",result.activity.title);
 appendText(head,"p","",lookup.get(result.activity.wbs_id)??"Unmapped WBS");
 const status=node("p","wr-warning","Readiness: NOT VERIFIED · No approved field completion, inspection or authorization source is connected.");
 head.append(status);mount.append(head);
 const flow=node("div","wr-sequence");
 const before=node("section","wr-stage");
 appendText(before,"h3","","1 · Before this work");
 appendText(before,"p","wr-help","Check what other tasks must START or FINISH before the corresponding event of this work. Lag uses schedule slots, not an approved site clock.");
 if(result.before.length)result.before.forEach(x=>before.append(makeLinkCard(x,"before",onSelect)));
 else appendText(before,"p","wr-empty","No incoming scheduled links. This does NOT authorize starting work.");
 const gate=node("p","wr-help");
 gate.textContent=result.start_conditions.length+" start-related conditions; "+result.finish_constraints.length+
 " finish-only constraints. Finish-only links do not by themselves prohibit starting.";
 before.append(gate);
 flow.append(before);
 const now=node("section","wr-stage wr-stage-now");
 appendText(now,"h3","","2 · This work");
 const definition=node("dl","wr-facts");
 for(const [term,desc] of [["Activity ID",id],["WBS",lookup.get(result.activity.wbs_id)??result.activity.wbs_id],
 ["Nominal schedule duration",result.activity.duration+" planning slots (not verified site productivity)"],
 ["Field progress","No authorized actual START or COMPLETE provided"],
 ["Work permission","Unknown — inspect site conditions and required approvals"]]){
  appendText(definition,"dt","",term);appendText(definition,"dd","",desc);
 }
 now.append(definition);
 appendText(now,"h4","","Source-supplied checks / steps");
 if(result.checks.length){
  for(const c of result.checks){
   const block=node("div","wr-check");
   appendText(block,"strong","",c.title);
   appendText(block,"small","","Reported state: "+c.reported_status+" · not an approved inspection");
   now.append(block);
  }
 }else appendText(now,"p","wr-empty","No source-supplied task checklist or micro-steps. Do not assume required field checks are complete.");
 flow.append(now);
 const after=node("section","wr-stage");
 appendText(after,"h3","","3 · After this work");
 appendText(after,"p","wr-help","These are direct scheduled successors, not automatically released jobs. Select an item to inspect its own prerequisites.");
 if(result.after.length)result.after.forEach(x=>after.append(makeLinkCard(x,"after",onSelect)));
 else appendText(after,"p","wr-empty","No outgoing scheduled links in this model. This does NOT prove project completion.");
 flow.append(after);
 mount.append(flow);
 const note=node("p","wr-disclaimer","Field acceptance is separate from the scheduling graph. Verify actual progress, hold points, permits, drawings, materials, inspections, safety and authorized signoff outside this unapproved public projection.");
 mount.append(note);
}
export async function bootstrapWorkReadiness(doc=document){
 const app=doc.getElementById("work-readiness-app");
 const status=doc.getElementById("work-readiness-status");
 const key=doc.body?.dataset?.workReadinessProject,record=registry[key];
 if(!app||!status)return false;
 if(!record){status.textContent="Unknown project source; not loaded.";return false}
 try{
  const url=record.governed?new URL("../../projects/narayani/project-model.json",import.meta.url):
   new URL("../../projects/generic/"+record.file,import.meta.url);
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw Error("Verified public project JSON could not be fetched");
  const source=await response.json();
  const model=record.governed?adaptNarayaniPublicModel(source):source;
  validateGenericViewModel(model);
  if(model.project.id!==record.id||model.engineering_release!==false||
   model.baseline_approved!==false||
   model.classification!==(record.governed?"PUBLIC_SAFE_GOVERNED_SCENARIO":"PUBLIC_SYNTHETIC_DRAFT_ONLY"))
   throw Error("Source identity or publication authority mismatch");
  const summary=workSequenceSummary(model);
  const header=node("div","wr-summary");
  header.append(badge(model.project.name,"Published project and source SHA "+model.input_sha256.slice(0,12)),
   badge(summary.activities,"Modeled work activities"),
   badge("UNKNOWN","Verified field readiness"));
  app.append(header);
  const layout=node("div","wr-layout"),side=node("aside","wr-side");
  appendText(side,"h2","","Choose the day's work");
  appendText(side,"p","wr-help","Search a task or filter by WBS. All statuses remain unverified.");
  const search=node("input","wr-search");search.type="search";search.placeholder="Search ID or activity name";
  search.setAttribute("aria-label","Find an activity");
  const filter=node("select","wr-filter");filter.setAttribute("aria-label","Filter by WBS");
  const all=node("option","");all.value="";all.textContent="All WBS divisions";filter.append(all);
  for(const w of model.wbs){const o=node("option","",w.title);o.value=w.id;filter.append(o)}
  const results=node("div","wr-activity-list");
  side.append(search,filter,results);
  const detail=node("section","wr-detail");detail.setAttribute("aria-label","Work sequence detail");
  layout.append(side,detail);app.append(layout);
  const byId=new Map(model.activities.map(a=>[a.id,a]));
  const byWbs=new Map(model.wbs.map(w=>[w.id,w.title]));
  const rawHash=()=>{try{return decodeURIComponent(window.location.hash.slice(1))}catch{return ""}};
  let selected=byId.has(rawHash())?rawHash():model.activities[0].id;
  function select(id){
   if(!byId.has(id))return;
   selected=id;
   window.history.replaceState(null,"","#"+encodeURIComponent(id));
   renderList();
   renderDetail(model,id,detail,select);
  }
  function renderList(){
   const q=search.value.trim().toLocaleLowerCase(),w=filter.value;
   results.replaceChildren();
   let found=0;
   for(const a of model.activities){
    if((w&&a.wbs_id!==w)||(q&&!(a.id+" "+a.title).toLocaleLowerCase().includes(q)))continue;
    found++;
    const b=node("button","wr-activity"+(selected===a.id?" wr-active":""));
    b.type="button";b.setAttribute("aria-pressed",String(selected===a.id));
    appendText(b,"strong","",a.id+" · "+a.title);
    appendText(b,"small","",byWbs.get(a.wbs_id)??a.wbs_id);
    b.addEventListener("click",()=>select(a.id));
    results.append(b);
   }
   if(!found)appendText(results,"p","wr-empty","No matching activity in this published WBS.");
  }
  search.addEventListener("input",renderList);filter.addEventListener("change",renderList);
  window.addEventListener("hashchange",()=>{if(byId.has(rawHash()))select(rawHash())});
  select(selected);
  status.textContent="Read-only · "+model.counts.activities+" source-backed activities · "+
   model.counts.links+" typed dependencies · no field-ready status inferred.";
  return true;
 }catch(error){
  app.replaceChildren();
  status.textContent="Work sequence blocked: "+error.message;
  return false;
 }
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootstrapWorkReadiness(),{once:true});
 else bootstrapWorkReadiness();
}
