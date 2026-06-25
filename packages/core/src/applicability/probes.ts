/**
 * SC-linked inspection probes — knowledge, not a browser.
 *
 * The agent-tier verification predicates for the "layout family" (reflow, resize
 * text, text spacing) cannot be settled by axe and historically had no
 * scaffolding — so an agent either bluffed or hand-rolled Playwright. A probe
 * supplies the accessibility-specific recipe a11y-assist alone can give:
 * how to set the page up, what to measure, and which predicate/SC the result
 * settles. The agent runs `setup` + `measure` in WHATEVER browser it has
 * (e.g. the Playwright MCP via browser_resize + browser_evaluate), then feeds
 * the predicate back to evaluateVerification. a11y-assist never drives a browser
 * here; it only provides the judgment layer.
 *
 * `measure` is the source of an arrow function returning a boolean — `true` when
 * the MEASURABLE part of the predicate holds. `residue` names what the probe
 * cannot settle (the irreducible judgment), so a passing measurement is never
 * mistaken for a full pass.
 */
import type { VerificationPredicate, SCId } from './data.js'

export interface ProbeSetup {
  /** Resize the viewport to [width, height] in CSS pixels before measuring. */
  viewport?: [number, number]
  /** Inject this CSS (as a <style> element) before measuring. */
  injectCss?: string
}

export interface InspectionProbe {
  predicate: VerificationPredicate
  /** The Success Criterion this probe contributes to. */
  settles: SCId
  /** Short label for the check. */
  title: string
  /** How to set the page up before measuring. */
  setup: ProbeSetup
  /** Source of an arrow function, evaluated in the page; returns true = the measurable part holds. */
  measure: string
  /** What the probe canNOT settle — the residual judgment that stays with the agent/human. */
  residue: string
}

/** WCAG 1.4.12 text-spacing override values (line 1.5, paragraph 2em, letter .12em, word .16em). */
const TEXT_SPACING_CSS =
  '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } ' +
  'p { margin-bottom: 2em !important; }'

/**
 * Detect horizontal overflow of the page and vertical clipping inside any
 * overflow:hidden box — the two ways enlarged/respaced text loses content.
 * Returned as an arrow-function source so it can be passed straight to a
 * browser_evaluate-style call.
 */
const NO_OVERFLOW_OR_CLIPPING =
  '() => {' +
  ' const overflowsX = document.scrollingElement.scrollWidth > window.innerWidth + 1;' +
  ' const clipped = Array.from(document.querySelectorAll("*")).some(el => {' +
  '  const s = getComputedStyle(el);' +
  '  if (s.display === "none") return false;' +
  '  const hides = s.overflowX === "hidden" || s.overflowY === "hidden" || s.overflow === "hidden";' +
  '  return hides && (el.scrollHeight - el.clientHeight > 1 || el.scrollWidth - el.clientWidth > 1);' +
  ' });' +
  ' return !overflowsX && !clipped;' +
  '}'

export const INSPECTION_PROBES: Partial<Record<VerificationPredicate, InspectionProbe>> = {
  'no-scrolling-in-two-dimensions': {
    predicate: 'no-scrolling-in-two-dimensions',
    settles: '1.4.10',
    title: 'Reflow — no horizontal scroll at 320px',
    setup: { viewport: [320, 256] },
    measure: '() => document.scrollingElement.scrollWidth <= window.innerWidth + 1',
    residue: 'Confirms no 2-D scrolling. It does not confirm meaning/relationships survive the reflow — eyeball that the narrow layout is still understandable.',
  },
  'no-loss-of-content-or-functionality': {
    predicate: 'no-loss-of-content-or-functionality',
    settles: '1.4.4',
    title: 'Resize text to 200% — no clipping or overlap',
    setup: { injectCss: 'html { zoom: 2 } /* Chromium 200% enlargement */' },
    measure: NO_OVERFLOW_OR_CLIPPING,
    residue: 'Detects overflow/clipping after enlargement. It cannot judge whether enlarged controls remain usable or text remains readable — verify by eye.',
  },
  'no-loss-of-content-or-functionality-when-text-spacing-properties-overridden': {
    predicate: 'no-loss-of-content-or-functionality-when-text-spacing-properties-overridden',
    settles: '1.4.12',
    title: 'Apply WCAG text-spacing overrides — no clipping or overlap',
    setup: { injectCss: TEXT_SPACING_CSS },
    measure: NO_OVERFLOW_OR_CLIPPING,
    residue: 'Detects clipping/overlap under the spacing overrides. It cannot judge whether spaced text remains legible — verify by eye.',
  },
}

/** The probe for a verification predicate, if one exists. */
export function probeFor(predicate: VerificationPredicate): InspectionProbe | undefined {
  return INSPECTION_PROBES[predicate]
}
