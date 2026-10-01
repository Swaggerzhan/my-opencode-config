// Packaging contract tests: guards for the failure modes that only manifest
// when the plugin is installed as a managed (npm/git) package, where files
// land under node_modules and OpenCode's TUI skips its Solid JSX transform.
//
// Covered incidents:
// - "./tui" pointed at src/tui.tsx → JSX transpiled with Bun's default react
//   runtime → "Cannot find package 'react'" at plugin load.
// - a "build" script in package.json → pacote runs git-dep preparation →
//   OpenCode's bundled npm-cli fails it ("git dep preparation failed").
// - editing src/tui.tsx without rebuilding → stale dist/ shipped silently.

import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

const root = new URL("..", import.meta.url).pathname
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"))

// pacote/lib/git.js #prepareDir: any of these script names makes npm run
// git-dep preparation for git installs.
const PREPARE_TRIGGERS = ["build", "prepare", "prepack", "preinstall", "install", "postinstall"]

// Bare specifiers the TUI can satisfy for a plugin under node_modules:
// either rewritten to its internal runtime modules or resolvable from the
// plugin's installed dependencies.
const ALLOWED_IMPORT_PREFIXES = ["@opentui/solid", "@opentui/core", "solid-js", "@opencode/plugin"]

test("package.json scripts avoid pacote git-dep preparation triggers", () => {
  const offenders = Object.keys(pkg.scripts ?? {}).filter((name) => PREPARE_TRIGGERS.includes(name))
  assert.deepEqual(offenders, [], `script names ${offenders.join(", ")} trigger git-dep preparation; rename (e.g. build:tui)`)
})

test("./tui export points at a committed .js file, not source", () => {
  const tui = pkg.exports?.["./tui"]
  assert.ok(tui, 'exports["./tui"] is missing')
  assert.ok(tui.endsWith(".js"), `./tui must be compiled JS, got ${tui}`)
  readFileSync(join(root, tui)) // throws if dist is not committed
})

test("dist output has no JSX residue and only rewritable imports", () => {
  for (const file of readdirSync(join(root, "dist")).filter((f) => f.endsWith(".js"))) {
    const code = readFileSync(join(root, "dist", file), "utf8")
    assert.ok(!/<[A-Z][A-Za-z]*[\s>]/.test(code), `${file}: JSX residue`)
    const imports = [...code.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map((m) => m[1])
    for (const spec of imports) {
      if (spec.startsWith(".")) continue
      assert.ok(
        ALLOWED_IMPORT_PREFIXES.some((p) => spec === p || spec.startsWith(p + "/")),
        `${file}: import "${spec}" is not in the TUI-rewritable set`,
      )
    }
  }
})

test("committed dist is up-to-date with tsconfig.build.json", (t) => {
  const tmp = mkdtempSync(join(tmpdir(), "moc-build-"))
  t.after(() => rmSync(tmp, { recursive: true, force: true }))
  execFileSync("npx", ["tsc", "-p", "tsconfig.build.json", "--outDir", tmp], { cwd: root, stdio: "pipe" })
  for (const file of ["tui.js", "rpc.js", "usage.js"]) {
    assert.equal(
      readFileSync(join(root, "dist", file), "utf8"),
      readFileSync(join(tmp, file), "utf8"),
      `dist/${file} is stale — run npm run build:tui and commit dist/`,
    )
  }
})
