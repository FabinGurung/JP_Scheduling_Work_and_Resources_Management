/* Shared navigation; private sources never loaded from the site. */
const base=new URL("../",import.meta.url);
function address(path){return new URL(path,base).href}
function entry(parent,label,path){const a=document.createElement("a");a.textContent=label;a.href=address(path);parent.append(a);return a}
function createShell(){
 if(document.querySelector(".sf-global"))return;
 const path=location.pathname;
 const visual=path.endsWith("/projects/narayani/visual.html");
 const home=path.endsWith("/")||path.endsWith("/index.html")&&!path.includes("/knowledge/")&&!path.includes("/machine/")&&!path.includes("/projects/");
 document.body.classList.add("sf-shelled");
 document.body.dataset.sfSurface=visual?"visual":home?"home":"legacy";
 const header=document.createElement("header");header.className="sf-global";header.setAttribute("aria-label","Skyforge primary navigation");
 const wrap=document.createElement("div");wrap.className="sf-inner";header.append(wrap);
 const brand=entry(wrap,"✦ SKYFORGE","index.html");brand.className="sf-mark";brand.setAttribute("aria-label","Skyforge home");
 const navigation=document.createElement("nav");navigation.className="sf-menu";navigation.setAttribute("aria-label","Site engineer views");
 const tabs=[["Project","index.html"],["Constellation","projects/narayani/visual.html#constellation"],["Gantt","projects/narayani/visual.html#gantt"],["Calendar","projects/narayani/visual.html#calendar"],["Checklist","projects/narayani/visual.html#checklist"]];
 for(const [label,target] of tabs){
  const a=entry(navigation,label,target);
  if(visual&&location.hash==="#"+label.toLowerCase()||home&&label==="Project")a.setAttribute("aria-current","page");
 }
 const more=document.createElement("details");more.className="sf-more";
 const summary=document.createElement("summary");summary.textContent="More ▾";summary.setAttribute("aria-label","More pages and advanced tools");more.append(summary);
 const menu=document.createElement("div");menu.className="sf-dropdown";
 menu.append(Object.assign(document.createElement("div"),{className:"sf-dropdown-heading",textContent:"Reference & project history"}));
 for(const [label,target] of [["Full classic WBS","projects/narayani/index.html"],["Construction methods","knowledge/index.html"],["Development roadmap","roadmap.html"],["Legacy field homepage","more/legacy-home.html"]])entry(menu,label,target);
 menu.append(Object.assign(document.createElement("div"),{className:"sf-divider"}));
 menu.append(Object.assign(document.createElement("div"),{className:"sf-dropdown-heading",textContent:"Planner & engineering tools"}));
 for(const [label,target] of [["Resource planner","planner.html"],["Scheduling engine lab","kernel-lab.html"],["Machine evidence","machine/index.html"],["Original technical dashboard","advanced.html"],["WBS machine Gantt","machine/wbs-sample/index.html"],["Upstream reference","knowledge/task.html?key=waterproofing"]])entry(menu,label,target);
 more.append(menu);navigation.append(more);wrap.append(navigation);
 document.body.prepend(header);
 document.addEventListener("click",event=>{if(more.open&&!more.contains(event.target))more.open=false});
 document.addEventListener("keydown",event=>{if(event.key==="Escape")more.open=false});
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",createShell,{once:true});else createShell();
