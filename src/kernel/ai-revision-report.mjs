/**
 * Human-readable review receipt for an UNAPPROVED AI source proposal.
 * Never show calculated draft dates as an adopted project baseline.
 */
const inline=x=>String(x??"—").replace(/[`\\]/g,"").replace(/[|\r\n]/g," ");
const linkName=x=>x.from+" → "+x.to+" ("+x.type+", lag "+x.lag+")";
export function formatAiRevisionReview(result){
 if(result?.format!=="SKYFORGE_AI_WBS_REVISION_RESULT_V1"||
    result.approval_granted!==false||result.review_required!==true||
    result.revision_diff?.format!=="SKYFORGE_AI_SOURCE_REVIEW_DIFF_V1"||
    result.revision_diff?.admission!=="BLOCKED_PENDING_SOURCE_AUTHORITY_RECONCILIATION_AND_EXPLICIT_APPROVAL")
  throw Error("Cannot generate review receipt from an unvalidated or approved revision");
 const d=result.revision_diff;
 const lines=[
  "# Skyforge · Proposed AI WBS revision (UNAPPROVED)",
  "",
  "- Project: `"+inline(result.project_id)+"`",
  "- Public source model SHA-256: `"+d.source_view_sha256+"`",
  "- Request SHA-256: `"+result.request_sha256+"`",
  "- Draft content SHA-256: `"+d.draft_content_sha256+"`",
  "- Status: **BLOCKED FOR ADOPTION**. No live source write, engineering release or field approval.",
  "",
  "## Change summary",
  "",
  "| Item | Added | Updated | Removed |",
  "| --- | ---: | ---: | ---: |"
 ];
 for(const [label,group] of [["Activities",d.counts.activities],["WBS",d.counts.wbs]]){
  lines.push("| "+label+" | "+group.added+" | "+group.updated+" | "+group.removed+" |");
 }
 lines.push("| Relationships | "+d.counts.relationships.added+" | — | "+d.counts.relationships.removed+" |","","## Activity changes","");
 for(const a of d.activities.added)lines.push("- **ADD** `"+inline(a.id)+"`: "+inline(a.after.title)+"; WBS "+inline(a.after.wbs_id)+"; duration "+inline(a.after.duration)+" slots");
 for(const a of d.activities.removed)lines.push("- **REMOVE** `"+inline(a.id)+"`: "+inline(a.before.title));
 for(const a of d.activities.updated){
  lines.push("- **UPDATE** `"+inline(a.id)+"`:");
  for(const x of a.changes)lines.push("  - "+inline(x.field)+": `"+inline(x.before)+"` → `"+inline(x.after)+"`");
 }
 if(!d.activities.added.length&&!d.activities.removed.length&&!d.activities.updated.length)lines.push("- None");
 lines.push("","## WBS changes","");
 for(const a of d.wbs.added)lines.push("- **ADD** `"+inline(a.id)+"`: "+inline(a.after.title)+"; parent "+inline(a.after.parent_id));
 for(const a of d.wbs.removed)lines.push("- **REMOVE** `"+inline(a.id)+"`: "+inline(a.before.title));
 for(const a of d.wbs.updated){
  lines.push("- **UPDATE** `"+inline(a.id)+"`:");
  for(const x of a.changes)lines.push("  - "+inline(x.field)+": `"+inline(x.before)+"` → `"+inline(x.after)+"`");
 }
 if(!d.wbs.added.length&&!d.wbs.removed.length&&!d.wbs.updated.length)lines.push("- None");
 lines.push("","## Relationship changes","");
 for(const x of d.relationships.added)lines.push("- **ADD** "+inline(linkName(x)));
 for(const x of d.relationships.removed)lines.push("- **REMOVE** "+inline(linkName(x)));
 if(!d.relationships.added.length&&!d.relationships.removed.length)lines.push("- None");
 lines.push("","## Source-context warning","");
 for(const x of d.warnings)lines.push("- "+inline(x));
 lines.push("","## Required next decisions","","1. Reconcile the exact live Drive/Git authority, original revision and missing calendar/resource/checklist inputs.",
  "2. Independently review affected tasks, constraints and link meaning; do not infer site progress.",
  "3. Obtain explicit authorized adoption before any write; archive PRE/POST and rerun Actions checks.",
  "");
 return lines.join("\n");
}
