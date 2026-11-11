/** Nepal six-day *planning scenario* calendar (Sunday through Friday).
 * Saturday is non-working. This never changes the original source or
 * authorizes attendance. Existing work-slot CPM is retained; only dates
 * are projected onto the owner's requested reference workweek.
 */
const DAY=86400000;
const iso=(x)=>new Date(x).toISOString().slice(0,10);
const date=(s)=>new Date(s+"T00:00:00Z");
const valid=(s)=>typeof s==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&
 Number.isFinite(date(s).getTime())&&iso(date(s))===s;
export const REFERENCE_HOUSE_CALENDAR=Object.freeze({
 id:"NP_SUNDAY_FRIDAY_8H_SATURDAY_OFF_V1",
 working_weekdays:[0,1,2,3,4,5],
 weekly_holiday:6,working_hours_per_day:8,
 base_skilled:2,base_helpers:3,
 extra_holidays:[],
 authority:"UNAPPROVED_PLANNING_POLICY_NOT_ACTUAL_ATTENDANCE"
});
export const isHouseWorkDay=(day)=>valid(day)&&date(day).getUTCDay()!==6;
export function dateAtHouseWorkSlot(anchor,slot,policy=REFERENCE_HOUSE_CALENDAR){
 if(!valid(anchor)||!Number.isInteger(slot)||slot<0||slot>10000||
 policy.weekly_holiday!==6||policy.working_hours_per_day!==8)throw Error("Invalid house work-slot input");
 let d=date(anchor);
 while(d.getUTCDay()===6)d=new Date(d.getTime()+DAY);
 for(let i=0;i<slot;){d=new Date(d.getTime()+DAY);if(d.getUTCDay()!==6)i++;}
 return iso(d);
}
export function countHouseWorkDays(start,finishExclusive){
 if(!valid(start)||!valid(finishExclusive)||date(finishExclusive)<date(start))throw Error("Invalid workday range");
 let count=0;
 for(let i=date(start);i<date(finishExclusive);i=new Date(i.getTime()+DAY))
  if(i.getUTCDay()!==6)count++;
 return count;
}
export function applySaturdayHouseScenario(model,{anchor=null}={}){
 if(!model||!Array.isArray(model.activities)||!model.activities.length)
  throw Error("Missing schedule model");
 const anchors=model.activities.filter(x=>Number.isInteger(x.start)&&x.start>=0&&valid(x.start_date));
 if(anchors.length!==model.activities.length||
 model.activities.some(x=>!Number.isInteger(x.finish)||x.finish<x.start||
 !Number.isInteger(x.duration)||x.duration<0))
  throw Error("Cannot rebase dates without source working slots");
 // 2026-10-19 is the verified published Narayani scenario anchor. For independent
 // generic demos, derive anchor from earliest dated slot 0.
 const zero=anchors.filter(a=>a.start===0).sort((a,b)=>a.start_date.localeCompare(b.start_date))[0];
 const origin=anchor??zero?.start_date;
 if(!valid(origin))throw Error("Missing versioned project scenario anchor");
 const activities=model.activities.map(a=>{
  const startDate=dateAtHouseWorkSlot(origin,a.start);
  const finishDate=dateAtHouseWorkSlot(origin,a.finish);
  const actualWorkDays=countHouseWorkDays(startDate,finishDate);
  if(a.duration>0&&actualWorkDays!==a.duration)
   throw Error("Saturday workday projection changed duration for "+a.id);
  if(a.duration===0&&a.start!==a.finish)throw Error("Invalid milestone");
  return {...a,source_start_date:a.start_date,source_finish_date:a.finish_date,
   start_date:startDate,finish_date:finishDate,
   house_calendar_workdays:a.duration,
   elapsed_calendar_days:Math.round((date(finishDate)-date(startDate))/DAY),
   date_basis:"SATURDAY_OFF_OWNER_SCENARIO_UNAPPROVED"};
 });
 const calendar_events=activities.flatMap(a=>[
  {date:a.start_date,activity_id:a.id,kind:"START"},
  {date:a.finish_date,activity_id:a.id,kind:"FINISH"}
 ]).sort((a,b)=>a.date.localeCompare(b.date)||a.activity_id.localeCompare(b.activity_id));
 return {...model,activities,calendar_events,
  house_calendar:{...REFERENCE_HOUSE_CALENDAR,scenario_anchor:origin,
   original_source_sha256:model.input_sha256},
  time_model:"SUNDAY_TO_FRIDAY_WORKDAY_PROJECTION_FROM_SOURCE_SLOTS_NOT_BASELINE",
  planning_status:"OWNER_SATURDAY_OFF_UNAPPROVED_REFERENCE",
  engineering_release:false,baseline_approved:false
 };
}
