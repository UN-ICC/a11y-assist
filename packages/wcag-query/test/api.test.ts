/**
 * Tier 1 — API contract & smoke.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  getSC, getTechnique, getFailure, listSCs,
  successCriteria, techniques, failures,
  WCAG_VERSION, WCAG_SNAPSHOT,
} from '../src/index.js'

test('getSC resolves a known criterion with a valid level', () => {
  const sc = getSC('4.1.2')
  assert.ok(sc, 'expected SC 4.1.2 (Name, Role, Value)')
  assert.ok(['A', 'AA', 'AAA'].includes(sc.level))
})

test('getSC returns undefined for an unknown id', () => {
  assert.equal(getSC('9.9.9'), undefined)
})

test('getTechnique / getFailure resolve known ids and reject unknown ones', () => {
  const someTech = [...techniques.keys()][0]
  const someFail = [...failures.keys()][0]
  assert.ok(getTechnique(someTech), 'expected a technique to resolve')
  assert.ok(getFailure(someFail), 'expected a failure to resolve')
  assert.equal(getTechnique('NOPE000'), undefined)
  assert.equal(getFailure('NOPE000'), undefined)
})

test('maps are non-empty', () => {
  assert.ok(successCriteria.size > 0)
  assert.ok(techniques.size > 0)
  assert.ok(failures.size > 0)
})

test('listSCs is sorted, unique, and matches the map', () => {
  const list = listSCs()
  assert.deepEqual(list, [...list].sort(), 'listSCs must be sorted')
  assert.equal(new Set(list).size, list.length, 'listSCs must be unique')
  assert.deepEqual(new Set(list), new Set(successCriteria.keys()))
})

test('version constants agree', () => {
  assert.equal(WCAG_VERSION, '2.2')
  assert.equal(WCAG_SNAPSHOT.version, '2.2')
})
