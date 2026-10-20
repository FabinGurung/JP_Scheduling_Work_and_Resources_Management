/**
 * Organic skill-tree geometry for an arbitrary WBS.
 * Positions are derived ONLY from WBS ancestry and stable activity identity.
 * Time slots are deliberately excluded: this is not a sideways Gantt.
 */
const valid=s=>typeof s==="string"&&s.length>0;
function drift(id){let n=2166136261;for(const c of id){n=Math.imul(n^c.charCodeAt(0),16777619)}return (n>>>0)%5}
export function layoutOrganicSkillTree(model){
 if(!model||!Array.isArray(model.wbs)||!Array.isArray(model.activities)||!model.wbs.length||!model.activities.length)
  throw Error("WBS and activities required for organic tree");
 const byId=new Map();
 for(const w of model.wbs){
  if(!valid(w.id)||byId.has(w.id))throw Error("Invalid or duplicated WBS identity");
  byId.set(w.id,{id:w.id,name:w.title,parent_id:w.parent_id??null,children:[]});
 }
 const roots=[];
 for(const w of byId.values()){
  if(w.parent_id){const parent=byId.get(w.parent_id);if(!parent)throw Error("Missing WBS parent "+w.parent_id);parent.children.push(w)}
  else roots.push(w);
 }
 if(!roots.length)throw Error("WBS hierarchy contains a cycle (no root)");
 const tasks=new Map([...byId].map(([id])=>[id,[]]));
 const used=new Set();
 for(const a of model.activities){
  if(!valid(a.id)||used.has(a.id)||!tasks.has(a.wbs_id))throw Error("Orphan or duplicate activity");
  used.add(a.id);tasks.get(a.wbs_id).push(a);
 }
 for(const w of byId.values())w.children.sort((a,b)=>a.id.localeCompare(b.id));
 for(const a of tasks.values())a.sort((x,y)=>x.id.localeCompare(y.id));
 roots.sort((a,b)=>a.id.localeCompare(b.id));
 let maxDepth=0;const visiting=new Set(),visited=new Set();
 function walk(w,depth){
  if(visiting.has(w.id))throw Error("WBS cycle");
  if(visited.has(w.id))throw Error("Duplicated WBS traversal");
  visiting.add(w.id);maxDepth=Math.max(maxDepth,depth);
  for(const child of w.children)walk(child,depth+1);
  visiting.delete(w.id);visited.add(w.id);
 }
 roots.forEach(w=>walk(w,0));if(visited.size!==byId.size)throw Error("Unreachable WBS");
 const leaves=[];
 function collect(w){
  for(const child of w.children)collect(child);
  for(const a of tasks.get(w.id))leaves.push(a);
 }
 roots.forEach(collect);
 if(leaves.length!==model.activities.length)throw Error("Unrepresented work-item");
 const width=Math.max(1080,leaves.length*208+160),height=Math.max(790,420+(maxDepth+1)*150);
 const root={id:"PROJECT",x:width/2,y:height-85,label:model.project?.name??"Project"};
 const nodes=[],branches=[],taskPositions=new Map(),wbsPositions=new Map();
 leaves.forEach((a,i)=>taskPositions.set(a.id,{
  id:a.id,x:140+(width-280)*(i+.5)/leaves.length,
  y:68+drift(a.id)*29,
  kind:"ACTIVITY",wbs_id:a.wbs_id
 }));
 function position(w,depth){
  const descendants=[];
  for(const child of w.children)descendants.push(...position(child,depth+1));
  for(const a of tasks.get(w.id))descendants.push(a.id);
  const coords=descendants.map(id=>taskPositions.get(id)).filter(Boolean);
  const x=coords.length?coords.reduce((s,v)=>s+v.x,0)/coords.length:width/2;
  // Hierarchy grows up the screen toward a non-temporal canopy.
  const y=height-260-depth*125+((drift(w.id)-2)*15);
  const own={id:w.id,label:w.name,x,y,kind:"WBS",depth};
  nodes.push(own);wbsPositions.set(w.id,own);
  for(const child of w.children){
   const point=wbsPositions.get(child.id);branches.push({from:w.id,to:child.id,
    a:{x,y},b:{x:point.x,y:point.y},kind:"WBS_MEMBERSHIP"});
  }
  for(const a of tasks.get(w.id)){
   branches.push({from:w.id,to:a.id,a:{x,y},b:taskPositions.get(a.id),kind:"WBS_MEMBERSHIP"});
  }
  return descendants;
 }
 for(const w of roots)position(w,0);
 for(const w of roots){
  const n=wbsPositions.get(w.id);branches.push({from:"PROJECT",to:w.id,a:root,b:n,kind:"WBS_MEMBERSHIP"});
 }
 const dependencyLines=model.links.map(l=>{
  const from=taskPositions.get(l.from),to=taskPositions.get(l.to);
  if(!from||!to)throw Error("Orphan dependency in skill tree");
  return {from:l.from,to:l.to,a:from,b:to,kind:"DEPENDENCY",type:l.type,lag:l.lag};
 });
 return {
  format:"SKYFORGE_ORGANIC_SKILL_TREE_V1",geometry_basis:"WBS_MEMBERSHIP_NOT_TIME",
  width,height,root,nodes,taskPositions:Object.fromEntries(taskPositions),
  branches,dependencies:dependencyLines,activity_count:leaves.length,wbs_count:byId.size
 };
}
