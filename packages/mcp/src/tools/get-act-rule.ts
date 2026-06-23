import { z } from 'zod'
import { getRule } from 'act-rules-query'

const parameters = z.object({
  id: z.string().describe('ACT rule id (6-char), e.g. "97a4e1". From a search_act result.'),
})

type Args = z.infer<typeof parameters>

export const getActRuleTool = {
  name: 'get_act_rule',
  description:
    'Return the full verbatim ACT rule by id — name, description, applicability text, ' +
    'covered WCAG SC ids, input aspects, and canonical url.',
  parameters,
  execute: async ({ id }: Args): Promise<string> => {
    const rule = getRule(id)
    if (!rule) return JSON.stringify({ error: `No ACT rule with id "${id}".` })
    return JSON.stringify(rule)
  },
}
