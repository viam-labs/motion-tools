---
'@viamrobotics/motion-tools': minor
---

Remove the deprecated client/client v1 API and its WebSocket transport

This removes public surface. The Go packages `client/client`, `client/colorutil`, and
`client/shapes` are gone — use `client/api` and see the v1 to v2 migration guide. On the npm side,
`traits.DrawServiceAPI` is renamed to `traits.DrawAPI`, and `<DrawService />` no longer accepts
`websocketPort` in its `config` prop.

Read the trait rename carefully if you use it. `traits.DrawAPI` previously marked entities drawn
through the removed v1 WebSocket, so code referencing it keeps compiling but now matches
v2-drawn entities instead. That is the intended meaning — the trait marks anything drawn through
the draw API rather than sourced from the robot — but the change is silent, so audit call sites
rather than relying on the compiler.

In place of `websocketPort`, `config` takes an optional `port`, defaulting to `3030`. Unlike `websocketPort`, which
was read only by the removed WebSocket, `port` actually selects the draw server the plugin connects
to, and is configurable via the new `DRAW_SERVICE_PORT` environment variable on both the browser
and Go sides.

`<DrawService />` keeps reporting connection lifecycle to `useLogs` — connected, disconnected,
unreachable, and stream errors. An unreachable server logs once per outage rather than once per
retry.

The local app no longer ships an LLM scene builder backend. `<LLMSceneBuilder />` is unchanged and
still takes whatever `onInfer` you give it; what's gone is the bundled Anthropic-backed
implementation, which required an API key and a third server to run. Its system prompt and wire
schemas are now exported from `@viamrobotics/motion-tools/scene-builder` — a new server-safe entry
point with no Svelte or three.js dependency, so an API route can import it directly. See the
plugin docs for a worked handler.

With that gone, the Bun dev server is gone too: the Go draw server now serves static files, and
`bun` is no longer a prerequisite. `zod` moves from a dev dependency to a real one — it was
already imported at runtime from `dist`, so this fixes an existing packaging bug.

v1.42.0 was the last release to ship `client/client`.
