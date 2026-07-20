import type { ResourceName } from '@viamrobotics/sdk'

import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { usePartID } from '$lib/hooks/usePartID.svelte'
import { useSettings } from '$lib/hooks/useSettings.svelte'

import ResourceWidgetPanel from '../ResourceWidgetPanel.svelte'
import DummyWidget from './__fixtures__/DummyWidget.svelte'

// Render children without Threlte context.
vi.mock('$lib/components/overlay/FloatingPanel.svelte', async () => {
	const MockFloatingPanel = await import('./__fixtures__/MockFloatingPanel.svelte')
	return { default: MockFloatingPanel.default }
})

// Avoid loading the real widget package via the close-sync helper's transitive import.
vi.mock('@viamrobotics/test-widgets/component-registry', () => ({
	componentApiWidgets: vi.fn(() => []),
	componentWidgetForResource: vi.fn(),
}))

vi.mock('@threlte/core', () => ({
	useThrelte: () => ({ dom: { clientWidth: 1000, clientHeight: 800 } }),
}))

vi.mock('$lib/hooks/usePartID.svelte', () => ({ usePartID: vi.fn() }))
vi.mock('$lib/hooks/useSettings.svelte', () => ({ useSettings: vi.fn() }))

describe('ResourceWidgetPanel', () => {
	const partID = 'part1'
	const resource = {
		namespace: 'rdk',
		type: 'component',
		subtype: 'arm',
		name: 'arm1',
	} as ResourceName

	const mockSettings = {
		current: {
			openResourceWidgets: {} as Record<string, { resourceName: string; widgetId: string }[]>,
			resourceWidgetRects: {} as Record<string, unknown>,
		},
	}
	const mockPartID = { current: partID }

	beforeEach(() => {
		vi.clearAllMocks()
		mockSettings.current.openResourceWidgets = {
			[partID]: [
				{ resourceName: 'arm1', widgetId: 'is-moving' },
				{ resourceName: 'arm1', widgetId: 'get-joint-positions' },
			],
		}
		vi.mocked(useSettings).mockReturnValue(mockSettings as never)
		vi.mocked(usePartID).mockReturnValue(mockPartID as never)
	})

	it('renders the provided widget components with the resource name', () => {
		render(ResourceWidgetPanel, {
			props: {
				resource,
				widgetId: 'is-moving',
				widgets: [DummyWidget],
				title: 'arm1 · IsMoving',
				stackIndex: 0,
			},
		})

		expect(screen.getByText('dummy:part1:arm1')).toBeInTheDocument()
	})

	it('removes only its own (resource, widget) entry on close', async () => {
		render(ResourceWidgetPanel, {
			props: {
				resource,
				widgetId: 'is-moving',
				widgets: [DummyWidget],
				title: 'arm1 · IsMoving',
				stackIndex: 0,
			},
		})

		await fireEvent.click(screen.getByRole('button', { name: /close panel/i }))

		await waitFor(() => {
			expect(mockSettings.current.openResourceWidgets[partID]).toEqual([
				{ resourceName: 'arm1', widgetId: 'get-joint-positions' },
			])
		})
	})
})
