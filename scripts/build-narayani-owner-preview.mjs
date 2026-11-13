import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scheduleCalendarNetwork } from '../src/kernel/calendar-scheduler.mjs';
import { REFERENCE_HOUSE_CALENDAR } from '../src/reference/house-saturday-calendar.mjs';
import { estimateStarterOutput, validateStarterCatalog } from '../src/reference/productivity-starters.mjs';
import { materialTakeoff, validateMaterialCatalog } from '../src/reference/material-planner.mjs';
import { validateGenericViewModel } from '../src/presentation/generic-views.mjs';

const [input, catalogDir, output] = process.argv.slice(2);
if (!input || !catalogDir || !output) throw Error('Usage: node scripts/build-narayani-owner-preview.mjs <controlled v002 JSON> <published catalog directory> <public JSON output>');
const hash = data => createHash('sha256').update(data).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const sourceBytes = readFileSync(input);
const source = JSON.parse(sourceBytes);
const catalogStatus = read(resolve(catalogDir, 'norms-source-status.json'));
function catalog(file) {
  const data = read(resolve(catalogDir, file));
  if (hash(JSON.stringify(data)) !== catalogStatus.source_content_hashes?.[file]) throw Error('Published planner hash mismatch: '+file);
  return data;
}
if (catalogStatus.status !== 'GOOGLE_SHEETS_V000001_IMPORTED' || catalogStatus.sync_completed !== true) throw Error('Published Sheets-backed catalog status required');
const base = catalog('productivity-norms.v1.json');
const rates = catalog('productivity-starters.v2.json');
const materials = catalog('material-references.v1.json');
validateStarterCatalog(rates,base);
validateMaterialCatalog(materials,base,null);
if (source.revision !== 'v002' || source.project_id !== 'PRJ-000007' || source.baseline_approved !== false ||
  source.construction_release !== false || source.scope?.proposed_block !== 'B' ||
  source.activities.length !== 160 || source.relationships.length !== 194) throw Error('Unexpected owner schedule scope or authority');

// Sunday is the plotting origin. The preview exposes relative days and weeks only.
const origin = '2000-01-02';
const asDate = day => new Date(Date.parse(origin+'T00:00:00Z') + day*86400000).toISOString().slice(0,10);
const work = {id:'HOUSE',working_weekdays:REFERENCE_HOUSE_CALENDAR.working_weekdays};
const elapsed = {id:'ELAPSED',working_weekdays:[0,1,2,3,4,5,6]};
const profileMap = new Map(rates.profiles.map(p=>[p.id,p]));
const codeMap = new Map(rates.items.map(item=>[item.key,item.reference_profile]));
const recipes = new Map(materials.recipes.map(item=>[item.id,item]));
const materialItems = new Map(materials.work_items.map(item=>[item.key,item]));
const publicSources = source.evidence_sources.filter(item=>['IS456','NBC110','NP-FORM','NP-SPEC','NBC206'].includes(item.id));
const plannerBase = 'https://fabingurung.github.io/jp-scheduling-resources-management/work-items/';
const citations = new Map([
  ...publicSources.map(s=>[s.id,{title:s.title,section:s.section,url:s.url}]),
  ...[...rates.sources,...materials.sources].map(s=>[s.id,{title:s.title,section:s.reference??null,url:s.url}]),
  ['WORK-PLANNER',{title:'Skyforge Work Output Planner',url:plannerBase+'productivity.html'}],
  ['MATERIAL-PLANNER',{title:'Skyforge Materials Planner',url:plannerBase+'materials.html'}],
  ['PLANNER-STATUS',{title:'Published catalog checksums and Sheets import status',url:plannerBase+'norms-source-status.json'}]
]);
const gateLabels = ['Masonry-to-column interface','Plumbing before closure','Permit and drawing issue',
  'Underground water tank engineering','Scope and baseline adoption','Foundation QA and detailing'];
const holds = source.project_gates.map((gate,index)=>({title:gateLabels[index],activities:gate.activity_ids,status:'Open'}));
const tradeAllowances = {
  D010:2,D020:3,D030:2,D040:5,D050:7,D060:4,D070:4,D080:2,D085:10,D100:3,
  F010:2,F020:3,F030:2,F040:2,F140:2,F230:2,F240:2,F290:3,
  U040:2,U050:4,U060:2,U070:4,S010:2,S020:2,S040:4,
  M020:3,M070:3,M090:2,M100:4,M110:4,P010:1,P020:6,P030:5,P040:3,P080:2,P090:4,
  P115:3,P130:3,P150:5,P160:4,P170:3,P200:2,P220:4,P230:4,
  X040:8,X050:6,I020:8,I030:5,I040:6,I050:3
};
// Add a separate reserve where the matched catalog sample omits a footing family.
const incompleteScope = {F070:2,F080:2,F170:2};
const optionalUnsized = new Map([
  ['M070','Later waste-line route. The preview models the early route.'],
  ['U015','Open tank engineering hold.'],['U020','Tank excavation awaits the engineering release.'],
  ['U030','Tank construction awaits the engineering release.']
]);
const weekPlans = new Map();
function basis(activity) {
  const id = activity.id;
  if (optionalUnsized.has(id)) return {duration:null,kind:'Pending',note:optionalUnsized.get(id)};
  if (activity.activity_type !== 'TASK') return {duration:0,kind:'Milestone',note:'Zero-duration planning event.'};
  if (id.startsWith('L110-')) return {duration:10,kind:'Elapsed reference',citation:'IS456',
    note:'Ten elapsed days are reserved as a moisture-curing planning case. Cement, exposure and the approved curing method govern on site.'};
  if (id==='M035') return {duration:7,kind:'Elapsed allowance',note:'Seven calendar days from the order milestone is the provisional owner allowance. Confirm supplier delivery.'};
  const components = activity.measurement_refs.flatMap(ref=>{
    const p = profileMap.get(codeMap.get(ref.reference_code));
    if (!p || p.unit !== ref.unit) throw Error('Unresolved planner unit or profile: '+id+' '+ref.reference_code);
    const quantity = p.default_quantity;
    if (!(quantity>0)) throw Error('Missing reference quantity: '+id);
    const machineHours = p.machine_hours_per_unit === null ? 0 : 2;
    const plan = estimateStarterOutput(p,{quantity,skilled:2,helper:3,hours:8,machines:machineHours?1:0,machineHoursPerDay:machineHours});
    if (!(plan.units_per_workday>0)) throw Error('Invalid rate: '+id);
    const assemblies = materialItems.get(ref.reference_code).recipe_ids.filter(recipe=>recipes.get(recipe).work_unit===ref.unit)
      .map(recipe=>{
        const sample = materialTakeoff(materials,recipe,quantity);
        return {name:recipes.get(recipe).title,grade:sample.grade,lines:sample.material_lines.map(line=>
          ({name:line.name,unit:line.unit,quantity:line.quantity,basis:line.basis,source:line.source_id}))};
      });
    return [{code:ref.reference_code,unit:ref.unit,quantity,output:plan.units_per_workday,
      days:plan.active_workdays,profile:p.id,grade:p.kind,source:p.source_id,section:p.source_item,
      scope:ref.drawing_scope??null,machine_hours_per_day:machineHours,assemblies}];
  });
  if (components.length && !incompleteScope[id] && id!=='M030') {
    return {duration:Math.max(1,Math.ceil(components.reduce((sum,item)=>sum+item.days,0))),kind:'Planner sample',components,
      note:'Separate sample work quantities divided by daily output and summed before rounding. Replace with measured scope.'};
  }
  if (incompleteScope[id]) return {duration:Math.ceil(components.reduce((sum,item)=>sum+item.days,0))+incompleteScope[id],
    kind:'Partial planner sample',components,note:`Matched footing-family sample plus ${incompleteScope[id]} workdays of illustrative allowance for the unmatched family. Replace both with measured takeoff.`};
  const fallback = tradeAllowances[id] ?? 1;
  return {duration:fallback,kind:'Planning allowance',components,
    note:id==='M030'?'One workday for placing the order. The timber installation rate is shown only as a reference.':
      'Placeholder for a scope, trade, inspection or approval with no matched whole-activity quantity and rate.'};
}

const workingInput = [];
for (const activity of source.activities) {
  const plan = basis(activity);
  weekPlans.set(activity.id,plan);
  if (plan.duration===null) continue;
  workingInput.push({id:activity.id,duration:plan.duration,activity_type:activity.activity_type,
    calendar_id:plan.kind.startsWith('Elapsed')?'ELAPSED':'HOUSE'});
}
const sourceLinks = source.relationships.map(e=>({from:e.predecessor,to:e.successor,type:e.type,lag:e.lag}));
const executable = sourceLinks.filter(e=>!optionalUnsized.has(e.from)&&!optionalUnsized.has(e.to));
const elapsedRules = [
  {from:'F170',to:'F210',days:7,source:'IS456',reason:'Combined footing curing/interface allowance. Confirm actual release.'},
  {from:'F200',to:'F220',days:7,source:'IS456',reason:'Combined foundation-column curing/interface allowance. Confirm actual release.'},
  {from:'F310',to:'F320',days:7,source:'IS456',reason:'Plinth interface planning allowance. Confirm actual release.'},
  ...['GF','FF','SF'].flatMap(level=>[
    {from:'L100-'+level,to:'L120-'+level,days:7,source:'NP-FORM',reason:'Combined slab and beam soffit allowance uses the beam reference.'},
    {from:'L100-'+level,to:'L123-'+level,days:21,source:'NP-FORM',reason:'Upper beam-prop allowance pending span, loads and temporary-works confirmation.'}
  ])
];
const scenarioLinks = [...executable];
for (const rule of elapsedRules) {
  const match = scenarioLinks.findIndex(e=>e.from===rule.from&&e.to===rule.to);
  const timedLink = {...rule,type:'FS',lag:rule.days,lag_basis:'elapsed',scenario:true};
  if (match===-1) scenarioLinks.push(timedLink);
  else scenarioLinks[match] = timedLink;
}
// Select the early waste route and require its completion before closing concealed plumbing.
scenarioLinks.push({from:'M020',to:'P025',type:'FS',lag:0,scenario:true});
// Make the selected owner branches executable without altering the private v002 source graph.
const previewLinks = [
  ['F290','F300','FS','Allow the optional strap-beam reinforcement and formwork before plinth inspection.'],
  ['M060','M045','FS','Allow frame fitting before closing aggregate external wall zones.'],
  ['M060','M055','FS','Allow frame fitting before closing aggregate partition zones.'],
  ['P010','P020','FS','Allow the provisional backing-plaster workface before pipe rough-in.'],
  ['P150','P160','FS','The owner’s false-ceiling scenario finishes before first-coat painting.'],
  ['P150','P200','FS','The false ceiling precedes electrical wire-tail preparation.'],
  ['P170','P210','FS','Fit the applicable window grilles before the finish coat.'],
  ['P180','P210','FS','Fit the applicable window and door frames before the finish coat.'],
  ['X040','X050','FS','Finish the boundary wall and heavy access before placing compound flagstone.'],
  ['X050','I010','FS','Use the owner’s exterior-to-interior handoff for this preview.'],
  ['X060','I010','FS','Allow the compound gate before the interior workface handoff.'],
  ['P130','I040','FS','Coordinate the counter with the modular kitchen.']
];
for (const [from,to,type,reason] of previewLinks) {
  if (!scenarioLinks.some(e=>e.from===from&&e.to===to)) scenarioLinks.push({from,to,type,lag:0,scenario:true,reason});
}
const calculated = scheduleCalendarNetwork({activities:workingInput,relationships:scenarioLinks.map(e=>({
  predecessor:e.from,successor:e.to,type:e.type,lag:e.lag,
  ...(e.lag_basis==='elapsed'?{lag_calendar_mode:'EXPLICIT',lag_calendar_id:'ELAPSED'}:{})
})),calendars:[work,elapsed],projectStart:origin,horizonEnd:asDate(1000),projectCalendarId:'HOUSE',projectTimeZone:'Asia/Kathmandu'});
const byId = new Map(calculated.activities.map(item=>[item.id,item]));
for (const activity of calculated.activities) {
  if (activity.duration>0 && activity.calendar_id==='HOUSE' && activity.es%7===6) throw Error('Saturday work start');
}
for (const edge of elapsedRules) {
  if (byId.get(edge.to).es<byId.get(edge.from).ef+edge.days) throw Error('Elapsed allowance not enforced: '+edge.to);
}
const wbs = source.wbs_groups.map(item=>({id:item.id,title:item.name,parent_id:null}));
const activities = source.activities.map(item=>{
  const timing = byId.get(item.id);
  const plan = weekPlans.get(item.id);
  return {id:item.id,title:item.name,wbs_id:item.wbs_code,level:item.level??null,
    applicability:item.applicability,hold:holds.filter(gate=>gate.activities.includes(item.id)).map(gate=>gate.title),
    status:'CALCULATED_DRAFT_NOT_ACTUAL',engineering_release:false,
    duration:plan.duration,start:timing?.es??0,finish:timing?.ef??0,
    start_date:timing?.start_date??null,finish_date:timing?asDate(timing.ef):null,
    estimate:plan};
});
const timingLinks = new Map(scenarioLinks.map(e=>[e.from+'>'+e.to,e]));
const links = sourceLinks.map(e=>timingLinks.get(e.from+'>'+e.to)??{...e,scenario_excluded:true});
links.push(...scenarioLinks.filter(e=>!sourceLinks.some(original=>original.from===e.from&&original.to===e.to)));
const calendar_events = activities.filter(a=>a.start_date).flatMap(a=>[
  {date:a.start_date,activity_id:a.id,kind:'START'},{date:a.finish_date,activity_id:a.id,kind:'FINISH'}
]);
const model = {format:'SKYFORGE_GENERIC_VIEW_MODEL_V1',classification:'PUBLIC_SAFE_GOVERNED_SCENARIO',
  project:{id:'PRJ-000007',name:'Narayani Parajuli'},input_sha256:hash(sourceBytes),
  revision:'v002',planning_status:'Relative planning estimate',relative_origin:origin,
  baseline_approved:false,engineering_release:false,views_basis:'ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL',
  source_count:sourceLinks.length,source_rule_count:source.conditions.length,
  catalog_snapshot:{published_at:catalogStatus.published_at,hashes:catalogStatus.source_content_hashes},
  citations:Object.fromEntries(citations),holds,wbs,activities,links,calendar_events,checklist:[],
  counts:{wbs:wbs.length,activities:activities.length,links:links.length,checklist:0}};
validateGenericViewModel(model);
const json = JSON.stringify(model,null,2)+'\n';
if (/drive\.google|docs\.google|file_id|source_passages|email|latitude|longitude|actual_start|actual_finish/i.test(json)) throw Error('Private or unverified record in public preview');
writeFileSync(output,json);
console.log(`${activities.length} activities, ${sourceLinks.length} source links, ${links.length} displayed links, ${activities.filter(a=>a.start_date).length} timed rows`);
