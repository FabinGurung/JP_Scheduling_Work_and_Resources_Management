export function buildWbsTree(nodes=[]){
  const map=new Map();
  for(const n of nodes){
    if(!n.wbs_id) throw new Error("Every WBS node requires wbs_id");
    if(map.has(n.wbs_id)) throw new Error(`Duplicate WBS id: ${n.wbs_id}`);
    map.set(n.wbs_id,{...n,children:[]});
  }
  const roots=[];
  for(const n of map.values()){
    if(n.parent_wbs_id){
      const p=map.get(n.parent_wbs_id);
      if(!p) throw new Error(`Missing WBS parent ${n.parent_wbs_id} for ${n.wbs_id}`);
      p.children.push(n);
    } else roots.push(n);
  }
  const visiting=new Set(),visited=new Set();
  function walk(n){
    if(visiting.has(n.wbs_id)) throw new Error("WBS contains a cycle");
    if(visited.has(n.wbs_id)) return;
    visiting.add(n.wbs_id); n.children.forEach(walk); visiting.delete(n.wbs_id); visited.add(n.wbs_id);
  }
  roots.forEach(walk);
  if(visited.size!==map.size) throw new Error("WBS contains an unreachable cycle");
  return roots;
}

export function rollupWbs({nodes=[],activities=[]}){
  const roots=buildWbsTree(nodes), direct=new Map(nodes.map(n=>[n.wbs_id,[]]));
  for(const a of activities){if(a.wbs_id&&direct.has(a.wbs_id)) direct.get(a.wbs_id).push(a);}
  function calc(n){
    const child=n.children.map(calc), own=direct.get(n.wbs_id)??[];
    const allCount=own.length+child.reduce((s,x)=>s+x.activity_count,0);
    const duration=own.reduce((s,a)=>s+Number(a.duration??0),0)+child.reduce((s,x)=>s+x.total_activity_duration,0);
    return {...n,activity_count:allCount,total_activity_duration:duration,children:child};
  }
  return roots.map(calc);
}
