import test from "node:test";
import assert from "node:assert/strict";
import {createHash,generateKeyPairSync,sign} from "node:crypto";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {readAuthenticatedDriveEvidence,MAX_DRIVE_EVIDENCE_BYTES} from "../src/kernel/drive-evidence-readback.mjs";
import {reconcileLiveDriveFieldEvidence} from "../src/kernel/drive-field-evidence-reconcile.mjs";

const bytes=Buffer.from('{"format":"PRIVATE_TEST_REPORT","note":"UNVERIFIED TEST ONLY"}\n');
const sha=x=>createHash("sha256").update(x).digest("hex");
const fileId="GOOGLE_FILE_DEMO_1",revision="17",token="SYNTHETIC_TEST_TOKEN_WITHOUT_REAL_OAUTH";
const model=()=>projectGenericVisual(JSON.parse(readFileSync(
 new URL("../machine/generic-projects/community-clinic.json",import.meta.url),"utf8")));
const pair=()=>generateKeyPairSync("ed25519");
const reader=pair(),reviewer=pair();
const trust={format:"SKYFORGE_PRIVATE_TRUST_REGISTRY_V1",keys:[
 {key_id:"SRC_KEY",role:"SOURCE_READER",principal_id:"AUTH_SOURCE_READER",
  public_key_pem:reader.publicKey.export({type:"spki",format:"pem"})},
 {key_id:"REV_KEY",role:"FIELD_REVIEWER",principal_id:"INDEPENDENT_REVIEWER",
  public_key_pem:reviewer.publicKey.export({type:"spki",format:"pem"})}
]};
const now="2026-11-08T10:00:00.000Z";
function signed(payload,key,id){
 return {format:"SKYFORGE_SIGNED_FIELD_RECEIPT_V1",key_id:id,payload,
  signature_base64:sign(null,Buffer.from("SKYFORGE_SIGNED_FIELD_RECEIPT_V1\n"+JSON.stringify(payload)),key).toString("base64")};
}
function bundle(m,hasReview=true){
 const id=m.activities[0].id;
 const source={kind:"SOURCE_READBACK",record_id:"SRC01",project_id:m.project.id,
  activity_id:id,source_sha256:m.input_sha256,evidence_sha256:sha(bytes),
  source_file_id:fileId,source_revision:revision,observed_at:"2026-11-08T08:00:00.000Z",
  observation:"WORK_REPORTED_COMPLETE"};
 const review={kind:"REVIEW_DECISION",record_id:"REV01",project_id:m.project.id,
  activity_id:id,source_sha256:m.input_sha256,evidence_sha256:sha(bytes),
  source_record_id:"SRC01",reviewer_id:"INDEPENDENT_REVIEWER",
  reviewed_at:"2026-11-08T09:00:00.000Z",
  decision:"ACCEPT",evidence_checked:true,review_note_sha256:"b".repeat(64)};
 return {format:"SKYFORGE_SIGNED_FIELD_EVIDENCE_V1",project_id:m.project.id,
  source_sha256:m.input_sha256,receipts:[
   signed(source,reader.privateKey,"SRC_KEY"),
   ...(hasReview?[signed(review,reviewer.privateKey,"REV_KEY")]:[])]};
}
function provider({content=bytes,version=revision,afterVersion=version,mimeType="application/json",
 size=String(bytes.length),status=200,overrideId=fileId,trashed=false}={}){
 let calls=0;
 const fetchImpl=async(url,opts)=>{
  assert.match(url,/^https:\/\/www.googleapis.com\/drive\/v3\/files\//);
  assert.equal(opts.method,"GET");
  assert.equal(opts.headers.Authorization,"Bearer "+token);
  assert.equal(opts.redirect,"error");
  assert.equal(opts.cache,"no-store");
  calls++;
  if(status!==200)return new Response("NO",{status});
  if(url.includes("alt=media")){
   return new Response(content,{status:200,headers:{"content-length":String(content.length)}});
  }
  const v=calls===3?afterVersion:version;
  return new Response(JSON.stringify({id:overrideId,version:v,mimeType,size,trashed}),
   {status:200,headers:{"content-type":"application/json"}});
 };
 return {fetchImpl,getCalls:()=>calls};
}
test("D3 read original Google Drive bytes and recheck immutable revision, not metadata alone",async()=>{
 const p=provider();
 const receipt=await readAuthenticatedDriveEvidence({
  fileId,expectedVersion:revision,expectedSha256:sha(bytes),
  oauthToken:token,fetchImpl:p.fetchImpl});
 assert.equal(p.getCalls(),3);
 assert.equal(receipt.content_sha256,sha(bytes));
 assert.equal(receipt.revision,revision);
 assert.equal(receipt.work_release,false);
 assert.equal(receipt.authority,"AUTHENTICATED_READONLY_DRIVE_BYTES_NOT_FIELD_APPROVAL");
});
test("D3 authenticated Drive provider readback rejects forged hash, stale source or changed version mid-read",async()=>{
 const base={fileId,expectedVersion:revision,expectedSha256:sha(bytes),oauthToken:token};
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({content:Buffer.from("tamper")}).fetchImpl}),/bytes do not match/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({version:"18"}).fetchImpl}),/changed since reviewed/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({afterVersion:"18"}).fetchImpl}),/mutated during/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({trashed:true}).fetchImpl}),/identity\/version/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({mimeType:"application/vnd.google-apps.spreadsheet"}).fetchImpl}),/MIME/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({size:String(MAX_DRIVE_EVIDENCE_BYTES+1)}).fetchImpl}),/out-of-bounds/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,fetchImpl:provider({status:403}).fetchImpl}),/denied/);
 await assert.rejects(readAuthenticatedDriveEvidence({...base,oauthToken:"",fetchImpl:provider().fetchImpl}),/OAuth/);
});
test("D3 combined signed review and actual Drive byte readback remain unapproved",async()=>{
 const m=model(),p=provider();
 const r=await reconcileLiveDriveFieldEvidence({model:m,bundle:bundle(m),
  trustConfig:trust,asOfUtc:now,oauthToken:token,fetchImpl:p.fetchImpl});
 assert.equal(r.provider_file_revisions_verified,1);
 assert.equal(r.independent_review_records,1);
 assert.equal(r.no_evidence_received,false);
 assert.equal(r.activity_states[0].review_state,"EVIDENCE_ACCEPTED_NOT_WORK_COMPLETION");
 assert.equal(r.activity_states[0].verified_complete,false);
 assert.equal(r.verified_complete,false);
 assert.equal(r.ready_to_start,false);
 assert.equal(r.field_release_granted,false);
 assert.equal(r.publishable,false);
});
test("D3 mismatched reviewer/source signatures fail before contacting Google provider",async()=>{
 const m=model(),bad=bundle(m);
 bad.receipts[1].payload.evidence_sha256="0".repeat(64);
 const p=provider();
 await assert.rejects(reconcileLiveDriveFieldEvidence({model:m,bundle:bad,
  trustConfig:trust,asOfUtc:now,oauthToken:token,fetchImpl:p.fetchImpl}),/signature/);
 assert.equal(p.getCalls(),0);
});
test("D3 empty intake remains safely empty and prevents fabricated READY",async()=>{
 const m=model(),p=provider();
 const b={...bundle(m),receipts:[]};
 const r=await reconcileLiveDriveFieldEvidence({model:m,bundle:b,
  trustConfig:trust,asOfUtc:now,oauthToken:token,fetchImpl:p.fetchImpl});
 assert.equal(r.provider_file_revisions_verified,0);
 assert.equal(r.no_evidence_received,true);
 assert.equal(r.activity_states[0].review_state,"NO_VERIFIED_EVIDENCE");
 assert.equal(r.ready_to_start,false);
 assert.equal(p.getCalls(),0);
});
test("D3 new live Drive reader, signed chain and CLI must stay out of published site",()=>{
 const build=readFileSync(new URL("../scripts/build-public-site.mjs",import.meta.url),"utf8");
 for(const p of ["src/kernel/drive-evidence-readback.mjs","src/kernel/drive-field-evidence-reconcile.mjs"])
  assert.ok(build.includes('"'+p+'"'),"Missing private publication exclusion "+p);
 const ui=readFileSync(new URL("../src/presentation/work-readiness-page.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(ui,/reconcileLiveDriveFieldEvidence|GOOGLE_OAUTH_ACCESS_TOKEN|source_file_id/);
});
