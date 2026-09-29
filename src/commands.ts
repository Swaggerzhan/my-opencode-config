// Slash commands /dig and /fixme. Plugin-registered commands behave like
// file-based ones: the executor forwards the expanded template as a session
// prompt.

import { Plugin } from "@opencode/plugin"

type Context = Parameters<NonNullable<Parameters<typeof Plugin.define>[0]["setup"]>>[0]

const DIG = `Launch a Coder subagent to research the following instruction:

$ARGUMENTS

Before launching, include any useful context you already hold in the
subagent's prompt — relevant files, symbols, prior findings, and constraints —
so the Coder does not repeat research you have already done.

Require the subagent to return its findings as its final message, then report
the result back to the user concisely.`

const FIXME = `Search the current project's code for the markers \`FIXME(ai)\` and
\`ASK(ai)\`. Every marker carries a description written by the user. Read it
and its surrounding context.

For each \`FIXME(ai)\` marker:
- If the request is clear and unambiguous, implement the change directly.
- If anything is unclear, do not touch it; raise it as an open question.

For each \`ASK(ai)\` marker, discuss it with the user:
- Investigate the code and give your conclusion.
- Do not modify any code before the discussion is finished.
- If the conclusion requires a change, wait for the user's command, then
  implement it.

Report concisely: changes made (per FIXME), open questions (unclear FIXMEs),
conclusions (per ASK), each with its file location.

Once the user is satisfied with a marker's result, remove the marker comment.`

export async function setupCommands(ctx: Context): Promise<void> {
  await ctx.command.transform((editor) => {
    editor.add({
      name: "dig",
      description: "Launch a Coder subagent to research the given instruction and return the results.",
      execute: async ({ sessionID, prompt, delivery }) => {
        await ctx.session.prompt({
          ...prompt,
          sessionID,
          // Function replacement: a plain string would treat $-patterns in
          // the user's argument as special replacement markers.
          text: DIG.replace("$ARGUMENTS", () => prompt.text),
          delivery,
        })
      },
    })
    editor.add({
      name: "fixme",
      description: "Process FIXME(ai) and ASK(ai) markers in the current project.",
      execute: async ({ sessionID, prompt, delivery }) => {
        await ctx.session.prompt({ ...prompt, sessionID, text: FIXME, delivery })
      },
    })
  })
}
