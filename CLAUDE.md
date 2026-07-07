# Viam Visualization

3D visualization and debugging interface for Viam robotics. Renders spatial data (frames, geometries, point clouds, drawings) using Svelte 5, Threlte/Three.js, and Koota ECS on the frontend, backed by a Connect-RPC Go service.

## Tech stack

| Layer           | Technology                                                    |
| --------------- | ------------------------------------------------------------- |
| Frontend        | Svelte 5 (runes), Threlte/Three.js, Koota ECS, Rapier physics |
| Styling         | TailwindCSS 4                                                 |
| RPC             | Connect-RPC (not standard gRPC)                               |
| Proto tooling   | Buf (`buf.yaml`, `buf.gen.*.yaml`)                            |
| Package manager | pnpm                                                          |
| Dev server      | Bun (`server/server.ts`)                                      |
| Go              | 1.25                                                          |
| Testing         | Vitest + Playwright (TS); `go.viam.com/test` (Go)             |

## Commands

```
make up            # build if needed, start server (ports 5173 + 3000)
pnpm proto         # vendor, lint, format, regenerate all protobuf
pnpm check         # svelte-check + go vet
pnpm lint          # prettier + eslint + golangci-lint
pnpm lint:client   # golangci-lint for client/
pnpm test          # vitest unit tests
pnpm test:draw     # Go tests for draw/
pnpm test:client   # Go tests for client/
pnpm test:e2e      # Playwright E2E
```

## Generated code — never hand-edit

- Any files included in `.gitignore` should not be edited
- Edit `.proto` files in `protos/`, then run `pnpm proto`.

## Code organization

Organize code by feature with **one focused unit per file**. File names should describe what the code does. Avoid generic bucket files (`utils`, `helpers`, `constants`).

## Documentation

User-facing docs live in `docs/` (Astro Starlight) and publish to https://viamrobotics.github.io/visualization/. The `.mdx` files under `docs/src/content/docs/` are the source of truth — read them locally rather than fetching the site. Before working on a documented feature, read its page; when changing documented behavior or public API, update the page in the same change.

| Page                         | Covers                                                                    |
| ---------------------------- | ------------------------------------------------------------------------- |
| `guides/local-usage.mdx`     | Running the visualizer locally and driving it from Go via `client/api`    |
| `guides/embedding.mdx`       | Mounting `<Visualizer />` inside an external Svelte app                   |
| `guides/worldstatestore.mdx` | Using the `draw` Go package to implement a `WorldStateStoreService`       |
| `plugins/<name>.mdx`         | One page per visualizer plugin in `src/lib/plugins/`                      |
| `migration/v1-to-v2.mdx`     | Migrating Go clients from `client/client` (v1) to `client/api` (v2)       |
| `api/*.md`                   | Generated from Go doc comments via `pnpm gen:api` — edit those, not these |

## Topic-specific rules

Detailed guidance lives in `.claude/rules/`. Path-scoped rules load when Claude reads matching files; rules without `paths` load every session.

| Rule                     | Loads when                                          |
| ------------------------ | --------------------------------------------------- |
| `svelte.md`              | editing `.svelte`, `.svelte.ts`, `.svelte.js`       |
| `three.md`               | editing files under `src/lib/three/`                |
| `frontend-aesthetics.md` | editing `.svelte` or `.css`                         |
| `go.md`                  | editing `.go`                                       |
| `testing-go.md`          | editing Go test files (`*_test.go`)                 |
| `testing-frontend.md`    | editing frontend test files (`src/**/*.spec.ts`)    |
| `docs.md`                | editing files under `docs/`                         |
| `pr-description.md`      | editing files under `.changeset/`                   |
| `changesets.md`          | editing files under `.changeset/` or `CHANGELOG.md` |
| `viam-context.md`        | every session (no path scope)                       |
