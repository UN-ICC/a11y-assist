/**
 * Deriving applicability-predicate truth values:
 *  - `deriveAuto` resolves the structural (`auto`) predicates from a component's
 *    ARIA roles + contract + native elements + keyboard table (no questions).
 *  - `selectionToTruth` turns a facet-tree selection into the non-auto values
 *    (selected = true, everything else = false — conservative: over-include).
 *  - `buildAssignment` merges the two into a total assignment.
 *
 * Pure. The auto rules read the role taxonomy from aria-query.
 */
import { roles as ariaRoles } from 'aria-query'
import { APPL_META, type ApplicabilityPredicate } from './data.js'

export interface ComponentFacts {
  roles: string[]
  accessibleNameRequired: boolean
  nativeTags: string[]
  hasKeyboardTable: boolean
}

/** Structural facts from a composeApgPattern / composeAriaRole result (duck-typed to avoid a cycle). */
export function factsFromComposition(c: {
  aria_contract: Record<string, { accessible_name_required: boolean }>
  native_elements: { canonical_id: string }[]
  apg?: { keyboard_interactions: unknown[] }
}): ComponentFacts {
  return {
    roles: Object.keys(c.aria_contract),
    accessibleNameRequired: Object.values(c.aria_contract).some((k) => k.accessible_name_required),
    nativeTags: c.native_elements.map((e) => e.canonical_id),
    hasKeyboardTable: (c.apg?.keyboard_interactions?.length ?? 0) > 0,
  }
}

const LIVE_ROLES = new Set(['alert', 'status', 'log', 'marquee', 'timer', 'alertdialog'])
const LANDMARK_ROLES = new Set(['banner', 'complementary', 'contentinfo', 'form', 'main', 'navigation', 'region', 'search'])
const WIDGET_CATS = ['widget', 'window', 'composite', 'input']

const categories = (role: string): Set<string> => {
  const def = ariaRoles.get(role as never) as { superClass?: string[][] } | undefined
  return new Set((def?.superClass ?? []).flat())
}

/** Rules for each `auto` predicate, keyed by predicate id. */
const AUTO_RULES: Record<string, (f: ComponentFacts & { isWidget: boolean; isInput: boolean; isLandmark: boolean; isLive: boolean }) => boolean> = {
  'ui-component-present': (f) => f.roles.length > 0,
  'functionality-present': (f) => f.isWidget || f.hasKeyboardTable,
  'link-present': (f) => f.roles.includes('link') || f.nativeTags.includes('a'),
  'heading-present': (f) => f.roles.includes('heading'),
  'region-present': (f) => f.isLandmark,
  'status-message-present': (f) => f.isLive,
  'target-for-pointer-input-present': (f) => f.isWidget,
  'ui-component-receives-keyboard-focus': (f) => f.isWidget,
  'ui-component-receives-focus': (f) => f.isWidget,
  'keyboard-focus-can-be-moved-to-component': (f) => f.isWidget || f.hasKeyboardTable,
  'keyboard-operable-user-interface-present': (f) => f.isWidget || f.hasKeyboardTable,
  'ui-component-setting-can-be-changed': (f) => f.isInput,
  'label-present': (f) => f.accessibleNameRequired,
  'content-with-view-and-operation-present': (f) => f.roles.length > 0 && (f.isWidget || f.hasKeyboardTable),
  'ui-component-visual-information-present': (f) => f.roles.length > 0,
  'web-page-navigable-sequentially': (f) => f.isWidget || f.hasKeyboardTable,
  // environment constants (true for any web component)
  'content-present': () => true,
  'content-implemented-using-markup-languages': () => true,
  'content-using-markup-supporting-text-style-properties': () => true,
  'implemented-with-technology-supporting-input-purpose-identification': () => true,
  'input-modality-available-on-platform': () => true,
  'web-page-present': () => true,
}

/** The set of `auto` applicability predicates, from the generated metadata. */
export const AUTO_PREDICATES: ApplicabilityPredicate[] =
  (Object.keys(APPL_META) as ApplicabilityPredicate[]).filter((p) => APPL_META[p].class === 'auto')

/** Resolve the structural (`auto`) predicates from a component's facts. Total over AUTO_PREDICATES. */
export function deriveAuto(facts: ComponentFacts): Record<ApplicabilityPredicate, boolean> {
  const f = {
    ...facts,
    isWidget: facts.roles.some((r) => WIDGET_CATS.some((c) => categories(r).has(c))),
    isInput: facts.roles.some((r) => categories(r).has('input')),
    isLandmark: facts.roles.some((r) => LANDMARK_ROLES.has(r) || categories(r).has('landmark')),
    isLive: facts.roles.some((r) => LIVE_ROLES.has(r)),
  }
  const out = {} as Record<ApplicabilityPredicate, boolean>
  for (const p of AUTO_PREDICATES) out[p] = AUTO_RULES[p] ? AUTO_RULES[p](f) : false
  return out
}

/** Non-auto predicates: selected = true, everything else = false. */
export function selectionToTruth(
  selected: Iterable<ApplicabilityPredicate>,
): Record<ApplicabilityPredicate, boolean> {
  const sel = new Set(selected)
  const out = {} as Record<ApplicabilityPredicate, boolean>
  for (const p of Object.keys(APPL_META) as ApplicabilityPredicate[]) {
    if (APPL_META[p].class === 'auto') continue
    out[p] = sel.has(p)
  }
  return out
}

/** Total applicability assignment: auto (derived) merged with the facet selection. */
export function buildAssignment(
  facts: ComponentFacts,
  selected: Iterable<ApplicabilityPredicate>,
): Record<ApplicabilityPredicate, boolean> {
  return { ...selectionToTruth(selected), ...deriveAuto(facts) }
}
