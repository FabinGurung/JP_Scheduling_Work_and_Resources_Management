import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {applySheetReferenceRows,RATE_HEADERS,MATERIAL_HEADERS} from "../scripts/sync-reference-norms.mjs";
import {validateMaterialCatalog} from "../src/reference/material-planner.mjs";
import {validateStarterCatalog} from "../src/reference/productivity-starters.mjs";
import {validateProductivityCatalog} from "../src/reference/productivity-norms.mjs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const initial=()=>({
 starter:read("work-items/productivity-starters.v2.json"),
 base:read("work-items/productivity-norms.v1.json"),
 material:read("work-items/material-references.v1.json")
});
const rows=(headers,values)=>[headers,...values];
function sheets(){
 const {starter,base,material}=initial();
 const profile=new Map(starter.profiles.map(p=>[p.id,p]));
 const rates={
  work:rows(RATE_HEADERS.work,base.items.map(x=>[x.key,x.code,x.title,x.unit,
   starter.items.find(i=>i.key===x.key)?.reference_profile||"",x.source_scope,
   profile.get(starter.items.find(i=>i.key===x.key)?.reference_profile)?.kind||"NON_EXECUTABLE",
   profile.get(starter.items.find(i=>i.key===x.key)?.reference_profile)?.source_item||"",x.note])),
  profiles:rows(RATE_HEADERS.profiles,starter.profiles.map(p=>[
   p.id,p.unit,p.kind,p.skilled_days_per_unit,p.helper_days_per_unit,p.machine_hours_per_unit??"",
   p.machine_type||"",p.calibration_factor,p.source_id,p.source_item,p.notes,
   p.default_quantity,p.default_crew.skilled,p.default_crew.helper,p.default_crew.machines,
   p.default_crew.hours,p.execution])),
  sources:rows(RATE_HEADERS.sources,[...starter.sources.map(s=>[
   s.id,s.title,"",s.url,s.authority,s.description]),
   ["NEP-UDK-KASKI-2081","Urban Development Office Kaski","Building Works Norms","https://udbokaski.gandaki.gov.np/en/post/norms-of-building-construction-civil-works","OFFICIAL","Verify exact subsection"],
   ["NEP-DWRI-FULL","DWRI","Full 2081 norms","https://wriddkathmandu.bagamati.gov.np/upload/1a68c67a86f780513d61357d9d6149fd/files/Norms_for_Rate_Analysis_2081_DWRI.pdf","OFFICIAL","Verify exact item"]
  ]),
  crew:rows(RATE_HEADERS.crew,[
   ["Working_weekdays","Sun,Mon,Tue,Wed,Thu,Fri","","OWNER_PRELIMINARY",""],
   ["Saturday_holiday",true,"boolean","OWNER_PRELIMINARY",""],
   ["Labour_hours_per_day",8,"h","OWNER_PRELIMINARY",""],
   ["Skilled_people",2,"person","OWNER_PRELIMINARY",""],
   ["Unskilled_people",3,"person","OWNER_PRELIMINARY",""],
   ["Mixer_hours_per_day",2,"h","OWNER_PRELIMINARY",""],
   ["Small_equipment_hours_per_day",3,"h","OWNER_PRELIMINARY",""],
   ["Efficiency_factor",1,"ratio","CALIBRATION_SEED",""]
  ])
 };
 const mats={
  materials:rows(MATERIAL_HEADERS.materials,material.materials.map(m=>[m.id,m.name,m.unit,m.category])),
  assemblies:rows(MATERIAL_HEADERS.assemblies,material.recipes.map(a=>[a.id,a.title,a.work_unit,a.source_id,a.grade,a.description,a.note])),
  lines:rows(MATERIAL_HEADERS.lines,material.recipes.flatMap(a=>a.lines.map(l=>[a.id,l.material_id,l.quantity_per_unit??"",l.unit,l.basis,l.source_id||a.source_id]))),
  work:rows(MATERIAL_HEADERS.work,material.work_items.map(x=>[x.key,x.title,x.unit,x.recipe_ids.join(";"),"","NOT_SITE_APPROVED"])),
  activity:rows(MATERIAL_HEADERS.activity,material.project_activities.map(x=>[x.activity_id,x.activity_title,x.recipe_ids.join(";"),x.activity_type,"","NOT_SITE_APPROVED"])),
  waste:rows(MATERIAL_HEADERS.waste,[
   ["Reinforcement steel",2.096,3,3,"NEPAL_STUDY + CPWD","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction","Not universal"],
   ["Bricks",2.56,3,"","NEPAL_STUDY","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction",""],
   ["Cement",2.82,3,"","NEPAL_STUDY","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction",""],
   ["Sand",3.634,4,"","NEPAL_STUDY","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction",""],
   ["Coarse aggregate",7.486,7.5,"","NEPAL_STUDY","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction",""],
   ["Tiles","",5,2.5,"DRAFT","https://cpwd.gov.in/Publication/CPWD_DAR_Vol_I_14092023-Civil.pdf",""],
   ["Granite","",5,"","DRAFT","https://engineernepal.com/en/downloads/norms",""],
   ["Stone cladding","",8,"","DRAFT","https://engineernepal.com/en/downloads/norms",""],
   ["Gypsum board","",10,"","DRAFT","https://engineernepal.com/en/downloads/norms",""],
   ["Electrical conduit","",5,5,"INDIA_ANALOG","https://cpwd.gov.in/Publication/CON_Misc_26_Construction_Works.pdf",""],
   ["Sheet metal","",10,10,"INDIA_ANALOG","https://cpwd.gov.in/Publication/CON_Misc_26_Construction_Works.pdf",""]
  ]),
  sources:rows(MATERIAL_HEADERS.sources,[...material.sources.map(s=>[s.id,s.title,s.reference,s.url,s.provenance,""]),
    ["NEP-UDK-KASKI-2081","DUDBC Building Civil Norms Kaski","Building rate analysis","https://udbokaski.gandaki.gov.np/en/post/norms-of-building-construction-civil-works","OFFICIAL",""],
    ["NEP-MISHRA-2022","Nepal material waste case study","Five buildings","https://www.researchgate.net/publication/361529874_Assessing_the_Magnitude_of_Waste_Material_Using_Lean_Construction","OBSERVED",""],
    ["IND-CPWD-2023-CONTRACT","CPWD contract material tolerances","Steel 3%","https://cpwd.gov.in/Publication/CON_Misc_26_Construction_Works.pdf","INDIA_ANALOG",""],
    ["NEP-PECJ-2025","Pokhara Engineering College rebar waste study","Kathmandu schools","https://www.pec.edu.np/uploads/Publicationfile/1753252290.pdf","OBSERVED",""]])
 };
 return {rates,mats};
}
test("two source-workbook tables reconstruct public data and retain 88/46/36/65/45 dimensions",()=>{
 const before=initial(),{rates,mats}=sheets();
 const after=applySheetReferenceRows(before,rates,mats);
 validateMaterialCatalog(after.material,before.base,
  read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
 validateProductivityCatalog(after.base);
 validateStarterCatalog(after.starter,after.base);
 assert.equal(after.base.items.length,88);
 assert.equal(after.starter.profiles.length,46);
 assert.equal(after.material.recipes.length,36);
 assert.equal(after.material.waste_allowances.length,11);
 assert.equal(after.material.recipes.reduce((n,x)=>n+x.lines.length,0),65);
 assert.equal(after.starter.crew_policy.skilled_people,2);
 assert.equal(after.starter.crew_policy.unskilled_helpers,3);
 assert.equal(after.starter.crew_policy.saturday_holiday,true);
 assert.deepEqual(before,initial(),"Source payloads remain immutable");
});
test("rate and material coefficients are genuinely data driven by Sheet rows, without a repo commit",()=>{
 const before=initial(),{rates,mats}=sheets();
 const p=rates.profiles.find(row=>row[0]==="soil_exc"),orig=p[4];
 p[4]=0.75;
 const m=mats.lines.find(row=>row[0]==="concrete_M20"&&row[1]==="cement");
 m[2]=8.5;
 const result=applySheetReferenceRows(before,rates,mats);
 assert.equal(result.starter.profiles.find(x=>x.id==="soil_exc").helper_days_per_unit,.75);
 assert.equal(result.material.recipes.find(x=>x.id==="concrete_M20").lines[0].quantity_per_unit,8.5);
 assert.equal(before.starter.profiles.find(x=>x.id==="soil_exc").helper_days_per_unit,orig);
});
test("unverified BOQ, duplicate source IDs, unknown units and missing coefficients fail closed",()=>{
 const original=initial();
 let x=sheets();x.mats.activity[1][4]=1;
 assert.throws(()=>applySheetReferenceRows(original,x.rates,x.mats),/unadmitted|improperly admitted/);
 x=sheets();x.rates.work[1][0]="BOQ:INVALID";
 assert.throws(()=>applySheetReferenceRows(original,x.rates,x.mats),/source ID/);
 x=sheets();x.mats.lines[1][3]="kg";
 assert.throws(()=>applySheetReferenceRows(original,x.rates,x.mats),/material-unit/);
 x=sheets();x.rates.profiles[1][3]=-1;
 assert.throws(()=>applySheetReferenceRows(original,x.rates,x.mats),/numeric/);
});
test("GDrive IDs and secrets never ship inside the public source bridge",()=>{
 const script=readFileSync(new URL("../scripts/sync-reference-norms.mjs",import.meta.url),"utf8");
 assert.match(script,/SKYFORGE_WORK_RATES_SHEET_ID/);
 assert.match(script,/SKYFORGE_MATERIALS_SHEET_ID/);
 assert.match(script,/GOOGLE_OAUTH_ACCESS_TOKEN/);
 assert.match(script,/LEGACY_GIT_REFERENCE_SEED_NOT_SHEETS/);
 assert.match(script,/GOOGLE_SHEETS_V000001_IMPORTED/);
 assert.doesNotMatch(script,/1Rs3Ydzy-bcwoqBxmFEUjqtsrps-_DhlO19OuUkKtbI0/);
 assert.doesNotMatch(script,/1FGRMrh97v46TgSMcSboXil29_MrJp-BRPN6gaDIKYHU/);
});
