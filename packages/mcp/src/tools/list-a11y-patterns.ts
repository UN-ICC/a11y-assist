import { z } from 'zod'
import { listPatterns, type Platform } from 'a11y-core'

const parameters = z.object({
  platform: z
    .enum(['web', 'react-native'])
    .default('web')
    .describe(
      'Target platform. APG pattern list is the same on both; the primitives ' +
      'list is platform-specific (HTML primitives for web, RN primitives for react-native).',
    ),
})

type Args = z.infer<typeof parameters>

export const listA11yPatternsTool = {
  name: 'list_a11y_patterns',
  description:
    'Enumerate the accessibility patterns this server can resolve on the given platform. ' +
    'Returns { apg_patterns: string[], primitives: string[] }. ' +
    'apg_patterns are universal semantic recipes (e.g. dialog, tabs, listbox); ' +
    'primitives are platform-native components (e.g. textbox, link, img on web; ' +
    'textbox, button, switch, dialog on react-native). ' +
    'Call before get_a11y_pattern when uncertain which role to look up. Aliases ' +
    'like "modal" → dialog, "input" → textbox, "a" → link are accepted by ' +
    'get_a11y_pattern but not enumerated here (only canonical roles).',
  parameters,
  execute: async ({ platform }: Args): Promise<string> =>
    JSON.stringify(listPatterns(platform as Platform)),
}
