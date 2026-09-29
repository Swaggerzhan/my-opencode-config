import assert from "node:assert/strict"
import test from "node:test"
import { parseModelRef } from "../src/mapping"

test("parseModelRef parses provider/model", () => {
  assert.deepEqual(parseModelRef("Kimi/kimi-k3"), { providerID: "Kimi", id: "kimi-k3" })
})

test("parseModelRef parses variant", () => {
  assert.deepEqual(parseModelRef("Kimi/kimi-k3#max"), { providerID: "Kimi", id: "kimi-k3", variant: "max" })
})

test("parseModelRef keeps slashes in the model id", () => {
  assert.deepEqual(parseModelRef("openrouter/anthropic/claude"), {
    providerID: "openrouter",
    id: "anthropic/claude",
  })
})

test("parseModelRef rejects malformed refs", () => {
  assert.equal(parseModelRef("nope"), null)
  assert.equal(parseModelRef("/model"), null)
  assert.equal(parseModelRef("provider/"), null)
})
