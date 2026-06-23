/**
 * Public re-export of the small editorial role-bindings table. Lets other
 * packages in the monorepo consume this data through a stable surface without
 * reaching into core's internal paths.
 *
 * The data is the single source of truth for: per-role WCAG SC supplements,
 * web (HTML) primitive bindings, and React Native primitive bindings.
 */

import { createRequire } from 'node:module'

const requireFromHere = createRequire(import.meta.url)

export interface PrimitiveBindingRN {
  rn_component: string
  rn_doc_url: string
  rn_a11y_doc_url: string
}

export interface RoleBinding {
  wcag_sc_ids: string[]
  rn_primitive: PrimitiveBindingRN | null
}

export const roleBindings = requireFromHere('./data/role-bindings.json') as Record<string, RoleBinding>
