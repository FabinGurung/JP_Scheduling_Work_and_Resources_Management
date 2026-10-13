// Evidence-backed field observation contract. Untrusted field reports are never
// an authoritative progress source. Authenticated Drive access + independent
// authorized review are separate required steps (not provided by static Pages).
export const FIELD_REPORT_FORMAT="PCK_FIELD_REPORT_V1";
export const FIELD_PROJECT="SYNTHETIC_WBS_DEMO";
export const OBSERVATIONS=Object.freeze(["WORK_STARTED","WORK_REPORTED_COMPLETE","WORK_BLOCKED","NEEDS_CLARIFICATION"]);
const fail=x=>{throw Error("Field report rejected: "+x);};
const nonblank=(x,max=240)=>typeof x==="string"&&x.trim().length>0&&x.length<=max&&!/[\x00-\x08\x0b-\x1f<>]/.test(x);
const own=(o,allowed)=>{if(!o||typeof o!=="object"||Array.isArray(o))fail("expected object");for(const k of Object.keys(o))if(!allowed.includes(k))fail("unknown field: "+k);};
function date(s){return typeof s==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString()===s;}
function verifyEvidence(url){
 if(!nonblank(url,1024))fail("evidence URL required");
 try{const u=new URL(url);if(u.protocol!=="https:"||!u.hostname||u.username||u.password||u.port)fail("evidence must be HTTPS URL without credentials");return url;}
 catch(e){fail("invalid HTTPS evidence URL");}
}
export function validateFieldReport(report,plan){
 own(report,["format","project_id","report_id","plan_format","activity_id","observation","observed_at","reporter_display_name","field_note","evidence_refs","authority_state"]);
 if(report.format!==FIELD_REPORT_FORMAT||report.project_id!==FIELD_PROJECT||report.plan_format!=="PCK_WBS_SAMPLE_V1")fail("source/project mismatch");
 if(!nonblank(report.report_id,100)||!/^FR-[a-f0-9-]{36}$/.test(report.report_id))fail("report identity");
 if(!Array.isArray(plan?.activities)||!plan.activities.some(x=>x.activity_id===report.activity_id))fail("activity not in source roadmap");
 if(!OBSERVATIONS.includes(report.observation))fail("unsupported observation");
 if(!date(report.observed_at))fail("observation time must be explicit UTC ISO timestamp");
 if(!nonblank(report.reporter_display_name,120)||!nonblank(report.field_note,1000))fail("reporter or field note missing");
 if(!Array.isArray(report.evidence_refs)||report.evidence_refs.length<1||report.evidence_refs.length>6)fail("one to six evidence references required");
 for(const e of report.evidence_refs){
  own(e,["kind","url","description"]);
  if(!["PHOTO","DAILY_LOG","INSPECTION","OTHER"].includes(e.kind)||!nonblank(e.description,180))fail("invalid evidence description/type");
  verifyEvidence(e.url);
 }
 if(report.authority_state!=="UNVERIFIED_SUBMISSION")fail("submission cannot claim approval");
 return {valid:true,authority_state:"UNVERIFIED_SUBMISSION",activity_id:report.activity_id,report_id:report.report_id};
}
export function newFieldReport(plan,values){
 const report={format:FIELD_REPORT_FORMAT,project_id:FIELD_PROJECT,
  report_id:"FR-"+values.uuid,plan_format:plan.format,
  activity_id:values.activity_id,observation:values.observation,
  observed_at:values.observed_at,reporter_display_name:values.reporter_display_name.trim(),
  field_note:values.field_note.trim(),
  evidence_refs:[{kind:values.evidence_kind,url:values.evidence_url.trim(),description:values.evidence_description.trim()}],
  authority_state:"UNVERIFIED_SUBMISSION"};
 validateFieldReport(report,plan);
 return report;
}
export function evaluateFieldStatus(plan,unverifiedReports=[]){
 const counts=new Map();
 for(const item of unverifiedReports){
  validateFieldReport(item,plan);
  counts.set(item.activity_id,(counts.get(item.activity_id)||0)+1);
 }
 const activityStates=plan.activities.map(a=>({
  activity_id:a.activity_id,planned_critical:a.critical,
  review_state:(counts.get(a.activity_id)||0)>0?"REPORT_PENDING_REVIEW":"NO_VERIFIED_PROGRESS",
  unverified_reports:counts.get(a.activity_id)||0,
  verified_complete:false,
  prerequisite_verification:a.predecessor_ids.length===0?"NO_PREDECESSORS_IN_PLAN":"PREDECESSORS_NOT_VERIFIED",
  ready_for_construction:false
 }));
 const states=new Map(activityStates.map(x=>[x.activity_id,x]));
 const milestoneStates=plan.milestones.map(x=>({activity_id:x.activity_id,review_state:states.get(x.activity_id).review_state,verified_complete:false}));
 const firstPlanCandidate=plan.activities.filter(x=>x.type==="Task"&&x.predecessor_ids.length===0)
  .sort((a,b)=>a.early_start_slot-b.early_start_slot||a.activity_id.localeCompare(b.activity_id))[0]||null;
 return {authority:"NO_APPROVED_SITE_PROGRESS",verified_complete_count:0,pending_observation_count:unverifiedReports.length,
  first_plan_candidate:firstPlanCandidate?{activity_id:firstPlanCandidate.activity_id,name:firstPlanCandidate.name}:null,
  milestoneStates,activityStates};
}
// Strictly for controlled review-machine use. A static HTML page never verifies
// reporter identity or records reviewer approval and cannot create this object.
export function validateReviewDecision(decision,report,{authenticatedReviewerId,sourceReadbackVerified}={}){
 own(decision,["format","report_id","decision","reviewer_id","reviewed_at","evidence_checked","review_note"]);
 if(decision.format!=="PCK_FIELD_REVIEW_V1"||decision.report_id!==report.report_id||!["ACCEPT","REJECT"].includes(decision.decision))fail("review identity/decision mismatch");
 if(!nonblank(authenticatedReviewerId,180)||decision.reviewer_id!==authenticatedReviewerId)fail("reviewer authentication not verified");
 if(sourceReadbackVerified!==true)fail("authenticated source readback required");
 if(!date(decision.reviewed_at)||decision.evidence_checked!==true||!nonblank(decision.review_note,1000))fail("review lacks dated evidence inspection");
 return {decision:decision.decision,report_id:report.report_id,reviewer_verified:true};
}
