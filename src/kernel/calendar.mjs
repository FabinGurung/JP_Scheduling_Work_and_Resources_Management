const DAY=86400000;
const utc=d=>new Date(d+"T00:00:00Z");
const iso=d=>new Date(d).toISOString().slice(0,10);
export function buildWorkingCalendar({start,end,workingWeekdays=[1,2,3,4,5,6],holidays=[]}){
  const work=new Set(workingWeekdays), hs=new Set(holidays), out=[]; let d=utc(start), last=utc(end);
  while(d<=last){const s=iso(d); if(work.has(d.getUTCDay())&&!hs.has(s)) out.push(s); d=new Date(d.getTime()+DAY);}
  return out;
}
export function slotToDate(slot,workingDates){return Number.isInteger(slot)&&slot>=0&&slot<workingDates.length?workingDates[slot]:null;}
export function finishSlotToDate(ef,duration,workingDates){return duration===0?slotToDate(Math.min(ef,workingDates.length-1),workingDates):slotToDate(ef-1,workingDates);}
export function scheduleToDates(schedule,workingDates){return schedule.activities.map(a=>({...a,start_date:slotToDate(a.es,workingDates),finish_date:finishSlotToDate(a.ef,a.duration,workingDates),late_start_date:slotToDate(Math.max(0,a.ls),workingDates),late_finish_date:finishSlotToDate(Math.max(0,a.lf),a.duration,workingDates)}));}
