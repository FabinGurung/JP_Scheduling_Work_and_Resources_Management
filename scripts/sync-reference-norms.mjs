import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";

const root=resolve(new URL("..",import.meta.url).pathname);
const file=p=>join(root,p);
const read=async p=>JSON.parse(await readFile(file(p),"utf8"));
const sizeError=m=>{throw Error("Reference Sheets reconciliation blocked: "+m);};
const validUrl=x=>typeof x==="string"&&/^https:\/\//.test(x)&&x.length<1500;
const n=(v,label,{nullable=false,min=0,max=1e6}={})=>{
 if((v===""||v===null||v===undefined)&&nullable)return null;
 if(v===""||v===null||v===undefined||!Number.isFinite(Number(v))||
  Number(v)<min||Number(v)>max)sizeError("Invalid numeric source field "+label);
 return Number(v);
};
const string=(v,max=1000)=>v==null?"":String(v).slice(0,max);
function tab(values,expected,count){
 if(!Array.isArray(values)||!values.length||
  expected.some((c,i)=>values[0][i]!==c)||
  values.length!==count+1)sizeError("Wrong headers or record count for "+expected[0]);
 const rows=values.slice(1).map(row=>Object.fromEntries(expected.map((h,i)=>[h,row[i]??""])));
 if(rows.some(row=>!row[expected[0]]))sizeError("Empty source ID in "+expected[0]);
 return rows;
}
export const RATE_HEADERS={
 work:["Work_ID","Work_Code","Activity_Name","Unit","Profile_ID","Source_Scope","Evidence_Grade","Source_Item","Notes"],
 profiles:["Profile_ID","Unit","Evidence_Grade","Skilled_Days_per_Unit","Helper_Days_per_Unit","Machine_Hours_per_Unit","Machine_Type","Calibration_Factor","Source_ID","Source_Item","Notes","Default_Work_Quantity","Original_Skilled","Original_Helpers","Original_Machines","Original_Hours","Execution_Mode"],
 crew:["Policy_Key","Value","Unit","Authority","Meaning"],
 sources:["Source_ID","Document","Section_Notes","Source_URL","Evidence_Grade","Caveat"]
};
export const MATERIAL_HEADERS={
 materials:["Material_ID","Material_Name","Material_Unit","Category"],
 assemblies:["Assembly_ID","Assembly_Title","Work_Unit","Source_ID","Evidence_Grade","Description","Warnings"],
 lines:["Assembly_ID","Material_ID","Qty_per_Work_Unit","Material_Unit","Coefficient_Basis","Source_ID"],
 work:["Work_ID","Activity_or_Work_Name","Work_Unit","Linked_Assembly_IDs","Measured_Quantity","Approval_Status"],
 activity:["Activity_ID","Activity_Name","Linked_Assembly_IDs","Activity_Type","Measured_Quantity","Approval_Status"],
 waste:["Material_Category","Observed_Nepal_Average_Pct","Draft_Starter_Pct","Contract_Analog_Pct","Evidence_Grade","Source_URL","Applicability_Note"],
 sources:["Source_ID","Document","Exact_Section","Public_Source_URL","Evidence_Grade","Caveat"]
};
const assertIDs=(rows,baseline,cellKey,modelKey)=>{
 if(rows.length!==baseline.length||new Set(rows.map(x=>x[cellKey])).size!==rows.length||
  rows.some((x,i)=>x[cellKey]!==baseline[i][modelKey]))
  sizeError("Missing/duplicate/reordered source ID in "+cellKey);
};
const refs=x=>x?x.split(";").map(s=>s.trim()).filter(Boolean):[];
const publicSources=(rows,key)=>rows.map(s=>{
 if(!validUrl(s[key]))sizeError("Invalid public source URL");
 return {id:string(s.Source_ID),title:string(s.Document),url:s[key],grade:string(s.Evidence_Grade),
  section:string(s.Exact_Section??s.Section_Notes),caveat:string(s.Caveat)};
});
export function applySheetReferenceRows(initial,rates,mats){
 const {starter,base,material}=structuredClone(initial);
 const work=tab(rates.work,RATE_HEADERS.work,88);
 const profile=tab(rates.profiles,RATE_HEADERS.profiles,46);
 const rSources=tab(rates.sources,RATE_HEADERS.sources,6);
 const crew=tab(rates.crew,RATE_HEADERS.crew,8);
 const materials=tab(mats.materials,MATERIAL_HEADERS.materials,27);
 const assemblies=tab(mats.assemblies,MATERIAL_HEADERS.assemblies,36);
 const lines=tab(mats.lines,MATERIAL_HEADERS.lines,65);
 const workMap=tab(mats.work,MATERIAL_HEADERS.work,88);
 const activity=tab(mats.activity,MATERIAL_HEADERS.activity,45);
 const waste=tab(mats.waste,MATERIAL_HEADERS.waste,11);
 const mSources=tab(mats.sources,MATERIAL_HEADERS.sources,7);
 assertIDs(work,base.items,"Work_ID","key");
 assertIDs(profile,starter.profiles,"Profile_ID","id");
 assertIDs(materials,material.materials,"Material_ID","id");
 assertIDs(assemblies,material.recipes,"Assembly_ID","id");
 assertIDs(workMap,material.work_items,"Work_ID","key");
 assertIDs(activity,material.project_activities,"Activity_ID","activity_id");
 const profiles=new Set(profile.map(p=>p.Profile_ID));
 for(let i=0;i<88;i++){
  const row=work[i],bi=base.items[i];
  if(row.Unit!==bi.unit||row.Work_Code!==bi.code||
     row.Profile_ID&&!profiles.has(row.Profile_ID))sizeError("Unit/profile conflict for "+row.Work_ID);
  bi.title=string(row.Activity_Name,250);bi.note=string(row.Notes);
  starter.items[i].reference_profile=row.Profile_ID||null;
 }
 for(let i=0;i<46;i++){
  const p=profile[i],r=starter.profiles[i];
  if(p.Unit!==r.unit||!["OFFICIAL_DIRECT","OFFICIAL_ANALOG","CALIBRATION_SEED"].includes(p.Evidence_Grade))
   sizeError("Profile unit or grade mismatch for "+p.Profile_ID);
  r.kind=p.Evidence_Grade;
  r.skilled_days_per_unit=n(p.Skilled_Days_per_Unit,p.Profile_ID);
  r.helper_days_per_unit=n(p.Helper_Days_per_Unit,p.Profile_ID);
  r.machine_hours_per_unit=n(p.Machine_Hours_per_Unit,p.Profile_ID,{nullable:true});
  r.machine_type=p.Machine_Type||null;
  r.calibration_factor=n(p.Calibration_Factor,p.Profile_ID,{min:.01,max:100});
  r.source_id=string(p.Source_ID);r.source_item=string(p.Source_Item);
  r.notes=string(p.Notes);r.default_quantity=n(p.Default_Work_Quantity,p.Profile_ID,{min:.00001});
  r.default_crew={skilled:n(p.Original_Skilled,p.Profile_ID,{max:100}),
   helper:n(p.Original_Helpers,p.Profile_ID,{max:100}),
   machines:n(p.Original_Machines,p.Profile_ID,{max:50}),
   hours:n(p.Original_Hours,p.Profile_ID,{min:1,max:16})};
  r.execution=string(p.Execution_Mode);
 }
 const keyValue=Object.fromEntries(crew.map(x=>[x.Policy_Key,x.Value]));
 const c={skilled_people:n(keyValue.Skilled_people,"skilled people",{min:1,max:100}),
  unskilled_helpers:n(keyValue.Unskilled_people,"unskilled helpers",{min:1,max:100}),
  labour_hours_per_day:n(keyValue.Labour_hours_per_day,"workday hours",{min:1,max:16}),
  mixer_hours_per_day:n(keyValue.Mixer_hours_per_day,"mixer hours",{min:0,max:16}),
  small_equipment_hours_per_day:n(keyValue.Small_equipment_hours_per_day,"small machine hours",{min:0,max:16}),
  saturday_holiday:keyValue.Saturday_holiday===true||keyValue.Saturday_holiday==="TRUE"};
 if(!c.saturday_holiday)sizeError("Saturday-off owner schedule requires an approved version change");
 starter.crew_policy={...c,source:"GOOGLE_SHEETS_LIVE_REFERENCES",authority:"OWNER_REFERENCE_NOT_APPROVED_PROJECT"};
 starter.source_registry=publicSources(rSources,"Source_URL");
 const lineKeys=new Map(lines.map(l=>[l.Assembly_ID+"|"+l.Material_ID+"|"+l.Material_Unit,l]));
 if(lineKeys.size!==65)sizeError("Duplicate material line IDs");
 const recipeIds=new Set(assemblies.map(x=>x.Assembly_ID));
 for(let i=0;i<27;i++){
  const v=materials[i],m=material.materials[i];
  if(v.Material_Unit!==m.unit)sizeError("Material unit changed");
  m.name=string(v.Material_Name,250);m.category=string(v.Category,120);
 }
 for(let i=0;i<36;i++){
  const a=assemblies[i],m=material.recipes[i];
  if(a.Work_Unit!==m.work_unit)sizeError("Assembly work unit conflict "+m.id);
  m.title=string(a.Assembly_Title,250);m.grade=string(a.Evidence_Grade,80);
  m.source_id=string(a.Source_ID);m.description=string(a.Description);m.note=string(a.Warnings);
  for(const line of m.lines){
   const k=m.id+"|"+line.material_id+"|"+line.unit,entry=lineKeys.get(k);
   if(!entry||entry.Material_Unit!==line.unit)sizeError("Missing original material-unit identity "+k);
   line.quantity_per_unit=n(entry.Qty_per_Work_Unit,k,{nullable:true,max:1e8});
   line.basis=string(entry.Coefficient_Basis,150);
   line.source_id=string(entry.Source_ID)||null;
  }
 }
 for(let i=0;i<88;i++){
  const a=workMap[i],orig=material.work_items[i];
  if(a.Work_Unit!==orig.unit||a.Measured_Quantity!==""||
   a.Approval_Status!=="NOT_SITE_APPROVED")sizeError("Project takeoff improperly admitted for "+a.Work_ID);
  const parsed=refs(a.Linked_Assembly_IDs);
  if(parsed.some(id=>!recipeIds.has(id)))sizeError("Unrecognized assembly ID");
  // Keep stable work ID and unit, let a Sheet row change its reference relationship.
  orig.title=string(a.Activity_or_Work_Name,250);orig.recipe_ids=parsed;
 }
 for(let i=0;i<45;i++){
  const a=activity[i],orig=material.project_activities[i];
  if(a.Activity_Name!==orig.activity_title||a.Activity_Type!==orig.activity_type||
   a.Measured_Quantity!==""||a.Approval_Status!=="NOT_SITE_APPROVED")
   sizeError("Unadmitted project material quantities or activity identity "+orig.activity_id);
  const parsed=refs(a.Linked_Assembly_IDs);
  if(parsed.some(id=>!recipeIds.has(id)))sizeError("Unknown project recipe");
  orig.recipe_ids=parsed;
 }
 material.sources=material.sources.map(s=>({...s})); // keep original source refs intact
 material.source_registry=publicSources(mSources,"Public_Source_URL");
 material.waste_allowances=waste.map(row=>{
  if(!validUrl(row.Source_URL))sizeError("Invalid waste reference URL");
  return {category:string(row.Material_Category),
   observed_nepal_pct:n(row.Observed_Nepal_Average_Pct,row.Material_Category,{nullable:true,max:100}),
   preliminary_pct:n(row.Draft_Starter_Pct,row.Material_Category,{nullable:true,max:100}),
   foreign_contract_analog_pct:n(row.Contract_Analog_Pct,row.Material_Category,{nullable:true,max:100}),
   grade:string(row.Evidence_Grade),source_url:row.Source_URL,notes:string(row.Applicability_Note)};
 });
 if(material.recipes.some(x=>x.lines.some(y=>y.quantity_per_unit===null&&y.basis==="DIRECT_MEASURED_INPUT")))
  sizeError("Direct measured input cannot be empty");
 material.owner_policy={...material.owner_policy,
  skilled_workers:c.skilled_people,unskilled_helpers:c.unskilled_helpers,
  hours_per_day:c.labour_hours_per_day,machine_hours_per_day_default:c.mixer_hours_per_day,
  other_equipment_hours_per_day_default:c.small_equipment_hours_per_day};
 return {starter,base,material};
}
async function fetchBook(id,ranges,token){
 if(!/^[A-Za-z0-9_-]{20,100}$/.test(id))sizeError("Missing authorized sheet identifier");
 const u=new URL("https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(id)+"/values:batchGet");
 u.searchParams.set("valueRenderOption","UNFORMATTED_VALUE");
 for(const range of ranges)u.searchParams.append("ranges",range);
 const resp=await fetch(u,{headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(30000)});
 if(!resp.ok)sizeError("Google Sheets API read failed with HTTP "+resp.status);
 const v=await resp.json();
 if(v.valueRanges?.length!==ranges.length)sizeError("Google Sheets response incomplete");
 return v.valueRanges.map(x=>x.values||[]);
}
const path="dist/work-items/norms-source-status.json";
const hash=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
async function writeStatus(obj){
 await mkdir(file("dist/work-items"),{recursive:true});
 await writeFile(file(path),JSON.stringify(obj,null,2)+"\n");
}
export async function executeCLI(mode){
 if(mode==="--legacy-status"){
  await writeStatus({status:"LEGACY_GIT_REFERENCE_SEED_NOT_SHEETS",
   message:"The published work/material datasets are legacy Git-imported seeds; Google Sheets live import has not been enabled.",
   source:"GITHUB_SEED_NOT_DRIVE_AUTHORITY",sync_completed:false,
   generated_by:"scripts/sync-reference-norms.mjs"});
  return;
 }
 if(mode!=="--pull-sheets")sizeError("Unsupported command");
 const token=process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
 if(!token)sizeError("No read-only Google token available");
 const rateRanges=["Work_Items!A1:I89","Rate_Profiles!A1:Q47","Sources!A1:F7","Crew_Calendar!A1:E9"];
 const matRanges=["Materials!A1:D28","Assemblies!A1:G37","Material_Coefficients!A1:F66","BOQ_Mapping!A1:F89","Activity_Mapping!A1:F46","Waste_Allowances!A1:G12","Sources!A1:F8"];
 const [a,b]=await Promise.all([
  fetchBook(process.env.SKYFORGE_WORK_RATES_SHEET_ID,rateRanges,token),
  fetchBook(process.env.SKYFORGE_MATERIALS_SHEET_ID,matRanges,token)]);
 const initial={base:await read("work-items/productivity-norms.v1.json"),
  starter:await read("work-items/productivity-starters.v2.json"),
  material:await read("work-items/material-references.v1.json")};
 const result=applySheetReferenceRows(initial,{
  work:a[0],profiles:a[1],sources:a[2],crew:a[3]
 },{
  materials:b[0],assemblies:b[1],lines:b[2],work:b[3],
  activity:b[4],waste:b[5],sources:b[6]
 });
 // Validate everything before touching the public output and never publish raw sheet data.
 const payload=[
 ["dist/work-items/productivity-starters.v2.json",result.starter],
 ["dist/work-items/productivity-norms.v1.json",result.base],
 ["dist/work-items/material-references.v1.json",result.material]
 ];
 for(const [path,obj] of payload)await writeFile(file(path),JSON.stringify(obj,null,2)+"\n");
 await writeStatus({status:"GOOGLE_SHEETS_V000001_IMPORTED",
  message:"Public-safe reference coefficients imported from two authenticated Google Sheets registers",
  sync_completed:true,source:"GOOGLE_SHEETS_READ_ONLY_ACTION",
  published_at:new Date().toISOString(),
  work_items:result.base.items.length,profiles:result.starter.profiles.length,
  material_assemblies:result.material.recipes.length,
  material_coefficients:result.material.recipes.reduce((n,r)=>n+r.lines.length,0),
  source_content_hashes:Object.fromEntries(payload.map(([p,o])=>[p.split("/").at(-1),hash(o)]))});
}
if(process.argv[1]&&import.meta.url==="file://"+resolve(process.argv[1])){
 executeCLI(process.argv[2]).catch(e=>{
  // Logs intentionally contain no Google access tokens, sheet contents or private IDs.
  console.error("REFERENCE SHEETS SYNC BLOCKED:",e.message);
  process.exitCode=1;
 });
}
