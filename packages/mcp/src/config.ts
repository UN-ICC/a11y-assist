export const CONFIG = {
  /** axe tags applied to every audit. AA is baseline. */
  axeTags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] as string[],

  /** Selected AAA criteria (opt-in, e.g. ['wcag2aaa', 'wcag2aaa-2.4.11']). */
  aaaCriteria: [] as string[],

  /** Idle teardown of the persistent browser. */
  idleMs: 5 * 60 * 1000,
}
