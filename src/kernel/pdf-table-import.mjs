import {digitizeGenericTable} from "./generic-digitizer.mjs";
import {sha256Hex} from "./sha256.mjs";
const REQUIRED=["activity_id","activity_name","wbs_id","wbs_name","duration_slots"];
const escapeCell=t=>'"'+String(t).replace(/"/g,'""')+'"';
/** Converts PDF.js text item coordinates into a REVIEWABLE column table preview.
 * All pages must share one explicit header; never infers duration from a date/graphic.
 * Text extraction is client-only, OCR/scans are not supported.
 */
export function pdfTextItemsToTable(pages){
 if(!Array.isArray(pages)||!pages.length||pages.length>100)throw Error("PDF requires 1–100 machine-readable pages");
 const grouped=[];
 for(const [pageIndex,items] of pages.entries()){
  if(!Array.isArray(items)||items.length>25000)throw Error("Unsafe PDF page text item count");
  const ordered=items.filter(x=>typeof x.str==="string"&&Array.isArray(x.transform)&&
    Number.isFinite(x.transform[4])&&Number.isFinite(x.transform[5])&&x.str.trim()!=="")
   .map(x=>({x:x.transform[4],y:x.transform[5],s:x.str.trim()}))
   .sort((a,b)=>b.y-a.y||a.x-b.x);
  const rows=[];
  for(const t of ordered){
   let r=rows.find(r=>Math.abs(r.y-t.y)<3);
   if(!r){r={y:t.y,items:[]};rows.push(r)}
   r.items.push(t);
  }
  rows.sort((a,b)=>b.y-a.y);
  grouped.push({page:pageIndex+1,rows:rows.map(x=>x.items.sort((a,b)=>a.x-b.x))});
 }
 // Recognize source-defined header coordinates only, never infer semantic fields from labels.
 let header=null,headerPage=null,headerY=null;
 for(const p of grouped){
  for(const row of p.rows){
   const labels=row.map(x=>x.s.toLowerCase().trim().replace(/\s+/g,"_"));
   if(REQUIRED.every(h=>labels.includes(h))){
    if(!header){header=row;headerPage=p.page;headerY=row[0].y;}
    else if(header.length!==row.length||row.map(x=>x.s.toLowerCase()).join("|")!==header.map(x=>x.s.toLowerCase()).join("|"))
      throw Error("PDF has inconsistent table header across pages; manual normalization required");
   }
  }
 }
 if(!header)throw Error("No explicit machine-readable schedule header found in PDF. OCR, vector graphics and page pictures are unsupported; use source Excel/XER or manually transcribe a table.");
 const positions=header.map(x=>x.x);
 if(positions.some((x,i)=>i>0&&x<=positions[i-1]))throw Error("PDF column coordinates ambiguous");
 const columns=header.map(x=>x.s.toLowerCase().trim().replace(/\s+/g,"_"));
 if(new Set(columns).size!==columns.length)throw Error("PDF schedule header duplicate labels");
 const data=[];
 for(const p of grouped){
  for(const row of p.rows){
   if(row===header||row.every(x=>header.some(h=>Math.abs(h.x-x.x)<3&&h.s===x.s)))continue;
   if(row.length===0)continue;
   // Other headings and footers are not schedule rows; only accept lines with a source activity ID.
   const result=positions.map(()=>[]);
   for(const text of row){
    let index=0,dist=Infinity;
    for(let i=0;i<positions.length;i++){
     const d=Math.abs(positions[i]-text.x);
     if(d<dist){dist=d;index=i}
    }
    result[index].push(text.s);
   }
   const cells=result.map(x=>x.join(" ").trim());
   const id=cells[columns.indexOf("activity_id")];
   if(!/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id??""))continue;
   data.push(cells);
   if(data.length>2000)throw Error("PDF schedule exceeds 2000 activity rows");
  }
 }
 if(!data.length)throw Error("PDF table header found but no complete activity rows could be recovered");
 const csv=[columns.map(escapeCell).join(","),...data.map(row=>row.map(escapeCell).join(","))].join("\n")+"\n";
 return {format:"SKYFORGE_PDF_EXTRACTED_TABLE_V1",pdf_columns:columns,rows:data.length,
  csv,quality:"GEOMETRY_ASSISTED_PREVIEW_REQUIRES_HUMAN_CHECK",header_page:headerPage,header_y:headerY};
}
export function digitizePdfTable({csv,project_id,project_name,source_name,original_pdf_sha256}){
 if(!/^[a-f0-9]{64}$/.test(original_pdf_sha256))throw Error("Original PDF bytes hash required");
 const d=digitizeGenericTable({text:csv,format:"CSV",project_id,project_name,source_name});
 d.source_format="PDF_TEXT_TABLE";d.source_sha256=original_pdf_sha256;
 d.project.source_manifest[0].sha256=original_pdf_sha256;
 d.project.source_manifest[0].revision="UNVERIFIED_MACHINE_READABLE_PDF_TABLE";
 d.project.import_conversion={format:"PDF_TEXT_TABLE",source_sha256:original_pdf_sha256,
  reviewed_table_sha256:sha256Hex(csv),ocr_performed:false,alignment_authority:"USER_REVIEWED_UNVERIFIED"};
 d.diagnostics.push({code:"PDF_TEXT_ALIGNMENT_REVIEW_REQUIRED",severity:"HOLD",
  detail:"PDF.js extracted text and tentative column alignment. Verify row IDs, values, relationships, and source versions before use. No OCR or approvals."});
 return d;
}
export function pdfSourceSha256(bytes){return sha256Hex(bytes)}
