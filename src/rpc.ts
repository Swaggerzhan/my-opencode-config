// RPC surface shared by the server plugin and the TUI plugin: the sidebar's
// Tools section asks the server which tools a session's agent can actually
// see. The effective per-agent tool set is only observable in the server-side
// context hook (after all filtering); no public API exposes it.

import { Rpc } from "@opencode/plugin/rpc"

export const SidebarRpc = Rpc.define({
  id: "my-opencode-config",
  methods: {
    tools: {
      input: {
        type: "object",
        properties: { sessionID: { type: "string" } },
        required: ["sessionID"],
        additionalProperties: false,
      },
      output: {
        type: "object",
        properties: { tools: { type: "array", items: { type: "string" } } },
        required: ["tools"],
        additionalProperties: false,
      },
    },
  },
  events: {},
})
