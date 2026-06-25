import { z } from 'zod'
import { composeApgPattern, listApgPatterns } from 'a11y-assist-core'
import { applicableScs } from '../applicable-scs.js'

const parameters = z.object({
  name: z.string().describe(
    'APG pattern name — e.g. dialog, tabs, combobox, accordion, listbox, ' +
    'disclosure, menubutton. Aliases like "modal" → dialog are accepted. ' +
    'Call list_apg_patterns to discover names.',
  ),
  level: z
    .enum(['A', 'AA', 'AAA'])
    .default('AA')
    .describe('Target WCAG conformance level (cumulative). Stamped into the suggested ACT queries.'),
})

type Args = z.infer<typeof parameters>

export const getApgPatternTool = {
  name: 'get_apg_pattern',
  description:
    'ENTRY POINT for building a composite component. Returns the verbatim W3C APG ' +
    'card (about, keyboard interactions, examples), the ARIA contract for its roles, ' +
    'the native HTML elements that carry them, and `suggested_queries` (ACT searches) ' +
    'to run next. Also returns `applicable_scs`: the WCAG criteria that apply from the ' +
    "component's structure alone (the floor) at the chosen level, plus a tiered " +
    'verification checklist (axe / agent / human) and a count of further criteria that ' +
    'depend on the content you add. For native primitives (text input, link, image) use ' +
    'get_aria_role instead.',
  parameters,
  execute: async ({ name, level }: Args): Promise<string> => {
    const composed = composeApgPattern(name, level)
    if (!composed) {
      return JSON.stringify({
        error: `No APG pattern for "${name}".`,
        available: listApgPatterns(),
        hint: 'For native primitives (textbox, link, img) use get_aria_role.',
      })
    }
    return JSON.stringify({ ...composed, applicable_scs: applicableScs(composed, level) })
  },
}
