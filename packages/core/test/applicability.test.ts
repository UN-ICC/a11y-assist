/**
 * Applicability engine: codegen integrity + the derive → evaluate pipeline,
 * pinned to the dialog component.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { composeApgPattern } from '../src/index.js'
import {
  factsFromComposition, deriveAuto, buildAssignment,
  evaluateApplicability, planVerification, evaluateVerification, structuralGuidance,
  APPL_EXPR, APPL_META, VERIF_META, SC_TITLE, APPLICABILITY_PREDICATES, AUTO_PREDICATES,
} from '../src/applicability/index.js'

const OPS = new Set(['AND', 'OR', 'NOT', '(', ')', 'true'])
const tokens = (e: string) => e.replace(/\(/g, ' ( ').replace(/\)/g, ' ) ').split(/\s+/).filter(Boolean)

test('generated data is internally consistent (no orphan predicates)', () => {
  const preds = new Set<string>(APPLICABILITY_PREDICATES)
  assert.equal(Object.keys(APPL_EXPR).length, 86)
  for (const [sc, expr] of Object.entries(APPL_EXPR)) {
    for (const t of tokens(expr)) {
      if (!OPS.has(t)) assert.ok(preds.has(t), `${sc}: token "${t}" not in APPLICABILITY_PREDICATES`)
    }
  }
  // every predicate has metadata
  for (const p of APPLICABILITY_PREDICATES) assert.ok(APPL_META[p], `${p} missing meta`)
  assert.ok(AUTO_PREDICATES.length > 0 && AUTO_PREDICATES.every((p) => APPL_META[p].class === 'auto'))
})

test('deriveAuto reads dialog structure', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const auto = deriveAuto(factsFromComposition(c))
  assert.equal(auto['ui-component-present'], true)
  assert.equal(auto['link-present'], false)
  assert.equal(auto['status-message-present'], false) // dialog is not a live region
  assert.equal(auto['keyboard-operable-user-interface-present'], true) // has a keyboard table
})

test('a total assignment yields no depends; the structural floor resolves', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const r = evaluateApplicability(buildAssignment(factsFromComposition(c), []))
  assert.equal(r.depends.length, 0, 'total assignment -> no depends')
  assert.equal(r.applies.length + r.notApplicable.length, 86)
  assert.ok(r.applies.includes('4.1.2'), '4.1.2 applies (has a role)')
  assert.ok(r.notApplicable.includes('4.1.3'), '4.1.3 not applicable (no live region)')
  assert.ok(r.notApplicable.includes('1.1.1'), '1.1.1 not applicable (non-text content not selected)')
})

test('selecting a predicate flips its SC to applies', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const r = evaluateApplicability(buildAssignment(factsFromComposition(c), ['non-text-content-present']))
  assert.ok(r.applies.includes('1.1.1'), 'selecting non-text-content-present -> 1.1.1 applies')
})

test('planVerification partitions applicable SCs by tier and keeps expressions', () => {
  const plan = planVerification(['4.1.2'])
  assert.ok(plan.exprs['4.1.2'], 'keeps the obligation expression')
  const all = [...plan.axe, ...plan.agent, ...plan.human]
  assert.ok(all.length > 0)
  for (const p of all) assert.ok(VERIF_META[p], `${p} has verification meta`)
})

test('evaluateVerification never asserts conformance on unknowns', () => {
  const res = evaluateVerification(['4.1.2'], {})
  assert.equal(res['4.1.2'], 'unverified')
})

test('structuralGuidance: floor / content-dependent / excluded + checklist, level-gated', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const g = structuralGuidance(factsFromComposition(c)) // default AA
  // structural floor: a role → 4.1.2; focus visible → 2.4.7 (unconditional from structure).
  // (2.1.1 is NOT in the floor — its `AND NOT path-dependent-input-essential` exception
  //  is non-auto, so it honestly falls to content-dependent.)
  assert.ok(g.floor.includes('4.1.2'), '4.1.2 in floor')
  assert.ok(g.floor.includes('2.4.7'), '2.4.7 in floor')
  // content-dependent: only knowable from the markup → deferred to audit
  assert.ok(g.contentDependent.includes('1.1.1'), '1.1.1 (non-text content) is content-dependent')
  // structurally excluded: no live region
  assert.ok(g.excluded.includes('4.1.3'), '4.1.3 excluded (no live region)')
  // level gating: no AAA criterion leaks into any bucket at AA
  for (const sc of [...g.floor, ...g.contentDependent, ...g.excluded]) {
    assert.notEqual(SC_TITLE[sc].level, 'AAA', sc + ' (AAA) leaked at AA')
  }
  assert.ok(!g.floor.includes('2.1.3'), '2.1.3 (AAA) excluded at AA')
  // checklist is for the floor and well-formed
  const all = [...g.checklist.axe, ...g.checklist.agent, ...g.checklist.human]
  assert.ok(all.length > 0)
  for (const p of all) assert.ok(VERIF_META[p], p + ' has meta')
})

test('structuralGuidance: AAA opens up higher-level criteria', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const aa = structuralGuidance(factsFromComposition(c), 'AA')
  const aaa = structuralGuidance(factsFromComposition(c), 'AAA')
  assert.ok(aaa.floor.includes('2.1.3'), '2.1.3 (AAA) in floor at AAA')
  assert.ok(aaa.floor.length >= aa.floor.length, 'AAA floor is a superset of AA')
})
