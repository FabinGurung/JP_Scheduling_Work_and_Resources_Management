import {earnedValueMetrics} from "./earned-value.mjs";
const id=(s)=>typeof s==="string"&&s.trim().length>0&&s.length<=160&&!/[<>\u0000-\u001f]/.test(s);
const n=(v,label,{allowZero=true}={})=>{
 if(typeof v!=="number"||!Number.isFinite(v)||v<0||(!allowZero&&v===0))throw Error(label+" must be "+(allowZero?"nonnegative":"positive")+" finite number");
 return v;
};
const fraction=(v,label)=>{n(v,label);if(v>1)throw Error(label+" > 1");return v;};
const date=s=>typeof s==="string"&&/^\d{4}-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"));
/** EVM calculations require a signed baseline, full approved physical progress
 * snapshot and approved cost evidence. Missing records fail CLOSED. This is not
 * a database or an approval UI; no record is signed here.
 */
export function calculateGovernedEvm({baseline,as_of,physical_progress,actual_costs,currency}){
 if(!date(as_of))throw Error("Valid as_of ISO date required");
 if(!id(currency))throw Error("Currency required");
 if(!baseline||baseline.status!=="APPROVED"||!id(baseline.revision)||
  !id(baseline.approved_by)||!date(baseline.approved_at)||
  !/^[0-9a-f]{64}$/.test(baseline.source_sha256??"")||
  !Array.isArray(baseline.activities)||!baseline.activities.length||
  baseline.currency!==currency||baseline.approved_at>as_of)
  throw Error("Immutable approved signed baseline is required; otherwise EVM NOT_READY");
 if(!Array.isArray(physical_progress)||!Array.isArray(actual_costs))
  throw Error("Actual cost and verified physical progress ledgers required");
 const budgets=new Map();let bac=0,pv=0,ev=0,ac=0;
 for(const a of baseline.activities){
  if(!id(a.activity_id)||budgets.has(a.activity_id))throw Error("Duplicate/invalid baseline activity");
  const budget=n(a.budget,"Baseline budget"),plan=fraction(a.planned_fraction,"Planned physical fraction");
  if(!id(a.wbs_id)||!date(a.planned_as_of)||a.planned_as_of!==as_of)throw Error("Time-phased baseline snapshot must match as_of");
  budgets.set(a.activity_id,budget);bac+=budget;pv+=budget*plan;
 }
 const seen=new Set(),events=new Set();
 for(const x of physical_progress){
  if(!id(x.activity_id)||seen.has(x.activity_id)||!budgets.has(x.activity_id))throw Error("Invalid/duplicate physical progress");
  if(!id(x.event_id)||!id(x.evidence_ref)||!id(x.signed_by)||x.verification_status!=="VERIFIED_PHYSICAL"||!date(x.verified_at)||x.verified_at>as_of)
   throw Error("Unapproved or unsourced physical progress, EVM NOT_READY");
  if(events.has(x.event_id))throw Error("Duplicate physical evidence event");
  events.add(x.event_id);
  ev+=budgets.get(x.activity_id)*fraction(x.physical_fraction,"Verified physical fraction");
  seen.add(x.activity_id);
 }
 if(seen.size!==budgets.size)throw Error("Incomplete physical verification snapshot; EVM NOT_READY");
 const expenses=new Set();
 for(const x of actual_costs){
  if(!id(x.event_id)||expenses.has(x.event_id)||!id(x.evidence_ref)||!id(x.approved_by)||
    x.verification_status!=="VERIFIED_COST"||!date(x.paid_or_accrued_at)||x.paid_or_accrued_at>as_of||
    x.currency!==currency)throw Error("Unverified or duplicated actual cost; EVM NOT_READY");
  if(events.has(x.event_id))throw Error("Cost and physical evidence event IDs collide");
  expenses.add(x.event_id);ac+=n(x.amount,"Actual cost");
 }
 const metrics=earnedValueMetrics({bac,pv,ev,ac});
 // Conventional EVM ratios are undefined for 0 denominator; never fill them.
 return {format:"SKYFORGE_GOVERNED_EVM_V1",status:"SOURCE_GATED_CALCULATION",baseline_revision:baseline.revision,
    as_of,currency,baseline_sha256:baseline.source_sha256,baseline_approved_by:baseline.approved_by,
    activity_count:budgets.size,verified_cost_event_count:expenses.size,metrics,
    engineering_release:false,source_gate:"APPROVAL_RECORDS_SUPPLIED_NOT_EXTERNALLY_AUTHENTICATED"};
}
