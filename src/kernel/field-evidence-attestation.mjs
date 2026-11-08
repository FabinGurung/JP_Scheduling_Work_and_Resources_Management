import {createPublicKey,verify} from "node:crypto";
import {validateGenericViewModel} from "../presentation/generic-views.mjs";

/**
 * PRIVATE trusted-runtime source/readback and reviewer attestation.
 * It never authorizes starting/completing a construction activity.
 *
 * Caller config MUST be provisioned out of band by an authenticated service.
 * Neither a Drive file, a field reporter nor an AI proposal may define trusted
 * keys, identities or role assignments. Static Pages cannot load this module.
 */
const FORMAT="SKYFORGE_SIGNED_FIELD_EVIDENCE_V1";
const RECEIPT="SKYFORGE_SIGNED_FIELD_RECEIPT_V1";
const PREFIX=RECEIPT+"\n";
const SHA=/^[a-f0-9]{64}$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/;
const TIME=/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/;
const strict=(o,allowed,label)=>{
 if(!o||typeof o!=="object"||Array.isArray(o))throw Error(label+" must be an object");
 for(const k of Object.keys(o))if(!allowed.includes(k))
  throw Error("Disallowed "+label+" field: "+k);
};
const timestamp=x=>{
 if(typeof x!=="string"||!TIME.test(x)||!Number.isFinite(Date.parse(x))||
    new Date(x).toISOString()!==x)throw Error("Noncanonical evidence UTC timestamp");
 return Date.parse(x);
};
const valid=x=>typeof x==="string"&&ID.test(x);
function verifySignedReceipt(envelope,registry,asOf){
 strict(envelope,["format","key_id","payload","signature_base64"],"signed envelope");
 if(envelope.format!==RECEIPT||!valid(envelope.key_id)||!registry.has(envelope.key_id))
  throw Error("Untrusted field receipt signing key");
 const trusted=registry.get(envelope.key_id);
 const payload=envelope.payload;
 if(!payload||!["SOURCE_READBACK","REVIEW_DECISION"].includes(payload.kind))
  throw Error("Unsupported evidence attestation kind");
 const expectedRole=payload.kind==="SOURCE_READBACK"?"SOURCE_READER":"FIELD_REVIEWER";
 if(trusted.role!==expectedRole)throw Error("Signing role not authorized for evidence action");
 const sourceFields=["kind","record_id","project_id","activity_id","source_sha256",
  "evidence_sha256","source_file_id","source_revision","observed_at","observation",
  "reporter_principal_id","reporter_identity_basis"];
 const reviewFields=["kind","record_id","project_id","activity_id","source_sha256",
  "evidence_sha256","source_record_id","reviewer_id","reviewed_at","decision",
  "evidence_checked","review_note_sha256","review_mode"];
 strict(payload,payload.kind==="SOURCE_READBACK"?sourceFields:reviewFields,"signed payload");
 for(const k of ["record_id","project_id","activity_id"])
  if(!valid(payload[k]))throw Error("Invalid signed evidence identity: "+k);
 if(!SHA.test(payload.source_sha256??"")||!SHA.test(payload.evidence_sha256??""))
  throw Error("Signed receipt lacks content digest");
 if(payload.kind==="SOURCE_READBACK"){
  if(!valid(payload.source_file_id)||!valid(payload.source_revision)||
   !valid(payload.reporter_principal_id)||
   payload.reporter_identity_basis!=="TRUSTED_SOURCE_SERVICE_AUTHENTICATED_SUBJECT"||
   !["WORK_STARTED","WORK_REPORTED_COMPLETE","WORK_BLOCKED","NEEDS_CLARIFICATION"].includes(payload.observation))
   throw Error("Malformed source readback evidence");
  if(timestamp(payload.observed_at)>asOf)throw Error("Future source observation");
 }else{
  if(!valid(payload.source_record_id)||payload.reviewer_id!==trusted.principal_id||
   !["ACCEPT","REJECT"].includes(payload.decision)||payload.evidence_checked!==true||
   !SHA.test(payload.review_note_sha256??"")||
   (payload.review_mode!==undefined&&!["INDEPENDENT_REVIEW","SELF_REVIEW_DISCLOSED"].includes(payload.review_mode)))
   throw Error("Review not bound to authenticated reviewer identity and inspected evidence");
  if(timestamp(payload.reviewed_at)>asOf)throw Error("Future review timestamp");
 }
 const sig=envelope.signature_base64;
 if(typeof sig!=="string"||!/^[A-Za-z0-9+/]+={0,2}$/.test(sig)||sig.length>160)
  throw Error("Malformed evidence receipt signature");
 const bytes=Buffer.from(sig,"base64");
 if(bytes.length!==64||bytes.toString("base64")!==sig)throw Error("Invalid canonical Ed25519 signature");
 const message=Buffer.from(PREFIX+JSON.stringify(payload),"utf8");
 if(!verify(null,message,trusted.public_key,bytes))
  throw Error("Evidence signature verification failed");
 return {payload,role:trusted.role,principal_id:trusted.principal_id,key_id:envelope.key_id};
}
function trustedRegistry(config){
 strict(config,["format","keys"],"trusted runtime config");
 if(config.format!=="SKYFORGE_PRIVATE_TRUST_REGISTRY_V1"||
   !Array.isArray(config.keys)||config.keys.length<2||config.keys.length>30)
  throw Error("Private trust registry needs explicitly independent keys");
 const registry=new Map(),roleKeys=new Map();
 for(const entry of config.keys){
  strict(entry,["key_id","role","principal_id","public_key_pem"],"trusted key");
  if(!valid(entry.key_id)||!valid(entry.principal_id)||registry.has(entry.key_id)||
    !["SOURCE_READER","FIELD_REVIEWER"].includes(entry.role))
   throw Error("Duplicate or unsupported trusted field key");
  let key;
  try{key=createPublicKey(entry.public_key_pem)}
  catch{throw Error("Invalid trusted public signing key")}
  if(key.asymmetricKeyType!=="ed25519")throw Error("Evidence keys must be Ed25519");
  const fingerprint=key.export({type:"spki",format:"der"}).toString("hex");
  if(roleKeys.has(fingerprint))throw Error("One signing key cannot authorize both source and review roles");
  roleKeys.set(fingerprint,entry.role);
  registry.set(entry.key_id,{
   role:entry.role,principal_id:entry.principal_id,public_key:key
  });
 }
 return registry;
}
export function reconcilePrivateFieldEvidence(model,bundle,trustConfig,asOfUtc){
 validateGenericViewModel(model);
 const now=timestamp(asOfUtc);
 const trust=trustedRegistry(trustConfig);
 strict(bundle,["format","project_id","source_sha256","receipts"],"field evidence bundle");
 if(bundle.format!==FORMAT||bundle.project_id!==model.project.id||
   bundle.source_sha256!==model.input_sha256||
   !Array.isArray(bundle.receipts)||bundle.receipts.length>500)
  throw Error("Evidence bundle project/source revision mismatch");
 const byId=new Set(model.activities.map(a=>a.id));
 const source=new Map(),reviews=new Map(),allIds=new Set();
 for(const envelope of bundle.receipts){
  const signed=verifySignedReceipt(envelope,trust,now),p=signed.payload;
  if(p.project_id!==model.project.id||p.source_sha256!==model.input_sha256||
     !byId.has(p.activity_id))throw Error("Signed receipt does not match exact project/activity/source");
  if(allIds.has(p.record_id))throw Error("Duplicate immutable evidence record ID");
  allIds.add(p.record_id);
  if(p.kind==="SOURCE_READBACK")source.set(p.record_id,signed);
  else{
   if(reviews.has(p.source_record_id))throw Error("Conflicting reviewer decisions for same source record");
   reviews.set(p.source_record_id,signed);
  }
 }
 for(const [sourceId,signed] of reviews){
  const original=source.get(sourceId);
  if(!original)throw Error("Reviewer decision without authenticated source readback");
  const p=signed.payload,q=original.payload;
  // The source-reading service must remain separate from the engineer signer.
  // A responsible engineer may attest to their OWN report only when that
  // conflict is disclosed in the signed review payload. It is NEVER counted
  // as an independent review or a field release.
  if(signed.principal_id===original.principal_id||
    signed.key_id===original.key_id||
    p.evidence_sha256!==q.evidence_sha256||
    p.activity_id!==q.activity_id||
    timestamp(p.reviewed_at)<timestamp(q.observed_at))
   throw Error("Reviewer/source-service roles are not independent or evidence revision is mismatched");
  const selfReview=signed.principal_id===q.reporter_principal_id;
  if(selfReview&&p.review_mode!=="SELF_REVIEW_DISCLOSED")
   throw Error("Self-review requires explicit signed SELF_REVIEW_DISCLOSED mode");
  if(!selfReview&&p.review_mode==="SELF_REVIEW_DISCLOSED")
   throw Error("Self-review disclosure does not match authenticated reporter");
 }
 const byActivity=new Map(model.activities.map(a=>[a.id,[]]));
 for(const signed of source.values()){
  const p=signed.payload,review=reviews.get(p.record_id);
  const self=Boolean(review&&review.principal_id===p.reporter_principal_id);
  byActivity.get(p.activity_id).push({
   observation:p.observation,
   review_mode:!review?null:self?"SELF_REVIEW_DISCLOSED":"INDEPENDENT_REVIEW",
   state:!review?"REVIEW_PENDING":
    review.payload.decision==="REJECT"?
      (self?"SELF_REVIEW_REJECTED":"REVIEW_REJECTED"):
    self?"SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED":
    "EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION"
  });
 }
 const results=model.activities.map(a=>{
  const records=byActivity.get(a.id);
  let state="NO_VERIFIED_EVIDENCE";
  if(records.some(r=>r.state==="REVIEW_REJECTED"))state="REVIEW_REJECTED";
  else if(records.some(r=>r.state==="SELF_REVIEW_REJECTED"))state="SELF_REVIEW_REJECTED";
  else if(records.some(r=>r.state==="REVIEW_PENDING"))state="REVIEW_PENDING";
  else if(records.some(r=>r.review_mode==="SELF_REVIEW_DISCLOSED"))
   state="SELF_REVIEWED_NOT_INDEPENDENT_NOT_RELEASED";
  else if(records.length)state="EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION";
  return {activity_id:a.id,review_state:state,
   verified_source_readbacks:records.length,
   independent_reviews:records.filter(r=>r.review_mode==="INDEPENDENT_REVIEW").length,
   self_reviews:records.filter(r=>r.review_mode==="SELF_REVIEW_DISCLOSED").length,
   verified_complete:false,ready_to_start:false,field_release_granted:false};
 });
 return {
  format:"SKYFORGE_PRIVATE_EVIDENCE_RECONCILIATION_V1",
  project_id:model.project.id,source_sha256:model.input_sha256,
  authority:"PRIVATE_SIGNED_SOURCE_AND_REVIEW_EVIDENCE_NOT_SITE_RELEASE",
  as_of:asOfUtc,activity_states:results,
  totals:{source_readbacks:source.size,reviews:reviews.size,
   independent_reviews:results.reduce((n,a)=>n+a.independent_reviews,0),
   self_reviews:results.reduce((n,a)=>n+a.self_reviews,0),
   activities_with_evidence:results.filter(a=>a.verified_source_readbacks>0).length},
  field_release_granted:false,approved_site_progress:false,
  adoption:"BLOCKED_PENDING_HOLD_POINT_AUTHORITY_SIGNED_RELEASE_AND_CALENDAR_VERIFICATION",
  publishable:false
 };
}
