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
    const { violations, context } = await withPage(async (page) => {
      const styleTag = stylesheetPath ? readStyle(stylesheetPath) : ''
      await page.setContent(
        `<!doctype html><html><head><meta charset="utf-8">${styleTag}</head><body>${html}</body></html>`,
        { waitUntil: 'domcontentloaded' },
      )
      return runAxe(page)
    })

    return JSON.stringify({
      ...wrapAuditResponse(violations, {
        extraCaveats: [
          'Dynamic behaviour (focus management, route changes, live region timing) is not evaluated by audit_html. Use audit_url for those.',
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
