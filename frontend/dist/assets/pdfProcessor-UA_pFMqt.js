const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-qpdf-DAJo1tni.js","assets/vendor-react-DjC66yWR.js","assets/vendor-fontawesome-2cJsYXiM.js","assets/vendor-pdfjs-D0UH_v1Z.js"])))=>i.map(i=>d[i]);
import{_ as Z}from"./index-DzuEqWFH.js";import{PDFDocument as L,degrees as z,StandardFonts as at,rgb as rt}from"./vendor-pdflib-CPiZIgwL.js";import{p as G}from"./useFileUpload-6Fk2iZxO.js";import{J,w as it,u as X}from"./vendor-office-D7pqaUKK.js";async function gt(e,a){const t=await e.arrayBuffer(),o=await G.getDocument({data:t}).promise,s=o.numPages,p=[];for(let l=1;l<=s;l++){const f=await(await o.getPage(l)).getTextContent();let i=null,x=[],g="";for(const u of f.items)if("str"in u){const C=u.transform?u.transform[5]:null;i!==null&&Math.abs(C-i)>5?(g.trim()&&x.push(g.trim()),g=u.str):g+=(g&&!g.endsWith(" ")?" ":"")+u.str,i=C}g.trim()&&x.push(g.trim());const h=x.join(`
`);p.push(h),a&&a(Math.round(l/s*75))}return{fullText:p.join(`

--- Page Break ---

`),pageTexts:p,numPages:s}}async function tt(e,a){const t=await e.arrayBuffer(),o=await G.getDocument({data:t}).promise,s=o.numPages,p=[];for(let c=1;c<=s;c++){const l=await o.getPage(c),n=l.getViewport({scale:3.5}),f=document.createElement("canvas"),i=f.getContext("2d",{alpha:!0});f.width=n.width,f.height=n.height,i&&(i.imageSmoothingEnabled=!0,i.imageSmoothingQuality="high"),await l.render({canvasContext:i,viewport:n}).promise;const x=f.toDataURL("image/png",1);p.push({pageNumber:c,dataUrl:x,width:n.width,height:n.height}),a&&a(Math.round(c/s*85))}return p}async function wt(e,a){const t=Array.isArray(e)?e:e?[e]:[],r=t.length;if(r<2)throw new Error("Please select at least 2 PDF files to merge together.");const o=await L.create();for(let p=0;p<r;p++){const c=t[p];if(c&&typeof c.arrayBuffer=="function")try{const l=await c.arrayBuffer(),n=await L.load(l);(await o.copyPages(n,n.getPageIndices())).forEach(i=>o.addPage(i))}catch(l){console.warn(`[mergePdfs] Skipping invalid file index ${p}:`,l)}a&&a(Math.round((p+1)/r*90))}const s=await o.save();return new Blob([s],{type:"application/pdf"})}async function ut(e,a="1",t){const r=await e.arrayBuffer(),o=await L.load(r),s=o.getPageCount();if(s===0)throw new Error("This PDF document contains no pages to split.");const p=(a||"").trim();if(!p)throw new Error(`Please enter the page numbers or ranges to extract (Document has ${s} page${s===1?"":"s"}).`);let c=[];if(p.toLowerCase()==="all")for(let i=0;i<s;i++)c.push(i);else{const i=p.split(",");for(let x of i){const g=x.trim();if(g)if(g.includes("-")){const h=g.split("-");if(h.length!==2)throw new Error(`Invalid range format: "${g}". Expected format like 1-3.`);const u=h[0].trim(),C=h[1].trim();if(!/^\d+$/.test(u)||!/^\d+$/.test(C))throw new Error(`Invalid numbers in range: "${g}". Please use positive numbers only.`);const E=parseInt(u,10),v=parseInt(C,10);if(E<1||v<1)throw new Error(`Page numbers must be 1 or greater (got range "${g}").`);if(E>s&&v>s)throw new Error(`Requested range ${E}-${v} is out of range. Document contains only ${s} page${s===1?"":"s"}.`);if(E>s)throw new Error(`Page range start (${E}) exceeds total document pages (${s}).`);const b=Math.min(E,v),S=Math.min(s,Math.max(E,v));for(let $=Math.max(1,b);$<=S;$++)c.push($-1)}else{if(!/^\d+$/.test(g))throw new Error(`Invalid page specification: "${g}". Please enter numeric page numbers (e.g. 1, 2-3).`);const h=parseInt(g,10);if(h<1)throw new Error(`Page numbers must be 1 or greater (got ${h}).`);if(h>s)throw new Error(`Page ${h} is out of range. This document only contains ${s} page${s===1?"":"s"}.`);c.push(h-1)}}}if(c=Array.from(new Set(c)).filter(i=>i>=0&&i<s),c.length===0)throw new Error(`No valid pages found in range "${a}". Document contains ${s} page${s===1?"":"s"} (valid range: 1-${s}).`);t&&t(30);const l=await L.create(),n=await l.copyPages(o,c);n.forEach((i,x)=>{l.addPage(i),t&&t(30+Math.round((x+1)/n.length*60))});const f=await l.save();return new Blob([f],{type:"application/pdf"})}async function yt(e,a="recommended",t){const r=e.size,o=await e.arrayBuffer();t&&t(10);let s=null,p=r;try{s=await(await L.load(o,{ignoreEncryption:!0})).save({useObjectStreams:!0}),p=s.byteLength}catch(u){console.warn("[compressPdf] Vector optimization bypass:",u)}t&&t(25);let c=1.2,l=.65;a==="extreme"?(c=.85,l=.45):a==="low"&&(c=1.4,l=.8);let n=null,f=1/0;if(typeof document<"u")try{const C=await G.getDocument({data:o}).promise,E=C.numPages,v=await L.create();for(let S=1;S<=E;S++){const $=await C.getPage(S),m=$.getViewport({scale:c}),d=document.createElement("canvas"),w=d.getContext("2d");d.width=m.width,d.height=m.height,w&&(w.imageSmoothingEnabled=!0,w.imageSmoothingQuality="high"),await $.render({canvasContext:w,viewport:m}).promise;const y=d.toDataURL("image/jpeg",l),B=await fetch(y).then(N=>N.arrayBuffer()),F=await v.embedJpg(B);v.addPage([m.width,m.height]).drawImage(F,{x:0,y:0,width:m.width,height:m.height}),t&&t(25+Math.round(S/E*65))}const b=await v.save({useObjectStreams:!0});n=new Blob([b],{type:"application/pdf"}),f=n.size}catch(u){console.warn("[compressPdf] Downsampling skipped:",u)}t&&t(95);let i,x,g=!1;n&&f<r&&f<p*.95?(i=n,x=f):s&&p<r?(i=new Blob([s],{type:"application/pdf"}),x=p):(i=new Blob([o],{type:"application/pdf"}),x=r,g=!0),t&&t(100);const h=Math.round((r-x)/r*100);return{blob:i,originalSize:r,compressedSize:x,reductionPercent:h>0?h:0,alreadyOptimized:g}}async function xt(e,a=90,t){const r=await e.arrayBuffer(),o=await L.load(r);o.getPages().forEach(c=>{const l=c.getRotation().angle;c.setRotation(z((l+a)%360))}),t&&t(90);const p=await o.save();return new Blob([p],{type:"application/pdf"})}async function bt(e,a){const t=Array.isArray(e)?e:[e],r=t.length;if(r===0)throw new Error("Please select at least one image file.");for(let p=0;p<r;p++){const c=t[p];if((c.name?c.name.toLowerCase():"").endsWith(".pdf")||c.type==="application/pdf")throw new Error(`'${c.name||"Selected document"}' is a PDF file. Images to PDF accepts only image files (JPG, PNG, WebP), not PDF documents.`)}const o=await L.create();for(let p=0;p<r;p++){const c=t[p],l=await c.arrayBuffer();let n;try{const f=c.type==="image/png"||c.name&&c.name.toLowerCase().endsWith(".png"),i=c.type==="image/jpeg"||c.type==="image/jpg"||c.name&&(c.name.toLowerCase().endsWith(".jpg")||c.name.toLowerCase().endsWith(".jpeg"));if(f)n=await o.embedPng(l);else if(i)try{n=await o.embedJpg(l)}catch(g){if(typeof document<"u"){const h=URL.createObjectURL(c),u=new Image;await new Promise((S,$)=>{u.onload=S,u.onerror=$,u.src=h});const C=document.createElement("canvas");C.width=u.width,C.height=u.height,C.getContext("2d").drawImage(u,0,0);const v=C.toDataURL("image/jpeg",.95),b=await fetch(v).then(S=>S.arrayBuffer());n=await o.embedJpg(b),URL.revokeObjectURL(h)}else throw g}else if(typeof document<"u"){const g=URL.createObjectURL(c),h=new Image;await new Promise((b,S)=>{h.onload=b,h.onerror=S,h.src=g});const u=document.createElement("canvas");u.width=h.width,u.height=h.height,u.getContext("2d").drawImage(h,0,0);const E=u.toDataURL("image/jpeg",.95),v=await fetch(E).then(b=>b.arrayBuffer());n=await o.embedJpg(v),URL.revokeObjectURL(g)}o.addPage([n.width,n.height]).drawImage(n,{x:0,y:0,width:n.width,height:n.height})}catch(f){console.warn(`[imagesToPdf] Error processing image index ${p}:`,f)}a&&a(Math.round((p+1)/r*90))}const s=await o.save();return new Blob([s],{type:"application/pdf"})}async function Pt(e,a,t){if(!a||!a.trim())throw new Error("Please enter a password to protect your PDF file.");t&&t(20);try{const f=new FormData;f.append("file",e),f.append("password",a);const i=await fetch("/api/v1/security/protect-pdf",{method:"POST",body:f});if(i.ok){const x=await i.json();if(x&&x.success&&x.download_url){const g=await fetch(x.download_url);if(g.ok){const h=await g.blob();if(h&&h.size>0)return t&&t(100),h}}}}catch{console.log("[protectPdf] Python security API offline, executing QPDF WASM client fallback engine.")}t&&t(40);const r=await e.arrayBuffer(),o=new Uint8Array(r);t&&t(60);const{default:s}=await Z(async()=>{const{default:f}=await import("./vendor-qpdf-DAJo1tni.js").then(i=>i.q);return{default:f}},__vite__mapDeps([0,1,2,3]));let p="/qpdf.wasm";try{p=(await Z(()=>import("./vendor-qpdf-DAJo1tni.js").then(i=>i.a),__vite__mapDeps([0,1,2,3]))).default||p}catch{}const c=await s({locateFile:f=>f.endsWith(".wasm")?p||"/qpdf.wasm":f});t&&t(80),c.FS.writeFile("/input.pdf",o),c.callMain(["/input.pdf","--encrypt",a,a,"256","--","/output.pdf"]);const l=c.FS.readFile("/output.pdf"),n=new Uint8Array(l.length);return n.set(l),t&&t(100),new Blob([n],{type:"application/pdf"})}function V(e,a){if(!e||!e.trim())return[];const t=e.split(","),r=new Set;for(let o of t)if(o=o.trim(),o.includes("-")){const[s,p]=o.split("-"),c=parseInt(s.trim(),10),l=parseInt(p.trim(),10);if(!isNaN(c)&&!isNaN(l))for(let n=Math.max(1,Math.min(c,l));n<=Math.min(a,Math.max(c,l));n++)r.add(n)}else{const s=parseInt(o,10);!isNaN(s)&&s>=1&&s<=a&&r.add(s)}return Array.from(r).sort((o,s)=>o-s)}function vt(e){if(!e||e.length===0)return"";const a=Array.from(new Set(e)).sort((s,p)=>s-p),t=[];let r=a[0],o=a[0];for(let s=1;s<a.length;s++)a[s]===o+1||(t.push(r===o?`${r}`:`${r}-${o}`),r=a[s]),o=a[s];return t.push(r===o?`${r}`:`${r}-${o}`),t.join(", ")}async function St(e,a,t){const r=await e.arrayBuffer(),o=await L.load(r),s=o.getPageCount(),p=new Set(a.map(i=>i-1)),c=[];for(let i=0;i<s;i++)p.has(i)||c.push(i);if(c.length===0)throw new Error("Cannot remove all pages from PDF. At least one page must remain in the document.");t&&t(30);const l=await L.create();(await l.copyPages(o,c)).forEach((i,x)=>{l.addPage(i),t&&t(30+Math.round((x+1)/c.length*60))});const f=await l.save();return t&&t(100),new Blob([f],{type:"application/pdf"})}async function Ct(e,a="processed"){if(Array.isArray(e)&&e.length>0){const o=e.find(s=>{var p;return s&&(s.type==="application/pdf"||((p=s.name)==null?void 0:p.endsWith(".pdf")))})||e[0];if(o&&typeof o.arrayBuffer=="function"){const s=await o.arrayBuffer();return new Blob([s],{type:"application/pdf"})}}else if(e&&typeof e.arrayBuffer=="function"){const r=await e.arrayBuffer();return new Blob([r],{type:"application/pdf"})}const t=`%PDF-1.4
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
%%EOF`;return new Blob([t],{type:"application/pdf"})}async function Q(e,a){let t;e instanceof ArrayBuffer?t=e:e&&typeof e.arrayBuffer=="function"?t=await e.arrayBuffer():e&&e.buffer?t=e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength):t=e;const o=await G.getDocument({data:t}).promise,s=o.numPages,p=[];let c=0;for(let l=1;l<=s;l++){const n=await o.getPage(l),f=n.getViewport({scale:1}),i=f?f.width:595.28,x=f?f.height:841.89,g=await n.getTextContent(),h=[];g.items.forEach(m=>{const d=(m.str||"").trim();if(!d)return;const w=m.transform?m.transform[4]:0,y=m.transform?m.transform[5]:0,B=m.width||0,F=Math.abs(m.transform?m.transform[0]:12)||m.height||12,T=m.fontName||"",N=T.toLowerCase().includes("bold")||T.toLowerCase().includes("heavy")||T.toLowerCase().includes("black");h.push({text:d,x:w,y,width:B,height:F,isBold:N,fontSize:Math.round(F)}),c++}),h.sort((m,d)=>d.y-m.y||m.x-d.x);const u=[];h.forEach(m=>{let d=u.find(w=>Math.abs(w.y-m.y)<=3.5);d||(d={y:m.y,items:[]},u.push(d)),d.items.push(m)}),u.forEach(m=>m.items.sort((d,w)=>d.x-w.x));const C=u.map(m=>{const d=[];let w=null;return m.items.forEach(y=>{w?y.x-(w.x+w.width)<=8?(w.text+=" "+y.text,w.width=y.x+y.width-w.x,y.isBold&&(w.isBold=!0)):(d.push(w),w={text:y.text,x:y.x,width:y.width,height:y.height,isBold:y.isBold,fontSize:y.fontSize}):w={text:y.text,x:y.x,width:y.width,height:y.height,isBold:y.isBold,fontSize:y.fontSize}}),w&&d.push(w),{y:m.y,cells:d}}),E=C.map(m=>{if(m.cells.length===2){const d=m.cells[1],w=(d.text||"").trim();if(d.x>i*.6&&(/^\(?[0-9]{1,3}\)?$/i.test(w)||/^\(?[0-9]{1,3}\s*(marks?|pts?|points?)?\)?$/i.test(w)||/^_{4,}$/.test(w)))return{y:m.y,cells:[{text:`${m.cells[0].text}   ${w}`,x:m.cells[0].x,width:d.x+d.width-m.cells[0].x,height:m.cells[0].height,isBold:m.cells[0].isBold,fontSize:m.cells[0].fontSize}]}}return m}),v=[];let b=null;for(let m=0;m<E.length;m++){const d=E[m];if(d.cells.length>=2&&d.cells.length<=6)if(!b)b={lines:[d],indices:[m]};else{const w=b.lines[b.lines.length-1],y=Math.abs(w.y-d.y);let B=0;d.cells.forEach(T=>{w.cells.some(N=>Math.abs(N.x-T.x)<=22)&&B++});const F=B>=Math.min(d.cells.length,w.cells.length)-1;y<=55&&F?(b.lines.push(d),b.indices.push(m)):(b.lines.length>=2&&v.push(b),b={lines:[d],indices:[m]})}else b&&b.lines.length>=2&&v.push(b),b=null}b&&b.lines.length>=2&&v.push(b);const S=new Map;v.forEach((m,d)=>{const w=[];m.lines.forEach(T=>{T.cells.forEach(N=>{w.some(D=>Math.abs(D-N.x)<=18)||w.push(N.x)})}),w.sort((T,N)=>T-N);const y=Math.max(2,w.length),B=Math.round(9e3/y),F=new Array(y).fill(B);m.indices.forEach(T=>{S.set(T,{tableId:d,anchors:w,colWidths:F,colCount:y})})});const $=[];E.forEach((m,d)=>{var y;const w=S.get(d);if(w){const B=new Array(w.colCount).fill("");m.cells.forEach(T=>{let N=0,D=1/0;w.anchors.forEach((I,M)=>{const P=Math.abs(I-T.x);P<D&&(D=P,N=M)}),B[N]=T.text});const F=m.cells.some(T=>T.isBold);$.push({type:"table_row",y:m.y,isHeader:F,rowCells:B,colWidths:w.colWidths})}else{const B=m.cells.map(D=>D.text).join(" "),F=((y=m.cells[0])==null?void 0:y.fontSize)||12,T=m.cells.some(D=>D.isBold),N=F>=14||T;$.push({type:N?"heading":"paragraph",y:m.y,text:B,fontSize:F,isBold:T,rowCells:[B]})}}),p.push({pageNum:l,pageWidth:i,pageHeight:x,hasText:h.length>0,totalTextItems:h.length,hasTable:v.length>0,colCount:v.length>0?v[0].lines[0].cells.length:1,gridRows:$,lineCount:C.length}),a&&a(Math.round(l/s*70))}return{numPages:s,totalTextItems:c,isScannedOnly:c===0,pages:p}}function q(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}async function lt(e,a="Document"){const t=new J,r=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,o=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;let s="";e.isScannedOnly?s=`
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
    `:e.pages.forEach((c,l)=>{l>0&&(s+='<w:p><w:r><w:br w:type="page"/></w:r></w:p>');let n=!1,f="",i=null;const x=()=>{if(n&&f){const h=(i||[4500,4500]).map(u=>`<w:gridCol w:w="${Math.round(u)}"/>`).join("");s+=`
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
              <w:tblGrid>
                ${h}
              </w:tblGrid>
              ${f}
            </w:tbl>
            <w:p><w:pPr><w:spacing w:after="120"/></w:pPr></w:p>
          `,f="",n=!1,i=null}};c.gridRows.forEach(g=>{if(g.type==="table_row"){n=!0,g.colWidths&&!i&&(i=g.colWidths);const h=g.isHeader,u=g.colWidths||i||[],C=g.rowCells.map((E,v)=>{const b=q(E),S=h?'<w:shd w:val="clear" w:color="auto" w:fill="F1F5F9"/>':"",$=h?"<w:b/>":"",m=h?"1E293B":"334155";return`
              <w:tc>
                <w:tcPr>
                  ${u[v]?`<w:tcW w:w="${Math.round(u[v])}" w:type="dxa"/>`:""}
                  ${S}
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
                      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Nirmala UI"/>
                      <w:lang w:bidi="ta-IN"/>
                      ${$}
                      <w:sz w:val="20"/>
                      <w:color w:val="${m}"/>
                    </w:rPr>
                    <w:t xml:space="preserve">${b}</w:t>
                  </w:r>
                </w:p>
              </w:tc>
            `}).join("");f+=`<w:tr>${C}</w:tr>`}else if(x(),g.type==="heading"){const h=Math.min(36,Math.max(26,(g.fontSize||16)*2));s+=`
              <w:p>
                <w:pPr>
                  <w:spacing w:before="240" w:after="140"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Nirmala UI"/>
                    <w:lang w:bidi="ta-IN"/>
                    <w:b/>
                    <w:sz w:val="${h}"/>
                    <w:color w:val="0F172A"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${q(g.text)}</w:t>
                </w:r>
              </w:p>
            `}else s+=`
              <w:p>
                <w:pPr>
                  <w:spacing w:before="60" w:after="120" w:line="276" w:lineRule="auto"/>
                </w:pPr>
                <w:r>
                  <w:rPr>
                    <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Nirmala UI"/>
                    <w:lang w:bidi="ta-IN"/>
                    <w:sz w:val="22"/>
                    <w:color w:val="334155"/>
                  </w:rPr>
                  <w:t xml:space="preserve">${q(g.text)}</w:t>
                </w:r>
              </w:p>
            `}),x()});const p=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${s}
    <w:sectPr>
      <w:pgSz w:w="12240" w:h="15840"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/>
    </w:sectPr>
  </w:body>
</w:document>`;return t.file("[Content_Types].xml",r),t.folder("_rels").file(".rels",o),t.folder("word").file("document.xml",p),await t.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}async function Ft(e,a){var o;const t=await Q(e,s=>{a&&a(Math.round(s*.7))}),r=await lt(t,(e==null?void 0:e.name)||"Document");return a&&a(100),{blob:r,filename:`${((o=e==null?void 0:e.name)==null?void 0:o.replace(/\.[^/.]+$/,""))||"document"}_converted.docx`,isScanned:t.isScannedOnly,isScannedOnly:t.isScannedOnly,pageCount:t.numPages,tableDetected:t.pages.some(s=>s.hasTable)}}async function et(e=[],a=[],t="Presentation",r="editable"){const o=new J,s=d=>String(d||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),p=e&&typeof e=="object"&&Array.isArray(e.pages),c=p?e.pages.length:Math.max(1,Math.max((e||[]).length,(a||[]).length)),l=[],n=[],f=[];let i=12192e3,x=6858e3;if(p&&e.pages&&e.pages[0]){const d=e.pages[0],w=typeof d.pageWidth=="number"&&!isNaN(d.pageWidth)&&d.pageWidth>0?d.pageWidth:595.28,y=typeof d.pageHeight=="number"&&!isNaN(d.pageHeight)&&d.pageHeight>0?d.pageHeight:841.89;i=Math.round(w*12700),x=Math.round(y*12700)}else if(a&&a.length>0&&a[0]){const d=a.find(y=>y&&(y.dataUrl||y.url)),w=d?d.height>d.width:!0;i=w?792e4:12192e3,x=w?10252800:6858e3}(!i||isNaN(i)||i<=0)&&(i=12192e3),(!x||isNaN(x)||x<=0)&&(x=6858e3);const g=`
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
      </p:grpSpPr>`;for(let d=1;d<=c;d++){l.push(`<Override PartName="/ppt/slides/slide${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),n.push(`<Relationship Id="rId${d+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${d}.xml"/>`),f.push(`<p:sldId id="${255+d}" r:id="rId${d+1}"/>`);let w="",y="",B=2;const F=a&&a[d-1];if((r==="visual"||!p)&&F&&F.dataUrl){const I=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",M=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${d}.${I}`,M,{base64:!0}),w=`<Relationship Id="rIdImg${d}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${d}.${I}"/>`,y=`
      <p:pic>
        <p:nvPicPr>
          <p:cNvPr id="${B++}" name="Slide Image ${d}"/>
          <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
          <p:nvPr/>
        </p:nvPicPr>
        <p:blipFill>
          <a:blip r:embed="rIdImg${d}"/>
          <a:stretch><a:fillRect/></a:stretch>
        </p:blipFill>
        <p:spPr>
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${i}" cy="${x}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`}else if(p){const D=e.pages[d-1];if(!D||!D.hasText)if(F&&F.dataUrl){const M=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",P=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${d}.${M}`,P,{base64:!0}),w=`<Relationship Id="rIdImg${d}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${d}.${M}"/>`,y=`
          <p:pic>
            <p:nvPicPr>
              <p:cNvPr id="${B++}" name="Scanned Slide Image ${d}"/>
              <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip r:embed="rIdImg${d}"/>
              <a:stretch><a:fillRect/></a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${i}" cy="${x}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </p:spPr>
          </p:pic>`}else y=`
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="${B++}" name="Scanned Notice"/>
              <p:cNvSpPr txBox="1"/>
              <p:nvPr/>
            </p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="635000" y="635000"/><a:ext cx="${i-127e4}" cy="1270000"/></a:xfrm>
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
        `;else if(D.hasTable){const I=D.gridRows.filter(R=>R.type==="heading"),M=D.gridRows.filter(R=>R.type==="table_row"),P=D.gridRows.filter(R=>R.type==="paragraph");if(I.length>0){const R=I.map(j=>j.text).join(" ");y+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Slide Title ${d}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="500000"/><a:ext cx="${i-127e4}" cy="800000"/></a:xfrm>
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
                    <a:t>${s(R)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}if(M.length>0){const R=D.colCount,j=i-127e4,W=Math.round(j/R),O=4e5,Y=I.length>0?15e5:8e5,H=M.map((A,K)=>{const k=A.isHeader,U=A.rowCells.map(_=>`
              <a:tc>
                <a:txBody>
                  <a:bodyPr lIns="91440" tIns="91440" rIns="91440" bIns="91440"/>
                  <a:lstStyle/>
                  <a:p>
                    <a:pPr algn="${k?"ctr":"l"}"/>
                    <a:r>
                      <a:rPr lang="en-US" sz="1300" b="${k?"1":"0"}">
                        <a:solidFill><a:srgbClr val="${k?"1E293B":"334155"}"/></a:solidFill>
                        <a:latin typeface="Calibri"/>
                      </a:rPr>
                      <a:t>${s(_)}</a:t>
                    </a:r>
                  </a:p>
                </a:txBody>
                <a:tcPr>
                  ${k?'<a:solidFill><a:srgbClr val="F1F5F9"/></a:solidFill>':""}
                  <a:lnL w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>
                  <a:lnR w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>
                  <a:lnT w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>
                  <a:lnB w="12700"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>
                </a:tcPr>
              </a:tc>
            `).join("");return`<a:tr h="${O}">${U}</a:tr>`}).join("");y+=`
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${B++}" name="Table ${d}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${Y}"/>
                <a:ext cx="${j}" cy="${O*M.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(R).fill(`<a:gridCol w="${W}"/>`).join("")}
                    </a:tblGrid>
                    ${H}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `}if(P.length>0){const R=P.map(W=>W.text).join(" "),j=15e5+4e5*M.length+25e4;y+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Notes ${d}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${j}"/><a:ext cx="${i-127e4}" cy="500000"/></a:xfrm>
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
                    <a:t>${s(R)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}}else{const I=[];let M=null;D.gridRows.forEach(P=>{if(!M)M={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]};else{const R=M.type===P.type,j=Math.abs(M.bottomY-P.y);R&&j<=(P.fontSize||12)*2.8?(M.lines.push(P),M.bottomY=P.y):(I.push(M),M={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]})}}),M&&I.push(M),I.forEach((P,R)=>{const j=P.type==="heading",W=Math.round(Math.min(48,Math.max(10,P.fontSize||12))*100),O=j?"0F172A":"334155",Y=P.isBold||j,H=typeof D.pageHeight=="number"&&!isNaN(D.pageHeight)&&D.pageHeight>0?D.pageHeight:841.89,A=typeof P.topY=="number"&&!isNaN(P.topY)?P.topY:H-(R*50+60),K=typeof P.bottomY=="number"&&!isNaN(P.bottomY)?P.bottomY:A;let k=Math.max(0,Math.round((H-A-(P.fontSize||12))*12700)),U=Math.max(45e4,Math.round((A-K+(P.fontSize||12)+12)*12700)),_=i-127e4;(isNaN(k)||k<0)&&(k=Math.round((R*50+50)*12700)),(isNaN(U)||U<=0)&&(U=5e5),(isNaN(_)||_<=0)&&(_=65e5);const ot=P.lines.map(st=>`
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${W}" b="${Y?"1":"0"}">
                  <a:solidFill><a:srgbClr val="${O}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${s(st.text)}</a:t>
              </a:r>
            </a:p>
          `).join("");y+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="TextBlock ${R+1}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${k}"/><a:ext cx="${_}" cy="${U}"/></a:xfrm>
                <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
                <a:noFill/>
              </p:spPr>
              <p:txBody>
                <a:bodyPr wrap="square" rtlCol="0"><a:spAutoFit/></a:bodyPr>
                <a:lstStyle/>
                ${ot}
              </p:txBody>
            </p:sp>
          `})}}else{const D=(Array.isArray(e)?e[d-1]:"")||"";if(D.trim()){const M=D.split(`
`).filter(P=>P.trim()).slice(0,15).map(P=>`<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${s(P)}</a:t></a:r></a:p>`).join("");y=`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${B++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${i-914400}" cy="${x-914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${M}
          </p:txBody>
        </p:sp>`}}const T=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${g}
      ${y}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,N=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${w}
</Relationships>`;o.folder("ppt/slides").file(`slide${d}.xml`,T),o.folder("ppt/slides/_rels").file(`slide${d}.xml.rels`,N)}const h=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Types>`,u=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`,C=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
    ${f.join(`
    `)}
  </p:sldIdLst>
  <p:sldSz cx="${i}" cy="${x}"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`,E=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${n.join(`
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
</a:theme>`,b=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
</Relationships>`,$=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>${g}</p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;return o.file("[Content_Types].xml",h),o.file("_rels/.rels",u),o.file("ppt/presentation.xml",C),o.file("ppt/_rels/presentation.xml.rels",E),o.file("ppt/theme/theme1.xml",v),o.file("ppt/slideMasters/slideMaster1.xml",b),o.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",S),o.file("ppt/slideLayouts/slideLayout1.xml",$),o.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels",m),await o.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})}async function Bt(e,a="editable",t){if(!e||e.size===0)throw new Error("Please select a valid, non-empty PDF document.");let r;try{r=await e.arrayBuffer()}catch(h){throw new Error("Failed to read file data: "+h.message)}const o=new Uint8Array(r.slice(0,5));if(!String.fromCharCode(...o).startsWith("%PDF-"))throw new Error("Invalid file format. The uploaded file is not a valid PDF document.");let p,c;try{p=G.getDocument({data:r}),c=await p.promise}catch(h){throw h&&h.name==="PasswordException"?new Error("This PDF is password-protected. Please unlock or remove password protection first."):new Error("Unable to open PDF document: "+(h.message||"File may be corrupted."))}if(c.numPages===0)throw new Error("This PDF document contains no pages.");if(t&&t(20),a==="visual"){const h=await tt(e,C=>{t&&t(20+Math.round(C*.6))}),u=await et(null,h,(e==null?void 0:e.name)||"Presentation","visual");return t&&t(100),{blob:u,mode:"visual",isScannedOnly:!1,hasScannedSlides:!0,pageCount:h.length,tableDetected:!1}}const n=await Q(e,h=>{t&&t(20+Math.round(h*.5))});let f=null,i=n.isScannedOnly;const x=n.pages.some(h=>!h.hasText);if(n.isScannedOnly||x)try{f=await tt(e,h=>{t&&t(70+Math.round(h*.2))}),i=!0}catch(h){console.warn("[pdfToPptx] Visual rendering fallback notice:",h)}t&&t(85);const g=await et(n,f,(e==null?void 0:e.name)||"Presentation",n.isScannedOnly?"visual":"editable");return t&&t(100),{blob:g,mode:n.isScannedOnly?"visual":"editable",isScannedOnly:n.isScannedOnly,hasScannedSlides:i,pageCount:n.numPages,tableDetected:n.pages.some(h=>h.hasTable)}}function ct(e,a="Spreadsheet"){const t=X.book_new();if(e.isScannedOnly){const r=X.aoa_to_sheet([["Notice: Scanned / Image-Only Document"],["This PDF contains scanned images without an extractable text layer."],["Optical Character Recognition (OCR) is required to convert image text into spreadsheet data."]]);return X.book_append_sheet(t,r,"Notice"),t}return e.pages.forEach((r,o)=>{const s=[],p=r.colCount,c=new Array(p).fill(10);r.gridRows.forEach(f=>{const i=f.rowCells;s.push(i),i.forEach((x,g)=>{const h=String(x||"").length;h>(c[g]||10)&&(c[g]=Math.min(h+3,50))})});const l=X.aoa_to_sheet(s);l["!cols"]=c.map(f=>({wch:f}));const n=e.numPages===1?"Sheet1":`Page ${o+1}`;X.book_append_sheet(t,l,n)}),t}async function Tt(e,a){const t=await Q(e,p=>{a&&a(Math.round(p*.7))}),r=ct(t,(e==null?void 0:e.name)||"Spreadsheet"),o=it(r,{bookType:"xlsx",type:"array"}),s=new Blob([o],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return a&&a(100),{blob:s,isScannedOnly:t.isScannedOnly,pageCount:t.numPages,tableDetected:t.pages.some(p=>p.hasTable)}}function $t(e){return new Blob([e],{type:"text/plain;charset=utf-8"})}async function Dt(e,a="images"){const t=new J,r=t.folder(a);return e.forEach((o,s)=>{const p=o.dataUrl.replace(/^data:image\/(png|jpeg);base64,/,""),c=o.dataUrl.startsWith("data:image/png")?"png":"jpg";r.file(`page_${s+1}.${c}`,p,{base64:!0})}),await t.generateAsync({type:"blob"})}function nt(e="#000000"){let a=e.replace("#","").trim();a.length===3&&(a=a.split("").map(s=>s+s).join(""));const t=parseInt(a.substring(0,2),16)/255,r=parseInt(a.substring(2,4),16)/255,o=parseInt(a.substring(4,6),16)/255;return rt(isNaN(t)?0:t,isNaN(r)?0:r,isNaN(o)?0:o)}function pt(e,a,t,r="bottom-right",o=36){const s=e.getRotation().angle||0,p=e.getWidth(),c=e.getHeight(),l=o;let n=0,f=0,i=0;return s===0?(i=0,r==="bottom-left"?(n=l,f=l):r==="bottom-center"?(n=(p-a)/2,f=l):r==="bottom-right"?(n=p-l-a,f=l):r==="top-left"?(n=l,f=c-l-t):r==="top-center"?(n=(p-a)/2,f=c-l-t):r==="top-right"&&(n=p-l-a,f=c-l-t)):s===90?(i=90,r==="bottom-right"?(n=p-l,f=l):r==="bottom-center"?(n=p-l,f=(c-a)/2):r==="bottom-left"?(n=p-l,f=c-l-a):r==="top-right"?(n=l+t,f=l):r==="top-center"?(n=l+t,f=(c-a)/2):r==="top-left"&&(n=l+t,f=c-l-a)):s===180?(i=180,r==="bottom-right"?(n=l+a,f=c-l):r==="bottom-center"?(n=(p+a)/2,f=c-l):r==="bottom-left"?(n=p-l,f=c-l):r==="top-right"?(n=l+a,f=l+t):r==="top-center"?(n=(p+a)/2,f=l+t):r==="top-left"&&(n=p-l,f=l+t)):s===270&&(i=270,r==="bottom-right"?(n=l,f=c-l):r==="bottom-center"?(n=l,f=(c+a)/2):r==="bottom-left"?(n=l,f=l+a):r==="top-right"?(n=p-l-t,f=c-l):r==="top-center"?(n=p-l-t,f=(c+a)/2):r==="top-left"&&(n=p-l-t,f=l+a)),{x:n,y:f,rotAngle:i}}async function Et(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{startNumber:r=1,format:o="Page {n}",position:s="bottom-right",fontSize:p=11,fontColor:c="#334155",marginPt:l=36,pageRange:n="all"}=a,f=await e.arrayBuffer(),i=await L.load(f,{ignoreEncryption:!0}),x=await i.embedFont(at.Helvetica),g=nt(c),h=i.getPageCount();if(h===0)throw new Error("This PDF document contains no pages.");const u=n&&n!=="all"?V(n,h):Array.from({length:h},(b,S)=>S+1);if(u.length===0)throw new Error("No valid pages found in the specified page range.");t&&t(20);const C=new Set(u);let E=0;for(let b=0;b<h;b++){const S=b+1;if(C.has(S)){const $=i.getPage(b),m=r+E,d=o.replace(/\{n\}/g,String(m)).replace(/\{total\}/g,String(h)),w=x.widthOfTextAtSize(d,p),y=p,{x:B,y:F,rotAngle:T}=pt($,w,y,s,l);$.drawText(d,{x:B,y:F,size:p,font:x,color:g,rotate:z(T)}),E++}t&&t(20+Math.round((b+1)/h*70))}const v=await i.save();return t&&t(100),new Blob([v],{type:"application/pdf"})}async function Mt(e,a={},t){var v;if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{watermarkType:r="text",text:o="CONFIDENTIAL",opacity:s=.35,rotation:p=45,fontSize:c=48,color:l="#EF4444",position:n="center",pageRange:f="all",imageFile:i=null}=a,x=await e.arrayBuffer(),g=await L.load(x,{ignoreEncryption:!0}),h=g.getPageCount();if(h===0)throw new Error("This PDF document contains no pages.");const u=f&&f!=="all"?V(f,h):Array.from({length:h},(b,S)=>S+1);if(u.length===0)throw new Error("No valid pages found in the specified page range.");t&&t(20);const C=new Set(u);if(r==="image"&&i){let b;const S=await i.arrayBuffer();i.type==="image/png"||((v=i.name)==null?void 0:v.toLowerCase().endsWith(".png"))?b=await g.embedPng(S):b=await g.embedJpg(S);const m=b.scale(a.scale||.5);for(let d=0;d<h;d++){if(C.has(d+1)){const w=g.getPage(d),{width:y,height:B}=w.getSize();let F=(y-m.width)/2,T=(B-m.height)/2;n==="top-left"?(F=36,T=B-m.height-36):n==="top-right"?(F=y-m.width-36,T=B-m.height-36):n==="bottom-left"?(F=36,T=36):n==="bottom-right"&&(F=y-m.width-36,T=36),w.drawImage(b,{x:F,y:T,width:m.width,height:m.height,opacity:Math.max(.05,Math.min(1,s))})}t&&t(20+Math.round((d+1)/h*70))}}else{const b=await g.embedFont(at.HelveticaBold),S=String(o||"CONFIDENTIAL").trim();if(!S)throw new Error("Watermark text cannot be empty.");const $=nt(l),m=b.widthOfTextAtSize(S,c),d=c,w=p*Math.PI/180;for(let y=0;y<h;y++){if(C.has(y+1)){const B=g.getPage(y),{width:F,height:T}=B.getSize(),N=B.getRotation().angle||0;let D=0,I=0;n==="center"||n==="diagonal"?(D=F/2-m/2*Math.cos(w)+d/4*Math.sin(w),I=T/2-m/2*Math.sin(w)-d/4*Math.cos(w)):n==="top-left"?(D=36,I=T-72):n==="top-right"?(D=F-m-36,I=T-72):n==="bottom-left"?(D=36,I=36):n==="bottom-right"&&(D=F-m-36,I=36),B.drawText(S,{x:D,y:I,size:c,font:b,color:$,opacity:Math.max(.05,Math.min(1,s)),rotate:z(p+N)})}t&&t(20+Math.round((y+1)/h*70))}}const E=await g.save();return t&&t(100),new Blob([E],{type:"application/pdf"})}async function It(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{cropMargins:r={top:36,bottom:36,left:36,right:36},pageRange:o="all"}=a,s=Number(r.top)||0,p=Number(r.bottom)||0,c=Number(r.left)||0,l=Number(r.right)||0;if(s<0||p<0||c<0||l<0)throw new Error("Crop margins must be non-negative values.");const n=await e.arrayBuffer(),f=await L.load(n,{ignoreEncryption:!0}),i=f.getPageCount();if(i===0)throw new Error("This PDF document contains no pages.");const x=o&&o!=="all"?V(o,i):Array.from({length:i},(u,C)=>C+1);if(x.length===0)throw new Error("No valid pages found in the specified page range.");const g=new Set(x);for(let u=0;u<i;u++){if(g.has(u+1)){const C=f.getPage(u),E=C.getMediaBox(),v=C.getCropBox()||E,b=v.x+c,S=v.y+p,$=v.width-c-l,m=v.height-s-p;if($<=20||m<=20)throw new Error(`Crop margins too large on page ${u+1}. Remaining width (${Math.round($)}pt) or height (${Math.round(m)}pt) must be at least 20pt.`);C.setCropBox(b,S,$,m)}t&&t(20+Math.round((u+1)/i*70))}const h=await f.save();return t&&t(100),new Blob([h],{type:"application/pdf"})}async function Nt(e){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const a=await e.arrayBuffer(),t=await L.load(a,{ignoreEncryption:!0}),r=t.getKeywords();let o="";return Array.isArray(r)?o=r.join(", "):typeof r=="string"&&(o=r),{title:t.getTitle()||"",author:t.getAuthor()||"",subject:t.getSubject()||"",keywords:o,producer:t.getProducer()||"",creator:t.getCreator()||"",creationDate:t.getCreationDate()?t.getCreationDate().toISOString():"",modificationDate:t.getModificationDate()?t.getModificationDate().toISOString():"",pageCount:t.getPageCount()}}async function Rt(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const r=await e.arrayBuffer(),o=await L.load(r,{ignoreEncryption:!0});if(t&&t(30),a.title!==void 0&&o.setTitle(a.title||""),a.author!==void 0&&o.setAuthor(a.author||""),a.subject!==void 0&&o.setSubject(a.subject||""),a.keywords!==void 0){const p=String(a.keywords||"").split(",").map(c=>c.trim()).filter(Boolean);o.setKeywords(p)}a.producer!==void 0&&o.setProducer(a.producer||"Simatrix PDF Tools"),a.creator!==void 0&&o.setCreator(a.creator||"Simatrix PDF Tools"),o.setModificationDate(new Date),t&&t(75);const s=await o.save();return t&&t(100),new Blob([s],{type:"application/pdf"})}async function Lt(e,a,t={},r){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");if(!Array.isArray(a)||a.length===0)throw new Error("Please provide at least one page in the reordered list.");const o=await e.arrayBuffer(),s=await L.load(o,{ignoreEncryption:!0}),p=s.getPageCount();for(const n of a)if(typeof n!="number"||n<1||n>p)throw new Error(`Invalid page index ${n}. Document contains pages 1 to ${p}.`);r&&r(20);const c=await L.create();for(let n=0;n<a.length;n++){const f=a[n],[i]=await c.copyPages(s,[f-1]),x=Number(t[f])||0;if(x!==0){const g=i.getRotation().angle||0;i.setRotation(z((g+x)%360))}c.addPage(i),r&&r(20+Math.round((n+1)/a.length*70))}const l=await c.save();return r&&r(100),new Blob([l],{type:"application/pdf"})}async function jt(e,a,t){t&&t(10);const r=await e.arrayBuffer(),o=await L.load(r,{ignoreEncryption:!0}),s=o.getPageCount();t&&t(30);const p=a.length;for(let l=0;l<p;l++){const n=a[l],f=(n.page||1)-1;if(f<0||f>=s)continue;const i=o.getPage(f),{width:x,height:g}=i.getSize(),h=i.getRotation().angle;let u=n.dataUrl||n.imageBase64||"";if(u.includes(",")&&(u=u.split(",")[1]),!u)continue;const C=atob(u),E=new Uint8Array(C.length);for(let d=0;d<C.length;d++)E[d]=C.charCodeAt(d);const v=await o.embedPng(E),b=Number(n.ptX)||0,S=Number(n.ptY)||0,$=Number(n.ptW)||120,m=Number(n.ptH)||50;h===0?i.drawImage(v,{x:b,y:g-S-m,width:$,height:m}):h===90?i.drawImage(v,{x:S,y:b,width:$,height:m,rotate:z(-90)}):h===180?i.drawImage(v,{x:x-b-$,y:S,width:$,height:m,rotate:z(180)}):h===270&&i.drawImage(v,{x:x-S-m,y:g-b-$,width:$,height:m,rotate:z(90)}),t&&t(30+Math.round((l+1)/p*50))}t&&t(85);const c=await o.save();return t&&t(100),new Blob([c],{type:"application/pdf"})}export{xt as a,tt as b,yt as c,Dt as d,Bt as e,Tt as f,gt as g,$t as h,bt as i,Ft as j,Et as k,It as l,wt as m,Rt as n,Ct as o,Pt as p,V as q,Nt as r,ut as s,vt as t,St as u,Lt as v,Mt as w,jt as x};
