/**
 * A single APG pattern, extracted from https://www.w3.org/WAI/ARIA/apg/patterns/<role>/.
 *
 * All string content is verbatim from the APG HTML — never paraphrased or summarised.
 * Cross-references to WCAG Success Criteria are not included here; the consumer
 * (e.g. the a11y MCP server) joins APG patterns with WCAG data via aria role tags.
 */
export interface APGPattern {
  /** Canonical short role / pattern name. e.g. 'button', 'dialog', 'tabs'. */
  role: string

  /** Display name from the APG page heading. e.g. 'Button', 'Dialog (Modal)'. */
  name: string

  /** Canonical W3C URL for the pattern page. */
  apg_url: string

  /** Verbatim text of the "About This Pattern" section. */
  about_this_pattern: string

  /**
   * ARIA roles used by the pattern. For composite patterns (e.g. tabs uses
   * tablist + tab + tabpanel) this contains all constituent roles.
   */
  aria_roles: string[]

  /**
   * Verbatim entries from the APG keyboard-interaction table.
   * Each entry has a key (or key combination) and a description of behaviour.
   */
  keyboard_interactions: KeyboardInteraction[]

  /** Links to APG-published example implementations. */
  examples: Example[]
}

export interface KeyboardInteraction {
  /** The key or key combination, e.g. 'Tab', 'Right Arrow', 'Space / Enter'. */
  key: string

  /** Verbatim description of what the key does in this pattern. */
  description: string
}

export interface Example {
  name: string
  url: string
}

/** Snapshot metadata: when and from where the data was extracted. */
export interface APGSnapshot {
  /** ISO-8601 date the upstream HTML was fetched. */
  date: string
  /** Base URL for APG pattern pages. */
  apg_base: string
  /** Number of patterns currently in the dataset. */
  pattern_count: number
}
