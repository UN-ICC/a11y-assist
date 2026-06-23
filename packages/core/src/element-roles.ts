/**
 * Adapter over `aria-query`'s `roleElements` and `elementRoles` maps.
 *
 * Re-shapes aria-query's verbose element specs into a typed `ElementSpec`
 * with a stable `canonical_id` suitable for URL fragments. The data is the
 * authoritative answer to "which native HTML elements carry this role
 * implicitly?" — used by `loadPattern` to populate `web_elements`.
 */

// aria-query's @types declare a stricter constraint enum than the runtime data
// uses (the actual values include `'set' | 'undefined'` plus free-form scoping
// strings, not the documented `'unset' | '>1'`). We treat the raw entries as
// unknown and re-shape into our typed `ElementSpec`.
import * as ariaQuery from 'aria-query'

const roleElements = ariaQuery.roleElements as unknown as {
  get: (role: string) => AriaQueryElement[] | undefined
  entries: () => Array<[string, AriaQueryElement[]]>
}

const elementRoles = ariaQuery.elementRoles as unknown as {
  entries: () => Array<[AriaQueryElement, string[]]>
}

export interface AttributeConstraint {
  name: string
  /** Explicit attribute value, e.g. `type=email`. Mutually exclusive with `presence`. */
  value?: string
  /**
   * `'set'` — attribute must be present (any value).
   * `'undefined'` — attribute must be absent.
   * Omitted when `value` is set.
   */
  presence?: 'set' | 'undefined'
}

export interface ElementSpec {
  /** HTML tag name, lowercase. */
  tag: string
  /** Required attribute constraints, sorted by name for stable serialization. */
  attributes: AttributeConstraint[]
  /** Verbatim element-level scoping notes from aria-query (e.g. "scoped to the body element"). */
  constraints: string[]
  /** Stable serialization for graph node ids and URL fragments. */
  canonical_id: string
  /** The ARIA role this element implicitly carries — context for composite
   *  patterns where elements may come from non-primary roles. */
  implicit_role: string
}

interface AriaQueryAttribute {
  name: string
  value?: string
  constraints?: ('set' | 'undefined')[]
}

interface AriaQueryElement {
  name: string
  attributes?: AriaQueryAttribute[]
  constraints?: string[]
}

function normalizeAttribute(a: AriaQueryAttribute): AttributeConstraint {
  if (a.value !== undefined) {
    return { name: a.name, value: a.value }
  }
  const presence = a.constraints?.[0]
  if (presence === 'set' || presence === 'undefined') {
    return { name: a.name, presence }
  }
  // Bare `{ name }` — treat as presence:'set' (rare; aria-query data is irregular here).
  return { name: a.name, presence: 'set' }
}

function attrToFragment(a: AttributeConstraint): string {
  if (a.value !== undefined) return `[${a.name}=${a.value}]`
  if (a.presence === 'undefined') return `[!${a.name}]`
  return `[${a.name}]`
}

function toCanonicalId(tag: string, attributes: AttributeConstraint[]): string {
  return tag + attributes.map(attrToFragment).join('')
}

function normalizeElement(raw: AriaQueryElement, role: string): ElementSpec {
  const attrs = (raw.attributes ?? [])
    .map(normalizeAttribute)
    .sort((a, b) => a.name.localeCompare(b.name))
  return {
    tag: raw.name,
    attributes: attrs,
    constraints: raw.constraints ?? [],
    canonical_id: toCanonicalId(raw.name, attrs),
    implicit_role: role,
  }
}

/**
 * HTML elements that natively carry the given ARIA role. Returns an empty
 * array for roles with no native element (e.g. `tab`, `tablist`, `tabpanel`).
 */
export function getElementsForRole(role: string): ElementSpec[] {
  const raw = roleElements.get(role)
  if (!raw) return []
  const merged = new Map<string, ElementSpec>()
  for (const r of raw) {
    const spec = normalizeElement(r, role)
    const existing = merged.get(spec.canonical_id)
    if (existing) {
      // Merge element-level constraints across duplicate canonical ids.
      const seen = new Set(existing.constraints)
      for (const c of spec.constraints) if (!seen.has(c)) existing.constraints.push(c)
    } else {
      merged.set(spec.canonical_id, spec)
    }
  }
  return Array.from(merged.values()).sort((a, b) => a.canonical_id.localeCompare(b.canonical_id))
}

/**
 * ARIA roles natively carried by the given HTML element specification.
 *
 * Matches the supplied tag + attributes against aria-query's element specs,
 * applying every attribute and presence constraint. `attrs[name]` is treated
 * as "the attribute is set with this value"; an absent key is treated as "the
 * attribute is not set". Element-level constraints (e.g. "scoped to the body
 * element") are not enforced — those are contextual.
 */
export function getRolesForElement(spec: { tag: string; attrs?: Record<string, string> }): string[] {
  const tag = spec.tag.toLowerCase()
  const attrs = spec.attrs ?? {}
  const roles = new Set<string>()
  for (const [rawElement, rawRoles] of elementRoles.entries()) {
    if (rawElement.name !== tag) continue
    if (!matchesAttributes(rawElement.attributes ?? [], attrs)) continue
    for (const role of rawRoles) roles.add(role)
  }
  return Array.from(roles).sort()
}

function matchesAttributes(specs: AriaQueryAttribute[], attrs: Record<string, string>): boolean {
  for (const a of specs) {
    const present = a.name in attrs
    if (a.value !== undefined) {
      if (!present || attrs[a.name] !== a.value) return false
    } else if (a.constraints?.[0] === 'set') {
      if (!present) return false
    } else if (a.constraints?.[0] === 'undefined') {
      if (present) return false
    }
  }
  return true
}
