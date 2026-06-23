import { z } from 'zod'
import { getRolesForElement } from 'a11y-core'

const parameters = z.object({
  tag: z.string().describe('HTML tag name, e.g. "input", "a", "button", "img".'),
  attrs: z
    .record(z.string())
    .optional()
    .describe('Attribute values that affect the implicit role, e.g. { "type": "email" } for <input>.'),
})

type Args = z.infer<typeof parameters>

export const getElementRolesTool = {
  name: 'get_element_roles',
  description:
    'Resolve an HTML element (tag + attributes) to the ARIA role(s) it implicitly ' +
    'carries — verbatim from aria-query (ARIA in HTML). Use this when you have markup ' +
    'and want the role, then pass that role to get_aria_role.',
  parameters,
  execute: async ({ tag, attrs }: Args): Promise<string> =>
    JSON.stringify({ tag, attrs: attrs ?? {}, roles: getRolesForElement({ tag, attrs }) }),
}
