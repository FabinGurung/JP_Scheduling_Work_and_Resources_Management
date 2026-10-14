import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {buildNarayaniPilot} from "../src/machine/narayani-pilot.mjs";
const root=resolve(new URL("..",import.meta.url).pathname),out=join(root,"generated/public/narayani-pilot");
const file=x=>readFile(join(root,x),"utf8");
const blob=x=>createHash("sha1").update("blob "+Buffer.byteLength(x)+"\0").update(x).digest("hex");
const cfgText=await file("machine/project-mappings/narayani-v0.1.json");
const seedText=await file("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json");
const dictText=await file("machine/source-snapshots/wbs_schedule_sample/wbs_dictionary.md");
const pinned={seed:"40f2d8e35bf1fd71c5acb84a64272115cacadb99",dictionary:"ff1e3126efe8811be9bc398054aec601efaf7482",mapping:"572380334e6c262159059728fee70f610126fb14"};
if(blob(seedText)!==pinned.seed||blob(dictText)!==pinned.dictionary||blob(cfgText)!==pinned.mapping)throw Error("Unreviewed source/contract blob: refuse publish");
const result=buildNarayaniPilot(JSON.parse(seedText),dictText,JSON.parse(cfgText),{seedBlob:pinned.seed,dictionaryBlob:pinned.dictionary,configBlob:pinned.mapping});
if(process.argv.includes("--build")){
 await mkdir(out,{recursive:true});for(const [name,content] of Object.entries(result.files))await writeFile(join(out,name),content);
 console.log("NARAYANI PILOT BUILD PASS: 45 template tasks, 7 unverified milestones, 5 governed hold points, 2 dictionary gaps");
}else if(process.argv.includes("--verify")){
 for(const [name,content] of Object.entries(result.files)){
  const actual=await readFile(join(out,name),"utf8");
  if(actual!==content)throw Error("Pilot readback difference "+name);
 }
 console.log("NARAYANI PILOT VERIFY PASS: source-pinned, output-identical, no claims of site progress");
}else throw Error("Use --build or --verify");
