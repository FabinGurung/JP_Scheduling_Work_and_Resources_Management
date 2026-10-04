import test from "node:test";
import {verifyCase} from "../scripts/verify-schedule-oracle.mjs";

test("CPM early and late starts match an independent placement oracle for mixed logic and conflicts",()=>{
  for(const [type,lag] of [["FS",0],["SS",1],["FF",-1],["SF",1]]){
    for(const constraint of ["START_ON_OR_AFTER","FINISH_ON_OR_BEFORE","MUST_FINISH_ON"]){
      verifyCase({activities:[{id:"A",duration:2},{id:"B",duration:1},{id:"C",duration:2}],
        relationships:[{predecessor:"A",successor:"B",type,lag},{predecessor:"B",successor:"C",type:"SS",lag:0}],
        constraints:[{activity_id:"B",type:constraint,slot:3}],requiredFinish:4});
    }
  }
});
