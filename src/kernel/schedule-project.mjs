import {scheduleNetwork} from "./cpm.mjs";
import {scheduleCalendarNetwork} from "./calendar-scheduler.mjs";
import {levelResourceDependentNetwork} from "./resource-leveler.mjs";
/**
 * Explicit safe entry point. Cross-calendar CPM uses the existing calendar-aware
 * kernel; shared-slot CPM is retained for uniform anonymous working slots.
 * Resource leveling is separate and cannot silently accept earned/actual work.
 */
export function scheduleProject(input,mode="AUTO"){
 if(!input||typeof input!=="object"||!Array.isArray(input.activities)||!input.activities.length)throw Error("Project activities required");
 if(!["AUTO","SHARED_CPM","CALENDAR_CPM","RESOURCE_LEVELING"].includes(mode))throw Error("Unsupported project scheduling mode");
 if(mode==="AUTO"){
  if(input.resources?.length||input.assignments?.length||input.materialReceipts?.length)
   throw Error("Explicit RESOURCE_LEVELING mode required for resource input, never ignore capacities");
  mode=input.calendars!=null?"CALENDAR_CPM":"SHARED_CPM";
 }
 if(mode==="SHARED_CPM"&&input.calendars!=null)throw Error("Use CALENDAR_CPM when calendar definitions are present");
 if(mode==="CALENDAR_CPM"&&(input.calendars==null||!input.projectStart||!input.horizonEnd))
  throw Error("Calendar schedule requires calendars, projectStart and horizonEnd");
 if(mode!=="RESOURCE_LEVELING"&&(input.resources?.length||input.assignments?.length||input.materialReceipts?.length))
  throw Error("Scheduling mode would omit resource controls");
 const output=mode==="CALENDAR_CPM"?scheduleCalendarNetwork(input):
   mode==="RESOURCE_LEVELING"?levelResourceDependentNetwork(input):scheduleNetwork(input);
 return {engine_mode:mode,planning_status:"CALCULATED_DRAFT_NOT_BASELINE",engineering_release:false,
  approved_baseline:false,output};
}
