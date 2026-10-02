export function toOpenProjectWorkPackages(schedule){
  return schedule.activities.map(a=>({external_id:a.id??a.activity_id,subject:a.name,type:a.duration===0?"Milestone":"Task",duration_workdays:a.duration,percentDone:a.percent_complete??0,custom_fields:{total_float:a.total_float,free_float:a.free_float,critical:a.critical,work_id:a.work_id??null}}));
}
export const OPENPROJECT_NOTE="Adapter contract only. OpenProject remains a separate GPLv3 application accessed through documented APIs/imports.";
