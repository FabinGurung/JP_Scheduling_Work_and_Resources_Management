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

test("level-0 homepage now enters one Studio; original governed Narayani and historic field pages remain",()=>{
 const home=read("index.html"),studio=read("studio/index.html"),legacy=read("more/legacy-home.html");
 assert.match(home,/Level 0/);
 assert.match(home,/Template Engine/);
 assert.match(home,/href="\.\/studio\/"/);
 assert.doesNotMatch(home,/Choose your view|Narayani Parajuli · One shared structured model/);
 assert.match(studio,/Level 1/);
 for(const label of ["Narayani Parajuli","Community Clinic","Pedestrian Footbridge","Resource planner"])
  assert.ok(studio.includes(label),"Missing Studio entry "+label);
 assert.match(read("studio/projects/narayani/index.html"),/projects\/narayani\/visual\.html#constellation/);
 for(const marker of ["milestone-list","phase-list","field-form","Planner / Admin","site-roadmap.mjs"])
  assert.ok(legacy.includes(marker),"Missing archived "+marker);
 assert.match(legacy,/<base href="\.\.\/"/);
});

test("shared Skyforge navigation has four clear destinations and one organized Reference hub",()=>{
 const shell=read("assets/site-shell.mjs"),css=read("assets/site-shell.css"),
  build=read("scripts/build-public-site.mjs"),more=read("more/index.html");
 for(const label of ["Overview","Projects","Studio","Reference"])
  assert.ok(shell.includes(label),"Missing global destination "+label);
 for(const page of ["projects/index.html","studio/index.html","more/index.html"])
  assert.ok(shell.includes(page),"Missing global route "+page);
 assert.doesNotMatch(shell,/More ▾|sf-dropdown-heading|const more=document.createElement/);
 for(const page of ["legacy-home.html","planner.html","kernel-lab.html","machine/index.html","advanced.html","roadmap.html","knowledge/index.html"])
  assert.ok(more.includes(page),"Missing Reference section link "+page);
 assert.match(more,/Learn &amp; references/);
 assert.match(more,/Engineering tools/);
 assert.match(more,/Existing project &amp; sample views/);
 assert.match(shell,/compactWorkspace=pageKey\(\)\.startsWith\("projects\/"\)/);
 assert.match(css,/sf-global/);
 assert.match(css,/prefers-reduced-motion/);
 assert.match(build,/styleAllowlistedPages/);
 assert.match(build,/SKYFORGE SHARED SHELL PASS/);
 const visual=read("src/presentation/narayani-visual.mjs");
 for(const link of ['["gantt","calendar","universe"].includes(requested)','requested==="checklist"','["constellation","universe","gantt","calendar"].includes(target)'])
  assert.ok(visual.includes(link),"Missing preserved Narayani view routing "+link);
});
