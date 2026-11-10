import {validateProductivityCatalog,findWork,calculateWorkRate} from "../reference/productivity-norms.mjs";
const locationOfCatalog=new URL("../../work-items/productivity-norms.v1.json",import.meta.url);
const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
const put=(p,t,c,s)=>{const x=e(t,c,s);p.append(x);return x};
const cell=(row,s,c)=>put(row,"td",c,s);
const format=x=>Number.isFinite(x)?new Intl.NumberFormat("en-US",{maximumFractionDigits:2}).format(x):"—";
function selectedDetails(box,data,key){
 box.replaceChildren();
 const info=findWork(data,key);
 if(!info)return;
 const {item,rate}=info;
 put(box,"div","wr-eyebrow",item.key+" · "+item.source_scope);
 put(box,"h2","",item.title);
 put(box,"p","",item.note);
 const meta=put(box,"dl");
 const fields=[
 ["Measured unit",item.unit],
 ["Reference status",rate?rate.match:"NOT VERIFIED — no directly comparable numerical norm"],
 ["Source section",rate?.section||"Source match pending"],
 ["Skilled",rate?.skilled_md!==undefined&&rate?.skilled_md!==null?format(rate.skilled_md)+" worker-days / "+item.unit:"Not verified"],
 ["Unskilled",rate?.unskilled_md!==undefined&&rate?.unskilled_md!==null?format(rate.unskilled_md)+" worker-days / "+item.unit:"Not verified"],
 ["Activity quantity","NOT SUPPLIED BY PROJECT"],
 ["Site output","NOT MEASURED"],
 ["Engineering release","NOT AUTHORIZED"]
 ];
 for(const [label,value] of fields){put(meta,"dt","",label);put(meta,"dd","",value)}
 if(!rate){put(box,"div","wr-unavailable","No directly applicable public crew coefficient has been accepted for this item. The engine must not fill a number automatically. Select the actual material/method and obtain a matching norm or recorded site production.");return;}
 put(box,"p","",rate.notes);
 const source=data.sources.find(s=>s.id===rate.source);
 if(source){
  const p=put(box,"p","", "Reference: "+source.document+" — "+source.publisher+". ");
  const a=put(p,"a","wr-source","Open source →");a.href=source.url;a.target="_blank";a.rel="noopener noreferrer";
 }
 const card=put(box,"section","wr-calc");
 put(card,"h3","","Crew & quantity scenario calculator");
 put(card,"p","","The rate is conditional. All calculations here are hypothetical workdays, NOT calendar dates or approved site progress.");
 const grid=put(card,"div","wr-calc-grid");
 const inputs=[];
 for(const [label,value,step] of [
  ["Measured quantity ("+item.unit+")",10,"0.01"],
  ["Skilled workers",2,"1"],
  ["Unskilled workers",4,"1"],
  ["Working days to estimate output",5,"1"]]){
  const wrap=put(grid,"label","",label);
  const input=put(wrap,"input");
  input.type="number";input.min="0";input.max="1000000";input.step=step;input.value=String(value);
  inputs.push(input);
 }
 const confirm=put(card,"label","wr-confirm");
 const checked=put(confirm,"input");checked.type="checkbox";
 put(confirm,"span","","I have checked the reference against the actual material, method, accessible crew and work limits. Show a hypothetical result; do not apply it to a project schedule.");
 const result=put(card,"div","wr-unavailable");
 function update(){
  const raw=inputs.map(x=>x.value.trim()===""?NaN:Number(x.value));
  try{
   const res=calculateWorkRate({
    quantity:raw[0],skilled:raw[1],unskilled:raw[2],days:raw[3],
    rate,unit:item.unit,applicabilityConfirmed:checked.checked
   });
   result.className=res.status==="REFERENCE_SCENARIO_ONLY"?"wr-results":"wr-unavailable";
   result.replaceChildren();
   if(res.status==="REFERENCE_SCENARIO_ONLY"){
    put(result,"strong","",format(res.nominal_units_per_workday)+" "+item.unit+" per workday");
    put(result,"p","","Output in "+format(raw[3])+" workdays: "+format(res.units_in_requested_workdays)+" "+item.unit);
    put(result,"p","","Nominal active work required for "+format(raw[0])+" "+item.unit+": "+format(res.nominal_active_workdays)+" workdays (rounded full slots: "+res.rounded_workday_slots+").");
    put(result,"p","","Method: minimum of skilled crew ÷ skilled coefficient and unskilled crew ÷ unskilled coefficient. Separate curing, inspections, procurement, weather, holidays and calendar dates.");
   }else if(res.status==="PARTIAL_LABOUR_BASIS")
    put(result,"p","","This reference provides only part of the crew requirement. It is not safe to convert it into project duration.");
   else if(res.status==="INSUFFICIENT_CREW")
    put(result,"p","","Crew cannot produce output under the supplied rate because a necessary worker category has zero available staff.");
   else put(result,"p","","Confirm applicability to view a hypothetical output. Nothing here changes project activity data.");
  }catch(error){result.className="wr-unavailable";result.textContent="Calculation blocked: "+error.message}
 }
 for(const x of [...inputs,checked])x.addEventListener("input",update);
 update();
}
export function renderProductivityReference(data,mount){
 validateProductivityCatalog(data);mount.replaceChildren();
 const head=put(mount,"header","wr-hero");
 const nav=put(head,"p");
 const a=put(nav,"a","","← Project reference centre");a.href=new URL("../more/",locationOfCatalog).href;
 put(head,"div","wr-eyebrow","Skyforge · Work Rate Memory Wall · read-only source library");
 put(head,"h1","","Construction work rates and measured output");
 put(head,"p","","One versioned reference for "+data.items.length+" BOQ/component entries. Published labour coefficients are stored once and reused by item ID. No workday becomes a site-approved schedule without real quantities, crews, calendars, safety holds and review.");
 put(head,"div","wr-banner","Important: 8 hours is an illustrative planning workday parameter, not a universal labour law or project calendar. All matching rates are CONDITIONAL; unknown items are intentionally blank. Government rate-analysis man-days do not automatically set activity durations.");
 const cols=put(mount,"div","wr-columns");
 const left=put(cols,"section","wr-card");const right=put(cols,"aside","wr-card wr-details");
 const controls=put(left,"div","wr-controls");
 const search=put(controls,"input");search.type="search";search.placeholder="Search IDs, plaster, M20, UPVC…";search.setAttribute("aria-label","Search source work item");
 const filter=put(controls,"select");filter.setAttribute("aria-label","Work item family");
 for(const [value,label] of [["ALL","BOQ + WBS"],["BOQ","BOQ items"],["WBS","Component WBS"]]){
  const o=put(filter,"option","",label);o.value=value;
 }
 const only=put(controls,"label","","With numbers only");
 const rated=put(only,"input");rated.type="checkbox";
 const count=put(controls,"small");
 const scroll=put(left,"div","wr-list");
 let selection=data.items[0].key;
 function show(){
  scroll.replaceChildren();
  const table=put(scroll,"table","wr-table");
  const thead=put(table,"thead");const hdr=put(thead,"tr");
  for(const n of ["ID","Item / activity","Unit","Norm status"])put(hdr,"th","",n);
  const body=put(table,"tbody");
  const query=search.value.trim().toLowerCase(),family=filter.value;
  const selected=data.items.filter(item=>{
   const match=family==="ALL"||item.key.startsWith(family+":");
   const has=Boolean(item.rate_key);
   return match&&(!rated.checked||has)&&
    (!query||[item.key,item.title,item.note,item.unit].some(x=>String(x||"").toLowerCase().includes(query)));
  });
  count.textContent=selected.length+" / "+data.items.length+" items";
  for(const item of selected){
   const row=put(body,"tr");row.tabIndex=0;row.setAttribute("aria-selected",String(selection===item.key));
   cell(row,item.key,"wr-id");cell(row,item.title,"");
   cell(row,item.unit,"");
   cell(row,item.rate_key?"REFERENCE / CONDITIONAL":"NOT VERIFIED",item.rate_key?"wr-source":"wr-unknown");
   const choose=()=>{selection=item.key;selectedDetails(right,data,selection);show();};
   row.addEventListener("click",choose);
   row.addEventListener("keydown",e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();choose();}});
  }
 }
 for(const x of [search,filter,rated])x.addEventListener("input",show);
 selectedDetails(right,data,selection);show();
 const sources=put(mount,"section","wr-card wr-source-list");
 put(sources,"h2","","Source register · why these references were selected");
 for(const source of data.sources){
  const item=put(sources,"article");
  put(item,"strong","",source.id+" · "+source.document);
  put(item,"p","",source.publisher+" — "+source.caveat);
  const a=put(item,"a","","Open primary source / evidence →");a.href=source.url;a.target="_blank";a.rel="noopener noreferrer";
 }
 const foot=put(mount,"p","wr-banner");
 foot.textContent="This source library is a reference input, not an active site productivity database. Site calibration requires measured BOQ quantities, recorded crew-hour and quantities actually achieved per day; project calendars, hold points and source approval remain separate. The user has paused live identity/signing integration.";
}
export async function bootstrapProductivityReference(doc=document){
 const mount=doc.getElementById("work-rates");
 if(!mount)return false;
 try{
  const r=await fetch(locationOfCatalog,{cache:"no-store"});
  if(!r.ok)throw Error("Published rate registry not available");
  const data=await r.json();renderProductivityReference(data,mount);return true;
 }catch(error){mount.textContent="Work-rate source blocked: "+error.message;return false}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootstrapProductivityReference(),{once:true});
 else bootstrapProductivityReference();
}
