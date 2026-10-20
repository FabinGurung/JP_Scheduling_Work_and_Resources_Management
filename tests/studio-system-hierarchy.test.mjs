import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const records=["community-clinic","pedestrian-bridge"];
test("Level 0 leads to one Level 1 Studio which registers all Level 2 project records",()=>{
 const home=read("index.html"),studio=read("studio/index.html"),shell=read("assets/site-shell.mjs");
 assert.match(home,/href="\.\/studio\/"/);
 assert.match(studio,/Level 1/);
 assert.match(studio,/Level 2/);
 for(const name of ["community-clinic","pedestrian-bridge","narayani"]){
  assert.ok(studio.includes('href="./projects/'+name+'/"'));
  assert.ok(shell.includes('studio/projects/'+name+'/index.html'));
 }
 assert.match(shell,/const tabs=\[\["Overview","index.html"\],\["Studio","studio\/index.html"\],\["Projects","studio\/index.html#projects"\]\]/);
});
test("each synthetic project is only a data instance of the exact shared generic-views renderer",()=>{
 const bootstrap=read("src/presentation/studio-project-page.mjs");
 assert.match(bootstrap,/from "\.\/generic-views\.mjs"/);
 assert.match(bootstrap,/validateGenericViewModel\(model\)/);
 assert.match(bootstrap,/renderGenericProject\(model,mount\)/);
 assert.match(bootstrap,/model\.project\.id!==ref\.projectId/);
 assert.match(bootstrap,/model\.classification!=="PUBLIC_SYNTHETIC_DRAFT_ONLY"/);
 for(const name of records){
  const page=read("studio/projects/"+name+"/index.html");
  assert.match(page,/src\/presentation\/studio-project-page\.mjs/);
  assert.match(page,/assets\/studio-project\.css/);
  assert.match(page,/data-studio-project=/);
  assert.doesNotMatch(page,/scheduleProject|calculatePlanner|levelResourceDependentNetwork|scheduleCalendarNetwork/);
  assert.doesNotMatch(page,/docs\.google\.com|drive\.google\.com|SLACK::/);
 }
});
test("existing Narayani field view is linked and preserved without fake adoption",()=>{
 const instance=read("studio/projects/narayani/index.html");
 assert.match(instance,/projects\/narayani\/visual\.html#constellation/);
 assert.match(instance,/not silently reclassified as a synthetic generic/);
 assert.match(instance,/source approval and data-equivalence tests/);
 const builder=read("scripts/build-public-site.mjs");
 for(const name of records.concat("narayani"))assert.ok(builder.includes('"studio/projects/'+name+'/index.html"'));
 assert.match(builder,/"assets\/studio-project\.css"/);
});
