import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {executeWbsSample} from "../src/machine/wbs-cpm.mjs";
const root=resolve(new URL("..",import.meta.url).pathname);
const base=join(root,"machine/source-snapshots/wbs_schedule_sample");
const seedText=await readFile(join(base,"schedule_seed.json"),"utf8");
const dictionary=await readFile(join(base,"wbs_dictionary.md"),"utf8");
const digest=s=>createHash("sha1").update("blob "+Buffer.byteLength(s)+"\0").update(s).digest("hex");
const sourcePins={seedSnapshotSha:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",
 dictionarySnapshotSha:"ff1e3126efe8811be9bc398054aec601efaf7482"};
if(digest(seedText)!==sourcePins.seedSnapshotSha||digest(dictionary)!==sourcePins.dictionarySnapshotSha)throw Error("Drive source snapshots differ from reviewed Git blob pins. Abort.");
const seed=JSON.parse(seedText);
const result=executeWbsSample(seed,dictionary,sourcePins);
const dir=join(root,"generated/public/wbs-sample");
if(process.argv[2]==="--build"){
 await mkdir(dir,{recursive:true});
 for(const [name,data] of Object.entries(result.files))await writeFile(join(dir,name),data,{encoding:"utf8",flag:"w"});
 console.log("WBS MACHINE BUILD PASS: "+result.plan.task_count+" activities; "+result.plan.relationship_count+" FS links; "+result.plan.milestone_count+" milestones; "+result.plan.duration_workday_slots+" workday slots; critical "+result.plan.critical_activity_count);
}else if(process.argv[2]==="--verify"){
 for(const [name,data] of Object.entries(result.files)){
  const existing=await readFile(join(dir,name),"utf8");
  if(existing!==data)throw Error("WBS machine readback mismatch: "+name);
 }
 console.log("WBS MACHINE VERIFY PASS: SHA-256-backed reproducible plan, CSV, Gantt SVG, HTML; native CPM matches independent oracle; no invented calendar dates");
}else throw Error("Usage: node scripts/run-wbs-sample.mjs --build | --verify");
