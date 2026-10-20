import {digitizeGenericTable} from "./generic-digitizer.mjs";
import {sha256Hex} from "./sha256.mjs";
const safeId=s=>/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(s);
const num=v=>typeof v==="string"&&/^-?\d+(?:\.\d+)?$/.test(v.trim())?Number(v):NaN;
const esc=x=>'"'+String(x??"").replace(/"/g,'""')+'"';
const headings=["activity_id","activity_name","wbs_id","wbs_name","parent_wbs_id","duration_slots","predecessors","work_quantity","work_unit"];
const normal=s=>String(s??"").trim();
const sourceEntry=(text,kind)=>sha256Hex(new TextEncoder().encode(text));
function makeDraft({rows,format,project_id,project_name,source_name,original_sha256,hours_per_day=null,extra=[]}){
 if(!rows.length)throw Error("No activities found in source");
 const csv=[headings.join(","),...rows.map(r=>headings.map(h=>esc(r[h])).join(","))].join("\n")+"\n";
 const d=digitizeGenericTable({text:csv,format:"CSV",project_id,project_name,source_name});
 d.source_format=format;d.source_sha256=original_sha256;
 d.project.source_manifest[0].sha256=original_sha256;
 d.project.source_manifest[0].revision="UNVERIFIED_"+format+"_SOURCE";
 d.diagnostics.push(...extra);
 if(hours_per_day!=null)d.diagnostics.push({code:"USER_SUPPLIED_HOURS_PER_DAY",severity:"WARNING",detail:"Converted explicit source hours using entered "+hours_per_day+" h/day. Does not prove this project's calendars, work patterns or productivity."});
 return d;
}
function slots(hours,hours_per_day,field){
 if(!Number.isFinite(hours)||hours<0)throw Error("Invalid "+field+" hours");
 if(!Number.isFinite(hours_per_day)||hours_per_day<=0||hours_per_day>24)throw Error("P6 imports require explicit valid hours_per_day (0–24); no 8-hour default");
 const n=hours/hours_per_day;
 if(!Number.isSafeInteger(n))throw Error(field+" "+hours+" hours / "+hours_per_day+" is not an exact whole nominal day; no rounding permitted. Export a compatible time unit.");
 return n;
}
function lagSlots(hours,hours_per_day){
 if(!Number.isFinite(hours))throw Error("Invalid lag hours");
 const n=hours/hours_per_day;
 if(!Number.isSafeInteger(n))throw Error("Fractional day relationship lag: "+hours+" hours; no rounding or date fabrication");
 return n;
}
const relType=s=>{
 const x=normal(s).toUpperCase().replace(/[\s_-]/g,"");
 const dict={"PRFS":"FS","PRSS":"SS","PRFF":"FF","PRSF":"SF",
 "FS":"FS","SS":"SS","FF":"FF","SF":"SF",
 "FINISHTOSTART":"FS","STARTTOSTART":"SS","FINISHTOFINISH":"FF","STARTTOFINISH":"SF"};
 if(!dict[x])throw Error("Unsupported P6 relation type: "+s);
 return dict[x];
};
/** XER: one project per local import; project/task WBS and predecessor IDs remain linked. */
export function digitizeXer({text,project_id,project_name,source_name="P6 schedule.xer",hours_per_day}){
 if(typeof text!=="string"||text.length>8000000||!text.startsWith("ERMHDR"))
  throw Error("Native XER must start ERMHDR and be less than 8 MB");
 const tables=new Map();let table=null,fields=null;
 for(const line of text.split(/\r?\n/)){
  if(!line)continue;
  const chunks=line.split("\t"),kind=chunks[0];
  if(kind==="%T"){table=normal(chunks[1]).toUpperCase();fields=null;if(!tables.has(table))tables.set(table,[])}
  else if(kind==="%F"){if(!table)throw Error("XER field row without table");fields=chunks.slice(1)}
  else if(kind==="%R"){
   if(!table||!fields||chunks.length-1!==fields.length)throw Error("XER data row field count mismatch in "+table);
   const obj=Object.fromEntries(fields.map((f,i)=>[f,chunks[i+1]]));tables.get(table).push(obj);
  }else if(!["ERMHDR","%E"].includes(kind))throw Error("Unsupported XER record line "+kind);
 }
 const tasks=tables.get("TASK")??[],ws=tables.get("PROJWBS")??[],preds=tables.get("TASKPRED")??[];
 if(!tasks.length||tasks.length>2000)throw Error("XER must contain 1–2000 TASK records");
 const pids=new Set(tasks.map(t=>t.proj_id));if(pids.size!==1||pids.has(undefined))throw Error("Select or export exactly one P6 project with project IDs");
 const pid=[...pids][0],wbsMap=new Map(),taskMap=new Map();
 for(const w of ws.filter(x=>x.proj_id===pid)){
  if(!w.wbs_id||wbsMap.has(w.wbs_id))throw Error("Invalid or duplicate XER PROJWBS key");
  wbsMap.set(w.wbs_id,w);
 }
 const rows=[],byId=new Map();
 for(const t of tasks){
  const id=normal(t.task_code),w=wbsMap.get(t.wbs_id);
  if(!safeId(id)||byId.has(t.task_id)||!w||!t.task_id||!normal(t.task_name))
   throw Error("XER TASK requires unique task code, task key, name and resolvable PROJWBS");
  byId.set(t.task_id,id);
  const type=normal(t.task_type).toUpperCase();
  if(type&&/MILESTONE/.test(type)&&num(t.target_drtn_hr_cnt)!==0)
   throw Error("P6 milestone "+id+" must have zero planned duration");
  const h=num(t.target_drtn_hr_cnt);
  const duration=slots(h,hours_per_day,"P6 target duration for "+id);
  const parent=w.parent_wbs_id&&wbsMap.has(w.parent_wbs_id)?normal(wbsMap.get(w.parent_wbs_id)?.wbs_short_name||""):"";
  if(w.parent_wbs_id&&wbsMap.has(w.parent_wbs_id)&&!safeId(parent))throw Error("XER parent WBS ID cannot be normalized safely");
  const code=normal(w.wbs_short_name)||"WBS_"+w.wbs_id;
  if(!safeId(code))throw Error("XER WBS code requires explicit mapping: "+code);
  rows.push({activity_id:id,activity_name:t.task_name,wbs_id:code,wbs_name:w.wbs_name||"Unverified WBS "+code,
   parent_wbs_id:parent,duration_slots:String(duration),predecessors:""});
 }
 const byCode=new Map(rows.map(r=>[r.activity_id,r]));
 for(const p of preds.filter(x=>x.proj_id===pid)){
  const successor=byId.get(p.task_id),predecessor=byId.get(p.pred_task_id);
  if(!successor||!predecessor)throw Error("XER relationship has missing activity FK");
  const type=relType(p.pred_type),lag=lagSlots(num(p.lag_hr_cnt||"0"),hours_per_day);
  const item=byCode.get(successor);item.predecessors+=(item.predecessors?";":"")+predecessor+":"+type+":"+lag;
 }
 const unknownTables=[...tables.keys()].filter(x=>!["PROJECT","TASK","TASKPRED","PROJWBS","CALENDAR","CURRTYPE"].includes(x));
 const result=makeDraft({rows,format:"XER",project_id,project_name,source_name,
  original_sha256:sourceEntry(text),hours_per_day,extra:[
  {code:"P6_CALENDAR_NOT_IMPORTED",severity:"HOLD",detail:"P6 per-activity calendars, holidays and detailed hours are not admitted into abstract-slot schedules."},
  ...(unknownTables.length?[{code:"XER_TABLES_NOT_IMPORTED",severity:"WARNING",detail:unknownTables.join(", ").slice(0,320)}]:[])
 ]});
 return result;
}
const deEnt=s=>String(s).replace(/&#(x[0-9a-f]+|\d+);|&(?:amp|lt|gt|quot|apos);/gi,(a,n)=>{
 if(n){const cp=n[0].toLowerCase()==="x"?parseInt(n.slice(1),16):Number(n);if(!Number.isInteger(cp)||cp<0||cp>0x10ffff)throw Error("Invalid XML code point");return String.fromCodePoint(cp);}
 return { "&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'"}[a]??a;
});
const blocks=(s,tag)=>[...s.matchAll(new RegExp("<(?:[A-Za-z][\\w.-]*:)?"+tag+"(?:\\s[^<>]*)?>([\\s\\S]*?)<\\/(?:[A-Za-z][\\w.-]*:)?"+tag+"\\s*>","gi"))].map(x=>x[1]);
const field=(s,key)=>deEnt(blocks(s,key)[0]?.replace(/<[^>]+>/g,"").trim()??"");
/** P6 BusinessObjects XML subset: ID + WBS, duration + relationship sources required. */
export function digitizeP6Xml({text,project_id,project_name,source_name="P6 schedule.xml",hours_per_day}){
 if(typeof text!=="string"||text.length>8000000||!/<(?:[\w.-]+:)?(?:APIBusinessObjects|Project)\b/.test(text))throw Error("P6 XML document root not recognized");
 if(/<!DOCTYPE|<!ENTITY|<\?xml-stylesheet/i.test(text))throw Error("XML DTD, entities and stylesheets are forbidden");
 const projects=blocks(text,"Project");
 if(projects.length!==1)throw Error("P6 XML import supports exactly one <Project>; split multi-project exports");
 const body=projects[0],activityBlocks=blocks(body,"Activity"),wbsBlocks=blocks(body,"WBS"),relations=blocks(body,"Relationship");
 if(!activityBlocks.length||activityBlocks.length>2000)throw Error("No recognized P6 XML activities");
 const wbs=new Map();
 for(const b of wbsBlocks){
  const oid=field(b,"ObjectId"),id=field(b,"Code")||field(b,"Id"),title=field(b,"Name");
  if(!oid||!safeId(id)||!title||wbs.has(oid))throw Error("Malformed WBS object; WBS ObjectId, Code and Name required");
  wbs.set(oid,{id,title,parent:field(b,"ParentObjectId")});
 }
 const rows=[],activities=new Map();
 for(const b of activityBlocks){
  const oid=field(b,"ObjectId"),id=field(b,"Id"),title=field(b,"Name"),
   wo=field(b,"WBSObjectId"),w=wbs.get(wo);
  if(!oid||!safeId(id)||!title||!w||activities.has(oid))throw Error("P6 XML activity requires ObjectId, Id, Name and WBSObjectId");
  const raw=field(b,"PlannedDuration")||field(b,"OriginalDuration");
  const iso=/^PT(\d+(?:\.\d+)?)H(?:\d+(?:\.\d+)?M)?$/i.exec(raw);
  const h=iso?Number(iso[1]):num(raw);
  const duration=slots(h,hours_per_day,"P6 planned hours for "+id);
  const parent=w.parent?wbs.get(w.parent):null;
  if(w.parent&&!parent)throw Error("Missing parent WBS object for "+w.id);
  rows.push({activity_id:id,activity_name:title,wbs_id:w.id,wbs_name:w.title,
   parent_wbs_id:parent?.id||"",duration_slots:String(duration),predecessors:""});
  activities.set(oid,id);
 }
 const byCode=new Map(rows.map(x=>[x.activity_id,x]));
 for(const b of relations){
  const pred=activities.get(field(b,"PredecessorActivityObjectId")),
   succ=activities.get(field(b,"SuccessorActivityObjectId"));
  if(!pred||!succ)throw Error("P6 XML activity relation FK missing");
  const type=relType(field(b,"Type")),lag=lagSlots(num(field(b,"Lag")||"0"),hours_per_day);
  const r=byCode.get(succ);r.predecessors+=(r.predecessors?";":"")+pred+":"+type+":"+lag;
 }
 return makeDraft({rows,format:"P6_XML",project_id,project_name,source_name,
  original_sha256:sourceEntry(text),hours_per_day,extra:[{code:"P6_XML_CALENDAR_NOT_IMPORTED",severity:"HOLD",
  detail:"Calendars, activity steps, resources and actuals are not represented in this first normalized schedule adapter."}]});
}
