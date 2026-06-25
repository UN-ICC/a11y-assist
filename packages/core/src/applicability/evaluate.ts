/**
 * Three-valued (Kleene) evaluation of the applicability and verification
 * expressions. Pure; operates on the generated expression tables.
 *
 * A predicate whose value is omitted from the truth map evaluates to `unknown`,
 * which propagates so an SC can come back `applies` / `not-applicable` /
 * `depends`. With a total assignment, `depends` is always empty.
 */
import {
  APPL_EXPR, VERIF_EXPR, VERIF_META,
  type ApplicabilityPredicate, type VerificationPredicate, type SCId,
} from './data.js'

export type Tri = 'T' | 'F' | 'U'
const OPS = new Set(['AND', 'OR', 'NOT', '(', ')', 'true'])

/** Tokenise + recursive-descent evaluate one boolean expression under Kleene logic. */
export function evalExpr(expr: string, look: (predicate: string) => Tri): Tri {
  const toks = expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean)
  let i = 0
  const peek = () => toks[i]
  const next = () => toks[i++]
  const NOT = (v: Tri): Tri => (v === 'T' ? 'F' : v === 'F' ? 'T' : 'U')
  const AND = (a: Tri, b: Tri): Tri => (a === 'F' || b === 'F' ? 'F' : a === 'U' || b === 'U' ? 'U' : 'T')
  const OR = (a: Tri, b: Tri): Tri => (a === 'T' || b === 'T' ? 'T' : a === 'U' || b === 'U' ? 'U' : 'F')
  function factor(): Tri {
    if (peek() === 'NOT') { next(); return NOT(factor()) }
    if (peek() === '(') { next(); const v = expr2(); next(); return v }
    const t = next()
    return t === 'true' ? 'T' : look(t)
  }
  function term(): Tri { let v = factor(); while (peek() === 'AND') { next(); v = AND(v, factor()) } return v }
  function expr2(): Tri { let v = term(); while (peek() === 'OR') { next(); v = OR(v, term()) } return v }
  return expr2()
}

const predicatesIn = (expr: string): string[] =>
  [...new Set(expr.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter((t) => t && !OPS.has(t)))]

export interface ApplicabilityResult {
  applies: SCId[]
  notApplicable: SCId[]
  depends: { sc: SCId; unknown: string[] }[]
}

/** Evaluate all 86 applicability expressions against a (possibly partial) truth map. */
export function evaluateApplicability(
  truth: Partial<Record<ApplicabilityPredicate, boolean>>,
): ApplicabilityResult {
  const look = (p: string): Tri => {
    const v = (truth as Record<string, boolean | undefined>)[p]
    return v === true ? 'T' : v === false ? 'F' : 'U'
  }
  const applies: SCId[] = []
  const notApplicable: SCId[] = []
  const depends: { sc: SCId; unknown: string[] }[] = []
  for (const sc of Object.keys(APPL_EXPR) as SCId[]) {
    const r = evalExpr(APPL_EXPR[sc], look)
    if (r === 'T') applies.push(sc)
    else if (r === 'F') notApplicable.push(sc)
    else depends.push({ sc, unknown: predicatesIn(APPL_EXPR[sc]).filter((p) => look(p) === 'U') })
  }
  return { applies, notApplicable, depends }
}

export interface VerificationPlan {
  /** Distinct verification predicates needed, partitioned by resolution tier. */
  axe: VerificationPredicate[]
  agent: VerificationPredicate[]
  human: VerificationPredicate[]
  /** Obligation expression per applicable SC, to evaluate once values are gathered. */
  exprs: Partial<Record<SCId, string>>
}

/** Given the applicable SCs, the verification predicates to resolve (by tier) + their expressions. */
export function planVerification(applicable: SCId[]): VerificationPlan {
  const exprs: Partial<Record<SCId, string>> = {}
  const seen = new Set<string>()
  const axe: VerificationPredicate[] = []
  const agent: VerificationPredicate[] = []
  const human: VerificationPredicate[] = []
  for (const sc of applicable) {
    const expr = VERIF_EXPR[sc]
    exprs[sc] = expr
    for (const p of predicatesIn(expr)) {
      if (seen.has(p)) continue
      seen.add(p)
      const tier = VERIF_META[p as VerificationPredicate]?.tier
      if (tier === 'axe') axe.push(p as VerificationPredicate)
      else if (tier === 'agent') agent.push(p as VerificationPredicate)
      else human.push(p as VerificationPredicate)
    }
  }
  return { axe, agent, human, exprs }
}

export type VerificationStatus = 'pass' | 'fail' | 'unverified'

/** Evaluate each applicable SC's obligation. Never asserts conformance — unknown stays `unverified`. */
export function evaluateVerification(
  applicable: SCId[],
  truth: Partial<Record<VerificationPredicate, boolean>>,
): Record<SCId, VerificationStatus> {
  const look = (p: string): Tri => {
    const v = (truth as Record<string, boolean | undefined>)[p]
    return v === true ? 'T' : v === false ? 'F' : 'U'
  }
  const out: Record<string, VerificationStatus> = {}
  for (const sc of applicable) {
    const r = evalExpr(VERIF_EXPR[sc], look)
    out[sc] = r === 'T' ? 'pass' : r === 'F' ? 'fail' : 'unverified'
  }
  return out as Record<SCId, VerificationStatus>
}
