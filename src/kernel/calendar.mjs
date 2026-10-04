const DAY=86400000;
const utc=d=>new Date(d+"T00:00:00Z");
const iso=d=>new Date(d).toISOString().slice(0,10);
function validateDate(value,label){
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label} must be an ISO date`);
  const date=utc(value);
  if(!Number.isFinite(date.getTime())||iso(date)!==value) throw new Error(`${label} is not a real date`);
  return date;
}
export function buildWorkingCalendar({start,end,workingWeekdays=[1,2,3,4,5,6],holidays=[]}){
  let d=validateDate(start,"Calendar start");const last=validateDate(end,"Calendar end");
  if(d>last) throw new Error("Calendar end precedes start");
  if(!Array.isArray(workingWeekdays)||workingWeekdays.some(x=>!Number.isInteger(x)||x<0||x>6)) throw new Error("Working weekdays must be integers from 0 to 6");
  if(!Array.isArray(holidays)) throw new Error("holidays must be an array");
  for(const holiday of holidays) validateDate(holiday,"Holiday");
  const work=new Set(workingWeekdays), hs=new Set(holidays), out=[];
  while(d<=last){const s=iso(d); if(work.has(d.getUTCDay())&&!hs.has(s)) out.push(s); d=new Date(d.getTime()+DAY);}
  return out;
}
export function slotToDate(slot,workingDates){return Number.isInteger(slot)&&slot>=0&&slot<workingDates.length?workingDates[slot]:null;}
export function finishSlotToDate(ef,duration,workingDates){return duration===0?slotToDate(ef,workingDates):slotToDate(ef-1,workingDates);}
export function scheduleToDates(schedule,workingDates){return schedule.activities.map(a=>({...a,start_date:slotToDate(a.es,workingDates),finish_date:finishSlotToDate(a.ef,a.duration,workingDates),late_start_date:slotToDate(a.ls,workingDates),late_finish_date:finishSlotToDate(a.lf,a.duration,workingDates)}));}
