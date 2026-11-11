import {validateProductivityCatalog} from "../reference/productivity-norms.mjs";
import {validateStarterCatalog,selectStarter,estimateStarterOutput} from "../reference/productivity-starters.mjs";
const baseUrl=new URL("../../work-items/productivity-norms.v1.json",import.meta.url);
const starterUrl=new URL("../../work-items/productivity-starters.v2.json",import.meta.url);
const e=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=String(text);return x};
const add=(p,t,c,x)=>{const n=e(t,c,x);p.append(n);return n};
const num=x=>Number.isFinite(x)?new Intl.NumberFormat("en-GB",{maximumFractionDigits:2}).format(x):"—";
const link=(p,text,href)=>{const a=add(p,"a","",text);a.href=href;a.target="_blank";a.rel="noopener noreferrer";return a};
const kinds={"OFFICIAL_DIRECT":"Published item match","OFFICIAL_ANALOG":"Government item analog","CALIBRATION_SEED":"Provisional starter / NOT a published rate"};
const sampleKeys=[["WBS:6.1","Concrete footing"],["WBS:6.2","Concrete column"],["WBS:6.4","Concrete slab"],["BOQ:8.1","Brick masonry"],["BOQ:9","Internal plaster"],["WBS:7.2","Column shuttering"],["BOQ:26","Reinforcement"],["BOQ:17","Tiles"]];
export function renderStarterWall(base,start,mount){
 validateProductivityCatalog(base);validateStarterCatalog(start,base);mount.replaceChildren();
 const hero=add(mount,"header","wr-new-hero");
 const back=add(hero,"div","wr-eyebrow","Skyforge / Reference / Work Rates");
 add(hero,"h1","","Work output planner");
 add(hero,"p","","Crew + machine + work hours → output per hour, per day and active workdays. 82 of 88 work entries now have a numeric **starting scenario**; the remaining six are parent WBS or supply-only, not stand-alone activities.");
 const caution=add(hero,"p","wr-data-warning","Government norms · analogous methods · explicitly invented calibration seeds are clearly separated. Results are for field comparison only; not approved schedules, workmanship standards, or work-release instructions.");
 const picks=add(mount,"nav","wr-fast-picks");
 picks.setAttribute("aria-label","Example work rate presets");
 add(picks,"strong","","Try a task:");
 const shell=add(mount,"div","wr-planner-layout");
 const calculator=add(shell,"section","wr-calculator");
 calculator.id="live-crew-plan";
 const reference=add(shell,"aside","wr-source-detail");
 let selected=start.ui_example.default_key||"WBS:6.1";
 let state={quantity:5,skilled:2,helper:3,machines:1,hours:8,machineHoursPerDay:2,efficiency:100,actualQuantity:null,thicknessMm:230};
 const label=add(calculator,"div","wr-eyebrow","Active work scenario (read-only, locally calculated)");
 const heading=add(calculator,"h2","","");
 const band=add(calculator,"div","wr-benchmark-badge","");
 const synopsis=add(calculator,"p","wr-plain","");
 const controls=add(calculator,"div","wr-controls-grid");
 const results=add(calculator,"div","wr-output-cards");
 const extra=add(calculator,"div","wr-worked-example");
 const links=add(calculator,"p","wr-small","No edits are written to GitHub, Google Drive, site reports or the Primavera schedule.");
 const filterPanel=add(mount,"section","wr-catalog-panel");
 add(filterPanel,"h2","","Find a different activity");
 const finder=add(filterPanel,"div","wr-find-row");
 const search=add(finder,"input");search.type="search";search.placeholder="Search 88 BOQ + WBS activities";search.setAttribute("aria-label","Find work by ID and name");
 const family=add(finder,"select");family.setAttribute("aria-label","Filter work source");
 for(const [value,title] of [["ALL","All items"],["BOQ","BOQ"],["WBS","WBS components"]]){const o=add(family,"option","",title);o.value=value}
 const count=add(finder,"small","");
 const listing=add(filterPanel,"div","wr-compact-list");
 const citations=add(mount,"section","wr-source-library");
 add(citations,"h2","","References and adoption policy");
 for(const source of start.sources){
  const row=add(citations,"article");
  add(row,"strong","",source.title);
  add(row,"span","",source.description);
  link(row,"Original source ↗",source.url);
 }
 const help=add(citations,"p","wr-data-warning","The rule-of-thumb seeds are transparent starting numbers for your future site calibration. They are not quotations from the linked standard. You can change the crew/hour inputs live; to change default coefficients, review and version the source JSON in GitHub. No private Google authentication or field approval is enabled.");
 function switchItem(id,scroll=false){
  if(!base.items.some(x=>x.key===id))return;
  selected=id;
  const {item,profile}=selectStarter(start,base,id);
  if(profile){
   state={quantity:profile.default_quantity,skilled:2,
    helper:3,machines:profile.default_crew.machines,
    hours:8,machineHoursPerDay:2,efficiency:100,actualQuantity:null,
    thicknessMm:230};
  }
  heading.textContent=item.key+" · "+item.title;
  band.textContent=profile?(kinds[profile.kind]||"Reference"):"Parent WBS / material procurement only";
  band.dataset.kind=profile?.kind||"NON_EXECUTABLE";
  synopsis.textContent=profile?
   "Measurement unit: "+profile.unit+" · "+profile.source_item+" · "+profile.notes:
   "This item is an aggregate WBS package or material procurement record, not independent installable work. Sum its real child activities instead of inventing a double-counted crew duration.";
  reference.replaceChildren();
  if(profile){
   add(reference,"div","wr-eyebrow","Basis and source trace");
   add(reference,"h3","","Published rate vs starter assumptions");
   const dl=add(reference,"dl","wr-source-dl");
   for(const [k,v] of [
    ["Evidence grade",kinds[profile.kind]],
    ["Skilled md / unit",profile.skilled_days_per_unit],
    ["Helper md / unit",profile.helper_days_per_unit],
    ["Machine use",profile.machine_type||"No separately constrained machine"],
    ["Machine hours / unit",profile.machine_hours_per_unit===null?"Not needed / not established":profile.machine_hours_per_unit],
    ["Element factor",profile.calibration_factor+" × · preliminary, not published"],
    ["Contract / site approval","NOT VERIFIED"]]){
    add(dl,"dt","",k);add(dl,"dd","",v);
   }
   const src=start.sources.find(x=>x.id===profile.source_id);
   if(src)link(reference,"Open government / reference source ↗",src.url);
   add(reference,"p","wr-small","Labour man-days refer to a fixed 8h hypothetical workday for the arithmetic only. This does not certify actual local work hours or overtime.");
  }else add(reference,"p","","No stand-alone rate is meaningful for this parent/material line.");
  buildControls(profile);
  showList();
  if(scroll)calculator.scrollIntoView({behavior:"smooth",block:"start"});
 }
 function control(parent,title,value,min,max,step,field){
  const item=add(parent,"label","wr-crew-field");
  add(item,"span","",title);
  const line=add(item,"div","wr-crew-adjust");
  const minus=add(line,"button","","−");
  minus.type="button";minus.setAttribute("aria-label","Decrease "+title);
  const input=add(line,"input");
  input.type="number";input.min=min;input.max=max;input.step=step;input.value=value;
  input.setAttribute("aria-label",title);
  const plus=add(line,"button","","+");
  plus.type="button";plus.setAttribute("aria-label","Increase "+title);
  function set(value){
   const v=Number(value);
   if(!Number.isFinite(v))return;
   state[field]=Math.max(min,Math.min(max,v));
   input.value=state[field];
   recalc();
  }
  input.addEventListener("input",()=>set(input.value));
  minus.addEventListener("click",()=>set((Number(state[field])||0)-step));
  plus.addEventListener("click",()=>set((Number(state[field])||0)+step));
  return input;
 }
 function buildControls(profile){
  controls.replaceChildren();results.replaceChildren();extra.replaceChildren();
  if(!profile){add(results,"p","wr-data-warning","No stand-alone crew output. Select a measurable activity, not the parent WBS total.");return;}
  control(controls,"Quantity ("+profile.unit+")",state.quantity,0,1000000,1,"quantity");
  control(controls,"Skilled workers",state.skilled,0,100,1,"skilled");
  control(controls,"Helpers / unskilled",state.helper,0,100,1,"helper");
  if(profile.machine_type)control(controls,profile.machine_type+" (machines)",state.machines,0,50,1,"machines");
  control(controls,"Work hours per day",state.hours,1,16,1,"hours");
  if(profile.machine_type)control(controls,"Machine operating hours/day",state.machineHoursPerDay,0,16,1,"machineHoursPerDay");
  control(controls,"Efficiency factor (%)",state.efficiency,10,180,5,"efficiency");
  if(profile.id==="brick_1_4")control(controls,"Wall thickness (mm)",state.thicknessMm,75,600,5,"thicknessMm");
  const act=add(controls,"label","wr-crew-field");
  add(act,"span","","Actual output observed today (optional "+profile.unit+")");
  const inp=add(act,"input");inp.type="number";inp.min="0";inp.step=".1";inp.placeholder="Your measured value…";
  inp.addEventListener("input",()=>{
   const v=Number(inp.value);state.actualQuantity=inp.value===""?null:(Number.isFinite(v)?Math.max(0,v):null);recalc();
  });
  recalc();
 }
 function metric(parent,title,value,sub){
  const c=add(parent,"article","wr-output-metric");
  add(c,"span","",title);
  add(c,"strong","",value);
  add(c,"small","",sub);
 }
 function recalc(){
  const {profile}=selectStarter(start,base,selected);if(!profile)return;
  results.replaceChildren();extra.replaceChildren();
  try{
   const info=estimateStarterOutput(profile,{...state,thicknessMm:profile.id==="brick_1_4"?state.thicknessMm:null});
   if(info.status!=="ILLUSTRATIVE_ONLY"){
    add(results,"div","wr-data-warning","Add the required workers and machines to calculate this task.");return;
   }
   metric(results,"Output / workday",num(info.units_per_workday)+" "+profile.unit,"With 2 skilled + 3 helpers default; "+state.hours+" labour hours; "+state.machineHoursPerDay+" machine hours/day");
   metric(results,"Output / hour",num(info.units_per_hour)+" "+profile.unit,"Nominal average during working hours");
   metric(results,"Active duration",num(info.active_workdays)+" days","Round to "+info.rounded_full_workdays+" complete workdays; excludes holds");
   if(info.sqft_per_workday!==undefined)
    metric(results,"Area / workday",num(info.sqft_per_workday)+" ft²","Volume to area conversion not applicable");
   if(info.wall_sqft_per_workday!==undefined)
    metric(results,"Wall / workday",num(info.wall_sqft_per_workday)+" ft²",state.thicknessMm+" mm nominal brickwork");
   if(info.actual_efficiency_percent!==null)
    metric(results,"Your site performance",num(info.actual_efficiency_percent)+"%","Actual output ÷ this provisional benchmark");
   add(extra,"strong","","Live crew equation");
   add(extra,"p","","Output per day = MIN(skilled workers ÷ skilled worker-days/unit, helpers ÷ helper-days/unit, machinery hours available ÷ machine-hours/unit) × hours adjustment × efficiency ÷ element factor.");
   add(extra,"p","","Increasing only ONE labour category may not increase output if helpers or machinery have already become the bottleneck. Saturday is the reference weekly holiday; it is excluded from working-day date projections.");
   add(extra,"p","","Active duration = "+num(state.quantity)+" "+profile.unit+" ÷ "+num(info.units_per_workday)+" "+profile.unit+"/day = "+num(info.active_workdays)+" workdays; this is not a construction calendar finish.");
  }catch(err){add(results,"div","wr-data-warning","Calculation held: "+err.message);}
 }
 function showList(){
  listing.replaceChildren();
  const text=search.value.trim().toLowerCase(),category=family.value;
  const visible=base.items.filter(p=>(category==="ALL"||p.key.startsWith(category+":"))&&
    (!text||(p.key+" "+p.title+" "+p.note).toLowerCase().includes(text)));
  count.textContent=visible.length+" / 88";
  for(const p of visible){
   const row=add(listing,"button","wr-compact-item");
   row.type="button";row.setAttribute("aria-pressed",String(p.key===selected));
   const ref=start.items.find(x=>x.key===p.key);
   const prof=start.profiles.find(x=>x.id===ref.reference_profile);
   add(row,"strong","",p.key+" · "+p.title);
   add(row,"small","",prof?(prof.kind==="OFFICIAL_DIRECT"?"Published item":prof.kind==="OFFICIAL_ANALOG"?"Official analog":"Starter seed")+" · "+p.unit:"Parent / supply only");
   row.addEventListener("click",()=>switchItem(p.key,true));
  }
 }
 for(const [id,name] of sampleKeys){const b=add(picks,"button","",name);b.type="button";b.addEventListener("click",()=>switchItem(id,true));}
 search.addEventListener("input",showList);family.addEventListener("change",showList);
 switchItem(selected,false);
}
export async function bootstrapStarterWall(doc=document){
 const mount=doc.getElementById("work-rates");if(!mount)return false;
 try{
  const [a,b]=await Promise.all([fetch(baseUrl,{cache:"no-store"}),fetch(starterUrl,{cache:"no-store"})]);
  if(!a.ok||!b.ok)throw Error("Required source registry missing");
  renderStarterWall(await a.json(),await b.json(),mount);
  return true;
 }catch(error){mount.replaceChildren();add(mount,"div","wr-data-warning","Work output planner unavailable: "+error.message);return false}
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>bootstrapStarterWall(),{once:true});
 else bootstrapStarterWall();
}
