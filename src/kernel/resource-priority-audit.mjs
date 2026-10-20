import {levelResourceDependentNetwork} from "./resource-leveler.mjs";
/** Exhaustive topological-priority auditor for SMALL instances.
 * Finds the best priority ordering of the existing serial scheduling algorithm,
 * NOT an optimal solution among all possible resource schedules.
 * For >7 activities, throws rather than claiming global optimality.
 */
export function auditSerialPrioritySpace(input,{max_activities=7}={}){
 const tasks=input?.activities,relationships=input?.relationships??[];
 if(!Array.isArray(tasks)||tasks.length<1||tasks.length>max_activities||max_activities>7||
  !Number.isInteger(max_activities)||max_activities<1)
  throw Error("Exact serial-priority audit bounded to 1..7 activities");
 const ids=tasks.map(x=>x.id);if(ids.some(x=>typeof x!=="string")||new Set(ids).size!==ids.length)throw Error("Unique activity IDs required");
 const before=new Map(ids.map(id=>[id,new Set()]));
 for(const e of relationships){
  const a=e.predecessor??e.predecessor_id,b=e.successor??e.successor_id;
  if(!before.has(a)||!before.has(b))throw Error("Unknown relationship endpoint");
  before.get(b).add(a);
 }
 let visited=0,best=null,failed=0;
 function walk(prefix,placed){
  if(prefix.length===ids.length){
   visited++;
   try{
    const result=levelResourceDependentNetwork({...input,levelingPolicy:"SERIAL_PRIORITY_EXPLICIT",priority_order:prefix});
    const finish=Math.max(...result.activities.map(x=>x.finish));
    const signature=prefix.join("|");
    if(!best||finish<best.finish||(finish===best.finish&&signature<best.signature))
      best={finish,signature,result};
   }catch(e){failed++;}
   return;
  }
  const eligible=ids.filter(id=>!placed.has(id)&&[...before.get(id)].every(x=>placed.has(x))).sort();
  if(!eligible.length)throw Error("Cyclic priority audit network");
  for(const id of eligible){placed.add(id);walk([...prefix,id],placed);placed.delete(id);}
 }
 walk([],new Set());
 if(!best)throw Error("No serial priority was feasible within project horizon");
 return {format:"SKYFORGE_SERIAL_PRIORITY_AUDIT_V1",policy:"EXHAUSTIVE_TOPOLOGICAL_PRIORITY_ENUMERATION",
  tested_orders:visited,unfeasible_orders:failed,best_finish_event:best.finish,best_order:best.result.order,
  objective:"MINIMIZE_MAX_FINISH_EVENT",optimality_claim:"EXACT_WITHIN_SERIAL_PRIORITY_FAMILY_NOT_GLOBAL_RESOURCE_OPTIMUM",
  solution:best.result};
}
