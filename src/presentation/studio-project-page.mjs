import {renderGenericProject,validateGenericViewModel} from "./generic-views.mjs";
/** Level-2 project record bootstrap. ONE shared view engine for every published
 * synthetic instance. No copied project dates, no separate WBS implementations.
 * Raw uploads remain handled by the Level-1 digitization workbench.
 */
const registry=Object.freeze({
 "community-clinic":{filename:"community-clinic.json",projectId:"DEMO_CLINIC"},
 "pedestrian-bridge":{filename:"pedestrian-bridge.json",projectId:"DEMO_BRIDGE"}
});
export function projectRecordRegistry(){return {...registry};}
export async function bootstrapProjectRecord(doc=document){
 const mount=doc.querySelector("#views"),status=doc.querySelector("#record-status"),
  key=doc.body?.dataset?.studioProject,ref=registry[key];
 if(!mount||!status)throw Error("Project instance shell missing");
 if(!ref){status.textContent="Unregistered project record; no model was calculated.";return false}
 try{
  const url=new URL("../../projects/generic/"+ref.filename,import.meta.url);
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw Error("Published source-derived project model not available");
  const model=await response.json();
  validateGenericViewModel(model);
  if(model.project.id!==ref.projectId||
    model.classification!=="PUBLIC_SYNTHETIC_DRAFT_ONLY"||
    model.baseline_approved!==false||model.engineering_release!==false)
   throw Error("Project model does not match registered source and approval limits");
  renderGenericProject(model,mount);
  status.textContent="Loaded one canonical model · "+model.counts.activities+
    " source-supplied activities · "+model.counts.links+" dependencies · "+model.counts.checklist+
    " supplied checklist prompts · SHA "+model.input_sha256;
  return true;
 }catch(error){
  status.textContent="Project rendering blocked: "+error.message;
  mount.replaceChildren();return false;
 }
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootstrapProjectRecord(),{once:true});
 else bootstrapProjectRecord();
}
