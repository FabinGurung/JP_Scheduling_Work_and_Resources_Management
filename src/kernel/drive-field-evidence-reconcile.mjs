import {reconcilePrivateFieldEvidence} from "./field-evidence-attestation.mjs";
import {readAuthenticatedDriveEvidence} from "./drive-evidence-readback.mjs";

/**
 * Private-only combined verification: signed source reader + distinct signed
 * reviewer + actual Google Drive original bytes under live OAuth.
 *
 * A successful readback is EVIDENCE integrity, not site release or actual
 * task completion. Caller must supply a trusted, out-of-band signer registry.
 */
export async function reconcileLiveDriveFieldEvidence({
 model,bundle,trustConfig,asOfUtc,oauthToken,fetchImpl=fetch
}={}){
 // Validate signatures, IDs, roles, source view SHA and review chronology first.
 const signed=reconcilePrivateFieldEvidence(model,bundle,trustConfig,asOfUtc);
 const entries=bundle.receipts.filter(x=>x.payload?.kind==="SOURCE_READBACK");
 if(entries.length>24)
  throw Error("Private Drive byte verification requires batches of 24 or fewer");
 const examined=new Map();
 let readbacks=0;
 for(const entry of entries){
  const p=entry.payload;
  const key=p.source_file_id+"\u0000"+p.source_revision;
  if(examined.has(key)){
   if(examined.get(key)!==p.evidence_sha256)
    throw Error("One provider file revision has conflicting source content hashes");
   continue;
  }
  const proof=await readAuthenticatedDriveEvidence({
   fileId:p.source_file_id,expectedVersion:p.source_revision,
   expectedSha256:p.evidence_sha256,oauthToken,fetchImpl
  });
  if(proof.content_sha256!==p.evidence_sha256||proof.revision!==p.source_revision||
     proof.verified_readback!==true||proof.work_release!==false)
   throw Error("Authenticated provider-byte proof mismatch");
  examined.set(key,p.evidence_sha256);
  readbacks++;
 }
 return {
  format:"SKYFORGE_PRIVATE_DRIVE_VERIFIED_REVIEW_V1",
  project_id:signed.project_id,source_sha256:signed.source_sha256,
  evidence_digest_status:"SIGNED_AND_DRIVE_BYTES_CHECKED",
  as_of:asOfUtc,
  source_records:signed.totals.source_readbacks,
  provider_file_revisions_verified:readbacks,
  independent_review_records:signed.totals.independent_reviews,
  disclosed_self_review_records:signed.totals.self_reviews,
  activity_states:signed.activity_states,
  no_evidence_received:signed.totals.source_readbacks===0,
  authority:"PRIVATE_READONLY_INTEGRITY_ONLY_NO_SITE_RELEASE",
  verified_complete:false,ready_to_start:false,field_release_granted:false,
  approved_site_progress:false,publishable:false,
  adoption:"BLOCKED_PENDING_SITE_COMPLETION_HOLDS_AND_RELEASE"
 };
}
