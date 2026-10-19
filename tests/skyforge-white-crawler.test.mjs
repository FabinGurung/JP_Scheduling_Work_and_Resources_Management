import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("original Pip crawler stays inside global header timeline, not application data",()=>{
 const script=read("assets/site-shell.mjs");
 const css=read("assets/site-shell.css");
 assert.match(script,/sf-crawl-rail/);
 assert.match(script,/sf-crawl-runner/);
 assert.match(script,/class="sf-pip"/);
 assert.match(script,/sf-pip-foot-a/);
 assert.match(script,/for\(let i=0;i<7;i\+\+\)/);
 assert.match(script,/rail\.setAttribute\("aria-hidden","true"\)/);
 assert.match(script,/header\.append\(rail\)/);
 assert.match(script,/animation/); // CSS controls physical crawling without JS frame loops.
 assert.match(css,/@keyframes sf-pip-walk/);
 assert.match(css,/animation:sf-pip-walk 33s linear infinite alternate/);
 assert.match(css,/sf-crawl-rail\{height:51px/);
 assert.match(css,/pointer-events:none/);
 assert.match(css,/@keyframes sf-pip-inch/);
 assert.match(css,/@keyframes sf-pip-feet/);
 assert.doesNotMatch(script,/fetch\s*\(|localStorage|setInterval\s*\(|requestAnimationFrame\s*\(/);
 assert.doesNotMatch(script,/drive\.google\.com|slack\.com\/archives|docs\.google\.com/);
});

test("Pip movement toggles correctly and reduced-motion disables the control",()=>{
 const script=read("assets/site-shell.mjs"),css=read("assets/site-shell.css");
 assert.match(script,/motion\.addEventListener\("click"/);
 assert.match(script,/aria-pressed/);
 assert.match(script,/prefers-reduced-motion: reduce/);
 assert.match(script,/motion\.disabled=true/);
 assert.match(css,/sf-crawl-paused/);
 assert.match(css,/animation-play-state:paused!important/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.match(css,/\.sf-crawl-runner,\.sf-pip-squish,\.sf-pip-foot-a,\.sf-pip-foot-b\{animation:none!important/);
});

test("home and Narayani views use consistent white styling after old inline styles",()=>{
 const shell=read("assets/site-shell.css"),home=read("index.html"),visual=read("projects/narayani/visual.html");
 assert.match(shell,/--sf-paper:#ffffff/);
 assert.match(shell,/--sf-canvas:#f6f9fc/);
 assert.match(shell,/body\.sf-shelled\[data-sf-surface="home"\]/);
 assert.match(shell,/body\.sf-shelled\[data-sf-surface="visual"\]/);
 assert.match(shell,/\.graph-node \.label\{fill:#173a4f/);
 assert.match(shell,/\.gantt-track\{background:repeating-linear-gradient/);
 assert.match(shell,/\.day\{background:#f5f9fc/);
 assert.match(shell,/\.drawer\{background:#fff/);
 assert.ok(home.indexOf('assets/site-shell.css')>home.indexOf("</style>"));
 assert.ok(visual.indexOf('assets/site-shell.css')>visual.indexOf("</style>"));
 assert.match(home,/theme-color" content="#f6f9fc"/);
 assert.match(visual,/theme-color" content="#f6f9fc"/);
 assert.match(visual,/id="graph"/);
 assert.match(visual,/id="calendar-months"/);
 assert.match(visual,/id="gantt-scroll"/);
 assert.match(visual,/id="checklist"/);
 assert.match(read("src/presentation/narayani-three.mjs"),/scene\.background=new THREE\.Color\(0xf0f8fc\)/);
 assert.match(read("assets/sky-theme.css"),/\.storm-art,\.storm-dragon,\.storm-cloud\{display:none!important\}/);
});

test("light theme must not change the JSON safety gates or static Pages allowlist",()=>{
 const builder=read("scripts/build-public-site.mjs");
 const model=read("src/visual/project-model.mjs");
 const shell=read("assets/site-shell.mjs");
 assert.match(builder,/const approved=\[/);
 assert.match(builder,/assets\/site-shell\.mjs/);
 assert.match(builder,/assets\/site-shell\.css/);
 assert.match(builder,/visualModel\.activities\?\.length!==45/);
 assert.match(builder,/visualModel\.links\?\.length!==49/);
 assert.match(builder,/checklist\.length,0\)!==405/);
 assert.match(builder,/visualModel\.project\?\.baseline_approved!==false/);
 assert.match(model,/NO_APPROVED_ACTIVITY_COMPLETION/);
 assert.match(model,/PRIVATE_PROJECT_FILE_INDEX/);
 assert.match(shell,/Site engineer views/);
 assert.match(shell,/Planner & engineering tools/);
 assert.doesNotMatch(shell,/status\(a\)|model\.activities|engineering_release=true/);
});
