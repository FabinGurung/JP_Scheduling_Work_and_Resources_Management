/* Shared navigation; private sources never loaded from the site. */
const base=new URL("../",import.meta.url);
function address(path){return new URL(path,base).href}
function entry(parent,label,path){const a=document.createElement("a");a.textContent=label;a.href=address(path);parent.append(a);return a}

/* Pip travels through the *visible page*, not a mock progress engine.
   Ten intentional encounters give one stationary petting window.
   A private planning/project state is never read, fetched or modified here. */
function createPipRoam(pip,header,reduced){
 const hint=document.createElement("span");
 hint.className="sf-pip-hint";hint.textContent="You can pet Pip!";
 pip.append(hint);pip.classList.add("sf-pip-roamer");
 pip.setAttribute("role","button");pip.tabIndex=0;
 // A serpentine, short-segment zigzag visits upper, middle and lower visible page.
 // Waypoints are fractions of SAFE viewport space (below the navigation).
 // Each normal segment moves at approximately 16 CSS pixels per second.
 const SLOW_PIP_PIXELS_PER_SECOND=16;
 const positions=[
  [.05,.12],[.23,.22],[.41,.12],[.59,.23],[.77,.13],[.90,.25],
  [.75,.37],[.57,.28],[.39,.39],[.21,.29],[.06,.43],
  [.23,.55],[.41,.44],[.59,.56],[.77,.46],[.90,.59],
  [.76,.72],[.58,.61],[.40,.74],[.22,.64],[.06,.77],
  [.20,.87],[.39,.77],[.57,.88],[.76,.78],[.90,.86],
  [.78,.68],[.60,.77],[.42,.65],[.24,.76],[.06,.64],
  [.18,.49],[.35,.59],[.52,.47],[.69,.55],[.87,.42]
 ];
 let index=0,encounters=0,resting=false,paused=reduced,tick=null,petEnd=null,lastHit=0;
 const win=()=>({w:Math.max(320,window.innerWidth),h:Math.max(300,window.innerHeight)});
 function target(i){
  const {w,h}=win(),p=positions[i%positions.length],size=w<=720?55:69;
  const headBottom=header.getBoundingClientRect().bottom+10;
  const minY=Math.min(h-80,Math.max(75,headBottom)),maxY=Math.max(minY,h-86);
  return {x:Math.max(6,Math.min(w-size-7,Math.round(6+p[0]*(w-size-13)))),
   y:Math.max(minY,Math.min(maxY,Math.round(minY+p[1]*(maxY-minY))))};
 }
 function clearTick(){if(tick!==null){clearTimeout(tick);tick=null}}
 function clearPet(){if(petEnd!==null){clearTimeout(petEnd);petEnd=null}}
 function holdPosition(){
  // Capture the *current* interpolated location before removing a transition.
  const rect=pip.getBoundingClientRect();
  pip.style.transitionDuration="0ms";
  pip.style.left=rect.left+"px";pip.style.top=rect.top+"px";
 }
 function announce(){
  pip.setAttribute("aria-label",resting?"Pip is resting: pet Pip now":
   "Pip the scheduling crawler. Encounter "+encounters+" of 10; Pip runs away when approached.");
 }
 function travelTo(i,escape=false){
  clearTick();
  if(paused||resting||document.hidden)return;
  const here=pip.getBoundingClientRect(),to=target(i);
  const distance=Math.hypot(to.x-here.left,to.y-here.top);
  // Do not create 6-second stops: schedule the next segment at transition end.
  const duration=escape?1700:Math.max(1700,Math.round(1000*distance/SLOW_PIP_PIXELS_PER_SECOND));
  pip.classList.toggle("sf-pip-escape",escape);
  pip.style.transitionDuration=duration+"ms";
  pip.style.left=to.x+"px";pip.style.top=to.y+"px";
  tick=setTimeout(()=>{index=(index+1)%positions.length;travelTo(index)},duration);
 }
 function endPetWindow(){
  clearPet();resting=false;encounters=0;
  pip.classList.remove("sf-pip-pettable","sf-pip-petted");
  announce();
  if(!paused){index=(index+1)%positions.length;travelTo(index)}
 }
 function encounter(){
  if(paused)return;
  if(resting){pip.classList.add("sf-pip-petted");hint.textContent="Thank you!";return}
  const now=Date.now();if(now-lastHit<900)return;lastHit=now;
  encounters++;clearTick();
  if(encounters%10===0){
   resting=true;holdPosition();
   pip.classList.add("sf-pip-pettable");
   pip.classList.remove("sf-pip-escape");
   hint.textContent="Pet Pip!";
   petEnd=setTimeout(endPetWindow,9000);
  }else{
   // Escapes are intentionally quicker than the normal slow crawl, but bounded.
   index=(index+1)%positions.length;
   travelTo(index,true);
  }
  announce();
 }
 pip.addEventListener("pointerenter",event=>{if(event.pointerType!=="touch")encounter()});
 pip.addEventListener("pointerdown",event=>{
  if(event.pointerType==="touch"||resting){event.preventDefault();encounter()}
 });
 pip.addEventListener("keydown",event=>{
  if(event.key==="Enter"||event.key===" "){event.preventDefault();encounter()}
 });
 document.addEventListener("visibilitychange",()=>{
  if(document.hidden){clearTick();holdPosition()}
  else if(!paused&&!resting){index=(index+1)%positions.length;travelTo(index)}
 });
 window.addEventListener("resize",()=>{
  if(paused||resting){holdPosition();return}
  travelTo(index);
 },{passive:true});
 document.body.append(pip);
 announce();
 const start=target(index);
 pip.style.transitionDuration="0ms";
 pip.style.left=start.x+"px";pip.style.top=start.y+"px";
 if(!paused)tick=setTimeout(()=>{index=1;travelTo(index)},100);
 return {setPaused(v){
  if(paused===v)return;
  paused=v;
  if(paused){clearTick();holdPosition();if(resting)clearPet()}
  else if(resting)petEnd=setTimeout(endPetWindow,9000);
  else{index=(index+1)%positions.length;travelTo(index)}
 }};
}

/* Shared, source-safe context: describes a workspace, never invents live progress. */
const sfPageProfiles={
 "index.html":{id:"home",title:"One governed project story",intro:"Choose a clear field view, or explore the technical methods under More.",rule:"Reported field evidence is not approval.",next:["Open constellation","projects/narayani/visual.html#constellation"]},
 "planner.html":{id:"planner",title:"Schedule workbench",intro:"Load or inspect a test network, then compare recalculated dates and resource assignments.",rule:"Scenario schedules do not become approved baselines automatically.",next:["Learn the CPM principles","how/index.html"]},
 "kernel-lab.html":{id:"kernel",title:"Mathematical engine lab",intro:"Explore the tested dependency and calendar contracts with reproducible examples.",rule:"Only inputs that pass the engine contract are meaningful.",next:["Researcher handbook","how/index.html"]},
 "advanced.html":{id:"advanced",title:"Technical control console",intro:"Inspect activity, capacity and machine evidence without losing the field-facing roadmap.",rule:"Technical projections are not signed engineering releases.",next:["Open project constellation","projects/narayani/visual.html#constellation"]},
 "roadmap.html":{id:"roadmap",title:"Development pathway",intro:"Follow which kernel capabilities are built, tested or still planned.",rule:"Planned work is not a deployed feature.",next:["Inspect the engine doctrine","how/index.html"]},
 "projects/narayani/index.html":{id:"narayani-index",title:"Narayani evidence boundaries",intro:"Review pilot WBS scope, source-backed reports and outstanding work readiness.",rule:"Private source revisions and engineering holds remain governed in Drive.",next:["Open visual schedule","projects/narayani/visual.html#constellation"]},
 "projects/narayani/visual.html":{id:"narayani-visual",title:"One visual planning model",intro:"Constellation, Gantt, calendar and checklist share the same validated WBS data.",rule:"Dates remain a synthetic scenario without an approved baseline.",next:["Researcher handbook","how/index.html"]},
 "projects/generic/index.html":{id:"generic",title:"Reusable project workspace",intro:"Each example has its own WBS and calculated events; four views share one model.",rule:"All built-in examples are public synthetic drafts, never live engineering approvals.",next:["Read the project compiler protocol","how/index.html"]},
 "studio/index.html":{id:"studio",title:"Reusable scheduling template",intro:"WBS import, kernel methods, work-item library and project records are all inside this single Level-1 Studio.",rule:"The template is versioned; project-specific approvals stay with each source record.",next:["Prepare a project","projects/generic/index.html"]},
 "studio/projects/narayani/index.html":{id:"studio-narayani",title:"Existing governed project",intro:"Original Narayani field controls remain at their existing source-linked project URLs.",rule:"This directory index does not approve source migration.",next:["Open existing field view","projects/narayani/visual.html"]},
 "studio/projects/community-clinic/index.html":{id:"studio-clinic",title:"Synthetic community clinic project",intro:"Calls the one project-independent renderer with its own canonical model.",rule:"Synthetic activities do not establish project-approved progress.",next:["Open Studio","studio/index.html"]},
 "studio/projects/pedestrian-bridge/index.html":{id:"studio-bridge",title:"Synthetic pedestrian footbridge project",intro:"Calls the same shared renderer, with different WBS and activities.",rule:"Synthetic scheduling is not a signed baseline.",next:["Open Studio","studio/index.html"]},
 "machine/index.html":{id:"machine",title:"Deterministic machine evidence",intro:"Separate reviewed synthetic inputs, generated outputs and source manifests.",rule:"A successful deterministic build is not construction authorization.",next:["Inspect WBS machine result","machine/wbs-sample/index.html"]},
 "machine/demo-foundation/index.html":{id:"machine-demo",title:"Synthetic foundation demonstration",intro:"Read generated plan evidence, validated input references and machine output together.",rule:"A synthetic example contains no site-approved structural dimensions or work release.",next:["Open machine evidence centre","machine/index.html"]},
 "machine/wbs-sample/index.html":{id:"wbs-machine",title:"WBS machine output",intro:"Inspect the generated critical path and activity artifacts together.",rule:"This is source-pinned synthetic scheduling data, not signed site progress.",next:["Open field visual","projects/narayani/visual.html"]},
 "knowledge/index.html":{id:"knowledge",title:"Construction knowledge catalogue",intro:"Search construction methods and prepare trade-specific readiness checks.",rule:"Method guidance does not replace an engineer's approved issue.",next:["Open WBS checklist","projects/narayani/visual.html#checklist"]},
 "knowledge/task.html":{id:"task",title:"Method and readiness guide",intro:"See preparation logic, evidence and upstream method references for a selected task.",rule:"Validate local dimensions, site conditions and responsible approvals.",next:["Return to methods","knowledge/index.html"]},
 "more/legacy-home.html":{id:"legacy",title:"Preserved field roadmap",intro:"Historical site-facing navigation and data views remain recoverable.",rule:"Legacy presentation is not a current authoritative record.",next:["Open current work center","index.html"]},
 "how/index.html":{id:"how",title:"How the engine works",intro:"Learn CPM/PDM, calendars, WBS, resources, EVM and source-driven project generation.",rule:"Demonstration calculations are not approved site outcomes.",next:["Work-item reference catalog","work-items/index.html"]},
 "work-items/index.html":{id:"work-items",title:"Sourced construction work items",intro:"Consult source-scoped materials and role-day rates, not invented Nepal crew production figures.",rule:"Published coefficients are reference scenarios, not verified site durations or engineering approvals.",next:["Open generic scheduling planner","planner.html"]}
};
function pageKey(){
 const tail=location.pathname.startsWith(base.pathname)?location.pathname.slice(base.pathname.length):"";
 return tail===""?"index.html":tail.endsWith("/")?tail+"index.html":tail;
}
function mountContextGuide(profile){
 if(!profile||["home","narayani-visual","how","generic","studio","studio-clinic","studio-bridge","studio-narayani"].includes(profile.id))return;
 if(document.querySelector(".sf-page-guide"))return;
 const primary=document.querySelector("main")||document.querySelector(".workspace")||document.querySelector(".wrap")||document.querySelector(".shell");
 if(!primary)return;
 const guide=document.createElement("section");
 guide.className="sf-page-guide";guide.setAttribute("aria-label","Workspace orientation and source boundaries");
 function card(kicker,title,desc,lead=false){
  const item=document.createElement("div");item.className="sf-page-guide__item"+(lead?" sf-page-guide__item--lead":"");
  const eye=document.createElement("span");eye.className="sf-page-guide__eyebrow";eye.textContent=kicker;
  const heading=document.createElement("strong");heading.textContent=title;
  const p=document.createElement("p");p.textContent=desc;
  item.append(eye,heading,p);return item;
 }
 const one=card("This workspace",profile.title,profile.intro,true);
 const two=card("Interpretation rule","Keep project authority intact",profile.rule);
 const three=card("Continue","Connected workspace","Use the verified source-backed view that matches your task.");
 const a=document.createElement("a");a.href=address(profile.next[1]);a.textContent=profile.next[0]+" →";three.append(a);
 guide.append(one,two,three);
 const hero=primary.querySelector(".storm-hero,.hero");
 if(hero&&hero.parentNode===primary)hero.after(guide);
 else primary.prepend(guide);
}

function createShell(){
 if(document.querySelector(".sf-global"))return;
 const path=location.pathname;
 const profile=sfPageProfiles[pageKey()]||null;
 const visual=path.endsWith("/projects/narayani/visual.html");
 const home=path===base.pathname||path===base.pathname+"index.html"; // Exact site root only: nested project directory URLs are NOT the home surface.
 document.body.classList.add("sf-shelled");
 document.body.dataset.sfSurface=visual?"visual":home?"home":"legacy";
 document.body.dataset.sfPage=profile?.id||"other";
 const header=document.createElement("header");header.className="sf-global";header.setAttribute("aria-label","Skyforge primary navigation");
 const wrap=document.createElement("div");wrap.className="sf-inner";header.append(wrap);
 const brand=entry(wrap,"✦ SKYFORGE","index.html");brand.className="sf-mark";brand.setAttribute("aria-label","Skyforge home");
 const navigation=document.createElement("nav");navigation.className="sf-menu";navigation.setAttribute("aria-label","Site engineer views");
 const tabs=[["Overview","index.html"],["Studio","studio/index.html"],["Projects","studio/index.html#projects"]];
 for(const [label,target] of tabs){
  const a=entry(navigation,label,target);
  if((home&&label==="Overview")||(pageKey()==="studio/index.html"&&label==="Studio")||
   (pageKey().startsWith("studio/projects/")&&label==="Projects"))a.setAttribute("aria-current","page");
 }
 const more=document.createElement("details");more.className="sf-more";
 const summary=document.createElement("summary");summary.textContent="More ▾";summary.setAttribute("aria-label","More pages and advanced tools");more.append(summary);
 const menu=document.createElement("div");menu.className="sf-dropdown";
 menu.append(Object.assign(document.createElement("div"),{className:"sf-dropdown-heading",textContent:"Reference & project history"}));
 for(const [label,target] of [["Narayani Constellation","projects/narayani/visual.html#constellation"],["Narayani Gantt","projects/narayani/visual.html#gantt"],["Narayani Calendar","projects/narayani/visual.html#calendar"],["Narayani Checklist","projects/narayani/visual.html#checklist"],["How this engine works","how/index.html"],["Work-item library","work-items/index.html"],["Download Anki cards","how/skyforge-anki.csv"],["Full classic WBS","projects/narayani/index.html"],["Construction methods","knowledge/index.html"],["Development roadmap","roadmap.html"],["Legacy field homepage","more/legacy-home.html"]])entry(menu,label,target);
 menu.append(Object.assign(document.createElement("div"),{className:"sf-divider"}));
 menu.append(Object.assign(document.createElement("div"),{className:"sf-dropdown-heading",textContent:"Planner & engineering tools"}));
 for(const [label,target] of [["Project digitization workbench","projects/generic/index.html"],["Resource planner","planner.html"],["Scheduling engine lab","kernel-lab.html"],["Machine evidence","machine/index.html"],["Original technical dashboard","advanced.html"],["WBS machine Gantt","machine/wbs-sample/index.html"],["Upstream reference","knowledge/task.html?key=waterproofing"]])entry(menu,label,target);
 more.append(menu);navigation.append(more);wrap.append(navigation);
 // Pip is a decorative scheduling metaphor, not a source of actual-progress data.
 // Keep the character inside this dedicated rail; never cover buttons, calendars or WBS content.
 const reduced=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true;
 const rail=document.createElement("div");rail.className="sf-crawl-rail";rail.setAttribute("aria-hidden","true");
 const line=document.createElement("div");line.className="sf-crawl-line";rail.append(line);
 for(let i=0;i<7;i++){
  const tick=document.createElement("span");tick.className="sf-crawl-milestone";
  tick.style.left=(5+i*15)+"%";rail.append(tick);
 }
 const pip=document.createElement("span");pip.className="sf-crawl-runner";
 pip.innerHTML=`<svg class="sf-pip" viewBox="0 0 112 79" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <ellipse cx="55" cy="71" rx="36" ry="3.8" fill="#b6d6da" opacity=".45"/>
  <g class="sf-pip-feet" stroke="#478985" stroke-width="4" stroke-linecap="round" fill="none">
   <path class="sf-pip-foot-a" d="M29 58q-7 6-12 4m27-2q-4 9-10 8"/>
   <path class="sf-pip-foot-b" d="M70 60q4 9 12 8m13-15q10 7 14 5"/>
  </g>
  <g class="sf-pip-squish">
   <path d="M17 52L11 42 20 39 15 29 27 27 26 16 39 22 47 12 57 20 68 11 75 23 87 18 91 30 103 33 99 46 107 54 95 60 92 69 77 66 66 73 53 66 38 73 28 64 15 62Z" fill="#fbfdfb" stroke="#a7c9c8" stroke-width="2" stroke-linejoin="round"/>
   <ellipse cx="58" cy="44" rx="39" ry="26" fill="#f9fffe" stroke="#cce0dc" stroke-width="1"/>
   <path d="M35 26Q44 16 54 20M31 49Q26 57 34 62M74 24Q87 28 90 37" stroke="#ddece8" stroke-width="4" stroke-linecap="round" fill="none"/>
   <rect x="26" y="27" width="24" height="19" rx="8" fill="#b7eee0" stroke="#3b938d" stroke-width="1.7"/>
   <path d="M31 39h4v-6h4v6h5" stroke="#218780" stroke-width="2.2" stroke-linecap="round" fill="none"/>
   <circle cx="71" cy="40" r="4" fill="#28455c"/><circle cx="91" cy="42" r="4" fill="#28455c"/>
   <circle cx="72" cy="38.7" r="1.35" fill="#fff"/><circle cx="92" cy="40.7" r="1.35" fill="#fff"/>
   <ellipse cx="62" cy="50" rx="4.5" ry="2.5" fill="#f7b6ab" opacity=".8"/><ellipse cx="100" cy="50" rx="4.2" ry="2.4" fill="#f7b6ab" opacity=".8"/>
   <path d="M78 52q6 6 12 0" stroke="#577779" stroke-width="2" stroke-linecap="round" fill="none"/>
   <path d="M55 18q0-9 7-11" stroke="#558e89" stroke-width="2.5" stroke-linecap="round" fill="none"/>
   <circle cx="63" cy="7" r="4" fill="#f6be65" stroke="#ba8540" stroke-width="1"/>
  </g>
 </svg>`;
 rail.append(pip);header.append(rail);
 let roamController=null;
 const motion=document.createElement("button");
 motion.className="sf-crawl-control";motion.type="button";
 let paused=reduced;
 function syncPip(){
  header.classList.toggle("sf-crawl-paused",paused);
  motion.setAttribute("aria-pressed",String(paused));
  motion.setAttribute("aria-label",paused?"Play Pip's gentle scheduling crawl":"Pause Pip's gentle scheduling crawl");
  motion.title=paused?"Play mascot":"Pause mascot";
  motion.textContent=paused?"▶ Pip":"Ⅱ Pip";
 }
 syncPip();
 if(reduced){
  motion.disabled=true;
  motion.title="Motion disabled by your reduced-motion preference";
  motion.setAttribute("aria-label","Pip stays still because reduced motion is enabled");
 }else motion.addEventListener("click",()=>{paused=!paused;roamController?.setPaused(paused);syncPip()});
 wrap.append(motion);
 document.body.prepend(header);
 mountContextGuide(profile);
 roamController=createPipRoam(pip,header,reduced);
 document.addEventListener("click",event=>{if(more.open&&!more.contains(event.target))more.open=false});
 document.addEventListener("keydown",event=>{if(event.key==="Escape")more.open=false});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createShell,{once:true});else createShell();
