/**
 * Shared audit-response shaping. Both the MCP server's audit_html / audit_url
 * tools and the website's "audit this page" button consume axe-core violations
 * via this module — guaranteeing identical response shape across surfaces.
 */

/** A single axe violation, reduced to the fields consumers need. */
export interface EnrichedViolation {
  axe_id: string
  impact: string | null
  description: string
  help_url: string
  nodes_affected: number
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

/** Reduce a raw axe violation to the consumer shape. */
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
  }
}

export interface WrapAuditOptions {
  /**
   * Optional extra caveats to append. The default `AUDIT_CAVEATS` are always
   * included; this lets a surface add e.g. "audit_html cannot evaluate dynamic
   * behaviour".
   */
  extraCaveats?: string[]
}

/**
 * The shared response shaper, used identically by the MCP audit tools (after
 * Playwright runs axe.run) and the website's audit button (after in-browser
 * axe.run) — same function, same shape.
 */
export function wrapAuditResponse(
  violations: unknown[],
  opts: WrapAuditOptions = {},
): AuditResponse {
  return {
    passed: violations.length === 0,
    violations: violations.map(toBaseShape),
    caveats: [...AUDIT_CAVEATS, ...(opts.extraCaveats ?? [])],
  }
}
