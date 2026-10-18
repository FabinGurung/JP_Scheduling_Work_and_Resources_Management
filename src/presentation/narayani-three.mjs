// Optional Three.js WBS constellation — data comes ONLY from project-model.json.
// 3D is a dependency/network view, NOT IFC geometry, not an approved site model.
// Dynamically downloaded only when the field engineer selects the 3D view.
// Failure must leave the 2D SVG view fully operational.
const THREE_URL="https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js";
export const THREE_PIN="0.180.0";
const palette={normal:0x789bb6,reported:0xffc96a,hold:0xf08c7e,milestone:0x8eeaff,selected:0x83f8ee,active:0x7bdbff};
export async function mountConstellation3D({host,model,selected,onSelect,onUnavailable}){
 if(!host||!model?.activities?.length||!Array.isArray(model.links)||typeof onSelect!=="function")throw Error("3D project model not ready");
 const THREE=await import(THREE_URL);
 let disposed=false,drag=null,frame=0,preview=-1,focus=selected,lon=0.3,lat=0.35,range=95;
 const scene=new THREE.Scene();scene.background=new THREE.Color(0x071324);
 scene.fog=new THREE.FogExp2(0x071324,0.0028);
 const camera=new THREE.PerspectiveCamera(51,1,0.1,400);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"low-power"});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute("aria-label","Interactive 3D construction dependency universe");
 renderer.domElement.setAttribute("role","img");
 renderer.domElement.style.cssText="display:block;width:100%;height:100%;touch-action:none;cursor:grab";
 host.replaceChildren(renderer.domElement);
 const ambient=new THREE.AmbientLight(0xa3d9ff,1.2);scene.add(ambient);
 const lamp=new THREE.PointLight(0x83eaff,1100,190);lamp.position.set(13,30,38);scene.add(lamp);
 const sphere=new THREE.IcosahedronGeometry(1.65,2);
 const meshMap=new Map(),objects=[],byId=new Map(model.activities.map(a=>[a.id,a]));
 const xmax=Math.max(...model.activities.map(a=>a.master_finish_exclusive_slot),1);
 const phaseIds=model.phases.map(p=>p.id);
 const perPhase=new Map();
 function position(a){
  const k=phaseIds.indexOf(a.phase_id);
  const n=perPhase.get(a.phase_id)||0;perPhase.set(a.phase_id,n+1);
  const x=-40+80*((a.master_start_slot+a.master_finish_exclusive_slot)/2)/xmax;
  const y=(model.phases.length-1)/2*7-k*7;
  const z=(n%5-2)*3.4+(k%2)*1.2;
  return new THREE.Vector3(x,y,z);
 }
 // Nodes follow the same existing 45 IDs and two-dimensional predecessor graph.
 for(const a of model.activities){
  const status=a.hold_ids.length||a.mcq_report_state==="BLOCKED"?"hold":
   a.reported_subwork_count||["IN_PROGRESS","REPORTED_COMPLETE"].includes(a.mcq_report_state)?"reported":"normal";
  const color=palette[a.type==="Milestone"?"milestone":status];
  const material=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:a.type==="Milestone"?.29:.16,metalness:.26,roughness:.35});
  const mesh=new THREE.Mesh(sphere,material);
  mesh.position.copy(position(a));
  mesh.scale.setScalar(a.type==="Milestone"?1.35:.85);
  mesh.userData={activityId:a.id,status,baseScale:a.type==="Milestone"?1.35:.85,baseColor:color};
  meshMap.set(a.id,mesh);objects.push(mesh);scene.add(mesh);
  const halo=new THREE.Mesh(new THREE.RingGeometry(2.2,2.55,48),
   new THREE.MeshBasicMaterial({color:color,side:THREE.DoubleSide,transparent:true,opacity:.17,depthWrite:false}));
  halo.userData.activityId=a.id;mesh.add(halo);
  // Canvas textures are created for ID labels; no third-party fonts or remote assets.
  const c=document.createElement("canvas");c.width=256;c.height=64;
  const ctx=c.getContext("2d");ctx.clearRect(0,0,256,64);
  ctx.fillStyle="#d3eeff";ctx.font="bold 30px system-ui,sans-serif";ctx.textAlign="center";ctx.fillText(a.id,128,43);
  const texture=new THREE.CanvasTexture(c);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthWrite:false}));
  sprite.position.set(0,3.45,0);sprite.scale.set(9,2.25,1);mesh.add(sprite);
 }
 const wires=[];
 for(const link of model.links){
  const from=meshMap.get(link.from),to=meshMap.get(link.to);if(!from||!to)throw Error("Orphan 3D dependency");
  const geo=new THREE.BufferGeometry().setFromPoints([from.position,to.position]);
  const material=new THREE.LineBasicMaterial({color:0x557c9c,transparent:true,opacity:.42});
  const wire=new THREE.Line(geo,material);scene.add(wire);wires.push({wire,from:link.from,to:link.to});
 }
 // Consistent seeded starfield: ambience only, not imaginary activities.
 let seed=721910;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296};
 const dots=new Float32Array(720*3);
 for(let i=0;i<720;i++){dots[i*3]=(random()-.5)*205;dots[i*3+1]=(random()-.5)*140;dots[i*3+2]=(random()-.5)*110-15}
 const stars=new THREE.BufferGeometry();stars.setAttribute("position",new THREE.BufferAttribute(dots,3));
 const starPoints=new THREE.Points(stars,new THREE.PointsMaterial({color:0x7b9db8,size:.22,transparent:true,opacity:.5,sizeAttenuation:true}));
 scene.add(starPoints);
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),target=new THREE.Vector3();
 function updateCamera(){
  camera.position.set(target.x+range*Math.sin(lon)*Math.cos(lat),target.y+range*Math.sin(lat),target.z+range*Math.cos(lon)*Math.cos(lat));
  camera.lookAt(target);
 }
 function renderState(){
  for(const [id,mesh] of meshMap){
   const active=preview>=0&&byId.get(id).master_start_slot<=preview&&preview<byId.get(id).master_finish_exclusive_slot;
   const chosen=id===focus,base=mesh.userData.baseColor;
   mesh.material.color.setHex(chosen?palette.selected:active?palette.active:base);
   mesh.material.emissive.setHex(chosen?palette.selected:active?palette.active:base);
   mesh.material.emissiveIntensity=chosen?.65:active?.47:.18;
   mesh.userData.highlighted=active;
  }
  for(const line of wires){
   const linkActive=preview>=0&&byId.get(line.from).master_start_slot<=preview&&byId.get(line.to).master_start_slot<=preview;
   const picked=focus&&(line.to===focus||line.from===focus);
   line.wire.material.color.setHex(picked?palette.selected:linkActive?palette.active:0x557c9c);
   line.wire.material.opacity=picked?.95:linkActive?.68:.3;
  }
 }
 function resize(){
  if(disposed)return;
  const w=Math.max(250,host.clientWidth),h=Math.max(330,host.clientHeight);
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();
 }
 function render(){
  if(disposed)return;
  renderer.render(scene,camera);
 }
 const move=e=>{
  if(!drag)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;
  lon-=dx*.006;lat=Math.max(-1.25,Math.min(1.25,lat+dy*.005));
  drag.x=e.clientX;drag.y=e.clientY;updateCamera();render();
 };
 const down=e=>{if(e.button!==0)return;drag={x:e.clientX,y:e.clientY,moved:false};renderer.domElement.setPointerCapture(e.pointerId)};
 const up=e=>{
  if(!drag)return;const clicked=!drag.moved;drag=null;
  if(!clicked)return;
  const box=renderer.domElement.getBoundingClientRect();
  pointer.x=((e.clientX-box.left)/box.width)*2-1;
  pointer.y=-((e.clientY-box.top)/box.height)*2+1;
  raycaster.setFromCamera(pointer,camera);
  const hit=raycaster.intersectObjects(objects,false)[0];
  if(hit?.object?.userData?.activityId)onSelect(hit.object.userData.activityId);
 };
 const wheel=e=>{e.preventDefault();range=Math.max(26,Math.min(195,range*(e.deltaY>0?1.09:.91)));updateCamera();render()};
 const lost=e=>{e.preventDefault();if(typeof onUnavailable==="function")onUnavailable("WebGL context lost; switched to the 2D graph.");};
 renderer.domElement.addEventListener("pointerdown",down);
 renderer.domElement.addEventListener("pointermove",move);
 renderer.domElement.addEventListener("pointerup",up);
 renderer.domElement.addEventListener("wheel",wheel,{passive:false});
 renderer.domElement.addEventListener("webglcontextlost",lost);
 const observer=new ResizeObserver(resize);observer.observe(host);
 const reduceMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
 function tick(time){
  if(disposed)return;
  for(const mesh of objects){
   const s=mesh.userData.baseScale;
   mesh.scale.setScalar(s*(mesh.userData.highlighted&&!reduceMotion?1+.06*Math.sin(time*.002):1));
  }
  render();frame=requestAnimationFrame(tick);
 }
 updateCamera();renderState();resize();frame=requestAnimationFrame(tick);
 return {
  select(id){if(!meshMap.has(id))return;focus=id;renderState()},
  preview(slot){preview=Number.isInteger(slot)?slot:-1;renderState()},
  reset(){lon=.3;lat=.35;range=95;target.set(0,0,0);updateCamera();render()},
  dispose(){
   if(disposed)return;disposed=true;
   cancelAnimationFrame(frame);observer.disconnect();
   renderer.domElement.removeEventListener("pointerdown",down);
   renderer.domElement.removeEventListener("pointermove",move);
   renderer.domElement.removeEventListener("pointerup",up);
   renderer.domElement.removeEventListener("wheel",wheel);
   renderer.domElement.removeEventListener("webglcontextlost",lost);
   scene.traverse(item=>{
    if(item.geometry&&item.geometry!==sphere)item.geometry.dispose();
    const arr=item.material?(Array.isArray(item.material)?item.material:[item.material]):[];
    for(const m of arr){if(m.map)m.map.dispose();m.dispose()}
   });
   sphere.dispose();renderer.dispose();renderer.domElement.remove();
  }
 };
}
