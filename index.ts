import { Plugin } from "@opencode/plugin"
import { setupAgents, sweepGeneratedAgents } from "./src/agents"
import { setupCommands } from "./src/commands"
import { setupTools } from "./src/tools"
import { setupInstructions } from "./src/instructions"
import { setupMcp } from "./src/mcp"

export default Plugin.define({
  id: "my-opencode-config",
  async setup(ctx) {
    const cleanups: Array<() => void | Promise<void>> = []
    const on = (key: string) => ctx.options[key] !== false

    if (on("agents")) cleanups.push(await setupAgents(ctx))
    else await sweepGeneratedAgents()
    if (on("instructions")) cleanups.push(await setupInstructions(ctx))
    if (on("commands")) await setupCommands(ctx)
    if (on("tools")) cleanups.push(await setupTools(ctx))
    if (on("mcp")) await setupMcp(ctx)

    return async () => {
      for (const cleanup of cleanups.reverse()) await cleanup()
    }
  },
})
