/**
 * Tier 2 — data integrity.
 * Every pattern is well-formed and its string content is present. Verbatim
 * fields that some patterns legitimately lack (keyboard tables, examples) are
 * validated only when present — not all APG patterns publish them.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { patterns, APG_SNAPSHOT } from '../src/index.js'

const isUrl = (s: unknown): boolean => {
  try {
    new URL(String(s))
    return true
  } catch {
    return false
  }
}

const nonEmptyString = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0

test('every pattern has the required non-empty string fields', () => {
  for (const [role, p] of patterns) {
    assert.ok(nonEmptyString(p.role), `${role}: role`)
    assert.ok(nonEmptyString(p.name), `${role}: name`)
    assert.ok(nonEmptyString(p.about_this_pattern), `${role}: about_this_pattern`)
    assert.ok(nonEmptyString(p.apg_url), `${role}: apg_url`)
    assert.ok(isUrl(p.apg_url), `${role}: apg_url must be a valid URL`)
    assert.ok(p.apg_url.startsWith(APG_SNAPSHOT.apg_base), `${role}: apg_url under apg_base`)
  }
})

test('aria_roles is a non-empty array of non-empty strings', () => {
  for (const [role, p] of patterns) {
    assert.ok(Array.isArray(p.aria_roles) && p.aria_roles.length > 0, `${role}: aria_roles`)
    for (const r of p.aria_roles) assert.ok(nonEmptyString(r), `${role}: aria_role entry`)
  }
})

test('keyboard_interactions entries are well-formed when present', () => {
  for (const [role, p] of patterns) {
    assert.ok(Array.isArray(p.keyboard_interactions), `${role}: keyboard_interactions array`)
    for (const k of p.keyboard_interactions) {
      assert.ok(nonEmptyString(k.key), `${role}: keyboard key`)
      assert.ok(nonEmptyString(k.description), `${role}: keyboard description`)
    }
  }
})

test('examples entries are well-formed when present', () => {
  for (const [role, p] of patterns) {
    assert.ok(Array.isArray(p.examples), `${role}: examples array`)
    for (const ex of p.examples) {
      assert.ok(nonEmptyString(ex.name), `${role}: example name`)
      assert.ok(isUrl(ex.url), `${role}: example url must be a valid URL`)
    }
  }
})
