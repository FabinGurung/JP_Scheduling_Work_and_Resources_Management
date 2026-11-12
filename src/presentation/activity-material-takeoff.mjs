import {scopeMaterialTakeoff} from "../reference/material-planner.mjs";

const create=(tag,cls="",value)=>{
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(value!==undefined)node.textContent=String(value);
 return node;
};
const append=(parent,tag,cls="",value)=>{
 const node=create(tag,cls,value);
 parent.append(node);
 return node;
};
const format=n=>new Intl.NumberFormat("en-GB",{maximumFractionDigits:3}).format(n);
const grades={
 PUBLISHED_ITEM:"Published reference item",
 OFFICIAL_ANALOG:"Official analog — check applicability",
 GEOMETRIC_ESTIMATE:"Approximate geometry / mix estimate",
 CALIBRATION_SEED:"Provisional planning allowance",
 DESIGN_INPUT_REQUIRED:"Design or specification required"
};

/** Add a one-screen, all-linked-assemblies material takeoff to the existing
 * materials planner. It uses the validated published JSON, never private Sheets.
 */
export function renderActivityMaterialTakeoff(data,hero){
 const panel=create("section","mt-card mt-batch");
 hero.after(panel);
 append(panel,"div","mt-eyebrow","Material quantity calculator · all applicable assemblies");
 append(panel,"h2","","Activity → materials");
 append(panel,"p","mt-batch-lead","Select a work item or project activity. Paste the measured quantity for each applicable work unit; the calculator combines the corresponding material requirements below.");
 const controls=append(panel,"div","mt-batch-controls");
 const kindLabel=append(controls,"label","","Choose category");
 const kind=append(kindLabel,"select");
 for(const [value,label] of [["activity","Project activity (45 WBS items)"],["work","BOQ / WBS work code (88 items)"]]){
  const op=append(kind,"option","",label);op.value=value;
 }
 const filterLabel=append(controls,"label","","Find activity or work");
 const filter=append(filterLabel,"input");
 filter.type="search";
 filter.placeholder="Search footing, plaster, brick, T5030…";
 filter.autocomplete="off";
 const pickLabel=append(controls,"label","","Select the specific work");
 const pick=append(pickLabel,"select");
 const info=append(panel,"p","mt-small","");
 const inputs=append(panel,"div","mt-batch-inputs");
 const adjust=append(panel,"div","mt-batch-adjust");
 const wasteLabel=append(adjust,"label","","Additional scenario wastage (%)");
 const waste=append(wasteLabel,"input");
 waste.type="number";waste.min="0";waste.max="30";waste.step=".5";waste.value="0";
 const explain=append(adjust,"p","mt-small","0% by default. The entered percentage applies to measured assemblies only. Rounding occurs after combined quantities are calculated.");
 const answer=append(panel,"div","mt-batch-answer");
 answer.setAttribute("aria-live","polite");
 const count=append(answer,"p","mt-source-note","Choose a work quantity to calculate.");
 const cards=append(answer,"div","mt-material-grid");
 const pending=append(answer,"div","mt-batch-pending");
 const detail=append(answer,"div","mt-scroll");
 const copy=append(panel,"button","mt-copy-materials","Copy calculated materials");
 copy.type="button";copy.disabled=true;
 const caveat=append(panel,"p","mt-warning","Reference estimation only — NOT an approved project BOQ, bill of materials or purchase order. Steel requires a bar-bending schedule; formwork requires measured contact area; approved concrete mix designs and specification-specific inputs override generic coefficients.");
 const qs=new URLSearchParams(typeof location==="undefined"?"":location.search);
 let chosen=qs.has("work")?"work":"activity";
 let id=chosen==="work"?(qs.get("work")||""):(qs.get("activity")||"T5030");
 let inputMap=new Map();
 let clipboardText="";
 function scopes(){
  return kind.value==="activity" ? data.project_activities.map(r=>({
   id:r.activity_id,title:r.activity_title,recipes:r.recipe_ids
  })) : data.work_items.map(r=>({id:r.key,title:r.title,recipes:r.recipe_ids}));
 }
 function refreshList(){
  const all=scopes(),term=filter.value.trim().toLowerCase();
  const found=all.filter(x=>(x.id+" "+x.title).toLowerCase().includes(term));
  pick.replaceChildren();
  for(const row of found){
   const op=append(pick,"option","",row.id+" · "+row.title);
   op.value=row.id;
  }
  if(found.some(row=>row.id===id))pick.value=id;
  else id=found[0]?.id||"";
  pick.disabled=found.length===0;
  refreshItems();
 }
 function refreshItems(){
  id=pick.value||"";
  const row=scopes().find(x=>x.id===id);
  inputs.replaceChildren();inputMap=new Map();
  if(!row){
   info.textContent="No work or activity matches the current selection.";
   showResult();
   return;
  }
  const recipes=row.recipes.map(key=>data.recipes.find(recipe=>recipe.id===key)).filter(Boolean);
  info.textContent=row.id+" · "+recipes.length+" associated assembly/assemblies. Each input must use its displayed unit; quantities are not copied across different work units.";
  if(!recipes.length){
   append(inputs,"p","mt-warning","No material assembly is mapped to this item. It may be a milestone, parent activity or administrative task. No quantity is inferred.");
  }
  for(const rec of recipes){
   const field=append(inputs,"div","mt-assembly-field");
   const title=append(field,"label","mt-assembly-label",rec.title);
   const line=append(title,"span","mt-assembly-input");
   const number=append(line,"input");
   number.type="number";number.inputMode="decimal";number.min="0.000001";number.max="10000000";number.step="any";
   number.placeholder="Enter measured quantity";
   number.setAttribute("aria-label",rec.title+" measured in "+rec.work_unit);
   append(line,"span","mt-assembly-unit",rec.work_unit);
   append(field,"small","",grades[rec.grade]||rec.grade);
   inputMap.set(rec.id,number);
   number.addEventListener("input",showResult);
  }
  showResult();
 }
 function showResult(){
  cards.replaceChildren();pending.replaceChildren();detail.replaceChildren();
  clipboardText="";copy.disabled=true;
  if(!id){
   count.textContent="Select an activity or work item first.";
   return;
  }
  const measurements={};
  for(const [key,number] of inputMap){
   if(number.value.trim()==="")continue;
   const n=Number(number.value);
   measurements[key]=n;
  }
  const w=Number(waste.value);
  if(waste.value.trim()===""||!Number.isFinite(w)||w<0||w>30){
   count.textContent="Wastage must be between 0% and 30%.";
   return;
  }
  let output;
  try{
   output=scopeMaterialTakeoff(data,kind.value,id,measurements,{wastePct:w});
  }catch(err){
   count.textContent=err.message;
   return;
  }
  count.textContent=output.measured_assemblies+" of "+output.assembly_count+
   " assembly quantities entered · "+output.material_lines.length+
   " material quantities calculated.";
  for(const mat of output.material_lines){
   const card=append(cards,"article","mt-material-card");
   append(card,"strong","",mat.name);
   append(card,"div","mt-material-value",format(mat.quantity)+" "+mat.unit);
   if(mat.order_quantity!==mat.quantity)
    append(card,"small","","Whole-unit order rounding: "+format(mat.order_quantity)+" "+mat.unit);
  }
  if(output.pending.length)
   append(pending,"p","mt-warning","Still awaiting measured quantities: "+
    output.pending.map(r=>r.title+" ("+r.unit+")").join("; ")+". These are excluded from the calculated totals.");
  if(output.unresolved.length)
   append(pending,"p","mt-warning","Design/product inputs still required: "+
    output.unresolved.map(r=>r.name+" ["+r.recipe_title+"]").join("; ")+
    ". They are NOT treated as zero.");
  if(!output.assembly_count)
   append(pending,"p","mt-small","This work has no mapped material assemblies. No material quantity can be calculated from the current reference catalog.");
  if(!output.material_lines.length){
   append(pending,"p","mt-small","Enter at least one measurable assembly quantity above to calculate the corresponding materials.");
   return;
  }
  const table=append(detail,"table","mt-table");
  const header=append(append(table,"thead"),"tr");
  for(const head of ["Material","Net + wastage","Whole-unit order","Unit","Assembly source"])append(header,"th","",head);
  const body=append(table,"tbody");
  const lines=["Skyforge reference takeoff: "+output.scope_id+" — "+output.scope_title,
   "Scenario wastage: "+w+"%","NOT AN APPROVED BOQ"];
  for(const mat of output.material_lines){
   const tr=append(body,"tr");
   for(const val of [mat.name,format(mat.quantity),
    format(mat.order_quantity),mat.unit,mat.source_recipes.join(", ")])
    append(tr,"td","",val);
   lines.push(mat.name+": "+format(mat.quantity)+" "+mat.unit+
    (mat.order_quantity!==mat.quantity?" (rounded "+format(mat.order_quantity)+" "+mat.unit+")":""));
  }
  if(output.pending.length)lines.push("Unmeasured: "+output.pending.map(x=>x.title).join("; "));
  if(output.unresolved.length)lines.push("Unresolved: "+output.unresolved.map(x=>x.name).join("; "));
  clipboardText=lines.join("\n");
  copy.disabled=false;
 }
 kind.addEventListener("change",()=>{id="";filter.value="";refreshList()});
 filter.addEventListener("input",refreshList);
 pick.addEventListener("change",refreshItems);
 waste.addEventListener("input",showResult);
 copy.addEventListener("click",async()=>{
  if(!clipboardText)return;
  try{
   if(!navigator.clipboard?.writeText)throw Error("Clipboard not supported");
   await navigator.clipboard.writeText(clipboardText);
   copy.textContent="Copied materials and caveats";
  }catch{
   copy.textContent="Copy unavailable — use the table above";
  }
 });
 kind.value=chosen;
 refreshList();
 return panel;
}
