import{ab as je,a1 as Dr,at as k,aJ as At,ac as Er,a2 as tt,al as Mr,bs as Cr,j as tr,aj as Ar,aN as zr,_ as pt,E as Tr,bv as rt,l as Or,k as Pr,a$ as Ir,aE as q,bo as $e,ay as Br,aC as Lr,ba as Ur,s as Nr,bu as zt,bp as We,aD as _e,f as Rr,H as Fr,m as j,D as Hr,be as rr,b4 as nr,I as Ve,b9 as kr,d as Gr,i as jr,a6 as $r,a_ as Wr,ak as Vr,az as qr,C as Tt,bw as qe,bJ as Ot,bj as le,aH as ue,av as Zr,bk as Yr,ai as Xr,b8 as Jr,bM as Pt,b5 as Qr}from"./B-25Pv17.js";import"./CEs4Dtq6.js";import{g as Z,i as Le,S as Kr}from"./gm3PYKnF.js";import{r as xe,b5 as M,aO as Re,a6 as ne,aD as ir,ak as Ue,b4 as Y,e as be,b2 as Te,aK as Oe,b3 as or,b6 as ce,U as en,j as tn,aI as rn,am as ar,ao as nn,aQ as on,aE as an,k as sr,C as sn,aG as It,aH as cn,aS as vt,aT as mt,a7 as ee,a8 as we,B as ln,aP as un,h as gt,g as Pe,aL as dn,L as fn,y as Ne,M as nt,P as ae,ba as hn,a4 as pn,aw as Ze,aJ as N}from"./CvU4qIrt.js";import{p as vn}from"./DgBE0kkb.js";(function(){try{var t=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{};t.SENTRY_RELEASE={id:"a95a836da85709a5534f7ae738834ca553129f18"};var e=new t.Error().stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="45887da3-b4b0-4ae3-9193-7e5a39c9f7e2",t._sentryDebugIdIdentifier="sentry-dbid-45887da3-b4b0-4ae3-9193-7e5a39c9f7e2")}catch{}})();function Ai(t,e){return e}function mn(t,e,r){for(var n=[],i=e.length,o,a=e.length,s=0;s<i;s++){let f=e[s];nr(f,()=>{if(o){if(o.pending.delete(f),o.done.add(f),o.pending.size===0){var d=t.outrogroups;it(t,pt(o.done)),d.delete(o),d.size===0&&(t.outrogroups=null)}}else a-=1},!1)}if(a===0){var l=n.length===0&&r!==null;if(l){var u=r,c=u.parentNode;$r(c),c.append(u),t.items.clear()}it(t,e,!l)}else o={pending:new Set(e),done:new Set},(t.outrogroups??=new Set).add(o)}function it(t,e,r=!0){var n;if(t.pending.size>0){n=new Set;for(const a of t.pending.values())for(const s of a)n.add(t.items.get(s).e)}for(var i=0;i<e.length;i++){var o=e[i];if(n?.has(o)){o.f|=j;const a=document.createDocumentFragment();Wr(o,a)}else Vr(e[i],r)}}var Bt;function zi(t,e,r,n,i,o=null){var a=t,s=new Map,l=(e&tr)!==0;if(l){var u=t;a=q?$e(Br(u)):u.appendChild(je())}q&&Lr();var c=null,f=Ar(()=>{var m=r();return zr(m)?m:m==null?[]:pt(m)}),d,p=new Map,v=!0;function w(m){(b.effect.f&Hr)===0&&(b.pending.delete(m),b.fallback=c,gn(b,d,a,e,n),c!==null&&(d.length===0?(c.f&j)===0?rr(c):(c.f^=j,he(c,null,a)):nr(c,()=>{c=null})))}function h(m){b.pending.delete(m)}var g=Dr(()=>{d=k(f);var m=d.length;let y=!1;if(q){var R=Ur(a)===Nr;R!==(m===0)&&(a=zt(),$e(a),We(!1),y=!0)}for(var C=new Set,x=Er,_=Cr(),z=0;z<m;z+=1){q&&_e.nodeType===Rr&&_e.data===Fr&&(a=_e,y=!0,We(!1));var S=d[z],D=n(S,z),T=v?null:s.get(D);T?(T.v&&At(T.v,S),T.i&&At(T.i,z),_&&x.unskip_effect(T.e)):(T=yn(s,v?a:Bt??=je(),S,D,z,i,e,r),v||(T.e.f|=j),s.set(D,T)),C.add(D)}if(m===0&&o&&!c&&(v?c=tt(()=>o(a)):(c=tt(()=>o(Bt??=je())),c.f|=j)),m>C.size&&Mr(),q&&m>0&&$e(zt()),!v)if(p.set(x,C),_){for(const[L,U]of s)C.has(L)||x.skip_effect(U.e);x.oncommit(w),x.ondiscard(h)}else w(x);y&&We(!0),k(f)}),b={effect:g,items:s,pending:p,outrogroups:null,fallback:c};v=!1,q&&(a=_e)}function de(t){for(;t!==null&&(t.f&Gr)===0;)t=t.next;return t}function gn(t,e,r,n,i){var o=(n&jr)!==0,a=e.length,s=t.items,l=de(t.effect.first),u,c=null,f,d=[],p=[],v,w,h,g;if(o)for(g=0;g<a;g+=1)v=e[g],w=i(v,g),h=s.get(w).e,(h.f&j)===0&&(h.nodes?.a?.measure(),(f??=new Set).add(h));for(g=0;g<a;g+=1){if(v=e[g],w=i(v,g),h=s.get(w).e,t.outrogroups!==null)for(const S of t.outrogroups)S.pending.delete(h),S.done.delete(h);if((h.f&Ve)!==0&&(rr(h),o&&(h.nodes?.a?.unfix(),(f??=new Set).delete(h))),(h.f&j)!==0)if(h.f^=j,h===l)he(h,null,r);else{var b=c?c.next:l;h===t.effect.last&&(t.effect.last=h.prev),h.prev&&(h.prev.next=h.next),h.next&&(h.next.prev=h.prev),V(t,c,h),V(t,h,b),he(h,b,r),c=h,d=[],p=[],l=de(c.next);continue}if(h!==l){if(u!==void 0&&u.has(h)){if(d.length<p.length){var m=p[0],y;c=m.prev;var R=d[0],C=d[d.length-1];for(y=0;y<d.length;y+=1)he(d[y],m,r);for(y=0;y<p.length;y+=1)u.delete(p[y]);V(t,R.prev,C.next),V(t,c,R),V(t,C,m),l=m,c=C,g-=1,d=[],p=[]}else u.delete(h),he(h,l,r),V(t,h.prev,h.next),V(t,h,c===null?t.effect.first:c.next),V(t,c,h),c=h;continue}for(d=[],p=[];l!==null&&l!==h;)(u??=new Set).add(l),p.push(l),l=de(l.next);if(l===null)continue}(h.f&j)===0&&d.push(h),c=h,l=de(h.next)}if(t.outrogroups!==null){for(const S of t.outrogroups)S.pending.size===0&&(it(t,pt(S.done)),t.outrogroups?.delete(S));t.outrogroups.size===0&&(t.outrogroups=null)}if(l!==null||u!==void 0){var x=[];if(u!==void 0)for(h of u)(h.f&Ve)===0&&x.push(h);for(;l!==null;)(l.f&Ve)===0&&l!==t.fallback&&x.push(l),l=de(l.next);var _=x.length;if(_>0){var z=(n&tr)!==0&&a===0?r:null;if(o){for(g=0;g<_;g+=1)x[g].nodes?.a?.measure();for(g=0;g<_;g+=1)x[g].nodes?.a?.fix()}mn(t,x,z)}}o&&kr(()=>{if(f!==void 0)for(h of f)h.nodes?.a?.apply()})}function yn(t,e,r,n,i,o,a,s){var l=(a&Or)!==0?(a&Pr)===0?Ir(r,!1,!1):rt(r):null,u=(a&Tr)!==0?rt(i):null;return{v:l,i:u,e:tt(()=>(o(e,l??r,u??i,s),()=>{t.delete(n)}))}}function he(t,e,r){if(t.nodes)for(var n=t.nodes.start,i=t.nodes.end,o=e&&(e.f&j)===0?e.nodes.start:r;n!==null;){var a=qr(n);if(o.before(n),n===i)return;n=a}}function V(t,e,r){e===null?t.effect.first=r:e.next=r,r===null?t.effect.last=e:r.prev=e}function cr(t){var e,r,n="";if(typeof t=="string"||typeof t=="number")n+=t;else if(typeof t=="object")if(Array.isArray(t)){var i=t.length;for(e=0;e<i;e++)t[e]&&(r=cr(t[e]))&&(n&&(n+=" "),n+=r)}else for(r in t)t[r]&&(n&&(n+=" "),n+=r);return n}function xn(){for(var t,e,r=0,n="",i=arguments.length;r<i;r++)(t=arguments[r])&&(e=cr(t))&&(n&&(n+=" "),n+=e);return n}function Ti(t){return typeof t=="object"?xn(t):t??""}const Lt=[...` 	
\r\f \v\uFEFF`];function bn(t,e,r){var n=t==null?"":""+t;if(e&&(n=n?n+" "+e:e),r){for(var i of Object.keys(r))if(r[i])n=n?n+" "+i:i;else if(n.length)for(var o=i.length,a=0;(a=n.indexOf(i,a))>=0;){var s=a+o;(a===0||Lt.includes(n[a-1]))&&(s===n.length||Lt.includes(n[s]))?n=(a===0?"":n.substring(0,a))+n.substring(s+1):a=s}}return n===""?null:n}function Ut(t,e=!1){var r=e?" !important;":";",n="";for(var i of Object.keys(t)){var o=t[i];o!=null&&o!==""&&(n+=" "+i+": "+o+r)}return n}function Ye(t){return t[0]!=="-"||t[1]!=="-"?t.toLowerCase():t}function Oi(t,e){if(e){var r="",n,i;if(Array.isArray(e)?(n=e[0],i=e[1]):n=e,t){t=String(t).replaceAll(/\s*\/\*.*?\*\/\s*/g,"").trim();var o=!1,a=0,s=!1,l=[];n&&l.push(...Object.keys(n).map(Ye)),i&&l.push(...Object.keys(i).map(Ye));var u=0,c=-1;const w=t.length;for(var f=0;f<w;f++){var d=t[f];if(s?d==="/"&&t[f-1]==="*"&&(s=!1):o?o===d&&(o=!1):d==="/"&&t[f+1]==="*"?s=!0:d==='"'||d==="'"?o=d:d==="("?a++:d===")"&&a--,!s&&o===!1&&a===0){if(d===":"&&c===-1)c=f;else if(d===";"||f===w-1){if(c!==-1){var p=Ye(t.substring(u,c).trim());if(!l.includes(p)){d!==";"&&f++;var v=t.substring(u,f).trim();r+=" "+v+";"}}u=f+1,c=-1}}}}return n&&(r+=Ut(n)),i&&(r+=Ut(i,!0)),r=r.trim(),r===""?null:r}return t==null?null:String(t)}function Pi(t,e,r,n,i,o){var a=t[Tt];if(q||a!==r||a===void 0){var s=bn(r,n,o);(!q||s!==t.getAttribute("class"))&&(s==null?t.removeAttribute("class"):e?t.className=s:t.setAttribute("class",s)),t[Tt]=r}else if(o&&i!==o)for(var l in o){var u=!!o[l];(i==null||u!==!!i[l])&&t.classList.toggle(l,u)}return o}class lr extends Map{#e=new Map;#t=qe(0);#r=qe(0);#o=Ot||-1;constructor(e){if(super(),e){for(var[r,n]of e)super.set(r,n);this.#r.v=super.size}}#n(e){return Ot===this.#o?qe(e):rt(e)}has(e){var r=this.#e,n=r.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),r.set(e,n);else return k(this.#t),!1;return k(n),!0}forEach(e,r){this.#i(),super.forEach(e,r)}get(e){var r=this.#e,n=r.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),r.set(e,n);else{k(this.#t);return}return k(n),super.get(e)}set(e,r){var n=this.#e,i=n.get(e),o=super.get(e),a=super.set(e,r),s=this.#t;if(i===void 0)i=this.#n(0),n.set(e,i),le(this.#r,super.size),ue(s);else if(o!==r){ue(i);var l=s.reactions===null?null:new Set(s.reactions),u=l===null||!i.reactions?.every(c=>l.has(c));u&&ue(s)}return a}delete(e){var r=this.#e,n=r.get(e),i=super.delete(e);return n!==void 0&&(r.delete(e),le(n,-1)),i&&(le(this.#r,super.size),ue(this.#t)),i}clear(){if(super.size!==0){super.clear();var e=this.#e;le(this.#r,0);for(var r of e.values())le(r,-1);ue(this.#t),e.clear()}}#i(){k(this.#t);var e=this.#e;if(this.#r.v!==e.size){for(var r of super.keys())if(!e.has(r)){var n=this.#n(0);e.set(r,n)}}for([,n]of this.#e)k(n)}keys(){return k(this.#t),super.keys()}values(){return this.#i(),super.values()}entries(){return this.#i(),super.entries()}[Symbol.iterator](){return this.entries()}get size(){return k(this.#r),super.size}}const Ii=()=>{const t=Z({});return Yr("threlte-user-context",t),t},wn=()=>{const t=Zr("threlte-user-context");if(!t)throw new Error("useUserContext can only be used in a child component to <Canvas>.");return t};function Sn(t,e,r){const n=wn();if(!n)throw new Error("No user context store found, did you invoke this function outside of your main <Canvas> component?");return t?t&&!e?Xr(n,i=>i[t]):(n.update(i=>{if(t in i)return i;const o=typeof e=="function"?e():e;return i[t]=o,i}),n.current[t]):{subscribe:n.subscribe}}const X=t=>({subscribe:t.subscribe,get current(){return t.current}});let pe=0;const yt=Z(!1),Fe=Z(!1),xt=Z(void 0),bt=Z(0),wt=Z(0),ur=Z([]),St=Z(0),{onStart:_n,onLoad:Dn,onError:En}=xe;xe.onStart=(t,e,r)=>{_n?.(t,e,r),Fe.set(!0),xt.set(t),bt.set(e),wt.set(r);const n=(e-pe)/(r-pe);St.set(n),n===1&&yt.set(!0)};xe.onLoad=()=>{Dn?.(),Fe.set(!1)};xe.onError=t=>{En?.(t),ur.update(e=>[...e,t])};xe.onProgress=(t,e,r)=>{e===r&&(pe=r),Fe.set(!0),xt.set(t),bt.set(e),wt.set(r);const n=(e-pe)/(r-pe)||1;St.set(n),n===1&&yt.set(!0)};X(Fe),X(xt),X(bt),X(wt),X(ur),X(St),X(yt);new M;new M;new M;const De=new Re,Nt=new ne,Rt=new ir,Xe=new M,Bi=function(t,e){if(this.geometry.boundingSphere===null&&this.geometry.computeBoundingSphere(),De.copy(this.geometry.boundingSphere??De),De.applyMatrix4(this.matrixWorld),!t.ray.intersectsSphere(De)||(Nt.copy(this.matrixWorld).invert(),Rt.copy(t.ray).applyMatrix4(Nt),this.geometry.boundingBox!==null&&Rt.intersectBox(this.geometry.boundingBox,Xe)===null))return;const r=Xe.distanceTo(t.ray.origin),n=Xe.clone();e.push({distance:r,point:n,object:this})};new M;new ne;new M;new M;new Ue;const te=new M,He=new M,Mn=new M,Cn=new Y,Li=(t,e,r)=>{const n=te.setFromMatrixPosition(t.matrixWorld);n.project(e);const i=r.width/2,o=r.height/2;return[n.x*i+i,-(n.y*o)+o]},Ui=(t,e)=>{const r=te.setFromMatrixPosition(t.matrixWorld),n=He.setFromMatrixPosition(e.matrixWorld),i=r.sub(n),o=e.getWorldDirection(Mn);return i.angleTo(o)>Math.PI/2},Ni=(t,e,r,n)=>{const i=te.setFromMatrixPosition(t.matrixWorld),o=He.copy(te);o.project(e),r.setFromCamera(Cn.set(o.x,o.y),e);const a=r.intersectObjects(n,!0);if(a.length){const s=a[0].distance;return i.distanceTo(r.ray.origin)<s}return!0},Ri=(t,e)=>{if(Le(e,"OrthographicCamera"))return e.zoom;if(Le(e,"PerspectiveCamera")){const r=te.setFromMatrixPosition(t.matrixWorld),n=He.setFromMatrixPosition(e.matrixWorld),i=e.fov*Math.PI/180,o=r.distanceTo(n);return 1/(2*Math.tan(i/2)*o)}else return 1},Fi=(t,e,r)=>{const n=te.setFromMatrixPosition(t.matrixWorld),i=He.setFromMatrixPosition(e.matrixWorld),o=n.distanceTo(i),a=(r[1]-r[0])/(e.far-e.near),s=r[1]-a*e.far;return Math.round(a*o+s)},B=t=>Math.abs(t)<1e-10?0:t,dr=(t,e,r="")=>{const{elements:n}=t;return`${r}matrix3d(
    ${B(e[0]*n[0])},${B(e[1]*n[1])},${B(e[2]*n[2])},${B(e[3]*n[3])},
    ${B(e[4]*n[4])},${B(e[5]*n[5])},${B(e[6]*n[6])},${B(e[7]*n[7])},
    ${B(e[8]*n[8])},${B(e[9]*n[9])},${B(e[10]*n[10])},${B(e[11]*n[11])},
    ${B(e[12]*n[12])},${B(e[13]*n[13])},${B(e[14]*n[14])},${B(e[15]*n[15])}
  )`},Hi=(t=>e=>dr(e,t))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),ki=(t=>(e,r)=>dr(e,t(r),"translate(-50%,-50%)"))(t=>[1/t,1/t,1/t,1,-1/t,-1/t,-1/t,-1,1/t,1/t,1/t,1,1,1,1,1]),Gi=(t,e,r)=>{if(Le(t,"OrthographicCamera"))return 1;if(Le(t,"PerspectiveCamera")){const{width:n,height:i}=r,o=t.getWorldPosition(te).distanceTo(e),a=t.fov*Math.PI/180,l=2*Math.tan(a/2)*o*(n/i);return n/l}throw new Error("getViewportFactor needs a Perspective or Orthographic Camera")};var An=Object.defineProperty,zn=(t,e,r)=>e in t?An(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r,E=(t,e,r)=>zn(t,typeof e!="symbol"?e+"":e,r);const fr=(t,e)=>{const[r,n]=e.split("-");return Object.assign(t.style,{left:n==="left"?"0":n==="center"?"50%":"",right:n==="right"?"0":"",top:r==="top"?"0":r==="bottom"?"":"50%",bottom:r==="bottom"?"0":"",transform:`${n==="center"?"translateX(-50%)":""} ${r==="center"?"translateY(-50%)":""}`}),e},Tn=({placement:t,size:e,offset:r,id:n,className:i})=>{const o=document.createElement("div"),{top:a,left:s,right:l,bottom:u}=r;return Object.assign(o.style,{id:n,position:"absolute",zIndex:"1000",height:`${e}px`,width:`${e}px`,margin:`${a}px ${l}px ${u}px ${s}px`,borderRadius:"100%"}),fr(o,t),n&&(o.id=n),i&&(o.className=i),o},On=t=>{const e=typeof t=="string"?document.querySelector(t):t;if(!e)throw Error("Invalid DOM element");return e};function ot(t,e,r){return Math.max(e,Math.min(r,t))}const Pn=[["x",0,3],["y",1,4],["z",2,5]],Ft=new M;function Ht({isSphere:t},e,r){t&&(Ft.set(0,0,1).applyQuaternion(r.quaternion),Pn.forEach(([n,i,o])=>{const a=Ft[n];let s=e[i],l=s.userData.opacity;s.material.opacity=ot(a>=0?l:l/2,0,1),s=e[o],l=s.userData.opacity,s.material.opacity=ot(a>=0?l/2:l,0,1)}))}const In=(t,e,r=10)=>Math.abs(t.clientX-e.x)<r&&Math.abs(t.clientY-e.y)<r,kt=new an,Gt=new Y,jt=(t,e,r,n)=>{Gt.set((t.clientX-e.left)/e.width*2-1,-((t.clientY-e.top)/e.height)*2+1),kt.setFromCamera(Gt,r);const i=kt.intersectObjects(n,!1),o=i.length?i[0]:null;return!o||!o.object.visible?null:o},Je=1e-6,Bn=2*Math.PI,hr=["x","y","z"],ve=[...hr,"nx","ny","nz"],Ln=["x","z","y","nx","nz","ny"],Un=["z","x","y","nz","nx","ny"],at="Right",Ie="Top",st="Front",ct="Left",Be="Bottom",lt="Back",Nn=[at,Ie,st,ct,Be,lt].map(t=>t.toLocaleLowerCase()),pr=1.3,$t=(t,e=!0)=>{const{material:r,userData:n}=t,{color:i,opacity:o}=e?n.hover:n;r.color.set(i),r.opacity=o},J=t=>JSON.parse(JSON.stringify(t)),Rn=t=>{const e=t.type||"sphere",r=e==="sphere",n=t.resolution||r?64:128,i=Ue.DEFAULT_UP,o=i.z===1,a=i.x===1,{container:s}=t;t.container=void 0,t=JSON.parse(JSON.stringify(t)),t.container=s;const l=o?Ln:a?Un:ve;Nn.forEach((d,p)=>{t[d]&&(t[l[p]]=t[d])});const u={enabled:!0,color:16777215,opacity:1,scale:.7,labelColor:2236962,line:!1,border:{size:0,color:14540253},hover:{color:r?16777215:9688043,labelColor:2236962,opacity:1,scale:.7,border:{size:0,color:14540253}}},c={line:!1,scale:r?.45:.7,hover:{scale:r?.5:.7}},f={type:e,container:document.body,size:128,placement:"top-right",resolution:n,lineWidth:4,radius:r?1:.2,smoothness:18,animated:!0,speed:1,background:{enabled:!0,color:r?16777215:14739180,opacity:r?0:1,hover:{color:r?16777215:14739180,opacity:r?.2:1}},font:{family:"sans-serif",weight:900},offset:{top:10,left:10,bottom:10,right:10},corners:{enabled:!r,color:r?15915362:16777215,opacity:1,scale:r?.15:.2,radius:1,smoothness:18,hover:{color:r?16777215:9688043,opacity:1,scale:r?.2:.225}},edges:{enabled:!r,color:r?15915362:16777215,opacity:r?1:0,radius:r?1:.125,smoothness:18,scale:r?.15:1,hover:{color:r?16777215:9688043,opacity:1,scale:r?.2:1}},x:{...J(u),...r?{label:"X",color:16725587,line:!0}:{label:a?Ie:at}},y:{...J(u),...r?{label:"Y",color:9100032,line:!0}:{label:o||a?st:Ie}},z:{...J(u),...r?{label:"Z",color:2920447,line:!0}:{label:o?Ie:a?at:st}},nx:{...J(c),label:r?"":a?Be:ct},ny:{...J(c),label:r?"":o||a?lt:Be},nz:{...J(c),label:r?"":o?Be:a?ct:lt}};return ut(t,f),hr.forEach(d=>ut(t[`n${d}`],J(t[d]))),{...t,isSphere:r}};function ut(t,...e){if(t instanceof HTMLElement||typeof t!="object"||t===null)return t;for(const r of e)for(const n in r)n!=="container"&&n in r&&(t[n]===void 0?t[n]=r[n]:typeof r[n]=="object"&&!Array.isArray(r[n])&&(t[n]=ut(t[n]||{},r[n])));return t}const Fn=(t,e=2)=>{const r=new sr,n=e*2,{isSphere:i,resolution:o,radius:a,font:s,corners:l,edges:u}=t,c=ve.map(x=>({...t[x],radius:a}));i&&l.enabled&&c.push(l),i&&u.enabled&&c.push(u);const f=document.createElement("canvas"),d=f.getContext("2d");f.width=o*2+n*2,f.height=o*c.length+n*c.length;const[p,v]=R(c,o,s);c.forEach(({radius:x,label:_,color:z,labelColor:S,border:D,hover:{color:T,labelColor:L,border:U}},$)=>{const W=o*$+$*n+e;y(e,W,e,o,x,_,D,z,S),y(o+e*3,W,e,o,x,_,U??D,T??z,L??S)});const w=c.length,h=e/(o*2),g=e/(o*6),b=1/w,m=new sn(f);return m.repeat.set(.5-2*h,b-2*g),m.offset.set(h,1-g),Object.assign(m,{colorSpace:cn,wrapS:It,wrapT:It,userData:{offsetX:h,offsetY:g,cellHeight:b}}),m;function y(x,_,z,S,D,T,L,U,$){if(D=D*(S/2),U!=null&&U!==""&&(W(),d.fillStyle=r.set(U).getStyle(),d.fill()),L&&L.size){const ie=L.size*S/2;x+=ie,_+=ie,S-=L.size*S,D=Math.max(0,D-ie),W(),d.strokeStyle=r.set(L.color).getStyle(),d.lineWidth=L.size*S,d.stroke()}T&&C(d,x+S/2,_+(S+z)/2,T,r.set($).getStyle());function W(){d.beginPath(),d.moveTo(x+D,_),d.lineTo(x+S-D,_),d.arcTo(x+S,_,x+S,_+D,D),d.lineTo(x+S,_+S-D),d.arcTo(x+S,_+S,x+S-D,_+S,D),d.lineTo(x+D,_+S),d.arcTo(x,_+S,x,_+S-D,D),d.lineTo(x,_+D),d.arcTo(x,_,x+D,_,D),d.closePath()}}function R(x,_,z){const S=[...x].sort((Se,_r)=>{var Mt,Ct;return(((Mt=Se.label)==null?void 0:Mt.length)||0)-(((Ct=_r.label)==null?void 0:Ct.length)||0)}).pop().label,{family:D,weight:T}=z,L=i?Math.sqrt(Math.pow(_*.7,2)/2):_;let U=L,$=0,W=0;do{d.font=`${T} ${U}px ${D}`;const Se=d.measureText(S);$=Se.width,W=Se.fontBoundingBoxDescent,U--}while($>L&&U>0);const ie=L/W,wr=Math.min(L/$,ie),Sr=Math.floor(U*wr);return[`${T} ${Sr}px ${D}`,ie]}function C(x,_,z,S,D){x.font=p,x.textAlign="center",x.textBaseline="middle",x.fillStyle=D,x.fillText(S,_,z+(i?v:0))}},Hn=(t,e)=>t.offset.x=(e?.5:0)+t.userData.offsetX,_t=(t,e)=>{const{offset:r,userData:{offsetY:n,cellHeight:i}}=t;r.y=1-(e+1)*i+n};function Dt(t,e,r=2,n=2){const i=r/2-t,o=n/2-t,a=t/r,s=(r-t)/r,l=t/n,u=(n-t)/n,c=[i,o,0,-i,o,0,-i,-o,0,i,-o,0],f=[s,u,a,u,a,l,s,l],d=[3*(e+1)+3,3*(e+1)+4,e+4,e+5,2*(e+1)+4,2,1,2*(e+1)+3,3,4*(e+1)+3,4,0],p=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11].map(C=>d[C]);let v,w,h,g,b,m,y,R;for(let C=0;C<4;C++){g=C<1||C>2?i:-i,b=C<2?o:-o,m=C<1||C>2?s:a,y=C<2?u:l;for(let x=0;x<=e;x++)v=Math.PI/2*(C+x/e),w=Math.cos(v),h=Math.sin(v),c.push(g+t*w,b+t*h,0),f.push(m+a*w,y+l*h),x<e&&(R=(e+1)*C+x+4,p.push(C,R,R+1))}return new gt().setIndex(new Pe(new Uint32Array(p),1)).setAttribute("position",new Pe(new Float32Array(c),3)).setAttribute("uv",new Pe(new Float32Array(f),2))}const kn=(t,e)=>{const r=new M,{isSphere:n,radius:i,smoothness:o}=t,a=Dt(i,o);return ve.map((s,l)=>{const u=l<3,c=ve[l],f=l?e.clone():e;_t(f,l);const{enabled:d,scale:p,opacity:v,hover:w}=t[c],h={map:f,opacity:v,transparent:!0},g=n?new vt(new mt(h)):new ee(a,new we(h)),b=u?c:c[1];return g.position[b]=(u?1:-1)*(n?pr:1),n||g.lookAt(r.copy(g.position).multiplyScalar(1.7)),g.scale.setScalar(p),g.renderOrder=1,g.visible=d,g.userData={scale:p,opacity:v,hover:w},g})},Gn=(t,e)=>{const{isSphere:r,corners:n}=t;if(!n.enabled)return[];const{color:i,opacity:o,scale:a,radius:s,smoothness:l,hover:u}=n,c=r?null:Dt(s,l),f={transparent:!0,opacity:o},d=[1,1,1,-1,1,1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,-1,-1,-1,-1,-1].map(v=>v*.85),p=new M;return Array(d.length/3).fill(0).map((v,w)=>{if(r){const b=e.clone();_t(b,6),f.map=b}else f.color=i;const h=r?new vt(new mt(f)):new ee(c,new we(f)),g=w*3;return h.position.set(d[g],d[g+1],d[g+2]),r&&h.position.normalize().multiplyScalar(1.7),h.scale.setScalar(a),h.lookAt(p.copy(h.position).multiplyScalar(2)),h.renderOrder=1,h.userData={color:i,opacity:o,scale:a,hover:u},h})},jn=(t,e,r)=>{const{isSphere:n,edges:i}=t;if(!i.enabled)return[];const{color:o,opacity:a,scale:s,hover:l,radius:u,smoothness:c}=i,f=n?null:Dt(u,c,1.2,.25),d={transparent:!0,opacity:a},p=[0,1,1,0,-1,1,1,0,1,-1,0,1,0,1,-1,0,-1,-1,1,0,-1,-1,0,-1,1,1,0,1,-1,0,-1,1,0,-1,-1,0].map(h=>h*.925),v=new M,w=new M(0,1,0);return Array(p.length/3).fill(0).map((h,g)=>{if(n){const y=e.clone();_t(y,r),d.map=y}else d.color=o;const b=n?new vt(new mt(d)):new ee(f,new we(d)),m=g*3;return b.position.set(p[m],p[m+1],p[m+2]),n&&b.position.normalize().multiplyScalar(1.7),b.scale.setScalar(s),b.up.copy(w),b.lookAt(v.copy(b.position).multiplyScalar(2)),!n&&!b.position.y&&(b.rotation.z=Math.PI/2),b.renderOrder=1,b.userData={color:o,opacity:a,scale:s,hover:l},b})};function $n(t,e=!1){const r=t[0].index!==null,n=new Set(Object.keys(t[0].attributes)),i=new Set(Object.keys(t[0].morphAttributes)),o={},a={},s=t[0].morphTargetsRelative,l=new gt;let u=0;for(let c=0;c<t.length;++c){const f=t[c];let d=0;if(r!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const p in f.attributes){if(!n.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+'. All geometries must have compatible attributes; make sure "'+p+'" attribute exists among all geometries, or in none of them.'),null;o[p]===void 0&&(o[p]=[]),o[p].push(f.attributes[p]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". Make sure all geometries have the same number of attributes."),null;if(s!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const p in f.morphAttributes){if(!i.has(p))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+".  .morphAttributes must be consistent throughout all geometries."),null;a[p]===void 0&&(a[p]=[]),a[p].push(f.morphAttributes[p])}if(e){let p;if(r)p=f.index.count;else if(f.attributes.position!==void 0)p=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+c+". The geometry must have either an index or a position attribute"),null;l.addGroup(u,p,c),u+=p}}if(r){let c=0;const f=[];for(let d=0;d<t.length;++d){const p=t[d].index;for(let v=0;v<p.count;++v)f.push(p.getX(v)+c);c+=t[d].attributes.position.count}l.setIndex(f)}for(const c in o){const f=Wt(o[c]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" attribute."),null;l.setAttribute(c,f)}for(const c in a){const f=a[c][0].length;if(f===0)break;l.morphAttributes=l.morphAttributes||{},l.morphAttributes[c]=[];for(let d=0;d<f;++d){const p=[];for(let w=0;w<a[c].length;++w)p.push(a[c][w][d]);const v=Wt(p);if(!v)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+c+" morphAttribute."),null;l.morphAttributes[c].push(v)}}return l}function Wt(t){let e,r,n,i=-1,o=0;for(let u=0;u<t.length;++u){const c=t[u];if(e===void 0&&(e=c.array.constructor),e!==c.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(r===void 0&&(r=c.itemSize),r!==c.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=c.normalized),n!==c.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=c.gpuType),i!==c.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=c.count*r}const a=new e(o),s=new Pe(a,r,n);let l=0;for(let u=0;u<t.length;++u){const c=t[u];if(c.isInterleavedBufferAttribute){const f=l/r;for(let d=0,p=c.count;d<p;d++)for(let v=0;v<r;v++){const w=c.getComponent(d,v);s.setComponent(d+f,v,w)}}else a.set(c.array,l);l+=c.count*r}return i!==void 0&&(s.gpuType=i),s}const Wn=(t,e)=>{const{isSphere:r,background:{enabled:n,color:i,opacity:o,hover:a}}=e;let s;const l=new we({color:i,side:ln,opacity:o,transparent:!0,depthWrite:!1});if(!n)return null;if(r)s=new ee(new un(1.8,64,64),l);else{let u;t.forEach(c=>{const f=c.scale.x;c.scale.setScalar(.9),c.updateMatrix();const d=c.geometry.clone();d.applyMatrix4(c.matrix),u=u?$n([u,d]):d,c.scale.setScalar(f)}),s=new ee(u,l)}return s.userData={color:i,opacity:o,hover:a},s},Vt=new be,Ee=new M;let vr=class extends fn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],r=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new Ne(e,3)),this.setAttribute("uv",new Ne(r,2))}applyMatrix4(e){const r=this.attributes.instanceStart,n=this.attributes.instanceEnd;return r!==void 0&&(r.applyMatrix4(e),n.applyMatrix4(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));const n=new nt(r,6,1);return this.setAttribute("instanceStart",new ae(n,3,0)),this.setAttribute("instanceEnd",new ae(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));const n=new nt(r,6,1);return this.setAttribute("instanceColorStart",new ae(n,3,0)),this.setAttribute("instanceColorEnd",new ae(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new hn(e.geometry)),this}fromLineSegments(e){const r=e.geometry;return this.setPositions(r.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new be);const e=this.attributes.instanceStart,r=this.attributes.instanceEnd;e!==void 0&&r!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Vt.setFromBufferAttribute(r),this.boundingBox.union(Vt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Re),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(e!==void 0&&r!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let o=0,a=e.count;o<a;o++)Ee.fromBufferAttribute(e,o),i=Math.max(i,n.distanceToSquared(Ee)),Ee.fromBufferAttribute(r,o),i=Math.max(i,n.distanceToSquared(Ee));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};Te.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Oe.line={uniforms:or.merge([Te.common,Te.fog,Te.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		void trimSegment( const in vec4 start, inout vec4 end ) {

			// trim end segment so it terminates between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column
			float nearEstimate = - 0.5 * b / a;

			float alpha = ( nearEstimate - start.z ) / ( end.z - start.z );

			end.xyz = mix( start.xyz, end.xyz, alpha );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? dashScale * instanceDistanceStart : dashScale * instanceDistanceEnd;
				vUv = uv;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					trimSegment( start, end );

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					trimSegment( end, start );

				}

			}

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			float alpha = opacity;

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};let Et=class extends dn{constructor(e){super({type:"LineMaterial",uniforms:or.clone(Oe.line.uniforms),vertexShader:Oe.line.vertexShader,fragmentShader:Oe.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};const Qe=new ce,qt=new M,Zt=new M,O=new ce,P=new ce,F=new ce,Ke=new M,et=new ne,I=new en,Yt=new M,Me=new be,Ce=new Re,H=new ce;let G,K;function Xt(t,e,r){return H.set(0,0,-e,1).applyMatrix4(t.projectionMatrix),H.multiplyScalar(1/H.w),H.x=K/r.width,H.y=K/r.height,H.applyMatrix4(t.projectionMatrixInverse),H.multiplyScalar(1/H.w),Math.abs(Math.max(H.x,H.y))}function Vn(t,e){const r=t.matrixWorld,n=t.geometry,i=n.attributes.instanceStart,o=n.attributes.instanceEnd,a=Math.min(n.instanceCount,i.count);for(let s=0,l=a;s<l;s++){I.start.fromBufferAttribute(i,s),I.end.fromBufferAttribute(o,s),I.applyMatrix4(r);const u=new M,c=new M;G.distanceSqToSegment(I.start,I.end,c,u),c.distanceTo(u)<K*.5&&e.push({point:c,pointOnLine:u,distance:G.origin.distanceTo(c),object:t,face:null,faceIndex:s,uv:null,uv1:null})}}function qn(t,e,r){const n=e.projectionMatrix,i=t.material.resolution,o=t.matrixWorld,a=t.geometry,s=a.attributes.instanceStart,l=a.attributes.instanceEnd,u=Math.min(a.instanceCount,s.count),c=-e.near;G.at(1,F),F.w=1,F.applyMatrix4(e.matrixWorldInverse),F.applyMatrix4(n),F.multiplyScalar(1/F.w),F.x*=i.x/2,F.y*=i.y/2,F.z=0,Ke.copy(F),et.multiplyMatrices(e.matrixWorldInverse,o);for(let f=0,d=u;f<d;f++){if(O.fromBufferAttribute(s,f),P.fromBufferAttribute(l,f),O.w=1,P.w=1,O.applyMatrix4(et),P.applyMatrix4(et),O.z>c&&P.z>c)continue;if(O.z>c){const g=O.z-P.z,b=(O.z-c)/g;O.lerp(P,b)}else if(P.z>c){const g=P.z-O.z,b=(P.z-c)/g;P.lerp(O,b)}O.applyMatrix4(n),P.applyMatrix4(n),O.multiplyScalar(1/O.w),P.multiplyScalar(1/P.w),O.x*=i.x/2,O.y*=i.y/2,P.x*=i.x/2,P.y*=i.y/2,I.start.copy(O),I.start.z=0,I.end.copy(P),I.end.z=0;const p=I.closestPointToPointParameter(Ke,!0);I.at(p,Yt);const v=pn.lerp(O.z,P.z,p),w=v>=-1&&v<=1,h=Ke.distanceTo(Yt)<K*.5;if(w&&h){I.start.fromBufferAttribute(s,f),I.end.fromBufferAttribute(l,f),I.start.applyMatrix4(o),I.end.applyMatrix4(o);const g=new M,b=new M;G.distanceSqToSegment(I.start,I.end,b,g),r.push({point:b,pointOnLine:g,distance:G.origin.distanceTo(b),object:t,face:null,faceIndex:f,uv:null,uv1:null})}}}class Zn extends ee{constructor(e=new vr,r=new Et({color:Math.random()*16777215})){super(e,r),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,r=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*r.count);for(let a=0,s=0,l=r.count;a<l;a++,s+=2)qt.fromBufferAttribute(r,a),Zt.fromBufferAttribute(n,a),i[s]=s===0?0:i[s-1],i[s+1]=i[s]+qt.distanceTo(Zt);const o=new nt(i,2,1);return e.setAttribute("instanceDistanceStart",new ae(o,1,0)),e.setAttribute("instanceDistanceEnd",new ae(o,1,1)),this}raycast(e,r){const n=this.material.worldUnits,i=e.camera;i===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const o=e.params.Line2!==void 0&&e.params.Line2.threshold||0;G=e.ray;const a=this.matrixWorld,s=this.geometry,l=this.material;K=l.linewidth+o,s.boundingSphere===null&&s.computeBoundingSphere(),Ce.copy(s.boundingSphere).applyMatrix4(a);let u;if(n)u=K*.5;else{const f=Math.max(i.near,Ce.distanceToPoint(G.origin));u=Xt(i,f,l.resolution)}if(Ce.radius+=u,G.intersectsSphere(Ce)===!1)return;s.boundingBox===null&&s.computeBoundingBox(),Me.copy(s.boundingBox).applyMatrix4(a);let c;if(n)c=K*.5;else{const f=Math.max(i.near,Me.distanceToPoint(G.origin));c=Xt(i,f,l.resolution)}Me.expandByScalar(c),G.intersectsBox(Me)!==!1&&(n?Vn(this,r):qn(this,i,r))}onBeforeRender(e){const r=this.material.uniforms;r&&r.resolution&&(e.getViewport(Qe),this.material.uniforms.resolution.value.set(Qe.z,Qe.w))}}class mr extends vr{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const r=e.length-3,n=new Float32Array(2*r);for(let i=0;i<r;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e){const r=e.length-3,n=new Float32Array(2*r);for(let i=0;i<r;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setColors(n),this}setFromPoints(e){const r=e.length-1,n=new Float32Array(6*r);for(let i=0;i<r;i++)n[6*i]=e[i].x,n[6*i+1]=e[i].y,n[6*i+2]=e[i].z||0,n[6*i+3]=e[i+1].x,n[6*i+4]=e[i+1].y,n[6*i+5]=e[i+1].z||0;return super.setPositions(n),this}fromLine(e){const r=e.geometry;return this.setPositions(r.attributes.position.array),this}}class Yn extends Zn{constructor(e=new mr,r=new Et({color:Math.random()*16777215})){super(e,r),this.isLine2=!0,this.type="Line2"}}const Xn=t=>{const e=new sr,r=[],n=[],{isSphere:i}=t;if(ve.forEach((s,l)=>{const{enabled:u,line:c,scale:f,color:d}=t[s];if(!u||!c)return;const p=l<3?1:-1,v=(i?pr-f/2:.975)*p;r.push(s.includes("x")?v:0,s.includes("y")?v:0,s.includes("z")?v:0,0,0,0);const w=e.set(d).toArray();n.push(...w,...w)}),!r.length)return null;const o=new mr().setPositions(r).setColors(n),a=new Et({linewidth:t.lineWidth,vertexColors:!0,resolution:new Y(window.innerWidth,window.innerHeight)});return new Yn(o,a).computeLineDistances()},Jn=t=>{const{corners:e,edges:r}=t,n=[],i=Fn(t),o=kn(t,i);n.push(...o),e.enabled&&n.push(...Gn(t,i)),r.enabled&&n.push(...jn(t,i,e.enabled?7:6));const a=Wn(o,t),s=Xn(t);return[n,a,s]},fe=(t,e=!0)=>{const{material:r,userData:n}=t,{opacity:i,color:o,scale:a}=e?n.hover:n;t.scale.setScalar(a),r.opacity=i,r.map?Hn(r.map,e):r.color.set(o)},oe=new ne,Jt=new on,Qn=new Y,Q=new M,Qt=new ce;class Wi extends Ue{constructor(e,r,n={}){super(),E(this,"enabled",!0),E(this,"camera"),E(this,"renderer"),E(this,"options"),E(this,"target",new M),E(this,"animated",!0),E(this,"speed",1),E(this,"animating",!1),E(this,"_options"),E(this,"_intersections"),E(this,"_background",null),E(this,"_viewport",[0,0,0,0]),E(this,"_originalViewport",[0,0,0,0]),E(this,"_originalScissor",[0,0,0,0]),E(this,"_scene"),E(this,"_camera"),E(this,"_container"),E(this,"_domElement"),E(this,"_domRect"),E(this,"_dragging",!1),E(this,"_distance",0),E(this,"_clock",new tn),E(this,"_targetQuaternion",new Ze),E(this,"_quaternionStart",new Ze),E(this,"_quaternionEnd",new Ze),E(this,"_pointerStart",new Y),E(this,"_focus",null),E(this,"_placement"),E(this,"_controls"),E(this,"_controlsListeners"),this.camera=e,this.renderer=r,this._scene=new rn().add(this),this.set(n)}get placement(){return this._placement}set placement(e){this._placement=fr(this._domElement,e),this.domUpdate()}set(e={}){this.dispose(),this.options=e,this._options=Rn(e),this._camera=this._options.isSphere?new ar(-1.8,1.8,1.8,-1.8,5,10):new nn(26,1,5,10),this._camera.position.set(0,0,7);const[r,n,i]=Jn(this._options);n&&this.add(n),i&&this.add(i),this.add(...r),this._background=n,this._intersections=r;const{container:o,animated:a,speed:s}=this._options;return this.animated=a,this.speed=s,this._container=o?On(o):document.body,this._domElement=Tn(this._options),this._domElement.onpointerdown=l=>this._onPointerDown(l),this._domElement.onpointermove=l=>this._onPointerMove(l),this._domElement.onpointerleave=()=>this._onPointerLeave(),this._container.appendChild(this._domElement),this._controls&&this.attachControls(this._controls),this.update(),this._updateOrientation(!0),this}render(){this.animating&&this._animate();const{renderer:e,_viewport:r}=this,n=e.getScissorTest(),i=e.autoClear;return e.autoClear=!1,e.setViewport(...r),n&&e.setScissor(...r),e.clear(!1,!0,!1),e.render(this._scene,this._camera),e.setViewport(...this._originalViewport),n&&e.setScissor(...this._originalScissor),e.autoClear=i,this}domUpdate(){this._domRect=this._domElement.getBoundingClientRect();const e=this.renderer,r=this._domRect,n=e.domElement.getBoundingClientRect();return this._viewport.splice(0,4,r.left-n.left,e.domElement.clientHeight-(r.top-n.top+r.height),r.width,r.height),e.getViewport(Qt).toArray(this._originalViewport),e.getScissorTest()&&e.getScissor(Qt).toArray(this._originalScissor),this}cameraUpdate(){return this._updateOrientation(),this}update(e=!0){return e&&this._controls&&this._controls.update(),this.domUpdate().cameraUpdate()}attachControls(e){return this.detachControls(),this.target=e.target,this._controlsListeners={start:()=>e.enabled=!1,end:()=>e.enabled=!0,change:()=>this.update(!1)},this.addEventListener("start",this._controlsListeners.start),this.addEventListener("end",this._controlsListeners.end),e.addEventListener("change",this._controlsListeners.change),this._controls=e,this}detachControls(){if(!(!this._controlsListeners||!this._controls))return this.target=new M().copy(this._controls.target),this.removeEventListener("start",this._controlsListeners.start),this.removeEventListener("end",this._controlsListeners.end),this._controls.removeEventListener("change",this._controlsListeners.change),this._controlsListeners=void 0,this._controls=void 0,this}dispose(){var e;this.detachControls(),this.children.forEach(r=>{var n,i,o,a;this.remove(r);const s=r;(n=s.material)==null||n.dispose(),(o=(i=s.material)==null?void 0:i.map)==null||o.dispose(),(a=s.geometry)==null||a.dispose()}),(e=this._domElement)==null||e.remove()}_updateOrientation(e=!0){e&&(this.quaternion.copy(this.camera.quaternion).invert(),this.updateMatrixWorld()),Ht(this._options,this._intersections,this.camera)}_animate(){const{position:e,quaternion:r}=this.camera;if(e.set(0,0,1),!this.animated){e.applyQuaternion(this._quaternionEnd).multiplyScalar(this._distance).add(this.target),r.copy(this._targetQuaternion),this._updateOrientation(),this.animating=!1,this.dispatchEvent({type:"change"}),this.dispatchEvent({type:"end"});return}this._controls&&(this._controls.enabled=!1);const n=this._clock.getDelta()*Bn*this.speed;this._quaternionStart.rotateTowards(this._quaternionEnd,n),e.applyQuaternion(this._quaternionStart).multiplyScalar(this._distance).add(this.target),r.rotateTowards(this._targetQuaternion,n),this._updateOrientation(),requestAnimationFrame(()=>this.dispatchEvent({type:"change"})),this._quaternionStart.angleTo(this._quaternionEnd)<Je&&(this._controls&&(this._controls.enabled=!0),this.animating=!1,this.dispatchEvent({type:"end"}))}_setOrientation(e){const r=this.camera,n=this.target;Q.copy(e).multiplyScalar(this._distance),oe.setPosition(Q).lookAt(Q,this.position,this.up),this._targetQuaternion.setFromRotationMatrix(oe),Q.add(n),oe.lookAt(Q,n,this.up),this._quaternionEnd.setFromRotationMatrix(oe),oe.setPosition(r.position).lookAt(r.position,n,this.up),this._quaternionStart.setFromRotationMatrix(oe),this.animating=!0,this._clock.start(),this.dispatchEvent({type:"start"})}_onPointerDown(e){if(!this.enabled)return;const r=l=>{if(!this._dragging){if(In(l,this._pointerStart))return;this._dragging=!0}const u=Qn.set(l.clientX,l.clientY).sub(this._pointerStart).multiplyScalar(1/this._domRect.width*Math.PI),c=this.coordinateConversion(Q.subVectors(this.camera.position,this.target)),f=Jt.setFromVector3(c);f.theta=a-u.x,f.phi=ot(s-u.y,Je,Math.PI-Je),this.coordinateConversion(this.camera.position.setFromSpherical(f),!0).add(this.target),this.camera.lookAt(this.target),this.quaternion.copy(this.camera.quaternion).invert(),this._updateOrientation(!1),this.dispatchEvent({type:"change"})},n=()=>{if(document.removeEventListener("pointermove",r,!1),document.removeEventListener("pointerup",n,!1),!this._dragging)return this._handleClick(e);this._focus&&(fe(this._focus,!1),this._focus=null),this._dragging=!1,this.dispatchEvent({type:"end"})};if(this.animating)return;e.preventDefault(),this._pointerStart.set(e.clientX,e.clientY);const i=this.coordinateConversion(Q.subVectors(this.camera.position,this.target)),o=Jt.setFromVector3(i),a=o.theta,s=o.phi;this._distance=o.radius,document.addEventListener("pointermove",r,!1),document.addEventListener("pointerup",n,!1),this.dispatchEvent({type:"start"})}coordinateConversion(e,r=!1){const{x:n,y:i,z:o}=e,a=Ue.DEFAULT_UP;return a.x===1?r?e.set(i,o,n):e.set(o,n,i):a.z===1?r?e.set(o,n,i):e.set(i,o,n):e}_onPointerMove(e){!this.enabled||this._dragging||(this._background&&$t(this._background,!0),this._handleHover(e))}_onPointerLeave(){!this.enabled||this._dragging||(this._background&&$t(this._background,!1),this._focus&&fe(this._focus,!1),this._domElement.style.cursor="")}_handleClick(e){const r=jt(e,this._domRect,this._camera,this._intersections);this._focus&&(fe(this._focus,!1),this._focus=null),r&&(this._setOrientation(r.object.position),this.dispatchEvent({type:"change"}))}_handleHover(e){const r=jt(e,this._domRect,this._camera,this._intersections),n=r?.object||null;this._focus!==n&&(this._domElement.style.cursor=n?"pointer":"",this._focus&&fe(this._focus,!1),(this._focus=n)?fe(n,!0):Ht(this._options,this._intersections,this.camera))}}new ne;new ne;new ee;const Kn=N.shadowmap_pars_fragment;Kn.includes("unpackRGBAToDepth");const Vi=`
    #include <common>
    ${N.logdepthbuf_pars_vertex}
    ${N.fog_pars_vertex}

    attribute vec3 previous;
    attribute vec3 next;
    attribute float side;
    attribute float width;
    attribute float counters;

    uniform vec2 resolution;
    uniform float lineWidth;
    uniform vec3 color;
    uniform float opacity;
    uniform float sizeAttenuation;
    uniform float scaleDown;

    varying vec2 vUV;
    varying vec4 vColor;
    varying float vCounters;

    vec2 intoScreen(vec4 i) {
        return resolution * (0.5 * i.xy / i.w + 0.5);
    }

    void main() {
        float aspect = resolution.y / resolution.x;

        mat4 m = projectionMatrix * modelViewMatrix;

        vec4 currentClip = m * vec4( position, 1.0 );
        vec4 prevClip = m * vec4( previous, 1.0 );
        vec4 nextClip = m * vec4( next, 1.0 );

        vec4 currentNormed = currentClip / currentClip.w;
        vec4 prevNormed = prevClip / prevClip.w;
        vec4 nextNormed = nextClip / nextClip.w;

        vec2 currentScreen = intoScreen(currentNormed);
        vec2 prevScreen = intoScreen(prevNormed);
        vec2 nextScreen = intoScreen(nextNormed);

        float actualWidth = lineWidth * width;

        vec2 dir;
        if(nextScreen == currentScreen) {
            dir = normalize( currentScreen - prevScreen );
        } else if(prevScreen == currentScreen) {
            dir = normalize( nextScreen - currentScreen );
        } else {
            vec2 inDir = currentScreen - prevScreen;
            vec2 outDir = nextScreen - currentScreen;
            vec2 fullDir = nextScreen - prevScreen;

            if(length(fullDir) > 0.0) {
                dir = normalize(fullDir);
            } else if(length(inDir) > 0.0){
                dir = normalize(inDir);
            } else {
                dir = normalize(outDir);
            }
        }

        vec2 normal = vec2(-dir.y, dir.x);

        if(sizeAttenuation != 0.0) {
            normal /= currentClip.w;
            normal *= min(resolution.x, resolution.y);
        }

        if (scaleDown > 0.0) {
            float dist = length(nextNormed - prevNormed);
            normal *= smoothstep(0.0, scaleDown, dist);
        }

        vec2 offsetInScreen = actualWidth * normal * side * 0.5;

        vec2 withOffsetScreen = currentScreen + offsetInScreen;
        vec3 withOffsetNormed = vec3((2.0 * withOffsetScreen/resolution - 1.0), currentNormed.z);

        vCounters = counters;
        vColor = vec4( color, opacity );
        vUV = uv;

        gl_Position = currentClip.w * vec4(withOffsetNormed, 1.0);

        ${N.logdepthbuf_vertex}
        ${N.fog_vertex}
    }
`;`${N.tonemapping_fragment}${N.colorspace_fragment}`;`${N.tonemapping_fragment}${N.colorspace_fragment}`;const ei=`

// A stack of uint32 indices can can store the indices for
// a perfectly balanced tree with a depth up to 31. Lower stack
// depth gets higher performance.
//
// However not all trees are balanced. Best value to set this to
// is the trees max depth.
#ifndef BVH_STACK_DEPTH
#define BVH_STACK_DEPTH 60
#endif

#ifndef INFINITY
#define INFINITY 1e20
#endif

// Utilities
uvec4 uTexelFetch1D( usampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

ivec4 iTexelFetch1D( isampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 texelFetch1D( sampler2D tex, uint index ) {

	uint width = uint( textureSize( tex, 0 ).x );
	uvec2 uv;
	uv.x = index % width;
	uv.y = index / width;

	return texelFetch( tex, ivec2( uv ), 0 );

}

vec4 textureSampleBarycoord( sampler2D tex, vec3 barycoord, uvec3 faceIndices ) {

	return
		barycoord.x * texelFetch1D( tex, faceIndices.x ) +
		barycoord.y * texelFetch1D( tex, faceIndices.y ) +
		barycoord.z * texelFetch1D( tex, faceIndices.z );

}

void ndcToCameraRay(
	vec2 coord, mat4 cameraWorld, mat4 invProjectionMatrix,
	out vec3 rayOrigin, out vec3 rayDirection
) {

	// get camera look direction and near plane for camera clipping
	vec4 lookDirection = cameraWorld * vec4( 0.0, 0.0, - 1.0, 0.0 );
	vec4 nearVector = invProjectionMatrix * vec4( 0.0, 0.0, - 1.0, 1.0 );
	float near = abs( nearVector.z / nearVector.w );

	// get the camera direction and position from camera matrices
	vec4 origin = cameraWorld * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec4 direction = invProjectionMatrix * vec4( coord, 0.5, 1.0 );
	direction /= direction.w;
	direction = cameraWorld * direction - origin;

	// slide the origin along the ray until it sits at the near clip plane position
	origin.xyz += direction.xyz * near / dot( direction, lookDirection );

	rayOrigin = origin.xyz;
	rayDirection = direction.xyz;

}
`,ti=`

#ifndef TRI_INTERSECT_EPSILON
#define TRI_INTERSECT_EPSILON 1e-5
#endif

// Raycasting
bool intersectsBounds( vec3 rayOrigin, vec3 rayDirection, vec3 boundsMin, vec3 boundsMax, out float dist ) {

	// https://www.reddit.com/r/opengl/comments/8ntzz5/fast_glsl_ray_box_intersection/
	// https://tavianator.com/2011/ray_box.html
	vec3 invDir = 1.0 / rayDirection;

	// find intersection distances for each plane
	vec3 tMinPlane = invDir * ( boundsMin - rayOrigin );
	vec3 tMaxPlane = invDir * ( boundsMax - rayOrigin );

	// get the min and max distances from each intersection
	vec3 tMinHit = min( tMaxPlane, tMinPlane );
	vec3 tMaxHit = max( tMaxPlane, tMinPlane );

	// get the furthest hit distance
	vec2 t = max( tMinHit.xx, tMinHit.yz );
	float t0 = max( t.x, t.y );

	// get the minimum hit distance
	t = min( tMaxHit.xx, tMaxHit.yz );
	float t1 = min( t.x, t.y );

	// set distance to 0.0 if the ray starts inside the box
	dist = max( t0, 0.0 );

	return t1 >= dist;

}

bool intersectsTriangle(
	vec3 rayOrigin, vec3 rayDirection, vec3 a, vec3 b, vec3 c,
	out vec3 barycoord, out vec3 norm, out float dist, out float side
) {

	// https://stackoverflow.com/questions/42740765/intersection-between-line-and-triangle-in-3d
	vec3 edge1 = b - a;
	vec3 edge2 = c - a;
	norm = cross( edge1, edge2 );

	float det = - dot( rayDirection, norm );
	float invdet = 1.0 / det;

	vec3 AO = rayOrigin - a;
	vec3 DAO = cross( AO, rayDirection );

	vec4 uvt;
	uvt.x = dot( edge2, DAO ) * invdet;
	uvt.y = - dot( edge1, DAO ) * invdet;
	uvt.z = dot( AO, norm ) * invdet;
	uvt.w = 1.0 - uvt.x - uvt.y;

	// set the hit information
	barycoord = uvt.wxy; // arranged in A, B, C order
	dist = uvt.z;
	side = sign( det );
	norm = side * normalize( norm );

	// add an epsilon to avoid misses between triangles
	uvt += vec4( TRI_INTERSECT_EPSILON );

	return all( greaterThanEqual( uvt, vec4( 0.0 ) ) );

}

bool intersectTriangles(
	// geometry info and triangle range
	sampler2D positionAttr, usampler2D indexAttr, uint offset, uint count,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// outputs
	inout float minDistance, inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	bool found = false;
	vec3 localBarycoord, localNormal;
	float localDist, localSide;
	for ( uint i = offset, l = offset + count; i < l; i ++ ) {

		uvec3 indices = uTexelFetch1D( indexAttr, i ).xyz;
		vec3 a = texelFetch1D( positionAttr, indices.x ).rgb;
		vec3 b = texelFetch1D( positionAttr, indices.y ).rgb;
		vec3 c = texelFetch1D( positionAttr, indices.z ).rgb;

		if (
			intersectsTriangle( rayOrigin, rayDirection, a, b, c, localBarycoord, localNormal, localDist, localSide )
			&& localDist < minDistance
		) {

			found = true;
			minDistance = localDist;

			faceIndices = uvec4( indices.xyz, i );
			faceNormal = localNormal;

			side = localSide;
			barycoord = localBarycoord;
			dist = localDist;

		}

	}

	return found;

}

bool intersectsBVHNodeBounds( vec3 rayOrigin, vec3 rayDirection, sampler2D bvhBounds, uint currNodeIndex, out float dist ) {

	uint cni2 = currNodeIndex * 2u;
	vec3 boundsMin = texelFetch1D( bvhBounds, cni2 ).xyz;
	vec3 boundsMax = texelFetch1D( bvhBounds, cni2 + 1u ).xyz;
	return intersectsBounds( rayOrigin, rayDirection, boundsMin, boundsMax, dist );

}

// use a macro to hide the fact that we need to expand the struct into separate fields
#define	bvhIntersectFirstHit(		bvh,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)	_bvhIntersectFirstHit(		bvh.position, bvh.index, bvh.bvhBounds, bvh.bvhContents,		rayOrigin, rayDirection, faceIndices, faceNormal, barycoord, side, dist	)

bool _bvhIntersectFirstHit(
	// bvh info
	sampler2D bvh_position, usampler2D bvh_index, sampler2D bvh_bvhBounds, usampler2D bvh_bvhContents,

	// ray
	vec3 rayOrigin, vec3 rayDirection,

	// output variables split into separate variables due to output precision
	inout uvec4 faceIndices, inout vec3 faceNormal, inout vec3 barycoord,
	inout float side, inout float dist
) {

	// stack needs to be twice as long as the deepest tree we expect because
	// we push both the left and right child onto the stack every traversal
	int pointer = 0;
	uint stack[ BVH_STACK_DEPTH ];
	stack[ 0 ] = 0u;

	float triangleDistance = INFINITY;
	bool found = false;
	while ( pointer > - 1 && pointer < BVH_STACK_DEPTH ) {

		uint currNodeIndex = stack[ pointer ];
		pointer --;

		// check if we intersect the current bounds
		float boundsHitDistance;
		if (
			! intersectsBVHNodeBounds( rayOrigin, rayDirection, bvh_bvhBounds, currNodeIndex, boundsHitDistance )
			|| boundsHitDistance > triangleDistance
		) {

			continue;

		}

		uvec2 boundsInfo = uTexelFetch1D( bvh_bvhContents, currNodeIndex ).xy;
		bool isLeaf = bool( boundsInfo.x & 0xffff0000u );

		if ( isLeaf ) {

			uint count = boundsInfo.x & 0x0000ffffu;
			uint offset = boundsInfo.y;

			found = intersectTriangles(
				bvh_position, bvh_index, offset, count,
				rayOrigin, rayDirection, triangleDistance,
				faceIndices, faceNormal, barycoord, side, dist
			) || found;

		} else {

			uint leftIndex = currNodeIndex + 1u;
			uint splitAxis = boundsInfo.x & 0x0000ffffu;
			uint rightIndex = currNodeIndex + boundsInfo.y;

			bool leftToRight = rayDirection[ splitAxis ] >= 0.0;
			uint c1 = leftToRight ? leftIndex : rightIndex;
			uint c2 = leftToRight ? rightIndex : leftIndex;

			// set c2 in the stack so we traverse it later. We need to keep track of a pointer in
			// the stack while we traverse. The second pointer added is the one that will be
			// traversed first
			pointer ++;
			stack[ pointer ] = c2;

			pointer ++;
			stack[ pointer ] = c1;

		}

	}

	return found;

}
`,ri=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`,ni=ri,ii=`
	${ei}
	${ti}
`;`${ni}${ii}${N.tonemapping_fragment}${N.colorspace_fragment}`;new be;typeof window<"u"&&document.createElement("div");const oi=()=>new lr,ai=()=>Sn("threlte-portals",oi());function qi(t,e){Jr(e,!0);let r=vn(e,"id",3,"default");Pt(()=>{e.object&&console.error('<Portal>: "object" prop has been removed. Use "attach" instead.')});const n=ai();Pt(()=>{if(!e.children)return;const i=r();return n.has(i)||n.set(i,new Kr),n.get(i)?.add(e.children),()=>{n.get(i)?.delete(e.children)}}),Qr()}new lr;for(let t=0;t<256;t++)(t<16?"0":"")+t.toString(16);new ar(-1,1,1,-1,0,1);class si extends gt{constructor(){super(),this.setAttribute("position",new Ne([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ne([0,2,0,0,2,0],2))}}new si;var gr={exports:{}};gr.exports=ke;gr.exports.default=ke;function ke(t,e,r){r=r||2;var n=e&&e.length,i=n?e[0]*r:t.length,o=yr(t,0,i,r,!0),a=[];if(!o||o.next===o.prev)return a;var s,l,u,c,f,d,p;if(n&&(o=fi(t,e,o,r)),t.length>80*r){s=u=t[0],l=c=t[1];for(var v=r;v<i;v+=r)f=t[v],d=t[v+1],f<s&&(s=f),d<l&&(l=d),f>u&&(u=f),d>c&&(c=d);p=Math.max(u-s,c-l),p=p!==0?32767/p:0}return me(o,a,r,s,l,p,0),a}function yr(t,e,r,n,i){var o,a;if(i===ht(t,e,r,n)>0)for(o=e;o<r;o+=n)a=Kt(o,t[o],t[o+1],a);else for(o=r-n;o>=e;o-=n)a=Kt(o,t[o],t[o+1],a);return a&&Ge(a,a.next)&&(ye(a),a=a.next),a}function re(t,e){if(!t)return t;e||(e=t);var r=t,n;do if(n=!1,!r.steiner&&(Ge(r,r.next)||A(r.prev,r,r.next)===0)){if(ye(r),r=e=r.prev,r===r.next)break;n=!0}else r=r.next;while(n||r!==e);return e}function me(t,e,r,n,i,o,a){if(t){!a&&o&&gi(t,n,i,o);for(var s=t,l,u;t.prev!==t.next;){if(l=t.prev,u=t.next,o?li(t,n,i,o):ci(t)){e.push(l.i/r|0),e.push(t.i/r|0),e.push(u.i/r|0),ye(t),t=u.next,s=u.next;continue}if(t=u,t===s){a?a===1?(t=ui(re(t),e,r),me(t,e,r,n,i,o,2)):a===2&&di(t,e,r,n,i,o):me(re(t),e,r,n,i,o,1);break}}}}function ci(t){var e=t.prev,r=t,n=t.next;if(A(e,r,n)>=0)return!1;for(var i=e.x,o=r.x,a=n.x,s=e.y,l=r.y,u=n.y,c=i<o?i<a?i:a:o<a?o:a,f=s<l?s<u?s:u:l<u?l:u,d=i>o?i>a?i:a:o>a?o:a,p=s>l?s>u?s:u:l>u?l:u,v=n.next;v!==e;){if(v.x>=c&&v.x<=d&&v.y>=f&&v.y<=p&&se(i,s,o,l,a,u,v.x,v.y)&&A(v.prev,v,v.next)>=0)return!1;v=v.next}return!0}function li(t,e,r,n){var i=t.prev,o=t,a=t.next;if(A(i,o,a)>=0)return!1;for(var s=i.x,l=o.x,u=a.x,c=i.y,f=o.y,d=a.y,p=s<l?s<u?s:u:l<u?l:u,v=c<f?c<d?c:d:f<d?f:d,w=s>l?s>u?s:u:l>u?l:u,h=c>f?c>d?c:d:f>d?f:d,g=dt(p,v,e,r,n),b=dt(w,h,e,r,n),m=t.prevZ,y=t.nextZ;m&&m.z>=g&&y&&y.z<=b;){if(m.x>=p&&m.x<=w&&m.y>=v&&m.y<=h&&m!==i&&m!==a&&se(s,c,l,f,u,d,m.x,m.y)&&A(m.prev,m,m.next)>=0||(m=m.prevZ,y.x>=p&&y.x<=w&&y.y>=v&&y.y<=h&&y!==i&&y!==a&&se(s,c,l,f,u,d,y.x,y.y)&&A(y.prev,y,y.next)>=0))return!1;y=y.nextZ}for(;m&&m.z>=g;){if(m.x>=p&&m.x<=w&&m.y>=v&&m.y<=h&&m!==i&&m!==a&&se(s,c,l,f,u,d,m.x,m.y)&&A(m.prev,m,m.next)>=0)return!1;m=m.prevZ}for(;y&&y.z<=b;){if(y.x>=p&&y.x<=w&&y.y>=v&&y.y<=h&&y!==i&&y!==a&&se(s,c,l,f,u,d,y.x,y.y)&&A(y.prev,y,y.next)>=0)return!1;y=y.nextZ}return!0}function ui(t,e,r){var n=t;do{var i=n.prev,o=n.next.next;!Ge(i,o)&&xr(i,n,n.next,o)&&ge(i,o)&&ge(o,i)&&(e.push(i.i/r|0),e.push(n.i/r|0),e.push(o.i/r|0),ye(n),ye(n.next),n=t=o),n=n.next}while(n!==t);return re(n)}function di(t,e,r,n,i,o){var a=t;do{for(var s=a.next.next;s!==a.prev;){if(a.i!==s.i&&bi(a,s)){var l=br(a,s);a=re(a,a.next),l=re(l,l.next),me(a,e,r,n,i,o,0),me(l,e,r,n,i,o,0);return}s=s.next}a=a.next}while(a!==t)}function fi(t,e,r,n){var i=[],o,a,s,l,u;for(o=0,a=e.length;o<a;o++)s=e[o]*n,l=o<a-1?e[o+1]*n:t.length,u=yr(t,s,l,n,!1),u===u.next&&(u.steiner=!0),i.push(xi(u));for(i.sort(hi),o=0;o<i.length;o++)r=pi(i[o],r);return r}function hi(t,e){return t.x-e.x}function pi(t,e){var r=vi(t,e);if(!r)return e;var n=br(r,t);return re(n,n.next),re(r,r.next)}function vi(t,e){var r=e,n=t.x,i=t.y,o=-1/0,a;do{if(i<=r.y&&i>=r.next.y&&r.next.y!==r.y){var s=r.x+(i-r.y)*(r.next.x-r.x)/(r.next.y-r.y);if(s<=n&&s>o&&(o=s,a=r.x<r.next.x?r:r.next,s===n))return a}r=r.next}while(r!==e);if(!a)return null;var l=a,u=a.x,c=a.y,f=1/0,d;r=a;do n>=r.x&&r.x>=u&&n!==r.x&&se(i<c?n:o,i,u,c,i<c?o:n,i,r.x,r.y)&&(d=Math.abs(i-r.y)/(n-r.x),ge(r,t)&&(d<f||d===f&&(r.x>a.x||r.x===a.x&&mi(a,r)))&&(a=r,f=d)),r=r.next;while(r!==l);return a}function mi(t,e){return A(t.prev,t,e.prev)<0&&A(e.next,t,t.next)<0}function gi(t,e,r,n){var i=t;do i.z===0&&(i.z=dt(i.x,i.y,e,r,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==t);i.prevZ.nextZ=null,i.prevZ=null,yi(i)}function yi(t){var e,r,n,i,o,a,s,l,u=1;do{for(r=t,t=null,o=null,a=0;r;){for(a++,n=r,s=0,e=0;e<u&&(s++,n=n.nextZ,!!n);e++);for(l=u;s>0||l>0&&n;)s!==0&&(l===0||!n||r.z<=n.z)?(i=r,r=r.nextZ,s--):(i=n,n=n.nextZ,l--),o?o.nextZ=i:t=i,i.prevZ=o,o=i;r=n}o.nextZ=null,u*=2}while(a>1);return t}function dt(t,e,r,n,i){return t=(t-r)*i|0,e=(e-n)*i|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t|e<<1}function xi(t){var e=t,r=t;do(e.x<r.x||e.x===r.x&&e.y<r.y)&&(r=e),e=e.next;while(e!==t);return r}function se(t,e,r,n,i,o,a,s){return(i-a)*(e-s)>=(t-a)*(o-s)&&(t-a)*(n-s)>=(r-a)*(e-s)&&(r-a)*(o-s)>=(i-a)*(n-s)}function bi(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!wi(t,e)&&(ge(t,e)&&ge(e,t)&&Si(t,e)&&(A(t.prev,t,e.prev)||A(t,e.prev,e))||Ge(t,e)&&A(t.prev,t,t.next)>0&&A(e.prev,e,e.next)>0)}function A(t,e,r){return(e.y-t.y)*(r.x-e.x)-(e.x-t.x)*(r.y-e.y)}function Ge(t,e){return t.x===e.x&&t.y===e.y}function xr(t,e,r,n){var i=ze(A(t,e,r)),o=ze(A(t,e,n)),a=ze(A(r,n,t)),s=ze(A(r,n,e));return!!(i!==o&&a!==s||i===0&&Ae(t,r,e)||o===0&&Ae(t,n,e)||a===0&&Ae(r,t,n)||s===0&&Ae(r,e,n))}function Ae(t,e,r){return e.x<=Math.max(t.x,r.x)&&e.x>=Math.min(t.x,r.x)&&e.y<=Math.max(t.y,r.y)&&e.y>=Math.min(t.y,r.y)}function ze(t){return t>0?1:t<0?-1:0}function wi(t,e){var r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==e.i&&r.next.i!==e.i&&xr(r,r.next,t,e))return!0;r=r.next}while(r!==t);return!1}function ge(t,e){return A(t.prev,t,t.next)<0?A(t,e,t.next)>=0&&A(t,t.prev,e)>=0:A(t,e,t.prev)<0||A(t,t.next,e)<0}function Si(t,e){var r=t,n=!1,i=(t.x+e.x)/2,o=(t.y+e.y)/2;do r.y>o!=r.next.y>o&&r.next.y!==r.y&&i<(r.next.x-r.x)*(o-r.y)/(r.next.y-r.y)+r.x&&(n=!n),r=r.next;while(r!==t);return n}function br(t,e){var r=new ft(t.i,t.x,t.y),n=new ft(e.i,e.x,e.y),i=t.next,o=e.prev;return t.next=e,e.prev=t,r.next=i,i.prev=r,n.next=r,r.prev=n,o.next=n,n.prev=o,n}function Kt(t,e,r,n){var i=new ft(t,e,r);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function ye(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function ft(t,e,r){this.i=t,this.x=e,this.y=r,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}ke.deviation=function(t,e,r,n){var i=e&&e.length,o=i?e[0]*r:t.length,a=Math.abs(ht(t,0,o,r));if(i)for(var s=0,l=e.length;s<l;s++){var u=e[s]*r,c=s<l-1?e[s+1]*r:t.length;a-=Math.abs(ht(t,u,c,r))}var f=0;for(s=0;s<n.length;s+=3){var d=n[s]*r,p=n[s+1]*r,v=n[s+2]*r;f+=Math.abs((t[d]-t[v])*(t[p+1]-t[d+1])-(t[d]-t[p])*(t[v+1]-t[d+1]))}return a===0&&f===0?0:Math.abs((f-a)/a)};function ht(t,e,r,n){for(var i=0,o=e,a=r-n;o<r;o+=n)i+=(t[a]-t[o])*(t[o+1]+t[a+1]),a=o;return i}ke.flatten=function(t){for(var e=t[0][0].length,r={vertices:[],holes:[],dimensions:e},n=0,i=0;i<t.length;i++){for(var o=0;o<t[i].length;o++)for(var a=0;a<e;a++)r.vertices.push(t[i][o][a]);i>0&&(n+=t[i-1].length,r.holes.push(n))}return r};new Y;new Y;var er;(t=>{function e(i){let o=i.slice();return o.sort(t.POINT_COMPARATOR),t.makeHullPresorted(o)}t.makeHull=e;function r(i){if(i.length<=1)return i.slice();let o=[];for(let s=0;s<i.length;s++){const l=i[s];for(;o.length>=2;){const u=o[o.length-1],c=o[o.length-2];if((u.x-c.x)*(l.y-c.y)>=(u.y-c.y)*(l.x-c.x))o.pop();else break}o.push(l)}o.pop();let a=[];for(let s=i.length-1;s>=0;s--){const l=i[s];for(;a.length>=2;){const u=a[a.length-1],c=a[a.length-2];if((u.x-c.x)*(l.y-c.y)>=(u.y-c.y)*(l.x-c.x))a.pop();else break}a.push(l)}return a.pop(),o.length==1&&a.length==1&&o[0].x==a[0].x&&o[0].y==a[0].y?o:o.concat(a)}t.makeHullPresorted=r;function n(i,o){return i.x<o.x?-1:i.x>o.x?1:i.y<o.y?-1:i.y>o.y?1:0}t.POINT_COMPARATOR=n})(er||(er={}));new we;new M;new ne;new ir;new Re;new be;new M;new M;export{qi as P,lr as S,Wi as X,xn as a,Ii as b,Ti as c,Li as d,zi as e,B as f,Hi as g,ki as h,Gi as i,Ai as j,Ui as k,Ni as l,Bi as m,Fi as n,Ri as o,Sn as p,Pi as s,Oi as t,ai as u,Vi as v};
