import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { inspectDeskModel, linkContext, scheduleWindow } from '../src/presentation/scheduling-desk.mjs';

const model = JSON.parse(readFileSync(new URL('../projects/narayani/schedule-v002.json',import.meta.url)));
const byId = new Map(model.activities.map(item=>[item.id,item]));

test('public owner preview retains planning authority and the source scope',()=>{
 assert(inspectDeskModel(model));
 assert.equal(model.revision,'v002');
 assert.equal(model.source_count,194);
 assert.equal(model.activities.length,160);
 assert.equal(model.holds.length,6);
 assert.equal(model.checklist.length,0);
 assert.doesNotMatch(JSON.stringify(model),/docs\.google|drive\.google|file_id|source_passages|latitude|longitude/i);
 for(const id of ['U015','U020','U030','M070']){
  const activity=byId.get(id);
  assert.equal(activity.start_date,null);
  assert.equal(activity.finish_date,null);
  assert.equal(activity.duration,null);
 }
 assert.equal(scheduleWindow(model).start,model.relative_origin);
});

test('calendar holds, calendar lags and planner quantities retain their distinct meanings',()=>{
 for(const level of ['GF','FF','SF']){
  const pour=byId.get('L100-'+level),curing=byId.get('L110-'+level),props=byId.get('L123-'+level);
  assert.equal(curing.start,pour.finish);
  assert.equal(curing.finish-curing.start,10);
  assert(props.start>=pour.finish+21);
  const wait=linkContext(model,props.id).predecessors.find(edge=>edge.other.id===pour.id);
  assert.equal(wait.lag_basis,'elapsed');
  assert.equal(wait.lag,21);
 }
 for(const activity of model.activities.filter(a=>a.start_date&&a.duration>0&&!a.estimate.kind.startsWith('Elapsed'))){
  assert.notEqual(activity.start%7,6);
  assert.equal(Array.from({length:activity.finish-activity.start},(_,i)=>activity.start+i).filter(i=>i%7!==6).length,activity.duration);
 }
 const concrete=byId.get('L100-GF').estimate;
 assert.equal(concrete.kind,'Planner sample');
 assert.equal(concrete.duration,Math.ceil(concrete.components.reduce((sum,item)=>sum+item.quantity/item.output,0)));
 assert(concrete.components.every(item=>item.assemblies.every(recipe=>recipe.lines.length>0)));
});
