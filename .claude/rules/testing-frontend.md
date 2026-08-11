---
paths:
  - 'src/**/*.spec.ts'
---

# Frontend Testing (Vitest)

Use real implementations for pure logic. Mock only at a boundary the test environment cannot provide. Use `it.each` for parameterized cases instead of duplicating test bodies.

## Static Analysis

| Language   | Tools                                                                                |
| ---------- | ------------------------------------------------------------------------------------ |
| TypeScript | ESLint (`@typescript-eslint`), Prettier — run via `pnpm lint`                        |
| Svelte     | `svelte-check`, ESLint (`eslint-plugin-svelte`) — run via `pnpm check` / `pnpm lint` |

## What to Mock

Three kinds of boundary, and nothing else:

1. **External I/O.** Network, filesystem, time.
2. **Rendering context.** Anything that needs a live `<Canvas>` or WebGL. Threlte's `useThrelte` and `useTask`, `@threlte/extras` portals, and editors that mount their own DOM all throw or hang when a component is rendered in isolation.
3. **Provider ancestors.** A hook that requires a context provider the spec does not mount, such as `useToast` needing `provideToast`.

Everything else gets the real implementation. If you are reaching for `vi.mock` on a module of your own pure logic, test that module directly instead and let the component spec cover the wiring.

`vitest-setup-client.ts` already mocks `@threlte/core`, `@threlte/extras`, and several `$lib/hooks/*` globally. Read it before adding a mock; re-mocking something the setup file already handles is the most common source of a spec that passes for the wrong reason. `clearMocks: true` is set in `vite.config.ts`, so mocks reset between tests and per-test teardown is unnecessary.

When a mock stands in for a typed interface, constrain it with `satisfies` so a field added or removed on the real type fails the spec rather than leaving the mock quietly wrong.

## Svelte Component Tests

Use [@testing-library/svelte](https://testing-library.com/docs/svelte-testing-library/intro):

```typescript
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'

it('increments count on click', async () => {
	const user = userEvent.setup()
	render(Counter)
	await user.click(screen.getByRole('button', { name: /increment/i }))
	expect(screen.getByText('1')).toBeInTheDocument()
})
```

**Query priority:** `getByRole` > `getByLabelText` > `getByText` > `getByTestId`. Add `data-testid` only when no semantic selector exists, and query it through `screen.getByTestId` rather than reaching into `container` with `querySelector`.

Prefer `userEvent` over `fireEvent`. `userEvent` dispatches the full sequence a real interaction produces (pointer, focus, keyboard), so it catches handlers that `fireEvent`'s single synthetic event misses. Reach for `fireEvent` only for an event `userEvent` cannot express.

## Injecting Context

Pass a `context` map when the component depends on Svelte context:

```typescript
render(UserProfile, {
	context: new Map([[USER_CONTEXT_KEY, { name: 'Alice', role: 'admin' }]]),
})
```

For complex context trees, create a `__fixtures__/ContextWrapper.svelte` that provides all required contexts and accepts the component under test as a snippet.

## Browser Mode

**Every spec already runs in a real browser.** `vite.config.ts` enables Vitest browser mode globally, headless Chromium through Playwright, for everything matching `src/**/*.{test,spec}.{js,ts}`. `ResizeObserver`, `IntersectionObserver`, `canvas` and the rest of the DOM API are available in any `*.spec.ts` with no opt-in. There is no jsdom in this repo, and no `*.browser.spec.ts` suffix: naming a file that way gets you nothing the default does not already provide.

Two consequences worth knowing:

- A cold run can fail with `Failed to fetch dynamically imported module` or `Vitest failed to find the runner` while Vite optimizes dependencies. Re-run once before investigating.
- A dependency discovered mid-run makes Vite re-optimize and reload the test worker, which Vitest flags as a flakiness risk. Add it to `optimizeDeps.include` in `vite.config.ts` rather than living with the flake.

## Verify Your Work

```
pnpm check    # svelte-check + go vet
pnpm test     # vitest unit tests
```

`Tests N passed` on its own is not a green run. A spec that fails to import reports zero test failures, so read the `Test Files` line too and check the count against what you expected to collect.
