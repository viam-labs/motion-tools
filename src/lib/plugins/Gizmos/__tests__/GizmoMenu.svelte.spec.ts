import { fireEvent, render, screen } from '@testing-library/svelte'
import '@testing-library/jest-dom/vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import GizmoMenu from '../GizmoMenu.svelte'
import { GizmoModes } from '../gizmos'
import * as useGizmosModule from '../useGizmos.svelte'

vi.mock('../useGizmos.svelte', () => ({
	useGizmos: vi.fn(),
}))

describe('GizmoMenu', () => {
	let gizmos: { mode: string }

	beforeEach(() => {
		gizmos = { mode: GizmoModes.Idle }

		vi.mocked(useGizmosModule.useGizmos).mockReturnValue(
			gizmos as unknown as ReturnType<typeof useGizmosModule.useGizmos>
		)
	})

	it('arms the coordinate-system tool', async () => {
		render(GizmoMenu)

		await fireEvent.click(screen.getByRole('button', { name: 'Coordinate system' }))

		expect(gizmos.mode).toBe(GizmoModes.CoordinateSystem)
	})

	it('does not arm a disabled entry', async () => {
		render(GizmoMenu)

		await fireEvent.click(screen.getByRole('button', { name: /Reference plane/ }))

		expect(gizmos.mode).toBe(GizmoModes.Idle)
	})

	it('marks the unshipped tools as disabled and the shipped tool as enabled', () => {
		render(GizmoMenu)

		expect(screen.getByRole('button', { name: /Reference plane/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /Reference geometry/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /Polyline/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /Angle/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: /Arrow/ })).toBeDisabled()
		expect(screen.getByRole('button', { name: 'Coordinate system' })).not.toBeDisabled()
	})
})
