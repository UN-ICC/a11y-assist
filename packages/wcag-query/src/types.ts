/**
 * A WCAG 2.2 Success Criterion.
 *
 * SCs are the testable requirements. Each SC has a level (A / AA / AAA) and
 * is conformance-required at that level. Each SC has Understanding / Techniques
 * pages explaining how to satisfy it and how it commonly fails.
 */
export interface SuccessCriterion {
  /** SC number, e.g. '2.4.7'. */
  id: string

  /** Conformance level. */
  level: 'A' | 'AA' | 'AAA'

  /** SC title, e.g. 'Focus Visible'. */
  title: string

  /** Verbatim SC statement (the normative text). */
  short_text: string

  /** URL to the Understanding page for this SC. */
  understanding_url: string

  /**
   * IDs of WCAG techniques that, when used, are sufficient to satisfy this SC.
   * Techniques are coded like 'G149', 'ARIA9', 'C15'.
   */
  technique_ids: string[]

  /**
   * IDs of WCAG documented failures for this SC. Failures are coded like 'F78', 'F89'.
   * These are the normative anti-patterns — what NOT to do.
   */
  failure_ids: string[]
}

/**
 * A WCAG technique or failure entry. Both share the same shape; the `kind`
 * field distinguishes them. Failures are W3C-documented antipatterns.
 */
export interface Technique {
  /** Technique ID, e.g. 'G149', 'F78', 'ARIA9'. */
  id: string

  /** Whether this is a sufficient technique, advisory technique, or failure. */
  kind: 'sufficient' | 'advisory' | 'failure'

  /** Verbatim title from the technique page. */
  title: string

  /** SC IDs this technique applies to. */
  applicable_sc_ids: string[]

  /** Canonical W3C URL. */
  url: string
}

/** Snapshot metadata. */
export interface WCAGSnapshot {
  /** ISO-8601 date the upstream HTML was fetched. */
  date: string
  /** WCAG version. */
  version: '2.2'
  /** Number of SCs in the dataset. */
  sc_count: number
  /** Number of techniques in the dataset. */
  technique_count: number
  /** Number of failures in the dataset. */
  failure_count: number
}
