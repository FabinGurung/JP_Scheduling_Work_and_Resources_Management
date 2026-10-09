import {levelResourceDependentNetwork} from "../kernel/resource-leveler.mjs";

// Boundary adapter: edit-friendly browser data -> unchanged, fail-closed v0.4.2 kernel.
export const PLANNER_FORMAT="PCK_BROWSER_PLANNER_V1";
export function examplePlanner(){
  return {
    format:PLANNER_FORMAT,
    project:{id:"DEMO-PCK-PLANNER",name:"Foundation construction · example",start:"2026-10-12",horizon_end:"2026-12-31"},
    calendar:{working_weekdays:[1,2,3,4,5,6],holidays:[]},
    activities:[
      {id:"A010",name:"Excavation",duration:3},
      {id:"A020",name:"Foundation PCC",duration:2},
      {id:"A030",name:"Footing reinforcement",duration:3},
      {id:"A040",name:"Footing formwork",duration:2},
      {id:"A050",name:"RCC footings",duration:2},
      {id:"A060",name:"Waterproofing",duration:3}
    ],
    resources:[
      {id:"CIVIL",name:"Civil crew",resource_type:"LABOR",max_units:1,calendar_id:"CAL"},
      {id:"MIXER",name:"Concrete mixer",resource_type:"EQUIPMENT",max_units:1,calendar_id:"CAL"},
      {id:"WP",name:"Waterproofing crew",resource_type:"LABOR",max_units:1,calendar_id:"CAL"},
      {id:"CEMENT",name:"Cement supply · bags",resource_type:"MATERIAL",inventory_quantity:85}
    ],
    assignments:[
      {activity_id:"A010",resource_id:"CIVIL",units:1},
      {activity_id:"A020",resource_id:"CIVIL",units:1},
      {activity_id:"A020",resource_id:"MIXER",units:1},
      {activity_id:"A020",resource_id:"CEMENT",quantity:20},
      {activity_id:"A030",resource_id:"CIVIL",units:1},
      {activity_id:"A040",resource_id:"CIVIL",units:1},
      {activity_id:"A050",resource_id:"CIVIL",units:1},
      {activity_id:"A050",resource_id:"MIXER",units:1},
      {activity_id:"A050",resource_id:"CEMENT",quantity:60},
      {activity_id:"A060",resource_id:"WP",units:1}
    ],
    relationships:[
      {predecessor:"A010",successor:"A020",type:"FS",lag:0},
      {predecessor:"A020",successor:"A030",type:"FS",lag:0},
      {predecessor:"A020",successor:"A040",type:"FS",lag:0},
      {predecessor:"A030",successor:"A050",type:"FS",lag:0},
      {predecessor:"A040",successor:"A050",type:"FS",lag:0},
      {predecessor:"A050",successor:"A060",type:"FS",lag:0}
    ],
    materialReceipts:[],resourceReservations:[],crews:[]
  };
}
const isDate=s=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+"T00:00:00Z"))&&new Date(s+"T00:00:00Z").toISOString().slice(0,10)===s;
const identity=(s,what)=>{if(typeof s!=="string"||!s.trim()||s.length>80)throw Error(what+" must have 1–80 characters");return s.trim();};
function numeric(v,what,nonzero=false){
  if(v===null||v===undefined||v===""||typeof v==="boolean"||!Number.isFinite(Number(v))||Number(v)<0||(nonzero&&Number(v)===0))throw Error(what+" must be a "+(nonzero?"positive":"nonnegative")+" number");
  return Number(v);
}
export function normalizePlanner(model){
  if(!model||typeof model!=="object"||Array.isArray(model))throw Error("Planner JSON must be an object");
  if(model.format!==PLANNER_FORMAT)throw Error("Unsupported planner document format");
  const p=model.project??{};
  const projectStart=p.start,horizonEnd=p.horizon_end;
  if(!isDate(projectStart)||!isDate(horizonEnd))throw Error("Project start and horizon end must be real ISO dates");
  const horizonDays=Math.round((Date.parse(horizonEnd+"T00:00:00Z")-Date.parse(projectStart+"T00:00:00Z"))/86400000);
  if(horizonDays<0||horizonDays>730)throw Error("Horizon must be from project start through at most 730 days");
  const limit=(value,name,n)=>{if(!Array.isArray(value)||value.length>n)throw Error(name+" must be an array with at most "+n+" rows");return value;};
  const acts=limit(model.activities,"activities",200);
  if(!acts.length)throw Error("Add at least one activity");
  const resources=limit(model.resources,"resources",80);
  const assignments=limit(model.assignments,"assignments",400);
  const relationships=limit(model.relationships,"relationships",600);
  const calendar=model.calendar??{};
  if(!Array.isArray(calendar.working_weekdays)||!calendar.working_weekdays.length||calendar.working_weekdays.some(x=>!Number.isInteger(x)||x<0||x>6))throw Error("Working weekdays must be numbers 0–6");
  if(!Array.isArray(calendar.holidays)||calendar.holidays.some(x=>!isDate(x)))throw Error("Holidays must be ISO dates");
  const calendarInput={id:"CAL",working_weekdays:calendar.working_weekdays,holidays:calendar.holidays};
  const normalizedActs=acts.map(a=>{
    if(a.activity_type!=null&&a.activity_type!=="RESOURCE_DEPENDENT")throw Error("Only unstarted RESOURCE_DEPENDENT activities are supported in this planner");
    if(a.status!=null&&a.status!=="NOT_STARTED")throw Error("Actual/progress schedules are not supported in this planner");
    const id=identity(a.id,"Activity ID");
    const row={...a,id,activity_type:"RESOURCE_DEPENDENT",duration:numeric(a.duration,"Duration for "+id)};
    if(!Number.isInteger(row.duration))throw Error("Duration for "+id+" must be an integer number of working days");
    if(row.notBefore==="")delete row.notBefore;
    if(row.notBefore!=null&&!isDate(row.notBefore)&&!(Number.isInteger(Number(row.notBefore))&&row.notBefore!==""))throw Error("notBefore for "+id+" must be an ISO date or integer slot");
    return row;
  });
  const normalizedRes=resources.map(r=>{
    const id=identity(r.id,"Resource ID"),type=String(r.resource_type??"LABOR").toUpperCase();
    if(!["LABOR","EQUIPMENT","MATERIAL"].includes(type))throw Error("Unknown resource type for "+id);
    return {...r,id,resource_type:type,...(type==="MATERIAL"?{inventory_quantity:numeric(r.inventory_quantity,"Inventory for "+id)}:{max_units:numeric(r.max_units,"Capacity for "+id,true),calendar_id:r.calendar_id??"CAL"})};
  });
  const typeById=new Map(normalizedRes.map(r=>[r.id,r.resource_type]));
  const normalizedAssign=assignments.map(a=>{
    const activity_id=identity(a.activity_id,"Assignment activity ID"),resource_id=identity(a.resource_id,"Assignment resource ID"),type=typeById.get(resource_id);
    if(!type)throw Error("Assignment uses unknown resource "+resource_id);
    return type==="MATERIAL"?{activity_id,resource_id,quantity:numeric(a.quantity,"Material quantity for "+resource_id)}
      :{activity_id,resource_id,units:numeric(a.units,"Units for "+resource_id,true)};
  });
  const normalizedLinks=relationships.map(r=>{
    const type=String(r.type??"FS").toUpperCase(),lag=Number(r.lag??0);
    if(!["FS","SS","FF","SF"].includes(type)||!Number.isInteger(lag))throw Error("Relationships require FS/SS/FF/SF and an integer lag");
    return {...r,predecessor:identity(r.predecessor,"Predecessor"),successor:identity(r.successor,"Successor"),type,lag};
  });
  const advanced=["materialReceipts","resourceReservations","crews","constraints"];
  for(const key of advanced)if(model[key]!=null&&!Array.isArray(model[key]))throw Error(key+" must be an array");
  if(model.constraints?.length)throw Error("Constraints are not yet supported by this leveling engine");
  return {...model,project:{...p,start:projectStart,horizon_end:horizonEnd},
    activities:normalizedActs,resources:normalizedRes,assignments:normalizedAssign,relationships:normalizedLinks,
    calendar:calendarInput};
}
export function calculatePlanner(model){
  const m=normalizePlanner(model);
  const schedule=levelResourceDependentNetwork({
    ...m,projectStart:m.project.start,horizonEnd:m.project.horizon_end,
    projectCalendarId:"CAL",calendars:[m.calendar],activities:m.activities,
    resources:m.resources,assignments:m.assignments,relationships:m.relationships,
    resourceReservations:m.resourceReservations??[],materialReceipts:m.materialReceipts??[],crews:m.crews??[]
  });
  const byId=new Map(m.activities.map(a=>[a.id,a]));
  const tasks=schedule.activities.map(a=>({...a,name:byId.get(a.activity_id)?.name??a.activity_id}));
  const lastFinish=tasks.reduce((v,a)=>Math.max(v,a.finish),0);
  const delayed=tasks.filter(a=>a.leveling_delayed).length;
  const workloads=schedule.resource_allocations.map(a=>({...a,capacity:m.resources.find(r=>r.id===a.resource_id)?.max_units??0}));
  const conflicts=schedule.diagnostics.flatMap(d=>d.conflicts.map(c=>({...c,activity_id:d.activity_id})));
  return {model:m,schedule,tasks,lastFinish,delayed,workloads,conflicts};
}
export function dateAt(start,day){return new Date(Date.parse(start+"T00:00:00Z")+day*86400000).toISOString().slice(0,10);}
