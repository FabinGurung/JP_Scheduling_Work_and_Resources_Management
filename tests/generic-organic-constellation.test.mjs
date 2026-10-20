import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {layoutOrganicSkillTree} from "../src/presentation/generic-organic-layout.mjs";
const read=p=>JSON.parse(readFileSync(new URL("../"+p,import.meta.url),"utf8"));
const inputs=["community-clinic","pedestrian-bridge"].map(n=>read("machine/generic-projects/"+n+".json"));
test("the constellation uses WBS ancestry and never a time axis or Gantt coordinates",()=>{
 for(const src of inputs){
  const m=projectGenericVisual(src);
  const g=layoutOrganicSkillTree(m);
  assert.equal(g.format,"SKYFORGE_ORGANIC_SKILL_TREE_V1");
  assert.equal(g.geometry_basis,"WBS_MEMBERSHIP_NOT_TIME");
  assert.equal(g.activity_count,m.activities.length);
  assert.equal(g.wbs_count,m.wbs.length);
  assert.equal(g.branches.length,m.activities.length+m.wbs.length);
  assert.equal(g.dependencies.length,m.links.length);
  assert.ok(g.branches.every(x=>x.kind==="WBS_MEMBERSHIP"));
  assert.ok(g.dependencies.every(x=>x.kind==="DEPENDENCY"));
  assert.ok(g.nodes.every(x=>x.y<g.root.y));
  assert.ok(Object.values(g.taskPositions).every(x=>x.y<Math.min(...g.nodes.map(y=>y.y))));
  const changed=structuredClone(m);
  changed.activities.forEach(a=>{a.start+=500;a.finish+=500;a.start_date=null;a.finish_date=null});
  changed.calendar_events=[];
  assert.deepEqual(layoutOrganicSkillTree(changed),g);
  assert.deepEqual(layoutOrganicSkillTree(m),g);
 }
});
test("WBS graph fails on unknown parents, duplicate activities and cycles",()=>{
 const base=projectGenericVisual(inputs[0]);
 const missing=structuredClone(base);missing.wbs[1].parent_id="NO_PARENT";
 assert.throws(()=>layoutOrganicSkillTree(missing),/Missing WBS parent/);
 const duplicate=structuredClone(base);duplicate.activities[0].id=duplicate.activities[1].id;
 assert.throws(()=>layoutOrganicSkillTree(duplicate),/duplicate activity/);
 const cyc=structuredClone(base);cyc.wbs[0].parent_id=cyc.wbs[1].id;
 assert.throws(()=>layoutOrganicSkillTree(cyc),/cycle/i);
});
test("renderer presents organic skill tree separately from unchanged computed Gantt",()=>{
 const js=readFileSync(new URL("../src/presentation/generic-views.mjs",import.meta.url),"utf8");
 const html=readFileSync(new URL("../projects/generic/index.html",import.meta.url),"utf8");
 assert.match(js,/layoutOrganicSkillTree\(model\)/);
 assert.match(js,/const tree=layoutOrganicSkillTree\(model\)/);
 assert.match(js,/const dependencyLines|gv-dependency-lines/);
 assert.match(js,/gv-tree-branches|gv-skill-branches/);
 assert.match(js,/WBS skill tree, not a Gantt chart/);
 assert.match(js,/\/\/ Gantt uses the SAME start\/finish events/);
 assert.match(html,/gv-tree-viewport/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});
