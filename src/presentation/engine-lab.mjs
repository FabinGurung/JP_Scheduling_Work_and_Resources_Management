import {scheduleNetwork} from "../kernel/cpm.mjs";
import {buildWorkingCalendar,scheduleToDates} from "../kernel/calendar.mjs";
import {rescheduleRemaining} from "../kernel/status.mjs";
import {inspectSchedule} from "../kernel/qa.mjs";

// One calculation path shared by the page and integration tests.
export function calculateExample(demo,{dataDateSlot=demo.project.data_date_slot??0,applyConstraints=true}={}){
  const constraints=applyConstraints?(demo.constraints??[]):[];
  const schedule=scheduleNetwork({activities:demo.activities,relationships:demo.relationships,
    constraints,requiredFinish:demo.project.required_finish_slot});
  const dates=buildWorkingCalendar({start:demo.project.start,end:demo.calendar.horizon_end??"2027-03-31",
    workingWeekdays:demo.calendar.working_weekdays,holidays:demo.calendar.holidays});
  const remaining=rescheduleRemaining({scheduledActivities:schedule.activities,relationships:demo.relationships,
    constraints,updates:demo.status_updates??{},dataDateSlot,requiredFinishSlot:demo.project.required_finish_slot});
  return {schedule,dated:scheduleToDates(schedule,dates),remaining,
    qa:inspectSchedule({schedule,relationships:demo.relationships}),
    remainingQa:inspectSchedule({schedule:remaining.remaining_schedule??{activities:[],constraints:[]},
      relationships:remaining.remaining_schedule?.relationships??[],status:remaining.status,constraints:remaining.constraints,
      additionalFindings:remaining.progress_qa?.findings??[]})};
}
