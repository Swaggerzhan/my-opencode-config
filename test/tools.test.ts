import assert from "node:assert/strict"
import test from "node:test"
import { splitArgv } from "../src/tools"

test("splitArgv splits on whitespace", () => {
  assert.deepEqual(splitArgv("status --short"), ["status", "--short"])
})

test("splitArgv groups quoted segments", () => {
  assert.deepEqual(splitArgv('commit -m "fix: a b"'), ["commit", "-m", "fix: a b"])
  assert.deepEqual(splitArgv("commit -m 'fix: a b'"), ["commit", "-m", "fix: a b"])
  assert.deepEqual(splitArgv(`commit -m "it's fine"`), ["commit", "-m", "it's fine"])
})

test("splitArgv keeps empty quoted arguments", () => {
  assert.deepEqual(splitArgv('commit -m ""'), ["commit", "-m", ""])
})

test("splitArgv on empty input", () => {
  assert.deepEqual(splitArgv(""), [])
})
