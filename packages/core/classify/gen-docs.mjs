import { readFileSync, writeFileSync } from 'node:fs'
const A = JSON.parse(readFileSync('packages/core/classify/wcag-predicates.classified.json','utf8'))
const V = JSON.parse(readFileSync('packages/core/classify/wcag-verification.classified.json','utf8'))
const { predicates, criteria } = A
const scs = JSON.parse(readFileSync('packages/core/classify/wcag-scs.source.json','utf8'))
const scById = new Map(scs.map(s=>[s.id,s]))
const cell = s => String(s==null?'':s).replace(/\s+/g,' ').replace(/\|/g,'\\|').trim()
const L=[]; const p=(...x)=>L.push(...x)
const OPS=new Set(['AND','OR','NOT','(',')','true'])
const predsOf=e=>[...new Set(e.replace(/\(/g,' ( ').replace(/\)/g,' ) ').split(/\s+/).filter(Boolean).filter(t=>!OPS.has(t)))]
const ymax=v=>Math.ceil(Math.max(...v)/10)*10
const classDist=arr=>arr.reduce((m,x)=>(m[x.class]=(m[x.class]||0)+1,m),{})
const decDist=arr=>arr.reduce((m,x)=>(m[x.decidability]=(m[x.decidability]||0)+1,m),{})
const singlePct=arr=>Math.round(100*arr.filter(x=>x.sc_count===1).length/arr.length)
const maxReuse=arr=>Math.max(...arr.map(x=>x.sc_count))

const cc=classDist(predicates), dd=decDist(criteria)
const vcc=classDist(V.predicates), vdd=decDist(V.criteria)
const floor = criteria.filter(c=>c.decidability==='auto'||c.decidability==='unconditional').map(c=>c.sc_id)

p('---','title: Classifier (WIP)','nav_order: 5','permalink: /classifier/','---','')
p('# Classifier (WIP)','')
p('> **Work in progress.** This page documents an exploratory line of work and the intermediate data it has produced, for review. None of it is wired into the published packages yet. The artifacts live in [`packages/core/classify/`](https://github.com/UN-ICC/a11y-assist/tree/main/packages/core/classify).','')

p('## Motivation','')
p('a11y-assist reaches WCAG and ACT from a component by *search* (`search_act` / `search_wcag`). Search is a heuristic over prose, and it dead-ends: some components (e.g. `alert`, `breadcrumb`) return no link at all, because W3C never published a clean component-to-criterion crosswalk — the bridge lives only in prose.','')
p('The classifier explores a deterministic alternative. Instead of asking "what text matches this component?", it asks **"under what conditions does each WCAG criterion apply, and what must then be true to conform?"** — and encodes both as data we can evaluate. Given the conditions that hold for a component we compute, mechanically, which criteria apply and which checks they impose — with no search and no dead-ends.','')

p('## The model','')
p('Two parallel predicate layers, same shape:','')
p('- **Applicability** — each SC gets an expression over atomic *trigger* predicates (`non-text-content-present`): *when* does the criterion apply.')
p('- **Verification** — each SC gets an expression over atomic *postcondition* predicates (`text-alternative-serves-equivalent-purpose`): *what must hold* to conform.')
p('Each predicate is tagged with a **class** — for applicability, whether a11y-assist can decide the trigger; for verification, how the postcondition is checked:')
p('  - `auto` — decided/verified from structure or by axe-core (the **guaranteed** part).')
p('  - `instance` — needs the authored markup; the agent inspects the code.')
p('  - `human` — needs judgment; the **ask-the-user checklist**.')
p('Evaluation (planned) is **three-valued** (true / false / *unknown*): an unresolved predicate yields a `depends` result rather than a silent false — and that `depends` set *is* the checklist. The evaluator is the next step and is not yet built; this page exists to review the data it will run on.','')

p('## Pipeline','')
p('| Step | What | Output |')
p('|---|---|---|')
p('| 1. Extract | Blind, per-SC: each SC\'s normative text → an applicability expression *and* a verification (obligation) expression, both over granular predicates with evidence quotes. | `*.raw.json` |')
p('| 2. Canonicalize | Merge true synonyms into a controlled vocabulary; rewrite expressions against it. | `*.canon.json` |')
p('| 3. Classify | Tag each predicate with `class` / `scope` / `definition`. | `*.classified.json` |')
p('| 4. Evaluate | *(planned)* Three-valued engine: `evaluate(known) → { applies, notApplicable, depends }`, then obligations of the applicable SCs → the verification checklist. | — |')
p('')
p('Headline numbers:','')
p(`- **86** Success Criteria, all expressed on both layers.`)
p(`- **Applicability:** 162 → ${predicates.length} canonical predicates; class **${cc.auto} auto / ${cc.instance} instance / ${cc.human} human**; **${(dd.auto||0)+(dd.unconditional||0)}** SCs decided from structure alone (the floor).`)
p(`- **Verification:** 159 → ${V.predicates.length} canonical predicates; class **${vcc.auto} auto / ${vcc.instance} instance / ${vcc.human} human**; **${vdd.auto||0}** SCs fully machine-verifiable, **${vdd['needs-instance']||0}** agent-checkable, **${vdd['needs-human']||0}** need human judgment.`)
p(`- The applicability structural floor: **${floor.join(', ')}**.`,'')

// ---------- Reducibility ----------
const deg={}; predicates.forEach(x=>deg[x.sc_count]=(deg[x.sc_count]||0)+1)
const degK=Object.keys(deg).map(Number).sort((a,b)=>a-b)
const comp={}; criteria.forEach(c=>{const n=c.expression==='true'?0:predsOf(c.expression).length; comp[n]=(comp[n]||0)+1})
const compK=Object.keys(comp).map(Number).sort((a,b)=>a-b)
const ranked=[...predicates].sort((a,b)=>b.sc_count-a.sc_count)
const Ks=[5,10,20,28,40,60,predicates.length]
const cov=Ks.map(K=>{const s=new Set();ranked.slice(0,K).forEach(pp=>pp.scs.forEach(x=>s.add(x)));return s.size})
const parent={}; criteria.forEach(c=>parent[c.sc_id]=c.sc_id)
const find=x=>parent[x]===x?x:(parent[x]=find(parent[x])); const uni=(a,b)=>{parent[find(a)]=find(b)}
predicates.filter(x=>x.sc_count>1).forEach(x=>{for(let i=1;i<x.scs.length;i++)uni(x.scs[0],x.scs[i])})
const comps={}; criteria.forEach(c=>{const r=find(c.sc_id);(comps[r]=comps[r]||[]).push(c.sc_id)})
const groups=Object.values(comps).sort((a,b)=>b.length-a.length)
const multi=groups.filter(g=>g.length>1), isolated=groups.filter(g=>g.length===1).length
const sizeDist={}; groups.forEach(g=>sizeDist[g.length]=(sizeDist[g.length]||0)+1)
const sizeK=Object.keys(sizeDist).map(Number).sort((a,b)=>a-b)

p('## Reducibility','')
p('How much structure do the predicates impose on the 86 criteria? For **applicability**, two opposite readings hold: reducible at the criterion level (most SCs hinge on one condition) but not at the vocabulary level (the predicate set barely compresses). The charts below are the applicability layer.','')

p('### Predicate reuse (applicability)','')
p('```mermaid')
p('xychart-beta')
p('    title "Applicability predicates by number of SCs governed"')
p(`    x-axis [${degK.map(k=>`"${k} SC${k>1?'s':''}"`).join(', ')}]`)
p(`    y-axis "predicates" 0 --> ${ymax(degK.map(k=>deg[k]))}`)
p(`    bar [${degK.map(k=>deg[k]).join(', ')}]`)
p('```')
p(`${predicates.length-deg[1]} predicates recur across more than one SC; **${deg[1]}** are one-offs.`,'')

p('### Criterion complexity (applicability)','')
p('```mermaid')
p('xychart-beta')
p('    title "SCs by number of applicability predicates"')
p(`    x-axis [${compK.map(k=>`"${k}"`).join(', ')}]`)
p(`    y-axis "Success Criteria" 0 --> ${ymax(compK.map(k=>comp[k]))}`)
p(`    bar [${compK.map(k=>comp[k]).join(', ')}]`)
p('```')
p(`**${(comp[0]||0)+(comp[1]||0)}** of 86 criteria are decided by zero or one applicability predicate.`,'')

p('### Coverage (applicability)','')
p('Top-K predicates by reuse vs distinct criteria touched — near-linear, so there is no small "core set."','')
p('```mermaid')
p('xychart-beta')
p('    title "Distinct SCs touched by the top-K applicability predicates"')
p(`    x-axis [${Ks.map(k=>`"${k}"`).join(', ')}]`)
p('    y-axis "SCs touched (of 86)" 0 --> 86')
p(`    line [${cov.join(', ')}]`)
p('```','')

p('### Criterion clusters (applicability)','')
p(`Linking criteria that share a predicate decomposes the corpus into **${groups.length}** near-independent units: **${isolated}** isolated criteria and **${multi.length}** small families.`,'')
p('| Size | Criteria in the family |','|---|---|')
for (const g of multi) p(`| ${g.length} | ${g.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(', ')} |`)
p('')

p('### Applicability vs verification','')
p('Does the verification layer compress more than applicability? We extracted obligations the same way and compared. It does **not** — verification is, if anything, the *most* bespoke layer. WCAG obligations are individuated by criterion almost by definition, so reading them directly yields maximum uniqueness. (The only place real reuse appears is when ACT *operationalizes* several criteria with one shared mechanical check — e.g. "accessible name" — and even that is small and confined to the structural/interactive cluster.)','')
p('| layer | distinct predicates | singletons | max reuse | class (auto / instance / human) |')
p('|---|---|---|---|---|')
p(`| Applicability | ${predicates.length} | ${singlePct(predicates)}% | ${maxReuse(predicates)} | ${cc.auto} / ${cc.instance} / ${cc.human} |`)
p(`| Verification (SC obligations) | ${V.predicates.length} | ${singlePct(V.predicates)}% | ${maxReuse(V.predicates)} | ${vcc.auto} / ${vcc.instance} / ${vcc.human} |`)
p('')
p('The takeaway reframes the whole effort: the payoff is **not compression but routing**. Reducibility is *per-component* (a button triggers a handful of predicates, not 157), not global. Verification is comparatively more *checkable* than applicability (more `instance`/`auto`, less `human`), which is good news for the checklist.','')

// ---------- registries ----------
function registry(title, intro, preds) {
  p(`## ${title}`,'')
  p(intro,'')
  for (const klass of ['auto','instance','human']) {
    const rows = preds.filter(x=>x.class===klass).sort((a,b)=>b.sc_count-a.sc_count||a.id.localeCompare(b.id))
    p(`### ${klass} (${rows.length})`,'')
    p('| Predicate | Scope | SCs | Definition |','|---|---|---|---|')
    for (const r of rows) p(`| \`${r.id}\` | ${r.scope} | ${r.scs.join(', ')} | ${cell(r.definition)} |`)
    p('')
  }
}
registry('Applicability — predicate registry',
  `The ${predicates.length} canonical applicability conditions, grouped by detectability class. "SCs" lists the criteria whose applicability references the predicate.`, predicates)
registry('Verification — predicate registry',
  `The ${V.predicates.length} canonical postconditions, grouped by verification tier. "SCs" lists the criteria whose obligation references the predicate.`, V.predicates)

// ---------- per-SC tables ----------
p('## Applicability — prose vs expression','')
p('Each criterion\'s verbatim normative text beside the extracted applicability expression. `decidability` reflects the classes of the predicates the expression uses.','')
p('| SC | Lvl | Decidability | Applicability (verbatim normative text) | Predicate expression |','|---|---|---|---|---|')
for (const c of [...criteria].sort((a,b)=>a.sc_id.localeCompare(b.sc_id,undefined,{numeric:true}))) {
  const sc = scById.get(c.sc_id)
  p(`| **${c.sc_id}** ${cell(sc?.title)} | ${sc?.level||''} | ${c.decidability} | ${cell(sc?.short_text)} | \`${cell(c.expression)}\` |`)
}
p('')

p('## Verification — obligation prose vs expression','')
p('Each criterion\'s verbatim normative text beside the extracted obligation expression — what must hold to conform. `decidability` reflects the verification tiers of the predicates the expression uses (`auto` = machine-verifiable, `needs-instance` = agent-checkable, `needs-human` = judgment).','')
p('| SC | Lvl | Decidability | Obligation (verbatim normative text) | Verification expression |','|---|---|---|---|---|')
for (const c of [...V.criteria].sort((a,b)=>a.sc_id.localeCompare(b.sc_id,undefined,{numeric:true}))) {
  const sc = scById.get(c.sc_id)
  p(`| **${c.sc_id}** ${cell(sc?.title)} | ${sc?.level||''} | ${c.decidability} | ${cell(sc?.short_text)} | \`${cell(c.verification_expression)}\` |`)
}
p('')

writeFileSync('docs/classifier.md', L.join('\n'))
console.log('wrote docs/classifier.md —', L.length, 'lines')
