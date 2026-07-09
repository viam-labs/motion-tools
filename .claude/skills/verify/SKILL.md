---
name: verify
description: Build, launch, and drive the visualizer to verify a change end-to-end at its rendered surface.
---

# Verify a change in the running visualizer

## Build + launch

```bash
pnpm run up   # wireit: vite-build + go-build, then bun static server (5173) + draw-server (3030)
```

- **Never invoke it as bare `pnpm up`** — pnpm treats `up` as the built-in
  `update` alias and mutates package.json/pnpm-lock.yaml instead of running
  the wireit script. Always `pnpm run up` (`make up` does this).
- Server is ready when `curl -s http://localhost:5173/` returns 200
  (~30-60s cold build).
- The bun server serves exact files from `build/` — routes need `.html`:
  `http://localhost:5173/snapshot.html` (self-contained demo scene, loads
  `/visualization_snapshot.json`, no robot required). `/snapshot` 404s.

## Drive it

Playwright is available via the repo's `@playwright/test` devDep. Scripts
must live inside the repo root for module resolution:

```js
import { chromium } from '@playwright/test'
```

Useful selectors on the snapshot page:

- Dashboard buttons use `aria-label` = their description, e.g.
  `[aria-label="Settings"]`.
- Settings panel tabs are text labels: Connection / Scene / Debug / etc.
- Debug tab has a "Render stats" `<Switch>` (toggles the three-perf
  monitor, `#three-perf-ui`).
- Robot-query console errors (`[viam-svelte-sdk] error … getPose …`) are
  expected offline noise on the snapshot page; the SvelteKit router also
  logs one `Not found: /snapshot.html` — both harmless.

## Gotchas

- Settings persist via localStorage per browser context; fresh Playwright
  contexts start from defaults.
- Rendering is on-demand: after toggling scene settings give it ~1-2s
  before screenshotting.
- Sentry replay, GLTF/basis, and the PCD loader pool create blob workers
  at startup — don't mistake them for the code under test when
  intercepting `window.Worker`.
