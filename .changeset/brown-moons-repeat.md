---
'@viamrobotics/visualization': major
---

Remove the deprecated `client/client` v1 API and its WebSocket transport, rename `traits.DrawServiceAPI` to `traits.DrawAPI`, replace the `<DrawService />` `websocketPort` prop with a `port` that actually selects the draw server, drop the bundled LLM scene builder backend in favor of the prompt and schemas now exported from `@viamrobotics/visualization/scene-builder`, and retire the Bun dev server now that the Go draw server serves static files
