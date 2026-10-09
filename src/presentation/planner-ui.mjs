import {examplePlanner,normalizePlanner,calculatePlanner,dateAt} from "./planner.mjs";

const STORAGE="PCK_BROWSER_PLANNER_V1_DRAFT";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const option=(value,label,current)=>'<option value="'+esc(value)+'"'+(String(value)===String(current)?" selected":"")+'>'+esc(label)+'</option>';
const entry=(group,index,key,value,{type="text",cls="",placeholder="",min="",step=""}={})=>'<input data-group="'+group+'" data-index="'+index+'" data-key="'+key+'" type="'+type+'" class="'+cls+'" value="'+esc(value??"")+'" placeholder="'+esc(placeholder)+'"'+(min!==""?' min="'+min+'"':"")+(step!==""?' step="'+step+'"':"")+' aria-label="'+esc(key)+'">';
const choose=(group,index,key,current,options)=>'<select data-group="'+group+'" data-index="'+index+'" data-key="'+key+'" aria-label="'+esc(key)+'">'+options.map(o=>option(o.value,o.label,current)).join("")+'</select>';
const action=(group,index)=>'<button type="button" class="remove" data-remove="'+group+'" data-index="'+index+'" aria-label="Remove '+esc(group)+' row '+(index+1)+'">×</button>';
let model=examplePlanner(),last=null;

function status(message,kind=""){const el=$("status");el.textContent=message;el.className=kind;}
function dirty(){
  last=null;
  ["k-finish","k-delays","k-work"].forEach(id=>$(id).textContent="—");
  $("k-activities").textContent=String(model.activities.length);
  $("gantt").innerHTML='<div class="empty">Changes pending. Press Schedule to refresh the Gantt.</div>';
  $("dates-body").innerHTML='<tr><td colspan="5">Changes pending. Press Schedule.</td></tr>';
  $("utilization").innerHTML='<div class="empty">Changes pending.</div>';
  $("diagnostics").innerHTML='<div class="empty">Schedule has changed. Recalculate to review diagnostics.</div>';
  $("diagnostic-count").textContent="Pending";
  status("Changes are not yet scheduled. Press Schedule (F9). Export or save the draft to preserve the inputs.");
}
function renderSettings(){
  $("project-name").value=model.project.name??"";
  $("project-start").value=model.project.start??"";
  $("horizon-end").value=model.project.horizon_end??"";
  $("weekdays").value=(model.calendar?.working_weekdays??[]).join(",");
}
function renderTables(){
  const activityOpts=model.activities.map(a=>({value:a.id,label:a.id+" · "+(a.name||"unnamed")}));
  const resourceOpts=model.resources.map(r=>({value:r.id,label:r.id+" · "+(r.name||"unnamed")}));
  $("activities-body").innerHTML=model.activities.map((a,i)=>'<tr><td>'+entry("activities",i,"id",a.id,{cls:"narrow"})+'</td><td>'+entry("activities",i,"name",a.name,{cls:"wide"})+'</td><td>'+entry("activities",i,"duration",a.duration,{type:"number",min:"0",step:"1",cls:"narrow"})+'</td><td>'+entry("activities",i,"notBefore",a.notBefore??"",{type:"date"})+'</td><td>'+action("activities",i)+'</td></tr>').join("");
  $("resources-body").innerHTML=model.resources.map((r,i)=>{
    const material=r.resource_type==="MATERIAL",key=material?"inventory_quantity":"max_units";
    return '<tr><td>'+entry("resources",i,"id",r.id,{cls:"narrow"})+'</td><td>'+entry("resources",i,"name",r.name,{cls:"wide"})+'</td><td>'+choose("resources",i,"resource_type",r.resource_type,["LABOR","EQUIPMENT","MATERIAL"].map(v=>({value:v,label:v})))+'</td><td>'+entry("resources",i,key,r[key],{type:"number",min:"0",step:"any",cls:"narrow"})+'</td><td>'+action("resources",i)+'</td></tr>';
  }).join("");
  $("assignments-body").innerHTML=model.assignments.map((a,i)=>{
    const mat=model.resources.find(r=>r.id===a.resource_id)?.resource_type==="MATERIAL",key=mat?"quantity":"units";
    return '<tr><td>'+choose("assignments",i,"activity_id",a.activity_id,activityOpts)+'</td><td>'+choose("assignments",i,"resource_id",a.resource_id,resourceOpts)+'</td><td>'+entry("assignments",i,key,a[key],{type:"number",min:"0",step:"any",cls:"narrow"})+'</td><td>'+action("assignments",i)+'</td></tr>';
  }).join("");
  $("relationships-body").innerHTML=model.relationships.map((r,i)=>'<tr><td>'+choose("relationships",i,"predecessor",r.predecessor,activityOpts)+'</td><td>'+choose("relationships",i,"type",r.type,["FS","SS","FF","SF"].map(v=>({value:v,label:v})))+'</td><td>'+choose("relationships",i,"successor",r.successor,activityOpts)+'</td><td>'+entry("relationships",i,"lag",r.lag,{type:"number",step:"1",cls:"narrow"})+'</td><td>'+action("relationships",i)+'</td></tr>').join("");
}
function renderAll(){renderSettings();renderTables();$("k-activities").textContent=String(model.activities.length);}
function add(group){
  if(group==="activities"){
    const used=new Set(model.activities.map(a=>a.id));let n=10;while(used.has("A"+String(n).padStart(3,"0")))n+=10;
    model.activities.push({id:"A"+String(n).padStart(3,"0"),name:"New activity",duration:1});
  }else if(group==="resources"){
    const used=new Set(model.resources.map(r=>r.id));let n=1;while(used.has("RES-"+n))n++;
    model.resources.push({id:"RES-"+n,name:"New crew",resource_type:"LABOR",max_units:1,calendar_id:"CAL"});
  }else if(group==="assignments"){
    if(!model.activities.length||!model.resources.length){status("Create at least one activity and resource first.","error");return;}
    const r=model.resources[0];model.assignments.push({activity_id:model.activities[0].id,resource_id:r.id,...(r.resource_type==="MATERIAL"?{quantity:1}:{units:1})});
  }else if(group==="relationships"){
    if(model.activities.length<2){status("Create two activities before adding a relationship.","error");return;}
    model.relationships.push({predecessor:model.activities[0].id,successor:model.activities[1].id,type:"FS",lag:0});
  }
  renderTables();dirty();
}
function handleChange(event){
  const input=event.target,group=input.dataset.group,key=input.dataset.key;
  if(!group||!key)return;
  const row=model[group]?.[Number(input.dataset.index)];if(!row)return;
  if(key==="resource_type"){
    row.resource_type=input.value;
    if(row.resource_type==="MATERIAL"){delete row.max_units;delete row.calendar_id;row.inventory_quantity=0;}
    else{delete row.inventory_quantity;row.max_units=1;row.calendar_id="CAL";}
    model.assignments=model.assignments.map(a=>a.resource_id!==row.id?a:row.resource_type==="MATERIAL"?
      {activity_id:a.activity_id,resource_id:a.resource_id,quantity:1}:{activity_id:a.activity_id,resource_id:a.resource_id,units:1});
    renderTables();
  }else if(group==="assignments"&&key==="resource_id"){
    row.resource_id=input.value;
    const r=model.resources.find(r=>r.id===row.resource_id);delete row.quantity;delete row.units;
    if(r?.resource_type==="MATERIAL")row.quantity=1;else row.units=1;
    renderTables();
  }else{row[key]=input.value;if(group==="resources"&&key==="id")renderTables();}
  dirty();
}
function timeline(result){
  const days=Math.max(21,result.lastFinish+2),width=days*28;
  const axis='<div class="gantt-axis"><div class="task-name">Activity / ID</div><div class="task-track" style="min-width:'+width+'px">'+Array.from({length:Math.ceil(days/7)},(_,n)=>'<span class="tick" style="left:'+(n*7*28)+'px">'+esc(dateAt(result.model.project.start,n*7))+'</span>').join("")+'</div></div>';
  const rows=result.tasks.map(a=>{
    const work=a.work_slots.map(slot=>'<span class="bar'+(a.leveling_delayed?" delayed":"")+'" style="left:'+(slot*28)+'px;width:27px" title="'+esc(dateAt(result.model.project.start,slot))+' · allocated"></span>').join("");
    const bg='<span class="unworked" style="left:'+(a.start*28)+'px;width:'+Math.max(2,(a.finish-a.start)*28)+'px"></span>';
    return '<div class="task-row"><div class="task-name" title="'+esc(a.name)+'"><b>'+esc(a.activity_id)+'</b> '+esc(a.name)+'</div><div class="task-track" style="min-width:'+width+'px">'+bg+work+'</div></div>';
  }).join("");
  $("gantt").innerHTML='<div class="gantt-area">'+axis+rows+'</div>';
  $("gantt-note").textContent="Blue = allocated work · amber = delayed · striped gaps reflect non-working or unavailable days";
}
function showDates(result){
  $("dates-body").innerHTML=result.tasks.map(a=>'<tr><td><b>'+esc(a.activity_id)+'</b> · '+esc(a.name)+'</td><td>'+esc(a.start_date)+'</td><td>'+esc(a.finish_date)+'</td><td>'+esc(a.finish_event_date)+'</td><td>'+(a.leveling_delayed?'<span style="color:#ffc06b">+'+a.leveling_delay_days+' civil days</span>':"0")+'</td></tr>').join("");
}
function showDiagnostics(result){
  const ds=result.schedule.diagnostics;
  $("diagnostic-count").textContent=ds.length+" delayed activities";
  $("diagnostics").innerHTML=ds.length?ds.map(d=>{
    const reasons=[...new Set(d.conflicts.map(c=>c.resource_id+" ("+c.reason.replaceAll("_"," ").toLowerCase()+")"))];
    const short=reasons.length?reasons.join("; "):"precedence and resource-calendar placement";
    return '<div class="diagnostic delayed"><strong>'+esc(d.activity_id)+' · +'+d.delay_civil_days+' civil days</strong><span>Reference start slot '+d.network_reference_start+' → leveled slot '+d.leveled_start+'</span><span>'+esc(short)+'</span></div>';
  }).join(""):'<div class="empty">No activity start was delayed relative to its isolated network/reference placement. This is not proof of globally optimal scheduling.</div>';
}
function showUtilization(result){
  const types=new Map(result.model.resources.filter(r=>r.resource_type!=="MATERIAL").map(r=>[r.id,r]));
  const groups=new Map([...types.keys()].map(id=>[id,[]]));
  for(const row of result.workloads)groups.get(row.resource_id)?.push(row);
  $("utilization").innerHTML=[...groups].map(([id,rows])=>{
    const r=types.get(id),peak=rows.reduce((v,a)=>Math.max(v,a.units),0);
    const pct=r.max_units>0?Math.min(100,100*peak/r.max_units):0;
    return '<div class="util"><div class="util-label">'+esc(id)+'</div><div class="util-meter" title="'+peak+' / '+r.max_units+' capacity"><div class="util-fill" style="width:'+pct+'%"></div></div><div class="util-info">'+peak+'/'+r.max_units+' peak · '+rows.length+' days</div></div>';
  }).join("")||'<div class="empty">No renewable resources allocated.</div>';
}
function schedule(){
  try{
    const result=calculatePlanner(model);
    last=result;
    $("k-activities").textContent=String(result.tasks.length);
    $("k-finish").textContent=dateAt(result.model.project.start,result.lastFinish);
    $("k-delays").textContent=String(result.delayed);
    $("k-work").textContent=String(result.tasks.reduce((n,a)=>n+a.work_slots.length,0));
    timeline(result);showDates(result);showDiagnostics(result);showUtilization(result);
    status("Schedule calculated with the v0.4.2 engine. "+result.tasks.length+" activities, "+result.delayed+" resource-leveling delays. No external file was changed.","good");
  }catch(e){
    last=null;
    $("gantt").innerHTML='<div class="empty">No schedule produced. Fix the input error above, then recalculate.</div>';
    $("dates-body").innerHTML='<tr><td colspan="5">No valid schedule.</td></tr>';
    $("utilization").innerHTML='<div class="empty">No valid allocation.</div>';
    $("diagnostics").innerHTML='<div class="empty">Validation failed; the kernel did not produce a partial schedule.</div>';
    $("diagnostic-count").textContent="Validation failed";
    $("k-finish").textContent="—";$("k-delays").textContent="—";$("k-work").textContent="—";
    status("Schedule rejected: "+(e?.message??String(e)),"error");
  }
}
function exportData(){
  try{
    normalizePlanner(model);
    const blob=new Blob([JSON.stringify(model,null,2)+"\n"],{type:"application/json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download="pck-planner-"+new Date().toISOString().slice(0,10)+".json";document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    status("Planner JSON exported. Keep this file as your portable copy.","good");
  }catch(e){status("Export rejected: "+e.message,"error");}
}
async function importData(file){
  if(!file)return;
  if(file.size>2000000){status("Import exceeds 2 MB size limit.","error");return;}
  try{
    const loaded=JSON.parse(await file.text());
    normalizePlanner(loaded);model=loaded;renderAll();dirty();schedule();
    status("Imported JSON successfully and recalculated. Data is held in this browser until you export or save a local draft.","good");
  }catch(e){status("Import rejected: "+e.message+". Existing workspace preserved.","error");}
}
document.addEventListener("click",e=>{
  const addButton=e.target.closest("[data-add]"),remove=e.target.closest("[data-remove]");
  if(addButton){add(addButton.dataset.add);return;}
  if(remove){const group=remove.dataset.remove,i=Number(remove.dataset.index);model[group].splice(i,1);renderTables();dirty();}
});
document.addEventListener("change",e=>{if(e.target.dataset.group)handleChange(e);});
for(const [id,target,key] of [["project-name","project","name"],["project-start","project","start"],["horizon-end","project","horizon_end"]]){
  $(id).addEventListener("change",e=>{model[target][key]=e.target.value;dirty();});
}
$("weekdays").addEventListener("change",e=>{
  const arr=e.target.value.split(",").map(s=>Number(s.trim()));
  model.calendar.working_weekdays=arr;dirty();
});
$("schedule").addEventListener("click",schedule);
$("export").addEventListener("click",exportData);
$("import").addEventListener("click",()=>$("file").click());
$("file").addEventListener("change",async e=>{await importData(e.target.files?.[0]);e.target.value="";});
$("save").addEventListener("click",()=>{
  try{normalizePlanner(model);localStorage.setItem(STORAGE,JSON.stringify(model));status("Draft saved only in this browser (localStorage). Export JSON for durable sharing.","good");}
  catch(e){status("Local draft not saved: "+e.message,"error");}
});
$("reset").addEventListener("click",()=>{
  if(!window.confirm("Replace current unsaved edits with the synthetic demo? Export first if needed."))return;
  model=examplePlanner();renderAll();dirty();schedule();
});
document.addEventListener("keydown",e=>{if(e.key==="F9"||((e.ctrlKey||e.metaKey)&&e.key==="Enter")){e.preventDefault();schedule();}});
try{const raw=localStorage.getItem(STORAGE);if(raw){const saved=JSON.parse(raw);normalizePlanner(saved);model=saved;}}catch{model=examplePlanner();}
renderAll();schedule();
