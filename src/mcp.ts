// Registers the MCP servers. Both are conditional so a machine without them
// gets a clean setup instead of connection errors:
// dep_search requires the codebase-memory-mcp binary on PATH, tavily requires
// TAVILY_API_KEY. Disable either via plugin options
// { "mcp": { "depSearch": false, "tavily": false } }.

import { Plugin } from "@opencode/plugin"
import { constants as fsConstants } from "node:fs"
import { accessSync } from "node:fs"
import path from "node:path"

type Context = Parameters<NonNullable<Parameters<typeof Plugin.define>[0]["setup"]>>[0]

function onPath(binary: string): boolean {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue
    try {
      accessSync(path.join(dir, binary), fsConstants.X_OK)
      return true
    } catch {}
  }
  return false
}

export async function setupMcp(ctx: Context): Promise<void> {
  const options = (ctx.options.mcp ?? {}) as Record<string, unknown>

  await ctx.mcp.transform((editor) => {
    if (options.depSearch !== false) {
      if (onPath("codebase-memory-mcp")) {
        editor.set("dep_search", {
          type: "local",
          command: ["codebase-memory-mcp", "--tool-profile=analysis"],
        })
      } else {
        console.warn("[my-opencode-config] mcp dep_search skipped: codebase-memory-mcp not on PATH")
      }
    }

    if (options.tavily !== false) {
      const key = process.env.TAVILY_API_KEY
      if (key) {
        editor.set("tavily", {
          type: "remote",
          url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${key}`,
        })
      } else {
        console.warn("[my-opencode-config] mcp tavily skipped: TAVILY_API_KEY not set")
      }
    }
  })
}
