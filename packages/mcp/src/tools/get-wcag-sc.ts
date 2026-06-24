import { z } from 'zod'
import { getWcagSc } from 'a11y-assist-core'

const parameters = z.object({
  id: z.string().describe('WCAG 2.2 Success Criterion id, e.g. "4.1.2". From a search_act / search_wcag result.'),
})

type Args = z.infer<typeof parameters>

export const getWcagScTool = {
  name: 'get_wcag_sc',
  description:
    'Return a WCAG 2.2 Success Criterion in full: its verbatim statement plus its ' +
    'sufficient techniques and documented failures (the W3C-published anti-patterns). ' +
    'Explicit by-id fetch — not level-gated.',
  parameters,
  execute: async ({ id }: Args): Promise<string> => {
    const sc = getWcagSc(id)
    if (!sc) return JSON.stringify({ error: `No WCAG Success Criterion with id "${id}".` })
    return JSON.stringify(sc)
  },
}
