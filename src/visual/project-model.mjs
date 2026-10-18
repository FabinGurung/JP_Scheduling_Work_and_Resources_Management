import {createHash} from "node:crypto";
export const MODEL_FORMAT="PCK_CONSTRUCTION_VIEW_MODEL_V1";
const fail=s=>{throw Error("Visual project model rejected: "+s);};
const hash=x=>createHash("sha256").update(x).digest("hex");
const stringify=x=>JSON.stringify(x,null,2)+"\n";
const safe=x=>typeof x==="string"&&x.length>0&&x.length<=250&&!/[<>]/.test(x);
const iso=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x+"T00:00:00Z"));
// Editorially shortened labels are traceable to each original master WBS activity.
// The complete original name remains in title, Gantt, day detail and node drawer.
const CALENDAR_LABELS={
  "T1010": "Client consultation",
  "T1020": "Site survey",
  "T1030": "Budget + charter",
  "M1040": "Project kickoff",
  "T2010": "Concept design",
  "T2020": "Schematic design",
  "T2030": "Structural design",
  "T2040": "MEP design",
  "T2050": "Construction drawings",
  "M2060": "Design freeze",
  "T3010": "Zoning clearance",
  "T3020": "Drawing submission",
  "T3030": "Permit revisions",
  "T3040": "Building permits",
  "M3050": "Permits milestone",
  "T4010": "Site mobilization",
  "T4020": "Site clearing",
  "T4030": "Building set-out",
  "T5010": "Excavation",
  "T5030": "Footing RCC",
  "T5040": "Below-grade waterproofing",
  "T5050": "Ground slab",
  "M5060": "Substructure milestone",
  "T6010": "Columns + walls",
  "T6020": "Suspended slabs",
  "T6030": "Roof framing",
  "M6040": "Superstructure milestone",
  "T7010": "Facade masonry",
  "T7020": "Roof waterproofing",
  "T7030": "Windows + doors",
  "M7040": "Weather-tight milestone",
  "T8010": "HVAC rough-in",
  "T8020": "Plumbing rough-in",
  "T8030": "Electrical rough-in",
  "T8040": "MEP inspection",
  "T9010": "Insulation + drywall",
  "T9020": "Plaster + first paint",
  "T9030": "Flooring + tiles",
  "T9040": "MEP fixtures",
  "T9060": "Final painting",
  "T10010": "MEP commissioning",
  "T10020": "Final inspections",
  "T10030": "Client snag list",
  "T10040": "Final cleaning",
  "M10050": "Final handover"
};
export function horizonEndExclusive(day,months){
 if(!iso(day)||!Number.isSafeInteger(months)||months<1||months>12)fail("calendar horizon");
 const d=new Date(day+"T00:00:00Z"),target=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+months,1));
 const dayOfMonth=Math.min(d.getUTCDate(),new Date(Date.UTC(target.getUTCFullYear(),target.getUTCMonth()+1,0)).getUTCDate());
 target.setUTCDate(dayOfMonth);
 return target.toISOString().slice(0,10);
}
export function validateChecklistConfig(c){
 if(c?.format!=="PCK_VISUAL_CHECKLIST_CONFIG_V1"||c.classification!=="PUBLIC_SAFE_TEMPLATE_NOT_SITE_INSTRUCTIONS"||c.project_id!=="PRJ-000007")fail("config identity");
 if(!iso(c.default_scenario_start)||c.timezone!=="Asia/Kathmandu"||c.horizon_months!==3)fail("scenario contract");
 if(c.working_weekdays?.join(",")!=="1,2,3,4,5,6"||c.core_checks?.length!==7||Object.keys(c.per_phase_checks||{}).length!==10)fail("working calendar/checklist contract");
 for(const [p,q] of Object.entries(c.per_phase_checks)){if(!/^\d{4,5}$/.test(p)||q.checks?.length!==2||!q.checks.every(safe))fail("phase step template");}
 for(const a of c.core_checks)if(!safe(a.title)||!safe(a.help)||!safe(a.suffix)||!safe(a.type))fail("core check");
 const fields=["goal","leads","prepare","execute","inspect","evidence"];
 if(Object.keys(c.per_phase_briefs||{}).length!==10)fail("phase field brief coverage");
 for(const [id,brief] of [...Object.entries(c.per_phase_briefs),...Object.entries(c.activity_briefs||{})])
  if(!brief||Object.keys(brief).sort().join(",")!==[...fields].sort().join(",")||fields.some(k=>!safe(brief[k])))fail("invalid field brief "+id);
 for(const key of ["activity_response_options","checklist_response_options"]){
  if(c[key]?.length!==5||c[key].map(x=>x.code).join("")!=="ABCDE"||c[key].some(x=>!safe(x.label)||!safe(x.state)))fail("MCQ contract");
 }
 return true;
}
export function scenarioDate(date,startSlot,workingWeekdays=[1,2,3,4,5,6]){
 if(!iso(date)||!Number.isSafeInteger(startSlot)||startSlot<0||startSlot>5000)fail("date slot");
 const dateObject=new Date(date+"T00:00:00Z");
 // Day 0 is the first working date on or after the scenario anchor.
 let n=0;
 while(!workingWeekdays.includes(dateObject.getUTCDay()))dateObject.setUTCDate(dateObject.getUTCDate()+1);
 while(n<startSlot){dateObject.setUTCDate(dateObject.getUTCDate()+1);if(workingWeekdays.includes(dateObject.getUTCDay()))n++;}
 return dateObject.toISOString().slice(0,10);
}
export function compileVisualModel(pilot,progress,cfg,reported={
 format:"PCK_PUBLIC_MCQ_STATE_V1",classification:"PUBLIC_SAFE_REPORTED_STATES_ONLY",
 project_id:"PRJ-000007",authority:"REPORTED_ONLY_NOT_ENGINEERING_APPROVED",version:0,entries:[]
}){
 validateChecklistConfig(cfg);
 if(reported?.format!=="PCK_PUBLIC_MCQ_STATE_V1"||reported.classification!=="PUBLIC_SAFE_REPORTED_STATES_ONLY"||
  reported.project_id!=="PRJ-000007"||reported.authority!=="REPORTED_ONLY_NOT_ENGINEERING_APPROVED"||
  !Number.isSafeInteger(reported.version)||reported.version<0||!Array.isArray(reported.entries)||reported.entries.length>405+45)fail("MCQ sanitized state authority");
 if(pilot?.format!=="PCK_PROJECT_WBS_ADOPTION_V1"||pilot.classification!=="PUBLIC_SAFE_DERIVED_PLANNING_ONLY"||pilot.project?.project_id!=="PRJ-000007"||pilot.activities?.length!==45||pilot.milestones?.length!==7||pilot.phases?.length!==10||pilot.project.schedule_baseline_approved!==false)fail("master WBS reference");
 if(progress?.format!=="PCK_NARAYANI_PROGRESS_PROJECTION_V1"||progress.classification!=="PUBLIC_SAFE_COUNTS_ONLY"||progress.project_id!=="PRJ-000007"||progress.completed_wbs_activities!==0||progress.verified_milestones!==0||progress.plan_baseline_approved!==false)fail("field progress authority");
 const phases=pilot.phases.map((p,i)=>({id:p.wbs_code,title:p.name,index:i+1,review_state:p.phase_review}));
 const phaseids=new Set(phases.map(x=>x.id));
 const ids=new Set(pilot.activities.map(x=>x.activity_id));
 if(ids.size!==45||pilot.activities.some(x=>!phaseids.has(x.wbs_code)))fail("orphan activity");
 if(Object.keys(CALENDAR_LABELS).length!==45||pilot.activities.some(a=>!CALENDAR_LABELS[a.activity_id]))fail("calendar label coverage does not match master WBS");
  for(const id of Object.keys(cfg.activity_briefs||{}))if(!ids.has(id))fail("orphan activity field brief");
 const activities=pilot.activities.map(a=>{
   const p=cfg.per_phase_checks[a.wbs_code];if(!p)fail("unmapped phase checklist");
   const brief=cfg.activity_briefs?.[a.activity_id]||cfg.per_phase_briefs[a.wbs_code];if(!brief)fail("unmapped field brief");
   const checklist=[
    ...cfg.core_checks.map(c=>({id:a.activity_id+"-C"+c.suffix,title:c.title,category:c.type,guidance:c.help,status:"NOT_REPORTED",evidence_required:true})),
    ...p.checks.map((title,i)=>({id:a.activity_id+"-P"+(i+1),title,category:"PHASE_SPECIFIC",guidance:"Use the effective project instructions and responsible person's review.",status:"NOT_REPORTED",evidence_required:true}))
   ];
   const report=progress.task_evidence.find(x=>x.activity_id===a.activity_id);
   return {id:a.activity_id,phase_id:a.wbs_code,title:a.name,calendar_label:CALENDAR_LABELS[a.activity_id],type:a.type,
    predecessor_ids:[...a.predecessor_ids],master_start_slot:a.master_early_start_slot,
    master_finish_exclusive_slot:a.master_finish_exclusive_slot,master_work_slots:a.planned_workday_slots,
    scenario_start:scenarioDate(cfg.default_scenario_start,a.master_early_start_slot,cfg.working_weekdays),
    scenario_finish:scenarioDate(cfg.default_scenario_start,a.master_finish_exclusive_slot,cfg.working_weekdays),
    status:"UNVERIFIED",approval_state:"NO_APPROVED_ACTIVITY_COMPLETION",
    reported_subwork_count:report?.reported_subwork_entries??0,
    hold_ids:[...a.hold_ids],checklist,field_brief:{...brief,basis:cfg.activity_briefs?.[a.activity_id]?"NARAYANI_HOLD_AWARE_DRAFT":"GENERAL_PHASE_TEMPLATE",authority:"GUIDANCE_ONLY_NOT_ENGINEERING_RELEASE"},critical_in_master:!!a.master_critical};
 });
 const seenMcq=new Set();
 for(const e of reported.entries){
  const keys=Object.keys(e).sort().join(",");
  if(keys!=="activity_id,check_id,reported_day,state"||!iso(e.reported_day)||!safe(e.activity_id)||!safe(e.check_id)||!safe(e.state))fail("MCQ event projection extra fields");
  const a=activities.find(x=>x.id===e.activity_id);if(!a)fail("orphan MCQ activity");
  const key=e.activity_id+"|"+e.check_id;
  if(seenMcq.has(key))fail("duplicate public MCQ state key");
  seenMcq.add(key);
  if(e.check_id==="ACTIVITY"){
   if(!cfg.activity_response_options.some(x=>x.state===e.state))fail("unsupported activity MCQ state");
   a.mcq_report_state=e.state;
  }else{
   const check=a.checklist.find(x=>x.id===e.check_id);
   if(!check||!cfg.checklist_response_options.some(x=>x.state===e.state))fail("unsupported checklist MCQ state");
   check.status=e.state;
  }
 }
  if(activities.reduce((n,a)=>n+a.predecessor_ids.length,0)!==49||activities.some(a=>a.predecessor_ids.some(id=>!ids.has(id))))fail("invalid dependency network");
 if(activities.some(a=>a.checklist.length!==9||a.checklist.some(q=>!safe(q.title)||!["NOT_REPORTED","NOT_DONE","IN_PROGRESS","REPORTED_DONE","BLOCKED","NOT_APPLICABLE_REQUESTED"].includes(q.status))))fail("invalid checklists");
 const links=activities.flatMap(a=>a.predecessor_ids.map(x=>({from:x,to:a.id,kind:"FS_MASTER_TEMPLATE",actual_release:false})));
 const result={
  format:MODEL_FORMAT,classification:"PUBLIC_SAFE_PLANNING_SCENARIO",
  project:{id:"PRJ-000007",code:"FBL-006",title:"Narayani Parajuli",baseline_approved:false,
   statutory_clearance_verified:false,source_status:"STAGED_TEMPLATE_WITH_GOVERNED_PROGRESS_AGGREGATE"},
  planning_scenario:{start_date:cfg.default_scenario_start,end_exclusive:horizonEndExclusive(cfg.default_scenario_start,cfg.horizon_months),timezone:cfg.timezone,working_weekdays:cfg.working_weekdays,
   horizon_months:3,label:cfg.scenario_label,approved_dates:false},
  channel:{name:cfg.slack_channel_label,response_contract:"PCK_MCQ_V1",ingestion_state:"GOVERNED_PRIVATE_LEDGER_RECONCILIATION_PENDING"},
  mcq_summary:{reconciled_reported_answers:reported.entries.length,public_state_revision:reported.version,authority:"REPORTED_ONLY"},
  activity_options:cfg.activity_response_options,checklist_options:cfg.checklist_response_options,
  phases,activities,links,milestones:pilot.milestones.map(x=>({id:x.activity_id,phase_id:x.wbs_code,name:x.name,verified_complete:false})),
  hold_points:pilot.hold_points.map(x=>({id:x.id,title:x.title,authority:x.authority,linked_activity_ids:x.activity_ids})),
  evidence_summary:{progress_rows:progress.evidence_inventory.progress_rows,readiness_rows:progress.evidence_inventory.readiness_rows,
   last_record:progress.latest_readiness_record,approved_complete_activities:0},
  caveats:["Scenario calendar dates are derived from synthetic master workday slots, not project-approved commitments.",
   "MCQ replies are reports requiring project authority verification before any engineering acceptance.",
   "This model is one public-safe projection; raw private events belong in the governed private event ledger."]};
 validateVisualModel(result);
 const content=stringify(result);
 return {model:result,files:{"project-model.json":content},manifest:{
  format:"PCK_VISUAL_PROJECT_MANIFEST_V1",model_format:MODEL_FORMAT,classification:result.classification,
  checks:{"activities":45,"links":49,"checklist_items":405,"milestones":7},
  source_digests_sha256:{config:hash(stringify(cfg)),pilot:hash(stringify(pilot)),progress:hash(stringify(progress)),mcq_state:hash(stringify(reported))},
  outputs_sha256:{"project-model.json":hash(content)},site_approval:false,private_input_included:false
 }};
}
export function validateVisualModel(m){
 if(m?.format!==MODEL_FORMAT||m.classification!=="PUBLIC_SAFE_PLANNING_SCENARIO"||m.project?.id!=="PRJ-000007"||m.project.baseline_approved!==false||m.planning_scenario.approved_dates!==false)fail("visual identity/status");
 if(m.activities?.length!==45||m.links?.length!==49||m.phases?.length!==10||m.milestones?.length!==7)fail("graph structure");
 const ids=new Set(m.activities.map(a=>a.id));
 if(ids.size!==45||m.links.some(l=>!ids.has(l.from)||!ids.has(l.to)||l.actual_release!==false))fail("invalid dependency");
 if(m.planning_scenario.end_exclusive!==horizonEndExclusive(m.planning_scenario.start_date,m.planning_scenario.horizon_months)||
  m.activities.some(a=>!safe(a.calendar_label)||a.calendar_label.length>32))fail("calendar summary mismatch");
 if(m.activities.some(a=>a.checklist?.length!==9||a.status!=="UNVERIFIED"||a.approval_state!=="NO_APPROVED_ACTIVITY_COMPLETION"||!iso(a.scenario_start)||!iso(a.scenario_finish)))fail("status/calendar invariant");
 if(m.mcq_summary?.authority!=="REPORTED_ONLY"||!Number.isInteger(m.mcq_summary.reconciled_reported_answers)||
  m.activities.some(a=>a.checklist.some(c=>!["NOT_REPORTED","NOT_DONE","IN_PROGRESS","REPORTED_DONE","BLOCKED","NOT_APPLICABLE_REQUESTED"].includes(c.status)))||
  m.activities.some(a=>a.mcq_report_state&&!["NOT_STARTED","IN_PROGRESS","REPORTED_COMPLETE","BLOCKED","NEEDS_CLARIFICATION"].includes(a.mcq_report_state)))fail("unauthorized MCQ state promotion");
 if(m.activities.some(a=>!a.field_brief||a.field_brief.authority!=="GUIDANCE_ONLY_NOT_ENGINEERING_RELEASE"||
  !["NARAYANI_HOLD_AWARE_DRAFT","GENERAL_PHASE_TEMPLATE"].includes(a.field_brief.basis)||
  ["goal","leads","prepare","execute","inspect","evidence"].some(k=>!safe(a.field_brief[k]))))fail("field brief authority/content");
 if(m.channel?.response_contract!=="PCK_MCQ_V1"||m.evidence_summary?.approved_complete_activities!==0)fail("MCQ authority");
 return true;
}
// Replies can be reported but never treated as final site/engineering approval.
export function parseMcqReply(line,model){
 if(typeof line!=="string"||line.length>4000)fail("MCQ length");
 const keys=line.trim().split(/\s*\|\s*/);
 if(keys.length<4||keys.length>5)fail("MCQ pipe fields");
 const p={};
 for(const chunk of keys){const m=/^(P|A|C|Q|R)\s*=\s*([A-Za-z0-9_-]+)$/.exec(chunk.trim());if(!m||p[m[1]])fail("MCQ malformed field");p[m[1]]=m[2];}
 if(Object.keys(p).some(k=>!["P","A","C","Q","R"].includes(k))||p.P!=="PRJ-000007"||!p.A||!p.C||!p.Q)fail("MCQ missing context");
 const a=model.activities.find(x=>x.id===p.A);if(!a)fail("unknown project activity");
 if(p.C!=="ACTIVITY"&&!a.checklist.some(c=>c.id===p.C))fail("unknown checklist item");
 const options=p.C==="ACTIVITY"?model.activity_options:model.checklist_options;
 const option=options.find(x=>x.code===p.Q);if(!option)fail("invalid multiple-choice answer");
 return {format:"PCK_MCQ_EVENT_V1",project_id:p.P,activity_id:p.A,check_id:p.C,answer_code:p.Q,
  interpreted_state:option.state,source_type:"SLACK_STRUCTURED_RESPONSE",authority:"REPORTED_ONLY",approved:false};
}
