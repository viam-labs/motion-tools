import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { PreviewMove, PreviewStatus } from '../usePreviewMove.svelte'

import MovePreview from '../MovePreview.svelte'

const preview = (overrides: Partial<PreviewMove> = {}): PreviewMove => ({
	status: 'idle',
	message: undefined,
	trajectory: [],
	plannedSteps: 0,
	requestPreview: vi.fn(),
	clear: vi.fn(),
	...overrides,
})

describe('MovePreview', () => {
	it('offers to plan a preview before one exists, with neither live region on screen', () => {
		render(MovePreview, { props: { preview: preview() } })

		expect(screen.getByRole('button', { name: /preview move/i })).toBeInTheDocument()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it.each([
		['error', 'Motion service returned no trajectory for this move.', 'alert'],
		['error', 'no plan found within the constraints', 'alert'],
		['already-at-goal', '"arm" is already at the target.', 'status'],
	] satisfies [PreviewStatus, string, 'alert' | 'status'][])(
		'reports a %s message through role=%s',
		(status, message, role) => {
			render(MovePreview, { props: { preview: preview({ status, message }) } })

			expect(screen.getByRole(role)).toHaveTextContent(message)
		}
	)

	it('offers to re-plan once a preview is ready, and says how long the plan is', () => {
		render(MovePreview, {
			props: { preview: preview({ status: 'ready', plannedSteps: 12 }) },
		})

		expect(screen.getByRole('button', { name: /re-plan preview/i })).toBeInTheDocument()
		expect(screen.getByRole('status')).toHaveTextContent('Planned 12 waypoints.')
	})

	it('writes a single waypoint without a plural', () => {
		render(MovePreview, {
			props: { preview: preview({ status: 'ready', plannedSteps: 1 }) },
		})

		expect(screen.getByRole('status')).toHaveTextContent('Planned 1 waypoint.')
	})

	it('plans when the panel has a goal staged', async () => {
		const requestPreview = vi.fn()
		render(MovePreview, { props: { preview: preview({ requestPreview }) } })

		await userEvent.click(screen.getByRole('button', { name: /preview move/i }))

		expect(requestPreview).toHaveBeenCalled()
	})

	it('does not plan again while a request is already open', async () => {
		const requestPreview = vi.fn()
		render(MovePreview, { props: { preview: preview({ status: 'planning', requestPreview }) } })

		await userEvent.click(screen.getByRole('button', { name: /preview move/i }))

		expect(requestPreview).not.toHaveBeenCalled()
	})

	it('does not plan when the panel has nothing to plan', async () => {
		const requestPreview = vi.fn()
		render(MovePreview, { props: { preview: preview({ requestPreview }), disabled: true } })

		await userEvent.click(screen.getByRole('button', { name: /preview move/i }))

		expect(requestPreview).not.toHaveBeenCalled()
	})
})
