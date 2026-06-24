import { readFileSync, writeFileSync } from 'node:fs'
const { predicates, criteria } = JSON.parse(readFileSync('packages/core/classify/wcag-predicates.classified.json','utf8'))
const scs = JSON.parse(readFileSync('packages/core/classify/wcag-scs.source.json','utf8'))
const scById = new Map(scs.map(s=>[s.id,s]))
const cell = s => String(s==null?'':s).replace(/\s+/g,' ').replace(/\|/g,'\\|').trim()
const L=[]; const p=(...x)=>L.push(...x)
const OPS=new Set(['AND','OR','NOT','(',')','true'])
const predsOf=e=>[...new Set(e.replace(/\(/g,' ( ').replace(/\)/g,' ) ').split(/\s+/).filter(Boolean).filter(t=>!OPS.has(t)))]
const ymax=v=>Math.ceil(Math.max(...v)/10)*10

// counts
const cc = predicates.reduce((m,x)=>(m[x.class]=(m[x.class]||0)+1,m),{})
const dd = criteria.reduce((m,x)=>(m[x.decidability]=(m[x.decidability]||0)+1,m),{})
const floor = criteria.filter(c=>c.decidability==='auto'||c.decidability==='unconditional').map(c=>c.sc_id)

p('---','title: Classifier (WIP)','nav_order: 5','permalink: /classifier/','---','')
p('# Classifier (WIP)','')
p('> **Work in progress.** This page documents an exploratory line of work and the intermediate data it has produced, for review. None of it is wired into the published packages yet. The artifacts live in [`packages/core/classify/`](https://github.com/UN-ICC/a11y-assist/tree/main/packages/core/classify).','')

p('## Motivation','')
p('a11y-assist reaches WCAG and ACT from a component by *search* (`search_act` / `search_wcag`). Search is a heuristic over prose, and it dead-ends: some components (e.g. `alert`, `breadcrumb`) return no link at all, because W3C never published a clean component-to-criterion crosswalk — the bridge lives only in prose.','')
p('The classifier explores a deterministic alternative. Instead of asking "what text matches this component?", it asks **"under what conditions does each WCAG criterion apply?"** — and encodes that as data we can evaluate. If each criterion carries a boolean expression of named *applicability conditions* (predicates), then given the conditions that hold for a component we can compute, mechanically, which criteria apply — with no search and no dead-ends.','')

p('## The model','')
p('- Each WCAG Success Criterion gets an **applicability expression**: a boolean expression (`AND` / `OR` / `NOT` / parentheses) over atomic **predicate** strings. A predicate is a *trigger* ("non-text content is present"), never an obligation ("provide a text alternative").')
p('- Each predicate is tagged with a **class** — can a11y-assist decide its truth?')
p('  - `auto` — from the component\'s structural definition alone (ARIA roles + contract, native elements, keyboard table). The **guaranteed floor**.')
p('  - `instance` — needs the authored markup/content. The agent inspects the code.')
p('  - `human` — needs judgment. The **ask-the-user checklist**.')
p('- Evaluation (planned) is **three-valued** (true / false / *unknown*): an unresolved predicate yields a `depends` result rather than a silent false — and that `depends` set *is* the checklist. The evaluator is the next step and is not yet built; this page exists to review the data it will run on.','')

p('## Pipeline','')
p('| Step | What | Output |')
p('|---|---|---|')
p('| 1. Extract | Blind, per-SC: each SC\'s normative text → an applicability expression of granular predicates + evidence quotes. | `wcag-applicability.raw.json` |')
p('| 2. Canonicalize | Merge true synonyms into a controlled vocabulary; rewrite every expression against it. | `wcag-applicability.canon.json` |')
p('| 3. Classify | Tag each predicate with `class` / `scope` / `definition`. | `wcag-predicates.classified.json` |')
p('| 4. Evaluate | *(planned)* Three-valued engine: `evaluate(known) → { applies, notApplicable, depends }`. | — |')
p('')
p('Headline numbers from the current data:','')
p(`- **86** Success Criteria, all expressed; **162 → ${predicates.length}** canonical predicates after merging synonyms.`)
p(`- Predicate class: **${cc.auto} auto**, **${cc.instance} instance**, **${cc.human} human**.`)
p(`- SC applicability decidability: **${(dd.auto||0)+(dd.unconditional||0)}** decided from structure alone (the floor), **${dd['needs-instance']||0}** need the markup, **${dd['needs-human']||0}** need human judgment.`)
p(`- The structural floor — criteria that apply with no instance/human input: **${floor.join(', ')}**.`,'')

// ---------- Reducibility ----------
// degree distribution
const deg={}; predicates.forEach(x=>deg[x.sc_count]=(deg[x.sc_count]||0)+1)
const degK=Object.keys(deg).map(Number).sort((a,b)=>a-b)
const degLabels=degK.map(k=>`"${k} SC${k>1?'s':''}"`), degVals=degK.map(k=>deg[k])
// complexity
const comp={}; criteria.forEach(c=>{const n=c.expression==='true'?0:predsOf(c.expression).length; comp[n]=(comp[n]||0)+1})
const compK=Object.keys(comp).map(Number).sort((a,b)=>a-b)
const compLabels=compK.map(k=>`"${k}"`), compVals=compK.map(k=>comp[k])
// coverage
const ranked=[...predicates].sort((a,b)=>b.sc_count-a.sc_count)
const Ks=[5,10,20,28,40,60,predicates.length]
const cov=Ks.map(K=>{const s=new Set();ranked.slice(0,K).forEach(pp=>pp.scs.forEach(x=>s.add(x)));return s.size})
// clusters
const parent={}; criteria.forEach(c=>parent[c.sc_id]=c.sc_id)
const find=x=>parent[x]===x?x:(parent[x]=find(parent[x])); const uni=(a,b)=>{parent[find(a)]=find(b)}
predicates.filter(x=>x.sc_count>1).forEach(x=>{for(let i=1;i<x.scs.length;i++)uni(x.scs[0],x.scs[i])})
const comps={}; criteria.forEach(c=>{const r=find(c.sc_id);(comps[r]=comps[r]||[]).push(c.sc_id)})
const groups=Object.values(comps).sort((a,b)=>b.length-a.length)
const multi=groups.filter(g=>g.length>1)
const isolated=groups.filter(g=>g.length===1).length
const sizeDist={}; groups.forEach(g=>sizeDist[g.length]=(sizeDist[g.length]||0)+1)
const sizeK=Object.keys(sizeDist).map(Number).sort((a,b)=>a-b)

p('## Reducibility','')
p('How much structure do the predicates impose on the 86 criteria? Two opposite readings hold at once: applicability is **reducible at the criterion level** (most SCs hinge on one condition) but **not at the vocabulary level** (the predicate set barely compresses).','')

p('### Predicate reuse','')
p('Most predicates govern a single criterion; only a thin backbone recurs.','')
p('```mermaid')
p('xychart-beta')
p('    title "Predicates by number of SCs governed"')
p(`    x-axis [${degLabels.join(', ')}]`)
p(`    y-axis "predicates" 0 --> ${ymax(degVals)}`)
p(`    bar [${degVals.join(', ')}]`)
p('```')
p(`${predicates.length-deg[1]} predicates recur across more than one SC; **${deg[1]}** are one-offs.`,'')

p('### Criterion complexity','')
p('How many predicates each criterion\'s expression uses. A large share need just one.','')
p('```mermaid')
p('xychart-beta')
p('    title "SCs by number of predicates in their expression"')
p(`    x-axis [${compLabels.join(', ')}]`)
p(`    y-axis "Success Criteria" 0 --> ${ymax(compVals)}`)
p(`    bar [${compVals.join(', ')}]`)
p('```')
p(`**${(comp[0]||0)+(comp[1]||0)}** of 86 criteria are decided by zero or one predicate.`,'')

p('### Coverage','')
p('Taking the top-K predicates by reuse, how many distinct criteria do they touch? The curve is close to linear — there is no small "core set" that explains most of WCAG. Completeness costs vocabulary.','')
p('```mermaid')
p('xychart-beta')
p('    title "Distinct SCs touched by the top-K predicates"')
p(`    x-axis [${Ks.map(k=>`"${k}"`).join(', ')}]`)
p('    y-axis "SCs touched (of 86)" 0 --> 86')
p(`    line [${cov.join(', ')}]`)
p('```','')

p('### Structure: criterion clusters','')
p(`Linking criteria that share a predicate decomposes the corpus into **${groups.length}** near-independent units: **${isolated}** isolated criteria and **${multi.length}** small families. The families are the bottom-up cross-corpus structure — discovered from the data, not asserted.`,'')
p('```mermaid')
p('xychart-beta')
p('    title "Cluster sizes (criteria linked by a shared predicate)"')
p(`    x-axis [${sizeK.map(k=>`"${k} SC${k>1?'s':''}"`).join(', ')}]`)
p(`    y-axis "clusters" 0 --> ${ymax(sizeK.map(k=>sizeDist[k]))}`)
p(`    bar [${sizeK.map(k=>sizeDist[k]).join(', ')}]`)
p('```','')
p('| Size | Criteria in the family |','|---|---|')
for (const g of multi) p(`| ${g.length} | ${g.sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).join(', ')} |`)
p('')

// predicate registry grouped by class
p('## Predicate registry','')
p(`The ${predicates.length} canonical applicability conditions, grouped by detectability class. "SCs" lists the criteria whose applicability references the predicate.`,'')
for (const klass of ['auto','instance','human']) {
  const rows = predicates.filter(x=>x.class===klass).sort((a,b)=>b.sc_count-a.sc_count||a.id.localeCompare(b.id))
  p(`### ${klass} (${rows.length})`,'')
  p('| Predicate | Scope | SCs | Definition |','|---|---|---|---|')
  for (const r of rows) p(`| \`${r.id}\` | ${r.scope} | ${r.scs.join(', ')} | ${cell(r.definition)} |`)
  p('')
}

// per-SC review table
p('## WCAG applicability — prose vs expression','')
p('For review: each criterion\'s verbatim normative text beside the extracted expression. `decidability` reflects the classes of the predicates the expression uses.','')
p('| SC | Lvl | Decidability | Applicability (verbatim normative text) | Predicate expression |','|---|---|---|---|---|')
for (const c of [...criteria].sort((a,b)=>a.sc_id.localeCompare(b.sc_id,undefined,{numeric:true}))) {
  const sc = scById.get(c.sc_id)
  p(`| **${c.sc_id}** ${cell(sc?.title)} | ${sc?.level||''} | ${c.decidability} | ${cell(sc?.short_text)} | \`${cell(c.expression)}\` |`)
}
p('')
writeFileSync('docs/classifier.md', L.join('\n'))
console.log('wrote docs/classifier.md —', L.length, 'lines')
