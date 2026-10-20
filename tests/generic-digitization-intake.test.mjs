import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {sha256Hex} from "../src/kernel/sha256.mjs";
import {parseDelimited,digitizeGenericTable} from "../src/kernel/generic-digitizer.mjs";
import {compileProjectDraft} from "../src/kernel/project-template.mjs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {validateGenericViewModel} from "../src/presentation/generic-views.mjs";
const fixture=[
 "activity_id,activity_name,wbs_id,wbs_name,parent_wbs_id,duration_slots,predecessors,work_quantity,work_unit",
 "ACT1,\"Layout, benchmark\",SITE,Site survey,,2,,,",
 "ACT2,Excavate,FOUND,Foundations,SITE,3,ACT1:FS:0,11.5,m3",
 "ACT3,PCC,FOUND,Foundations,SITE,2,ACT2:FS:0,2,m3",
 "ACT4,Finish,SITE,Site survey,,1,ACT3:FS:1,,"
].join("\n")+"\n";
const digitize=(text=fixture)=>digitizeGenericTable({text,format:"CSV",project_id:"LOCAL_TEST",project_name:"Clinic mock",source_name:"clinic.csv"});
test("portable SHA-256 equals Node crypto for UTF-8 and byte arrays",()=>{
 for(const value of ["","abc","Skyforge construction\n","पोखरा WBS नाप",JSON.stringify({data:Array.from({length:80},(_,i)=>i)})]){
  assert.equal(sha256Hex(value),createHash("sha256").update(value).digest("hex"));
  const b=new TextEncoder().encode(value);
  assert.equal(sha256Hex(b),createHash("sha256").update(b).digest("hex"));
 }
});
test("unverified CSV becomes a deterministic four-view model with exact source WBS and quantities",()=>{
 const d=digitize();
 assert.equal(d.source_sha256,sha256Hex(fixture));
 assert.equal(d.planning_status,"UNVERIFIED_LOCAL_DRAFT");
 assert.equal(d.project.source_manifest[0].authority,"UNVERIFIED_SOURCE");
 assert.equal(d.project.wbs.length,2);
 assert.equal(d.project.activities.length,4);
 assert.equal(d.project.activities[1].work_quantity,11.5);
 assert.equal(d.project.relationships[2].lag,1);
 assert.ok(d.project.activities.every(x=>x.duration_basis==="ASSUMED_DRAFT"));
 assert.equal(compileProjectDraft(d.project).planning_status,"CALCULATED_WITH_EXPLICIT_ASSUMPTIONS");
 const m=projectGenericVisual(d.project);
 assert.equal(validateGenericViewModel(m),true);
 assert.equal(m.classification,"LOCAL_UNVERIFIED_DRAFT_ONLY");
 assert.equal(m.baseline_approved,false);
 assert.equal(m.calendar_events.length,0);
 assert.equal(m.checklist.length,0);
 assert.deepEqual(m,projectGenericVisual(d.project));
});
test("strict CSV importer fails on malformed sources and typed relationship errors",()=>{
 assert.throws(()=>parseDelimited('a,b\n"not closed,1',","),/Unclosed/);
 assert.throws(()=>parseDelimited("a,b\na,1,2",","),/fields/);
 assert.throws(()=>digitize(fixture.replace("ACT2:FS:0","UNKNOWN:FS:0")),/Unknown predecessor/);
 assert.throws(()=>digitize(fixture.replace("ACT2:FS:0","ACT2:FS")),/grammar/);
 assert.throws(()=>digitize(fixture.replace("ACT3,PCC,FOUND,Foundations","ACT3,PCC,FOUND,Wrong")),/Conflicting WBS/);
 const gap=digitize(fixture.replace("SITE,Site survey,,2","SITE,Site survey,,"));
 assert.equal(compileProjectDraft(gap.project).planning_status,"INCOMPLETE_NO_SCHEDULE");
});
test("explicit unmapped calendar references stop automatic scheduling",()=>{
 const rows=fixture.trim().split("\n");
 const revised=[rows[0].replace("duration_slots,predecessors","duration_slots,calendar_id,predecessors"),
  ...rows.slice(1).map(x=>x.replace(/,(\d+),/,",$1,FIVE,"))].join("\n")+"\n";
 const d=digitize(revised);
 assert.equal(d.planning_status,"BLOCKED_CALENDAR_MAPPING");
 assert.ok(d.diagnostics.some(x=>x.code==="CALENDAR_NOT_MAPPED"));
});
test("TSV warns on ignored fields rather than fabricating quantities",()=>{
 const text=["activity_id\tactivity_name\twbs_id\twbs_name\tduration_slots\tunrecognized_cost",
 "A1\tSurvey\tSURVEY\tSurvey\t2\t1000"].join("\n")+"\n";
 const d=digitizeGenericTable({text,format:"TSV",project_id:"TSV_TEST",project_name:"TSV test"});
 assert.equal(d.project.activities.length,1);
 assert.ok(d.diagnostics.some(x=>x.code==="IGNORED_COLUMN"&&x.field==="unrecognized_cost"));
});
test("static studio compiles CSV and JSON locally without network upload or approval",()=>{
 const html=readFileSync(new URL("../projects/generic/index.html",import.meta.url),"utf8");
 assert.match(html,/import \{digitizeGenericTable\}/);
 assert.match(html,/import \{projectGenericVisual\}/);
 assert.match(html,/download\.addEventListener\("click"/);
 assert.match(html,/LOCAL_UNVERIFIED/);
 assert.match(html,/CSV\/TSV/);
 assert.match(html,/no file transmitted/);
 const kernel=readFileSync(new URL("../src/kernel/project-template.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(kernel,/from "node:crypto"/);
});
