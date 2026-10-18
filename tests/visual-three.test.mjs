import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("real optional Three.js 3D WBS scene is loaded only when selected",()=>{
 const three=read("src/presentation/narayani-three.mjs");
 const view=read("src/presentation/narayani-visual.mjs");
 const html=read("projects/narayani/visual.html");
 assert.match(three,/cdn\.jsdelivr\.net\/npm\/three@0\.180\.0\/build\/three\.module\.js/);
 assert.match(three,/THREE\.WebGLRenderer/);
 assert.match(three,/THREE\.Raycaster/);
 assert.match(three,/meshMap\.set\(a\.id,mesh\)/);
 assert.match(three,/for\(const link of model\.links\)/);
 assert.match(three,/source|source|preview/);
 assert.match(three,/onSelect\(hit\.object\.userData\.activityId\)/);
 assert.match(three,/renderer\.dispose\(\)/);
 assert.match(view,/await import\("\.\/narayani-three\.mjs"\)/);
 assert.match(view,/tab\("constellation"\)/);
 assert.match(html,/data-view="universe"/);
 assert.match(html,/id="three-scene"/);
 assert.match(html,/id="three-status"/);
 assert.doesNotMatch(html,/building model approved|engineering accepted/i);
 execFileSync(process.execPath,["--check",new URL("../src/presentation/narayani-three.mjs",import.meta.url).pathname]);
});
test("activity hierarchy stays one model and UI reports are never mistaken for acceptance",()=>{
 const ui=read("src/presentation/narayani-visual.mjs");
 assert.match(ui,/status\(a\)==="reported"/); // MCQ latest state affects Gantt, not only diary
 assert.match(ui,/What this work feeds into/);
 assert.match(ui,/not authorized to start/);
 assert.match(ui,/question-group/);
 for(const category of ["Before starting","Prepare the crew","Execute the work","Inspect & hand over"])assert.ok(ui.includes(category));
 assert.match(ui,/threeSession\?\.select\(id\)/);
 assert.match(ui,/threeSession\?\.preview\(previewSlot\)/);
 assert.doesNotMatch(ui,/fetch\([^)]*private/i);
});
test("root route is not inferred from any nested directory index",()=>{
 const shell=read("assets/site-shell.mjs");
 assert.match(shell,/path===base\.pathname/);
 assert.match(shell,/path===base\.pathname\+"index\.html"/);
 assert.doesNotMatch(shell,/path\.endsWith\("\/"\)\|\|/);
});
