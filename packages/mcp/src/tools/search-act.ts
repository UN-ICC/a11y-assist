import { z } from 'zod'
import { searchAct } from 'a11y-core'

const parameters = z.object({
  query: z.string().describe('A term to match against ACT rule names and applicability text — typically a role name, ARIA attribute, or element from a suggested_query.'),
  level: z
    .enum(['A', 'AA', 'AAA'])
    .default('AA')
    .describe('Conformance level (cumulative). Rules are kept only if they cover a WCAG SC at or below this level; each rule\'s wcag_sc_ids are trimmed to in-scope SCs.'),
})

type Args = z.infer<typeof parameters>

export const searchActTool = {
  name: 'search_act',
  description:
    'DRILL-DOWN hub. Search ACT conformance-test rules and get the WCAG Success ' +
    'Criteria they cover (the one mechanical ACT→SC bridge), gated to your level. ' +
    'Feed it the terms from an entry point\'s suggested_queries. Then call get_wcag_sc ' +
    'on the returned SC ids for full requirements.',
  parameters,
  execute: async ({ query, level }: Args): Promise<string> => {
    const rules = searchAct(query, level)
    const scIds = Array.from(new Set(rules.flatMap((r) => r.wcag_sc_ids))).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true }),
    )
    return JSON.stringify({
      query,
      level,
      count: rules.length,
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        wcag_sc_ids: r.wcag_sc_ids,
        url: r.url,
        applicability: r.applicability_text.slice(0, 300),
      })),
      suggested_queries: scIds.map((id) => ({ tool: 'get_wcag_sc', id })),
    })
  },
}
