/**
 * `MovePreview` is the only place a preview's status becomes visible: the panel that mounts it drives
 * `preview.status` and leaves rendering the two live regions and the scrubber entirely to this
 * component. `MoveControls.svelte.spec.ts` stubs `usePreviewMove` for its own purposes and, until
 * fixed alongside this file, held the stub's `message` as a plain literal rather than a getter —
 * which meant it could never change after mount, so neither `role="alert"` nor `role="status"` below
 * could ever render under any test in the repo.
 *
 * This file drives `MovePreview` directly off plain `PreviewMove`-shaped objects, the same way
 * `TrajectoryScrubber.svelte.spec.ts` drives that component off a `stubPlayer` — no module is mocked,
 * so a broken guard in the component fails here rather than in whatever mock happened to be stubbed
 * for a different file's purposes.
 */

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import type { PreviewMove, PreviewStatus } from '../usePreviewMove.svelte'

import MovePreview from '../MovePreview.svelte'

/** Deliberately inert, matching `TrajectoryScrubber.svelte.spec.ts`'s `stubPlayer`. */
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

	/**
	 * The entire user-visible error and status surface of the feature. Both live regions are guarded
	 * on `preview.message` being truthy, and it is exactly that guard a literal, never-changing
	 * `message` in a mock leaves unreachable.
	 */
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
