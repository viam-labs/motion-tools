import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import ReplayerUIHarness from './__fixtures__/ReplayerUIHarness.svelte'

// FloatingPanel reads `useThrelte().dom` unconditionally to seed its default position; the
// globally-mocked `@threlte/core` (vitest-setup-client.ts) has no `dom` field, so the real
// component throws on mount outside a Canvas. Swap it for a plain open/closed shell — the panel's
// own positioning isn't what this spec exercises.
vi.mock('$lib/components/overlay/FloatingPanel.svelte', async () => {
	const MockFloatingPanel = await import('./__fixtures__/MockFloatingPanel.svelte')
	return { default: MockFloatingPanel.default }
})

// `MotionPlanReplayerUI` reaches `DashboardPortal` through the package's `$lib` barrel, which also
// re-exports `App.svelte` and drags in the whole Threlte-dependent component tree (`T`, which the
// global `@threlte/core` mock doesn't provide). Replacing the barrel with just the one export this
// component uses avoids loading any of that; `DashboardPortal` itself is only a `Portal` (already
// mocked globally to a passthrough) around its children, so a bare passthrough stands in for it too.
vi.mock('$lib', async () => {
	const MockDashboardPortal = await import('./__fixtures__/MockDashboardPortal.svelte')
	return { DashboardPortal: MockDashboardPortal.default }
})

// useToast requires a `provideToast` ancestor; nothing here checks toast content.
vi.mock('@viamrobotics/prime-core', async (importOriginal) => ({
	...(await importOriginal<typeof import('@viamrobotics/prime-core')>()),
	useToast: () => vi.fn(),
}))

const open = async () => {
	await fireEvent.click(screen.getByRole('radio', { name: 'Motion Plan Replayer' }))
}

describe('MotionPlanReplayerUI', () => {
	/**
	 * The `{#each ctx.plans as plan, i (plan.id)}` key used to be `plan.name`. Only the upload path
	 * (`handlePlanFile`) rejects a duplicate name — neither `addPlan` nor the `plans` prop does — so
	 * two plans sharing a name reach the template unfiltered. Svelte throws `each_key_duplicate` on
	 * a repeated key in production builds as well as dev, which would take the whole panel down on
	 * mount rather than merely mis-rendering one row.
	 *
	 * The store-level spec ("gives two plans with the same name distinct ids") only pins the id
	 * *generator*; it renders nothing, so it stays green whether the template keys on `id` or
	 * `name`. This is the one test that actually constrains the template's key.
	 */
	it('renders two plans that share a name as distinct rows', async () => {
		render(ReplayerUIHarness, {
			props: {
				plans: [
					{ name: 'same.json', content: 'content-a' },
					{ name: 'same.json', content: 'content-b' },
				],
			},
		})

		await open()

		expect(screen.getAllByRole('button', { name: 'Remove plan' })).toHaveLength(2)
	})
})
