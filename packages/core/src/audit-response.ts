/**
 * Shared audit-response shaping. Both the MCP server's audit_html / audit_url
 * tools and the website's "audit this page" button consume axe-core violations
 * via this module — guaranteeing identical response shape across surfaces.
 */

/**
 * Shape of an enriched violation as surfaced to consumers (agent, browser
 * audit panel, anywhere else). The default mapping in `enrichBase` populates
 * everything except `design_system`, which is null unless an extension-aware
 * enricher is provided.
 */
export interface EnrichedViolation {
  axe_id: string
  impact: string | null
  description: string
  help_url: string
  nodes_affected: number
  design_system: unknown
}

/** Final shape the agent and the website both see for an audit run. */
export interface AuditResponse {
  passed: boolean
  violations: EnrichedViolation[]
  caveats: string[]
}

/** Caveats appended to every audit response. Stable copy, single source. */
export const AUDIT_CAVEATS = [
  'Automated checks cover ~50% of WCAG. Manual screen reader, keyboard, and cognitive review still required.',
] as const

/**
 * Default base shape for a single axe violation. No extension awareness here —
 * `design_system` is always null. Extensions hook in via the `enrich` parameter
 * of `wrapAuditResponse`.
 */
export function toBaseShape(v: unknown): EnrichedViolation {
  const violation = v as {
    id: string
    impact?: string | null
    description?: string
    helpUrl?: string
    nodes?: unknown[]
  }
  return {
    axe_id: violation.id,
    impact: violation.impact ?? null,
    description: violation.description ?? '',
    help_url: violation.helpUrl ?? '',
    nodes_affected: violation.nodes?.length ?? 0,
    design_system: null,
  }
}

/** Default enricher — maps each violation through `toBaseShape`. */
export function enrichBase(violations: unknown[]): EnrichedViolation[] {
  return violations.map(toBaseShape)
}

export interface WrapAuditOptions {
  /**
   * Optional component-name hint passed through to a custom enricher.
   * Used by DS extensions to attach component-specific context.
   */
  component?: string

  /**
   * Optional custom enricher. If omitted, `enrichBase` is used.
   * MCP server passes its extension-aware enricher here when an extension is loaded.
   */
  enrich?: (violations: unknown[], component?: string) => EnrichedViolation[]

  /**
   * Optional extra caveats to append. The default `AUDIT_CAVEATS` are always
   * included; this lets specific surfaces add e.g. "audit_html cannot evaluate
   * dynamic behaviour".
   */
  extraCaveats?: string[]
}

/**
 * The shared response shaper. Used identically by:
 *   - MCP `audit_html` / `audit_url` tools (after Playwright runs axe.run)
 *   - website "Audit this page" button (after browser-side axe.run)
 *
 * Same function in both contexts → same shape in the response.
 */
export function wrapAuditResponse(
  violations: unknown[],
  opts: WrapAuditOptions = {},
): AuditResponse {
  const enriched = (opts.enrich ?? enrichBase)(violations, opts.component)
  return {
    passed: violations.length === 0,
    violations: enriched,
    caveats: [...AUDIT_CAVEATS, ...(opts.extraCaveats ?? [])],
  }
}
