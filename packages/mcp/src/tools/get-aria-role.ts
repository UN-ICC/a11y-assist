import { z } from 'zod'
import { composeAriaRole } from 'a11y-core'

const parameters = z.object({
  role: z.string().describe(
    'ARIA role of a native primitive — e.g. textbox, link, img, checkbox, button. ' +
    'Aliases like "input" → textbox, "a" → link are accepted. If you only have the ' +
    'markup, call get_element_roles first to resolve the element to its role(s).',
  ),
  level: z
    .enum(['A', 'AA', 'AAA'])
    .default('AA')
    .describe('Target WCAG conformance level (cumulative). Stamped into the suggested ACT queries.'),
})

type Args = z.infer<typeof parameters>

export const getAriaRoleTool = {
  name: 'get_aria_role',
  description:
    'ENTRY POINT for working on a native primitive / small element. Returns the ARIA ' +
    'contract for the role (required/supported props, name source), the native HTML ' +
    'elements that carry it, and `suggested_queries` (ACT searches) to run next. Same ' +
    'drill-down as get_apg_pattern: search_act → get_wcag_sc → audit_html. Use ' +
    'get_apg_pattern instead for composite components (dialog, tabs, …).',
  parameters,
  execute: async ({ role, level }: Args): Promise<string> => {
    const composed = composeAriaRole(role, level)
    if (!composed) {
      return JSON.stringify({
        error: `"${role}" is not a known ARIA role.`,
        hint: 'Use get_element_roles to resolve an HTML element to its role(s), or get_apg_pattern for composite components.',
      })
    }
    return JSON.stringify(composed)
  },
}
