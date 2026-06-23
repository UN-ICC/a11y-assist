import { z } from 'zod'
import { listApgPatterns } from 'a11y-core'

const parameters = z.object({})

export const listApgPatternsTool = {
  name: 'list_apg_patterns',
  description:
    'List the W3C APG pattern names available as entry points for get_apg_pattern ' +
    '(composite components). Native primitives are not listed here — reach those via ' +
    'get_aria_role / get_element_roles.',
  parameters,
  execute: async (): Promise<string> => JSON.stringify({ apg_patterns: listApgPatterns() }),
}
