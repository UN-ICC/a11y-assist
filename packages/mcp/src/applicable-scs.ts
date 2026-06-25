/**
 * Shapes core's structuralGuidance into an agent-friendly block for the entry
 * tools. The logic lives in a11y-assist-core; here we only enrich predicate /
 * SC ids with their titles and check descriptions for the response.
 */
import { applicability } from 'a11y-assist-core'

const { structuralGuidance, factsFromComposition, SC_TITLE, VERIF_META } = applicability

type Composition = Parameters<typeof factsFromComposition>[0]
type Level = 'A' | 'AA' | 'AAA'

export function applicableScs(composed: Composition, level: Level) {
  const g = structuralGuidance(factsFromComposition(composed), level)
  const sc = (id: applicability.SCId) => ({ id, title: SC_TITLE[id]?.title, level: SC_TITLE[id]?.level })
  const check = (p: applicability.VerificationPredicate) => ({ predicate: p, check: VERIF_META[p]?.definition })
  return {
    level: g.level,
    note:
      'Structural floor — these criteria follow from the component itself. ' +
      `${g.contentDependent.length} more may apply depending on the content/context you add ` +
      '(images, color, timing, language, …); resolve those by auditing the built markup.',
    applies_structurally: g.floor.map(sc),
    content_dependent_count: g.contentDependent.length,
    verification_checklist: {
      automated_axe: g.checklist.axe.map(check),
      agent_verifiable: g.checklist.agent.map(check),
      needs_human: g.checklist.human.map(check),
    },
  }
}
