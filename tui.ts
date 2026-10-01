// TUI plugin entry for local path installs. Host-side resolution maps a
// directory target to <root>/tui — the package.json "./tui" export only
// applies to package-name specifiers (managed npm/git installs, which load
// the compiled dist/tui.js). Local installs load this file instead; being
// outside node_modules, the TUI applies its Solid JSX transform to the
// source it re-exports, so no build step is needed for local development.
export { default } from "./src/tui"
