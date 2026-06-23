// src/rules/types.ts
//
// Shared types for component rule modules.
//
// Note on `evaluate`: axe-core invokes the function with `this` bound to
// a Check instance that exposes `data()` for attaching context to a
// violation. The full axe types are not imported here to keep rule
// modules independent of axe-core's internal type churn.

export interface DsCheck {
  id: string
  evaluate: (this: { data: (payload: unknown) => void }, node: Element) => boolean
}

export interface DsRule {
  id: string
  selector: string
  tags: string[]
  impact: 'minor' | 'moderate' | 'serious' | 'critical'
  metadata: {
    description: string
    help: string
    helpUrl: string
  }
  any?: string[]
  all?: string[]
  none?: string[]
}

// Shape of an entry in <component>.a11y.yaml. The YAML loader validates
// against this at build time; missing or extra keys fail CI.
export interface RuleGuidance {
  figma_ref: string
  fix_guidance: string
}

export interface ComponentMeta {
  component: string         // e.g. "Button"
  storybook_title: string   // exact Storybook title path: "Components/<Name>"

  // Classification — exactly one must be present. See framework.md and
  // extension-spec.md for the full discussion.
  apg_patterns?: string[]               // APG-aligned (1:1 or composition)
  primitive?: {                          // Native HTML element wrapper
    html_element: string                 // e.g. 'input', 'a', 'img'
    aria_role: string                    // e.g. 'textbox', 'link', 'img'
    html_attribute_filter?: Record<string, string>
  }
  novel?: {                              // Neither APG nor primitive fits
    reason: string
    closest_patterns: string[]
  }
}
