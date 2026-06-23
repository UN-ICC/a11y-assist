/**
 * Tier 2 — data integrity.
 * Every rule is well-formed. Note: an empty `wcag_sc_ids` is legitimate — many
 * ACT rules are ARIA-spec-only and carry no primary conformance mapping — so we
 * validate the shape of the ids that ARE present rather than requiring any.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { rules } from '../src/index.js'

const isUrl = (s: unknown): boolean => {
  try {
    new URL(String(s))
    return true
  } catch {
    return false
  }
}
const nonEmptyString = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0
const SC_ID = /^\d+\.\d+\.\d+$/

test('every rule is well-formed', () => {
  for (const [id, r] of rules) {
    assert.equal(r.id, id, `${id}: id must match its map key`)
    assert.match(r.id, /^[0-9a-z]{6}$/, `${id}: id format (6 lowercase alphanumerics)`)
    assert.ok(nonEmptyString(r.name), `${id}: name`)
    assert.ok(['atomic', 'composite'].includes(r.rule_type), `${id}: rule_type`)
    assert.ok(nonEmptyString(r.description), `${id}: description`)
    assert.ok(nonEmptyString(r.applicability_text), `${id}: applicability_text`)
    assert.ok(isUrl(r.url), `${id}: url`)
    assert.equal(new URL(r.url).host, 'act-rules.github.io', `${id}: url host`)
  }
})

test('all WCAG SC references are well-formed (when present)', () => {
  for (const [id, r] of rules) {
    assert.ok(Array.isArray(r.wcag_sc_ids), `${id}: wcag_sc_ids`)
    assert.ok(Array.isArray(r.wcag_sc_ids_secondary), `${id}: wcag_sc_ids_secondary`)
    for (const sc of [...r.wcag_sc_ids, ...r.wcag_sc_ids_secondary]) {
      assert.match(sc, SC_ID, `${id}: malformed SC id "${sc}"`)
    }
  }
})

test('input_aspects is an array of non-empty strings', () => {
  for (const [id, r] of rules) {
    assert.ok(Array.isArray(r.input_aspects), `${id}: input_aspects`)
    for (const a of r.input_aspects) assert.ok(nonEmptyString(a), `${id}: input_aspect entry`)
  }
})
