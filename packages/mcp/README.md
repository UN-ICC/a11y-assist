# a11y-assist-mcp

The **a11y-assist MCP server** — source-traceable accessibility tools for AI agents. Scoped entry points (APG patterns, ARIA roles) that also return the WCAG criteria applying to the component plus a tiered verification checklist; ACT/WCAG drill-down; an applicability refine/audit flow; and axe-core verification. Part of [a11y-assist](https://github.com/UN-ICC/a11y-assist).

📖 **Docs:** <https://un-icc.github.io/a11y-assist/packages/a11y-assist-mcp/> · **Setup guide:** <https://un-icc.github.io/a11y-assist/agents/>

## Quick start

```sh
claude mcp add a11y -- npx -y a11y-assist-mcp
npx playwright install chromium   # required for the audit tools
```

For other MCP clients, run `npx -y a11y-assist-mcp` as the server command.

## License

MIT.
