import assert from "node:assert/strict"
import test from "node:test"
import {
  contextUsage,
  formatK,
  GREEN,
  RED,
  totalTokens,
  usageBar,
  usageColor,
  usagePercent,
  YELLOW,
  type UsageMessage,
  type UsageModel,
} from "../src/usage"

const tokens = (input: number) => ({ input, output: 0, reasoning: 0, cache: { read: 0, write: 0 } })
const assistant = (input?: number, providerID = "Kimi", id = "kimi-k3"): UsageMessage => ({
  type: "assistant",
  model: { providerID, id },
  ...(input === undefined ? {} : { tokens: tokens(input) }),
})
const models: UsageModel[] = [{ providerID: "Kimi", id: "kimi-k3", modelID: "kimi-k3", limit: { context: 262_144 } }]

test("usageColor thresholds", () => {
  assert.equal(usageColor(0), GREEN)
  assert.equal(usageColor(99_999), GREEN)
  assert.equal(usageColor(100_000), YELLOW)
  assert.equal(usageColor(179_999), YELLOW)
  assert.equal(usageColor(180_000), RED)
  assert.equal(usageColor(250_000), RED)
})

test("usageBar fill and cap", () => {
  assert.equal(usageBar(0, 100, 13), "░".repeat(13))
  assert.equal(usageBar(50, 100, 13), "█".repeat(7) + "░".repeat(6))
  assert.equal(usageBar(200, 100, 13), "█".repeat(13))
  assert.equal(usageBar(50, undefined, 13), "░".repeat(13))
})

test("formatK and usagePercent", () => {
  assert.equal(formatK(0), "0K")
  assert.equal(formatK(82_345), "82K")
  assert.equal(formatK(262_144), "262K")
  assert.equal(usagePercent(65_536, 262_144), 25)
})

test("totalTokens sums every field", () => {
  assert.equal(totalTokens({ input: 1, output: 2, reasoning: 4, cache: { read: 8, write: 16 } }), 31)
})

test("contextUsage takes the latest assistant message with tokens", () => {
  const usage = contextUsage(
    [assistant(10_000), { type: "user" }, assistant(undefined), assistant(20_000), { type: "user" }, assistant(undefined)],
    undefined,
    models,
  )
  assert.deepEqual(usage, { used: 20_000, limit: 262_144 })
})

test("contextUsage falls back to the selected model without messages", () => {
  const usage = contextUsage([], { providerID: "Kimi", modelID: "kimi-k3" }, models)
  assert.deepEqual(usage, { used: 0, limit: 262_144 })
})

test("contextUsage reports no limit for an unknown model", () => {
  const usage = contextUsage([assistant(5_000, "Other", "x")], undefined, models)
  assert.deepEqual(usage, { used: 5_000 })
})
