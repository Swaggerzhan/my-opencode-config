// Loader for the agent→model mapping file (my-opencode-config.jsonc).
//
// Resolution: entries from ~/.config/opencode/my-opencode-config.jsonc override
// the bundled defaults in the repository root per agent; agents not mentioned
// in the user file keep the bundled default. watchMapping fires on changes to
// either file (debounced).

import { existsSync, promises as fs, watch } from "node:fs"
import path from "node:path"
import { parse as parseJsonc, type ParseError } from "jsonc-parser"
import { globalConfigDir, packageRoot } from "./paths"

const bundledFile = path.join(packageRoot, "my-opencode-config.jsonc")

export function userMappingFile(): string {
  return path.join(globalConfigDir(), "my-opencode-config.jsonc")
}

export function parseModelRef(ref: string): { providerID: string; id: string; variant?: string } | null {
  const hash = ref.indexOf("#")
  const core = hash === -1 ? ref : ref.slice(0, hash)
  const variant = hash === -1 ? undefined : ref.slice(hash + 1)
  const slash = core.indexOf("/")
  if (slash <= 0 || slash === core.length - 1) return null
  return {
    providerID: core.slice(0, slash),
    id: core.slice(slash + 1),
    ...(variant ? { variant } : {}),
  }
}

// Throws on unreadable files and on JSONC syntax errors: jsonc-parser recovers
// from errors instead of throwing, so without this check a malformed file
// would silently lose entries.
async function readEntries(file: string): Promise<Record<string, string>> {
  const errors: ParseError[] = []
  const parsed = parseJsonc(await fs.readFile(file, "utf8"), errors, { allowTrailingComma: true })
  if (errors.length > 0) throw new Error(`invalid JSONC (${errors.length} syntax error(s))`)
  const agents = (parsed as { agents?: unknown }).agents
  if (!agents || typeof agents !== "object") return {}
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(agents as Record<string, unknown>)) {
    if (typeof value === "string") out[key] = value
  }
  return out
}

export async function loadMapping(): Promise<Record<string, string>> {
  let mapping: Record<string, string> = {}
  try {
    mapping = await readEntries(bundledFile)
  } catch (err) {
    console.warn(`[my-opencode-config] failed to read bundled model mapping: ${err}`)
  }
  const userFile = userMappingFile()
  if (existsSync(userFile)) {
    try {
      mapping = { ...mapping, ...(await readEntries(userFile)) }
    } catch (err) {
      console.warn(`[my-opencode-config] failed to parse ${userFile}, using bundled defaults: ${err}`)
    }
  }
  return mapping
}

// Watches the user mapping file (including later creation) and the bundled
// file; fires the callback with the re-resolved mapping.
export function watchMapping(
  onChange: (mapping: Record<string, string>) => Promise<void>,
): { close(): void } | undefined {
  let timer: NodeJS.Timeout | undefined
  const refresh = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      void (async () => {
        try {
          await onChange(await loadMapping())
        } catch (err) {
          console.warn(`[my-opencode-config] failed to reload model mapping: ${err}`)
        }
      })()
    }, 100)
  }

  const watchers: Array<{ close(): void }> = []
  try {
    watchers.push(
      watch(globalConfigDir(), (_event, name) => {
        if (name === "my-opencode-config.jsonc") refresh()
      }),
    )
  } catch {}
  try {
    watchers.push(watch(bundledFile, refresh))
  } catch {}

  if (watchers.length === 0) return undefined
  return {
    close: () => {
      clearTimeout(timer)
      for (const watcher of watchers) watcher.close()
    },
  }
}
