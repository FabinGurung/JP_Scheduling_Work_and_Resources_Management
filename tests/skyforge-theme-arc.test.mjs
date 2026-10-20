import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

const expected=[
 ["index.html","home"],["planner.html","planner"],["kernel-lab.html","kernel"],
 ["advanced.html","advanced"],["roadmap.html","roadmap"],
 ["projects/narayani/index.html","narayani-index"],
 ["projects/narayani/visual.html","narayani-visual"],
 ["projects/generic/index.html","generic"],["work-items/index.html","work-items"],
 ["projects/index.html","projects"],["projects/community-clinic/index.html","projects-clinic"],
 ["projects/pedestrian-bridge/index.html","projects-bridge"],
 ["studio/index.html","studio"],["studio/projects/narayani/index.html","studio-narayani"],
 ["studio/projects/community-clinic/index.html","studio-clinic"],["studio/projects/pedestrian-bridge/index.html","studio-bridge"],
 ["machine/index.html","machine"],["machine/demo-foundation/index.html","machine-demo"],["machine/wbs-sample/index.html","wbs-machine"],
 ["knowledge/index.html","knowledge"],["knowledge/task.html","task"],
 ["more/legacy-home.html","legacy"],["how/index.html","how"]
];
test("every live nonredirect workspace has an exact theme and source-context profile",()=>{
 const js=read("assets/site-shell.mjs");
 for(const [path,id] of expected){
  assert.ok(js.includes('"'+path+'":{id:"'+id+'"'),"missing theme and orientation mapping "+path);
 }
 assert.match(js,/document\.body\.dataset\.sfPage=profile\?\.id\|\|"other"/);
 assert.match(js,/mountContextGuide\(profile\)/);
 assert.match(js,/if\(document\.querySelector\("\.sf-page-guide"\)\)return/);
 assert.match(js,/profile\.rule/);
 assert.match(js,/a\.href=address\(profile\.next\[1\]\)/);
 assert.doesNotMatch(js,/drive\.google\.com|docs\.google\.com|slack\.com\/archives/);
});

test("public builder ships canonical skin LAST on all 23 nonredirect HTML files",()=>{
 const build=read("scripts/build-public-site.mjs");
 assert.match(build,/"assets\/skyforge-unified\.css"/);
 assert.match(build,/if\(!markup\.includes\("skyforge-unified\.css"\)\)/);
 assert.match(build,/markup=markup\.replace\(\/<\\\/head>\/i,unified\+"<\/head>"\)/);
 assert.match(build,/await styleAllowlistedPages\(\)/);
 assert.match(build,/if\(\/http-equiv=\["'\]refresh\/i\.test\(markup\)\)continue/);
 assert.match(build,/modelBytes\.toString\("utf8"\)\.includes\("drive\.google\.com"\)/);
 assert.match(build,/visualModel\.activities\?\.length!==45/);
 assert.match(build,/visualModel\.links\?\.length!==49/);
 assert.match(build,/checklist\.length,0\)!==405/);
});

test("unified design tokens avoid unrelated geometry or engineering state changes",()=>{
 const css=read("assets/skyforge-unified.css");
 for(const token of ["--sf-canvas:#f5f8fb","--sf-paper:#ffffff","--sf-ink:#203b4f","--sf-teal:#147e83","--sf-border:#d7e6ec"])
  assert.ok(css.includes(token),"missing brand token "+token);
 for(const id of ["planner","kernel","advanced","roadmap","narayani-index","narayani-visual","machine","knowledge","task","legacy","how"])
  assert.ok(css.includes('data-sf-page="'+id+'"'),"no scoped skin for "+id);
 assert.match(css,/\.sf-page-guide\{/);
 assert.match(css,/@media\(max-width:900px\)/);
 assert.match(css,/@media\(max-width:640px\)/);
 assert.match(css,/prefers-reduced-motion:reduce/);
 assert.doesNotMatch(css,/\.graph-node.*display:none|\.gantt-row.*display:none|\.day-label.*display:none/);
});

test("Pip walker source and the immutable project scheduling contract are unaffected",()=>{
 const shell=read("assets/site-shell.mjs"),model=read("src/visual/project-model.mjs");
 assert.match(shell,/SLOW_PIP_PIXELS_PER_SECOND=16/);
 assert.match(shell,/encounters%10===0/);
 assert.match(shell,/petEnd=setTimeout\(endPetWindow,9000\)/);
 assert.match(model,/NO_APPROVED_ACTIVITY_COMPLETION/);
 assert.match(model,/PRIVATE_PROJECT_FILE_INDEX/);
 const pkg=JSON.parse(read("package.json"));
 assert.ok(pkg.scripts["verify:calendar"],"calendar verification script must be retained");
 assert.ok(pkg.scripts["visual:verify"],"canonical visual verification must be retained");
});
