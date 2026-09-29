// Injects the bundled AGENTS_.md as global instructions on every agent-loop
// request. The hook appends a system part instead of writing files, so a
// user's own global AGENTS.md (if any) is left untouched and both apply.

import { Plugin } from "@opencode/plugin"
import { promises as fs } from "node:fs"
import path from "node:path"
import { packageRoot } from "./paths"

type Context = Parameters<NonNullable<Parameters<typeof Plugin.define>[0]["setup"]>>[0]

export async function setupInstructions(ctx: Context): Promise<() => void> {
  const file = path.join(packageRoot, "AGENTS_.md")
  const text = await fs.readFile(file, "utf8")

  const registration = await ctx.session.hook("context", (event) => {
    event.system.push({ type: "text", text })
  })

  return () => registration.dispose()
}
