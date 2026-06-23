import { chromium } from 'playwright'
import type { Browser, BrowserContext, Page } from 'playwright'
import { CONFIG } from '../config.js'

let browser: Browser | null = null
let context: BrowserContext | null = null
let idleTimer: NodeJS.Timeout | null = null

async function ensure(): Promise<BrowserContext> {
  if (context) {
    armIdle()
    return context
  }
  browser = await chromium.launch()
  context = await browser.newContext()
  armIdle()
  return context
}

function armIdle(): void {
  if (idleTimer) clearTimeout(idleTimer)
  idleTimer = setTimeout(() => {
    void shutdownBrowser()
  }, CONFIG.idleMs)
}

export async function shutdownBrowser(): Promise<void> {
  if (idleTimer) {
    clearTimeout(idleTimer)
    idleTimer = null
  }
  if (browser) {
    await browser.close().catch(() => {})
    browser = null
    context = null
  }
}

/**
 * Run `fn` against a fresh page in the persistent browser. The page is
 * closed in a finally block so leaks don't accumulate when the caller throws.
 */
export async function withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const ctx = await ensure()
  const page = await ctx.newPage()
  try {
    return await fn(page)
  } finally {
    await page.close().catch(() => {})
  }
}
