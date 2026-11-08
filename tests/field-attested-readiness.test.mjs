import test from "node:test";
import assert from "node:assert/strict";
import {generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {inspectAttestedWorkReadiness} from "../src/kernel/field-attested-readiness.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const model=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
const reader=generateKeyPairSync("ed25519"),reviewer=generateKeyPairSync("ed25519");
const trusted={format:"SKYFORGE_PRIVATE_TRUST_REGISTRY_V1",keys:[
 {key_id:"SOURCE_KEY",role:"SOURCE_READER",principal_id:"SOURCE_SERVICE",public_key_pem:reader.publicKey.export({type:"spki",format:"pem"})},
 {key_id:"REVIEW_KEY",role:"FIELD_REVIEWER",principal_id:"REVIEWER_ONE",public_key_pem:reviewer.publicKey.export({type:"spki",format:"pem"})}
]};
const seal=(payload,key,id)=>({
 format:"SKYFORGE_SIGNED_FIELD_RECEIPT_V1",key_id:id,payload,
 signature_base64:sign(null,Buffer.from("SKYFORGE_SIGNED_FIELD_RECEIPT_V1\n"+JSON.stringify(payload)),key).toString("base64")
});
const bundle=(m,receipts=[])=>({format:"SKYFORGE_SIGNED_FIELD_EVIDENCE_V1",
 project_id:m.project.id,source_sha256:m.input_sha256,receipts});
const now="2026-11-08T10:00:00.000Z";
test("D3 real source empty yields explicit predecessor UNKNOWN and NEVER ready",()=>{
 const m=model(),edge=m.links[0];
 const outcome=inspectAttestedWorkReadiness(m,edge.to,bundle(m),trusted,now);
 assert.equal(outcome.readiness,"UNVERIFIED_NO_AUTHORIZED_SITE_RELEASE");
 assert.equal(outcome.ready_for_construction,false);
 assert.equal(outcome.publishable,false);
 assert.ok(outcome.start_prerequisites.some(p=>p.predecessor_id===edge.from));
 assert.ok(outcome.blocking_reasons.includes("NO_AUTHORIZED_SOURCE_HOLD_POINT_REGISTER"));
 assert.ok(outcome.blocking_reasons.includes("NO_SEPARATELY_SIGNED_WORK_RELEASE"));
 assert.equal(outcome.source_evidence_authenticated,false);
});
test("D3 accepted independently signed report remains evidence only, not completed dependency or field release",()=>{
 const m=model(),edge=m.links.find(x=>x.type==="FS"&&x.lag===0);
 assert.ok(edge);
 const source={
  kind:"SOURCE_READBACK",record_id:"SRC_ONE",project_id:m.project.id,activity_id:edge.from,
  source_sha256:m.input_sha256,evidence_sha256:"a".repeat(64),
  source_file_id:"GOOGLE_DRIVE_SOURCE_1",source_revision:"REV_A",
  reporter_principal_id:"FIELD_REPORTER_A",reporter_identity_basis:"TRUSTED_SOURCE_SERVICE_AUTHENTICATED_SUBJECT",
  observed_at:"2026-11-08T08:00:00.000Z",observation:"WORK_REPORTED_COMPLETE"
 };
 const review={
  kind:"REVIEW_DECISION",record_id:"REVIEW_ONE",project_id:m.project.id,activity_id:edge.from,
  source_sha256:m.input_sha256,evidence_sha256:source.evidence_sha256,
  source_record_id:source.record_id,reviewer_id:"REVIEWER_ONE",
  reviewed_at:"2026-11-08T09:00:00.000Z",decision:"ACCEPT",
  evidence_checked:true,review_note_sha256:"b".repeat(64)
 };
 const result=inspectAttestedWorkReadiness(m,edge.to,bundle(m,[
  seal(source,reader.privateKey,"SOURCE_KEY"),
  seal(review,reviewer.privateKey,"REVIEW_KEY")
 ]),trusted,now);
 const prior=result.start_prerequisites.find(x=>x.predecessor_id===edge.from);
 assert.equal(prior.evidence_review_state,"EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION");
 assert.match(prior.reason,/does not prove actual predecessor completion/);
 assert.equal(prior.verified_predecessor_event,false);
 assert.equal(result.readiness,"UNVERIFIED_NO_AUTHORIZED_SITE_RELEASE");
 assert.equal(result.ready_for_construction,false);
 // A source attested for the predecessor cannot make the selected successor
 // appear to have its own authenticated activity evidence.
 assert.equal(result.source_evidence_authenticated,false);
 const previous=inspectAttestedWorkReadiness(m,edge.from,bundle(m,[
  seal(source,reader.privateKey,"SOURCE_KEY"),
  seal(review,reviewer.privateKey,"REVIEW_KEY")
 ]),trusted,now);
 assert.equal(previous.source_evidence_authenticated,true);
 assert.equal(previous.ready_for_construction,false);
});
test("D3 no untrusted data can be silently upgraded through private inspector",()=>{
 const m=model(),id=m.activities[0].id;
 const bad=bundle(m);
 bad.source_sha256="c".repeat(64);
 assert.throws(()=>inspectAttestedWorkReadiness(m,id,bad,trusted,now),/source revision mismatch/);
 const source=read("src/kernel/field-attested-readiness.mjs");
 const build=read("scripts/build-public-site.mjs");
 assert.match(source,/reconcilePrivateFieldEvidence/);
 assert.match(source,/NO_SEPARATELY_SIGNED_WORK_RELEASE/);
 assert.match(source,/ready_for_construction:false/);
 assert.ok(build.includes('"src/kernel/field-attested-readiness.mjs"'));
});
