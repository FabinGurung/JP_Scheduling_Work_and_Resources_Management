import {readFile} from "node:fs/promises";
import {proposeAiWbsRevision} from "../src/kernel/ai-source-revision.mjs";
import {formatAiRevisionReview} from "../src/kernel/ai-revision-report.mjs";

/**
 * Trusted local-only review. Usage:
 *   node scripts/review-ai-source-revision.mjs <published-model.json> <request.json>
 * Exit nonzero for stale source/invalid request; never writes to Drive/GitHub.
 */
if(process.argv.length!==4){
 console.error("Usage: node scripts/review-ai-source-revision.mjs <published-model.json> <request.json>");
 process.exitCode=2;
}else{
 try{
  const [sourceText,requestText]=await Promise.all(
   process.argv.slice(2).map(path=>readFile(path,"utf8")));
  const proposal=proposeAiWbsRevision(JSON.parse(sourceText),JSON.parse(requestText));
  process.stdout.write(formatAiRevisionReview(proposal));
 }catch(error){
  console.error("SOURCE REVISION BLOCKED: "+error.message);
  process.exitCode=1;
 }
}
