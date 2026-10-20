import {sha256Hex} from "./sha256.mjs";
/**
 * Offline/local generic digitization. No external calls, no invented WBS,
 * no productivity defaults or engineering approvals.
 * Supported: explicit-schema UTF-8 CSV/TSV, then the canonical JSON compiler.
 */
const allowed=["activity_id","activity_name","wbs_id","wbs_name",
 "parent_wbs_id","duration_slots","predecessors","calendar_id",
 "work_quantity","work_unit"];
const required=["activity_id","activity_name","wbs_id","wbs_name","duration_slots"];
function clean(s){return typeof s==="string"?s.trim():""}
function safe(s){return s.length>0&&s.length<=180&&!/[<>\u0000-\u001f]/.test(s)}
function ident(s){return /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(s)}
export function parseDelimited(text,delimiter=","){
 if(typeof text!=="string"||text.length>1000000)throw Error("Input must be UTF-8 text, at most 1,000,000 characters");
 if(![",","\t"].includes(delimiter))throw Error("Only CSV or TSV input is supported");
 text=text.replace(/^\uFEFF/,"");const rows=[],record=[];let token="",quoted=false,closed=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){token+='"';i++}
   else if(ch==='"') {quoted=false;closed=true}
   else token+=ch;
  }else if(ch==='"'){
   if(token!==""||closed)throw Error("Invalid unescaped quote");
   quoted=true;
  }else if(ch===delimiter){record.push(token);token="";closed=false}
  else if(ch==="\n"||ch==="\r"){
   if(ch==="\r"&&text[i+1]==="\n")i++;
   record.push(token);token="";closed=false;
   if(record.some(x=>x!==""))rows.push(record.slice());
   record.length=0;
  }else{
   if(closed&&ch!==" "&&ch!=="\t")throw Error("Characters after quoted cell");
   token+=ch;
  }
 }
 if(quoted)throw Error("Unclosed CSV quote");
 record.push(token);if(record.some(x=>x!==""))rows.push(record);
 if(!rows.length)throw Error("Empty input file");
 const headers=rows.shift().map(clean);
 if(new Set(headers).size!==headers.length||headers.some(x=>x===""))throw Error("Missing or duplicate headers");
 if(rows.length>2000)throw Error("Maximum 2000 activity rows per local import");
 return {headers,rows:rows.map((cells,i)=>{
  if(cells.length!==headers.length)throw Error("Row "+(i+2)+" has "+cells.length+" fields, expected "+headers.length);
  return Object.fromEntries(headers.map((h,j)=>[h,clean(cells[j])]));
 })};
}
function parsePredecessors(cell,activityId){
 if(!cell)return [];
 const parts=cell.split(";");if(parts.length>200)throw Error("Too many predecessors for "+activityId);
 const result=[],seen=new Set();
 for(const part of parts){
  const bits=part.trim().split(":");
  if(bits.length!==3||!ident(bits[0])||!["FS","SS","FF","SF"].includes(bits[1])||
   !/^-?\d+$/.test(bits[2]))throw Error("Explicit predecessor grammar required ID:FS|SS|FF|SF:integerLag at "+activityId);
  const key=bits[0]+"|"+activityId+"|"+bits[1]+"|"+bits[2];
  if(seen.has(key))throw Error("Duplicate predecessor "+key);
  seen.add(key);result.push({predecessor:bits[0],successor:activityId,type:bits[1],lag:Number(bits[2])});
 }
 return result;
}
export function digitizeGenericTable({text,format,project_id,project_name,source_name="Local unverified file"}){
 if(!["CSV","TSV"].includes(format))throw Error("Only CSV and TSV supported in offline importer");
 if(!ident(project_id)||!safe(project_name)||!safe(source_name))throw Error("Valid named project and source required");
 const data=parseDelimited(text,format==="TSV"?"\t":",");
 for(const col of required)if(!data.headers.includes(col))throw Error("Required explicit column missing: "+col);
 const ignored_columns=data.headers.filter(h=>!allowed.includes(h));
 if(!data.rows.length)throw Error("Empty WBS activity set");
 const wbs=new Map(),activities=[],relationships=[],known=new Set(),unmappedCalendars=[];
 const eventKeys=new Set();
 for(let i=0;i<data.rows.length;i++){
  const x=data.rows[i],line=i+2;
  if(!ident(x.activity_id)||known.has(x.activity_id)||!ident(x.wbs_id)||
   !safe(x.activity_name)||!safe(x.wbs_name))
   throw Error("Invalid or duplicate activity, or WBS row, at line "+line);
  known.add(x.activity_id);
  const parent=x.parent_wbs_id||null;
  if(parent!==null&&!ident(parent))throw Error("Invalid parent WBS at line "+line);
  const prev=wbs.get(x.wbs_id);
  if(prev&&(prev.name!==x.wbs_name||prev.parent_wbs_id!==parent))
   throw Error("Conflicting WBS name/parent for "+x.wbs_id);
  if(!prev)wbs.set(x.wbs_id,{wbs_id:x.wbs_id,name:x.wbs_name,...(parent?{parent_wbs_id:parent}:{})});
  let duration=null;
  if(x.duration_slots!==""){
   if(!/^\d+$/.test(x.duration_slots)||!Number.isSafeInteger(Number(x.duration_slots)))
    throw Error("Nonnegative integer duration_slots required at line "+line);
   duration=Number(x.duration_slots);
  }
  const a={id:x.activity_id,wbs_id:x.wbs_id,name:x.activity_name,duration,
   duration_basis:"ASSUMED_DRAFT",
   assumption_reason:"Imported from an unverified local table; not approved construction duration."};
  if(x.work_quantity||x.work_unit){
   const value=Number(x.work_quantity);
   if(!x.work_quantity||!Number.isFinite(value)||value<=0||!safe(x.work_unit))
    throw Error("Work quantity and unit must both be explicitly provided at line "+line);
   a.work_quantity=value;a.work_unit=x.work_unit;
   a.quantity_basis="ASSUMED_DRAFT";
   a.quantity_assumption_reason="Unverified local quantity, requires source/dimension review.";
  }
  if(x.calendar_id){
   if(!ident(x.calendar_id))throw Error("Invalid calendar_id at line "+line);
   a.calendar_id=x.calendar_id;unmappedCalendars.push(x.calendar_id);
  }
  activities.push(a);
  for(const rel of parsePredecessors(x.predecessors,x.activity_id)){
   const key=rel.predecessor+"|"+rel.successor+"|"+rel.type+"|"+rel.lag;
   if(eventKeys.has(key))throw Error("Duplicate relationship");
   eventKeys.add(key);relationships.push(rel);
  }
 }
 for(const w of wbs.values())if(w.parent_wbs_id&&!wbs.has(w.parent_wbs_id))
  throw Error("WBS parent row missing: "+w.parent_wbs_id);
 for(const x of relationships)if(!known.has(x.predecessor)||!known.has(x.successor))
  throw Error("Unknown predecessor: "+x.predecessor+" for "+x.successor);
 const source_sha256=sha256Hex(text);
 const spec={format:"SKYFORGE_PROJECT_INPUT_V1",classification:"LOCAL_UNVERIFIED",
  project:{id:project_id,name:project_name},
  wbs:[...wbs.values()],activities,relationships,
  source_manifest:[{source_id:"LOCAL_IMPORT",revision:"UNVERIFIED_LOCAL_DIGITIZATION",
   sha256:source_sha256,authority:"UNVERIFIED_SOURCE"}],
  scheduling_mode:"SHARED_CPM",checklist:[]};
 const diagnostics=[
  {code:"SOURCE_NOT_REVIEWED",severity:"HOLD",detail:"No independent evidence or authorization attached."},
  {code:"DAY_CALENDAR_NOT_SUPPLIED",severity:"NOTE",detail:"Durations are abstract slots, not dated working-day or weather schedules."},
  ...ignored_columns.map(field=>({code:"IGNORED_COLUMN",severity:"WARNING",field})),
  ...unmappedCalendars.map(id=>({code:"CALENDAR_NOT_MAPPED",severity:"HOLD",field:id,
   detail:"Local source references a calendar; supply an explicit verified calendar model before calculated publication."}))
 ];
 return {format:"SKYFORGE_DIGITIZATION_CANDIDATE_V1",source_sha256,source_name,
  source_format:format,planning_status:unmappedCalendars.length?"BLOCKED_CALENDAR_MAPPING":"UNVERIFIED_LOCAL_DRAFT",
  project:spec,diagnostics};
}
