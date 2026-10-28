/*!
 * Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2026 Fonticons, Inc.
 */function xa(a,n){(n==null||n>a.length)&&(n=a.length);for(var t=0,e=Array(n);t<n;t++)e[t]=a[t];return e}function Et(a){if(Array.isArray(a))return a}function Ot(a){if(Array.isArray(a))return xa(a)}function jt(a,n){if(!(a instanceof n))throw new TypeError("Cannot call a class as a function")}function Tt(a,n){for(var t=0;t<n.length;t++){var e=n[t];e.enumerable=e.enumerable||!1,e.configurable=!0,"value"in e&&(e.writable=!0),Object.defineProperty(a,An(e.key),e)}}function _t(a,n,t){return n&&Tt(a.prototype,n),Object.defineProperty(a,"prototype",{writable:!1}),a}function ta(a,n){var t=typeof Symbol<"u"&&a[Symbol.iterator]||a["@@iterator"];if(!t){if(Array.isArray(a)||(t=ja(a))||n){t&&(a=t);var e=0,r=function(){};return{s:r,n:function(){return e>=a.length?{done:!0}:{done:!1,value:a[e++]}},e:function(l){throw l},f:r}}throw new TypeError(`Invalid attempt to iterate non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}var o,i=!0,s=!1;return{s:function(){t=t.call(a)},n:function(){var l=t.next();return i=l.done,l},e:function(l){s=!0,o=l},f:function(){try{i||t.return==null||t.return()}finally{if(s)throw o}}}}function d(a,n,t){return(n=An(n))in a?Object.defineProperty(a,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):a[n]=t,a}function $t(a){if(typeof Symbol<"u"&&a[Symbol.iterator]!=null||a["@@iterator"]!=null)return Array.from(a)}function Dt(a,n){var t=a==null?null:typeof Symbol<"u"&&a[Symbol.iterator]||a["@@iterator"];if(t!=null){var e,r,o,i,s=[],l=!0,c=!1;try{if(o=(t=t.call(a)).next,n===0){if(Object(t)!==t)return;l=!1}else for(;!(l=(e=o.call(t)).done)&&(s.push(e.value),s.length!==n);l=!0);}catch(g){c=!0,r=g}finally{try{if(!l&&t.return!=null&&(i=t.return(),Object(i)!==i))return}finally{if(c)throw r}}return s}}function Rt(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Wt(){throw new TypeError(`Invalid attempt to spread non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function Va(a,n){var t=Object.keys(a);if(Object.getOwnPropertySymbols){var e=Object.getOwnPropertySymbols(a);n&&(e=e.filter(function(r){return Object.getOwnPropertyDescriptor(a,r).enumerable})),t.push.apply(t,e)}return t}function f(a){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?Va(Object(t),!0).forEach(function(e){d(a,e,t[e])}):Object.getOwnPropertyDescriptors?Object.defineProperties(a,Object.getOwnPropertyDescriptors(t)):Va(Object(t)).forEach(function(e){Object.defineProperty(a,e,Object.getOwnPropertyDescriptor(t,e))})}return a}function la(a,n){return Et(a)||Dt(a,n)||ja(a,n)||Rt()}function M(a){return Ot(a)||$t(a)||ja(a)||Wt()}function Ut(a,n){if(typeof a!="object"||!a)return a;var t=a[Symbol.toPrimitive];if(t!==void 0){var e=t.call(a,n);if(typeof e!="object")return e;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(a)}function An(a){var n=Ut(a,"string");return typeof n=="symbol"?n:n+""}function ia(a){"@babel/helpers - typeof";return ia=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},ia(a)}function ja(a,n){if(a){if(typeof a=="string")return xa(a,n);var t={}.toString.call(a).slice(8,-1);return t==="Object"&&a.constructor&&(t=a.constructor.name),t==="Map"||t==="Set"?Array.from(a):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?xa(a,n):void 0}}var Ba=function(){},Ta={},Ln={},kn=null,Mn={mark:Ba,measure:Ba};try{typeof window<"u"&&(Ta=window),typeof document<"u"&&(Ln=document),typeof MutationObserver<"u"&&(kn=MutationObserver),typeof performance<"u"&&(Mn=performance)}catch{}var Yt=Ta.navigator||{},qa=Yt.userAgent,Ja=qa===void 0?"":qa,E=Ta,h=Ln,Ka=kn,Q=Mn;E.document;var F=!!h.documentElement&&!!h.head&&typeof h.addEventListener=="function"&&typeof h.createElement=="function",Cn=~Ja.indexOf("MSIE")||~Ja.indexOf("Trident/"),Z,Xt=/fa(k|kd|s|r|l|t|d|dr|dl|dt|b|slr|slpr|wsb|tl|ns|nds|es|gt|jr|jfr|jdr|usb|ufsb|udsb|cr|ss|sr|sl|st|sds|sdr|sdl|sdt|sldr|slpdr|pr|ms|vs)?[\-\ ]/,Ht=/Font ?Awesome ?([567 ]*)(Solid|Regular|Light|Thin|Duotone|Brands|Free|Pro|Sharp Duotone|Sharp|Kit|Notdog Duo|Notdog|Chisel|Etch|Graphite|Thumbprint|Jelly Fill|Jelly Duo|Jelly|Utility|Utility Fill|Utility Duo|Slab Press|Slab|Slab Duo|Slab Press Duo|Pixel|Mosaic|Vellum|Whiteboard)?.*/i,In={classic:{fa:"solid",fas:"solid","fa-solid":"solid",far:"regular","fa-regular":"regular",fal:"light","fa-light":"light",fat:"thin","fa-thin":"thin",fab:"brands","fa-brands":"brands"},duotone:{fa:"solid",fad:"solid","fa-solid":"solid","fa-duotone":"solid",fadr:"regular","fa-regular":"regular",fadl:"light","fa-light":"light",fadt:"thin","fa-thin":"thin"},sharp:{fa:"solid",fass:"solid","fa-solid":"solid",fasr:"regular","fa-regular":"regular",fasl:"light","fa-light":"light",fast:"thin","fa-thin":"thin"},"sharp-duotone":{fa:"solid",fasds:"solid","fa-solid":"solid",fasdr:"regular","fa-regular":"regular",fasdl:"light","fa-light":"light",fasdt:"thin","fa-thin":"thin"},slab:{"fa-regular":"regular",faslr:"regular"},"slab-press":{"fa-regular":"regular",faslpr:"regular"},"slab-duo":{"fa-regular":"regular",fasldr:"regular"},"slab-press-duo":{"fa-regular":"regular",faslpdr:"regular"},thumbprint:{"fa-light":"light",fatl:"light"},vellum:{"fa-solid":"solid",favs:"solid"},pixel:{"fa-regular":"regular",fapr:"regular"},mosaic:{"fa-solid":"solid",fams:"solid"},whiteboard:{"fa-semibold":"semibold",fawsb:"semibold"},notdog:{"fa-solid":"solid",fans:"solid"},"notdog-duo":{"fa-solid":"solid",fands:"solid"},etch:{"fa-solid":"solid",faes:"solid"},graphite:{"fa-thin":"thin",fagt:"thin"},jelly:{"fa-regular":"regular",fajr:"regular"},"jelly-fill":{"fa-regular":"regular",fajfr:"regular"},"jelly-duo":{"fa-regular":"regular",fajdr:"regular"},chisel:{"fa-regular":"regular",facr:"regular"},utility:{"fa-semibold":"semibold",fausb:"semibold"},"utility-duo":{"fa-semibold":"semibold",faudsb:"semibold"},"utility-fill":{"fa-semibold":"semibold",faufsb:"semibold"}},Gt={GROUP:"duotone-group",PRIMARY:"primary",SECONDARY:"secondary"},Pn=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone","fa-thumbprint","fa-whiteboard","fa-notdog","fa-notdog-duo","fa-chisel","fa-etch","fa-graphite","fa-jelly","fa-jelly-fill","fa-jelly-duo","fa-slab","fa-slab-press","fa-slab-press-duo","fa-slab-duo","fa-mosaic","fa-pixel","fa-vellum","fa-utility","fa-utility-duo","fa-utility-fill"],z="classic",q="duotone",Nn="sharp",Fn="sharp-duotone",En="chisel",On="etch",jn="graphite",Tn="jelly",_n="jelly-duo",$n="jelly-fill",Dn="mosaic",Rn="notdog",Wn="notdog-duo",Un="pixel",Yn="slab",Xn="slab-duo",Hn="slab-press",Gn="slab-press-duo",Vn="thumbprint",Bn="utility",qn="utility-duo",Jn="utility-fill",Kn="vellum",Qn="whiteboard",Vt="Classic",Bt="Duotone",qt="Sharp",Jt="Sharp Duotone",Kt="Chisel",Qt="Etch",Zt="Graphite",ae="Jelly",ne="Jelly Duo",te="Jelly Fill",ee="Mosaic",re="Notdog",ie="Notdog Duo",oe="Pixel",se="Slab",le="Slab Duo",fe="Slab Press",ce="Slab Press Duo",ue="Thumbprint",me="Utility",de="Utility Duo",ge="Utility Fill",ve="Vellum",pe="Whiteboard",Zn=[z,q,Nn,Fn,En,On,jn,Tn,_n,$n,Dn,Rn,Wn,Un,Yn,Xn,Hn,Gn,Vn,Bn,qn,Jn,Kn,Qn];Z={},d(d(d(d(d(d(d(d(d(d(Z,z,Vt),q,Bt),Nn,qt),Fn,Jt),En,Kt),On,Qt),jn,Zt),Tn,ae),_n,ne),$n,te),d(d(d(d(d(d(d(d(d(d(Z,Dn,ee),Rn,re),Wn,ie),Un,oe),Yn,se),Xn,le),Hn,fe),Gn,ce),Vn,ue),Bn,me),d(d(d(d(Z,qn,de),Jn,ge),Kn,ve),Qn,pe);var he={classic:{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},duotone:{900:"fad",400:"fadr",300:"fadl",100:"fadt"},sharp:{900:"fass",400:"fasr",300:"fasl",100:"fast"},"sharp-duotone":{900:"fasds",400:"fasdr",300:"fasdl",100:"fasdt"},slab:{400:"faslr"},"slab-press":{400:"faslpr"},"slab-duo":{400:"fasldr"},"slab-press-duo":{400:"faslpdr"},vellum:{900:"favs"},mosaic:{900:"fams"},pixel:{400:"fapr"},whiteboard:{600:"fawsb"},thumbprint:{300:"fatl"},notdog:{900:"fans"},"notdog-duo":{900:"fands"},etch:{900:"faes"},graphite:{100:"fagt"},chisel:{400:"facr"},jelly:{400:"fajr"},"jelly-fill":{400:"fajfr"},"jelly-duo":{400:"fajdr"},utility:{600:"fausb"},"utility-duo":{600:"faudsb"},"utility-fill":{600:"faufsb"}},be={"Font Awesome 7 Free":{900:"fas",400:"far"},"Font Awesome 7 Pro":{900:"fas",400:"far",normal:"far",300:"fal",100:"fat"},"Font Awesome 7 Brands":{400:"fab",normal:"fab"},"Font Awesome 7 Duotone":{900:"fad",400:"fadr",normal:"fadr",300:"fadl",100:"fadt"},"Font Awesome 7 Sharp":{900:"fass",400:"fasr",normal:"fasr",300:"fasl",100:"fast"},"Font Awesome 7 Sharp Duotone":{900:"fasds",400:"fasdr",normal:"fasdr",300:"fasdl",100:"fasdt"},"Font Awesome 7 Jelly":{400:"fajr",normal:"fajr"},"Font Awesome 7 Jelly Fill":{400:"fajfr",normal:"fajfr"},"Font Awesome 7 Jelly Duo":{400:"fajdr",normal:"fajdr"},"Font Awesome 7 Slab":{400:"faslr",normal:"faslr"},"Font Awesome 7 Slab Press":{400:"faslpr",normal:"faslpr"},"Font Awesome 7 Slab Duo":{400:"fasldr",normal:"fasldr"},"Font Awesome 7 Slab Press Duo":{400:"faslpdr",normal:"faslpdr"},"Font Awesome 7 Pixel":{400:"fapr",normal:"fapr"},"Font Awesome 7 Mosaic":{900:"fams",normal:"fams"},"Font Awesome 7 Vellum":{900:"favs",normal:"favs"},"Font Awesome 7 Thumbprint":{300:"fatl",normal:"fatl"},"Font Awesome 7 Notdog":{900:"fans",normal:"fans"},"Font Awesome 7 Notdog Duo":{900:"fands",normal:"fands"},"Font Awesome 7 Etch":{900:"faes",normal:"faes"},"Font Awesome 7 Graphite":{100:"fagt",normal:"fagt"},"Font Awesome 7 Chisel":{400:"facr",normal:"facr"},"Font Awesome 7 Whiteboard":{600:"fawsb",normal:"fawsb"},"Font Awesome 7 Utility":{600:"fausb",normal:"fausb"},"Font Awesome 7 Utility Duo":{600:"faudsb",normal:"faudsb"},"Font Awesome 7 Utility Fill":{600:"faufsb",normal:"faufsb"}},ye=new Map([["classic",{defaultShortPrefixId:"fas",defaultStyleId:"solid",styleIds:["solid","regular","light","thin","brands"],futureStyleIds:[],defaultFontWeight:900}],["duotone",{defaultShortPrefixId:"fad",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["sharp",{defaultShortPrefixId:"fass",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["sharp-duotone",{defaultShortPrefixId:"fasds",defaultStyleId:"solid",styleIds:["solid","regular","light","thin"],futureStyleIds:[],defaultFontWeight:900}],["chisel",{defaultShortPrefixId:"facr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["etch",{defaultShortPrefixId:"faes",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["graphite",{defaultShortPrefixId:"fagt",defaultStyleId:"thin",styleIds:["thin"],futureStyleIds:[],defaultFontWeight:100}],["jelly",{defaultShortPrefixId:"fajr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["jelly-duo",{defaultShortPrefixId:"fajdr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["jelly-fill",{defaultShortPrefixId:"fajfr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["mosaic",{defaultShortPrefixId:"fams",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["notdog",{defaultShortPrefixId:"fans",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["notdog-duo",{defaultShortPrefixId:"fands",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["pixel",{defaultShortPrefixId:"fapr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["slab",{defaultShortPrefixId:"faslr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["slab-duo",{defaultShortPrefixId:"fasldr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["slab-press",{defaultShortPrefixId:"faslpr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["slab-press-duo",{defaultShortPrefixId:"faslpdr",defaultStyleId:"regular",styleIds:["regular"],futureStyleIds:[],defaultFontWeight:400}],["thumbprint",{defaultShortPrefixId:"fatl",defaultStyleId:"light",styleIds:["light"],futureStyleIds:[],defaultFontWeight:300}],["utility",{defaultShortPrefixId:"fausb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["utility-duo",{defaultShortPrefixId:"faudsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["utility-fill",{defaultShortPrefixId:"faufsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}],["vellum",{defaultShortPrefixId:"favs",defaultStyleId:"solid",styleIds:["solid"],futureStyleIds:[],defaultFontWeight:900}],["whiteboard",{defaultShortPrefixId:"fawsb",defaultStyleId:"semibold",styleIds:["semibold"],futureStyleIds:[],defaultFontWeight:600}]]),xe={chisel:{regular:"facr"},classic:{brands:"fab",light:"fal",regular:"far",solid:"fas",thin:"fat"},duotone:{light:"fadl",regular:"fadr",solid:"fad",thin:"fadt"},etch:{solid:"faes"},graphite:{thin:"fagt"},jelly:{regular:"fajr"},"jelly-duo":{regular:"fajdr"},"jelly-fill":{regular:"fajfr"},mosaic:{solid:"fams"},notdog:{solid:"fans"},"notdog-duo":{solid:"fands"},pixel:{regular:"fapr"},sharp:{light:"fasl",regular:"fasr",solid:"fass",thin:"fast"},"sharp-duotone":{light:"fasdl",regular:"fasdr",solid:"fasds",thin:"fasdt"},slab:{regular:"faslr"},"slab-duo":{regular:"fasldr"},"slab-press":{regular:"faslpr"},"slab-press-duo":{regular:"faslpdr"},thumbprint:{light:"fatl"},utility:{semibold:"fausb"},"utility-duo":{semibold:"faudsb"},"utility-fill":{semibold:"faufsb"},vellum:{solid:"favs"},whiteboard:{semibold:"fawsb"}},at=["fak","fa-kit","fakd","fa-kit-duotone"],Qa={kit:{fak:"kit","fa-kit":"kit"},"kit-duotone":{fakd:"kit-duotone","fa-kit-duotone":"kit-duotone"}},ze=["kit"],we="kit",Se="kit-duotone",Ae="Kit",Le="Kit Duotone";d(d({},we,Ae),Se,Le);var ke={kit:{"fa-kit":"fak"}},Me={"Font Awesome Kit":{400:"fak",normal:"fak"},"Font Awesome Kit Duotone":{400:"fakd",normal:"fakd"}},Ce={kit:{fak:"fa-kit"}},Za={kit:{kit:"fak"},"kit-duotone":{"kit-duotone":"fakd"}},aa,na={GROUP:"duotone-group",SWAP_OPACITY:"swap-opacity",PRIMARY:"primary",SECONDARY:"secondary"},Ie=["fa-classic","fa-duotone","fa-sharp","fa-sharp-duotone","fa-thumbprint","fa-whiteboard","fa-notdog","fa-notdog-duo","fa-chisel","fa-etch","fa-graphite","fa-jelly","fa-jelly-fill","fa-jelly-duo","fa-slab","fa-slab-press","fa-slab-press-duo","fa-slab-duo","fa-mosaic","fa-pixel","fa-vellum","fa-utility","fa-utility-duo","fa-utility-fill"],Pe="classic",Ne="duotone",Fe="sharp",Ee="sharp-duotone",Oe="chisel",je="etch",Te="graphite",_e="jelly",$e="jelly-duo",De="jelly-fill",Re="mosaic",We="notdog",Ue="notdog-duo",Ye="pixel",Xe="slab",He="slab-duo",Ge="slab-press",Ve="slab-press-duo",Be="thumbprint",qe="utility",Je="utility-duo",Ke="utility-fill",Qe="vellum",Ze="whiteboard",ar="Classic",nr="Duotone",tr="Sharp",er="Sharp Duotone",rr="Chisel",ir="Etch",or="Graphite",sr="Jelly",lr="Jelly Duo",fr="Jelly Fill",cr="Mosaic",ur="Notdog",mr="Notdog Duo",dr="Pixel",gr="Slab",vr="Slab Duo",pr="Slab Press",hr="Slab Press Duo",br="Thumbprint",yr="Utility",xr="Utility Duo",zr="Utility Fill",wr="Vellum",Sr="Whiteboard";aa={},d(d(d(d(d(d(d(d(d(d(aa,Pe,ar),Ne,nr),Fe,tr),Ee,er),Oe,rr),je,ir),Te,or),_e,sr),$e,lr),De,fr),d(d(d(d(d(d(d(d(d(d(aa,Re,cr),We,ur),Ue,mr),Ye,dr),Xe,gr),He,vr),Ge,pr),Ve,hr),Be,br),qe,yr),d(d(d(d(aa,Je,xr),Ke,zr),Qe,wr),Ze,Sr);var Ar="kit",Lr="kit-duotone",kr="Kit",Mr="Kit Duotone";d(d({},Ar,kr),Lr,Mr);var Cr={classic:{"fa-brands":"fab","fa-duotone":"fad","fa-light":"fal","fa-regular":"far","fa-solid":"fas","fa-thin":"fat"},duotone:{"fa-regular":"fadr","fa-light":"fadl","fa-thin":"fadt"},sharp:{"fa-solid":"fass","fa-regular":"fasr","fa-light":"fasl","fa-thin":"fast"},"sharp-duotone":{"fa-solid":"fasds","fa-regular":"fasdr","fa-light":"fasdl","fa-thin":"fasdt"},slab:{"fa-regular":"faslr"},"slab-press":{"fa-regular":"faslpr"},"slab-duo":{"fa-regular":"fasldr"},"slab-press-duo":{"fa-regular":"faslpdr"},pixel:{"fa-regular":"fapr"},mosaic:{"fa-solid":"fams"},vellum:{"fa-solid":"favs"},whiteboard:{"fa-semibold":"fawsb"},thumbprint:{"fa-light":"fatl"},notdog:{"fa-solid":"fans"},"notdog-duo":{"fa-solid":"fands"},etch:{"fa-solid":"faes"},graphite:{"fa-thin":"fagt"},jelly:{"fa-regular":"fajr"},"jelly-fill":{"fa-regular":"fajfr"},"jelly-duo":{"fa-regular":"fajdr"},chisel:{"fa-regular":"facr"},utility:{"fa-semibold":"fausb"},"utility-duo":{"fa-semibold":"faudsb"},"utility-fill":{"fa-semibold":"faufsb"}},Ir={classic:["fas","far","fal","fat","fad"],duotone:["fadr","fadl","fadt"],sharp:["fass","fasr","fasl","fast"],"sharp-duotone":["fasds","fasdr","fasdl","fasdt"],slab:["faslr"],"slab-press":["faslpr"],"slab-duo":["fasldr"],"slab-press-duo":["faslpdr"],pixel:["fapr"],mosaic:["fams"],vellum:["favs"],whiteboard:["fawsb"],thumbprint:["fatl"],notdog:["fans"],"notdog-duo":["fands"],etch:["faes"],graphite:["fagt"],jelly:["fajr"],"jelly-fill":["fajfr"],"jelly-duo":["fajdr"],chisel:["facr"],utility:["fausb"],"utility-duo":["faudsb"],"utility-fill":["faufsb"]},za={classic:{fab:"fa-brands",fad:"fa-duotone",fal:"fa-light",far:"fa-regular",fas:"fa-solid",fat:"fa-thin"},duotone:{fadr:"fa-regular",fadl:"fa-light",fadt:"fa-thin"},sharp:{fass:"fa-solid",fasr:"fa-regular",fasl:"fa-light",fast:"fa-thin"},"sharp-duotone":{fasds:"fa-solid",fasdr:"fa-regular",fasdl:"fa-light",fasdt:"fa-thin"},slab:{faslr:"fa-regular"},"slab-press":{faslpr:"fa-regular"},"slab-duo":{fasldr:"fa-regular"},"slab-press-duo":{faslpdr:"fa-regular"},pixel:{fapr:"fa-regular"},mosaic:{fams:"fa-solid"},vellum:{favs:"fa-solid"},whiteboard:{fawsb:"fa-semibold"},thumbprint:{fatl:"fa-light"},notdog:{fans:"fa-solid"},"notdog-duo":{fands:"fa-solid"},etch:{faes:"fa-solid"},graphite:{fagt:"fa-thin"},jelly:{fajr:"fa-regular"},"jelly-fill":{fajfr:"fa-regular"},"jelly-duo":{fajdr:"fa-regular"},chisel:{facr:"fa-regular"},utility:{fausb:"fa-semibold"},"utility-duo":{faudsb:"fa-semibold"},"utility-fill":{faufsb:"fa-semibold"}},Pr=["fa-solid","fa-regular","fa-light","fa-thin","fa-duotone","fa-brands","fa-semibold"],nt=["fa","fas","far","fal","fat","fad","fadr","fadl","fadt","fab","fass","fasr","fasl","fast","fasds","fasdr","fasdl","fasdt","faslr","faslpr","fasldr","faslpdr","fapr","fams","favs","fawsb","fatl","fans","fands","faes","fagt","fajr","fajfr","fajdr","facr","fausb","faudsb","faufsb"].concat(Ie,Pr),Nr=["solid","regular","light","thin","duotone","brands","semibold"],tt=[1,2,3,4,5,6,7,8,9,10],Fr=tt.concat([11,12,13,14,15,16,17,18,19,20]),Er=["aw","fw","pull-left","pull-right"],Or=[].concat(M(Object.keys(Ir)),Nr,Er,["2xs","xs","sm","lg","xl","2xl","beat","beat-fade","border","bounce","buzz","canvas-square","canvas-roomy","fade","flip-360","flip-both","flip-horizontal","flip-vertical","flip","float","inverse","jello","layers","layers-bottom-left","layers-bottom-right","layers-counter","layers-text","layers-top-left","layers-top-right","li","pull-end","pull-start","pulse","rotate-180","rotate-270","rotate-90","rotate-by","shake","spin-pulse","spin-reverse","spin","spin-snap","spin-snap-4","spin-snap-8","stack-1x","stack-2x","stack","swing","ul","wag","width-auto","width-fixed",na.GROUP,na.SWAP_OPACITY,na.PRIMARY,na.SECONDARY]).concat(tt.map(function(a){return"".concat(a,"x")})).concat(Fr.map(function(a){return"w-".concat(a)})),jr={"Font Awesome 5 Free":{900:"fas",400:"far"},"Font Awesome 5 Pro":{900:"fas",400:"far",normal:"far",300:"fal"},"Font Awesome 5 Brands":{400:"fab",normal:"fab"},"Font Awesome 5 Duotone":{900:"fad"}},P="___FONT_AWESOME___",wa=16,et="fa",rt="svg-inline--fa",_="data-fa-i2svg",Sa="data-fa-pseudo-element",Tr="data-fa-pseudo-element-pending",_a="data-prefix",$a="data-icon",an="fontawesome-i2svg",_r="async",$r=["HTML","HEAD","STYLE","SCRIPT"],it=["::before","::after",":before",":after"],ot=function(){try{return!0}catch{return!1}}();function J(a){return new Proxy(a,{get:function(t,e){return e in t?t[e]:t[z]}})}var st=f({},In);st[z]=f(f(f(f({},{"fa-duotone":"duotone"}),In[z]),Qa.kit),Qa["kit-duotone"]);var Dr=J(st),Aa=f({},xe);Aa[z]=f(f(f(f({},{duotone:"fad"}),Aa[z]),Za.kit),Za["kit-duotone"]);var nn=J(Aa),La=f({},za);La[z]=f(f({},La[z]),Ce.kit);var Da=J(La),ka=f({},Cr);ka[z]=f(f({},ka[z]),ke.kit);J(ka);var Rr=Xt,lt="fa-layers-text",Wr=Ht,Ur=f({},he);J(Ur);var Yr=["class","data-prefix","data-icon","data-fa-transform","data-fa-mask"],va=Gt,Xr=[].concat(M(ze),M(Or)),G=E.FontAwesomeConfig||{};function Hr(a){var n=h.querySelector("script["+a+"]");if(n)return n.getAttribute(a)}function Gr(a){return a===""?!0:a==="false"?!1:a==="true"?!0:a}if(h&&typeof h.querySelector=="function"){var Vr=[["data-family-prefix","familyPrefix"],["data-css-prefix","cssPrefix"],["data-family-default","familyDefault"],["data-style-default","styleDefault"],["data-replacement-class","replacementClass"],["data-auto-replace-svg","autoReplaceSvg"],["data-auto-add-css","autoAddCss"],["data-search-pseudo-elements","searchPseudoElements"],["data-search-pseudo-elements-warnings","searchPseudoElementsWarnings"],["data-search-pseudo-elements-full-scan","searchPseudoElementsFullScan"],["data-observe-mutations","observeMutations"],["data-mutate-approach","mutateApproach"],["data-keep-original-source","keepOriginalSource"],["data-measure-performance","measurePerformance"],["data-show-missing-icons","showMissingIcons"]];Vr.forEach(function(a){var n=la(a,2),t=n[0],e=n[1],r=Gr(Hr(t));r!=null&&(G[e]=r)})}var ft={styleDefault:"solid",familyDefault:z,cssPrefix:et,replacementClass:rt,autoReplaceSvg:!0,autoAddCss:!0,searchPseudoElements:!1,searchPseudoElementsWarnings:!0,searchPseudoElementsFullScan:!1,observeMutations:!0,mutateApproach:"async",keepOriginalSource:!0,measurePerformance:!1,showMissingIcons:!0};G.familyPrefix&&(G.cssPrefix=G.familyPrefix);var Y=f(f({},ft),G);Y.autoReplaceSvg||(Y.observeMutations=!1);var m={};Object.keys(ft).forEach(function(a){Object.defineProperty(m,a,{enumerable:!0,set:function(t){Y[a]=t,V.forEach(function(e){return e(m)})},get:function(){return Y[a]}})});Object.defineProperty(m,"familyPrefix",{enumerable:!0,set:function(n){Y.cssPrefix=n,V.forEach(function(t){return t(m)})},get:function(){return Y.cssPrefix}});E.FontAwesomeConfig=m;var V=[];function Br(a){return V.push(a),function(){V.splice(V.indexOf(a),1)}}var R=wa,C={size:16,x:0,y:0,rotate:0,flipX:!1,flipY:!1};function qr(a){if(!(!a||!F)){var n=h.createElement("style");n.setAttribute("type","text/css"),n.innerHTML=a;for(var t=h.head.childNodes,e=null,r=t.length-1;r>-1;r--){var o=t[r],i=(o.tagName||"").toUpperCase();["STYLE","LINK"].indexOf(i)>-1&&(e=o)}return h.head.insertBefore(n,e),a}}var Jr="0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";function tn(){for(var a=12,n="";a-- >0;)n+=Jr[Math.random()*62|0];return n}function X(a){for(var n=[],t=(a||[]).length>>>0;t--;)n[t]=a[t];return n}function Ra(a){return a.classList?X(a.classList):(a.getAttribute("class")||"").split(" ").filter(function(n){return n})}function ct(a){return"".concat(a).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}function Kr(a){return Object.keys(a||{}).reduce(function(n,t){return n+"".concat(t,'="').concat(ct(a[t]),'" ')},"").trim()}function fa(a){return Object.keys(a||{}).reduce(function(n,t){return n+"".concat(t,": ").concat(a[t].trim(),";")},"")}function Wa(a){return a.size!==C.size||a.x!==C.x||a.y!==C.y||a.rotate!==C.rotate||a.flipX||a.flipY}function Qr(a){var n=a.transform,t=a.containerWidth,e=a.iconWidth,r={transform:"translate(".concat(t/2," 256)")},o="translate(".concat(n.x*32,", ").concat(n.y*32,") "),i="scale(".concat(n.size/16*(n.flipX?-1:1),", ").concat(n.size/16*(n.flipY?-1:1),") "),s="rotate(".concat(n.rotate," 0 0)"),l={transform:"".concat(o," ").concat(i," ").concat(s)},c={transform:"translate(".concat(e/2*-1," -256)")};return{outer:r,inner:l,path:c}}function Zr(a){var n=a.transform,t=a.width,e=t===void 0?wa:t,r=a.height,o=r===void 0?wa:r,i="";return Cn?i+="translate(".concat(n.x/R-e/2,"em, ").concat(n.y/R-o/2,"em) "):i+="translate(calc(-50% + ".concat(n.x/R,"em), calc(-50% + ").concat(n.y/R,"em)) "),i+="scale(".concat(n.size/R*(n.flipX?-1:1),", ").concat(n.size/R*(n.flipY?-1:1),") "),i+="rotate(".concat(n.rotate,"deg) "),i}var ai=`:root, :host {
  --fa-font-solid: normal 900 1em/1 'Font Awesome 7 Free';
  --fa-font-regular: normal 400 1em/1 'Font Awesome 7 Free';
  --fa-font-light: normal 300 1em/1 'Font Awesome 7 Pro';
  --fa-font-thin: normal 100 1em/1 'Font Awesome 7 Pro';
  --fa-font-duotone: normal 900 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-regular: normal 400 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-light: normal 300 1em/1 'Font Awesome 7 Duotone';
  --fa-font-duotone-thin: normal 100 1em/1 'Font Awesome 7 Duotone';
  --fa-font-brands: normal 400 1em/1 'Font Awesome 7 Brands';
  --fa-font-sharp-solid: normal 900 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-regular: normal 400 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-light: normal 300 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-thin: normal 100 1em/1 'Font Awesome 7 Sharp';
  --fa-font-sharp-duotone-solid: normal 900 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-regular: normal 400 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-light: normal 300 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-sharp-duotone-thin: normal 100 1em/1 'Font Awesome 7 Sharp Duotone';
  --fa-font-slab-regular: normal 400 1em/1 'Font Awesome 7 Slab';
  --fa-font-slab-press-regular: normal 400 1em/1 'Font Awesome 7 Slab Press';
  --fa-font-slab-duo-regular: normal 400 1em/1 'Font Awesome 7 Slab Duo';
  --fa-font-slab-press-duo-regular: normal 400 1em/1 'Font Awesome 7 Slab Press Duo';
  --fa-font-pixel-regular: normal 400 1em/1 'Font Awesome 7 Pixel';
  --fa-font-mosaic-solid: normal 900 1em/1 'Font Awesome 7 Mosaic';
  --fa-font-vellum-solid: normal 900 1em/1 'Font Awesome 7 Vellum';
  --fa-font-whiteboard-semibold: normal 600 1em/1 'Font Awesome 7 Whiteboard';
  --fa-font-thumbprint-light: normal 300 1em/1 'Font Awesome 7 Thumbprint';
  --fa-font-notdog-solid: normal 900 1em/1 'Font Awesome 7 Notdog';
  --fa-font-notdog-duo-solid: normal 900 1em/1 'Font Awesome 7 Notdog Duo';
  --fa-font-etch-solid: normal 900 1em/1 'Font Awesome 7 Etch';
  --fa-font-graphite-thin: normal 100 1em/1 'Font Awesome 7 Graphite';
  --fa-font-jelly-regular: normal 400 1em/1 'Font Awesome 7 Jelly';
  --fa-font-jelly-fill-regular: normal 400 1em/1 'Font Awesome 7 Jelly Fill';
  --fa-font-jelly-duo-regular: normal 400 1em/1 'Font Awesome 7 Jelly Duo';
  --fa-font-chisel-regular: normal 400 1em/1 'Font Awesome 7 Chisel';
  --fa-font-utility-semibold: normal 600 1em/1 'Font Awesome 7 Utility';
  --fa-font-utility-duo-semibold: normal 600 1em/1 'Font Awesome 7 Utility Duo';
  --fa-font-utility-fill-semibold: normal 600 1em/1 'Font Awesome 7 Utility Fill';
}

.svg-inline--fa {
  box-sizing: content-box;
  display: var(--fa-display, inline-block);
  height: 1em;
  overflow: visible;
  vertical-align: -0.125em;
  width: var(--fa-width, 1.25em);
}
.svg-inline--fa.fa-2xs {
  vertical-align: 0.1em;
}
.svg-inline--fa.fa-xs {
  vertical-align: 0em;
}
.svg-inline--fa.fa-sm {
  vertical-align: -0.0714285714em;
}
.svg-inline--fa.fa-lg {
  vertical-align: -0.2em;
}
.svg-inline--fa.fa-xl {
  vertical-align: -0.25em;
}
.svg-inline--fa.fa-2xl {
  vertical-align: -0.3125em;
}
.svg-inline--fa.fa-pull-left,
.svg-inline--fa .fa-pull-start {
  float: inline-start;
  margin-inline-end: var(--fa-pull-margin, 0.3em);
}
.svg-inline--fa.fa-pull-right,
.svg-inline--fa .fa-pull-end {
  float: inline-end;
  margin-inline-start: var(--fa-pull-margin, 0.3em);
}
.svg-inline--fa.fa-li {
  width: var(--fa-li-width, 2em);
  inset-inline-start: calc(-1 * var(--fa-li-width, 2em));
  inset-block-start: 0.25em; /* syncing vertical alignment with Web Font rendering */
}

.fa-layers-counter, .fa-layers-text {
  display: inline-block;
  position: absolute;
  text-align: center;
}

.fa-layers {
  display: inline-block;
  height: 1em;
  position: relative;
  text-align: center;
  vertical-align: -0.125em;
  width: var(--fa-width, 1.25em);
}
.fa-layers .svg-inline--fa {
  inset: 0;
  margin: auto;
  position: absolute;
  transform-origin: center center;
}

.fa-layers-text {
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.fa-layers-counter {
  background-color: var(--fa-counter-background-color, #ff253a);
  border-radius: var(--fa-counter-border-radius, 1em);
  box-sizing: border-box;
  color: var(--fa-inverse, #fff);
  line-height: var(--fa-counter-line-height, 1);
  max-width: var(--fa-counter-max-width, 5em);
  min-width: var(--fa-counter-min-width, 1.5em);
  overflow: hidden;
  padding: var(--fa-counter-padding, 0.25em 0.5em);
  right: var(--fa-right, 0);
  text-overflow: ellipsis;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-counter-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-bottom-right {
  bottom: var(--fa-bottom, 0);
  right: var(--fa-right, 0);
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom right;
}

.fa-layers-bottom-left {
  bottom: var(--fa-bottom, 0);
  left: var(--fa-left, 0);
  right: auto;
  top: auto;
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: bottom left;
}

.fa-layers-top-right {
  top: var(--fa-top, 0);
  right: var(--fa-right, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top right;
}

.fa-layers-top-left {
  left: var(--fa-left, 0);
  right: auto;
  top: var(--fa-top, 0);
  transform: scale(var(--fa-layers-scale, 0.25));
  transform-origin: top left;
}

.fa-1x {
  font-size: 1em;
}

.fa-2x {
  font-size: 2em;
}

.fa-3x {
  font-size: 3em;
}

.fa-4x {
  font-size: 4em;
}

.fa-5x {
  font-size: 5em;
}

.fa-6x {
  font-size: 6em;
}

.fa-7x {
  font-size: 7em;
}

.fa-8x {
  font-size: 8em;
}

.fa-9x {
  font-size: 9em;
}

.fa-10x {
  font-size: 10em;
}

.fa-2xs {
  font-size: calc(10 / 16 * 1em); /* converts a 10px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 10 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 10 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-xs {
  font-size: calc(12 / 16 * 1em); /* converts a 12px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 12 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 12 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-sm {
  font-size: calc(14 / 16 * 1em); /* converts a 14px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 14 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 14 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-lg {
  font-size: calc(20 / 16 * 1em); /* converts a 20px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 20 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 20 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-xl {
  font-size: calc(24 / 16 * 1em); /* converts a 24px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 24 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 24 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-2xl {
  font-size: calc(32 / 16 * 1em); /* converts a 32px size into an em-based value that's relative to the scale's 16px base */
  line-height: calc(1 / 32 * 1em); /* sets the line-height of the icon back to that of it's parent */
  vertical-align: calc((6 / 32 - 0.375) * 1em); /* vertically centers the icon taking into account the surrounding text's descender */
}

.fa-width-auto {
  --fa-width: auto;
}

.fa-fw,
.fa-width-fixed {
  --fa-width: 1.25em;
}

.fa-canvas-square {
  padding-block: 0.125em;
  margin-block-end: -0.125em;
}

.fa-canvas-roomy {
  padding-block: 0.25em;
  padding-inline: 0.125em;
  margin-block-end: -0.25em;
  box-sizing: content-box;
}

.fa-ul {
  list-style-type: none;
  margin-inline-start: var(--fa-li-margin, 2.5em);
  padding-inline-start: 0;
}
.fa-ul > li {
  position: relative;
}

.fa-li {
  inset-inline-start: calc(-1 * var(--fa-li-width, 2em));
  position: absolute;
  text-align: center;
  width: var(--fa-li-width, 2em);
  line-height: inherit;
}

/* Heads Up: Bordered Icons will not be supported in the future!
  - This feature will be deprecated in the next major release of Font Awesome (v8)!
  - You may continue to use it in this version *v7), but it will not be supported in Font Awesome v8.
*/
/* Notes:
* --@{v.$css-prefix}-border-width = 1/16 by default (to render as ~1px based on a 16px default font-size)
* --@{v.$css-prefix}-border-padding =
  ** 3/16 for vertical padding (to give ~2px of vertical whitespace around an icon considering it's vertical alignment)
  ** 4/16 for horizontal padding (to give ~4px of horizontal whitespace around an icon)
*/
.fa-border {
  border-color: var(--fa-border-color, #eee);
  border-radius: var(--fa-border-radius, 0.1em);
  border-style: var(--fa-border-style, solid);
  border-width: var(--fa-border-width, 0.0625em);
  box-sizing: var(--fa-border-box-sizing, content-box);
  padding: var(--fa-border-padding, 0.1875em 0.25em);
}

.fa-pull-left,
.fa-pull-start {
  float: inline-start;
  margin-inline-end: var(--fa-pull-margin, 0.3em);
}

.fa-pull-right,
.fa-pull-end {
  float: inline-end;
  margin-inline-start: var(--fa-pull-margin, 0.3em);
}

.fa-beat {
  animation-name: fa-beat;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-bounce {
  animation-name: fa-bounce;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, cubic-bezier(0.28, 0.84, 0.42, 1));
}

.fa-fade {
  animation-name: fa-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-beat-fade {
  animation-name: fa-beat-fade;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-flip {
  animation-name: fa-flip;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1.5s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-flip-360 {
  animation-name: fa-flip-360;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-shake {
  animation-name: fa-shake;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 0.75s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
}

.fa-spin {
  animation-name: fa-spin;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 2s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-reverse {
  --fa-animation-direction: reverse;
}

.fa-pulse,
.fa-spin-pulse {
  animation-name: fa-spin;
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, steps(8));
}

.fa-spin-snap {
  animation-name: fa-spin-snap;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 3s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-snap-4 {
  animation-name: fa-spin-snap-4;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 2.4s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-spin-snap-8 {
  animation-name: fa-spin-snap-8;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 4s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-buzz {
  animation-name: fa-buzz;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 0.6s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, linear);
}

.fa-wag {
  animation-name: fa-wag;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 0.9s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-out);
  transform-origin: bottom center;
}

.fa-float {
  animation-name: fa-float;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 3s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-in-out);
  will-change: transform;
}

.fa-swing {
  animation-name: fa-swing;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 1.2s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-out);
  transform-origin: top center;
}

.fa-jello {
  animation-name: fa-jello;
  animation-delay: var(--fa-animation-delay, 0s);
  animation-direction: var(--fa-animation-direction, normal);
  animation-duration: var(--fa-animation-duration, 0.9s);
  animation-iteration-count: var(--fa-animation-iteration-count, infinite);
  animation-timing-function: var(--fa-animation-timing, ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .fa-beat,
  .fa-bounce,
  .fa-fade,
  .fa-beat-fade,
  .fa-flip,
  .fa-flip-360,
  .fa-pulse,
  .fa-shake,
  .fa-spin,
  .fa-spin-pulse,
  .fa-buzz,
  .fa-float,
  .fa-jello,
  .fa-spin-snap,
  .fa-spin-snap-4,
  .fa-spin-snap-8,
  .fa-swing,
  .fa-wag {
    animation: none !important;
    transition: none !important;
  }
}
@keyframes fa-beat {
  0% {
    transform: scale(1);
  }
  25% {
    transform: scale(calc(1.25 * var(--fa-beat-scale, 1.25)));
  }
  45% {
    transform: scale(calc(1.22 * var(--fa-beat-scale, 1.22)));
  }
  65% {
    transform: scale(calc(1.25 * var(--fa-beat-scale, 1.25)));
  }
  90% {
    transform: scale(1);
  }
}
@keyframes fa-bounce {
  0% {
    transform: scale(1, 1) translateY(0);
    animation-timing-function: var(--fa-animation-timing);
  }
  14% {
    transform: scale(var(--fa-bounce-start-scale-x, 1.06), var(--fa-bounce-start-scale-y, 0.94)) translateY(var(--fa-bounce-anticipation, 3px));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
  }
  32% {
    transform: scale(var(--fa-bounce-jump-scale-x, 0.94), var(--fa-bounce-jump-scale-y, 1.12)) translateY(calc(-1 * var(--fa-bounce-height, 0.5em)));
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
  }
  52% {
    transform: scale(1, 1) translateY(calc(-1 * var(--fa-bounce-height, 0.5em) * 1.1));
    animation-timing-function: cubic-bezier(0.5, 0, 1, 0.5);
  }
  70% {
    transform: scale(var(--fa-bounce-land-scale-x, 1.06), var(--fa-bounce-land-scale-y, 0.92)) translateY(0);
    animation-timing-function: cubic-bezier(0.33, 0.33, 0.66, 1);
  }
  85% {
    transform: scale(0.98, 1.04) translateY(calc(-2px * var(--fa-bounce-rebound, 1)));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 1);
  }
  100% {
    transform: scale(1, 1) translateY(0);
  }
}
@keyframes fa-fade {
  0% {
    opacity: 1;
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.2, 0, 0.4, 1);
  }
  40% {
    opacity: var(--fa-fade-opacity, 0.4);
    transform: scale(0.98);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
@keyframes fa-beat-fade {
  0% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    transform: scale(1);
    animation-timing-function: cubic-bezier(0.2, 0, 0.4, 1);
  }
  25% {
    opacity: calc(var(--fa-beat-fade-opacity, 0.4) + 0.4);
    transform: scale(var(--fa-beat-fade-scale, 1.28));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  45% {
    opacity: 1;
    transform: scale(var(--fa-beat-fade-scale, 1.25));
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  65% {
    opacity: calc(var(--fa-beat-fade-opacity, 0.4) + 0.4);
    transform: scale(var(--fa-beat-fade-scale, 1.28));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  100% {
    opacity: var(--fa-beat-fade-opacity, 0.4);
    transform: scale(1);
  }
}
@keyframes fa-flip {
  0% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), 0deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.4, 1);
  }
  8% {
    transform: perspective(2em) scale(var(--fa-flip-anticipation-scale, 0.95)) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), 0deg);
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
  }
  35% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), calc(var(--fa-flip-angle, -360deg) * 0.6));
    animation-timing-function: linear;
  }
  65% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), calc(var(--fa-flip-angle, -360deg) * 0.5));
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
  }
  92% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), calc(var(--fa-flip-angle, -360deg) * var(--fa-flip-overshoot, 1.04)));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 1);
  }
  100% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -360deg));
  }
}
@keyframes fa-flip-360 {
  0% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), 0deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.4, 1);
  }
  8% {
    transform: perspective(2em) scale(var(--fa-flip-anticipation-scale, 0.95)) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), 0deg);
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
  }
  50% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), calc(var(--fa-flip-angle, -360deg) * 0.6));
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
  }
  80% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), calc(var(--fa-flip-angle, -360deg) * var(--fa-flip-overshoot, 1.04)));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 1);
  }
  100% {
    transform: perspective(2em) scale(1) rotate3d(var(--fa-flip-x, 0), var(--fa-flip-y, 1), var(--fa-flip-z, 0), var(--fa-flip-angle, -360deg));
  }
}
@keyframes fa-shake {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.8, 1);
  }
  8% {
    transform: rotate(35deg) translateX(1px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  20% {
    transform: rotate(-22deg) translateX(-1px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  35% {
    transform: rotate(15deg) translateX(1px);
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  50% {
    transform: rotate(-9deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  65% {
    transform: rotate(5deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  78% {
    transform: rotate(-3deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  90% {
    transform: rotate(1deg);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes fa-spin-snap {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  12% {
    transform: rotate(60deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  16.67% {
    transform: rotate(60deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  28.67% {
    transform: rotate(120deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  33.33% {
    transform: rotate(120deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  45.33% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  62% {
    transform: rotate(240deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  66.67% {
    transform: rotate(240deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  78.67% {
    transform: rotate(300deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  83.33% {
    transform: rotate(300deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  95.33% {
    transform: rotate(360deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes fa-spin-snap-4 {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  15% {
    transform: rotate(90deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  25% {
    transform: rotate(90deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  40% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  65% {
    transform: rotate(270deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  75% {
    transform: rotate(270deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  90% {
    transform: rotate(360deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes fa-spin-snap-8 {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  9% {
    transform: rotate(45deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  12.5% {
    transform: rotate(45deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  21.5% {
    transform: rotate(90deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  25% {
    transform: rotate(90deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  34% {
    transform: rotate(135deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  37.5% {
    transform: rotate(135deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  46.5% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  50% {
    transform: rotate(180deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  59% {
    transform: rotate(225deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  62.5% {
    transform: rotate(225deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  71.5% {
    transform: rotate(270deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  75% {
    transform: rotate(270deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  84% {
    transform: rotate(315deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  87.5% {
    transform: rotate(315deg);
    animation-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
  96.5% {
    transform: rotate(360deg);
    animation-timing-function: cubic-bezier(0.8, 0, 1, 1);
  }
  100% {
    transform: rotate(360deg);
  }
}
@keyframes fa-buzz {
  0% {
    transform: translateX(0) rotate(0deg);
    animation-timing-function: cubic-bezier(0.1, 0, 0.9, 1);
  }
  5% {
    transform: translateX(var(--fa-buzz-distance, 4px)) rotate(0.5deg);
  }
  10% {
    transform: translateX(calc(-1 * var(--fa-buzz-distance, 4px))) rotate(-0.5deg);
  }
  15% {
    transform: translateX(var(--fa-buzz-distance, 4px)) rotate(0.3deg);
  }
  20% {
    transform: translateX(calc(-1 * var(--fa-buzz-distance, 4px))) rotate(-0.3deg);
  }
  25% {
    transform: translateX(calc(var(--fa-buzz-distance, 4px) * 0.7)) rotate(0.2deg);
  }
  30% {
    transform: translateX(calc(-1 * var(--fa-buzz-distance, 4px) * 0.7)) rotate(-0.2deg);
  }
  35% {
    transform: translateX(calc(var(--fa-buzz-distance, 4px) * 0.4)) rotate(0.1deg);
  }
  40% {
    transform: translateX(0) rotate(0deg);
  }
  100% {
    transform: translateX(0) rotate(0deg);
  }
}
@keyframes fa-wag {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
  }
  12% {
    transform: rotate(var(--fa-wag-angle, 12deg));
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  24% {
    transform: rotate(2deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
  }
  36% {
    transform: rotate(calc(var(--fa-wag-angle, 12deg) * 0.85));
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  48% {
    transform: rotate(1deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.6, 1);
  }
  58% {
    transform: rotate(calc(var(--fa-wag-angle, 12deg) * 0.6));
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  68% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-float {
  0% {
    transform: translateY(0) translateX(0) rotate(0deg) scale(var(--fa-float-squash-x, 1.02), var(--fa-float-squash-y, 0.98));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
  }
  15% {
    transform: translateY(calc(-0.4 * var(--fa-float-height, 6px))) translateX(var(--fa-float-drift, 1px)) rotate(var(--fa-float-tilt, 1deg)) scale(1, 1);
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
  }
  35% {
    transform: translateY(calc(-1 * var(--fa-float-height, 6px))) translateX(0) rotate(0deg) scale(var(--fa-float-stretch-x, 0.98), var(--fa-float-stretch-y, 1.03));
    animation-timing-function: cubic-bezier(0.5, 0, 0.5, 0);
  }
  50% {
    transform: translateY(calc(-0.92 * var(--fa-float-height, 6px))) translateX(calc(-0.5 * var(--fa-float-drift, 1px))) rotate(calc(-0.5 * var(--fa-float-tilt, 1deg))) scale(0.995, 1.01);
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 0.33);
  }
  70% {
    transform: translateY(calc(-0.3 * var(--fa-float-height, 6px))) translateX(calc(-1 * var(--fa-float-drift, 1px))) rotate(calc(-1 * var(--fa-float-tilt, 1deg))) scale(1, 1);
    animation-timing-function: cubic-bezier(0.33, 0.66, 0.66, 1);
  }
  90% {
    transform: translateY(calc(0.05 * var(--fa-float-height, 6px))) translateX(0) rotate(0deg) scale(var(--fa-float-squash-x, 1.02), var(--fa-float-squash-y, 0.98));
    animation-timing-function: cubic-bezier(0.33, 0, 0.66, 1);
  }
  100% {
    transform: translateY(0) translateX(0) rotate(0deg) scale(var(--fa-float-squash-x, 1.02), var(--fa-float-squash-y, 0.98));
  }
}
@keyframes fa-swing {
  0% {
    transform: rotate(0deg);
    animation-timing-function: cubic-bezier(0.2, 0, 0.8, 1);
  }
  8% {
    transform: rotate(var(--fa-swing-angle, 22deg));
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  18% {
    transform: rotate(calc(-1 * var(--fa-swing-angle, 22deg) * 0.85));
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  28% {
    transform: rotate(calc(var(--fa-swing-angle, 22deg) * 0.65));
    animation-timing-function: cubic-bezier(0.35, 0, 0.65, 1);
  }
  38% {
    transform: rotate(calc(-1 * var(--fa-swing-angle, 22deg) * 0.45));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  48% {
    transform: rotate(calc(var(--fa-swing-angle, 22deg) * 0.25));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  56% {
    transform: rotate(calc(-1 * var(--fa-swing-angle, 22deg) * 0.1));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  64% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(0deg);
  }
}
@keyframes fa-jello {
  0% {
    transform: scale(1, 1);
    animation-timing-function: cubic-bezier(0.2, 0, 0.8, 1);
  }
  12% {
    transform: scale(var(--fa-jello-scale-x, 1.15), calc(2 - var(--fa-jello-scale-x, 1.15)));
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  24% {
    transform: scale(calc(2 - var(--fa-jello-scale-y, 1.12)), var(--fa-jello-scale-y, 1.12));
    animation-timing-function: cubic-bezier(0.3, 0, 0.7, 1);
  }
  36% {
    transform: scale(calc(1 + (var(--fa-jello-scale-x, 1.15) - 1) * 0.5), calc(2 - (1 + (var(--fa-jello-scale-x, 1.15) - 1) * 0.5)));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  48% {
    transform: scale(calc(2 - (1 + (var(--fa-jello-scale-y, 1.12) - 1) * 0.3)), calc(1 + (var(--fa-jello-scale-y, 1.12) - 1) * 0.3));
    animation-timing-function: cubic-bezier(0.4, 0, 0.6, 1);
  }
  58% {
    transform: scale(1.02, 0.98);
    animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  68% {
    transform: scale(1, 1);
  }
  100% {
    transform: scale(1, 1);
  }
}
.fa-rotate-90 {
  transform: rotate(90deg);
}

.fa-rotate-180 {
  transform: rotate(180deg);
}

.fa-rotate-270 {
  transform: rotate(270deg);
}

.fa-flip-horizontal {
  transform: scale(-1, 1);
}

.fa-flip-vertical {
  transform: scale(1, -1);
}

.fa-flip-both,
.fa-flip-horizontal.fa-flip-vertical {
  transform: scale(-1, -1);
}

.fa-rotate-by {
  transform: rotate(var(--fa-rotate-angle, 0));
}

.svg-inline--fa .fa-primary {
  fill: var(--fa-primary-color, currentColor);
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa .fa-secondary {
  fill: var(--fa-secondary-color, currentColor);
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-primary {
  opacity: var(--fa-secondary-opacity, 0.4);
}

.svg-inline--fa.fa-swap-opacity .fa-secondary {
  opacity: var(--fa-primary-opacity, 1);
}

.svg-inline--fa mask .fa-primary,
.svg-inline--fa mask .fa-secondary {
  fill: black;
}

.svg-inline--fa.fa-inverse {
  fill: var(--fa-inverse, #fff);
}

.fa-stack {
  display: inline-block;
  height: 2em;
  line-height: 2em;
  position: relative;
  vertical-align: middle;
  width: 2.5em;
}

.fa-inverse {
  color: var(--fa-inverse, #fff);
}

.svg-inline--fa.fa-stack-1x {
  --fa-width: 1.25em;
  height: 1em;
  width: var(--fa-width);
}
.svg-inline--fa.fa-stack-2x {
  --fa-width: 2.5em;
  height: 2em;
  width: var(--fa-width);
}

.fa-stack-1x,
.fa-stack-2x {
  inset: 0;
  margin: auto;
  position: absolute;
  z-index: var(--fa-stack-z-index, auto);
}`;function ut(){var a=et,n=rt,t=m.cssPrefix,e=m.replacementClass,r=ai;if(t!==a||e!==n){var o=new RegExp("\\.".concat(a,"\\-"),"g"),i=new RegExp("\\--".concat(a,"\\-"),"g"),s=new RegExp("\\.".concat(n),"g");r=r.replace(o,".".concat(t,"-")).replace(i,"--".concat(t,"-")).replace(s,".".concat(e))}return r}var en=!1;function pa(){m.autoAddCss&&!en&&(qr(ut()),en=!0)}var ni={mixout:function(){return{dom:{css:ut,insertCss:pa}}},hooks:function(){return{beforeDOMElementCreation:function(){pa()},beforeI2svg:function(){pa()}}}},N=E||{};N[P]||(N[P]={});N[P].styles||(N[P].styles={});N[P].hooks||(N[P].hooks={});N[P].shims||(N[P].shims=[]);var k=N[P],mt=[],dt=function(){h.removeEventListener("DOMContentLoaded",dt),oa=1,mt.map(function(n){return n()})},oa=!1;F&&(oa=(h.documentElement.doScroll?/^loaded|^c/:/^loaded|^i|^c/).test(h.readyState),oa||h.addEventListener("DOMContentLoaded",dt));function ti(a){F&&(oa?setTimeout(a,0):mt.push(a))}function K(a){var n=a.tag,t=a.attributes,e=t===void 0?{}:t,r=a.children,o=r===void 0?[]:r;return typeof a=="string"?ct(a):"<".concat(n," ").concat(Kr(e),">").concat(o.map(K).join(""),"</").concat(n,">")}function rn(a,n,t){if(a&&a[n]&&a[n][t])return{prefix:n,iconName:t,icon:a[n][t]}}var ha=function(n,t,e,r){var o=Object.keys(n),i=o.length,s=t,l,c,g;for(e===void 0?(l=1,g=n[o[0]]):(l=0,g=e);l<i;l++)c=o[l],g=s(g,n[c],c,n);return g};function gt(a){return M(a).length!==1?null:a.codePointAt(0).toString(16)}function on(a){return Object.keys(a).reduce(function(n,t){var e=a[t],r=!!e.icon;return r?n[e.iconName]=e.icon:n[t]=e,n},{})}function Ma(a,n){var t=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},e=t.skipHooks,r=e===void 0?!1:e,o=on(n);typeof k.hooks.addPack=="function"&&!r?k.hooks.addPack(a,on(n)):k.styles[a]=f(f({},k.styles[a]||{}),o),a==="fas"&&Ma("fa",n)}var B=k.styles,ei=k.shims,vt=Object.keys(Da),ri=vt.reduce(function(a,n){return a[n]=Object.keys(Da[n]),a},{}),Ua=null,pt={},ht={},bt={},yt={},xt={};function ii(a){return~Xr.indexOf(a)}function oi(a,n){var t=n.split("-"),e=t[0],r=t.slice(1).join("-");return e===a&&r!==""&&!ii(r)?r:null}var zt=function(){var n=function(o){return ha(B,function(i,s,l){return i[l]=ha(s,o,{}),i},{})};pt=n(function(r,o,i){if(o[3]&&(r[o[3]]=i),o[2]){var s=o[2].filter(function(l){return typeof l=="number"});s.forEach(function(l){r[l.toString(16)]=i})}return r}),ht=n(function(r,o,i){if(r[i]=i,o[2]){var s=o[2].filter(function(l){return typeof l=="string"});s.forEach(function(l){r[l]=i})}return r}),xt=n(function(r,o,i){var s=o[2];return r[i]=i,s.forEach(function(l){r[l]=i}),r});var t="far"in B||m.autoFetchSvg,e=ha(ei,function(r,o){var i=o[0],s=o[1],l=o[2];return s==="far"&&!t&&(s="fas"),typeof i=="string"&&(r.names[i]={prefix:s,iconName:l}),typeof i=="number"&&(r.unicodes[i.toString(16)]={prefix:s,iconName:l}),r},{names:{},unicodes:{}});bt=e.names,yt=e.unicodes,Ua=ca(m.styleDefault,{family:m.familyDefault})};Br(function(a){Ua=ca(a.styleDefault,{family:m.familyDefault})});zt();function Ya(a,n){return(pt[a]||{})[n]}function si(a,n){return(ht[a]||{})[n]}function T(a,n){return(xt[a]||{})[n]}function wt(a){return bt[a]||{prefix:null,iconName:null}}function li(a){var n=yt[a],t=Ya("fas",a);return n||(t?{prefix:"fas",iconName:t}:null)||{prefix:null,iconName:null}}function O(){return Ua}var St=function(){return{prefix:null,iconName:null,rest:[]}};function fi(a){var n=z,t=vt.reduce(function(e,r){return e[r]="".concat(m.cssPrefix,"-").concat(r),e},{});return Zn.forEach(function(e){(a.includes(t[e])||a.some(function(r){return ri[e].includes(r)}))&&(n=e)}),n}function ca(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},t=n.family,e=t===void 0?z:t,r=Dr[e][a];if(e===q&&!a)return"fad";var o=nn[e][a]||nn[e][r],i=a in k.styles?a:null,s=o||i||null;return s}function ci(a){var n=[],t=null;return a.forEach(function(e){var r=oi(m.cssPrefix,e);r?t=r:e&&n.push(e)}),{iconName:t,rest:n}}function sn(a){return a.sort().filter(function(n,t,e){return e.indexOf(n)===t})}var ln=nt.concat(at);function ua(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},t=n.skipLookups,e=t===void 0?!1:t,r=null,o=sn(a.filter(function(v){return ln.includes(v)})),i=sn(a.filter(function(v){return!ln.includes(v)})),s=o.filter(function(v){return r=v,!Pn.includes(v)}),l=la(s,1),c=l[0],g=c===void 0?null:c,u=fi(o),p=f(f({},ci(i)),{},{prefix:ca(g,{family:u})});return f(f(f({},p),gi({values:a,family:u,styles:B,config:m,canonical:p,givenPrefix:r})),ui(e,r,p))}function ui(a,n,t){var e=t.prefix,r=t.iconName;if(a||!e||!r)return{prefix:e,iconName:r};var o=n==="fa"?wt(r):{},i=T(e,r);return r=o.iconName||i||r,e=o.prefix||e,e==="far"&&!B.far&&B.fas&&!m.autoFetchSvg&&(e="fas"),{prefix:e,iconName:r}}var mi=Zn.filter(function(a){return a!==z||a!==q}),di=Object.keys(za).filter(function(a){return a!==z}).map(function(a){return Object.keys(za[a])}).flat();function gi(a){var n=a.values,t=a.family,e=a.canonical,r=a.givenPrefix,o=r===void 0?"":r,i=a.styles,s=i===void 0?{}:i,l=a.config,c=l===void 0?{}:l,g=t===q,u=n.includes("fa-duotone")||n.includes("fad"),p=c.familyDefault==="duotone",v=e.prefix==="fad"||e.prefix==="fa-duotone";if(!g&&(u||p||v)&&(e.prefix="fad"),(n.includes("fa-brands")||n.includes("fab"))&&(e.prefix="fab"),!e.prefix&&mi.includes(t)){var y=Object.keys(s).find(function(w){return di.includes(w)});if(y||c.autoFetchSvg){var b=ye.get(t).defaultShortPrefixId;e.prefix=b,e.iconName=T(e.prefix,e.iconName)||e.iconName}}return(e.prefix==="fa"||o==="fa")&&(e.prefix=O()||"fas"),e}var vi=function(){function a(){jt(this,a),this.definitions={}}return _t(a,[{key:"add",value:function(){for(var t=this,e=arguments.length,r=new Array(e),o=0;o<e;o++)r[o]=arguments[o];var i=r.reduce(this._pullDefinitions,{});Object.keys(i).forEach(function(s){t.definitions[s]=f(f({},t.definitions[s]||{}),i[s]),Ma(s,i[s]);var l=Da[z][s];l&&Ma(l,i[s]),zt()})}},{key:"reset",value:function(){this.definitions={}}},{key:"_pullDefinitions",value:function(t,e){var r=e.prefix&&e.iconName&&e.icon?{0:e}:e;return Object.keys(r).map(function(o){var i=r[o],s=i.prefix,l=i.iconName,c=i.icon,g=c[2];t[s]||(t[s]={}),g.length>0&&g.forEach(function(u){typeof u=="string"&&(t[s][u]=c)}),t[s][l]=c}),t}}])}(),fn=[],W={},U={},pi=Object.keys(U);function hi(a,n){var t=n.mixoutsTo;return fn=a,W={},Object.keys(U).forEach(function(e){pi.indexOf(e)===-1&&delete U[e]}),fn.forEach(function(e){var r=e.mixout?e.mixout():{};if(Object.keys(r).forEach(function(i){typeof r[i]=="function"&&(t[i]=r[i]),ia(r[i])==="object"&&Object.keys(r[i]).forEach(function(s){t[i]||(t[i]={}),t[i][s]=r[i][s]})}),e.hooks){var o=e.hooks();Object.keys(o).forEach(function(i){W[i]||(W[i]=[]),W[i].push(o[i])})}e.provides&&e.provides(U)}),t}function Ca(a,n){for(var t=arguments.length,e=new Array(t>2?t-2:0),r=2;r<t;r++)e[r-2]=arguments[r];var o=W[a]||[];return o.forEach(function(i){n=i.apply(null,[n].concat(e))}),n}function $(a){for(var n=arguments.length,t=new Array(n>1?n-1:0),e=1;e<n;e++)t[e-1]=arguments[e];var r=W[a]||[];r.forEach(function(o){o.apply(null,t)})}function j(){var a=arguments[0],n=Array.prototype.slice.call(arguments,1);return U[a]?U[a].apply(null,n):void 0}function Ia(a){a.prefix==="fa"&&(a.prefix="fas");var n=a.iconName,t=a.prefix||O();if(n)return n=T(t,n)||n,rn(At.definitions,t,n)||rn(k.styles,t,n)}var At=new vi,bi=function(){m.autoReplaceSvg=!1,m.observeMutations=!1,$("noAuto")},yi={i2svg:function(){var n=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{};return F?($("beforeI2svg",n),j("pseudoElements2svg",n),j("i2svg",n)):Promise.reject(new Error("Operation requires a DOM of some kind."))},watch:function(){var n=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},t=n.autoReplaceSvgRoot;m.autoReplaceSvg===!1&&(m.autoReplaceSvg=!0),m.observeMutations=!0,ti(function(){zi({autoReplaceSvgRoot:t}),$("watch",n)})}},xi={icon:function(n){if(n===null)return null;if(ia(n)==="object"&&n.prefix&&n.iconName)return{prefix:n.prefix,iconName:T(n.prefix,n.iconName)||n.iconName};if(Array.isArray(n)&&n.length===2){var t=n[1].indexOf("fa-")===0?n[1].slice(3):n[1],e=ca(n[0]);return{prefix:e,iconName:T(e,t)||t}}if(typeof n=="string"&&(n.indexOf("".concat(m.cssPrefix,"-"))>-1||n.match(Rr))){var r=ua(n.split(" "),{skipLookups:!0});return{prefix:r.prefix||O(),iconName:T(r.prefix,r.iconName)||r.iconName}}if(typeof n=="string"){var o=O();return{prefix:o,iconName:T(o,n)||n}}}},A={noAuto:bi,config:m,dom:yi,parse:xi,library:At,findIconDefinition:Ia,toHtml:K},zi=function(){var n=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},t=n.autoReplaceSvgRoot,e=t===void 0?h:t;(Object.keys(k.styles).length>0||m.autoFetchSvg)&&F&&m.autoReplaceSvg&&A.dom.i2svg({node:e})};function ma(a,n){return Object.defineProperty(a,"abstract",{get:n}),Object.defineProperty(a,"html",{get:function(){return a.abstract.map(function(e){return K(e)})}}),Object.defineProperty(a,"node",{get:function(){if(F){var e=h.createElement("div");return e.innerHTML=a.html,e.children}}}),a}function wi(a){var n=a.children,t=a.main,e=a.mask,r=a.attributes,o=a.styles,i=a.transform;if(Wa(i)&&t.found&&!e.found){var s=t.width,l=t.height,c={x:s/l/2,y:.5};r.style=fa(f(f({},o),{},{"transform-origin":"".concat(c.x+i.x/16,"em ").concat(c.y+i.y/16,"em")}))}return[{tag:"svg",attributes:r,children:n}]}function Si(a){var n=a.prefix,t=a.iconName,e=a.children,r=a.attributes,o=a.symbol,i=o===!0?"".concat(n,"-").concat(m.cssPrefix,"-").concat(t):o;return[{tag:"svg",attributes:{style:"display: none;"},children:[{tag:"symbol",attributes:f(f({},r),{},{id:i}),children:e}]}]}function Ai(a){var n=["aria-label","aria-labelledby","title","role"];return n.some(function(t){return t in a})}function Xa(a){var n=a.icons,t=n.main,e=n.mask,r=a.prefix,o=a.iconName,i=a.transform,s=a.symbol,l=a.maskId,c=a.extra,g=a.watchable,u=g===void 0?!1:g,p=e.found?e:t,v=p.width,y=p.height,b=[m.replacementClass,o?"".concat(m.cssPrefix,"-").concat(o):""].filter(function(I){return c.classes.indexOf(I)===-1}).filter(function(I){return I!==""||!!I}).concat(c.classes).join(" "),w={children:[],attributes:f(f({},c.attributes),{},{"data-prefix":r,"data-icon":o,class:b,role:c.attributes.role||"img",viewBox:"0 0 ".concat(v," ").concat(y)})};!Ai(c.attributes)&&!c.attributes["aria-hidden"]&&(w.attributes["aria-hidden"]="true"),u&&(w.attributes[_]="");var x=f(f({},w),{},{prefix:r,iconName:o,main:t,mask:e,maskId:l,transform:i,symbol:s,styles:f({},c.styles)}),S=e.found&&t.found?j("generateAbstractMask",x)||{children:[],attributes:{}}:j("generateAbstractIcon",x)||{children:[],attributes:{}},L=S.children,D=S.attributes;return x.children=L,x.attributes=D,s?Si(x):wi(x)}function cn(a){var n=a.content,t=a.width,e=a.height,r=a.transform,o=a.extra,i=a.watchable,s=i===void 0?!1:i,l=f(f({},o.attributes),{},{class:o.classes.join(" ")});s&&(l[_]="");var c=f({},o.styles);Wa(r)&&(c.transform=Zr({transform:r,width:t,height:e}),c["-webkit-transform"]=c.transform);var g=fa(c);g.length>0&&(l.style=g);var u=[];return u.push({tag:"span",attributes:l,children:[n]}),u}function Li(a){var n=a.content,t=a.extra,e=f(f({},t.attributes),{},{class:t.classes.join(" ")}),r=fa(t.styles);r.length>0&&(e.style=r);var o=[];return o.push({tag:"span",attributes:e,children:[n]}),o}var ba=k.styles;function Pa(a){var n=a[0],t=a[1],e=a.slice(4),r=la(e,1),o=r[0],i=null;return Array.isArray(o)?i={tag:"g",attributes:{class:"".concat(m.cssPrefix,"-").concat(va.GROUP)},children:[{tag:"path",attributes:{class:"".concat(m.cssPrefix,"-").concat(va.SECONDARY),fill:"currentColor",d:o[0]}},{tag:"path",attributes:{class:"".concat(m.cssPrefix,"-").concat(va.PRIMARY),fill:"currentColor",d:o[1]}}]}:i={tag:"path",attributes:{fill:"currentColor",d:o}},{found:!0,width:n,height:t,icon:i}}var ki={found:!1,width:512,height:512};function Mi(a,n){!ot&&!m.showMissingIcons&&a&&console.error('Icon with name "'.concat(a,'" and prefix "').concat(n,'" is missing.'))}function Na(a,n){var t=n;return n==="fa"&&m.styleDefault!==null&&(n=O()),new Promise(function(e,r){if(t==="fa"){var o=wt(a)||{};a=o.iconName||a,n=o.prefix||n}if(a&&n&&ba[n]&&ba[n][a]){var i=ba[n][a];return e(Pa(i))}Mi(a,n),e(f(f({},ki),{},{icon:m.showMissingIcons&&a?j("missingIconAbstract")||{}:{}}))})}var un=function(){},Fa=m.measurePerformance&&Q&&Q.mark&&Q.measure?Q:{mark:un,measure:un},H='FA "7.3.1"',Ci=function(n){return Fa.mark("".concat(H," ").concat(n," begins")),function(){return Lt(n)}},Lt=function(n){Fa.mark("".concat(H," ").concat(n," ends")),Fa.measure("".concat(H," ").concat(n),"".concat(H," ").concat(n," begins"),"".concat(H," ").concat(n," ends"))},Ha={begin:Ci,end:Lt},ea=function(){};function mn(a){var n=a.getAttribute?a.getAttribute(_):null;return typeof n=="string"}function Ii(a){var n=a.getAttribute?a.getAttribute(_a):null,t=a.getAttribute?a.getAttribute($a):null;return n&&t}function Pi(a){return a&&a.classList&&a.classList.contains&&a.classList.contains(m.replacementClass)}function Ni(){if(m.autoReplaceSvg===!0)return ra.replace;var a=ra[m.autoReplaceSvg];return a||ra.replace}function Fi(a){return h.createElementNS("http://www.w3.org/2000/svg",a)}function Ei(a){return h.createElement(a)}function kt(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},t=n.ceFn,e=t===void 0?a.tag==="svg"?Fi:Ei:t;if(typeof a=="string")return h.createTextNode(a);var r=e(a.tag);Object.keys(a.attributes||[]).forEach(function(i){r.setAttribute(i,a.attributes[i])});var o=a.children||[];return o.forEach(function(i){r.appendChild(kt(i,{ceFn:e}))}),r}function Oi(a){var n=" ".concat(a.outerHTML," ");return n="".concat(n,"Font Awesome fontawesome.com "),n}var ra={replace:function(n){var t=n[0];if(t.parentNode)if(n[1].forEach(function(r){t.parentNode.insertBefore(kt(r),t)}),t.getAttribute(_)===null&&m.keepOriginalSource){var e=h.createComment(Oi(t));t.parentNode.replaceChild(e,t)}else t.remove()},nest:function(n){var t=n[0],e=n[1];if(~Ra(t).indexOf(m.replacementClass))return ra.replace(n);var r=new RegExp("".concat(m.cssPrefix,"-.*"));if(delete e[0].attributes.id,e[0].attributes.class){var o=e[0].attributes.class.split(" ").reduce(function(s,l){return l===m.replacementClass||l.match(r)?s.toSvg.push(l):s.toNode.push(l),s},{toNode:[],toSvg:[]});e[0].attributes.class=o.toSvg.join(" "),o.toNode.length===0?t.removeAttribute("class"):t.setAttribute("class",o.toNode.join(" "))}var i=e.map(function(s){return K(s)}).join(`
`);t.setAttribute(_,""),t.innerHTML=i}};function dn(a){a()}function Mt(a,n){var t=typeof n=="function"?n:ea;if(a.length===0)t();else{var e=dn;m.mutateApproach===_r&&(e=E.requestAnimationFrame||dn),e(function(){var r=Ni(),o=Ha.begin("mutate");a.map(r),o(),t()})}}var Ga=!1;function Ct(){Ga=!0}function Ea(){Ga=!1}var sa=null;function gn(a){if(Ka&&m.observeMutations){var n=a.treeCallback,t=n===void 0?ea:n,e=a.nodeCallback,r=e===void 0?ea:e,o=a.pseudoElementsCallback,i=o===void 0?ea:o,s=a.observeMutationsRoot,l=s===void 0?h:s;sa=new Ka(function(c){if(!Ga){var g=O();X(c).forEach(function(u){if(u.type==="childList"&&u.addedNodes.length>0&&!mn(u.addedNodes[0])&&(m.searchPseudoElements&&i(u.target),t(u.target)),u.type==="attributes"&&u.target.parentNode&&m.searchPseudoElements&&i([u.target],!0),u.type==="attributes"&&mn(u.target)&&~Yr.indexOf(u.attributeName))if(u.attributeName==="class"&&Ii(u.target)){var p=ua(Ra(u.target)),v=p.prefix,y=p.iconName;u.target.setAttribute(_a,v||g),y&&u.target.setAttribute($a,y)}else Pi(u.target)&&r(u.target)})}}),F&&sa.observe(l,{childList:!0,attributes:!0,characterData:!0,subtree:!0})}}function ji(){sa&&sa.disconnect()}function Ti(a){var n=a.getAttribute("style"),t=[];return n&&(t=n.split(";").reduce(function(e,r){var o=r.split(":"),i=o[0],s=o.slice(1);return i&&s.length>0&&(e[i]=s.join(":").trim()),e},{})),t}function _i(a){var n=a.getAttribute("data-prefix"),t=a.getAttribute("data-icon"),e=a.innerText!==void 0?a.innerText.trim():"",r=ua(Ra(a));return r.prefix||(r.prefix=O()),n&&t&&(r.prefix=n,r.iconName=t),r.iconName&&r.prefix||(r.prefix&&e.length>0&&(r.iconName=si(r.prefix,a.innerText)||Ya(r.prefix,gt(a.innerText))),!r.iconName&&m.autoFetchSvg&&a.firstChild&&a.firstChild.nodeType===Node.TEXT_NODE&&(r.iconName=a.firstChild.data)),r}function $i(a){var n=X(a.attributes).reduce(function(t,e){return t.name!=="class"&&t.name!=="style"&&(t[e.name]=e.value),t},{});return n}function Di(){return{iconName:null,prefix:null,transform:C,symbol:!1,mask:{iconName:null,prefix:null,rest:[]},maskId:null,extra:{classes:[],styles:{},attributes:{}}}}function vn(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{styleParser:!0},t=_i(a),e=t.iconName,r=t.prefix,o=t.rest,i=$i(a),s=Ca("parseNodeAttributes",{},a),l=n.styleParser?Ti(a):[];return f({iconName:e,prefix:r,transform:C,mask:{iconName:null,prefix:null,rest:[]},maskId:null,symbol:!1,extra:{classes:o,styles:l,attributes:i}},s)}var Ri=k.styles;function It(a){var n=m.autoReplaceSvg==="nest"?vn(a,{styleParser:!1}):vn(a);return~n.extra.classes.indexOf(lt)?j("generateLayersText",a,n):j("generateSvgReplacementMutation",a,n)}function Wi(){return[].concat(M(at),M(nt))}function pn(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;if(!F)return Promise.resolve();var t=h.documentElement.classList,e=function(u){return t.add("".concat(an,"-").concat(u))},r=function(u){return t.remove("".concat(an,"-").concat(u))},o=m.autoFetchSvg?Wi():Pn.concat(Object.keys(Ri));o.includes("fa")||o.push("fa");var i=[".".concat(lt,":not([").concat(_,"])")].concat(o.map(function(g){return".".concat(g,":not([").concat(_,"])")})).join(", ");if(i.length===0)return Promise.resolve();var s=[];try{s=X(a.querySelectorAll(i))}catch{}if(s.length>0)e("pending"),r("complete");else return Promise.resolve();var l=Ha.begin("onTree"),c=s.reduce(function(g,u){try{var p=It(u);p&&g.push(p)}catch(v){ot||v.name==="MissingIcon"&&console.error(v)}return g},[]);return new Promise(function(g,u){Promise.all(c).then(function(p){Mt(p,function(){e("active"),e("complete"),r("pending"),typeof n=="function"&&n(),l(),g()})}).catch(function(p){l(),u(p)})})}function Ui(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:null;It(a).then(function(t){t&&Mt([t],n)})}function Yi(a){return function(n){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=(n||{}).icon?n:Ia(n||{}),r=t.mask;return r&&(r=(r||{}).icon?r:Ia(r||{})),a(e,f(f({},t),{},{mask:r}))}}var Xi=function(n){var t=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},e=t.transform,r=e===void 0?C:e,o=t.symbol,i=o===void 0?!1:o,s=t.mask,l=s===void 0?null:s,c=t.maskId,g=c===void 0?null:c,u=t.classes,p=u===void 0?[]:u,v=t.attributes,y=v===void 0?{}:v,b=t.styles,w=b===void 0?{}:b;if(n){var x=n.prefix,S=n.iconName,L=n.icon;return ma(f({type:"icon"},n),function(){return $("beforeDOMElementCreation",{iconDefinition:n,params:t}),Xa({icons:{main:Pa(L),mask:l?Pa(l.icon):{found:!1,width:null,height:null,icon:{}}},prefix:x,iconName:S,transform:f(f({},C),r),symbol:i,maskId:g,extra:{attributes:y,styles:w,classes:p}})})}},Hi={mixout:function(){return{icon:Yi(Xi)}},hooks:function(){return{mutationObserverCallbacks:function(t){return t.treeCallback=pn,t.nodeCallback=Ui,t}}},provides:function(n){n.i2svg=function(t){var e=t.node,r=e===void 0?h:e,o=t.callback,i=o===void 0?function(){}:o;return pn(r,i)},n.generateSvgReplacementMutation=function(t,e){var r=e.iconName,o=e.prefix,i=e.transform,s=e.symbol,l=e.mask,c=e.maskId,g=e.extra;return new Promise(function(u,p){Promise.all([Na(r,o),l.iconName?Na(l.iconName,l.prefix):Promise.resolve({found:!1,width:512,height:512,icon:{}})]).then(function(v){var y=la(v,2),b=y[0],w=y[1];u([t,Xa({icons:{main:b,mask:w},prefix:o,iconName:r,transform:i,symbol:s,maskId:c,extra:g,watchable:!0})])}).catch(p)})},n.generateAbstractIcon=function(t){var e=t.children,r=t.attributes,o=t.main,i=t.transform,s=t.styles,l=fa(s);l.length>0&&(r.style=l);var c;return Wa(i)&&(c=j("generateAbstractTransformGrouping",{main:o,transform:i,containerWidth:o.width,iconWidth:o.width})),e.push(c||o.icon),{children:e,attributes:r}}}},Gi={mixout:function(){return{layer:function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=e.classes,o=r===void 0?[]:r;return ma({type:"layer"},function(){$("beforeDOMElementCreation",{assembler:t,params:e});var i=[];return t(function(s){Array.isArray(s)?s.map(function(l){i=i.concat(l.abstract)}):i=i.concat(s.abstract)}),[{tag:"span",attributes:{class:["".concat(m.cssPrefix,"-layers")].concat(M(o)).join(" ")},children:i}]})}}}},Vi={mixout:function(){return{counter:function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{};e.title;var r=e.classes,o=r===void 0?[]:r,i=e.attributes,s=i===void 0?{}:i,l=e.styles,c=l===void 0?{}:l;return ma({type:"counter",content:t},function(){return $("beforeDOMElementCreation",{content:t,params:e}),Li({content:t.toString(),extra:{attributes:s,styles:c,classes:["".concat(m.cssPrefix,"-layers-counter")].concat(M(o))}})})}}}},Bi={mixout:function(){return{text:function(t){var e=arguments.length>1&&arguments[1]!==void 0?arguments[1]:{},r=e.transform,o=r===void 0?C:r,i=e.classes,s=i===void 0?[]:i,l=e.attributes,c=l===void 0?{}:l,g=e.styles,u=g===void 0?{}:g;return ma({type:"text",content:t},function(){return $("beforeDOMElementCreation",{content:t,params:e}),cn({content:t,transform:f(f({},C),o),extra:{attributes:c,styles:u,classes:["".concat(m.cssPrefix,"-layers-text")].concat(M(s))}})})}}},provides:function(n){n.generateLayersText=function(t,e){var r=e.transform,o=e.extra,i=null,s=null;if(Cn){var l=parseInt(getComputedStyle(t).fontSize,10),c=t.getBoundingClientRect();i=c.width/l,s=c.height/l}return Promise.resolve([t,cn({content:t.innerHTML,width:i,height:s,transform:r,extra:o,watchable:!0})])}}},Pt=new RegExp('"',"ug"),hn=[1105920,1112319],bn=f(f(f(f({},{FontAwesome:{normal:"fas",400:"fas"}}),be),jr),Me),Oa=Object.keys(bn).reduce(function(a,n){return a[n.toLowerCase()]=bn[n],a},{}),qi=Object.keys(Oa).reduce(function(a,n){var t=Oa[n];return a[n]=t[900]||M(Object.entries(t))[0][1],a},{});function Ji(a){var n=a.replace(Pt,"");return gt(M(n)[0]||"")}function Ki(a){var n=a.getPropertyValue("font-feature-settings").includes("ss01"),t=a.getPropertyValue("content"),e=t.replace(Pt,""),r=e.codePointAt(0),o=r>=hn[0]&&r<=hn[1],i=e.length===2?e[0]===e[1]:!1;return o||i||n}function Qi(a,n){var t=a.replace(/^['"]|['"]$/g,"").toLowerCase(),e=parseInt(n),r=isNaN(e)?"normal":e;return(Oa[t]||{})[r]||qi[t]}function yn(a,n){var t="".concat(Tr).concat(n.replace(":","-"));return new Promise(function(e,r){if(a.getAttribute(t)!==null)return e();var o=X(a.children),i=o.filter(function(da){return da.getAttribute(Sa)===n})[0],s=E.getComputedStyle(a,n),l=s.getPropertyValue("font-family"),c=l.match(Wr),g=s.getPropertyValue("font-weight"),u=s.getPropertyValue("content");if(i&&!c)return a.removeChild(i),e();if(c&&u!=="none"&&u!==""){var p=s.getPropertyValue("content"),v=Qi(l,g),y=Ji(p),b=c[0].startsWith("FontAwesome"),w=Ki(s),x=Ya(v,y),S=x;if(b){var L=li(y);L.iconName&&L.prefix&&(x=L.iconName,v=L.prefix)}if(x&&!w&&(!i||i.getAttribute(_a)!==v||i.getAttribute($a)!==S)){a.setAttribute(t,S),i&&a.removeChild(i);var D=Di(),I=D.extra;I.attributes[Sa]=n,Na(x,v).then(function(da){var Nt=Xa(f(f({},D),{},{icons:{main:da,mask:St()},prefix:v,iconName:S,extra:I,watchable:!0})),ga=h.createElementNS("http://www.w3.org/2000/svg","svg");n==="::before"?a.insertBefore(ga,a.firstChild):a.appendChild(ga),ga.outerHTML=Nt.map(function(Ft){return K(Ft)}).join(`
`),a.removeAttribute(t),e()}).catch(r)}else e()}else e()})}function Zi(a){return Promise.all([yn(a,"::before"),yn(a,"::after")])}function ao(a){return a.parentNode!==document.head&&!~$r.indexOf(a.tagName.toUpperCase())&&!a.getAttribute(Sa)&&(!a.parentNode||a.parentNode.tagName!=="svg")}var no=function(n){return!!n&&it.some(function(t){return n.includes(t)})},to=function(n){if(!n)return[];var t=new Set,e=n.split(/,(?![^()]*\))/).map(function(l){return l.trim()});e=e.flatMap(function(l){return l.includes("(")?l:l.split(",").map(function(c){return c.trim()})});var r=ta(e),o;try{for(r.s();!(o=r.n()).done;){var i=o.value;if(no(i)){var s=it.reduce(function(l,c){return l.replace(c,"")},i);s!==""&&s!=="*"&&t.add(s)}}}catch(l){r.e(l)}finally{r.f()}return t};function xn(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!1;if(F){var t;if(n)t=a;else if(m.searchPseudoElementsFullScan)t=a.querySelectorAll("*");else{var e=new Set,r=ta(document.styleSheets),o;try{for(r.s();!(o=r.n()).done;){var i=o.value;try{var s=ta(i.cssRules),l;try{for(s.s();!(l=s.n()).done;){var c=l.value,g=to(c.selectorText),u=ta(g),p;try{for(u.s();!(p=u.n()).done;){var v=p.value;e.add(v)}}catch(b){u.e(b)}finally{u.f()}}}catch(b){s.e(b)}finally{s.f()}}catch(b){m.searchPseudoElementsWarnings&&console.warn("Font Awesome: cannot parse stylesheet: ".concat(i.href," (").concat(b.message,`)
If it declares any Font Awesome CSS pseudo-elements, they will not be rendered as SVG icons. Add crossorigin="anonymous" to the <link>, enable searchPseudoElementsFullScan for slower but more thorough DOM parsing, or suppress this warning by setting searchPseudoElementsWarnings to false.`))}}}catch(b){r.e(b)}finally{r.f()}if(!e.size)return;var y=Array.from(e).join(", ");try{t=a.querySelectorAll(y)}catch{}}return new Promise(function(b,w){var x=X(t).filter(ao).map(Zi),S=Ha.begin("searchPseudoElements");Ct(),Promise.all(x).then(function(){S(),Ea(),b()}).catch(function(){S(),Ea(),w()})})}}var eo={hooks:function(){return{mutationObserverCallbacks:function(t){return t.pseudoElementsCallback=xn,t}}},provides:function(n){n.pseudoElements2svg=function(t){var e=t.node,r=e===void 0?h:e;m.searchPseudoElements&&xn(r)}}},zn=!1,ro={mixout:function(){return{dom:{unwatch:function(){Ct(),zn=!0}}}},hooks:function(){return{bootstrap:function(){gn(Ca("mutationObserverCallbacks",{}))},noAuto:function(){ji()},watch:function(t){var e=t.observeMutationsRoot;zn?Ea():gn(Ca("mutationObserverCallbacks",{observeMutationsRoot:e}))}}}},wn=function(n){var t={size:16,x:0,y:0,flipX:!1,flipY:!1,rotate:0};return n.toLowerCase().split(" ").reduce(function(e,r){var o=r.toLowerCase().split("-"),i=o[0],s=o.slice(1).join("-");if(i&&s==="h")return e.flipX=!0,e;if(i&&s==="v")return e.flipY=!0,e;if(s=parseFloat(s),isNaN(s))return e;switch(i){case"grow":e.size=e.size+s;break;case"shrink":e.size=e.size-s;break;case"left":e.x=e.x-s;break;case"right":e.x=e.x+s;break;case"up":e.y=e.y-s;break;case"down":e.y=e.y+s;break;case"rotate":e.rotate=e.rotate+s;break}return e},t)},io={mixout:function(){return{parse:{transform:function(t){return wn(t)}}}},hooks:function(){return{parseNodeAttributes:function(t,e){var r=e.getAttribute("data-fa-transform");return r&&(t.transform=wn(r)),t}}},provides:function(n){n.generateAbstractTransformGrouping=function(t){var e=t.main,r=t.transform,o=t.containerWidth,i=t.iconWidth,s={transform:"translate(".concat(o/2," 256)")},l="translate(".concat(r.x*32,", ").concat(r.y*32,") "),c="scale(".concat(r.size/16*(r.flipX?-1:1),", ").concat(r.size/16*(r.flipY?-1:1),") "),g="rotate(".concat(r.rotate," 0 0)"),u={transform:"".concat(l," ").concat(c," ").concat(g)},p={transform:"translate(".concat(i/2*-1," -256)")},v={outer:s,inner:u,path:p};return{tag:"g",attributes:f({},v.outer),children:[{tag:"g",attributes:f({},v.inner),children:[{tag:e.icon.tag,children:e.icon.children,attributes:f(f({},e.icon.attributes),v.path)}]}]}}}},ya={x:0,y:0,width:"100%",height:"100%"};function Sn(a){var n=arguments.length>1&&arguments[1]!==void 0?arguments[1]:!0;return a.attributes&&(a.attributes.fill||n)&&(a.attributes.fill="black"),a}function oo(a){return a.tag==="g"?a.children:[a]}var so={hooks:function(){return{parseNodeAttributes:function(t,e){var r=e.getAttribute("data-fa-mask"),o=r?ua(r.split(" ").map(function(i){return i.trim()})):St();return o.prefix||(o.prefix=O()),t.mask=o,t.maskId=e.getAttribute("data-fa-mask-id"),t}}},provides:function(n){n.generateAbstractMask=function(t){var e=t.children,r=t.attributes,o=t.main,i=t.mask,s=t.maskId,l=t.transform,c=o.width,g=o.icon,u=i.width,p=i.icon,v=Qr({transform:l,containerWidth:u,iconWidth:c}),y={tag:"rect",attributes:f(f({},ya),{},{fill:"white"})},b=g.children?{children:g.children.map(Sn)}:{},w={tag:"g",attributes:f({},v.inner),children:[Sn(f({tag:g.tag,attributes:f(f({},g.attributes),v.path)},b))]},x={tag:"g",attributes:f({},v.outer),children:[w]},S="mask-".concat(s||tn()),L="clip-".concat(s||tn()),D={tag:"mask",attributes:f(f({},ya),{},{id:S,maskUnits:"userSpaceOnUse",maskContentUnits:"userSpaceOnUse"}),children:[y,x]},I={tag:"defs",children:[{tag:"clipPath",attributes:{id:L},children:oo(p)},D]};return e.push(I,{tag:"rect",attributes:f({fill:"currentColor","clip-path":"url(#".concat(L,")"),mask:"url(#".concat(S,")")},ya)}),{children:e,attributes:r}}}},lo={provides:function(n){var t=!1;E.matchMedia&&(t=E.matchMedia("(prefers-reduced-motion: reduce)").matches),n.missingIconAbstract=function(){var e=[],r={fill:"currentColor"},o={attributeType:"XML",repeatCount:"indefinite",dur:"2s"};e.push({tag:"path",attributes:f(f({},r),{},{d:"M156.5,447.7l-12.6,29.5c-18.7-9.5-35.9-21.2-51.5-34.9l22.7-22.7C127.6,430.5,141.5,440,156.5,447.7z M40.6,272H8.5 c1.4,21.2,5.4,41.7,11.7,61.1L50,321.2C45.1,305.5,41.8,289,40.6,272z M40.6,240c1.4-18.8,5.2-37,11.1-54.1l-29.5-12.6 C14.7,194.3,10,216.7,8.5,240H40.6z M64.3,156.5c7.8-14.9,17.2-28.8,28.1-41.5L69.7,92.3c-13.7,15.6-25.5,32.8-34.9,51.5 L64.3,156.5z M397,419.6c-13.9,12-29.4,22.3-46.1,30.4l11.9,29.8c20.7-9.9,39.8-22.6,56.9-37.6L397,419.6z M115,92.4 c13.9-12,29.4-22.3,46.1-30.4l-11.9-29.8c-20.7,9.9-39.8,22.6-56.8,37.6L115,92.4z M447.7,355.5c-7.8,14.9-17.2,28.8-28.1,41.5 l22.7,22.7c13.7-15.6,25.5-32.9,34.9-51.5L447.7,355.5z M471.4,272c-1.4,18.8-5.2,37-11.1,54.1l29.5,12.6 c7.5-21.1,12.2-43.5,13.6-66.8H471.4z M321.2,462c-15.7,5-32.2,8.2-49.2,9.4v32.1c21.2-1.4,41.7-5.4,61.1-11.7L321.2,462z M240,471.4c-18.8-1.4-37-5.2-54.1-11.1l-12.6,29.5c21.1,7.5,43.5,12.2,66.8,13.6V471.4z M462,190.8c5,15.7,8.2,32.2,9.4,49.2h32.1 c-1.4-21.2-5.4-41.7-11.7-61.1L462,190.8z M92.4,397c-12-13.9-22.3-29.4-30.4-46.1l-29.8,11.9c9.9,20.7,22.6,39.8,37.6,56.9 L92.4,397z M272,40.6c18.8,1.4,36.9,5.2,54.1,11.1l12.6-29.5C317.7,14.7,295.3,10,272,8.5V40.6z M190.8,50 c15.7-5,32.2-8.2,49.2-9.4V8.5c-21.2,1.4-41.7,5.4-61.1,11.7L190.8,50z M442.3,92.3L419.6,115c12,13.9,22.3,29.4,30.5,46.1 l29.8-11.9C470,128.5,457.3,109.4,442.3,92.3z M397,92.4l22.7-22.7c-15.6-13.7-32.8-25.5-51.5-34.9l-12.6,29.5 C370.4,72.1,384.4,81.5,397,92.4z"})});var i=f(f({},o),{},{attributeName:"opacity"}),s={tag:"circle",attributes:f(f({},r),{},{cx:"256",cy:"364",r:"28"}),children:[]};return t||s.children.push({tag:"animate",attributes:f(f({},o),{},{attributeName:"r",values:"28;14;28;28;14;28;"})},{tag:"animate",attributes:f(f({},i),{},{values:"1;0;1;1;0;1;"})}),e.push(s),e.push({tag:"path",attributes:f(f({},r),{},{opacity:"1",d:"M263.7,312h-16c-6.6,0-12-5.4-12-12c0-71,77.4-63.9,77.4-107.8c0-20-17.8-40.2-57.4-40.2c-29.1,0-44.3,9.6-59.2,28.7 c-3.9,5-11.1,6-16.2,2.4l-13.1-9.2c-5.6-3.9-6.9-11.8-2.6-17.2c21.2-27.2,46.4-44.7,91.2-44.7c52.3,0,97.4,29.8,97.4,80.2 c0,67.6-77.4,63.5-77.4,107.8C275.7,306.6,270.3,312,263.7,312z"}),children:t?[]:[{tag:"animate",attributes:f(f({},i),{},{values:"1;0;0;0;0;1;"})}]}),t||e.push({tag:"path",attributes:f(f({},r),{},{opacity:"0",d:"M232.5,134.5l7,168c0.3,6.4,5.6,11.5,12,11.5h9c6.4,0,11.7-5.1,12-11.5l7-168c0.3-6.8-5.2-12.5-12-12.5h-23 C237.7,122,232.2,127.7,232.5,134.5z"}),children:[{tag:"animate",attributes:f(f({},i),{},{values:"0;0;1;1;0;0;"})}]}),{tag:"g",attributes:{class:"missing"},children:e}}}},fo={hooks:function(){return{parseNodeAttributes:function(t,e){var r=e.getAttribute("data-fa-symbol"),o=r===null?!1:r===""?!0:r;return t.symbol=o,t}}}},co=[ni,Hi,Gi,Vi,Bi,eo,ro,io,so,lo,fo];hi(co,{mixoutsTo:A});A.noAuto;var uo=A.config;A.library;A.dom;var mo=A.parse;A.findIconDefinition;A.toHtml;var go=A.icon;A.layer;A.text;A.counter;/*!
 * Font Awesome Free 7.3.1 by @fontawesome - https://fontawesome.com
 * License - https://fontawesome.com/license/free (Icons: CC BY 4.0, Fonts: SIL OFL 1.1, Code: MIT License)
 * Copyright 2026 Fonticons, Inc.
 */var vo={prefix:"fas",iconName:"rotate",icon:[512,512,[128260,"sync-alt"],"f2f1","M480.1 192l7.9 0c13.3 0 24-10.7 24-24l0-144c0-9.7-5.8-18.5-14.8-22.2S477.9 .2 471 7L419.3 58.8C375 22.1 318 0 256 0 127 0 20.3 95.4 2.6 219.5 .1 237 12.2 253.2 29.7 255.7s33.7-9.7 36.2-27.1C79.2 135.5 159.3 64 256 64 300.4 64 341.2 79 373.7 104.3L327 151c-6.9 6.9-8.9 17.2-5.2 26.2S334.3 192 344 192l136.1 0zm29.4 100.5c2.5-17.5-9.7-33.7-27.1-36.2s-33.7 9.7-36.2 27.1c-13.3 93-93.4 164.5-190.1 164.5-44.4 0-85.2-15-117.7-40.3L185 361c6.9-6.9 8.9-17.2 5.2-26.2S177.7 320 168 320L24 320c-13.3 0-24 10.7-24 24L0 488c0 9.7 5.8 18.5 14.8 22.2S34.1 511.8 41 505l51.8-51.8C137 489.9 194 512 256 512 385 512 491.7 416.6 509.4 292.5z"]},po={prefix:"fas",iconName:"file-circle-plus",icon:[576,512,[58606],"e494","M96 0C60.7 0 32 28.7 32 64l0 384c0 35.3 28.7 64 64 64l180 0c-22.7-31.5-36-70.2-36-112 0-100.6 77.4-183.2 176-191.3l0-38.1c0-17-6.7-33.3-18.7-45.3L290.7 18.7C278.7 6.7 262.5 0 245.5 0L96 0zM357.5 176L264 176c-13.3 0-24-10.7-24-24L240 58.5 357.5 176zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm16-208l0 48 48 0c8.8 0 16 7.2 16 16s-7.2 16-16 16l-48 0 0 48c0 8.8-7.2 16-16 16s-16-7.2-16-16l0-48-48 0c-8.8 0-16-7.2-16-16s7.2-16 16-16l48 0 0-48c0-8.8 7.2-16 16-16s16 7.2 16 16z"]},ho={prefix:"fas",iconName:"crop-simple",icon:[512,512,["crop-alt"],"f565","M128 32c0-17.7-14.3-32-32-32S64 14.3 64 32l0 32-32 0C14.3 64 0 78.3 0 96s14.3 32 32 32l32 0 0 256c0 35.3 28.7 64 64 64l208 0 0-64-208 0 0-352zM384 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-32 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-32 0 0-256c0-35.3-28.7-64-64-64l-208 0 0 64 208 0 0 352z"]},bo={prefix:"fas",iconName:"file-excel",icon:[384,512,[],"f1c3","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM164 266.7c-7.4-11-22.3-14-33.3-6.7s-14 22.3-6.7 33.3L163.2 352 124 410.7c-7.4 11-4.4 25.9 6.7 33.3s25.9 4.4 33.3-6.7l28-42 28 42c7.4 11 22.3 14 33.3 6.7s14-22.3 6.7-33.3L220.8 352 260 293.3c7.4-11 4.4-25.9-6.7-33.3s-25.9-4.4-33.3 6.7l-28 42-28-42z"]},yo={prefix:"fas",iconName:"cloud-arrow-up",icon:[576,512,[62338,"cloud-upload","cloud-upload-alt"],"f0ee","M144 480c-79.5 0-144-64.5-144-144 0-63.4 41-117.2 97.9-136.5-1.3-7.7-1.9-15.5-1.9-23.5 0-79.5 64.5-144 144-144 55.4 0 103.5 31.3 127.6 77.1 14.2-8.3 30.8-13.1 48.4-13.1 53 0 96 43 96 96 0 15.7-3.8 30.6-10.5 43.7 44 20.3 74.5 64.7 74.5 116.3 0 70.7-57.3 128-128 128l-304 0zM305 191c-9.4-9.4-24.6-9.4-33.9 0l-72 72c-9.4 9.4-9.4 24.6 0 33.9s24.6 9.4 33.9 0l31-31 0 102.1c0 13.3 10.7 24 24 24s24-10.7 24-24l0-102.1 31 31c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-72-72z"]},xo={prefix:"fas",iconName:"file-zipper",icon:[384,512,["file-archive"],"f1c6","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM64 72c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L88 48C74.7 48 64 58.7 64 72zm0 96c0 13.3 10.7 24 24 24l48 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0c-13.3 0-24 10.7-24 24zm64 72l-32 0c-17.7 0-32 14.3-32 32l0 48c0 26.5 21.5 48 48 48s48-21.5 48-48l0-48c0-17.7-14.3-32-32-32zm-16 64a16 16 0 1 1 0 32 16 16 0 1 1 0-32z"]},zo={prefix:"fas",iconName:"magnifying-glass",icon:[512,512,[128269,"search"],"f002","M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376C296.3 401.1 253.9 416 208 416 93.1 416 0 322.9 0 208S93.1 0 208 0 416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z"]},wo={prefix:"fas",iconName:"align-left",icon:[448,512,[],"f036","M288 64c0 17.7-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l224 0c17.7 0 32 14.3 32 32zm0 256c0 17.7-14.3 32-32 32L32 352c-17.7 0-32-14.3-32-32s14.3-32 32-32l224 0c17.7 0 32 14.3 32 32zM0 192c0-17.7 14.3-32 32-32l384 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 224c-17.7 0-32-14.3-32-32zM448 448c0 17.7-14.3 32-32 32L32 480c-17.7 0-32-14.3-32-32s14.3-32 32-32l384 0c17.7 0 32 14.3 32 32z"]},So={prefix:"fas",iconName:"eye",icon:[576,512,[128065],"f06e","M288 32c-80.8 0-145.5 36.8-192.6 80.6-46.8 43.5-78.1 95.4-93 131.1-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64-11.5 0-22.3-3-31.7-8.4-1 10.9-.1 22.1 2.9 33.2 13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-12.2-45.7-55.5-74.8-101.1-70.8 5.3 9.3 8.4 20.1 8.4 31.7z"]},Ao={prefix:"fas",iconName:"chevron-up",icon:[448,512,[],"f077","M201.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 173.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"]},Lo={prefix:"fas",iconName:"clock",icon:[512,512,[128339,"clock-four"],"f017","M256 0a256 256 0 1 1 0 512 256 256 0 1 1 0-512zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"]},ko={prefix:"fas",iconName:"chevron-right",icon:[320,512,[9002],"f054","M311.1 233.4c12.5 12.5 12.5 32.8 0 45.3l-192 192c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L243.2 256 73.9 86.6c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l192 192z"]},Mo={prefix:"fas",iconName:"arrow-right-to-bracket",icon:[512,512,["sign-in"],"f090","M352 96l64 0c17.7 0 32 14.3 32 32l0 256c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0c53 0 96-43 96-96l0-256c0-53-43-96-96-96l-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32zm-9.4 182.6c12.5-12.5 12.5-32.8 0-45.3l-128-128c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L242.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l210.7 0-73.4 73.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l128-128z"]},Co={prefix:"fas",iconName:"file-image",icon:[384,512,[128443],"f1c5","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM128 256a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zM92.6 448l198.8 0c15.8 0 28.6-12.8 28.6-28.6 0-7.3-2.8-14.4-7.9-19.7L215.3 297.9c-6-6.3-14.4-9.9-23.2-9.9l-.3 0c-8.8 0-17.1 3.6-23.2 9.9L71.9 399.7C66.8 405 64 412.1 64 419.4 64 435.2 76.8 448 92.6 448z"]},Io={prefix:"fas",iconName:"sun",icon:[576,512,[9728],"f185","M288-32c8.4 0 16.3 4.4 20.6 11.7L364.1 72.3 468.9 46c8.2-2 16.9 .4 22.8 6.3S500 67 498 75.1l-26.3 104.7 92.7 55.5c7.2 4.3 11.7 12.2 11.7 20.6s-4.4 16.3-11.7 20.6L471.7 332.1 498 436.8c2 8.2-.4 16.9-6.3 22.8S477 468 468.9 466l-104.7-26.3-55.5 92.7c-4.3 7.2-12.2 11.7-20.6 11.7s-16.3-4.4-20.6-11.7L211.9 439.7 107.2 466c-8.2 2-16.8-.4-22.8-6.3S76 445 78 436.8l26.2-104.7-92.6-55.5C4.4 272.2 0 264.4 0 256s4.4-16.3 11.7-20.6L104.3 179.9 78 75.1c-2-8.2 .3-16.8 6.3-22.8S99 44 107.2 46l104.7 26.2 55.5-92.6 1.8-2.6c4.5-5.7 11.4-9.1 18.8-9.1zm0 144a144 144 0 1 0 0 288 144 144 0 1 0 0-288zm0 240a96 96 0 1 1 0-192 96 96 0 1 1 0 192z"]},Po={prefix:"fas",iconName:"file-circle-question",icon:[576,512,[],"e4ef","M96 0C60.7 0 32 28.7 32 64l0 384c0 35.3 28.7 64 64 64l180 0c-22.7-31.5-36-70.2-36-112 0-100.6 77.4-183.2 176-191.3l0-38.1c0-17-6.7-33.3-18.7-45.3L290.7 18.7C278.7 6.7 262.5 0 245.5 0L96 0zM357.5 176L264 176c-13.3 0-24-10.7-24-24L240 58.5 357.5 176zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm0-100a20 20 0 1 1 0 40 20 20 0 1 1 0-40zm0-100c-11.6 0-21.3 8.2-23.5 19.2-1.8 8.7-10.2 14.3-18.9 12.5s-14.3-10.2-12.5-18.9c5.2-25.6 27.8-44.8 54.9-44.8 30.9 0 56 25.1 56 56 0 19.8-11.7 37.8-29.8 45.9l-10.4 4.6c-1.2 7.7-7.8 13.5-15.8 13.5-8.8 0-16-7.2-16-16 0-11.2 6.6-21.3 16.8-25.9l12.4-5.5c6.6-2.9 10.8-9.4 10.8-16.6 0-13.3-10.7-24-24-24z"]},No={prefix:"fas",iconName:"circle-exclamation",icon:[512,512,["exclamation-circle"],"f06a","M256 512a256 256 0 1 1 0-512 256 256 0 1 1 0 512zm0-192a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.6 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"]},Fo={prefix:"fas",iconName:"stamp",icon:[512,512,[],"f5bf","M312 201.8c0-17.4 9.2-33.2 19.9-47 12.6-16.2 20.1-36.6 20.1-58.8 0-53-43-96-96-96s-96 43-96 96c0 22.1 7.5 42.5 20.1 58.8 10.7 13.8 19.9 29.6 19.9 47 0 29.9-24.3 54.2-54.2 54.2L112 256c-61.9 0-112 50.1-112 112 0 26.5 21.5 48 48 48l416 0c26.5 0 48-21.5 48-48 0-61.9-50.1-112-112-112l-33.8 0c-29.9 0-54.2-24.3-54.2-54.2zM56 464c-13.3 0-24 10.7-24 24s10.7 24 24 24l400 0c13.3 0 24-10.7 24-24s-10.7-24-24-24L56 464z"]},Eo={prefix:"fas",iconName:"gear",icon:[512,512,[9881,"cog"],"f013","M195.1 9.5C198.1-5.3 211.2-16 226.4-16l59.8 0c15.2 0 28.3 10.7 31.3 25.5L332 79.5c14.1 6 27.3 13.7 39.3 22.8l67.8-22.5c14.4-4.8 30.2 1.2 37.8 14.4l29.9 51.8c7.6 13.2 4.9 29.8-6.5 39.9L447 233.3c.9 7.4 1.3 15 1.3 22.7s-.5 15.3-1.3 22.7l53.4 47.5c11.4 10.1 14 26.8 6.5 39.9l-29.9 51.8c-7.6 13.1-23.4 19.2-37.8 14.4l-67.8-22.5c-12.1 9.1-25.3 16.7-39.3 22.8l-14.4 69.9c-3.1 14.9-16.2 25.5-31.3 25.5l-59.8 0c-15.2 0-28.3-10.7-31.3-25.5l-14.4-69.9c-14.1-6-27.2-13.7-39.3-22.8L73.5 432.3c-14.4 4.8-30.2-1.2-37.8-14.4L5.8 366.1c-7.6-13.2-4.9-29.8 6.5-39.9l53.4-47.5c-.9-7.4-1.3-15-1.3-22.7s.5-15.3 1.3-22.7L12.3 185.8c-11.4-10.1-14-26.8-6.5-39.9L35.7 94.1c7.6-13.2 23.4-19.2 37.8-14.4l67.8 22.5c12.1-9.1 25.3-16.7 39.3-22.8L195.1 9.5zM256.3 336a80 80 0 1 0 -.6-160 80 80 0 1 0 .6 160z"]},Oo={prefix:"fas",iconName:"circle-question",icon:[512,512,[62108,"question-circle"],"f059","M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zm0-336c-17.7 0-32 14.3-32 32 0 13.3-10.7 24-24 24s-24-10.7-24-24c0-44.2 35.8-80 80-80s80 35.8 80 80c0 47.2-36 67.2-56 74.5l0 3.8c0 13.3-10.7 24-24 24s-24-10.7-24-24l0-8.1c0-20.5 14.8-35.2 30.1-40.2 6.4-2.1 13.2-5.5 18.2-10.3 4.3-4.2 7.7-10 7.7-19.6 0-17.7-14.3-32-32-32zM224 368a32 32 0 1 1 64 0 32 32 0 1 1 -64 0z"]},jo={prefix:"fas",iconName:"right-from-bracket",icon:[512,512,["sign-out-alt"],"f2f5","M505 273c9.4-9.4 9.4-24.6 0-33.9L361 95c-6.9-6.9-17.2-8.9-26.2-5.2S320 102.3 320 112l0 80-112 0c-26.5 0-48 21.5-48 48l0 32c0 26.5 21.5 48 48 48l112 0 0 80c0 9.7 5.8 18.5 14.8 22.2s19.3 1.7 26.2-5.2L505 273zM160 96c17.7 0 32-14.3 32-32s-14.3-32-32-32L96 32C43 32 0 75 0 128L0 384c0 53 43 96 96 96l64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0c-17.7 0-32-14.3-32-32l0-256c0-17.7 14.3-32 32-32l64 0z"]},To={prefix:"fas",iconName:"arrow-up",icon:[384,512,[8593],"f062","M214.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 109.3 160 480c0 17.7 14.3 32 32 32s32-14.3 32-32l0-370.7 105.4 105.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"]},_o={prefix:"fas",iconName:"trash-can",icon:[448,512,[61460,"trash-alt"],"f2ed","M136.7 5.9C141.1-7.2 153.3-16 167.1-16l113.9 0c13.8 0 26 8.8 30.4 21.9L320 32 416 32c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 96C14.3 96 0 81.7 0 64S14.3 32 32 32l96 0 8.7-26.1zM32 144l384 0 0 304c0 35.3-28.7 64-64 64L96 512c-35.3 0-64-28.7-64-64l0-304zm88 64c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24zm104 0c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24zm104 0c-13.3 0-24 10.7-24 24l0 192c0 13.3 10.7 24 24 24s24-10.7 24-24l0-192c0-13.3-10.7-24-24-24z"]},$o={prefix:"fas",iconName:"check",icon:[448,512,[10003,10004],"f00c","M434.8 70.1c14.3 10.4 17.5 30.4 7.1 44.7l-256 352c-5.5 7.6-14 12.3-23.4 13.1s-18.5-2.7-25.1-9.3l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l101.5 101.5 234-321.7c10.4-14.3 30.4-17.5 44.7-7.1z"]},Do={prefix:"fas",iconName:"arrows-up-down-left-right",icon:[512,512,["arrows"],"f047","M278.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-64 64c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l9.4-9.4 0 114.7-114.7 0 9.4-9.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-64 64c-12.5 12.5-12.5 32.8 0 45.3l64 64c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-9.4-9.4 114.7 0 0 114.7-9.4-9.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l64 64c12.5 12.5 32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-9.4 9.4 0-114.7 114.7 0-9.4 9.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l64-64c12.5-12.5 12.5-32.8 0-45.3l-64-64c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l9.4 9.4-114.7 0 0-114.7 9.4 9.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-64-64z"]},Ro={prefix:"fas",iconName:"house",icon:[512,512,[127968,63498,63500,"home","home-alt","home-lg-alt"],"f015","M277.8 8.6c-12.3-11.4-31.3-11.4-43.5 0l-224 208c-9.6 9-12.8 22.9-8 35.1S18.8 272 32 272l16 0 0 176c0 35.3 28.7 64 64 64l288 0c35.3 0 64-28.7 64-64l0-176 16 0c13.2 0 25-8.1 29.8-20.3s1.6-26.2-8-35.1l-224-208zM240 320l32 0c26.5 0 48 21.5 48 48l0 96-128 0 0-96c0-26.5 21.5-48 48-48z"]},Wo={prefix:"fas",iconName:"spinner",icon:[512,512,[],"f110","M208 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm0 416a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM48 208a48 48 0 1 1 0 96 48 48 0 1 1 0-96zm368 48a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM75 369.1A48 48 0 1 1 142.9 437 48 48 0 1 1 75 369.1zM75 75A48 48 0 1 1 142.9 142.9 48 48 0 1 1 75 75zM437 369.1A48 48 0 1 1 369.1 437 48 48 0 1 1 437 369.1z"]},Uo={prefix:"fas",iconName:"sliders",icon:[512,512,["sliders-h"],"f1de","M32 64C14.3 64 0 78.3 0 96s14.3 32 32 32l86.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 128c17.7 0 32-14.3 32-32s-14.3-32-32-32L265.3 64C253 35.7 224.8 16 192 16s-61 19.7-73.3 48L32 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l246.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48l54.7 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-54.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 224zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l54.7 0c12.3 28.3 40.5 48 73.3 48s61-19.7 73.3-48L480 448c17.7 0 32-14.3 32-32s-14.3-32-32-32l-246.7 0c-12.3-28.3-40.5-48-73.3-48s-61 19.7-73.3 48L32 384z"]},Yo={prefix:"fas",iconName:"arrow-turn-down",icon:[384,512,["level-down"],"f149","M32 64C14.3 64 0 49.7 0 32S14.3 0 32 0l96 0c53 0 96 43 96 96l0 306.7 73.4-73.4c12.5-12.5 32.8-12.5 45.3 0s12.5 32.8 0 45.3l-128 128c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 402.7 160 96c0-17.7-14.3-32-32-32L32 64z"]},Xo={prefix:"fas",iconName:"user",icon:[448,512,[128100,62144,62470,"user-alt","user-large"],"f007","M224 248a120 120 0 1 0 0-240 120 120 0 1 0 0 240zm-29.7 56C95.8 304 16 383.8 16 482.3 16 498.7 29.3 512 45.7 512l356.6 0c16.4 0 29.7-13.3 29.7-29.7 0-98.5-79.8-178.3-178.3-178.3l-59.4 0z"]},Ho={prefix:"fas",iconName:"list-ol",icon:[512,512,["list-1-2","list-numeric"],"f0cb","M0 72C0 58.8 10.7 48 24 48l48 0c13.3 0 24 10.7 24 24l0 104 24 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-96 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-80-24 0C10.7 96 0 85.3 0 72zM30.4 301.2C41.8 292.6 55.7 288 70 288l4.9 0c33.7 0 61.1 27.4 61.1 61.1 0 19.6-9.4 37.9-25.2 49.4l-24 17.5 33.2 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-90.7 0C13.1 464 0 450.9 0 434.7 0 425.3 4.5 416.5 12.1 411l70.5-51.3c3.4-2.5 5.4-6.4 5.4-10.6 0-7.2-5.9-13.1-13.1-13.1L70 336c-3.9 0-7.7 1.3-10.8 3.6L38.4 355.2c-10.6 8-25.6 5.8-33.6-4.8S-1 324.8 9.6 316.8l20.8-15.6zM224 64l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32zm0 160l256 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-256 0c-17.7 0-32-14.3-32-32s14.3-32 32-32z"]},Go={prefix:"fas",iconName:"arrow-right",icon:[512,512,[8594],"f061","M502.6 278.6c12.5-12.5 12.5-32.8 0-45.3l-160-160c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L402.7 224 32 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l370.7 0-105.4 105.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0l160-160z"]},Vo={prefix:"fas",iconName:"xmark",icon:[384,512,[128473,10005,10006,10060,215,"close","multiply","remove","times"],"f00d","M55.1 73.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L147.2 256 9.9 393.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192.5 301.3 329.9 438.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.8 256 375.1 118.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192.5 210.7 55.1 73.4z"]},Bo={prefix:"fas",iconName:"file-lines",icon:[384,512,[128441,128462,61686,"file-alt","file-text"],"f15c","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM120 256c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0zm0 96c-13.3 0-24 10.7-24 24s10.7 24 24 24l144 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-144 0z"]},qo={prefix:"fas",iconName:"circle-check",icon:[512,512,[61533,"check-circle"],"f058","M256 512a256 256 0 1 1 0-512 256 256 0 1 1 0 512zM374 145.7c-10.7-7.8-25.7-5.4-33.5 5.3L221.1 315.2 169 263.1c-9.4-9.4-24.6-9.4-33.9 0s-9.4 24.6 0 33.9l72 72c5 5 11.8 7.5 18.8 7s13.4-4.1 17.5-9.8L379.3 179.2c7.8-10.7 5.4-25.7-5.3-33.5z"]},Jo={prefix:"fas",iconName:"moon",icon:[512,512,[127769,9214],"f186","M256 0C114.6 0 0 114.6 0 256S114.6 512 256 512c68.8 0 131.3-27.2 177.3-71.4 7.3-7 9.4-17.9 5.3-27.1s-13.7-14.9-23.8-14.1c-4.9 .4-9.8 .6-14.8 .6-101.6 0-184-82.4-184-184 0-72.1 41.5-134.6 102.1-164.8 9.1-4.5 14.3-14.3 13.1-24.4S322.6 8.5 312.7 6.3C294.4 2.2 275.4 0 256 0z"]},Ko={prefix:"fas",iconName:"images",icon:[576,512,[],"f302","M96 96c0-35.3 28.7-64 64-64l320 0c35.3 0 64 28.7 64 64l0 256c0 35.3-28.7 64-64 64l-320 0c-35.3 0-64-28.7-64-64L96 96zM24 128c13.3 0 24 10.7 24 24l0 296c0 8.8 7.2 16 16 16l360 0c13.3 0 24 10.7 24 24s-10.7 24-24 24L64 512c-35.3 0-64-28.7-64-64L0 152c0-13.3 10.7-24 24-24zm168 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64zm196.5 11.5c-4.4-7.1-12.1-11.5-20.5-11.5s-16.1 4.4-20.5 11.5l-56.3 92.1-24.5-30.6c-4.6-5.7-11.4-9-18.7-9s-14.2 3.3-18.7 9l-64 80c-5.8 7.2-6.9 17.1-2.9 25.4S174.8 352 184 352l272 0c8.7 0 16.7-4.7 20.9-12.3s4.1-16.8-.5-24.3l-88-144z"]},Qo={prefix:"fas",iconName:"rotate-right",icon:[512,512,["redo-alt","rotate-forward"],"f2f9","M488 192l-144 0c-9.7 0-18.5-5.8-22.2-14.8s-1.7-19.3 5.2-26.2l46.7-46.7c-75.3-58.6-184.3-53.3-253.5 15.9-75 75-75 196.5 0 271.5s196.5 75 271.5 0c8.2-8.2 15.5-16.9 21.9-26.1 10.1-14.5 30.1-18 44.6-7.9s18 30.1 7.9 44.6c-8.5 12.2-18.2 23.8-29.1 34.7-100 100-262.1 100-362 0S-25 175 75 75c94.3-94.3 243.7-99.6 344.3-16.2L471 7c6.9-6.9 17.2-8.9 26.2-5.2S512 14.3 512 24l0 144c0 13.3-10.7 24-24 24z"]},Zo={prefix:"fas",iconName:"file-powerpoint",icon:[384,512,[],"f1c4","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM152 256c-13.3 0-24 10.7-24 24l0 144c0 13.3 10.7 24 24 24s24-10.7 24-24l0-24 24 0c39.8 0 72-32.2 72-72s-32.2-72-72-72l-48 0zm48 96l-24 0 0-48 24 0c13.3 0 24 10.7 24 24s-10.7 24-24 24z"]},a1={prefix:"fas",iconName:"chevron-down",icon:[448,512,[],"f078","M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"]},n1={prefix:"fas",iconName:"clock-rotate-left",icon:[576,512,["history"],"f1da","M288 64c106 0 192 86 192 192S394 448 288 448c-65.2 0-122.9-32.5-157.6-82.3-10.1-14.5-30.1-18-44.6-7.9s-18 30.1-7.9 44.6C124.1 468.6 201 512 288 512 429.4 512 544 397.4 544 256S429.4 0 288 0C202.3 0 126.5 42.1 80 106.7L80 80c0-17.7-14.3-32-32-32S16 62.3 16 80l0 112c0 17.7 14.3 32 32 32l24.6 0c.5 0 1 0 1.5 0l86 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-38.3 0C154.9 102.6 217 64 288 64zm24 88c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 104c0 6.4 2.5 12.5 7 17l72 72c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-65-65 0-94.1z"]},t1={prefix:"fas",iconName:"chevron-left",icon:[320,512,[9001],"f053","M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l192 192c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L77.3 256 246.6 86.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-192 192z"]},e1={prefix:"fas",iconName:"wand-magic-sparkles",icon:[576,512,["magic-wand-sparkles"],"e2ca","M263.4-27L278.2 9.8 315 24.6c3 1.2 5 4.2 5 7.4s-2 6.2-5 7.4L278.2 54.2 263.4 91c-1.2 3-4.2 5-7.4 5s-6.2-2-7.4-5L233.8 54.2 197 39.4c-3-1.2-5-4.2-5-7.4s2-6.2 5-7.4L233.8 9.8 248.6-27c1.2-3 4.2-5 7.4-5s6.2 2 7.4 5zM110.7 41.7l21.5 50.1 50.1 21.5c5.9 2.5 9.7 8.3 9.7 14.7s-3.8 12.2-9.7 14.7l-50.1 21.5-21.5 50.1c-2.5 5.9-8.3 9.7-14.7 9.7s-12.2-3.8-14.7-9.7L59.8 164.2 9.7 142.7C3.8 140.2 0 134.4 0 128s3.8-12.2 9.7-14.7L59.8 91.8 81.3 41.7C83.8 35.8 89.6 32 96 32s12.2 3.8 14.7 9.7zM464 304c6.4 0 12.2 3.8 14.7 9.7l21.5 50.1 50.1 21.5c5.9 2.5 9.7 8.3 9.7 14.7s-3.8 12.2-9.7 14.7l-50.1 21.5-21.5 50.1c-2.5 5.9-8.3 9.7-14.7 9.7s-12.2-3.8-14.7-9.7l-21.5-50.1-50.1-21.5c-5.9-2.5-9.7-8.3-9.7-14.7s3.8-12.2 9.7-14.7l50.1-21.5 21.5-50.1c2.5-5.9 8.3-9.7 14.7-9.7zM460 0c11 0 21.6 4.4 29.5 12.2l42.3 42.3C539.6 62.4 544 73 544 84s-4.4 21.6-12.2 29.5l-88.2 88.2-101.3-101.3 88.2-88.2C438.4 4.4 449 0 460 0zM44.2 398.5L308.4 134.3 409.7 235.6 145.5 499.8C137.6 507.6 127 512 116 512s-21.6-4.4-29.5-12.2L44.2 457.5C36.4 449.6 32 439 32 428s4.4-21.6 12.2-29.5z"]},r1={prefix:"fas",iconName:"grip-vertical",icon:[320,512,["grid-vertical"],"f58e","M128 40c0-22.1-17.9-40-40-40L40 0C17.9 0 0 17.9 0 40L0 88c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zm0 192c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM0 424l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 40c0-22.1-17.9-40-40-40L232 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48zM192 232l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40zM320 424c0-22.1-17.9-40-40-40l-48 0c-22.1 0-40 17.9-40 40l0 48c0 22.1 17.9 40 40 40l48 0c22.1 0 40-17.9 40-40l0-48z"]},i1={prefix:"fas",iconName:"triangle-exclamation",icon:[512,512,[9888,"exclamation-triangle","warning"],"f071","M256 0c14.7 0 28.2 8.1 35.2 21l216 400c6.7 12.4 6.4 27.4-.8 39.5S486.1 480 472 480L40 480c-14.1 0-27.2-7.4-34.4-19.5s-7.5-27.1-.8-39.5l216-400c7-12.9 20.5-21 35.2-21zm0 352a32 32 0 1 0 0 64 32 32 0 1 0 0-64zm0-192c-18.2 0-32.7 15.5-31.4 33.7l7.4 104c.9 12.5 11.4 22.3 23.9 22.3 12.6 0 23-9.7 23.9-22.3l7.4-104c1.3-18.2-13.1-33.7-31.4-33.7z"]},o1={prefix:"fas",iconName:"lock",icon:[384,512,[128274],"f023","M128 96l0 64 128 0 0-64c0-35.3-28.7-64-64-64s-64 28.7-64 64zM64 160l0-64C64 25.3 121.3-32 192-32S320 25.3 320 96l0 64c35.3 0 64 28.7 64 64l0 224c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 224c0-35.3 28.7-64 64-64z"]},s1={prefix:"fas",iconName:"filter-circle-xmark",icon:[576,512,[],"e17b","M32 64C19.1 64 7.4 71.8 2.4 83.8S.2 109.5 9.4 118.6L192 301.3 192 416c0 8.5 3.4 16.6 9.4 22.6l64 64c2.5 2.5 5.3 4.5 8.3 6-21.2-30.9-33.6-68.3-33.6-108.6 0-99.4 75.5-181.1 172.3-191l90.4-90.4c9.2-9.2 11.9-22.9 6.9-34.9S492.9 64 480 64L32 64zM432 544a144 144 0 1 0 0-288 144 144 0 1 0 0 288zm59.3-180.7l-36.7 36.7 36.7 36.7c6.2 6.2 6.2 16.4 0 22.6s-16.4 6.2-22.6 0l-36.7-36.7-36.7 36.7c-6.2 6.2-16.4 6.2-22.6 0s-6.2-16.4 0-22.6l36.7-36.7-36.7-36.7c-6.2-6.2-6.2-16.4 0-22.6s16.4-6.2 22.6 0l36.7 36.7 36.7-36.7c6.2-6.2 16.4-6.2 22.6 0s6.2 16.4 0 22.6z"]},l1={prefix:"fas",iconName:"download",icon:[448,512,[],"f019","M256 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 210.7-41.4-41.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l96 96c12.5 12.5 32.8 12.5 45.3 0l96-96c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L256 242.7 256 32zM64 320c-35.3 0-64 28.7-64 64l0 32c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-32c0-35.3-28.7-64-64-64l-46.9 0-56.6 56.6c-31.2 31.2-81.9 31.2-113.1 0L110.9 320 64 320zm304 56a24 24 0 1 1 0 48 24 24 0 1 1 0-48z"]},f1={prefix:"fas",iconName:"scissors",icon:[512,512,[9984,9986,9988,"cut"],"f0c4","M192 256l-39.5 39.5c-12.6-4.9-26.2-7.5-40.5-7.5-61.9 0-112 50.1-112 112s50.1 112 112 112 112-50.1 112-112c0-14.3-2.7-27.9-7.5-40.5L499.2 76.8c7.1-7.1 7.1-18.5 0-25.6-28.3-28.3-74.1-28.3-102.4 0L256 192 216.5 152.5c4.9-12.6 7.5-26.2 7.5-40.5 0-61.9-50.1-112-112-112S0 50.1 0 112 50.1 224 112 224c14.3 0 27.9-2.7 40.5-7.5L192 256zm97.9 97.9L396.8 460.8c28.3 28.3 74.1 28.3 102.4 0 7.1-7.1 7.1-18.5 0-25.6l-145.3-145.3-64 64zM64 112a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zm48 240a48 48 0 1 1 0 96 48 48 0 1 1 0-96z"]},c1={prefix:"fas",iconName:"file-pdf",icon:[576,512,[],"f1c1","M96 0C60.7 0 32 28.7 32 64l0 384c0 35.3 28.7 64 64 64l80 0 0-112c0-35.3 28.7-64 64-64l176 0 0-165.5c0-17-6.7-33.3-18.7-45.3L290.7 18.7C278.7 6.7 262.5 0 245.5 0L96 0zM357.5 176L264 176c-13.3 0-24-10.7-24-24L240 58.5 357.5 176zM240 380c-11 0-20 9-20 20l0 128c0 11 9 20 20 20s20-9 20-20l0-28 12 0c33.1 0 60-26.9 60-60s-26.9-60-60-60l-32 0zm32 80l-12 0 0-40 12 0c11 0 20 9 20 20s-9 20-20 20zm96-80c-11 0-20 9-20 20l0 128c0 11 9 20 20 20l32 0c28.7 0 52-23.3 52-52l0-64c0-28.7-23.3-52-52-52l-32 0zm20 128l0-88 12 0c6.6 0 12 5.4 12 12l0 64c0 6.6-5.4 12-12 12l-12 0zm88-108l0 128c0 11 9 20 20 20s20-9 20-20l0-44 28 0c11 0 20-9 20-20s-9-20-20-20l-28 0 0-24 28 0c11 0 20-9 20-20s-9-20-20-20l-48 0c-11 0-20 9-20 20z"]},u1={prefix:"fas",iconName:"shield-halved",icon:[512,512,["shield-alt"],"f3ed","M256 0c4.6 0 9.2 1 13.4 2.9L457.8 82.8c22 9.3 38.4 31 38.3 57.2-.5 99.2-41.3 280.7-213.6 363.2-16.7 8-36.1 8-52.8 0-172.4-82.5-213.1-264-213.6-363.2-.1-26.2 16.3-47.9 38.3-57.2L242.7 2.9C246.9 1 251.4 0 256 0zm0 66.8l0 378.1c138-66.8 175.1-214.8 176-303.4l-176-74.6 0 0z"]},m1={prefix:"fas",iconName:"arrow-left",icon:[512,512,[8592],"f060","M9.4 233.4c-12.5 12.5-12.5 32.8 0 45.3l160 160c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L109.3 288 480 288c17.7 0 32-14.3 32-32s-14.3-32-32-32l-370.7 0 105.4-105.4c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0l-160 160z"]},d1={prefix:"fas",iconName:"plus",icon:[448,512,[10133,61543,"add"],"2b","M256 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 160-160 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l160 0 0 160c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160 160 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-160 0 0-160z"]},g1={prefix:"fas",iconName:"copy",icon:[448,512,[],"f0c5","M192 0c-35.3 0-64 28.7-64 64l0 256c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-200.6c0-17.4-7.1-34.1-19.7-46.2L370.6 17.8C358.7 6.4 342.8 0 326.3 0L192 0zM64 128c-35.3 0-64 28.7-64 64L0 448c0 35.3 28.7 64 64 64l192 0c35.3 0 64-28.7 64-64l0-16-64 0 0 16-192 0 0-256 16 0 0-64-16 0z"]},v1={prefix:"fas",iconName:"arrow-rotate-right",icon:[512,512,[8635,"arrow-right-rotate","arrow-rotate-forward","redo"],"f01e","M436.7 74.7L448 85.4 448 32c0-17.7 14.3-32 32-32s32 14.3 32 32l0 128c0 17.7-14.3 32-32 32l-128 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l47.9 0-7.6-7.2c-.2-.2-.4-.4-.6-.6-75-75-196.5-75-271.5 0s-75 196.5 0 271.5 196.5 75 271.5 0c8.2-8.2 15.5-16.9 21.9-26.1 10.1-14.5 30.1-18 44.6-7.9s18 30.1 7.9 44.6c-8.5 12.2-18.2 23.8-29.1 34.7-100 100-262.1 100-362 0S-25 175 75 75c99.9-99.9 261.7-100 361.7-.3z"]},p1={prefix:"fas",iconName:"compress",icon:[448,512,[],"f066","M160 64c0-17.7-14.3-32-32-32S96 46.3 96 64l0 64-64 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l96 0c17.7 0 32-14.3 32-32l0-96zM32 320c-17.7 0-32 14.3-32 32s14.3 32 32 32l64 0 0 64c0 17.7 14.3 32 32 32s32-14.3 32-32l0-96c0-17.7-14.3-32-32-32l-96 0zM352 64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32l96 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-64 0 0-64zM320 320c-17.7 0-32 14.3-32 32l0 96c0 17.7 14.3 32 32 32s32-14.3 32-32l0-64 64 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-96 0z"]},h1={prefix:"fas",iconName:"eye-slash",icon:[576,512,[],"f070","M41-24.9c-9.4-9.4-24.6-9.4-33.9 0S-2.3-.3 7 9.1l528 528c9.4 9.4 24.6 9.4 33.9 0s9.4-24.6 0-33.9l-96.4-96.4c2.7-2.4 5.4-4.8 8-7.2 46.8-43.5 78.1-95.4 93-131.1 3.3-7.9 3.3-16.7 0-24.6-14.9-35.7-46.2-87.7-93-131.1-47.1-43.7-111.8-80.6-192.6-80.6-56.8 0-105.6 18.2-146 44.2L41-24.9zM204.5 138.7c23.5-16.8 52.4-26.7 83.5-26.7 79.5 0 144 64.5 144 144 0 31.1-9.9 59.9-26.7 83.5l-34.7-34.7c12.7-21.4 17-47.7 10.1-73.7-13.7-51.2-66.4-81.6-117.6-67.9-8.6 2.3-16.7 5.7-24 10l-34.7-34.7zM325.3 395.1c-11.9 3.2-24.4 4.9-37.3 4.9-79.5 0-144-64.5-144-144 0-12.9 1.7-25.4 4.9-37.3L69.4 139.2c-32.6 36.8-55 75.8-66.9 104.5-3.3 7.9-3.3 16.7 0 24.6 14.9 35.7 46.2 87.7 93 131.1 47.1 43.7 111.8 80.6 192.6 80.6 37.3 0 71.2-7.9 101.5-20.6l-64.2-64.2z"]},b1={prefix:"fas",iconName:"file-word",icon:[384,512,[],"f1c2","M0 64C0 28.7 28.7 0 64 0L213.5 0c17 0 33.3 6.7 45.3 18.7L365.3 125.3c12 12 18.7 28.3 18.7 45.3L384 448c0 35.3-28.7 64-64 64L64 512c-35.3 0-64-28.7-64-64L0 64zm208-5.5l0 93.5c0 13.3 10.7 24 24 24L325.5 176 208 58.5zM135.4 274.8c-2.9-12.9-15.7-21.1-28.6-18.2s-21.1 15.7-18.2 28.6l32 144c2.3 10.5 11.4 18.2 22.2 18.8s20.6-6.1 24-16.4l25.2-75.7 25.2 75.7c3.4 10.2 13.2 16.9 24 16.4s19.9-8.2 22.2-18.8l32-144c2.9-12.9-5.3-25.8-18.2-28.6s-25.8 5.3-28.6 18.2l-13.2 59.4-20.6-61.8c-3.3-9.8-12.4-16.4-22.8-16.4s-19.5 6.6-22.8 16.4l-20.6 61.8-13.2-59.4z"]},y1={prefix:"fas",iconName:"bolt",icon:[448,512,[9889,"zap"],"f0e7","M338.8-9.9c11.9 8.6 16.3 24.2 10.9 37.8L271.3 224 416 224c13.5 0 25.5 8.4 30.1 21.1s.7 26.9-9.6 35.5l-288 240c-11.3 9.4-27.4 9.9-39.3 1.3s-16.3-24.2-10.9-37.8L176.7 288 32 288c-13.5 0-25.5-8.4-30.1-21.1s-.7-26.9 9.6-35.5l288-240c11.3-9.4 27.4-9.9 39.3-1.3z"]},x1={prefix:"fas",iconName:"arrow-rotate-left",icon:[512,512,[8634,"arrow-left-rotate","arrow-rotate-back","arrow-rotate-backward","undo"],"f0e2","M256 64c-56.8 0-107.9 24.7-143.1 64l47.1 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L32 192c-17.7 0-32-14.3-32-32L0 32C0 14.3 14.3 0 32 0S64 14.3 64 32l0 54.7C110.9 33.6 179.5 0 256 0 397.4 0 512 114.6 512 256S397.4 512 256 512c-87 0-163.9-43.4-210.1-109.7-10.1-14.5-6.6-34.4 7.9-44.6s34.4-6.6 44.6 7.9c34.8 49.8 92.4 82.3 157.6 82.3 106 0 192-86 192-192S362 64 256 64z"]},z1={prefix:"fas",iconName:"wifi",icon:[576,512,["wifi-3","wifi-strong"],"f1eb","M288 96c-90.9 0-173.2 36-233.7 94.6-12.7 12.3-33 12-45.2-.7s-12-33 .7-45.2C81.7 74.9 179.9 32 288 32S494.3 74.9 566.3 144.7c12.7 12.3 13 32.6 .7 45.2s-32.6 13-45.2 .7C461.2 132 378.9 96 288 96zM240 432a48 48 0 1 1 96 0 48 48 0 1 1 -96 0zM168 326.2c-11.7 13.3-31.9 14.5-45.2 2.8s-14.5-31.9-2.8-45.2C161 237.4 221.1 208 288 208s127 29.4 168 75.8c11.7 13.3 10.4 33.5-2.8 45.2s-33.5 10.4-45.2-2.8C378.6 292.9 335.8 272 288 272s-90.6 20.9-120 54.2z"]},w1={prefix:"fas",iconName:"tag",icon:[512,512,[127991],"f02b","M32.5 96l0 149.5c0 17 6.7 33.3 18.7 45.3l192 192c25 25 65.5 25 90.5 0L483.2 333.3c25-25 25-65.5 0-90.5l-192-192C279.2 38.7 263 32 246 32L96.5 32c-35.3 0-64 28.7-64 64zm112 16a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"]},S1={prefix:"fas",iconName:"arrow-down",icon:[384,512,[8595],"f063","M169.4 502.6c12.5 12.5 32.8 12.5 45.3 0l160-160c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 402.7 224 32c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 370.7-105.4-105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l160 160z"]},A1={prefix:"fas",iconName:"up-down",icon:[512,512,[8597,11021,"arrows-alt-v"],"f338","M406.6 502.6l96-96c9.2-9.2 11.9-22.9 6.9-34.9S492.9 352 480 352l-64 0 0-320c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 320-64 0c-12.9 0-24.6 7.8-29.6 19.8s-2.2 25.7 6.9 34.9l96 96c12.5 12.5 32.8 12.5 45.3 0zM150.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-96 96c-9.2 9.2-11.9 22.9-6.9 34.9S19.1 160 32 160l64 0 0 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-320 64 0c12.9 0 24.6-7.8 29.6-19.8s2.2-25.7-6.9-34.9l-96-96z"]},L1={prefix:"fas",iconName:"list-check",icon:[512,512,["tasks"],"f0ae","M133.8 36.3c10.9 7.6 13.5 22.6 5.9 33.4l-56 80c-4.1 5.8-10.5 9.5-17.6 10.1S52 158 47 153L7 113C-2.3 103.6-2.3 88.4 7 79S31.6 69.7 41 79l19.8 19.8 39.6-56.6c7.6-10.9 22.6-13.5 33.4-5.9zm0 160c10.9 7.6 13.5 22.6 5.9 33.4l-56 80c-4.1 5.8-10.5 9.5-17.6 10.1S52 318 47 313L7 273c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l19.8 19.8 39.6-56.6c7.6-10.9 22.6-13.5 33.4-5.9zM224 96c0-17.7 14.3-32 32-32l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32zm0 160c0-17.7 14.3-32 32-32l224 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-224 0c-17.7 0-32-14.3-32-32zM160 416c0-17.7 14.3-32 32-32l288 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-288 0c-17.7 0-32-14.3-32-32zM64 376a40 40 0 1 1 0 80 40 40 0 1 1 0-80z"]},k1={prefix:"fas",iconName:"hashtag",icon:[512,512,[62098],"23","M214.7 .7c17.3 3.7 28.3 20.7 24.6 38l-19.1 89.3 126.5 0 22-102.7C372.4 8 389.4-3 406.7 .7s28.3 20.7 24.6 38L412.2 128 480 128c17.7 0 32 14.3 32 32s-14.3 32-32 32l-81.6 0-27.4 128 67.8 0c17.7 0 32 14.3 32 32s-14.3 32-32 32l-81.6 0-22 102.7c-3.7 17.3-20.7 28.3-38 24.6s-28.3-20.7-24.6-38l19.1-89.3-126.5 0-22 102.7c-3.7 17.3-20.7 28.3-38 24.6s-28.3-20.7-24.6-38L99.8 384 32 384c-17.7 0-32-14.3-32-32s14.3-32 32-32l81.6 0 27.4-128-67.8 0c-17.7 0-32-14.3-32-32s14.3-32 32-32l81.6 0 22-102.7C180.4 8 197.4-3 214.7 .7zM206.4 192l-27.4 128 126.5 0 27.4-128-126.5 0z"]},M1={prefix:"fas",iconName:"arrows-rotate",icon:[512,512,[128472,"refresh","sync"],"f021","M65.9 228.5c13.3-93 93.4-164.5 190.1-164.5 53 0 101 21.5 135.8 56.2 .2 .2 .4 .4 .6 .6l7.6 7.2-47.9 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l128 0c17.7 0 32-14.3 32-32l0-128c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 53.4-11.3-10.7C390.5 28.6 326.5 0 256 0 127 0 20.3 95.4 2.6 219.5 .1 237 12.2 253.2 29.7 255.7s33.7-9.7 36.2-27.1zm443.5 64c2.5-17.5-9.7-33.7-27.1-36.2s-33.7 9.7-36.2 27.1c-13.3 93-93.4 164.5-190.1 164.5-53 0-101-21.5-135.8-56.2-.2-.2-.4-.4-.6-.6l-7.6-7.2 47.9 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L32 320c-8.5 0-16.7 3.4-22.7 9.5S-.1 343.7 0 352.3l1 127c.1 17.7 14.6 31.9 32.3 31.7S65.2 496.4 65 478.7l-.4-51.5 10.7 10.1c46.3 46.1 110.2 74.7 180.7 74.7 129 0 235.7-95.4 253.4-219.5z"]},C1={prefix:"fas",iconName:"book-open",icon:[512,512,[128214,128366],"f518","M256 141.3l0 309.3 .5-.2C311.1 427.7 369.7 416 428.8 416l19.2 0 0-320-19.2 0c-42.2 0-84.1 8.4-123.1 24.6-16.8 7-33.4 13.9-49.7 20.7zM230.9 61.5L256 72 281.1 61.5C327.9 42 378.1 32 428.8 32L464 32c26.5 0 48 21.5 48 48l0 352c0 26.5-21.5 48-48 48l-35.2 0c-50.7 0-100.9 10-147.7 29.5l-12.8 5.3c-7.9 3.3-16.7 3.3-24.6 0l-12.8-5.3C184.1 490 133.9 480 83.2 480L48 480c-26.5 0-48-21.5-48-48L0 80C0 53.5 21.5 32 48 32l35.2 0c50.7 0 100.9 10 147.7 29.5z"]},I1={prefix:"fas",iconName:"table-cells-large",icon:[448,512,["th-large"],"f009","M384 96l-128 0 0 128 128 0 0-128zm64 128l0 192c0 35.3-28.7 64-64 64L64 480c-35.3 0-64-28.7-64-64L0 96C0 60.7 28.7 32 64 32l320 0c35.3 0 64 28.7 64 64l0 128zM64 288l0 128 128 0 0-128-128 0zm128-64l0-128-128 0 0 128 128 0zm64 64l0 128 128 0 0-128-128 0z"]},P1={prefix:"fas",iconName:"circle-info",icon:[512,512,["info-circle"],"f05a","M256 512a256 256 0 1 0 0-512 256 256 0 1 0 0 512zM224 160a32 32 0 1 1 64 0 32 32 0 1 1 -64 0zm-8 64l48 0c13.3 0 24 10.7 24 24l0 88 8 0c13.3 0 24 10.7 24 24s-10.7 24-24 24l-80 0c-13.3 0-24-10.7-24-24s10.7-24 24-24l24 0 0-64-24 0c-13.3 0-24-10.7-24-24s10.7-24 24-24z"]},N1={prefix:"fas",iconName:"layer-group",icon:[512,512,[],"f5fd","M232.5 5.2c14.9-6.9 32.1-6.9 47 0l218.6 101c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 149.8C5.4 145.8 0 137.3 0 128s5.4-17.9 13.9-21.8L232.5 5.2zM48.1 218.4l164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 277.8C5.4 273.8 0 265.3 0 256s5.4-17.9 13.9-21.8l34.1-15.8zM13.9 362.2l34.1-15.8 164.3 75.9c27.7 12.8 59.6 12.8 87.3 0l164.3-75.9 34.1 15.8c8.5 3.9 13.9 12.4 13.9 21.8s-5.4 17.9-13.9 21.8l-218.6 101c-14.9 6.9-32.1 6.9-47 0L13.9 405.8C5.4 401.8 0 393.3 0 384s5.4-17.9 13.9-21.8z"]};export{So as $,Ro as A,n1 as B,a1 as C,ko as D,Eo as E,z1 as F,Io as G,Jo as H,Xo as I,qo as J,jo as K,y1 as L,Wo as M,Go as N,m1 as O,Yo as P,i1 as Q,Qo as R,c1 as S,s1 as T,yo as U,l1 as V,Ao as W,xo as X,$o as Y,Oo as Z,h1 as _,Co as a,No as a0,x1 as a1,r1 as a2,To as a3,S1 as a4,d1 as a5,M1 as a6,P1 as a7,t1 as a8,v1 as a9,Do as aa,Uo as ab,Lo as ac,wo as ad,L1 as ae,Ho as af,C1 as ag,g1 as ah,Mo as ai,Po as aj,N1 as b,uo as c,p1 as d,f1 as e,b1 as f,Ko as g,A1 as h,go as i,e1 as j,bo as k,Bo as l,Zo as m,vo as n,o1 as o,mo as p,_o as q,k1 as r,Fo as s,ho as t,w1 as u,I1 as v,po as w,u1 as x,Vo as y,zo as z};
