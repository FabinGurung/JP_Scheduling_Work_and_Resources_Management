import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {evaluateSimulatedStartGates} from "../src/kernel/field-readiness-gates.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const model=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
const scenario=m=>({
 format:"SKYFORGE_PRIVATE_READINESS_SCENARIO_V1",
 classification:"PRIVATE_SYNTHETIC_TEST_ONLY",
 project_id:m.project.id,source_sha256:m.input_sha256,
 required_gates:[],gate_states:[],activity_events:[],lag_clearances:[]
});
const gate=(m,id)=>{
 const s=scenario(m);
 s.required_gates.push({activity_id:id,gate_id:"WORK_PERMIT",stage:"START"});
 return s;
};
test("D3 without any authenticated gate specification remains UNKNOWN; source checklists never certify release",()=>{
 const m=model(),a=m.activities[0].id;
 const result=evaluateSimulatedStartGates(m,scenario(m),a);
 assert.equal(result.status,"UNKNOWN");
 assert.equal(result.field_release_granted,false);
 assert.equal(result.authority,"PRIVATE_SIMULATION_UNAPPROVED_NOT_PUBLISHABLE");
 assert.equal(result.live_source_reconciliation_required,true);
 assert.ok(result.reasons.some(x=>x.kind==="UNDECLARED_REQUIRED_GATES"));
});
test("D3 explicit simulated permit can only produce candidate, never READY or signoff",()=>{
 const m=model(),root=m.activities.find(a=>!m.links.some(x=>x.to===a.id)).id;
 const s=gate(m,root);
 s.gate_states.push({activity_id:root,gate_id:"WORK_PERMIT",state:"SIMULATED_PASS"});
 const result=evaluateSimulatedStartGates(m,s,root);
 assert.equal(result.status,"CANDIDATE_PREREQUISITES_SATISFIED_NOT_AUTHORIZED");
 assert.equal(result.field_release_granted,false);
 assert.equal(result.reviewer_authorized,false);
 assert.equal(result.approved_site_progress,false);
 assert.ok(result.reasons.every(x=>x.state==="SATISFIED"));
});
test("D3 unknown, waiting, stop and confirmed predecessor events are independently reason coded",()=>{
 const m=model(),edge=m.links.find(x=>x.type==="FS"&&x.lag===0);
 assert.ok(edge);
 const id=edge.to,s=gate(m,id);
 s.gate_states.push({activity_id:id,gate_id:"WORK_PERMIT",state:"SIMULATED_PASS"});
 const unknown=evaluateSimulatedStartGates(m,s,id);
 assert.equal(unknown.status,"UNKNOWN");
 const previous=unknown.reasons.find(x=>x.predecessor_id===edge.from);
 assert.equal(previous?.state,"UNKNOWN");
 s.activity_events.push({activity_id:edge.from,event:"FINISH",state:"SIMULATED_WAIT"});
 assert.equal(evaluateSimulatedStartGates(m,s,id).status,"WAITING_SIMULATED");
 s.activity_events[0].state="SIMULATED_STOP";
 assert.equal(evaluateSimulatedStartGates(m,s,id).status,"BLOCKED_SIMULATED");
 s.activity_events[0].state="SIMULATED_PASS";
 const maybe=evaluateSimulatedStartGates(m,s,id);
 // Any other predecessor must also be satisfied; one event alone cannot release a multi-gate job.
 if(m.links.filter(x=>x.to===id&&x.lag===0&&["FS","SS"].includes(x.type)).length===1)
  assert.equal(maybe.status,"CANDIDATE_PREREQUISITES_SATISFIED_NOT_AUTHORIZED");
});
test("D3 nonzero lag needs explicit clearance; FF/SF constrain finish but not start",()=>{
 const m=model(),edge=m.links[0],id=edge.to;
 const altered=structuredClone(m);
 altered.links=altered.links.filter(x=>x.to!==id).concat(
  [{from:edge.from,to:id,type:"FS",lag:2},
   {from:edge.from,to:id,type:"FF",lag:0}]);
 altered.counts.links=altered.links.length;
 const s=gate(altered,id);
 s.gate_states.push({activity_id:id,gate_id:"WORK_PERMIT",state:"SIMULATED_PASS"});
 let result=evaluateSimulatedStartGates(altered,s,id);
 assert.equal(result.status,"UNKNOWN");
 assert.ok(result.reasons.some(x=>x.kind==="LAG_CLEARANCE"&&x.lag===2));
 assert.equal(result.finish_only_constraints.length,1);
 s.lag_clearances.push({from:edge.from,to:id,type:"FS",lag:2,state:"SIMULATED_WAIT"});
 assert.equal(evaluateSimulatedStartGates(altered,s,id).status,"WAITING_SIMULATED");
 s.lag_clearances[0].state="SIMULATED_PASS";
 result=evaluateSimulatedStartGates(altered,s,id);
 assert.equal(result.status,"CANDIDATE_PREREQUISITES_SATISFIED_NOT_AUTHORIZED");
 assert.equal(result.field_release_granted,false);
});
test("D3 rejects forged authority, stale source SHA and duplicate/unregistered gates",()=>{
 const m=model(),id=m.activities[0].id;
 const s=gate(m,id);
 assert.throws(()=>evaluateSimulatedStartGates(m,{...s,source_sha256:"0".repeat(64)},id),/source/);
 assert.throws(()=>evaluateSimulatedStartGates(m,{...s,classification:"PUBLIC_APPROVED"},id),/simulation/);
 assert.throws(()=>evaluateSimulatedStartGates(m,{...s,reviewer_approved:true},id),/Unexpected/);
 const double=structuredClone(s);
 double.required_gates.push(double.required_gates[0]);
 assert.throws(()=>evaluateSimulatedStartGates(m,double,id),/Duplicate required gate/);
 const fake=structuredClone(s);
 fake.gate_states.push({activity_id:id,gate_id:"NOT_REGISTERED",state:"SIMULATED_PASS"});
 assert.throws(()=>evaluateSimulatedStartGates(m,fake,id),/Unregistered/);
});
test("D3 private simulation is excluded from Pages while public site stays UNKNOWN",()=>{
 const builder=read("scripts/build-public-site.mjs");
 const js=read("src/presentation/work-readiness-page.mjs");
 assert.ok(builder.includes('"src/kernel/field-readiness-gates.mjs"'));
 assert.doesNotMatch(js,/evaluateSimulatedStartGates/);
 assert.match(js,/UNKNOWN/);
 assert.doesNotMatch(js,/authenticatedReviewerId|gate_states|private\s+Drive/i);
});
