import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const records=["community-clinic","pedestrian-bridge"];
test("Level 0 links Studio and Projects as sibling Level-1 departments, records are Level 2",()=>{
 const home=read("index.html"),studio=read("studio/index.html"),projects=read("projects/index.html"),shell=read("assets/site-shell.mjs");
 assert.match(home,/href="\.\/studio\/"/);
 assert.match(studio,/Level 1/);
 assert.match(projects,/Level 1 \/ Projects/);
 assert.match(projects,/Level 2/);
 assert.match(home,/href="\.\/projects\/"/);
 assert.match(studio,/href="\.\.\/projects\/"/);
 for(const name of ["community-clinic","pedestrian-bridge","narayani"]){
  assert.ok(projects.includes('href="./'+name+(name==="narayani"?'/beta.html':'/')+'"'));
  assert.ok(studio.includes('href="../projects/'+name+(name==="narayani"?'/beta.html':'/')+'"'));
  assert.ok(shell.includes('studio/projects/'+name+'/index.html'));
 }
 assert.match(shell,/const tabs=\[\["Overview","index.html"\],\["Studio","studio\/index.html"\],\["Projects","projects\/index.html"\]\]/);
});
test("each synthetic project is only a data instance of the exact shared generic-views renderer",()=>{
 const bootstrap=read("src/presentation/studio-project-page.mjs");
 assert.match(bootstrap,/from "\.\/generic-views\.mjs"/);
 assert.match(bootstrap,/validateGenericViewModel\(model\)/);
 assert.match(bootstrap,/mountBetaWorkspace\(model,mount\)/);
 assert.match(bootstrap,/adaptNarayaniPublicModel\(published\)/);
 assert.match(bootstrap,/model\.project\.id!==ref\.projectId/);
 assert.match(bootstrap,/model\.classification!==\(ref\.governed\?/);
 for(const name of records){
  const page=read("projects/"+name+"/index.html");
  assert.match(page,/src\/presentation\/studio-project-page\.mjs/);
  assert.match(page,/assets\/studio-project\.css/);
  assert.match(page,/data-studio-project=/);
  assert.doesNotMatch(page,/scheduleProject|calculatePlanner|levelResourceDependentNetwork|scheduleCalendarNetwork/);
  assert.doesNotMatch(page,/docs\.google\.com|drive\.google\.com|SLACK::/);
 }
});
test("existing Narayani field view is linked and preserved without fake adoption",()=>{
 const instance=read("studio/projects/narayani/index.html"),canonical=read("projects/narayani/index.html");
 assert.match(instance,/projects\/narayani\/visual\.html#constellation/);
 assert.match(instance,/not silently reclassified as a synthetic generic/);
 assert.match(instance,/source approval and data-equivalence tests/);
 assert.match(canonical,/Narayani|PRJ-000007/);
 const builder=read("scripts/build-public-site.mjs");
 for(const name of records.concat("narayani"))assert.ok(builder.includes('"studio/projects/'+name+'/index.html"'));
 for(const name of records)assert.ok(builder.includes('"projects/'+name+'/index.html"'));
 assert.match(builder,/"projects\/index.html"/);
 assert.match(builder,/"assets\/studio-project\.css"/);
});

test("existing interactive Narayani constellation tools survive the navigation-only hierarchy update",()=>{
 const js=read("src/presentation/narayani-visual.mjs"),html=read("projects/narayani/visual.html");
 for(const id of ["zoom-in","zoom-out","reset-view","graph-overview","graph-focus","phase-picker","activity-search","scenario-start","timeline-position","reset-3d"])
   assert.ok(html.includes('id="'+id+'"'),"Lost project interaction "+id);
 for(const action of ["renderGraph()","focusGraphOn(","setViewport()","pointermove","zoom-in","phase-picker","activity-search"])
   assert.ok(js.includes(action),"Lost functionality "+action);
 const viewer=read("src/presentation/generic-views.mjs");
 assert.match(viewer,/ONE_CANONICAL_COMPUTED_MODEL_NO_AUTO_APPROVAL/);
 assert.doesNotMatch(viewer,/updateFile\(|saveApprovedBaseline\(/);
});
