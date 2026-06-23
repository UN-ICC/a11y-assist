/**
 * Tier 3 — provenance / snapshot metadata consistency.
 * The snapshot block must agree with the data actually shipped.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { successCriteria, techniques, failures, WCAG_SNAPSHOT } from '../src/index.js'

test('snapshot counts equal the real dataset sizes', () => {
  assert.equal(WCAG_SNAPSHOT.sc_count, successCriteria.size, 'sc_count')
  assert.equal(WCAG_SNAPSHOT.technique_count, techniques.size, 'technique_count')
  assert.equal(WCAG_SNAPSHOT.failure_count, failures.size, 'failure_count')
})

test('date is an ISO-8601 date', () => {
  assert.match(WCAG_SNAPSHOT.date, /^\d{4}-\d{2}-\d{2}/)
})
