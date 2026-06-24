import { readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { run, ANS, FAC as FACETS } from './rounds-lib.mjs'
const require = createRequire(import.meta.url)
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
const vtier=V.predicates.reduce((m,x)=>(m[x.tier]=(m[x.tier]||0)+1,m),{})
const residue=V.criteria.reduce((m,c)=>(m[c.residue]=(m[c.residue]||0)+1,m),{})
const floor = criteria.filter(c=>c.decidability==='auto'||c.decidability==='unconditional').map(c=>c.sc_id)

p('---','title: Predicates','parent: Classifier (WIP)','nav_order: 1','permalink: /classifier/predicates/','---','')
p('# Predicates','')
p('The data behind the [classifier]({{ \'/classifier/\' | relative_url }}): the applicability and verification predicate registries, the per-criterion expressions, and the reducibility analysis. For what it implies about automated accessibility verification, see [Automation assessment]({{ \'/classifier/assessment/\' | relative_url }}).','')

p('## Motivation','')
p('a11y-assist reaches WCAG and ACT from a component by *search* (`search_act` / `search_wcag`). Search is a heuristic over prose, and it dead-ends: some components (e.g. `alert`, `breadcrumb`) return no link at all, because W3C never published a clean component-to-criterion crosswalk — the bridge lives only in prose.','')
p('The classifier explores a deterministic alternative. Instead of asking "what text matches this component?", it asks **"under what conditions does each WCAG criterion apply, and what must then be true to conform?"** — and encodes both as data we can evaluate. Given the conditions that hold for a component we compute, mechanically, which criteria apply and which checks they impose — with no search and no dead-ends.','')

p('## The model','')
p('Two parallel predicate layers, same shape:','')
p('- **Applicability** — each SC gets an expression over atomic *trigger* predicates (`non-text-content-present`): *when* the criterion applies. Each predicate has a **class**: `auto` (decided from the component\'s structure), `instance` (needs the authored markup), `human` (needs judgment).')
p('- **Verification** — each SC gets an expression over atomic *postcondition* predicates (`text-alternative-serves-equivalent-purpose`): *what must hold* to conform. Each predicate has a **resolution tier** — how it is settled *after the component is built*: `axe` (an axe-core rule verifies it), `agent` (no axe rule, but an AI agent can confirm it by inspecting the built code), `human` (needs judgment even with the finished artifact).')
p('Evaluation (planned) is **three-valued** (true / false / *unknown*): an unresolved predicate yields a `depends` result rather than a silent false — and that `depends` set *is* the checklist. The evaluator is the next step and is not yet built; this page exists to review the data it will run on.','')

p('## The flow this maps to','')
p('The two layers resolve at two different phases of building a component:','')
p('```')
p('PHASE 1 — PLANNING (before code exists)')
p('  BUILD → component → choose APG pattern OR HTML element')
p('    ⇒ AUTO applicability predicates resolved by the choice itself')
p('    → agent evaluates INSTANCE applicability (intent: "will it contain images / a timer / media?")')
p('    → questionnaire for HUMAN applicability')
p('    ⇒ the APPLICABLE SCs  +  the verification predicates to check later')
p('')
p('PHASE 2 — VERIFICATION (after the component is built)')
p('    → axe runs on the built HTML        ⇒ resolves the `axe`-tier predicates')
p('    → agent inspects the built code     ⇒ resolves the `agent`-tier predicates')
p('    → remaining `human`-tier predicates ⇒ user questionnaire')
p('```','')

p('## Pipeline','')
p('| Step | What | Output |')
p('|---|---|---|')
p('| 1. Extract | Blind, per-SC: each SC\'s normative text → an applicability expression *and* a verification (obligation) expression, both over granular predicates with evidence quotes. | `*.raw.json` |')
p('| 2. Canonicalize | Merge true synonyms into a controlled vocabulary; rewrite expressions against it. | `*.canon.json` |')
p('| 3. Classify | Applicability predicates → `class`; verification predicates → resolution `tier` (matched against axe-core\'s real rule set). | `*.classified.json` |')
p('| 4. Evaluate | *(planned)* Three-valued engine: applicability → applicable SCs → their obligations → the tiered checklist. | — |')
p('')
p('Headline numbers:','')
p(`- **86** Success Criteria, all expressed on both layers.`)
p(`- **Applicability:** 162 → ${predicates.length} canonical predicates; class **${cc.auto} auto / ${cc.instance} instance / ${cc.human} human**; **${(dd.auto||0)+(dd.unconditional||0)}** SCs decided from structure alone.`)
p(`- **Verification:** 159 → ${V.predicates.length} canonical postconditions; tier **${vtier.axe} axe / ${vtier.agent} agent / ${vtier.human} human**.`)
p(`- After build, per-SC obligation: **${residue['axe-complete']||0}** closed by axe alone, **${residue['agent-closable']||0}** closable by axe + agent (no user), **${residue['needs-human']||0}** require the user.`,'')

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

p('## Reducibility','')
p('How much structure do the predicates impose on the 86 criteria? For **applicability**, two opposite readings hold: reducible at the criterion level (most SCs hinge on one condition) but not at the vocabulary level (the predicate set barely compresses).','')

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
p('Does the verification layer compress more than applicability? We extracted obligations the same way and compared. It does **not** — verification is, if anything, the *most* bespoke layer. WCAG obligations are individuated by criterion almost by definition. (Real reuse only appears when ACT *operationalizes* several criteria with one shared mechanical check, and even that is small.)','')
p('| layer | distinct predicates | singletons | max reuse |')
p('|---|---|---|---|')
p(`| Applicability | ${predicates.length} | ${singlePct(predicates)}% | ${maxReuse(predicates)} |`)
p(`| Verification (SC obligations) | ${V.predicates.length} | ${singlePct(V.predicates)}% | ${maxReuse(V.predicates)} |`)
p('')
p('The takeaway reframes the effort: the payoff is **routing, not compression**. Reducibility is *per-component* (a button triggers a handful of predicates, not 157), not global.','')

// ---------- verification coverage ----------
p('## Verification coverage after axe','')
p('Each verification predicate tagged by how it is resolved once the component is built, matched against axe-core\'s actual 104-rule set. This is the concrete answer to "what does the automated audit leave behind."','')
p('```mermaid')
p('xychart-beta')
p('    title "Verification predicates by resolution tier"')
p('    x-axis ["axe", "agent", "human"]')
p(`    y-axis "predicates" 0 --> ${ymax([vtier.axe,vtier.agent,vtier.human])}`)
p(`    bar [${vtier.axe}, ${vtier.agent}, ${vtier.human}]`)
p('```')
p('Rolled up per criterion — what is needed to fully verify each SC\'s obligation:','')
p('| After the build… | SCs |')
p('|---|---|')
p(`| **axe alone** closes the obligation | ${residue['axe-complete']||0} |`)
p(`| **axe + agent** close it (no user needed) | ${residue['agent-closable']||0} |`)
p(`| **user input** required | ${residue['needs-human']||0} |`)
p('')
p(`So automated tooling fully closes **${residue['axe-complete']||0}** of 86 criteria; the agent can finish another **${residue['agent-closable']||0}** by inspecting the built code; and **${residue['needs-human']||0}** genuinely need a person. Per *predicate*, axe touches only **${vtier.axe}** of ${V.predicates.length} — a sharper figure than the usual "axe covers ~50%," because most obligations decompose into one axe-checkable property plus several that are not.`,'')

// ---------- registries ----------
function registry(title, intro, preds, key, order, showAxe) {
  p(`## ${title}`,'')
  p(intro,'')
  for (const g of order) {
    const rows = preds.filter(x=>x[key]===g).sort((a,b)=>b.sc_count-a.sc_count||a.id.localeCompare(b.id))
    p(`### ${g} (${rows.length})`,'')
    if (showAxe) p('| Predicate | Scope | SCs | axe rules | Definition |','|---|---|---|---|---|')
    else p('| Predicate | Scope | SCs | Definition |','|---|---|---|---|')
    for (const r of rows) {
      if (showAxe) p(`| \`${r.id}\` | ${r.scope} | ${r.scs.join(', ')} | ${(r.axe_rules||[]).map(x=>'`'+x+'`').join(' ')||'—'} | ${cell(r.definition)} |`)
      else p(`| \`${r.id}\` | ${r.scope} | ${r.scs.join(', ')} | ${cell(r.definition)} |`)
    }
    p('')
  }
}
registry('Applicability — predicate registry',
  `The ${predicates.length} canonical applicability conditions, grouped by detectability class. "SCs" lists the criteria whose applicability references the predicate.`,
  predicates, 'class', ['auto','instance','human'], false)
registry('Verification — predicate registry',
  `The ${V.predicates.length} canonical postconditions, grouped by resolution tier. "axe rules" names the matched axe-core rule(s) for the \`axe\` tier.`,
  V.predicates, 'tier', ['axe','agent','human'], true)

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
p('Each criterion\'s verbatim normative text beside its obligation expression. `residue` is what is needed to fully verify it after the build: `axe-complete`, `agent-closable` (no user), or `needs-human`.','')
p('| SC | Lvl | Residue | Obligation (verbatim normative text) | Verification expression |','|---|---|---|---|---|')
for (const c of [...V.criteria].sort((a,b)=>a.sc_id.localeCompare(b.sc_id,undefined,{numeric:true}))) {
  const sc = scById.get(c.sc_id)
  p(`| **${c.sc_id}** ${cell(sc?.title)} | ${sc?.level||''} | ${c.residue} | ${cell(sc?.short_text)} | \`${cell(c.verification_expression)}\` |`)
}
p('')

writeFileSync('docs/classifier/predicates.md', L.join('\n'))
console.log('wrote docs/classifier/predicates.md —', L.length, 'lines')

// ============================ ASSESSMENT PAGE ============================
const axeRules = require('axe-core').getRules()
const tagToSc = t => { const m=String(t).match(/^wcag(\d)(\d)(\d+)$/); return m?`${m[1]}.${m[2]}.${m[3]}`:null }
const axeScs = new Set(); axeRules.forEach(r=>(r.tags||[]).forEach(t=>{const s=tagToSc(t); if(s)axeScs.add(s)}))
const axeTouched = criteria.filter(c=>axeScs.has(c.sc_id)).length
const aStruct=(dd.auto||0)+(dd.unconditional||0), aMarkup=dd['needs-instance']||0, aHuman=dd['needs-human']||0
const rAxe=residue['axe-complete']||0, rAgent=residue['agent-closable']||0, rHuman=residue['needs-human']||0
const humanV = V.predicates.filter(p=>p.tier==='human')
const humanExamples = humanV.slice().sort((a,b)=>b.sc_count-a.sc_count||a.id.localeCompare(b.id)).slice(0,8)

const M=[]; const q=(...x)=>M.push(...x)
q('---','title: Automation assessment','parent: Classifier (WIP)','nav_order: 2','permalink: /classifier/assessment/','---','')
q('# Automation assessment','')
q('The predicate decomposition was built to *route* checks across tooling, agents, and people. As a byproduct it **quantifies how much of WCAG automated tooling can actually settle** — and the picture is sharper, and more sobering, than the usual "automated tools catch about half." All figures are derived from the data on the [Predicates]({{ \'/classifier/predicates/\' | relative_url }}) page.','')

q('## Judgment is needed *upstream* of verification','')
q('The standard framing — "tools catch ~50%, the rest is manual" — is entirely about *verifying*. The decomposition exposes an earlier, usually-ignored cost: judgment is needed just to decide **whether a criterion applies at all**.','')
q('```mermaid')
q('xychart-beta')
q('    title "How each criterion\'s APPLICABILITY is decided (of 86)"')
q('    x-axis ["from structure", "needs markup", "needs human"]')
q(`    y-axis "Success Criteria" 0 --> ${ymax([aStruct,aMarkup,aHuman])}`)
q(`    bar [${aStruct}, ${aMarkup}, ${aHuman}]`)
q('```')
q(`**${aHuman} of 86** criteria need human judgment *even to scope whether they apply*. Automated tools hide this by silently treating "not detected" as "not applicable" — they never raise the question. Only **${aStruct}** can be scoped from component structure alone.`,'')

q('## axe\'s real reach is ~12%, not ~50%','')
q('Counting *complete discharge of an obligation* rather than criteria axe merely touches:','')
q('| Measure | Value |')
q('|---|---|')
q(`| WCAG criteria axe *touches* | ${axeTouched} / 86 |`)
q(`| WCAG criteria axe *fully closes* | **${rAxe} / 86** (~${Math.round(100*rAxe/86)}%) |`)
q(`| Verification predicates axe covers | ${vtier.axe} / ${V.predicates.length} |`)
q('')
q(`The "~50%" figure counts criteria a tool *touches* or *partially* addresses. By complete discharge, axe settles **${rAxe}** of 86. The gap between "touches ${axeTouched}" and "closes ${rAxe}" is the point: most obligations decompose into one axe-checkable property plus several that are not — so a passing scan is *necessary but weakly sufficient*, and silent about the rest.`,'')

q('## Three tiers: where verification actually lands','')
q('Each verification predicate, tagged by how it is resolved after the build (matched against axe-core\'s real 104-rule set):','')
q('```mermaid')
q('xychart-beta')
q('    title "Verification predicates by resolution tier"')
q('    x-axis ["axe (static)", "agent (reads code)", "human (judgment)"]')
q(`    y-axis "predicates" 0 --> ${ymax([vtier.axe,vtier.agent,vtier.human])}`)
q(`    bar [${vtier.axe}, ${vtier.agent}, ${vtier.human}]`)
q('```')
q('Rolled up per criterion — what is required to fully verify each obligation:','')
q('| After the build… | SCs | Share |')
q('|---|---|---|')
q(`| **axe alone** closes it | ${rAxe} | ${Math.round(100*rAxe/86)}% |`)
q(`| **axe + agent** close it (no user) | ${rAgent} | ${Math.round(100*rAgent/86)}% |`)
q(`| **user input** required | ${rHuman} | ${Math.round(100*rHuman/86)}% |`)
q('')
q(`The striking number is the **agent tier (${vtier.agent} predicates)** — larger than axe and human combined. Historically a11y verification was binary: a small automated slice vs. everything-else-is-manual. A reasoning agent creates a genuine **third tier** — not statically checkable, but decidable by reading the built code. After axe **and** agent, only **${rHuman} of 86** criteria still need a person. The real shift this documents is the locus of automation moving from rule-engines to reasoning-agents.`,'')

q('## Why static analysis hits a wall — and it is categorical','')
q('Static analysis is not weak here because axe is under-built. A large share of predicates are **about meaning** — uncheckable by any static analyzer *in principle*, because they need a model of intent, equivalence, and audience. Examples (the most reused human-tier postconditions):','')
q('| Postcondition | Criteria |')
q('|---|---|')
for (const p of humanExamples) q(`| \`${p.id}\` | ${p.scs.join(', ')} |`)
q('')
q('No roadmap of "better static rules" closes this. The [reducibility analysis]({{ \'/classifier/predicates/#reducibility\' | relative_url }}) confirms the shape: WCAG is wide, shallow, and ~85% bespoke — written for human auditors exercising judgment, not for engines.','')

q('## Caveats — held honestly','')
q(`- **The agent tier is a hypothesis, not a measurement.** We *tagged* ${vtier.agent} predicates "an agent could decide this." We have not shown an agent discharges them *reliably*. An agent can be confidently wrong about meaning, can miss runtime / assistive-technology behaviour, and has no lived experience of disability — the ultimate ground truth.`)
q('- **These numbers are themselves semi-cognitive.** Every figure here came from LLM extraction and classification, unaudited. The *direction* is robust (axe is small; the cognitive weight is large, at both applicability and verification); the *precise figures* carry error bars. Fitting, for a study of the limits of mechanical assessment.','')

q('## What it means','')
q('- **"Accessible" cannot be certified by tools** — and the gap is far wider than "half." "We ran axe and it passed" is a much weaker claim than commonly assumed; it speaks to ~12% of criteria and is silent on the rest, including whether they apply.')
q('- **The honest posture is evidence-backed.** a11y-assist surfaces guidance, scopes applicability, runs the thin automatable slice, and routes the remainder explicitly to agent and human — never claiming conformance. This data is the justification for that design, derived from first principles.')
q('- **The leverage is the agent tier, not more static coverage.** Past axe\'s handful of criteria, more rules buy almost nothing. The payoff is making a reasoning agent reliably answer its share — which is exactly what the predicate registry provides: vague criteria turned into specific, evidence-cited, per-predicate questions an agent or a person can actually answer.','')

writeFileSync('docs/classifier/assessment.md', M.join('\n'))
console.log('wrote docs/classifier/assessment.md —', M.length, 'lines')

// ============================ DECISION TREE PAGE ============================
const D=[]; const d=(...x)=>D.push(...x)
const rows = Object.keys(ANS).map(run).filter(Boolean).sort((a,b)=>a.q-b.q||a.NAME.localeCompare(b.NAME))
const autoCount = A.predicates.filter(p=>p.class==='auto').length
const nonAuto = A.predicates.length - autoCount
const totalSub = Object.values(FACETS.facets).reduce((a,f)=>a+f.subgates.length,0)

d('---','title: Decision tree','parent: Classifier (WIP)','nav_order: 3','permalink: /classifier/decision-tree/','---','')
d('# Decision tree','')
d('The *pre-verification* problem: given a component, **which Success Criteria apply at all?** Naively that means assessing all 157 applicability [predicates]({{ \'/classifier/predicates/\' | relative_url }}). This page is the mechanism that resolves it in a few rounds of mostly-"no" questions instead.','')

d('## Three sources of truth','')
d(`Applicability predicates are settled three ways, cheapest first:`,'')
d(`1. **Derive** — the **${autoCount} \`auto\` predicates** come free from the component selection (its ARIA roles + contract + native elements). No questions.`)
d(`2. **Gate** — the remaining **${nonAuto}** (instance + human) are organised into a 2-level prune tree: **9 facet gates** → **${totalSub} sub-gates**. A gate answered "no" prunes its whole cluster; "yes" includes it (conservative — over-include for review rather than miss).`)
d(`3. **Ask / presume** — gates the agent can\'t derive from the build, it presumes "no" (build flow) or asks the user.`,'')

d('```mermaid')
d('flowchart TD')
d('  S["Select component (APG / role)"] --> R0["Round 0 — derive auto predicates · 0 questions"]')
d('  R0 --> R1{"Round 1 — ~9 facet gates"}')
d('  R1 -->|no| PR["prune facet cluster"]')
d('  R1 -->|yes| R2{"Round 2 — that facet\'s 2–4 sub-gates"}')
d('  R2 -->|no| PR2["prune sub-cluster"]')
d('  R2 -->|yes| INC["include → those SCs apply"]')
d('  PR --> OUT["Applicable SC set"]')
d('  PR2 --> OUT')
d('  INC --> OUT')
d('```','')

d('## The gate map','')
d('Nine coarse facets (level 1), each split into sub-gates (level 2). "gates SCs" is how many criteria the facet can decide.','')
for (const [fac,v] of Object.entries(FACETS.facets)) {
  d(`### ${fac}`,'')
  d(`**Gate:** ${v.gate}  ·  gates ${v.scs.length} SCs (${v.scs.join(', ')})`,'')
  d('| Sub-gate | preds |','|---|---|')
  for (const s of v.subgates) d(`| ${s.question} | ${s.predicates.length} |`)
  d('')
}

d('## Measured cost','')
d('Running the rounds engine over a spread of components (with representative answer sets). Every one resolves **fully** — zero `depends` — in two question-rounds.','')
d('| Component | widget | yes-facets | questions (9 + sub) | applies | n/a | depends |')
d('|---|---|---|---|---|---|---|')
for (const r of rows) d(`| ${r.NAME} | ${r.widget?'yes':'no'} | ${r.yesFacets.length} | **${r.q}** | ${r.applies} | ${r.na} | ${r.dep} |`)
d('')
d('```mermaid')
d('xychart-beta')
d('    title "Questions to resolve applicability, by component"')
d(`    x-axis [${rows.map(r=>`"${r.NAME}"`).join(', ')}]`)
d('    y-axis "questions" 0 --> 140')
d(`    bar [${rows.map(r=>r.q).join(', ')}]`)
d(`    line [${rows.map(()=>135).join(', ')}]`)
d('```')
d('The bars are the rounds engine; the flat line at 135 is the naive "ask every non-auto predicate." The count scales with component richness (2 active facets → ~16, 4 → ~23) and stays bounded well under the naive baseline.','')

d('## Why it converges','')
d('- **70 of 86 SCs are gated by a single facet** (see [reducibility]({{ \'/classifier/predicates/#reducibility\' | relative_url }})), so one gate cleanly decides each.')
d('- **Within a facet the prior is skewed too** — "there is text? yes" but "abbreviations / idioms / foreign-language? no, no, no" — so sub-gates prune most of a yes-facet\'s contents.')
d('- The tree is therefore **shallow (2 levels)** and the answers are **mostly "no"**, which is what collapses 135 → ~20.','')

d('## Caveats','')
d('- The per-component figures use **representative hardcoded answer sets** — what is validated is the mechanism and the bounded question count, not the exact `applies` for each component.')
d('- "yes → include the cluster" is **conservative**: it can slightly over-apply. That is the safe direction for applicability (over-include for review, never silently miss); exceptions are refined at verification.')
d('- The count can drop further: several facet gates are themselves **derivable** (`forms-input` ⇐ an input role, `navigation-context` ⇐ a link role), so a real agent would not ask them.')
d('- Prototype only — `eval-rounds.mjs` / `rounds-lib.mjs` in `classify/`, not wired into the build.','')

writeFileSync('docs/classifier/decision-tree.md', D.join('\n'))
console.log('wrote docs/classifier/decision-tree.md —', D.length, 'lines')
