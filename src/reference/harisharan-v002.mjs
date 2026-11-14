/* Harisharan V002: deterministic dated, source-graded read-only schedule.
 * Reuses the unchanged 839-activity V001, official/analog work-rate starters
 * and material library without treating provisional quantities as construction approvals.
 */
import {sha256Hex} from "../kernel/sha256.mjs";
export const HARISHARAN_START="2026-11-16";
const dayMs=86400000;
const dateAt=n=>{
 const start=Date.parse(HARISHARAN_START+"T00:00:00Z");
 if(!Number.isInteger(n)||n<0||n>4000)throw Error("Invalid relative workday");
 let cursor=start,remaining=n;
 while(remaining>0){cursor+=dayMs;if(new Date(cursor).getUTCDay()!==6)remaining--;}
 return new Date(cursor).toISOString().slice(0,10);
};
const isoValid=x=>typeof x==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(x);
const round3=x=>Number(x.toFixed(3));
const matchWork=(a)=>{
 const t=a.title.toLowerCase(),p=a.phase;
 if(/footing.*(pour|concrete)/.test(t))return {profile:"m20_footing",recipe:null,assumption:"M20 labour-only placement analogy for owner-selected M25; not an M25 mix design"};
 if(/excavat/.test(t))return {profile:"soil_exc",recipe:null,assumption:"Soil method, lift and disposal to confirm"};
 if(/rebar|reinforcement|longitudinal steel|slab top\/bottom mats|bars/.test(t))return {profile:"steel_rebar",recipe:"rebar",assumption:"No BBS / member-wise mass; reference only"};
 if(/pcc|plain concrete/.test(t))return {profile:"pcc_136",recipe:"concrete_M10",assumption:"Use only if PCC 1:3:6 is confirmed; no quantity inferred"};
 if(/formwork|shutter|soffit|falsework/.test(t))return {profile:/column/.test(t)?"form_column":/slab/.test(t)?"form_slab":/footing/.test(t)?"form_footing":"form_beam",recipe:"formwork",assumption:"Contact-face measurement and member type unverified"};
 if(/plaster|render/.test(t))return {profile:p==="FINISHES"&&/external/.test(t)?"plaster_outside":"plaster_inside",recipe:/external/.test(t)?"plaster_20":"plaster_12_5",assumption:"Plaster thickness and mortar mix to confirm"};
 if(/waterproof/.test(t))return {profile:"waterproof",recipe:"waterproof",assumption:"Membrane system and measured wetted area required"};
 if(/brick|masonry/.test(t))return {profile:"brick_1_4",recipe:"brick_1_4",assumption:"Brick unit and mortar mix unverified"};
 if(/floor tile|wall tile/.test(t))return {profile:/floor/.test(t)?"floor_vitrified_tile":"wall_tiles",recipe:"tiles",assumption:"Finish selection and true net tile area unverified"};
 if(/screed/.test(t))return {profile:"floor_screed",recipe:"floor_screed",assumption:"Actual screed build-up/thickness unverified"};
 if(/window/.test(t))return {profile:"upvc_window",recipe:"upvc_area",assumption:"Material and dimensions not yet approved"};
 if(/door/.test(t))return {profile:"wood_shutter",recipe:"wood_shutter",assumption:"Material/spec not yet approved"};
 if(/painting|paint/.test(t))return {profile:"paint_2coat",recipe:"paint",assumption:"Product and net surface area not measured"};
 return {profile:null,recipe:null,assumption:"No matched measured full-activity work rate"};
};
export function buildHarisharanV002(v1,starters,materials){
 if(v1?.format!=="HARISHARAN_DETAILED_WBS_DRAFT_V000001"||
   v1.project_id!=="PORT-000014"||v1.activities?.length!==839||v1.dependency_count!==1321||
   v1.scope!=="WITHOUT_BASEMENT"||v1.engineering_release!==false||
   v1.decisions?.column_tie_diameter_mm!==8)
   throw Error("Harisharan source or owner decisions changed");
 if(starters?.format!=="SKYFORGE_PRODUCTIVITY_STARTERS_V2"||starters.profiles?.length!==46||
   materials?.format!=="SKYFORGE_WORK_MATERIAL_REFERENCE_V1"||materials.recipes?.length!==36)
   throw Error("Planner reference versions changed");
 if(new Date(HARISHARAN_START+"T00:00:00Z").getUTCDay()===6)throw Error("Saturday cannot be the selected start date");
 const profiles=new Map(starters.profiles.map(p=>[p.id,p]));
 const recipes=new Map(materials.recipes.map(p=>[p.id,p]));
 const sources=Object.fromEntries(starters.sources.map(s=>[s.id,{title:s.title,url:s.url,section:s.description}]));
 for(const s of materials.sources)if(!sources[s.id])sources[s.id]={title:s.title,url:s.url,section:s.reference||s.provenance};
 sources["HAR-ARCH"]={title:"Harisharan architectural drawings (private project source)",url:"https://github.com/FabinGurung/jp-scheduling-resources-management/tree/kernel-v0.2-open-source-engines/projects/fishtail/harisharan-residence",section:"Private originals stay in restricted project Drive, public model contains only derivatives"};
 const ids=new Set(),lookup=new Map(),predecessors=[];
 let candidate=0,quantified=0,rateApplied=0,materialUnresolved=0,quantifiedGross=0;
 const activities=v1.activities.map(source=>{
  if(ids.has(source.activity_id))throw Error("Duplicated activity");
  ids.add(source.activity_id);
  const mapping=matchWork(source),profile=mapping.profile?profiles.get(mapping.profile):null;
  if(mapping.profile&&!profile)throw Error("Unknown matched profile");
  if(mapping.recipe&&!recipes.has(mapping.recipe))throw Error("Unknown mapped recipe");
  if(profile)candidate++;
  const measured=typeof source.quantity==="number"&&source.quantity>0&&source.quantity_unit;
  if(measured)quantified++;
  const fullMatch=measured&&profile&&source.quantity_unit===profile.unit&&
      /footing.*(pour|concrete)/i.test(source.title)&&profile.id==="m20_footing";
  let days=source.duration_workdays;
  const components=[];
  if(fullMatch){
   // Owner-selected 2 skilled, 3 helpers, 1 mixer, 2 machine operating hours/day.
   // Only rate ANALOGY for labour placement (M20 -> M25); NO grade/material design equivalence.
   const dayOutput=Math.min(
    profile.skilled_days_per_unit>0?2/profile.skilled_days_per_unit:Infinity,
    profile.helper_days_per_unit>0?3/profile.helper_days_per_unit:Infinity,
    profile.machine_hours_per_unit>0?2/profile.machine_hours_per_unit:Infinity
   )/profile.calibration_factor;
   if(!(dayOutput>0))throw Error("No workable reference output");
   days=Math.max(days,Math.ceil(source.quantity/dayOutput));
   rateApplied++;
   quantifiedGross+=source.quantity;
   materialUnresolved++;
   components.push({
    code:"HAR-M25-FOOTING",quantity:source.quantity,unit:"m³",
    output:dayOutput,days:source.quantity/dayOutput,profile:profile.id,grade:"OFFICIAL_ANALOG",
    source:profile.source_id,section:profile.source_item,
    scope:"Gross footing envelope. M20 labour analogue only: M25 casting mix, supplier capacity and true slope geometry must be approved.",
    machine_hours_per_day:2,
    crew:{skilled:2,helpers:3,machines:1,hours_per_day:8},
    assemblies:[{name:"M25 concrete ingredients · designer mix required",grade:"DESIGN_INPUT_REQUIRED",
      lines:[{name:"Cement for M25 design mix",unit:"bag",quantity:null,basis:"APPROVED_MIX_DESIGN_REQUIRED",source:"NEP-DWRI-2081"},
             {name:"Fine aggregate for M25 design mix",unit:"m³",quantity:null,basis:"APPROVED_MIX_DESIGN_REQUIRED",source:"NEP-DWRI-2081"},
             {name:"Coarse aggregate for M25 design mix",unit:"m³",quantity:null,basis:"APPROVED_MIX_DESIGN_REQUIRED",source:"NEP-DWRI-2081"}]}]
   });
  }
  const data={
   id:source.activity_id,title:source.title,wbs_id:source.wbs,level:source.scope,
   hold:source.engineering_hold?["Engineer hold / inspection not released"]:[],
   status:"CALCULATED_DRAFT_NOT_ACTUAL",engineering_release:false,
   duration:days,start:0,finish:0,start_date:null,finish_date:null,
   original_v001_duration:source.duration_workdays,
   total_float_workdays:null,
   quantity:measured?source.quantity:null,quantity_unit:measured?source.quantity_unit:null,
   quantity_basis:source.quantity_basis,resource_category:source.crew_category,
   reference_profile_candidate:profile?.id??null,
   material_recipe_candidate:mapping.recipe,
   reference_method_note:mapping.assumption,
   estimate:fullMatch?
    {duration:days,kind:"Rate analogy — M20 placement labour to M25 scope (provisional)",components,
     note:"M25 remains the governing structural grade. Labour-only analogy is not an approved crew rate or concrete design. No M20 material recipe applied."}:
    {duration:days,kind:source.duration_workdays===0?"Milestone / open engineering gate":"Planning allowance",components:[],
     note:(measured?"Quantity available but applicable whole-activity design/rate not verified. ":"No verified whole-activity takeoff; duration retained from v001. ")+mapping.assumption},
   material_status:fullMatch?"M25_INGREDIENTS_AWAIT_APPROVED_MIX":mapping.recipe?"ASSEMBLY_CANDIDATE_QUANTITY_UNVERIFIED":"NOT_MAPPED",
   source_refs:source.source_refs,
   actual_start:null,actual_finish:null,actual_percent:null
  };
  lookup.set(data.id,data);predecessors.push(...source.predecessor_ids.map(p=>({from:p,to:data.id,type:source.logic_type||"FS",lag:source.lag_workdays||0})));
  return data;
 });
 if(activities.length!==839||predecessors.length!==1321||quantified!==18||rateApplied!==18)throw Error("Unexpected schedule mapping scope/quantity");
 for(const a of activities){
  const links=predecessors.filter(p=>p.to===a.id);
  let start=0;for(const e of links){const prev=lookup.get(e.from);if(!prev)throw Error("Unknown predecessor "+e.from);if(prev===a)throw Error("Self-cycle");start=Math.max(start,prev.finish+(e.lag||0));}
  a.start=start;a.finish=start+a.duration;
  a.start_date=dateAt(a.start);a.finish_date=dateAt(a.finish);
  if(!isoValid(a.start_date)||!isoValid(a.finish_date))throw Error("Bad activity calendar date");
 }
 const span=Math.max(...activities.map(x=>x.finish));
 if(span>2500)throw Error("Unrealistic horizon exceeds safe range");
 const succ=new Map(activities.map(a=>[a.id,[]]));
 for(const e of predecessors)succ.get(e.from).push(e.to);
 const latest=new Map();
 for(const a of [...activities].reverse()){
  const next=succ.get(a.id),latestFinish=next.length?Math.min(...next.map(id=>latest.get(id))):span;
  const latestStart=latestFinish-a.duration;
  if(latestStart<a.start)throw Error("Negative float in proposed network");
  latest.set(a.id,latestStart);
  a.total_float_workdays=latestStart-a.start;
  a.critical=a.total_float_workdays===0;
 }
 const wbsIds=[...new Set(activities.map(x=>x.wbs_id))];
 const wbs=wbsIds.map(id=>({id,title:id.replace(/^HAR\./,"").replaceAll("."," · ").replaceAll("_"," "),parent_id:null}));
 const holds=[
 {title:"M25 mix design, column Ø8 ties and footing slope approval",activities:activities.filter(x=>/footing.*pour|transverse links/i.test(x.title)).map(x=>x.id),status:"Open"},
 {title:"Grid, soil, issued drawings, unmeasured trade takeoffs and MEP scope",activities:activities.filter(x=>x.hold.length>0).slice(0,25).map(x=>x.id),status:"Open"}
 ];
 return {
  format:"SKYFORGE_GENERIC_VIEW_MODEL_V1",
  classification:"PUBLIC_SAFE_GOVERNED_SCENARIO",
  project:{id:"PORT-000014",name:"Harisharan Residence"},
  input_sha256:sha256Hex(JSON.stringify({revision:"v002",v1_digest:sha256Hex(JSON.stringify(v1)),rate_version:starters.version,material_version:materials.version,start:HARISHARAN_START})),
  revision:"v002",
  planning_status:"Dated reference scenario from source v001 (not an engineering baseline)",
  harisharan_v002:true,
  planned_start_date:HARISHARAN_START,
  planned_finish_exclusive:dateAt(span),
  project_start_date:HARISHARAN_START,
  working_calendar:{days:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday"],weekly_holiday:"Saturday",hours_per_day:8,other_holidays_applied:false},
  baseline_approved:false,engineering_release:false,
  views_basis:"ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL",
  source_count:v1.source_fingerprints?.length||3,source_rule_count:rateApplied,
  citations:sources,holds,
  wbs,activities,links:predecessors,calendar_events:[],checklist:[],
  counts:{wbs:wbs.length,activities:activities.length,links:predecessors.length,checklist:0},
  planner_integration:{
   status:"PARTIAL_SOURCE_GRADED_NOT_RESOURCE_LEVELED",source_revision:"HARISHARAN_DETAILED_WBS_DRAFT_V000001",
   work_rate_profiles_available:starters.profiles.length,
   material_recipes_available:materials.recipes.length,
   reference_profile_candidates:candidate,quantified_activities:quantified,
   labour_analogy_calculated_activities:rateApplied,unmeasured_or_unrated_activities:activities.length-rateApplied,
   material_retakeoff_numeric_items_for_M25:0,material_assemblies_await_design:materialUnresolved,
   gross_prismatic_footing_m3:round3(quantifiedGross),
   m25_recipe_applied:false,ambiguous_footing_slope_excluded:true,
   reference_crews:{skilled:2,helpers:3,hours:8,mixer_operating_hours_per_day:2},
   remaining_work: ["Reconcile approved M25 mix and actual supplier output","Replace footing envelope with approved sloped section volumes","Complete trade-wise quantity takeoffs / matched DUDBC methods","Resource-level and account for Nepal public holidays / weather","Review all engineering and inspection holds before construction"]
  },
  original_v001_span_workdays:v1.provisional_total_workdays,
  provisional_span_workdays:span,
  no_actual_progress:true,
  no_approved_dates:true
 };
}
