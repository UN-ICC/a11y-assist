// Shared applicability-rounds engine + demo answer sets, used by eval-rounds.mjs
// (CLI) and gen-docs.mjs (docs). WIP prototype — not wired into the build.
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const aria = require('aria-query')
const { composeApgPattern } = await import('../dist/index.js')
export const A = JSON.parse(readFileSync('packages/core/classify/wcag-predicates.classified.json','utf8'))
export const FAC = JSON.parse(readFileSync('packages/core/classify/applicability-facets.json','utf8'))
const T=true, F=false

const base = {media:F,images:F,'color-contrast':F,'text-language':F,'timing-motion':F,'pointer-gesture':F,'forms-input':F,'navigation-context':F,'structure-focus':F}
export const ANS = {
  alert:      { facet:{...base,'color-contrast':T,'text-language':T}, sub:{'color-contrast':[F,T,F],'text-language':[T,F,F,F]} },
  disclosure: { facet:{...base,'color-contrast':T,'text-language':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'structure-focus':[F,T,F]} },
  table:      { facet:{...base,'color-contrast':T,'text-language':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'structure-focus':[T,F,F]} },
  tabs:       { facet:{...base,'color-contrast':T,'text-language':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'structure-focus':[T,T,F]} },
  checkbox:   { facet:{...base,'color-contrast':T,'text-language':T,'forms-input':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'forms-input':[F,F,F,T],'structure-focus':[F,T,F]} },
  dialog:     { facet:{...base,'color-contrast':T,'text-language':T,'forms-input':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'forms-input':[F,T,F,T],'structure-focus':[T,T,F]} },
  combobox:   { facet:{...base,'color-contrast':T,'text-language':T,'forms-input':T,'structure-focus':T}, sub:{'color-contrast':[F,T,T],'text-language':[T,F,F,F],'forms-input':[F,T,F,T],'structure-focus':[T,T,F]} },
  breadcrumb: { facet:{...base,'color-contrast':T,'text-language':T,'navigation-context':T,'structure-focus':T}, sub:{'color-contrast':[F,T,F],'text-language':[T,F,F,F],'navigation-context':[F,F,F,T],'structure-focus':[T,F,F]} },
}

const pmap={}
for(const [fac,v] of Object.entries(FAC.facets)) v.subgates.forEach((s,i)=>s.predicates.forEach(p=>pmap[p]={facet:fac,sub:i}))
const OPS=new Set(['AND','OR','NOT','(',')','true'])

export function run(NAME){
  const c=composeApgPattern(NAME,'AA'); if(!c) return null
  const ans=ANS[NAME]; if(!ans) return null
  const roles=Object.keys(c.aria_contract), catsOf=r=>new Set((aria.roles.get(r)?.superClass||[]).flat())
  const LIVE=new Set(['alert','status','log','marquee','timer','alertdialog']), LAND=new Set(['banner','complementary','contentinfo','form','main','navigation','region','search'])
  const f={hasRole:roles.length>0,isWidget:roles.some(r=>['widget','window','composite','input'].some(x=>catsOf(r).has(x))),isInput:roles.some(r=>catsOf(r).has('input')),isLandmark:roles.some(r=>LAND.has(r)||catsOf(r).has('landmark')),isLive:roles.some(r=>LIVE.has(r)),nameReq:Object.values(c.aria_contract).some(k=>k.accessible_name_required),hasKeyboard:(c.apg?.keyboard_interactions||[]).length>0,nativeTags:new Set(c.native_elements.map(e=>e.canonical_id)),roles:new Set(roles)}
  const R={'ui-component-present':()=>f.hasRole,'functionality-present':()=>f.isWidget||f.hasKeyboard,'link-present':()=>f.roles.has('link')||f.nativeTags.has('a'),'heading-present':()=>f.roles.has('heading'),'region-present':()=>f.isLandmark,'status-message-present':()=>f.isLive,'target-for-pointer-input-present':()=>f.isWidget,'ui-component-receives-keyboard-focus':()=>f.isWidget,'ui-component-receives-focus':()=>f.isWidget,'keyboard-focus-can-be-moved-to-component':()=>f.isWidget||f.hasKeyboard,'keyboard-operable-user-interface-present':()=>f.isWidget||f.hasKeyboard,'ui-component-setting-can-be-changed':()=>f.isInput,'label-present':()=>f.nameReq,'content-with-view-and-operation-present':()=>f.hasRole&&(f.isWidget||f.hasKeyboard),'ui-component-visual-information-present':()=>f.hasRole,'web-page-navigable-sequentially':()=>f.isWidget||f.hasKeyboard,'content-present':()=>true,'content-implemented-using-markup-languages':()=>true,'content-using-markup-supporting-text-style-properties':()=>true,'implemented-with-technology-supporting-input-purpose-identification':()=>true,'input-modality-available-on-platform':()=>true,'web-page-present':()=>true}
  const assign={}
  for(const p of A.predicates){
    if(p.class==='auto'){assign[p.id]=R[p.id]?(R[p.id]()?'T':'F'):'U';continue}
    const m=pmap[p.id], fg=ans.facet[m.facet]
    if(fg===false){assign[p.id]='F';continue}
    const sv=(ans.sub[m.facet]||[])[m.sub]
    assign[p.id]= sv===false?'F':sv===true?'T':'U'
  }
  function ev(expr){const tk=expr.replace(/\(/g,' ( ').replace(/\)/g,' ) ').split(/\s+/).filter(Boolean);let i=0;const pk=()=>tk[i],nx=()=>tk[i++];const N=v=>v==='T'?'F':v==='F'?'T':'U',AND=(a,b)=>a==='F'||b==='F'?'F':a==='U'||b==='U'?'U':'T',OR=(a,b)=>a==='T'||b==='T'?'T':a==='U'||b==='U'?'U':'F';function fa(){if(pk()==='NOT'){nx();return N(fa())}if(pk()==='('){nx();const v=ex();nx();return v}const t=nx();return t==='true'?'T':(assign[t]??'U')}function te(){let v=fa();while(pk()==='AND'){nx();v=AND(v,fa())}return v}function ex(){let v=te();while(pk()==='OR'){nx();v=OR(v,te())}return v}return ex()}
  let applies=0,na=0,dep=0
  for(const cr of A.criteria){const v=ev(cr.expression);if(v==='T')applies++;else if(v==='F')na++;else dep++}
  const yes=Object.entries(ans.facet).filter(([,v])=>v).map(([k])=>k)
  const qSub=yes.reduce((a,k)=>a+FAC.facets[k].subgates.length,0)
  return {NAME, widget:f.isWidget, live:f.isLive, kbd:f.hasKeyboard, yesFacets:yes, qFacet:9, qSub, q:9+qSub, applies, na, dep}
}
