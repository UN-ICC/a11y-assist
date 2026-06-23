// src/rules/input.ts
//
// See button.ts for the full pattern explanation. Prose-heavy guidance
// (figma_ref, fix_guidance) lives in input.a11y.yaml.

import type { DsCheck, DsRule, ComponentMeta } from './types'

export const inputChecks: DsCheck[] = [
  {
    id: 'ds-input-visible-label',
    evaluate: function (node) {
      const id = node.getAttribute('id') ?? ''
      const placeholderOnly =
        node.hasAttribute('placeholder') &&
        !node.getAttribute('aria-label') &&
        !node.getAttribute('aria-labelledby') &&
        (id === '' || !document.querySelector(`label[for="${id}"]`))
      if (placeholderOnly) {
        this.data({ found: 'placeholder used as label substitute' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-input-error-association',
    evaluate: function (node) {
      const errorId = node.getAttribute('aria-describedby')
      if (!errorId) return true
      const errorEl = document.getElementById(errorId)
      if (errorEl && errorEl.getAttribute('role') !== 'alert') {
        this.data({ found: 'error element missing role="alert"' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-input-required-aria',
    evaluate: function (node) {
      if (node.hasAttribute('required') && node.getAttribute('aria-required') !== 'true') {
        this.data({ found: 'required attribute without aria-required="true"' })
        return false
      }
      return true
    },
  },
]

export const inputRules: DsRule[] = [
  {
    id: 'ds-input-no-placeholder-label',
    selector: 'input[placeholder]',
    tags: ['ds-rules'],
    impact: 'critical',
    metadata: {
      description: 'Placeholder text must not be the only label for an input',
      help: 'Provide a visible <label> element or aria-label in addition to placeholder',
      helpUrl: 'https://your-ds-docs/input#labelling',
    },
    any: ['ds-input-visible-label'],
  },
  {
    id: 'ds-input-error-announcement',
    selector: 'input[aria-describedby]',
    tags: ['ds-rules'],
    impact: 'serious',
    metadata: {
      description: 'Input error messages must use role="alert"',
      help: 'The element referenced by aria-describedby must have role="alert"',
      helpUrl: 'https://your-ds-docs/input#error-state',
    },
    any: ['ds-input-error-association'],
  },
  {
    id: 'ds-input-required-pattern',
    selector: 'input[required]',
    tags: ['ds-rules'],
    impact: 'moderate',
    metadata: {
      description: 'Required inputs must use aria-required="true" alongside the required attribute',
      help: 'aria-required ensures consistent announcement across all screen readers',
      helpUrl: 'https://your-ds-docs/input#required',
    },
    any: ['ds-input-required-aria'],
  },
]

export const inputMeta: ComponentMeta = {
  component: 'Input',
  storybook_title: 'Components/Input',
  // HTML primitive — wraps <input type="text">. Governed by HTML spec and
  // ARIA in HTML. No APG pattern applies. The agent should call
  // get_a11y_pattern("textbox") for the primitive recipe.
  primitive: {
    html_element: 'input',
    aria_role: 'textbox',
    html_attribute_filter: { type: 'text' },
  },
}
