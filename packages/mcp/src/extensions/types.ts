// FastMCP is ESM-only; we deliberately type the parameter as `unknown`
// here so this file does not have to import from fastmcp. Extensions
// import FastMCP themselves and cast as needed.

import type { EnrichedViolation } from 'a11y-core'
export type { EnrichedViolation } from 'a11y-core'

/**
 * Contract a DS extension must satisfy. Loaded once at server startup
 * if the A11Y_MCP_EXTENSION env var is set.
 */
export interface DSExtension {
  /** Display name, e.g. "Acme DS". */
  name: string

  /** Semver string, e.g. "1.2.0". */
  version: string

  /**
   * Absolute path to a pre-built browser bundle (esbuild --platform=browser)
   * that calls axe.configure(...) with the extension's checks and rules.
   * Injected into each audit page after axe-core via page.addScriptTag.
   */
  bundlePath: string

  /**
   * axe tags this extension's rules use. Merged into the runOnly tag list
   * at audit time. Typically ['ds-rules'].
   */
  axeTags: string[]

  /**
   * Enrichment hook. Given raw axe violations and an optional component
   * hint, return enriched violations. Should match the EnrichedViolation
   * shape; the design_system field may carry arbitrary extension data.
   */
  enrich(violations: unknown[], component?: string): EnrichedViolation[]

  /**
   * Optional: register additional MCP tools (e.g. get_ds_guidelines).
   */
  registerTools?(server: unknown): void
}
