/**
 * a11y-assist-core — pure, mechanical composition shared by the MCP server (a11y-assist-mcp)
 * and the a11y-assist website (a11y-assist-web). No I/O, no Playwright, no MCP
 * protocol, and no editorial assertions.
 *
 * Three responsibility areas:
 *   1. Composition — given an APG pattern or an ARIA role, assemble the verbatim
 *      recipe + ARIA contract + native elements + deterministic drill-down
 *      queries (both search_act and search_wcag seeds), and run the level-gated
 *      ACT search (the one mechanical ACT→WCAG-SC bridge). API: composeApgPattern,
 *      composeAriaRole, listApgPatterns, searchAct.
 *
 *   2. Knowledge queries — the read surface over the WCAG + ACT corpora that the
 *      drill-down lands on: searchWcag, getWcagSc (SC + techniques + failures),
 *      listWcagScs, getWcagTechnique, getWcagFailure, getActRule, actRulesForSc,
 *      listActRules. The MCP tools and the website both consume these.
 *
 *   3. Audit response shaping — turn raw axe violations into the canonical
 *      response shape. API: wrapAuditResponse, toBaseShape.
 *
 * Same functions, both consumers. No drift possible.
 */

export {
  composeApgPattern,
  composeAriaRole,
  listApgPatterns,
  searchAct,
  type ComposedApgPattern,
  type ComposedAriaRole,
  type SuggestedQuery,
  type WCAGLevel,
} from './compose.js'

export {
  getWcagSc,
  searchWcag,
  listWcagScs,
  getWcagTechnique,
  getWcagFailure,
  getActRule,
  actRulesForSc,
  listActRules,
  type ExpandedSc,
  type SuccessCriterion,
  type Technique,
  type ACTRule,
} from './knowledge.js'

export {
  wrapAuditResponse,
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
  getElementsForRole,
  getRolesForElement,
  type ElementSpec,
  type AttributeConstraint,
} from './element-roles.js'
