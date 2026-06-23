import { z } from 'zod'
import { wrapAuditResponse } from 'a11y-assist-core'
import { withPage } from '../browser/pool.js'
import { runAxe } from '../browser/audit.js'

const parameters = z.object({
  url: z.string().url().describe(
    'URL to audit. Storybook story, dev server route, staging page, anywhere ' +
    'reachable from this machine.',
  ),
  waitForSelector: z.string().optional().describe(
    'CSS selector to wait for before running axe — useful for SPAs or async content.',
  ),
  localStorage: z
    .record(z.string())
    .optional()
    .describe(
      'Seed localStorage entries (key→value) BEFORE the page loads, so state-dependent ' +
      'routes render real content. audit_url otherwise starts from a fresh browser with ' +
      'empty storage, which often renders an empty / "not found" view.',
    ),
  initScript: z.string().optional().describe(
    'JavaScript to run before the page\'s own scripts (Playwright addInitScript) — e.g. ' +
    'to seed cookies or app state. Trusted/dev use only.',
  ),
})

type Args = z.infer<typeof parameters>

export const auditUrlTool = {
  name: 'audit_url',
  description:
    'Run accessibility checks against a live URL. Catches dynamic behaviour (focus ' +
    'management, transitions, live regions) that audit_html cannot. NOTE: it drives a ' +
    'fresh headless browser with no app state — for routes that depend on localStorage / ' +
    'auth / prior interaction, seed `localStorage` (or `initScript`) so the real view ' +
    'renders, and check the returned `audited` block to confirm which view was tested.',
  parameters,
  execute: async ({ url, waitForSelector, localStorage, initScript }: Args): Promise<string> => {
    const { violations, context } = await withPage(async (page) => {
      if (localStorage) {
        await page.addInitScript((entries: [string, string][]) => {
          try {
            for (const [k, v] of entries) window.localStorage.setItem(k, v)
          } catch {
            // opaque origin (e.g. about:blank) — ignore; it applies on the real origin.
          }
        }, Object.entries(localStorage))
      }
      if (initScript) {
        await page.addInitScript({ content: initScript })
      }
      await page.goto(url, { waitUntil: 'networkidle' })
      if (waitForSelector) await page.waitForSelector(waitForSelector)
      return runAxe(page)
    })

    return JSON.stringify({
      url,
      ...wrapAuditResponse(violations),
      audited: context,
    })
  },
}
