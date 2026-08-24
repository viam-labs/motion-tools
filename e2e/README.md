# End-to-End Testing Guide

This guide explains how to run and manage the Playwright end-to-end tests for the motion-tools application.

## Projects

The suite is split into Playwright projects so that a run only pays for what it needs.

| Project          | Specs                                                      | Needs a Viam machine |
| ---------------- | ---------------------------------------------------------- | -------------------- |
| `drawing`        | `draw-client`, `file-drop`, `snapshot`                     | no                   |
| `robot`          | `arm`, `edit-frame`, `obstacle-store`, `world-state-store` | yes                  |
| `robot-setup`    | `robot.setup.ts`                                           | provisions it        |
| `robot-teardown` | `robot.teardown.ts`                                        | deletes it           |

`robot` declares `robot-setup` as a dependency, so selecting it provisions an ephemeral
machine first and deletes it afterwards. The `drawing` project has no such dependency, which
is why it starts in seconds.

`drawing` runs `fullyParallel`. Each worker owns a draw server on port `4100 + parallelIndex`
with its own chunk buffer directory, and the page it drives carries a `?drawPort=` query so
the app subscribes to that worker's server rather than a shared one. `go test` invocations get
the same port through `DRAW_SERVER_PORT`. Nothing is shared, so the specs cannot see each
other's entities. `robot` stays serial: its four specs push conflicting configs at one machine.

Setup hands the machine over through `e2e/.bin/machine.json` rather than environment
variables, because Playwright runs each project in its own worker process. viam-server runs
detached with its output in `e2e/.bin/viam-server.log`, and teardown kills it by the pid
recorded in that file.

## Prerequisites

The `drawing` project needs only Go and a working dev server. Everything below is for the
`robot` project:

- **Go** (to build the `world-state-store` test module).
- **The Viam CLI** installed and authenticated:

  ```bash
  # macOS
  brew install viam
  # or see https://docs.viam.com/dev/tools/cli/ for other platforms

  viam login
  ```

- **Access to a `Viam Viz E2E` organization.** If your account doesn't already belong to one, create it at [app.viam.com](https://app.viam.com/) with the exact name `Viam Viz E2E`; the setup script will detect it on the next run.

## Running E2E Tests

```bash
# the drawing suite: no cloud machine, no setup.sh
pnpm test:e2e

# the same suite in the Playwright UI
pnpm test:e2e-ui

# the robot suite: installs viam-server, then provisions a machine
pnpm test:e2e-robot

# everything
pnpm test:e2e-all
```

Both `drawing` commands run `pnpm go-build` first, because the worker fixture spawns the
prebuilt `.bin/draw-server` rather than compiling one per test.

### Running specific tests

Narrow by project first, then by file or title. A project selection is what keeps a one-test
run from provisioning a machine it does not need.

```bash
# one project
npx playwright test --project=drawing

# one file
npx playwright test --project=robot e2e/world-state-store.test.ts

# one test by title
npx playwright test --project=robot --grep "basic edit frame"

# a family of tests
npx playwright test --project=drawing --grep "draw lines"

# the inverse: everything except the slow chunked point cloud test
npx playwright test --project=drawing --grep-invert chunked
```

`--grep` matches the file path as well as the title, so anchoring a title with `^` finds
nothing. Match on a distinctive substring instead.

Selecting `--project=robot` runs `robot-setup` and `robot-teardown` around it, even for a
single `--grep` match. Running the robot specs without a project selection fails with an
`Incomplete machine state` error, because nothing provisioned the machine.

## Understanding Test Results

### Screenshot Comparison

Playwright captures screenshots during test execution and compares them against baselines stored in `e2e/<test-name>.test.ts-snapshots/`. Failures produce:

- `actual.png` — the current screenshot
- `expected.png` — the baseline
- `diff.png` — a visual diff

These land in the `test-results/` folder.

NOTE: the robot specs share one ephemeral machine and push conflicting configs at it, which is why the `robot` project stays serial. If one fails, re-run just that one with `--grep` before investigating further.

## Updating Screenshots

When you make intentional UI changes that should change screenshots:

1. Run with the update flag:
   ```bash
   pnpm test:e2e -u
   # or, for the robot specs
   pnpm test:e2e-robot -u
   ```
2. Review the updated files in `e2e/**/*-snapshots/`.
3. Commit the new snapshots alongside your code changes.

> Only update screenshots when you've intentionally modified the UI. Random test failures should be investigated rather than blindly updating snapshots.

## Troubleshooting

- **`viam-server binary not found at .../e2e/.bin/viam-server`**
  Run `./e2e/setup.sh` to install it, or use `pnpm test:e2e-robot`, which runs it for you.
- **`Incomplete machine state at .../e2e/.bin/machine.json`**
  A robot spec ran without `robot-setup`. Add `--project=robot` to the command.
- **The machine never comes online**
  Read `e2e/.bin/viam-server.log`, which holds everything viam-server wrote.
- **`port 41xx is already in use`**
  A draw server from a killed run is still listening. The Go server attaches to an existing
  listener instead of failing, so the fixture refuses to start rather than silently sharing
  one. Find it with `lsof -nP -iTCP:4100 -sTCP:LISTEN` and kill it.
- **`draw-server binary not found`**
  Run `pnpm go-build`.
- **A draw server failed to start**
  Its log lives beside its chunk directory under the system temp dir, and the fixture's error
  message quotes it.
- **`E2E config not found at .../e2e/.env.e2e`**
  Same fix — run `cd e2e && ./setup.sh`. The script will create the API key and write the file.
- **`Organization "Viam Viz E2E" not found`**
  Your Viam CLI user doesn't have access to an org named exactly `Viam Viz E2E`. Create one at [app.viam.com](https://app.viam.com/) or ask to be added, then re-run setup.
- **Not authenticated with the Viam CLI**
  Run `viam login` and re-run `./e2e/setup.sh`.
- **Stuck/stale machines in the cloud**
  `robot-teardown` deletes the machine, and setup records it in `machine.json` before anything else can fail, so a run that dies partway through still gets cleaned up. A hard kill (SIGKILL, crash) can still leak one. Clean up orphaned `e2e-<username>-*` machines under the `e2e-tests` location in the `Viam Viz E2E` org.
