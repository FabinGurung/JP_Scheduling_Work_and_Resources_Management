import {digitizeGenericTable} from "./generic-digitizer.mjs";
import {sha256Hex} from "./sha256.mjs";
const required=["activity_id","activity_name","wbs_id","wbs_name","duration_slots"];
const dec=s=>String(s??"").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(all,token)=>{
 if(token[0]==="#"){const c=token[1].toLowerCase()==="x"?parseInt(token.slice(2),16):parseInt(token.slice(1),10);if(c<0||c>0x10ffff||!Number.isInteger(c))throw Error("Invalid OOXML character");return String.fromCodePoint(c)}
 return {amp:"&",lt:"<",gt:">",quot:'"',apos:"'"}[token.toLowerCase()]??all;
});
const txt=bytes=>new TextDecoder("utf-8",{fatal:true}).decode(bytes);
const tag=(source,name)=>[...source.matchAll(new RegExp("<(?:\\w+:)?"+name+"(?=\\s|>)[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?"+name+">","gi"))].map(x=>x[1]);
const attr=(markup,name)=>new RegExp("(?:^|\\s)"+name.replace(":","\\:")+"\\s*=\\s*([\"'])(.*?)\\1","i").exec(markup)?.[2]??null;
function zipIndex(buffer){
 const data=buffer instanceof Uint8Array?buffer:new Uint8Array(buffer);
 if(data.length>12000000||data.length<22)throw Error("XLSX must be a ZIP/OOXML file under 12 MB");
 const v=new DataView(data.buffer,data.byteOffset,data.byteLength),u16=n=>v.getUint16(n,true),u32=n=>v.getUint32(n,true);
 let eocd=-1;for(let i=data.length-22;i>=Math.max(0,data.length-65557);i--){if(u32(i)===0x06054b50){eocd=i;break}}
 if(eocd<0)throw Error("No XLSX ZIP central directory");
 const count=u16(eocd+10),bytes=u32(eocd+12),offset=u32(eocd+16);
 if(count>4000||count===0xffff||offset===0xffffffff||offset+bytes>eocd)throw Error("Unsupported or unsafe ZIP directory");
 const entries=new Map();let p=offset;
 for(let i=0;i<count;i++){
  if(u32(p)!==0x02014b50)throw Error("Malformed ZIP central record");
  const flag=u16(p+8),method=u16(p+10),compressed=u32(p+20),size=u32(p+24),n=u16(p+28),ex=u16(p+30),comm=u16(p+32),local=u32(p+42);
  if((flag&1)!==0||![0,8].includes(method)||size>16_000_000||compressed>12_000_000||local===0xffffffff)
   throw Error("Encrypted, oversized or unsupported ZIP content");
  const name=txt(data.subarray(p+46,p+46+n)).replace(/\\/g,"/");
  if(name.startsWith("/")||name.split("/").includes("..")||entries.has(name))throw Error("Unsafe/duplicated XLSX ZIP entry");
  entries.set(name,{method,compressed,size,local});
  p+=46+n+ex+comm;
 }
 async function load(name){
  const item=entries.get(name);if(!item)throw Error("Missing XLSX package entry: "+name);
  const p=item.local;if(u32(p)!==0x04034b50)throw Error("Invalid ZIP local header");
  const begin=p+30+u16(p+26)+u16(p+28),end=begin+item.compressed;
  if(end>data.length)throw Error("ZIP entry truncated");
  const compressed=data.subarray(begin,end);
  if(item.method===0){if(compressed.length!==item.size)throw Error("ZIP store length mismatch");return compressed}
  if(typeof DecompressionStream!=="function")throw Error("Browser lacks local ZIP/deflate support; use CSV export");
  const ds=new DecompressionStream("deflate-raw");
  const result=await new Response(new Blob([compressed]).stream().pipeThrough(ds)).arrayBuffer();
  if(result.byteLength!==item.size||result.byteLength>16_000_000)throw Error("ZIP decompressed size mismatch");
  return new Uint8Array(result);
 }
 return {entries,load};
}
const column=ref=>{
 const m=/^([A-Z]{1,3})\d+$/.exec(ref);if(!m)throw Error("Invalid spreadsheet address: "+ref);
 let value=0;for(const c of m[1])value=value*26+c.charCodeAt(0)-64;
 if(value>16000)throw Error("Column beyond safe limit");return value-1;
};
function parseSheet(xml,shared){
 if(/<!DOCTYPE|<!ENTITY|<sheetProtection\b/i.test(xml))throw Error("Unsupported/unsafe worksheet features");
 const rows=[];
 for(const m of xml.matchAll(/<row(?=\s|>)[^>]*>([\s\S]*?)<\/row>/g)){
  const cells=[];let formula=false;
  for(const c of m[1].matchAll(/<c(?=\s|>)([^>]*)>([\s\S]*?)<\/c>/g)){
   const ref=attr(c[1],"r"),t=attr(c[1],"t"),at=column(ref??"");
   if(/<f(?:\s|>)/.test(c[2]))formula=true;
   let value="";
   if(t==="inlineStr")value=tag(c[2],"t").map(dec).join("");
   else{
    const raw=tag(c[2],"v")[0]??"";
    value=t==="s"?shared[Number(raw)]??null:dec(raw);
   }
   if(value===null)throw Error("XLSX shared-string index not found");
   if(at>32)throw Error("XLSX import expects an explicit table within first 33 columns");
   cells[at]=value;
  }
  if(formula)throw Error("Formula cells found in data rows. Export evaluated values as CSV for source verification");
  if(cells.some(x=>x!==undefined&&String(x).trim()!==""))rows.push(cells.map(x=>String(x??"")));
  if(rows.length>2002)throw Error("XLSX table exceeds 2000 work items");
 }
 return rows;
}
function csvCell(v){return '"'+String(v).replace(/"/g,'""')+'"'}
function normalizeTable(rows){
 if(!rows.length)return null;
 // The actual header must be explicit. Other sheets are ignored, not guessed.
 const at=rows.findIndex(r=>required.every(h=>r.map(x=>x.trim().toLowerCase()).includes(h)));
 if(at<0)return null;
 const headers=rows[at].map(x=>x.trim().toLowerCase());
 if(new Set(headers).size!==headers.length)throw Error("Duplicate spreadsheet column names");
 const csv=[headers.map(csvCell).join(","),...rows.slice(at+1).filter(r=>r.some(x=>x.trim()!=="")).map(row=>headers.map((_,i)=>csvCell(row[i]??"")).join(","))].join("\n")+"\n";
 return csv;
}
/** XLSX 2007+ imported locally, never via upload. No macro evaluation, no formulas, no inferred columns. */
export async function digitizeXlsx({bytes,project_id,project_name,source_name="Schedule.xlsx"}){
 if(!(bytes instanceof Uint8Array))bytes=new Uint8Array(bytes);
 const original_sha256=sha256Hex(bytes),zip=zipIndex(bytes);
 const workbook=txt(await zip.load("xl/workbook.xml"));
 const rels=txt(await zip.load("xl/_rels/workbook.xml.rels"));
 if(/<!DOCTYPE|<!ENTITY/.test(workbook+rels))throw Error("XLSX XML entities/DTD not permitted");
 const mappings=new Map();
 for(const r of rels.matchAll(/<Relationship(?=\s|>)([^>]+?)\/>/g)){
  const id=attr(r[1],"Id"),target=attr(r[1],"Target"),type=attr(r[1],"Type");
  if(type?.includes("/worksheet")&&id&&target){
   const normalized=target.replace(/^\/xl\//,"").replace(/^\/+/,"");
   const path=normalized.startsWith("xl/")?normalized:"xl/"+normalized;
   if(path.includes(".."))throw Error("Unsafe worksheet target path");
   mappings.set(id,path);
  }
 }
 let shared=[];
 if(zip.entries.has("xl/sharedStrings.xml")){
  const strings=txt(await zip.load("xl/sharedStrings.xml"));
  shared=tag(strings,"si").map(x=>tag(x,"t").map(dec).join(""));
 }
 const candidates=[];
 for(const row of workbook.matchAll(/<sheet(?=\s|>)([^>]+?)\/>/g)){
  const id=attr(row[1],"r:id"),name=attr(row[1],"name")??"unnamed";
  if(!mappings.has(id))continue;
  const csv=normalizeTable(parseSheet(txt(await zip.load(mappings.get(id))),shared));
  if(csv)candidates.push({name,csv});
 }
 if(!candidates.length)throw Error("XLSX does not contain identifiable activity_id, activity_name, wbs_id, wbs_name, duration_slots headers");
 if(candidates.length!==1)throw Error("Multiple XLSX worksheets contain schedule headers: "+candidates.map(x=>x.name).join(", ")+". Export one sheet or CSV for unambiguous selection.");
 const selected=candidates[0];
 const result=digitizeGenericTable({text:selected.csv,format:"CSV",project_id,project_name,source_name});
 result.source_format="XLSX";result.source_sha256=original_sha256;
 result.project.source_manifest[0].sha256=original_sha256;
 result.project.source_manifest[0].revision="UNVERIFIED_XLSX_WORKSHEET_"+selected.name.slice(0,80);
 result.diagnostics.push({code:"EXCEL_SHEET_IMPORTED",severity:"NOTE",detail:"Explicit activity table imported from "+selected.name+"; formulas and other sheets not evaluated."});
 return result;
}
