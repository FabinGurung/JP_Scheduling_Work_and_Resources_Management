/* Harisharan BOQ resource gate V003. No arbitrary calendar days or invented site releases.
   An estimated workday is returned only for an item with compatible published
   resource coefficients and a source BOQ quantity. Cross-border calibration seeds,
   unsafe geometry and unsupported unit conversions remain null, NOT zero. */
const heldFlags=new Set([
 "RECONCILE_GEOMETRY","RECONCILE_PARENT_EXCAVATION","REQUIRES_COMPACTION_HAUL_EVIDENCE",
 "UNIT_MISMATCH_AREA_TO_VOLUME_AND_SCOPE","RECONCILE_PCC_MEASUREMENTS",
 "STRUCTURAL_M25_AND_MEMBER_SPLIT_REQUIRED","SPLIT_COLUMN_BEAM_SLAB_FOOTING_CONTACT_AREAS",
 "REFERENCE_EXPECTS_METRE_NOT_CUBIC_METRE","REFERENCE_EXPECTS_EACH_NOT_AREA",
 "NO_REFERENCE_MATERIAL_SCOPE","REQUIRES_STEEL_MASS","NO_DESIGN_QUANTITY",
 "CAPACITY_CONFLICT_WITH_EARLIER_TANK_PLAN","DESIGN_VOLUME_AND_DRAWINGS_REQUIRED",
 "REQUIRES_LINEAR_METRE_TAKEOFF",
 "CALIBRATION_SEED_NOT_ADMITTED","CALIBRATION_SEED_PRODUCT_REQUIRED",
 "CALIBRATION_SEED_BBS_REQUIRED","CALIBRATION_SEED_FABRICATION_REQUIRED"
]);
function finite(x){return typeof x==="number"&&Number.isFinite(x)&&x>=0;}
export function evaluateHarisharanBOQ(source,starters,materials){
 if(source?.format!=="HARISHARAN_BOQ_QUANTITY_REFERENCE_V003"||source?.project_id!=="PORT-000014"||
 source.records?.length!==34||source.origin_date!=="2026-11-16"||
 source.structural_grade!=="M25_PER_REPORT_AND_NBC105_2025_15M"||
 source.stirrup_diameter_mm!==8||source.construction_approval!==false||
 source.crew?.skilled!==2||source.crew?.unskilled!==3||
 source.crew?.shift_hours!==8||source.crew?.weekly_rest!=="Saturday"||
 starters?.format!=="SKYFORGE_PRODUCTIVITY_STARTERS_V2"||starters.profiles?.length!==46||
 materials?.format!=="SKYFORGE_WORK_MATERIAL_REFERENCE_V1"||materials.recipes?.length!==36)
 throw Error("Unreviewed Harisharan source or code-safety contract");
 const p=new Map(starters.profiles.map(x=>[x.id,x]));
 let admissible=0,conditional=0,unresolved=0,scopedLabour=0,shortfall=0;
 const computed=source.records.map(record=>{
  const profile=p.get(record.profile_id),missing=record.profile_id!==null&&!profile;
  if(missing)throw Error("Unknown profile "+record.profile_id);
  const unitMatch=!!profile&&record.unit===profile.unit;
  const geometryHold=heldFlags.has(record.quality_flag);
  const unadmitted=profile?.kind==="CALIBRATION_SEED";
  // Measurement-sheet row numbers are NOT BOQ-sheet row numbers. Only explicit mapped BOQ rows may block this item.
  const sourceErr=source.measurement_errors.some(x=>x.boq_rows?.includes(record.boq_row));
  const eligible=!!profile&&unitMatch&&!geometryHold&&!unadmitted&&!sourceErr&&finite(record.source_quantity)&&record.source_quantity>0;
  let days=null,output=null,eff=null,machineName=null,machineHours=null;
  if(eligible){
   const skilled=profile.skilled_days_per_unit>0?source.crew.skilled/profile.skilled_days_per_unit:Infinity;
   const helper=profile.helper_days_per_unit>0?source.crew.unskilled/profile.helper_days_per_unit:Infinity;
   const hours=profile.machine_type==="Compactor"?source.crew.compactor_max_operating_hours_per_day:source.crew.mixer_max_operating_hours_per_day;
   const equip=profile.machine_hours_per_unit>0?hours/profile.machine_hours_per_unit:Infinity;
   output=Math.min(skilled,helper,equip)/profile.calibration_factor;
   if(!Number.isFinite(output)||output<=0)throw Error("Missing crew/machine output "+record.id);
   days=Math.ceil(record.source_quantity/output-1e-9);
   if(days<=0)throw Error("Invalid duration");
   eff=(record.source_quantity/output);
   machineName=profile.machine_type||null;
   machineHours=profile.machine_hours_per_unit??null;
   if(profile.kind==="OFFICIAL_DIRECT")admissible++;else conditional++;
   scopedLabour+=days;
  }else{
   unresolved++;
   if(record.source_quantity>0&&profile&&unitMatch&&geometryHold)shortfall++;
  }
  return {...record,status:eligible?(profile.kind==="OFFICIAL_DIRECT"?
       "QUANTITY_RATE_CALCULATED_PRE_APPROVAL":"OFFICIAL_ANALOG_CALCULATED_REQUIRES_METHOD_REVIEW"):
       "HOLD_NO_DEFENSIBLE_DURATION",
   duration_workdays:days,daily_output:output?+output.toFixed(4):null,raw_crew_workdays:eff?+eff.toFixed(4):null,
   rate_grade:profile?.kind??null,reference_source:profile?.source_id??null,
   required_machine:machineName,machine_hours_per_unit:machineHours,
   crew_limit:"2 skilled + 3 unskilled; one task crew, 8h; mixer/compactor 2 operating hours/day; NO overlapping same-house trades",
   quantity_approved:false,rate_approved:false,
   date_start:null,date_finish:null
  };
 });
 const upper=6*2.55*2.55*.6+12*2.7*2.1*.6;
 const delta=source.original_boq_footing_component_m3-upper;
 if(Math.abs(upper-64.233)>.0001||delta<19||delta>21)throw Error("Footing inconsistency not tracked");
 return {
  format:"HARISHARAN_MEASURED_RESOURCE_FEASIBILITY_V003",
  project_id:source.project_id,edition:"v003",authority:"PRE_APPROVAL_SOURCE_GRADED_NO_ILLUSTRATIVE_TASK_DURATIONS",
  beginning:"2026-11-16",
  construction_approval:false,structural_grade_policy:source.structural_grade,
  structural_report_requires_M25_all_RCC:true,
  owner_M20_other_structural_concrete:"BLOCKED_BY_15M_CODE_AND_REPORT",
  nonstructural_M20:"ONLY_WHERE_APPROVED_SPEC_SUPPORTS",
  stirrup_diameter_mm:8,
  crew:source.crew,
  status:"RESOURCE_AND_MEASUREMENT_RECONCILIATION_NOT_A_RELEASED_BASELINE",
  wbs_839_activity_readiness:"ALL_EXISTING_V002_ILLUSTRATIVE_DATES_EXCLUDED_FROM_V003_BASELINE",
  activities_with_approved_resource_loaded_duration:0,
  resource_estimate_items:computed.filter(x=>x.duration_workdays!==null).length,
  derived_crew_workdays_minimum_for_scoped_items:scopedLabour,
  project_finish_date:null,
  id_index:computed.length,
  coverage:{published_direct:admissible,published_analogs:conditional,held_no_duration:unresolved,
   geometry_or_method_blockers:shortfall,material_recipes_available:materials.recipes.length,
   full_building_WBS_activities:839,unmapped_or_unmeasured_WBS_activities:839,
   methodology:"One fixed five-person crew, sequential for the subset of measured items; not a 839-task CPM, not a final project horizon"},
  footing_geometry:{...source.drawing_footing,gross_rectangular_m3:64.233,
   original_boq_breakdown_m3:source.original_boq_footing_component_m3,
   discrepancy_m3:+delta.toFixed(6),
   net_sloped_m3:null,
   unresolved:"Top plateau geometry, eccentric slope location and edge thickness missing. Gross prism is maximum, not a purchase quantity."},
  records:computed,
  audit:source.measurement_errors,
  references:[
  {id:"BOQ",name:"Without-basement itemized BOQ, archived in restricted Drive",uri:null},
  {id:"STR01",name:"Structural sheet STR-01, footing schedule",uri:null},
  {id:"STR02",name:"Structural sheet STR-02, sloped footing sections",uri:null},
  {id:"RPT",name:"Structural analysis report §Materials and Footing table",uri:null},
  {id:"NBC105",name:"Nepal NBC 105:2025, §2.1, §4 transverse detailing",uri:"https://giwmscdnone.gov.np/media/files/NBC_105_2025_Seismic%20Design%20of%20Buildings%20in%20Nepal_lqqvx6a.pdf"},
  ...starters.sources.map(x=>({id:x.id,name:x.title,uri:x.url}))]
 };
}
