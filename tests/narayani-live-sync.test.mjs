import test from "node:test";
import assert from "node:assert/strict";
import {selectCanonicalRows,buildAuthenticatedProgress,validateAuthenticatedProgress} from "../src/machine/narayani-live-sync.mjs";
const plan={activities:[{activity_id:"T5030"},{activity_id:"T4030"},...Array.from({length:43},(_,i)=>({activity_id:"S"+String(i).padStart(4,"0")}))]};
function input(n=34){
 const p=Array.from({length:n},(_,i)=>["02-Oct-2026","15 Narayani Parajuli",i<4?"DONE":"NOTE",
  i<3?"Footing concreting — mock grid":i===3?"Layout for column alignment":"Unmapped work observation",
  "Synthetic test only","20261002|PRJ-000007|PROGRESS|"+String(i+1).padStart(2,"0"),"PRJ-000007","SYNTHETIC"]);
 const r=Array.from({length:4},(_,i)=>{
  const x=Array(23).fill("");x[0]="2026-10-0"+(5+i);x[1]="15 Narayani Parajuli";x[13]="NEEDS_INPUT";x[19]="PRJ-000007";return x;
 });
 return {p,r};
}
const params={reconciled_at:"2026-10-16T00:00:00Z",source_id:"CANONICAL_NARAYANI_FISHTAIL_SHEETS"};
test("project-specific bounded sheet selection rejects wrong project",()=>{
 const {p,r}=input();
 const mixed=selectCanonicalRows([["01-Oct-2026","Other Site","DONE","","","","PRJ-000002",""],...p],[["Date","Site"],...r]);
 assert.equal(mixed.daily_progress_rows.length,34);
 assert.equal(mixed.daily_readiness_rows.length,4);
 const x=structuredClone(p);x[0][6]="PRJ-000002";
 assert.throws(()=>selectCanonicalRows(x,r),/identity mismatch/);
 assert.throws(()=>selectCanonicalRows(p.slice(1),r),/baseline source row loss/);
});
test("reconciliation stays dynamic when new events arrive; zero approvals",()=>{
 const {p,r}=input();
 const a=buildAuthenticatedProgress(selectCanonicalRows(p,r),plan,params);
 assert.equal(a.private_event_count,34);
 assert.equal(a.output.evidence_inventory.progress_rows,34);
 assert.equal(a.output.task_evidence[0].reported_subwork_entries,3);
 assert.equal(a.output.task_evidence[1].reported_subwork_entries,1);
 assert.equal(a.output.unassigned_or_local_scope_records,30);
 assert.equal(a.output.completed_wbs_activities,0);
 assert.equal(a.output.auto_refresh_enabled,true);
 assert.equal(validateAuthenticatedProgress(a.output,plan),true);
 assert.equal(a.manifest.private_source_rows_included,false);
 assert.equal(a.manifest.live_connector_active,true);
 assert.ok(!a.files["progress.json"].includes("PRJ-000007|PROGRESS|"));
 assert.ok(!a.files["progress.json"].includes("SYNTHETIC"));
 const more=input(35);
 const b=buildAuthenticatedProgress(selectCanonicalRows(more.p,more.r),plan,params);
 assert.equal(b.output.evidence_inventory.progress_rows,35);
 assert.equal(b.output.unassigned_or_local_scope_records,31);
 assert.notEqual(a.manifest.source_digest_sha256,b.manifest.source_digest_sha256);
});
test("duplicate IDs, future evidence, changed authority and signoff fabrication fail closed",()=>{
 const {p,r}=input();
 p[2][5]=p[1][5];
 assert.throws(()=>buildAuthenticatedProgress(selectCanonicalRows(p,r),plan,params),/duplicated progress PK/);
 const good=input(),bad=structuredClone(good.p);bad[0][0]="20-Oct-2026";
 assert.throws(()=>buildAuthenticatedProgress(selectCanonicalRows(bad,good.r),plan,params),/future site evidence/);
 const a=buildAuthenticatedProgress(selectCanonicalRows(good.p,good.r),plan,params);
 a.output.task_evidence[0].approved_work_complete=true;
 assert.throws(()=>validateAuthenticatedProgress(a.output,plan),/invalid mapped task/);
 assert.throws(()=>buildAuthenticatedProgress(selectCanonicalRows(good.p,good.r),plan,{...params,source_id:"UNTRUSTED"}),/source authority/);
});
test("static mode and OIDC live mode stay distinct",()=>{
 const {p,r}=input();const a=buildAuthenticatedProgress(selectCanonicalRows(p,r),plan,params);
 assert.equal(a.manifest.auth_method,"GITHUB_OIDC_WIF_SERVICE_ACCOUNT_READ_ONLY");
 assert.equal(a.manifest.no_private_source_identifiers_in_output,true);
 assert.ok(!a.files["manifest.json"].includes("15 Narayani Parajuli"));
 assert.ok(!a.files["manifest.json"].includes("SYNTHETIC"));
 assert.ok(!a.files["progress.json"].includes("15 Narayani Parajuli"));
});
