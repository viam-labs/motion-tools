import '@testing-library/jest-dom/vitest'
import { vi } from 'vitest'

// Mock Threlte context and hooks before any imports
vi.mock('@threlte/core', () => ({
	useTask: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
	useThrelte: vi.fn(() => ({
		scene: {
			getObjectByProperty: vi.fn(() => ({
				clone: vi.fn(() => ({ traverse: vi.fn() })),
			})),
		},
	})),
	isInstanceOf: vi.fn(() => false),
}))

// Mock useFrames hook
vi.mock('$lib/hooks/useFrames.svelte', () => ({
	useFrames: vi.fn(() => ({ current: [], fetching: false })),
}))
vi.mock('$lib/hooks/useConfigFrames.svelte', () => ({
	useConfigFrames: vi.fn(() => ({
		getParentFrameOptions: vi.fn(),
		unsetFrames: [],
		current: {},
	})),
}))
vi.mock('$lib/hooks/useResourceByName.svelte', () => ({
	useResourceByName: vi.fn(() => ({ current: {} })),
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
