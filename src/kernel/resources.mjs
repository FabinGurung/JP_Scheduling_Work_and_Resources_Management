export function findResourceOverloads({scheduledActivities,assignments=[],capacities={}}){
  const acts=new Map(scheduledActivities.map(a=>[a.id??a.activity_id,a])), usage=new Map();
  for(const x of assignments){
    const activityId=x.activity_id??x.activityId, resourceId=x.resource_id??x.resourceId, units=Number(x.units??1), a=acts.get(activityId);
    if(!a||a.duration<=0||!resourceId) continue;
    for(let slot=Math.floor(a.es);slot<Math.ceil(a.ef);slot++){
      const key=`${resourceId}@${slot}`, cur=usage.get(key)??{resource_id:resourceId,slot,units:0,activities:[]};
      cur.units+=units; cur.activities.push(activityId); usage.set(key,cur);
    }
  }
  return [...usage.values()].map(u=>({...u,capacity:Number(capacities[u.resource_id]??1)})).filter(u=>u.units>u.capacity).sort((a,b)=>a.slot-b.slot||a.resource_id.localeCompare(b.resource_id));
}
