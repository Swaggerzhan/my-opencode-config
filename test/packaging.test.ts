// Packaging guard for git installs: pacote/lib/git.js #prepareDir runs
// git-dep preparation when any of these script names exist, and OpenCode's
// bundled npm-cli fails that step ("git dep preparation failed").

import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

const root = new URL("..", import.meta.url).pathname
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

const PREPARE_TRIGGERS = ["build", "prepare", "prepack", "preinstall", "install", "postinstall"]

test("package.json scripts avoid pacote git-dep preparation triggers", () => {
  const offenders = Object.keys(pkg.scripts ?? {}).filter((name) => PREPARE_TRIGGERS.includes(name))
  assert.deepEqual(offenders, [], `script names ${offenders.join(", ")} trigger git-dep preparation`)
})
