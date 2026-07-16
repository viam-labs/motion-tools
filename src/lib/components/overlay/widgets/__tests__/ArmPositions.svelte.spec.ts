import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArmClient } from '$lib/hooks/useArmClient.svelte'
import { useSettings } from '$lib/hooks/useSettings.svelte'

import ArmPositions from '../ArmPositions.svelte'

// Replace FloatingPanel with a simple mock that renders children without Threlte context
vi.mock('$lib/components/overlay/FloatingPanel.svelte', async () => {
	const MockFloatingPanel = await import('./__fixtures__/MockFloatingPanel.svelte')
	return { default: MockFloatingPanel.default }
})

vi.mock('$lib/hooks/useArmClient.svelte', () => ({
	useArmClient: vi.fn(),
}))

vi.mock('$lib/hooks/useSettings.svelte', () => ({
	useSettings: vi.fn(),
}))

describe('ArmPositions widget', () => {
	const mockSettings = {
		current: {
			enableArmPositionsWidget: true,
		},
	}

	const mockArmClient = {
		names: ['arm1', 'arm2'],
		currentPositions: {
			arm1: [10, 20, 30],
			arm2: undefined,
		},
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockSettings.current.enableArmPositionsWidget = true
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useSettings).mockReturnValue(mockSettings as any)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useArmClient).mockReturnValue(mockArmClient as any)
	})

	it('renders arm names in the dropdown', () => {
		render(ArmPositions)

		expect(screen.getByRole('option', { name: 'arm1' })).toBeInTheDocument()
		expect(screen.getByRole('option', { name: 'arm2' })).toBeInTheDocument()
	})

	it('renders joint positions for the initially selected arm', () => {
		render(ArmPositions)

		// arm1 is selected by default (first in list), positions are [10, 20, 30]
		expect(screen.getByText('10.00')).toBeInTheDocument()
		expect(screen.getByText('20.00')).toBeInTheDocument()
		expect(screen.getByText('30.00')).toBeInTheDocument()
	})

	it('shows "No positions" when the selected arm has no data', () => {
		vi.mocked(useArmClient).mockReturnValue({
			names: ['arm1'],
			currentPositions: { arm1: undefined },
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
		} as any)

		render(ArmPositions)

		expect(screen.getByText('No positions')).toBeInTheDocument()
	})

	it('sets enableArmPositionsWidget to false when close button is clicked', async () => {
		render(ArmPositions)

		const closeButton = screen.getByRole('button', { name: /close panel/i })
		await fireEvent.click(closeButton)

		await waitFor(() => {
			expect(mockSettings.current.enableArmPositionsWidget).toBe(false)
		})
	})
})
