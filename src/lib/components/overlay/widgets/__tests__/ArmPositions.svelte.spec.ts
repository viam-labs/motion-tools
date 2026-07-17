import { fireEvent, render, screen, waitFor } from '@testing-library/svelte'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useArmClient } from '$lib/hooks/useArmClient.svelte'
import { usePartID } from '$lib/hooks/usePartID.svelte'
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

vi.mock('$lib/hooks/usePartID.svelte', () => ({
	usePartID: vi.fn(),
}))

vi.mock('$lib/hooks/useSettings.svelte', () => ({
	useSettings: vi.fn(),
}))

describe('ArmPositions widget', () => {
	const partID = 'part1'

	const mockSettings = {
		current: {
			openArmWidgets: {} as Record<string, string[]>,
		},
	}

	const mockPartID = {
		current: partID,
	}

	const mockArmClient = {
		names: ['arm1', 'arm2'],
		currentPositions: {
			arm1: [10, 20, 30],
			arm2: undefined,
		} as Record<string, number[] | undefined>,
	}

	beforeEach(() => {
		vi.clearAllMocks()
		mockSettings.current.openArmWidgets = { [partID]: ['arm1', 'arm2'] }
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useSettings).mockReturnValue(mockSettings as any)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(usePartID).mockReturnValue(mockPartID as any)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		vi.mocked(useArmClient).mockReturnValue(mockArmClient as any)
	})

	it('renders joint positions for the given arm', () => {
		render(ArmPositions, { props: { name: 'arm1' } })

		// arm1 positions are [10, 20, 30]
		expect(screen.getByText('10.00')).toBeInTheDocument()
		expect(screen.getByText('20.00')).toBeInTheDocument()
		expect(screen.getByText('30.00')).toBeInTheDocument()
	})

	it('shows "No positions" when the arm has no data', () => {
		render(ArmPositions, { props: { name: 'arm2' } })

		expect(screen.getByText('No positions')).toBeInTheDocument()
	})

	it('removes the widget from openArmWidgets when close button is clicked', async () => {
		render(ArmPositions, { props: { name: 'arm1' } })

		const closeButton = screen.getByRole('button', { name: /close panel/i })
		await fireEvent.click(closeButton)

		await waitFor(() => {
			expect(mockSettings.current.openArmWidgets[partID]).toEqual(['arm2'])
		})
	})
})
