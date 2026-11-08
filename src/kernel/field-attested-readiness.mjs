import {inspectWorkSequence} from "./work-readiness.mjs";
import {reconcilePrivateFieldEvidence} from "./field-evidence-attestation.mjs";

/**
 * D3 PRIVATE authenticated-evidence preview for one scheduled work item.
 * Every input receipt must pass source/reviewer Ed25519 validation.
 * Even signed ACCEPT of a report is NOT signed completion or release.
 */
const textForState={
 NO_VERIFIED_EVIDENCE:"No authenticated source readback exists for the prerequisite activity",
 REVIEW_PENDING:"Authenticated evidence exists but an independent reviewer has not accepted it",
 REVIEW_REJECTED:"Independent reviewer rejected this evidence; corrective review required",
 EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION:"Evidence acceptance alone does not prove actual predecessor completion",
 SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED:"Responsible engineer reviewed their own evidence; conflict disclosed, not independently corroborated or a completion signoff",
 SELF_REVIEW_REJECTED:"Responsible engineer rejected their own submitted evidence; corrective action is required"
};
export function inspectAttestedWorkReadiness(model,activityId,bundle,trustConfig,asOfUtc){
 const sequence=inspectWorkSequence(model,activityId);
 const reviewed=reconcilePrivateFieldEvidence(model,bundle,trustConfig,asOfUtc);
 const statuses=new Map(reviewed.activity_states.map(x=>[x.activity_id,x]));
 const prerequisites=sequence.start_conditions.map(link=>{
  const prior=statuses.get(link.activity_id);
  if(!prior)throw Error("Missing predecessor status projection");
  const lagRequired=link.lag!==0;
  return {
   predecessor_id:link.activity_id,
   predecessor_event:link.predecessor_event,
   successor_event:link.successor_event,
   type:link.type,lag:link.lag,
   evidence_review_state:prior.review_state,
   reason:lagRequired?
    "Nonzero lag/lead requires source-verified working-calendar and event-time reconciliation; "+textForState[prior.review_state]:
    textForState[prior.review_state],
   verified_predecessor_event:false,
   lag_clearance_verified:false
  };
 });
 const own=statuses.get(activityId);
 if(!own)throw Error("Missing selected activity review status");
 const blockers=[
  "NO_AUTHORIZED_SOURCE_HOLD_POINT_REGISTER",
  "NO_AUTHENTICATED_FIELD_COMPLETION_AND_ACTUAL_EVENT_TIMES",
  "NO_SEPARATELY_SIGNED_WORK_RELEASE"
 ];
 if(prerequisites.some(p=>p.evidence_review_state==="SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED"))
  blockers.push("SELF_REVIEW_NOT_INDEPENDENTLY_CORROBORATED");
 if(prerequisites.some(p=>p.evidence_review_state==="SELF_REVIEW_REJECTED"))
  blockers.push("SELF_REVIEW_REJECTED");
 if(prerequisites.some(p=>p.evidence_review_state==="REVIEW_REJECTED"))
  blockers.push("PREDECESSOR_EVIDENCE_REJECTED");
 if(prerequisites.some(p=>p.evidence_review_state==="REVIEW_PENDING"))
  blockers.push("PREDECESSOR_REVIEW_PENDING");
 if(prerequisites.some(p=>p.evidence_review_state==="NO_VERIFIED_EVIDENCE"))
  blockers.push("PREDECESSOR_EVIDENCE_MISSING");
 if(prerequisites.some(p=>p.lag!==0))
  blockers.push("UNRECONCILED_RELATIONSHIP_LAG");
 return {
  format:"SKYFORGE_PRIVATE_ATTESTED_WORK_INSPECTION_V1",
  project_id:reviewed.project_id,
  activity_id:activityId,
  source_sha256:reviewed.source_sha256,
  evidence_intake:own.review_state,
  evidence_review_mode:own.self_reviews>0?"SELF_REVIEW_DISCLOSED":own.independent_reviews>0?"INDEPENDENT_REVIEW":"UNREVIEWED",
  start_prerequisites:prerequisites,
  finish_only_constraints:sequence.finish_constraints.map(e=>({
   predecessor_id:e.activity_id,type:e.type,lag:e.lag,
   status:"FINISH_CONSTRAINT_NOT_A_START_RELEASE"
  })),
  blocking_reasons:blockers,
  readiness:"UNVERIFIED_NO_AUTHORIZED_SITE_RELEASE",
  ready_for_construction:false,
  approved_site_progress:false,
  publishable:false,
  source_evidence_authenticated:own.verified_source_readbacks>0
 };
}
