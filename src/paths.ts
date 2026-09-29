// Shared filesystem locations: the plugin package root and the user's global
// OpenCode config directory.

import os from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"

// src/ lives one level below the package root.
export const packageRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..")

export function globalConfigDir(): string {
  const xdg = process.env.XDG_CONFIG_HOME
  return xdg ? path.join(xdg, "opencode") : path.join(os.homedir(), ".config", "opencode")
}
