// Private runner only; never commit incoming source rows or the private audit.
// Usage: node scripts/reconcile-private-drive-export.mjs private-drive-export.json
// Required input JSON: format, project_id, daily_progress_rows, daily_readiness_rows.
// Row arrays have exact Daily Progress A:H and Daily Readiness A:W schemas.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {reconcilePrivateDriveExport} from "../src/machine/narayani-progress.mjs";
if(process.argv.length!==3)throw Error("Usage: node scripts/reconcile-private-drive-export.mjs <private-export.json>");
const sourcePath=resolve(process.argv[2]),root=resolve(new URL("..",import.meta.url).pathname);
const bytes=await readFile(sourcePath);
if(bytes.length>3_000_000)throw Error("Exceeds bounded private source size");
const result=reconcilePrivateDriveExport(JSON.parse(bytes.toString("utf8")));
const dir=join(root,"generated/private/narayani");
await mkdir(dir,{recursive:true});
await writeFile(join(dir,"audit.json"),JSON.stringify({
 classification:"PRIVATE_NEVER_PUBLISH",input_sha256:createHash("sha256").update(bytes).digest("hex"),
 reviewed_at:"MUST_BE_SET_BY_AUTHENTICATED_RUNNER",report_rows:result.private_audit
},null,2)+"\n");
await writeFile(join(dir,"public-candidate.json"),JSON.stringify({
 format:"UNAPPROVED_SANITIZED_CANDIDATE_DO_NOT_DEPLOY",
 scope:result.public_aggregate,approved_publication:false,reviewer_identity:"NOT_PROVIDED"
},null,2)+"\n");
console.log(JSON.stringify({status:"SOURCE_ROWS_RECONCILED",private_reports:result.private_audit.length,
 readiness:result.public_aggregate.readiness_rows,
 output_location:"generated/private/narayani (not tracked / not deployed)",
 release_approved:false,autopublish:false},null,2));
