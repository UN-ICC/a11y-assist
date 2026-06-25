import { z } from 'zod'
import { composeApgPattern, composeAriaRole, applicability } from 'a11y-assist-core'

const {
  factsFromComposition, deriveAuto, buildAssignment, evaluateApplicability, planVerification,
  APPL_META, VERIF_META, SC_TITLE, APPLICABILITY_PREDICATES, FACETS,
} = applicability

type ApplPred = applicability.ApplicabilityPredicate
type VerifPred = applicability.VerificationPredicate
type SCId = applicability.SCId
type Level = 'A' | 'AA' | 'AAA'

const LEVEL_ORDER: Record<Level, number> = { A: 1, AA: 2, AAA: 3 }
const within = (id: SCId, lv: Level) => LEVEL_ORDER[SC_TITLE[id].level] <= LEVEL_ORDER[lv]
const APPL_SET = new Set<string>(APPLICABILITY_PREDICATES)

const parameters = z.object({
  pattern: z.string().optional().describe('APG pattern name, e.g. accordion. Provide this OR role.'),
  role: z.string().optional().describe('ARIA role of a primitive, e.g. textbox. Provide this OR pattern.'),
  level: z.enum(['A', 'AA', 'AAA']).default('AA').describe('Conformance level (cumulative).'),
  present: z.array(z.string()).optional().describe(
    'Applicability predicate ids that hold for YOUR specific component (its content / context). ' +
    'Omit on the first call to receive the content_dependent_questions to answer.',
  ),
})

type Args = z.infer<typeof parameters>

const compose = (pattern: string | undefined, role: string | undefined, level: Level) =>
  pattern ? composeApgPattern(pattern, level) : role ? composeAriaRole(role, level) : null

export const evaluateApplicabilityTool = {
  name: 'evaluate_applicability',
  description:
    'REFINE the applicable WCAG criteria for a component beyond the structural floor that ' +
    'get_apg_pattern / get_aria_role return. Two steps (the agent equivalent of the website ' +
    'refine/audit walkthrough): (1) call with pattern|role + level and NO `present` to get ' +
    '`content_dependent_questions` (each a predicate id + a yes/no question about the content/' +
    'context you are building); (2) decide which hold and call again with `present` set to those ' +
    'predicate ids to get the COMPLETE applicable SC set plus a tiered verification checklist. ' +
    'Then resolve the checklist (audit_html for the axe tier, inspect markup for the agent tier, ' +
    'ask the user for the human tier) and roll it up with evaluate_verification.',
  parameters,
  execute: async ({ pattern, role, level, present }: Args): Promise<string> => {
    const composed = compose(pattern, role, level)
    if (!composed) return JSON.stringify({ error: 'Provide a known `pattern` (APG) or `role` (ARIA).' })
    const facts = factsFromComposition(composed)

    if (!present) {
      // Discovery: the content/context predicates this component's applicability hinges on,
      // grouped by facet so the agent can dismiss whole clusters fast (no media, no timing, …).
      const r = evaluateApplicability(deriveAuto(facts))
      const relevant = new Set(r.depends.flatMap((d) => d.unknown))
      const facets: { gate: string; predicates: { predicate: string; question: string }[] }[] = []
      for (const f of Object.values(FACETS)) {
        const preds: { predicate: string; question: string }[] = []
        for (const sg of f.subgates) {
          for (const p of sg.predicates) {
            if (relevant.has(p)) preds.push({ predicate: p, question: APPL_META[p as ApplPred]?.definition })
          }
        }
        if (preds.length) facets.push({ gate: f.gate, predicates: preds })
      }
      return JSON.stringify({
        mode: 'questions',
        level,
        instruction: 'For each facet, if its gate is "no" skip its predicates; otherwise pick the predicate ids that hold for your component. Then call evaluate_applicability again with `present` = those ids.',
        facets,
      })
    }

    const unknown = present.filter((p) => !APPL_SET.has(p))
    const selected = present.filter((p) => APPL_SET.has(p)) as ApplPred[]
    const r = evaluateApplicability(buildAssignment(facts, selected))
    const applies = r.applies.filter((id) => within(id, level))
    const plan = planVerification(applies)
    const check = (p: VerifPred) => ({ predicate: p, check: VERIF_META[p]?.definition })
    return JSON.stringify({
      mode: 'result',
      level,
      applicable_scs: applies.map((id) => ({ id, title: SC_TITLE[id]?.title, level: SC_TITLE[id]?.level })),
      verification_checklist: {
        automated_axe: plan.axe.map(check),
        agent_verifiable: plan.agent.map(check),
        needs_human: plan.human.map(check),
      },
      ...(unknown.length ? { unknown_predicates: unknown } : {}),
    })
  },
}
