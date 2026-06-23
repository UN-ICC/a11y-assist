import { createRequire } from 'node:module'
import type { Page } from 'playwright'
import { CONFIG } from '../config.js'

const requireFromHere = createRequire(import.meta.url)
const AXE_PATH: string = requireFromHere.resolve('axe-core')

/** What was actually on the page when axe ran — so the consumer can tell which
 *  view was tested (e.g. a "Not found" fallback vs the intended page). */
export interface AuditContext {
  title: string
  heading: string | null
  element_count: number
}

export interface AxeResult {
  violations: unknown[]
  context: AuditContext
}

/**
 * Inject axe-core, run it with the configured WCAG tags, and capture a small
 * snapshot of what was actually rendered.
 */
export async function runAxe(page: Page): Promise<AxeResult> {
  await page.addScriptTag({ path: AXE_PATH })

  const tags = [...CONFIG.axeTags]
  if (CONFIG.aaaCriteria.length > 0) tags.push(...CONFIG.aaaCriteria)

  return await page.evaluate(async (tagList: string[]) => {
    // axe-core attaches itself to window when loaded as a script tag.
    const axe = (window as unknown as { axe: { run: Function } }).axe
    const results = (await axe.run(document, {
      runOnly: { type: 'tag', values: tagList },
    })) as { violations: unknown[] }
    const h1 = document.querySelector('h1')
    return {
      violations: results.violations,
      context: {
        title: document.title || '',
        heading: h1 ? (h1.textContent || '').trim().slice(0, 140) : null,
        element_count: document.querySelectorAll('*').length,
      },
    }
  }, tags)
}
