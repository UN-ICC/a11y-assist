/**
 * Applicability + verification engine (experimental).
 *
 * Pipeline: a component's structure → `auto` predicate values (deriveAuto); the
 * facet tree drives a selection of the remaining predicates (selectionToTruth);
 * the merged assignment is evaluated against the WCAG applicability expressions
 * (evaluateApplicability) to yield the applicable SCs; those drive a tiered
 * verification plan (planVerification) and, once values are gathered,
 * a per-SC pass/fail/unverified result (evaluateVerification).
 *
 * Data is generated from packages/core/classify/*.json by
 * scripts/gen-applicability.mjs. See docs: /classifier/.
 */
export {
  deriveAuto,
  selectionToTruth,
  buildAssignment,
  factsFromComposition,
  AUTO_PREDICATES,
  type ComponentFacts,
} from './derive.js'

export {
  evalExpr,
  evaluateApplicability,
  planVerification,
  evaluateVerification,
  type Tri,
  type ApplicabilityResult,
  type VerificationPlan,
  type VerificationStatus,
} from './evaluate.js'

export {
  SC_IDS,
  APPLICABILITY_PREDICATES,
  VERIFICATION_PREDICATES,
  FACET_KEYS,
  APPL_META,
  VERIF_META,
  APPL_EXPR,
  VERIF_EXPR,
  SC_TITLE,
  FACETS,
  PREDICATE_FACET,
  type Scope,
  type ApplClass,
  type VerifTier,
  type SCId,
  type ApplicabilityPredicate,
  type VerificationPredicate,
  type FacetKey,
  type ApplMeta,
  type VerifMeta,
  type SubGate,
  type Facet,
} from './data.js'
