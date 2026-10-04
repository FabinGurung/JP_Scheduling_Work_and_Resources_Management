// Diagnostic findings only. These checks do not certify a schedule or P6/DCMA compliance.
export function inspectSchedule({schedule,relationships=[],status=[],constraints=schedule.constraints??[]}) {
  const findings=[];
  const incoming=new Set(relationships.map(r=>r.successor??r.successor_id));
  const outgoing=new Set(relationships.map(r=>r.predecessor??r.predecessor_id));
  for(const a of schedule.activities){
    if(!incoming.has(a.id)) findings.push({code:"OPEN_START",severity:"INFO",activity_id:a.id,message:"No incoming relationship; confirm this is an intended network entry."});
    if(!outgoing.has(a.id)) findings.push({code:"OPEN_FINISH",severity:"INFO",activity_id:a.id,message:"No outgoing relationship; confirm this is an intended network exit."});
    if(a.total_float < -1e-9) findings.push({code:"NEGATIVE_FLOAT",severity:"WARNING",activity_id:a.id,value:a.total_float,message:"Forecast logic exceeds a required finish or latest constraint."});
  }
  const seen=new Set();
  for(const r of relationships){
    const key=JSON.stringify([r.predecessor??r.predecessor_id,r.successor??r.successor_id,String(r.type??"FS").toUpperCase(),Number(r.lag??0)]);
    if(seen.has(key)) findings.push({code:"DUPLICATE_RELATIONSHIP",severity:"WARNING",relationship:r,message:"The same logical relationship is present more than once."});
    seen.add(key);
    if(Number(r.lag??0)<0) findings.push({code:"NEGATIVE_LAG",severity:"WARNING",relationship:r,message:"A lead overlaps work; verify that the overlap is intentional."});
  }
  for(const c of constraints) if(!c.ok) findings.push({code:"CONSTRAINT_VIOLATION",severity:"WARNING",activity_id:c.activity_id,constraint:c,message:"A calculated or actual point does not satisfy the declared constraint."});
  for(const s of status) for(const issue of s.issues??[]) findings.push({code:issue,severity:"WARNING",activity_id:s.activity_id,message:"Planned start precedes the data date and no actual start is recorded."});
  return {findings,counts:{information:findings.filter(f=>f.severity==="INFO").length,warnings:findings.filter(f=>f.severity==="WARNING").length}};
}
