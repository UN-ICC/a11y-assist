import { z } from 'zod'
import { listPatterns, loadPattern, type Platform } from 'a11y-core'

const parameters = z.object({
  role: z.string().describe(
    'Role / element / pattern name. Examples: button, dialog, tabs, listbox, ' +
    'disclosure, accordion, alert, checkbox, radio, tooltip (APG patterns); ' +
    'textbox, link, img (HTML primitives — web); textbox, button, img, switch, ' +
    'dialog (RN primitives). Aliases like modal → dialog, input → textbox, a → link accepted.',
  ),
  platform: z
    .enum(['web', 'react-native'])
    .default('web')
    .describe(
      'Target platform. APG patterns return universal recipe content; primitives ' +
      'are platform-specific (HTML on web, RN components on react-native).',
    ),
})

type Args = z.infer<typeof parameters>

export const getA11yPatternTool = {
  name: 'get_a11y_pattern',
  description:
    'Return the accessibility pattern for a UI role on the requested platform. ' +
    'The response aggregates from authoritative sources: ' +
    'aria_contract is derived from aria-query (WAI-ARIA spec); ' +
    'apg_about and keyboard_interactions come from W3C APG (apg-query); ' +
    'wcag_applicable lists relevant WCAG Success Criteria with their sufficient ' +
    'techniques AND documented failures (wcag-query) — these failures replace ' +
    'editorial "common pitfalls" with W3C-published anti-patterns. ' +
    'Use BEFORE building a component; reason over the WCAG techniques + failures + ' +
    'APG keyboard table + ARIA contract to know what to do (and not do). ' +
    'Then call audit_html / audit_url to verify. ' +
    'Call list_a11y_patterns first if unsure which role names are available.',
  parameters,
  execute: async ({ role, platform }: Args): Promise<string> => {
    const pattern = loadPattern(role, platform as Platform)
    if (!pattern) {
      return JSON.stringify({
        error: `No pattern bundled for role "${role}" on platform "${platform}".`,
        available: listPatterns(platform as Platform),
        hint: 'Try the canonical role name (e.g. "textbox" not "input"), or check the available list.',
      })
    }
    return JSON.stringify(pattern)
  },
}
