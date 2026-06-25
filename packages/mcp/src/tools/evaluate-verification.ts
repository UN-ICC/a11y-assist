import { z } from 'zod'
import { applicability } from 'a11y-assist-core'

const { evaluateVerification, SC_TITLE, VERIFICATION_PREDICATES } = applicability
type SCId = applicability.SCId
type VerifPred = applicability.VerificationPredicate

const VALID_VERIF = new Set<string>(VERIFICATION_PREDICATES)

const parameters = z.object({
  scs: z.array(z.string()).describe('Applicable SC ids to roll up (from evaluate_applicability).'),
  pass: z.array(z.string()).optional().describe(
    'Verification predicate ids confirmed to HOLD — from axe passing (audit_html), your ' +
    'inspection of the markup, or the user confirming.',
  ),
  fail: z.array(z.string()).optional().describe('Verification predicate ids confirmed NOT to hold (violations).'),
})

type Args = z.infer<typeof parameters>

export const evaluateVerificationTool = {
  name: 'evaluate_verification',
  description:
    'Roll up a per-SC verification verdict from the checks you have resolved. Pass the ' +
    'verification predicate ids you confirmed as `pass` and `fail`; anything unresolved stays ' +
    'UNVERIFIED — never assumed to pass. Returns pass / fail / unverified per SC. This is a ' +
    'status report, NOT a conformance claim.',
  parameters,
  execute: async ({ scs, pass, fail }: Args): Promise<string> => {
    const truth: Partial<Record<VerifPred, boolean>> = {}
    for (const p of pass ?? []) truth[p as VerifPred] = true
    for (const p of fail ?? []) truth[p as VerifPred] = false
    const unmatched = [...new Set([...(pass ?? []), ...(fail ?? [])])].filter((p) => !VALID_VERIF.has(p))
    const res = evaluateVerification(scs as SCId[], truth)
    let p = 0, f = 0, u = 0
    const per_sc = (scs as SCId[]).map((sc) => {
      const status = res[sc]
      if (status === 'pass') p++
      else if (status === 'fail') f++
      else u++
      return { sc, title: SC_TITLE[sc]?.title, status }
    })
    return JSON.stringify({
      summary: { pass: p, fail: f, unverified: u },
      per_sc,
      ...(unmatched.length ? { unmatched_predicates: unmatched } : {}),
      note:
        'unverified ≠ pass — not a conformance claim. axe covers only part; agent inspection and human judgment cover the rest.' +
        (unmatched.length ? ' WARNING: unmatched_predicates were not recognised (typo?) and counted toward nothing — recheck them.' : ''),
    })
  },
}
