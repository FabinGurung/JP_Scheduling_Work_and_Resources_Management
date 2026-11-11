/** Draft resource library for the existing published synthetic Narayani WBS.
 * No original project has approved resource assignments or material BOQ totals.
 * This overlay is explicitly a crew/equipment illustration per active shift.
 */
export function validateDraftResourceRoster(roster,model){
 if(roster?.format!=="SKYFORGE_UNAPPROVED_RESOURCE_SCENARIOS_V1"||
 roster.classification!=="REFERENCE_CREW_SUGGESTIONS_NOT_SOURCE_ASSIGNMENTS"||
 roster.source_project!=="PRJ-000007"||
 roster.source_seed_git_blob!=="40f2d8e35bf1fd71c5acb84a64272115cacadb99"||
 roster.no_approved_site_assignment!==true||roster.no_bill_quantities!==true||
 !Array.isArray(roster.activities)||roster.activities.length!==45||
 model?.project?.id!=="PRJ-000007"||model.activities?.length!==45)
  throw Error("Draft crew roster cannot be accepted as a source assignment");
 const ids=new Set(),existing=new Map(model.activities.map(a=>[a.id,a]));
 let milestoneCount=0;
 for(const row of roster.activities){
  const modelRow=existing.get(row.activity_id);
  if(!modelRow||ids.has(row.activity_id)||modelRow.title!==row.activity_title||
   row.assignment_status!=="PROPOSED_REFERENCE_ONLY"||
   row.measured_materials_status!=="NOT_REPORTED_BY_SOURCE"||
   !Array.isArray(row.resources)||
   !["Milestone","Task"].includes(row.activity_type))
   throw Error("Draft roster source/task identity mismatch "+row.activity_id);
  const milestone=row.activity_type==="Milestone";
  if(milestone){milestoneCount++;if(row.resources.length!==0||modelRow.duration!==0)throw Error("Draft cannot allocate a milestone");}
  else if(row.resources.length===0||modelRow.duration===0)throw Error("Missing draft crew or nonzero duration");
  const names=new Set();
  for(const res of row.resources){
   if(typeof res.name!=="string"||res.name.length>100||names.has(res.name)||
      !Number.isInteger(res.quantity)||res.quantity<=0||res.quantity>50||
      !["person","machine","set"].includes(res.unit)||
      res.type!==(res.unit==="person"?"LABOR":"EQUIPMENT"))
     throw Error("Invalid proposed crew quantity or equipment unit");
   names.add(res.name);
  }
  ids.add(row.activity_id);
 }
 if(ids.size!==45||milestoneCount!==7)throw Error("Draft roster missing public tasks");
 return true;
}
export function resourceRowsForSelected(model,roster,activityId){
 if(!model.activities.some(a=>a.id===activityId))throw Error("Unknown activity");
 if(!roster)return {authority:"NO_VERIFIED_ASSIGNMENTS",source_rows:[],draft_rows:[],reason:"Draft roster not available"};
 validateDraftResourceRoster(roster,model);
 const row=roster.activities.find(a=>a.activity_id===activityId);
 if(!row)throw Error("Source activity missing from draft roster");
 return {
  authority:"NO_VERIFIED_ASSIGNMENTS",
  source_rows:[],
  draft_rows:row.resources.map(r=>({name:r.name,quantity:r.quantity,unit:r.unit,type:r.type,authority:"ILLUSTRATIVE_NOT_ASSIGNED"})),
  zero_duration_milestone:row.activity_type==="Milestone",
  reason:"These quantities are hypothetical people or equipment available per active shift, not a signed roster, material BOQ or approved construction resource plan"
 };
}
