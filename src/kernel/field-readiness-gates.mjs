import {inspectWorkSequence} from "./work-readiness.mjs";
import {validateGenericViewModel} from "../presentation/generic-views.mjs";

/**
 * D3 private SIMULATION ONLY: reason-coded readiness candidates.
 *
 * Never publishes READY / approved site work. Until an authenticated reviewer,
 * verified source readback, activity-specific hold register and signed release
 * are connected, output cannot be adopted for construction.
 */
const safeId=x=>typeof x==="string"&&/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(x);
const allowed=(obj,keys,label)=>{
 if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error(label+" must be an object");
 for(const key of Object.keys(obj))if(!keys.includes(key))throw Error("Unexpected "+label+" field "+key);
};
const gateKey=(id,gate)=>JSON.stringify([id,gate]);
const evKey=(id,event)=>JSON.stringify([id,event]);
const edgeKey=x=>JSON.stringify([x.from,x.to,x.type,x.lag]);
function status(r){
 if(!r)return "UNKNOWN";
 return r==="SIMULATED_STOP"?"BLOCKED":r==="SIMULATED_WAIT"?"WAITING":
  r==="SIMULATED_PASS"?"SATISFIED":"UNKNOWN";
}
function decide(reasons){
 if(reasons.some(r=>r.state==="BLOCKED"))return "BLOCKED_SIMULATED";
 if(reasons.some(r=>r.state==="UNKNOWN"))return "UNKNOWN";
 if(reasons.some(r=>r.state==="WAITING"))return "WAITING_SIMULATED";
 return "CANDIDATE_PREREQUISITES_SATISFIED_NOT_AUTHORIZED";
}
export function evaluateSimulatedStartGates(model,scenario,activityId){
 validateGenericViewModel(model);
 const view=inspectWorkSequence(model,activityId);
 allowed(scenario,["format","classification","project_id","source_sha256",
  "required_gates","gate_states","activity_events","lag_clearances"],"scenario");
 if(scenario.format!=="SKYFORGE_PRIVATE_READINESS_SCENARIO_V1"||
    scenario.classification!=="PRIVATE_SYNTHETIC_TEST_ONLY"||
    scenario.project_id!==model.project.id||scenario.source_sha256!==model.input_sha256)
  throw Error("Private readiness simulation is not tied to this exact public source");
 for(const key of ["required_gates","gate_states","activity_events","lag_clearances"]){
  if(!Array.isArray(scenario[key])||scenario[key].length>10000)throw Error("Malformed "+key);
 }
 const ids=new Set(model.activities.map(a=>a.id));
 const links=new Set(model.links.map(edgeKey));
 const register=new Map();
 for(const r of scenario.required_gates){
  allowed(r,["activity_id","gate_id","stage"],"required gate");
  if(!ids.has(r.activity_id)||!safeId(r.gate_id)||!["START","FINISH"].includes(r.stage))
   throw Error("Invalid required gate identity or phase");
  const key=gateKey(r.activity_id,r.gate_id);
  if(register.has(key))throw Error("Duplicate required gate ID");
  register.set(key,r);
 }
 const gateStates=new Map();
 for(const g of scenario.gate_states){
  allowed(g,["activity_id","gate_id","state"],"gate state");
  const key=gateKey(g.activity_id,g.gate_id);
  if(!register.has(key)||gateStates.has(key)||
   !["SIMULATED_PASS","SIMULATED_WAIT","SIMULATED_STOP"].includes(g.state))
   throw Error("Unregistered, duplicate or invalid simulated gate state");
  gateStates.set(key,g.state);
 }
 const eventStates=new Map();
 for(const e of scenario.activity_events){
  allowed(e,["activity_id","event","state"],"activity event");
  const key=evKey(e.activity_id,e.event);
  if(!ids.has(e.activity_id)||!["START","FINISH"].includes(e.event)||
     !["SIMULATED_PASS","SIMULATED_WAIT","SIMULATED_STOP"].includes(e.state)||
     eventStates.has(key))throw Error("Invalid or duplicate simulated activity event");
  eventStates.set(key,e.state);
 }
 const lagStates=new Map();
 for(const e of scenario.lag_clearances){
  allowed(e,["from","to","type","lag","state"],"lag clearance");
  const key=edgeKey(e);
  if(!links.has(key)||!Number.isSafeInteger(e.lag)||e.lag===0||
   lagStates.has(key)||!["SIMULATED_PASS","SIMULATED_WAIT","SIMULATED_STOP"].includes(e.state))
   throw Error("Unrecognized, duplicate or non-applicable lag clearance");
  lagStates.set(key,e.state);
 }
 const reasons=[];
 const startGates=scenario.required_gates.filter(g=>g.activity_id===activityId&&g.stage==="START");
 if(!startGates.length)reasons.push({
  kind:"UNDECLARED_REQUIRED_GATES",state:"UNKNOWN",
  explanation:"No source-authenticated start hold-point register was provided"
 });
 for(const g of startGates)reasons.push({
  kind:"WORK_HOLD_POINT",gate_id:g.gate_id,state:status(gateStates.get(gateKey(activityId,g.gate_id))),
  explanation:"Only a simulated gate verdict exists; no signed field approval"
 });
 for(const link of view.start_conditions){
  const pred=link.activity_id;
  if(link.lag!==0){
   const key=edgeKey({from:pred,to:activityId,type:link.type,lag:link.lag});
   reasons.push({kind:"LAG_CLEARANCE",predecessor_id:pred,lag:link.lag,type:link.type,
    state:status(lagStates.get(key)),
    explanation:"Nonzero lag/lead needs explicit time/calendar evidence; simulation is not field approval"});
  }else{
   reasons.push({kind:"PREDECESSOR_EVENT",predecessor_id:pred,event:link.predecessor_event,
    state:status(eventStates.get(evKey(pred,link.predecessor_event))),
    explanation:"A reported checklist or nominal schedule date cannot prove the predecessor event"});
  }
 }
 return {
  format:"SKYFORGE_PRIVATE_READINESS_CANDIDATE_V1",
  authority:"PRIVATE_SIMULATION_UNAPPROVED_NOT_PUBLISHABLE",
  project_id:model.project.id,activity_id:activityId,source_sha256:model.input_sha256,
  status:decide(reasons),
  reasons,finish_only_constraints:view.finish_constraints,
  field_release_granted:false,reviewer_authorized:false,
  approved_site_progress:false,
  live_source_reconciliation_required:true
 };
}
