import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/svelte'
import { describe, expect, it, vi } from 'vitest'

import type { TrajectoryPlayer } from '$lib/motion/trajectoryPlayer.svelte'

import TrajectoryScrubber from '../TrajectoryScrubber.svelte'

const stubPlayer = (overrides: Partial<TrajectoryPlayer> = {}): TrajectoryPlayer => ({
	currentStep: 0,
	totalSteps: 4,
	lastStep: 3,
	isPlaying: false,
	atEnd: false,
	play: vi.fn(),
	pause: vi.fn(),
	toggle: vi.fn(),
	seek: vi.fn(),
	stepBy: vi.fn(),
	reset: vi.fn(),
	...overrides,
})

describe('TrajectoryScrubber', () => {
	it('drives the player it is given', async () => {
		const player = stubPlayer()
		render(TrajectoryScrubber, { player })

		await screen.getByTitle('Next step').click()

		expect(player.stepBy).toHaveBeenCalledWith(1)
	})

	/**
	 * The player is built outside this component and outlives it: the replayer builds one at its
	 * plugin root, above both the monitor-mode gate and the panel's own `{#if isOpen}`. Nothing else
	 * would stop the timer, so closing the panel mid-playback would leave it reconciling the world
	 * every frame with no control on screen to stop it.
	 */
	it('stops playback when it goes away', () => {
		const player = stubPlayer({ isPlaying: true })
		const { unmount } = render(TrajectoryScrubber, { player })

		expect(player.pause).not.toHaveBeenCalled()

		unmount()

		expect(player.pause).toHaveBeenCalled()
	})

	it('renders nothing to drive when there are no steps', () => {
		render(TrajectoryScrubber, { player: stubPlayer({ totalSteps: 0, lastStep: 0 }) })

		expect(screen.queryByTitle('Next step')).not.toBeInTheDocument()
	})
})
