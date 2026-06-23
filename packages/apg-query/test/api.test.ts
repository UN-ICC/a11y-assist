/**
 * Tier 1 — API contract & smoke.
 * The public surface behaves as documented: lookups resolve, unknowns are
 * graceful, and the enumerations are consistent with the underlying map.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { getPattern, listPatterns, patterns, APG_SNAPSHOT } from '../src/index.js'

test('getPattern resolves a known pattern', () => {
  const button = getPattern('button')
  assert.ok(button, 'expected a "button" pattern')
  assert.equal(button.role, 'button')
})

test('getPattern is case-insensitive', () => {
  assert.deepEqual(getPattern('Button'), getPattern('button'))
})

test('getPattern returns undefined for an unknown role', () => {
  assert.equal(getPattern('definitely-not-a-pattern'), undefined)
})

test('listPatterns is sorted, unique, and matches the map', () => {
  const list = listPatterns()
  assert.ok(list.length > 0, 'expected at least one pattern')
  assert.deepEqual(list, [...list].sort(), 'listPatterns must be sorted')
  assert.equal(new Set(list).size, list.length, 'listPatterns must be unique')
  assert.equal(list.length, patterns.size)
  assert.deepEqual(new Set(list), new Set(patterns.keys()))
})

test('every map key equals its pattern role (canonical, lowercased)', () => {
  for (const [key, pattern] of patterns) {
    assert.equal(key, pattern.role)
    assert.equal(key, key.toLowerCase())
  }
})

test('snapshot pattern_count matches the dataset size', () => {
  assert.equal(APG_SNAPSHOT.pattern_count, patterns.size)
})
