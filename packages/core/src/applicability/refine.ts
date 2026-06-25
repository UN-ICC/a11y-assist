/**
 * Interactive refine — the gate-first walkthrough, in core.
 *
 * `structuralGuidance` answers "what does the component's structure entail?"
 * (the floor). `refineApplicability` answers the next question: of the
 * content-dependent criteria the structure leaves open, which actually apply to
 * THIS instance? It walks the facet tree the same way the web walkthrough does —
 * facet gate → subgate → leaf predicate — pruning to only what is relevant for
 * the component, so a caller never wades through facets that cannot apply.
 *
 * Stateless: each call is a pure function of the facts + the selections so far.
 *   {}                         → the facet gates (coarse yes/no)
 *   { facets }                 → the subgate questions under those facets
 *   { facets, subgates }       → the leaf predicate questions under those subgates
 *   { present }                → the complete applicable SC set + verification plan
 *
 * Both the MCP `evaluate_applicability` tool and (build-time) the web app draw
 * from this one source so the two flows cannot diverge.
 */
import { deriveAuto, buildAssignment, type ComponentFacts } from './derive.js'
import { evaluateApplicability, planVerification, type VerificationPlan } from './evaluate.js'
import {
  FACETS, APPL_META, SC_TITLE,
  type FacetKey, type ApplicabilityPredicate, type SCId,
} from './data.js'
import type { WCAGLevel } from '../compose.js'

const LEVEL_ORDER: Record<WCAGLevel, number> = { A: 1, AA: 2, AAA: 3 }
const withinLevel = (sc: SCId, target: WCAGLevel): boolean =>
  LEVEL_ORDER[SC_TITLE[sc].level] <= LEVEL_ORDER[target]

const APPL_SET = new Set<string>(Object.keys(APPL_META))

export interface RefineSelection {
  /** Facet keys the caller affirmed (step 1 answers). */
  facets?: string[]
  /** Subgate ids (`facet|index`) the caller affirmed (step 2 answers). */
  subgates?: string[]
  /** Leaf predicate ids that hold for the instance (terminal). */
  present?: string[]
}

export type RefineStep =
  | {
      mode: 'facets'
      level: WCAGLevel
      gates: { facet: FacetKey; question: string; subgateCount: number; predicateCount: number }[]
    }
  | {
      mode: 'subgates'
      level: WCAGLevel
      selectedFacets: string[]
      unknownFacets: string[]
      subgates: { id: string; facet: FacetKey; question: string; predicateCount: number }[]
    }
  | {
      mode: 'predicates'
      level: WCAGLevel
      selectedSubgates: string[]
      unknownSubgates: string[]
      predicates: { predicate: ApplicabilityPredicate; question: string; facet: FacetKey; subgate: string }[]
    }
  | {
      mode: 'result'
      level: WCAGLevel
      applies: SCId[]
      unknownPresent: string[]
      plan: VerificationPlan
    }

/** Predicate ids the component's applicability genuinely hinges on (the unknowns of the floor). */
function relevantPredicates(facts: ComponentFacts): Set<string> {
  const r = evaluateApplicability(deriveAuto(facts))
  return new Set(r.depends.flatMap((d) => d.unknown))
}

/**
 * One step of the gate-first walkthrough. `level` gates the final SC set
 * (cumulative); the facet/subgate/predicate navigation is pruned to predicates
 * the component can actually be affected by.
 */
export function refineApplicability(
  facts: ComponentFacts,
  level: WCAGLevel = 'AA',
  sel: RefineSelection = {},
): RefineStep {
  // Terminal: caller has the leaf predicates that hold → resolve the SC set.
  if (sel.present) {
    const unknownPresent = sel.present.filter((p) => !APPL_SET.has(p))
    const selected = sel.present.filter((p) => APPL_SET.has(p)) as ApplicabilityPredicate[]
    const applies = evaluateApplicability(buildAssignment(facts, selected)).applies.filter((id) =>
      withinLevel(id, level),
    )
    return { mode: 'result', level, applies, unknownPresent, plan: planVerification(applies) }
  }

  const relevant = relevantPredicates(facts)
  const relevantInSub = (facet: FacetKey, i: number): ApplicabilityPredicate[] =>
    FACETS[facet].subgates[i].predicates.filter((p) => relevant.has(p))

  // Step 1 — facet gates.
  if (!sel.facets || !sel.facets.length) {
    const gates = (Object.keys(FACETS) as FacetKey[])
      .map((facet) => {
        const subgates = FACETS[facet].subgates
          .map((_, i) => relevantInSub(facet, i))
          .filter((preds) => preds.length)
        return {
          facet,
          question: FACETS[facet].gate,
          subgateCount: subgates.length,
          predicateCount: subgates.reduce((n, preds) => n + preds.length, 0),
        }
      })
      .filter((g) => g.predicateCount)
    return { mode: 'facets', level, gates }
  }

  const facetSet = new Set(sel.facets)
  const unknownFacets = sel.facets.filter((f) => !(f in FACETS))

  // Step 2 — subgates under the affirmed facets.
  if (!sel.subgates || !sel.subgates.length) {
    const subgates: { id: string; facet: FacetKey; question: string; predicateCount: number }[] = []
    for (const facet of Object.keys(FACETS) as FacetKey[]) {
      if (!facetSet.has(facet)) continue
      FACETS[facet].subgates.forEach((sg, i) => {
        const preds = relevantInSub(facet, i)
        if (preds.length) subgates.push({ id: `${facet}|${i}`, facet, question: sg.question, predicateCount: preds.length })
      })
    }
    return { mode: 'subgates', level, selectedFacets: sel.facets, unknownFacets, subgates }
  }

  // Step 3 — leaf predicates under the affirmed subgates.
  const subSet = new Set(sel.subgates)
  const unknownSubgates = sel.subgates.filter((id) => {
    const [facet, idx] = id.split('|')
    return !(facet in FACETS) || !FACETS[facet as FacetKey].subgates[Number(idx)]
  })
  const predicates: { predicate: ApplicabilityPredicate; question: string; facet: FacetKey; subgate: string }[] = []
  for (const id of subSet) {
    const [facet, idx] = id.split('|')
    if (!(facet in FACETS)) continue
    const i = Number(idx)
    for (const p of relevantInSub(facet as FacetKey, i)) {
      predicates.push({ predicate: p, question: APPL_META[p].definition, facet: facet as FacetKey, subgate: id })
    }
  }
  return { mode: 'predicates', level, selectedSubgates: sel.subgates, unknownSubgates, predicates }
}
