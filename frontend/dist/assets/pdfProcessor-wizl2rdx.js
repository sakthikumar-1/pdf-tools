const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-qpdf-DAJo1tni.js","assets/vendor-react-DjC66yWR.js","assets/vendor-fontawesome-2cJsYXiM.js","assets/vendor-pdfjs-D0UH_v1Z.js"])))=>i.map(i=>d[i]);
import{_ as Z}from"./index-DKmtzVp_.js";import{PDFDocument as R,degrees as k,StandardFonts as ae,rgb as re}from"./vendor-pdflib-CPiZIgwL.js";import{p as G}from"./useFileUpload-6Fk2iZxO.js";import{J,w as ie,u as O}from"./vendor-office-D7pqaUKK.js";async function he(t,a){const e=await t.arrayBuffer(),o=await G.getDocument({data:e}).promise,s=o.numPages,p=[];for(let i=1;i<=s;i++){const d=await(await o.getPage(i)).getTextContent();let c=null,w=[],h="";for(const y of d.items)if("str"in y){const S=y.transform?y.transform[5]:null;c!==null&&Math.abs(S-c)>5?(h.trim()&&w.push(h.trim()),h=y.str):h+=(h&&!h.endsWith(" ")?" ":"")+y.str,c=S}h.trim()&&w.push(h.trim());const m=w.join(`
`);p.push(m),a&&a(Math.round(i/s*75))}return{fullText:p.join(`

--- Page Break ---

`),pageTexts:p,numPages:s}}async function ee(t,a){const e=await t.arrayBuffer(),o=await G.getDocument({data:e}).promise,s=o.numPages,p=[];for(let l=1;l<=s;l++){const i=await o.getPage(l),n=i.getViewport({scale:3.5}),d=document.createElement("canvas"),c=d.getContext("2d",{alpha:!0});d.width=n.width,d.height=n.height,c&&(c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="high"),await i.render({canvasContext:c,viewport:n}).promise;const w=d.toDataURL("image/png",1);p.push({pageNumber:l,dataUrl:w,width:n.width,height:n.height}),a&&a(Math.round(l/s*85))}return p}async function we(t,a){const e=Array.isArray(t)?t:t?[t]:[],r=e.length;if(r<2)throw new Error("Please select at least 2 PDF files to merge together.");const o=await R.create();for(let p=0;p<r;p++){const l=e[p];if(l&&typeof l.arrayBuffer=="function")try{const i=await l.arrayBuffer(),n=await R.load(i);(await o.copyPages(n,n.getPageIndices())).forEach(c=>o.addPage(c))}catch(i){console.warn(`[mergePdfs] Skipping invalid file index ${p}:`,i)}a&&a(Math.round((p+1)/r*90))}const s=await o.save();return new Blob([s],{type:"application/pdf"})}async function ue(t,a="1",e){const r=await t.arrayBuffer(),o=await R.load(r),s=o.getPageCount();if(s===0)throw new Error("This PDF document contains no pages to split.");const p=(a||"").trim();if(!p)throw new Error(`Please enter the page numbers or ranges to extract (Document has ${s} page${s===1?"":"s"}).`);let l=[];if(p.toLowerCase()==="all")for(let c=0;c<s;c++)l.push(c);else{const c=p.split(",");for(let w of c){const h=w.trim();if(h)if(h.includes("-")){const m=h.split("-");if(m.length!==2)throw new Error(`Invalid range format: "${h}". Expected format like 1-3.`);const y=m[0].trim(),S=m[1].trim();if(!/^\d+$/.test(y)||!/^\d+$/.test(S))throw new Error(`Invalid numbers in range: "${h}". Please use positive numbers only.`);const T=parseInt(y,10),b=parseInt(S,10);if(T<1||b<1)throw new Error(`Page numbers must be 1 or greater (got range "${h}").`);if(T>s&&b>s)throw new Error(`Requested range ${T}-${b} is out of range. Document contains only ${s} page${s===1?"":"s"}.`);if(T>s)throw new Error(`Page range start (${T}) exceeds total document pages (${s}).`);const F=Math.min(T,b),P=Math.min(s,Math.max(T,b));for(let g=Math.max(1,F);g<=P;g++)l.push(g-1)}else{if(!/^\d+$/.test(h))throw new Error(`Invalid page specification: "${h}". Please enter numeric page numbers (e.g. 1, 2-3).`);const m=parseInt(h,10);if(m<1)throw new Error(`Page numbers must be 1 or greater (got ${m}).`);if(m>s)throw new Error(`Page ${m} is out of range. This document only contains ${s} page${s===1?"":"s"}.`);l.push(m-1)}}}if(l=Array.from(new Set(l)).filter(c=>c>=0&&c<s),l.length===0)throw new Error(`No valid pages found in range "${a}". Document contains ${s} page${s===1?"":"s"} (valid range: 1-${s}).`);e&&e(30);const i=await R.create(),n=await i.copyPages(o,l);n.forEach((c,w)=>{i.addPage(c),e&&e(30+Math.round((w+1)/n.length*60))});const d=await i.save();return new Blob([d],{type:"application/pdf"})}async function ye(t,a="recommended",e){const r=t.size,o=await t.arrayBuffer();e&&e(10);let s=null,p=r;try{s=await(await R.load(o,{ignoreEncryption:!0})).save({useObjectStreams:!0}),p=s.byteLength}catch(y){console.warn("[compressPdf] Vector optimization bypass:",y)}e&&e(25);let l=1.2,i=.65;a==="extreme"?(l=.85,i=.45):a==="low"&&(l=1.4,i=.8);let n=null,d=1/0;if(typeof document<"u")try{const S=await G.getDocument({data:o}).promise,T=S.numPages,b=await R.create();for(let P=1;P<=T;P++){const g=await S.getPage(P),u=g.getViewport({scale:l}),f=document.createElement("canvas"),x=f.getContext("2d");f.width=u.width,f.height=u.height,x&&(x.imageSmoothingEnabled=!0,x.imageSmoothingQuality="high"),await g.render({canvasContext:x,viewport:u}).promise;const v=f.toDataURL("image/jpeg",i),D=await fetch(v).then(z=>z.arrayBuffer()),B=await b.embedJpg(D);b.addPage([u.width,u.height]).drawImage(B,{x:0,y:0,width:u.width,height:u.height}),e&&e(25+Math.round(P/T*65))}const F=await b.save({useObjectStreams:!0});n=new Blob([F],{type:"application/pdf"}),d=n.size}catch(y){console.warn("[compressPdf] Downsampling skipped:",y)}e&&e(95);let c,w,h=!1;n&&d<r&&d<p*.95?(c=n,w=d):s&&p<r?(c=new Blob([s],{type:"application/pdf"}),w=p):(c=new Blob([o],{type:"application/pdf"}),w=r,h=!0),e&&e(100);const m=Math.round((r-w)/r*100);return{blob:c,originalSize:r,compressedSize:w,reductionPercent:m>0?m:0,alreadyOptimized:h}}async function xe(t,a=90,e){const r=await t.arrayBuffer(),o=await R.load(r);o.getPages().forEach(l=>{const i=l.getRotation().angle;l.setRotation(k((i+a)%360))}),e&&e(90);const p=await o.save();return new Blob([p],{type:"application/pdf"})}async function be(t,a){const e=Array.isArray(t)?t:[t],r=e.length;if(r===0)throw new Error("Please select at least one image file.");for(let p=0;p<r;p++){const l=e[p];if((l.name?l.name.toLowerCase():"").endsWith(".pdf")||l.type==="application/pdf")throw new Error(`'${l.name||"Selected document"}' is a PDF file. Images to PDF accepts only image files (JPG, PNG, WebP), not PDF documents.`)}const o=await R.create();for(let p=0;p<r;p++){const l=e[p],i=await l.arrayBuffer();let n;try{const d=l.type==="image/png"||l.name&&l.name.toLowerCase().endsWith(".png"),c=l.type==="image/jpeg"||l.type==="image/jpg"||l.name&&(l.name.toLowerCase().endsWith(".jpg")||l.name.toLowerCase().endsWith(".jpeg"));if(d)n=await o.embedPng(i);else if(c)try{n=await o.embedJpg(i)}catch(h){if(typeof document<"u"){const m=URL.createObjectURL(l),y=new Image;await new Promise((P,g)=>{y.onload=P,y.onerror=g,y.src=m});const S=document.createElement("canvas");S.width=y.width,S.height=y.height,S.getContext("2d").drawImage(y,0,0);const b=S.toDataURL("image/jpeg",.95),F=await fetch(b).then(P=>P.arrayBuffer());n=await o.embedJpg(F),URL.revokeObjectURL(m)}else throw h}else if(typeof document<"u"){const h=URL.createObjectURL(l),m=new Image;await new Promise((F,P)=>{m.onload=F,m.onerror=P,m.src=h});const y=document.createElement("canvas");y.width=m.width,y.height=m.height,y.getContext("2d").drawImage(m,0,0);const T=y.toDataURL("image/jpeg",.95),b=await fetch(T).then(F=>F.arrayBuffer());n=await o.embedJpg(b),URL.revokeObjectURL(h)}o.addPage([n.width,n.height]).drawImage(n,{x:0,y:0,width:n.width,height:n.height})}catch(d){console.warn(`[imagesToPdf] Error processing image index ${p}:`,d)}a&&a(Math.round((p+1)/r*90))}const s=await o.save();return new Blob([s],{type:"application/pdf"})}async function Pe(t,a,e){if(!a||!a.trim())throw new Error("Please enter a password to protect your PDF file.");e&&e(20);try{const d=new FormData;d.append("file",t),d.append("password",a);const c=await fetch("/api/v1/security/protect-pdf",{method:"POST",body:d});if(c.ok){const w=await c.json();if(w&&w.success&&w.download_url){const h=await fetch(w.download_url);if(h.ok){const m=await h.blob();if(m&&m.size>0)return e&&e(100),m}}}}catch{console.log("[protectPdf] Python security API offline, executing QPDF WASM client fallback engine.")}e&&e(40);const r=await t.arrayBuffer(),o=new Uint8Array(r);e&&e(60);const{default:s}=await Z(async()=>{const{default:d}=await import("./vendor-qpdf-DAJo1tni.js").then(c=>c.q);return{default:d}},__vite__mapDeps([0,1,2,3]));let p="/qpdf.wasm";try{p=(await Z(()=>import("./vendor-qpdf-DAJo1tni.js").then(c=>c.a),__vite__mapDeps([0,1,2,3]))).default||p}catch{}const l=await s({locateFile:d=>d.endsWith(".wasm")?p||"/qpdf.wasm":d});e&&e(80),l.FS.writeFile("/input.pdf",o),l.callMain(["/input.pdf","--encrypt",a,a,"256","--","/output.pdf"]);const i=l.FS.readFile("/output.pdf"),n=new Uint8Array(i.length);return n.set(i),e&&e(100),new Blob([n],{type:"application/pdf"})}function V(t,a){if(!t||!t.trim())return[];const e=t.split(","),r=new Set;for(let o of e)if(o=o.trim(),o.includes("-")){const[s,p]=o.split("-"),l=parseInt(s.trim(),10),i=parseInt(p.trim(),10);if(!isNaN(l)&&!isNaN(i))for(let n=Math.max(1,Math.min(l,i));n<=Math.min(a,Math.max(l,i));n++)r.add(n)}else{const s=parseInt(o,10);!isNaN(s)&&s>=1&&s<=a&&r.add(s)}return Array.from(r).sort((o,s)=>o-s)}function ve(t){if(!t||t.length===0)return"";const a=Array.from(new Set(t)).sort((s,p)=>s-p),e=[];let r=a[0],o=a[0];for(let s=1;s<a.length;s++)a[s]===o+1||(e.push(r===o?`${r}`:`${r}-${o}`),r=a[s]),o=a[s];return e.push(r===o?`${r}`:`${r}-${o}`),e.join(", ")}async function Se(t,a,e){const r=await t.arrayBuffer(),o=await R.load(r),s=o.getPageCount(),p=new Set(a.map(c=>c-1)),l=[];for(let c=0;c<s;c++)p.has(c)||l.push(c);if(l.length===0)throw new Error("Cannot remove all pages from PDF. At least one page must remain in the document.");e&&e(30);const i=await R.create();(await i.copyPages(o,l)).forEach((c,w)=>{i.addPage(c),e&&e(30+Math.round((w+1)/l.length*60))});const d=await i.save();return e&&e(100),new Blob([d],{type:"application/pdf"})}async function Ce(t,a="processed"){if(Array.isArray(t)&&t.length>0){const o=t.find(s=>{var p;return s&&(s.type==="application/pdf"||((p=s.name)==null?void 0:p.endsWith(".pdf")))})||t[0];if(o&&typeof o.arrayBuffer=="function"){const s=await o.arrayBuffer();return new Blob([s],{type:"application/pdf"})}}else if(t&&typeof t.arrayBuffer=="function"){const r=await t.arrayBuffer();return new Blob([r],{type:"application/pdf"})}const e=`%PDF-1.4
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
%%EOF`;return new Blob([e],{type:"application/pdf"})}async function Q(t,a){let e;t instanceof ArrayBuffer?e=t:t&&typeof t.arrayBuffer=="function"?e=await t.arrayBuffer():t&&t.buffer?e=t.buffer.slice(t.byteOffset,t.byteOffset+t.byteLength):e=t;const o=await G.getDocument({data:e}).promise,s=o.numPages,p=[];let l=0;for(let i=1;i<=s;i++){const n=await o.getPage(i),d=n.getViewport({scale:1}),c=d?d.width:595.28,w=d?d.height:841.89,h=await n.getTextContent(),m=[];h.items.forEach(g=>{const u=(g.str||"").trim();if(!u)return;const f=g.transform?g.transform[4]:0,x=g.transform?g.transform[5]:0,v=g.width||0,D=Math.abs(g.transform?g.transform[0]:12)||g.height||12,B=g.fontName||"",I=B.toLowerCase().includes("bold")||B.toLowerCase().includes("heavy")||B.toLowerCase().includes("black");m.push({text:u,x:f,y:x,width:v,height:D,isBold:I,fontSize:Math.round(D)}),l++}),m.sort((g,u)=>u.y-g.y||g.x-u.x);const y=[];m.forEach(g=>{let u=y.find(f=>Math.abs(f.y-g.y)<=3.5);u||(u={y:g.y,items:[]},y.push(u)),u.items.push(g)}),y.forEach(g=>g.items.sort((u,f)=>u.x-f.x));const S=y.map(g=>{const u=[];let f=null;return g.items.forEach(x=>{f?x.x-(f.x+f.width)<=8?(f.text+=" "+x.text,f.width=x.x+x.width-f.x,x.isBold&&(f.isBold=!0)):(u.push(f),f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}):f={text:x.text,x:x.x,width:x.width,height:x.height,isBold:x.isBold,fontSize:x.fontSize}}),f&&u.push(f),{y:g.y,cells:u}}),T=S.filter(g=>g.cells.length>=2),b=[],F=14;T.forEach(g=>{g.cells.forEach(u=>{b.find(x=>Math.abs(x-u.x)<=F)===void 0&&b.push(u.x)})}),b.sort((g,u)=>g-u);const P=[];S.forEach(g=>{var u;if(g.cells.length===1&&b.length>=2)P.push({type:"heading",y:g.y,text:g.cells[0].text,fontSize:g.cells[0].fontSize,isBold:g.cells[0].isBold,rowCells:[g.cells[0].text]});else if(b.length>=2){const f=new Array(b.length).fill("");g.cells.forEach(v=>{let D=0,B=1/0;b.forEach((I,z)=>{const $=Math.abs(I-v.x);$<B&&(B=$,D=z)}),f[D]=v.text});const x=g.cells.some(v=>v.isBold)||P.length===0||P.length===1&&P[0].type==="heading";P.push({type:"table_row",y:g.y,isHeader:x,rowCells:f})}else{const f=g.cells.map(B=>B.text).join(" "),x=((u=g.cells[0])==null?void 0:u.fontSize)||12,v=g.cells.some(B=>B.isBold),D=x>=14||v;P.push({type:D?"heading":"paragraph",y:g.y,text:f,fontSize:x,isBold:v,rowCells:[f]})}}),p.push({pageNum:i,pageWidth:c,pageHeight:w,hasText:m.length>0,totalTextItems:m.length,hasTable:b.length>=2,colCount:Math.max(1,b.length),colAnchors:b,gridRows:P,lineCount:S.length}),a&&a(Math.round(i/s*70))}return{numPages:s,totalTextItems:l,isScannedOnly:l===0,pages:p}}function q(t){return String(t||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}async function le(t,a="Document"){const e=new J,r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,o=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;let s="";t.isScannedOnly?s=`
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
    `:t.pages.forEach((l,i)=>{i>0&&(s+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>');let n=!1,d="";const c=()=>{n&&d&&(s+=`
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
          `,d="",n=!1)};l.gridRows.forEach(w=>{if(w.type==="table_row"){n=!0;const h=w.isHeader,m=w.rowCells.map(y=>{const S=q(y);return`
              <w:tc>
                <w:tcPr>
                  ${h?'<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>':""}
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
                      ${h?"<w:b/>":""}
                      <w:sz w:val="20"/>
                      <w:color w:val="${h?"1E293B":"334155"}"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${S}</w:t>
                  </w:r>
                </w:p>
              </w:tc>
            `}).join("");d+=`<w:tr>${m}</w:tr>`}else if(c(),w.type==="heading"){const h=Math.min(36,Math.max(26,(w.fontSize||16)*2));s+=`
              <w:p>
                <w:pPr>
                  <w:spacing w:before="240" w:after="140"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/>
                    <w:b/>
                    <w:sz w:val="${h}"/>
                    <w:color w:val="0F172A"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${q(w.text)}</w:t>
                </w:r>
              </w:p>
            `}else s+=`
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
            `}),c()});const p=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${s}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;return e.file("[Content_Types].xml",r),e.folder("_rels").file(".rels",o),e.folder("word").file("document.xml",p),await e.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}async function Fe(t,a){var o;const e=await Q(t,s=>{a&&a(Math.round(s*.7))}),r=await le(e,(t==null?void 0:t.name)||"Document");return a&&a(100),{blob:r,filename:`${((o=t==null?void 0:t.name)==null?void 0:o.replace(/\.[^/.]+$/,""))||"document"}_converted.docx`,isScanned:e.isScannedOnly,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(s=>s.hasTable)}}async function te(t=[],a=[],e="Presentation",r="editable"){const o=new J,s=f=>String(f||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),p=t&&typeof t=="object"&&Array.isArray(t.pages),l=p?t.pages.length:Math.max(1,Math.max((t||[]).length,(a||[]).length)),i=[],n=[],d=[];let c=12192e3,w=6858e3;if(p&&t.pages&&t.pages[0]){const f=t.pages[0],x=typeof f.pageWidth=="number"&&!isNaN(f.pageWidth)&&f.pageWidth>0?f.pageWidth:595.28,v=typeof f.pageHeight=="number"&&!isNaN(f.pageHeight)&&f.pageHeight>0?f.pageHeight:841.89;c=Math.round(x*12700),w=Math.round(v*12700)}else if(a&&a.length>0&&a[0]){const f=a.find(v=>v&&(v.dataUrl||v.url)),x=f?f.height>f.width:!0;c=x?792e4:12192e3,w=x?10252800:6858e3}(!c||isNaN(c)||c<=0)&&(c=12192e3),(!w||isNaN(w)||w<=0)&&(w=6858e3);const h=`
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
      </p:grpSpPr>`;for(let f=1;f<=l;f++){i.push(`<Override PartName="/ppt/slides/slide${f}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),n.push(`<Relationship Id="rId${f+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${f}.xml"/>`),d.push(`<p:sldId id="${255+f}" r:id="rId${f+1}"/>`);let x="",v="",D=2;const B=a&&a[f-1];if((r==="visual"||!p)&&B&&B.dataUrl){const M=B.dataUrl.startsWith("data:image/jpeg")||B.dataUrl.startsWith("data:image/jpg")?"jpg":"png",E=B.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${f}.${M}`,E,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${M}"/>`,v=`
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${D++}" name="Slide Image ${f}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg${f}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${c}" cy="${w}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`}else if(p){const $=t.pages[f-1];if(!$||!$.hasText)if(B&&B.dataUrl){const E=B.dataUrl.startsWith("data:image/jpeg")||B.dataUrl.startsWith("data:image/jpg")?"jpg":"png",C=B.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${f}.${E}`,C,{base64:!0}),x=`<Relationship Id="rIdImg${f}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${f}.${E}"/>`,v=`
          <p:pic>
            <p:nvPicPr>
              <p:cNvPr id="${D++}" name="Scanned Slide Image ${f}"/>
              <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip r:embed="rIdImg${f}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${c}" cy="${w}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </p:spPr>
          </p:pic>`}else v=`
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="${D++}" name="Scanned Notice"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="635000" y="635000"/><a:ext cx="${c-127e4}" cy="1270000"/></a:xfrm>
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
        `;else if($.hasTable){const M=$.gridRows.filter(N=>N.type==="heading"),E=$.gridRows.filter(N=>N.type==="table_row"),C=$.gridRows.filter(N=>N.type==="paragraph");if(M.length>0){const N=M.map(L=>L.text).join(" ");v+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${D++}" name="Slide Title ${f}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="500000"/><a:ext cx="${c-127e4}" cy="800000"/></a:xfrm>
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
                    <a:t>${s(N)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}if(E.length>0){const N=$.colCount,L=c-127e4,X=Math.round(L/N),H=4e5,Y=M.length>0?15e5:8e5,W=E.map((A,K)=>{const j=A.isHeader,U=A.rowCells.map(_=>`
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
                      <a:t>${s(_)}</a:t>
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
            `).join("");return`<a:tr h="${H}">${U}</a:tr>`}).join("");v+=`
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${D++}" name="Table ${f}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${Y}"/>
                <a:ext cx="${L}" cy="${H*E.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(N).fill(`<a:gridCol w="${X}"/>`).join("")}
                    </a:tblGrid>
                    ${W}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `}if(C.length>0){const N=C.map(X=>X.text).join(" "),L=15e5+4e5*E.length+25e4;v+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${D++}" name="Notes ${f}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${L}"/><a:ext cx="${c-127e4}" cy="500000"/></a:xfrm>
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
                    <a:t>${s(N)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}}else{const M=[];let E=null;$.gridRows.forEach(C=>{if(!E)E={type:C.type,fontSize:C.fontSize||12,isBold:C.isBold,topY:C.y,bottomY:C.y,lines:[C]};else{const N=E.type===C.type,L=Math.abs(E.bottomY-C.y);N&&L<=(C.fontSize||12)*2.8?(E.lines.push(C),E.bottomY=C.y):(M.push(E),E={type:C.type,fontSize:C.fontSize||12,isBold:C.isBold,topY:C.y,bottomY:C.y,lines:[C]})}}),E&&M.push(E),M.forEach((C,N)=>{const L=C.type==="heading",X=Math.round(Math.min(48,Math.max(10,C.fontSize||12))*100),H=L?"0F172A":"334155",Y=C.isBold||L,W=typeof $.pageHeight=="number"&&!isNaN($.pageHeight)&&$.pageHeight>0?$.pageHeight:841.89,A=typeof C.topY=="number"&&!isNaN(C.topY)?C.topY:W-(N*50+60),K=typeof C.bottomY=="number"&&!isNaN(C.bottomY)?C.bottomY:A;let j=Math.max(0,Math.round((W-A-(C.fontSize||12))*12700)),U=Math.max(45e4,Math.round((A-K+(C.fontSize||12)+12)*12700)),_=c-127e4;(isNaN(j)||j<0)&&(j=Math.round((N*50+50)*12700)),(isNaN(U)||U<=0)&&(U=5e5),(isNaN(_)||_<=0)&&(_=65e5);const oe=C.lines.map(se=>`
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${X}" b="${Y?"1":"0"}">
                  <a:solidFill><a:srgbClr val="${H}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${s(se.text)}</a:t>
              </a:r>
            </a:p>
          `).join("");v+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${D++}" name="TextBlock ${N+1}"/>
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
          `})}}else{const $=(Array.isArray(t)?t[f-1]:"")||"";if($.trim()){const E=$.split(`
`).filter(C=>C.trim()).slice(0,15).map(C=>`<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${s(C)}</a:t></a:r></a:p>`).join("");v=`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${D++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${c-914400}" cy="${w-914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${E}
          </p:txBody>
        </p:sp>`}}const I=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${h}
      ${v}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,z=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${x}
</Relationships>`;o.folder("ppt/slides").file(`slide${f}.xml`,I),o.folder("ppt/slides/_rels").file(`slide${f}.xml.rels`,z)}const m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
  ${i.join(`
  `)}
</Types>`,y=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,S=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${d.join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${c}" cy="${w}"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`,T=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${n.join(`
  `)}
</Relationships>`,b=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</a:theme>`,F=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></p:bgPr></p:bg>
    <p:spTree>${h}</p:spTree>
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
</p:sldMaster>`,P=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,g=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>${h}</p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,u=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;return o.file("[Content_Types].xml",m),o.file("_rels/.rels",y),o.file("ppt/presentation.xml",S),o.file("ppt/_rels/presentation.xml.rels",T),o.file("ppt/theme/theme1.xml",b),o.file("ppt/slideMasters/slideMaster1.xml",F),o.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",P),o.file("ppt/slideLayouts/slideLayout1.xml",g),o.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels",u),await o.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})}async function Be(t,a="editable",e){if(!t||t.size===0)throw new Error("Please select a valid, non-empty PDF document.");let r;try{r=await t.arrayBuffer()}catch(m){throw new Error("Failed to read file data: "+m.message)}const o=new Uint8Array(r.slice(0,5));if(!String.fromCharCode(...o).startsWith("%PDF-"))throw new Error("Invalid file format. The uploaded file is not a valid PDF document.");let p,l;try{p=G.getDocument({data:r}),l=await p.promise}catch(m){throw m&&m.name==="PasswordException"?new Error("This PDF is password-protected. Please unlock or remove password protection first."):new Error("Unable to open PDF document: "+(m.message||"File may be corrupted."))}if(l.numPages===0)throw new Error("This PDF document contains no pages.");if(e&&e(20),a==="visual"){const m=await ee(t,S=>{e&&e(20+Math.round(S*.6))}),y=await te(null,m,(t==null?void 0:t.name)||"Presentation","visual");return e&&e(100),{blob:y,mode:"visual",isScannedOnly:!1,hasScannedSlides:!0,pageCount:m.length,tableDetected:!1}}const n=await Q(t,m=>{e&&e(20+Math.round(m*.5))});let d=null,c=n.isScannedOnly;const w=n.pages.some(m=>!m.hasText);if(n.isScannedOnly||w)try{d=await ee(t,m=>{e&&e(70+Math.round(m*.2))}),c=!0}catch(m){console.warn("[pdfToPptx] Visual rendering fallback notice:",m)}e&&e(85);const h=await te(n,d,(t==null?void 0:t.name)||"Presentation",n.isScannedOnly?"visual":"editable");return e&&e(100),{blob:h,mode:n.isScannedOnly?"visual":"editable",isScannedOnly:n.isScannedOnly,hasScannedSlides:c,pageCount:n.numPages,tableDetected:n.pages.some(m=>m.hasTable)}}function ce(t,a="Spreadsheet"){const e=O.book_new();if(t.isScannedOnly){const r=O.aoa_to_sheet([["Notice: Scanned / Image-Only Document"],["This PDF contains scanned images without an extractable text layer."],["Optical Character Recognition (OCR) is required to convert image text into spreadsheet data."]]);return O.book_append_sheet(e,r,"Notice"),e}return t.pages.forEach((r,o)=>{const s=[],p=r.colCount,l=new Array(p).fill(10);r.gridRows.forEach(d=>{const c=d.rowCells;s.push(c),c.forEach((w,h)=>{const m=String(w||"").length;m>(l[h]||10)&&(l[h]=Math.min(m+3,50))})});const i=O.aoa_to_sheet(s);i["!cols"]=l.map(d=>({wch:d}));const n=t.numPages===1?"Sheet1":`Page ${o+1}`;O.book_append_sheet(e,i,n)}),e}async function Te(t,a){const e=await Q(t,p=>{a&&a(Math.round(p*.7))}),r=ce(e,(t==null?void 0:t.name)||"Spreadsheet"),o=ie(r,{bookType:"xlsx",type:"array"}),s=new Blob([o],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return a&&a(100),{blob:s,isScannedOnly:e.isScannedOnly,pageCount:e.numPages,tableDetected:e.pages.some(p=>p.hasTable)}}function De(t){return new Blob([t],{type:"text/plain;charset=utf-8"})}async function $e(t,a="images"){const e=new J,r=e.folder(a);return t.forEach((o,s)=>{const p=o.dataUrl.replace(/^data:image\/(png|jpeg);base64,/,""),l=o.dataUrl.startsWith("data:image/png")?"png":"jpg";r.file(`page_${s+1}.${l}`,p,{base64:!0})}),await e.generateAsync({type:"blob"})}function ne(t="#000000"){let a=t.replace("#","").trim();a.length===3&&(a=a.split("").map(s=>s+s).join(""));const e=parseInt(a.substring(0,2),16)/255,r=parseInt(a.substring(2,4),16)/255,o=parseInt(a.substring(4,6),16)/255;return re(isNaN(e)?0:e,isNaN(r)?0:r,isNaN(o)?0:o)}function pe(t,a,e,r="bottom-right",o=36){const s=t.getRotation().angle||0,p=t.getWidth(),l=t.getHeight(),i=o;let n=0,d=0,c=0;return s===0?(c=0,r==="bottom-left"?(n=i,d=i):r==="bottom-center"?(n=(p-a)/2,d=i):r==="bottom-right"?(n=p-i-a,d=i):r==="top-left"?(n=i,d=l-i-e):r==="top-center"?(n=(p-a)/2,d=l-i-e):r==="top-right"&&(n=p-i-a,d=l-i-e)):s===90?(c=90,r==="bottom-right"?(n=p-i,d=i):r==="bottom-center"?(n=p-i,d=(l-a)/2):r==="bottom-left"?(n=p-i,d=l-i-a):r==="top-right"?(n=i+e,d=i):r==="top-center"?(n=i+e,d=(l-a)/2):r==="top-left"&&(n=i+e,d=l-i-a)):s===180?(c=180,r==="bottom-right"?(n=i+a,d=l-i):r==="bottom-center"?(n=(p+a)/2,d=l-i):r==="bottom-left"?(n=p-i,d=l-i):r==="top-right"?(n=i+a,d=i+e):r==="top-center"?(n=(p+a)/2,d=i+e):r==="top-left"&&(n=p-i,d=i+e)):s===270&&(c=270,r==="bottom-right"?(n=i,d=l-i):r==="bottom-center"?(n=i,d=(l+a)/2):r==="bottom-left"?(n=i,d=i+a):r==="top-right"?(n=p-i-e,d=l-i):r==="top-center"?(n=p-i-e,d=(l+a)/2):r==="top-left"&&(n=p-i-e,d=i+a)),{x:n,y:d,rotAngle:c}}async function Ee(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{startNumber:r=1,format:o="Page {n}",position:s="bottom-right",fontSize:p=11,fontColor:l="#334155",marginPt:i=36,pageRange:n="all"}=a,d=await t.arrayBuffer(),c=await R.load(d,{ignoreEncryption:!0}),w=await c.embedFont(ae.Helvetica),h=ne(l),m=c.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=n&&n!=="all"?V(n,m):Array.from({length:m},(F,P)=>P+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const S=new Set(y);let T=0;for(let F=0;F<m;F++){const P=F+1;if(S.has(P)){const g=c.getPage(F),u=r+T,f=o.replace(/\{n\}/g,String(u)).replace(/\{total\}/g,String(m)),x=w.widthOfTextAtSize(f,p),v=p,{x:D,y:B,rotAngle:I}=pe(g,x,v,s,i);g.drawText(f,{x:D,y:B,size:p,font:w,color:h,rotate:k(I)}),T++}e&&e(20+Math.round((F+1)/m*70))}const b=await c.save();return e&&e(100),new Blob([b],{type:"application/pdf"})}async function Me(t,a={},e){var b;if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{watermarkType:r="text",text:o="CONFIDENTIAL",opacity:s=.35,rotation:p=45,fontSize:l=48,color:i="#EF4444",position:n="center",pageRange:d="all",imageFile:c=null}=a,w=await t.arrayBuffer(),h=await R.load(w,{ignoreEncryption:!0}),m=h.getPageCount();if(m===0)throw new Error("This PDF document contains no pages.");const y=d&&d!=="all"?V(d,m):Array.from({length:m},(F,P)=>P+1);if(y.length===0)throw new Error("No valid pages found in the specified page range.");e&&e(20);const S=new Set(y);if(r==="image"&&c){let F;const P=await c.arrayBuffer();c.type==="image/png"||((b=c.name)==null?void 0:b.toLowerCase().endsWith(".png"))?F=await h.embedPng(P):F=await h.embedJpg(P);const u=F.scale(a.scale||.5);for(let f=0;f<m;f++){if(S.has(f+1)){const x=h.getPage(f),{width:v,height:D}=x.getSize();let B=(v-u.width)/2,I=(D-u.height)/2;n==="top-left"?(B=36,I=D-u.height-36):n==="top-right"?(B=v-u.width-36,I=D-u.height-36):n==="bottom-left"?(B=36,I=36):n==="bottom-right"&&(B=v-u.width-36,I=36),x.drawImage(F,{x:B,y:I,width:u.width,height:u.height,opacity:Math.max(.05,Math.min(1,s))})}e&&e(20+Math.round((f+1)/m*70))}}else{const F=await h.embedFont(ae.HelveticaBold),P=String(o||"CONFIDENTIAL").trim();if(!P)throw new Error("Watermark text cannot be empty.");const g=ne(i),u=F.widthOfTextAtSize(P,l),f=l,x=p*Math.PI/180;for(let v=0;v<m;v++){if(S.has(v+1)){const D=h.getPage(v),{width:B,height:I}=D.getSize(),z=D.getRotation().angle||0;let $=0,M=0;n==="center"||n==="diagonal"?($=B/2-u/2*Math.cos(x)+f/4*Math.sin(x),M=I/2-u/2*Math.sin(x)-f/4*Math.cos(x)):n==="top-left"?($=36,M=I-72):n==="top-right"?($=B-u-36,M=I-72):n==="bottom-left"?($=36,M=36):n==="bottom-right"&&($=B-u-36,M=36),D.drawText(P,{x:$,y:M,size:l,font:F,color:g,opacity:Math.max(.05,Math.min(1,s)),rotate:k(p+z)})}e&&e(20+Math.round((v+1)/m*70))}}const T=await h.save();return e&&e(100),new Blob([T],{type:"application/pdf"})}async function Ie(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const{cropMargins:r={top:36,bottom:36,left:36,right:36},pageRange:o="all"}=a,s=Number(r.top)||0,p=Number(r.bottom)||0,l=Number(r.left)||0,i=Number(r.right)||0;if(s<0||p<0||l<0||i<0)throw new Error("Crop margins must be non-negative values.");const n=await t.arrayBuffer(),d=await R.load(n,{ignoreEncryption:!0}),c=d.getPageCount();if(c===0)throw new Error("This PDF document contains no pages.");const w=o&&o!=="all"?V(o,c):Array.from({length:c},(y,S)=>S+1);if(w.length===0)throw new Error("No valid pages found in the specified page range.");const h=new Set(w);for(let y=0;y<c;y++){if(h.has(y+1)){const S=d.getPage(y),T=S.getMediaBox(),b=S.getCropBox()||T,F=b.x+l,P=b.y+p,g=b.width-l-i,u=b.height-s-p;if(g<=20||u<=20)throw new Error(`Crop margins too large on page ${y+1}. Remaining width (${Math.round(g)}pt) or height (${Math.round(u)}pt) must be at least 20pt.`);S.setCropBox(F,P,g,u)}e&&e(20+Math.round((y+1)/c*70))}const m=await d.save();return e&&e(100),new Blob([m],{type:"application/pdf"})}async function Ne(t){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const a=await t.arrayBuffer(),e=await R.load(a,{ignoreEncryption:!0}),r=e.getKeywords();let o="";return Array.isArray(r)?o=r.join(", "):typeof r=="string"&&(o=r),{title:e.getTitle()||"",author:e.getAuthor()||"",subject:e.getSubject()||"",keywords:o,producer:e.getProducer()||"",creator:e.getCreator()||"",creationDate:e.getCreationDate()?e.getCreationDate().toISOString():"",modificationDate:e.getModificationDate()?e.getModificationDate().toISOString():"",pageCount:e.getPageCount()}}async function Re(t,a={},e){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");const r=await t.arrayBuffer(),o=await R.load(r,{ignoreEncryption:!0});if(e&&e(30),a.title!==void 0&&o.setTitle(a.title||""),a.author!==void 0&&o.setAuthor(a.author||""),a.subject!==void 0&&o.setSubject(a.subject||""),a.keywords!==void 0){const p=String(a.keywords||"").split(",").map(l=>l.trim()).filter(Boolean);o.setKeywords(p)}a.producer!==void 0&&o.setProducer(a.producer||"Simatrix PDF Tools"),a.creator!==void 0&&o.setCreator(a.creator||"Simatrix PDF Tools"),o.setModificationDate(new Date),e&&e(75);const s=await o.save();return e&&e(100),new Blob([s],{type:"application/pdf"})}async function Le(t,a,e={},r){if(!t||t.size===0)throw new Error("Please select a valid PDF file.");if(!Array.isArray(a)||a.length===0)throw new Error("Please provide at least one page in the reordered list.");const o=await t.arrayBuffer(),s=await R.load(o,{ignoreEncryption:!0}),p=s.getPageCount();for(const n of a)if(typeof n!="number"||n<1||n>p)throw new Error(`Invalid page index ${n}. Document contains pages 1 to ${p}.`);r&&r(20);const l=await R.create();for(let n=0;n<a.length;n++){const d=a[n],[c]=await l.copyPages(s,[d-1]),w=Number(e[d])||0;if(w!==0){const h=c.getRotation().angle||0;c.setRotation(k((h+w)%360))}l.addPage(c),r&&r(20+Math.round((n+1)/a.length*70))}const i=await l.save();return r&&r(100),new Blob([i],{type:"application/pdf"})}async function je(t,a,e){e&&e(10);const r=await t.arrayBuffer(),o=await R.load(r,{ignoreEncryption:!0}),s=o.getPageCount();e&&e(30);const p=a.length;for(let i=0;i<p;i++){const n=a[i],d=(n.page||1)-1;if(d<0||d>=s)continue;const c=o.getPage(d),{width:w,height:h}=c.getSize(),m=c.getRotation().angle;let y=n.dataUrl||n.imageBase64||"";if(y.includes(",")&&(y=y.split(",")[1]),!y)continue;const S=atob(y),T=new Uint8Array(S.length);for(let f=0;f<S.length;f++)T[f]=S.charCodeAt(f);const b=await o.embedPng(T),F=Number(n.ptX)||0,P=Number(n.ptY)||0,g=Number(n.ptW)||120,u=Number(n.ptH)||50;m===0?c.drawImage(b,{x:F,y:h-P-u,width:g,height:u}):m===90?c.drawImage(b,{x:P,y:F,width:g,height:u,rotate:k(-90)}):m===180?c.drawImage(b,{x:w-F-g,y:P,width:g,height:u,rotate:k(180)}):m===270&&c.drawImage(b,{x:w-P-u,y:h-F-g,width:g,height:u,rotate:k(90)}),e&&e(30+Math.round((i+1)/p*50))}e&&e(85);const l=await o.save();return e&&e(100),new Blob([l],{type:"application/pdf"})}export{xe as a,ee as b,ye as c,$e as d,Be as e,Te as f,he as g,De as h,be as i,Fe as j,Ee as k,Ie as l,we as m,Re as n,Ce as o,Pe as p,V as q,Ne as r,ue as s,ve as t,Se as u,Le as v,Me as w,je as x};
