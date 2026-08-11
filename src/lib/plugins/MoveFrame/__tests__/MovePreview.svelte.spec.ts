import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import type { PreviewMove, PreviewStatus } from '../usePreviewMove.svelte'

import MovePreview from '../MovePreview.svelte'

const player = (overrides: Partial<TrajectoryPlayer> = {}): TrajectoryPlayer => ({
	currentStep: 0,
	totalSteps: 0,
	lastStep: 0,
	isPlaying: false,
	atEnd: true,
	play: vi.fn(),
	pause: vi.fn(),
	toggle: vi.fn(),
	seek: vi.fn(),
	stepBy: vi.fn(),
	reset: vi.fn(),
	...overrides,
})

const preview = (overrides: Partial<PreviewMove> = {}): PreviewMove => ({
	status: 'idle',
	message: undefined,
	trajectory: [],
	plannedSteps: 0,
	player: player(),
	requestPreview: vi.fn(),
	clear: vi.fn(),
	...overrides,
})

describe('MovePreview', () => {
	it('offers to plan a preview before one exists, with neither live region on screen', () => {
		render(MovePreview, { props: { preview: preview(), frameName: 'arm' } })

		expect(screen.getByRole('button', { name: /preview move/i })).toBeInTheDocument()
		expect(screen.queryByRole('alert')).not.toBeInTheDocument()
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
		expect(screen.queryByRole('slider')).not.toBeInTheDocument()
	})

	it.each([
		['error', 'No geometry in the frame system to draw this plan with.', 'alert'],
		['error', 'No frame system available to draw the plan against.', 'alert'],
		['error', 'Motion service returned no trajectory for this move.', 'alert'],
		['already-at-goal', '"arm" is already at the target.', 'status'],
	] satisfies [PreviewStatus, string, 'alert' | 'status'][])(
		'reports a %s message through role=%s',
		(status, message, role) => {
			render(MovePreview, { props: { preview: preview({ status, message }), frameName: 'arm' } })

			expect(screen.getByRole(role)).toHaveTextContent(message)
		}
	)

	it('shows the approximation banner and the scrubber once a preview is ready', () => {
		render(MovePreview, {
			props: {
				preview: preview({ status: 'ready', player: player({ totalSteps: 2, lastStep: 1 }) }),
				frameName: 'arm',
			},
		})

		expect(screen.getByText('This preview is an approximation')).toBeInTheDocument()
		expect(screen.getByRole('slider', { name: 'arm preview step' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: /re-plan preview/i })).toBeInTheDocument()
	})
})
