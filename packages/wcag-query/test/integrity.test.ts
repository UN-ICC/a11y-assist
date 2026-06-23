/**
 * Tier 2 — data integrity & referential consistency.
 * This is the package's core guarantee: every cross-reference resolves, IDs are
 * well-formed, and the two record kinds (techniques vs failures) are kept
 * distinct. These are hard assertions because the dataset currently satisfies
 * them with zero dangling references.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { successCriteria, techniques, failures } from '../src/index.js'

const isUrl = (s: unknown): boolean => {
  try {
    new URL(String(s))
    return true
  } catch {
    return false
  }
}
const nonEmptyString = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0

test('every success criterion is well-formed', () => {
  for (const [id, sc] of successCriteria) {
    assert.equal(sc.id, id, `${id}: id must match its map key`)
    assert.match(sc.id, /^\d+\.\d+\.\d+$/, `${id}: id format`)
    assert.ok(['A', 'AA', 'AAA'].includes(sc.level), `${id}: level`)
    assert.ok(nonEmptyString(sc.title), `${id}: title`)
    assert.ok(nonEmptyString(sc.short_text), `${id}: short_text`)
    assert.ok(isUrl(sc.understanding_url), `${id}: understanding_url`)
    assert.ok(Array.isArray(sc.technique_ids), `${id}: technique_ids`)
    assert.ok(Array.isArray(sc.failure_ids), `${id}: failure_ids`)
  }
})

test('every SC technique_id resolves in the techniques map', () => {
  for (const [id, sc] of successCriteria) {
    for (const tid of sc.technique_ids) {
      assert.ok(techniques.has(tid), `${id}: dangling technique_id "${tid}"`)
    }
  }
})

test('every SC failure_id resolves in the failures map', () => {
  for (const [id, sc] of successCriteria) {
    for (const fid of sc.failure_ids) {
      assert.ok(failures.has(fid), `${id}: dangling failure_id "${fid}"`)
    }
  }
})

test('techniques map holds only sufficient/advisory entries, well-formed', () => {
  for (const [id, t] of techniques) {
    assert.equal(t.id, id, `${id}: id must match its map key`)
    assert.ok(['sufficient', 'advisory'].includes(t.kind), `${id}: unexpected kind "${t.kind}"`)
    assert.ok(nonEmptyString(t.title), `${id}: title`)
    assert.ok(isUrl(t.url), `${id}: url`)
    assert.ok(Array.isArray(t.applicable_sc_ids), `${id}: applicable_sc_ids`)
  }
})

test('failures map holds only failure entries, well-formed', () => {
  for (const [id, f] of failures) {
    assert.equal(f.id, id, `${id}: id must match its map key`)
    assert.equal(f.kind, 'failure', `${id}: failures must have kind "failure"`)
    assert.ok(nonEmptyString(f.title), `${id}: title`)
    assert.ok(isUrl(f.url), `${id}: url`)
  }
})
