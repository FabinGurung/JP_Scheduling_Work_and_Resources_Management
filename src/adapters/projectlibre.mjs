export const PROJECTLIBRE_FEATURE_MAP=Object.freeze({
  wbs:"hierarchical tasks",logic:"predecessor/successor dependencies",calendars:"project/task/resource calendars",resources:"resource assignments and leveling concepts",baseline:"baseline schedule comparison",earned_value:"EV/PV/AC performance metrics",interoperability:"Microsoft Project and Primavera-oriented import workflows"
});
export function toProjectLibreNeutral(schedule){
  return {project:schedule.project??{},tasks:schedule.activities.map((a,i)=>({uid:i+1,id:a.id??a.activity_id,name:a.name,duration_days:a.duration,total_float_days:a.total_float,percent_complete:a.percent_complete??0})),note:"Compatibility model only; no ProjectLibre CPAL source code is copied into this kernel."};
}
