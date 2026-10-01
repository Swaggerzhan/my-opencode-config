// Custom tool `sbash`: executes whitelisted binaries (git, openspec, ls, rm,
// rmdir) with literal argv via execFile. No shell, so pipes, redirects, and
// arbitrary commands are structurally impossible. ls is fixed to
// `ls -al <absolute path>`, rm to `rm -f <absolute path>`, rmdir to
// `rmdir <absolute path>` (removes empty directories only).
// All parameters are scalars because the TUI's generic-tool title renders only
// primitive (string/number/boolean) inputs — an array parameter would be
// invisible there. The tool id is "sbash", which is also the permission
// action.
//
// Restricted agents (codeleader, coder, insight) get sbash INSTEAD of the
// built-in shell tool: the context hook below removes `shell` from their
// model requests entirely, because a permission deny alone leaves the full
// shell tool prompt visible to the model. Agents that keep the full shell
// (or have no business with either) get sbash removed instead. Permission
// rules in the agent files remain as the execution-time backstop.

import { Plugin } from "@opencode/plugin"
import { execFile } from "node:child_process"
import { promisify } from "node:util"

type Context = Parameters<NonNullable<Parameters<typeof Plugin.define>[0]["setup"]>>[0]

const exec = promisify(execFile)

const WHITELIST = new Set(["git", "openspec", "ls", "rm", "rmdir"])

// Agents whose only command channel is sbash.
const SBASH_ONLY = new Set(["codeleader", "coder", "insight"])
// Agents that must not see sbash (full shell, or read-only).
const SBASH_HIDDEN = new Set(["main", "codebuilder", "general", "scout"])

// Splits an argument string on whitespace, grouping double- or single-quoted
// segments. No escapes or expansion: this only decides argv boundaries and is
// never interpreted by a shell. Exported for test/tools.test.ts.
export function splitArgv(input: string): string[] {
  const out: string[] = []
  for (const m of input.matchAll(/"([^"]*)"|'([^']*)'|(\S+)/g)) {
    out.push(m[1] ?? m[2] ?? m[3])
  }
  return out
}

export async function setupTools(ctx: Context): Promise<() => void> {
  const cwd = ctx.location.directory

  await ctx.tool.transform((editor) => {
    editor.add({
      name: "sbash",
      description:
        "Run a simple whitelisted command: git, openspec, ls, rm, or rmdir. ls, rm, and rmdir take `path` (absolute paths only): ls runs as `ls -al <path>`, rm as `rm -f <path>`, rmdir as `rmdir <path>` (removes empty directories only). git and openspec take `args`, one argument string; quote any argument containing spaces, e.g. `commit -m \"message\"`.",
      input: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "Command to run, one of: git, openspec, ls, rm, rmdir",
          },
          path: {
            type: "string",
            description: "Absolute path. Required by ls, rm, and rmdir; ignored otherwise",
          },
          args: {
            type: "string",
            description:
              'Argument string for git or openspec, e.g. `status --short` or `commit -m "message"`. Quote arguments containing spaces',
          },
        },
        required: ["command"],
        additionalProperties: false,
      },
      async execute(raw: unknown, context) {
        const input = raw as { command: string; path?: string; args?: string }
        const { command } = input
        if (!WHITELIST.has(command)) {
          return { content: `command not allowed: ${command} (whitelist: git, openspec, ls, rm, rmdir)` }
        }
        let argv: string[]
        if (command === "git" || command === "openspec") {
          argv = splitArgv(input.args ?? "")
        } else {
          // Requiring absolute paths also blocks flag injection, since an
          // argument starting with "/" is never parsed as a flag.
          const path = input.path ?? ""
          if (!path.startsWith("/")) {
            return { content: `${command} requires an absolute path in the "path" argument` }
          }
          if (command === "ls") argv = ["-al", path]
          else if (command === "rm") argv = ["-f", path]
          else argv = [path] // rmdir itself refuses non-empty directories
        }
        try {
          const out = await exec(command, argv, {
            cwd,
            timeout: 120_000,
            maxBuffer: 10 * 1024 * 1024,
            signal: context.signal,
          })
          return {
            content: [out.stdout?.trim(), out.stderr?.trim()].filter(Boolean).join("\n") || "(no output)",
          }
        } catch (err) {
          const e = err as { stdout?: string; stderr?: string; code?: unknown }
          return {
            content: [
              e.stdout?.trim(),
              e.stderr?.trim(),
              `${command} failed (exit code ${e.code ?? "unknown"})`,
            ]
              .filter(Boolean)
              .join("\n"),
          }
        }
      },
    })
  })

  const hook = await ctx.session.hook("context", (event) => {
    if (SBASH_ONLY.has(event.agent)) delete event.tools.shell
    if (SBASH_HIDDEN.has(event.agent)) delete event.tools.sbash
  })

  return () => {
    hook.dispose()
  }
}
