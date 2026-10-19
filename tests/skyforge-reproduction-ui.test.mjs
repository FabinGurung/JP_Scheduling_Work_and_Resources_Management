import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {scheduleNetwork} from "../src/kernel/cpm.mjs";
import {earnedValueMetrics} from "../src/kernel/earned-value.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("homepage true white canvas has unambiguous high-priority overrides",()=>{
 const css=read("assets/site-shell.css"),home=read("index.html");
 assert.match(css,/html,body\.sf-shelled\[data-sf-surface="home"\]\{background:#f6f9fc!important;color:#20384b!important\}/);
 assert.match(css,/\.panel-header h2\{color:#20384b!important\}/);
 assert.match(css,/body\.sf-shelled\[data-sf-surface="home"\] \.view-card strong/);
 assert.match(home,/href="\.\/how\/index\.html"/);
 assert.match(home,/href="\.\/how\/skyforge-anki\.csv"/);
});

test("phone constellation starts zoomed to readable portion and retains full overview",()=>{
 const js=read("src/presentation/narayani-visual.mjs");
 const html=read("projects/narayani/visual.html");
 const css=read("assets/site-shell.css");
 assert.match(js,/function initialGraphViewport/);
 assert.match(js,/w:490,h:690/);
 assert.match(js,/w:1600,h:840/);
 assert.match(js,/function focusGraphOn/);
 assert.match(js,/window\.addEventListener\("resize"/);
 assert.match(html,/id="graph-overview"/);
 assert.match(html,/id="graph-focus"/);
 assert.match(html,/class="graph-mobile-guide"/);
 assert.match(css,/\.graph-mobile-guide\{display:block\}/);
 assert.match(css,/#constellation \.toolbar\{[\s\S]*?display:grid/);
 assert.match(css,/#graph\{height:clamp\(430px,65vh,560px\)/);
});

test("Pip is a small UI-only roaming companion and every tenth hover opens a pet interval",()=>{
 const js=read("assets/site-shell.mjs"),css=read("assets/site-shell.css");
 assert.match(js,/function createPipRoam/);
 assert.match(js,/document\.body\.append\(pip\)/);
 assert.match(js,/encounters%10===0/);
 assert.match(js,/pip\.classList\.add\("sf-pip-pettable"\)/);
 assert.match(js,/petEnd=setTimeout\(endPetWindow,9000\)/);
 assert.match(js,/pip\.addEventListener\("pointerenter"/);
 assert.match(js,/pip\.addEventListener\("pointerdown"/);
 assert.match(js,/pip\.addEventListener\("keydown"/);
 assert.match(js,/window\.addEventListener\("resize"/);
 assert.match(js,/if\(paused\)return/);
 assert.match(css,/\.sf-crawl-runner\.sf-pip-roamer\{/);
 assert.match(css,/position:fixed!important/);
 assert.match(css,/\.sf-pip-roamer\.sf-pip-escape\{transition-duration:1\.7s/);
 assert.match(css,/\.sf-pip-roamer\.sf-pip-pettable/);
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
 assert.doesNotMatch(js,/fetch\s*\(|WebSocket|localStorage|drive\.google\.com|slack\.com/);
});

test("HOW page invokes real CPM and EVM modules on synthetic examples, not invented numerical outputs",()=>{
 const page=read("how/index.html"),docs=read("docs/research/SKYFORGE_REPRODUCIBLE_ENGINE_DOCTRINE_V1.md");
 assert.match(page,/import \{scheduleNetwork\} from "\.\.\/src\/kernel\/cpm\.mjs"/);
 assert.match(page,/import \{earnedValueMetrics\} from "\.\.\/src\/kernel\/earned-value\.mjs"/);
 assert.match(page,/scheduleNetwork\(\{activities:/);
 assert.match(page,/earnedValueMetrics\(\{bac:1000,pv,ev,ac\}\)/);
 assert.match(page,/feature parity/);
 assert.match(page,/not project truth/i);
 for(const principle of ["CPM/PDM","WBS","resource","EVM","source","assumption","approval"]){
  assert.match(docs,new RegExp(principle,"i"),"missing "+principle);
 }
 for(const token of ["ASSUMED_DRAFT","CALCULATED_DRAFT_NOT_BASELINE","source_manifest","release_evidence","src/kernel/cpm.mjs"])
  assert.ok(docs.includes(token),"missing doctrine contract "+token);
 const sched=scheduleNetwork({activities:[{id:"A",duration:2},{id:"B",duration:3},{id:"C",duration:4},{id:"D",duration:2}],
  relationships:[{predecessor:"A",successor:"B",type:"FS"},{predecessor:"A",successor:"C",type:"FS"},{predecessor:"B",successor:"D",type:"FS"},{predecessor:"C",successor:"D",type:"FS"}]});
 assert.equal(sched.project.early_finish,8);
 assert.equal(sched.activities.find(a=>a.id==="B").total_float,1);
 assert.equal(earnedValueMetrics({bac:1000,pv:500,ev:450,ac:480}).spi,.9);
});

test("Anki deck and public Pages allowlist are explicit and source-only/private guards remain",()=>{
 const csv=read("how/skyforge-anki.csv"),build=read("scripts/build-public-site.mjs");
 const lines=csv.trim().split(/\r?\n/);
 assert.equal(lines.length,33);assert.equal(lines[0],"Front,Back");
 assert.match(csv,/100\/100 reproduction/);
 assert.match(build,/"how\/index.html","how\/skyforge-anki.csv"/);
 assert.match(build,/modelBytes\.toString\("utf8"\)\.includes\("drive\.google\.com"\)/);
 assert.match(build,/visualModel\.activities\?\.length!==45/);
 assert.match(build,/visualModel\.links\?\.length!==49/);
 assert.match(build,/visualModel\.activities\.reduce\(\(n,a\)=>n\+a\.checklist\.length,0\)!==405/);
});

test("Pip uses steady speed-controlled zigzag crawling without idle dwell",()=>{
 const js=read("assets/site-shell.mjs"),css=read("assets/site-shell.css");
 assert.match(js,/SLOW_PIP_PIXELS_PER_SECOND=16/);
 assert.match(js,/Math\.hypot\(to\.x-here\.left,to\.y-here\.top\)/);
 assert.match(js,/1000\*distance\/SLOW_PIP_PIXELS_PER_SECOND/);
 assert.match(js,/tick=setTimeout\(\(\)=>\{index=\(index\+1\)%positions\.length;travelTo\(index\)\},duration\)/);
 assert.match(js,/const positions=\[/);
 assert.match(css,/transition-timing-function:linear,linear/);
 assert.doesNotMatch(js,/\},5900\)/);
 assert.doesNotMatch(js,/sf-pip-walk/);
 assert.match(js,/encounters%10===0/);
 assert.match(js,/petEnd=setTimeout\(endPetWindow,9000\)/);
});
