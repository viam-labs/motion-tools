import{a1 as tt,M as br,g as m,ar as jt,a3 as tn,a2 as ft,aP as rn,a5 as nn,aQ as wr,B as on,aR as sn,aG as Mt,aS as an,F as We,aT as cn,aU as ln,aV as un,J,R as rt,aa as dn,K as fn,O as hn,aj as pn,Q as Ht,T as nt,V as Ie,ah as vn,aH as mn,aW as $,D as gn,_ as Sr,a0 as _r,aX as it,a8 as yn,aY as xn,aZ as bn,aE as wn,a4 as Sn,$ as _n,aB as Dn,N as En,a6 as Cn,a_ as Mn,aJ as Dr,am as Gt,aq as Wt,I as $t,y as qt,aK as Tn,X as zn,s as K,a$ as $e,j as N,a7 as ee,b as ge,a as ce,aN as Z,aM as te,aL as F,u as L,p as Er,h as An,i as Cr,aO as On,b0 as Pn}from"./ac0cm1b7.js";import"./5pr198pP.js";import{z as Mr,A as In,D as ze,V as M,E as Ke,F as fe,G as Tr,O as qe,H as re,B as Ae,I as Ue,J as Fe,K as zr,Q as ye,W as Bn,X as Nn,Y as Rn,Z as Ar,_ as Vn,$ as kn,a0 as Or,a1 as Ln,a2 as Zt,a3 as Un,a4 as Tt,a5 as zt,a6 as le,a7 as Oe,a8 as Fn,a9 as jn,k as At,l as je,aa as Hn,ab as Gn,ac as Ze,ad as ht,ae as ve,af as Wn,ag as $n,ah as ot,ai as q}from"./Vlzsm7uj.js";import{p as we,r as qn}from"./B0SQ-Uey.js";import{b as Zn,c as Kn,a as Yn}from"./BzMxei4Z.js";import{B as Xn}from"./q1s-V4Is.js";(function(){try{var t=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{};t.SENTRY_RELEASE={id:"4219ce70feb4a5d0743addbbe00ad52b1b1f5b19"}}catch{}})();try{(function(){var t=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{},e=new t.Error().stack;e&&(t._sentryDebugIds=t._sentryDebugIds||{},t._sentryDebugIds[e]="c04bab2c-ea39-47b5-92ff-caabe0b8382c",t._sentryDebugIdIdentifier="sentry-dbid-c04bab2c-ea39-47b5-92ff-caabe0b8382c")})()}catch{}function Wo(t,e){return e}function Qn(t,e,r){for(var n=[],i=e.length,o,s=e.length,a=0;a<i;a++){let f=e[a];_r(f,()=>{if(o){if(o.pending.delete(f),o.done.add(f),o.pending.size===0){var d=t.outrogroups;pt(t,Mt(o.done)),d.delete(o),d.size===0&&(t.outrogroups=null)}}else s-=1},!1)}if(s===0){var c=n.length===0&&r!==null;if(c){var u=r,l=u.parentNode;wn(l),l.append(u),t.items.clear()}pt(t,e,!c)}else o={pending:new Set(e),done:new Set},(t.outrogroups??=new Set).add(o)}function pt(t,e,r=!0){var n;if(t.pending.size>0){n=new Set;for(const s of t.pending.values())for(const a of s)n.add(t.items.get(a).e)}for(var i=0;i<e.length;i++){var o=e[i];if(n?.has(o)){o.f|=$;const s=document.createDocumentFragment();Sn(o,s)}else _n(e[i],r)}}var Kt;function $o(t,e,r,n,i,o=null){var s=t,a=new Map,c=(e&wr)!==0;if(c){var u=t;s=J?rt(dn(u)):u.appendChild(tt())}J&&fn();var l=null,f=on(()=>{var g=r();return sn(g)?g:g==null?[]:Mt(g)}),d,h=new Map,v=!0;function S(g){(w.effect.f&gn)===0&&(w.pending.delete(g),w.fallback=l,Jn(w,d,s,e,n),l!==null&&(d.length===0?(l.f&$)===0?Sr(l):(l.f^=$,Se(l,null,s)):_r(l,()=>{l=null})))}function p(g){w.pending.delete(g)}var y=br(()=>{d=m(f);var g=d.length;let x=!1;if(J){var j=hn(s)===pn;j!==(g===0)&&(s=Ht(),rt(s),nt(!1),x=!0)}for(var T=new Set,b=tn,D=nn(),A=0;A<g;A+=1){J&&Ie.nodeType===vn&&Ie.data===mn&&(s=Ie,x=!0,nt(!1));var _=d[A],E=n(_,A),O=v?null:a.get(E);O?(O.v&&jt(O.v,_),O.i&&jt(O.i,A),D&&b.unskip_effect(O.e)):(O=ei(a,v?s:Kt??=tt(),_,E,A,i,e,r),v||(O.e.f|=$),a.set(E,O)),T.add(E)}if(g===0&&o&&!l&&(v?l=ft(()=>o(s)):(l=ft(()=>o(Kt??=tt())),l.f|=$)),g>T.size&&rn(),J&&g>0&&rt(Ht()),!v)if(h.set(b,T),D){for(const[V,U]of a)T.has(V)||b.skip_effect(U.e);b.oncommit(S),b.ondiscard(p)}else S(b);x&&nt(!0),m(f)}),w={effect:y,items:a,pending:h,outrogroups:null,fallback:l};v=!1,J&&(s=Ie)}function xe(t){for(;t!==null&&(t.f&xn)===0;)t=t.next;return t}function Jn(t,e,r,n,i){var o=(n&bn)!==0,s=e.length,a=t.items,c=xe(t.effect.first),u,l=null,f,d=[],h=[],v,S,p,y;if(o)for(y=0;y<s;y+=1)v=e[y],S=i(v,y),p=a.get(S).e,(p.f&$)===0&&(p.nodes?.a?.measure(),(f??=new Set).add(p));for(y=0;y<s;y+=1){if(v=e[y],S=i(v,y),p=a.get(S).e,t.outrogroups!==null)for(const _ of t.outrogroups)_.pending.delete(p),_.done.delete(p);if((p.f&it)!==0&&(Sr(p),o&&(p.nodes?.a?.unfix(),(f??=new Set).delete(p))),(p.f&$)!==0)if(p.f^=$,p===c)Se(p,null,r);else{var w=l?l.next:c;p===t.effect.last&&(t.effect.last=p.prev),p.prev&&(p.prev.next=p.next),p.next&&(p.next.prev=p.prev),Q(t,l,p),Q(t,p,w),Se(p,w,r),l=p,d=[],h=[],c=xe(l.next);continue}if(p!==c){if(u!==void 0&&u.has(p)){if(d.length<h.length){var g=h[0],x;l=g.prev;var j=d[0],T=d[d.length-1];for(x=0;x<d.length;x+=1)Se(d[x],g,r);for(x=0;x<h.length;x+=1)u.delete(h[x]);Q(t,j.prev,T.next),Q(t,l,j),Q(t,T,g),c=g,l=T,y-=1,d=[],h=[]}else u.delete(p),Se(p,c,r),Q(t,p.prev,p.next),Q(t,p,l===null?t.effect.first:l.next),Q(t,l,p),l=p;continue}for(d=[],h=[];c!==null&&c!==p;)(u??=new Set).add(c),h.push(c),c=xe(c.next);if(c===null)continue}(p.f&$)===0&&d.push(p),l=p,c=xe(p.next)}if(t.outrogroups!==null){for(const _ of t.outrogroups)_.pending.size===0&&(pt(t,Mt(_.done)),t.outrogroups?.delete(_));t.outrogroups.size===0&&(t.outrogroups=null)}if(c!==null||u!==void 0){var b=[];if(u!==void 0)for(p of u)(p.f&it)===0&&b.push(p);for(;c!==null;)(c.f&it)===0&&c!==t.fallback&&b.push(c),c=xe(c.next);var D=b.length;if(D>0){var A=(n&wr)!==0&&s===0?r:null;if(o){for(y=0;y<D;y+=1)b[y].nodes?.a?.measure();for(y=0;y<D;y+=1)b[y].nodes?.a?.fix()}Qn(t,b,A)}}o&&yn(()=>{if(f!==void 0)for(p of f)p.nodes?.a?.apply()})}function ei(t,e,r,n,i,o,s,a){var c=(s&cn)!==0?(s&ln)===0?un(r,!1,!1):We(r):null,u=(s&an)!==0?We(i):null;return{v:c,i:u,e:ft(()=>(o(e,c??r,u??i,a),()=>{t.delete(n)}))}}function Se(t,e,r){if(t.nodes)for(var n=t.nodes.start,i=t.nodes.end,o=e&&(e.f&$)===0?e.nodes.start:r;n!==null;){var s=Dn(n);if(o.before(n),n===i)return;n=s}}function Q(t,e,r){e===null?t.effect.first=r:e.next=r,r===null?t.effect.last=e:r.prev=e}function ti(t,e,...r){var n=new Xn(t);br(()=>{const i=e()??null;n.ensure(i,i&&(o=>i(o,...r)))},En)}function Pr(t){var e,r,n="";if(typeof t=="string"||typeof t=="number")n+=t;else if(typeof t=="object")if(Array.isArray(t)){var i=t.length;for(e=0;e<i;e++)t[e]&&(r=Pr(t[e]))&&(n&&(n+=" "),n+=r)}else for(r in t)t[r]&&(n&&(n+=" "),n+=r);return n}function ri(){for(var t,e,r=0,n="",i=arguments.length;r<i;r++)(t=arguments[r])&&(e=Pr(t))&&(n&&(n+=" "),n+=e);return n}function qo(t){return typeof t=="object"?ri(t):t??""}const Yt=[...` 	
\r\f \v\uFEFF`];function ni(t,e,r){var n=t==null?"":""+t;if(e&&(n=n?n+" "+e:e),r){for(var i of Object.keys(r))if(r[i])n=n?n+" "+i:i;else if(n.length)for(var o=i.length,s=0;(s=n.indexOf(i,s))>=0;){var a=s+o;(s===0||Yt.includes(n[s-1]))&&(a===n.length||Yt.includes(n[a]))?n=(s===0?"":n.substring(0,s))+n.substring(a+1):s=a}}return n===""?null:n}function Xt(t,e=!1){var r=e?" !important;":";",n="";for(var i of Object.keys(t)){var o=t[i];o!=null&&o!==""&&(n+=" "+i+": "+o+r)}return n}function st(t){return t[0]!=="-"||t[1]!=="-"?t.toLowerCase():t}function Zo(t,e){if(e){var r="",n,i;if(Array.isArray(e)?(n=e[0],i=e[1]):n=e,t){t=String(t).replaceAll(/\s*\/\*.*?\*\/\s*/g,"").trim();var o=!1,s=0,a=!1,c=[];n&&c.push(...Object.keys(n).map(st)),i&&c.push(...Object.keys(i).map(st));var u=0,l=-1;const S=t.length;for(var f=0;f<S;f++){var d=t[f];if(a?d==="/"&&t[f-1]==="*"&&(a=!1):o?o===d&&(o=!1):d==="/"&&t[f+1]==="*"?a=!0:d==='"'||d==="'"?o=d:d==="("?s++:d===")"&&s--,!a&&o===!1&&s===0){if(d===":"&&l===-1)l=f;else if(d===";"||f===S-1){if(l!==-1){var h=st(t.substring(u,l).trim());if(!c.includes(h)){d!==";"&&f++;var v=t.substring(u,f).trim();r+=" "+v+";"}}u=f+1,l=-1}}}}return n&&(r+=Xt(n)),i&&(r+=Xt(i,!0)),r=r.trim(),r===""?null:r}return t==null?null:String(t)}function Ko(t,e,r,n,i,o){var s=t.__className;if(J||s!==r||s===void 0){var a=ni(r,n,o);(!J||a!==t.getAttribute("class"))&&(a==null?t.removeAttribute("class"):e?t.className=a:t.setAttribute("class",a)),t.__className=r}else if(o&&i!==o)for(var c in o){var u=!!o[c];(i==null||u!==!!i[c])&&t.classList.toggle(c,u)}return o}function Ir(t,e){var r=qt,n=Wt,i=t();const o=Dr(i,s=>{var a=i!==t(),c,u=Wt,l=qt;Gt(n),$t(r);try{c=Tn(()=>{zn(()=>{const f=t();a&&s(f)})})}finally{Gt(u),$t(l)}return a=!0,c});return e?{set:e,update:s=>e(s(t())),subscribe:o.subscribe}:{subscribe:o.subscribe}}function Ot(t){let e;const r=Zn(i=>{let o=!1;const s=t.subscribe(a=>{e=a,o&&i()});return o=!0,s});function n(){return Cn()?(r(),e):Mn(t)}return"set"in t?{get current(){return n()},set current(i){t.set(i)}}:{get current(){return n()}}}var ii=["forEach","isDisjointFrom","isSubsetOf","isSupersetOf"],oi=["difference","intersection","symmetricDifference","union"],Qt=!1;class De extends Set{#r=new Map;#e=K(0);#t=K(0);#o=$e||-1;constructor(e){if(super(),e){for(var r of e)super.add(r);this.#t.v=super.size}Qt||this.#i()}#n(e){return $e===this.#o?K(e):We(e)}#i(){Qt=!0;var e=De.prototype,r=Set.prototype;for(const n of ii)e[n]=function(...i){return m(this.#e),r[n].apply(this,i)};for(const n of oi)e[n]=function(...i){m(this.#e);var o=r[n].apply(this,i);return new De(o)}}has(e){var r=super.has(e),n=this.#r,i=n.get(e);if(i===void 0){if(!r)return m(this.#e),!1;i=this.#n(!0),n.set(e,i)}return m(i),r}add(e){return super.has(e)||(super.add(e),N(this.#t,super.size),ee(this.#e)),this}delete(e){var r=super.delete(e),n=this.#r,i=n.get(e);return i!==void 0&&(n.delete(e),N(i,!1)),r&&(N(this.#t,super.size),ee(this.#e)),r}clear(){if(super.size!==0){super.clear();var e=this.#r;for(var r of e.values())N(r,!1);e.clear(),N(this.#t,0),ee(this.#e)}}keys(){return this.values()}values(){return m(this.#e),super.values()}entries(){return m(this.#e),super.entries()}[Symbol.iterator](){return this.keys()}get size(){return m(this.#t)}}class si extends Map{#r=new Map;#e=K(0);#t=K(0);#o=$e||-1;constructor(e){if(super(),e){for(var[r,n]of e)super.set(r,n);this.#t.v=super.size}}#n(e){return $e===this.#o?K(e):We(e)}has(e){var r=this.#r,n=r.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),r.set(e,n);else return m(this.#e),!1;return m(n),!0}forEach(e,r){this.#i(),super.forEach(e,r)}get(e){var r=this.#r,n=r.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),r.set(e,n);else{m(this.#e);return}return m(n),super.get(e)}set(e,r){var n=this.#r,i=n.get(e),o=super.get(e),s=super.set(e,r),a=this.#e;if(i===void 0)i=this.#n(0),n.set(e,i),N(this.#t,super.size),ee(a);else if(o!==r){ee(i);var c=a.reactions===null?null:new Set(a.reactions),u=c===null||!i.reactions?.every(l=>c.has(l));u&&ee(a)}return s}delete(e){var r=this.#r,n=r.get(e),i=super.delete(e);return n!==void 0&&(r.delete(e),N(n,-1)),i&&(N(this.#t,super.size),ee(this.#e)),i}clear(){if(super.size!==0){super.clear();var e=this.#r;N(this.#t,0);for(var r of e.values())N(r,-1);ee(this.#e),e.clear()}}#i(){m(this.#e);var e=this.#r;if(this.#t.v!==e.size){for(var r of super.keys())if(!e.has(r)){var n=this.#n(0);e.set(r,n)}}for([,n]of this.#r)m(n)}keys(){return m(this.#e),super.keys()}values(){return this.#i(),super.values()}entries(){return this.#i(),super.entries()}[Symbol.iterator](){return this.entries()}get size(){return m(this.#t),super.size}}const ne=t=>{const e=Dr(t),r={set:n=>{r.current=n,e.set(n)},subscribe:e.subscribe,update:n=>{const i=n(r.current);r.current=i,e.set(i)},current:t};return r},vt=(t,e)=>({subscribe:Ir(t,e).subscribe,set:e,update:n=>e(n(ge(t))),get current(){return ge(t)}}),Br=t=>{const{subscribe:e}=Ir(t);return{subscribe:e,get current(){return ge(t)}}},ai=t=>{const e=t.getBoundingClientRect();let r=K({width:e.width,height:e.height}),n=0,i=0,o=0,s=0,a=!0;const c=new ResizeObserver(()=>{a=!0;const l=t.getBoundingClientRect();N(r,{width:l.width,height:l.height})});function u(){const{clientWidth:l,clientHeight:f}=t;if(!a&&l===i&&f===n)return!1;i=l,n=f,a=!1;const d=t.getBoundingClientRect();return N(r,{width:d.width,height:d.height}),m(r).width===o&&m(r).height===s?!1:(o=m(r).width,s=m(r).height,!0)}return ce(()=>(c.observe(t),()=>c.disconnect())),{size:{get current(){return m(r)}},shouldUpdateSize:u}},Yo=t=>{const e=typeof t=="function"?t():t,{dom:r,canvas:n}=e,{size:i,shouldUpdateSize:o}=ai(r),s={dom:r,canvas:n,size:Br(()=>i.current),shouldUpdateSize:o};return te("threlte-dom-context",s),s},Nr=()=>{const t=Z("threlte-dom-context");if(!t)throw new Error("useDOM can only be used in a child component to <Canvas>.");return t};class Rr{allVertices=new Map;isolatedVertices=new Map;connectedVertices=new Map;sortedConnectedValues=[];needsSort=!1;listeners=new Map;emit(e,r){const n=this.listeners.get(e);if(n)for(const i of n)i(r)}on(e,r){let n=this.listeners.get(e);n||(n=new Set,this.listeners.set(e,n)),n.add(r)}off(e,r){this.listeners.get(e)?.delete(r)}get sortedVertices(){return this.mapNodes(e=>e)}moveToIsolated(e){const r=this.connectedVertices.get(e);r&&(this.isolatedVertices.set(e,r),this.connectedVertices.delete(e))}moveToConnected(e){const r=this.isolatedVertices.get(e);r&&(this.connectedVertices.set(e,r),this.isolatedVertices.delete(e))}getKey=e=>typeof e=="object"?e.key:e;add(e,r,n){let i=this.allVertices.get(e);if(i&&i.value!==void 0)throw new Error(`A node with the key ${e.toString()} already exists`);i?i.value===void 0&&(i.value=r):(i={value:r,previous:new Set,next:new Set},this.allVertices.set(e,i));const o=i.next.size>0||i.previous.size>0;if(!n?.after&&!n?.before&&!o){this.isolatedVertices.set(e,i),this.emit("node:added",{key:e,type:"isolated",value:r});return}else this.connectedVertices.set(e,i);if(n?.after){const s=Array.isArray(n.after)?n.after:[n.after];for(const a of s)i.previous.add(this.getKey(a));for(const a of s){const c=this.getKey(a),u=this.allVertices.get(c);if(u)u.next.add(e),this.moveToConnected(c);else{const l={value:void 0,previous:new Set,next:new Set([e])};this.allVertices.set(c,l),this.connectedVertices.set(c,l)}}}if(n?.before){const s=Array.isArray(n.before)?n.before:[n.before];for(const a of s)i.next.add(this.getKey(a));for(const a of s){const c=this.getKey(a),u=this.allVertices.get(c);if(u)u.previous.add(e),this.moveToConnected(c);else{const l={value:void 0,previous:new Set([e]),next:new Set};this.allVertices.set(c,l),this.connectedVertices.set(c,l)}}}this.emit("node:added",{key:e,type:"connected",value:r}),this.needsSort=!0}remove(e){const r=this.getKey(e);if(this.isolatedVertices.get(r)){this.isolatedVertices.delete(r),this.allVertices.delete(r),this.emit("node:removed",{key:r,type:"isolated"});return}const i=this.connectedVertices.get(r);if(!(!i||i.value===void 0)){for(const o of i.next){const s=this.connectedVertices.get(o);s&&(s.previous.delete(r),s.previous.size===0&&s.next.size===0&&this.moveToIsolated(o))}for(const o of i.previous){const s=this.connectedVertices.get(o);s&&(s.next.delete(r),s.previous.size===0&&s.next.size===0&&this.moveToIsolated(o))}this.connectedVertices.delete(r),this.allVertices.delete(r),this.emit("node:removed",{key:r,type:"connected"}),this.needsSort=!0}}mapNodes(e){this.needsSort&&this.sort();const r=[];return this.forEachNode((n,i)=>{r.push(e(n,i))}),r}forEachNode(e){this.needsSort&&this.sort();let r=0;for(;r<this.sortedConnectedValues.length;r++)e(this.sortedConnectedValues[r],r);for(const[,n]of this.isolatedVertices)n.value!==void 0&&e(n.value,r++)}getValueByKey(e){return this.allVertices.get(e)?.value}sort(){const e=new Map,r=[],n=[];for(const[o,s]of this.connectedVertices)s.value!==void 0&&e.set(o,0);for(const[o]of e){const s=this.connectedVertices.get(o);for(const a of s.next)e.has(a)&&e.set(a,e.get(a)+1)}for(const[o,s]of e)s===0&&r.push(o);let i=0;for(;i<r.length;){const o=r[i++];n.push(o);const s=this.connectedVertices.get(o)?.next;if(s)for(const a of s){const c=(e.get(a)||0)-1;e.set(a,c),c===0&&r.push(a)}}if(n.length!==e.size)throw new Error("The graph contains a cycle, and thus can not be sorted topologically.");this.sortedConnectedValues.length=0;for(let o=0;o<n.length;o++){const s=this.connectedVertices.get(n[o]).value;s!==void 0&&this.sortedConnectedValues.push(s)}this.needsSort=!1}clear(){this.allVertices.clear(),this.isolatedVertices.clear(),this.connectedVertices.clear(),this.sortedConnectedValues=[],this.needsSort=!1}static isKey(e){return typeof e=="string"||typeof e=="symbol"}static isValue(e){return typeof e=="object"&&"key"in e}}class ci{key;stage;callback;runTask=!0;stop(){this.runTask=!1}start(){this.runTask=!0}constructor(e,r,n){this.stage=e,this.key=r,this.callback=n}run(e){this.runTask&&this.callback(e)}}class li extends Rr{key;scheduler;runTask=!0;stop(){this.runTask=!1}start(){this.runTask=!0}get tasks(){return this.sortedVertices}callback=(e,r)=>r();constructor(e,r,n){super(),this.scheduler=e,this.key=r,this.start=this.start.bind(this),this.stop=this.stop.bind(this),n&&(this.callback=n.bind(this))}createTask(e,r,n){const i=new ci(this,e,r);return this.add(e,i,n),i}getTask(e){return this.getValueByKey(e)}removeTask=this.remove.bind(this);run(e){this.runTask&&this.callback(e,r=>{this.forEachNode(n=>{n.run(r??e)})})}runWithTiming(e){if(!this.runTask)return{};const r={};return this.callback(e,n=>{this.forEachNode(i=>{const o=performance.now();i.run(n??e);const s=performance.now()-o;r[i.key]=s})}),r}getSchedule(){return this.mapNodes(e=>e.key.toString())}}class ui extends Rr{lastTime=0;clampDeltaTo=.1;get stages(){return this.sortedVertices}constructor(e){super(),e?.clampDeltaTo&&(this.clampDeltaTo=e.clampDeltaTo),this.run=this.run.bind(this)}createStage(e,r){const n=new li(this,e,r?.callback);return this.add(e,n,{after:r?.after,before:r?.before}),n}getStage(e){return this.getValueByKey(e)}removeStage=this.remove.bind(this);run(e){const r=e-this.lastTime;this.forEachNode(n=>{n.run(Math.min(r/1e3,this.clampDeltaTo))}),this.lastTime=e}runWithTiming(e){const r=e-this.lastTime,n={},i=performance.now();return this.forEachNode(o=>{const s=performance.now(),a=o.runWithTiming(Math.min(r/1e3,this.clampDeltaTo)),c=performance.now()-s;n[o.key.toString()]={duration:c,tasks:a}}),this.lastTime=e,{total:performance.now()-i,stages:n}}getSchedule(e={tasks:!0}){return{stages:this.mapNodes(r=>{if(r===void 0)throw new Error("Stage not found");return{key:r.key.toString(),tasks:e.tasks?r.getSchedule():void 0}})}}dispose(){this.clear()}}const Xo=t=>{const e=new ui,r=e.createStage(Symbol("threlte-main-stage")),n=F(t),i=F(()=>m(n).autoRender),o=F(()=>m(n).renderMode);let s=F(()=>m(i)??!0),a=F(()=>m(o)??"on-demand");const c=new Set;let u=!0;const l=()=>m(a)==="always"||m(a)==="on-demand"&&(u||c.size>0)||m(a)==="manual"&&u,f={scheduler:e,autoInvalidations:c,frameInvalidated:{get current(){return u},set current(d){u=d}},advance:()=>{u=!0},autoRender:vt(()=>m(s),d=>N(s,d)),renderMode:vt(()=>m(a),d=>N(a,d)),invalidate(){u=!0},mainStage:r,shouldRender:l,renderStage:e.createStage(Symbol("threlte-render-stage"),{after:r,callback(d,h){f.shouldRender()&&h()}}),resetFrameInvalidation(){u=!1}};return ce(()=>()=>{e.dispose()}),te("threlte-scheduler-context",f),f},Ye=()=>{const t=Z("threlte-scheduler-context");if(!t)throw new Error("useScheduler can only be used in a child component to <Canvas>.");return t},Qo=()=>{const{size:t}=Nr(),e=Ot(t),{invalidate:r}=Ye(),n=new De,i=new Mr(75,1,.1,1e3);i.position.z=5,i.lookAt(0,0,0);let o=K(!1),s=K(i);L(()=>{if(m(s)!==i||m(o))return;const{width:c,height:u}=e.current;i.aspect=c/u,i.updateProjectionMatrix(),i.updateMatrixWorld(),r()}),L(()=>{(m(s)===void 0||n.size===0)&&(N(s,i),r())});const a={makeDefaultCameras:n,camera:vt(()=>m(s),c=>N(s,c)),manual:{get current(){return m(o)},set(c){N(o,c,!0)}}};return te("threlte-camera-context",a),a},di=()=>{const t=Z("threlte-camera-context");if(!t)throw new Error("useCamera can only be used in a child component to <Canvas>.");return t},Jo=()=>{const t=new Map,e={disposableObjects:t,removeObjectFromDisposal:r=>{t.delete(r)},disposableObjectMounted:r=>{const n=t.get(r);n?t.set(r,n+1):t.set(r,1)},disposableObjectUnmounted:r=>{const n=t.get(r);n&&n>0&&(t.set(r,n-1),n-1<=0&&(t.delete(r),r.dispose()))}};return ce(()=>()=>{for(const[r]of t)r.dispose();t.clear()}),te("threlte-disposal-context",e),e},fi=()=>{const t=Z("threlte-disposal-context");if(!t)throw new Error("useDisposal can only be used in a child component to <Canvas>.");return t},Vr=Symbol("threlte-parent-context"),hi=t=>{const e={get current(){return t()}};return te(Vr,e),e},kr=()=>Z(Vr),es=()=>{const t=kr();return Br(()=>t.current)},mt=Symbol("threlte-parent-object3d-context"),pi=t=>{const e=Z(mt),r={get current(){return t()??e.current}};return te(mt,r),r},vi=()=>Z(mt),k=(t,e)=>t?.[`is${e}`]===!0,mi=new Set(["fov","aspect","near","far","left","right","top","bottom","zoom","filmGauge","filmOffset"]),gi=(t,e,r)=>{k(t,"PerspectiveCamera")?t.aspect=e/r:k(t,"OrthographicCamera")&&(t.left=e/-2,t.right=e/2,t.top=r/2,t.bottom=r/-2),t.updateProjectionMatrix(),t.updateMatrixWorld()},yi=(t,e,r,n)=>{const{camera:i,manual:o,makeDefaultCameras:s}=di(),{invalidate:a}=Ye(),{size:c}=Nr(),u=F(t),l=F(e),f=Ot(c);L(()=>{if(!r())return;const d=m(u);return s.add(d),i.set(d),o.set(m(l)),a(),()=>{s.delete(d);const h=s.values().next().value;i.current===d&&h&&(i.set(h),a())}}),L(()=>{if(!m(l)){for(const d in n())if(mi.has(d)){m(u).updateProjectionMatrix(),a();break}}}),L(()=>{e()||gi(m(u),f.current.width,f.current.height)})},ts=()=>{const t=ne({});return te("threlte-user-context",t),t},xi=()=>{const t=Z("threlte-user-context");if(!t)throw new Error("useUserContext can only be used in a child component to <Canvas>.");return t},Lr=(t,e)=>{if(e.includes(".")){const r=e.split("."),n=r.pop();for(let i=0;i<r.length;i+=1)if(t=t[r[i]],t==null)return console.error(`Cannot resolve property path "${e}": "${r[i]}" is ${t}`),{target:{},key:""};return{target:t,key:n}}else return{target:t,key:e}},bi=t=>typeof t=="object"&&t!==null,wi=(t,e)=>{const{invalidate:r}=Ye(),n=F(t),i=F(e),o=kr(),s=vi();L(()=>{r();const a=m(n);if(m(i)===void 0&&k(a,"Object3D")){const c=s.current;return c?.add(a),()=>{r(),c?.remove(a)}}if(m(i)===void 0&&bi(o.current)){const c=o.current;if(k(a,"Material")){const u=c.material;return c.material=a,()=>{r(),c.material=u}}else if(k(a,"BufferGeometry")){const u=c.geometry;return c.geometry=a,()=>{r(),c.geometry=u}}}if(m(i)===!1)return()=>{r()};if(typeof m(i)=="function"){const c=m(i)({ref:a,parent:o.current,parentObject3D:s.current});return()=>{r(),c?.()}}if(typeof m(i)=="string"){const{target:c,key:u}=Lr(o.current,m(i));if(u in c){const l=c[u];return c[u]=a,()=>{r(),c[u]=l}}else return c[u]=a,()=>{r(),delete c[u]}}if(k(m(i),"Object3D")&&k(a,"Object3D"))return m(i).add(a),()=>{r(),m(i).remove(a)}})},Jt=Symbol("threlte-disposable-object-context"),Si=t=>typeof t?.dispose=="function",_i=(t,e)=>{const{disposableObjectMounted:r,disposableObjectUnmounted:n,removeObjectFromDisposal:i}=fi(),o=Z(Jt),s=F(()=>{const c=e();return c!==void 0?c!==!1:o?.()!==!1});te(Jt,()=>m(s));const a=new Set;ce(()=>{const c=t();Si(c)&&(m(s)?(r(c),a.add(c)):(i(c),a.delete(c)))}),ce(()=>()=>{for(const c of a)n(c);a.clear()})};let gt;const Di=t=>{gt=t},Ei=()=>{const t=gt;return gt=void 0,t},Ci="threlte-plugin-context",Mi=t=>{const e=Z(Ci);if(!e)return;const r=[],n=Object.values(e);if(n.length>0){const i=t();for(let o=0;o<n.length;o++){const s=n[o],a=s(i);a&&a.pluginProps&&r.push(...a.pluginProps)}}return{pluginsProps:r}},Ti=new Set(["$$scope","$$slots","type","args","attach","instance"]),zi=t=>typeof t=="string"||typeof t=="number"||typeof t=="boolean"||typeof t>"u"||t===null,Ai=(t,e,r)=>{!Array.isArray(r)&&typeof r=="number"&&typeof t[e]=="object"&&t[e]!==null&&typeof t[e]?.setScalar=="function"&&!t[e]?.isColor?t[e].setScalar(r):typeof t[e]?.set=="function"&&typeof t[e]=="object"&&t[e]!==null?Array.isArray(r)?t[e].set(...r):t[e].set(r):t[e]=r},Oi=(t,e,r)=>{const{invalidate:n}=Ye(),i=new Map,o=(s,a,c)=>{if(zi(c)){const f=i.get(a);if(f&&f.instance===s&&f.value===c)return;i.set(a,{instance:s,value:c})}else i.delete(a);const{key:u,target:l}=Lr(s,a);if(typeof c=="function"&&u.startsWith("on")&&!a.includes(".")&&"addEventListener"in l){const f=l,d=u.slice(2);return f.addEventListener(d,c),()=>{f.removeEventListener?.(d,c)}}c!=null?Ai(l,u,c):l[u]=c,n()};L(()=>{const s=t(),a=e(),c=r();i.clear(),ge(()=>{for(const u in a)L(()=>{if(!(c?.includes(u)||Ti.has(u)))return o(s,u,a[u])})})})},Pi=t=>typeof t=="function"&&Function.prototype.toString.call(t).startsWith("class "),Ii=(t,e)=>Pi(t)?Array.isArray(e)?new t(...e):new t:t;function er(t,e){Er(e,!0);let r=we(e,"is",19,Ei),n=we(e,"manual",3,!1),i=we(e,"makeDefault",3,!1),o=we(e,"ref",15),s=qn(e,["$$slots","$$events","$$legacy","is","args","attach","manual","makeDefault","dispose","ref","oncreate","children"]);const a=F(()=>Ii(r(),e.args));L(()=>{o()!==m(a)&&o(m(a))});const c=Mi(()=>({get ref(){return m(a)},get args(){return e.args},get attach(){return e.attach},get manual(){return n()},get makeDefault(){return i()},get dispose(){return e.dispose},get props(){return s}}));Oi(()=>m(a),()=>s,()=>c?.pluginsProps),wi(()=>m(a),()=>e.attach),L(()=>{(k(m(a),"PerspectiveCamera")||k(m(a),"OrthographicCamera"))&&yi(()=>m(a),()=>n(),()=>i(),()=>s)}),_i(()=>m(a),()=>e.dispose),pi(()=>k(m(a),"Object3D")?m(a):void 0),hi(()=>m(a)),ce(()=>{m(a);let f;return ge(()=>{f=e.oncreate?.(m(a))}),f});var u=Kn(),l=An(u);ti(l,()=>e.children??On,()=>({ref:m(a)})),Yn(t,u),Cr()}const Bi={},rs=new Proxy(er,{get(t,e){if(typeof e!="string")return Reflect.get(t,e);const r=Bi[e]||In[e];if(r===void 0)throw new Error(`No Three.js module found for ${e}. Did you forget to extend the catalogue?`);return(...n)=>(Di(r),er(...n))}});function Ni(t,e,r){const n=xi();if(!n)throw new Error("No user context store found, did you invoke this function outside of your main <Canvas> component?");return t?t&&!e?Pn(n,i=>i[t]):(n.update(i=>{if(t in i)return i;const o=typeof e=="function"?e():e;return i[t]=o,i}),n.current[t]):{subscribe:n.subscribe}}const tr=Symbol(),Ri=t=>typeof t?.subscribe=="function",Ur=(t,e,r)=>{const n=t().map(s=>Ri(s)?Ot(s):tr),i=F(()=>t().map((s,a)=>n[a]===tr?s:n[a].current)),o=()=>{m(i);let s;return ge(()=>{s=e(m(i))}),s};r?L(o):ce(o)},Vi=(t,e)=>Ur(t,e,!1),ki=(t,e)=>Ur(t,e,!0),ns=Object.assign(Vi,{pre:ki}),ie=t=>({subscribe:t.subscribe,get current(){return t.current}});let _e=0;const Pt=ne(!1),Xe=ne(!1),It=ne(void 0),Bt=ne(0),Nt=ne(0),Fr=ne([]),Rt=ne(0),{onStart:Li,onLoad:Ui,onError:Fi}=ze;ze.onStart=(t,e,r)=>{Li?.(t,e,r),Xe.set(!0),It.set(t),Bt.set(e),Nt.set(r);const n=(e-_e)/(r-_e);Rt.set(n),n===1&&Pt.set(!0)};ze.onLoad=()=>{Ui?.(),Xe.set(!1)};ze.onError=t=>{Fi?.(t),Fr.update(e=>[...e,t])};ze.onProgress=(t,e,r)=>{e===r&&(_e=r),Xe.set(!0),It.set(t),Bt.set(e),Nt.set(r);const n=(e-_e)/(r-_e)||1;Rt.set(n),n===1&&Pt.set(!0)};ie(Xe),ie(It),ie(Bt),ie(Nt),ie(Fr),ie(Rt),ie(Pt);new M;new M;new M;const Be=new Ke,rr=new fe,nr=new Tr,at=new M,is=function(t,e){if(this.geometry.boundingSphere===null&&this.geometry.computeBoundingSphere(),Be.copy(this.geometry.boundingSphere??Be),Be.applyMatrix4(this.matrixWorld),!t.ray.intersectsSphere(Be)||(rr.copy(this.matrixWorld).invert(),nr.copy(t.ray).applyMatrix4(rr),this.geometry.boundingBox!==null&&nr.intersectBox(this.geometry.boundingBox,at)===null))return;const r=at.distanceTo(t.ray.origin),n=at.clone();e.push({distance:r,point:n,object:this})};new M;new fe;new M;new M;new qe;const ue=new M,Qe=new M,ji=new M,Hi=new re,os=(t,e,r)=>{const n=ue.setFromMatrixPosition(t.matrixWorld);n.project(e);const i=r.width/2,o=r.height/2;return[n.x*i+i,-(n.y*o)+o]},ss=(t,e)=>{const r=ue.setFromMatrixPosition(t.matrixWorld),n=Qe.setFromMatrixPosition(e.matrixWorld),i=r.sub(n),o=e.getWorldDirection(ji);return i.angleTo(o)>Math.PI/2},as=(t,e,r,n)=>{const i=ue.setFromMatrixPosition(t.matrixWorld),o=Qe.copy(ue);o.project(e),r.setFromCamera(Hi.set(o.x,o.y),e);const s=r.intersectObjects(n,!0);if(s.length){const a=s[0].distance;return i.distanceTo(r.ray.origin)<a}return!0},cs=(t,e)=>{if(k(e,"OrthographicCamera"))return e.zoom;if(k(e,"PerspectiveCamera")){const r=ue.setFromMatrixPosition(t.matrixWorld),n=Qe.setFromMatrixPosition(e.matrixWorld),i=e.fov*Math.PI/180,o=r.distanceTo(n);return 1/(2*Math.tan(i/2)*o)}else return 1},ls=(t,e,r)=>{const n=ue.setFromMatrixPosition(t.matrixWorld),i=Qe.setFromMatrixPosition(e.matrixWorld),o=n.distanceTo(i),s=(r[1]-r[0])/(e.far-e.near),a=r[1]-s*e.far;return Math.round(s*o+a)},R=t=>Math.abs(t)<1e-10?0:t,jr=(t,e,r="")=>{const{elements:n}=t;return`${r}matrix3d(
    ${R(e[0]*n[0])},${R(e[1]*n[1])},${R(e[2]*n[2])},${R(e[3]*n[3])},
    ${R(e[4]*n[4])},${R(e[5]*n[5])},${R(e[6]*n[6])},${R(e[7]*n[7])},
    ${R(e[8]*n[8])},${R(e[9]*n[9])},${R(e[10]*n[10])},${R(e[11]*n[11])},
    ${R(e[12]*n[12])},${R(e[13]*n[13])},${R(e[14]*n[14])},${R(e[15]*n[15])}
  )`},us=(t=>e=>jr(e,t))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),ds=(t=>(e,r)=>jr(e,t(r),"translate(-50%,-50%)"))(t=>[1/t,1/t,1/t,1,-1/t,-1/t,-1/t,-1,1/t,1/t,1/t,1,1,1,1,1]),fs=(t,e,r)=>{if(k(t,"OrthographicCamera"))return 1;if(k(t,"PerspectiveCamera")){const{width:n,height:i}=r,o=t.getWorldPosition(ue).distanceTo(e),s=t.fov*Math.PI/180,c=2*Math.tan(s/2)*o*(n/i);return n/c}throw new Error("getViewportFactor needs a Perspective or Orthographic Camera")};var Gi=Object.defineProperty,Wi=(t,e,r)=>e in t?Gi(t,e,{enumerable:!0,configurable:!0,writable:!0,value:r}):t[e]=r,C=(t,e,r)=>Wi(t,typeof e!="symbol"?e+"":e,r);const Hr=(t,e)=>{const[r,n]=e.split("-");return Object.assign(t.style,{left:n==="left"?"0":n==="center"?"50%":"",right:n==="right"?"0":"",top:r==="top"?"0":r==="bottom"?"":"50%",bottom:r==="bottom"?"0":"",transform:`${n==="center"?"translateX(-50%)":""} ${r==="center"?"translateY(-50%)":""}`}),e},$i=({placement:t,size:e,offset:r,id:n,className:i})=>{const o=document.createElement("div"),{top:s,left:a,right:c,bottom:u}=r;return Object.assign(o.style,{id:n,position:"absolute",zIndex:"1000",height:`${e}px`,width:`${e}px`,margin:`${s}px ${c}px ${u}px ${a}px`,borderRadius:"100%"}),Hr(o,t),n&&(o.id=n),i&&(o.className=i),o},qi=t=>{const e=typeof t=="string"?document.querySelector(t):t;if(!e)throw Error("Invalid DOM element");return e};function yt(t,e,r){return Math.max(e,Math.min(r,t))}const Zi=[["x",0,3],["y",1,4],["z",2,5]],ir=new M;function or({isSphere:t},e,r){t&&(ir.set(0,0,1).applyQuaternion(r.quaternion),Zi.forEach(([n,i,o])=>{const s=ir[n];let a=e[i],c=a.userData.opacity;a.material.opacity=yt(s>=0?c:c/2,0,1),a=e[o],c=a.userData.opacity,a.material.opacity=yt(s>=0?c/2:c,0,1)}))}const Ki=(t,e,r=10)=>Math.abs(t.clientX-e.x)<r&&Math.abs(t.clientY-e.y)<r,sr=new kn,ar=new re,cr=(t,e,r,n)=>{ar.set((t.clientX-e.left)/e.width*2-1,-((t.clientY-e.top)/e.height)*2+1),sr.setFromCamera(ar,r);const i=sr.intersectObjects(n,!1),o=i.length?i[0]:null;return!o||!o.object.visible?null:o},ct=1e-6,Yi=2*Math.PI,Gr=["x","y","z"],Ee=[...Gr,"nx","ny","nz"],Xi=["x","z","y","nx","nz","ny"],Qi=["z","x","y","nz","nx","ny"],xt="Right",He="Top",bt="Front",wt="Left",Ge="Bottom",St="Back",Ji=[xt,He,bt,wt,Ge,St].map(t=>t.toLocaleLowerCase()),Wr=1.3,lr=(t,e=!0)=>{const{material:r,userData:n}=t,{color:i,opacity:o}=e?n.hover:n;r.color.set(i),r.opacity=o},oe=t=>JSON.parse(JSON.stringify(t)),eo=t=>{const e=t.type||"sphere",r=e==="sphere",n=t.resolution||r?64:128,i=qe.DEFAULT_UP,o=i.z===1,s=i.x===1,{container:a}=t;t.container=void 0,t=JSON.parse(JSON.stringify(t)),t.container=a;const c=o?Xi:s?Qi:Ee;Ji.forEach((d,h)=>{t[d]&&(t[c[h]]=t[d])});const u={enabled:!0,color:16777215,opacity:1,scale:.7,labelColor:2236962,line:!1,border:{size:0,color:14540253},hover:{color:r?16777215:9688043,labelColor:2236962,opacity:1,scale:.7,border:{size:0,color:14540253}}},l={line:!1,scale:r?.45:.7,hover:{scale:r?.5:.7}},f={type:e,container:document.body,size:128,placement:"top-right",resolution:n,lineWidth:4,radius:r?1:.2,smoothness:18,animated:!0,speed:1,background:{enabled:!0,color:r?16777215:14739180,opacity:r?0:1,hover:{color:r?16777215:14739180,opacity:r?.2:1}},font:{family:"sans-serif",weight:900},offset:{top:10,left:10,bottom:10,right:10},corners:{enabled:!r,color:r?15915362:16777215,opacity:1,scale:r?.15:.2,radius:1,smoothness:18,hover:{color:r?16777215:9688043,opacity:1,scale:r?.2:.225}},edges:{enabled:!r,color:r?15915362:16777215,opacity:r?1:0,radius:r?1:.125,smoothness:18,scale:r?.15:1,hover:{color:r?16777215:9688043,opacity:1,scale:r?.2:1}},x:{...oe(u),...r?{label:"X",color:16725587,line:!0}:{label:s?He:xt}},y:{...oe(u),...r?{label:"Y",color:9100032,line:!0}:{label:o||s?bt:He}},z:{...oe(u),...r?{label:"Z",color:2920447,line:!0}:{label:o?He:s?xt:bt}},nx:{...oe(l),label:r?"":s?Ge:wt},ny:{...oe(l),label:r?"":o||s?St:Ge},nz:{...oe(l),label:r?"":o?Ge:s?wt:St}};return _t(t,f),Gr.forEach(d=>_t(t[`n${d}`],oe(t[d]))),{...t,isSphere:r}};function _t(t,...e){if(t instanceof HTMLElement||typeof t!="object"||t===null)return t;for(const r of e)for(const n in r)n!=="container"&&n in r&&(t[n]===void 0?t[n]=r[n]:typeof r[n]=="object"&&!Array.isArray(r[n])&&(t[n]=_t(t[n]||{},r[n])));return t}const to=(t,e=2)=>{const r=new Or,n=e*2,{isSphere:i,resolution:o,radius:s,font:a,corners:c,edges:u}=t,l=Ee.map(b=>({...t[b],radius:s}));i&&c.enabled&&l.push(c),i&&u.enabled&&l.push(u);const f=document.createElement("canvas"),d=f.getContext("2d");f.width=o*2+n*2,f.height=o*l.length+n*l.length;const[h,v]=j(l,o,a);l.forEach(({radius:b,label:D,color:A,labelColor:_,border:E,hover:{color:O,labelColor:V,border:U}},Y)=>{const X=o*Y+Y*n+e;x(e,X,e,o,b,D,E,A,_),x(o+e*3,X,e,o,b,D,U??E,O??A,V??_)});const S=l.length,p=e/(o*2),y=e/(o*6),w=1/S,g=new Ln(f);return g.repeat.set(.5-2*p,w-2*y),g.offset.set(p,1-y),Object.assign(g,{colorSpace:Un,wrapS:Zt,wrapT:Zt,userData:{offsetX:p,offsetY:y,cellHeight:w}}),g;function x(b,D,A,_,E,O,V,U,Y){if(E=E*(_/2),U!=null&&U!==""&&(X(),d.fillStyle=r.set(U).getStyle(),d.fill()),V&&V.size){const he=V.size*_/2;b+=he,D+=he,_-=V.size*_,E=Math.max(0,E-he),X(),d.strokeStyle=r.set(V.color).getStyle(),d.lineWidth=V.size*_,d.stroke()}O&&T(d,b+_/2,D+(_+A)/2,O,r.set(Y).getStyle());function X(){d.beginPath(),d.moveTo(b+E,D),d.lineTo(b+_-E,D),d.arcTo(b+_,D,b+_,D+E,E),d.lineTo(b+_,D+_-E),d.arcTo(b+_,D+_,b+_-E,D+_,E),d.lineTo(b+E,D+_),d.arcTo(b,D+_,b,D+_-E,E),d.lineTo(b,D+E),d.arcTo(b,D,b+E,D,E),d.closePath()}}function j(b,D,A){const _=[...b].sort((Pe,en)=>{var Ut,Ft;return(((Ut=Pe.label)==null?void 0:Ut.length)||0)-(((Ft=en.label)==null?void 0:Ft.length)||0)}).pop().label,{family:E,weight:O}=A,V=i?Math.sqrt(Math.pow(D*.7,2)/2):D;let U=V,Y=0,X=0;do{d.font=`${O} ${U}px ${E}`;const Pe=d.measureText(_);Y=Pe.width,X=Pe.fontBoundingBoxDescent,U--}while(Y>V&&U>0);const he=V/X,Qr=Math.min(V/Y,he),Jr=Math.floor(U*Qr);return[`${O} ${Jr}px ${E}`,he]}function T(b,D,A,_,E){b.font=h,b.textAlign="center",b.textBaseline="middle",b.fillStyle=E,b.fillText(_,D,A+(i?v:0))}},ro=(t,e)=>t.offset.x=(e?.5:0)+t.userData.offsetX,Vt=(t,e)=>{const{offset:r,userData:{offsetY:n,cellHeight:i}}=t;r.y=1-(e+1)*i+n};function kt(t,e,r=2,n=2){const i=r/2-t,o=n/2-t,s=t/r,a=(r-t)/r,c=t/n,u=(n-t)/n,l=[i,o,0,-i,o,0,-i,-o,0,i,-o,0],f=[a,u,s,u,s,c,a,c],d=[3*(e+1)+3,3*(e+1)+4,e+4,e+5,2*(e+1)+4,2,1,2*(e+1)+3,3,4*(e+1)+3,4,0],h=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11].map(T=>d[T]);let v,S,p,y,w,g,x,j;for(let T=0;T<4;T++){y=T<1||T>2?i:-i,w=T<2?o:-o,g=T<1||T>2?a:s,x=T<2?u:c;for(let b=0;b<=e;b++)v=Math.PI/2*(T+b/e),S=Math.cos(v),p=Math.sin(v),l.push(y+t*S,w+t*p,0),f.push(g+s*S,x+c*p),b<e&&(j=(e+1)*T+b+4,h.push(T,j,j+1))}return new At().setIndex(new je(new Uint32Array(h),1)).setAttribute("position",new je(new Float32Array(l),3)).setAttribute("uv",new je(new Float32Array(f),2))}const no=(t,e)=>{const r=new M,{isSphere:n,radius:i,smoothness:o}=t,s=kt(i,o);return Ee.map((a,c)=>{const u=c<3,l=Ee[c],f=c?e.clone():e;Vt(f,c);const{enabled:d,scale:h,opacity:v,hover:S}=t[l],p={map:f,opacity:v,transparent:!0},y=n?new Tt(new zt(p)):new le(s,new Oe(p)),w=u?l:l[1];return y.position[w]=(u?1:-1)*(n?Wr:1),n||y.lookAt(r.copy(y.position).multiplyScalar(1.7)),y.scale.setScalar(h),y.renderOrder=1,y.visible=d,y.userData={scale:h,opacity:v,hover:S},y})},io=(t,e)=>{const{isSphere:r,corners:n}=t;if(!n.enabled)return[];const{color:i,opacity:o,scale:s,radius:a,smoothness:c,hover:u}=n,l=r?null:kt(a,c),f={transparent:!0,opacity:o},d=[1,1,1,-1,1,1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,-1,-1,-1,-1,-1].map(v=>v*.85),h=new M;return Array(d.length/3).fill(0).map((v,S)=>{if(r){const w=e.clone();Vt(w,6),f.map=w}else f.color=i;const p=r?new Tt(new zt(f)):new le(l,new Oe(f)),y=S*3;return p.position.set(d[y],d[y+1],d[y+2]),r&&p.position.normalize().multiplyScalar(1.7),p.scale.setScalar(s),p.lookAt(h.copy(p.position).multiplyScalar(2)),p.renderOrder=1,p.userData={color:i,opacity:o,scale:s,hover:u},p})},oo=(t,e,r)=>{const{isSphere:n,edges:i}=t;if(!i.enabled)return[];const{color:o,opacity:s,scale:a,hover:c,radius:u,smoothness:l}=i,f=n?null:kt(u,l,1.2,.25),d={transparent:!0,opacity:s},h=[0,1,1,0,-1,1,1,0,1,-1,0,1,0,1,-1,0,-1,-1,1,0,-1,-1,0,-1,1,1,0,1,-1,0,-1,1,0,-1,-1,0].map(p=>p*.925),v=new M,S=new M(0,1,0);return Array(h.length/3).fill(0).map((p,y)=>{if(n){const x=e.clone();Vt(x,r),d.map=x}else d.color=o;const w=n?new Tt(new zt(d)):new le(f,new Oe(d)),g=y*3;return w.position.set(h[g],h[g+1],h[g+2]),n&&w.position.normalize().multiplyScalar(1.7),w.scale.setScalar(a),w.up.copy(S),w.lookAt(v.copy(w.position).multiplyScalar(2)),!n&&!w.position.y&&(w.rotation.z=Math.PI/2),w.renderOrder=1,w.userData={color:o,opacity:s,scale:a,hover:c},w})};function so(t,e=!1){const r=t[0].index!==null,n=new Set(Object.keys(t[0].attributes)),i=new Set(Object.keys(t[0].morphAttributes)),o={},s={},a=t[0].morphTargetsRelative,c=new At;let u=0;for(let l=0;l<t.length;++l){const f=t[l];let d=0;if(r!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const h in f.attributes){if(!n.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+'. All geometries must have compatible attributes; make sure "'+h+'" attribute exists among all geometries, or in none of them.'),null;o[h]===void 0&&(o[h]=[]),o[h].push(f.attributes[h]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". Make sure all geometries have the same number of attributes."),null;if(a!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const h in f.morphAttributes){if(!i.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+".  .morphAttributes must be consistent throughout all geometries."),null;s[h]===void 0&&(s[h]=[]),s[h].push(f.morphAttributes[h])}if(e){let h;if(r)h=f.index.count;else if(f.attributes.position!==void 0)h=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". The geometry must have either an index or a position attribute"),null;c.addGroup(u,h,l),u+=h}}if(r){let l=0;const f=[];for(let d=0;d<t.length;++d){const h=t[d].index;for(let v=0;v<h.count;++v)f.push(h.getX(v)+l);l+=t[d].attributes.position.count}c.setIndex(f)}for(const l in o){const f=ur(o[l]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+l+" attribute."),null;c.setAttribute(l,f)}for(const l in s){const f=s[l][0].length;if(f===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[l]=[];for(let d=0;d<f;++d){const h=[];for(let S=0;S<s[l].length;++S)h.push(s[l][S][d]);const v=ur(h);if(!v)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+l+" morphAttribute."),null;c.morphAttributes[l].push(v)}}return c}function ur(t){let e,r,n,i=-1,o=0;for(let u=0;u<t.length;++u){const l=t[u];if(e===void 0&&(e=l.array.constructor),e!==l.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(r===void 0&&(r=l.itemSize),r!==l.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=l.normalized),n!==l.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=l.gpuType),i!==l.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=l.count*r}const s=new e(o),a=new je(s,r,n);let c=0;for(let u=0;u<t.length;++u){const l=t[u];if(l.isInterleavedBufferAttribute){const f=c/r;for(let d=0,h=l.count;d<h;d++)for(let v=0;v<r;v++){const S=l.getComponent(d,v);a.setComponent(d+f,v,S)}}else s.set(l.array,c);c+=l.count*r}return i!==void 0&&(a.gpuType=i),a}const ao=(t,e)=>{const{isSphere:r,background:{enabled:n,color:i,opacity:o,hover:s}}=e;let a;const c=new Oe({color:i,side:Fn,opacity:o,transparent:!0,depthWrite:!1});if(!n)return null;if(r)a=new le(new jn(1.8,64,64),c);else{let u;t.forEach(l=>{const f=l.scale.x;l.scale.setScalar(.9),l.updateMatrix();const d=l.geometry.clone();d.applyMatrix4(l.matrix),u=u?so([u,d]):d,l.scale.setScalar(f)}),a=new le(u,c)}return a.userData={color:i,opacity:o,hover:s},a},dr=new Ae,Ne=new M;let $r=class extends Gn{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],r=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new Ze(e,3)),this.setAttribute("uv",new Ze(r,2))}applyMatrix4(e){const r=this.attributes.instanceStart,n=this.attributes.instanceEnd;return r!==void 0&&(r.applyMatrix4(e),n.applyMatrix4(e),r.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));const n=new ht(r,6,1);return this.setAttribute("instanceStart",new ve(n,3,0)),this.setAttribute("instanceEnd",new ve(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let r;e instanceof Float32Array?r=e:Array.isArray(e)&&(r=new Float32Array(e));const n=new ht(r,6,1);return this.setAttribute("instanceColorStart",new ve(n,3,0)),this.setAttribute("instanceColorEnd",new ve(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Wn(e.geometry)),this}fromLineSegments(e){const r=e.geometry;return this.setPositions(r.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new Ae);const e=this.attributes.instanceStart,r=this.attributes.instanceEnd;e!==void 0&&r!==void 0&&(this.boundingBox.setFromBufferAttribute(e),dr.setFromBufferAttribute(r),this.boundingBox.union(dr))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Ke),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,r=this.attributes.instanceEnd;if(e!==void 0&&r!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let o=0,s=e.count;o<s;o++)Ne.fromBufferAttribute(e,o),i=Math.max(i,n.distanceToSquared(Ne)),Ne.fromBufferAttribute(r,o),i=Math.max(i,n.distanceToSquared(Ne));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};Ue.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new re(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Fe.line={uniforms:zr.merge([Ue.common,Ue.fog,Ue.line]),vertexShader:`
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
		`};let Lt=class extends Hn{constructor(e){super({type:"LineMaterial",uniforms:zr.clone(Fe.line.uniforms),vertexShader:Fe.line.vertexShader,fragmentShader:Fe.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};const lt=new ye,fr=new M,hr=new M,P=new ye,I=new ye,H=new ye,ut=new M,dt=new fe,B=new Bn,pr=new M,Re=new Ae,Ve=new Ke,G=new ye;let W,ae;function vr(t,e,r){return G.set(0,0,-e,1).applyMatrix4(t.projectionMatrix),G.multiplyScalar(1/G.w),G.x=ae/r.width,G.y=ae/r.height,G.applyMatrix4(t.projectionMatrixInverse),G.multiplyScalar(1/G.w),Math.abs(Math.max(G.x,G.y))}function co(t,e){const r=t.matrixWorld,n=t.geometry,i=n.attributes.instanceStart,o=n.attributes.instanceEnd,s=Math.min(n.instanceCount,i.count);for(let a=0,c=s;a<c;a++){B.start.fromBufferAttribute(i,a),B.end.fromBufferAttribute(o,a),B.applyMatrix4(r);const u=new M,l=new M;W.distanceSqToSegment(B.start,B.end,l,u),l.distanceTo(u)<ae*.5&&e.push({point:l,pointOnLine:u,distance:W.origin.distanceTo(l),object:t,face:null,faceIndex:a,uv:null,uv1:null})}}function lo(t,e,r){const n=e.projectionMatrix,i=t.material.resolution,o=t.matrixWorld,s=t.geometry,a=s.attributes.instanceStart,c=s.attributes.instanceEnd,u=Math.min(s.instanceCount,a.count),l=-e.near;W.at(1,H),H.w=1,H.applyMatrix4(e.matrixWorldInverse),H.applyMatrix4(n),H.multiplyScalar(1/H.w),H.x*=i.x/2,H.y*=i.y/2,H.z=0,ut.copy(H),dt.multiplyMatrices(e.matrixWorldInverse,o);for(let f=0,d=u;f<d;f++){if(P.fromBufferAttribute(a,f),I.fromBufferAttribute(c,f),P.w=1,I.w=1,P.applyMatrix4(dt),I.applyMatrix4(dt),P.z>l&&I.z>l)continue;if(P.z>l){const y=P.z-I.z,w=(P.z-l)/y;P.lerp(I,w)}else if(I.z>l){const y=I.z-P.z,w=(I.z-l)/y;I.lerp(P,w)}P.applyMatrix4(n),I.applyMatrix4(n),P.multiplyScalar(1/P.w),I.multiplyScalar(1/I.w),P.x*=i.x/2,P.y*=i.y/2,I.x*=i.x/2,I.y*=i.y/2,B.start.copy(P),B.start.z=0,B.end.copy(I),B.end.z=0;const h=B.closestPointToPointParameter(ut,!0);B.at(h,pr);const v=$n.lerp(P.z,I.z,h),S=v>=-1&&v<=1,p=ut.distanceTo(pr)<ae*.5;if(S&&p){B.start.fromBufferAttribute(a,f),B.end.fromBufferAttribute(c,f),B.start.applyMatrix4(o),B.end.applyMatrix4(o);const y=new M,w=new M;W.distanceSqToSegment(B.start,B.end,w,y),r.push({point:w,pointOnLine:y,distance:W.origin.distanceTo(w),object:t,face:null,faceIndex:f,uv:null,uv1:null})}}}class uo extends le{constructor(e=new $r,r=new Lt({color:Math.random()*16777215})){super(e,r),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,r=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*r.count);for(let s=0,a=0,c=r.count;s<c;s++,a+=2)fr.fromBufferAttribute(r,s),hr.fromBufferAttribute(n,s),i[a]=a===0?0:i[a-1],i[a+1]=i[a]+fr.distanceTo(hr);const o=new ht(i,2,1);return e.setAttribute("instanceDistanceStart",new ve(o,1,0)),e.setAttribute("instanceDistanceEnd",new ve(o,1,1)),this}raycast(e,r){const n=this.material.worldUnits,i=e.camera;i===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const o=e.params.Line2!==void 0&&e.params.Line2.threshold||0;W=e.ray;const s=this.matrixWorld,a=this.geometry,c=this.material;ae=c.linewidth+o,a.boundingSphere===null&&a.computeBoundingSphere(),Ve.copy(a.boundingSphere).applyMatrix4(s);let u;if(n)u=ae*.5;else{const f=Math.max(i.near,Ve.distanceToPoint(W.origin));u=vr(i,f,c.resolution)}if(Ve.radius+=u,W.intersectsSphere(Ve)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),Re.copy(a.boundingBox).applyMatrix4(s);let l;if(n)l=ae*.5;else{const f=Math.max(i.near,Re.distanceToPoint(W.origin));l=vr(i,f,c.resolution)}Re.expandByScalar(l),W.intersectsBox(Re)!==!1&&(n?co(this,r):lo(this,i,r))}onBeforeRender(e){const r=this.material.uniforms;r&&r.resolution&&(e.getViewport(lt),this.material.uniforms.resolution.value.set(lt.z,lt.w))}}class qr extends $r{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const r=e.length-3,n=new Float32Array(2*r);for(let i=0;i<r;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e){const r=e.length-3,n=new Float32Array(2*r);for(let i=0;i<r;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setColors(n),this}setFromPoints(e){const r=e.length-1,n=new Float32Array(6*r);for(let i=0;i<r;i++)n[6*i]=e[i].x,n[6*i+1]=e[i].y,n[6*i+2]=e[i].z||0,n[6*i+3]=e[i+1].x,n[6*i+4]=e[i+1].y,n[6*i+5]=e[i+1].z||0;return super.setPositions(n),this}fromLine(e){const r=e.geometry;return this.setPositions(r.attributes.position.array),this}}class fo extends uo{constructor(e=new qr,r=new Lt({color:Math.random()*16777215})){super(e,r),this.isLine2=!0,this.type="Line2"}}const ho=t=>{const e=new Or,r=[],n=[],{isSphere:i}=t;if(Ee.forEach((a,c)=>{const{enabled:u,line:l,scale:f,color:d}=t[a];if(!u||!l)return;const h=c<3?1:-1,v=(i?Wr-f/2:.975)*h;r.push(a.includes("x")?v:0,a.includes("y")?v:0,a.includes("z")?v:0,0,0,0);const S=e.set(d).toArray();n.push(...S,...S)}),!r.length)return null;const o=new qr().setPositions(r).setColors(n),s=new Lt({linewidth:t.lineWidth,vertexColors:!0,resolution:new re(window.innerWidth,window.innerHeight)});return new fo(o,s).computeLineDistances()},po=t=>{const{corners:e,edges:r}=t,n=[],i=to(t),o=no(t,i);n.push(...o),e.enabled&&n.push(...io(t,i)),r.enabled&&n.push(...oo(t,i,e.enabled?7:6));const s=ao(o,t),a=ho(t);return[n,s,a]},be=(t,e=!0)=>{const{material:r,userData:n}=t,{opacity:i,color:o,scale:s}=e?n.hover:n;t.scale.setScalar(s),r.opacity=i,r.map?ro(r.map,e):r.color.set(o)},pe=new fe,mr=new Vn,vo=new re,se=new M,gr=new ye;class vs extends qe{constructor(e,r,n={}){super(),C(this,"enabled",!0),C(this,"camera"),C(this,"renderer"),C(this,"options"),C(this,"target",new M),C(this,"animated",!0),C(this,"speed",1),C(this,"animating",!1),C(this,"_options"),C(this,"_intersections"),C(this,"_background",null),C(this,"_viewport",[0,0,0,0]),C(this,"_originalViewport",[0,0,0,0]),C(this,"_originalScissor",[0,0,0,0]),C(this,"_scene"),C(this,"_camera"),C(this,"_container"),C(this,"_domElement"),C(this,"_domRect"),C(this,"_dragging",!1),C(this,"_distance",0),C(this,"_clock",new Nn),C(this,"_targetQuaternion",new ot),C(this,"_quaternionStart",new ot),C(this,"_quaternionEnd",new ot),C(this,"_pointerStart",new re),C(this,"_focus",null),C(this,"_placement"),C(this,"_controls"),C(this,"_controlsListeners"),this.camera=e,this.renderer=r,this._scene=new Rn().add(this),this.set(n)}get placement(){return this._placement}set placement(e){this._placement=Hr(this._domElement,e),this.domUpdate()}set(e={}){this.dispose(),this.options=e,this._options=eo(e),this._camera=this._options.isSphere?new Ar(-1.8,1.8,1.8,-1.8,5,10):new Mr(26,1,5,10),this._camera.position.set(0,0,7);const[r,n,i]=po(this._options);n&&this.add(n),i&&this.add(i),this.add(...r),this._background=n,this._intersections=r;const{container:o,animated:s,speed:a}=this._options;return this.animated=s,this.speed=a,this._container=o?qi(o):document.body,this._domElement=$i(this._options),this._domElement.onpointerdown=c=>this._onPointerDown(c),this._domElement.onpointermove=c=>this._onPointerMove(c),this._domElement.onpointerleave=()=>this._onPointerLeave(),this._container.appendChild(this._domElement),this._controls&&this.attachControls(this._controls),this.update(),this._updateOrientation(!0),this}render(){this.animating&&this._animate();const{renderer:e,_viewport:r}=this,n=e.getScissorTest(),i=e.autoClear;return e.autoClear=!1,e.setViewport(...r),n&&e.setScissor(...r),e.clear(!1,!0,!1),e.render(this._scene,this._camera),e.setViewport(...this._originalViewport),n&&e.setScissor(...this._originalScissor),e.autoClear=i,this}domUpdate(){this._domRect=this._domElement.getBoundingClientRect();const e=this.renderer,r=this._domRect,n=e.domElement.getBoundingClientRect();return this._viewport.splice(0,4,r.left-n.left,e.domElement.clientHeight-(r.top-n.top+r.height),r.width,r.height),e.getViewport(gr).toArray(this._originalViewport),e.getScissorTest()&&e.getScissor(gr).toArray(this._originalScissor),this}cameraUpdate(){return this._updateOrientation(),this}update(e=!0){return e&&this._controls&&this._controls.update(),this.domUpdate().cameraUpdate()}attachControls(e){return this.detachControls(),this.target=e.target,this._controlsListeners={start:()=>e.enabled=!1,end:()=>e.enabled=!0,change:()=>this.update(!1)},this.addEventListener("start",this._controlsListeners.start),this.addEventListener("end",this._controlsListeners.end),e.addEventListener("change",this._controlsListeners.change),this._controls=e,this}detachControls(){if(!(!this._controlsListeners||!this._controls))return this.target=new M().copy(this._controls.target),this.removeEventListener("start",this._controlsListeners.start),this.removeEventListener("end",this._controlsListeners.end),this._controls.removeEventListener("change",this._controlsListeners.change),this._controlsListeners=void 0,this._controls=void 0,this}dispose(){var e;this.detachControls(),this.children.forEach(r=>{var n,i,o,s;this.remove(r);const a=r;(n=a.material)==null||n.dispose(),(o=(i=a.material)==null?void 0:i.map)==null||o.dispose(),(s=a.geometry)==null||s.dispose()}),(e=this._domElement)==null||e.remove()}_updateOrientation(e=!0){e&&(this.quaternion.copy(this.camera.quaternion).invert(),this.updateMatrixWorld()),or(this._options,this._intersections,this.camera)}_animate(){const{position:e,quaternion:r}=this.camera;if(e.set(0,0,1),!this.animated){e.applyQuaternion(this._quaternionEnd).multiplyScalar(this._distance).add(this.target),r.copy(this._targetQuaternion),this._updateOrientation(),this.animating=!1,this.dispatchEvent({type:"change"}),this.dispatchEvent({type:"end"});return}this._controls&&(this._controls.enabled=!1);const n=this._clock.getDelta()*Yi*this.speed;this._quaternionStart.rotateTowards(this._quaternionEnd,n),e.applyQuaternion(this._quaternionStart).multiplyScalar(this._distance).add(this.target),r.rotateTowards(this._targetQuaternion,n),this._updateOrientation(),requestAnimationFrame(()=>this.dispatchEvent({type:"change"})),this._quaternionStart.angleTo(this._quaternionEnd)<ct&&(this._controls&&(this._controls.enabled=!0),this.animating=!1,this.dispatchEvent({type:"end"}))}_setOrientation(e){const r=this.camera,n=this.target;se.copy(e).multiplyScalar(this._distance),pe.setPosition(se).lookAt(se,this.position,this.up),this._targetQuaternion.setFromRotationMatrix(pe),se.add(n),pe.lookAt(se,n,this.up),this._quaternionEnd.setFromRotationMatrix(pe),pe.setPosition(r.position).lookAt(r.position,n,this.up),this._quaternionStart.setFromRotationMatrix(pe),this.animating=!0,this._clock.start(),this.dispatchEvent({type:"start"})}_onPointerDown(e){if(!this.enabled)return;const r=c=>{if(!this._dragging){if(Ki(c,this._pointerStart))return;this._dragging=!0}const u=vo.set(c.clientX,c.clientY).sub(this._pointerStart).multiplyScalar(1/this._domRect.width*Math.PI),l=this.coordinateConversion(se.subVectors(this.camera.position,this.target)),f=mr.setFromVector3(l);f.theta=s-u.x,f.phi=yt(a-u.y,ct,Math.PI-ct),this.coordinateConversion(this.camera.position.setFromSpherical(f),!0).add(this.target),this.camera.lookAt(this.target),this.quaternion.copy(this.camera.quaternion).invert(),this._updateOrientation(!1),this.dispatchEvent({type:"change"})},n=()=>{if(document.removeEventListener("pointermove",r,!1),document.removeEventListener("pointerup",n,!1),!this._dragging)return this._handleClick(e);this._focus&&(be(this._focus,!1),this._focus=null),this._dragging=!1,this.dispatchEvent({type:"end"})};if(this.animating)return;e.preventDefault(),this._pointerStart.set(e.clientX,e.clientY);const i=this.coordinateConversion(se.subVectors(this.camera.position,this.target)),o=mr.setFromVector3(i),s=o.theta,a=o.phi;this._distance=o.radius,document.addEventListener("pointermove",r,!1),document.addEventListener("pointerup",n,!1),this.dispatchEvent({type:"start"})}coordinateConversion(e,r=!1){const{x:n,y:i,z:o}=e,s=qe.DEFAULT_UP;return s.x===1?r?e.set(i,o,n):e.set(o,n,i):s.z===1?r?e.set(o,n,i):e.set(i,o,n):e}_onPointerMove(e){!this.enabled||this._dragging||(this._background&&lr(this._background,!0),this._handleHover(e))}_onPointerLeave(){!this.enabled||this._dragging||(this._background&&lr(this._background,!1),this._focus&&be(this._focus,!1),this._domElement.style.cursor="")}_handleClick(e){const r=cr(e,this._domRect,this._camera,this._intersections);this._focus&&(be(this._focus,!1),this._focus=null),r&&(this._setOrientation(r.object.position),this.dispatchEvent({type:"change"}))}_handleHover(e){const r=cr(e,this._domRect,this._camera,this._intersections),n=r?.object||null;this._focus!==n&&(this._domElement.style.cursor=n?"pointer":"",this._focus&&be(this._focus,!1),(this._focus=n)?be(n,!0):or(this._options,this._intersections,this.camera))}}new fe;new fe;new le;const ms=`
    #include <common>
    ${q.logdepthbuf_pars_vertex}
    ${q.fog_pars_vertex}

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

        ${q.logdepthbuf_vertex}
        ${q.fog_vertex}
    }
`;`${q.tonemapping_fragment}${q.colorspace_fragment}`;`${q.tonemapping_fragment}${q.colorspace_fragment}`;const mo=`

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
`,go=`

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
`,yo=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`,xo=yo,bo=`
	${mo}
	${go}
`;`${xo}${bo}${q.tonemapping_fragment}${q.colorspace_fragment}`;new Ae;typeof window<"u"&&document.createElement("div");const wo=()=>new si,So=()=>Ni("threlte-portals",wo());function gs(t,e){Er(e,!0);let r=we(e,"id",3,"default");L(()=>{e.object&&console.error('<Portal>: "object" prop has been removed. Use "attach" instead.')});const n=So();L(()=>{if(e.children)return n.has(r())||n.set(r(),new De),n.get(r())?.add(e.children),()=>n.get(r())?.delete(e.children)}),Cr()}for(let t=0;t<256;t++)(t<16?"0":"")+t.toString(16);new Ar(-1,1,1,-1,0,1);class _o extends At{constructor(){super(),this.setAttribute("position",new Ze([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ze([0,2,0,0,2,0],2))}}new _o;var Zr={exports:{}};Zr.exports=Je;Zr.exports.default=Je;function Je(t,e,r){r=r||2;var n=e&&e.length,i=n?e[0]*r:t.length,o=Kr(t,0,i,r,!0),s=[];if(!o||o.next===o.prev)return s;var a,c,u,l,f,d,h;if(n&&(o=To(t,e,o,r)),t.length>80*r){a=u=t[0],c=l=t[1];for(var v=r;v<i;v+=r)f=t[v],d=t[v+1],f<a&&(a=f),d<c&&(c=d),f>u&&(u=f),d>l&&(l=d);h=Math.max(u-a,l-c),h=h!==0?32767/h:0}return Ce(o,s,r,a,c,h,0),s}function Kr(t,e,r,n,i){var o,s;if(i===Ct(t,e,r,n)>0)for(o=e;o<r;o+=n)s=yr(o,t[o],t[o+1],s);else for(o=r-n;o>=e;o-=n)s=yr(o,t[o],t[o+1],s);return s&&et(s,s.next)&&(Te(s),s=s.next),s}function de(t,e){if(!t)return t;e||(e=t);var r=t,n;do if(n=!1,!r.steiner&&(et(r,r.next)||z(r.prev,r,r.next)===0)){if(Te(r),r=e=r.prev,r===r.next)break;n=!0}else r=r.next;while(n||r!==e);return e}function Ce(t,e,r,n,i,o,s){if(t){!s&&o&&Io(t,n,i,o);for(var a=t,c,u;t.prev!==t.next;){if(c=t.prev,u=t.next,o?Eo(t,n,i,o):Do(t)){e.push(c.i/r|0),e.push(t.i/r|0),e.push(u.i/r|0),Te(t),t=u.next,a=u.next;continue}if(t=u,t===a){s?s===1?(t=Co(de(t),e,r),Ce(t,e,r,n,i,o,2)):s===2&&Mo(t,e,r,n,i,o):Ce(de(t),e,r,n,i,o,1);break}}}}function Do(t){var e=t.prev,r=t,n=t.next;if(z(e,r,n)>=0)return!1;for(var i=e.x,o=r.x,s=n.x,a=e.y,c=r.y,u=n.y,l=i<o?i<s?i:s:o<s?o:s,f=a<c?a<u?a:u:c<u?c:u,d=i>o?i>s?i:s:o>s?o:s,h=a>c?a>u?a:u:c>u?c:u,v=n.next;v!==e;){if(v.x>=l&&v.x<=d&&v.y>=f&&v.y<=h&&me(i,a,o,c,s,u,v.x,v.y)&&z(v.prev,v,v.next)>=0)return!1;v=v.next}return!0}function Eo(t,e,r,n){var i=t.prev,o=t,s=t.next;if(z(i,o,s)>=0)return!1;for(var a=i.x,c=o.x,u=s.x,l=i.y,f=o.y,d=s.y,h=a<c?a<u?a:u:c<u?c:u,v=l<f?l<d?l:d:f<d?f:d,S=a>c?a>u?a:u:c>u?c:u,p=l>f?l>d?l:d:f>d?f:d,y=Dt(h,v,e,r,n),w=Dt(S,p,e,r,n),g=t.prevZ,x=t.nextZ;g&&g.z>=y&&x&&x.z<=w;){if(g.x>=h&&g.x<=S&&g.y>=v&&g.y<=p&&g!==i&&g!==s&&me(a,l,c,f,u,d,g.x,g.y)&&z(g.prev,g,g.next)>=0||(g=g.prevZ,x.x>=h&&x.x<=S&&x.y>=v&&x.y<=p&&x!==i&&x!==s&&me(a,l,c,f,u,d,x.x,x.y)&&z(x.prev,x,x.next)>=0))return!1;x=x.nextZ}for(;g&&g.z>=y;){if(g.x>=h&&g.x<=S&&g.y>=v&&g.y<=p&&g!==i&&g!==s&&me(a,l,c,f,u,d,g.x,g.y)&&z(g.prev,g,g.next)>=0)return!1;g=g.prevZ}for(;x&&x.z<=w;){if(x.x>=h&&x.x<=S&&x.y>=v&&x.y<=p&&x!==i&&x!==s&&me(a,l,c,f,u,d,x.x,x.y)&&z(x.prev,x,x.next)>=0)return!1;x=x.nextZ}return!0}function Co(t,e,r){var n=t;do{var i=n.prev,o=n.next.next;!et(i,o)&&Yr(i,n,n.next,o)&&Me(i,o)&&Me(o,i)&&(e.push(i.i/r|0),e.push(n.i/r|0),e.push(o.i/r|0),Te(n),Te(n.next),n=t=o),n=n.next}while(n!==t);return de(n)}function Mo(t,e,r,n,i,o){var s=t;do{for(var a=s.next.next;a!==s.prev;){if(s.i!==a.i&&Ro(s,a)){var c=Xr(s,a);s=de(s,s.next),c=de(c,c.next),Ce(s,e,r,n,i,o,0),Ce(c,e,r,n,i,o,0);return}a=a.next}s=s.next}while(s!==t)}function To(t,e,r,n){var i=[],o,s,a,c,u;for(o=0,s=e.length;o<s;o++)a=e[o]*n,c=o<s-1?e[o+1]*n:t.length,u=Kr(t,a,c,n,!1),u===u.next&&(u.steiner=!0),i.push(No(u));for(i.sort(zo),o=0;o<i.length;o++)r=Ao(i[o],r);return r}function zo(t,e){return t.x-e.x}function Ao(t,e){var r=Oo(t,e);if(!r)return e;var n=Xr(r,t);return de(n,n.next),de(r,r.next)}function Oo(t,e){var r=e,n=t.x,i=t.y,o=-1/0,s;do{if(i<=r.y&&i>=r.next.y&&r.next.y!==r.y){var a=r.x+(i-r.y)*(r.next.x-r.x)/(r.next.y-r.y);if(a<=n&&a>o&&(o=a,s=r.x<r.next.x?r:r.next,a===n))return s}r=r.next}while(r!==e);if(!s)return null;var c=s,u=s.x,l=s.y,f=1/0,d;r=s;do n>=r.x&&r.x>=u&&n!==r.x&&me(i<l?n:o,i,u,l,i<l?o:n,i,r.x,r.y)&&(d=Math.abs(i-r.y)/(n-r.x),Me(r,t)&&(d<f||d===f&&(r.x>s.x||r.x===s.x&&Po(s,r)))&&(s=r,f=d)),r=r.next;while(r!==c);return s}function Po(t,e){return z(t.prev,t,e.prev)<0&&z(e.next,t,t.next)<0}function Io(t,e,r,n){var i=t;do i.z===0&&(i.z=Dt(i.x,i.y,e,r,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==t);i.prevZ.nextZ=null,i.prevZ=null,Bo(i)}function Bo(t){var e,r,n,i,o,s,a,c,u=1;do{for(r=t,t=null,o=null,s=0;r;){for(s++,n=r,a=0,e=0;e<u&&(a++,n=n.nextZ,!!n);e++);for(c=u;a>0||c>0&&n;)a!==0&&(c===0||!n||r.z<=n.z)?(i=r,r=r.nextZ,a--):(i=n,n=n.nextZ,c--),o?o.nextZ=i:t=i,i.prevZ=o,o=i;r=n}o.nextZ=null,u*=2}while(s>1);return t}function Dt(t,e,r,n,i){return t=(t-r)*i|0,e=(e-n)*i|0,t=(t|t<<8)&16711935,t=(t|t<<4)&252645135,t=(t|t<<2)&858993459,t=(t|t<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,t|e<<1}function No(t){var e=t,r=t;do(e.x<r.x||e.x===r.x&&e.y<r.y)&&(r=e),e=e.next;while(e!==t);return r}function me(t,e,r,n,i,o,s,a){return(i-s)*(e-a)>=(t-s)*(o-a)&&(t-s)*(n-a)>=(r-s)*(e-a)&&(r-s)*(o-a)>=(i-s)*(n-a)}function Ro(t,e){return t.next.i!==e.i&&t.prev.i!==e.i&&!Vo(t,e)&&(Me(t,e)&&Me(e,t)&&ko(t,e)&&(z(t.prev,t,e.prev)||z(t,e.prev,e))||et(t,e)&&z(t.prev,t,t.next)>0&&z(e.prev,e,e.next)>0)}function z(t,e,r){return(e.y-t.y)*(r.x-e.x)-(e.x-t.x)*(r.y-e.y)}function et(t,e){return t.x===e.x&&t.y===e.y}function Yr(t,e,r,n){var i=Le(z(t,e,r)),o=Le(z(t,e,n)),s=Le(z(r,n,t)),a=Le(z(r,n,e));return!!(i!==o&&s!==a||i===0&&ke(t,r,e)||o===0&&ke(t,n,e)||s===0&&ke(r,t,n)||a===0&&ke(r,e,n))}function ke(t,e,r){return e.x<=Math.max(t.x,r.x)&&e.x>=Math.min(t.x,r.x)&&e.y<=Math.max(t.y,r.y)&&e.y>=Math.min(t.y,r.y)}function Le(t){return t>0?1:t<0?-1:0}function Vo(t,e){var r=t;do{if(r.i!==t.i&&r.next.i!==t.i&&r.i!==e.i&&r.next.i!==e.i&&Yr(r,r.next,t,e))return!0;r=r.next}while(r!==t);return!1}function Me(t,e){return z(t.prev,t,t.next)<0?z(t,e,t.next)>=0&&z(t,t.prev,e)>=0:z(t,e,t.prev)<0||z(t,t.next,e)<0}function ko(t,e){var r=t,n=!1,i=(t.x+e.x)/2,o=(t.y+e.y)/2;do r.y>o!=r.next.y>o&&r.next.y!==r.y&&i<(r.next.x-r.x)*(o-r.y)/(r.next.y-r.y)+r.x&&(n=!n),r=r.next;while(r!==t);return n}function Xr(t,e){var r=new Et(t.i,t.x,t.y),n=new Et(e.i,e.x,e.y),i=t.next,o=e.prev;return t.next=e,e.prev=t,r.next=i,i.prev=r,n.next=r,r.prev=n,o.next=n,n.prev=o,n}function yr(t,e,r,n){var i=new Et(t,e,r);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Te(t){t.next.prev=t.prev,t.prev.next=t.next,t.prevZ&&(t.prevZ.nextZ=t.nextZ),t.nextZ&&(t.nextZ.prevZ=t.prevZ)}function Et(t,e,r){this.i=t,this.x=e,this.y=r,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}Je.deviation=function(t,e,r,n){var i=e&&e.length,o=i?e[0]*r:t.length,s=Math.abs(Ct(t,0,o,r));if(i)for(var a=0,c=e.length;a<c;a++){var u=e[a]*r,l=a<c-1?e[a+1]*r:t.length;s-=Math.abs(Ct(t,u,l,r))}var f=0;for(a=0;a<n.length;a+=3){var d=n[a]*r,h=n[a+1]*r,v=n[a+2]*r;f+=Math.abs((t[d]-t[v])*(t[h+1]-t[d+1])-(t[d]-t[h])*(t[v+1]-t[d+1]))}return s===0&&f===0?0:Math.abs((f-s)/s)};function Ct(t,e,r,n){for(var i=0,o=e,s=r-n;o<r;o+=n)i+=(t[s]-t[o])*(t[o+1]+t[s+1]),s=o;return i}Je.flatten=function(t){for(var e=t[0][0].length,r={vertices:[],holes:[],dimensions:e},n=0,i=0;i<t.length;i++){for(var o=0;o<t[i].length;o++)for(var s=0;s<e;s++)r.vertices.push(t[i][o][s]);i>0&&(n+=t[i-1].length,r.holes.push(n))}return r};new re;new re;var xr;(t=>{function e(i){let o=i.slice();return o.sort(t.POINT_COMPARATOR),t.makeHullPresorted(o)}t.makeHull=e;function r(i){if(i.length<=1)return i.slice();let o=[];for(let a=0;a<i.length;a++){const c=i[a];for(;o.length>=2;){const u=o[o.length-1],l=o[o.length-2];if((u.x-l.x)*(c.y-l.y)>=(u.y-l.y)*(c.x-l.x))o.pop();else break}o.push(c)}o.pop();let s=[];for(let a=i.length-1;a>=0;a--){const c=i[a];for(;s.length>=2;){const u=s[s.length-1],l=s[s.length-2];if((u.x-l.x)*(c.y-l.y)>=(u.y-l.y)*(c.x-l.x))s.pop();else break}s.push(c)}return s.pop(),o.length==1&&s.length==1&&o[0].x==s[0].x&&o[0].y==s[0].y?o:o.concat(s)}t.makeHullPresorted=r;function n(i,o){return i.x<o.x?-1:i.x>o.x?1:i.y<o.y?-1:i.y>o.y?1:0}t.POINT_COMPARATOR=n})(xr||(xr={}));new Oe;new M;new fe;new Tr;new Ke;new Ae;new M;new M;export{ns as A,ms as B,Ot as C,Nr as D,Ir as E,si as F,is as G,Zo as H,di as I,gi as J,vt as K,Br as L,Rr as M,So as N,Wo as O,gs as P,ri as Q,De as S,rs as T,vs as X,ti as a,ts as b,qo as c,Qo as d,$o as e,Xo as f,Jo as g,pi as h,hi as i,Yo as j,ne as k,Ni as l,es as m,k as n,os as o,Ci as p,ss as q,as as r,Ko as s,ls as t,Ye as u,us as v,R as w,ds as x,cs as y,fs as z};
