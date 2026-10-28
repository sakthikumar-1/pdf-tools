const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-qpdf-Bd-hBRFz.js","assets/vendor-react-0M0RWl7R.js","assets/vendor-fontawesome-D3CCyuqL.js","assets/vendor-pdfjs-GeD23zFi.js"])))=>i.map(i=>d[i]);
import{_ as Z}from"./index-CCq-BDOl.js";import{PDFDocument as L,degrees as W,StandardFonts as ae,rgb as re}from"./vendor-pdflib-D_TAgyuv.js";import{p as ie,a as le}from"./vendor-pdfjs-GeD23zFi.js";import{J,w as ce,u as G}from"./vendor-office-itv1-Bkr.js";const k=ie||le;k.GlobalWorkerOptions&&typeof window<"u"&&(k.GlobalWorkerOptions.workerSrc=`https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${k.version||"4.0.379"}/pdf.worker.min.js`);async function ue(t,a){const e=await t.arrayBuffer(),o=await k.getDocument({data:e}).promise,n=o.numPages,c=[];for(let l=1;l<=n;l++){const d=await(await o.getPage(l)).getTextContent();let p=null,w=[],g="";for(const y of d.items)if("str"in y){const C=y.transform?y.transform[5]:null;p!==null&&Math.abs(C-p)>5?(g.trim()&&w.push(g.trim()),g=y.str):g+=(g&&!g.endsWith(" ")?" ":"")+y.str,p=C}g.trim()&&w.push(g.trim());const m=w.join(`
`);c.push(m),a&&a(Math.round(l/n*75))}return{fullText:c.join(`

--- Page Break ---

`),pageTexts:c,numPages:n}}async function ee(t,a){const e=await t.arrayBuffer(),o=await k.getDocument({data:e}).promise,n=o.numPages,c=[];for(let i=1;i<=n;i++){const l=await o.getPage(i),s=l.getViewport({scale:3.5}),d=document.createElement("canvas"),p=d.getContext("2d",{alpha:!0});d.width=s.width,d.height=s.height,p&&(p.imageSmoothingEnabled=!0,p.imageSmoothingQuality="high"),await l.render({canvasContext:p,viewport:s}).promise;const w=d.toDataURL("image/png",1);c.push({pageNumber:i,dataUrl:w,width:s.width,height:s.height}),a&&a(Math.round(i/n*85))}return c}async function ye(t,a){const e=Array.isArray(t)?t:t?[t]:[],r=e.length;if(r<2)throw new Error("Please select at least 2 PDF files to merge together.");const o=await L.create();for(let c=0;c<r;c++){const i=e[c];if(i&&typeof i.arrayBuffer=="function")try{const l=await i.arrayBuffer(),s=await L.load(l);(await o.copyPages(s,s.getPageIndices())).forEach(p=>o.addPage(p))}catch(l){console.warn(`[mergePdfs] Skipping invalid file index ${c}:`,l)}a&&a(Math.round((c+1)/r*90))}const n=await o.save();return new Blob([n],{type:"application/pdf"})}async function xe(t,a="1",e){const r=await t.arrayBuffer(),o=await L.load(r),n=o.getPageCount();if(n===0)throw new Error("This PDF document contains no pages to split.");const c=(a||"").trim();if(!c)throw new Error(`Please enter the page numbers or ranges to extract (Document has ${n} page${n===1?"":"s"}).`);let i=[];if(c.toLowerCase()==="all")for(let p=0;p<n;p++)i.push(p);else{const p=c.split(",");for(let w of p){const g=w.trim();if(g)if(g.includes("-")){const m=g.split("-");if(m.length!==2)throw new Error(`Invalid range format: "${g}". Expected format like 1-3.`);const y=m[0].trim(),C=m[1].trim();if(!/^\d+$/.test(y)||!/^\d+$/.test(C))throw new Error(`Invalid numbers in range: "${g}". Please use positive numbers only.`);const D=parseInt(y,10),v=parseInt(C,10);if(D<1||v<1)throw new Error(`Page numbers must be 1 or greater (got range "${g}").`);if(D>n&&v>n)throw new Error(`Requested range ${D}-${v} is out of range. Document contains only ${n} page${n===1?"":"s"}.`);if(D>n)throw new Error(`Page range start (${D}) exceeds total document pages (${n}).`);const T=Math.min(D,v),F=Math.min(n,Math.max(D,v));for(let h=Math.max(1,T);h<=F;h++)i.push(h-1)}else{if(!/^\d+$/.test(g))throw new Error(`Invalid page specification: "${g}". Please enter numeric page numbers (e.g. 1, 2-3).`);const m=parseInt(g,10);if(m<1)throw new Error(`Page numbers must be 1 or greater (got ${m}).`);if(m>n)throw new Error(`Page ${m} is out of range. This document only contains ${n} page${n===1?"":"s"}.`);i.push(m-1)}}}if(i=Array.from(new Set(i)).filter(p=>p>=0&&p<n),i.length===0)throw new Error(`No valid pages found in range "${a}". Document contains ${n} page${n===1?"":"s"} (valid range: 1-${n}).`);e&&e(30);const l=await L.create(),s=await l.copyPages(o,i);s.forEach((p,w)=>{l.addPage(p),e&&e(30+Math.round((w+1)/s.length*60))});const d=await l.save();return new Blob([d],{type:"application/pdf"})}async function be(t,a=90,e){const r=await t.arrayBuffer(),o=await L.load(r);o.getPages().forEach(i=>{const l=i.getRotation().angle;i.setRotation(W((l+a)%360))}),e&&e(90);const c=await o.save();return new Blob([c],{type:"application/pdf"})}async function Pe(t,a){const e=Array.isArray(t)?t:[t],r=e.length;if(r===0)throw new Error("Please select at least one image file.");for(let c=0;c<r;c++){const i=e[c];if((i.name?i.name.toLowerCase():"").endsWith(".pdf")||i.type==="application/pdf")throw new Error(`'${i.name||"Selected document"}' is a PDF file. Images to PDF accepts only image files (JPG, PNG, WebP), not PDF documents.`)}const o=await L.create();for(let c=0;c<r;c++){const i=e[c],l=await i.arrayBuffer();let s;try{const d=i.type==="image/png"||i.name&&i.name.toLowerCase().endsWith(".png"),p=i.type==="image/jpeg"||i.type==="image/jpg"||i.name&&(i.name.toLowerCase().endsWith(".jpg")||i.name.toLowerCase().endsWith(".jpeg"));if(d)s=await o.embedPng(l);else if(p)try{s=await o.embedJpg(l)}catch(g){if(typeof document<"u"){const m=URL.createObjectURL(i),y=new Image;await new Promise((F,h)=>{y.onload=F,y.onerror=h,y.src=m});const C=document.createElement("canvas");C.width=y.width,C.height=y.height,C.getContext("2d").drawImage(y,0,0);const v=C.toDataURL("image/jpeg",.95),T=await fetch(v).then(F=>F.arrayBuffer());s=await o.embedJpg(T),URL.revokeObjectURL(m)}else throw g}else if(typeof document<"u"){const g=URL.createObjectURL(i),m=new Image;await new Promise((T,F)=>{m.onload=T,m.onerror=F,m.src=g});const y=document.createElement("canvas");y.width=m.width,y.height=m.height,y.getContext("2d").drawImage(m,0,0);const D=y.toDataURL("image/jpeg",.95),v=await fetch(D).then(T=>T.arrayBuffer());s=await o.embedJpg(v),URL.revokeObjectURL(g)}o.addPage([s.width,s.height]).drawImage(s,{x:0,y:0,width:s.width,height:s.height})}catch(d){console.warn(`[imagesToPdf] Error processing image index ${c}:`,d)}a&&a(Math.round((c+1)/r*90))}const n=await o.save();return new Blob([n],{type:"application/pdf"})}async function ve(t,a,e){if(!a||!a.trim())throw new Error("Please enter a password to protect your PDF file.");e&&e(20);try{const d=new FormData;d.append("file",t),d.append("password",a);const p=await fetch("/api/v1/security/protect-pdf",{method:"POST",body:d});if(p.ok){const w=await p.json();if(w&&w.success&&w.download_url){const g=await fetch(w.download_url);if(g.ok){const m=await g.blob();if(m&&m.size>0)return e&&e(100),m}}}}catch{console.log("[protectPdf] Python security API offline, executing QPDF WASM client fallback engine.")}e&&e(40);const r=await t.arrayBuffer(),o=new Uint8Array(r);e&&e(60);const{default:n}=await Z(async()=>{const{default:d}=await import("./vendor-qpdf-Bd-hBRFz.js").then(p=>p.q);return{default:d}},__vite__mapDeps([0,1,2,3]));let c="/qpdf.wasm";try{c=(await Z(()=>import("./vendor-qpdf-Bd-hBRFz.js").then(p=>p.a),__vite__mapDeps([0,1,2,3]))).default||c}catch{}const i=await n({locateFile:d=>d.endsWith(".wasm")?c||"/qpdf.wasm":d});e&&e(80),i.FS.writeFile("/input.pdf",o),i.callMain(["/input.pdf","--encrypt",a,a,"256","--","/output.pdf"]);const l=i.FS.readFile("/output.pdf"),s=new Uint8Array(l.length);return s.set(l),e&&e(100),new Blob([s],{type:"application/pdf"})}function V(t,a){if(!t||!t.trim())return[];const e=t.split(","),r=new Set;for(let o of e)if(o=o.trim(),o.includes("-")){const[n,c]=o.split("-"),i=parseInt(n.trim(),10),l=parseInt(c.trim(),10);if(!isNaN(i)&&!isNaN(l))for(let s=Math.max(1,Math.min(i,l));s<=Math.min(a,Math.max(i,l));s++)r.add(s)}else{const n=parseInt(o,10);!isNaN(n)&&n>=1&&n<=a&&r.add(n)}return Array.from(r).sort((o,n)=>o-n)}function Se(t){if(!t||t.length===0)return"";const a=Array.from(new Set(t)).sort((n,c)=>n-c),e=[];let r=a[0],o=a[0];for(let n=1;n<a.length;n++)a[n]===o+1||(e.push(r===o?`${r}`:`${r}-${o}`),r=a[n]),o=a[n];return e.push(r===o?`${r}`:`${r}-${o}`),e.join(", ")}async function Ce(t,a,e){const r=await t.arrayBuffer(),o=await L.load(r),n=o.getPageCount(),c=new Set(a.map(p=>p-1)),i=[];for(let p=0;p<n;p++)c.has(p)||i.push(p);if(i.length===0)throw new Error("Cannot remove all pages from PDF. At least one page must remain in the document.");e&&e(30);const l=await L.create();(await l.copyPages(o,i)).forEach((p,w)=>{l.addPage(p),e&&e(30+Math.round((w+1)/i.length*60))});const d=await l.save();return e&&e(100),new Blob([d],{type:"application/pdf"})}async function Fe(t,a="processed"){if(Array.isArray(t)&&t.length>0){const o=t.find(n=>{var c;return n&&(n.type==="application/pdf"||((c=n.name)==null?void 0:c.endsWith(".pdf")))})||t[0];if(o&&typeof o.arrayBuffer=="function"){const n=await o.arrayBuffer();return new Blob([n],{type:"application/pdf"})}}else if(t&&typeof t.arrayBuffer=="function"){const r=await t.arrayBuffer();return new Blob([r],{type:"application/pdf"})}const e=`%PDF-1.4
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
%%EOF`;return new Blob([e],{type:"application/pdf"})}async function Q(t,a){let e;t instanceof ArrayBuffer?e=t:t&&typeof t.arrayBuffer=="function"?e=await t.arrayBuffer():t&&t.buffer?e=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength):e=t;const o=await k.getDocument({data:e}).promise,n=o.numPages,c=[];let i=0;for(let l=1;l<=n;l++){const s=await o.getPage(l),d=s.getViewport({scale:1}),p=d?d.width:595.28,w=d?d.height:841.89,g=await s.getTextContent(),m=[];g.items.forEach(h=>{const u=(h.str||"").trim();if(!u)return;const f=h.transform?h.transform[4]:0,x=h.transform?h.transform[5]:0,P=h.width||0,B=Math.abs(h.transform?h.transform[0]:12)||h.height||12,S=h.fontName||"",N=S.toLowerCase().includes("bold")||S.toLowerCase().includes("heavy")||S.toLowerCase().includes("black");m.push({text:u,x:f,y:x,width:P,height:B,isBold:N,fontSize:Math.round(B)}),i++}),m.sort((h,u)=>u.y-h.y||h.x-u.x);const y=[];m.forEach(h=>{let u=y.find(f=>Math.abs(f.y-h.y)<=3.5);u||(u={y:h.y,items:[]},y.push(u)),u.items.push(h)}),y.forEach(h=>h.items.sort((u,f)=>u.x-f.x));const C=y.map(h=>{const u=[];let f=null;return h.items.forEach(x=>{f?x.x-(f.x+f.width)<=8?(f.text+=" "+x.text,f.width=x.x+x.width-f.x,x.isBold&&(f.isBold=!0)):(u.push(f),f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}):f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}}),f&&u.push(f),{y:h.y,cells:u}}),D=C.filter(h=>h.cells.length>=2),v=[],T=14;D.forEach(h=>{h.cells.forEach(u=>{v.find(x=>Math.abs(x-u.x)<=T)===void 0&&v.push(u.x)})}),v.sort((h,u)=>h-u);const F=[];C.forEach(h=>{var u;if(h.cells.length===1&&v.length>=2)F.push({type:"heading",y:h.y,text:h.cells[0].text,fontSize:h.cells[0].fontSize,isBold:h.cells[0].isBold,rowCells:[h.cells[0].text]});else if(v.length>=2){const f=new Array(v.length).fill("");h.cells.forEach(P=>{let B=0,S=1/0;v.forEach((N,_)=>{const $=Math.abs(N-P.x);$<S&&(S=$,B=_)}),f[B]=P.text});const x=h.cells.some(P=>P.isBold)||F.length===0||F.length===1&&F[0].type==="heading";F.push({type:"table_row",y:h.y,isHeader:x,rowCells:f})}else{const f=h.cells.map(S=>S.text).join(" "),x=((u=h.cells[0])==null?void 0:u.fontSize)||12,P=h.cells.some(S=>S.isBold),B=x>=14||P;F.push({type:B?"heading":"paragraph",y:h.y,text:f,fontSize:x,isBold:P,rowCells:[f]})}}),c.push({pageNum:l,pageWidth:p,pageHeight:w,hasText:m.length>0,totalTextItems:m.length,hasTable:v.length>=2,colCount:Math.max(1,v.length),colAnchors:v,gridRows:F,lineCount:C.length}),a&&a(Math.round(l/n*70))}return{numPages:n,totalTextItems:i,isScannedOnly:i===0,pages:c}}function q(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}async function pe(t,a="Document"){const e=new J,r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,o=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
    `:t.pages.forEach((i,l)=>{l>0&&(n+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>');let s=!1,d="";const p=()=>{s&&d&&(n+=`
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
          `,d="",s=!1)};i.gridRows.forEach(w=>{if(w.type==="table_row"){s=!0;const g=w.isHeader,m=w.rowCells.map(y=>{const C=q(y);return`
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
                  <w:t xml:space="preserve">${q(w.text)}</w:t>
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
                  <w:t xml:space="preserve">${q(w.text)}</w:t>
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
</w:document>`;return e.file("[Content_Types].xml",r),e.folder("_rels").file(".rels",o),e.folder("word").file("document.xml",c),await e.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}async function Te(t,a){var o;const e=await Q(t,n=>{a&&a(Math.round(n*.7))}),r=await pe(e,(t==null?void 0:t.name)||"Document");return a&&a(100),{blob:r,filename:`${((o=t==null?void 0:t.name)==null?void 0:o.replace(/\.[^/.]+$/,""))||"document"}_converted.docx`,isScanned:e.isScannedOnly,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(n=>n.hasTable)}}async function te(t=[],a=[],e="Presentation",r="editable"){const o=new J,n=f=>String(f||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),c=t&&typeof t=="object"&&Array.isArray(t.pages),i=c?t.pages.length:Math.max(1,Math.max((t||[]).length,(a||[]).length)),l=[],s=[],d=[];let p=12192e3,w=6858e3;if(c&&t.pages&&t.pages[0]){const f=t.pages[0],x=typeof f.pageWidth=="number"&&!isNaN(f.pageWidth)&&f.pageWidth>0?f.pageWidth:595.28,P=typeof f.pageHeight=="number"&&!isNaN(f.pageHeight)&&f.pageHeight>0?f.pageHeight:841.89;p=Math.round(x*12700),w=Math.round(P*12700)}else if(a&&a.length>0&&a[0]){const f=a.find(P=>P&&(P.dataUrl||P.url)),x=f?f.height>f.width:!0;p=x?792e4:12192e3,w=x?10252800:6858e3}(!p||isNaN(p)||p<=0)&&(p=12192e3),(!w||isNaN(w)||w<=0)&&(w=6858e3);const g=`
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
      </p:grpSpPr>`;for(let f=1;f<=i;f++){l.push(`<Override PartName="/ppt/slides/slide${f}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),s.push(`<Relationship Id="rId${f+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${f}.xml"/>`),d.push(`<p:sldId id="${255+f}" r:id="rId${f+1}"/>`);let x="",P="",B=2;const S=a&&a[f-1];if((r==="visual"||!c)&&S&&S.dataUrl){const M=S.dataUrl.startsWith("data:image/jpeg")||S.dataUrl.startsWith("data:image/jpg")?"jpg":"png",E=S.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${f}.${M}`,E,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${M}"/>`,P=`
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
      </p:pic>`}else if(c){const $=t.pages[f-1];if(!$||!$.hasText)if(S&&S.dataUrl){const E=S.dataUrl.startsWith("data:image/jpeg")||S.dataUrl.startsWith("data:image/jpg")?"jpg":"png",b=S.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${f}.${E}`,b,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${E}"/>`,P=`
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
          </p:pic>`}else P=`
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
        `;else if($.hasTable){const M=$.gridRows.filter(I=>I.type==="heading"),E=$.gridRows.filter(I=>I.type==="table_row"),b=$.gridRows.filter(I=>I.type==="paragraph");if(M.length>0){const I=M.map(R=>R.text).join(" ");P+=`
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
                    <a:t>${n(I)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}if(E.length>0){const I=$.colCount,R=p-127e4,X=Math.round(R/I),O=4e5,Y=M.length>0?15e5:8e5,H=E.map((A,K)=>{const j=A.isHeader,z=A.rowCells.map(U=>`
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
                      <a:t>${n(U)}</a:t>
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
            `).join("");return`<a:tr h="${O}">${z}</a:tr>`}).join("");P+=`
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${B++}" name="Table ${f}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${Y}"/>
                <a:ext cx="${R}" cy="${O*E.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(I).fill(`<a:gridCol w="${X}"/>`).join("")}
                    </a:tblGrid>
                    ${H}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `}if(b.length>0){const I=b.map(X=>X.text).join(" "),R=15e5+4e5*E.length+25e4;P+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Notes ${f}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${R}"/><a:ext cx="${p-127e4}" cy="500000"/></a:xfrm>
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
                    <a:t>${n(I)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}}else{const M=[];let E=null;$.gridRows.forEach(b=>{if(!E)E={type:b.type,fontSize:b.fontSize||12,isBold:b.isBold,topY:b.y,bottomY:b.y,lines:[b]};else{const I=E.type===b.type,R=Math.abs(E.bottomY-b.y);I&&R<=(b.fontSize||12)*2.8?(E.lines.push(b),E.bottomY=b.y):(M.push(E),E={type:b.type,fontSize:b.fontSize||12,isBold:b.isBold,topY:b.y,bottomY:b.y,lines:[b]})}}),E&&M.push(E),M.forEach((b,I)=>{const R=b.type==="heading",X=Math.round(Math.min(48,Math.max(10,b.fontSize||12))*100),O=R?"0F172A":"334155",Y=b.isBold||R,H=typeof $.pageHeight=="number"&&!isNaN($.pageHeight)&&$.pageHeight>0?$.pageHeight:841.89,A=typeof b.topY=="number"&&!isNaN(b.topY)?b.topY:H-(I*50+60),K=typeof b.bottomY=="number"&&!isNaN(b.bottomY)?b.bottomY:A;let j=Math.max(0,Math.round((H-A-(b.fontSize||12))*12700)),z=Math.max(45e4,Math.round((A-K+(b.fontSize||12)+12)*12700)),U=p-127e4;(isNaN(j)||j<0)&&(j=Math.round((I*50+50)*12700)),(isNaN(z)||z<=0)&&(z=5e5),(isNaN(U)||U<=0)&&(U=65e5);const oe=b.lines.map(se=>`
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${X}" b="${Y?"1":"0"}">
                  <a:solidFill><a:srgbClr val="${O}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${n(se.text)}</a:t>
              </a:r>
            </a:p>
          `).join("");P+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="TextBlock ${I+1}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${j}"/><a:ext cx="${U}" cy="${z}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                ${oe}
              </p:txBody>
            </p:sp>
          `})}}else{const $=(Array.isArray(t)?t[f-1]:"")||"";if($.trim()){const E=$.split(`
`).filter(b=>b.trim()).slice(0,15).map(b=>`<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${n(b)}</a:t></a:r></a:p>`).join("");P=`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${B++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${p-914400}" cy="${w-914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${E}
          </p:txBody>
        </p:sp>`}}const N=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${g}
      ${P}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,_=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${x}
</Relationships>`;o.folder("ppt/slides").file(`slide${f}.xml`,N),o.folder("ppt/slides/_rels").file(`slide${f}.xml.rels`,_)}const m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</p:presentation>`,D=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${s.join(`
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
</p:sldMaster>`,F=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Relationships>`;return o.file("[Content_Types].xml",m),o.file("_rels/.rels",y),o.file("ppt/presentation.xml",C),o.file("ppt/_rels/presentation.xml.rels",D),o.file("ppt/theme/theme1.xml",v),o.file("ppt/slideMasters/slideMaster1.xml",T),o.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",F),o.file("ppt/slideLayouts/slideLayout1.xml",h),o.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels",u),await o.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})}async function Be(t,a="editable",e){if(!t||t.size===0)throw new Error("Please select a valid, non-empty PDF document.");let r;try{r=await t.arrayBuffer()}catch(m){throw new Error("Failed to read file data: "+m.message)}const o=new Uint8Array(r.slice(0,5));if(!String.fromCharCode(...o).startsWith("%PDF-"))throw new Error("Invalid file format. The uploaded file is not a valid PDF document.");let c,i;try{c=k.getDocument({data:r}),i=await c.promise}catch(m){throw m&&m.name==="PasswordException"?new Error("This PDF is password-protected. Please unlock or remove password protection first."):new Error("Unable to open PDF document: "+(m.message||"File may be corrupted."))}if(i.numPages===0)throw new Error("This PDF document contains no pages.");if(e&&e(20),a==="visual"){const m=await ee(t,C=>{e&&e(20+Math.round(C*.6))}),y=await te(null,m,(t==null?void 0:t.name)||"Presentation","visual");return e&&e(100),{blob:y,mode:"visual",isScannedOnly:!1,hasScannedSlides:!0,pageCount:m.length,tableDetected:!1}}const s=await Q(t,m=>{e&&e(20+Math.round(m*.5))});let d=null,p=s.isScannedOnly;const w=s.pages.some(m=>!m.hasText);if(s.isScannedOnly||w)try{d=await ee(t,m=>{e&&e(70+Math.round(m*.2))}),p=!0}catch(m){console.warn("[pdfToPptx] Visual rendering fallback notice:",m)}e&&e(85);const g=await te(s,d,(t==null?void 0:t.name)||"Presentation",s.isScannedOnly?"visual":"editable");return e&&e(100),{blob:g,mode:s.isScannedOnly?"visual":"editable",isScannedOnly:s.isScannedOnly,hasScannedSlides:p,pageCount:s.numPages,tableDetected:s.pages.some(m=>m.hasTable)}}function de(t,a="Spreadsheet"){const e=G.book_new();if(t.isScannedOnly){const r=G.aoa_to_sheet([["Notice: Scanned / Image-Only Document"],["This PDF contains scanned images without an extractable text layer."],["Optical Character Recognition (OCR) is required to convert image text into spreadsheet data."]]);return G.book_append_sheet(e,r,"Notice"),e}return t.pages.forEach((r,o)=>{const n=[],c=r.colCount,i=new Array(c).fill(10);r.gridRows.forEach(d=>{const p=d.rowCells;n.push(p),p.forEach((w,g)=>{const m=String(w||"").length;m>(i[g]||10)&&(i[g]=Math.min(m+3,50))})});const l=G.aoa_to_sheet(n);l["!cols"]=i.map(d=>({wch:d}));const s=t.numPages===1?"Sheet1":`Page ${o+1}`;G.book_append_sheet(e,l,s)}),e}async function $e(t,a){const e=await Q(t,c=>{a&&a(Math.round(c*.7))}),r=de(e,(t==null?void 0:t.name)||"Spreadsheet"),o=ce(r,{bookType:"xlsx",type:"array"}),n=new Blob([o],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return a&&a(100),{blob:n,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(c=>c.hasTable)}}function De(t){return new Blob([t],{type:"text/plain;charset=utf-8"})}async function Ee(t,a="images"){const e=new J,r=e.folder(a);return t.forEach((o,n)=>{const c=o.dataUrl.replace(/^data:image\/(png|jpeg);base64,/,""),i=o.dataUrl.startsWith("data:image/png")?"png":"jpg";r.file(`page_${n+1}.${i}`,c,{base64:!0})}),await e.generateAsync({type:"blob"})}function ne(t="#000000"){let a=t.replace("#","").trim();a.length===3&&(a=a.split("").map(n=>n+n).join(""));const e=parseInt(a.substring(0,2),16)/255,r=parseInt(a.substring(2,4),16)/255,o=parseInt(a.substring(4,6),16)/255;return re(isNaN(e)?0:e,isNaN(r)?0:r,isNaN(o)?0:o)}function fe(t,a,e,r="bottom-right",o=36){const n=t.getRotation().angle||0,c=t.getWidth(),i=t.getHeight(),l=o;let s=0,d=0,p=0;return n===0?(p=0,r==="bottom-left"?(s=l,d=l):r==="bottom-center"?(s=(c-a)/2,d=l):r==="bottom-right"?(s=c-l-a,d=l):r==="top-left"?(s=l,d=i-l-e):r==="top-center"?(s=(c-a)/2,d=i-l-e):r==="top-right"&&(s=c-l-a,d=i-l-e)):n===90?(p=90,r==="bottom-right"?(s=c-l,d=l):r==="bottom-center"?(s=c-l,d=(i-a)/2):r==="bottom-left"?(s=c-l,d=i-l-a):r==="top-right"?(s=l+e,d=l):r==="top-center"?(s=l+e,d=(i-a)/2):r==="top-left"&&(s=l+e,d=i-l-a)):n===180?(p=180,r==="bottom-right"?(s=l+a,d=i-l):r==="bottom-center"?(s=(c+a)/2,d=i-l):r==="bottom-left"?(s=c-l,d=i-l):r==="top-right"?(s=l+a,d=l+e):r==="top-center"?(s=(c+a)/2,d=l+e):r==="top-left"&&(s=c-l,d=l+e)):n===270&&(p=270,r==="bottom-right"?(s=l,d=i-l):r==="bottom-center"?(s=l,d=(i+a)/2):r==="bottom-left"?(s=l,d=l+a):r==="top-right"?(s=c-l-e,d=i-l):r==="top-center"?(s=c-l-e,d=(i+a)/2):r==="top-left"&&(s=c-l-e,d=l+a)),{x:s,y:d,rotAngle:p}}async function Me(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{startNumber:r=1,format:o="Page {n}",position:n="bottom-right",fontSize:c=11,fontColor:i="#334155",marginPt:l=36,pageRange:s="all"}=a,d=await t.arrayBuffer(),p=await L.load(d,{ignoreEncryption:!0}),w=await p.embedFont(ae.Helvetica),g=ne(i),m=p.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=s&&s!=="all"?V(s,m):Array.from({length:m},(T,F)=>F+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const C=new Set(y);let D=0;for(let T=0;T<m;T++){const F=T+1;if(C.has(F)){const h=p.getPage(T),u=r+D,f=o.replace(/\{n\}/g,String(u)).replace(/\{total\}/g,String(m)),x=w.widthOfTextAtSize(f,c),P=c,{x:B,y:S,rotAngle:N}=fe(h,x,P,n,l);h.drawText(f,{x:B,y:S,size:c,font:w,color:g,rotate:W(N)}),D++}e&&e(20+Math.round((T+1)/m*70))}const v=await p.save();return e&&e(100),new Blob([v],{type:"application/pdf"})}async function Ie(t,a={},e){var v;if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{watermarkType:r="text",text:o="CONFIDENTIAL",opacity:n=.35,rotation:c=45,fontSize:i=48,color:l="#EF4444",position:s="center",pageRange:d="all",imageFile:p=null}=a,w=await t.arrayBuffer(),g=await L.load(w,{ignoreEncryption:!0}),m=g.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=d&&d!=="all"?V(d,m):Array.from({length:m},(T,F)=>F+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const C=new Set(y);if(r==="image"&&p){let T;const F=await p.arrayBuffer();p.type==="image/png"||((v=p.name)==null?void 0:v.toLowerCase().endsWith(".png"))?T=await g.embedPng(F):T=await g.embedJpg(F);const u=T.scale(a.scale||.5);for(let f=0;f<m;f++){if(C.has(f+1)){const x=g.getPage(f),{width:P,height:B}=x.getSize();let S=(P-u.width)/2,N=(B-u.height)/2;s==="top-left"?(S=36,N=B-u.height-36):s==="top-right"?(S=P-u.width-36,N=B-u.height-36):s==="bottom-left"?(S=36,N=36):s==="bottom-right"&&(S=P-u.width-36,N=36),x.drawImage(T,{x:S,y:N,width:u.width,height:u.height,opacity:Math.max(.05,Math.min(1,n))})}e&&e(20+Math.round((f+1)/m*70))}}else{const T=await g.embedFont(ae.HelveticaBold),F=String(o||"CONFIDENTIAL").trim();if(!F)throw new Error("Watermark text cannot be empty.");const h=ne(l),u=T.widthOfTextAtSize(F,i),f=i,x=c*Math.PI/180;for(let P=0;P<m;P++){if(C.has(P+1)){const B=g.getPage(P),{width:S,height:N}=B.getSize(),_=B.getRotation().angle||0;let $=0,M=0;s==="center"||s==="diagonal"?($=S/2-u/2*Math.cos(x)+f/4*Math.sin(x),M=N/2-u/2*Math.sin(x)-f/4*Math.cos(x)):s==="top-left"?($=36,M=N-72):s==="top-right"?($=S-u-36,M=N-72):s==="bottom-left"?($=36,M=36):s==="bottom-right"&&($=S-u-36,M=36),B.drawText(F,{x:$,y:M,size:i,font:T,color:h,opacity:Math.max(.05,Math.min(1,n)),rotate:W(c+_)})}e&&e(20+Math.round((P+1)/m*70))}}const D=await g.save();return e&&e(100),new Blob([D],{type:"application/pdf"})}async function Ne(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{cropMargins:r={top:36,bottom:36,left:36,right:36},pageRange:o="all"}=a,n=Number(r.top)||0,c=Number(r.bottom)||0,i=Number(r.left)||0,l=Number(r.right)||0;if(n<0||c<0||i<0||l<0)throw new Error("Crop margins must be non-negative values.");const s=await t.arrayBuffer(),d=await L.load(s,{ignoreEncryption:!0}),p=d.getPageCount();if(p===0)throw new Error("This PDF document contains no pages.");const w=o&&o!=="all"?V(o,p):Array.from({length:p},(y,C)=>C+1);if(w.length===0)throw new Error("No valid pages found in the specified page range.");const g=new Set(w);for(let y=0;y<p;y++){if(g.has(y+1)){const C=d.getPage(y),D=C.getMediaBox(),v=C.getCropBox()||D,T=v.x+i,F=v.y+c,h=v.width-i-l,u=v.height-n-c;if(h<=20||u<=20)throw new Error(`Crop margins too large on page ${y+1}. Remaining width (${Math.round(h)}pt) or height (${Math.round(u)}pt) must be at least 20pt.`);C.setCropBox(T,F,h,u)}e&&e(20+Math.round((y+1)/p*70))}const m=await d.save();return e&&e(100),new Blob([m],{type:"application/pdf"})}async function Le(t){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const a=await t.arrayBuffer(),e=await L.load(a,{ignoreEncryption:!0}),r=e.getKeywords();let o="";return Array.isArray(r)?o=r.join(", "):typeof r=="string"&&(o=r),{title:e.getTitle()||"",author:e.getAuthor()||"",subject:e.getSubject()||"",keywords:o,producer:e.getProducer()||"",creator:e.getCreator()||"",creationDate:e.getCreationDate()?e.getCreationDate().toISOString():"",modificationDate:e.getModificationDate()?e.getModificationDate().toISOString():"",pageCount:e.getPageCount()}}async function Re(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const r=await t.arrayBuffer(),o=await L.load(r,{ignoreEncryption:!0});if(e&&e(30),a.title!==void 0&&o.setTitle(a.title||""),a.author!==void 0&&o.setAuthor(a.author||""),a.subject!==void 0&&o.setSubject(a.subject||""),a.keywords!==void 0){const c=String(a.keywords||"").split(",").map(i=>i.trim()).filter(Boolean);o.setKeywords(c)}a.producer!==void 0&&o.setProducer(a.producer||"Simatrix PDF Tools"),a.creator!==void 0&&o.setCreator(a.creator||"Simatrix PDF Tools"),o.setModificationDate(new Date),e&&e(75);const n=await o.save();return e&&e(100),new Blob([n],{type:"application/pdf"})}async function je(t,a,e={},r){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");if(!Array.isArray(a)||a.length===0)throw new Error("Please provide at least one page in the reordered list.");const o=await t.arrayBuffer(),n=await L.load(o,{ignoreEncryption:!0}),c=n.getPageCount();for(const s of a)if(typeof s!="number"||s<1||s>c)throw new Error(`Invalid page index ${s}. Document contains pages 1 to ${c}.`);r&&r(20);const i=await L.create();for(let s=0;s<a.length;s++){const d=a[s],[p]=await i.copyPages(n,[d-1]),w=Number(e[d])||0;if(w!==0){const g=p.getRotation().angle||0;p.setRotation(W((g+w)%360))}i.addPage(p),r&&r(20+Math.round((s+1)/a.length*70))}const l=await i.save();return r&&r(100),new Blob([l],{type:"application/pdf"})}export{be as a,ee as b,Ee as c,Be as d,$e as e,ue as f,De as g,Te as h,Pe as i,Me as j,Ne as k,Re as l,ye as m,Fe as n,V as o,ve as p,Se as q,Le as r,xe as s,Ce as t,je as u,Ie as w};
