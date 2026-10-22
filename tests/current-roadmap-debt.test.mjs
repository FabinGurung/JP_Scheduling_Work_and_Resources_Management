import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("primary public roadmap reports current Level-1 sisters, project beta, explicit debt and source guard",()=>{
 const page=read("roadmap.html");
 assert.match(page,/Live roadmap · 22 October 2026/);
 assert.match(page,/Studio and Projects/);
 assert.match(page,/four project records/i);
 for(const label of ["D1 · Mobile","D2 · AI change","D3 · Governed",
 "D4 · Accurate dates","D5 · Excel","D6 · Real project"])
  assert.ok(page.includes(label),"Debt item missing "+label);
 for(const path of ["./projects/narayani/beta.html","./projects/uploaded-wbs/",
  "./projects/community-clinic/","./projects/pedestrian-bridge/","./studio/"])
  assert.ok(page.includes(path),"Roadmap route missing "+path);
 assert.match(page,/No approved construction baseline|approved construction|approved completion/i);
 assert.match(page,/<details class="sf-rm-archive">/);
 assert.match(page,/SEQ14 Multi-activity serial resource leveling/);
});
test("offline AI draft validation remains available but published renderer offers labels only",()=>{
 const ui=read("src/presentation/project-beta-workspace.mjs");
 assert.match(ui,/parseNominalDuration\(fields\.duration\.value\)/);
 assert.match(ui,/initialScroll:previousScroll/);
 assert.match(ui,/source checklist reports and date projections are not carried/);
 assert.match(ui,/const scenarioWarning=/);
 assert.match(ui,/scenarioWarning\.hidden=!dirty/);
 const renderer=read("src/presentation/generic-views.mjs");
 assert.match(renderer,/gv-inspector-bubble/);
 assert.match(renderer,/gv-dependency-hit/);
 assert.doesNotMatch(renderer,/onNodeMoved|setPointerCapture/);
 assert.match(read("src/presentation/studio-project-page.mjs"),/renderGenericProject\(model,mount\)/);
});
