import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {compileVisualModel} from "../src/visual/project-model.mjs";
const root=resolve(new URL("..",import.meta.url).pathname),out=join(root,"generated/public/narayani-visual");
const read=p=>readFile(join(root,p),"utf8");
const cfgRaw=await read("machine/project-mappings/narayani-checklist-config-v0.1.json");
const shaGit=x=>createHash("sha1").update("blob "+Buffer.byteLength(x)+"\0").update(x).digest("hex");
if(shaGit(cfgRaw)!=="3bdfed18678f183c47d20b6d3c3c1c6f9bc1d21f")throw Error("New checklist template revision must be reviewed");
const pilot=JSON.parse(await read("generated/public/narayani-pilot/map.json"));
const progress=JSON.parse(await read("generated/public/narayani-progress/progress.json"));
const reportedRaw=await read("machine/project-mappings/narayani-mcq-public-state.json");
const reported=JSON.parse(reportedRaw);
const compiled=compileVisualModel(pilot,progress,JSON.parse(cfgRaw),reported);
const files={...compiled.files,"visual-manifest.json":JSON.stringify(compiled.manifest,null,2)+"\n"};
if(process.argv.includes("--build")){
 await mkdir(out,{recursive:true});
 for(const [name,content] of Object.entries(files))await writeFile(join(out,name),content);
 console.log("VISUAL PROJECT BUILD PASS: 45 activities, 49 dependency edges, 405 checklist items, 7 milestones, 3-month scenario");
}else if(process.argv.includes("--verify")){
 for(const [name,content] of Object.entries(files))if(await readFile(join(out,name),"utf8")!==content)throw Error("Visual project output drift: "+name);
 console.log("VISUAL PROJECT VERIFY PASS: one public-safe project JSON for graph, calendar, Gantt and checklists");
}else throw Error("Use --build or --verify");
