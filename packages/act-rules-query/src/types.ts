/**
 * A W3C ACT (Accessibility Conformance Testing) Rule.
 *
 * Each rule is a tool-agnostic test specification that maps to one or more
 * WCAG Success Criteria. ACT rules are authored in YAML+Markdown at
 * https://github.com/act-rules/act-rules.github.io and published at
 * https://act-rules.github.io.
 */
export interface ACTRule {
  /** Hex slug, e.g. '5b7ae0'. */
  id: string

  /** Display name from front-matter. e.g. 'Image button has accessible name'. */
  name: string

  /** Front-matter rule_type. */
  rule_type: 'atomic' | 'composite'

  /** Verbatim description from front-matter. */
  description: string

  /**
   * WCAG Success Criterion IDs this rule covers as a CONFORMANCE rule
   * (filtered to entries with `forConformance: true`). Stripped of the
   * 'wcagXX:' prefix — e.g. 'wcag20:4.1.2' becomes '4.1.2'.
   */
  wcag_sc_ids: string[]

  /**
   * Secondary SC associations — rules where this rule overlaps but isn't
   * conformance-determining. Useful context but should not drive applicability
   * decisions.
   */
  wcag_sc_ids_secondary: string[]

  /** Input aspects this rule needs (e.g. 'DOM Tree', 'CSS Styling'). */
  input_aspects: string[]

  /** Verbatim text of the '## Applicability' Markdown section. */
  applicability_text: string

  /** Verbatim text of each '## Expectation' section — the conditions that must hold to pass. */
  expectations: string[]

  /** Worked examples from the '## Examples' section, by outcome. */
  examples: ACTExample[]

  /** Verbatim '## Background' prose (excluding its sub-sections). */
  background: string

  /** Verbatim 'Assumptions' section, if any. */
  assumptions: string

  /** Verbatim 'Accessibility Support' section, if any. */
  accessibility_support: string

  /** Canonical URL on act-rules.github.io. */
  url: string
}

/** A worked example from an ACT rule's '## Examples' section. */
export interface ACTExample {
  /** 'passed' | 'failed' | 'inapplicable'. */
  category: 'passed' | 'failed' | 'inapplicable'
  /** Example heading, e.g. 'Passed Example 1'. */
  name: string
  /** Prose describing the example (verbatim, whitespace-collapsed). */
  description: string
  /** The example's code (first fenced block), verbatim. */
  code: string
}

/** Snapshot metadata. */
export interface ACTSnapshot {
  /** ISO-8601 date the upstream snapshot was taken. */
  date: string
  /** Upstream Git commit hash from act-rules/act-rules.github.io. */
  upstream_commit: string
  /** Number of rules in the dataset. */
  rule_count: number
}
