/** Procurement starter registry: separate from project source of truth.
 * Numeric line multipliers are per measured unit, never project actuals.
 * Null multipliers explicitly await drawing, brand or BOQ evidence.
 */
export function validateMaterialCatalog(cat,boq,seed){
 if(cat?.format!=="SKYFORGE_WORK_MATERIAL_REFERENCE_V1"||
 cat.authority!=="READ_ONLY_REFERENCE_NOT_PROJECT_BOQ"||
 cat.no_actual_or_approved_project_quantities!==true||
 cat.owner_policy?.working_weekdays?.join(",")!=="0,1,2,3,4,5"||
 cat.owner_policy.hours_per_day!==8||cat.owner_policy.skilled_workers!==2||
 cat.owner_policy.unskilled_helpers!==3||cat.materials?.length!==27||
 cat.recipes?.length!==26||cat.work_items?.length!==88||
 cat.project_activities?.length!==45||!Array.isArray(cat.sources)||
 cat.sources.length!==3||boq?.items?.length!==88||
 seed?.tasks?.length!==45)throw Error("Unreviewed material reference catalog");
 const materialIds=new Set(cat.materials.map(x=>x.id)),recipes=new Set(cat.recipes.map(x=>x.id));
 if(materialIds.size!==27||recipes.size!==26||new Set(cat.work_items.map(x=>x.key)).size!==88||
 new Set(cat.project_activities.map(x=>x.activity_id)).size!==45)throw Error("Material ID or count mismatch");
 for(let i=0;i<88;i++){
  const item=cat.work_items[i];
  if(item.key!==boq.items[i].key||item.measured_quantity!==null||
   item.no_approved_material_takeoff!==true||
   item.recipe_ids.some(id=>!recipes.has(id)))throw Error("Material BOQ source identity mismatch");
 }
 for(let i=0;i<45;i++){
  const p=cat.project_activities[i];
  if(p.activity_id!==seed.tasks[i].task_id||p.activity_title!==seed.tasks[i].name||
   p.materials_release!==false||p.actual_quantities!==null||
   p.recipe_ids.some(id=>!recipes.has(id)))throw Error("Project material scope does not match source WBS");
 }
 const provenance=new Set(cat.sources.map(x=>x.id));
 for(const rec of cat.recipes){
  if(!["m³","m²","m","kg","each","set"].includes(rec.work_unit)||!rec.lines?.length||
   !provenance.has(rec.source_id)||rec.no_approved_quantity!==true||rec.no_design_approval!==true)
   throw Error("Invalid material recipe "+rec.id);
  for(const ln of rec.lines){
   if(!materialIds.has(ln.material_id)||!["bag","m³","m²","L","kg","no.","set"].includes(ln.unit)||
    ln.quantity_per_unit!==null&&(!Number.isFinite(ln.quantity_per_unit)||ln.quantity_per_unit<0))
    throw Error("Unreviewed material unit multiplier "+rec.id);
  }
 }
 return true;
}
export function materialTakeoff(catalog,recipeId,quantity,{wastePct=0}={}){
 const rec=catalog.recipes.find(x=>x.id===recipeId);
 if(!rec)throw Error("Unknown material assembly");
 if(typeof quantity!=="number"||!Number.isFinite(quantity)||quantity<0||quantity>1e7||
 typeof wastePct!=="number"||!Number.isFinite(wastePct)||wastePct<0||wastePct>30)
  throw Error("Invalid measured quantity or waste percentage");
 const out=rec.lines.map(ln=>{
  const mat=catalog.materials.find(x=>x.id===ln.material_id);
  const n=ln.quantity_per_unit===null?null:ln.quantity_per_unit*quantity*(1+wastePct/100);
  return {name:mat.name,id:mat.id,unit:ln.unit,
   quantity:n,order_quantity:ln.unit==="bag"||ln.unit==="no."||ln.unit==="set"?n===null?null:Math.ceil(n):n,
   status:ln.quantity_per_unit===null?"NEEDS_BBS_DRAWING_PRODUCT_SPEC":"ILLUSTRATIVE",
   basis:ln.basis,source_id:ln.source_id||rec.source_id};
 });
 return {recipe_id:rec.id,unit:rec.work_unit,work_quantity:quantity,
  grade:rec.grade,reference_only:true,material_lines:out,
  specified_work_quantity_needed:quantity===0,notes:rec.note};
}
export function projectMaterialScopes(catalog,activityId){
 const row=catalog.project_activities.find(x=>x.activity_id===activityId);
 if(!row)throw Error("Unknown public WBS activity");
 return {activity:row,recipes:row.recipe_ids.map(x=>catalog.recipes.find(r=>r.id===x)),
  has_verified_quantities:false,release_authorized:false};
}
