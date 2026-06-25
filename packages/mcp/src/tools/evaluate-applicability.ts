import { z } from 'zod'
import { composeApgPattern, composeAriaRole, applicability } from 'a11y-assist-core'

const { factsFromComposition, refineApplicability, probeFor, VERIF_META, SC_TITLE } = applicability

type VerifPred = applicability.VerificationPredicate
type Level = 'A' | 'AA' | 'AAA'

const parameters = z.object({
  pattern: z.string().optional().describe('APG pattern name, e.g. accordion. Provide this OR role.'),
  role: z.string().optional().describe('ARIA role of a primitive, e.g. textbox. Provide this OR pattern.'),
  level: z.enum(['A', 'AA', 'AAA']).default('AA').describe('Conformance level (cumulative).'),
  facets: z.array(z.string()).optional().describe(
    'Facet keys your component involves (from the facet-gates step), e.g. ["color-contrast","text-language"]. ' +
    'Returns the subgate questions under only those facets.',
  ),
  subgates: z.array(z.string()).optional().describe(
    'Subgate ids your component involves (from the subgates step), e.g. ["color-contrast|0"]. ' +
    'Returns the leaf predicate questions under only those subgates.',
  ),
  present: z.array(z.string()).optional().describe(
    'Applicability predicate ids that hold for YOUR specific component (its content / context). ' +
    'Provide on the final call to get the complete applicable SC set + checklist.',
  ),
})

type Args = z.infer<typeof parameters>

const compose = (pattern: string | undefined, role: string | undefined, level: Level) =>
  pattern ? composeApgPattern(pattern, level) : role ? composeAriaRole(role, level) : null

export const evaluateApplicabilityTool = {
  name: 'evaluate_applicability',
  description:
    'REFINE the applicable WCAG criteria for a component beyond the structural floor that ' +
    'get_apg_pattern / get_aria_role return. Gate-first walkthrough — the same engine the website ' +
    'uses — that prunes the question set to only what your component can be affected by. Four steps: ' +
    '(1) pattern|role + level, nothing else → the coarse facet `gates` ("Any audio or video?"); ' +
    '(2) `facets` = the keys that apply → the `subgates` (finer questions) under them; ' +
    '(3) `subgates` = the ids that apply → the leaf `predicates` (yes/no on your content); ' +
    '(4) `present` = the predicate ids that hold → the COMPLETE applicable SC set + a tiered ' +
    'verification checklist. You can also jump straight to step 4 with `present` if you already ' +
    'know which predicates hold. Then resolve the checklist (audit_html for axe, inspect markup for ' +
    'the agent tier, ask the user for the human tier) and roll it up with evaluate_verification.',
  parameters,
  execute: async ({ pattern, role, level, facets, subgates, present }: Args): Promise<string> => {
    const composed = compose(pattern, role, level)
    if (!composed) return JSON.stringify({ error: 'Provide a known `pattern` (APG) or `role` (ARIA).' })
    const facts = factsFromComposition(composed)
    const step = refineApplicability(facts, level, { facets, subgates, present })

    if (step.mode === 'facets') {
      return JSON.stringify({
        mode: 'gates',
        level,
        instruction:
          'Answer which of these your component involves, then call again with `facets` = the keys that apply.',
        gates: step.gates.map((g) => ({
          facet: g.facet,
          question: g.question,
          predicate_count: g.predicateCount,
        })),
      })
    }

    if (step.mode === 'subgates') {
      return JSON.stringify({
        mode: 'subgates',
        level,
        facets_selected: step.selectedFacets,
        instruction: 'Pick the subgate ids that apply, then call again with `subgates` = those ids.',
        subgates: step.subgates.map((s) => ({
          id: s.id,
          facet: s.facet,
          question: s.question,
          predicate_count: s.predicateCount,
        })),
        ...(step.unknownFacets.length ? { unknown_facets: step.unknownFacets } : {}),
      })
    }

    if (step.mode === 'predicates') {
      return JSON.stringify({
        mode: 'questions',
        level,
        subgates_selected: step.selectedSubgates,
        instruction: 'Decide which of these hold for your component, then call again with `present` = those predicate ids.',
        content_dependent_questions: step.predicates.map((p) => ({ predicate: p.predicate, question: p.question })),
        ...(step.unknownSubgates.length ? { unknown_subgates: step.unknownSubgates } : {}),
      })
    }

    // result. Agent-tier checks carry an SC-linked `probe` when one exists — a
    // runnable recipe (setup + measure) to execute in your browser (e.g. the
    // Playwright MCP: browser_resize / inject the CSS, then browser_evaluate the
    // measure), then feed the predicate back to evaluate_verification.
    const check = (p: VerifPred) => {
      const probe = probeFor(p)
      return {
        predicate: p,
        check: VERIF_META[p]?.definition,
        ...(probe ? { probe: { settles: probe.settles, title: probe.title, setup: probe.setup, measure: probe.measure, residue: probe.residue } } : {}),
      }
    }
    return JSON.stringify({
      mode: 'result',
      level,
      applicable_scs: step.applies.map((id) => ({ id, title: SC_TITLE[id]?.title, level: SC_TITLE[id]?.level })),
      verification_checklist: {
        automated_axe: step.plan.axe.map(check),
        agent_verifiable: step.plan.agent.map(check),
        needs_human: step.plan.human.map(check),
      },
      ...(step.unknownPresent.length ? { unknown_predicates: step.unknownPresent } : {}),
    })
  },
}
