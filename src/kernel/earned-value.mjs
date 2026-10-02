const safe=(a,b)=>b===0?null:a/b;
export function earnedValueMetrics({bac=0,pv=0,ev=0,ac=0}){
  bac=Number(bac);pv=Number(pv);ev=Number(ev);ac=Number(ac);
  const spi=safe(ev,pv), cpi=safe(ev,ac), sv=ev-pv, cv=ev-ac, eac=cpi==null?null:bac/cpi, etc=eac==null?null:eac-ac, vac=eac==null?null:bac-eac;
  return {bac,pv,ev,ac,spi,cpi,sv,cv,eac,etc,vac};
}
