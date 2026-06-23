import { FastMCP } from 'fastmcp'
import { APG_SNAPSHOT } from 'apg-query'
import { WCAG_SNAPSHOT } from 'wcag-query'
import { ACT_SNAPSHOT } from 'act-rules-query'
import { getApgPatternTool } from './tools/get-apg-pattern.js'
import { getAriaRoleTool } from './tools/get-aria-role.js'
import { getElementRolesTool } from './tools/get-element-roles.js'
import { listApgPatternsTool } from './tools/list-apg-patterns.js'
import { searchActTool } from './tools/search-act.js'
import { getActRuleTool } from './tools/get-act-rule.js'
import { searchWcagTool } from './tools/search-wcag.js'
import { getWcagScTool } from './tools/get-wcag-sc.js'
import { auditHtmlTool } from './tools/audit-html.js'
import { auditUrlTool } from './tools/audit-url.js'
import { shutdownBrowser } from './browser/pool.js'
import { CONFIG } from './config.js'

// Tool names, for the boot log only. Registration is done individually below so
// FastMCP can infer each tool's parameter generic.
const TOOL_NAMES = [
  'get_apg_pattern', 'get_aria_role', 'get_element_roles', 'list_apg_patterns',  // entry + discovery
  'search_act', 'get_act_rule', 'search_wcag', 'get_wcag_sc',                    // drill-down
  'audit_html', 'audit_url',                                                     // verify
]

async function main(): Promise<void> {
  const server = new FastMCP({
    name: 'a11y-assist-mcp',
    version: '0.1.0',
  })

  server.addTool(getApgPatternTool)
  server.addTool(getAriaRoleTool)
  server.addTool(getElementRolesTool)
  server.addTool(listApgPatternsTool)
  server.addTool(searchActTool)
  server.addTool(getActRuleTool)
  server.addTool(searchWcagTool)
  server.addTool(getWcagScTool)
  server.addTool(auditHtmlTool)
  server.addTool(auditUrlTool)

  // Log to stderr so the stdio transport stays clean for MCP traffic.
  console.error(`[a11y-assist-mcp] axe tags: ${CONFIG.axeTags.join(', ')}`)
  console.error(`[a11y-assist-mcp] tools: ${TOOL_NAMES.join(', ')}`)
  console.error(
    `[a11y-assist-mcp] data: apg-query (${APG_SNAPSHOT.pattern_count} patterns @ ${APG_SNAPSHOT.date}), ` +
    `wcag-query (WCAG ${WCAG_SNAPSHOT.version}, ${WCAG_SNAPSHOT.sc_count} SCs), ` +
    `act-rules-query (${ACT_SNAPSHOT.rule_count} rules @ ${ACT_SNAPSHOT.upstream_commit.slice(0, 7)})`,
  )

  process.on('SIGTERM', () => void shutdownBrowser())
  process.on('SIGINT', () => void shutdownBrowser())

  await server.start({ transportType: 'stdio' })
}

main().catch((err: unknown) => {
  console.error('[a11y-assist-mcp] fatal:', err)
  process.exit(1)
})
