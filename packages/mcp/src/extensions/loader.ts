import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { enrichBase, type EnrichedViolation } from 'a11y-core'
import { CONFIG } from '../config.js'
import type { DSExtension } from './types.js'

export type { EnrichedViolation } from 'a11y-core'

let extension: DSExtension | null = null
let loaded = false

/**
 * Load the DS extension specified by A11Y_MCP_EXTENSION, if any. Idempotent.
 * Called once during server startup; subsequent calls return the cached value.
 */
export async function loadExtension(): Promise<DSExtension | null> {
  if (loaded) return extension
  loaded = true

  if (!CONFIG.extensionPath) return null

  const abs = path.resolve(CONFIG.extensionPath)
  const url = pathToFileURL(abs).href
  const mod = (await import(url)) as Record<string, unknown>
  const candidate = (mod.default ?? mod.extension ?? mod) as DSExtension

  validateExtension(candidate)
  extension = candidate

  // eslint-disable-next-line no-console
  console.error(`[a11y-mcp] Loaded DS extension: ${candidate.name} v${candidate.version}`)
  return extension
}

/** Synchronous accessor used by audit code paths. Returns null if not loaded. */
export function getExtension(): DSExtension | null {
  return extension
}

/**
 * Extension-aware enricher. Delegates to a loaded extension's enrich() when
 * available; otherwise falls back to the shared base mapping from a11y-core.
 *
 * The base mapping (no extension) is identical to what the website's
 * "Audit this page" button uses — both call `enrichBase` from a11y-core.
 */
export function enrich(violations: unknown[], component?: string): EnrichedViolation[] {
  if (extension?.enrich) return extension.enrich(violations, component)
  return enrichBase(violations)
}

function validateExtension(ext: unknown): asserts ext is DSExtension {
  const required = ['name', 'version', 'bundlePath', 'axeTags', 'enrich'] as const
  if (typeof ext !== 'object' || ext === null) {
    throw new Error('DS extension default export must be an object')
  }
  for (const field of required) {
    if (!(field in ext)) {
      throw new Error(`DS extension missing required field: "${field}"`)
    }
  }
  const e = ext as DSExtension
  if (!Array.isArray(e.axeTags)) throw new Error('DS extension.axeTags must be an array')
  if (typeof e.enrich !== 'function') throw new Error('DS extension.enrich must be a function')
  if (typeof e.bundlePath !== 'string') throw new Error('DS extension.bundlePath must be a string')
}
