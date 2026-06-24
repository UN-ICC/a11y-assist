// Prototype vertical slice: component -> auto predicate values -> three-valued
// applicability evaluation -> {applies, notApplicable, depends} + agent/user queues.
// WIP, not wired into the build. Run from repo root:  node packages/core/classify/eval-slice.mjs [apgName]
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const aria = require('aria-query')
const { composeApgPattern } = await import('../dist/index.js')
const A = JSON.parse(readFileSync('packages/core/classify/wcag-predicates.classified.json','utf8'))

const NAME = process.argv[2] || 'dialog'
const c = composeApgPattern(NAME, 'AA')
if (!c) { console.error('no pattern', NAME); process.exit(1) }

// ---- component facts ----
const roles = Object.keys(c.aria_contract)
const catsOf = r => { const d = aria.roles.get(r); return new Set((d?.superClass||[]).flat()) }
const allCats = new Set(roles.flatMap(r => [...catsOf(r)]))
const LIVE = new Set(['alert','status','log','marquee','timer','alertdialog'])
const LANDMARK = new Set(['banner','complementary','contentinfo','form','main','navigation','region','search'])
const f = {
  roles: new Set(roles),
  hasRole: roles.length > 0,
  isWidget: roles.some(r => ['widget','window','composite','input'].some(x => catsOf(r).has(x))),
  isInput: roles.some(r => catsOf(r).has('input')),
  isLandmark: roles.some(r => LANDMARK.has(r) || catsOf(r).has('landmark')),
  isLive: roles.some(r => LIVE.has(r)),
  nameReq: Object.values(c.aria_contract).some(k => k.accessible_name_required),
  hasKeyboard: (c.apg?.keyboard_interactions||[]).length > 0,
  nativeTags: new Set(c.native_elements.map(e => e.canonical_id)),
}

// ---- deriveAuto: one rule per auto applicability predicate ----
const T = true, F = false
const ENV = T // web environment constants (always true in scope)
const RULES = {
  'ui-component-present':                 () => f.hasRole,
  'functionality-present':               () => f.isWidget || f.hasKeyboard,
  'link-present':                        () => f.roles.has('link') || f.nativeTags.has('a'),
  'heading-present':                     () => f.roles.has('heading'),
  'region-present':                      () => f.isLandmark,
  'status-message-present':              () => f.isLive,
  'target-for-pointer-input-present':    () => f.isWidget,
  'ui-component-receives-keyboard-focus':() => f.isWidget,
  'ui-component-receives-focus':         () => f.isWidget,
  'keyboard-focus-can-be-moved-to-component': () => f.isWidget || f.hasKeyboard,
  'keyboard-operable-user-interface-present': () => f.isWidget || f.hasKeyboard,
  'ui-component-setting-can-be-changed': () => f.isInput,
  'label-present':                       () => f.nameReq,
  'content-with-view-and-operation-present': () => f.hasRole && (f.isWidget || f.hasKeyboard),
  'ui-component-visual-information-present':  () => f.hasRole,
  'web-page-navigable-sequentially':     () => f.isWidget || f.hasKeyboard,
  // environment / platform constants (true for any web component)
  'content-present':                                 () => ENV,
  'content-implemented-using-markup-languages':      () => ENV,
  'content-using-markup-supporting-text-style-properties': () => ENV,
  'implemented-with-technology-supporting-input-purpose-identification': () => ENV,
  'input-modality-available-on-platform':            () => ENV,
  'web-page-present':                                 () => ENV,
}

// build assignment: auto -> T/F, instance/human -> 'U'
const classOf = new Map(A.predicates.map(p => [p.id, p.class]))
const assign = {}
const missingAuto = []
for (const p of A.predicates) {
  if (p.class === 'auto') {
    if (RULES[p.id]) assign[p.id] = RULES[p.id]() ? 'T' : 'F'
    else { assign[p.id] = 'U'; missingAuto.push(p.id) }
  } else assign[p.id] = (p.class === 'instance' && process.env.PRESUME ? 'F' : 'U')
}

// ---- three-valued (Kleene) evaluator ----
function evaluate(expr) {
  const toks = expr.replace(/\(/g,' ( ').replace(/\)/g,' ) ').split(/\s+/).filter(Boolean)
  let i = 0
  const peek = () => toks[i], next = () => toks[i++]
  const NOT = v => v==='T'?'F':v==='F'?'T':'U'
  const AND = (a,b) => (a==='F'||b==='F')?'F':(a==='U'||b==='U')?'U':'T'
  const OR  = (a,b) => (a==='T'||b==='T')?'T':(a==='U'||b==='U')?'U':'F'
  function factor() {
    if (peek()==='NOT') { next(); return NOT(factor()) }
    if (peek()==='(') { next(); const v=expr2(); next(); return v }
    const t = next(); return t==='true' ? 'T' : (assign[t] ?? 'U')
  }
  function term() { let v=factor(); while(peek()==='AND'){ next(); v=AND(v,factor()) } return v }
  function expr2() { let v=term(); while(peek()==='OR'){ next(); v=OR(v,term()) } return v }
  return expr2()
}
const predsIn = e => [...new Set(e.replace(/\(/g,' ( ').replace(/\)/g,' ) ').split(/\s+/).filter(Boolean).filter(t=>!['AND','OR','NOT','(',')','true'].includes(t)))]

// ---- run over all 86 applicability expressions ----
const applies=[], notApplicable=[], depends=[]
for (const cr of A.criteria) {
  const v = evaluate(cr.expression)
  if (v==='T') applies.push(cr.sc_id)
  else if (v==='F') notApplicable.push(cr.sc_id)
  else {
    const unknown = predsIn(cr.expression).filter(p => assign[p]==='U')
    depends.push({ sc: cr.sc_id, unknown })
  }
}
const sortSc=a=>a.sort((x,y)=>x.localeCompare(y,undefined,{numeric:true}))
const queue = cls => [...new Set(depends.flatMap(d=>d.unknown).filter(p=>classOf.get(p)===cls))].sort()

console.log(`\n# Component: ${NAME}  (roles: ${[...f.roles]}, widget:${f.isWidget}, live:${f.isLive}, nameReq:${f.nameReq}, keyboard:${f.hasKeyboard})`)
console.log(`\nDerived auto predicates that are TRUE for ${NAME}:`)
console.log('  ' + Object.entries(assign).filter(([k,v])=>v==='T'&&classOf.get(k)==='auto').map(([k])=>k).join(', '))
if (missingAuto.length) console.log(`\n⚠ auto predicates with NO derivation rule (treated unknown): ${missingAuto.join(', ')}`)

console.log(`\n## RESOLVED FROM SELECTION ALONE`)
console.log(`applies (${applies.length}): ${sortSc(applies).join(', ')}`)
console.log(`not applicable (${notApplicable.length}): ${sortSc(notApplicable).join(', ')}`)

console.log(`\n## DEPENDS — needs further input (${depends.length} SCs)`)
const agentQ = queue('instance'), userQ = queue('human')
console.log(`\nAGENT evaluates (instance predicates, ${agentQ.length}):`)
agentQ.forEach(p=>console.log(`  - ${p}`))
console.log(`\nUSER questionnaire (human predicates, ${userQ.length}):`)
userQ.forEach(p=>console.log(`  - ${p}`))
console.log(`\nSummary: ${applies.length} apply + ${notApplicable.length} excluded resolved with 0 questions; ${depends.length} depend on ${agentQ.length} agent + ${userQ.length} user predicates.`)
