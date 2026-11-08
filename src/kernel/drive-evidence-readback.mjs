import {createHash} from "node:crypto";

/**
 * PRIVATE, authenticated Google Drive byte readback. Deliberately not a signer:
 * real independent service credentials and reviewer authority are still required.
 * The caller supplies a short-lived OAuth token with Drive file READ scope.
 *
 * Reads exact stored-file bytes only. Google-native Docs/Sheets/PDF exports have
 * different semantics and are intentionally rejected rather than guessed.
 */
export const MAX_DRIVE_EVIDENCE_BYTES=3_000_000;
const FILE_ID=/^[A-Za-z0-9_-]{10,180}$/;
const VERSION=/^[0-9]{1,30}$/;
const SHA=/^[0-9a-f]{64}$/;
const fail=reason=>{throw Error("Private Drive evidence readback blocked: "+reason)};
const safeMetadata=(raw,fileId)=>{
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||
    raw.id!==fileId||raw.trashed!==false||
    typeof raw.mimeType!=="string"||raw.mimeType.length>128||
    raw.mimeType.startsWith("application/vnd.google-apps")||
    !VERSION.test(raw.version??""))
  fail("file identity/version, stored-byte MIME type or trash state mismatch");
 const size=Number(raw.size);
 if(!Number.isSafeInteger(size)||size<0||size>MAX_DRIVE_EVIDENCE_BYTES)
  fail("unavailable or out-of-bounds original byte size");
 return {id:raw.id,version:raw.version,size,mime_type:raw.mimeType};
};
async function readBytes(response,max){
 const len=Number(response.headers?.get("content-length")??0);
 if(Number.isFinite(len)&&len>max)fail("provider response exceeds read limit");
 if(!response.body||typeof response.body.getReader!=="function")fail("streaming readback required");
 const reader=response.body.getReader();const chunks=[];
 let length=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   if(!(value instanceof Uint8Array))fail("unrecognized provider body chunk");
   length+=value.length;
   if(length>max)fail("provider body exceeds bounded read size");
   chunks.push(value);
  }
 }catch(e){await reader.cancel().catch(()=>{});throw e}
 return Buffer.concat(chunks,length);
}
export async function readAuthenticatedDriveEvidence({
 fileId,expectedVersion,expectedSha256,oauthToken,fetchImpl=fetch
}={}){
 if(!FILE_ID.test(fileId??"")||!VERSION.test(expectedVersion??"")||
    !SHA.test(expectedSha256??""))fail("explicit file ID, revision and SHA-256 required");
 if(typeof oauthToken!=="string"||oauthToken.length<20||/[\r\n]/.test(oauthToken))
  fail("trusted OAuth access token missing");
 if(typeof fetchImpl!=="function")fail("trusted provider read function required");
 const base="https://www.googleapis.com/drive/v3/files/"+encodeURIComponent(fileId);
 const metadataUrl=base+"?fields=id,mimeType,size,version,trashed";
 const headers={Authorization:"Bearer "+oauthToken,Accept:"application/json"};
 const get=async(url,accept)=>{
  const response=await fetchImpl(url,{method:"GET",
   headers:{...headers,Accept:accept},redirect:"error",cache:"no-store",
   signal:AbortSignal.timeout(25000)});
  if(!response?.ok)fail("provider read access denied or source unavailable");
  return response;
 };
 const metadata=async()=>{
  const r=await get(metadataUrl,"application/json");
  const raw=await readBytes(r,16_000);
  let m;
  try{m=JSON.parse(raw.toString("utf8"))}catch{fail("malformed provider metadata")}
  return safeMetadata(m,fileId);
 };
 const before=await metadata();
 if(before.version!==expectedVersion)fail("source changed since reviewed revision");
 const binary=await get(base+"?alt=media","application/octet-stream");
 const original=await readBytes(binary,MAX_DRIVE_EVIDENCE_BYTES);
 const actualSha256=createHash("sha256").update(original).digest("hex");
 if(original.length!==before.size||actualSha256!==expectedSha256)
  fail("original bytes do not match signed source content hash/size");
 const after=await metadata();
 if(after.version!==before.version||after.size!==before.size||after.mime_type!==before.mime_type)
  fail("source mutated during authenticated readback");
 return {
  format:"SKYFORGE_PRIVATE_DRIVE_BYTES_VERIFIED_V1",
  file_id:fileId,revision:before.version,
  content_sha256:actualSha256,byte_length:original.length,
  authority:"AUTHENTICATED_READONLY_DRIVE_BYTES_NOT_FIELD_APPROVAL",
  verified_readback:true,work_release:false
 };
}
