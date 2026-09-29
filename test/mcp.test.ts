import assert from "node:assert/strict"
import test from "node:test"
import { setupMcp } from "../src/mcp"

async function setup(options?: unknown) {
  const servers: Record<string, unknown> = {}
  const warnings: string[] = []
  const warn = console.warn
  console.warn = (msg: unknown) => warnings.push(String(msg))
  const ctx = {
    options: options ?? {},
    mcp: {
      transform: async (fn: (editor: { set: (name: string, def: never) => void }) => void) =>
        fn({
          set: (name, def) => {
            servers[name] = def
          },
        }),
    },
  }
  try {
    await setupMcp(ctx as never)
  } finally {
    console.warn = warn
  }
  return { servers, warnings }
}

test("tavily registers as a remote server when TAVILY_API_KEY is set", async () => {
  const saved = process.env.TAVILY_API_KEY
  process.env.TAVILY_API_KEY = "test-key"
  try {
    const { servers } = await setup()
    assert.deepEqual(servers["tavily"], {
      type: "remote",
      url: "https://mcp.tavily.com/mcp/?tavilyApiKey=test-key",
    })
  } finally {
    if (saved === undefined) delete process.env.TAVILY_API_KEY
    else process.env.TAVILY_API_KEY = saved
  }
})

test("tavily warns and stays unregistered without TAVILY_API_KEY", async () => {
  const saved = process.env.TAVILY_API_KEY
  delete process.env.TAVILY_API_KEY
  try {
    const { servers, warnings } = await setup()
    assert.ok(!("tavily" in servers))
    assert.ok(warnings.some((line) => line.includes("tavily")))
  } finally {
    if (saved !== undefined) process.env.TAVILY_API_KEY = saved
  }
})

test("dep_search is either registered from PATH or skipped with a warning", async () => {
  const { servers, warnings } = await setup()
  const depSearch = servers["dep_search"] as { type: string; command: string[] } | undefined
  if (depSearch) {
    assert.equal(depSearch.type, "local")
    assert.equal(depSearch.command[0], "codebase-memory-mcp")
  } else {
    assert.ok(warnings.some((line) => line.includes("dep_search")))
  }
})

test("plugin options disable servers individually", async () => {
  const saved = process.env.TAVILY_API_KEY
  process.env.TAVILY_API_KEY = "test-key"
  try {
    const { servers, warnings } = await setup({ mcp: { tavily: false, depSearch: false } })
    assert.deepEqual(servers, {})
    assert.deepEqual(warnings, [])
  } finally {
    if (saved === undefined) delete process.env.TAVILY_API_KEY
    else process.env.TAVILY_API_KEY = saved
  }
})
