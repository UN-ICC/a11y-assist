/**
 * Tier 3 — provenance / snapshot metadata consistency.
 * The snapshot block is the package's self-description; it must agree with the
 * data actually shipped.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { patterns, APG_SNAPSHOT } from '../src/index.js'

test('pattern_count equals the real dataset size', () => {
  assert.equal(APG_SNAPSHOT.pattern_count, patterns.size)
})

test('date is an ISO-8601 date', () => {
  assert.match(APG_SNAPSHOT.date, /^\d{4}-\d{2}-\d{2}/)
})

test('apg_base is a valid https URL', () => {
  assert.doesNotThrow(() => new URL(APG_SNAPSHOT.apg_base))
  assert.ok(APG_SNAPSHOT.apg_base.startsWith('https://'), 'apg_base should be https')
})
