import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {projectGenericVisual} from "../src/visual/generic-project-model.mjs";
import {proposeAiWbsRevision,validateAiRevisionRequest} from "../src/kernel/ai-source-revision.mjs";
import {formatAiRevisionReview} from "../src/kernel/ai-revision-report.mjs";

const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=()=>projectGenericVisual(JSON.parse(read("machine/generic-projects/community-clinic.json")));
const make=(m,operations)=>({format:"SKYFORGE_AI_WBS_REVISION_V1",
 project_id:m.project.id,expected_source_sha256:m.input_sha256,
 user_intent_summary:"Owner explicitly requested a bounded source revision",operations});

test("AI revisions include exact source-bound before/after report and no adopted field evidence",()=>{
 const m=source(),original=JSON.stringify(m),first=m.activities[0],last=m.activities[1];
 const req=make(m,[
  {kind:"ADD_WBS",id:"NEW_WBS",name:"Utility systems",parent_wbs_id:m.wbs[0].id},
  {kind:"UPDATE_ACTIVITY",id:first.id,name:"Survey and source verification"},
  {kind:"ADD_ACTIVITY",activity:{id:"UTILITY101",name:"Utility site check",wbs_id:"NEW_WBS",duration:2}},
  {kind:"ADD_LINK",from:last.id,to:"UTILITY101",type:"FS",lag:0}
 ]);
 const res=proposeAiWbsRevision(m,req),d=res.revision_diff;
 assert.equal(d.format,"SKYFORGE_AI_SOURCE_REVIEW_DIFF_V1");
 assert.equal(d.authority,"UNVERIFIED_DIFF_FOR_HUMAN_SOURCE_RECONCILIATION");
 assert.equal(d.source_view_sha256,m.input_sha256);
 assert.equal(d.counts.wbs.added,1);
 assert.equal(d.counts.activities.added,1);
 assert.equal(d.counts.activities.updated,1);
 assert.equal(d.counts.relationships.added,1);
 assert.equal(d.activities.updated[0].changes[0].field,"title");
 assert.equal(d.activities.updated[0].changes[0].before,first.title);
 assert.equal(d.activities.updated[0].changes[0].after,"Survey and source verification");
 assert.equal(d.activities.added[0].id,"UTILITY101");
 assert.equal(d.relationships.added[0].to,"UTILITY101");
 assert.equal(d.context_not_adopted.source_checklist_entries,m.checklist.length);
 assert.equal(d.context_not_adopted.original_reported_checklist_states_preserved,false);
 assert.equal(d.admission,"BLOCKED_PENDING_SOURCE_AUTHORITY_RECONCILIATION_AND_EXPLICIT_APPROVAL");
 assert.equal(d.direct_source_writes,false);
 assert.equal(res.review_required,true);
 assert.equal(res.approval_granted,false);
 assert.equal(JSON.stringify(m),original);
 assert.deepEqual(proposeAiWbsRevision(m,req),res);
 const md=formatAiRevisionReview(res);
 assert.match(md,/UNAPPROVED/);
 assert.ok(md.includes("Survey and source verification"));
 assert.ok(md.includes("UTILITY101"));
 assert.ok(md.includes(m.input_sha256));
 assert.match(md,/Source-context warning/);
 assert.match(md,/No live source write/);
});

test("AI task deletion cannot silently drop links; explicit deletions generate link audit",()=>{
 const m=source(),id=m.activities[0].id;
 assert.ok(m.links.some(x=>x.from===id||x.to===id));
 assert.throws(()=>proposeAiWbsRevision(m,make(m,[{kind:"REMOVE_ACTIVITY",id}])),
  /explicitly REMOVE_LINK/);
 const drop=m.links.filter(x=>x.from===id||x.to===id).map(x=>({
  kind:"REMOVE_LINK",from:x.from,to:x.to,type:x.type,lag:x.lag
 }));
 const result=proposeAiWbsRevision(m,make(m,[...drop,{kind:"REMOVE_ACTIVITY",id}]));
 assert.equal(result.revision_diff.counts.activities.removed,1);
 assert.equal(result.revision_diff.counts.relationships.removed,drop.length);
 assert.equal(result.candidate.relationships.some(x=>x.predecessor===id||x.successor===id),false);
});

test("AI rejects disguised operations, missing edits, fabricated milestones and stale sources",()=>{
 const m=source(),id=m.activities[0].id,w=m.wbs[0].id;
 const invalid=[
  [{kind:"UPDATE_ACTIVITY",id}],
  [{kind:"UPDATE_ACTIVITY",id,name:"Changed",approved:true}],
  [{kind:"UPDATE_ACTIVITY",id,duration:0}],
  [{kind:"ADD_ACTIVITY",activity:{id:"NEWZERO",name:"Unknown duration",wbs_id:w,duration:0}}],
  [{kind:"ADD_ACTIVITY",activity:{id:"NEWBAD",name:"Hidden approval",wbs_id:w,duration:1,approved:true}}],
  [{kind:"RENAME_WBS",id:w,name:"Changed",extra:"ignored"}],
  [{kind:"ADD_LINK",from:id,to:m.activities[1].id,type:"FS",lag:10001}]
 ];
 for(const operations of invalid)
  assert.throws(()=>validateAiRevisionRequest(make(m,operations),m));
 const req=make(m,[{kind:"RENAME_WBS",id:w,name:"Renamed"}]);
 req.expected_source_sha256="0".repeat(64);
 assert.throws(()=>proposeAiWbsRevision(m,req),/source SHA/);
 const allowed=proposeAiWbsRevision(m,make(m,[
  {kind:"ADD_ACTIVITY",activity:{id:"MILESTONE101",name:"Milestone explicitly verified as zero nominal duration",wbs_id:w,duration:0,activity_type:"FINISH_MILESTONE"}}
 ]));
 assert.equal(allowed.candidate.activities.at(-1).activity_type,"FINISH_MILESTONE");
 assert.equal(allowed.approval_granted,false);
});

test("mobile/keyboard readiness guards exist in shared source, but device acceptance stays manual",()=>{
 const ui=read("src/presentation/work-readiness-page.mjs");
 const css=read("assets/work-readiness.css");
 assert.ok(ui.includes('detail.setAttribute("aria-live","polite")'));
 assert.ok(ui.includes('if(filter.value&&filter.value!==record.wbs_id)filter.value=""'));
 assert.ok(ui.includes('if(q&&!(record.id+" "+record.title).toLocaleLowerCase().includes(q))search.value=""'));
 assert.ok(ui.includes('filter.addEventListener("change",renderList)'));
 assert.ok(ui.includes('window.addEventListener("hashchange"'));
 assert.ok(css.includes("min-height:44px"));
 assert.ok(css.includes("font:16px system-ui"));
 assert.ok(css.includes("@media(max-width:720px)"));
 assert.ok(read("docs/WORK_READINESS_V1.md").includes("physical mobile/Safari device acceptance"));
 const builder=read("scripts/build-public-site.mjs");
 for(const f of ["src/kernel/ai-source-revision.mjs","src/kernel/ai-revision-diff.mjs","src/kernel/ai-revision-report.mjs"])
  assert.ok(builder.includes('"'+f+'"'),
   "Private offline AI module must be present in the public distribution exclusion list");
});
