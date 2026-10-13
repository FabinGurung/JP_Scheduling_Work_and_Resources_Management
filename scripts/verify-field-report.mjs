// Local/private-side validation helper, NEVER an approver or public publisher.
// node scripts/verify-field-report.mjs downloaded-report.json
import {readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {executeWbsSample} from "../src/machine/wbs-cpm.mjs";
import {validateFieldReport} from "../src/field/progress.mjs";
const path=process.argv[2];
if(!path||process.argv.length!==3)throw Error("Usage: node scripts/verify-field-report.mjs <downloaded-report.json>");
const data=await readFile(path);
if(data.length>10000)throw Error("Untrusted report exceeds size limit");
const seed=JSON.parse(await readFile(new URL("../machine/source-snapshots/wbs_schedule_sample/schedule_seed.json",import.meta.url),"utf8"));
const dictionary=await readFile(new URL("../machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md",import.meta.url),"utf8");
const plan=executeWbsSample(seed,dictionary).plan;
const report=JSON.parse(data.toString("utf8"));
const verified=validateFieldReport(report,plan);
console.log(JSON.stringify({format:"PCK_FIELD_REPORT_QA_V1",report_id:verified.report_id,
 report_sha256:createHash("sha256").update(data).digest("hex"),
 schema_valid:true,project_authority:"SYNTHETIC_SAMPLE_ONLY",
 approval:false,source_authentication:"NOT_VERIFIED",review_authorization:"NOT_VERIFIED"},null,2));
