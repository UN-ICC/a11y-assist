/**
 * Composition contract + the mechanical guarantees that replaced the editorial
 * layer: deterministic drill-down seeds and level-gated ACT search.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  composeApgPattern,
  composeAriaRole,
  listApgPatterns,
  searchAct,
} from '../src/index.js'
import { getSC } from 'wcag-query'

const LEVEL_ORDER = { A: 1, AA: 2, AAA: 3 } as const

test('composeApgPattern returns verbatim card + mechanical fields', () => {
  const c = composeApgPattern('dialog')
  assert.ok(c, 'expected a composition for dialog')
  assert.equal(c.apg.role, 'dialog')
  assert.ok(c.apg.about_this_pattern.length > 0, 'verbatim APG card present')
  assert.ok('dialog' in c.aria_contract, 'ARIA contract keyed by role')
  assert.ok(c.native_elements.some((e) => e.tag === 'dialog'), 'native <dialog> surfaced')
  assert.ok(c.suggested_queries.length > 0)
})

test('suggested_queries are deterministic, deduped (by tool+query), level-stamped', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const keys = c.suggested_queries.map((q) => `${q.tool}|${q.query}`)
  assert.equal(new Set(keys).size, keys.length, 'no duplicate (tool, query) pairs')
  for (const q of c.suggested_queries) {
    assert.ok(q.tool === 'search_act' || q.tool === 'search_wcag', `unexpected tool ${q.tool}`)
    assert.equal(q.level, 'AA')
    assert.ok(q.why.length > 0, 'each seed records its structural source')
  }
  // Golden: role name + keyboard signal (dialog has a keyboard table).
  const actQ = c.suggested_queries.filter((q) => q.tool === 'search_act').map((q) => q.query)
  assert.ok(actQ.includes('dialog'), 'seeds the role name for ACT')
  assert.ok(actQ.includes('focus') && actQ.includes('keyboard'), 'seeds focus/keyboard for ACT')
})

test('suggested_queries include both ACT and WCAG searches', () => {
  const c = composeApgPattern('dialog', 'AA')
  assert.ok(c)
  const tools = new Set(c.suggested_queries.map((q) => q.tool))
  assert.ok(tools.has('search_act'), 'expected search_act seeds')
  assert.ok(tools.has('search_wcag'), 'expected search_wcag seeds')
})

test('level is stamped through to the seeds', () => {
  const c = composeApgPattern('dialog', 'AAA')
  assert.ok(c)
  assert.ok(c.suggested_queries.every((q) => q.level === 'AAA'))
})

test('aliases resolve (navigation only)', () => {
  assert.equal(composeApgPattern('modal')?.apg.role, 'dialog')
  assert.equal(composeAriaRole('input')?.role, 'textbox')
})

test('unknown entries return null', () => {
  assert.equal(composeApgPattern('definitely-not-a-pattern'), null)
  assert.equal(composeAriaRole('definitely-not-a-role'), null)
})

test('composeAriaRole serves primitives APG does not cover', () => {
  const c = composeAriaRole('textbox')
  assert.ok(c, 'expected a composition for textbox')
  assert.ok('textbox' in c.aria_contract)
  assert.ok(c.native_elements.some((e) => e.tag === 'input'), 'native <input> surfaced')
  assert.ok(c.suggested_queries.some((q) => q.query === 'textbox'))
})

test('listApgPatterns is non-empty and sorted', () => {
  const list = listApgPatterns()
  assert.ok(list.length > 0)
  assert.deepEqual(list, [...list].sort())
})

test('searchAct returns gated rules whose SCs are all within level', () => {
  for (const level of ['A', 'AA'] as const) {
    const rules = searchAct('button', level)
    assert.ok(rules.length > 0, `expected ACT rules for "button" at ${level}`)
    for (const r of rules) {
      assert.ok(r.wcag_sc_ids.length > 0, `${r.id}: gated rules keep only in-scope SCs`)
      for (const id of r.wcag_sc_ids) {
        const sc = getSC(id)
        assert.ok(sc, `${id}: resolves in wcag-query`)
        assert.ok(LEVEL_ORDER[sc.level] <= LEVEL_ORDER[level], `${id} (${sc.level}) within ${level}`)
      }
    }
  }
})

test('searchAct A-scope is a subset of AA-scope', () => {
  const a = new Set(searchAct('button', 'A').map((r) => r.id))
  const aa = new Set(searchAct('button', 'AA').map((r) => r.id))
  for (const id of a) assert.ok(aa.has(id), `${id}: A-scope rule must also appear in AA-scope`)
})
