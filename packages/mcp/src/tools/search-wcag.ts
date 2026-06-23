import { z } from 'zod'
import { search } from 'wcag-query'

const parameters = z.object({
  query: z.string().describe('Term to match against SC id, title, and statement, e.g. "focus", "contrast", "name".'),
  level: z
    .enum(['A', 'AA', 'AAA'])
    .default('AA')
    .describe('Conformance level (cumulative): AA keeps A + AA, AAA keeps all.'),
})

type Args = z.infer<typeof parameters>

export const searchWcagTool = {
  name: 'search_wcag',
  description:
    'Search WCAG Success Criteria by keyword, gated to a conformance level. Returns ' +
    'id / level / title. Use get_wcag_sc for the full SC with techniques and failures. ' +
    '(Most drill-down flows reach SCs via search_act; use this for direct keyword lookups.)',
  parameters,
  execute: async ({ query, level }: Args): Promise<string> => {
    const results = search(query, { level })
    return JSON.stringify({
      query,
      level,
      count: results.length,
      results: results.map((sc) => ({ id: sc.id, level: sc.level, title: sc.title })),
    })
  },
}
