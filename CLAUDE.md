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
| Dev server      | Go (`cmd/draw-server`), Vite for HMR                          |
| Go              | 1.25                                                          |
| Testing         | Vitest + Playwright (TS); `go.viam.com/test` (Go)             |

## Commands

```
make up            # build if needed, start the draw server (5173 app, 3030 RPC)
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

## Topic-specific rules

Detailed guidance lives in `.claude/rules/`. Path-scoped rules load when Claude reads matching files; rules without `paths` load every session.

| Rule                     | Loads when                                          |
| ------------------------ | --------------------------------------------------- |
| `svelte.md`              | editing `.svelte`, `.svelte.ts`, `.svelte.js`       |
| `three.md`               | editing files under `src/lib/three/`                |
| `math.md`                | editing files under `src/lib/math/`                 |
| `frontend-aesthetics.md` | editing `.svelte` or `.css`                         |
| `go.md`                  | editing `.go`                                       |
| `testing-go.md`          | editing Go test files (`*_test.go`)                 |
| `testing-frontend.md`    | editing frontend test files (`src/**/*.spec.ts`)    |
| `pr-description.md`      | editing files under `.changeset/`                   |
| `changesets.md`          | editing files under `.changeset/` or `CHANGELOG.md` |
| `viam-context.md`        | every session (no path scope)                       |
