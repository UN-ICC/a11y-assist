/**
 * Build-time guidance — the structural floor (no questions asked).
 *
 * Given a component's structural facts alone, returns:
 *   - `floor`            — SCs that apply from structure alone (guaranteed; the auto predicates entail them)
 *   - `contentDependent` — SCs that MAY apply depending on the authored content/context (defer to a downstream audit)
 *   - `excluded`         — SCs structurally excluded (cannot apply for this component type)
 *   - `checklist`        — the verification plan for the floor SCs, by tier
 *
 * All buckets are gated to a conformance `level` (cumulative: AA keeps A∪AA).
 *
 * This is the cheap, friction-free response for the "I'm building an X" case:
 * it surfaces only what the component's structure entails and is honest that the
 * rest is content-dependent. It composes deriveAuto + evaluateApplicability +
 * planVerification; the interactive walkthrough engine is untouched and used for
 * the on-demand audit, where the instance/human predicates become observable.
 */
import { deriveAuto, type ComponentFacts } from './derive.js'
import { evaluateApplicability, planVerification, type VerificationPlan } from './evaluate.js'
import { SC_TITLE, type ApplicabilityPredicate, type SCId } from './data.js'
import type { WCAGLevel } from '../compose.js'

const LEVEL_ORDER: Record<WCAGLevel, number> = { A: 1, AA: 2, AAA: 3 }
const withinLevel = (sc: SCId, target: WCAGLevel): boolean =>
  LEVEL_ORDER[SC_TITLE[sc].level] <= LEVEL_ORDER[target]

export interface StructuralGuidance {
  /** Conformance level the result is gated to (cumulative). */
  level: WCAGLevel
  /** Auto predicates that hold for this component (transparency / provenance). */
  autoTrue: ApplicabilityPredicate[]
  /** SCs that apply from structure alone — the guaranteed floor. */
  floor: SCId[]
  /** SCs that may apply depending on authored content/context — for the audit. */
  contentDependent: SCId[]
  /** SCs structurally excluded for this component type. */
  excluded: SCId[]
  /** Verification checklist for the floor SCs, partitioned axe / agent / human. */
  checklist: VerificationPlan
}

/**
 * The structural floor for a component, gated to `level` (cumulative; default AA).
 * Evaluates applicability with ONLY the auto predicates known (everything else
 * unknown), so the three-valued result separates the guaranteed floor
 * (`applies`) from the content-dependent set (`depends`) and the structural
 * exclusions (`notApplicable`) — without guessing about content that does not
 * exist yet. SCs above the chosen level drop out of every bucket.
 */
export function structuralGuidance(facts: ComponentFacts, level: WCAGLevel = 'AA'): StructuralGuidance {
  const auto = deriveAuto(facts)
  const result = evaluateApplicability(auto)
  const gate = (scs: SCId[]) => scs.filter((sc) => withinLevel(sc, level))
  const floor = gate(result.applies)
  return {
    level,
    autoTrue: (Object.keys(auto) as ApplicabilityPredicate[]).filter((p) => auto[p]),
    floor,
    contentDependent: gate(result.depends.map((d) => d.sc)),
    excluded: gate(result.notApplicable),
    checklist: planVerification(floor),
  }
}
