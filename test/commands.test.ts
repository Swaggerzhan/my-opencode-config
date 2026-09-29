import assert from "node:assert/strict"
import test from "node:test"
import { setupCommands } from "../src/commands"

type Command = {
  name: string
  execute: (input: { sessionID: string; prompt: { text: string }; delivery: unknown }) => Promise<void>
}

async function setup() {
  const added: Command[] = []
  const sent: Array<{ text: string }> = []
  const ctx = {
    command: { transform: async (fn: (editor: { add: (command: never) => void }) => void) => fn({ add: (c) => added.push(c) }) },
    session: {
      prompt: async (input: { text: string }) => {
        sent.push(input)
      },
    },
  }
  await setupCommands(ctx as never)
  return { added, sent }
}

test("/dig forwards the template with the argument embedded", async () => {
  const { added, sent } = await setup()
  const dig = added.find((command) => command.name === "dig")
  assert.ok(dig)
  await dig.execute({ sessionID: "s1", prompt: { text: "check the auth flow" }, delivery: undefined })
  assert.equal(sent.length, 1)
  assert.match(sent[0].text, /Launch a Coder subagent/)
  assert.match(sent[0].text, /check the auth flow/)
  assert.ok(!sent[0].text.includes("$ARGUMENTS"))
})

test("/dig preserves $-patterns in the argument literally", async () => {
  const { added, sent } = await setup()
  const dig = added.find((command) => command.name === "dig")
  await dig!.execute({ sessionID: "s1", prompt: { text: "price is $& and $` and $'" }, delivery: undefined })
  assert.ok(sent[0].text.includes("price is $& and $` and $'"), sent[0].text)
})

test("/fixme forwards its template unchanged", async () => {
  const { added, sent } = await setup()
  const fixme = added.find((command) => command.name === "fixme")
  assert.ok(fixme)
  await fixme.execute({ sessionID: "s1", prompt: { text: "ignored" }, delivery: undefined })
  assert.match(sent[0].text, /FIXME\(ai\)/)
  assert.match(sent[0].text, /ASK\(ai\)/)
})
