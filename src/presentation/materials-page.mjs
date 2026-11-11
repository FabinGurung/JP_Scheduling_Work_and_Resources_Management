import {validateMaterialCatalog,materialTakeoff,projectMaterialScopes} from "../reference/material-planner.mjs";
const root=new URL("../../",import.meta.url);
const source={
 materials:new URL("../../work-items/material-references.v1.json",import.meta.url),
 boq:new URL("../../work-items/productivity-norms.v1.json",import.meta.url),
 seed:new URL("../../machine/source-snapshots/wbs_schedule_sample/schedule_seed.json",import.meta.url)
};
const el=(name,cls="",t)=>{const x=document.createElement(name);if(cls)x.className=cls;if(t!==undefined)x.textContent=String(t);return x;};
const add=(to,name,cls,t)=>{const n=el(name,cls,t);to.append(n);return n;};
const fmt=n=>Number.isFinite(n)?new Intl.NumberFormat("en-GB",{maximumFractionDigits:3}).format(n):"—";
const grades={PUBLISHED_ITEM:"Official published item",GEOMETRIC_ESTIMATE:"Geometric estimating method",CALIBRATION_SEED:"Provisional purchase allowance",DESIGN_INPUT_REQUIRED:"Drawing / specification required"};
const qs=new URLSearchParams(typeof location==="undefined"?"":location.search);
export function renderMaterialPlanner(data,boq,seed,container){
 validateMaterialCatalog(data,boq,seed);
 container.replaceChildren();
 const hero=add(container,"header","mt-card mt-hero");
 const back=add(hero,"a","mt-back","← Work reference centre");back.href="../work-items/";
 add(hero,"div","mt-eyebrow","Skyforge · Reference · Materials");
 add(hero,"h1","","Materials planner");
 add(hero,"p","","The materials counterpart to the Work Output Planner. Choose a source work item or project activity, enter its measured quantity, and inspect cement, sand, aggregate, reinforcement, formwork and other materials.");
 add(hero,"p","mt-warning","This library is NOT a verified project material BOQ or purchase order. A number per unit is a reference, not a project total. Actual structural quantities, mix design, and equipment method require approved drawings, calculations and responsible engineer review.");
 const quick=add(hero,"div","mt-links");
 const rate=add(quick,"a","","Open Work Output Planner →");rate.href="./productivity.html";
 const desk=add(quick,"a","","Open Narayani Gantt →");desk.href="../projects/narayani/desk.html#activities";
 const panel=add(container,"section","mt-card mt-planner");
 add(panel,"h2","","1 · Choose the work");
 const pick=add(panel,"div","mt-picker");
 const kindLabel=add(pick,"label","","Source category");
 const mode=add(kindLabel,"select");
 for(const [value,title] of [["project","Narayani activity"],["work","BOQ / WBS work code"],["assembly","Material assembly"]]){
  const opt=add(mode,"option","",title);opt.value=value;
 }
 const sourceLabel=add(pick,"label","","Work ID / activity");
 const items=add(sourceLabel,"select");
 const assemblyLabel=add(pick,"label","","Material assembly");
 const assembly=add(assemblyLabel,"select");
 const status=add(panel,"p","mt-source-note","");
 const form=add(panel,"div","mt-quantity-fields");
 const quantityLabel=add(form,"label","","Work quantity (measured)");
 const quantity=add(quantityLabel,"input");quantity.type="number";quantity.step="0.1";quantity.min="0";quantity.max="1000000";quantity.value="1";
 const unitLabel=add(form,"label","","Measurement unit");
 const unit=add(unitLabel,"output","mt-unit","m³");
 const lossLabel=add(form,"label","","Extra waste allowance (%)");
 const loss=add(lossLabel,"input");loss.type="number";loss.min="0";loss.max="30";loss.step=".5";loss.value="0";
 const calcCard=add(container,"section","mt-card mt-results");
 add(calcCard,"h2","","2 · Material quantities");
 const note=add(calcCard,"p","mt-warning","");
 const results=add(calcCard,"div","mt-scroll");
 const basis=add(calcCard,"p","mt-small","");
 const details=add(container,"section","mt-card mt-details");
 add(details,"h2","","3 · Material and source policy");
 const crew=add(details,"div","mt-assumptions");
 add(crew,"strong","","Standard reference house resource policy");
 add(crew,"p","","2 skilled + 3 unskilled helpers; 8 planned working hours per day; Saturday off. The mixer is a draft 2-hour/day equipment reservation and the vibrator/other small machine a draft 3-hour/day reservation (only if used). No machine is assumed to run continuously for eight hours. Material quantities below do NOT imply equipment assignments or activity durations.");
 add(details,"h3","","Public reference sources");
 for(const source of data.sources){
  const article=add(details,"div","mt-source-row");
  add(article,"strong","",source.title);
  const a=add(article,"a","","View publication ↗");a.href=source.url;a.target="_blank";a.rel="noopener noreferrer";
  add(article,"small","",source.reference+" · "+source.provenance);
 }
 add(details,"p","mt-small","Original project-specific approved quantities have NOT been loaded. BOQ measurement, bar-bending schedules, material grade, concrete mix verification and procurement approval remain separate governed work.");
 let selection={mode:"project",key:qs.get("activity")||"T5030",recipe:qs.get("recipe")||"concrete_M20"};
 function sourceRows(){
  if(mode.value==="project")return data.project_activities.map(x=>({id:x.activity_id,name:x.activity_title,recipes:x.recipe_ids}));
  if(mode.value==="work")return data.work_items.map(x=>({id:x.key,name:x.title,recipes:x.recipe_ids}));
  return data.recipes.map(x=>({id:x.id,name:x.title,recipes:[x.id]}));
 }
 function fillOptions(node,list,value){
  node.replaceChildren();
  for(const item of list){
   const o=add(node,"option","",item.name);o.value=item.id;
  }
  if(list.some(x=>x.id===value))node.value=value;
  else if(list.length)node.value=list[0].id;
 }
 function chooseMode(next=mode.value){
  mode.value=next;
  const rows=sourceRows();
  fillOptions(items,rows,selection.key);
  selection.key=items.value;
  chooseItem();
 }
 function chooseItem(){
  selection.key=items.value;
  const row=sourceRows().find(x=>x.id===selection.key);
  const options=row?.recipes.map(x=>data.recipes.find(r=>r.id===x)).filter(Boolean)||[];
  const opts=options.length?options.map(x=>({id:x.id,name:x.title})):[{id:"",name:"No measurable material assembly"}];
  fillOptions(assembly,opts,selection.recipe);
  selection.recipe=assembly.value;
  status.textContent= mode.value==="project"?
   "PUBLIC-SAFE PROJECT WBS ONLY. Work "+selection.key+" has NO project-measured quantity. Choose each applicable assembly separately.":
   "REFERENCE WORK ITEM ONLY. The project BOQ measured quantity has not been provided.";
  update();
 }
 function update(){
  const rec=data.recipes.find(r=>r.id===assembly.value);
  results.replaceChildren();
  if(!rec){
   unit.textContent="—";
   note.textContent="No per-unit materials calculated. This work is a milestone, administrative task or parent/aggregate item; a separate material takeoff would double-count the actual child work.";
   basis.textContent="Please select a measurable item with a linked assembly.";
   return;
  }
  selection.recipe=rec.id;unit.textContent=rec.work_unit;
  const measured=Number(quantity.value),waste=Number(loss.value);
  if(quantity.value===""||!Number.isFinite(measured)||measured<=0||measured>1e6||
   loss.value===""||!Number.isFinite(waste)||waste<0||waste>30){
   note.textContent="Enter a positive measured work quantity and 0–30% optional loss. Project quantities are not prefilled.";
   basis.textContent="No material totals were inferred.";
   return;
  }
  const take=materialTakeoff(data,rec.id,measured,{wastePct:waste});
  note.textContent=rec.title+" · "+grades[rec.grade]+". "+rec.description+" "+rec.note;
  const table=add(results,"table","mt-table");
  const thead=add(table,"thead"),tr=add(thead,"tr");
  for(const h of ["Material","Calculated quantity","Order rounding","Unit","Basis"])add(tr,"th","",h);
  const body=add(table,"tbody");
  for(const line of take.material_lines){
   const tr=add(body,"tr");
   for(const v of [line.name,line.quantity===null?"Requires input":fmt(line.quantity),
    line.order_quantity===null?"—":fmt(line.order_quantity),line.unit,line.basis])add(tr,"td","",v);
  }
  basis.textContent= "Calculation: "+fmt(measured)+" "+rec.work_unit+" × quantity per unit × "+fmt(1+waste/100)+
   " (loss factor). No foundation concrete volume, bar steel kg, footing shutter area, water demand or design-approved price is inferred.";
 }
 mode.addEventListener("change",()=>{selection.key="";selection.recipe="";chooseMode(mode.value)});
 items.addEventListener("change",chooseItem);
 assembly.addEventListener("change",update);
 quantity.addEventListener("input",update);
 loss.addEventListener("input",update);
 if(qs.has("work")){selection.mode="work";selection.key=qs.get("work")||"BOQ:6"}
 if(qs.has("recipe")&&!qs.has("work")&&!qs.has("activity")){selection.mode="assembly";selection.key=qs.get("recipe")}
 chooseMode(selection.mode);
}
export async function bootMaterialPlanner(doc=document){
 const mount=doc.getElementById("materials-planner");if(!mount)return false;
 try{
  const [a,b,c]=await Promise.all(Object.values(source).map(url=>fetch(url,{cache:"no-store"})));
  if(!a.ok||!b.ok||!c.ok)throw Error("Published source reference unavailable");
  renderMaterialPlanner(await a.json(),await b.json(),await c.json(),mount);
  return true;
 }catch(err){mount.replaceChildren();add(mount,"p","mt-warning","MATERIAL REFERENCE HELD: "+err.message);return false}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootMaterialPlanner(),{once:true});
 else bootMaterialPlanner();
}
