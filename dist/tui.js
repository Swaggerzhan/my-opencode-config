import { jsx as _jsx, jsxs as _jsxs } from "@opentui/solid/jsx-runtime";
// TUI sidebar additions: two sections prepended ahead of the built-in
// sidebar content. The host's own sections (Context, MCP, ...) keep their
// original rendering and theme colors — this plugin only adds:
//
// - Context Usage: a bar as wide as its label, used/max context in K tokens,
//   and the percentage. Color by absolute usage: green below 100K, yellow
//   below 180K, red from 180K up.
// - Tools: collapsible list of the tools the session's agent can actually
//   see, observed server-side per model request and fetched over RPC (no
//   public API exposes the effective per-agent tool set). Empty until the
//   session's first request after plugin load. Toggle by clicking the header
//   or via the "Toggle sidebar tools" palette command.
//
// Loaded automatically through the package's "./tui" export (managed
// installs, compiled dist) or the root tui.ts entry (local path installs,
// source).
import { Plugin, usePlugin } from "@opencode/plugin/tui";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { SidebarRpc } from "./rpc";
import { contextUsage, formatK, usageBar, usageColor, usagePercent } from "./usage";
const USAGE_LABEL = "Context Usage";
const BAR_WIDTH = USAGE_LABEL.length;
function Usage(props) {
    const context = usePlugin();
    // The server keeps the model catalog per location; key it by the session's
    // own location, which can differ from the TUI's current worktree.
    const session = createMemo(() => context.data.session.get(props.sessionID));
    const location = () => session()?.location ?? context.location ?? context.data.location.default();
    onMount(() => {
        void context.data.location.model.sync(location());
    });
    const usage = createMemo(() => contextUsage(context.data.session.message.list(props.sessionID), context.ui.model.current(), context.data.location.model.list(location()) ?? []));
    const color = createMemo(() => usageColor(usage().used));
    const bar = createMemo(() => usageBar(usage().used, usage().limit, BAR_WIDTH));
    return (_jsxs("box", { flexDirection: "column", children: [_jsx("text", { fg: context.theme.text.base, children: USAGE_LABEL }), _jsx(Show, { when: usage().limit, fallback: _jsx("text", { fg: color(), children: `${bar()} ${formatK(usage().used)}` }), children: (limit) => (_jsx("text", { fg: color(), children: `${bar()} ${formatK(usage().used)}/${formatK(limit())} ${usagePercent(usage().used, limit())}%` })) })] }));
}
function Tools(props) {
    const context = usePlugin();
    const rpc = context.client.rpc(SidebarRpc);
    const [open, setOpen] = createSignal(false);
    const [tools, setTools] = createSignal([]);
    const [unavailable, setUnavailable] = createSignal(false);
    onMount(() => {
        const load = async () => {
            try {
                const result = (await rpc.tools({ sessionID: props.sessionID }));
                setTools(result.tools);
                setUnavailable(false);
            }
            catch (error) {
                // Keep the last good list, but say so — an empty header otherwise
                // looks identical to "no request recorded yet".
                console.error("my-opencode-config sidebar: tools rpc failed", error);
                setUnavailable(true);
            }
        };
        void load();
        const timer = setInterval(() => void load(), props.pollMs ?? 3000);
        onCleanup(() => clearInterval(timer));
    });
    context.keymap.layer(() => ({
        commands: [
            {
                id: "my-opencode-config.sidebar.tools.toggle",
                title: "Toggle sidebar tools",
                palette: true,
                run: () => {
                    setOpen(!open());
                },
            },
        ],
    }));
    return (_jsxs("box", { flexDirection: "column", children: [_jsx("text", { fg: context.theme.text.base, onMouseUp: () => setOpen(!open()), children: `${open() ? "▾" : "▸"} Tools (${unavailable() ? "rpc unavailable" : tools().length})` }), _jsx(Show, { when: open(), children: _jsx(Show, { when: tools().length > 0, fallback: _jsx("text", { fg: context.theme.text.base, children: "  (no request yet)" }), children: _jsx(For, { each: tools(), children: (tool) => _jsx("text", { fg: context.theme.text.base, children: `  ${tool}` }) }) }) })] }));
}
// Exported for test/sidebar.test.tsx.
export function Sidebar(props) {
    return (_jsxs("box", { flexDirection: "column", children: [_jsx(Usage, { sessionID: props.sessionID }), _jsx("text", { children: " " }), _jsx(Tools, { sessionID: props.sessionID, pollMs: props.toolsPollMs })] }));
}
export default Plugin.define({
    id: "my-opencode-config.tui",
    setup(context) {
        return context.ui.slot({
            prepend: "sidebar.content",
            render: ({ sessionID }) => _jsx(Sidebar, { sessionID: sessionID }),
        });
    },
});
