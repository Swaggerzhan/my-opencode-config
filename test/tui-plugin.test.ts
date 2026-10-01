import assert from "node:assert/strict"
import test from "node:test"
import SidebarPlugin from "../src/tui"

// Regression coverage for the sidebar slot claim. A `replace` claim on
// sidebar.content suppresses every built-in section (Context, MCP), which
// removed the original MCP display and its theme colors. The claim must stay
// additive (prepend) so the built-in sections keep rendering.
test("sidebar claim prepends to sidebar.content, never replaces", () => {
  const claims: Array<Record<string, unknown>> = []
  const context = {
    ui: {
      slot: (claim: Record<string, unknown>) => {
        claims.push(claim)
        return () => {}
      },
    },
  }
  const cleanup = SidebarPlugin.setup(context as never)
  assert.equal(typeof cleanup, "function")
  assert.equal(claims.length, 1)
  const [claim] = claims
  assert.equal(claim.prepend, "sidebar.content")
  for (const placement of ["replace", "append", "before", "after"]) {
    assert.equal(claim[placement], undefined, `unexpected placement: ${placement}`)
  }
  assert.equal(typeof claim.render, "function")
})
