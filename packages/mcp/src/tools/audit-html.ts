import { readFileSync } from 'node:fs'
import { z } from 'zod'
import { wrapAuditResponse } from 'a11y-assist-core'
import { withPage } from '../browser/pool.js'
import { runAxe } from '../browser/audit.js'

const parameters = z.object({
  html: z.string().describe(
    'HTML approximation of what the component renders. Can be a snippet — ' +
    'it will be wrapped in <html><body>...</body></html> automatically.',
  ),
  stylesheetPath: z.string().optional().describe(
    'Optional absolute path to a CSS file to inline (for realistic computed ' +
    'styles — e.g. contrast and focus indicator checks).',
  ),
})

type Args = z.infer<typeof parameters>

export const auditHtmlTool = {
  name: 'audit_html',
  description:
    'Run accessibility checks against an HTML snippet using axe-core (WCAG AA). ' +
    'No dev server or Storybook required. Limitation: cannot evaluate dynamic ' +
    'behaviour (focus management, route changes, live region timing) — use ' +
    'audit_url for those.',
  parameters,
  execute: async ({ html, stylesheetPath }: Args): Promise<string> => {
    // If the caller passed a whole document, audit it as-is; otherwise wrap the
    // snippet in a MINIMAL VALID document (lang + title) so rules that only
    // concern the wrapper — document-title, html-has-lang — don't fire as false
    // positives on a fragment.
    const isFullDoc = /<!doctype/i.test(html) || /<html[\s>]/i.test(html)
    const { violations, context } = await withPage(async (page) => {
      const styleTag = stylesheetPath ? readStyle(stylesheetPath) : ''
      const content = isFullDoc
        ? html
        : `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>a11y-assist snippet audit</title>${styleTag}</head><body>${html}</body></html>`
      await page.setContent(content, { waitUntil: 'domcontentloaded' })
      return runAxe(page)
    })

    return JSON.stringify({
      ...wrapAuditResponse(violations, {
        extraCaveats: [
          'Dynamic behaviour (focus management, route changes, live region timing) is not evaluated by audit_html. Use audit_url for those.',
          ...(isFullDoc
            ? []
            : ['Audited as a snippet inside a minimal valid document. Page-level criteria — document title (2.4.2), page language (3.1.1), landmarks / bypass blocks — are NOT meaningfully testable here; verify them on the full page with audit_url.']),
        ],
      }),
      audited: context,
    })
  },
}

function readStyle(stylesheetPath: string): string {
  try {
    const css = readFileSync(stylesheetPath, 'utf8')
    return `<style>${css}</style>`
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return `<!-- a11y-assist-mcp: failed to read stylesheet at ${stylesheetPath}: ${message} -->`
  }
}
