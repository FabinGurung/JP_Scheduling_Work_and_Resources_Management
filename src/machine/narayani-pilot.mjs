import {createHash} from "node:crypto";
import {executeWbsSample} from "./wbs-cpm.mjs";
export const PILOT_FORMAT="PCK_PROJECT_WBS_ADOPTION_V1";
const sha=x=>createHash("sha256").update(x).digest("hex");
const stringify=x=>JSON.stringify(x,null,2)+"\n";
const fail=s=>{throw Error("Narayani mapping fail closed: "+s);};
function parseDictionaryCodes(text){return [...text.matchAll(/^\*\s+\*\*(\d{4,5}):\*\*/gm)].map(m=>m[1]);}
export function buildNarayaniPilot(seed,dict,config,{seedBlob,dictionaryBlob,configBlob}={}){
 if(config?.format!=="PCK_NARAYANI_MAPPING_CONFIG_V1"||config?.classification!=="PUBLIC_SAFE_DERIVED_PLANNING_ONLY")fail("unapproved mapping contract");
 if(config.project?.project_id!=="PRJ-000007"||config.project?.project_code!=="FBL-006"||!config.project?.public_label)fail("project identity mismatch");
 const configHash=sha(stringify(config));
 const plan=executeWbsSample(seed,dict,{seedSnapshotSha:seedBlob,dictionarySnapshotSha:dictionaryBlob}).plan;
 if(plan.task_count!==45||plan.relationship_count!==49||plan.milestone_count!==7||plan.phases.length!==10)fail("master schedule unexpected");
 const dictionaryCodes=parseDictionaryCodes(dict),masterCodes=new Set(plan.activities.map(a=>a.activity_id.slice(1)));
 const pending=dictionaryCodes.filter(x=>!masterCodes.has(x));
 if(dictionaryCodes.length!==47||pending.join(",")!=="5020,9050")fail("dictionary delta changed; reconcile before admission");
 if(Object.keys(config.phase_mapping).length!==plan.phases.length||plan.phases.some(p=>!config.phase_mapping[p.wbs_code]))fail("unmapped WBS phase");
 const sourceTasks=new Map(plan.activities.map(a=>[a.activity_id,a]));
 if(!Array.isArray(config.holds)||config.holds.length!==5)fail("unexpected hold registry");
 const holdIds=new Set();
 for(const h of config.holds){
  if(typeof h.id!=="string"||holdIds.has(h.id)||!plan.phases.some(p=>p.wbs_code===h.wbs_code))fail("invalid hold ID or WBS");
  if(!h.title||!h.reason||!h.action||!Array.isArray(h.source_categories)||h.source_categories.length===0||!Array.isArray(h.activity_ids))fail("incomplete hold evidence");
  if(h.activity_ids.some(id=>!sourceTasks.has(id)))fail("unresolved activity reference");
  if(h.authority==="APPROVED"||h.authority==="DONE"||h.authority==="RELEASED")fail("hold cannot claim approval");
  if(h.source_categories.some(x=>typeof x!=="string"||!/^[-A-Z0-9_]+$/.test(x)))fail("invalid source category");
  holdIds.add(h.id);
 }
 const phaseMap=new Map(plan.phases.map(p=>[p.wbs_code,config.phase_mapping[p.wbs_code]]));
 const activities=plan.activities.map(a=>({
  activity_id:a.activity_id,wbs_code:a.wbs_code,name:a.name,type:a.type,predecessor_ids:a.predecessor_ids,
  planned_workday_slots:a.duration_days,master_early_start_slot:a.early_start_slot,master_finish_exclusive_slot:a.early_finish_exclusive_slot,
  master_critical:a.critical,adoption_state:"TEMPLATE_ONLY_SCOPE_UNAPPROVED",
  phase_review:phaseMap.get(a.wbs_code),actual_status:"NO_VERIFIED_PROGRESS",
  hold_ids:config.holds.filter(h=>h.activity_ids.includes(a.activity_id)).map(h=>h.id)
 }));
 const result={format:PILOT_FORMAT,classification:"PUBLIC_SAFE_DERIVED_PLANNING_ONLY",
  project:{...config.project,verified_progress:false,site_permits_verified:false,schedule_baseline_approved:false},
  master:{type:"P6_STYLE_SYNTHETIC_REFERENCE_NOT_P6_EXPORT",activities:45,relationships:49,milestones:7,phases:10,duration_workday_slots:plan.duration_workday_slots,
   dictionary_defined:47,dictionary_seed_missing:pending,master_scheduling_basis:"ZERO_LAG_FS_NO_DATE_OR_RESOURCE_CALENDAR", source_sha256:{seed:sha(stringify(seed)),dictionary:sha(dict)}},
  phases:plan.phases.map(p=>({wbs_code:p.wbs_code,name:p.name,activity_count:p.activity_count,phase_review:config.phase_mapping[p.wbs_code]})),
  milestones:plan.milestones.map(m=>({activity_id:m.activity_id,wbs_code:m.wbs_code,name:m.name,
   master_slot:m.early_start_slot,verified_complete:false,site_target_date:null})),
  activities,hold_points:config.holds,
  quality:{...config.quality_contract,hold_points:config.holds.length,
   unresolved_scope_count:pending.length,source_reconciliation:"PRJ_000007_INDEX_AND_FIELD_NOTES_READ_2026_10_15",
   no_authentication_claim:true,
   field_reporting_available:false,
   note:"Template dependency slots are not Narayani construction instructions or actual project dates."}};
 validateNarayaniPilot(result);
 const map=jsonString(result);
 const manifest={format:"PCK_PROJECT_WBS_ADOPTION_EVIDENCE_V1",classification:"PUBLIC_SAFE_DERIVED_PLANNING_ONLY",
   public_name:config.project.public_label,master_source_snapshot_git_blobs:{seed:seedBlob,dictionary:dictionaryBlob},
   mapping_config_git_blob:configBlob,mapping_config_sha256:configHash,
   output_sha256:{ "map.json":sha(map)},
   approval_status:"WBS_ADOPTION_NOT_APPROVED",private_source_identifiers_published:false,
   mode:"GENERIC_MASTER_PLUS_DOCUMENTED_HOLD_POINTS; NO_REAL_SITE_SCHEDULE"};
 return {project:result,files:{"map.json":map,"manifest.json":stringify(manifest)},manifest};
}
function jsonString(x){return JSON.stringify(x,null,2)+"\n";}
export function validateNarayaniPilot(p){
 if(p?.format!==PILOT_FORMAT||p.classification!=="PUBLIC_SAFE_DERIVED_PLANNING_ONLY"||p.project?.project_id!=="PRJ-000007")fail("project classification identity");
 if(p.master?.activities!==45||p.master?.relationships!==49||p.master?.milestones!==7||p.master?.dictionary_defined!==47)fail("master counts");
 if(!Array.isArray(p.activities)||p.activities.length!==45||!Array.isArray(p.hold_points)||p.hold_points.length!==5)fail("missing bounded data");
 const ids=new Set(p.activities.map(a=>a.activity_id));
 if(ids.size!==45||p.activities.some(a=>a.actual_status!=="NO_VERIFIED_PROGRESS"||a.adoption_state!=="TEMPLATE_ONLY_SCOPE_UNAPPROVED"||a.predecessor_ids.some(id=>!ids.has(id))))fail("status or predecessor violation");
 if(p.project.verified_progress||p.project.site_permits_verified||p.project.schedule_baseline_approved)fail("cannot certify real project");
 if(p.milestones.some(m=>m.verified_complete||m.site_target_date!==null))fail("unverified milestone");
 if(p.hold_points.some(h=>h.authority==="APPROVED"||h.authority==="DONE"))fail("unverified hold");
 if(p.quality?.field_reporting_available!==false||p.quality?.no_authentication_claim!==true)fail("public auth misrepresentation");
 return true;
}
