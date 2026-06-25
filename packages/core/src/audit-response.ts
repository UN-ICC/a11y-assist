/**
 * Shared audit-response shaping for the MCP server's audit_html / audit_url
 * tools — one module so both produce an identical response shape. (The website
 * runs axe in-browser and shapes its own output; it does not go through here.)
 */

/** A single axe violation, reduced to the fields consumers need. */
export interface EnrichedViolation {
  axe_id: string
  impact: string | null
  description: string
  help_url: string
  nodes_affected: number
}

/** Final shape the agent sees for an audit run. */
export interface AuditResponse {
  /** True when axe found zero violations. NOT a conformance verdict — see caveats. */
  axe_passed: boolean
  /** Number of axe violations found (0 = "no automated violations", not "accessible"). */
  axe_violation_count: number
  violations: EnrichedViolation[]
  caveats: string[]
}

/** Caveats appended to every audit response. Stable copy, single source. */
export const AUDIT_CAVEATS = [
  'axe settles only a small, structural slice of WCAG (~12% of success criteria — roughly 10 of 86). ' +
    'Zero violations means "no automated violations found", NOT "accessible". The criteria axe cannot ' +
    'reach are settled by your own code review and human judgement — run evaluate_applicability to get ' +
    'the criteria that apply to this component and the checklist routing each to who can settle it.',
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
    axe_passed: violations.length === 0,
    axe_violation_count: violations.length,
    violations: violations.map(toBaseShape),
    caveats: [...AUDIT_CAVEATS, ...(opts.extraCaveats ?? [])],
  }
}
