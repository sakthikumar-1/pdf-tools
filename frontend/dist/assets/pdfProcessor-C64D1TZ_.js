const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-qpdf-Bd-hBRFz.js","assets/vendor-react-0M0RWl7R.js","assets/vendor-fontawesome-D3CCyuqL.js","assets/vendor-pdfjs-GeD23zFi.js"])))=>i.map(i=>d[i]);
import{_ as Z}from"./index-B-0iemI8.js";import{PDFDocument as L,degrees as W,StandardFonts as ae,rgb as re}from"./vendor-pdflib-D_TAgyuv.js";import{p as ie,a as le}from"./vendor-pdfjs-GeD23zFi.js";import{J,w as ce,u as X}from"./vendor-office-itv1-Bkr.js";const k=ie||le;k.GlobalWorkerOptions&&typeof window<"u"&&(k.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${k.version||"4.0.379"}/pdf.worker.min.js`);async function ue(t,a){const e=await t.arrayBuffer(),s=await k.getDocument({data:e}).promise,n=s.numPages,c=[];for(let l=1;l<=n;l++){const d=await(await s.getPage(l)).getTextContent();let p=null,w=[],g="";for(const y of d.items)if("str"in y){const C=y.transform?y.transform[5]:null;p!==null&&Math.abs(C-p)>5?(g.trim()&&w.push(g.trim()),g=y.str):g+=(g&&!g.endsWith(" ")?" ":"")+y.str,p=C}g.trim()&&w.push(g.trim());const m=w.join(`
`);c.push(m),a&&a(Math.round(l/n*75))}return{fullText:c.join(`

--- Page Break ---

`),pageTexts:c,numPages:n}}async function ee(t,a){const e=await t.arrayBuffer(),s=await k.getDocument({data:e}).promise,n=s.numPages,c=[];for(let i=1;i<=n;i++){const l=await s.getPage(i),r=l.getViewport({scale:3.5}),d=document.createElement("canvas"),p=d.getContext("2d",{alpha:!0});d.width=r.width,d.height=r.height,p&&(p.imageSmoothingEnabled=!0,p.imageSmoothingQuality="high"),await l.render({canvasContext:p,viewport:r}).promise;const w=d.toDataURL("image/png",1);c.push({pageNumber:i,dataUrl:w,width:r.width,height:r.height}),a&&a(Math.round(i/n*85))}return c}async function ye(t,a){const e=Array.isArray(t)?t:t?[t]:[],o=e.length;if(o<2)throw new Error("Please select at least 2 PDF files to merge together.");const s=await L.create();for(let c=0;c<o;c++){const i=e[c];if(i&&typeof i.arrayBuffer=="function")try{const l=await i.arrayBuffer(),r=await L.load(l);(await s.copyPages(r,r.getPageIndices())).forEach(p=>s.addPage(p))}catch(l){console.warn(`[mergePdfs] Skipping invalid file index ${c}:`,l)}a&&a(Math.round((c+1)/o*90))}const n=await s.save();return new Blob([n],{type:"application/pdf"})}async function xe(t,a="1",e){const o=await t.arrayBuffer(),s=await L.load(o),n=s.getPageCount();if(n===0)throw new Error("This PDF document contains no pages to split.");const c=(a||"").trim();if(!c)throw new Error(`Please enter the page numbers or ranges to extract (Document has ${n} page${n===1?"":"s"}).`);let i=[];if(c.toLowerCase()==="all")for(let p=0;p<n;p++)i.push(p);else{const p=c.split(",");for(let w of p){const g=w.trim();if(g)if(g.includes("-")){const m=g.split("-");if(m.length!==2)throw new Error(`Invalid range format: "${g}". Expected format like 1-3.`);const y=m[0].trim(),C=m[1].trim();if(!/^\d+$/.test(y)||!/^\d+$/.test(C))throw new Error(`Invalid numbers in range: "${g}". Please use positive numbers only.`);const $=parseInt(y,10),v=parseInt(C,10);if($<1||v<1)throw new Error(`Page numbers must be 1 or greater (got range "${g}").`);if($>n&&v>n)throw new Error(`Requested range ${$}-${v} is out of range. Document contains only ${n} page${n===1?"":"s"}.`);if($>n)throw new Error(`Page range start (${$}) exceeds total document pages (${n}).`);const T=Math.min($,v),S=Math.min(n,Math.max($,v));for(let h=Math.max(1,T);h<=S;h++)i.push(h-1)}else{if(!/^\d+$/.test(g))throw new Error(`Invalid page specification: "${g}". Please enter numeric page numbers (e.g. 1, 2-3).`);const m=parseInt(g,10);if(m<1)throw new Error(`Page numbers must be 1 or greater (got ${m}).`);if(m>n)throw new Error(`Page ${m} is out of range. This document only contains ${n} page${n===1?"":"s"}.`);i.push(m-1)}}}if(i=Array.from(new Set(i)).filter(p=>p>=0&&p<n),i.length===0)throw new Error(`No valid pages found in range "${a}". Document contains ${n} page${n===1?"":"s"} (valid range: 1-${n}).`);e&&e(30);const l=await L.create(),r=await l.copyPages(s,i);r.forEach((p,w)=>{l.addPage(p),e&&e(30+Math.round((w+1)/r.length*60))});const d=await l.save();return new Blob([d],{type:"application/pdf"})}async function be(t,a="recommended",e){const o=t.size,s=await t.arrayBuffer();e&&e(10);let n=null,c=o;try{n=await(await L.load(s,{ignoreEncryption:!0})).save({useObjectStreams:!0}),c=n.byteLength}catch(y){console.warn("[compressPdf] Vector optimization bypass:",y)}e&&e(25);let i=1.2,l=.65;a==="extreme"?(i=.85,l=.45):a==="low"&&(i=1.4,l=.8);let r=null,d=1/0;if(typeof document<"u")try{const C=await k.getDocument({data:s}).promise,$=C.numPages,v=await L.create();for(let S=1;S<=$;S++){const h=await C.getPage(S),u=h.getViewport({scale:i}),f=document.createElement("canvas"),x=f.getContext("2d");f.width=u.width,f.height=u.height,x&&(x.imageSmoothingEnabled=!0,x.imageSmoothingQuality="high"),await h.render({canvasContext:x,viewport:u}).promise;const b=f.toDataURL("image/jpeg",l),B=await fetch(b).then(z=>z.arrayBuffer()),F=await v.embedJpg(B);v.addPage([u.width,u.height]).drawImage(F,{x:0,y:0,width:u.width,height:u.height}),e&&e(25+Math.round(S/$*65))}const T=await v.save({useObjectStreams:!0});r=new Blob([T],{type:"application/pdf"}),d=r.size}catch(y){console.warn("[compressPdf] Downsampling skipped:",y)}e&&e(95);let p,w,g=!1;r&&d<o&&d<c*.95?(p=r,w=d):n&&c<o?(p=new Blob([n],{type:"application/pdf"}),w=c):(p=new Blob([s],{type:"application/pdf"}),w=o,g=!0),e&&e(100);const m=Math.round((o-w)/o*100);return{blob:p,originalSize:o,compressedSize:w,reductionPercent:m>0?m:0,alreadyOptimized:g}}async function Pe(t,a=90,e){const o=await t.arrayBuffer(),s=await L.load(o);s.getPages().forEach(i=>{const l=i.getRotation().angle;i.setRotation(W((l+a)%360))}),e&&e(90);const c=await s.save();return new Blob([c],{type:"application/pdf"})}async function ve(t,a){const e=Array.isArray(t)?t:[t],o=e.length;if(o===0)throw new Error("Please select at least one image file.");for(let c=0;c<o;c++){const i=e[c];if((i.name?i.name.toLowerCase():"").endsWith(".pdf")||i.type==="application/pdf")throw new Error(`'${i.name||"Selected document"}' is a PDF file. Images to PDF accepts only image files (JPG, PNG, WebP), not PDF documents.`)}const s=await L.create();for(let c=0;c<o;c++){const i=e[c],l=await i.arrayBuffer();let r;try{const d=i.type==="image/png"||i.name&&i.name.toLowerCase().endsWith(".png"),p=i.type==="image/jpeg"||i.type==="image/jpg"||i.name&&(i.name.toLowerCase().endsWith(".jpg")||i.name.toLowerCase().endsWith(".jpeg"));if(d)r=await s.embedPng(l);else if(p)try{r=await s.embedJpg(l)}catch(g){if(typeof document<"u"){const m=URL.createObjectURL(i),y=new Image;await new Promise((S,h)=>{y.onload=S,y.onerror=h,y.src=m});const C=document.createElement("canvas");C.width=y.width,C.height=y.height,C.getContext("2d").drawImage(y,0,0);const v=C.toDataURL("image/jpeg",.95),T=await fetch(v).then(S=>S.arrayBuffer());r=await s.embedJpg(T),URL.revokeObjectURL(m)}else throw g}else if(typeof document<"u"){const g=URL.createObjectURL(i),m=new Image;await new Promise((T,S)=>{m.onload=T,m.onerror=S,m.src=g});const y=document.createElement("canvas");y.width=m.width,y.height=m.height,y.getContext("2d").drawImage(m,0,0);const $=y.toDataURL("image/jpeg",.95),v=await fetch($).then(T=>T.arrayBuffer());r=await s.embedJpg(v),URL.revokeObjectURL(g)}s.addPage([r.width,r.height]).drawImage(r,{x:0,y:0,width:r.width,height:r.height})}catch(d){console.warn(`[imagesToPdf] Error processing image index ${c}:`,d)}a&&a(Math.round((c+1)/o*90))}const n=await s.save();return new Blob([n],{type:"application/pdf"})}async function Se(t,a,e){if(!a||!a.trim())throw new Error("Please enter a password to protect your PDF file.");e&&e(20);try{const d=new FormData;d.append("file",t),d.append("password",a);const p=await fetch("/api/v1/security/protect-pdf",{method:"POST",body:d});if(p.ok){const w=await p.json();if(w&&w.success&&w.download_url){const g=await fetch(w.download_url);if(g.ok){const m=await g.blob();if(m&&m.size>0)return e&&e(100),m}}}}catch{console.log("[protectPdf] Python security API offline, executing QPDF WASM client fallback engine.")}e&&e(40);const o=await t.arrayBuffer(),s=new Uint8Array(o);e&&e(60);const{default:n}=await Z(async()=>{const{default:d}=await import("./vendor-qpdf-Bd-hBRFz.js").then(p=>p.q);return{default:d}},__vite__mapDeps([0,1,2,3]));let c="/qpdf.wasm";try{c=(await Z(()=>import("./vendor-qpdf-Bd-hBRFz.js").then(p=>p.a),__vite__mapDeps([0,1,2,3]))).default||c}catch{}const i=await n({locateFile:d=>d.endsWith(".wasm")?c||"/qpdf.wasm":d});e&&e(80),i.FS.writeFile("/input.pdf",s),i.callMain(["/input.pdf","--encrypt",a,a,"256","--","/output.pdf"]);const l=i.FS.readFile("/output.pdf"),r=new Uint8Array(l.length);return r.set(l),e&&e(100),new Blob([r],{type:"application/pdf"})}function V(t,a){if(!t||!t.trim())return[];const e=t.split(","),o=new Set;for(let s of e)if(s=s.trim(),s.includes("-")){const[n,c]=s.split("-"),i=parseInt(n.trim(),10),l=parseInt(c.trim(),10);if(!isNaN(i)&&!isNaN(l))for(let r=Math.max(1,Math.min(i,l));r<=Math.min(a,Math.max(i,l));r++)o.add(r)}else{const n=parseInt(s,10);!isNaN(n)&&n>=1&&n<=a&&o.add(n)}return Array.from(o).sort((s,n)=>s-n)}function Ce(t){if(!t||t.length===0)return"";const a=Array.from(new Set(t)).sort((n,c)=>n-c),e=[];let o=a[0],s=a[0];for(let n=1;n<a.length;n++)a[n]===s+1||(e.push(o===s?`${o}`:`${o}-${s}`),o=a[n]),s=a[n];return e.push(o===s?`${o}`:`${o}-${s}`),e.join(", ")}async function Fe(t,a,e){const o=await t.arrayBuffer(),s=await L.load(o),n=s.getPageCount(),c=new Set(a.map(p=>p-1)),i=[];for(let p=0;p<n;p++)c.has(p)||i.push(p);if(i.length===0)throw new Error("Cannot remove all pages from PDF. At least one page must remain in the document.");e&&e(30);const l=await L.create();(await l.copyPages(s,i)).forEach((p,w)=>{l.addPage(p),e&&e(30+Math.round((w+1)/i.length*60))});const d=await l.save();return e&&e(100),new Blob([d],{type:"application/pdf"})}async function Te(t,a="processed"){if(Array.isArray(t)&&t.length>0){const s=t.find(n=>{var c;return n&&(n.type==="application/pdf"||((c=n.name)==null?void 0:c.endsWith(".pdf")))})||t[0];if(s&&typeof s.arrayBuffer=="function"){const n=await s.arrayBuffer();return new Blob([n],{type:"application/pdf"})}}else if(t&&typeof t.arrayBuffer=="function"){const o=await t.arrayBuffer();return new Blob([o],{type:"application/pdf"})}const e=`%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kinds [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 45 >>
stream
BT /F1 12 Tf 100 700 TD (${a.toUpperCase()} PDF Document) ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000214 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
309
%%EOF`;return new Blob([e],{type:"application/pdf"})}async function Q(t,a){let e;t instanceof ArrayBuffer?e=t:t&&typeof t.arrayBuffer=="function"?e=await t.arrayBuffer():t&&t.buffer?e=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength):e=t;const s=await k.getDocument({data:e}).promise,n=s.numPages,c=[];let i=0;for(let l=1;l<=n;l++){const r=await s.getPage(l),d=r.getViewport({scale:1}),p=d?d.width:595.28,w=d?d.height:841.89,g=await r.getTextContent(),m=[];g.items.forEach(h=>{const u=(h.str||"").trim();if(!u)return;const f=h.transform?h.transform[4]:0,x=h.transform?h.transform[5]:0,b=h.width||0,B=Math.abs(h.transform?h.transform[0]:12)||h.height||12,F=h.fontName||"",I=F.toLowerCase().includes("bold")||F.toLowerCase().includes("heavy")||F.toLowerCase().includes("black");m.push({text:u,x:f,y:x,width:b,height:B,isBold:I,fontSize:Math.round(B)}),i++}),m.sort((h,u)=>u.y-h.y||h.x-u.x);const y=[];m.forEach(h=>{let u=y.find(f=>Math.abs(f.y-h.y)<=3.5);u||(u={y:h.y,items:[]},y.push(u)),u.items.push(h)}),y.forEach(h=>h.items.sort((u,f)=>u.x-f.x));const C=y.map(h=>{const u=[];let f=null;return h.items.forEach(x=>{f?x.x-(f.x+f.width)<=8?(f.text+=" "+x.text,f.width=x.x+x.width-f.x,x.isBold&&(f.isBold=!0)):(u.push(f),f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}):f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}}),f&&u.push(f),{y:h.y,cells:u}}),$=C.filter(h=>h.cells.length>=2),v=[],T=14;$.forEach(h=>{h.cells.forEach(u=>{v.find(x=>Math.abs(x-u.x)<=T)===void 0&&v.push(u.x)})}),v.sort((h,u)=>h-u);const S=[];C.forEach(h=>{var u;if(h.cells.length===1&&v.length>=2)S.push({type:"heading",y:h.y,text:h.cells[0].text,fontSize:h.cells[0].fontSize,isBold:h.cells[0].isBold,rowCells:[h.cells[0].text]});else if(v.length>=2){const f=new Array(v.length).fill("");h.cells.forEach(b=>{let B=0,F=1/0;v.forEach((I,z)=>{const D=Math.abs(I-b.x);D<F&&(F=D,B=z)}),f[B]=b.text});const x=h.cells.some(b=>b.isBold)||S.length===0||S.length===1&&S[0].type==="heading";S.push({type:"table_row",y:h.y,isHeader:x,rowCells:f})}else{const f=h.cells.map(F=>F.text).join(" "),x=((u=h.cells[0])==null?void 0:u.fontSize)||12,b=h.cells.some(F=>F.isBold),B=x>=14||b;S.push({type:B?"heading":"paragraph",y:h.y,text:f,fontSize:x,isBold:b,rowCells:[f]})}}),c.push({pageNum:l,pageWidth:p,pageHeight:w,hasText:m.length>0,totalTextItems:m.length,hasTable:v.length>=2,colCount:Math.max(1,v.length),colAnchors:v,gridRows:S,lineCount:C.length}),a&&a(Math.round(l/n*70))}return{numPages:n,totalTextItems:i,isScannedOnly:i===0,pages:c}}function Y(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}async function pe(t,a="Document"){const e=new J,o=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,s=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;let n="";t.isScannedOnly?n=`
      <w:p>
        <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
        <w:r>
          <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="B91C1C"/></w:rPr>
          <w:t>Notice: Scanned / Image-Only Document</w:t>
        </w:r>
      </w:p>
      <w:p>
        <w:pPr><w:spacing w:after="160"/></w:pPr>
        <w:r>
          <w:rPr><w:sz w:val="22"/><w:color w:val="475569"/></w:rPr>
          <w:t>This PDF document contains scanned images without an embedded text layer. Optical Character Recognition (OCR) is required to convert image text into editable Word text.</w:t>
        </w:r>
      </w:p>
    `:t.pages.forEach((i,l)=>{l>0&&(n+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>');let r=!1,d="";const p=()=>{r&&d&&(n+=`
            <w:tbl>
              <w:tblPr>
                <w:tblW w:w="0" w:type="auto"/>
                <w:tblBorders>
                  <w:top w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                  <w:left w:val="none"/>
                  <w:bottom w:val="single" w:sz="6" w:space="0" w:color="CBD5E1"/>
                  <w:right w:val="none"/>
                  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>
                  <w:insideV w:val="none"/>
                </w:tblBorders>
              </w:tblPr>
              ${d}
            </w:tbl>
            <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
          `,d="",r=!1)};i.gridRows.forEach(w=>{if(w.type==="table_row"){r=!0;const g=w.isHeader,m=w.rowCells.map(y=>{const C=Y(y);return`
              <w:tc>
                <w:tcPr>
                  ${g?'<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>':""}
                  <w:tcMar>
                    <w:top w:w="120" w:type="dxa"/>
                    <w:bottom w:w="120" w:type="dxa"/>
                    <w:left w:w="160" w:type="dxa"/>
                    <w:right w:w="160" w:type="dxa"/>
                  </w:tcMar>
                </w:tcPr>
                <w:p>
                  <w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr>
                  <w:r>
                    <w:rPr>
                      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                      ${g?"<w:b/>":""}
                      <w:sz w:val="20"/>
                      <w:color w:val="${g?"1E293B":"334155"}"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${C}</w:t>
                  </w:r>
                </w:p>
              </w:tc>
            `}).join("");d+=`<w:tr>${m}</w:tr>`}else if(p(),w.type==="heading"){const g=Math.min(36,Math.max(26,(w.fontSize||16)*2));n+=`
              <w:p>
                <w:pPr>
                  <w:spacing w:before="240" w:after="140"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="${g}"/>
                    <w:color w:val="0F172A"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${Y(w.text)}</w:t>
                </w:r>
              </w:p>
            `}else n+=`
              <w:p>
                <w:pPr>
                  <w:spacing w:before="60" w:after="120" w:line="276" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:sz w:val="22"/>
                    <w:color w:val="334155"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${Y(w.text)}</w:t>
                </w:r>
              </w:p>
            `}),p()});const c=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${n}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;return e.file("[Content_Types].xml",o),e.folder("_rels").file(".rels",s),e.folder("word").file("document.xml",c),await e.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}async function Be(t,a){var s;const e=await Q(t,n=>{a&&a(Math.round(n*.7))}),o=await pe(e,(t==null?void 0:t.name)||"Document");return a&&a(100),{blob:o,filename:`${((s=t==null?void 0:t.name)==null?void 0:s.replace(/\.[^/.]+$/,""))||"document"}_converted.docx`,isScanned:e.isScannedOnly,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(n=>n.hasTable)}}async function te(t=[],a=[],e="Presentation",o="editable"){const s=new J,n=f=>String(f||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),c=t&&typeof t=="object"&&Array.isArray(t.pages),i=c?t.pages.length:Math.max(1,Math.max((t||[]).length,(a||[]).length)),l=[],r=[],d=[];let p=12192e3,w=6858e3;if(c&&t.pages&&t.pages[0]){const f=t.pages[0],x=typeof f.pageWidth=="number"&&!isNaN(f.pageWidth)&&f.pageWidth>0?f.pageWidth:595.28,b=typeof f.pageHeight=="number"&&!isNaN(f.pageHeight)&&f.pageHeight>0?f.pageHeight:841.89;p=Math.round(x*12700),w=Math.round(b*12700)}else if(a&&a.length>0&&a[0]){const f=a.find(b=>b&&(b.dataUrl||b.url)),x=f?f.height>f.width:!0;p=x?792e4:12192e3,w=x?10252800:6858e3}(!p||isNaN(p)||p<=0)&&(p=12192e3),(!w||isNaN(w)||w<=0)&&(w=6858e3);const g=`
      <p:nvGrpSpPr>
        <p:cNvPr id="1" name=""/>
        <p:cNvGrpSpPr/>
        <p:nvPr/>
      </p:nvGrpSpPr>
      <p:grpSpPr>
        <a:xfrm>
          <a:off x="0" y="0"/>
          <a:ext cx="0" cy="0"/>
          <a:chOff x="0" y="0"/>
          <a:chExt cx="0" cy="0"/>
        </a:xfrm>
      </p:grpSpPr>`;for(let f=1;f<=i;f++){l.push(`<Override PartName="/ppt/slides/slide${f}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),r.push(`<Relationship Id="rId${f+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${f}.xml"/>`),d.push(`<p:sldId id="${255+f}" r:id="rId${f+1}"/>`);let x="",b="",B=2;const F=a&&a[f-1];if((o==="visual"||!c)&&F&&F.dataUrl){const M=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",E=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");s.folder("ppt/media").file(`image${f}.${M}`,E,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${M}"/>`,b=`
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${B++}" name="Slide Image ${f}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg${f}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${p}" cy="${w}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`}else if(c){const D=t.pages[f-1];if(!D||!D.hasText)if(F&&F.dataUrl){const E=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",P=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");s.folder("ppt/media").file(`image${f}.${E}`,P,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${E}"/>`,b=`
          <p:pic>
            <p:nvPicPr>
              <p:cNvPr id="${B++}" name="Scanned Slide Image ${f}"/>
              <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip r:embed="rIdImg${f}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${p}" cy="${w}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </p:spPr>
          </p:pic>`}else b=`
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="${B++}" name="Scanned Notice"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="635000" y="635000"/><a:ext cx="${p-127e4}" cy="1270000"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
              <a:solidFill><a:srgbClr val="FEF3C7"/></a:solidFill>
              <a:ln w="12700"><a:solidFill><a:srgbClr val="F59E0B"/></a:solidFill></a:ln>
            </p:spPr>
            <p:txBody>
              <a:bodyPr lIns="182880" tIns="182880" rIns="182880" bIns="182880"/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="1600" b="1">
                    <a:solidFill><a:srgbClr val="B45309"/></a:solidFill>
                    <a:latin typeface="Calibri"/>
                  </a:rPr>
                  <a:t>Notice: Scanned / Image-Only Slide</a:t>
                </a:r>
              </a:p>
              <a:p>
                <a:r>
                  <a:rPr lang="en-US" sz="1300">
                    <a:solidFill><a:srgbClr val="475569"/></a:solidFill>
                    <a:latin typeface="Calibri"/>
                  </a:rPr>
                  <a:t>This page contains scanned imagery without an embedded text layer. Optical Character Recognition (OCR) is required to convert image text into editable PowerPoint text boxes.</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
        `;else if(D.hasTable){const M=D.gridRows.filter(R=>R.type==="heading"),E=D.gridRows.filter(R=>R.type==="table_row"),P=D.gridRows.filter(R=>R.type==="paragraph");if(M.length>0){const R=M.map(N=>N.text).join(" ");b+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Slide Title ${f}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="500000"/><a:ext cx="${p-127e4}" cy="800000"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                <a:p>
                  <a:r>
                    <a:rPr lang="en-US" sz="2200" b="1">
                      <a:solidFill><a:srgbClr val="0F172A"/></a:solidFill>
                      <a:latin typeface="Calibri"/>
                    </a:rPr>
                    <a:t>${n(R)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}if(E.length>0){const R=D.colCount,N=p-127e4,O=Math.round(N/R),G=4e5,q=M.length>0?15e5:8e5,H=E.map((A,K)=>{const j=A.isHeader,U=A.rowCells.map(_=>`
              <a:tc>
                <a:txBody>
                  <a:bodyPr lIns="91440" tIns="91440" rIns="91440" bIns="91440"/>
                  <a:lstStyle/>
                  <a:p>
                    <a:pPr algn="${j?"ctr":"l"}"/>
                    <a:r>
                      <a:rPr lang="en-US" sz="1300" b="${j?"1":"0"}">
                        <a:solidFill><a:srgbClr val="${j?"1E293B":"334155"}"/></a:solidFill>
                        <a:latin typeface="Calibri"/>
                      </a:rPr>
                      <a:t>${n(_)}</a:t>
                    </a:r>
                  </a:p>
                </a:txBody>
                <a:tcPr>
                  ${j?'<a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill>':""}
                  <a:lnL w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>
                  <a:lnR w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>
                  <a:lnT w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>
                  <a:lnB w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>
                </a:tcPr>
              </a:tc>
            `).join("");return`<a:tr h="${G}">${U}</a:tr>`}).join("");b+=`
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${B++}" name="Table ${f}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${q}"/>
                <a:ext cx="${N}" cy="${G*E.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(R).fill(`<a:gridCol w="${O}"/>`).join("")}
                    </a:tblGrid>
                    ${H}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `}if(P.length>0){const R=P.map(O=>O.text).join(" "),N=15e5+4e5*E.length+25e4;b+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Notes ${f}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${N}"/><a:ext cx="${p-127e4}" cy="500000"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                <a:p>
                  <a:r>
                    <a:rPr lang="en-US" sz="1300">
                      <a:solidFill><a:srgbClr val="475569"/></a:solidFill>
                      <a:latin typeface="Calibri"/>
                    </a:rPr>
                    <a:t>${n(R)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}}else{const M=[];let E=null;D.gridRows.forEach(P=>{if(!E)E={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]};else{const R=E.type===P.type,N=Math.abs(E.bottomY-P.y);R&&N<=(P.fontSize||12)*2.8?(E.lines.push(P),E.bottomY=P.y):(M.push(E),E={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]})}}),E&&M.push(E),M.forEach((P,R)=>{const N=P.type==="heading",O=Math.round(Math.min(48,Math.max(10,P.fontSize||12))*100),G=N?"0F172A":"334155",q=P.isBold||N,H=typeof D.pageHeight=="number"&&!isNaN(D.pageHeight)&&D.pageHeight>0?D.pageHeight:841.89,A=typeof P.topY=="number"&&!isNaN(P.topY)?P.topY:H-(R*50+60),K=typeof P.bottomY=="number"&&!isNaN(P.bottomY)?P.bottomY:A;let j=Math.max(0,Math.round((H-A-(P.fontSize||12))*12700)),U=Math.max(45e4,Math.round((A-K+(P.fontSize||12)+12)*12700)),_=p-127e4;(isNaN(j)||j<0)&&(j=Math.round((R*50+50)*12700)),(isNaN(U)||U<=0)&&(U=5e5),(isNaN(_)||_<=0)&&(_=65e5);const oe=P.lines.map(se=>`
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${O}" b="${q?"1":"0"}">
                  <a:solidFill><a:srgbClr val="${G}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${n(se.text)}</a:t>
              </a:r>
            </a:p>
          `).join("");b+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="TextBlock ${R+1}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${j}"/><a:ext cx="${_}" cy="${U}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                ${oe}
              </p:txBody>
            </p:sp>
          `})}}else{const D=(Array.isArray(t)?t[f-1]:"")||"";if(D.trim()){const E=D.split(`
`).filter(P=>P.trim()).slice(0,15).map(P=>`<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${n(P)}</a:t></a:r></a:p>`).join("");b=`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${B++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${p-914400}" cy="${w-914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${E}
          </p:txBody>
        </p:sp>`}}const I=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${g}
      ${b}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,z=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${x}
</Relationships>`;s.folder("ppt/slides").file(`slide${f}.xml`,I),s.folder("ppt/slides/_rels").file(`slide${f}.xml.rels`,z)}const m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${l.join(`
  `)}
</Types>`,y=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,C=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${d.join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${p}" cy="${w}"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`,$=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${r.join(`
  `)}
</Relationships>`,v=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont><a:latin typeface="Calibri Light"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="28575"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectLst/><a:effectLst/><a:effectLst/></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`,T=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg>
    <p:spTree>${g}</p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
  <p:txStyles>
    <p:titleStyle/>
    <p:bodyStyle/>
    <p:otherStyle/>
  </p:txStyles>
</p:sldMaster>`,S=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,h=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>${g}</p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,u=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;return s.file("[Content_Types].xml",m),s.file("_rels/.rels",y),s.file("ppt/presentation.xml",C),s.file("ppt/_rels/presentation.xml.rels",$),s.file("ppt/theme/theme1.xml",v),s.file("ppt/slideMasters/slideMaster1.xml",T),s.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",S),s.file("ppt/slideLayouts/slideLayout1.xml",h),s.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels",u),await s.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})}async function De(t,a="editable",e){if(!t||t.size===0)throw new Error("Please select a valid, non-empty PDF document.");let o;try{o=await t.arrayBuffer()}catch(m){throw new Error("Failed to read file data: "+m.message)}const s=new Uint8Array(o.slice(0,5));if(!String.fromCharCode(...s).startsWith("%PDF-"))throw new Error("Invalid file format. The uploaded file is not a valid PDF document.");let c,i;try{c=k.getDocument({data:o}),i=await c.promise}catch(m){throw m&&m.name==="PasswordException"?new Error("This PDF is password-protected. Please unlock or remove password protection first."):new Error("Unable to open PDF document: "+(m.message||"File may be corrupted."))}if(i.numPages===0)throw new Error("This PDF document contains no pages.");if(e&&e(20),a==="visual"){const m=await ee(t,C=>{e&&e(20+Math.round(C*.6))}),y=await te(null,m,(t==null?void 0:t.name)||"Presentation","visual");return e&&e(100),{blob:y,mode:"visual",isScannedOnly:!1,hasScannedSlides:!0,pageCount:m.length,tableDetected:!1}}const r=await Q(t,m=>{e&&e(20+Math.round(m*.5))});let d=null,p=r.isScannedOnly;const w=r.pages.some(m=>!m.hasText);if(r.isScannedOnly||w)try{d=await ee(t,m=>{e&&e(70+Math.round(m*.2))}),p=!0}catch(m){console.warn("[pdfToPptx] Visual rendering fallback notice:",m)}e&&e(85);const g=await te(r,d,(t==null?void 0:t.name)||"Presentation",r.isScannedOnly?"visual":"editable");return e&&e(100),{blob:g,mode:r.isScannedOnly?"visual":"editable",isScannedOnly:r.isScannedOnly,hasScannedSlides:p,pageCount:r.numPages,tableDetected:r.pages.some(m=>m.hasTable)}}function de(t,a="Spreadsheet"){const e=X.book_new();if(t.isScannedOnly){const o=X.aoa_to_sheet([["Notice: Scanned / Image-Only Document"],["This PDF contains scanned images without an extractable text layer."],["Optical Character Recognition (OCR) is required to convert image text into spreadsheet data."]]);return X.book_append_sheet(e,o,"Notice"),e}return t.pages.forEach((o,s)=>{const n=[],c=o.colCount,i=new Array(c).fill(10);o.gridRows.forEach(d=>{const p=d.rowCells;n.push(p),p.forEach((w,g)=>{const m=String(w||"").length;m>(i[g]||10)&&(i[g]=Math.min(m+3,50))})});const l=X.aoa_to_sheet(n);l["!cols"]=i.map(d=>({wch:d}));const r=t.numPages===1?"Sheet1":`Page ${s+1}`;X.book_append_sheet(e,l,r)}),e}async function $e(t,a){const e=await Q(t,c=>{a&&a(Math.round(c*.7))}),o=de(e,(t==null?void 0:t.name)||"Spreadsheet"),s=ce(o,{bookType:"xlsx",type:"array"}),n=new Blob([s],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return a&&a(100),{blob:n,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(c=>c.hasTable)}}function Ee(t){return new Blob([t],{type:"text/plain;charset=utf-8"})}async function Me(t,a="images"){const e=new J,o=e.folder(a);return t.forEach((s,n)=>{const c=s.dataUrl.replace(/^data:image\/(png|jpeg);base64,/,""),i=s.dataUrl.startsWith("data:image/png")?"png":"jpg";o.file(`page_${n+1}.${i}`,c,{base64:!0})}),await e.generateAsync({type:"blob"})}function ne(t="#000000"){let a=t.replace("#","").trim();a.length===3&&(a=a.split("").map(n=>n+n).join(""));const e=parseInt(a.substring(0,2),16)/255,o=parseInt(a.substring(2,4),16)/255,s=parseInt(a.substring(4,6),16)/255;return re(isNaN(e)?0:e,isNaN(o)?0:o,isNaN(s)?0:s)}function fe(t,a,e,o="bottom-right",s=36){const n=t.getRotation().angle||0,c=t.getWidth(),i=t.getHeight(),l=s;let r=0,d=0,p=0;return n===0?(p=0,o==="bottom-left"?(r=l,d=l):o==="bottom-center"?(r=(c-a)/2,d=l):o==="bottom-right"?(r=c-l-a,d=l):o==="top-left"?(r=l,d=i-l-e):o==="top-center"?(r=(c-a)/2,d=i-l-e):o==="top-right"&&(r=c-l-a,d=i-l-e)):n===90?(p=90,o==="bottom-right"?(r=c-l,d=l):o==="bottom-center"?(r=c-l,d=(i-a)/2):o==="bottom-left"?(r=c-l,d=i-l-a):o==="top-right"?(r=l+e,d=l):o==="top-center"?(r=l+e,d=(i-a)/2):o==="top-left"&&(r=l+e,d=i-l-a)):n===180?(p=180,o==="bottom-right"?(r=l+a,d=i-l):o==="bottom-center"?(r=(c+a)/2,d=i-l):o==="bottom-left"?(r=c-l,d=i-l):o==="top-right"?(r=l+a,d=l+e):o==="top-center"?(r=(c+a)/2,d=l+e):o==="top-left"&&(r=c-l,d=l+e)):n===270&&(p=270,o==="bottom-right"?(r=l,d=i-l):o==="bottom-center"?(r=l,d=(i+a)/2):o==="bottom-left"?(r=l,d=l+a):o==="top-right"?(r=c-l-e,d=i-l):o==="top-center"?(r=c-l-e,d=(i+a)/2):o==="top-left"&&(r=c-l-e,d=l+a)),{x:r,y:d,rotAngle:p}}async function Ie(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{startNumber:o=1,format:s="Page {n}",position:n="bottom-right",fontSize:c=11,fontColor:i="#334155",marginPt:l=36,pageRange:r="all"}=a,d=await t.arrayBuffer(),p=await L.load(d,{ignoreEncryption:!0}),w=await p.embedFont(ae.Helvetica),g=ne(i),m=p.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=r&&r!=="all"?V(r,m):Array.from({length:m},(T,S)=>S+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const C=new Set(y);let $=0;for(let T=0;T<m;T++){const S=T+1;if(C.has(S)){const h=p.getPage(T),u=o+$,f=s.replace(/\{n\}/g,String(u)).replace(/\{total\}/g,String(m)),x=w.widthOfTextAtSize(f,c),b=c,{x:B,y:F,rotAngle:I}=fe(h,x,b,n,l);h.drawText(f,{x:B,y:F,size:c,font:w,color:g,rotate:W(I)}),$++}e&&e(20+Math.round((T+1)/m*70))}const v=await p.save();return e&&e(100),new Blob([v],{type:"application/pdf"})}async function Re(t,a={},e){var v;if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{watermarkType:o="text",text:s="CONFIDENTIAL",opacity:n=.35,rotation:c=45,fontSize:i=48,color:l="#EF4444",position:r="center",pageRange:d="all",imageFile:p=null}=a,w=await t.arrayBuffer(),g=await L.load(w,{ignoreEncryption:!0}),m=g.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=d&&d!=="all"?V(d,m):Array.from({length:m},(T,S)=>S+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const C=new Set(y);if(o==="image"&&p){let T;const S=await p.arrayBuffer();p.type==="image/png"||((v=p.name)==null?void 0:v.toLowerCase().endsWith(".png"))?T=await g.embedPng(S):T=await g.embedJpg(S);const u=T.scale(a.scale||.5);for(let f=0;f<m;f++){if(C.has(f+1)){const x=g.getPage(f),{width:b,height:B}=x.getSize();let F=(b-u.width)/2,I=(B-u.height)/2;r==="top-left"?(F=36,I=B-u.height-36):r==="top-right"?(F=b-u.width-36,I=B-u.height-36):r==="bottom-left"?(F=36,I=36):r==="bottom-right"&&(F=b-u.width-36,I=36),x.drawImage(T,{x:F,y:I,width:u.width,height:u.height,opacity:Math.max(.05,Math.min(1,n))})}e&&e(20+Math.round((f+1)/m*70))}}else{const T=await g.embedFont(ae.HelveticaBold),S=String(s||"CONFIDENTIAL").trim();if(!S)throw new Error("Watermark text cannot be empty.");const h=ne(l),u=T.widthOfTextAtSize(S,i),f=i,x=c*Math.PI/180;for(let b=0;b<m;b++){if(C.has(b+1)){const B=g.getPage(b),{width:F,height:I}=B.getSize(),z=B.getRotation().angle||0;let D=0,M=0;r==="center"||r==="diagonal"?(D=F/2-u/2*Math.cos(x)+f/4*Math.sin(x),M=I/2-u/2*Math.sin(x)-f/4*Math.cos(x)):r==="top-left"?(D=36,M=I-72):r==="top-right"?(D=F-u-36,M=I-72):r==="bottom-left"?(D=36,M=36):r==="bottom-right"&&(D=F-u-36,M=36),B.drawText(S,{x:D,y:M,size:i,font:T,color:h,opacity:Math.max(.05,Math.min(1,n)),rotate:W(c+z)})}e&&e(20+Math.round((b+1)/m*70))}}const $=await g.save();return e&&e(100),new Blob([$],{type:"application/pdf"})}async function Le(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{cropMargins:o={top:36,bottom:36,left:36,right:36},pageRange:s="all"}=a,n=Number(o.top)||0,c=Number(o.bottom)||0,i=Number(o.left)||0,l=Number(o.right)||0;if(n<0||c<0||i<0||l<0)throw new Error("Crop margins must be non-negative values.");const r=await t.arrayBuffer(),d=await L.load(r,{ignoreEncryption:!0}),p=d.getPageCount();if(p===0)throw new Error("This PDF document contains no pages.");const w=s&&s!=="all"?V(s,p):Array.from({length:p},(y,C)=>C+1);if(w.length===0)throw new Error("No valid pages found in the specified page range.");const g=new Set(w);for(let y=0;y<p;y++){if(g.has(y+1)){const C=d.getPage(y),$=C.getMediaBox(),v=C.getCropBox()||$,T=v.x+i,S=v.y+c,h=v.width-i-l,u=v.height-n-c;if(h<=20||u<=20)throw new Error(`Crop margins too large on page ${y+1}. Remaining width (${Math.round(h)}pt) or height (${Math.round(u)}pt) must be at least 20pt.`);C.setCropBox(T,S,h,u)}e&&e(20+Math.round((y+1)/p*70))}const m=await d.save();return e&&e(100),new Blob([m],{type:"application/pdf"})}async function Ne(t){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const a=await t.arrayBuffer(),e=await L.load(a,{ignoreEncryption:!0}),o=e.getKeywords();let s="";return Array.isArray(o)?s=o.join(", "):typeof o=="string"&&(s=o),{title:e.getTitle()||"",author:e.getAuthor()||"",subject:e.getSubject()||"",keywords:s,producer:e.getProducer()||"",creator:e.getCreator()||"",creationDate:e.getCreationDate()?e.getCreationDate().toISOString():"",modificationDate:e.getModificationDate()?e.getModificationDate().toISOString():"",pageCount:e.getPageCount()}}async function je(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const o=await t.arrayBuffer(),s=await L.load(o,{ignoreEncryption:!0});if(e&&e(30),a.title!==void 0&&s.setTitle(a.title||""),a.author!==void 0&&s.setAuthor(a.author||""),a.subject!==void 0&&s.setSubject(a.subject||""),a.keywords!==void 0){const c=String(a.keywords||"").split(",").map(i=>i.trim()).filter(Boolean);s.setKeywords(c)}a.producer!==void 0&&s.setProducer(a.producer||"Simatrix PDF Tools"),a.creator!==void 0&&s.setCreator(a.creator||"Simatrix PDF Tools"),s.setModificationDate(new Date),e&&e(75);const n=await s.save();return e&&e(100),new Blob([n],{type:"application/pdf"})}async function ke(t,a,e={},o){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");if(!Array.isArray(a)||a.length===0)throw new Error("Please provide at least one page in the reordered list.");const s=await t.arrayBuffer(),n=await L.load(s,{ignoreEncryption:!0}),c=n.getPageCount();for(const r of a)if(typeof r!="number"||r<1||r>c)throw new Error(`Invalid page index ${r}. Document contains pages 1 to ${c}.`);o&&o(20);const i=await L.create();for(let r=0;r<a.length;r++){const d=a[r],[p]=await i.copyPages(n,[d-1]),w=Number(e[d])||0;if(w!==0){const g=p.getRotation().angle||0;p.setRotation(W((g+w)%360))}i.addPage(p),o&&o(20+Math.round((r+1)/a.length*70))}const l=await i.save();return o&&o(100),new Blob([l],{type:"application/pdf"})}export{Pe as a,ee as b,be as c,Me as d,De as e,$e as f,ue as g,Ee as h,ve as i,Be as j,Ie as k,Le as l,ye as m,je as n,Te as o,Se as p,V as q,Ne as r,xe as s,Ce as t,Fe as u,ke as v,Re as w};
