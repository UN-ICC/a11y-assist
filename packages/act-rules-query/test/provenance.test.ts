/**
 * Tier 3 — provenance / snapshot metadata consistency.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { rules, ACT_SNAPSHOT } from '../src/index.js'

test('rule_count equals the real dataset size', () => {
  assert.equal(ACT_SNAPSHOT.rule_count, rules.size)
})

test('upstream_commit is a full 40-char git SHA', () => {
  assert.match(ACT_SNAPSHOT.upstream_commit, /^[0-9a-f]{40}$/)
})

test('date is an ISO-8601 date', () => {
  assert.match(ACT_SNAPSHOT.date, /^\d{4}-\d{2}-\d{2}/)
})
