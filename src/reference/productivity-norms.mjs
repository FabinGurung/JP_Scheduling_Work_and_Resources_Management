/** Public-safe deterministic productivity mathematics. One persistent reference
 * catalog is NOT a project WBS, an actual production record or a site release. */
export function validateProductivityCatalog(data){
 if(data?.format!=="SKYFORGE_PRODUCTIVITY_REFERENCE_V1"||
  data.authority!=="READ_ONLY_REFERENCE_BENCHMARKS_NO_PROJECT_RELEASE"||
  data.clock!=="WORKER_DAYS_NOT_ELAPSED_CALENDAR_DAYS"||
  data.live_site_authority!==false||
  data.design_workday_hours_assumption!==8||
  !Array.isArray(data.rates)||!Array.isArray(data.sources)||!Array.isArray(data.items)||
  data.items.length!==88||data.rates.length!==11||data.sources.length!==4)
  throw Error("Productivity reference identity/authority mismatch");
 const ids=new Set(data.items.map(x=>x.key)),rs=new Set(data.rates.map(x=>x.id)),src=new Set(data.sources.map(x=>x.id));
 if(ids.size!==88||rs.size!==11||src.size!==4||
    data.items.filter(x=>x.key.startsWith("BOQ:")).length!==37||
    data.items.filter(x=>x.key.startsWith("WBS:")).length!==51)
  throw Error("Productivity item IDs or referenced categories conflict");
 for(const item of data.items){
  if(!/^(BOQ|WBS):\d+(?:\.\d+)?$/.test(item.key)||
   !item.title||!item.unit||item.no_actual_duration!==true||
   item.no_verified_quantity!==true||item.no_verified_crew!==true||
   item.no_approval!==true||(item.rate_key!==null&&!rs.has(item.rate_key)))
   throw Error("Unverified productivity item record");
 }
 for(const rate of data.rates){
  if(!src.has(rate.source)||!rate.unit||!rate.match||
   typeof rate.notes!=="string"||
   ![rate.skilled_md,rate.unskilled_md].some(n=>typeof n==="number"&&n>0)||
   ![rate.skilled_md,rate.unskilled_md].every(n=>n===null||(Number.isFinite(n)&&n>=0)))
   throw Error("Invalid or ungrounded coefficient");
 }
 for(const source of data.sources)
  if(typeof source.url!=="string"||!source.url.startsWith("https://")||
    !source.publisher||!source.document||!source.caveat)throw Error("Source provenance missing");
 return true;
}
export function findWork(data,key){
 validateProductivityCatalog(data);
 const item=data.items.find(x=>x.key===key);
 if(!item)return null;
 return {item,rate:data.rates.find(r=>r.id===item.rate_key)||null};
}
export function calculateWorkRate({quantity,skilled,unskilled,days,rate,unit,applicabilityConfirmed}){
 if(![quantity,skilled,unskilled,days].every(x=>Number.isFinite(x)&&x>=0)||
   days>10000||quantity>1e12||skilled>10000||unskilled>10000)
  throw Error("Invalid physical quantities, crew sizes or workdays");
 if(!rate||!applicabilityConfirmed)return {status:"NO_ADMITTED_COEFFICIENT"};
 if(rate.unit!==unit)throw Error("Incompatible production unit");
 if(!rate.full_crew||rate.skilled_md===null||rate.unskilled_md===null)
  return {status:"PARTIAL_LABOUR_BASIS",note:"A complete worker-role/output model is unavailable; do not compute activity duration"};
 if(rate.skilled_md===0&&rate.unskilled_md===0)throw Error("Unbounded production coefficient");
 const maxSkilled=rate.skilled_md===0?Infinity:skilled/rate.skilled_md;
 const maxUnskilled=rate.unskilled_md===0?Infinity:unskilled/rate.unskilled_md;
 const ratePerDay=Math.min(maxSkilled,maxUnskilled);
 if(!(ratePerDay>0))return {status:"INSUFFICIENT_CREW",unit};
 return {
  status:"REFERENCE_SCENARIO_ONLY",
  nominal_units_per_workday:ratePerDay,
  units_in_requested_workdays:ratePerDay*days,
  nominal_active_workdays:Math.ceil((quantity/ratePerDay)*100)/100,
  rounded_workday_slots:Math.ceil(quantity/ratePerDay),
  unit,
  excludes_waits_holidays_and_actual_field_progress:true
 };
}
