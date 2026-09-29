import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import { loadMapping } from "../src/mapping"
import { globalConfigDir } from "../src/paths"

function withXdg<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = mkdtempSync(path.join(os.tmpdir(), "moc-mapping-"))
  const saved = process.env.XDG_CONFIG_HOME
  process.env.XDG_CONFIG_HOME = dir
  return Promise.resolve()
    .then(() => fn(dir))
    .finally(() => {
      if (saved === undefined) delete process.env.XDG_CONFIG_HOME
      else process.env.XDG_CONFIG_HOME = saved
    })
}

test("globalConfigDir follows XDG_CONFIG_HOME", async () => {
  await withXdg(async (dir) => {
    assert.equal(globalConfigDir(), path.join(dir, "opencode"))
  })
})

test("loadMapping returns the bundled defaults without a user file", async () => {
  await withXdg(async () => {
    const mapping = await loadMapping()
    assert.equal(mapping["main"], "Kimi/kimi-k3#max")
    assert.equal(mapping["title"], "DeepSeek/deepseek-v4-flash#max")
  })
})

test("loadMapping merges user overrides per agent", async () => {
  await withXdg(async () => {
    mkdirSync(globalConfigDir(), { recursive: true })
    writeFileSync(path.join(globalConfigDir(), "my-opencode-config.jsonc"), '{ "agents": { "main": "OpenAI/gpt-5.6-sol" } }\n')
    const mapping = await loadMapping()
    assert.equal(mapping["main"], "OpenAI/gpt-5.6-sol")
    assert.equal(mapping["coder"], "Kimi/kimi-k3")
  })
})

test("loadMapping warns and keeps bundled defaults on malformed user JSONC", async () => {
  await withXdg(async () => {
    mkdirSync(globalConfigDir(), { recursive: true })
    writeFileSync(path.join(globalConfigDir(), "my-opencode-config.jsonc"), "{ broken\n")
    const warnings: string[] = []
    const warn = console.warn
    console.warn = (msg: unknown) => warnings.push(String(msg))
    try {
      const mapping = await loadMapping()
      assert.equal(mapping["main"], "Kimi/kimi-k3#max")
    } finally {
      console.warn = warn
    }
    assert.ok(warnings.some((line) => line.includes("using bundled defaults")), warnings.join("\n"))
  })
})
