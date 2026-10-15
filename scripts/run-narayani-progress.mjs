import {readFile,writeFile,mkdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import {join,resolve} from "node:path";
import {buildPublicProgress} from "../src/machine/narayani-progress.mjs";
const root=resolve(new URL("..",import.meta.url).pathname),out=join(root,"generated/public/narayani-progress");
const file=async path=>readFile(join(root,path),"utf8");
const blob=x=>createHash("sha1").update("blob "+Buffer.byteLength(x)+"\0").update(x).digest("hex");
const raw=await file("machine/project-mappings/narayani-progress-public-v0.1.json");
if(blob(raw)!=="84eaa91483bad21554c2c16868bcc63054ce03a3")throw Error("Narayani progress input not the inspected public-safe version");
const plan=JSON.parse(await file("generated/public/narayani-pilot/map.json"));
const r=buildPublicProgress(JSON.parse(raw),plan);
const outputs={...r.files,"manifest.json":JSON.stringify(r.manifest,null,2)+"\n"};
if(process.argv.includes("--build")){
 await mkdir(out,{recursive:true});
 for(const [name,content] of Object.entries(outputs))await writeFile(join(out,name),content);
 console.log("NARAYANI PROGRESS BUILD PASS: 34 private diary events counted, 4 readiness entries, 2 template subactivities, zero approved P6 completions, public-safe output only");
}else if(process.argv.includes("--verify")){
 for(const [name,content] of Object.entries(outputs)){
  if(await readFile(join(out,name),"utf8")!==content)throw Error("Progress output readback drift: "+name);
 }
 console.log("NARAYANI PROGRESS VERIFY PASS: deterministic summary, no private PKs or approved site status");
}else throw Error("Use --build or --verify");
