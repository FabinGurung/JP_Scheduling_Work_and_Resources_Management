import {validateGenericViewModel,renderGenericProject} from "./generic-views.mjs";
import {adaptNarayaniPublicModel} from "./narayani-beta-adapter.mjs";
/** Level-2 project record bootstrap. ONE shared view engine for every published
 * synthetic instance. No copied project dates, no separate WBS implementations.
 * Raw uploads remain handled by the Level-1 digitization workbench.
 */
const registry=Object.freeze({
 "community-clinic":{filename:"community-clinic.json",projectId:"DEMO_CLINIC"},
 "pedestrian-bridge":{filename:"pedestrian-bridge.json",projectId:"DEMO_BRIDGE"},
 "uploaded-wbs":{filename:"uploaded-wbs.json",projectId:"UPLOADED_WBS_V1"},
 "narayani":{filename:"../narayani/project-model.json",projectId:"PRJ-000007",governed:true}
});
export function projectRecordRegistry(){return {...registry};}
export async function bootstrapProjectRecord(doc=document){
 const mount=doc.querySelector("#views"),status=doc.querySelector("#record-status"),
  key=doc.body?.dataset?.studioProject,ref=registry[key];
 if(!mount||!status)throw Error("Project instance shell missing");
 if(!ref){status.textContent="Unregistered project record; no model was calculated.";return false}
 try{
  const url=ref.governed?new URL("../../projects/narayani/project-model.json",import.meta.url):
    new URL("../../projects/generic/"+ref.filename,import.meta.url);
  const response=await fetch(url,{cache:"no-store"});
  if(!response.ok)throw Error("Published source-derived project model not available");
  const published=await response.json();
  const model=ref.governed?adaptNarayaniPublicModel(published):published;
  validateGenericViewModel(model);
  if(model.project.id!==ref.projectId||
    model.classification!==(ref.governed?"PUBLIC_SAFE_GOVERNED_SCENARIO":"PUBLIC_SYNTHETIC_DRAFT_ONLY")||
    model.baseline_approved!==false||model.engineering_release!==false)
   throw Error("Project model does not match registered source and approval limits");
  renderGenericProject(model,mount);
  const differences=doc.querySelector("#source-differences");
  if(differences){
   differences.replaceChildren();
   if(Array.isArray(model.source_dictionary_only)){
    for(const item of model.source_dictionary_only){
     if(item.status!=="DICTIONARY_ONLY_NOT_SCHEDULED"||
        !/^\d{4,5}$/.test(item.code)||
        typeof item.name!=="string"||item.name.length>180)
      throw Error("Malformed unscheduled dictionary item");
     const p=doc.createElement("p");
     p.textContent=item.code+" · "+item.name+" — DICTIONARY ONLY (no scheduled duration or dependency)";
     differences.append(p);
    }
   }
  }
  status.textContent="Read-only published project · source changes are made by AI-assisted revision and GitHub Actions validation · "+model.counts.activities+
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
