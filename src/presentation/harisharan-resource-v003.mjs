/* Read-only measured resource gate for Harisharan. No phantom Gantt bars. */
const ROOT="../../../";
const mount=document.getElementById("har-v003");
const el=(tag,cls="",txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=String(txt);return e};
const add=(parent,tag,cls="",txt)=>{const e=el(tag,cls,txt);parent.append(e);return e};
const href=(parent,label,url)=>{const a=add(parent,"a","",label);a.href=url;return a;};
const fmt=n=>Number.isFinite(n)?Number(n.toFixed(3)).toLocaleString("en-US",{maximumFractionDigits:3}):"Pending";
const label=p=>p?.replaceAll("_"," ").toLowerCase()||"—";
async function boot(){
 try{
  const r=await fetch(new URL("../../../projects/fishtail/harisharan-residence/boq-v003.json",import.meta.url),{cache:"no-store"});
  if(!r.ok)throw Error("Measured BOQ planning reference unavailable: HTTP "+r.status);
  const d=await r.json();
  if(d.format!=="HARISHARAN_MEASURED_RESOURCE_FEASIBILITY_V003"||d.project_id!=="PORT-000014"||
   d.records?.length!==34||d.construction_approval!==false||d.stirrup_diameter_mm!==8||
   d.structural_report_requires_M25_all_RCC!==true||d.project_finish_date!==null||
   d.activities_with_approved_resource_loaded_duration!==0||d.crew?.skilled!==2||d.crew?.unskilled!==3)
   throw Error("Source data version or code-safety requirements changed");
  mount.replaceChildren();
  const nav=add(mount,"nav","har-nav");nav.setAttribute("aria-label","Harisharan scheduling versions");
  href(nav,"← Harisharan project","./");
  href(nav,"v002 previous dated preview","schedule-v002.html#activities");
  href(nav,"v001 archived activity list","detailed-preview.html");
  const h=add(mount,"header");add(h,"h1","har-title","Harisharan · V003 Resource Feasibility");
  add(h,"p","har-intro","Start reference: 16 November 2026 · Sunday–Friday · one 2-skilled + 3-helper crew · 8-hour shift. This edition calculates only work quantities and published crew coefficients that can be traced. Missing engineering inputs produce a HOLD, never an invented finish date.");
  const warn=add(h,"div","har-warning","CODE HOLD — The architectural section reaches +15 m; NBC 105:2025 requires M25 structural concrete above 12 m. The signed structural report also specifies M25 for footings, slabs, stairs, beams and columns. M20 cannot be adopted for those structural members without a revised engineered design. Ø8 transverse ties remain an owner-selected diameter, NOT an accepted spacing/BBS.");
  warn.setAttribute("role","alert");
  const stats=add(mount,"div","har-panels");
  for(const [n,v]of [["BOQ work packages",d.records.length],["With source-grade rate",d.resource_estimate_items],["Held — no duration",d.coverage.held_no_duration],["Approved full WBS finish","NOT SET"]]){
   const box=add(stats,"div","har-stat");add(box,"small","",n);add(box,"strong","",String(v));
  }
  const footing=add(mount,"section","har-section");add(footing,"h2","","Footing geometry — drawing versus BOQ");
  const grid=add(footing,"div","har-grid");
  for(const [name,obj]of Object.entries(d.footing_geometry).filter(([name])=>name==="F1"||name==="F2")){
   const f=add(grid,"div","har-f");
   add(f,"strong","",name+" · "+obj.count+" units");
   add(f,"span","",obj.length_m+" × "+obj.width_m+" × "+obj.max_depth_m+" m gross envelope. Sloped edge thickness unresolved.");
  }
  add(footing,"p","",`Gross maximum: ${fmt(d.footing_geometry.gross_rectangular_m3)} m³. Previous BOQ footing concrete: ${fmt(d.footing_geometry.original_boq_breakdown_m3)} m³. Overstatement: ${fmt(d.footing_geometry.discrepancy_m3)} m³; do not order or schedule this quantity. Net sloped volume held until engineer supplies edge thickness/top plateau/break geometry.`);
  const sec=add(mount,"section","har-section");add(sec,"h2","","BOQ quantities → five-person crew work-rate feasibility");
  const controls=add(sec,"div","har-toolbar");
  const search=add(controls,"input");search.type="search";search.placeholder="Search item or work code";search.setAttribute("aria-label","Filter BOQ work packages");
  const picker=add(controls,"select");picker.setAttribute("aria-label","Filter feasibility status");
  for(const [val,t]of [["all","All work packages"],["mapped","Only calculated"],["hold","Only unresolved"]]){const o=add(picker,"option","",t);o.value=val;}
  const copy=add(controls,"button","","Export CSV");copy.type="button";
  const counter=add(controls,"small","","");
  const scroller=add(sec,"div","har-scroll"),table=add(scroller,"table","har-table");
  const tr=add(add(table,"thead"),"tr");
  for(const title of ["BOQ row","Work package","Unit","Source BOQ quantity","Calculated crew workdays","Rate provenance","Review condition"])add(tr,"th","",title);
  const body=add(table,"tbody");
  function render(){
   body.replaceChildren();
   const q=search.value.toLowerCase().trim();
   const rows=d.records.filter(r=>(picker.value==="all"||picker.value==="hold"&&r.duration_workdays===null||picker.value==="mapped"&&r.duration_workdays!==null)&&
    (!q||[r.id,r.title,r.quality_flag].join(" ").toLowerCase().includes(q)));
   for(const item of rows){
    const row=add(body,"tr");row.dataset.hold=String(item.duration_workdays===null);
    for(const v of [item.boq_row,item.id+" · "+item.title,item.unit,fmt(item.source_quantity),
      item.duration_workdays===null?"HOLD — not calculated":item.duration_workdays,
      item.reference_source===null?"No matching rate":(item.reference_source+" · "+label(item.rate_grade)),
      item.quality_flag==="DIRECT_UNIT_MATCH_PENDING_ONSITE_TAKEOFF"?"BOQ measured; verify site and source method":label(item.quality_flag)])
     add(row,"td","",v);
   }
   counter.textContent=rows.length+" of "+d.records.length+" work packages";
  }
  search.addEventListener("input",render);picker.addEventListener("change",render);render();
  copy.addEventListener("click",()=>{
   const head=["BOQ Row","Work ID","Title","Source Unit","Source Quantity","Computed Crew Days","Profile","Grade","Hold"];
   const rows=d.records.map(r=>[r.boq_row,r.id,r.title,r.unit,r.source_quantity,r.duration_workdays??"",r.profile_id??"",r.rate_grade??"",r.quality_flag]);
   const csv=[head,...rows].map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\r\n");
   const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
   const a=document.createElement("a");a.href=url;a.download="Harisharan-V003-BOQ-crew-feasibility.csv";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const mat=add(mount,"section","har-section");
  add(mat,"h2","","Source-measured finishes → shared materials reference");
  add(mat,"p","har-source","These are coefficient × BOQ-area calculations for selected finishes only. They are NOT approved purchase quantities; actual takeoff, mix, waste, product and packaging need checking. M25 structural concrete is deliberately excluded because the published material library has no approved M25 design-mix recipe.");
  const matscroll=add(mat,"div","har-scroll"),mattable=add(matscroll,"table","har-table");
  const mh=add(add(mattable,"thead"),"tr");
  for(const name of ["BOQ work","Reference recipe","Material","Per work unit","Reference total","Source grade","Approval"])add(mh,"th","",name);
  const mb=add(mattable,"tbody");
  for(const m of d.material_takeoff.lines){
   const tr=add(mb,"tr");
   for(const txt of [m.boq_id,m.recipe_id,m.material_name,fmt(m.per_unit_coefficient)+" "+m.unit,
     m.reference_quantity===null?"Requires product specification":fmt(m.reference_quantity)+" "+m.unit,
     m.recipe_grade,"NOT ORDERED"])
      add(tr,"td","",txt);
  }
  const audit=add(mount,"section","har-section");add(audit,"h2","","Measured-input conflicts requiring structural engineer / quantity surveyor review");
  const list=add(audit,"ul","har-list");
  for(const item of d.audit){
   const li=add(list,"li","",item.problem.replaceAll("_"," ")+" · source Civil work rows "+item.rows.join(", "));
   li.setAttribute("data-source-revision","v003");
  }
  add(audit,"p","har-source","No 839-activity resource-loaded completion date is asserted. The existing v002 dated bars remain an archived illustration and are NOT v003 construction baseline activities. Work rates represent man-days per measured unit; building code prescribes structural strength, detailing and curing constraints, not a guaranteed construction production speed.");
  const refs=add(mount,"section","har-section");add(refs,"h2","","Reference methodology");
  const ul=add(refs,"ul","har-list");
  for(const s of d.references){
   const li=add(ul,"li");
   if(s.uri)href(li,s.name,s.uri);else li.textContent=s.name+" (restricted authoritative project source)";
  }
 }catch(e){mount.replaceChildren();add(mount,"p","har-warning","V003 VALIDATION HELD: "+e.message);}
}
boot();