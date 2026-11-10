/* Source-honest reference planner: the 'starter' profile may be a normative
 * coefficient, a documented analogy or an explicitly hypothetical field seed.
 * ALL outputs are calibrated scenarios, not authoritative P6 durations. */
export function validateStarterCatalog(data,base){
 if(data?.format!=="SKYFORGE_PRODUCTIVITY_STARTERS_V2"||
 data.authority!=="REFERENCE_SCENARIOS_NOT_CONSTRUCTION_BASELINE"||
 data.excludes_site_authority!==true||
 !Array.isArray(data.sources)||data.sources.length!==4||
 !Array.isArray(data.profiles)||data.profiles.length!==46||
 !Array.isArray(data.items)||data.items.length!==88||
 base?.format!=="SKYFORGE_PRODUCTIVITY_REFERENCE_V1"||base.items?.length!==88)
  throw Error("Unreviewed source profile registry");
 const profile=new Map(data.profiles.map(x=>[x.id,x]));
 if(profile.size!==46||new Set(data.items.map(x=>x.key)).size!==88)
  throw Error("Duplicated source profile identity");
 for(let i=0;i<data.items.length;i++){
  const p=data.items[i];
  if(p.key!==base.items[i].key||p.reference_profile!==null&&!profile.has(p.reference_profile))
   throw Error("Missing measured source identity "+p.key);
 }
 for(const p of data.profiles){
  if(!["OFFICIAL_DIRECT","OFFICIAL_ANALOG","CALIBRATION_SEED"].includes(p.kind)||
    !["m³","m²","m","each","kg"].includes(p.unit)||
    !(p.skilled_days_per_unit>=0)||!(p.helper_days_per_unit>=0)||
    !Number.isFinite(p.skilled_days_per_unit+p.helper_days_per_unit)||
    p.skilled_days_per_unit+p.helper_days_per_unit<=0||
    !data.sources.some(s=>s.id===p.source_id)||
    p.machine_hours_per_unit!==null&&!(p.machine_hours_per_unit>0)||
    !(p.calibration_factor>0)||!Number.isFinite(p.calibration_factor))
    throw Error("Unreviewed crew coefficient "+p.id);
 }
 return true;
}
const numeric=(v,name,min=0,max=1e8)=>{
 if(typeof v!=="number"||!Number.isFinite(v)||v<min||v>max)throw Error("Invalid "+name);
 return v;
};
export function estimateStarterOutput(profile,{quantity,skilled,helper,machines=0,hours=8,efficiency=100,actualQuantity=null,thicknessMm=null}){
 numeric(quantity,"quantity",0);numeric(skilled,"skilled crew",0,1000);numeric(helper,"helpers",0,1000);
 numeric(machines,"machine count",0,100);numeric(hours,"hours",1,16);numeric(efficiency,"efficiency percent",1,200);
 if(actualQuantity!==null)numeric(actualQuantity,"actual measured quantity");
 if(!profile||!(profile.skilled_days_per_unit>=0)&&!(profile.helper_days_per_unit>=0))
  throw Error("No numeric starting point");
 const sk=profile.skilled_days_per_unit===0?Infinity:skilled/profile.skilled_days_per_unit;
 const hl=profile.helper_days_per_unit===0?Infinity:helper/profile.helper_days_per_unit;
 const machine=profile.machine_hours_per_unit===null?Infinity:
  machines*hours/profile.machine_hours_per_unit;
 const ideal=Math.min(sk,hl,machine);
 const unitsPerDay=(Number.isFinite(ideal)?ideal:0)*(hours/8)*
   (efficiency/100)/profile.calibration_factor;
 // Equipment capacity is already based on operating hours; avoid applying hours twice.
 const machineAdjusted=profile.machine_hours_per_unit===null?unitsPerDay:
  Math.min(Math.min(sk,hl)*(hours/8),machine)*(efficiency/100)/profile.calibration_factor;
 const day=Number.isFinite(machineAdjusted)?Math.max(0,machineAdjusted):0;
 const workdays=day>0?quantity/day:null;
 const output={
  status:day>0?"ILLUSTRATIVE_ONLY":"INSUFFICIENT_RESOURCES",
  unit:profile.unit,units_per_hour:day/hours,units_per_workday:day,
  quantity_done_in_hours:day,requested_quantity:quantity,active_workdays:workdays,
  rounded_full_workdays:workdays===null?null:Math.ceil(workdays),skilled_worker_days:quantity*profile.skilled_days_per_unit,
  helper_worker_days:quantity*profile.helper_days_per_unit,
  equipment_limit_per_workday:profile.machine_hours_per_unit===null?null:
    machine*(hours/profile.machine_hours_per_unit)/profile.calibration_factor,
  evidence_kind:profile.kind,not_actual_or_approved:true,
  actual_efficiency_percent:actualQuantity===null||day<=0?null:actualQuantity/day*100
 };
 if(thicknessMm!==null){
  numeric(thicknessMm,"wall thickness mm",75,600);
  if(profile.unit!=="m³")throw Error("Thickness conversion only applies to masonry volume");
  const m=thicknessMm/1000;
  output.wall_m2_per_workday=day/m;
  output.wall_sqft_per_workday=day/m*10.76391041671;
 }
 if(profile.unit==="m²")output.sqft_per_workday=day*10.76391041671;
 if(profile.unit==="m³")output.cuft_per_workday=day*35.3146667215;
 return output;
}
export function selectStarter(data,base,key){
 validateStarterCatalog(data,base);
 const sourceItem=base.items.find(x=>x.key===key);
 const item=data.items.find(x=>x.key===key);
 if(!sourceItem||!item)throw Error("Unknown BOQ/WBS code");
 return {item:sourceItem,profile:data.profiles.find(x=>x.id===item.reference_profile)||null,status:item.scope};
}
