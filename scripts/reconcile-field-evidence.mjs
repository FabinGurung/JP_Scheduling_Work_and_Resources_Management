import {readFile} from "node:fs/promises";
import {reconcilePrivateFieldEvidence} from "../src/kernel/field-evidence-attestation.mjs";
import {inspectAttestedWorkReadiness} from "../src/kernel/field-attested-readiness.mjs";

/** PRIVATE trusted-environment CLI. Never writes to GitHub, Drive or Pages.
 *
 * Usage: node scripts/reconcile-field-evidence.mjs <source-model.json>
 *        <signed-receipts.json> <trusted-keys.json> <as-of-UTC> [activity-id]
 *
 * Trusted keys must be provisioned by an independently authenticated operator
 * and stored outside the repository/public web output.
 */
const args=process.argv.slice(2);
if(args.length<4||args.length>5){
 console.error("Usage: node scripts/reconcile-field-evidence.mjs <source-model.json> <signed-receipts.json> <trusted-keys.json> <as-of-UTC> [activity-id]");
 process.exitCode=2;
}else{
 try{
  const [modelText,bundleText,keysText]=await Promise.all(args.slice(0,3).map(p=>readFile(p,"utf8")));
  const model=JSON.parse(modelText),bundle=JSON.parse(bundleText),keys=JSON.parse(keysText);
  const receipt=reconcilePrivateFieldEvidence(model,bundle,keys,args[3]);
  const result=args[4]?inspectAttestedWorkReadiness(model,args[4],bundle,keys,args[3]):receipt;
  process.stdout.write(JSON.stringify(result,null,2)+"\n");
 }catch(error){
  console.error("PRIVATE EVIDENCE ADMISSION BLOCKED: "+error.message);
  process.exitCode=1;
 }
}
