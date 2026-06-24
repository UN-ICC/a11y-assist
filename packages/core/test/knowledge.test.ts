/**
 * The knowledge-base query surface (WCAG + ACT) exposed by core.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  searchWcag, getWcagSc, listWcagScs,
  getActRule, actRulesForSc, listActRules,
} from '../src/index.js'

const ORDER = { A: 1, AA: 2, AAA: 3 } as const

test('searchWcag returns SCs gated to the level', () => {
  const hits = searchWcag('focus', 'AA')
  assert.ok(hits.length > 0, 'expected SCs for "focus"')
  assert.ok(hits.every((s) => ORDER[s.level] <= ORDER.AA), 'all within AA')
})

test('getWcagSc expands techniques and failures; unknown → null', () => {
  const sc = getWcagSc('4.1.2')
  assert.ok(sc)
  assert.ok(sc.techniques.length > 0)
  assert.ok(Array.isArray(sc.failures))
  assert.equal(getWcagSc('9.9.9'), null)
})

test('listWcagScs: full set is larger than a level-filtered set', () => {
  assert.ok(listWcagScs().length > listWcagScs('A').length)
})

test('actRulesForSc returns rules that cover the SC', () => {
  const rules = actRulesForSc('4.1.2')
  assert.ok(rules.length > 0)
  for (const r of rules) assert.ok(r.wcag_sc_ids.includes('4.1.2'), `${r.id} covers 4.1.2`)
})

test('getActRule resolves a known id and rejects unknown', () => {
  const id = listActRules()[0]
  assert.ok(getActRule(id))
  assert.equal(getActRule('zzzzzz'), null)
})
