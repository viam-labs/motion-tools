import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Threlte context and hooks before any imports
vi.mock('@threlte/core', () => ({
	useTask: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
	useThrelte: vi.fn(() => ({
		scene: {
			getObjectByName: vi.fn(() => undefined),
			getObjectByProperty: vi.fn(() => ({
				clone: vi.fn(() => ({ traverse: vi.fn() })),
			})),
		},
		invalidate: vi.fn(),
	})),
	isInstanceOf: vi.fn(() => false),
}))

// `@threlte/extras` components (PortalTarget, HTML, etc.) call into Threlte's
// internal context which requires a `<Canvas>` parent. Tests render Svelte
// components in isolation. Portal must preserve its children because the shared
// DetailsPanel renders its entire UI through it; the target-only pieces are no-ops.
vi.mock('@threlte/extras', async () => {
	const MockPortal = await import('$lib/__tests__/__fixtures__/MockPortal.svelte')
	return {
		PortalTarget: vi.fn(),
		Portal: MockPortal.default,
		HTML: vi.fn(),
	}
})

// Mock useFrames hook
vi.mock('$lib/hooks/useFrames.svelte', () => ({
	useFrames: vi.fn(() => ({ current: [], fetching: false })),
}))
vi.mock('$lib/hooks/useConfigFrames.svelte', () => ({
	useConfigFrames: vi.fn(() => ({
		unsetFrames: [],
		current: {},
	})),
}))
vi.mock('$lib/hooks/useResourceByName.svelte', () => ({
	useResourceByName: vi.fn(() => ({ current: {} })),
}))
vi.mock('$lib/hooks/useFragmentInfo.svelte', () => ({
	useFragmentInfo: vi.fn(() => ({ current: {} })),
}))
// Mock usePartConfig hook
vi.mock('$lib/hooks/usePartConfig.svelte', () => ({
	usePartConfig: vi.fn(() => ({
		current: { components: [] },
		set: vi.fn(),
	})),
	LocalPartConfigState: {
		dirty: 'DIRTY',
		clean: 'CLEAN',
		discarded: 'DISCARDED',
		saved: 'SAVED',
	},
}))

vi.mock('$lib/hooks/useLinked.svelte', () => ({
	useLinkedEntities: vi.fn(() => ({ current: [] })),
}))
