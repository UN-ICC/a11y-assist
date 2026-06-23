import { z } from 'zod'
import { wrapAuditResponse } from 'a11y-core'
import { withPage } from '../browser/pool.js'
import { runAxe } from '../browser/audit.js'
import { enrich } from '../extensions/loader.js'

const parameters = z.object({
  url: z.string().url().describe(
    'URL to audit. Storybook story, dev server route, staging page, anywhere ' +
    'reachable from this machine.',
  ),
  component: z.string().optional().describe(
    'Optional component-name hint for DS-extension enrichment.',
  ),
  waitForSelector: z.string().optional().describe(
    'CSS selector to wait for before running axe — useful for SPAs or async content.',
  ),
})

type Args = z.infer<typeof parameters>

export const auditUrlTool = {
  name: 'audit_url',
  description:
    'Run accessibility checks against a live URL. Catches dynamic ' +
    'behaviour (focus management, transitions, live regions) that ' +
    'audit_html cannot.',
  parameters,
  execute: async ({ url, component, waitForSelector }: Args): Promise<string> => {
    const violations = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle' })
      if (waitForSelector) await page.waitForSelector(waitForSelector)
      return runAxe(page)
    })

    return JSON.stringify({
      url,
      ...wrapAuditResponse(violations, { component, enrich }),
    })
  },
}
