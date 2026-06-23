// src/rules/modal.ts
//
// See button.ts for the full pattern explanation. Prose-heavy guidance
// (figma_ref, fix_guidance) lives in modal.a11y.yaml.

import type { DsCheck, DsRule, ComponentMeta } from './types'

export const modalChecks: DsCheck[] = [
  {
    id: 'ds-modal-role-dialog',
    evaluate: function (node) {
      const role = node.getAttribute('role')
      if (role !== 'dialog' && role !== 'alertdialog') {
        this.data({ found: `role="${role ?? '(none)'}"`, expected: 'dialog or alertdialog' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-modal-labelled',
    evaluate: function (node) {
      if (!node.hasAttribute('aria-labelledby') && !node.hasAttribute('aria-label')) {
        this.data({ found: 'dialog without accessible name' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-modal-aria-modal',
    evaluate: function (node) {
      if (node.getAttribute('aria-modal') !== 'true') {
        this.data({ found: 'dialog missing aria-modal="true"' })
        return false
      }
      return true
    },
  },
  {
    id: 'ds-modal-close-button',
    evaluate: function (node) {
      const closeBtn = node.querySelector('[aria-label*="close" i], [aria-label*="dismiss" i]')
      if (!closeBtn) {
        this.data({ found: 'modal without labelled close/dismiss button' })
        return false
      }
      return true
    },
  },
]

export const modalRules: DsRule[] = [
  {
    id: 'ds-modal-has-dialog-role',
    selector: '.modal, [data-component="modal"]',
    tags: ['ds-rules'],
    impact: 'critical',
    metadata: {
      description: 'Modal containers must have role="dialog" or role="alertdialog"',
      help: 'Use role="alertdialog" for modals requiring immediate user response',
      helpUrl: 'https://your-ds-docs/modal#role',
    },
    any: ['ds-modal-role-dialog'],
  },
  {
    id: 'ds-modal-has-label',
    selector: '[role="dialog"], [role="alertdialog"]',
    tags: ['ds-rules'],
    impact: 'critical',
    metadata: {
      description: 'Modals must have an accessible name via aria-labelledby or aria-label',
      help: 'Point aria-labelledby at the modal heading element id',
      helpUrl: 'https://your-ds-docs/modal#labelling',
    },
    any: ['ds-modal-labelled'],
  },
  {
    id: 'ds-modal-aria-modal-attr',
    selector: '[role="dialog"], [role="alertdialog"]',
    tags: ['ds-rules'],
    impact: 'serious',
    metadata: {
      description: 'Modals must use aria-modal="true" to hide background from screen readers',
      help: 'Add aria-modal="true" to the dialog element',
      helpUrl: 'https://your-ds-docs/modal#aria-modal',
    },
    any: ['ds-modal-aria-modal'],
  },
  {
    id: 'ds-modal-close-control',
    selector: '[role="dialog"], [role="alertdialog"]',
    tags: ['ds-rules'],
    impact: 'serious',
    metadata: {
      description: 'Modals must contain a labelled close or dismiss button',
      help: 'Add a button with aria-label="Close dialog" or aria-label="Dismiss"',
      helpUrl: 'https://your-ds-docs/modal#close',
    },
    any: ['ds-modal-close-button'],
  },
]

export const modalMeta: ComponentMeta = {
  component: 'Modal',
  storybook_title: 'Components/Modal',
  apg_patterns: ['dialog'],
}
