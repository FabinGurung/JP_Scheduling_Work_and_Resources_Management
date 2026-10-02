export const GANTTPROJECT_CAPABILITIES=Object.freeze({
  task_hierarchy:true,dependencies:true,milestones:true,baselines:true,resource_load:true,task_cost:true,ms_project_interop:["MPX","MPP","MSPDI XML import","MSPDI XML export"]
});
export function toGanttProjectNeutral(schedule){
  return {tasks:schedule.activities.map((a,i)=>({id:i+1,external_id:a.id??a.activity_id,name:a.name,duration:a.duration,complete:a.percent_complete??0,critical:a.critical})),note:"Neutral adapter model only; actual .gan/MSPDI serialization is a later bounded adapter."};
}
