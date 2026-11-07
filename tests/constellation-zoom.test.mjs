import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 clampConstellationZoom,fitConstellationZoom,zoomConstellationAt,
 MIN_CONSTELLATION_ZOOM,MAX_CONSTELLATION_ZOOM
} from "../src/presentation/constellation-zoom.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("D1 anchored zoom keeps the same world point under the tap or pointer",()=>{
 const v=zoomConstellationAt({
  oldZoom:1,nextZoom:2,scrollLeft:200,scrollTop:100,
  viewportWidth:300,viewportHeight:240,worldWidth:1800,worldHeight:1200,
  anchorX:100,anchorY:80
 });
 assert.equal(v.zoom,2);
 assert.equal(v.scrollLeft,500); // (200+100)*2-100
 assert.equal(v.scrollTop,280); // (100+80)*2-80
 const back=zoomConstellationAt({
  oldZoom:v.zoom,nextZoom:1,scrollLeft:v.scrollLeft,scrollTop:v.scrollTop,
  viewportWidth:300,viewportHeight:240,worldWidth:1800,worldHeight:1200,
  anchorX:100,anchorY:80
 });
 assert.equal(back.scrollLeft,200);
 assert.equal(back.scrollTop,100);
});
test("D1 fit supports 45-task wide projects without fake source geometry changes",()=>{
 const zoom=fitConstellationZoom(9520,830,375,530);
 assert.ok(zoom<0.08);
 assert.ok(zoom>=MIN_CONSTELLATION_ZOOM);
 assert.equal(clampConstellationZoom(100),MAX_CONSTELLATION_ZOOM);
 assert.equal(clampConstellationZoom(.001),MIN_CONSTELLATION_ZOOM);
 assert.throws(()=>clampConstellationZoom(0),/positive/);
 assert.throws(()=>fitConstellationZoom(0,100,320,480),/geometry/);
});
test("D1 zoom clamps scroll and rejects malformed viewport arithmetic",()=>{
 const v=zoomConstellationAt({
  oldZoom:1,nextZoom:.05,scrollLeft:2000,scrollTop:2000,
  viewportWidth:320,viewportHeight:420,worldWidth:2000,worldHeight:1000
 });
 assert.equal(v.scrollLeft,0);
 assert.equal(v.scrollTop,0);
 assert.throws(()=>zoomConstellationAt({
  oldZoom:0,nextZoom:1,scrollLeft:0,scrollTop:0,
  viewportWidth:320,viewportHeight:420,worldWidth:2000,worldHeight:1000
 }),/Invalid Constellation viewport/);
});
test("D1 all four read-only project viewers share accessible zoom, with phone pinch and keyboard buttons",()=>{
 const js=read("src/presentation/generic-views.mjs");
 const css=read("assets/studio-project.css");
 const docs=read("docs/PHASE2_AI_REVISION_AND_DEVICE_QA_20261107.md");
 assert.match(js,/clampConstellationZoom|fitConstellationZoom/);
 assert.match(js,/zoomConstellationAt/);
 assert.match(js,/stage\.setAttribute\("width"/);
 assert.match(js,/stage\.setAttribute\("height"/);
 assert.match(js,/p\.x\*zoom/);
 assert.match(js,/p\.y\*zoom/);
 assert.match(js,/touchstart/);
 assert.match(js,/touchmove/);
 assert.match(js,/passive:false/);
 assert.match(js,/touches\.length!==2/);
 assert.match(js,/zoomFit\.addEventListener/);
 assert.match(js,/zoomReset\.addEventListener/);
 assert.match(js,/zoomValue\.setAttribute\("aria-live","polite"\)/);
 assert.match(js,/zoomOut\.setAttribute\("aria-label"/);
 assert.match(js,/zoomIn\.setAttribute\("aria-label"/);
 assert.match(js,/zoomControls/);
 assert.match(css,/\.gv-zoom-controls/);
 assert.match(css,/min-height:44px/);
 assert.match(css,/touch-action:manipulation/);
 assert.match(docs,/not equivalent to a real phone test/i);
 assert.doesNotMatch(js,/saveApprovedBaseline|updateFile\(|localStorage|method:"POST"/);
 for(const slug of ["community-clinic","pedestrian-bridge","uploaded-wbs","narayani"]){
  const p=read("projects/"+slug+"/"+(slug==="narayani"?"beta.html":"index.html"));
  assert.match(p,/studio-project\.css/);
  assert.match(p,/studio-project-page\.mjs/);
 }
});
