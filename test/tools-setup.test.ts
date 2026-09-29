import assert from "node:assert/strict"
import test from "node:test"
import { setupTools } from "../src/tools"

type HookEvent = { agent: string; sessionID: string; tools: Record<string, unknown> }

async function setup() {
  const added: Array<{ name: string; execute: (input: unknown, ctx: unknown) => Promise<{ content: string }> }> = []
  let hookFn: ((event: HookEvent) => void) | undefined
  let rpcHandlers: { tools: (input: unknown) => Promise<{ tools: string[] }> } | undefined
  const ctx = {
    location: { directory: "/tmp" },
    tool: { transform: async (fn: (editor: { add: (tool: never) => void }) => void) => fn({ add: (tool) => added.push(tool) }) },
    session: {
      hook: async (_name: string, fn: (event: HookEvent) => void) => {
        hookFn = fn
        return { dispose: () => {} }
      },
    },
    rpc: {
      register: async (_def: unknown, handlers: typeof rpcHandlers) => {
        rpcHandlers = handlers
        return { dispose: () => {} }
      },
    },
  }
  await setupTools(ctx as never)
  const sbash = added.find((tool) => tool.name === "sbash")
  assert.ok(sbash, "sbash tool registered")
  assert.ok(hookFn, "context hook registered")
  assert.ok(rpcHandlers, "rpc registered")
  return { sbash, hook: hookFn, rpc: rpcHandlers }
}

test("sbash rejects commands outside the whitelist", async () => {
  const { sbash } = await setup()
  const out = await sbash.execute({ command: "curl" }, {})
  assert.match(out.content, /command not allowed: curl/)
})

test("sbash ls rejects relative paths", async () => {
  const { sbash } = await setup()
  const out = await sbash.execute({ command: "ls", path: "etc" }, {})
  assert.match(out.content, /requires an absolute path/)
})

test("sbash ls executes with fixed flags", async () => {
  const { sbash } = await setup()
  const out = await sbash.execute({ command: "ls", path: "/tmp" }, {})
  assert.match(out.content, /total \d+/)
})

test("context hook hides shell for restricted agents and records tools", async () => {
  const { hook, rpc } = await setup()
  const event: HookEvent = { agent: "coder", sessionID: "s1", tools: { shell: {}, sbash: {}, read: {} } }
  hook(event)
  assert.deepEqual(Object.keys(event.tools), ["sbash", "read"])
  assert.deepEqual(await rpc.tools({ sessionID: "s1" }), { tools: ["read", "sbash"] })
})

test("context hook hides sbash for full-shell agents", async () => {
  const { hook } = await setup()
  const event: HookEvent = { agent: "main", sessionID: "s2", tools: { shell: {}, sbash: {} } }
  hook(event)
  assert.deepEqual(Object.keys(event.tools), ["shell"])
})

test("rpc returns an empty list for sessions without a request yet", async () => {
  const { rpc } = await setup()
  assert.deepEqual(await rpc.tools({ sessionID: "nope" }), { tools: [] })
})
