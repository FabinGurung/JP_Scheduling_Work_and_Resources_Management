function q(s){return String(s??"").replace(/"/g,"'");}
export function toTaskJuggler(schedule,relationships=[]){
  const unsupported=relationships.filter(r=>String(r.type??"FS").toUpperCase()!=="FS");
  const incoming=new Map(schedule.activities.map(a=>[a.id??a.activity_id,[]]));
  for(const r of relationships){const t=String(r.type??"FS").toUpperCase(); if(t==="FS"&&incoming.has(r.successor)) incoming.get(r.successor).push(r.predecessor);}
  const lines=['project p "Project Controls Kernel Export" "1.0" 2026-01-01 +5y',""]; 
  for(const a of schedule.activities){
    const rawId=a.id??a.activity_id, id=rawId.replace(/[^A-Za-z0-9_]/g,"_");
    lines.push(`task ${id} "${q(a.name)}" {`);
    if(a.duration===0) lines.push("  milestone"); else lines.push(`  duration ${Math.max(1,Math.round(a.duration))}d`);
    const deps=incoming.get(rawId)??[]; if(deps.length) lines.push("  depends "+deps.map(x=>x.replace(/[^A-Za-z0-9_]/g,"_")).join(", "));
    lines.push("}","");
  }
  return {text:lines.join("\n"),unsupported_relationships:unsupported,note:"FS subset exporter for validation/reference; non-FS relationships remain explicit TODOs."};
}
