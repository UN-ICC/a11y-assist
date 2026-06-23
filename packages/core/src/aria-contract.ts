/**
 * Derives the authoritative ARIA contract for a role from the aria-query
 * package, which is a machine-readable extraction of the WAI-ARIA 1.2 spec.
 */

import { roles } from 'aria-query'

export interface AriaContract {
  required_props: string[]
  supported_props: string[]
  required_owned_elements: string[][]
  accessible_name_required: boolean
  name_from: string[]
  abstract: boolean
  spec_url: string
}

interface RuntimeRoleDef {
  requiredProps?: Record<string, unknown>
  props?: Record<string, unknown>
  requiredOwnedElements?: string[][]
  accessibleNameRequired?: boolean
  nameFrom?: string[]
  abstract?: boolean
}

export function deriveAriaContract(roleName: string): AriaContract | null {
  const raw = roles.get(roleName as Parameters<typeof roles.get>[0])
  if (!raw) return null
  const def = raw as unknown as RuntimeRoleDef
  return {
    required_props: Object.keys(def.requiredProps ?? {}),
    supported_props: Object.keys(def.props ?? {}),
    required_owned_elements: def.requiredOwnedElements ?? [],
    accessible_name_required: def.accessibleNameRequired ?? false,
    name_from: def.nameFrom ?? [],
    abstract: def.abstract ?? false,
    spec_url: `https://www.w3.org/TR/wai-aria-1.2/#${roleName}`,
  }
}

export function deriveContracts(roleNames: string[]): Record<string, AriaContract> {
  const out: Record<string, AriaContract> = {}
  for (const r of roleNames) {
    const c = deriveAriaContract(r)
    if (c) out[r] = c
  }
  return out
}
