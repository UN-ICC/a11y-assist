import type { AbstractGraph } from 'graphology-types'

export type NodeType =
  | 'pattern'
  | 'role'
  | 'sc'
  | 'technique'
  | 'failure'
  | 'act'
  | 'element'
  | 'primitive'
  | 'platform'

export type EdgeLabel =
  | 'uses_role'
  | 'applies_sc'
  | 'validated_by'
  | 'covers_sc'
  | 'has_technique'
  | 'has_failure'
  | 'has_implicit_role'
  | 'binds_to'
  | 'available_on'

/**
 * Attributes attached to every node. `label` is the human-facing display
 * string; `note` is optional secondary metadata used by the UI (level for SCs,
 * role kind for primitives, etc.).
 */
export interface NodeAttributes {
  type: NodeType
  label: string
  note?: string
}

export interface EdgeAttributes {
  label: EdgeLabel
}

export type A11yGraph = AbstractGraph<NodeAttributes, EdgeAttributes>
