// Private-source reads only. This script never prints or writes raw Drive rows.
import {readFile,writeFile,mkdir} from "node:fs/promises";
import {join,resolve} from "node:path";
import {buildAuthenticatedProgress,selectCanonicalRows} from "../src/machine/narayani-live-sync.mjs";
const root=resolve(new URL("..",import.meta.url).pathname);
const token=process.env.GOOGLE_OAUTH_ACCESS_TOKEN,sheet=process.env.NARAYANI_DRIVE_SPREADSHEET_ID;
if(!token||token.length<20||!sheet||!/^[A-Za-z0-9_-]{15,}$/.test(sheet))throw Error("Authorized OIDC token or canonical Drive spreadsheet ID absent");
if(process.env.NARAYANI_AUTHENTICATED_SYNC!=="true")throw Error("Fail closed: authenticated publishing is not enabled");
async function get(range){
 const target="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(sheet)+"/values/"+encodeURIComponent(range)+"?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE";
 const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30000);
 try{
  const res=await fetch(target,{headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:abort.signal,redirect:"error"});
  if(!res.ok)throw Error("Authenticated Google Sheets read failed (HTTP "+res.status+"); no publish");
  const size=Number(res.headers.get("content-length")||0);
  if(size>1_500_000)throw Error("Sheet source exceeds bounded read size");
  const content=await res.text();
  if(content.length>1_500_000)throw Error("Unbounded data source");
  const data=JSON.parse(content);
  if(!Array.isArray(data.values))throw Error("Unexpected Sheets values response");
  return data.values;
 }finally{clearTimeout(timer);}
}
const [daily,ready]=await Promise.all([get("'Daily Progress'!A5:H"),get("'Daily Readiness'!A5:W")]);
const source=selectCanonicalRows(daily,ready);
const plan=JSON.parse(await readFile(join(root,"generated/public/narayani-pilot/map.json"),"utf8"));
const stamp=new Date().toISOString().replace(/\.\d{3}Z$/,"Z");
const run=buildAuthenticatedProgress(source,plan,{reconciled_at:stamp,source_id:"CANONICAL_NARAYANI_FISHTAIL_SHEETS"});
const output=join(root,"generated/public/narayani-progress");
await mkdir(output,{recursive:true});
for(const [file,data] of Object.entries(run.files))await writeFile(join(output,file),data,{mode:0o644});
const reread=await readFile(join(output,"progress.json"),"utf8");
if(reread!==run.files["progress.json"])throw Error("Cannot verify serialized release");
console.log("NARAYANI AUTHENTICATED READONLY SYNC PASS: %d site progress / %d readiness, %d master partial subwork, 0 approved P6 activities. Digest %s",
 source.daily_progress_rows.length,source.daily_readiness_rows.length,
 run.output.task_evidence.reduce((n,x)=>n+x.reported_subwork_entries,0),
 run.manifest.output_sha256["progress.json"].slice(0,16));
