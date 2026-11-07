/**
 * Read-only Constellation viewport math. Zoom changes presentation pixels,
 * never WBS positions, source records, scheduled slots or dependencies.
 */
export const MIN_CONSTELLATION_ZOOM=0.035;
export const MAX_CONSTELLATION_ZOOM=3;
export function clampConstellationZoom(value){
 if(!Number.isFinite(value)||value<=0)throw Error("Zoom must be positive and finite");
 return Math.min(MAX_CONSTELLATION_ZOOM,Math.max(MIN_CONSTELLATION_ZOOM,value));
}
export function fitConstellationZoom(worldWidth,worldHeight,viewportWidth,viewportHeight){
 if([worldWidth,worldHeight,viewportWidth,viewportHeight].some(x=>!Number.isFinite(x)||x<=0))
  throw Error("Positive Constellation geometry required");
 return clampConstellationZoom(Math.min(
  Math.max(1,viewportWidth-28)/worldWidth,
  Math.max(1,viewportHeight-28)/worldHeight));
}
export function zoomConstellationAt({
 oldZoom,nextZoom,scrollLeft,scrollTop,
 viewportWidth,viewportHeight,worldWidth,worldHeight,
 anchorX=viewportWidth/2,anchorY=viewportHeight/2
}){
 if([oldZoom,scrollLeft,scrollTop,viewportWidth,viewportHeight,worldWidth,worldHeight,anchorX,anchorY]
   .some(x=>!Number.isFinite(x))||
   oldZoom<=0||viewportWidth<=0||viewportHeight<=0||worldWidth<=0||worldHeight<=0)
  throw Error("Invalid Constellation viewport");
 const zoom=clampConstellationZoom(nextZoom);
 const worldX=(scrollLeft+anchorX)/oldZoom,worldY=(scrollTop+anchorY)/oldZoom;
 const clamp=(v,max)=>Math.min(Math.max(0,v),Math.max(0,max));
 return {
  zoom,
  scrollLeft:clamp(worldX*zoom-anchorX,worldWidth*zoom-viewportWidth),
  scrollTop:clamp(worldY*zoom-anchorY,worldHeight*zoom-viewportHeight)
 };
}
