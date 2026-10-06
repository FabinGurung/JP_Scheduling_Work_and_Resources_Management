import {numeric} from "./validation.mjs";

export const RESOURCE_TYPES=Object.freeze(["LABOR","EQUIPMENT","MATERIAL"]);

function id(v,label){if(typeof v!=="string"||!v.trim())throw new Error(`${label} must be a nonempty string`);return v.trim();}
function pos(v,label){const n=numeric(v,label,{nonnegative:true});if(n<=0)throw new Error(`${label} must be greater than zero`);return n;}

export function normalizeResource(raw){
  const resource_id=id(raw?.resource_id??raw?.id,"Resource id");
  const resource_type=String(raw?.resource_type??raw?.type??"LABOR").toUpperCase();
  if(!RESOURCE_TYPES.includes(resource_type))throw new Error(`Unsupported resource type: ${resource_type}`);
  const renewable=resource_type!=="MATERIAL";
  const calendar_id=raw.calendar_id==null?null:id(raw.calendar_id,`Resource calendar_id for ${resource_id}`);
  return {...raw,id:resource_id,resource_id,resource_type,availability_mode:renewable?"RENEWABLE":"CONSUMABLE",
    unit:String(raw.unit??(resource_type==="LABOR"?"person":resource_type==="EQUIPMENT"?"unit":"quantity")),
    calendar_id,max_units:renewable?pos(raw.max_units??raw.capacity??1,`Resource max_units for ${resource_id}`):null,
    inventory_quantity:resource_type==="MATERIAL"&&raw.inventory_quantity!=null?numeric(raw.inventory_quantity,`Material inventory for ${resource_id}`,{nonnegative:true}):null};
}

export function normalizeResources(resources=[]){
  if(!Array.isArray(resources))throw new Error("resources must be an array");
  const by_id=new Map(),rows=[];
  for(const raw of resources){const r=normalizeResource(raw);if(by_id.has(r.id))throw new Error(`Duplicate resource id: ${r.id}`);by_id.set(r.id,r);rows.push(r);}
  return {resources:rows,by_id};
}

export function normalizeCrews({crews=[],resources=[],knownCalendarIds=null}={}){
  if(!Array.isArray(crews))throw new Error("crews must be an array");
  const rs=resources instanceof Map?resources:normalizeResources(resources).by_id,known=knownCalendarIds?new Set(knownCalendarIds):null;
  const by_id=new Map(),rows=[];
  for(const raw of crews){
    const crew_id=id(raw?.crew_id??raw?.id,"Crew id"),calendar_id=id(raw?.calendar_id,`Crew calendar_id for ${crew_id}`);
    if(by_id.has(crew_id))throw new Error(`Duplicate crew id: ${crew_id}`);
    if(known&&!known.has(calendar_id))throw new Error(`Unknown crew calendar ${calendar_id}`);
    if(!Array.isArray(raw.members)||!raw.members.length)throw new Error(`Crew ${crew_id} requires members`);
    const seen=new Set(),members=raw.members.map(m=>{
      const resource_id=id(m.resource_id??m.id,`Crew ${crew_id} resource_id`),r=rs.get(resource_id);
      if(!r)throw new Error(`Crew ${crew_id} references unknown resource: ${resource_id}`);
      if(r.resource_type==="MATERIAL")throw new Error(`Crew ${crew_id} cannot contain MATERIAL resource ${resource_id}`);
      if(seen.has(resource_id))throw new Error(`Crew ${crew_id} contains duplicate resource ${resource_id}`);seen.add(resource_id);
      return {resource_id,units:pos(m.units??1,`Crew ${crew_id} units for ${resource_id}`),resource_type:r.resource_type};
    });
    const crew={...raw,id:crew_id,crew_id,calendar_id,members,calendar_mode:"EXPLICIT_CREW_CALENDAR",native_schedule_support:"CONTRACT_ONLY"};
    by_id.set(crew_id,crew);rows.push(crew);
  }
  return {crews:rows,by_id};
}

export function expandCrewAssignments({assignments=[],resources=[],crews=[]}={}){
  const rs=resources instanceof Map?resources:normalizeResources(resources).by_id;
  const cs=crews instanceof Map?crews:normalizeCrews({crews,resources:rs}).by_id,out=[];
  for(const raw of assignments){
    const activity_id=id(raw.activity_id??raw.activityId,"Assignment activity_id");
    const rid=raw.resource_id??raw.resourceId,cid=raw.crew_id??raw.crewId;
    if((rid==null)===(cid==null))throw new Error(`Assignment for ${activity_id} requires exactly one resource_id or crew_id`);
    if(rid!=null){const resource_id=id(rid,"Assignment resource_id");if(!rs.has(resource_id))throw new Error(`Unknown resource: ${resource_id}`);out.push({...raw,activity_id,resource_id,source_crew_id:null});continue;}
    const crew_id=id(cid,"Assignment crew_id"),crew=cs.get(crew_id);if(!crew)throw new Error(`Unknown crew: ${crew_id}`);
    const mult=pos(raw.crew_units??raw.units??1,`Crew units for ${crew_id}`);
    for(const m of crew.members)out.push({activity_id,resource_id:m.resource_id,units:m.units*mult,source_crew_id:crew_id,crew_calendar_id:crew.calendar_id});
  }
  return out;
}

export function buildResourceHistogram({scheduledActivities,resources=[],assignments=[],crews=[]}={}){
  const acts=new Map();
  for(const a of scheduledActivities??[]){const k=id(a.id??a.activity_id,"Scheduled activity id");const es=numeric(a.es??a.start??a.forecast_start_slot,`Activity ${k} start`),ef=numeric(a.ef??a.finish??a.forecast_finish_slot,`Activity ${k} finish`);if(ef<es)throw new Error(`Activity ${k} finish precedes start`);acts.set(k,{...a,es,ef});}
  const state=normalizeResources(resources),crewState=normalizeCrews({crews,resources:state.by_id});
  const expanded=expandCrewAssignments({assignments,resources:state.by_id,crews:crewState.by_id}),map=new Map();
  for(const x of expanded){
    const a=acts.get(x.activity_id),r=state.by_id.get(x.resource_id);if(!a)throw new Error(`Unknown activity: ${x.activity_id}`);
    const slots=[];for(let s=Math.floor(a.es);s<Math.ceil(a.ef);s++)slots.push(s);if(!slots.length)continue;
    const material=r.resource_type==="MATERIAL";
    const q=material?(x.quantity_per_slot!=null?pos(x.quantity_per_slot,"Material quantity_per_slot"):numeric(x.quantity,"Material quantity",{nonnegative:true})/slots.length):0;
    const units=material?0:pos(x.units??1,`Assignment units for ${x.activity_id}/${r.id}`);
    for(const slot of slots){const key=`${r.id}@${slot}`,row=map.get(key)??{resource_id:r.id,resource_type:r.resource_type,availability_mode:r.availability_mode,unit:r.unit,slot,demand_units:0,capacity_units:r.max_units,material_quantity:0,activities:[],source_crews:[]};row.demand_units+=units;row.material_quantity+=q;if(!row.activities.includes(x.activity_id))row.activities.push(x.activity_id);if(x.source_crew_id&&!row.source_crews.includes(x.source_crew_id))row.source_crews.push(x.source_crew_id);map.set(key,row);}
  }
  const rows=[...map.values()].sort((a,b)=>a.slot-b.slot||a.resource_id.localeCompare(b.resource_id)),totals=new Map();
  for(const r of rows){if(r.availability_mode==="RENEWABLE"){r.utilization=r.demand_units/r.capacity_units;r.overloaded=r.demand_units>r.capacity_units;r.cumulative_material_quantity=null;}else{const t=(totals.get(r.resource_id)??0)+r.material_quantity;totals.set(r.resource_id,t);r.utilization=null;r.overloaded=false;r.cumulative_material_quantity=t;}r.activities.sort();r.source_crews.sort();}
  return {resolution:"SHARED_INTEGER_SLOT_HISTOGRAM",rows,overloads:rows.filter(r=>r.overloaded),material_totals:Object.fromEntries(totals),resource_count:state.resources.length,assignment_count:expanded.length};
}

export function findResourceOverloads({scheduledActivities,assignments=[],capacities={},resources=null,crews=[]}){
  if(resources!=null)return buildResourceHistogram({scheduledActivities,resources,assignments,crews}).overloads.map(r=>({resource_id:r.resource_id,slot:r.slot,units:r.demand_units,capacity:r.capacity_units,activities:r.activities}));
  const acts=new Map(scheduledActivities.map(a=>[a.id??a.activity_id,a])),usage=new Map();
  for(const x of assignments){const aid=x.activity_id??x.activityId,rid=x.resource_id??x.resourceId,units=Number(x.units??1),a=acts.get(aid);if(!a||a.duration<=0||!rid)continue;for(let slot=Math.floor(a.es);slot<Math.ceil(a.ef);slot++){const key=`${rid}@${slot}`,cur=usage.get(key)??{resource_id:rid,slot,units:0,activities:[]};cur.units+=units;cur.activities.push(aid);usage.set(key,cur);}}
  return [...usage.values()].map(u=>({...u,capacity:Number(capacities[u.resource_id]??1)})).filter(u=>u.units>u.capacity).sort((a,b)=>a.slot-b.slot||a.resource_id.localeCompare(b.resource_id));
}
