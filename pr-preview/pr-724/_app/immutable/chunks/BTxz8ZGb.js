import"./D3vd2oiW.js";import{aB as er,bm as Or,bn as Se,V as _,aQ as je,a9 as se,bo as tr,ad as Ve,a4 as Y,x as _e,bp as Pe,bq as Ie,br as rr,bc as pe,bs as Pr,bt as Ir,J as Br,aD as nr,bu as kr,aT as Rr,C as ir,bv as Vr,am as Et,Q as Nr,bw as ht,bx as pt,M as re,a as De,by as Ur,S as Lr,y as mt,z as Be,bz as Fr,bA as jr,bB as Ne,bC as et,aJ as de,bD as Hr,aC as Gr,ab as Ze,bE as V}from"./BA0OfyM9.js";import{V as Wr,W as $r,aE as qr,b2 as Zr,a$ as or,N as zt,O as Tt,H as At,x as Ot,b0 as Kr,a2 as Yr,j as H,b3 as Ue,F as sr,g as m,s as P,aF as K,b as he,a as ne,a6 as W,a5 as ae,a4 as j,u as G,p as ar,i as cr,h as Xr,k as Qr,b1 as Jr}from"./ECtwNw_H.js";import{b as en,a as tn,f as rn}from"./CylRWhp9.js";import{B as nn,i as on}from"./IL_xXH8S.js";import{p as Le,r as lr,s as sn}from"./DvlG6KA1.js";(function(){try{var r=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{};r.SENTRY_RELEASE={id:"c90565214fa0f0b93d62f2dc16bf082779880811"}}catch{}})();try{(function(){var r=typeof window<"u"?window:typeof global<"u"?global:typeof globalThis<"u"?globalThis:typeof self<"u"?self:{},e=new r.Error().stack;e&&(r._sentryDebugIds=r._sentryDebugIds||{},r._sentryDebugIds[e]="6b5393c5-79d5-4a1c-b0fe-34d83619830a",r._sentryDebugIdIdentifier="sentry-dbid-6b5393c5-79d5-4a1c-b0fe-34d83619830a")})()}catch{}function an(r,e,...t){var n=new nn(r);Wr(()=>{const i=e()??null;n.ensure(i,i&&(o=>i(o,...t)))},$r)}function ur(r,e){var t=Ot,n=Tt,i=r();const o=or(i,s=>{var a=i!==r(),c,u=Tt,l=Ot;zt(n),At(t);try{c=Kr(()=>{Yr(()=>{const f=r();a&&s(f)})})}finally{zt(u),At(l)}return a=!0,c});return e?{set:e,update:s=>e(s(r())),subscribe:o.subscribe}:{subscribe:o.subscribe}}function vt(r){let e;const t=en(i=>{let o=!1;const s=r.subscribe(a=>{e=a,o&&i()});return o=!0,s});function n(){return qr()?(t(),e):Zr(r)}return"set"in r?{get current(){return n()},set current(i){r.set(i)}}:{get current(){return n()}}}var cn=["forEach","isDisjointFrom","isSubsetOf","isSupersetOf"],ln=["difference","intersection","symmetricDifference","union"],Pt=!1;class Fe extends Set{#r=new Map;#e=H(0);#t=H(0);#o=Ue||-1;constructor(e){if(super(),e){for(var t of e)super.add(t);this.#t.v=super.size}Pt||this.#i()}#n(e){return Ue===this.#o?H(e):sr(e)}#i(){Pt=!0;var e=Fe.prototype,t=Set.prototype;for(const n of cn)e[n]=function(...i){return m(this.#e),t[n].apply(this,i)};for(const n of ln)e[n]=function(...i){m(this.#e);var o=t[n].apply(this,i);return new Fe(o)}}has(e){var t=super.has(e),n=this.#r,i=n.get(e);if(i===void 0){if(!t)return m(this.#e),!1;i=this.#n(!0),n.set(e,i)}return m(i),t}add(e){return super.has(e)||(super.add(e),P(this.#t,super.size),K(this.#e)),this}delete(e){var t=super.delete(e),n=this.#r,i=n.get(e);return i!==void 0&&(n.delete(e),P(i,!1)),t&&(P(this.#t,super.size),K(this.#e)),t}clear(){if(super.size!==0){super.clear();var e=this.#r;for(var t of e.values())P(t,!1);e.clear(),P(this.#t,0),K(this.#e)}}keys(){return this.values()}values(){return m(this.#e),super.values()}entries(){return m(this.#e),super.entries()}[Symbol.iterator](){return this.keys()}get size(){return m(this.#t)}}class un extends Map{#r=new Map;#e=H(0);#t=H(0);#o=Ue||-1;constructor(e){if(super(),e){for(var[t,n]of e)super.set(t,n);this.#t.v=super.size}}#n(e){return Ue===this.#o?H(e):sr(e)}has(e){var t=this.#r,n=t.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),t.set(e,n);else return m(this.#e),!1;return m(n),!0}forEach(e,t){this.#i(),super.forEach(e,t)}get(e){var t=this.#r,n=t.get(e);if(n===void 0)if(super.has(e))n=this.#n(0),t.set(e,n);else{m(this.#e);return}return m(n),super.get(e)}set(e,t){var n=this.#r,i=n.get(e),o=super.get(e),s=super.set(e,t),a=this.#e;if(i===void 0)i=this.#n(0),n.set(e,i),P(this.#t,super.size),K(a);else if(o!==t){K(i);var c=a.reactions===null?null:new Set(a.reactions),u=c===null||!i.reactions?.every(l=>c.has(l));u&&K(a)}return s}delete(e){var t=this.#r,n=t.get(e),i=super.delete(e);return n!==void 0&&(t.delete(e),P(n,-1)),i&&(P(this.#t,super.size),K(this.#e)),i}clear(){if(super.size!==0){super.clear();var e=this.#r;P(this.#t,0);for(var t of e.values())P(t,-1);K(this.#e),e.clear()}}#i(){m(this.#e);var e=this.#r;if(this.#t.v!==e.size){for(var t of super.keys())if(!e.has(t)){var n=this.#n(0);e.set(t,n)}}for([,n]of this.#r)m(n)}keys(){return m(this.#e),super.keys()}values(){return this.#i(),super.values()}entries(){return this.#i(),super.entries()}[Symbol.iterator](){return this.entries()}get size(){return m(this.#t),super.size}}const ce=r=>{const e=or(r),t={set:n=>{t.current=n,e.set(n)},subscribe:e.subscribe,update:n=>{const i=n(t.current);t.current=i,e.set(i)},current:r};return t},tt=(r,e)=>({subscribe:ur(r,e).subscribe,set:e,update:n=>e(n(he(r))),get current(){return he(r)}}),dr=r=>{const{subscribe:e}=ur(r);return{subscribe:e,get current(){return he(r)}}},dn=r=>{const e=r.getBoundingClientRect();let t=H({width:e.width,height:e.height}),n=0,i=0,o=0,s=0,a=!0;const c=new ResizeObserver(()=>{a=!0;const l=r.getBoundingClientRect();P(t,{width:l.width,height:l.height})});function u(){const{clientWidth:l,clientHeight:f}=r;if(!a&&l===i&&f===n)return!1;i=l,n=f,a=!1;const d=r.getBoundingClientRect();return P(t,{width:d.width,height:d.height}),m(t).width===o&&m(t).height===s?!1:(o=m(t).width,s=m(t).height,!0)}return ne(()=>(c.observe(r),()=>c.disconnect())),{size:{get current(){return m(t)}},shouldUpdateSize:u}},qi=r=>{const e=typeof r=="function"?r():r,{dom:t,canvas:n}=e,{size:i,shouldUpdateSize:o}=dn(t),s={dom:t,canvas:n,size:dr(()=>i.current),shouldUpdateSize:o};return ae("threlte-dom-context",s),s},fr=()=>{const r=W("threlte-dom-context");if(!r)throw new Error("useDOM can only be used in a child component to <Canvas>.");return r};class hr{allVertices=new Map;isolatedVertices=new Map;connectedVertices=new Map;sortedConnectedValues=[];needsSort=!1;listeners=new Map;emit(e,t){const n=this.listeners.get(e);if(n)for(const i of n)i(t)}on(e,t){let n=this.listeners.get(e);n||(n=new Set,this.listeners.set(e,n)),n.add(t)}off(e,t){this.listeners.get(e)?.delete(t)}get sortedVertices(){return this.mapNodes(e=>e)}moveToIsolated(e){const t=this.connectedVertices.get(e);t&&(this.isolatedVertices.set(e,t),this.connectedVertices.delete(e))}moveToConnected(e){const t=this.isolatedVertices.get(e);t&&(this.connectedVertices.set(e,t),this.isolatedVertices.delete(e))}getKey=e=>typeof e=="object"?e.key:e;add(e,t,n){let i=this.allVertices.get(e);if(i&&i.value!==void 0)throw new Error(`A node with the key ${e.toString()} already exists`);i?i.value===void 0&&(i.value=t):(i={value:t,previous:new Set,next:new Set},this.allVertices.set(e,i));const o=i.next.size>0||i.previous.size>0;if(!n?.after&&!n?.before&&!o){this.isolatedVertices.set(e,i),this.emit("node:added",{key:e,type:"isolated",value:t});return}else this.connectedVertices.set(e,i);if(n?.after){const s=Array.isArray(n.after)?n.after:[n.after];for(const a of s)i.previous.add(this.getKey(a));for(const a of s){const c=this.getKey(a),u=this.allVertices.get(c);if(u)u.next.add(e),this.moveToConnected(c);else{const l={value:void 0,previous:new Set,next:new Set([e])};this.allVertices.set(c,l),this.connectedVertices.set(c,l)}}}if(n?.before){const s=Array.isArray(n.before)?n.before:[n.before];for(const a of s)i.next.add(this.getKey(a));for(const a of s){const c=this.getKey(a),u=this.allVertices.get(c);if(u)u.previous.add(e),this.moveToConnected(c);else{const l={value:void 0,previous:new Set([e]),next:new Set};this.allVertices.set(c,l),this.connectedVertices.set(c,l)}}}this.emit("node:added",{key:e,type:"connected",value:t}),this.needsSort=!0}remove(e){const t=this.getKey(e);if(this.isolatedVertices.get(t)){this.isolatedVertices.delete(t),this.allVertices.delete(t),this.emit("node:removed",{key:t,type:"isolated"});return}const i=this.connectedVertices.get(t);if(!(!i||i.value===void 0)){for(const o of i.next){const s=this.connectedVertices.get(o);s&&(s.previous.delete(t),s.previous.size===0&&s.next.size===0&&this.moveToIsolated(o))}for(const o of i.previous){const s=this.connectedVertices.get(o);s&&(s.next.delete(t),s.previous.size===0&&s.next.size===0&&this.moveToIsolated(o))}this.connectedVertices.delete(t),this.allVertices.delete(t),this.emit("node:removed",{key:t,type:"connected"}),this.needsSort=!0}}mapNodes(e){this.needsSort&&this.sort();const t=[];return this.forEachNode((n,i)=>{t.push(e(n,i))}),t}forEachNode(e){this.needsSort&&this.sort();let t=0;for(;t<this.sortedConnectedValues.length;t++)e(this.sortedConnectedValues[t],t);for(const n of this.isolatedVertices.values())n.value!==void 0&&e(n.value,t++)}getValueByKey(e){return this.allVertices.get(e)?.value}sort(){const e=new Map,t=[],n=[];for(const[o,s]of this.connectedVertices)s.value!==void 0&&e.set(o,0);for(const[o]of e){const s=this.connectedVertices.get(o);for(const a of s.next)e.has(a)&&e.set(a,e.get(a)+1)}for(const[o,s]of e)s===0&&t.push(o);let i=0;for(;i<t.length;){const o=t[i++];n.push(o);const s=this.connectedVertices.get(o)?.next;if(s)for(const a of s){const c=(e.get(a)||0)-1;e.set(a,c),c===0&&t.push(a)}}if(n.length!==e.size)throw new Error("The graph contains a cycle, and thus can not be sorted topologically.");this.sortedConnectedValues.length=0;for(let o=0;o<n.length;o++){const s=this.connectedVertices.get(n[o]).value;s!==void 0&&this.sortedConnectedValues.push(s)}this.needsSort=!1}clear(){this.allVertices.clear(),this.isolatedVertices.clear(),this.connectedVertices.clear(),this.sortedConnectedValues=[],this.needsSort=!1}static isKey(e){return typeof e=="string"||typeof e=="symbol"}static isValue(e){return typeof e=="object"&&"key"in e}}class fn{key;stage;callback;runTask=!0;stop(){this.runTask=!1}start(){this.runTask=!0}constructor(e,t,n){this.stage=e,this.key=t,this.callback=n}run(e){this.runTask&&this.callback(e)}}class hn extends hr{key;scheduler;runTask=!0;stop(){this.runTask=!1}start(){this.runTask=!0}get tasks(){return this.sortedVertices}callback=(e,t)=>t();constructor(e,t,n){super(),this.scheduler=e,this.key=t,this.start=this.start.bind(this),this.stop=this.stop.bind(this),n&&(this.callback=n.bind(this))}createTask(e,t,n){const i=new fn(this,e,t);return this.add(e,i,n),i}getTask(e){return this.getValueByKey(e)}removeTask=this.remove.bind(this);run(e){this.runTask&&this.callback(e,t=>{this.forEachNode(n=>{n.run(t??e)})})}runWithTiming(e){if(!this.runTask)return{};const t={};return this.callback(e,n=>{this.forEachNode(i=>{const o=performance.now();i.run(n??e);const s=performance.now()-o;t[i.key]=s})}),t}getSchedule(){return this.mapNodes(e=>e.key.toString())}}class pn extends hr{lastTime=0;clampDeltaTo=.1;get stages(){return this.sortedVertices}constructor(e){super(),e?.clampDeltaTo&&(this.clampDeltaTo=e.clampDeltaTo),this.run=this.run.bind(this)}createStage(e,t){const n=new hn(this,e,t?.callback);return this.add(e,n,{after:t?.after,before:t?.before}),n}getStage(e){return this.getValueByKey(e)}removeStage=this.remove.bind(this);run(e){const t=e-this.lastTime;this.forEachNode(n=>{n.run(Math.min(t/1e3,this.clampDeltaTo))}),this.lastTime=e}runWithTiming(e){const t=e-this.lastTime,n={},i=performance.now();return this.forEachNode(o=>{const s=performance.now(),a=o.runWithTiming(Math.min(t/1e3,this.clampDeltaTo)),c=performance.now()-s;n[o.key.toString()]={duration:c,tasks:a}}),this.lastTime=e,{total:performance.now()-i,stages:n}}getSchedule(e={tasks:!0}){return{stages:this.mapNodes(t=>{if(t===void 0)throw new Error("Stage not found");return{key:t.key.toString(),tasks:e.tasks?t.getSchedule():void 0}})}}dispose(){this.clear()}}const Zi=r=>{const e=new pn,t=e.createStage(Symbol("threlte-main-stage")),n=j(r),i=j(()=>m(n).autoRender),o=j(()=>m(n).renderMode);let s=j(()=>m(i)??!0),a=j(()=>m(o)??"on-demand");const c=new Set;let u=!0;const l=()=>m(a)==="always"||m(a)==="on-demand"&&(u||c.size>0)||m(a)==="manual"&&u,f={scheduler:e,autoInvalidations:c,frameInvalidated:{get current(){return u},set current(d){u=d}},advance:()=>{u=!0},autoRender:tt(()=>m(s),d=>P(s,d)),renderMode:tt(()=>m(a),d=>P(a,d)),invalidate(){u=!0},mainStage:t,shouldRender:l,renderStage:e.createStage(Symbol("threlte-render-stage"),{after:t,callback(d,h){f.shouldRender()&&h()}}),resetFrameInvalidation(){u=!1}};return ne(()=>()=>{e.dispose()}),ae("threlte-scheduler-context",f),f},He=()=>{const r=W("threlte-scheduler-context");if(!r)throw new Error("useScheduler can only be used in a child component to <Canvas>.");return r},Ki=()=>{const{size:r}=fr(),e=vt(r),{invalidate:t}=He(),n=new Fe,i=new er(75,1,.1,1e3);i.position.z=5,i.lookAt(0,0,0);let o=H(!1),s=H(i);G(()=>{if(m(s)!==i||m(o))return;const{width:c,height:u}=e.current;i.aspect=c/u,i.updateProjectionMatrix(),i.updateMatrixWorld(),t()}),G(()=>{(m(s)===void 0||n.size===0)&&(P(s,i),t())});const a={makeDefaultCameras:n,camera:tt(()=>m(s),c=>P(s,c)),manual:{get current(){return m(o)},set(c){P(o,c,!0)}}};return ae("threlte-camera-context",a),a},mn=()=>{const r=W("threlte-camera-context");if(!r)throw new Error("useCamera can only be used in a child component to <Canvas>.");return r},Yi=()=>{const r=new Map,e={disposableObjects:r,removeObjectFromDisposal:t=>{r.delete(t)},disposableObjectMounted:t=>{const n=r.get(t);n?r.set(t,n+1):r.set(t,1)},disposableObjectUnmounted:t=>{const n=r.get(t);n&&n>0&&(r.set(t,n-1),n-1<=0&&(r.delete(t),t.dispose()))}};return ne(()=>()=>{for(const[t]of r)t.dispose();r.clear()}),ae("threlte-disposal-context",e),e},vn=()=>{const r=W("threlte-disposal-context");if(!r)throw new Error("useDisposal can only be used in a child component to <Canvas>.");return r},pr=Symbol("threlte-parent-context"),gn=r=>{const e={get current(){return r()}};return ae(pr,e),e},mr=()=>W(pr),Xi=()=>{const r=mr();return dr(()=>r.current)},rt=Symbol("threlte-parent-object3d-context"),yn=r=>{const e=W(rt),t={get current(){return r()??e.current}};return ae(rt,t),t},xn=()=>W(rt),k=(r,e)=>r?.[`is${e}`]===!0,bn=new Set(["fov","aspect","near","far","left","right","top","bottom","zoom","filmGauge","filmOffset"]),wn=(r,e,t)=>{k(r,"PerspectiveCamera")?r.aspect=e/t:k(r,"OrthographicCamera")&&(r.left=e/-2,r.right=e/2,r.top=t/2,r.bottom=t/-2),r.updateProjectionMatrix(),r.updateMatrixWorld()},Sn=(r,e,t,n)=>{const{camera:i,manual:o,makeDefaultCameras:s}=mn(),{invalidate:a}=He(),{size:c}=fr(),u=vt(c);G(()=>{if(!t())return;const l=r();return s.add(l),i.set(l),o.set(e()),a(),()=>{s.delete(l);const f=s.values().next().value;i.current===l&&f&&(i.set(f),a())}}),G(()=>{if(e())return;const l=r();for(const f in n())if(bn.has(f)){l.updateProjectionMatrix(),a();break}}),G(()=>{e()||wn(r(),u.current.width,u.current.height)})},_n=(r,e)=>{if(e.includes(".")){const t=e.split("."),n=t.pop();for(let i=0;i<t.length;i+=1)if(r=r[t[i]],r==null)return console.error(`Cannot resolve property path "${e}": "${t[i]}" is ${r}`),{target:{},key:""};return{target:r,key:n}}else return{target:r,key:e}},Dn=r=>typeof r=="object"&&r!==null,Mn=(r,e)=>{const{invalidate:t}=He(),n=mr(),i=xn();G(()=>{t();const o=r(),s=e();if(s===void 0&&k(o,"Object3D")){const a=i.current;return a?.add(o),()=>{t(),a?.remove(o)}}if(s===void 0&&Dn(n.current)){const a=n.current;if(k(o,"Material")){const c=a.material;return a.material=o,()=>{t(),a.material=c}}else if(k(o,"BufferGeometry")){const c=a.geometry;return a.geometry=o,()=>{t(),a.geometry=c}}}if(s===!1)return()=>{t()};if(typeof s=="function"){const a=s({ref:o,parent:n.current,parentObject3D:i.current});return()=>{t(),a?.()}}if(typeof s=="string"){const{target:a,key:c}=_n(n.current,s);if(c in a){const u=a[c];return a[c]=o,()=>{t(),a[c]=u}}else return a[c]=o,()=>{t(),delete a[c]}}if(k(s,"Object3D")&&k(o,"Object3D"))return s.add(o),()=>{t(),s.remove(o)}})},It=Symbol("threlte-disposable-object-context"),Cn=r=>typeof r?.dispose=="function",En=(r,e)=>{const{disposableObjectMounted:t,disposableObjectUnmounted:n,removeObjectFromDisposal:i}=vn(),o=W(It),s=j(()=>{const c=e();return c!==void 0?c!==!1:o?.()!==!1});ae(It,()=>m(s));const a=new Set;ne(()=>{const c=r();Cn(c)&&(m(s)?(t(c),a.add(c)):(i(c),a.delete(c)))}),ne(()=>()=>{for(const c of a)n(c);a.clear()})};let nt;const zn=r=>{nt=r},Tn=()=>{const r=nt;return nt=void 0,r},An="threlte-plugin-context",On=r=>{const e=W(An);if(!e)return;const t=[],n=Object.values(e);if(n.length>0)for(let i=0;i<n.length;i++){const o=n[i],s=o(r);s&&s.pluginProps&&t.push(...s.pluginProps)}return{pluginsProps:t}},Pn=r=>typeof r=="string"||typeof r=="number"||typeof r=="boolean"||typeof r>"u"||r===null,In=(r,e,t)=>{const n=r[e],i=Array.isArray(t);!i&&typeof t=="number"&&typeof n=="object"&&n!==null&&typeof n.setScalar=="function"&&!n.isColor?n.setScalar(t):typeof n=="object"&&n!==null&&typeof n.set=="function"?i?n.set(...t):n.set(t):r[e]=t},Bn=(r,e,t)=>{const{invalidate:n}=He(),i=new Map,o=(s,a,c)=>{if(Pn(c)){const d=i.get(a);if(d&&d.instance===s&&d.value===c)return;i.set(a,{instance:s,value:c})}else i.delete(a);let u=s,l=a;const f=a.includes(".");if(f){const d=a.split(".");l=d.pop();for(let h=0;h<d.length;h++)if(u=u[d[h]],u==null){console.error(`Cannot resolve property path "${a}": "${d[h]}" is ${u}`);return}}if(typeof c=="function"&&l.startsWith("on")&&!f&&"addEventListener"in u){const d=u,h=l.slice(2);return d.addEventListener(h,c),()=>{d.removeEventListener?.(h,c)}}c!=null?In(u,l,c):u[l]=c,n()};G(()=>{const s=r(),a=e(),c=t();i.clear(),he(()=>{for(const u in a)c?.includes(u)||G(()=>o(s,u,a[u]))})})},kn=r=>typeof r=="function"&&Function.prototype.toString.call(r).startsWith("class "),Rn=(r,e)=>kn(r)?Array.isArray(e)?new r(...e):new r:r;function Vn(r,e){ar(e,!0);let t=Le(e,"manual",3,!1),n=Le(e,"makeDefault",3,!1),i=lr(e,["$$slots","$$events","$$legacy","ref","manual","makeDefault"]);Sn(()=>e.ref,()=>t(),()=>n(),()=>i),cr()}var Nn=rn("<!> <!>",1);function Bt(r,e){ar(e,!0);let t=Le(e,"is",19,Tn),n=Le(e,"ref",15),i=lr(e,["$$slots","$$events","$$legacy","is","args","attach","dispose","ref","oncreate","children","makeDefault","manual"]);const o=j(()=>Rn(t(),e.args)),s=On({get ref(){return m(o)},get args(){return e.args},get attach(){return e.attach},get manual(){return e.manual},get makeDefault(){return e.makeDefault},get dispose(){return e.dispose},get props(){return i}});Bn(()=>m(o),()=>i,()=>s?.pluginsProps),Mn(()=>m(o),()=>e.attach),En(()=>m(o),()=>e.dispose),yn(()=>k(m(o),"Object3D")?m(o):void 0),gn(()=>m(o)),ne(()=>{if(m(o))return he(()=>(n(m(o)),e.oncreate?.(m(o))))});var a=Nn(),c=Xr(a);{var u=d=>{Vn(d,sn({get ref(){return m(o)},get manual(){return e.manual},get makeDefault(){return e.makeDefault}},()=>i))},l=j(()=>k(m(o),"PerspectiveCamera")||k(m(o),"OrthographicCamera"));on(c,d=>{m(l)&&d(u)})}var f=Qr(c,2);an(f,()=>e.children??Jr,()=>({ref:m(o)})),tn(r,a),cr()}const Un={},Qi=new Proxy(Bt,{get(r,e){if(typeof e!="string")return Reflect.get(r,e);const t=Un[e]||Or[e];if(t===void 0)throw new Error(`No Three.js module found for ${e}. Did you forget to extend the catalogue?`);return(...n)=>(zn(t),Bt(...n))}}),kt=Symbol(),Ln=r=>typeof r?.subscribe=="function",vr=(r,e,t)=>{const n=r().map(s=>Ln(s)?vt(s):kt),i=j(()=>r().map((s,a)=>n[a]===kt?s:n[a].current)),o=()=>{m(i);let s;return he(()=>{s=e(m(i))}),s};t?G(o):ne(o)},Fn=(r,e)=>vr(r,e,!1),jn=(r,e)=>vr(r,e,!0),Ji=Object.assign(Fn,{pre:jn}),Q=r=>({subscribe:r.subscribe,get current(){return r.current}});let ge=0;const gt=ce(!1),Ge=ce(!1),yt=ce(void 0),xt=ce(0),bt=ce(0),gr=ce([]),wt=ce(0),{onStart:Hn,onLoad:Gn,onError:Wn}=Se;Se.onStart=(r,e,t)=>{Hn?.(r,e,t),Ge.set(!0),yt.set(r),xt.set(e),bt.set(t);const n=(e-ge)/(t-ge);wt.set(n),n===1&&gt.set(!0)};Se.onLoad=()=>{Gn?.(),Ge.set(!1)};Se.onError=r=>{Wn?.(r),gr.update(e=>[...e,r])};Se.onProgress=(r,e,t)=>{e===t&&(ge=t),Ge.set(!0),yt.set(r),xt.set(e),bt.set(t);const n=(e-ge)/(t-ge)||1;wt.set(n),n===1&&gt.set(!0)};Q(Ge),Q(yt),Q(xt),Q(bt),Q(gr),Q(wt),Q(gt);new _;new _;new _;const Ce=new je,Rt=new se,Vt=new tr,Ke=new _,eo=function(r,e){if(this.geometry.boundingSphere===null&&this.geometry.computeBoundingSphere(),Ce.copy(this.geometry.boundingSphere??Ce),Ce.applyMatrix4(this.matrixWorld),!r.ray.intersectsSphere(Ce)||(Rt.copy(this.matrixWorld).invert(),Vt.copy(r.ray).applyMatrix4(Rt),this.geometry.boundingBox!==null&&Vt.intersectBox(this.geometry.boundingBox,Ke)===null))return;const t=Ke.distanceTo(r.ray.origin),n=Ke.clone();e.push({distance:t,point:n,object:this})};new _;new se;new _;new _;new Ve;const ie=new _,We=new _,$n=new _,qn=new Y,to=(r,e,t)=>{const n=ie.setFromMatrixPosition(r.matrixWorld);n.project(e);const i=t.width/2,o=t.height/2;return[n.x*i+i,-(n.y*o)+o]},ro=(r,e)=>{const t=ie.setFromMatrixPosition(r.matrixWorld),n=We.setFromMatrixPosition(e.matrixWorld),i=t.sub(n),o=e.getWorldDirection($n);return i.angleTo(o)>Math.PI/2},no=(r,e,t,n)=>{const i=ie.setFromMatrixPosition(r.matrixWorld),o=We.copy(ie);o.project(e),t.setFromCamera(qn.set(o.x,o.y),e);const s=t.intersectObjects(n,!0);if(s.length){const a=s[0].distance;return i.distanceTo(t.ray.origin)<a}return!0},io=(r,e)=>{if(k(e,"OrthographicCamera"))return e.zoom;if(k(e,"PerspectiveCamera")){const t=ie.setFromMatrixPosition(r.matrixWorld),n=We.setFromMatrixPosition(e.matrixWorld),i=e.fov*Math.PI/180,o=t.distanceTo(n);return 1/(2*Math.tan(i/2)*o)}else return 1},oo=(r,e,t)=>{const n=ie.setFromMatrixPosition(r.matrixWorld),i=We.setFromMatrixPosition(e.matrixWorld),o=n.distanceTo(i),s=(t[1]-t[0])/(e.far-e.near),a=t[1]-s*e.far;return Math.round(s*o+a)},I=r=>Math.abs(r)<1e-10?0:r,yr=(r,e,t="")=>{const{elements:n}=r;return`${t}matrix3d(
    ${I(e[0]*n[0])},${I(e[1]*n[1])},${I(e[2]*n[2])},${I(e[3]*n[3])},
    ${I(e[4]*n[4])},${I(e[5]*n[5])},${I(e[6]*n[6])},${I(e[7]*n[7])},
    ${I(e[8]*n[8])},${I(e[9]*n[9])},${I(e[10]*n[10])},${I(e[11]*n[11])},
    ${I(e[12]*n[12])},${I(e[13]*n[13])},${I(e[14]*n[14])},${I(e[15]*n[15])}
  )`},so=(r=>e=>yr(e,r))([1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1]),ao=(r=>(e,t)=>yr(e,r(t),"translate(-50%,-50%)"))(r=>[1/r,1/r,1/r,1,-1/r,-1/r,-1/r,-1,1/r,1/r,1/r,1,1,1,1,1]),co=(r,e,t)=>{if(k(r,"OrthographicCamera"))return 1;if(k(r,"PerspectiveCamera")){const{width:n,height:i}=t,o=r.getWorldPosition(ie).distanceTo(e),s=r.fov*Math.PI/180,c=2*Math.tan(s/2)*o*(n/i);return n/c}throw new Error("getViewportFactor needs a Perspective or Orthographic Camera")};var Zn=Object.defineProperty,Kn=(r,e,t)=>e in r?Zn(r,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):r[e]=t,S=(r,e,t)=>Kn(r,typeof e!="symbol"?e+"":e,t);const xr=(r,e)=>{const[t,n]=e.split("-");return Object.assign(r.style,{left:n==="left"?"0":n==="center"?"50%":"",right:n==="right"?"0":"",top:t==="top"?"0":t==="bottom"?"":"50%",bottom:t==="bottom"?"0":"",transform:`${n==="center"?"translateX(-50%)":""} ${t==="center"?"translateY(-50%)":""}`}),e},Yn=({placement:r,size:e,offset:t,id:n,className:i})=>{const o=document.createElement("div"),{top:s,left:a,right:c,bottom:u}=t;return Object.assign(o.style,{id:n,position:"absolute",zIndex:"1000",height:`${e}px`,width:`${e}px`,margin:`${s}px ${c}px ${u}px ${a}px`,borderRadius:"100%"}),xr(o,r),n&&(o.id=n),i&&(o.className=i),o},Xn=r=>{const e=typeof r=="string"?document.querySelector(r):r;if(!e)throw Error("Invalid DOM element");return e};function it(r,e,t){return Math.max(e,Math.min(t,r))}const Qn=[["x",0,3],["y",1,4],["z",2,5]],Nt=new _;function Ut({isSphere:r},e,t){r&&(Nt.set(0,0,1).applyQuaternion(t.quaternion),Qn.forEach(([n,i,o])=>{const s=Nt[n];let a=e[i],c=a.userData.opacity;a.material.opacity=it(s>=0?c:c/2,0,1),a=e[o],c=a.userData.opacity,a.material.opacity=it(s>=0?c/2:c,0,1)}))}const Jn=(r,e,t=10)=>Math.abs(r.clientX-e.x)<t&&Math.abs(r.clientY-e.y)<t,Lt=new Rr,Ft=new Y,jt=(r,e,t,n)=>{Ft.set((r.clientX-e.left)/e.width*2-1,-((r.clientY-e.top)/e.height)*2+1),Lt.setFromCamera(Ft,t);const i=Lt.intersectObjects(n,!1),o=i.length?i[0]:null;return!o||!o.object.visible?null:o},Ye=1e-6,ei=2*Math.PI,br=["x","y","z"],ye=[...br,"nx","ny","nz"],ti=["x","z","y","nx","nz","ny"],ri=["z","x","y","nz","nx","ny"],ot="Right",ke="Top",st="Front",at="Left",Re="Bottom",ct="Back",ni=[ot,ke,st,at,Re,ct].map(r=>r.toLocaleLowerCase()),wr=1.3,Ht=(r,e=!0)=>{const{material:t,userData:n}=r,{color:i,opacity:o}=e?n.hover:n;t.color.set(i),t.opacity=o},J=r=>JSON.parse(JSON.stringify(r)),ii=r=>{const e=r.type||"sphere",t=e==="sphere",n=r.resolution||t?64:128,i=Ve.DEFAULT_UP,o=i.z===1,s=i.x===1,{container:a}=r;r.container=void 0,r=JSON.parse(JSON.stringify(r)),r.container=a;const c=o?ti:s?ri:ye;ni.forEach((d,h)=>{r[d]&&(r[c[h]]=r[d])});const u={enabled:!0,color:16777215,opacity:1,scale:.7,labelColor:2236962,line:!1,border:{size:0,color:14540253},hover:{color:t?16777215:9688043,labelColor:2236962,opacity:1,scale:.7,border:{size:0,color:14540253}}},l={line:!1,scale:t?.45:.7,hover:{scale:t?.5:.7}},f={type:e,container:document.body,size:128,placement:"top-right",resolution:n,lineWidth:4,radius:t?1:.2,smoothness:18,animated:!0,speed:1,background:{enabled:!0,color:t?16777215:14739180,opacity:t?0:1,hover:{color:t?16777215:14739180,opacity:t?.2:1}},font:{family:"sans-serif",weight:900},offset:{top:10,left:10,bottom:10,right:10},corners:{enabled:!t,color:t?15915362:16777215,opacity:1,scale:t?.15:.2,radius:1,smoothness:18,hover:{color:t?16777215:9688043,opacity:1,scale:t?.2:.225}},edges:{enabled:!t,color:t?15915362:16777215,opacity:t?1:0,radius:t?1:.125,smoothness:18,scale:t?.15:1,hover:{color:t?16777215:9688043,opacity:1,scale:t?.2:1}},x:{...J(u),...t?{label:"X",color:16725587,line:!0}:{label:s?ke:ot}},y:{...J(u),...t?{label:"Y",color:9100032,line:!0}:{label:o||s?st:ke}},z:{...J(u),...t?{label:"Z",color:2920447,line:!0}:{label:o?ke:s?ot:st}},nx:{...J(l),label:t?"":s?Re:at},ny:{...J(l),label:t?"":o||s?ct:Re},nz:{...J(l),label:t?"":o?Re:s?at:ct}};return lt(r,f),br.forEach(d=>lt(r[`n${d}`],J(r[d]))),{...r,isSphere:t}};function lt(r,...e){if(r instanceof HTMLElement||typeof r!="object"||r===null)return r;for(const t of e)for(const n in t)n!=="container"&&n in t&&(r[n]===void 0?r[n]=t[n]:typeof t[n]=="object"&&!Array.isArray(t[n])&&(r[n]=lt(r[n]||{},t[n])));return r}const oi=(r,e=2)=>{const t=new ir,n=e*2,{isSphere:i,resolution:o,radius:s,font:a,corners:c,edges:u}=r,l=ye.map(y=>({...r[y],radius:s}));i&&c.enabled&&l.push(c),i&&u.enabled&&l.push(u);const f=document.createElement("canvas"),d=f.getContext("2d");f.width=o*2+n*2,f.height=o*l.length+n*l.length;const[h,p]=me(l,o,a);l.forEach(({radius:y,label:E,color:$,labelColor:M,border:C,hover:{color:X,labelColor:R,border:N}},q)=>{const Z=o*q+q*n+e;g(e,Z,e,o,y,E,C,$,M),g(o+e*3,Z,e,o,y,E,N??C,X??$,R??M)});const D=l.length,w=e/(o*2),b=e/(o*6),x=1/D,v=new Vr(f);return v.repeat.set(.5-2*w,x-2*b),v.offset.set(w,1-b),Object.assign(v,{colorSpace:Nr,wrapS:Et,wrapT:Et,userData:{offsetX:w,offsetY:b,cellHeight:x}}),v;function g(y,E,$,M,C,X,R,N,q){if(C=C*(M/2),N!=null&&N!==""&&(Z(),d.fillStyle=t.set(N).getStyle(),d.fill()),R&&R.size){const le=R.size*M/2;y+=le,E+=le,M-=R.size*M,C=Math.max(0,C-le),Z(),d.strokeStyle=t.set(R.color).getStyle(),d.lineWidth=R.size*M,d.stroke()}X&&B(d,y+M/2,E+(M+$)/2,X,t.set(q).getStyle());function Z(){d.beginPath(),d.moveTo(y+C,E),d.lineTo(y+M-C,E),d.arcTo(y+M,E,y+M,E+C,C),d.lineTo(y+M,E+M-C),d.arcTo(y+M,E+M,y+M-C,E+M,C),d.lineTo(y+C,E+M),d.arcTo(y,E+M,y,E+M-C,C),d.lineTo(y,E+C),d.arcTo(y,E,y+C,E,C),d.closePath()}}function me(y,E,$){const M=[...y].sort((Me,Ar)=>{var Mt,Ct;return(((Mt=Me.label)==null?void 0:Mt.length)||0)-(((Ct=Ar.label)==null?void 0:Ct.length)||0)}).pop().label,{family:C,weight:X}=$,R=i?Math.sqrt(Math.pow(E*.7,2)/2):E;let N=R,q=0,Z=0;do{d.font=`${X} ${N}px ${C}`;const Me=d.measureText(M);q=Me.width,Z=Me.fontBoundingBoxDescent,N--}while(q>R&&N>0);const le=R/Z,zr=Math.min(R/q,le),Tr=Math.floor(N*zr);return[`${X} ${Tr}px ${C}`,le]}function B(y,E,$,M,C){y.font=h,y.textAlign="center",y.textBaseline="middle",y.fillStyle=C,y.fillText(M,E,$+(i?p:0))}},si=(r,e)=>r.offset.x=(e?.5:0)+r.userData.offsetX,St=(r,e)=>{const{offset:t,userData:{offsetY:n,cellHeight:i}}=r;t.y=1-(e+1)*i+n};function _t(r,e,t=2,n=2){const i=t/2-r,o=n/2-r,s=r/t,a=(t-r)/t,c=r/n,u=(n-r)/n,l=[i,o,0,-i,o,0,-i,-o,0,i,-o,0],f=[a,u,s,u,s,c,a,c],d=[3*(e+1)+3,3*(e+1)+4,e+4,e+5,2*(e+1)+4,2,1,2*(e+1)+3,3,4*(e+1)+3,4,0],h=[0,1,2,0,2,3,4,5,6,4,6,7,8,9,10,8,10,11].map(B=>d[B]);let p,D,w,b,x,v,g,me;for(let B=0;B<4;B++){b=B<1||B>2?i:-i,x=B<2?o:-o,v=B<1||B>2?a:s,g=B<2?u:c;for(let y=0;y<=e;y++)p=Math.PI/2*(B+y/e),D=Math.cos(p),w=Math.sin(p),l.push(b+r*D,x+r*w,0),f.push(v+s*D,g+c*w),y<e&&(me=(e+1)*B+y+4,h.push(B,me,me+1))}return new mt().setIndex(new Be(new Uint32Array(h),1)).setAttribute("position",new Be(new Float32Array(l),3)).setAttribute("uv",new Be(new Float32Array(f),2))}const ai=(r,e)=>{const t=new _,{isSphere:n,radius:i,smoothness:o}=r,s=_t(i,o);return ye.map((a,c)=>{const u=c<3,l=ye[c],f=c?e.clone():e;St(f,c);const{enabled:d,scale:h,opacity:p,hover:D}=r[l],w={map:f,opacity:p,transparent:!0},b=n?new ht(new pt(w)):new re(s,new De(w)),x=u?l:l[1];return b.position[x]=(u?1:-1)*(n?wr:1),n||b.lookAt(t.copy(b.position).multiplyScalar(1.7)),b.scale.setScalar(h),b.renderOrder=1,b.visible=d,b.userData={scale:h,opacity:p,hover:D},b})},ci=(r,e)=>{const{isSphere:t,corners:n}=r;if(!n.enabled)return[];const{color:i,opacity:o,scale:s,radius:a,smoothness:c,hover:u}=n,l=t?null:_t(a,c),f={transparent:!0,opacity:o},d=[1,1,1,-1,1,1,1,-1,1,-1,-1,1,1,1,-1,-1,1,-1,1,-1,-1,-1,-1,-1].map(p=>p*.85),h=new _;return Array(d.length/3).fill(0).map((p,D)=>{if(t){const x=e.clone();St(x,6),f.map=x}else f.color=i;const w=t?new ht(new pt(f)):new re(l,new De(f)),b=D*3;return w.position.set(d[b],d[b+1],d[b+2]),t&&w.position.normalize().multiplyScalar(1.7),w.scale.setScalar(s),w.lookAt(h.copy(w.position).multiplyScalar(2)),w.renderOrder=1,w.userData={color:i,opacity:o,scale:s,hover:u},w})},li=(r,e,t)=>{const{isSphere:n,edges:i}=r;if(!i.enabled)return[];const{color:o,opacity:s,scale:a,hover:c,radius:u,smoothness:l}=i,f=n?null:_t(u,l,1.2,.25),d={transparent:!0,opacity:s},h=[0,1,1,0,-1,1,1,0,1,-1,0,1,0,1,-1,0,-1,-1,1,0,-1,-1,0,-1,1,1,0,1,-1,0,-1,1,0,-1,-1,0].map(w=>w*.925),p=new _,D=new _(0,1,0);return Array(h.length/3).fill(0).map((w,b)=>{if(n){const g=e.clone();St(g,t),d.map=g}else d.color=o;const x=n?new ht(new pt(d)):new re(f,new De(d)),v=b*3;return x.position.set(h[v],h[v+1],h[v+2]),n&&x.position.normalize().multiplyScalar(1.7),x.scale.setScalar(a),x.up.copy(D),x.lookAt(p.copy(x.position).multiplyScalar(2)),!n&&!x.position.y&&(x.rotation.z=Math.PI/2),x.renderOrder=1,x.userData={color:o,opacity:s,scale:a,hover:c},x})};function ui(r,e=!1){const t=r[0].index!==null,n=new Set(Object.keys(r[0].attributes)),i=new Set(Object.keys(r[0].morphAttributes)),o={},s={},a=r[0].morphTargetsRelative,c=new mt;let u=0;for(let l=0;l<r.length;++l){const f=r[l];let d=0;if(t!==(f.index!==null))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". All geometries must have compatible attributes; make sure index attribute exists among all geometries, or in none of them."),null;for(const h in f.attributes){if(!n.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+'. All geometries must have compatible attributes; make sure "'+h+'" attribute exists among all geometries, or in none of them.'),null;o[h]===void 0&&(o[h]=[]),o[h].push(f.attributes[h]),d++}if(d!==n.size)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". Make sure all geometries have the same number of attributes."),null;if(a!==f.morphTargetsRelative)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". .morphTargetsRelative must be consistent throughout all geometries."),null;for(const h in f.morphAttributes){if(!i.has(h))return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+".  .morphAttributes must be consistent throughout all geometries."),null;s[h]===void 0&&(s[h]=[]),s[h].push(f.morphAttributes[h])}if(e){let h;if(t)h=f.index.count;else if(f.attributes.position!==void 0)h=f.attributes.position.count;else return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed with geometry at index "+l+". The geometry must have either an index or a position attribute"),null;c.addGroup(u,h,l),u+=h}}if(t){let l=0;const f=[];for(let d=0;d<r.length;++d){const h=r[d].index;for(let p=0;p<h.count;++p)f.push(h.getX(p)+l);l+=r[d].attributes.position.count}c.setIndex(f)}for(const l in o){const f=Gt(o[l]);if(!f)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+l+" attribute."),null;c.setAttribute(l,f)}for(const l in s){const f=s[l][0].length;if(f===0)break;c.morphAttributes=c.morphAttributes||{},c.morphAttributes[l]=[];for(let d=0;d<f;++d){const h=[];for(let D=0;D<s[l].length;++D)h.push(s[l][D][d]);const p=Gt(h);if(!p)return console.error("THREE.BufferGeometryUtils: .mergeGeometries() failed while trying to merge the "+l+" morphAttribute."),null;c.morphAttributes[l].push(p)}}return c}function Gt(r){let e,t,n,i=-1,o=0;for(let u=0;u<r.length;++u){const l=r[u];if(e===void 0&&(e=l.array.constructor),e!==l.array.constructor)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.array must be of consistent array types across matching attributes."),null;if(t===void 0&&(t=l.itemSize),t!==l.itemSize)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.itemSize must be consistent across matching attributes."),null;if(n===void 0&&(n=l.normalized),n!==l.normalized)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.normalized must be consistent across matching attributes."),null;if(i===-1&&(i=l.gpuType),i!==l.gpuType)return console.error("THREE.BufferGeometryUtils: .mergeAttributes() failed. BufferAttribute.gpuType must be consistent across matching attributes."),null;o+=l.count*t}const s=new e(o),a=new Be(s,t,n);let c=0;for(let u=0;u<r.length;++u){const l=r[u];if(l.isInterleavedBufferAttribute){const f=c/t;for(let d=0,h=l.count;d<h;d++)for(let p=0;p<t;p++){const D=l.getComponent(d,p);a.setComponent(d+f,p,D)}}else s.set(l.array,c);c+=l.count*t}return i!==void 0&&(a.gpuType=i),a}const di=(r,e)=>{const{isSphere:t,background:{enabled:n,color:i,opacity:o,hover:s}}=e;let a;const c=new De({color:i,side:Ur,opacity:o,transparent:!0,depthWrite:!1});if(!n)return null;if(t)a=new re(new Lr(1.8,64,64),c);else{let u;r.forEach(l=>{const f=l.scale.x;l.scale.setScalar(.9),l.updateMatrix();const d=l.geometry.clone();d.applyMatrix4(l.matrix),u=u?ui([u,d]):d,l.scale.setScalar(f)}),a=new re(u,c)}return a.userData={color:i,opacity:o,hover:s},a},Wt=new _e,Ee=new _;let Sr=class extends jr{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";const e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new Ne(e,3)),this.setAttribute("uv",new Ne(t,2))}applyMatrix4(e){const t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new et(t,6,1);return this.setAttribute("instanceStart",new de(n,3,0)),this.setAttribute("instanceEnd",new de(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));const n=new et(t,6,1);return this.setAttribute("instanceColorStart",new de(n,3,0)),this.setAttribute("instanceColorEnd",new de(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Hr(e.geometry)),this}fromLineSegments(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new _e);const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Wt.setFromBufferAttribute(t),this.boundingBox.union(Wt))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new je),this.boundingBox===null&&this.computeBoundingBox();const e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){const n=this.boundingSphere.center;this.boundingBox.getCenter(n);let i=0;for(let o=0,s=e.count;o<s;o++)Ee.fromBufferAttribute(e,o),i=Math.max(i,n.distanceToSquared(Ee)),Ee.fromBufferAttribute(t,o),i=Math.max(i,n.distanceToSquared(Ee));this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}applyMatrix(e){return console.warn("THREE.LineSegmentsGeometry: applyMatrix() has been renamed to applyMatrix4()."),this.applyMatrix4(e)}};Pe.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Y(1,1)},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Ie.line={uniforms:rr.merge([Pe.common,Pe.fog,Pe.line]),vertexShader:`
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
		`};let Dt=class extends Fr{constructor(e){super({type:"LineMaterial",uniforms:rr.clone(Ie.line.uniforms),vertexShader:Ie.line.vertexShader,fragmentShader:Ie.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};const Xe=new pe,$t=new _,qt=new _,T=new pe,A=new pe,U=new pe,Qe=new _,Je=new se,O=new Pr,Zt=new _,ze=new _e,Te=new je,L=new pe;let F,te;function Kt(r,e,t){return L.set(0,0,-e,1).applyMatrix4(r.projectionMatrix),L.multiplyScalar(1/L.w),L.x=te/t.width,L.y=te/t.height,L.applyMatrix4(r.projectionMatrixInverse),L.multiplyScalar(1/L.w),Math.abs(Math.max(L.x,L.y))}function fi(r,e){const t=r.matrixWorld,n=r.geometry,i=n.attributes.instanceStart,o=n.attributes.instanceEnd,s=Math.min(n.instanceCount,i.count);for(let a=0,c=s;a<c;a++){O.start.fromBufferAttribute(i,a),O.end.fromBufferAttribute(o,a),O.applyMatrix4(t);const u=new _,l=new _;F.distanceSqToSegment(O.start,O.end,l,u),l.distanceTo(u)<te*.5&&e.push({point:l,pointOnLine:u,distance:F.origin.distanceTo(l),object:r,face:null,faceIndex:a,uv:null,uv1:null})}}function hi(r,e,t){const n=e.projectionMatrix,i=r.material.resolution,o=r.matrixWorld,s=r.geometry,a=s.attributes.instanceStart,c=s.attributes.instanceEnd,u=Math.min(s.instanceCount,a.count),l=-e.near;F.at(1,U),U.w=1,U.applyMatrix4(e.matrixWorldInverse),U.applyMatrix4(n),U.multiplyScalar(1/U.w),U.x*=i.x/2,U.y*=i.y/2,U.z=0,Qe.copy(U),Je.multiplyMatrices(e.matrixWorldInverse,o);for(let f=0,d=u;f<d;f++){if(T.fromBufferAttribute(a,f),A.fromBufferAttribute(c,f),T.w=1,A.w=1,T.applyMatrix4(Je),A.applyMatrix4(Je),T.z>l&&A.z>l)continue;if(T.z>l){const b=T.z-A.z,x=(T.z-l)/b;T.lerp(A,x)}else if(A.z>l){const b=A.z-T.z,x=(A.z-l)/b;A.lerp(T,x)}T.applyMatrix4(n),A.applyMatrix4(n),T.multiplyScalar(1/T.w),A.multiplyScalar(1/A.w),T.x*=i.x/2,T.y*=i.y/2,A.x*=i.x/2,A.y*=i.y/2,O.start.copy(T),O.start.z=0,O.end.copy(A),O.end.z=0;const h=O.closestPointToPointParameter(Qe,!0);O.at(h,Zt);const p=Gr.lerp(T.z,A.z,h),D=p>=-1&&p<=1,w=Qe.distanceTo(Zt)<te*.5;if(D&&w){O.start.fromBufferAttribute(a,f),O.end.fromBufferAttribute(c,f),O.start.applyMatrix4(o),O.end.applyMatrix4(o);const b=new _,x=new _;F.distanceSqToSegment(O.start,O.end,x,b),t.push({point:x,pointOnLine:b,distance:F.origin.distanceTo(x),object:r,face:null,faceIndex:f,uv:null,uv1:null})}}}class pi extends re{constructor(e=new Sr,t=new Dt({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){const e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,i=new Float32Array(2*t.count);for(let s=0,a=0,c=t.count;s<c;s++,a+=2)$t.fromBufferAttribute(t,s),qt.fromBufferAttribute(n,s),i[a]=a===0?0:i[a-1],i[a+1]=i[a]+$t.distanceTo(qt);const o=new et(i,2,1);return e.setAttribute("instanceDistanceStart",new de(o,1,0)),e.setAttribute("instanceDistanceEnd",new de(o,1,1)),this}raycast(e,t){const n=this.material.worldUnits,i=e.camera;i===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.');const o=e.params.Line2!==void 0&&e.params.Line2.threshold||0;F=e.ray;const s=this.matrixWorld,a=this.geometry,c=this.material;te=c.linewidth+o,a.boundingSphere===null&&a.computeBoundingSphere(),Te.copy(a.boundingSphere).applyMatrix4(s);let u;if(n)u=te*.5;else{const f=Math.max(i.near,Te.distanceToPoint(F.origin));u=Kt(i,f,c.resolution)}if(Te.radius+=u,F.intersectsSphere(Te)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),ze.copy(a.boundingBox).applyMatrix4(s);let l;if(n)l=te*.5;else{const f=Math.max(i.near,ze.distanceToPoint(F.origin));l=Kt(i,f,c.resolution)}ze.expandByScalar(l),F.intersectsBox(ze)!==!1&&(n?fi(this,t):hi(this,i,t))}onBeforeRender(e){const t=this.material.uniforms;t&&t.resolution&&(e.getViewport(Xe),this.material.uniforms.resolution.value.set(Xe.z,Xe.w))}}class _r extends Sr{constructor(){super(),this.isLineGeometry=!0,this.type="LineGeometry"}setPositions(e){const t=e.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setPositions(n),this}setColors(e){const t=e.length-3,n=new Float32Array(2*t);for(let i=0;i<t;i+=3)n[2*i]=e[i],n[2*i+1]=e[i+1],n[2*i+2]=e[i+2],n[2*i+3]=e[i+3],n[2*i+4]=e[i+4],n[2*i+5]=e[i+5];return super.setColors(n),this}setFromPoints(e){const t=e.length-1,n=new Float32Array(6*t);for(let i=0;i<t;i++)n[6*i]=e[i].x,n[6*i+1]=e[i].y,n[6*i+2]=e[i].z||0,n[6*i+3]=e[i+1].x,n[6*i+4]=e[i+1].y,n[6*i+5]=e[i+1].z||0;return super.setPositions(n),this}fromLine(e){const t=e.geometry;return this.setPositions(t.attributes.position.array),this}}class mi extends pi{constructor(e=new _r,t=new Dt({color:Math.random()*16777215})){super(e,t),this.isLine2=!0,this.type="Line2"}}const vi=r=>{const e=new ir,t=[],n=[],{isSphere:i}=r;if(ye.forEach((a,c)=>{const{enabled:u,line:l,scale:f,color:d}=r[a];if(!u||!l)return;const h=c<3?1:-1,p=(i?wr-f/2:.975)*h;t.push(a.includes("x")?p:0,a.includes("y")?p:0,a.includes("z")?p:0,0,0,0);const D=e.set(d).toArray();n.push(...D,...D)}),!t.length)return null;const o=new _r().setPositions(t).setColors(n),s=new Dt({linewidth:r.lineWidth,vertexColors:!0,resolution:new Y(window.innerWidth,window.innerHeight)});return new mi(o,s).computeLineDistances()},gi=r=>{const{corners:e,edges:t}=r,n=[],i=oi(r),o=ai(r,i);n.push(...o),e.enabled&&n.push(...ci(r,i)),t.enabled&&n.push(...li(r,i,e.enabled?7:6));const s=di(o,r),a=vi(r);return[n,s,a]},ve=(r,e=!0)=>{const{material:t,userData:n}=r,{opacity:i,color:o,scale:s}=e?n.hover:n;r.scale.setScalar(s),t.opacity=i,t.map?si(t.map,e):t.color.set(o)},ue=new se,Yt=new kr,yi=new Y,ee=new _,Xt=new pe;class fo extends Ve{constructor(e,t,n={}){super(),S(this,"enabled",!0),S(this,"camera"),S(this,"renderer"),S(this,"options"),S(this,"target",new _),S(this,"animated",!0),S(this,"speed",1),S(this,"animating",!1),S(this,"_options"),S(this,"_intersections"),S(this,"_background",null),S(this,"_viewport",[0,0,0,0]),S(this,"_originalViewport",[0,0,0,0]),S(this,"_originalScissor",[0,0,0,0]),S(this,"_scene"),S(this,"_camera"),S(this,"_container"),S(this,"_domElement"),S(this,"_domRect"),S(this,"_dragging",!1),S(this,"_distance",0),S(this,"_clock",new Ir),S(this,"_targetQuaternion",new Ze),S(this,"_quaternionStart",new Ze),S(this,"_quaternionEnd",new Ze),S(this,"_pointerStart",new Y),S(this,"_focus",null),S(this,"_placement"),S(this,"_controls"),S(this,"_controlsListeners"),this.camera=e,this.renderer=t,this._scene=new Br().add(this),this.set(n)}get placement(){return this._placement}set placement(e){this._placement=xr(this._domElement,e),this.domUpdate()}set(e={}){this.dispose(),this.options=e,this._options=ii(e),this._camera=this._options.isSphere?new nr(-1.8,1.8,1.8,-1.8,5,10):new er(26,1,5,10),this._camera.position.set(0,0,7);const[t,n,i]=gi(this._options);n&&this.add(n),i&&this.add(i),this.add(...t),this._background=n,this._intersections=t;const{container:o,animated:s,speed:a}=this._options;return this.animated=s,this.speed=a,this._container=o?Xn(o):document.body,this._domElement=Yn(this._options),this._domElement.onpointerdown=c=>this._onPointerDown(c),this._domElement.onpointermove=c=>this._onPointerMove(c),this._domElement.onpointerleave=()=>this._onPointerLeave(),this._container.appendChild(this._domElement),this._controls&&this.attachControls(this._controls),this.update(),this._updateOrientation(!0),this}render(){this.animating&&this._animate();const{renderer:e,_viewport:t}=this,n=e.getScissorTest(),i=e.autoClear;return e.autoClear=!1,e.setViewport(...t),n&&e.setScissor(...t),e.clear(!1,!0,!1),e.render(this._scene,this._camera),e.setViewport(...this._originalViewport),n&&e.setScissor(...this._originalScissor),e.autoClear=i,this}domUpdate(){this._domRect=this._domElement.getBoundingClientRect();const e=this.renderer,t=this._domRect,n=e.domElement.getBoundingClientRect();return this._viewport.splice(0,4,t.left-n.left,e.domElement.clientHeight-(t.top-n.top+t.height),t.width,t.height),e.getViewport(Xt).toArray(this._originalViewport),e.getScissorTest()&&e.getScissor(Xt).toArray(this._originalScissor),this}cameraUpdate(){return this._updateOrientation(),this}update(e=!0){return e&&this._controls&&this._controls.update(),this.domUpdate().cameraUpdate()}attachControls(e){return this.detachControls(),this.target=e.target,this._controlsListeners={start:()=>e.enabled=!1,end:()=>e.enabled=!0,change:()=>this.update(!1)},this.addEventListener("start",this._controlsListeners.start),this.addEventListener("end",this._controlsListeners.end),e.addEventListener("change",this._controlsListeners.change),this._controls=e,this}detachControls(){if(!(!this._controlsListeners||!this._controls))return this.target=new _().copy(this._controls.target),this.removeEventListener("start",this._controlsListeners.start),this.removeEventListener("end",this._controlsListeners.end),this._controls.removeEventListener("change",this._controlsListeners.change),this._controlsListeners=void 0,this._controls=void 0,this}dispose(){var e;this.detachControls(),this.children.forEach(t=>{var n,i,o,s;this.remove(t);const a=t;(n=a.material)==null||n.dispose(),(o=(i=a.material)==null?void 0:i.map)==null||o.dispose(),(s=a.geometry)==null||s.dispose()}),(e=this._domElement)==null||e.remove()}_updateOrientation(e=!0){e&&(this.quaternion.copy(this.camera.quaternion).invert(),this.updateMatrixWorld()),Ut(this._options,this._intersections,this.camera)}_animate(){const{position:e,quaternion:t}=this.camera;if(e.set(0,0,1),!this.animated){e.applyQuaternion(this._quaternionEnd).multiplyScalar(this._distance).add(this.target),t.copy(this._targetQuaternion),this._updateOrientation(),this.animating=!1,this.dispatchEvent({type:"change"}),this.dispatchEvent({type:"end"});return}this._controls&&(this._controls.enabled=!1);const n=this._clock.getDelta()*ei*this.speed;this._quaternionStart.rotateTowards(this._quaternionEnd,n),e.applyQuaternion(this._quaternionStart).multiplyScalar(this._distance).add(this.target),t.rotateTowards(this._targetQuaternion,n),this._updateOrientation(),requestAnimationFrame(()=>this.dispatchEvent({type:"change"})),this._quaternionStart.angleTo(this._quaternionEnd)<Ye&&(this._controls&&(this._controls.enabled=!0),this.animating=!1,this.dispatchEvent({type:"end"}))}_setOrientation(e){const t=this.camera,n=this.target;ee.copy(e).multiplyScalar(this._distance),ue.setPosition(ee).lookAt(ee,this.position,this.up),this._targetQuaternion.setFromRotationMatrix(ue),ee.add(n),ue.lookAt(ee,n,this.up),this._quaternionEnd.setFromRotationMatrix(ue),ue.setPosition(t.position).lookAt(t.position,n,this.up),this._quaternionStart.setFromRotationMatrix(ue),this.animating=!0,this._clock.start(),this.dispatchEvent({type:"start"})}_onPointerDown(e){if(!this.enabled)return;const t=c=>{if(!this._dragging){if(Jn(c,this._pointerStart))return;this._dragging=!0}const u=yi.set(c.clientX,c.clientY).sub(this._pointerStart).multiplyScalar(1/this._domRect.width*Math.PI),l=this.coordinateConversion(ee.subVectors(this.camera.position,this.target)),f=Yt.setFromVector3(l);f.theta=s-u.x,f.phi=it(a-u.y,Ye,Math.PI-Ye),this.coordinateConversion(this.camera.position.setFromSpherical(f),!0).add(this.target),this.camera.lookAt(this.target),this.quaternion.copy(this.camera.quaternion).invert(),this._updateOrientation(!1),this.dispatchEvent({type:"change"})},n=()=>{if(document.removeEventListener("pointermove",t,!1),document.removeEventListener("pointerup",n,!1),!this._dragging)return this._handleClick(e);this._focus&&(ve(this._focus,!1),this._focus=null),this._dragging=!1,this.dispatchEvent({type:"end"})};if(this.animating)return;e.preventDefault(),this._pointerStart.set(e.clientX,e.clientY);const i=this.coordinateConversion(ee.subVectors(this.camera.position,this.target)),o=Yt.setFromVector3(i),s=o.theta,a=o.phi;this._distance=o.radius,document.addEventListener("pointermove",t,!1),document.addEventListener("pointerup",n,!1),this.dispatchEvent({type:"start"})}coordinateConversion(e,t=!1){const{x:n,y:i,z:o}=e,s=Ve.DEFAULT_UP;return s.x===1?t?e.set(i,o,n):e.set(o,n,i):s.z===1?t?e.set(o,n,i):e.set(i,o,n):e}_onPointerMove(e){!this.enabled||this._dragging||(this._background&&Ht(this._background,!0),this._handleHover(e))}_onPointerLeave(){!this.enabled||this._dragging||(this._background&&Ht(this._background,!1),this._focus&&ve(this._focus,!1),this._domElement.style.cursor="")}_handleClick(e){const t=jt(e,this._domRect,this._camera,this._intersections);this._focus&&(ve(this._focus,!1),this._focus=null),t&&(this._setOrientation(t.object.position),this.dispatchEvent({type:"change"}))}_handleHover(e){const t=jt(e,this._domRect,this._camera,this._intersections),n=t?.object||null;this._focus!==n&&(this._domElement.style.cursor=n?"pointer":"",this._focus&&ve(this._focus,!1),(this._focus=n)?ve(n,!0):Ut(this._options,this._intersections,this.camera))}}new se;new se;new re;const xi=V.shadowmap_pars_fragment;xi.includes("unpackRGBAToDepth");const ho=`
    #include <common>
    ${V.logdepthbuf_pars_vertex}
    ${V.fog_pars_vertex}

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

        ${V.logdepthbuf_vertex}
        ${V.fog_vertex}
    }
`;`${V.tonemapping_fragment}${V.colorspace_fragment}`;`${V.tonemapping_fragment}${V.colorspace_fragment}`;const bi=`

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
`,wi=`

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
`,Si=`
struct BVH {

	usampler2D index;
	sampler2D position;

	sampler2D bvhBounds;
	usampler2D bvhContents;

};
`,_i=Si,Di=`
	${bi}
	${wi}
`;`${_i}${Di}${V.tonemapping_fragment}${V.colorspace_fragment}`;new _e;typeof window<"u"&&document.createElement("div");new un;for(let r=0;r<256;r++)(r<16?"0":"")+r.toString(16);new nr(-1,1,1,-1,0,1);class Mi extends mt{constructor(){super(),this.setAttribute("position",new Ne([-1,3,0,-1,-1,0,3,-1,0],3)),this.setAttribute("uv",new Ne([0,2,0,0,2,0],2))}}new Mi;var Dr={exports:{}};Dr.exports=$e;Dr.exports.default=$e;function $e(r,e,t){t=t||2;var n=e&&e.length,i=n?e[0]*t:r.length,o=Mr(r,0,i,t,!0),s=[];if(!o||o.next===o.prev)return s;var a,c,u,l,f,d,h;if(n&&(o=Ai(r,e,o,t)),r.length>80*t){a=u=r[0],c=l=r[1];for(var p=t;p<i;p+=t)f=r[p],d=r[p+1],f<a&&(a=f),d<c&&(c=d),f>u&&(u=f),d>l&&(l=d);h=Math.max(u-a,l-c),h=h!==0?32767/h:0}return xe(o,s,t,a,c,h,0),s}function Mr(r,e,t,n,i){var o,s;if(i===ft(r,e,t,n)>0)for(o=e;o<t;o+=n)s=Qt(o,r[o],r[o+1],s);else for(o=t-n;o>=e;o-=n)s=Qt(o,r[o],r[o+1],s);return s&&qe(s,s.next)&&(we(s),s=s.next),s}function oe(r,e){if(!r)return r;e||(e=r);var t=r,n;do if(n=!1,!t.steiner&&(qe(t,t.next)||z(t.prev,t,t.next)===0)){if(we(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function xe(r,e,t,n,i,o,s){if(r){!s&&o&&ki(r,n,i,o);for(var a=r,c,u;r.prev!==r.next;){if(c=r.prev,u=r.next,o?Ei(r,n,i,o):Ci(r)){e.push(c.i/t|0),e.push(r.i/t|0),e.push(u.i/t|0),we(r),r=u.next,a=u.next;continue}if(r=u,r===a){s?s===1?(r=zi(oe(r),e,t),xe(r,e,t,n,i,o,2)):s===2&&Ti(r,e,t,n,i,o):xe(oe(r),e,t,n,i,o,1);break}}}}function Ci(r){var e=r.prev,t=r,n=r.next;if(z(e,t,n)>=0)return!1;for(var i=e.x,o=t.x,s=n.x,a=e.y,c=t.y,u=n.y,l=i<o?i<s?i:s:o<s?o:s,f=a<c?a<u?a:u:c<u?c:u,d=i>o?i>s?i:s:o>s?o:s,h=a>c?a>u?a:u:c>u?c:u,p=n.next;p!==e;){if(p.x>=l&&p.x<=d&&p.y>=f&&p.y<=h&&fe(i,a,o,c,s,u,p.x,p.y)&&z(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function Ei(r,e,t,n){var i=r.prev,o=r,s=r.next;if(z(i,o,s)>=0)return!1;for(var a=i.x,c=o.x,u=s.x,l=i.y,f=o.y,d=s.y,h=a<c?a<u?a:u:c<u?c:u,p=l<f?l<d?l:d:f<d?f:d,D=a>c?a>u?a:u:c>u?c:u,w=l>f?l>d?l:d:f>d?f:d,b=ut(h,p,e,t,n),x=ut(D,w,e,t,n),v=r.prevZ,g=r.nextZ;v&&v.z>=b&&g&&g.z<=x;){if(v.x>=h&&v.x<=D&&v.y>=p&&v.y<=w&&v!==i&&v!==s&&fe(a,l,c,f,u,d,v.x,v.y)&&z(v.prev,v,v.next)>=0||(v=v.prevZ,g.x>=h&&g.x<=D&&g.y>=p&&g.y<=w&&g!==i&&g!==s&&fe(a,l,c,f,u,d,g.x,g.y)&&z(g.prev,g,g.next)>=0))return!1;g=g.nextZ}for(;v&&v.z>=b;){if(v.x>=h&&v.x<=D&&v.y>=p&&v.y<=w&&v!==i&&v!==s&&fe(a,l,c,f,u,d,v.x,v.y)&&z(v.prev,v,v.next)>=0)return!1;v=v.prevZ}for(;g&&g.z<=x;){if(g.x>=h&&g.x<=D&&g.y>=p&&g.y<=w&&g!==i&&g!==s&&fe(a,l,c,f,u,d,g.x,g.y)&&z(g.prev,g,g.next)>=0)return!1;g=g.nextZ}return!0}function zi(r,e,t){var n=r;do{var i=n.prev,o=n.next.next;!qe(i,o)&&Cr(i,n,n.next,o)&&be(i,o)&&be(o,i)&&(e.push(i.i/t|0),e.push(n.i/t|0),e.push(o.i/t|0),we(n),we(n.next),n=r=o),n=n.next}while(n!==r);return oe(n)}function Ti(r,e,t,n,i,o){var s=r;do{for(var a=s.next.next;a!==s.prev;){if(s.i!==a.i&&Ni(s,a)){var c=Er(s,a);s=oe(s,s.next),c=oe(c,c.next),xe(s,e,t,n,i,o,0),xe(c,e,t,n,i,o,0);return}a=a.next}s=s.next}while(s!==r)}function Ai(r,e,t,n){var i=[],o,s,a,c,u;for(o=0,s=e.length;o<s;o++)a=e[o]*n,c=o<s-1?e[o+1]*n:r.length,u=Mr(r,a,c,n,!1),u===u.next&&(u.steiner=!0),i.push(Vi(u));for(i.sort(Oi),o=0;o<i.length;o++)t=Pi(i[o],t);return t}function Oi(r,e){return r.x-e.x}function Pi(r,e){var t=Ii(r,e);if(!t)return e;var n=Er(t,r);return oe(n,n.next),oe(t,t.next)}function Ii(r,e){var t=e,n=r.x,i=r.y,o=-1/0,s;do{if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){var a=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(a<=n&&a>o&&(o=a,s=t.x<t.next.x?t:t.next,a===n))return s}t=t.next}while(t!==e);if(!s)return null;var c=s,u=s.x,l=s.y,f=1/0,d;t=s;do n>=t.x&&t.x>=u&&n!==t.x&&fe(i<l?n:o,i,u,l,i<l?o:n,i,t.x,t.y)&&(d=Math.abs(i-t.y)/(n-t.x),be(t,r)&&(d<f||d===f&&(t.x>s.x||t.x===s.x&&Bi(s,t)))&&(s=t,f=d)),t=t.next;while(t!==c);return s}function Bi(r,e){return z(r.prev,r,e.prev)<0&&z(e.next,r,r.next)<0}function ki(r,e,t,n){var i=r;do i.z===0&&(i.z=ut(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,Ri(i)}function Ri(r){var e,t,n,i,o,s,a,c,u=1;do{for(t=r,r=null,o=null,s=0;t;){for(s++,n=t,a=0,e=0;e<u&&(a++,n=n.nextZ,!!n);e++);for(c=u;a>0||c>0&&n;)a!==0&&(c===0||!n||t.z<=n.z)?(i=t,t=t.nextZ,a--):(i=n,n=n.nextZ,c--),o?o.nextZ=i:r=i,i.prevZ=o,o=i;t=n}o.nextZ=null,u*=2}while(s>1);return r}function ut(r,e,t,n,i){return r=(r-t)*i|0,e=(e-n)*i|0,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,r|e<<1}function Vi(r){var e=r,t=r;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==r);return t}function fe(r,e,t,n,i,o,s,a){return(i-s)*(e-a)>=(r-s)*(o-a)&&(r-s)*(n-a)>=(t-s)*(e-a)&&(t-s)*(o-a)>=(i-s)*(n-a)}function Ni(r,e){return r.next.i!==e.i&&r.prev.i!==e.i&&!Ui(r,e)&&(be(r,e)&&be(e,r)&&Li(r,e)&&(z(r.prev,r,e.prev)||z(r,e.prev,e))||qe(r,e)&&z(r.prev,r,r.next)>0&&z(e.prev,e,e.next)>0)}function z(r,e,t){return(e.y-r.y)*(t.x-e.x)-(e.x-r.x)*(t.y-e.y)}function qe(r,e){return r.x===e.x&&r.y===e.y}function Cr(r,e,t,n){var i=Oe(z(r,e,t)),o=Oe(z(r,e,n)),s=Oe(z(t,n,r)),a=Oe(z(t,n,e));return!!(i!==o&&s!==a||i===0&&Ae(r,t,e)||o===0&&Ae(r,n,e)||s===0&&Ae(t,r,n)||a===0&&Ae(t,e,n))}function Ae(r,e,t){return e.x<=Math.max(r.x,t.x)&&e.x>=Math.min(r.x,t.x)&&e.y<=Math.max(r.y,t.y)&&e.y>=Math.min(r.y,t.y)}function Oe(r){return r>0?1:r<0?-1:0}function Ui(r,e){var t=r;do{if(t.i!==r.i&&t.next.i!==r.i&&t.i!==e.i&&t.next.i!==e.i&&Cr(t,t.next,r,e))return!0;t=t.next}while(t!==r);return!1}function be(r,e){return z(r.prev,r,r.next)<0?z(r,e,r.next)>=0&&z(r,r.prev,e)>=0:z(r,e,r.prev)<0||z(r,r.next,e)<0}function Li(r,e){var t=r,n=!1,i=(r.x+e.x)/2,o=(r.y+e.y)/2;do t.y>o!=t.next.y>o&&t.next.y!==t.y&&i<(t.next.x-t.x)*(o-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==r);return n}function Er(r,e){var t=new dt(r.i,r.x,r.y),n=new dt(e.i,e.x,e.y),i=r.next,o=e.prev;return r.next=e,e.prev=r,t.next=i,i.prev=t,n.next=t,t.prev=n,o.next=n,n.prev=o,n}function Qt(r,e,t,n){var i=new dt(r,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function we(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function dt(r,e,t){this.i=r,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=0,this.prevZ=null,this.nextZ=null,this.steiner=!1}$e.deviation=function(r,e,t,n){var i=e&&e.length,o=i?e[0]*t:r.length,s=Math.abs(ft(r,0,o,t));if(i)for(var a=0,c=e.length;a<c;a++){var u=e[a]*t,l=a<c-1?e[a+1]*t:r.length;s-=Math.abs(ft(r,u,l,t))}var f=0;for(a=0;a<n.length;a+=3){var d=n[a]*t,h=n[a+1]*t,p=n[a+2]*t;f+=Math.abs((r[d]-r[p])*(r[h+1]-r[d+1])-(r[d]-r[h])*(r[p+1]-r[d+1]))}return s===0&&f===0?0:Math.abs((f-s)/s)};function ft(r,e,t,n){for(var i=0,o=e,s=t-n;o<t;o+=n)i+=(r[s]-r[o])*(r[o+1]+r[s+1]),s=o;return i}$e.flatten=function(r){for(var e=r[0][0].length,t={vertices:[],holes:[],dimensions:e},n=0,i=0;i<r.length;i++){for(var o=0;o<r[i].length;o++)for(var s=0;s<e;s++)t.vertices.push(r[i][o][s]);i>0&&(n+=r[i-1].length,t.holes.push(n))}return t};new Y;new Y;var Jt;(r=>{function e(i){let o=i.slice();return o.sort(r.POINT_COMPARATOR),r.makeHullPresorted(o)}r.makeHull=e;function t(i){if(i.length<=1)return i.slice();let o=[];for(let a=0;a<i.length;a++){const c=i[a];for(;o.length>=2;){const u=o[o.length-1],l=o[o.length-2];if((u.x-l.x)*(c.y-l.y)>=(u.y-l.y)*(c.x-l.x))o.pop();else break}o.push(c)}o.pop();let s=[];for(let a=i.length-1;a>=0;a--){const c=i[a];for(;s.length>=2;){const u=s[s.length-1],l=s[s.length-2];if((u.x-l.x)*(c.y-l.y)>=(u.y-l.y)*(c.x-l.x))s.pop();else break}s.push(c)}return s.pop(),o.length==1&&s.length==1&&o[0].x==s[0].x&&o[0].y==s[0].y?o:o.concat(s)}r.makeHullPresorted=t;function n(i,o){return i.x<o.x?-1:i.x>o.x?1:i.y<o.y?-1:i.y>o.y?1:0}r.POINT_COMPARATOR=n})(Jt||(Jt={}));new De;new _;new se;new tr;new je;new _e;new _;new _;export{io as A,co as B,Ji as C,ho as D,ur as E,eo as F,hr as G,un as S,Qi as T,fo as X,Fe as a,He as b,ce as c,fr as d,wn as e,dr as f,vt as g,Ki as h,Zi as i,Yi as j,yn as k,gn as l,qi as m,Xi as n,k as o,An as p,to as q,tt as r,an as s,ro as t,mn as u,no as v,oo as w,so as x,I as y,ao as z};
