import { FastMCP } from 'fastmcp'
import { APG_SNAPSHOT } from 'apg-query'
import { WCAG_SNAPSHOT } from 'wcag-query'
import { ACT_SNAPSHOT } from 'act-rules-query'
import { auditHtmlTool } from './tools/audit-html.js'
import { auditUrlTool } from './tools/audit-url.js'
import { getA11yPatternTool } from './tools/get-a11y-pattern.js'
import { listA11yPatternsTool } from './tools/list-a11y-patterns.js'
import { shutdownBrowser } from './browser/pool.js'
import { loadExtension } from './extensions/loader.js'
import { CONFIG } from './config.js'

async function main(): Promise<void> {
  const server = new FastMCP({
    name: 'a11y-mcp',
    version: '6.0.0',
  })

  server.addTool(auditHtmlTool)
  server.addTool(auditUrlTool)
  server.addTool(getA11yPatternTool)
  server.addTool(listA11yPatternsTool)

  const extension = await loadExtension()
  if (extension?.registerTools) {
    extension.registerTools(server)
  }

  // Log to stderr so the stdio transport stays clean for MCP traffic.
  const tags = extension ? [...CONFIG.axeTags, ...extension.axeTags] : CONFIG.axeTags
  console.error(`[a11y-mcp] axe tags: ${tags.join(', ')}`)
  console.error('[a11y-mcp] tools: audit_html, audit_url, get_a11y_pattern, list_a11y_patterns')
  console.error(
    `[a11y-mcp] data: apg-query (${APG_SNAPSHOT.pattern_count} patterns @ ${APG_SNAPSHOT.date}), ` +
    `wcag-query (WCAG ${WCAG_SNAPSHOT.version}, ${WCAG_SNAPSHOT.sc_count} SCs), ` +
    `act-rules-query (${ACT_SNAPSHOT.rule_count} rules @ ${ACT_SNAPSHOT.upstream_commit.slice(0, 7)})`,
  )
  if (!extension) console.error('[a11y-mcp] No DS extension configured (baseline WCAG mode).')

  process.on('SIGTERM', () => void shutdownBrowser())
  process.on('SIGINT', () => void shutdownBrowser())

  await server.start({ transportType: 'stdio' })
}

main().catch((err: unknown) => {
  console.error('[a11y-mcp] fatal:', err)
  process.exit(1)
})
