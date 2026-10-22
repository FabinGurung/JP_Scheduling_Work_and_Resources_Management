import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
import {adaptNarayaniPublicModel} from "../src/presentation/narayani-beta-adapter.mjs";
import {parseNominalDuration} from "../src/presentation/project-beta-workspace.mjs";
import {makeBetaDraftSpec,assertBetaDraft,changeBetaDraft,recalculateBetaDraft,betaExportPackage,restoreBetaPackage} from "../src/presentation/beta-draft.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const fixture=JSON.parse(read("machine/generic-projects/community-clinic.json"));
const orig=()=>projectGenericVisual(fixture);
test("shared beta editing revises calculated Gantt/network without touching the original published source",()=>{
 const base=orig(),source=JSON.stringify(base);
 const spec=makeBetaDraftSpec(base);
 assert.equal(assertBetaDraft(spec),true);
 const updated=changeBetaDraft(spec,{kind:"UPDATE_ACTIVITY",id:spec.activities[0].id,
  duration:spec.activities[0].duration+4,name:"Revised local task",wbs_id:spec.activities[0].wbs_id});
 const view=recalculateBetaDraft(updated);
 assert.equal(view.activities[0].duration,base.activities[0].duration+4);
 assert.equal(view.activities[0].title,"Revised local task");
 assert.equal(view.classification,"LOCAL_UNVERIFIED_DRAFT_ONLY");
 assert.equal(view.engineering_release,false);
 assert.equal(view.baseline_approved,false);
 assert.equal(JSON.stringify(base),source);
 assert.equal(spec.activities[0].duration,base.activities[0].duration);
 assert.equal(view.links.length,base.links.length);
});
test("activity add, source-bound link edits and deletion are all recalculated",()=>{
 const base=orig();
 let spec=makeBetaDraftSpec(base);
 spec=changeBetaDraft(spec,{kind:"ADD_ACTIVITY",activity:{id:"TEST_ADD",name:"New draft task",duration:3,
  wbs_id:spec.wbs[0].wbs_id}});
 assert.equal(spec.activities.length,base.activities.length+1);
 const from=base.activities[0].id;
 spec=changeBetaDraft(spec,{kind:"ADD_LINK",from,to:"TEST_ADD",type:"FS",lag:0});
 assert.ok(spec.relationships.some(r=>r.predecessor===from&&r.successor==="TEST_ADD"));
 assert.equal(recalculateBetaDraft(spec).activities.length,base.activities.length+1);
 spec=changeBetaDraft(spec,{kind:"REMOVE_LINK",from,to:"TEST_ADD",type:"FS",lag:0});
 spec=changeBetaDraft(spec,{kind:"REMOVE_ACTIVITY",id:"TEST_ADD"});
 assert.equal(recalculateBetaDraft(spec).activities.length,base.activities.length);
});
test("beta rejects cyclic dependencies, invalid WBS, duplicate links and unsupported source changes",()=>{
 const base=orig(),spec=makeBetaDraftSpec(base);
 assert.throws(()=>changeBetaDraft(spec,{kind:"ADD_ACTIVITY",activity:{id:spec.activities[0].id,name:"Duplicated",wbs_id:spec.wbs[0].wbs_id,duration:2}}),/Activity/);
 assert.throws(()=>changeBetaDraft(spec,{kind:"ADD_ACTIVITY",activity:{id:"Q100",name:"Bad WBS",wbs_id:"UNKNOWN",duration:2}}),/Activity/);
 const first=spec.relationships[0];
 assert.throws(()=>changeBetaDraft(spec,{kind:"ADD_LINK",from:first.predecessor,to:first.successor,type:first.type,lag:first.lag}),/Duplicate/);
 const modified=structuredClone(spec);modified.wbs[0].parent_wbs_id=modified.wbs[1].wbs_id;
 modified.wbs[1].parent_wbs_id=modified.wbs[0].wbs_id;
 assert.throws(()=>assertBetaDraft(modified),/cycle/);
 const sourceIds=new Set(spec.activities.map(x=>x.id));
 const outgoing=new Set(spec.relationships.map(r=>r.predecessor));
 // A new circular link always fails for an existing path.
 const x=spec.relationships.find(r=>r.predecessor!==r.successor);
 assert.throws(()=>changeBetaDraft(spec,{kind:"ADD_LINK",from:x.successor,to:x.predecessor,type:"FS",lag:0}),/cycle/);
});
test("beta packages are source-bound unapproved downloads, not automatic saves",()=>{
 const base=orig(),spec=makeBetaDraftSpec(base),a=spec.activities[0].id;
 const pkg=betaExportPackage({original:base,draft:spec,positions:{[a]:{x:140,y:370}},revision:4});
 assert.equal(pkg.format,"SKYFORGE_BETA_DRAFT_PACKAGE_V1");
 assert.equal(pkg.authority,"UNVERIFIED_LOCAL_DOWNLOAD_ONLY");
 assert.equal(pkg.baseline_approved,false);
 assert.equal(restoreBetaPackage(pkg,base).revision,4);
 const tampered=structuredClone(pkg);tampered.base_input_sha256="0".repeat(64);
 assert.throws(()=>restoreBetaPackage(tampered,base),/source identity/);
 const unauthorized=structuredClone(pkg);unauthorized.engineering_release=true;
 assert.throws(()=>restoreBetaPackage(unauthorized,base),/approval/);
 assert.throws(()=>betaExportPackage({original:base,draft:spec,positions:{[a]:{x:Infinity,y:2}}}),/Bad saved node position/);
});
test("Narayani's 405 reported check states remain read-only, while public scenario adapts to same four-view editor",()=>{
 const seed=JSON.parse(read("machine/source-snapshots/wbs_schedule_sample/schedule_seed.json"));
 const phaseCodes=[...new Set(seed.tasks.map(t=>t.wbs_code))];
 const phases=phaseCodes.map(code=>({id:code,title:"Phase "+code}));
 const starts=new Map(seed.tasks.map((t,i)=>[t.task_id,i]));
 const activities=seed.tasks.map((t,i)=>({
  id:t.task_id,title:t.name,phase_id:t.wbs_code,master_work_slots:t.duration_days,
  master_start_slot:i*3,master_finish_exclusive_slot:i*3+t.duration_days,
  scenario_start:"2026-10-20",scenario_finish:"2026-10-21",
  status:"UNVERIFIED",checklist:Array.from({length:9},(_,j)=>({id:t.task_id+"-C"+j,
   title:"Unverified report "+j,status:j===0?"REPORTED_DONE":"NOT_REPORTED"}))
 }));
 const source={format:"PCK_CONSTRUCTION_VIEW_MODEL_V1",classification:"PUBLIC_SAFE_PLANNING_SCENARIO",
  project:{id:"PRJ-000007",title:"Narayani Parajuli",baseline_approved:false},
  planning_scenario:{start_date:"2026-10-20",approved_dates:false},
  mcq_summary:{authority:"REPORTED_ONLY"},phases,activities,
  links:seed.tasks.flatMap(t=>t.predecessors.map(p=>({from:p.id,to:t.task_id,actual_release:false}))),
  milestones:seed.tasks.filter(t=>t.type==="Milestone").map(t=>({id:t.task_id}))
 };
 const model=adaptNarayaniPublicModel(source);
 assert.equal(model.activities.length,45);
 assert.equal(model.checklist.length,405);
 assert.equal(model.links.length,49);
 assert.equal(model.classification,"PUBLIC_SAFE_GOVERNED_SCENARIO");
 assert.equal(validateGenericViewModel(model),true);
 assert.ok(model.checklist.some(q=>q.status==="REPORTED_DONE"&&q.authority==="PUBLIC_SAFE_REPORTED_ONLY"));
 const spec=makeBetaDraftSpec(model);
 assert.equal(spec.checklist.length,0);
 assert.equal(spec.source_manifest[0].authority,"UNVERIFIED_SOURCE");
 const beta=recalculateBetaDraft(spec);
 assert.equal(beta.classification,"LOCAL_UNVERIFIED_DRAFT_ONLY");
 assert.equal(beta.baseline_approved,false);
 assert.equal(beta.checklist.length,0);
 assert.equal(model.checklist.length,405);
});
test("four canonical project records share the read-only engine; internal source draft validator remains offline",()=>{
 const boot=read("src/presentation/studio-project-page.mjs"),
  editor=read("src/presentation/project-beta-workspace.mjs"),
  viewer=read("src/presentation/generic-views.mjs"),
  index=read("projects/index.html"),
  builder=read("scripts/build-public-site.mjs");
 for(const [slug,path] of [
  ["community-clinic","projects/community-clinic/index.html"],
  ["pedestrian-bridge","projects/pedestrian-bridge/index.html"],
  ["uploaded-wbs","projects/uploaded-wbs/index.html"],
  ["narayani","projects/narayani/beta.html"]]){
  const page=read(path);
  assert.ok(page.includes('data-studio-project="'+slug+'"'));
  assert.match(page,/src\/presentation\/studio-project-page\.mjs/);
  assert.match(page,/studio-project\.css/);
  assert.ok(boot.includes('"'+slug+'":'));
 }
 assert.match(boot,/renderGenericProject\(model,mount\)/);
 assert.doesNotMatch(boot,/mountBetaWorkspace|project-beta-workspace/);
 assert.match(boot,/adaptNarayaniPublicModel\(published\)/);
 assert.match(editor,/changeBetaDraft/);
 assert.match(editor,/recalculateBetaDraft/);
 assert.match(editor,/Download versioned draft/);
 assert.match(viewer,/pointermove/);
 assert.match(viewer,/gv-inspector-bubble/);
 assert.match(viewer,/gv-dependency-hit/);
 assert.doesNotMatch(viewer,/onNodeMoved|draggable\(/);
 assert.match(index,/href="\.\/narayani\/beta\.html"/);
 assert.match(builder,/"projects\/narayani\/beta\.html"/);
 assert.match(read("projects/narayani/visual.html"),/id="graph"|id=\\"graph\\"/);
});

test("blank/invalid duration is blocked, never silently converted into a milestone",()=>{
 for(const x of ["","  ","-1","3.25","2e1","1.0","NaN","Infinity","abc"])
  assert.throws(()=>parseNominalDuration(x),/duration|Duration/);
 assert.equal(parseNominalDuration("0"),0);
 assert.equal(parseNominalDuration("25"),25);
 assert.equal(parseNominalDuration(" 250 "),250);
 assert.throws(()=>parseNominalDuration("99999999999999999999999999"),/safe integer/);
});
test("all four project editor rerenders preserve constellation position and show scenario-loss warning",()=>{
 const viewer=read("src/presentation/generic-views.mjs"),
  editor=read("src/presentation/project-beta-workspace.mjs"),
  style=read("assets/studio-project.css");
 assert.match(editor,/initialScroll:previousScroll/);
 assert.match(viewer,/scroll\.scrollLeft=Math\.max\(0,options\.initialScroll\.left\)/);
 assert.match(viewer,/scroll\.scrollTop=Math\.max\(0,options\.initialScroll\.top\)/);
 assert.match(editor,/parseNominalDuration\(fields\.duration\.value\)/);
 assert.match(editor,/source checklist reports and date projections/);
 assert.match(style,/\.sf-beta-scenario-warning\[hidden\]/);
});
