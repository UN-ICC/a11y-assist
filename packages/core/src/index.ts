/**
 * a11y-core — pure logic shared by the MCP server (a11y-mcp) and the
 * a11y-assist website (a11y-assist-site). No I/O, no Playwright, no MCP protocol.
 *
 * Two responsibility areas:
 *   1. Pattern aggregation — composes apg-query + wcag-query + act-rules-query
 *      + aria-query + role-bindings.json into a unified `A11yPattern` shape.
 *      Public API: `loadPattern`, `listPatterns`.
 *
 *   2. Audit response shaping — turns raw axe violations into the canonical
 *      response shape. Public API: `wrapAuditResponse`, `enrichBase`,
 *      `toBaseShape`.
 *
 * Same functions, both consumers. No drift possible.
 */

export {
  loadPattern,
  listPatterns,
  type Platform,
  type A11yPattern,
  type SCExpansion,
} from './load-pattern.js'

export {
  wrapAuditResponse,
  enrichBase,
  toBaseShape,
  AUDIT_CAVEATS,
  type AuditResponse,
  type EnrichedViolation,
  type WrapAuditOptions,
} from './audit-response.js'

export {
  deriveAriaContract,
  deriveContracts,
  type AriaContract,
} from './aria-contract.js'

export {
  roleBindings,
  type RoleBinding,
  type PrimitiveBindingRN,
} from './role-bindings.js'

export {
  getElementsForRole,
  getRolesForElement,
  type ElementSpec,
  type AttributeConstraint,
} from './element-roles.js'
