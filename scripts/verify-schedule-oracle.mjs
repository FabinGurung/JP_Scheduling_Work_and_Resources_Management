// Independent bounded enumeration of all start-time placements for tiny networks.
// It checks event inequalities, without calling the CPM's bound conversion helpers.
import assert from "node:assert/strict";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {pathToFileURL} from "node:url";

const types=["FS","SS","FF","SF"];
const constraints=["START_ON_OR_AFTER","START_ON_OR_BEFORE","FINISH_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_START_ON","MUST_FINISH_ON"];

export function placementOracle({activities,relationships,constraints:bounds=[],requiredFinish},mode){
  const durations=activities.map(a=>a.duration);
  const indexes=new Map(activities.map((a,i)=>[a.id,i]));
  const minimum=mode==="early"?0:-12,maximum=mode==="early"?14:8;
  const best=activities.map(()=>mode==="early"?Infinity:-Infinity);
  let feasible=0,placements=0;
  const start=[];
  function check(){
    placements++;
    for(const r of relationships){
      const p=indexes.get(r.predecessor),s=indexes.get(r.successor);
      const predecessorPoint=start[p]+((r.type==="FS"||r.type==="FF")?durations[p]:0);
      const successorPoint=start[s]+((r.type==="FF"||r.type==="SF")?durations[s]:0);
      if(successorPoint<predecessorPoint+r.lag) return;
    }
    if(mode==="late"&&start.some((t,i)=>t+durations[i]>requiredFinish)) return;
    for(const c of bounds){
      const i=indexes.get(c.activity_id);
      const point=start[i]+((c.type.startsWith("FINISH")||c.type==="MUST_FINISH_ON")?durations[i]:0);
      if(mode==="early"&&(c.type.endsWith("AFTER")||c.type.startsWith("MUST"))&&point<c.slot) return;
      if(mode==="late"&&(c.type.endsWith("BEFORE")||c.type.startsWith("MUST"))&&point>c.slot) return;
    }
    feasible++;
    for(let i=0;i<start.length;i++) best[i]=mode==="early"?Math.min(best[i],start[i]):Math.max(best[i],start[i]);
  }
  function visit(i){
    if(i===activities.length){check();return;}
    for(let t=minimum;t<=maximum;t++){start[i]=t;visit(i+1);}
  }
  visit(0);
  assert.ok(feasible>0,"Oracle horizon does not contain a valid placement");
  return {best,placements,feasible};
}

export function verifyCase(input){
  const schedule=scheduleNetwork(input);
  const early=placementOracle(input,"early"),late=placementOracle(input,"late");
  for(let i=0;i<input.activities.length;i++){
    const a=schedule.activities.find(a=>a.id===input.activities[i].id);
    assert.equal(a.es,early.best[i],`Early start ${a.id}: ${JSON.stringify(input)}`);
    assert.equal(a.ls,late.best[i],`Late start ${a.id}: ${JSON.stringify(input)}`);
    assert.equal(a.total_float,late.best[i]-early.best[i]);
  }
  return early.placements+late.placements;
}

export function* exhaustiveCases(){
  // Chain, fork and join topologies cover serial, parallel and converging logic.
  const topologies=[[["A","B"],["B","C"]],[["A","B"],["A","C"]],[["A","C"],["B","C"]]];
  for(const da of [0,1,2]) for(const db of [0,1,2]) for(const dc of [0,1,2])
  for(const topology of topologies)
  for(const t1 of types) for(const t2 of types) for(const l1 of [-1,0,1]) for(const l2 of [-1,0,1])
  for(const requiredFinish of [-2,4,8]) for(const activity_id of ["A","B","C"])
  for(const type of constraints) for(const slot of [-2,0,3,6,8]){
    yield {activities:[{id:"A",duration:da},{id:"B",duration:db},{id:"C",duration:dc}],
      relationships:[{predecessor:topology[0][0],successor:topology[0][1],type:t1,lag:l1},{predecessor:topology[1][0],successor:topology[1][1],type:t2,lag:l2}],
      constraints:[{activity_id,type,slot}],requiredFinish};
  }
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const limitArg=process.argv.find(a=>a.startsWith("--limit="));
  const limit=limitArg?Number(limitArg.slice(8)):Infinity;
  if(!(limit>0)) throw new Error("--limit must be positive");
  const start=Date.now();let cases=0,placements=0;
  for(const input of exhaustiveCases()){
    placements+=verifyCase(input);cases++;
    if(cases%10000===0) console.log(JSON.stringify({progress_cases:cases,placements,elapsed_ms:Date.now()-start}));
    if(cases>=limit) break;
  }
  console.log(JSON.stringify({result:"PASS",cases,placements,elapsed_ms:Date.now()-start,mode:"bounded exhaustive event-inequality oracle"}));
}
