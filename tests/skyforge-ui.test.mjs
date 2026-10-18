import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const pages=["advanced.html","planner.html","kernel-lab.html","roadmap.html","knowledge/index.html","knowledge/task.html"];
test("shared light-sky theme is wired into all user-facing pages",()=>{
 const css=read("assets/sky-theme.css");
 assert.match(css,/sky-dragon-flight/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(css,/sky-paused/);
 assert.match(css,/--sky-gold/);
 for(const page of pages){
   const html=read(page);
   assert.match(html,/sky-theme.css/,page);
   assert.match(html,/sky-dragon.mjs/,page);
   assert.match(html,/data-dragon-scene/,page);
 }
});
test("dragon is decorative, repeating and user-pausable",()=>{
 const script=read("assets/sky-dragon.mjs");
 const css=read("assets/sky-theme.css");
 assert.match(script,/aria-hidden="true"/);
 assert.match(script,/storm-dragon/);
 assert.match(script,/data-sky-toggle/);
 assert.match(script,/aria-pressed/);
 assert.match(css,/35s.*infinite/);
 const home=read("advanced.html");
 assert.match(home,/data-sky-toggle/);
});
test("archived advanced dashboard describes kernel and all source references",()=>{
 const home=read("advanced.html");
 const json=JSON.parse(read("UPSTREAM_SOURCES.json"));
 assert.equal(json.sources.length,5);
 for(const src of json.sources)assert.ok(home.includes(src.source),"Missing recorded upstream "+src.id);
 for(const section of ["why","workflow","architecture","inputs","upstream","next","demo"])assert.ok(home.includes('id="'+section+'"'),section);
 for(const term of ["resource leveling","Gantt","synthetic","not","baseline"])assert.ok(home.toLowerCase().includes(term.toLowerCase()),term);
 assert.match(home,/id="ganttBody"/);
 assert.match(home,/id="activityRows"/);
 assert.match(home,/\.\/planner.html/);
 assert.doesNotMatch(home,/>Baseline: BL1<\/button>/);
});
test("planner retains original module and workflow controls",()=>{
 const p=read("planner.html");
 assert.match(p,/planner-ui.mjs/);
 assert.match(p,/id="schedule"/);
 assert.match(p,/id="activities-body"/);
 assert.match(p,/id="gantt"/);
 assert.match(read("src/presentation/planner-ui.mjs"),/calculatePlanner\(model\)/);
});
test("roadmap no longer says multi-activity leveling is next",()=>{
 const r=read("roadmap.html");
 assert.match(r,/SEQ14 Multi-activity serial resource leveling/);
 assert.match(r,/SEQ15 Interactive browser scheduling workspace/);
 assert.doesNotMatch(r,/Multi-activity resource leveling remains the next bounded/);
});

test("decorative animation script parses independently of DOM",()=>{
 execFileSync(process.execPath,["--check",new URL("../assets/sky-dragon.mjs",import.meta.url).pathname]);
});

test("site-engineer homepage is concise; complete historic field roadmap is still retained under More",()=>{
 const home=read("index.html"),legacy=read("more/legacy-home.html");
 assert.match(home,/Mission Control|Construction Mission Control/);
 assert.match(home,/projects\/narayani\/visual\.html#constellation/);
 assert.match(home,/projects\/narayani\/visual\.html#calendar/);
 assert.match(home,/site-shell\.css/);
 assert.doesNotMatch(home,/id="milestone-list"|id="field-form"|kernel-lab\.html/);
 for(const marker of ["milestone-list","phase-list","field-form","Planner / Admin","site-roadmap.mjs"])assert.ok(legacy.includes(marker),"Missing archived "+marker);
 assert.match(legacy,/<base href="\.\.\/"/);
});

test("shared Skyforge galaxy navigation is a single reusable source injected into all allowlisted pages",()=>{
 const shell=read("assets/site-shell.mjs"),css=read("assets/site-shell.css"),build=read("scripts/build-public-site.mjs");
 for(const label of ["Project","Constellation","Gantt","Calendar","Checklist","More ▾"])assert.ok(shell.includes(label),"Missing link "+label);
 for(const page of ["legacy-home.html","planner.html","kernel-lab.html","machine/index.html","advanced.html","roadmap.html","knowledge/index.html"])assert.ok(shell.includes(page),"Missing More entry "+page);
 assert.match(css,/sf-global/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(build,/styleAllowlistedPages/);
 assert.match(build,/SKYFORGE SHARED SHELL PASS/);
 assert.match(build,/more\/legacy-home\.html/);
 const visual=read("src/presentation/narayani-visual.mjs");
 for(const link of ['["gantt","calendar","universe"].includes(requested)','requested==="checklist"','["constellation","universe","gantt","calendar"].includes(target)'])assert.ok(visual.includes(link),"Missing view routing "+link);
});
