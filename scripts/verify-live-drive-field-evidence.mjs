import {readFile} from "node:fs/promises";
import {reconcileLiveDriveFieldEvidence} from "../src/kernel/drive-field-evidence-reconcile.mjs";

/**
 * PRIVATE read-only evidence reconciliation. Requires an externally provisioned
 * GOOGLE_OAUTH_ACCESS_TOKEN with Drive file-read scope and an independently
 * provisioned source/reviewer public-key trust registry.
 *
 * This runner never signs, edits, approves, uploads, or publishes any content.
 * Do not run it from the public GitHub Pages build.
 */
const args=process.argv.slice(2);
if(args.length!==4){
 console.error("Usage: node scripts/verify-live-drive-field-evidence.mjs <public-model.json> <signed-bundle.json> <TRUSTED-KEYS.json> <as-of-UTC>");
 process.exitCode=2;
}else{
 try{
  if(process.env.SKYFORGE_PRIVATE_EVIDENCE_READBACK!=="true")
   throw Error("private verification not explicitly enabled");
  const token=process.env.GOOGLE_OAUTH_ACCESS_TOKEN;
  if(!token||token.length<20)throw Error("authenticated Drive read-only OAuth token required");
  const [m,b,t]=await Promise.all(args.slice(0,3).map(p=>readFile(p,"utf8")));
  const receipt=await reconcileLiveDriveFieldEvidence({
   model:JSON.parse(m),bundle:JSON.parse(b),trustConfig:JSON.parse(t),
   asOfUtc:args[3],oauthToken:token
  });
  // Summary only: no reporter identities, source file IDs, raw evidence bytes
  // or keys are printed to CI logs.
  console.log(JSON.stringify({
   format:receipt.format,project_id:receipt.project_id,
   source_sha256:receipt.source_sha256,
   source_records:receipt.source_records,
   provider_file_revisions_verified:receipt.provider_file_revisions_verified,
   independent_review_records:receipt.independent_review_records,
   disclosed_self_review_records:receipt.disclosed_self_review_records,
   no_evidence_received:receipt.no_evidence_received,
   authority:receipt.authority,field_release_granted:false,
   ready_to_start:false,publishable:false
  },null,2));
 }catch(error){
  // Never serialize an exception's raw request headers or private response.
  const err=error instanceof Error?error.message:String(error);
  console.error("PRIVATE DRIVE READBACK BLOCKED: "+err.slice(0,350));
  process.exitCode=1;
 }
}
