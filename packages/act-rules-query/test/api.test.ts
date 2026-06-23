/**
 * Tier 1 — API contract & smoke.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getRule, listRules, rulesByWCAG, search, rules,
} from '../src/index.js'

test('getRule resolves a known rule and rejects unknown ids', () => {
  const someId = [...rules.keys()][0]
  assert.ok(getRule(someId), 'expected a rule to resolve')
  assert.equal(getRule('zzzzzz'), undefined)
})

test('listRules is sorted, unique, and matches the map', () => {
  const list = listRules()
  assert.deepEqual(list, [...list].sort(), 'listRules must be sorted')
  assert.equal(new Set(list).size, list.length, 'listRules must be unique')
  assert.deepEqual(new Set(list), new Set(rules.keys()))
})

test('rulesByWCAG returns exactly the rules covering that SC', () => {
  // Pick a real SC that at least one rule covers, then round-trip it.
  const withSC = [...rules.values()].find((r) => r.wcag_sc_ids.length > 0)
  assert.ok(withSC, 'expected at least one rule with a WCAG mapping')
  const sc = withSC.wcag_sc_ids[0]
  const matched = rulesByWCAG(sc)
  assert.ok(matched.length > 0, `expected rules for SC ${sc}`)
  for (const r of matched) {
    assert.ok(r.wcag_sc_ids.includes(sc), `${r.id}: must include ${sc}`)
  }
})

test('rulesByWCAG returns [] for an SC no rule covers', () => {
  assert.deepEqual(rulesByWCAG('9.9.9'), [])
})

test('search matches rule name / applicability, sorted, and every hit contains the term', () => {
  const hits = search('button')
  assert.ok(hits.length > 0, 'expected matches for "button"')
  assert.deepEqual(hits.map((r) => r.id), [...hits.map((r) => r.id)].sort(), 'results sorted by id')
  for (const r of hits) {
    const inName = r.name.toLowerCase().includes('button')
    const inApplicability = r.applicability_text.toLowerCase().includes('button')
    assert.ok(inName || inApplicability, `${r.id}: term must appear in name or applicability`)
  }
})

test('search is case-insensitive and empty query returns []', () => {
  assert.deepEqual(search('BUTTON').map((r) => r.id), search('button').map((r) => r.id))
  assert.deepEqual(search('   '), [])
  assert.deepEqual(search('zzzznotpresentzzzz'), [])
})
