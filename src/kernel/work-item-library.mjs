// v0.1: sourced work-item coefficients, no inferred crew, hours, or quantities.
// Does not read Narayani data. Does not approve site work.
const validNum=(n,label,{zero=false}={})=>{
 if(typeof n!=="number"||!Number.isFinite(n)||(zero?n<0:n<=0))throw Error(label+" must be "+(zero?"nonnegative":"positive")+" finite number");
 return n;
};
const safeText=(x)=>typeof x==="string"&&x.length>0&&x.length<=450&&!/[<>\u0000-\u001f]/.test(x);
const allow=new Set(["m3","m2","kg","m","each","day"]);
export function validateWorkItemLibrary(library){
 if(library?.format!=="SKYFORGE_WORK_ITEM_LIBRARY_V1"||library.version!=="0.1.0")throw Error("Unknown work item schema/version");
 if(library.classification!=="PUBLIC_REFERENCE_NO_PRIVATE_PROJECT_RECORDS")throw Error("Invalid work item classification");
 if(!Array.isArray(library.sources)||!Array.isArray(library.items)||library.items.length<1)throw Error("Missing work-item data");
 const sources=new Map();
 for(const src of library.sources){
  if(!safeText(src.id)||sources.has(src.id)||!safeText(src.url)||!src.url.startsWith("https://")||!safeText(src.scope))throw Error("Invalid source identity");
  sources.set(src.id,src);
 }
 const ids=new Set();
 for(const item of library.items){
  if(!safeText(item.id)||ids.has(item.id)||!safeText(item.name)||!allow.has(item.unit)||!safeText(item.applicability))throw Error("Invalid work item identity");
  ids.add(item.id);
  if(item.authority!=="NOT_SITE_APPROVED")throw Error("Catalog cannot grant site approval");
  if(!["METHOD_TEMPLATE_ONLY","PUBLISHED_REFERENCE_COEFFICIENT","PUBLISHED_REFERENCE_MATERIAL_ONLY"].includes(item.evidence_level))throw Error("Invalid evidence class");
  if(item.benchmark_reference_id!==null&&!sources.has(item.benchmark_reference_id))throw Error("Unknown benchmark source");
  if(!Array.isArray(item.required_site_inputs)||!Array.isArray(item.material_per_unit)||!Array.isArray(item.labor_role_days_per_unit)||!Array.isArray(item.equipment_hours_per_unit))throw Error("Invalid coefficient structure");
  if(item.evidence_level==="METHOD_TEMPLATE_ONLY"&&(item.material_per_unit.length||item.labor_role_days_per_unit.length||item.equipment_hours_per_unit.length))throw Error("Unsourced catalog coefficient");
  if(item.evidence_level!=="METHOD_TEMPLATE_ONLY"&&!item.benchmark_reference_id)throw Error("Missing benchmark reference");
  for(const m of item.material_per_unit){if(!safeText(m.id)||!allow.has(m.unit))throw Error("Invalid material");validNum(m.quantity,"Material quantity");}
  const seen=new Set();
  for(const x of item.labor_role_days_per_unit){if(!safeText(x.role)||seen.has(x.role))throw Error("Invalid or duplicate labor role");seen.add(x.role);validNum(x.days,"Labor coefficient");}
  for(const x of item.equipment_hours_per_unit){if(!safeText(x.id))throw Error("Invalid equipment");validNum(x.hours,"Equipment coefficient");}
 }
 return true;
}
export function estimateCatalogWork({library,work_item_id,quantity,unit,crew={},working_hours_per_day=null,
 product_reference_confirmed=false}){
 validateWorkItemLibrary(library);
 const item=library.items.find(x=>x.id===work_item_id);
 if(!item)throw Error("Unknown work item ID; refusing keyword-guess");
 validNum(quantity,"Quantity");if(unit!==item.unit)throw Error("Work quantity unit mismatch");
 if(typeof product_reference_confirmed!=="boolean")throw Error("Reference applicability flag must be boolean");
 const material_requirements=item.material_per_unit.map(x=>({material_id:x.id,unit:x.unit,quantity:x.quantity*quantity,
    evidence:item.evidence_level,source_id:item.benchmark_reference_id}));
 const role_requirements=item.labor_role_days_per_unit.map(x=>({role:x.role,worker_days:x.days*quantity,
    source_id:item.benchmark_reference_id}));
 const gates=[];
 if(!product_reference_confirmed)gates.push("BENCHMARK_SPECIFICATION_AND_LOCAL_APPLICABILITY_UNVERIFIED");
 if(item.evidence_level==="METHOD_TEMPLATE_ONLY")gates.push("NO_PUBLISHED_QUANTITIES_OR_PRODUCTIVITY");
 let days=null,perDay=null,perHour=null;
 if(!role_requirements.length)gates.push("NO_VERIFIED_LABOR_COEFFICIENT");
 else{
  const missing=role_requirements.filter(x=>!Number.isInteger(crew[x.role])||crew[x.role]<1).map(x=>x.role);
  if(missing.length)gates.push("MISSING_CREW_HEADCOUNTS:"+missing.join(","));
  else{
   // Bottleneck role determines days under source's worker-day/unit coefficients.
   const raw=Math.max(...role_requirements.map(x=>x.worker_days/crew[x.role]));
   days=Math.ceil(raw);perDay=quantity/raw;
   if(working_hours_per_day!==null){validNum(working_hours_per_day,"Working hours/day");perHour=perDay/working_hours_per_day;}
   else gates.push("WORKING_HOURS_PER_DAY_NOT_SPECIFIED");
  }
 }
 // Never state numeric reference outputs as actual costs/quantities or approved duration.
 return {work_item_id,work_name:item.name,quantity,unit,calculation_status:days===null?"INCOMPLETE":"REFERENCE_SCENARIO_ONLY",
  engineering_approval:false,site_productivity_verified:false,
  duration_interpretation:"THEORETICAL_LABOR_ROLE_CAPACITY_LOWER_BOUND_NOT_CONSTRUCTION_DURATION",
  source_id:item.benchmark_reference_id,applicability:item.applicability,material_requirements,
  role_requirements,crew_days:days,output_per_crew_day:perDay,output_per_crew_hour:perHour,gates};
}
