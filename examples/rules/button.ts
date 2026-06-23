// src/rules/button.ts
//
// Browser-safe module: contains executable check logic and axe rule
// definitions. Read by the browser DS bundle (for axe.configure) and
// by loadGuidelines on the Node side (for rule shape + ids).
//
// PROSE-HEAVY GUIDANCE — figma_ref and fix_guidance — lives in
// button.a11y.yaml alongside this file. The YAML is the authoring
// surface for non-engineers; this TS file is the executable surface.
//
// At build/start time, loadGuidelines reads both and merges them by
// rule id. CI fails if a YAML key references an unknown rule, or if
// a rule defined here has no YAML guidance.

import type { DsCheck, DsRule, ComponentMeta } from './types'

export const buttonChecks: DsCheck[] = [
  {
    id: 'ds-button-aria-disabled',
    evaluate: function (node) {
      if (node.hasAttribute('disabled')) {
        this.data({ found: 'disabled attribute', expected: 'aria-disabled="true"' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-button-icon-sr-text',
    evaluate: function (node) {
      const isIconOnly = node.classList.contains('btn-icon')
      if (!isIconOnly) return true
      if (!node.querySelector('.sr-only')) {
        this.data({ found: 'icon button without .sr-only text' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-button-loading-announcement',
    evaluate: function (node) {
      const isLoading = node.classList.contains('btn-loading')
      if (!isLoading) return true
      const announced =
        node.getAttribute('aria-busy') === 'true' || node.querySelector('[aria-live]')
      if (!announced) {
        this.data({ found: 'loading button without aria-busy or aria-live' })
        return false
      }
      return true
    },
  },
]

export const buttonRules: DsRule[] = [
  {
    id: 'ds-button-disabled-pattern',
    selector: 'button',
    tags: ['ds-rules'],
    impact: 'serious',
    metadata: {
      description: 'Disabled buttons must use aria-disabled, not the disabled attribute',
      help: 'aria-disabled preserves keyboard focus and screen reader announcement',
      helpUrl: 'https://your-ds-docs/button#disabled',
    },
    any: ['ds-button-aria-disabled'],
  },
  {
    id: 'ds-button-icon-text',
    selector: 'button.btn-icon',
    tags: ['ds-rules'],
    impact: 'critical',
    metadata: {
      description: 'Icon-only buttons must contain visually hidden text',
      help: 'Add <span class="sr-only">Label</span> inside the button alongside the icon',
      helpUrl: 'https://your-ds-docs/button#icon-only',
    },
    any: ['ds-button-icon-sr-text'],
  },
  {
    id: 'ds-button-loading-state',
    selector: 'button.btn-loading',
    tags: ['ds-rules'],
    impact: 'moderate',
    metadata: {
      description: 'Loading buttons must announce their state to screen readers',
      help: 'Add aria-busy="true" to the button element when in loading state',
      helpUrl: 'https://your-ds-docs/button#loading',
    },
    any: ['ds-button-loading-announcement'],
  },
]

export const buttonMeta: ComponentMeta = {
  component: 'Button',
  storybook_title: 'Components/Button',
  apg_patterns: ['button'],
}
