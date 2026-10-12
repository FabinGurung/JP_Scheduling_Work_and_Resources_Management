import {createHash} from "node:crypto";
import {scheduleNetwork} from "../kernel/cpm.mjs";

export const WBS_FORMAT="PCK_WBS_SAMPLE_V1";
const sha=s=>createHash("sha256").update(s,"utf8").digest("hex");
const plain=s=>typeof s==="string"&&s.trim()&&s.length<=180&&!/[\u0000-\u001f<>]/.test(s);
const assert=(ok,message)=>{if(!ok)throw Error(message);};
const requireKeys=(obj,keys,label)=>{
  assert(obj&&typeof obj==="object"&&!Array.isArray(obj),label+" must be object");
  for(const key of Object.keys(obj))assert(keys.includes(key),label+" unknown field "+key);
};
const sortIds=(a,b)=>a.localeCompare(b,"en");
const json=x=>JSON.stringify(x,null,2)+"\n";
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function dictionaryEntries(markdown){
 assert(typeof markdown==="string"&&markdown.length<200000&&markdown.includes("Synthetic Baseline"),"WBS dictionary not recognized as synthetic");
 const stages=[...markdown.matchAll(/^\*\s+\*\*(\d{4,5})\*\*\s*-\s*(.+)$/gm)].map(m=>({wbs_code:m[1],name:m[2].trim()}));
 const detailed=[...markdown.matchAll(/^\*\s+\*\*(\d{4,5}):\*\*/gm)].map(m=>m[1]);
 assert(stages.length===10&&new Set(stages.map(x=>x.wbs_code)).size===stages.length,"WBS dictionary stage contract mismatch");
 assert(new Set(detailed).size===detailed.length,"WBS dictionary duplicate detailed code");
 return {stages,detailed};
}
function independentFSLongestPath(tasks){
 const byId=new Map(tasks.map(t=>[t.task_id,t])),indegree=new Map(tasks.map(t=>[t.task_id,t.predecessors.length]));
 const successors=new Map(tasks.map(t=>[t.task_id,[]])),es=new Map(tasks.map(t=>[t.task_id,0]));
 for(const t of tasks)for(const p of t.predecessors)successors.get(p.id).push(t.task_id);
 const ready=tasks.filter(t=>!t.predecessors.length).map(t=>t.task_id).sort(sortIds),order=[];
 while(ready.length){
   const id=ready.shift(),cur=byId.get(id);order.push(id);
   for(const next of successors.get(id)){
     es.set(next,Math.max(es.get(next),es.get(id)+cur.duration_days));
     indegree.set(next,indegree.get(next)-1);
     if(indegree.get(next)===0){ready.push(next);ready.sort(sortIds);}
   }
 }
 assert(order.length===tasks.length,"Independent oracle detected a dependency cycle");
 const projectFinish=Math.max(...tasks.map(t=>es.get(t.task_id)+t.duration_days));
 const ls=new Map(),tf=new Map();
 for(const id of order.slice().reverse()){
   const t=byId.get(id),limit=successors.get(id).length?
     Math.min(...successors.get(id).map(next=>ls.get(next))):projectFinish;
   ls.set(id,limit-t.duration_days);tf.set(id,ls.get(id)-es.get(id));
 }
 return {es,tf,projectFinish};
}
export function executeWbsSample(seed,dictionaryText,{seedSnapshotSha,dictionarySnapshotSha}={}){
 requireKeys(seed,["project_metadata","tasks"],"seed");
 requireKeys(seed.project_metadata,["project_name","version","description","scheduling_engine_instructions"],"metadata");
 assert(plain(seed.project_metadata.project_name)&&seed.project_metadata.description?.includes("Synthetic"),"Source must declare synthetic provenance");
 assert(seed.project_metadata.scheduling_engine_instructions==="Calculate Critical Path (CPM) using standard Finish-to-Start (FS) dependencies.","Unreviewed scheduling semantics");
 assert(Array.isArray(seed.tasks)&&seed.tasks.length>0&&seed.tasks.length<=200,"Unsupported task count");
 const dict=dictionaryEntries(dictionaryText),stages=new Set(dict.stages.map(s=>s.wbs_code));
 const ids=new Set(),codes=new Set(),relationships=[],activities=[];
 for(const t of seed.tasks){
   requireKeys(t,["task_id","wbs_code","name","duration_days","type","predecessors"],"task");
   assert(typeof t.task_id==="string"&&/^[TM][0-9]{4,5}$/.test(t.task_id),"Invalid task ID");
   assert(!ids.has(t.task_id),"Duplicate task ID "+t.task_id);
   ids.add(t.task_id);
   assert(stages.has(t.wbs_code)&&String(Math.floor(Number(t.task_id.slice(1))/1000)*1000)===t.wbs_code&&t.wbs_code.length<=5,"Unknown task WBS");
   assert(plain(t.name),"Unsafe task name");
   assert(["Task","Milestone"].includes(t.type),"Unsupported task type");
   assert(Number.isInteger(t.duration_days)&&t.duration_days>=0&&t.duration_days<=365,"Invalid duration");
   assert((t.type==="Milestone") === (t.duration_days===0),"Zero-duration milestone semantics violated");
   assert(Array.isArray(t.predecessors)&&t.predecessors.length<=50,"Invalid predecessor collection");
   codes.add(t.task_id.slice(1));
   activities.push({id:t.task_id,name:t.name,duration:t.duration_days,
     activity_type:t.type==="Milestone"?"FINISH_MILESTONE":"TASK",wbs_code:t.wbs_code});
   for(const p of t.predecessors){
     requireKeys(p,["id","type"],"predecessor");
     assert(p.type==="FS"&&typeof p.id==="string","Only zero-lag FS supported in this seed");
     relationships.push({predecessor:p.id,successor:t.task_id,type:"FS",lag:0});
   }
 }
 assert(relationships.length===new Set(relationships.map(r=>r.predecessor+"|"+r.successor)).size,"Duplicate dependencies");
 for(const r of relationships)assert(ids.has(r.predecessor)&&ids.has(r.successor),"Missing predecessor "+r.predecessor);
 const native=scheduleNetwork({activities,relationships});
 const oracle=independentFSLongestPath(seed.tasks);
 assert(native.project.early_finish===oracle.projectFinish,"Independent CPM oracle finish mismatch");
 for(const a of native.activities){
   assert(a.es===oracle.es.get(a.id)&&a.total_float===oracle.tf.get(a.id),"Independent CPM oracle activity mismatch "+a.id);
   assert(a.ef===a.es+a.duration&&a.free_float>=0,"Invalid activity event bounds");
 }
 const sorted=native.activities.slice().sort((a,b)=>a.es-b.es||sortIds(a.id,b.id));
 const phase=dict.stages.map(s=>{
   const items=sorted.filter(a=>a.wbs_code===s.wbs_code);
   assert(items.length>0,"Empty WBS phase "+s.wbs_code);
   return {wbs_code:s.wbs_code,name:s.name,activity_count:items.length,
     early_start_slot:Math.min(...items.map(x=>x.es)),
     early_finish_exclusive_slot:Math.max(...items.map(x=>x.ef)),
     zero_float_count:items.filter(x=>x.total_float===0).length};
 });
 const scheduled=sorted.map(a=>({activity_id:a.id,wbs_code:a.wbs_code,name:a.name,
   type:a.activity_type==="FINISH_MILESTONE"?"Milestone":"Task",duration_days:a.duration,
   early_start_slot:a.es,early_finish_exclusive_slot:a.ef,late_start_slot:a.ls,late_finish_exclusive_slot:a.lf,
   total_float_days:a.total_float,free_float_days:a.free_float,critical:a.critical}));
 const missingCodes=dict.detailed.filter(code=>!codes.has(code)).sort(sortIds);
 const unlistedCodes=[...codes].filter(code=>!dict.detailed.includes(code)).sort(sortIds);
 const warnings=[];
 if(missingCodes.length)warnings.push({code:"DICTIONARY_ONLY_TASKS",values:missingCodes,reason:"Dictionary entry absent from seed; never auto-create activities"});
 if(unlistedCodes.length)warnings.push({code:"SEED_ONLY_TASKS",values:unlistedCodes,reason:"Seed task absent from dictionary"});
 warnings.push({code:"NO_PROJECT_START",reason:"Source has no calendar start date; report slots rather than invented dates"});
 warnings.push({code:"NO_WORKING_CALENDAR",reason:"Calendar and holidays are undefined; each duration unit is an abstract working-day slot"});
 warnings.push({code:"NO_RESOURCES_OR_QUANTITIES",reason:"CPM only; no resource-leveling or engineering quantities computed"});
 const milestones=scheduled.filter(a=>a.type==="Milestone");
 const plan={format:WBS_FORMAT,classification:"PUBLIC_SYNTHETIC",project_name:seed.project_metadata.project_name,
   source_version:seed.project_metadata.version,status:"NOT_ENGINEERING_APPROVED",
   engine:"PCK_NATIVE_CPM",method:"ZERO_LAG_FS_SHARED_WORKING_DAY_SLOTS",
   duration_workday_slots:native.project.early_finish,task_count:scheduled.length,
   relationship_count:relationships.length,milestone_count:milestones.length,
   critical_activity_count:scheduled.filter(x=>x.critical).length,phases:phase,milestones,
   activities:scheduled,warnings,limitations:["No fixed project start or dated finish","No site-specific resources, quantities or cost data","No architectural/structural designs","No automatic approval or upstream runtime parity"]};
 const csv=["activity_id,wbs_code,name,type,duration_days,es,ef_exclusive,ls,lf_exclusive,total_float,critical",...scheduled.map(a=>[
 a.activity_id,a.wbs_code,'"'+a.name.replaceAll('"','""')+'"',a.type,a.duration_days,a.early_start_slot,
 a.early_finish_exclusive_slot,a.late_start_slot,a.late_finish_exclusive_slot,a.total_float_days,a.critical].join(","))].join("\n")+"\n";
 const svg=renderGantt(plan);
 const html=renderPage(plan);
 const outputs={"plan.json":json(plan),"activities.csv":csv,"gantt.svg":svg,"index.html":html};
 const manifest={format:"PCK_WBS_CPM_EVIDENCE_V1",classification:"PUBLIC_SYNTHETIC",
   input_drive_folder:"1URHEOYqqJZ0xjn7ATQkip35MPuH39W6M",original_drive_files:{
     schedule_seed:"1hscYveAD5Fv5tKRknmjnCWDwusWv_HiW",wbs_dictionary:"15aWH1AD93ZkZwVlTufMkon_uhOArX8pT"},
   source_snapshot_git_blobs:{schedule_seed:seedSnapshotSha??"UNSET",wbs_dictionary:dictionarySnapshotSha??"UNSET"},
   source_sha256:{schedule_seed:sha(json(seed)),wbs_dictionary:sha(dictionaryText)},
   output_sha256:Object.fromEntries(Object.entries(outputs).map(([k,v])=>[k,sha(v)])),
   engine:"PCK_NATIVE_CPM",oracle:"INDEPENDENT_TOPOLOGICAL_LONGEST_PATH",
   validated_task_count:scheduled.length,validated_relationship_count:relationships.length,
   expected_semantics:"Zero-lag finish-to-start dependencies; zero-duration milestones; abstract working-day slots",
   calendar_dates_generated:false,external_upstream_execution:false,engineering_approved:false,
   warnings:missingCodes.length+unlistedCodes.length,publication:"SYNTHETIC_SUMMARY_ONLY_NO_SOURCE_SNAPSHOTS"};
 return {plan,manifest,files:{...outputs,"manifest.json":json(manifest)}};
}
function renderGantt(plan){
 const width=1560,label=400,plot=1100,scale=plot/plan.duration_workday_slots,rowHeight=26,top=78,height=top+plan.activities.length*rowHeight+20;
 const ticks=Array.from({length:11},(_,i)=>Math.round(plan.duration_workday_slots*i/10));
 const bars=plan.activities.map((a,i)=>{
   const y=top+i*rowHeight+5,x=label+a.early_start_slot*scale,w=Math.max(1,a.duration_days*scale);
   return '<g><text x="10" y="'+(y+11)+'" font-size="11" fill="#36506e">'+escape(a.activity_id+"  "+a.name.slice(0,50))+'</text>'+
   (a.type==="Milestone"?'<path d="M'+x+','+(y+4)+' l6,6 l-6,6 l-6,-6 Z" fill="#a56d22"/>':
   '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="15" rx="3" fill="'+(a.critical?"#eb9b27":"#5c9bc6")+'"/>')+
   '<line x1="0" x2="'+width+'" y1="'+(y+21)+'" y2="'+(y+21)+'" stroke="#e1ebf5"/></g>';
 }).join("");
 const grids=ticks.map(t=>'<line x1="'+(label+t*scale)+'" y1="58" x2="'+(label+t*scale)+'" y2="'+(height-12)+'" stroke="#dae9f3"/><text x="'+(label+t*scale)+'" y="46" text-anchor="middle" font-size="11" fill="#4b6782">'+t+'</text>').join("");
 return '<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'" viewBox="0 0 '+width+' '+height+'" role="img" aria-labelledby="title desc">'+
 '<title id="title">Synthetic 45-activity construction CPM schedule</title><desc id="desc">WBS construction lifecycle schedule in relative working-day slots, yellow critical activities and blue noncritical bars. No calendar dates.</desc>'+
 '<rect width="'+width+'" height="'+height+'" fill="#fff"/><text x="10" y="26" font-size="16" font-weight="700" fill="#254461">Machine CPM schedule · '+plan.duration_workday_slots+' working-day slots</text>'+
 '<text x="980" y="25" font-size="11" fill="#9f6f23">YELLOW: zero float</text>'+grids+bars+'</svg>\n';
}
function renderPage(p){
 const phases=p.phases.map(s=>'<tr><td>'+escape(s.wbs_code)+'</td><td>'+escape(s.name)+'</td><td>'+s.activity_count+'</td><td>'+s.early_start_slot+'</td><td>'+s.early_finish_exclusive_slot+'</td></tr>').join("");
 const milestones=p.milestones.map(x=>'<tr><td>'+escape(x.activity_id)+'</td><td>'+escape(x.name)+'</td><td>'+x.early_start_slot+'</td></tr>').join("");
 const warnings=p.warnings.map(w=>'<li><strong>'+escape(w.code)+'</strong>: '+escape(w.reason)+(w.values?' ('+escape(w.values.join(", "))+')':'')+'</li>').join("");
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WBS Machine CPM · Skyforge</title><link rel="stylesheet" href="../../assets/sky-theme.css">'+
 '<style>body{margin:0;color:#234463;font-family:system-ui,sans-serif}.wrap{max-width:1300px;margin:auto;padding:26px 22px 80px}table{border-collapse:collapse;width:100%}th,td{padding:10px;text-align:left;border-bottom:1px solid #dae5ef}th{background:#eef7ff}.panel{background:white;border:1px solid #d2e3ef;border-radius:15px;padding:20px;margin:16px 0}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.summary b{font-size:30px;display:block;color:#b97618}.gantt{overflow:auto;background:white;border:1px solid #cbdde9;border-radius:12px}.gantt img{max-width:none;width:1560px}.note{background:#fff6df;border-left:4px solid #e69d22;padding:13px;border-radius:8px}a{color:#205ea3}</style></head>'+
 '<body><div class="sky-ribbon"></div><main class="wrap"><p><a href="../">← Machine Build Centre</a> · <a href="../../index.html">Project Controls home</a></p>'+
 '<span class="storm-kicker">ACTIONS EXECUTED · NATIVE CPM · SYNTHETIC</span><h1>Standard building lifecycle · WBS schedule</h1>'+
 '<p class="note"><strong>NOT ENGINEERING APPROVED.</strong> This output derives from a Drive-labelled synthetic example. It contains <strong>relative working-day slots, not calendar dates</strong>. No crew calendars, material quantities, cost or structural design values were provided.</p>'+
 '<div class="summary"><div class="panel"><b>'+p.task_count+'</b>Activities</div><div class="panel"><b>'+p.relationship_count+'</b>FS links</div><div class="panel"><b>'+p.milestone_count+'</b>Milestones</div><div class="panel"><b>'+p.duration_workday_slots+'</b>Working-day slots</div><div class="panel"><b>'+p.critical_activity_count+'</b>Zero-float activities</div></div>'+
 '<p><a href="./plan.json">Complete schedule JSON</a> · <a href="./activities.csv">Activity CSV</a> · <a href="./gantt.svg">Gantt SVG</a> · <a href="./manifest.json">Source/output SHA-256 evidence</a></p>'+
 '<section class="panel"><h2>Calculated Gantt</h2><div class="gantt"><img src="./gantt.svg" width="1560" height="1268" alt="Gantt chart for 45 tasks over 481 relative working-day slots; gold zero-float and blue noncritical"/></div></section>'+
 '<section class="panel"><h2>WBS phase summary</h2><table><thead><tr><th>WBS</th><th>Phase</th><th>Activities</th><th>Start slot</th><th>Finish slot (exclusive)</th></tr></thead><tbody>'+phases+'</tbody></table></section>'+
 '<section class="panel"><h2>Major milestones</h2><table><thead><tr><th>Task ID</th><th>Milestone</th><th>Day slot</th></tr></thead><tbody>'+milestones+'</tbody></table></section>'+
 '<section class="panel"><h2>Source reconciliation and limitations</h2><ul>'+warnings+'</ul><p>Validation: native scheduling kernel result agreed with an independent topological longest-path oracle for every activity. Neither external P6 nor the five upstream applications were run.</p></section>'+
 '</main></body></html>\n';
}
