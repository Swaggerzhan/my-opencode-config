# Repository Guide

This repository is an OpenCode V2 plugin package, installed through
`opencode plugin add github:...`. Everything takes effect through the plugin
entry (`index.ts`); do not add install scripts that write to user
configuration. The one exception is `src/agents.ts`, which generates
`agents/*.md` into `~/.config/opencode/agents/` (with the model mapping
injected) because the plugin API cannot register agents.

Layout:

- `index.ts`, `src/` — plugin code (Promise API, `@opencode/plugin`).
  `src/tui.tsx` is the TUI sidebar (Context Usage meter, MCP status,
  collapsible Tools). The `./tui` export points at the **compiled**
  `dist/tui.js`, not the source: OpenCode's TUI only applies its Solid JSX
  transform to files outside `node_modules`, so managed (npm/git) installs
  must ship JSX-free JS. `src/rpc.ts` is the
  RPC definition it shares with the server side; `src/usage.ts` holds the
  meter's pure computations; `src/paths.ts` the shared filesystem locations.
- `agents/` — agent definitions (V2 frontmatter: `permissions` list; no
  `name` field, the filename is the ID; no `model` field, models are injected
  from the mapping during materialization)
- `my-opencode-config.jsonc` — bundled default agent→model mapping;
  `~/.config/opencode/my-opencode-config.jsonc` overrides entries per agent
- `opencode.jsonc` — ready-made global config (env-based providers) for the
  user to copy or merge; never loaded by the plugin itself
- `AGENTS_.md` — global instructions injected by `src/instructions.ts`. The
  trailing underscore keeps it from loading as project guidance.
- `cli.json` — TUI snippet for manual merge into `~/.config/opencode/cli.json`
- `test/` — unit tests (`npm test`, tsx + node:test; dev-only, not part of
  the plugin runtime). `test/sidebar.test.tsx` skips unless the OpenTUI
  native renderer is available (bun).
- `docs/` — reference material

Development: `npm install` once (runtime deps are installed by OpenCode for
managed installs, but local path loading does not install them), then
`npx tsc --noEmit` to typecheck and `npm test` to run the tests. After
editing `src/tui.tsx` (or its imports `rpc.ts`/`usage.ts`), run
`npm run build:tui` and commit `dist/` — git installs have no build step.
Do not name the script `build`/`prepare`/`prepack`/`install`: pacote runs
git-dep preparation when any of those exist, and OpenCode's bundled npm-cli
fails that step ("git dep preparation failed").

Local verification without touching the real environment:

```bash
mkdir -p /tmp/oc/config/opencode /tmp/oc/data /tmp/oc/cache /tmp/oc/proj
printf '{ "plugins": ["%s"] }\n' "$PWD" > /tmp/oc/config/opencode/opencode.json
cd /tmp/oc/proj && env XDG_CONFIG_HOME=/tmp/oc/config XDG_DATA_HOME=/tmp/oc/data \
  XDG_CACHE_HOME=/tmp/oc/cache opencode serve --hostname 127.0.0.1 --port 18999
```

Then query `http://127.0.0.1:18999/api/agent` (and `command`, `provider`,
`mcp`, `plugin`) with basic auth `opencode:<password from the server log>`.
Do not use `opencode api` here: it discovers the shared background service
regardless of the XDG overrides.
