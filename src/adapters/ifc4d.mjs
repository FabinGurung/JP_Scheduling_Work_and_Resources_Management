export const IFC4D_CAPABILITIES=Object.freeze({
  upstream:"IfcOpenShell/IfcOpenShell",role:"IFC 4D interoperability",
  formats:["IFC","Oracle P6 XER","Oracle P6 XML","MS Project XML","Powerproject XML"]
});
export function toIfc4dNeutral(schedule){
  return {work_plan:{name:schedule.project?.name??"Project Controls Kernel",tasks:schedule.activities.map(a=>({
    identification:a.id??a.activity_id,name:a.name,duration:a.duration,early_start_slot:a.es,early_finish_slot:a.ef,total_float:a.total_float,critical:a.critical
  }))},note:"Neutral mapping only. Actual IFC/P6/MSP serialization is delegated to IfcOpenShell/Ifc4D."};
}
