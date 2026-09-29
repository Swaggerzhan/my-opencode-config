// TUI sidebar: replaces the built-in sidebar content with three sections.
//
// - Context Usage: a bar as wide as its label, used/max context in K tokens,
//   and the percentage. Color by absolute usage: green below 100K, yellow
//   below 180K, red from 180K up.
// - MCP: configured servers with their connection status.
// - Tools: collapsible list of the tools the session's agent can actually
//   see, observed server-side per model request and fetched over RPC (no
//   public API exposes the effective per-agent tool set). Empty until the
//   session's first request after plugin load. Toggle by clicking the header
//   or via the "Toggle sidebar tools" palette command.
//
// Loaded automatically through the package's "./tui" export.

import { Plugin, usePlugin } from "@opencode/plugin/tui"
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js"
import { SidebarRpc } from "./rpc"
import { contextUsage, formatK, GREEN, RED, usageBar, usageColor, usagePercent, YELLOW } from "./usage"

const USAGE_LABEL = "Context Usage"
const BAR_WIDTH = USAGE_LABEL.length

function Usage(props: { sessionID: string }) {
  const context = usePlugin()
  const location = context.location ?? context.data.location.default()

  onMount(() => {
    void context.data.location.model.sync(location)
  })

  const usage = createMemo(() =>
    contextUsage(
      context.data.session.message.list(props.sessionID),
      context.ui.model.current(),
      context.data.location.model.list(location) ?? [],
    ),
  )

  const color = createMemo(() => usageColor(usage().used))
  const bar = createMemo(() => usageBar(usage().used, usage().limit, BAR_WIDTH))

  return (
    <box flexDirection="column">
      <text fg={context.theme.text.base}>{USAGE_LABEL}</text>
      <Show when={usage().limit} fallback={<text fg={color()}>{`${bar()} ${formatK(usage().used)}`}</text>}>
        {(limit) => (
          <text fg={color()}>{`${bar()} ${formatK(usage().used)}/${formatK(limit())} ${usagePercent(usage().used, limit())}%`}</text>
        )}
      </Show>
    </box>
  )
}

function Mcp() {
  const context = usePlugin()
  const location = context.location ?? context.data.location.default()

  onMount(() => {
    void context.data.location.mcp.server.sync(location)
  })

  const servers = createMemo(() => context.data.location.mcp.server.list(location) ?? [])

  return (
    <box flexDirection="column">
      <text fg={context.theme.text.base}>MCP</text>
      <Show when={servers().length > 0} fallback={<text fg={context.theme.text.base}>(none)</text>}>
        <For each={servers()}>
          {(server) => {
            const status = server.status.status
            const fg = status === "connected" ? GREEN : status === "failed" || status === "needs_auth" ? RED : YELLOW
            return <text fg={fg}>{`${server.name} ${status.replace("_", " ")}`}</text>
          }}
        </For>
      </Show>
    </box>
  )
}

function Tools(props: { sessionID: string }) {
  const context = usePlugin()
  const rpc = context.client.rpc(SidebarRpc)
  const [open, setOpen] = createSignal(false)
  const [tools, setTools] = createSignal<string[]>([])

  onMount(() => {
    const load = async () => {
      try {
        const result = (await rpc.tools({ sessionID: props.sessionID })) as { tools: string[] }
        setTools(result.tools)
      } catch {
        // Server plugin not reachable yet; retried on the next tick.
      }
    }
    void load()
    const timer = setInterval(() => void load(), 3000)
    onCleanup(() => clearInterval(timer))
  })

  context.keymap.layer(() => ({
    commands: [
      {
        id: "my-opencode-config.sidebar.tools.toggle",
        title: "Toggle sidebar tools",
        palette: true,
        run: () => {
          setOpen(!open())
        },
      },
    ],
  }))

  return (
    <box flexDirection="column">
      <text fg={context.theme.text.base} onMouseUp={() => setOpen(!open())}>
        {`${open() ? "▾" : "▸"} Tools (${tools().length})`}
      </text>
      <Show when={open()}>
        <Show when={tools().length > 0} fallback={<text fg={context.theme.text.base}>  (no request yet)</text>}>
          <For each={tools()}>{(tool) => <text fg={context.theme.text.base}>{`  ${tool}`}</text>}</For>
        </Show>
      </Show>
    </box>
  )
}

// Exported for test/sidebar.test.tsx.
export function Sidebar(props: { sessionID: string }) {
  return (
    <box flexDirection="column">
      <Usage sessionID={props.sessionID} />
      <text> </text>
      <Mcp />
      <text> </text>
      <Tools sessionID={props.sessionID} />
    </box>
  )
}

export default Plugin.define({
  id: "my-opencode-config.tui",
  setup(context) {
    return context.ui.slot({
      replace: "sidebar.content",
      render: ({ sessionID }) => <Sidebar sessionID={sessionID} />,
    })
  },
})
