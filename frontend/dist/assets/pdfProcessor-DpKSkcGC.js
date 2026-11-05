const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/vendor-qpdf-DtFlW-Ve.js","assets/vendor-react-BNItUSQi.js","assets/vendor-fontawesome-B1GTBOzm.js"])))=>i.map(i=>d[i]);
import{A as st,_ as V}from"./index-Syx0jyAD.js";import{PDFDocument as R,degrees as A,StandardFonts as Z,rgb as it}from"./vendor-pdflib-D5jgxTk3.js";import{p as H}from"./useFileUpload-BRZWDnd-.js";import{J as tt,w as rt,u as W}from"./vendor-office-BDIiI1Jl.js";async function ht(e,a){const t=await e.arrayBuffer(),o=await H.getDocument({data:t,isEvalSupported:!1}).promise,i=o.numPages,p=[];for(let r=1;r<=i;r++){const f=await(await o.getPage(r)).getTextContent();let c=null,x=[],y="";for(const w of f.items)if("str"in w){const C=w.transform?w.transform[5]:null;c!==null&&Math.abs(C-c)>5?(y.trim()&&x.push(y.trim()),y=w.str):y+=(y&&!y.endsWith(" ")?" ":"")+w.str,c=C}y.trim()&&x.push(y.trim());const h=x.join(`
`);p.push(h),a&&a(Math.round(r/i*75))}return{fullText:p.join(`

--- Page Break ---

`),pageTexts:p,numPages:i}}async function Q(e,a){const t=await e.arrayBuffer(),o=await H.getDocument({data:t,isEvalSupported:!1}).promise,i=o.numPages,p=[];for(let l=1;l<=i;l++){const r=await o.getPage(l),n=r.getViewport({scale:3.5}),f=document.createElement("canvas"),c=f.getContext("2d",{alpha:!0});f.width=n.width,f.height=n.height,c&&(c.imageSmoothingEnabled=!0,c.imageSmoothingQuality="high"),await r.render({canvasContext:c,viewport:n}).promise;const x=f.toDataURL("image/png",1);p.push({pageNumber:l,dataUrl:x,width:n.width,height:n.height}),a&&a(Math.round(l/i*85))}return p}async function gt(e,a){const t=Array.isArray(e)?e:e?[e]:[],s=t.length;if(s<2)throw new Error("Please select at least 2 PDF files to merge together.");const o=await R.create();for(let p=0;p<s;p++){const l=t[p];if(l&&typeof l.arrayBuffer=="function")try{const r=await l.arrayBuffer(),n=await R.load(r);(await o.copyPages(n,n.getPageIndices())).forEach(c=>o.addPage(c))}catch(r){console.warn(`[mergePdfs] Skipping invalid file index ${p}:`,r)}a&&a(Math.round((p+1)/s*90))}const i=await o.save();return new Blob([i],{type:"application/pdf"})}async function ut(e,a="1",t){const s=await e.arrayBuffer(),o=await R.load(s),i=o.getPageCount();if(i===0)throw new Error("This PDF document contains no pages to split.");const p=(a||"").trim();if(!p)throw new Error(`Please enter the page numbers or ranges to extract (Document has ${i} page${i===1?"":"s"}).`);let l=[];if(p.toLowerCase()==="all")for(let c=0;c<i;c++)l.push(c);else{const c=p.split(",");for(let x of c){const y=x.trim();if(y)if(y.includes("-")){const h=y.split("-");if(h.length!==2)throw new Error(`Invalid range format: "${y}". Expected format like 1-3.`);const w=h[0].trim(),C=h[1].trim();if(!/^\d+$/.test(w)||!/^\d+$/.test(C))throw new Error(`Invalid numbers in range: "${y}". Please use positive numbers only.`);const D=parseInt(w,10),v=parseInt(C,10);if(D<1||v<1)throw new Error(`Page numbers must be 1 or greater (got range "${y}").`);if(D>i&&v>i)throw new Error(`Requested range ${D}-${v} is out of range. Document contains only ${i} page${i===1?"":"s"}.`);if(D>i)throw new Error(`Page range start (${D}) exceeds total document pages (${i}).`);const b=Math.min(D,v),S=Math.min(i,Math.max(D,v));for(let $=Math.max(1,b);$<=S;$++)l.push($-1)}else{if(!/^\d+$/.test(y))throw new Error(`Invalid page specification: "${y}". Please enter numeric page numbers (e.g. 1, 2-3).`);const h=parseInt(y,10);if(h<1)throw new Error(`Page numbers must be 1 or greater (got ${h}).`);if(h>i)throw new Error(`Page ${h} is out of range. This document only contains ${i} page${i===1?"":"s"}.`);l.push(h-1)}}}if(l=Array.from(new Set(l)).filter(c=>c>=0&&c<i),l.length===0)throw new Error(`No valid pages found in range "${a}". Document contains ${i} page${i===1?"":"s"} (valid range: 1-${i}).`);t&&t(30);const r=await R.create(),n=await r.copyPages(o,l);n.forEach((c,x)=>{r.addPage(c),t&&t(30+Math.round((x+1)/n.length*60))});const f=await r.save();return new Blob([f],{type:"application/pdf"})}async function yt(e,a="recommended",t){const s=e.size,o=await e.arrayBuffer();t&&t(10);let i=null,p=s;try{i=await(await R.load(o,{ignoreEncryption:!0})).save({useObjectStreams:!0}),p=i.byteLength}catch(w){console.warn("[compressPdf] Vector optimization bypass:",w)}t&&t(25);let l=1.2,r=.65;a==="extreme"?(l=.85,r=.45):a==="low"&&(l=1.4,r=.8);let n=null,f=1/0;if(typeof document<"u")try{const C=await H.getDocument({data:o,isEvalSupported:!1}).promise,D=C.numPages,v=await R.create();for(let S=1;S<=D;S++){const $=await C.getPage(S),m=$.getViewport({scale:l}),d=document.createElement("canvas"),g=d.getContext("2d");d.width=m.width,d.height=m.height,g&&(g.imageSmoothingEnabled=!0,g.imageSmoothingQuality="high"),await $.render({canvasContext:g,viewport:m}).promise;const u=d.toDataURL("image/jpeg",r),B=await fetch(u).then(L=>L.arrayBuffer()),F=await v.embedJpg(B);v.addPage([m.width,m.height]).drawImage(F,{x:0,y:0,width:m.width,height:m.height}),t&&t(25+Math.round(S/D*65))}const b=await v.save({useObjectStreams:!0});n=new Blob([b],{type:"application/pdf"}),f=n.size}catch(w){console.warn("[compressPdf] Downsampling skipped:",w)}t&&t(95);let c,x,y=!1;n&&f<s&&f<p*.95?(c=n,x=f):i&&p<s?(c=new Blob([i],{type:"application/pdf"}),x=p):(c=new Blob([o],{type:"application/pdf"}),x=s,y=!0),t&&t(100);const h=Math.round((s-x)/s*100);return{blob:c,originalSize:s,compressedSize:x,reductionPercent:h>0?h:0,alreadyOptimized:y}}async function wt(e,a=90,t){const s=await e.arrayBuffer(),o=await R.load(s);o.getPages().forEach(l=>{const r=l.getRotation().angle;l.setRotation(A((r+a)%360))}),t&&t(90);const p=await o.save();return new Blob([p],{type:"application/pdf"})}async function xt(e,a){const t=Array.isArray(e)?e:[e],s=t.length;if(s===0)throw new Error("Please select at least one image file.");for(let p=0;p<s;p++){const l=t[p];if((l.name?l.name.toLowerCase():"").endsWith(".pdf")||l.type==="application/pdf")throw new Error(`'${l.name||"Selected document"}' is a PDF file. Images to PDF accepts only image files (JPG, PNG, WebP), not PDF documents.`)}const o=await R.create();for(let p=0;p<s;p++){const l=t[p],r=await l.arrayBuffer();let n;try{const f=l.type==="image/png"||l.name&&l.name.toLowerCase().endsWith(".png"),c=l.type==="image/jpeg"||l.type==="image/jpg"||l.name&&(l.name.toLowerCase().endsWith(".jpg")||l.name.toLowerCase().endsWith(".jpeg"));if(f)n=await o.embedPng(r);else if(c)try{n=await o.embedJpg(r)}catch(y){if(typeof document<"u"){const h=URL.createObjectURL(l),w=new Image;await new Promise((S,$)=>{w.onload=S,w.onerror=$,w.src=h});const C=document.createElement("canvas");C.width=w.width,C.height=w.height,C.getContext("2d").drawImage(w,0,0);const v=C.toDataURL("image/jpeg",.95),b=await fetch(v).then(S=>S.arrayBuffer());n=await o.embedJpg(b),URL.revokeObjectURL(h)}else throw y}else if(typeof document<"u"){const y=URL.createObjectURL(l),h=new Image;await new Promise((b,S)=>{h.onload=b,h.onerror=S,h.src=y});const w=document.createElement("canvas");w.width=h.width,w.height=h.height,w.getContext("2d").drawImage(h,0,0);const D=w.toDataURL("image/jpeg",.95),v=await fetch(D).then(b=>b.arrayBuffer());n=await o.embedJpg(v),URL.revokeObjectURL(y)}o.addPage([n.width,n.height]).drawImage(n,{x:0,y:0,width:n.width,height:n.height})}catch(f){console.warn(`[imagesToPdf] Error processing image index ${p}:`,f)}a&&a(Math.round((p+1)/s*90))}const i=await o.save();return new Blob([i],{type:"application/pdf"})}async function bt(e,a,t){if(!a||!a.trim())throw new Error("Please enter a password to protect your PDF file.");t&&t(20);try{const f=new FormData;f.append("file",e),f.append("password",a);const c=await fetch(`${st}/security/protect-pdf`,{method:"POST",body:f});if(c.ok){const x=await c.json();if(x&&x.success&&x.download_url){const y=await fetch(x.download_url);if(y.ok){const h=await y.blob();if(h&&h.size>0)return t&&t(100),h}}}}catch{console.log("[protectPdf] Python security API offline, executing QPDF WASM client fallback engine.")}t&&t(40);const s=await e.arrayBuffer(),o=new Uint8Array(s);t&&t(60);const{default:i}=await V(async()=>{const{default:f}=await import("./vendor-qpdf-DtFlW-Ve.js").then(c=>c.q);return{default:f}},__vite__mapDeps([0,1,2]));let p="/qpdf.wasm";try{p=(await V(()=>import("./vendor-qpdf-DtFlW-Ve.js").then(c=>c.a),__vite__mapDeps([0,1,2]))).default||p}catch{}const l=await i({locateFile:f=>f.endsWith(".wasm")?p||"/qpdf.wasm":f});t&&t(80),l.FS.writeFile("/input.pdf",o),l.callMain(["/input.pdf","--encrypt",a,a,"256","--","/output.pdf"]);const r=l.FS.readFile("/output.pdf"),n=new Uint8Array(r.length);return n.set(r),t&&t(100),new Blob([n],{type:"application/pdf"})}function q(e,a){if(!e||!e.trim())return[];const t=e.split(","),s=new Set;for(let o of t)if(o=o.trim(),o.includes("-")){const[i,p]=o.split("-"),l=parseInt(i.trim(),10),r=parseInt(p.trim(),10);if(!isNaN(l)&&!isNaN(r))for(let n=Math.max(1,Math.min(l,r));n<=Math.min(a,Math.max(l,r));n++)s.add(n)}else{const i=parseInt(o,10);!isNaN(i)&&i>=1&&i<=a&&s.add(i)}return Array.from(s).sort((o,i)=>o-i)}function Pt(e){if(!e||e.length===0)return"";const a=Array.from(new Set(e)).sort((i,p)=>i-p),t=[];let s=a[0],o=a[0];for(let i=1;i<a.length;i++)a[i]===o+1||(t.push(s===o?`${s}`:`${s}-${o}`),s=a[i]),o=a[i];return t.push(s===o?`${s}`:`${s}-${o}`),t.join(", ")}async function vt(e,a,t){const s=await e.arrayBuffer(),o=await R.load(s),i=o.getPageCount(),p=new Set(a.map(c=>c-1)),l=[];for(let c=0;c<i;c++)p.has(c)||l.push(c);if(l.length===0)throw new Error("Cannot remove all pages from PDF. At least one page must remain in the document.");t&&t(30);const r=await R.create();(await r.copyPages(o,l)).forEach((c,x)=>{r.addPage(c),t&&t(30+Math.round((x+1)/l.length*60))});const f=await r.save();return t&&t(100),new Blob([f],{type:"application/pdf"})}async function St(e,a="processed"){if(Array.isArray(e)&&e.length>0){const o=e.find(i=>{var p;return i&&(i.type==="application/pdf"||((p=i.name)==null?void 0:p.endsWith(".pdf")))})||e[0];if(o&&typeof o.arrayBuffer=="function"){const i=await o.arrayBuffer();return new Blob([i],{type:"application/pdf"})}}else if(e&&typeof e.arrayBuffer=="function"){const s=await e.arrayBuffer();return new Blob([s],{type:"application/pdf"})}const t=`%PDF-1.4
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
%%EOF`;return new Blob([t],{type:"application/pdf"})}async function et(e,a){let t;e instanceof ArrayBuffer?t=e:e&&typeof e.arrayBuffer=="function"?t=await e.arrayBuffer():e&&e.buffer?t=e.buffer.slice(e.byteOffset,e.byteOffset+e.byteLength):t=e;const o=await H.getDocument({data:t,isEvalSupported:!1}).promise,i=o.numPages,p=[];let l=0;for(let r=1;r<=i;r++){const n=await o.getPage(r),f=n.getViewport({scale:1}),c=f?f.width:595.28,x=f?f.height:841.89,y=await n.getTextContent(),h=[];y.items.forEach(m=>{const d=(m.str||"").trim();if(!d)return;const g=m.transform?m.transform[4]:0,u=m.transform?m.transform[5]:0,B=m.width||0,F=Math.abs(m.transform?m.transform[0]:12)||m.height||12,T=m.fontName||"",L=T.toLowerCase().includes("bold")||T.toLowerCase().includes("heavy")||T.toLowerCase().includes("black");h.push({text:d,x:g,y:u,width:B,height:F,isBold:L,fontSize:Math.round(F)}),l++}),h.sort((m,d)=>d.y-m.y||m.x-d.x);const w=[];h.forEach(m=>{let d=w.find(g=>Math.abs(g.y-m.y)<=3.5);d||(d={y:m.y,items:[]},w.push(d)),d.items.push(m)}),w.forEach(m=>m.items.sort((d,g)=>d.x-g.x));const C=w.map(m=>{const d=[];let g=null;return m.items.forEach(u=>{g?u.x-(g.x+g.width)<=8?(g.text+=" "+u.text,g.width=u.x+u.width-g.x,u.isBold&&(g.isBold=!0)):(d.push(g),g={text:u.text,x:u.x,width:u.width,height:u.height,isBold:u.isBold,fontSize:u.fontSize}):g={text:u.text,x:u.x,width:u.width,height:u.height,isBold:u.isBold,fontSize:u.fontSize}}),g&&d.push(g),{y:m.y,cells:d}}),D=C.map(m=>{if(m.cells.length===2){const d=m.cells[1],g=(d.text||"").trim();if(d.x>c*.6&&(/^\(?[0-9]{1,3}\)?$/i.test(g)||/^\(?[0-9]{1,3}\s*(marks?|pts?|points?)?\)?$/i.test(g)||/^_{4,}$/.test(g)))return{y:m.y,cells:[{text:`${m.cells[0].text}   ${g}`,x:m.cells[0].x,width:d.x+d.width-m.cells[0].x,height:m.cells[0].height,isBold:m.cells[0].isBold,fontSize:m.cells[0].fontSize}]}}return m}),v=[];let b=null;for(let m=0;m<D.length;m++){const d=D[m];if(d.cells.length>=2&&d.cells.length<=6)if(!b)b={lines:[d],indices:[m]};else{const g=b.lines[b.lines.length-1],u=Math.abs(g.y-d.y);let B=0;d.cells.forEach(T=>{g.cells.some(L=>Math.abs(L.x-T.x)<=22)&&B++});const F=B>=Math.min(d.cells.length,g.cells.length)-1;u<=55&&F?(b.lines.push(d),b.indices.push(m)):(b.lines.length>=2&&v.push(b),b={lines:[d],indices:[m]})}else b&&b.lines.length>=2&&v.push(b),b=null}b&&b.lines.length>=2&&v.push(b);const S=new Map;v.forEach((m,d)=>{const g=[];m.lines.forEach(T=>{T.cells.forEach(L=>{g.some(E=>Math.abs(E-L.x)<=18)||g.push(L.x)})}),g.sort((T,L)=>T-L);const u=Math.max(2,g.length),B=Math.round(9e3/u),F=new Array(u).fill(B);m.indices.forEach(T=>{S.set(T,{tableId:d,anchors:g,colWidths:F,colCount:u})})});const $=[];D.forEach((m,d)=>{var u;const g=S.get(d);if(g){const B=new Array(g.colCount).fill("");m.cells.forEach(T=>{let L=0,E=1/0;g.anchors.forEach((I,M)=>{const P=Math.abs(I-T.x);P<E&&(E=P,L=M)}),B[L]=T.text});const F=m.cells.some(T=>T.isBold);$.push({type:"table_row",y:m.y,isHeader:F,rowCells:B,colWidths:g.colWidths})}else{const B=m.cells.map(E=>E.text).join(" "),F=((u=m.cells[0])==null?void 0:u.fontSize)||12,T=m.cells.some(E=>E.isBold),L=F>=14||T;$.push({type:L?"heading":"paragraph",y:m.y,text:B,fontSize:F,isBold:T,rowCells:[B]})}}),p.push({pageNum:r,pageWidth:c,pageHeight:x,hasText:h.length>0,totalTextItems:h.length,hasTable:v.length>0,colCount:v.length>0?v[0].lines[0].cells.length:1,gridRows:$,lineCount:C.length}),a&&a(Math.round(r/i*70))}return{numPages:i,totalTextItems:l,isScannedOnly:l===0,pages:p}}async function K(e=[],a=[],t="Presentation",s="editable"){const o=new tt,i=d=>String(d||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;"),p=e&&typeof e=="object"&&Array.isArray(e.pages),l=p?e.pages.length:Math.max(1,Math.max((e||[]).length,(a||[]).length)),r=[],n=[],f=[];let c=12192e3,x=6858e3;if(p&&e.pages&&e.pages[0]){const d=e.pages[0],g=typeof d.pageWidth=="number"&&!isNaN(d.pageWidth)&&d.pageWidth>0?d.pageWidth:595.28,u=typeof d.pageHeight=="number"&&!isNaN(d.pageHeight)&&d.pageHeight>0?d.pageHeight:841.89;c=Math.round(g*12700),x=Math.round(u*12700)}else if(a&&a.length>0&&a[0]){const d=a.find(u=>u&&(u.dataUrl||u.url)),g=d?d.height>d.width:!0;c=g?792e4:12192e3,x=g?10252800:6858e3}(!c||isNaN(c)||c<=0)&&(c=12192e3),(!x||isNaN(x)||x<=0)&&(x=6858e3);const y=`
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
      </p:grpSpPr>`;for(let d=1;d<=l;d++){r.push(`<Override PartName="/ppt/slides/slide${d}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`),n.push(`<Relationship Id="rId${d+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${d}.xml"/>`),f.push(`<p:sldId id="${255+d}" r:id="rId${d+1}"/>`);let g="",u="",B=2;const F=a&&a[d-1];if((s==="visual"||!p)&&F&&F.dataUrl){const I=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",M=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${d}.${I}`,M,{base64:!0}),g=`<Relationship Id="rIdImg${d}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${d}.${I}"/>`,u=`
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
          <a:xfrm><a:off x="0" y="0"/><a:ext cx="${c}" cy="${x}"/></a:xfrm>
          <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
        </p:spPr>
      </p:pic>`}else if(p){const E=e.pages[d-1];if(!E||!E.hasText)if(F&&F.dataUrl){const M=F.dataUrl.startsWith("data:image/jpeg")||F.dataUrl.startsWith("data:image/jpg")?"jpg":"png",P=F.dataUrl.replace(/^data:image\/(png|jpeg|jpg);base64,/,"");o.folder("ppt/media").file(`image${d}.${M}`,P,{base64:!0}),g=`<Relationship Id="rIdImg${d}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${d}.${M}"/>`,u=`
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
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="${c}" cy="${x}"/></a:xfrm>
              <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
            </p:spPr>
          </p:pic>`}else u=`
          <p:sp>
            <p:nvSpPr>
              <p:cNvPr id="${B++}" name="Scanned Notice"/>
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
        `;else if(E.hasTable){const I=E.gridRows.filter(N=>N.type==="heading"),M=E.gridRows.filter(N=>N.type==="table_row"),P=E.gridRows.filter(N=>N.type==="paragraph");if(I.length>0){const N=I.map(j=>j.text).join(" ");u+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Slide Title ${d}"/>
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
                    <a:t>${i(N)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}if(M.length>0){const N=E.colCount,j=c-127e4,G=Math.round(j/N),X=4e5,Y=I.length>0?15e5:8e5,O=M.map((z,J)=>{const k=z.isHeader,U=z.rowCells.map(_=>`
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
                      <a:t>${i(_)}</a:t>
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
            `).join("");return`<a:tr h="${X}">${U}</a:tr>`}).join("");u+=`
            <p:graphicFrame>
              <p:nvGraphicFramePr>
                <p:cNvPr id="${B++}" name="Table ${d}"/>
                <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
                <p:nvPr/>
              </p:nvGraphicFramePr>
              <p:xfrm>
                <a:off x="635000" y="${Y}"/>
                <a:ext cx="${j}" cy="${X*M.length}"/>
              </p:xfrm>
              <a:graphic>
                <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
                  <a:tbl>
                    <a:tblPr firstRow="1" bandRow="1">
                      <a:tableStyleId>{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}</a:tableStyleId>
                    </a:tblPr>
                    <a:tblGrid>
                      ${new Array(N).fill(`<a:gridCol w="${G}"/>`).join("")}
                    </a:tblGrid>
                    ${O}
                  </a:tbl>
                </a:graphicData>
              </a:graphic>
            </p:graphicFrame>
          `}if(P.length>0){const N=P.map(G=>G.text).join(" "),j=15e5+4e5*M.length+25e4;u+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="Notes ${d}"/>
                <p:cNvSpPr txBox="1"/>
                <p:nvPr/>
              </p:nvSpPr>
              <p:spPr>
                <a:xfrm><a:off x="635000" y="${j}"/><a:ext cx="${c-127e4}" cy="500000"/></a:xfrm>
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
                    <a:t>${i(N)}</a:t>
                  </a:r>
                </a:p>
              </p:txBody>
            </p:sp>
          `}}else{const I=[];let M=null;E.gridRows.forEach(P=>{if(!M)M={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]};else{const N=M.type===P.type,j=Math.abs(M.bottomY-P.y);N&&j<=(P.fontSize||12)*2.8?(M.lines.push(P),M.bottomY=P.y):(I.push(M),M={type:P.type,fontSize:P.fontSize||12,isBold:P.isBold,topY:P.y,bottomY:P.y,lines:[P]})}}),M&&I.push(M),I.forEach((P,N)=>{const j=P.type==="heading",G=Math.round(Math.min(48,Math.max(10,P.fontSize||12))*100),X=j?"0F172A":"334155",Y=P.isBold||j,O=typeof E.pageHeight=="number"&&!isNaN(E.pageHeight)&&E.pageHeight>0?E.pageHeight:841.89,z=typeof P.topY=="number"&&!isNaN(P.topY)?P.topY:O-(N*50+60),J=typeof P.bottomY=="number"&&!isNaN(P.bottomY)?P.bottomY:z;let k=Math.max(0,Math.round((O-z-(P.fontSize||12))*12700)),U=Math.max(45e4,Math.round((z-J+(P.fontSize||12)+12)*12700)),_=c-127e4;(isNaN(k)||k<0)&&(k=Math.round((N*50+50)*12700)),(isNaN(U)||U<=0)&&(U=5e5),(isNaN(_)||_<=0)&&(_=65e5);const nt=P.lines.map(ot=>`
            <a:p>
              <a:r>
                <a:rPr lang="en-US" sz="${G}" b="${Y?"1":"0"}">
                  <a:solidFill><a:srgbClr val="${X}"/></a:solidFill>
                  <a:latin typeface="Calibri"/>
                </a:rPr>
                <a:t>${i(ot.text)}</a:t>
              </a:r>
            </a:p>
          `).join("");u+=`
            <p:sp>
              <p:nvSpPr>
                <p:cNvPr id="${B++}" name="TextBlock ${N+1}"/>
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
                ${nt}
              </p:txBody>
            </p:sp>
          `})}}else{const E=(Array.isArray(e)?e[d-1]:"")||"";if(E.trim()){const M=E.split(`
`).filter(P=>P.trim()).slice(0,15).map(P=>`<a:p><a:r><a:rPr lang="en-US" sz="1800"/><a:t>${i(P)}</a:t></a:r></a:p>`).join("");u=`
        <p:sp>
          <p:nvSpPr><p:cNvPr id="${B++}" name="Text Content"/><p:cSpPr/><p:nvPr/></p:nvSpPr>
          <p:spPr><a:xfrm><a:off x="457200" y="457200"/><a:ext cx="${c-914400}" cy="${x-914400}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>
          <p:txBody>
            <a:bodyPr/>
            <a:lstStyle/>
            ${M}
          </p:txBody>
        </p:sp>`}}const T=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld>
    <p:spTree>
      ${y}
      ${u}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`,L=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  ${g}
</Relationships>`;o.folder("ppt/slides").file(`slide${d}.xml`,T),o.folder("ppt/slides/_rels").file(`slide${d}.xml.rels`,L)}const h=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
  ${r.join(`
  `)}
</Types>`,w=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
  <p:sldSz cx="${c}" cy="${x}"/>
  <p:notesSz cx="6858000" cy="12192000"/>
</p:presentation>`,D=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
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
    <p:spTree>${y}</p:spTree>
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
    <p:spTree>${y}</p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`,m=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`;return o.file("[Content_Types].xml",h),o.file("_rels/.rels",w),o.file("ppt/presentation.xml",C),o.file("ppt/_rels/presentation.xml.rels",D),o.file("ppt/theme/theme1.xml",v),o.file("ppt/slideMasters/slideMaster1.xml",b),o.file("ppt/slideMasters/_rels/slideMaster1.xml.rels",S),o.file("ppt/slideLayouts/slideLayout1.xml",$),o.file("ppt/slideLayouts/_rels/slideLayout1.xml.rels",m),await o.generateAsync({type:"blob",mimeType:"application/vnd.openxmlformats-officedocument.presentationml.presentation"})}async function Ct(e,a="editable",t){if(!e||e.size===0)throw new Error("Please select a valid, non-empty PDF document.");let s;try{s=await e.arrayBuffer()}catch(h){throw new Error("Failed to read file data: "+h.message)}const o=new Uint8Array(s.slice(0,5));if(!String.fromCharCode(...o).startsWith("%PDF-"))throw new Error("Invalid file format. The uploaded file is not a valid PDF document.");let p,l;try{p=H.getDocument({data:s,isEvalSupported:!1}),l=await p.promise}catch(h){throw h&&h.name==="PasswordException"?new Error("This PDF is password-protected. Please unlock or remove password protection first."):new Error("Unable to open PDF document: "+(h.message||"File may be corrupted."))}if(l.numPages===0)throw new Error("This PDF document contains no pages.");if(t&&t(20),a==="visual"){const h=await Q(e,C=>{t&&t(20+Math.round(C*.6))}),w=await K(null,h,(e==null?void 0:e.name)||"Presentation","visual");return t&&t(100),{blob:w,mode:"visual",isScannedOnly:!1,hasScannedSlides:!0,pageCount:h.length,tableDetected:!1}}const n=await et(e,h=>{t&&t(20+Math.round(h*.5))});let f=null,c=n.isScannedOnly;const x=n.pages.some(h=>!h.hasText);if(n.isScannedOnly||x)try{f=await Q(e,h=>{t&&t(70+Math.round(h*.2))}),c=!0}catch(h){console.warn("[pdfToPptx] Visual rendering fallback notice:",h)}t&&t(85);const y=await K(n,f,(e==null?void 0:e.name)||"Presentation",n.isScannedOnly?"visual":"editable");return t&&t(100),{blob:y,mode:n.isScannedOnly?"visual":"editable",isScannedOnly:n.isScannedOnly,hasScannedSlides:c,pageCount:n.numPages,tableDetected:n.pages.some(h=>h.hasTable)}}function lt(e,a="Spreadsheet"){const t=W.book_new();if(e.isScannedOnly){const s=W.aoa_to_sheet([["Notice: Scanned / Image-Only Document"],["This PDF contains scanned images without an extractable text layer."],["Optical Character Recognition (OCR) is required to convert image text into spreadsheet data."]]);return W.book_append_sheet(t,s,"Notice"),t}return e.pages.forEach((s,o)=>{const i=[],p=s.colCount,l=new Array(p).fill(10);s.gridRows.forEach(f=>{const c=f.rowCells;i.push(c),c.forEach((x,y)=>{const h=String(x||"").length;h>(l[y]||10)&&(l[y]=Math.min(h+3,50))})});const r=W.aoa_to_sheet(i);r["!cols"]=l.map(f=>({wch:f}));const n=e.numPages===1?"Sheet1":`Page ${o+1}`;W.book_append_sheet(t,r,n)}),t}async function Ft(e,a){const t=await et(e,p=>{a&&a(Math.round(p*.7))}),s=lt(t,(e==null?void 0:e.name)||"Spreadsheet"),o=rt(s,{bookType:"xlsx",type:"array"}),i=new Blob([o],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});return a&&a(100),{blob:i,isScannedOnly:t.isScannedOnly,pageCount:t.numPages,tableDetected:t.pages.some(p=>p.hasTable)}}function Bt(e){return new Blob([e],{type:"text/plain;charset=utf-8"})}async function Tt(e,a="images"){const t=new tt,s=t.folder(a);return e.forEach((o,i)=>{const p=o.dataUrl.replace(/^data:image\/(png|jpeg);base64,/,""),l=o.dataUrl.startsWith("data:image/png")?"png":"jpg";s.file(`page_${i+1}.${l}`,p,{base64:!0})}),await t.generateAsync({type:"blob"})}function at(e="#000000"){let a=e.replace("#","").trim();a.length===3&&(a=a.split("").map(i=>i+i).join(""));const t=parseInt(a.substring(0,2),16)/255,s=parseInt(a.substring(2,4),16)/255,o=parseInt(a.substring(4,6),16)/255;return it(isNaN(t)?0:t,isNaN(s)?0:s,isNaN(o)?0:o)}function ct(e,a,t,s="bottom-right",o=36){const i=e.getRotation().angle||0,p=e.getWidth(),l=e.getHeight(),r=o;let n=0,f=0,c=0;return i===0?(c=0,s==="bottom-left"?(n=r,f=r):s==="bottom-center"?(n=(p-a)/2,f=r):s==="bottom-right"?(n=p-r-a,f=r):s==="top-left"?(n=r,f=l-r-t):s==="top-center"?(n=(p-a)/2,f=l-r-t):s==="top-right"&&(n=p-r-a,f=l-r-t)):i===90?(c=90,s==="bottom-right"?(n=p-r,f=r):s==="bottom-center"?(n=p-r,f=(l-a)/2):s==="bottom-left"?(n=p-r,f=l-r-a):s==="top-right"?(n=r+t,f=r):s==="top-center"?(n=r+t,f=(l-a)/2):s==="top-left"&&(n=r+t,f=l-r-a)):i===180?(c=180,s==="bottom-right"?(n=r+a,f=l-r):s==="bottom-center"?(n=(p+a)/2,f=l-r):s==="bottom-left"?(n=p-r,f=l-r):s==="top-right"?(n=r+a,f=r+t):s==="top-center"?(n=(p+a)/2,f=r+t):s==="top-left"&&(n=p-r,f=r+t)):i===270&&(c=270,s==="bottom-right"?(n=r,f=l-r):s==="bottom-center"?(n=r,f=(l+a)/2):s==="bottom-left"?(n=r,f=r+a):s==="top-right"?(n=p-r-t,f=l-r):s==="top-center"?(n=p-r-t,f=(l+a)/2):s==="top-left"&&(n=p-r-t,f=r+a)),{x:n,y:f,rotAngle:c}}async function Et(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{startNumber:s=1,format:o="Page {n}",position:i="bottom-right",fontSize:p=11,fontColor:l="#334155",marginPt:r=36,pageRange:n="all"}=a,f=await e.arrayBuffer(),c=await R.load(f,{ignoreEncryption:!0}),x=await c.embedFont(Z.Helvetica),y=at(l),h=c.getPageCount();if(h===0)throw new Error("This PDF document contains no pages.");const w=n&&n!=="all"?q(n,h):Array.from({length:h},(b,S)=>S+1);if(w.length===0)throw new Error("No valid pages found in the specified page range.");t&&t(20);const C=new Set(w);let D=0;for(let b=0;b<h;b++){const S=b+1;if(C.has(S)){const $=c.getPage(b),m=s+D,d=o.replace(/\{n\}/g,String(m)).replace(/\{total\}/g,String(h)),g=x.widthOfTextAtSize(d,p),u=p,{x:B,y:F,rotAngle:T}=ct($,g,u,i,r);$.drawText(d,{x:B,y:F,size:p,font:x,color:y,rotate:A(T)}),D++}t&&t(20+Math.round((b+1)/h*70))}const v=await c.save();return t&&t(100),new Blob([v],{type:"application/pdf"})}async function $t(e,a={},t){var v;if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{watermarkType:s="text",text:o="CONFIDENTIAL",opacity:i=.35,rotation:p=45,fontSize:l=48,color:r="#EF4444",position:n="center",pageRange:f="all",imageFile:c=null}=a,x=await e.arrayBuffer(),y=await R.load(x,{ignoreEncryption:!0}),h=y.getPageCount();if(h===0)throw new Error("This PDF document contains no pages.");const w=f&&f!=="all"?q(f,h):Array.from({length:h},(b,S)=>S+1);if(w.length===0)throw new Error("No valid pages found in the specified page range.");t&&t(20);const C=new Set(w);if(s==="image"&&c){let b;const S=await c.arrayBuffer();c.type==="image/png"||((v=c.name)==null?void 0:v.toLowerCase().endsWith(".png"))?b=await y.embedPng(S):b=await y.embedJpg(S);const m=b.scale(a.scale||.5);for(let d=0;d<h;d++){if(C.has(d+1)){const g=y.getPage(d),{width:u,height:B}=g.getSize();let F=(u-m.width)/2,T=(B-m.height)/2;n==="top-left"?(F=36,T=B-m.height-36):n==="top-right"?(F=u-m.width-36,T=B-m.height-36):n==="bottom-left"?(F=36,T=36):n==="bottom-right"&&(F=u-m.width-36,T=36),g.drawImage(b,{x:F,y:T,width:m.width,height:m.height,opacity:Math.max(.05,Math.min(1,i))})}t&&t(20+Math.round((d+1)/h*70))}}else{const b=await y.embedFont(Z.HelveticaBold),S=String(o||"CONFIDENTIAL").trim();if(!S)throw new Error("Watermark text cannot be empty.");const $=at(r),m=b.widthOfTextAtSize(S,l),d=l,g=p*Math.PI/180;for(let u=0;u<h;u++){if(C.has(u+1)){const B=y.getPage(u),{width:F,height:T}=B.getSize(),L=B.getRotation().angle||0;let E=0,I=0;n==="center"||n==="diagonal"?(E=F/2-m/2*Math.cos(g)+d/4*Math.sin(g),I=T/2-m/2*Math.sin(g)-d/4*Math.cos(g)):n==="top-left"?(E=36,I=T-72):n==="top-right"?(E=F-m-36,I=T-72):n==="bottom-left"?(E=36,I=36):n==="bottom-right"&&(E=F-m-36,I=36),B.drawText(S,{x:E,y:I,size:l,font:b,color:$,opacity:Math.max(.05,Math.min(1,i)),rotate:A(p+L)})}t&&t(20+Math.round((u+1)/h*70))}}const D=await y.save();return t&&t(100),new Blob([D],{type:"application/pdf"})}async function Dt(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const{cropMargins:s={top:36,bottom:36,left:36,right:36},pageRange:o="all"}=a,i=Number(s.top)||0,p=Number(s.bottom)||0,l=Number(s.left)||0,r=Number(s.right)||0;if(i<0||p<0||l<0||r<0)throw new Error("Crop margins must be non-negative values.");const n=await e.arrayBuffer(),f=await R.load(n,{ignoreEncryption:!0}),c=f.getPageCount();if(c===0)throw new Error("This PDF document contains no pages.");const x=o&&o!=="all"?q(o,c):Array.from({length:c},(w,C)=>C+1);if(x.length===0)throw new Error("No valid pages found in the specified page range.");const y=new Set(x);for(let w=0;w<c;w++){if(y.has(w+1)){const C=f.getPage(w),D=C.getMediaBox(),v=C.getCropBox()||D,b=v.x+l,S=v.y+p,$=v.width-l-r,m=v.height-i-p;if($<=20||m<=20)throw new Error(`Crop margins too large on page ${w+1}. Remaining width (${Math.round($)}pt) or height (${Math.round(m)}pt) must be at least 20pt.`);C.setCropBox(b,S,$,m)}t&&t(20+Math.round((w+1)/c*70))}const h=await f.save();return t&&t(100),new Blob([h],{type:"application/pdf"})}async function Mt(e){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const a=await e.arrayBuffer(),t=await R.load(a,{ignoreEncryption:!0}),s=t.getKeywords();let o="";return Array.isArray(s)?o=s.join(", "):typeof s=="string"&&(o=s),{title:t.getTitle()||"",author:t.getAuthor()||"",subject:t.getSubject()||"",keywords:o,producer:t.getProducer()||"",creator:t.getCreator()||"",creationDate:t.getCreationDate()?t.getCreationDate().toISOString():"",modificationDate:t.getModificationDate()?t.getModificationDate().toISOString():"",pageCount:t.getPageCount()}}async function It(e,a={},t){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");const s=await e.arrayBuffer(),o=await R.load(s,{ignoreEncryption:!0});if(t&&t(30),a.title!==void 0&&o.setTitle(a.title||""),a.author!==void 0&&o.setAuthor(a.author||""),a.subject!==void 0&&o.setSubject(a.subject||""),a.keywords!==void 0){const p=String(a.keywords||"").split(",").map(l=>l.trim()).filter(Boolean);o.setKeywords(p)}a.producer!==void 0&&o.setProducer(a.producer||"Simatrix PDF Tools"),a.creator!==void 0&&o.setCreator(a.creator||"Simatrix PDF Tools"),o.setModificationDate(new Date),t&&t(75);const i=await o.save();return t&&t(100),new Blob([i],{type:"application/pdf"})}async function Lt(e,a,t={},s){if(!e||e.size===0)throw new Error("Please select a valid PDF file.");if(!Array.isArray(a)||a.length===0)throw new Error("Please provide at least one page in the reordered list.");const o=await e.arrayBuffer(),i=await R.load(o,{ignoreEncryption:!0}),p=i.getPageCount();for(const n of a)if(typeof n!="number"||n<1||n>p)throw new Error(`Invalid page index ${n}. Document contains pages 1 to ${p}.`);s&&s(20);const l=await R.create();for(let n=0;n<a.length;n++){const f=a[n],[c]=await l.copyPages(i,[f-1]),x=Number(t[f])||0;if(x!==0){const y=c.getRotation().angle||0;c.setRotation(A((y+x)%360))}l.addPage(c),s&&s(20+Math.round((n+1)/a.length*70))}const r=await l.save();return s&&s(100),new Blob([r],{type:"application/pdf"})}async function Nt(e,a,t){t&&t(10);const s=await e.arrayBuffer(),o=await R.load(s,{ignoreEncryption:!0}),i=o.getPageCount();t&&t(30);const p=a.length;for(let r=0;r<p;r++){const n=a[r],f=(n.page||1)-1;if(f<0||f>=i)continue;const c=o.getPage(f),{width:x,height:y}=c.getSize(),h=c.getRotation().angle;let w=n.dataUrl||n.imageBase64||"";if(w.includes(",")&&(w=w.split(",")[1]),!w)continue;const C=atob(w),D=new Uint8Array(C.length);for(let d=0;d<C.length;d++)D[d]=C.charCodeAt(d);const v=await o.embedPng(D),b=Number(n.ptX)||0,S=Number(n.ptY)||0,$=Number(n.ptW)||120,m=Number(n.ptH)||50;h===0?c.drawImage(v,{x:b,y:y-S-m,width:$,height:m}):h===90?c.drawImage(v,{x:S,y:b,width:$,height:m,rotate:A(-90)}):h===180?c.drawImage(v,{x:x-b-$,y:S,width:$,height:m,rotate:A(180)}):h===270&&c.drawImage(v,{x:x-S-m,y:y-b-$,width:$,height:m,rotate:A(90)}),t&&t(30+Math.round((r+1)/p*50))}t&&t(85);const l=await o.save();return t&&t(100),new Blob([l],{type:"application/pdf"})}export{wt as a,Q as b,yt as c,Tt as d,Ct as e,Ft as f,ht as g,Bt as h,xt as i,Et as j,Dt as k,It as l,gt as m,St as n,q as o,bt as p,Pt as q,Mt as r,ut as s,vt as t,Lt as u,Nt as v,$t as w};
