// Immutable synthetic fixture build. Actions executes this, not ChatGPT.
// Outputs are not accepted unless second-run readback exactly matches.
import {readFile,mkdir,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
import {resolve,join} from "node:path";
import {executeRequest,verifyFiles} from "../src/machine/execute.mjs";
const root=resolve(new URL("..",import.meta.url).pathname);
const reqPath=join(root,"machine/requests/demo-foundation.json");
const outDir=join(root,"generated/public/demo-foundation");
const raw=await readFile(reqPath,"utf8");
const gitBlobSha=createHash("sha1").update("blob "+Buffer.byteLength(raw)+"\0").update(raw).digest("hex");
if(gitBlobSha!=="65a93cdb49091df85df0af11902b89867b12a3d8")throw Error("Public fixture differs from reviewed Git blob; explicit source review required");
const request=JSON.parse(raw);
const result=executeRequest(request,{publicBuild:true});
const escape=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rows=result.plan.activities.map(a=>"<tr><td>"+escape(a.activity_id)+"</td><td>"+escape(a.name)+"</td><td>"+escape(a.start_date)+"</td><td>"+escape(a.finish_exclusive_date)+"</td><td>"+a.duration_workdays+"</td><td>"+a.leveling_delay_days+"</td></tr>").join("\n");
const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
'<title>Machine-executed foundation schedule | Skyforge</title><link rel="stylesheet" href="../../assets/sky-theme.css">'+
'<style>body{font-family:system-ui,sans-serif;margin:0;color:#183b59}.view{max-width:1100px;margin:auto;padding:32px 18px}a{color:#205eae}table{width:100%;border-collapse:collapse;min-width:650px;background:white}td,th{padding:12px;border-bottom:1px solid #d4e4ee;text-align:left}th{background:#edf7ff}.scroll{overflow:auto;border-radius:14px;border:1px solid #c9dce9}.note{padding:15px;background:#fff7e4;border-left:4px solid #eda127;border-radius:6px}</style></head><body><div class="sky-ribbon"></div><main class="view"><p><a href="../../index.html">← Skyforge overview</a> · <a href="../../planner.html">Interactive planner</a></p>'+
'<span class="storm-kicker">MACHINE EXECUTED · SYNTHETIC INPUT · NO APPROVAL</span><h1>Foundation construction schedule</h1>'+
'<p class="note"><strong>NOT ENGINEERING APPROVED.</strong> A deterministic GitHub Actions build produced this schedule from an explicit synthetic fixture. Dates are calculations, not a field-authorized execution plan. Five upstream adapter previews do not imply the upstream systems were run.</p>'+
'<p><a href="./plan.json">Executed plan JSON</a> · <a href="./upstreams.json">Five adapter evidence records</a> · <a href="./manifest.json">SHA-256 provenance manifest</a></p>'+
'<div class="scroll"><table><thead><tr><th>Activity</th><th>Work</th><th>Start</th><th>Finish (exclusive event)</th><th>Working days</th><th>Leveling delay</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
'<p><strong>Algorithm:</strong> '+escape(result.plan.policy)+'. <strong>Optimality:</strong> '+escape(result.plan.optimality_claim)+
'. No structural design calculations, BIM geometry, actual site observations, or engineering sign-off were generated.</p>'+
'</main></body></html>';
const files={...result.files,"index.html":html+"\n"};
if(process.argv[2]==="--verify"){
 for(const [name,content] of Object.entries(files)){
  const saved=await readFile(join(outDir,name),"utf8");
  if(saved!==content)throw Error("Readback mismatch: "+name);
 }
 verifyFiles(files,request,{publicBuild:true});
 console.log("MACHINE VERIFY PASS: output reproduced exactly, 5 labeled adapter contracts, no engineering approval");
}else if(process.argv[2]==="--build"){
 await mkdir(outDir,{recursive:true});
 for(const [name,content] of Object.entries(files))await writeFile(join(outDir,name),content,{encoding:"utf8",flag:"w"});
 verifyFiles(files,request,{publicBuild:true});
 console.log("MACHINE BUILD PASS: "+result.plan.activities.length+" activities, SHA-256 manifest, 5 adapter previews. Synthetic and NOT ENGINEERING APPROVED.");
}else throw Error("Usage: node scripts/machine-runner.mjs --build | --verify");
