import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { setupInstructions } from "../src/instructions"

test("setupInstructions appends AGENTS_.md as a system part", async () => {
  let hookFn: ((event: { system: Array<{ type: string; text: string }> }) => void) | undefined
  let disposed = false
  const ctx = {
    session: {
      hook: async (_name: string, fn: typeof hookFn) => {
        hookFn = fn
        return { dispose: () => (disposed = true) }
      },
    },
  }
  const cleanup = await setupInstructions(ctx as never)
  assert.ok(hookFn)

  const event = { system: [] as Array<{ type: string; text: string }> }
  hookFn!(event)
  assert.equal(event.system.length, 1)
  assert.equal(event.system[0].type, "text")
  assert.equal(event.system[0].text, readFileSync(new URL("../AGENTS_.md", import.meta.url), "utf8"))

  cleanup()
  assert.ok(disposed)
})
