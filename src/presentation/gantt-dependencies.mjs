/* FS/SS/FF/SF source/target attachment per Oracle P6:
 * FS end→start, SS start→start, FF end→end, SF start→end.
 * Published links remain read-only. No arrow is a work release. */
const iso=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\d$/.test(x)&&!Number.isNaN(Date.parse(x+"T00:00:00Z"));
const slots=(start,x)=>Math.round((Date.parse(x+"T00:00:00Z")-Date.parse(start+"T00:00:00Z"))/86400000);
export function relationEndpoints(type){
 const map={FS:["finish","start"],SS:["start","start"],FF:["finish","finish"],SF:["start","finish"]};
 if(!Object.prototype.hasOwnProperty.call(map,type))throw Error("Unsupported P6 relationship "+type);
 return map[type];
}
export function buildGanttLinkGeometry({links,activities,visibleIds,scenarioStart,px,rowY,scope="selected",selected=null}){
 if(!["selected","all","none"].includes(scope)||!(px>0)||!iso(scenarioStart))throw Error("Invalid Gantt connector mode");
 if(scope==="none")return [];
 const ids=new Set(visibleIds),byId=new Map(activities.map(x=>[x.id,x]));
 const visible=links.filter(l=>ids.has(l.from)&&ids.has(l.to)&&
  (scope==="all"||selected===l.from||selected===l.to));
 return visible.map(link=>{
  const from=byId.get(link.from),to=byId.get(link.to);
  if(!from||!to)throw Error("Orphan source relationship");
  const type=link.type||"FS",ep=relationEndpoints(type);
  const srcDay=ep[0]==="start"?from.start_date:from.finish_date;
  const dstDay=ep[1]==="start"?to.start_date:to.finish_date;
  if(!iso(srcDay)||!iso(dstDay))return null;
  const x0=slots(scenarioStart,srcDay)*px,
    x1=slots(scenarioStart,dstDay)*px;
  if(!Number.isFinite(rowY.get(link.from))||!Number.isFinite(rowY.get(link.to)))return null;
  const y0=rowY.get(link.from),y1=rowY.get(link.to);
  const elbow=Math.max(x0+14,x1+14);
  const d=`M ${x0} ${y0} L ${elbow} ${y0} L ${elbow} ${y1} L ${x1} ${y1}`;
  return {from:link.from,to:link.to,type,lag:link.lag||0,d,x0,x1,y0,y1,
   explanation:`${link.from} ${ep[0]} → ${link.to} ${ep[1]} (${type}; lag ${link.lag||0}${link.lag_basis==="elapsed"?" elapsed days":""})`};
 }).filter(Boolean);
}
export function drawGanttConnectors({table,body,axis,win,model,filtered,selected,scope}){
 if(!table||!filtered.length||!axis||!win)return {visible:0};
 const old=table.querySelector(".desk-dependency-svg");if(old)old.remove();
 if(scope==="none")return {visible:0};
 const rows=[...body.querySelectorAll("tr")],start=rows[0].getBoundingClientRect();
 const y=new Map(filtered.map((a,i)=>[a.id,rows[i].getBoundingClientRect().top-start.top+rows[i].getBoundingClientRect().height/2]));
 const all=buildGanttLinkGeometry({links:model.links,activities:model.activities,
  visibleIds:filtered.map(a=>a.id),scenarioStart:win.start,px:axis.px,rowY:y,scope,selected});
 const svgNS="http://www.w3.org/2000/svg";
 const graph=document.createElementNS(svgNS,"svg");
 graph.classList.add("desk-dependency-svg");
 const height=Math.max(51,body.getBoundingClientRect().height);
 graph.setAttribute("viewBox",`0 0 ${axis.w} ${height}`);
 graph.setAttribute("width",String(axis.w));graph.setAttribute("height",String(height));
 graph.setAttribute("aria-hidden","true");
 const defs=document.createElementNS(svgNS,"defs");
 const marker=document.createElementNS(svgNS,"marker");
 marker.id="desk-link-arrow";
 for(const [k,v] of Object.entries({markerWidth:"7",markerHeight:"7",refX:"6",refY:"3",orient:"auto",markerUnits:"userSpaceOnUse"}))marker.setAttribute(k,v);
 const arrow=document.createElementNS(svgNS,"path");arrow.setAttribute("d","M0 0 L6 3 L0 6 Z");arrow.setAttribute("fill","#c17e30");
 marker.append(arrow);defs.append(marker);graph.append(defs);
 for(const link of all){
  const path=document.createElementNS(svgNS,"path");
  path.setAttribute("d",link.d);path.setAttribute("fill","none");
  path.setAttribute("stroke","#bc873c");path.setAttribute("stroke-width",scope==="selected"?"2":"1.4");
  path.setAttribute("stroke-linejoin","round");path.setAttribute("marker-end","url(#desk-link-arrow)");
  const title=document.createElementNS(svgNS,"title");title.textContent=link.explanation;path.append(title);
  graph.append(path);
  if(scope==="selected"&&link.y1!==link.y0){
   const t=document.createElementNS(svgNS,"text");
   t.setAttribute("x",String(Math.min(axis.w-25,Math.max(8,(link.x0+link.x1)/2))));
   t.setAttribute("y",String((link.y0+link.y1)/2-5));
   t.setAttribute("font-size","12");t.setAttribute("fill","#865c24");t.setAttribute("font-weight","800");
   t.textContent=link.type;graph.append(t);
  }
 }
 // First chart track is the content coordinate origin; other rows remain
 // aligned because the shared table gives each row one measured Y position.
 const track=rows[0].querySelector(".desk-chart-track");
 if(track)track.append(graph);
 return {visible:all.length,shown:scope};
}
