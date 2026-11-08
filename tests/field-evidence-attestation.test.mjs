import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {reconcilePrivateFieldEvidence} from "../src/kernel/field-evidence-attestation.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const model=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
const date="2026-11-08T10:00:00.000Z";
const SHA1="a".repeat(64),SHA2="b".repeat(64);
const pair=()=>generateKeyPairSync("ed25519");
const root=pair(),reviewer=pair(),wrong=pair();
const trust={
 format:"SKYFORGE_PRIVATE_TRUST_REGISTRY_V1",
 keys:[
  {key_id:"SOURCE_KEY",role:"SOURCE_READER",principal_id:"SOURCE_SERVICE",
   public_key_pem:root.publicKey.export({type:"spki",format:"pem"})},
  {key_id:"REVIEW_KEY",role:"FIELD_REVIEWER",principal_id:"INDEPENDENT_ENGINEER",
   public_key_pem:reviewer.publicKey.export({type:"spki",format:"pem"})}
 ]
};
function seal(payload,key=payload.kind==="SOURCE_READBACK"?root.privateKey:reviewer.privateKey,keyId=payload.kind==="SOURCE_READBACK"?"SOURCE_KEY":"REVIEW_KEY"){
 return {format:"SKYFORGE_SIGNED_FIELD_RECEIPT_V1",key_id:keyId,
  payload,signature_base64:sign(null,Buffer.from("SKYFORGE_SIGNED_FIELD_RECEIPT_V1\n"+JSON.stringify(payload)),key).toString("base64")};
}
function sample(m,id=m.activities[0].id){
 const source={
  kind:"SOURCE_READBACK",record_id:"SRC_A",project_id:m.project.id,activity_id:id,
  source_sha256:m.input_sha256,evidence_sha256:SHA1,
  source_file_id:"PRIVATE_FILE_A",source_revision:"LIVE_REV_1",
  reporter_principal_id:"FIELD_REPORTER_A",reporter_identity_basis:"TRUSTED_SOURCE_SERVICE_AUTHENTICATED_SUBJECT",
  observed_at:"2026-11-08T08:00:00.000Z",observation:"WORK_REPORTED_COMPLETE"
 };
 const review={
  kind:"REVIEW_DECISION",record_id:"REVIEW_A",project_id:m.project.id,activity_id:id,
  source_sha256:m.input_sha256,evidence_sha256:SHA1,
  source_record_id:"SRC_A",reviewer_id:"INDEPENDENT_ENGINEER",
  reviewed_at:"2026-11-08T09:00:00.000Z",decision:"ACCEPT",
  evidence_checked:true,review_note_sha256:SHA2
 };
 return {source,review};
}
const wrap=(m,receipts=[])=>({
 format:"SKYFORGE_SIGNED_FIELD_EVIDENCE_V1",project_id:m.project.id,
 source_sha256:m.input_sha256,receipts
});
test("D3 empty Drive intake yields zero verified status, not READY or approval",()=>{
 const m=model(),result=reconcilePrivateFieldEvidence(m,wrap(m),trust,date);
 assert.equal(result.totals.source_readbacks,0);
 assert.equal(result.totals.reviews,0);
 assert.ok(result.activity_states.every(x=>x.review_state==="NO_VERIFIED_EVIDENCE"));
 assert.ok(result.activity_states.every(x=>!x.ready_to_start&&!x.verified_complete));
 assert.equal(result.publishable,false);
 assert.equal(result.approved_site_progress,false);
});
test("D3 signed source readback alone is still pending independent reviewer approval",()=>{
 const m=model(),{source}=sample(m);
 const r=reconcilePrivateFieldEvidence(m,wrap(m,[seal(source)]),trust,date);
 assert.equal(r.totals.source_readbacks,1);
 assert.equal(r.activity_states[0].review_state,"REVIEW_PENDING");
 assert.equal(r.activity_states[0].verified_complete,false);
});
test("D3 distinct valid signatures and bounded source SHA accept evidence but never work completion",()=>{
 const m=model(),{source,review}=sample(m),bundle=wrap(m,[seal(review),seal(source)]);
 const r=reconcilePrivateFieldEvidence(m,bundle,trust,date);
 assert.equal(r.totals.source_readbacks,1);
 assert.equal(r.totals.reviews,1);
 assert.equal(r.activity_states[0].independent_reviews,1);
 assert.equal(r.activity_states[0].review_state,"EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION");
 assert.equal(r.activity_states[0].verified_complete,false);
 assert.equal(r.activity_states[0].ready_to_start,false);
 assert.equal(r.field_release_granted,false);
 assert.equal(r.publishable,false);
 const rejected=structuredClone(review);rejected.decision="REJECT";
 assert.equal(reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(rejected)]),trust,date)
  .activity_states[0].review_state,"REVIEW_REJECTED");
});
test("D3 rejects any untrusted/tampered source, stale SHA, missing source or wrong source activity",()=>{
 const m=model(),{source,review}=sample(m);
 const good=seal(source);
 const altered=structuredClone(good);altered.payload.observation="WORK_BLOCKED";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[altered]),trust,date),/signature/);
 const unsupportedKey=structuredClone(good);unsupportedKey.key_id="NOT_IN_TRUST";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[unsupportedKey]),trust,date),/Untrusted/);
 const forged=seal(source,wrong.privateKey,"SOURCE_KEY");
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[forged]),trust,date),/signature/);
 const stale=structuredClone(source);stale.source_sha256="0".repeat(64);
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(stale)]),trust,date),/source/);
 const crossProject=structuredClone(source);crossProject.project_id="FAKE_PROJECT";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(crossProject)]),trust,date),/project/);
 const crossActivity=structuredClone(source);crossActivity.activity_id="NO_SUCH_ACTIVITY";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(crossActivity)]),trust,date),/project\/activity/);
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(review)]),trust,date),/without authenticated source/);
});
test("D3 forbids self-review, role confusion and unsigned reviewer identity substitution",()=>{
 const m=model(),{source,review}=sample(m);
 const wrongId=structuredClone(review);wrongId.reviewer_id="SELF_ASSERTED_OTHER";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(wrongId)]),trust,date),/identity/);
 const reviewWithSourceRole=seal(review,root.privateKey,"SOURCE_KEY");
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),reviewWithSourceRole]),trust,date),/role/);
 const sameActor={...trust,keys:[trust.keys[0],{...trust.keys[1],principal_id:"SOURCE_SERVICE"}]};
 const withSamePrincipal={...review,reviewer_id:"SOURCE_SERVICE"};
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(withSamePrincipal)]),sameActor,date),/not independent/);
 const sameKey={...trust,keys:[trust.keys[0],{...trust.keys[1],public_key_pem:trust.keys[0].public_key_pem}]};
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[]),sameKey,date),/One signing key/);
});
test("D3 rejects conflicting or duplicated reviews, evidence hash mismatch and impossible dates",()=>{
 const m=model(),{source,review}=sample(m);
 const two=structuredClone(review);two.record_id="REVIEW_B";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(review),seal(two)]),trust,date),/Conflicting/);
 const mismatch=structuredClone(review);mismatch.evidence_sha256=SHA2;
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(mismatch)]),trust,date),/mismatched/);
 const beforeSource=structuredClone(review);beforeSource.reviewed_at="2026-11-08T07:00:00.000Z";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(beforeSource)]),trust,date),/mismatched/);
 const future=structuredClone(source);future.observed_at="2027-01-01T00:00:00.000Z";
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(future)]),trust,date),/Future/);
 const fakeApproval=structuredClone(review);fakeApproval.field_release_granted=true;
 assert.throws(()=>reconcilePrivateFieldEvidence(m,wrap(m,[seal(source),seal(fakeApproval)]),trust,date),/Disallowed/);
});
test("D3 signed source reader is private and excluded from the public Pages allowlist",()=>{
 const builder=read("scripts/build-public-site.mjs"),common=read("src/presentation/studio-project-page.mjs");
 const field=read("src/presentation/work-readiness-page.mjs");
 assert.ok(builder.includes('"src/kernel/field-evidence-attestation.mjs"'));
 assert.doesNotMatch(common,/field-evidence-attestation/);
 assert.doesNotMatch(field,/field-evidence-attestation/);
 assert.match(field,/Verified field readiness/);
});
