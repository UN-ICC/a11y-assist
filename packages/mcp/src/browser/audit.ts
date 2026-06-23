import { createRequire } from 'node:module'
import type { Page } from 'playwright'
import { CONFIG } from '../config.js'
import { getExtension } from '../extensions/loader.js'

const requireFromHere = createRequire(import.meta.url)
const AXE_PATH: string = requireFromHere.resolve('axe-core')

/**
 * Inject axe-core (always) and the DS extension's bundle (if loaded),
 * then run axe with WCAG + DS tags. Returns the raw violations array.
 */
export async function runAxe(page: Page): Promise<unknown[]> {
  await page.addScriptTag({ path: AXE_PATH })

  const ext = getExtension()
  if (ext?.bundlePath) {
    await page.addScriptTag({ path: ext.bundlePath })
  }

  const tags = ext ? [...CONFIG.axeTags, ...ext.axeTags] : [...CONFIG.axeTags]
  if (CONFIG.aaaCriteria.length > 0) tags.push(...CONFIG.aaaCriteria)

  return await page.evaluate(async (tagList: string[]) => {
    // axe-core attaches itself to window when loaded as a script tag.
    const axe = (window as unknown as { axe: { run: Function } }).axe
    const results = (await axe.run(document, {
      runOnly: { type: 'tag', values: tagList },
    })) as { violations: unknown[] }
    return results.violations
  }, tags)
}
