const HHMM=/^(?:[01][0-9]|2[0-3]):[0-5][0-9]$/;

export function normalizeTimeZone(value="UTC",label="time_zone"){
  if(typeof value!=="string"||!value.trim()) throw new Error(`${label} must be a nonempty IANA time-zone name`);
  const zone=value.trim();
  try{new Intl.DateTimeFormat("en-US",{timeZone:zone}).format(new Date(0));}
  catch{throw new Error(`${label} must be a valid IANA time-zone name: ${zone}`);}
  return zone;
}

function minuteOfDay(value,label){
  if(typeof value!=="string"||!HHMM.test(value)) throw new Error(`${label} must use HH:MM 24-hour time`);
  const [h,m]=value.split(":").map(Number);
  return h*60+m;
}

function normalizeIntervals(intervals,label){
  if(!Array.isArray(intervals)||intervals.length===0) throw new Error(`${label} must contain at least one working interval`);
  const out=intervals.map((raw,index)=>{
    if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error(`${label} interval ${index+1} must be an object`);
    const start=raw.start,end=raw.end,start_minute=minuteOfDay(start,`${label} start`),end_minute=minuteOfDay(end,`${label} end`);
    if(end_minute<=start_minute) throw new Error(`${label} intervals must end after they start; overnight intervals are not supported in the Seq11 foundation`);
    return {start,end,start_minute,end_minute,minutes:end_minute-start_minute};
  }).sort((a,b)=>a.start_minute-b.start_minute);
  for(let i=1;i<out.length;i++) if(out[i].start_minute<out[i-1].end_minute) throw new Error(`${label} intervals must not overlap`);
  return out;
}

export function normalizeWorkingPeriods(value,{workingWeekdays=[]}={}){
  if(value==null) return [];
  let rows;
  if(Array.isArray(value)) rows=value;
  else if(value&&typeof value==="object") rows=Object.entries(value).map(([weekday,intervals])=>({weekday:Number(weekday),intervals}));
  else throw new Error("working_periods must be an array or weekday-keyed object");
  const allowed=new Set(workingWeekdays);
  const seen=new Set(),out=[];
  for(const raw of rows){
    if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("Each working_periods row must be an object");
    const weekday=Number(raw.weekday);
    if(!Number.isInteger(weekday)||weekday<0||weekday>6) throw new Error("working_periods weekday must be an integer from 0 to 6");
    if(seen.has(weekday)) throw new Error(`Duplicate working_periods weekday: ${weekday}`);
    if(allowed.size&&!allowed.has(weekday)) throw new Error(`working_periods weekday ${weekday} is not declared in working_weekdays`);
    seen.add(weekday);
    const intervals=normalizeIntervals(raw.intervals??raw.periods,`working_periods weekday ${weekday}`);
    out.push({weekday,intervals,total_minutes:intervals.reduce((sum,x)=>sum+x.minutes,0)});
  }
  if(out.length&&allowed.size){
    for(const weekday of allowed) if(!seen.has(weekday)) throw new Error(`working_periods must define every declared working weekday; missing weekday ${weekday}`);
  }
  return out.sort((a,b)=>a.weekday-b.weekday);
}

export function normalizeCalendarTimeContract(raw={},projectTimeZone="UTC",workingWeekdays=[]){
  const time_zone=normalizeTimeZone(raw.time_zone??raw.timeZone??projectTimeZone,"calendar time_zone");
  const working_periods=normalizeWorkingPeriods(raw.working_periods??raw.workingPeriods,{workingWeekdays});
  const totals=working_periods.map(x=>x.total_minutes);
  const nominal_day_minutes=totals.length&&totals.every(x=>x===totals[0])?totals[0]:null;
  return {time_zone,working_periods,has_intraday_contract:working_periods.length>0,nominal_day_minutes,minutes_per_week:totals.reduce((sum,x)=>sum+x,0),native_intraday_support:"CONTRACT_ONLY"};
}

export function assertDayResolution(value="DAY"){
  const mode=String(value??"DAY").toUpperCase();
  if(mode!=="DAY") throw new Error(`Native intraday scheduling is not implemented in Seq11; requested time resolution ${mode}`);
  return mode;
}
