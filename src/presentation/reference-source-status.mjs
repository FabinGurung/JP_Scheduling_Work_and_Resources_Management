/** Source authority status displayed on the work/material reference pages.
 * The page never connects to private Google Sheets, so no secrets/tokens leak
 * into the GitHub Pages runtime. Authenticated Actions publishes the status. */
export async function displayReferenceSourceStatus(doc=document){
 const mount=doc.getElementById("work-rates")||doc.getElementById("materials-planner");
 if(!mount)return;
 const box=doc.createElement("aside");
 box.setAttribute("role","status");
 box.setAttribute("aria-live","polite");
 box.style.cssText="display:block;box-sizing:border-box;max-width:1450px;padding:11px 14px;margin:10px auto;border:1px solid #d5e3e4;background:#fff8e8;border-left:4px solid #b98d34;border-radius:8px;color:#34565e;font:12px/1.5 system-ui,sans-serif";
 box.textContent="Checking published reference source…";
 mount.prepend(box);
 try{
  const res=await fetch(new URL("../../work-items/norms-source-status.json",import.meta.url),{cache:"no-store"});
  if(!res.ok)throw Error("Status manifest absent");
  const status=await res.json();
  if(status.sync_completed&&status.status==="GOOGLE_SHEETS_V000001_IMPORTED"){
   box.style.background="#eaf8f5";
   box.style.borderLeftColor="#268e7e";
   box.textContent="Source: two validated A9 Google Sheets registers → GitHub Actions → read-only Pages. "+
    status.work_items+" work codes · "+status.profiles+" rate profiles · "+
    status.material_assemblies+" assemblies. Published "+String(status.published_at||"").replace("T"," ").slice(0,19)+" UTC. This is NOT a site-approved BOQ or rate.";
  }else{
   box.textContent="SOURCE STATUS: Git seed reference currently displayed, NOT yet refreshed from the new A9 Google Sheets. "+
    "The live Sheets are created, but the authenticated publication connector must be enabled before edits automatically reach this page.";
  }
 }catch{
  box.textContent="SOURCE STATUS NOT VERIFIED: Sheets-to-Pages sync has not been confirmed; do not assume this page reflects the current Drive registers.";
 }
}
if(typeof document!=="undefined"){
 if(document.readyState==="loading")
  document.addEventListener("DOMContentLoaded",()=>displayReferenceSourceStatus(),{once:true});
 else displayReferenceSourceStatus();
}
