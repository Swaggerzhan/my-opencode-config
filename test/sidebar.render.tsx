// Render tests for the TUI sidebar, executed by `npm run test:tui`:
//   bun --preload @opentui/solid/preload test/sidebar.render.tsx
//
// A plain script with a minimal harness instead of a test runner: under
// `bun test` the Solid transform preload breaks OpenTUI's native FFI, and
// without the preload JSX lacks Solid component semantics — a plain script
// with the preload is the combination that renders correctly. Not matched
// by `npm test` on purpose (the node suite would execute it and fail).

import assert from "node:assert/strict"
import { testRender } from "@opentui/solid"
import { PluginContextProvider } from "@opencode/plugin/tui"
import { createSignal, type Accessor } from "solid-js"
import type { Context } from "@opencode/plugin/tui/context"
import { Sidebar } from "../src/tui"

const models = [{ providerID: "Kimi", id: "kimi-k3", modelID: "kimi-k3", limit: { context: 262_144 } }]

function mockContext(input: {
  messages: Accessor<Array<Record<string, unknown>>>
  tools?: Accessor<string[]>
  toolsError?: Accessor<boolean>
  sessionLocation?: string
  modelListLocations?: string[]
}): { context: Context; toggle: () => void } {
  let toggle: () => void = () => {}
  const mock = {
    location: "default-loc",
    theme: { text: { base: "#eeeeee" } },
    data: {
      location: {
        default: () => "default-loc",
        model: {
          list: (location: string) => {
            input.modelListLocations?.push(location)
            return models
          },
          sync: async () => {},
        },
      },
      session: {
        get: () => (input.sessionLocation === undefined ? undefined : { location: input.sessionLocation }),
        message: { list: input.messages },
      },
    },
    ui: { model: { current: () => ({ providerID: "Kimi", modelID: "kimi-k3" }) } },
    client: {
      rpc: () => ({
        tools: async () => {
          if (input.toolsError?.()) throw new Error("no rpc")
          return { tools: (input.tools ?? (() => []))() }
        },
      }),
    },
    keymap: {
      layer: (layer: () => { commands?: Array<{ run: () => void }> }) => {
        toggle = layer().commands?.[0]?.run ?? toggle
      },
    },
  }
  return { context: mock as unknown as Context, toggle: () => toggle() }
}

const assistant = (tokens: { input: number; output: number }) => ({
  type: "assistant",
  model: { providerID: "Kimi", id: "kimi-k3" },
  tokens: { ...tokens, reasoning: 0, cache: { read: 0, write: 0 } },
})

const tests: Array<[string, () => Promise<void>]> = [
  [
    "context usage meter updates as assistant tokens arrive",
    async () => {
      const [messages, setMessages] = createSignal<Array<Record<string, unknown>>>([])
      const { context } = mockContext({ messages })
      const setup = await testRender(
        () => (
          <PluginContextProvider value={context}>
            <Sidebar sessionID="ses_test" toolsPollMs={30} />
          </PluginContextProvider>
        ),
        { width: 40, height: 20 },
      )
      try {
        await new Promise((resolve) => setTimeout(resolve, 60))
        await setup.renderOnce()
        const initial = setup.captureCharFrame()
        assert.ok(initial.includes(`${"░".repeat(13)} 0K/262K 0%`), initial)

        setMessages([assistant({ input: 120_000, output: 500 })])
        await setup.renderOnce()
        const updated = setup.captureCharFrame()
        assert.ok(updated.includes(`${"█".repeat(6)}${"░".repeat(7)} 121K/262K 46%`), updated)

        setMessages([...messages(), assistant({ input: 200_000, output: 1_000 })])
        await setup.renderOnce()
        const again = setup.captureCharFrame()
        assert.ok(again.includes(`${"█".repeat(10)}${"░".repeat(3)} 201K/262K 77%`), again)
      } finally {
        setup.renderer.destroy()
      }
    },
  ],
  [
    "usage resolves the model catalog through the session's location",
    async () => {
      const modelListLocations: string[] = []
      const { context } = mockContext({ messages: () => [], sessionLocation: "session-loc", modelListLocations })
      const setup = await testRender(
        () => (
          <PluginContextProvider value={context}>
            <Sidebar sessionID="ses_test" toolsPollMs={30} />
          </PluginContextProvider>
        ),
        { width: 40, height: 20 },
      )
      try {
        await new Promise((resolve) => setTimeout(resolve, 60))
        await setup.renderOnce()
        assert.ok(modelListLocations.includes("session-loc"), modelListLocations.join())
        assert.ok(!modelListLocations.includes("default-loc"), modelListLocations.join())
      } finally {
        setup.renderer.destroy()
      }
    },
  ],
  [
    "tools list refreshes on poll after an empty start and toggles open",
    async () => {
      const [tools, setTools] = createSignal<string[]>([])
      const { context, toggle } = mockContext({ messages: () => [], tools })
      const setup = await testRender(
        () => (
          <PluginContextProvider value={context}>
            <Sidebar sessionID="ses_test" toolsPollMs={30} />
          </PluginContextProvider>
        ),
        { width: 40, height: 20 },
      )
      try {
        await new Promise((resolve) => setTimeout(resolve, 60))
        await setup.renderOnce()
        assert.ok(setup.captureCharFrame().includes("▸ Tools (0)"))

        setTools(["read", "sbash"])
        await new Promise((resolve) => setTimeout(resolve, 90))
        await setup.renderOnce()
        const refreshed = setup.captureCharFrame()
        assert.ok(refreshed.includes("▸ Tools (2)"), refreshed)

        toggle()
        await setup.renderOnce()
        const expanded = setup.captureCharFrame()
        assert.ok(expanded.includes("▾ Tools (2)"), expanded)
        assert.ok(expanded.includes("read"), expanded)
        assert.ok(expanded.includes("sbash"), expanded)
      } finally {
        setup.renderer.destroy()
      }
    },
  ],
  [
    "tools header reports rpc failure instead of a misleading zero",
    async () => {
      const [fail, setFail] = createSignal(true)
      const { context } = mockContext({ messages: () => [], tools: () => ["read"], toolsError: fail })
      const setup = await testRender(
        () => (
          <PluginContextProvider value={context}>
            <Sidebar sessionID="ses_test" toolsPollMs={30} />
          </PluginContextProvider>
        ),
        { width: 40, height: 20 },
      )
      try {
        await new Promise((resolve) => setTimeout(resolve, 60))
        await setup.renderOnce()
        const broken = setup.captureCharFrame()
        assert.ok(broken.includes("▸ Tools (rpc unavailable)"), broken)

        setFail(false)
        await new Promise((resolve) => setTimeout(resolve, 90))
        await setup.renderOnce()
        const healed = setup.captureCharFrame()
        assert.ok(healed.includes("▸ Tools (1)"), healed)
      } finally {
        setup.renderer.destroy()
      }
    },
  ],
  [
    "sidebar adds no MCP section of its own",
    async () => {
      const { context } = mockContext({ messages: () => [] })
      const setup = await testRender(
        () => (
          <PluginContextProvider value={context}>
            <Sidebar sessionID="ses_test" toolsPollMs={30} />
          </PluginContextProvider>
        ),
        { width: 40, height: 20 },
      )
      try {
        await new Promise((resolve) => setTimeout(resolve, 60))
        await setup.renderOnce()
        // The built-in sidebar owns the MCP section; ours must not reappear.
        assert.ok(!setup.captureCharFrame().includes("MCP"), setup.captureCharFrame())
      } finally {
        setup.renderer.destroy()
      }
    },
  ],
]

let failed = 0
for (const [name, run] of tests) {
  try {
    await run()
    console.log(`ok - ${name}`)
  } catch (error) {
    failed++
    console.error(`FAIL - ${name}`)
    console.error(error)
  }
}
if (failed > 0) {
  console.error(`${failed} of ${tests.length} render tests failed`)
  process.exit(1)
}
console.log(`${tests.length} render tests passed`)
