import test from "node:test";
import assert from "node:assert/strict";
import {deflateRawSync} from "node:zlib";
import {createHash} from "node:crypto";
import {readFileSync} from "node:fs";
import {digitizeXer,digitizeP6Xml} from "../src/kernel/p6-native-import.mjs";
import {digitizeXlsx} from "../src/kernel/xlsx-native-import.mjs";
import {pdfTextItemsToTable,digitizePdfTable,pdfSourceSha256} from "../src/kernel/pdf-table-import.mjs";
import {compileProjectDraft} from "../src/kernel/project-template.mjs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
const project={project_id:"FIELD_TEST",project_name:"Native import lab"};
const digest=b=>createHash("sha256").update(b).digest("hex");
const xer=[
"ERMHDR\t8.4\t2026-10-20",
"%T\tPROJECT",
"%F\tproj_id\tproj_short_name",
"%R\t100\tP001",
"%T\tPROJWBS",
"%F\tproj_id\twbs_id\tparent_wbs_id\twbs_short_name\twbs_name",
"%R\t100\t1\t\tROOT\tConstruction",
"%R\t100\t2\t1\tFOUND\tFoundations",
"%T\tTASK",
"%F\tproj_id\ttask_id\ttask_code\ttask_name\twbs_id\torig_dur_hr_cnt",
"%R\t100\t10\tA100\tExcavation\t2\t16",
"%R\t100\t11\tA110\tPCC\t2\t8",
"%T\tTASKPRED",
"%F\tproj_id\ttask_id\tpred_task_id\tpred_type\tlag_hr_cnt",
"%R\t100\t11\t10\tPR_FS\t0",
"%E"
].join("\n")+"\n";
const xml=[
'<?xml version="1.0" encoding="utf-8"?>',
'<APIBusinessObjects><Project><Name>Mock</Name>',
'<WBS><ObjectId>1</ObjectId><Code>ROOT</Code><Name>Construction</Name></WBS>',
'<WBS><ObjectId>2</ObjectId><Code>FOUND</Code><Name>Foundations</Name><ParentObjectId>1</ParentObjectId></WBS>',
'<Activity><ObjectId>10</ObjectId><Id>A100</Id><Name>Excavation</Name><WBSObjectId>2</WBSObjectId><PlannedDuration>16</PlannedDuration></Activity>',
'<Activity><ObjectId>11</ObjectId><Id>A110</Id><Name>PCC</Name><WBSObjectId>2</WBSObjectId><PlannedDuration>8</PlannedDuration></Activity>',
'<Relationship><PredecessorActivityObjectId>10</PredecessorActivityObjectId><SuccessorActivityObjectId>11</SuccessorActivityObjectId><Type>Finish to Start</Type><Lag>0</Lag></Relationship>',
'</Project></APIBusinessObjects>'
].join("");
function verifyDraft(d){
 assert.equal(d.project.wbs.length,2);
 assert.equal(d.project.wbs[0].wbs_id,"ROOT");
 assert.equal(d.project.wbs[1].parent_wbs_id,"ROOT");
 assert.equal(d.project.activities.length,2);
 assert.equal(d.project.activities[0].duration,2);
 assert.equal(d.project.activities[1].duration,1);
 assert.equal(d.project.relationships[0].type,"FS");
 assert.equal(d.project.relationships[0].predecessor,"A100");
 assert.equal(d.project.relationships[0].successor,"A110");
 const model=projectGenericVisual(d.project);
 assert.equal(model.activities.length,2);
 assert.equal(model.baseline_approved,false);
 return model;
}
test("P6 XER real table structure, WBS parent with no activities, hour division, FK, source hashes",()=>{
 const d=digitizeXer({...project,text:xer,hours_per_day:8,original_sha256:digest(Buffer.from(xer))});
 assert.equal(d.source_format,"XER");
 assert.equal(d.project.source_manifest[0].sha256,digest(Buffer.from(xer)));
 verifyDraft(d);
 assert.ok(d.diagnostics.some(x=>x.code==="P6_CALENDAR_NOT_IMPORTED"));
 assert.throws(()=>digitizeXer({...project,text:xer}),/hours_per_day/);
 assert.throws(()=>digitizeXer({...project,text:xer,hours_per_day:7}),/no rounding/i);
 assert.throws(()=>digitizeXer({...project,text:xer.replace("PR_FS","PR_BOGUS"),hours_per_day:8}),/Unsupported P6/);
});
test("P6 XML imports source WBS ObjectIds and FS relations while forbidding DTD",()=>{
 const d=digitizeP6Xml({...project,text:xml,hours_per_day:8});
 verifyDraft(d);
 assert.equal(d.source_format,"P6_XML");
 assert.throws(()=>digitizeP6Xml({...project,text:'<!DOCTYPE a>'+xml,hours_per_day:8}),/DTD/);
 assert.throws(()=>digitizeP6Xml({...project,text:xml.replace("<WBSObjectId>2</WBSObjectId>","<WBSObjectId>9</WBSObjectId>"),hours_per_day:8}),/requires/);
 assert.throws(()=>digitizeP6Xml({...project,
  text:xml.replace("<PlannedDuration>16</PlannedDuration>","<PlannedDuration>PT16H30M</PlannedDuration>"),
  hours_per_day:8}),/no rounding/);
 const exact=digitizeP6Xml({...project,text:xml.replace("<PlannedDuration>16</PlannedDuration>","<PlannedDuration>PT16H30M</PlannedDuration>")
  .replace("<PlannedDuration>8</PlannedDuration>","<PlannedDuration>PT8H15M</PlannedDuration>"),
  hours_per_day:8.25});
 assert.equal(exact.project.activities[0].duration,2);
});
const u16=(v,n,x)=>v.writeUInt16LE(x,n),u32=(v,n,x)=>v.writeUInt32LE(x>>>0,n);
function makeZip(files){
 const parts=[],central=[];let pointer=0;
 for(const [name,value] of files){
  const nameb=Buffer.from(name),raw=Buffer.from(value),compressed=deflateRawSync(raw);
  const local=Buffer.alloc(30);u32(local,0,0x04034b50);u16(local,4,20);u16(local,8,8);
  u32(local,18,compressed.length);u32(local,22,raw.length);u16(local,26,nameb.length);
  const cd=Buffer.alloc(46);u32(cd,0,0x02014b50);u16(cd,4,20);u16(cd,6,20);u16(cd,10,8);
  u32(cd,20,compressed.length);u32(cd,24,raw.length);u16(cd,28,nameb.length);u32(cd,42,pointer);
  parts.push(local,nameb,compressed);central.push(cd,nameb);
  pointer+=local.length+nameb.length+compressed.length;
 }
 const index=Buffer.concat(central),end=Buffer.alloc(22);
 u32(end,0,0x06054b50);u16(end,8,files.length);u16(end,10,files.length);
 u32(end,12,index.length);u32(end,16,pointer);
 return new Uint8Array(Buffer.concat([...parts,index,end]));
}
const workbook='<?xml version="1.0"?><workbook><sheets><sheet name="WBS" sheetId="1" r:id="rId1"/></sheets></workbook>';
const rels='<Relationships><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>';
const heads=["activity_id","activity_name","wbs_id","wbs_name","parent_wbs_id","duration_slots","predecessors"];
const xmlEscape=t=>String(t).replace(/&/g,"&amp;").replace(/</g,"&lt;");
function sheet(rows){
 const items=rows.map((row,n)=>'<row r="'+(n+1)+'">'+row.map((v,j)=>{
  if(v==="")return "";
  const key=String.fromCharCode(65+j)+(n+1);
  return '<c r="'+key+'" t="inlineStr"><is><t>'+xmlEscape(v)+'</t></is></c>';
 }).join("")+'</row>').join("");
 return '<worksheet><sheetData>'+items+'</sheetData></worksheet>';
}
const xlsx=()=>makeZip([["xl/workbook.xml",workbook],["xl/_rels/workbook.xml.rels",rels],
 ["xl/worksheets/sheet1.xml",sheet([heads,["A100","Excavation","FOUND","Foundations","", "2",""],
  ["A110","PCC","FOUND","Foundations","","1","A100:FS:0"]])]]);
test("real native compressed XLSX ZIP/OOXML digitizes activity table, labels source and preserves source SHA",async()=>{
 const bytes=xlsx();const d=await digitizeXlsx({...project,bytes});
 assert.equal(d.source_sha256,digest(Buffer.from(bytes)));
 assert.equal(d.project.source_manifest[0].sha256,digest(Buffer.from(bytes)));
 assert.equal(d.project.activities.length,2);
 assert.equal(projectGenericVisual(d.project).activities.length,2);
 assert.ok(d.diagnostics.some(x=>x.code==="EXCEL_SHEET_IMPORTED"));
});
test("XLSX parser rejects invalid ZIP, missing headers and formulas",async()=>{
 await assert.rejects(digitizeXlsx({...project,bytes:new Uint8Array(80)}),/central directory/);
 const noHeaders=makeZip([["xl/workbook.xml",workbook],["xl/_rels/workbook.xml.rels",rels],
  ["xl/worksheets/sheet1.xml",sheet([["hello","world"],["not","a","table"]])]]);
 await assert.rejects(digitizeXlsx({...project,bytes:noHeaders}),/identifiable/);
 const formulaSheet='<worksheet><sheetData><row><c r="A1"><f>1+1</f><v>2</v></c></row></sheetData></worksheet>';
 await assert.rejects(digitizeXlsx({...project,bytes:makeZip([["xl/workbook.xml",workbook],
 ["xl/_rels/workbook.xml.rels",rels],["xl/worksheets/sheet1.xml",formulaSheet]])}),/Formula/);
});
test("PDF coordinate extraction requires exact visible schedule headers and explicit human review",()=>{
 const hdr=["activity_id","activity_name","wbs_id","wbs_name","parent_wbs_id","duration_slots","predecessors"];
 const line=(row,y)=>row.map((s,i)=>({str:s,transform:[1,0,0,1,30+i*95,y]}));
 const pages=[[
 ...line(hdr,700),
 ...line(["A100","Excavation","FOUND","Foundations","","2",""],680),
 ...line(["A110","PCC","FOUND","Foundations","","1","A100:FS:0"],660)
 ]];
 const result=pdfTextItemsToTable(pages);
 assert.equal(result.rows,2);
 assert.equal(result.quality,"GEOMETRY_ASSISTED_PREVIEW_REQUIRES_HUMAN_CHECK");
 const orig=pdfSourceSha256(new Uint8Array([37,80,68,70,45]));
 const d=digitizePdfTable({...project,csv:result.csv,source_name:"example.pdf",original_pdf_sha256:orig});
 assert.equal(d.project.activities.length,2);
 assert.equal(d.source_sha256,orig);
 assert.ok(d.diagnostics.some(x=>x.code==="PDF_TEXT_ALIGNMENT_REVIEW_REQUIRED"));
 assert.throws(()=>pdfTextItemsToTable([[{str:"Scanned image",transform:[1,0,0,1,10,400]}]]),/OCR/);
});
test("browser page advertises and actually routes all native importers with PDF review gate",()=>{
 const html=readFileSync(new URL("../projects/generic/index.html",import.meta.url),"utf8");
 for(const marker of ["digitizeXlsx","digitizeXer","digitizeP6Xml","pdfTextItemsToTable",
 "digitizePdfTable","pdf-review","confirm-pdf",'.xer,.xml,.pdf,.csv',
 "cdn://NOT-A-REAL-ADDRESS"]) {
  if(marker==="cdn://NOT-A-REAL-ADDRESS"){assert.doesNotMatch(html,/cdn:\/\/NOT-A-REAL-ADDRESS/)}
  else assert.ok(html.includes(marker),"Missing native importer "+marker);
 }
 assert.match(html,/pdfjs\.org|pdf\.min\.mjs/);
 assert.match(html,/no file transmitted|never transmitted|never uploaded/);
});
