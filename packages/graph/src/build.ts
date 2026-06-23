/**
 * Builds the in-memory a11y knowledge graph from the same authoritative
 * sources `a11y-core`'s `loadPattern` reads. The graph is a *projection*, not
 * a new source of truth — every node/edge is derivable from apg-query,
 * wcag-query, act-rules-query, and the editorial role-bindings table.
 *
 * Build order:
 *   1. Platforms (web, react-native).
 *   2. WCAG SCs + their techniques + their failures.
 *   3. ACT rules + covers_sc edges.
 *   4. Patterns: aria_roles, applies_sc, validated_by, binds_to, available_on.
 *
 * Patterns are added by calling `loadPattern` from `a11y-core` so the
 * applicability logic stays single-source.
 */

import { newDirectedGraph } from './_graphology.js'
import { loadPattern, roleBindings } from 'a11y-core'
import { listPatterns as listAPGPatterns } from 'apg-query'
import { successCriteria, getTechnique, getFailure } from 'wcag-query'
import { rules as actRules } from 'act-rules-query'

import type { A11yGraph, EdgeAttributes, EdgeLabel, NodeAttributes } from './types.js'

let cached: A11yGraph | null = null

export function getGraph(): A11yGraph {
  if (cached) return cached
  cached = build()
  return cached
}

export function rebuildGraph(): A11yGraph {
  cached = build()
  return cached
}

function addNodeOnce(g: A11yGraph, id: string, attrs: NodeAttributes): void {
  if (!g.hasNode(id)) g.addNode(id, attrs)
}

function addEdgeOnce(g: A11yGraph, source: string, target: string, label: EdgeLabel): void {
  if (!g.hasEdge(source, target)) g.addEdge(source, target, { label })
}

function build(): A11yGraph {
  const g: A11yGraph = newDirectedGraph<NodeAttributes, EdgeAttributes>()

  // 1. Platforms
  addNodeOnce(g, 'platform:web', { type: 'platform', label: 'web' })
  addNodeOnce(g, 'platform:react-native', { type: 'platform', label: 'react-native' })

  // 2. WCAG SCs + techniques + failures
  for (const [scId, sc] of successCriteria) {
    addNodeOnce(g, `sc:${scId}`, {
      type: 'sc',
      label: `${scId} ${sc.title}`,
      note: sc.level,
    })
    for (const techId of sc.technique_ids) {
      const t = getTechnique(techId)
      if (!t) continue
      addNodeOnce(g, `tech:${techId}`, { type: 'technique', label: techId, note: t.title })
      addEdgeOnce(g, `sc:${scId}`, `tech:${techId}`, 'has_technique')
    }
    for (const failId of sc.failure_ids) {
      const f = getFailure(failId)
      if (!f) continue
      addNodeOnce(g, `fail:${failId}`, { type: 'failure', label: failId, note: f.title })
      addEdgeOnce(g, `sc:${scId}`, `fail:${failId}`, 'has_failure')
    }
  }

  // 3. ACT rules + covers_sc
  for (const [ruleId, rule] of actRules) {
    addNodeOnce(g, `act:${ruleId}`, { type: 'act', label: ruleId, note: rule.name })
    for (const scId of rule.wcag_sc_ids) {
      // Stub-add unknown SCs (out-of-dataset references) so the edge has a target.
      addNodeOnce(g, `sc:${scId}`, { type: 'sc', label: scId })
      addEdgeOnce(g, `act:${ruleId}`, `sc:${scId}`, 'covers_sc')
    }
  }

  // 4. Patterns — union of APG roles + role-bindings keys.
  const allRoles = new Set<string>([...listAPGPatterns(), ...Object.keys(roleBindings)])
  for (const role of allRoles) {
    // Prefer the web variant for canonical naming. Fall back to RN for
    // RN-only patterns (e.g. patterns whose only primitive is React Native).
    const pattern = loadPattern(role, 'web') ?? loadPattern(role, 'react-native')
    if (!pattern) continue

    const pid = `pattern:${pattern.role}`
    addNodeOnce(g, pid, { type: 'pattern', label: pattern.name, note: pattern.role })

    // uses_role
    for (const r of pattern.aria_roles) {
      addNodeOnce(g, `role:${r}`, { type: 'role', label: r })
      addEdgeOnce(g, pid, `role:${r}`, 'uses_role')
    }

    // applies_sc
    for (const sc of pattern.wcag_applicable) {
      addNodeOnce(g, `sc:${sc.id}`, {
        type: 'sc',
        label: `${sc.id} ${sc.title}`,
        note: sc.level,
      })
      addEdgeOnce(g, pid, `sc:${sc.id}`, 'applies_sc')
    }

    // validated_by
    for (const rule of pattern.act_rules_applicable) {
      addNodeOnce(g, `act:${rule.id}`, { type: 'act', label: rule.id, note: rule.name })
      addEdgeOnce(g, pid, `act:${rule.id}`, 'validated_by')
    }

    // binds_to (web): pattern → element nodes, derived from aria-query.
    // Each element also gets a has_implicit_role edge to its bound role and an
    // available_on edge to the web platform.
    for (const el of pattern.web_elements) {
      const eid = `element:${el.canonical_id}`
      addNodeOnce(g, eid, {
        type: 'element',
        label: `<${el.canonical_id}>`,
        note: el.implicit_role,
      })
      addEdgeOnce(g, pid, eid, 'binds_to')
      addEdgeOnce(g, eid, `role:${el.implicit_role}`, 'has_implicit_role')
      addEdgeOnce(g, eid, 'platform:web', 'available_on')
    }

    // binds_to (RN): editorial — no W3C source, hand-maintained in role-bindings.
    if (pattern.rn_primitive) {
      const primId = `primitive:rn:${pattern.rn_primitive.rn_component}`
      addNodeOnce(g, primId, {
        type: 'primitive',
        label: pattern.rn_primitive.rn_component,
        note: 'RN',
      })
      addEdgeOnce(g, pid, primId, 'binds_to')
      addEdgeOnce(g, primId, 'platform:react-native', 'available_on')
    }
  }

  return g
}
