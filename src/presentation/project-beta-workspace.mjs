import {renderGenericProject,validateGenericViewModel} from "./generic-views.mjs";
import {makeBetaDraftSpec,changeBetaDraft,recalculateBetaDraft,betaExportPackage,restoreBetaPackage} from "./beta-draft.mjs";
/** ONE beta editing surface for all four public project records.
 * Published data is immutable; edits and dragged geometry are ephemeral,
 * downloadable, source-bound drafts. No network PUT, no approvals, no DB.
 */
const e=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const named=(node,name)=>node.querySelector('[name="'+name+'"]');
const row=(name,label,type="text")=>{
 const l=e("label","sf-beta-field",label),v=e("input");
 v.name=name;v.type=type;if(type==="number"){v.min="0";v.step="1"}
 l.append(v);return l;
};
const select=(name,label)=>{
 const l=e("label","sf-beta-field",label),v=e("select");v.name=name;l.append(v);return l;
};
const setOptions=(node,items,selected)=>{
 const value=node.value||selected;node.replaceChildren();
 for(const {id,label} of items){const opt=e("option","",label);opt.value=id;node.append(opt)}
 if(items.some(x=>x.id===value))node.value=value;
 else if(selected&&items.some(x=>x.id===selected))node.value=selected;
};
export function mountBetaWorkspace(original,mount){
 validateGenericViewModel(original);
 if(!mount?.replaceChildren)throw Error("Beta mount required");
 const base=structuredClone(original);
 let draft=makeBetaDraftSpec(base),preview=base,positions={},revision=0,dirty=false,
  selected=draft.activities[0].id,history=[],loading=false;
 mount.replaceChildren();
 const banner=e("div","sf-beta-banner");
 banner.append(e("strong","","Universal Beta · Editable Constellation + 4 Views"),
  e("p","","One shared renderer for all four projects. Edit names, WBS membership, nominal durations or dependencies; drag layout nodes. Recalculation is a draft, never actual progress or source approval."));
 const actions=e("div","sf-beta-actions");
 const undo=e("button","sf-beta-btn","Undo"),reset=e("button","sf-beta-btn","Restore published"),download=e("button","sf-beta-btn sf-beta-primary","Download versioned draft");
 const input=e("input");input.type="file";input.accept=".json,application/json";input.setAttribute("aria-label","Import exported beta draft");input.className="sf-beta-file";
 actions.append(undo,reset,download,input);
 const messages=e("p","sf-beta-status");
 messages.setAttribute("role","status");messages.setAttribute("aria-live","polite");
 const form=e("section","sf-beta-tools");
 const intro=e("details","sf-beta-details");intro.open=true;
 const summary=e("summary","","Constellation editor · activities and dependencies");
 const cols=e("div","sf-beta-grid");
 const activity=e("fieldset","sf-beta-fieldset");
 activity.append(e("legend","","Activity editor"));
 const selectedField=select("selected","Select activity");
 const activityName=row("activity_name","Activity name");
 const wbsField=select("wbs_id","WBS branch");
 const duration=row("duration","Nominal duration (integer slots)","number");
 const newId=row("new_id","New activity ID");
 const save=e("button","sf-beta-btn sf-beta-primary","Update selected");
 const add=e("button","sf-beta-btn","Add activity");
 const remove=e("button","sf-beta-btn sf-beta-risk","Delete selected draft activity");
 const activityActions=e("div","sf-beta-mini");activityActions.append(save,add,remove);
 activity.append(selectedField,activityName,wbsField,duration,newId,activityActions);
 const edges=e("fieldset","sf-beta-fieldset");edges.append(e("legend","","Dependency editor"));
 const from=select("from","Predecessor"),to=select("to","Successor"),type=select("type","Type");
 setOptions(named(type,"type")??type.querySelector("select"),["FS","SS","FF","SF"].map(x=>({id:x,label:x})),"FS");
 const lag=row("lag","Signed lag (integer slots)","number");lag.querySelector("input").min="-10000";lag.querySelector("input").max="10000";
 const linkAdd=e("button","sf-beta-btn sf-beta-primary","Connect activities");
 const linkRemove=e("button","sf-beta-btn","Remove exact connection");
 const edgeActions=e("div","sf-beta-mini");edgeActions.append(linkAdd,linkRemove);
 edges.append(from,to,type,lag,edgeActions);
 const currentLinks=e("p","sf-beta-link-summary");
 edges.append(currentLinks);
 cols.append(activity,edges);
 intro.append(summary,cols);
 form.append(intro);
 const notice=e("p","sf-beta-guard","Editing changes a LOCAL UNVERIFIED SCENARIO only. Source model, 405 Narayani reported check statuses, approved baselines and official project records are NOT modified. Download JSON to save; refresh without export discards edits.");
 const views=e("div","sf-beta-views");
 mount.append(banner,actions,messages,form,notice,views);
 const fields={
  selected:selectedField.querySelector("select"),name:activityName.querySelector("input"),
  wbs:wbsField.querySelector("select"),duration:duration.querySelector("input"),
  newId:newId.querySelector("input"),from:from.querySelector("select"),to:to.querySelector("select"),
  type:type.querySelector("select"),lag:lag.querySelector("input")
 };
 fields.lag.value="0";fields.type.value="FS";
 const title=()=>base.classification==="PUBLIC_SAFE_GOVERNED_SCENARIO"?
  "Narayani source projection · 405 reported-only checks on original · not engineering approval":
  "Published source is immutable · synthetic source inputs only";
 function info(message,bad=false){messages.textContent=message;messages.dataset.bad=String(bad)}
 function syncFields(){
  const items=draft.activities.map(a=>({id:a.id,label:a.id+" · "+a.name}));
  const groups=draft.wbs.map(w=>({id:w.wbs_id,label:w.wbs_id+" · "+w.name}));
  setOptions(fields.selected,items,selected);
  setOptions(fields.from,items,selected);
  setOptions(fields.to,items,items.find(x=>x.id!==selected)?.id);
  setOptions(fields.wbs,groups);
  const a=draft.activities.find(a=>a.id===fields.selected.value)??draft.activities[0];
  selected=a.id;fields.selected.value=a.id;fields.name.value=a.name;
  fields.wbs.value=a.wbs_id;fields.duration.value=String(a.duration);
  currentLinks.textContent=draft.relationships.length+" typed dependencies · no cycles / orphan references admitted.";
 }
 function render(){
  syncFields();
  const view=dirty?preview:base;
  renderGenericProject(view,views,{
   layoutPositions:positions,selectedId:selected,
   onSelect(id){
    if(draft.activities.some(a=>a.id===id)){
     selected=id;fields.selected.value=id;
     const a=draft.activities.find(a=>a.id===id);
     fields.name.value=a.name;fields.wbs.value=a.wbs_id;
     fields.duration.value=String(a.duration);fields.from.value=id;
    }
   },
   onNodeMoved(id,pos){
    if(loading)return;
    checkpoint();
    positions[id]=pos;dirty=true;revision++;
    // Geometry changes only, no scheduling solver needed.
    info("Node "+id+" repositioned in local draft · "+title());
    render();
   }
  });
  undo.disabled=history.length===0;
  reset.disabled=!dirty;
 }
 function checkpoint(){
  history.push({draft:structuredClone(draft),positions:structuredClone(positions),dirty,preview:structuredClone(preview)});
  if(history.length>25)history.shift();
 }
 function apply(action){
  try{
   const next=changeBetaDraft(draft,action);
   const revised=recalculateBetaDraft(next);
   checkpoint();draft=next;preview=revised;dirty=true;revision++;
   selected=next.activities.some(a=>a.id===selected)?selected:next.activities[0].id;
   info("Draft revision "+revision+" computed · "+next.activities.length+" activities · "+
    next.relationships.length+" links. Original source unchanged.");
   render();return true;
  }catch(error){info("Edit blocked: "+error.message,true);return false}
 }
 fields.selected.addEventListener("change",()=>{selected=fields.selected.value;syncFields()});
 save.addEventListener("click",()=>apply({kind:"UPDATE_ACTIVITY",id:selected,
  name:fields.name.value,wbs_id:fields.wbs.value,duration:Number(fields.duration.value)}));
 add.addEventListener("click",()=>{
  const id=fields.newId.value.trim();
  if(apply({kind:"ADD_ACTIVITY",activity:{id,name:fields.name.value,wbs_id:fields.wbs.value,
   duration:Number(fields.duration.value)}})){selected=id;fields.newId.value="";render()}
 });
 remove.addEventListener("click",()=>apply({kind:"REMOVE_ACTIVITY",id:selected}));
 const relationship=(kind)=>{
  if(fields.lag.value.trim()===""||!Number.isSafeInteger(Number(fields.lag.value)))
   return info("Dependency lag must be an explicitly entered integer.",true);
  return apply({kind,from:fields.from.value,to:fields.to.value,type:fields.type.value,
   lag:Number(fields.lag.value)});
 };
 linkAdd.addEventListener("click",()=>relationship("ADD_LINK"));
 linkRemove.addEventListener("click",()=>relationship("REMOVE_LINK"));
 undo.addEventListener("click",()=>{
  const prev=history.pop();if(!prev)return;
  ({draft,positions,dirty,preview}=prev);revision++;
  selected=draft.activities.some(a=>a.id===selected)?selected:draft.activities[0].id;
  info("Undid the most recent beta action. No published source changed.");render();
 });
 reset.addEventListener("click",()=>{
  if(!dirty)return;
  checkpoint();draft=makeBetaDraftSpec(base);preview=base;positions={};dirty=false;
  selected=draft.activities[0].id;revision++;
  info("Restored immutable published source model; unsaved beta changes discarded.");render();
 });
 download.addEventListener("click",()=>{
  try{
   const pkg=betaExportPackage({original:base,draft,positions,revision:Math.max(1,revision)});
   const url=URL.createObjectURL(new Blob([JSON.stringify(pkg,null,2)+"\n"],{type:"application/json"}));
   const anchor=e("a");anchor.href=url;anchor.download="skyforge-"+base.project.id+"-beta-draft-r"+Math.max(1,revision)+".json";
   document.body.append(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1200);
   info("Versioned local draft download prepared; no server or Drive file modified.");
  }catch(error){info("Draft export blocked: "+error.message,true)}
 });
 input.addEventListener("change",async()=>{
  const file=input.files?.[0];if(!file)return;
  try{
   if(file.size>4_000_000)throw Error("Beta draft must be under 4 MB");
   const pkg=restoreBetaPackage(JSON.parse(await file.text()),base);
   const next=recalculateBetaDraft(pkg.project);
   checkpoint();draft=pkg.project;positions=pkg.constellation_positions;revision=pkg.revision;
   preview=next;dirty=true;selected=draft.activities[0].id;
   info("Restored compatible beta draft r"+revision+" for "+base.project.id+
    ". Source identity matched; still unapproved.");render();
  }catch(error){info("Draft import rejected: "+error.message,true)}
  input.value="";
 });
 syncFields();info("Ready · "+title()+". Drag constellation nodes or edit below. All changes stay local.");render();
 return {getDraft:()=>structuredClone(draft),getPositions:()=>structuredClone(positions),isDirty:()=>dirty};
}
