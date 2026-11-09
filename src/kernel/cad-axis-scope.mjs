/* Scheduling owns WBS/dependencies and work readiness; CAD owns axes/member geometry.
 * A CAD axis reference is a source identity, NOT a start authorization.
 */
export const CAD_LINEAGE_SCHEMA='jp-cad://control-tower/view-lineage/1.0';
const hash=x=>typeof x==='string'&&/^[0-9a-f]{64}$/i.test(x);
export function validateCadActivityScope(activity){
 const claim=activity?.cadScope||activity?.sourceSystem==='CAD';
 if(!claim)return {ok:true,status:'NON_CAD_ACTIVITY'};
 const c=activity.cadScope;
 if(!c||c.contract!==CAD_LINEAGE_SCHEMA)return {ok:false,status:'CAD_SCOPE_SCHEMA_REQUIRED'};
 if(c.cadRepository!=='FabinGurung/JP_Computer-Aided-Drawings'||!c.cadRevision||!c.floorId||!hash(c.sourceFileSha256))
  return {ok:false,status:'CAD_REPOSITORY_REVISION_FLOOR_SOURCE_REQUIRED'};
 if(!Array.isArray(c.memberIds)||!c.memberIds.length||new Set(c.memberIds).size!==c.memberIds.length)
  return {ok:false,status:'CAD_MEMBER_SCOPE_MISSING_OR_DUPLICATE'};
 if(!Array.isArray(c.axisRefs)||!c.axisRefs.length||new Set(c.axisRefs).size!==c.axisRefs.length||c.axisRefs.some(a=>!/^[A-Z]+[1-9]\d*$/.test(a)))
  return {ok:false,status:'CAD_COLUMN_AXIS_SCOPE_INVALID'};
 if(c.axisStatus!=='SOURCE_MODEL_REGISTERED_VERIFIED'||c.coordinateRegistrationVerified!==true)
  return {ok:false,status:'CAD_SOURCE_AXIS_REVIEW_HOLD'};
 if(c.memberScopeVerified!==true||!c.sourceReviewerId||!String(c.sourceReviewerId).trim())
  return {ok:false,status:'CAD_WORK_SCOPE_REVIEW_HOLD'};
 return {ok:true,status:'CAD_SOURCE_SCOPE_VERIFIED',scope:{activityId:activity.id??activity.activity_id,cadRevision:c.cadRevision,floorId:c.floorId,axisRefs:[...c.axisRefs],memberIds:[...c.memberIds],sourceFileSha256:c.sourceFileSha256}};
}
export function requireCadScopeForScheduling(activities){
 if(!Array.isArray(activities))throw Error('Activities missing');
 const valid=[];
 for(const a of activities){
  const check=validateCadActivityScope(a);
  if(!check.ok)throw Error('CAD_SCOPE_HOLD '+String(a.id??a.activity_id??'?')+' '+check.status);
  if(check.scope)valid.push(check.scope);
 }
 return {status:valid.length?'CAD_SCOPE_VERIFIED_DRAFT_SCHEDULE':'NO_CAD_SCOPE_CLAIM',cadActivityScopes:valid,engineeringApproved:false,siteStartAuthorized:false};
}
