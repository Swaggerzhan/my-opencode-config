import assert from "node:assert/strict"
import test from "node:test"
import { testRender } from "@opentui/solid"
import { PluginContextProvider } from "@opencode/plugin/tui"
import type { Context } from "@opencode/plugin/tui/context"
import { Sidebar } from "../src/tui"

const models = [{ providerID: "Kimi", id: "kimi-k3", modelID: "kimi-k3", limit: { context: 262_144 } }]
const servers = [{ name: "tavily", status: { status: "connected" } }]
const tools = ["read", "sbash"]

function mockContext(): { context: Context; toggle: () => void } {
  let toggle: () => void = () => {}
  const mock = {
    location: undefined,
    theme: { text: { base: "#eeeeee" } },
    data: {
      location: {
        default: () => "loc",
        model: { list: () => models, sync: async () => {} },
        mcp: { server: { list: () => servers, sync: async () => {} } },
      },
      session: { message: { list: () => [] } },
    },
    ui: { model: { current: () => ({ providerID: "Kimi", modelID: "kimi-k3" }) } },
    client: { rpc: () => ({ tools: async () => ({ tools }) }) },
    keymap: {
      layer: (input: () => { commands?: Array<{ run: () => void }> }) => {
        toggle = input().commands?.[0]?.run ?? toggle
      },
    },
  }
  return { context: mock as unknown as Context, toggle: () => toggle() }
}

test("sidebar renders usage, MCP, and collapsible tools", async (t) => {
  const { context, toggle } = mockContext()
  let setup
  try {
    setup = await testRender(
      () => (
        <PluginContextProvider value={context}>
          <Sidebar sessionID="ses_test" />
        </PluginContextProvider>
      ),
      { width: 40, height: 20 },
    )
  } catch (err) {
    // OpenTUI's native renderer needs a supported runtime (bun); skip elsewhere.
    t.skip(`OpenTUI renderer unavailable: ${err}`)
    return
  }
  try {
    // Let the RPC mock resolve and signals settle.
    await new Promise((resolve) => setTimeout(resolve, 50))
    await setup.renderOnce()
    const collapsed = setup.captureCharFrame()
    assert.ok(collapsed.includes("Context Usage"), collapsed)
    assert.ok(collapsed.includes(`${"░".repeat(13)} 0K/262K 0%`), collapsed)
    assert.ok(collapsed.includes("MCP"), collapsed)
    assert.ok(collapsed.includes("tavily connected"), collapsed)
    assert.ok(collapsed.includes("▸ Tools (2)"), collapsed)
    assert.ok(!collapsed.includes("sbash"), collapsed)

    toggle()
    await setup.renderOnce()
    const expanded = setup.captureCharFrame()
    assert.ok(expanded.includes("▾ Tools (2)"), expanded)
    assert.ok(expanded.includes("read"), expanded)
    assert.ok(expanded.includes("sbash"), expanded)
  } finally {
    setup.renderer.destroy()
  }
})
